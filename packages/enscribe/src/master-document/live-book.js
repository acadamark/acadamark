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
import { buildChapterRail, buildCombinedNav, buildOnThisPage, buildContentsListing, chapterNavBar, chapterNavArrows } from '../interpreter/lib/toc.js';
import { harvestCrossRefRegistry } from '../interpreter/lib/cross-ref-registry.js';
import { renderChapter, isMarginBook } from './render-chapter.js';
import { rewriteCrossPageHrefs } from './cross-page-links.js';
import { assembleMasterDocument } from './assemble.js';
import { collectFrontLoose } from './publish-pages.js';
import { makeTag } from '../core/tag.js';
import { buildEditMainInner } from './live-edit-view.js';
import { ENSCRIBE_LOADED_SOURCES } from '../core/file-data-keys.js';
import {
  collectBookParts,
  assignSlugStems,
  assignIds,
  findBook,
  bookTitleOf,
  coverBodyHtml,
  resolveBookNavConfig,
  resolveBookContentsConfig,
} from './book-scaffold.js';
import { composeBookBody, BACK_TO_TOP_HTML, COMBINED_NAV_JS } from '../interpreter/assets/book-nav-asset.js';
import { SCROLL_SPY_JS } from '../interpreter/assets/scroll-spy-asset.js';
import { ON_THIS_PAGE_JS } from '../interpreter/assets/on-this-page-asset.js';

// The live book view's rail animators — the scroll-spy (chapter-rail ToC active-section highlight) and
// the on-this-page (book right-rail) scripts, shipped WITH the rendered chapter/cover so executeAssets
// runs them on each chapter swap (the page owns its interactivity; the shell injects nothing).
//
// DELIBERATE TWO-PATH NON-UNIFORMITY (documented, not silent): an ARTICLE page gets these scripts from
// the render pipeline's `injectBookScripts` (interpreter/index.js — it sees the document's tocType /
// config-toc shape); a STATIC book page gets them appended at the page body (publish-pages.js). The
// LIVE book renders chapters through live-book.js's own view functions — a path that does NOT run
// `injectBookScripts` — so it appends them HERE. Three injection sites for one concern, each owning its
// render path; converging them onto one seam (e.g. the toc.js rail builders) is a deferred follow-on.
const BOOK_LIVE_RAIL_SCRIPTS = `<script>${SCROLL_SPY_JS}</script><script>${ON_THIS_PAGE_JS}</script>`;
// #459 part 2: a combined-nav book additionally ships the click-to-expand script WITH each view, so
// executeAssets re-runs it after every swapLiveContent and the expansion survives chapter navigation
// (the #462 lesson). The base rail scripts still ride (SCROLL_SPY_JS highlights the active section; the
// on-this-page script no-ops when its rail is absorbed).
const liveRailScripts = (bookNav) => BOOK_LIVE_RAIL_SCRIPTS + (bookNav.combined ? `<script>${COMBINED_NAV_JS}</script>` : '');

// ─── The chapter-as-page route scheme (chapter-as-page slice) ──────────────────────────────────────
// A chapter is an addressable PAGE, not a hash: `?[page=<slug>&]chapter=<stem>`. The hash is now PURELY
// a section anchor WITHIN a chapter (`…#<id>`), so a section can be deep-linked — chapter and section no
// longer compete for the one hash slot (the defect). This mirrors the static separate-pages model
// (publish-pages.js: `<book-dir>/<stem>.html` + `#<id>`) — static `<stem>.html` ⇄ live `?chapter=<stem>`.
//
// `pageSlug` is the WEBSITE page slug when the book renders as a website sub-view (mountLiveWebsite),
// `null` for a standalone live book (mountLiveBook) which has no `?page=`. It is carried on the model so
// the rail/cover/nav hrefs are FULLY-QUALIFIED in the DOM (copyable section deep-links — the whole point).

/** A chapter's route href: `?[page=<slug>&]chapter=<stem>`. */
export const chapterHref = (p, pageSlug = null) =>
  `?${pageSlug ? `page=${pageSlug}&` : ''}chapter=${p.stem}`;

/** The cover/landing route: the page with NO `chapter` param — `?page=<slug>` (website) or `?`
 *  (standalone, clears the chapter). The masthead/home link points here; the click interceptor reads
 *  the absent `chapter` and lands on the cover (or the first chapter when cover is off). */
export const coverHref = (pageSlug = null) => (pageSlug ? `?page=${pageSlug}` : '?');

// #404 total ownership: the owner sentinel for content that belongs to NO chapter — the book's
// FRONT region (pre-first-part loose content), which renders on the COVER on both surfaces. A
// stem can never collide with it (stems are slugified [a-z0-9-]).
export const COVER_STEM = '::cover';

/** A section's route href: the owning chapter's route + the section anchor — used by cross-chapter
 *  links (the cover contents listing, the rail at navDepth≥2, cross-chapter refs). A SAME-chapter
 *  section link is just `#<id>` (a pure in-page scroll); this is for links that may cross chapters. */
export const sectionHref = (p, s, pageSlug = null) => `${chapterHref(p, pageSlug)}#${s.id}`;

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
export function buildLiveBook({ numbered, file, pageSlug = null }) {
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
    } else if (!idToStem.has(anchor)) {
      // #404 total ownership: a registered target outside every chapter is FRONT-region
      // content, owned by the cover (where the front loose content renders on both
      // surfaces). The old omission left these anchors route-less — a dead click.
      idToStem.set(anchor, COVER_STEM);
    }
  }

  // `numbered` rides the model so renderChapter can reach the document-level residual <note-list>
  // + note-position config for #467 margin projection (the residual-routed sidenotes + the layout
  // wrapper); non-margin books ignore it.
  const bookNav = resolveBookNavConfig(file);
  bookNav.margin = isMarginBook(numbered, file);   // #467 — composeBookBody stamps --margin + injectBookNavStyles ships MARGIN_CSS
  return { parts, bookTitle, registry, numbered, stemToIndex, idToStem, pageSlug, bookNav, contents: resolveBookContentsConfig(file), frontLoose: collectFrontLoose(bookEl) };
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
  // #467: thread the numbered tree so residual-routed margin sidenotes project + the margin
  // layout wrapper is reproduced (see render-chapter.js). ctx.numbered wins if a caller passes it.
  return renderChapter(part.node, model.registry, { numbered: model.numbered, ...ctx });
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
/** The live chapter rail, gated on chapter-nav and threaded with chapter-nav-depth (#221). Chapter
 *  links are the `?[page&]chapter=<stem>` route; at navDepth≥2 a section link is the owning chapter's
 *  route + `#<id>` (a cross-chapter section route, not a bare hash). Returns '' when chapter-nav is off. */
function liveRail(parts, activeId, home, bookNav, pageSlug) {
  if (!bookNav.chapterNav) return '';
  const sHref = (p, s) => sectionHref(p, s, pageSlug);
  // #459 part 2: combined mode returns the ONE expanding nav (absorbs on-this-page); the caller passes
  // no on-this-page rail. Section links are the owning chapter's route + `#<id>`, exactly as depth>=2.
  if (bookNav.combined) {
    const nav = buildCombinedNav(parts, (p) => chapterHref(p, pageSlug), activeId, home, { sectionHref: sHref, bookNav });
    return nav ? toHtml(nav) : '';
  }
  const opts = bookNav.chapterNavDepth >= 2 ? { navDepth: bookNav.chapterNavDepth, sectionHref: sHref } : {};
  return toHtml(buildChapterRail(parts, (p) => chapterHref(p, pageSlug), activeId, home, opts));
}

/** Rewrite a rendered chapter's CROSS-chapter ref hrefs (`#anchor` whose owning chapter ≠ this one) to
 *  the owning chapter's route + the anchor (`?[page&]chapter=<owning-stem>#<anchor>`) — the live analog
 *  of P1's `<stem>.html#anchor` rewrite, via the SAME shared `rewriteCrossPageHrefs`. A SAME-chapter ref
 *  stays a bare `#anchor` (a pure in-page scroll). Done in the VIEW, never in renderLiveChapterContent
 *  (that stays bare — the parity target). Refs owned by NO chapter of this book (a cross-PAGE website ref)
 *  are left bare for the website's own cross-page rewrite (resolveRefs) to handle. */
function rewriteCrossChapterRefs(html, currentOwnerId, model) {
  const byId = new Map(model.parts.map((p) => [p.id, p]));
  return rewriteCrossPageHrefs(html, currentOwnerId, {
    // #404 total ownership: a REGISTERED target outside every chapter is front-region content,
    // owned by the cover — its href is the cover route + anchor (the front content renders
    // there). A NON-registered anchor stays null → left bare (a cross-PAGE website ref for
    // resolveRefs, or a purely local id) — unchanged.
    ownerOf: (anchor) => {
      const e = model.registry.get(anchor);
      if (!e) return null;
      return (e.chapter != null && byId.has(e.chapter)) ? e.chapter : COVER_STEM;
    },
    hrefFor: (owner, anchor) => {
      if (owner === COVER_STEM) return `${coverHref(model.pageSlug)}#${anchor}`;
      const owning = byId.get(owner);
      return owning ? `${chapterHref(owning, model.pageSlug)}#${anchor}` : `#${anchor}`;
    },
  });
}

export function renderLiveChapterView(model, idx, ctx) {
  const { parts, bookTitle, bookNav, pageSlug } = model;
  const part = parts[idx];

  const content = rewriteCrossChapterRefs(renderLiveChapterContent(part, model, ctx), part.id, model);
  // cover off → the masthead 'home' points at the first chapter (the landing), not the cover.
  const home = { href: bookNav.cover ? coverHref(pageSlug) : chapterHref(parts[0], pageSlug), title: bookTitle };
  const rail = liveRail(parts, part.id, home, bookNav, pageSlug);
  const onThisPageNav = (!bookNav.combined && bookNav.onThisPage) ? buildOnThisPage([part]) : null; // #248 (#459 part 2: absorbed when combined)
  const onThisPage = onThisPageNav ? toHtml(onThisPageNav) : '';
  const navBar = chapterNavBar(parts, idx, (p) => chapterHref(p, pageSlug));
  const prevNext = (bookNav.pageNavigation && navBar) ? toHtml(navBar) : '';
  // #293 — persistent edge arrows, symmetric with the static build (publish-pages.js): the SAME
  // prevNext targets + the same page-navigation gate, so static≡live and the arrows can't drift.
  const arrowsNav = chapterNavArrows(parts, idx, (p) => chapterHref(p, pageSlug));
  const arrows = (bookNav.pageNavigation && arrowsNav) ? toHtml(arrowsNav) : '';

  return composeBookBody({
    rail, content, prevNext, onThisPage, arrows,
    backToTop: bookNav.backToTop ? BACK_TO_TOP_HTML : '',
    bookNav,   // #459 — the nav-placement sides drive the floating dock layout (static≡live)
  }) + liveRailScripts(bookNav);
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
/** #404: the live cover's FRONT-region content — pre-first-part loose nodes rendered the same
 *  wrap-and-stringify way the static cover renders them (publish-pages renderFrontLoose), then
 *  cross-chapter refs rewritten with the COVER as the current owner (front→chapter refs route to
 *  the owning chapter; front→front stays a bare in-page anchor). '' when the book has no front
 *  loose content or no ctx is supplied (older callers) — the cover stays byte-identical. */
function renderLiveFrontLoose(model, ctx) {
  const nodes = model.frontLoose;
  if (!nodes || nodes.length === 0 || !ctx?.proc) return '';
  const wrapped = { type: 'root', children: [makeTag('book', [makeTag('book-body', nodes)])] };
  const html = String(ctx.proc.stringify(wrapped, ctx.file));
  const m = html.match(/<book-body[^>]*>([\s\S]*)<\/book-body>/);
  const inner = m ? m[1].trim() : '';
  return inner ? rewriteCrossChapterRefs(inner, COVER_STEM, model) : '';
}

export function renderLiveCoverView(model, ctx) {
  const { parts, bookTitle, bookNav, contents, pageSlug } = model;
  const home = { href: coverHref(pageSlug), title: bookTitle, current: true };
  const rail = liveRail(parts, null, home, bookNav, pageSlug);
  // #226: a `<config toc>` book renders its whole-book contents overview on the cover view —
  // the live counterpart of the separate-pages cover, structurally identical (static≡live),
  // differing only in href form: chapter → the `?chapter=<stem>` route, section → the owning
  // chapter's route + `#<id>` (chapter-as-page; the hash is purely the section). No `<config toc>`
  // → '' → byte-identical.
  const contentsHtml = contents
    ? toHtml(buildContentsListing(parts, {
        chapterHref: (p) => chapterHref(p, pageSlug),
        sectionHref: (p, s) => sectionHref(p, s, pageSlug),
        title: contents.title,
        depth: contents.depth,
      }))
    : '';
  return composeBookBody({
    rail, content: coverBodyHtml(bookTitle, contentsHtml, renderLiveFrontLoose(model, ctx)),
    backToTop: bookNav.backToTop ? BACK_TO_TOP_HTML : '',
    bookNav,   // #459 — placement floats the cover's chapter rail too (static≡live)
  }) + liveRailScripts(bookNav);
}

/**
 * Resolve the chapter-as-page route to a routing destination. The router's pure core (no DOM), shared
 * by the three browser entries (standalone read / standalone edit / website sub-view) and the Node smoke
 * test. The chapter comes from the `?chapter=` QUERY (direct — no longer competing with the hash); the
 * hash is PURELY the section anchor to scroll to once the chapter is mounted.
 *
 *   - no chapter          → the COVER (#209; or the first chapter when cover is off). A stray section
 *                           hash with no chapter falls back to its OWNING chapter via idToStem (so an
 *                           in-content `#id` or an old `#id` deep-link still lands somewhere correct).
 *   - a known chapter stem → that chapter; the hash (if any) is its section anchor.
 *   - an unknown stem      → null (caller no-ops).
 *
 * @param {string} chapter - the `?chapter=` query value (the chapter stem; '' / null = none)
 * @param {string} hash - location.hash (with or without the leading '#') — the section anchor
 * @param {object} model - the buildLiveBook result (stemToIndex + idToStem)
 * @returns {{ cover: true } | { cover: false, index: number, anchor: string|null } | null}
 */
export function resolveRoute(chapter, hash, model) {
  const stem = String(chapter || '');
  const anchor = String(hash || '').replace(/^#/, '') || null;
  if (stem === '') {
    // No chapter selected. A stray section hash → its owning chapter (graceful: an in-content `#id`
    // click that didn't carry a chapter, or an old `#id` deep-link), else the cover.
    if (anchor && model.idToStem.has(anchor)) {
      const stem = model.idToStem.get(anchor);
      // #404: a cover-owned anchor (front-region content) routes to the cover and scrolls there — BUT a
      // cover-OFF book has no cover view (it lands on the first chapter; the static build redirects its
      // index there). Honor cover-off the way the no-anchor branch below does, so a coverless book never
      // routes to a cover the invariant forbids — degrade to the first chapter instead.
      if (stem === COVER_STEM) {
        return model.bookNav?.cover === false ? { cover: false, index: 0, anchor } : { cover: true, anchor };
      }
      return { cover: false, index: model.stemToIndex.get(stem), anchor };
    }
    // #221: cover off → the no-chapter route lands on the first chapter, not a cover view.
    return model.bookNav?.cover === false ? { cover: false, index: 0, anchor } : { cover: true };
  }
  if (model.stemToIndex.has(stem)) return { cover: false, index: model.stemToIndex.get(stem), anchor };
  return null;
}

// ─── The edit loop: incremental rebuild (#203) ────────────────────────────────
//
// The authoring payoff the epic was built for. Editing a chapter's source rebuilds the
// model and re-renders ONLY that chapter — never the whole book. Two costs are bounded:
//   - PARSE is incremental: a memoized parse re-parses only the edited chapter (its source
//     string is new → cache miss); every unchanged child + the master is served from cache.
//   - RENDER is single-chapter: the browser loop re-renders only the current chapter.
// The ASSEMBLE + the cheap GLOBAL pass (runSync: numbering + cross-ref resolution, no
// render) DO run over the whole assembled tree each edit — that is what keeps a cross-
// reference in another chapter correct after a structural edit (e.g. a new figure shifts
// the numbers), even though that chapter isn't re-rendered until you navigate to it.
//
// WHY CLONE: runSync is destructive — ref-resolution REPLACES `<ref>` nodes with markers,
// numbering stamps nodes. So a cached parse tree cannot be fed to a second runSync as-is
// (its `<ref>`s would already be gone). parseMemo returns a structuredClone of the cached
// tree, so each rebuild assembles from fresh clones and runSync mutates the clones, never
// the cache. Clone is far cheaper than parse — so "re-parse only the edited chapter" holds.

/**
 * Build an incremental rebuilder over an in-memory source map. Each `rebuild()` assembles
 * the master from the CURRENT `sources` (re-parsing only sources not seen before), runs the
 * cheap global pass, and returns a fresh live book model + the numbered tree + the VFile.
 *
 * @param {object} opts
 * @param {string} opts.masterSource - the master document's .emd source (unchanged across edits)
 * @param {Map<string,string>} opts.sources - childSrc → current source text; the caller MUTATES
 *   this map in place on edit (set the edited child's new text) before calling rebuild()
 * @param {object} opts.proc - the configured pipeline (its parse + runSync + buildLiveBook)
 * @param {object} [opts.loadedSources] - the preloaded `<library src>` / `<table src>` map
 *   (rides each rebuild's VFile for the table/library handlers; the structure children are
 *   read from `sources`, not from here)
 * @param {string|null} [opts.pageSlug] - the website page slug when this book edits as a website
 *   sub-view (so the rebuilt model's rail/route hrefs are `?page=<slug>&chapter=…`); null standalone.
 * @returns {{ rebuild: () => { numbered: object, file: object, model: object } }}
 */
export function createIncrementalRebuilder({ masterSource, sources, proc, loadedSources = {}, pageSlug = null }) {
  // Memoize parse by source string; return a CLONE so the cached tree stays pristine while
  // runSync mutates the assembled clones. Cache-miss == a source seen for the first time
  // (the edited chapter on each edit), so exactly one re-parse per edit.
  const parseCache = new Map();
  const parseMemo = (src) => {
    if (!parseCache.has(src)) parseCache.set(src, proc.parse(src));
    return structuredClone(parseCache.get(src));
  };

  function rebuild() {
    // A FRESH VFile each rebuild: the numbering registry lives on file.data and must not
    // carry over from the previous pass (ensureRegistry reuses an existing one). The loaded
    // library/table sources ride along for the handlers; structure children come from `sources`.
    const file = { data: { [ENSCRIBE_LOADED_SOURCES]: loadedSources } };
    const tree = assembleMasterDocument({
      source: masterSource,
      parse: parseMemo,
      resolve: (rel) => rel,
      readFile: (src) => {
        const text = sources.get(src);
        if (text == null) throw new Error(`createIncrementalRebuilder: no in-memory source for "${src}"`);
        return text;
      },
      warn: () => {},
    });
    const numbered = proc.runSync(tree, file);
    const model = buildLiveBook({ numbered, file, pageSlug });
    return { numbered, file, model };
  }

  return { rebuild };
}

/**
 * Render a chapter's EDIT VIEW (#203) — a GitHub-style Write/Preview tabbed pane, the live
 * counterpart of a read chapter view. The chapter rail (+ masthead) stays left; the main
 * column holds a tab bar (Source | Preview) + an "preview — unsaved" marker, a SOURCE pane
 * (an empty mount the browser entry fills with the editor adapter), and a PREVIEW pane (the
 * live-rendered chapter — `renderLiveChapterContent` + prev/next, the SAME render path as
 * read mode, so the preview content matches what the book publishes). Source tab is active
 * by default (you arrive to type); the browser entry toggles the panes and updates the
 * preview on each debounced edit. The edit view composes through the SAME `composeBookBody` as read
 * mode, so it carries BOTH rails — the chapter rail (left) and the on-this-page rail (right) — placed
 * identically to a read chapter, with the document replaced by the Write/Preview tabs.
 *
 * @param {object} model - the (current) buildLiveBook result
 * @param {number} idx - the chapter's index in model.parts
 * @param {object} ctx - { proc, file }
 * @returns {string} the mounted edit-view HTML
 */
/**
 * The PREVIEW pane body for a chapter in edit mode: the live-rendered chapter content +
 * its prev/next bar + the live-rail scripts — the SAME render path AND the SAME scripts read
 * mode ships (renderLiveChapterView), so the preview matches what the book publishes AND its
 * on-this-page / scroll-spy rail spies exactly like read mode. The scripts ride INSIDE this
 * body (not appended to the surrounding edit view) because the edit loop only ever runs
 * `executeAssets` on the PREVIEW PANE — on first mount AND on each debounced re-render — never
 * on the whole edit view; a script outside the pane would never execute. Carrying them here is
 * also what re-arms the rail after every edit: the pane is re-rendered with the scripts, then
 * re-executed (ON_THIS_PAGE_JS / SCROLL_SPY_JS have no init guard, so re-running cleanly
 * re-observes the fresh section nodes — the same re-run read mode does on a chapter swap).
 *
 * @param {object} model - the (current) buildLiveBook result
 * @param {number} idx - the chapter's index in model.parts
 * @param {object} ctx - { proc, file }
 * @returns {string} the preview pane's inner HTML
 */
export function renderLiveChapterPreviewBody(model, idx, ctx) {
  const navBar = chapterNavBar(model.parts, idx, (p) => chapterHref(p, model.pageSlug));
  const prevNext = (model.bookNav.pageNavigation && navBar) ? toHtml(navBar) : '';
  return renderLiveChapterContent(model.parts[idx], model, ctx) + prevNext + liveRailScripts(model.bookNav);
}

export function renderLiveChapterEditView(model, idx, ctx) {
  const { parts, bookTitle, bookNav, pageSlug } = model;
  const part = parts[idx];

  const previewBody = renderLiveChapterPreviewBody(model, idx, ctx);

  const home = { href: bookNav.cover ? coverHref(pageSlug) : chapterHref(parts[0], pageSlug), title: bookTitle };
  const rail = liveRail(parts, part.id, home, bookNav, pageSlug);
  // The on-this-page rail reflects the CHAPTER being edited — built from `[part]`, EXACTLY as read mode
  // (renderLiveChapterView) builds it — so the editable chapter carries both rails, placed identically.
  const onThisPageNav = (!bookNav.combined && bookNav.onThisPage) ? buildOnThisPage([part]) : null; // #248 (#459 part 2: absorbed when combined)
  const onThisPage = onThisPageNav ? toHtml(onThisPageNav) : '';

  // Compose through the SAME composeBookBody read mode uses — NOT a hand-rolled grid. The shared
  // Write/Preview UI (buildEditMainInner, #216) is the `content`, wrapped in `<div class="enscribe-edit-
  // main">` (a <main> cannot nest inside composeBookBody's own `<main class="enscribe-body">`). So the
  // editable chapter looks exactly like a read chapter — chapter rail + content column + on-this-page
  // rail — with the document replaced by the tabs. (The preview pane already carries the chapter's
  // prev/next bar AND the live-rail scripts via renderLiveChapterPreviewBody, so no separate prevNext
  // and no BOOK_LIVE_RAIL_SCRIPTS is appended here: the edit loop runs executeAssets on the PREVIEW
  // PANE only, so the rail scripts must live inside the pane — appending them out here would never run.)
  const editMain = `<div class="enscribe-edit-main">${buildEditMainInner(previewBody)}</div>`;
  return composeBookBody({ rail, content: editMain, onThisPage, bookNav });   // #459 — placed identically to read mode
}
