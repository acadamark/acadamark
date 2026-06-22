// Phase — Website structuring plugin (#246 S1).
//
// Builds the WEBSITE nav model from the master's `<nav>` tree. A website's structure
// is a single navigation tree (Quarto-style): the one `<nav>` is both the site's page
// set and its menu. This plugin walks that tree and records an ordered model on
// `file.data` (ENSCRIBE_NAV_MODEL) — it does NOT render anything and does NOT load
// external pages (S2 does both: the live `?page=` render fetches each external page,
// and the #226 list builder emits the sidebar/top bar from this model).
//
// It runs in the structuring band, gated on file.data.enscribeDocType === 'website',
// and is a strict no-op for every other document class (so article/book output is
// byte-identical). It mirrors enscribeBookStructuring's "own your class, ignore the
// rest" shape.
//
// PARSE SHAPE this consumes (verified by probe against the three-form grammar):
//   - `<nav>` (no pipe) is a LONG-FORM container; its content is the recursively-parsed
//     child array (groups nest by the ordinary close-tag grammar — NOT a flat marker
//     list, so this is analogous to section-nesting, not list parsing).
//   - `<item src="…" | Title>` is a short-form LEAF: an external page. `kwargs.src` is
//     the child .emd; the pipe content is the menu label.
//   - `<item | Title>` (no src) is a short-form leaf that OPENS an inline page; its body
//     is the following sibling blocks, peer-closed by the next `<item>`/`<nav-group>`
//     (the `<section | Title>` model). This is the only peer-close the walk does.
//   - `<nav-group title="…"> … </nav-group>` is a long-form container; its `<item>`
//     children are already parser-nested in its content. It carries a `title` kwarg and
//     no src/body of its own. Recurse into its content (a group may, later, nest groups).
//
// SLUG (the page's public `?page=` id): sourced from the menu title (the pipe label /
// group title), slugified; for an external page with no pipe title, falls back to the
// `src` filename stem. Collisions are DISAMBIGUATED (so the model stays usable) AND
// surfaced with a visible diagnostic — never a silent `-2`.

import { isEnscribeTag } from '../lib/ast-helpers.js';
import { uniqueId } from '../lib/toc.js';
import { ENSCRIBE_DOC_TYPE, ENSCRIBE_NAV_MODEL } from '../../core/file-data-keys.js';

/** A page slug from a human title: lowercase, non-alphanumerics → `-`, trimmed. Distinct
 *  from toc.js's `slugify` (which prefixes `sec:` for in-page cross-ref anchors — wrong
 *  for a public `?page=` URL). */
function slugifyPage(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** The filename stem of a `src` (drop directory + extension): `resources/a.emd` → `a`. */
function srcStem(src) {
  if (!src) return '';
  return (src.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
}

/** Pull the plain-text label out of a node's (recursively-parsed) pipe content. The pipe
 *  text may arrive as bare text nodes (short form) or wrapped in a paragraph. */
function titleText(node) {
  const parts = [];
  const walk = (nodes) => {
    for (const n of nodes ?? []) {
      if (n?.type === 'text') parts.push(n.value);
      else if (Array.isArray(n?.children)) walk(n.children);
    }
  };
  walk(node?.content);
  return parts.join('').trim();
}

const isEntry = (n) => isEnscribeTag(n, 'item') || isEnscribeTag(n, 'nav-group');

/**
 * Walk one content array (the `<nav>`'s, or a `<nav-group>`'s) into ordered model entries.
 *
 * @param {Array} content  the parser-nested content array
 * @param {(title: string, src: string|null) => string} assignSlug  slug allocator (dedup + diag)
 * @returns {Array} model entries (page / group nodes)
 */
function walkEntries(content, assignSlug, file) {
  const entries = [];
  const nodes = content ?? [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (isEnscribeTag(node, 'item')) {
      const title = titleText(node);
      const src = node.kwargs?.src ?? null;
      if (src != null) {
        // External page — a leaf; the pipe gives the menu label (S2 loads the child).
        entries.push({ kind: 'page', title, slug: assignSlug(title, src), src });
        i += 1;
      } else {
        // Inline page — open marker; gather following non-entry siblings as its body
        // (peer-closed by the next <item>/<nav-group> or end of this array).
        const body = [];
        i += 1;
        while (i < nodes.length && !isEntry(nodes[i])) {
          body.push(nodes[i]);
          i += 1;
        }
        entries.push({ kind: 'page', title, slug: assignSlug(title, null), body });
      }
    } else if (isEnscribeTag(node, 'nav-group')) {
      // A grouping — its <item> children are already parser-nested in its content.
      // A nav-group is a long-form container: its label is the `title=` kwarg, never the pipe
      // slot (nav-group.md). `node.form` is the structural signal — a long-form nav-group is the
      // only form that can nest its <item> children. Any short form (a pipe label, an empty pipe,
      // or self-closing) parses as a self-delimiting leaf, so the label (if any) is dropped AND the
      // children are orphaned to the top level. Warn rather than fail silently (#282); recovering a
      // pipe label is a separate maintainer enhancement. Keying on `node.form` (not on titleText/
      // title) avoids a false positive on a correct long-form group with stray text and a false
      // negative on an empty-pipe group.
      if (node.form === 'short' && file?.message) {
        const label = titleText(node);
        file.message(
          'website: <nav-group> must be a long-form container with its label in title="…" — ' +
            (label
              ? `it was written with a pipe label ("${label}"), so the label is dropped and its ` +
                '<item> children become top-level pages instead of nesting under it.'
              : 'it was written in short/self-closing form, so it cannot nest <item> children.'),
          node,
          'website-structuring:nav-group-pipe-label',
        );
      }
      const title = node.kwargs?.title ?? '';
      entries.push({ kind: 'group', title, children: walkEntries(node.content, assignSlug, file) });
      i += 1;
    } else {
      // A stray non-entry node (e.g. whitespace/text before the first entry) — skip it.
      // (Inline-page bodies are consumed above; anything reaching here is not part of a page.)
      i += 1;
    }
  }
  return entries;
}

export function enscribeWebsiteStructuring() {
  return (tree, file) => {
    const docType = file?.data?.[ENSCRIBE_DOC_TYPE] ?? 'article';
    if (docType !== 'website') return; // own only websites; byte-identical no-op otherwise

    const children = tree.children ?? [];
    const nav = children.find((c) => isEnscribeTag(c, 'nav'));

    const used = new Set();
    const assignSlug = (title, src) => {
      let base = slugifyPage(title);
      if (!base && src) base = slugifyPage(srcStem(src));
      if (!base) base = 'page';
      if (used.has(base) && file?.message) {
        file.message(
          `website: duplicate page slug "${base}" — disambiguated, but two pages share a ?page= id; ` +
            `set distinct titles (or a slug) so the public URLs are stable`,
          undefined,
          'website-structuring:slug-collision',
        );
      }
      return uniqueId(base, used); // dedups (suffix -2, -3, …) and records the slug
    };

    if (!nav && file?.message) {
      file.message(
        'website: no <nav> in the master — the nav model is empty (a website declares its pages in a <nav>)',
        undefined,
        'website-structuring:no-nav',
      );
    }

    const entries = nav ? walkEntries(nav.content, assignSlug, file) : [];
    // #279 safety net: a <nav> that has content but yields zero entries is the worst failure
    // mode (the site builds to nothing, silently). The dedent fix above should prevent the
    // common cause (indentation swallowing items into a code block), but warn unconditionally
    // so a future regression can never fail silently.
    if (nav && (nav.content?.length ?? 0) > 0 && entries.length === 0 && file?.message) {
      file.message(
        'website: <nav> has content but no <item>/<nav-group> entries were recognized — ' +
          'leading indentation can swallow nav items into a code block; keep nav items flush-left',
        nav,
        'website-structuring:nav-no-entries',
      );
    }
    file.data[ENSCRIBE_NAV_MODEL] = { entries };
    // S1 builds the model only — the <nav>/<footer> tree is left in place; S2 consumes
    // the model to render chrome + per-page bodies and decides the tree's fate there.
  };
}
