// Live website nav helpers (live track — #246 S2a; the composition lift — #324 / #320).
//
// What remains here after the live #300 step-2 lift: the small browser-pure helpers the live
// website shell still needs — the nav-model flattener and the `?page=` not-found view (plus a
// caller-less page-param resolver, see resolvePageParam below). The ACTUAL live website
// composition — number each page in its OWN native scope, harvest, merge ONE cross-ref registry,
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

/** The not-found view for an unknown `?page=` slug — a visible message + a link to the first
 *  page (NOT a silent redirect, NOT a blank shell). browser.js's router renders it (with a
 *  `{ firstSlug }` model) when `?page=` names no known page. */
export function renderNotFoundView(slug, model) {
  const first = model.firstSlug;
  return (
    `<div class="enscribe-website-notfound"><p>Page not found: <code>${esc(slug)}</code>.</p>` +
    (first ? `<p><a href="?page=${esc(first)}">Go to the first page</a></p>` : '') +
    `</div>`
  );
}

/**
 * The `?page=` router's pure resolver. Empty `?page=` → the first page; a known slug → that
 * page; an unknown slug → a not-found result (the caller renders renderNotFoundView).
 *
 * NOTE (#320, verify-first): this currently has NO callers — browser.js's mountLiveWebsite inlines
 * its own `resolvePage` over its `pageBySlug` map. Kept this slice (it is out of the flatten-
 * deletion scope), but it and its barrel re-export are a candidate for a follow-up removal.
 *
 * @param {string} search - location.search (with or without the leading '?')
 * @param {{ slugToPart: Map, firstSlug: string|null }} model - any object exposing the page set
 *        (`slugToPart.has`) and the default `firstSlug`.
 * @returns {{slug: string|null, notFound: boolean}}
 */
export function resolvePageParam(search, model) {
  const requested = new URLSearchParams(search || '').get('page');
  if (!requested) return { slug: model.firstSlug, notFound: false };
  if (model.slugToPart.has(requested)) return { slug: requested, notFound: false };
  return { slug: requested, notFound: true };
}
