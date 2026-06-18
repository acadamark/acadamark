// Live app-shell WEBSITE render (live track — #246 S2a).
//
// The website counterpart of the live book (live-book.js). A website is "the book with
// pages instead of chapters": it reuses the book's assemble → ONE global numbering/
// cross-ref pass → lazy per-view render machinery. Only the ROUTER differs — `?page=slug`
// (History back/forward) instead of `#hash` — and, later, the chrome (S2b).
//
// PURE BY DESIGN (like live-book.js): no fetch, no DOM. The browser entry
// (browser.js mountLiveWebsite) does the fetch + assemble + DOM mount + the `?page=`
// router; this module is the pure model + per-page render + the router's resolver.
//
// THE ASSEMBLY (S2a, external pages only — Option A). The master's `<item src>` pages are
// fetched fresh and assembled as `<book-part #slug>` (one per page) under a synthetic
// `<book>` — so ONE proc.runSync numbers every page and resolves every cross-page `<ref>`
// in one registry, exactly as a book resolves cross-chapter refs (confirmed by probe).
// The page render is `renderChapter` verbatim (the validated per-unit projection). A
// cross-page ref keeps a bare `#anchor` from the global pass; renderLiveWebsitePage
// rewrites those whose owner is ANOTHER page to `?page=owner#anchor` (the website analog
// of P1's cross-page href rewrite), leaving intra-page refs bare.
//
// INLINE pages (`<item | Title>` + body) are a documented fast-follow — they need fresh
// (un-numbered) content in the single global pass, which the external-fetch path provides
// for free but the master-resident inline bodies do not (re-running them double-processes).
// mountLiveWebsite skips them this slice.
//
// NUMBERING is chaptered (page-index . n) — the book's behavior, adopted as-is this slice.
// Per-page (article-style) numbering is a separate refinement (the dogfood does not number).

import { makeTag, isEnscribeTag } from '../core/tag.js';
import { harvestCrossRefRegistry } from '../interpreter/lib/cross-ref-registry.js';
import { renderChapter } from './render-chapter.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]);

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

/**
 * Assemble external pages into a synthetic `<book>` of `<book-part #slug>` (one per page)
 * — the single tree the global pass numbers + resolves over. PURE: takes already-parsed
 * page content (the browser entry does the fetch + parse).
 *
 * @param {Array<{slug:string, title?:string}>} pages - external pages, in nav order
 * @param {Array<Array>} contents - parsed mdast children per page (same order/length)
 * @returns {{type:'root', children:Array}} the assembled pre-runSync tree
 */
export function buildWebsiteTree(pages, contents) {
  const parts = pages.map((p, i) =>
    makeTag(
      'book-part',
      [makeTag('book-part-title', [{ type: 'text', value: p.title ?? p.slug }]), ...(contents[i] ?? [])],
      { id: p.slug },
    ),
  );
  return { type: 'root', children: [makeTag('book', [makeTag('book-body', parts)])] };
}

/**
 * Build the live website model from a numbered tree (the global pass output).
 * Mirrors buildLiveBook: harvest the registry, then build the router maps.
 *
 *   - `slugToPart`  page slug → its `<book-part>` node in the numbered tree (the render unit)
 *   - `idToSlug`    any anchor → the slug of the page that OWNS it (registry.chapter, which is
 *                   the owning book-part id = the page slug) — drives the cross-page href rewrite
 *
 * @param {object} opts
 * @param {object} opts.numbered - the numbered mdast tree (proc.runSync over buildWebsiteTree)
 * @param {object} opts.file - the VFile-shaped carrier holding file.data[ENSCRIBE_REGISTRY]
 * @param {Array} opts.pages - the external page list (slug/title), in nav order
 * @returns {{pages:Array, slugToPart:Map, idToSlug:Map, registry:Map, firstSlug:string|null}}
 */
export function buildLiveWebsite({ numbered, file, pages }) {
  const registry = harvestCrossRefRegistry(numbered, file);

  const slugToPart = new Map();
  const findParts = (node) => {
    if (isEnscribeTag(node, 'book-part') && node.id) slugToPart.set(node.id, node);
    const kids = Array.isArray(node?.content) ? node.content : Array.isArray(node?.children) ? node.children : [];
    for (const c of kids) if (c && typeof c === 'object') findParts(c);
  };
  findParts(numbered);

  const idToSlug = new Map();
  for (const [anchor, entry] of registry) if (entry.chapter != null) idToSlug.set(anchor, entry.chapter);

  const orderedPages = (pages ?? []).filter((p) => slugToPart.has(p.slug));
  return { pages: orderedPages, slugToPart, idToSlug, registry, firstSlug: orderedPages[0]?.slug ?? null };
}

/** Rewrite a rendered page fragment's CROSS-page ref hrefs (`#anchor` whose owner is another
 *  page) to `?page=owner#anchor`; intra-page refs keep a bare `#anchor` (the current page is
 *  mounted, so the browser scrolls within it). */
export function rewriteCrossPageHrefs(html, currentSlug, idToSlug) {
  return String(html).replace(/href="#([^"]+)"/g, (whole, anchor) => {
    const owner = idToSlug.get(anchor);
    return owner && owner !== currentSlug ? `href="?page=${owner}#${anchor}"` : whole;
  });
}

/**
 * Render one page's CONTENT — `renderChapter` (the validated per-unit projection) over the
 * page's `<book-part>` node, with cross-page ref hrefs rewritten to `?page=owner#anchor`.
 *
 * @param {object} model - buildLiveWebsite result
 * @param {string} slug - the page slug
 * @param {object} ctx - { proc, file } (the same pipeline + VFile the global pass used)
 * @returns {string} the page's HTML fragment ('' if the slug has no page)
 */
export function renderLiveWebsitePage(model, slug, ctx) {
  const part = model.slugToPart.get(slug);
  if (!part) return '';
  return rewriteCrossPageHrefs(renderChapter(part, model.registry, ctx), slug, model.idToSlug);
}

/** The not-found view for an unknown `?page=` slug — a visible message + a link to the first
 *  page (NOT a silent redirect, NOT a blank shell). Minimal in S2a; S2b wraps it in chrome. */
export function renderNotFoundView(slug, model) {
  const first = model.firstSlug;
  return (
    `<div class="enscribe-website-notfound"><p>Page not found: <code>${esc(slug)}</code>.</p>` +
    (first ? `<p><a href="?page=${esc(first)}">Go to the first page</a></p>` : '') +
    `</div>`
  );
}

/** The MINIMAL S2a chrome: a plain `<ul>` of `?page=` links, enough to drive the router.
 *  The styled top bar / dropdowns / sidebar / active-state are S2b. */
export function buildWebsiteNav(pages) {
  const items = (pages ?? [])
    .map((p) => `<li><a href="?page=${esc(p.slug)}">${esc(p.title ?? p.slug)}</a></li>`)
    .join('');
  return `<nav class="enscribe-website-nav"><ul>${items}</ul></nav>`;
}

/**
 * The `?page=` router's pure resolver. Empty `?page=` → the first page; a known slug → that
 * page; an unknown slug → a not-found result (the caller renders renderNotFoundView).
 *
 * @param {string} search - location.search (with or without the leading '?')
 * @param {object} model - buildLiveWebsite result (slugToPart + firstSlug)
 * @returns {{slug: string|null, notFound: boolean}}
 */
export function resolvePageParam(search, model) {
  const requested = new URLSearchParams(search || '').get('page');
  if (!requested) return { slug: model.firstSlug, notFound: false };
  if (model.slugToPart.has(requested)) return { slug: requested, notFound: false };
  return { slug: requested, notFound: true };
}
