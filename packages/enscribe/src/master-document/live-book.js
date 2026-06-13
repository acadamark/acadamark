// Live app-shell book render (live track, L2 — #208).
//
// The authoring-surface counterpart of the static separate-pages publisher (P1,
// publish-pages.js). Where P1 emits one standalone .html FILE per chapter at build
// time, this renders the CURRENT chapter live in the browser from the .emd source,
// routed by URL hash, lazily on navigate — the loop the edit surface will sit on.
//
// PURE BY DESIGN. This module does NO fetch and NO DOM: it is given the numbered tree
// (the cheap global pass — numbering + cross-ref resolution, L1 #204) and produces (a)
// a live book MODEL — the scaffolded chapters + the router maps — and (b) a chapter's
// mounted VIEW (content + chrome) as an HTML string. The browser entry (browser.js
// mountLiveBook) wraps it with the fetch loader, the DOM mount, and the hash router;
// the Node parity gate drives it WITHOUT a browser. The split mirrors P1: the pure
// page-builder there, the fs + file-writing in the CLI here.
//
// PARITY WITH P1 (the gate): a chapter's live CONTENT is `renderChapter(...)` verbatim
// — the exact projection P1 publishes, BEFORE P1's cross-page href rewrite. So live
// content === P1 page content with the rewrite reverted, for every chapter (the L1
// render-chapter-parity invariant, reused). It shares P1's id/slug-stem scaffolding
// (book-scaffold.js) so the ids baked into the fragment are identical — divergent ids
// would be divergent content.
//
// CROSS-CHAPTER REFS need NO rewrite here (unlike P1). P1 rewrites `#anchor` →
// `owner.html#anchor` because its pages are separate files. The single-mount live shell
// keeps a bare `#anchor` and the router resolves it to the owning chapter at navigate
// time via `idToStem` (anchor → owning-chapter stem, built from the harvested registry).
// One mount, one hash space: the router IS the cross-page link.

import { toHtml } from 'hast-util-to-html';
import { buildChapterRail, buildOnThisPage, chapterNavBar } from '../interpreter/lib/toc.js';
import { harvestCrossRefRegistry } from '../interpreter/lib/cross-ref-registry.js';
import { renderChapter } from './render-chapter.js';
import {
  collectBookParts,
  assignSlugStems,
  assignIds,
  findBook,
  bookTitleOf,
  coverBodyHtml,
} from './book-scaffold.js';

// The book layout class list; the third column (`--book-3col`) is added only when a
// right "on this page" rail is present — mirroring P1 / C's single-page applyBookToc.
const BOOK_LAYOUT = 'enscribe-layout enscribe-layout--toc enscribe-layout--book';

// The cover route (#209): the empty / root hash. Opening the shell (no hash) lands on the
// cover, and the return-to-cover masthead points here, so every chapter round-trips to it —
// the live counterpart of P1's `index.html` cover, projected to a hash route, not a file.
const COVER_HASH = '#';

/** Live projection: a chapter's hash route is the shared neutral stem with a leading
 *  `#` (`#1-counting-elephants`) — the per-chapter URL scheme matching P1's slugs, sans
 *  the `.html` P1 appends. This is the live target's own formatting (book-scaffold owns
 *  the stem; the suffix/prefix is each consumer's). */
export const chapterHash = (p) => `#${p.stem}`;

/**
 * Build the live book model from a numbered tree (proc.runSync output).
 *
 * Runs the SAME scaffolding P1 runs, in the SAME order (stems → ids → harvest), so the
 * mdast ids, the registry, and the rail all agree with the static build. Returns the
 * scaffolded chapters plus the two router maps the hash router needs:
 *
 *   - `stemToIndex`  chapter stem → index  (a `#stem` hash is a chapter route)
 *   - `idToStem`     element id → owning chapter stem  (a `#anchor` hash — a sub-section,
 *                    a cross-chapter ref target, any colon-id — routes to the chapter
 *                    that owns it, then scrolls). Built from each chapter's own id, its
 *                    sub-section ids, and every harvested cross-ref anchor.
 *
 * @param {object} opts
 * @param {object} opts.numbered - the numbered mdast tree
 * @param {object} opts.file - the VFile (or {data}) carrying file.data.enscribeRegistry
 * @param {object} opts.proc - a configured pipeline (unused here directly; the chapter
 *   render takes it via ctx — kept in the signature for symmetry with publishBookPages)
 * @returns {{ parts: object[], bookTitle: string, registry: Map, stemToIndex: Map<string,number>, idToStem: Map<string,string> }}
 */
export function buildLiveBook({ numbered, file }) {
  const bookEl = findBook(numbered);
  if (!bookEl) throw new Error('buildLiveBook: no <book> element — the live app-shell render is a book-only path');

  const bookTitle = bookTitleOf(bookEl);
  const parts = collectBookParts(bookEl);
  if (parts.length === 0) throw new Error('buildLiveBook: the book has no chapters');

  assignSlugStems(parts);
  assignIds(parts, bookEl);                  // before harvest (owner ids) + renderChapter (emitted ids)
  const registry = harvestCrossRefRegistry(numbered, file);

  const stemToIndex = new Map(parts.map((p, i) => [p.stem, i]));
  const chapterIdToStem = new Map(parts.map((p) => [p.id, p.stem]));

  // anchor / sub-section id / chapter id → owning chapter stem.
  const idToStem = new Map();
  const addSections = (sections, stem) => {
    for (const s of sections) {
      if (s.id) idToStem.set(s.id, stem);
      addSections(s.children, stem);
    }
  };
  for (const p of parts) {
    idToStem.set(p.id, p.stem);
    addSections(p.sections, p.stem);
  }
  // Every harvested cross-ref target (figures, equations, tables, sections, …) → the
  // stem of the chapter that owns it, so a bare `#anchor` (in-chapter or cross-chapter)
  // resolves without P1's href rewrite.
  for (const [anchor, entry] of registry) {
    if (entry.chapter != null && chapterIdToStem.has(entry.chapter)) {
      idToStem.set(anchor, chapterIdToStem.get(entry.chapter));
    }
  }

  return { parts, bookTitle, registry, stemToIndex, idToStem };
}

/**
 * Render one chapter's CONTENT fragment — the parity target. This is `renderChapter`
 * verbatim (no cross-page rewrite), byte-identical to P1's page content with its rewrite
 * reverted, and to the chapter's slice of the full-book render (L1).
 *
 * @param {object} part - a scaffolded book-part (`part.node` is the mdast `<book-part>`)
 * @param {object} model - the buildLiveBook result (its harvested `registry`)
 * @param {object} ctx - { proc, file } — the same configured pipeline + VFile the global pass used
 * @returns {string} the chapter's `<book-part>` HTML fragment
 */
export function renderLiveChapterContent(part, model, ctx) {
  return renderChapter(part.node, model.registry, ctx);
}

/**
 * Render one chapter's full mounted VIEW (chrome + content) as a DOM-ready HTML string,
 * with HASH chapter hrefs. Mirrors P1's renderPage minus the standalone-page shell and
 * the cross-page rewrite: the return-to-cover masthead (the book title, → the cover route),
 * the left chapter rail (current chapter marked active, links = `#stem`), the reading column
 * (content + a per-chapter prev/next bar), and the right "on this page" rail of this
 * chapter's sub-sections.
 *
 * The masthead (#209) points at the cover route (the empty hash), so a chapter round-trips
 * to the cover exactly as a P1 chapter page round-trips to `index.html` — same navigation
 * model, hash route instead of file. It is NOT marked current on a chapter view (the cover
 * is a different route). #206 already made this a `buildChapterRail({home})` option.
 *
 * @param {object} model - the buildLiveBook result
 * @param {number} idx - the chapter's index in model.parts
 * @param {object} ctx - { proc, file }
 * @returns {string} the mounted chapter view HTML (a `<div class="enscribe-layout…">`)
 */
export function renderLiveChapterView(model, idx, ctx) {
  const { parts, bookTitle } = model;
  const part = parts[idx];

  const content = renderLiveChapterContent(part, model, ctx);
  const home = { href: COVER_HASH, title: bookTitle };
  const rail = toHtml(buildChapterRail(parts, chapterHash, part.id, home));
  const onThisPageNav = buildOnThisPage([part]);
  const onThisPage = onThisPageNav ? toHtml(onThisPageNav) : '';
  const navBar = chapterNavBar(parts, idx, chapterHash);
  const prevNext = navBar ? toHtml(navBar) : '';

  const layout = onThisPage ? `${BOOK_LAYOUT} enscribe-layout--book-3col` : BOOK_LAYOUT;
  return `<div class="${layout}">${rail}<main class="enscribe-body">${content}${prevNext}</main>${onThisPage}</div>`;
}

/**
 * Render the book COVER view (#209) — the empty/root hash route, the live counterpart of
 * P1's `index.html` cover. The SHARED cover body (book-scaffold's coverBodyHtml: book-title
 * hero + lede — so the previewed cover IS the published cover) inside the live chrome rail,
 * with the masthead marked current (`aria-current="page"`; it self-links to the cover you
 * are on, exactly as P1's renderIndex). No chapter content, no on-this-page rail (matches
 * P1's renderIndex layout).
 *
 * @param {object} model - the buildLiveBook result
 * @returns {string} the mounted cover view HTML (a `<div class="enscribe-layout…">`)
 */
export function renderLiveCoverView(model) {
  const { parts, bookTitle } = model;
  const home = { href: COVER_HASH, title: bookTitle, current: true };
  const rail = toHtml(buildChapterRail(parts, chapterHash, null, home));
  return `<div class="${BOOK_LAYOUT}">${rail}<main class="enscribe-body">${coverBodyHtml(bookTitle)}</main></div>`;
}

/**
 * Resolve a URL hash to a routing destination. The router's pure core (no DOM), shared by
 * the browser entry and the Node smoke test.
 *
 *   - ''                    → the COVER (#209; the empty/root route, the entry point).
 *   - a known chapter stem  → that chapter, no scroll (top of chapter).
 *   - a known element id    → the chapter that OWNS it, scroll to the id.
 *   - anything else         → null (unknown anchor owned by no chapter; caller no-ops).
 *
 * @param {string} hash - location.hash (with or without the leading '#')
 * @param {object} model - the buildLiveBook result (stemToIndex + idToStem)
 * @returns {{ cover: true } | { cover: false, index: number, anchor: string|null } | null}
 */
export function resolveHash(hash, model) {
  const h = String(hash || '').replace(/^#/, '');
  if (h === '') return { cover: true };
  if (model.stemToIndex.has(h)) return { cover: false, index: model.stemToIndex.get(h), anchor: null };
  if (model.idToStem.has(h)) return { cover: false, index: model.stemToIndex.get(model.idToStem.get(h)), anchor: h };
  return null;
}
