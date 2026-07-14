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
// SLUG (the page's public `?page=` id): the unified three-tier rule (decisions.md "Page slug
// is identity", spec-internal-links.md; #300/#299 slice 1) via resolvePageSlug + the one
// slugifyPage — (1) `<meta slug>`, else (2) `<meta title>`, else (3) the menu title (pipe label
// / group title), with the `src` filename stem as a last resort. Tiers 1–2 read the page's own
// source, which only the caller that loads it (the static build) has; this nav-model pass has no
// external sources, so it resolves at tier 3 (full live parity is #299 slice 3). Collisions are
// ALWAYS-RENDER (never a build error): a derived (tier 2/3) slug uniquifies + warns; a pinned
// `<meta slug>` duplicate is NOT renamed — it warns and the dependent link won't resolve, but the
// build completes.

import { isEnscribeTag } from '../lib/ast-helpers.js';
import { uniqueId } from '../lib/toc.js';
import { extractDocumentTitle } from '../index.js';
import { ENSCRIBE_DOC_TYPE, ENSCRIBE_NAV_MODEL } from '../../core/file-data-keys.js';

/** A page slug from a human title: lowercase, non-alphanumerics → `-`, trimmed. Distinct
 *  from toc.js's `slugify` (which prefixes `sec:` for in-page cross-ref anchors — wrong
 *  for a public `?page=` URL). Exported (#278) so the static website build reuses the one
 *  slugifier for nav-group → path-segment slugs (no second, drifting implementation). */
export function slugifyPage(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** The filename stem of a `src` (drop directory + extension): `resources/a.emd` → `a`. */
function srcStem(src) {
  if (!src) return '';
  return (src.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
}

// The single reader of a page's `<meta slug=…>` (retiring static-website.js's private copy, #300).
// Captures the FULL raw value (up to whitespace/quote/`>`) so it is normalized through slugifyPage
// rather than a permissive [a-z0-9-] capture that would silently TRUNCATE `slug=Foo_Bar` to "Foo".
const META_SLUG_RE = /<meta\b[^>]*?\bslug\s*=\s*["']?([^\s"'>]+)/i;

/**
 * The ONE page-slug resolver — the three-tier rule (decisions.md "Page slug is identity",
 * spec-internal-links.md; #300/#299). The slug is the first that yields a non-empty slugifyPage:
 *   (1) `<meta slug>`  → PINNED identity;  (2) `<meta title>`;  (3) the menu/nav title;
 * with the `src` filename stem and then `"page"` as last resorts. Tiers 1–2 read the page's own
 * loaded `source`; pass `source: null` (the live nav-model pass, which has no external sources) to
 * resolve at tier 3. Returns the display `title` too (tier 2 else tier 3), so a caller that needs
 * the page title does not re-parse.
 *
 * @param {object} o
 * @param {string|null} [o.source]   the page's loaded `.emd` source (null when unavailable)
 * @param {string}      [o.navTitle] the menu/nav title (pipe label / group title)
 * @param {string|null} [o.src]      the page's `src` (for the filename-stem last resort)
 * @returns {{ slug: string, pinned: boolean, title: string, rawMetaSlug: string|null }}
 *   `rawMetaSlug` is the verbatim `<meta slug>` value (pre-slugify), so a caller can warn the author
 *   when their slug was normalized (`Foo_Bar` → `foo-bar`); null when there is no `<meta slug>`.
 */
export function resolvePageSlug({ source = null, navTitle = '', src = null } = {}) {
  const metaSlug = source ? (source.match(META_SLUG_RE)?.[1] ?? null) : null;
  const metaTitle = source ? extractDocumentTitle(source) : '';
  let slug = '';
  let pinned = false;
  if (metaSlug) {
    const s = slugifyPage(metaSlug);
    if (s) { slug = s; pinned = true; } // tier 1 — the pinned, permanent identity
  }
  if (!slug && metaTitle) slug = slugifyPage(metaTitle);       // tier 2
  if (!slug && navTitle) slug = slugifyPage(navTitle);         // tier 3
  if (!slug && src) slug = slugifyPage(srcStem(src));          // last resort: filename stem
  if (!slug) slug = 'page';
  return { slug, pinned, title: metaTitle || navTitle || '', rawMetaSlug: metaSlug };
}

/**
 * Allocate a unique site-wide slug under the ALWAYS-RENDER collision policy (decisions.md
 * always-render; #300). `used` is the per-build set of taken slugs. On a collision: a PINNED
 * (`<meta slug>`) duplicate is NEVER renamed — it is recorded as the collision it is and returned
 * as-is (the dependent link/ref/menu-item won't resolve, but the build completes); a DERIVED
 * (tier 2/3) duplicate is uniquified (`-2`, `-3`, …). `onCollision(kind, slug)` (kind: 'pinned' |
 * 'derived') is the caller's diagnostic sink — the one policy, two diagnostic shapes.
 *
 * @param {string} slug
 * @param {boolean} pinned
 * @param {Set<string>} used
 * @param {(kind: 'pinned'|'derived', slug: string) => void} [onCollision]
 * @returns {string} the allocated slug
 */
export function allocatePageSlug(slug, pinned, used, onCollision) {
  if (used.has(slug)) {
    if (pinned) { onCollision?.('pinned', slug); return slug; } // tier-1 dup: not renamed
    onCollision?.('derived', slug);
    return uniqueId(slug, used);                                 // tier 2/3 dup: uniquify
  }
  used.add(slug);
  return slug;
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
        // External page — the pipe gives the menu label (S2 loads the child). #404 marker 7:
        // master content authored AFTER this `<item src>` and BEFORE the next nav entry
        // (interstitial content) belongs to THIS page — gather it as the page's `body`,
        // peer-closed by the next `<item>`/`<nav-group>` or end of this array, exactly as the
        // inline-item branch does. Each render path appends this body after the loaded child
        // (the interstitial is trailing master content on the page; substitution within the
        // nav entry, master-document.md §"Scope note: websites"). Empty when there is no
        // interstitial content, so a nav without it stays byte-identical.
        const slug = assignSlug(title, src);
        const body = [];
        i += 1;
        while (i < nodes.length && !isEntry(nodes[i])) {
          // #440: capture a RAW snapshot. This runs at stage 2.4, before numbering (7-8) and
          // ref-resolution (9) — but those later stages mutate the master tree's nodes IN PLACE, and a
          // bare reference would carry their master-scope numbers/resolved refs into the destination page
          // (a figure inside the body would be numbered in the master's scope, and a <ref> to it baked to
          // that stale number). Deep-cloning here hands the destination unnumbered, unresolved nodes, so
          // the page's own runSync numbers + resolves them in the destination scope (the article marker-7
          // path and the #433 book path both re-number this body).
          body.push(structuredClone(nodes[i]));
          i += 1;
        }
        entries.push({ kind: 'page', title, slug, src, body });
      } else {
        // Inline page — open marker; gather following non-entry siblings as its body
        // (peer-closed by the next <item>/<nav-group> or end of this array).
        const body = [];
        i += 1;
        while (i < nodes.length && !isEntry(nodes[i])) {
          // #440: capture a RAW snapshot. This runs at stage 2.4, before numbering (7-8) and
          // ref-resolution (9) — but those later stages mutate the master tree's nodes IN PLACE, and a
          // bare reference would carry their master-scope numbers/resolved refs into the destination page
          // (a figure inside the body would be numbered in the master's scope, and a <ref> to it baked to
          // that stale number). Deep-cloning here hands the destination unnumbered, unresolved nodes, so
          // the page's own runSync numbers + resolves them in the destination scope (the article marker-7
          // path and the #433 book path both re-number this body).
          body.push(structuredClone(nodes[i]));
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
    // The live nav-model pass has no external page sources, so resolvePageSlug resolves at tier 3
    // (the menu/nav title) here — full meta-slug/title parity is #299 slice 3. Every slug on this
    // path is therefore DERIVED, so the slug value and the dedup diagnostic are byte-identical to
    // before; the pinned branch only fires once the static build (which has sources) reuses the
    // same allocator.
    const assignSlug = (navTitle, src) => {
      const { slug, pinned } = resolvePageSlug({ source: null, navTitle, src });
      return allocatePageSlug(slug, pinned, used, (kind, s) => {
        if (!file?.message) return;
        file.message(
          kind === 'pinned'
            ? `website: duplicate pinned slug "${s}" (<meta slug>) — not renamed; links to it ` +
                `won't resolve, but the build completes`
            : `website: duplicate page slug "${s}" — disambiguated, but two pages share a ?page= id; ` +
                `set distinct titles (or a slug) so the public URLs are stable`,
          undefined,
          kind === 'pinned'
            ? 'website-structuring:slug-collision-pinned'
            : 'website-structuring:slug-collision',
        );
      });
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
