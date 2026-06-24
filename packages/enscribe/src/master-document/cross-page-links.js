// The cross-page LINK LAYER — the one home for resolving a rendered page fragment's links that
// point at *another* page of a multi-page output (a separate-pages book, or a website).
//
// Two resolvers live here, by deliberate split of concern:
//
//   rewriteCrossPageHrefs — cross-page `<ref>` hrefs. A `<ref @id>` renders as
//     `<a … href="#id">`; when `#id`'s owner is a DIFFERENT page, the bare in-page anchor must
//     become a cross-page URL. This is HREF-ONLY (it never touches a link's label), so it stays a
//     string rewrite — safe by construction, and browser-safe (the live SPA calls it, and pulling
//     an HTML parser into the browser bundle would regress #25). It is the SINGLE resolver for BOTH
//     the separate-pages book publish (the old `rewriteCrossPageRefs`, folded in via `refsOnly`)
//     and the website composition + live SPA — one job, the predicate/resolver injected.
//
//   resolvePageSlugLinks — `<a {slug}>` internal PAGE links (the #289 form the <a> handler emits as
//     `<a data-page-slug="slug">label</a>`). This one CAN auto-label an empty link from the target
//     page's title, so it must read the link's LABEL — and reading a label by regex
//     (`<a …>([\s\S]*?)</a>`) is fragile: a label that itself contains a nested anchor (a `<ref>`, or
//     another `<a {slug}>`) ends at the WRONG `</a>` and the inner link is left unresolved. So this
//     resolver is STRUCTURAL: it parses the fragment, walks the `<a>` element nodes, and resolves each.
//
//     SEAM (verify-first, the Step-0 call): a FULL re-serialize of the parsed fragment is NOT byte-safe
//     for enscribe's Layer 1. `<meta>` is a VOID element in HTML5, so parse5 (hast-util-from-html) drops
//     the custom `<meta>…</meta>` container's close tag, and rehype-format's (#117) custom-element
//     indentation does not survive a parse→serialize round-trip. So we re-serialize ONLY the `<a>`
//     subtrees and SPLICE them back into the original string by source position (parse5 records each
//     node's source offsets) — every byte outside a resolved link is the untouched original. An `<a>`
//     label is inline content (text, <i>/<code>/math), which DOES round-trip byte-identically. A broken
//     slug DEGRADES (always-renders): the label text is kept, the live href dropped, and the `ref-error`
//     marker class applied — never a thrown build.

import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { visit } from 'unist-util-visit';

/**
 * Rewrite a rendered fragment's CROSS-page anchor hrefs (`href="#anchor"` whose anchor is owned by
 * a DIFFERENT page) into a cross-page link; an in-page anchor (owner === the current page) and an
 * anchor with no known owner are left untouched (the page is mounted/served, so the browser scrolls
 * within it). Href-only — the link's label is never read, so this is a safe string rewrite.
 *
 * One resolver for two call sites, the difference injected:
 *   - website / live SPA: every `href="#anchor"` is a candidate; `ownerOf` maps the anchor → the
 *     owning page/chapter-page key; `hrefFor(owner, anchor)` builds the scheme (live: `?page=…#…`;
 *     static: a depth-relative path URL).
 *   - separate-pages book publish (`refsOnly: true`): only a `<ref>` anchor (`… class="ref"`) is a
 *     candidate — a book chapter fragment also carries footnote/section anchors that must stay
 *     in-page; `ownerOf` reads the cross-ref registry's owning chapter, `hrefFor` maps it to the
 *     chapter's `.html` (returning null to skip when the chapter has no page URL).
 *
 * @param {string}   html         - the rendered fragment.
 * @param {string}   currentOwner - the page/chapter key this fragment renders as (its own anchors stay in-page).
 * @param {object}   resolver
 * @param {Function} resolver.ownerOf - (anchor) => ownerKey | null
 * @param {Function} resolver.hrefFor - (owner, anchor) => href | null  (null ⇒ leave the anchor in-page)
 * @param {boolean}  [resolver.refsOnly=false] - restrict candidates to `… class="ref"` anchors (the book case).
 * @returns {string} the fragment with cross-page hrefs rewritten.
 */
export function rewriteCrossPageHrefs(
  html,
  currentOwner,
  { ownerOf, hrefFor = (owner, anchor) => `?page=${owner}#${anchor}`, refsOnly = false } = {},
) {
  // refsOnly matches the book-publish form `href="#X" class="ref"` exactly (the class follows the
  // href in the rendered <a>); the general form matches any same-document `href="#X"`.
  const re = refsOnly ? /href="#([^"]+)" class="ref"/g : /href="#([^"]+)"/g;
  const tail = refsOnly ? ' class="ref"' : '';
  return String(html).replace(re, (whole, anchor) => {
    const owner = ownerOf(anchor);
    if (owner == null || owner === currentOwner) return whole;
    const href = hrefFor(owner, anchor);
    if (href == null) return whole;
    return `href="${href}"${tail}`;
  });
}

/** A page-slug `<a>` has an empty label (→ auto-label from the target's title) when it has no
 *  element children and no non-whitespace text. */
function isEmptyLabel(node) {
  return !(node.children || []).some(
    (c) => c.type === 'element' || (c.type === 'text' && c.value.trim() !== ''),
  );
}

/**
 * Resolve `<a data-page-slug="slug">label</a>` internal page links STRUCTURALLY (the #289 form the
 * <a> handler records). Parses the fragment, walks every `<a>` carrying `data-page-slug`, and asks
 * `resolve(slug, { empty })` how to handle it:
 *
 *   - `{ href, label }`        → a resolvable link: set the real href (drop the marker), and when the
 *                                authored label was empty, fill it from `label` (the target's title).
 *   - `{ broken: true, label }`→ a broken authored link (slug resolves to no page): ALWAYS-RENDERS —
 *                                keep the label text, DROP the href (no live link), and flag it with
 *                                the `ref-error` marker class (the existing unresolved-link styling).
 *                                Never throws; the caller logs a warning.
 *
 * A fragment with no `data-page-slug` is returned untouched (no parse), so non-linking pages stay
 * byte-identical; a fragment with links round-trips byte-identically except at the resolved/degraded
 * links themselves.
 *
 * @param {string}   html    - the rendered page fragment.
 * @param {Function} resolve - (slug, { empty }) => { href, label } | { broken, label }
 * @returns {string} the fragment with page-slug links resolved or degraded.
 */
export function resolvePageSlugLinks(html, resolve) {
  const src = String(html);
  if (!src.includes('data-page-slug')) return src; // fast path: nothing to do, no re-parse
  const tree = fromHtml(src, { fragment: true }); // parse5 records source positions on each node
  const splices = []; // { start, end, replacement } — only the <a> spans are re-serialized
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'a' || node.properties?.dataPageSlug == null || !node.position) return;
    const slug = String(node.properties.dataPageSlug);
    const empty = isEmptyLabel(node);
    const r = resolve(slug, { empty });
    delete node.properties.dataPageSlug; // the build-time marker is consumed either way
    if (r.broken) {
      delete node.properties.href; // degrade: no live href
      node.properties.className = [...(node.properties.className || []), 'ref-error'];
      if (empty) node.children = [{ type: 'text', value: r.label ?? slug }];
    } else {
      node.properties.href = r.href; // marker → real relative URL (added last, where the marker was)
      if (empty && r.label != null) node.children = [{ type: 'text', value: r.label }];
    }
    splices.push({
      start: node.position.start.offset,
      end: node.position.end.offset,
      replacement: toHtml(node, { allowDangerousHtml: true }),
    });
  });
  // Splice right-to-left so each replacement leaves earlier offsets valid; every byte outside an <a>
  // span is the untouched original (so <meta>/<section>/formatting stay byte-identical).
  splices.sort((a, b) => b.start - a.start);
  let out = src;
  for (const s of splices) out = out.slice(0, s.start) + s.replacement + out.slice(s.end);
  return out;
}
