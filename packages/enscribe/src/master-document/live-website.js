// Live website nav helpers (live track — #246 S2a; the composition lift — #324 / #320).
//
// What remains here after the live #300 step-2 lift: the small browser-pure helpers the live
// website shell still needs — the nav-model flattener and the `?page=` not-found view. The ACTUAL
// live website composition — number each page in its OWN native scope, harvest, merge ONE cross-ref registry,
// render per page — moved to the shared browser-pure core (master-document/compose-site.js) that
// BOTH surfaces (static build + live SPA) now call; browser.js's mountLiveWebsite drives it with
// the fetch + DOM + `?page=` History router.
//
// REMOVED with that lift (#320): the synthetic-`<book>` FLATTEN this file used to host —
// `buildWebsiteTree` (assembled every page as a `<book-part>` under one `isWebsiteAssembly` book),
// `buildLiveWebsite`, and `renderLiveWebsitePage` — and, with it, numbering.js's `'page'` counter
// scope. That flatten numbered a whole site as one page-scoped assembly, which collapsed a book
// page's native numbering ("figure 2.1" → a flat "figure 1"); composition replaced it, so a book
// page now keeps BOOK numbering on both surfaces. There is now ONE composition path, no flatten.

import { escapeHtmlAttr } from '../core/escape-html.js';

// The shared 4-entity attribute escaper (#316/1-A), wrapped to keep the inline copy's null-safe
// guard (escapeHtmlAttr coerces null→"null"; here an absent value → ""). Byte-identical to the
// retired inline `[&<>"]` map.
const esc = (s) => escapeHtmlAttr(s ?? '');

/**
 * Flatten the S1 nav model into an ordered page list, descending `<nav-group>`s.
 * @param {Array} entries - ENSCRIBE_NAV_MODEL.entries (page / group nodes)
 * @returns {Array<{kind:'page', title:string, slug:string, src?:string, body?:Array}>}
 */
export function flattenNavPages(entries) {
  const out = [];
  for (const e of entries ?? []) {
    if (e?.kind === 'group') out.push(...flattenNavPages(e.children));
    else if (e?.kind === 'page') out.push(e);
  }
  return out;
}

// #404 routing invariant, point 3: a link whose target page is not among the emitted pages routes to
// ONE graceful not-found view — "the same view the `?page=` router already has for unknown pages." The
// slug both surfaces emit the not-found page at (dir-per-page on the static build; the live SPA renders
// it inline for an unknown `?page=`/`?chapter=` route).
export const NOT_FOUND_SLUG = 'not-found';

/** The shared not-found VIEW BODY — the single graceful landing both surfaces render (routing
 *  invariant point 3: "the same view"). `label` names what was not found (a page slug, a chapter
 *  stem, or a cross-page target); `homeHref` links back to a real page. The static build and the
 *  live SPA pass their own `homeHref` (a depth-relative path URL vs a `?page=` route) — the one
 *  output difference website.md allows between the surfaces. NOT a silent redirect, NOT a blank shell. */
export function notFoundViewHtml(label, homeHref) {
  return (
    `<div class="enscribe-website-notfound"><p>Page not found: <code>${esc(label)}</code>.</p>` +
    (homeHref ? `<p><a href="${esc(homeHref)}">Go to the first page</a></p>` : '') +
    `</div>`
  );
}

/** The not-found view for an unknown `?page=` slug — the live SPA's router renders it (with a
 *  `{ firstSlug }` model) when `?page=` names no known page. Delegates to the shared body so the
 *  static build emits byte-identical markup. */
export function renderNotFoundView(slug, model) {
  const first = model.firstSlug;
  return notFoundViewHtml(slug, first ? `?page=${first}` : '');
}
