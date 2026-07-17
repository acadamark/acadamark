// Conditionally-injected CSS/JS for the configurable book navigation chrome (#221).
//
// These live OUTSIDE default.css (which is inlined verbatim into every book page's
// <style>) so a DEFAULT book — chapter-nav on, chapter-nav-depth 1, back-to-top off —
// receives NONE of them and stays byte-identical to before. Each block is appended
// only when its feature is active, by BOTH the static page shell (publish-pages.js)
// and the live shell — the MARGIN_CSS / TOC_CONFIG_CSS / BOOK_HOME_CSS pattern, so the
// static build and the live render gate the same chrome with the same assets.
// Authority: notes/specs/book-navigation.md.

// The book layout class list (the base; `--book-3col` / `--book-noleft` are added by
// composeBookBody per the chrome present). Single-sourced here so the static and live
// book bodies cannot drift.
export const BOOK_LAYOUT = 'enscribe-layout enscribe-layout--toc enscribe-layout--book';

/** #459 part 1 — resolve the nav-placement decision from a bookNav config. The two navs
 *  (chapter rail, on-this-page) each float LEFT or RIGHT; the defaults (rail left,
 *  on-this-page right) reproduce today's sticky-grid, so `floating` is false unless the
 *  author moved a nav — keeping a default book byte-identical. Shared by BOTH book layout
 *  assemblers (composeBookBody here + applyBookToc in lib/toc.js) so the placement rule
 *  has one source. `floating` is also forced on by margin notes, but that is decided by the
 *  --margin class (added later by markMarginLayout), not here — see notes/specs/book-navigation.md. */
export function resolveBookPlacement(bookNav = {}) {
  const chapterNavSide = bookNav?.chapterNavSide === 'right' ? 'right' : 'left';
  const onThisPageSide = bookNav?.onThisPageSide === 'left' ? 'left' : 'right';
  const floating = chapterNavSide !== 'left' || onThisPageSide !== 'right';
  return { chapterNavSide, onThisPageSide, floating };
}

/** Compose a book chapter/cover body from the chrome pieces present (#221 / #459). At default
 *  placement (rail left, on-this-page right) this is exactly the pre-#221 sticky-grid layout;
 *  chapter-nav off drops the left column — `--book-noleft` (a 2-col grid) when a right rail
 *  remains, or no grid at all when neither rail is present. When the author moves a nav to a
 *  non-default side (#459 part 1), the layout switches to the FLOATING regime: `--book-float`
 *  on the wrapper + a fixed per-side DOCK holding whichever navs chose that side (so same-side
 *  navs stack in one dock, and each nav floats independently). The back-to-top control rides
 *  inside `<main>` (fixed-positioned, so DOM location is immaterial). Shared by the static
 *  separate-pages build (publish-pages.js) and the live render (live-book.js). */
export function composeBookBody({ rail = '', content = '', prevNext = '', onThisPage = '', backToTop = '', arrows = '', bookNav = {} }) {
  // `arrows` (#293): the persistent edge prev/next chapter arrows. Like back-to-top they are
  // fixed-positioned, so DOM location is immaterial — they ride inside `<main>` (per-chapter, so the
  // live router re-renders them with the right targets on each chapter swap).
  const main = `<main class="enscribe-body">${content}${prevNext}${backToTop}${arrows}</main>`;

  const { chapterNavSide, onThisPageSide, floating } = resolveBookPlacement(bookNav);
  if (floating) {
    // Group the present navs by their chosen side; within a side, the whole-book rail sits above
    // the in-page on-this-page rail (reading order). An empty dock is omitted.
    const dock = (side, cls) => {
      const inner = [chapterNavSide === side ? rail : '', onThisPageSide === side ? onThisPage : ''].filter(Boolean).join('');
      return inner ? `<div class="enscribe-book-dock ${cls}">${inner}</div>` : '';
    };
    const left = dock('left', 'enscribe-book-dock--left');
    const right = dock('right', 'enscribe-book-dock--right');
    return `<div class="${BOOK_LAYOUT} enscribe-layout--book-float">${left}${main}${right}</div>`;
  }

  // Default placement — the sticky-grid (byte-identical to before #459).
  if (rail && onThisPage) return `<div class="${BOOK_LAYOUT} enscribe-layout--book-3col">${rail}${main}${onThisPage}</div>`;
  if (rail) return `<div class="${BOOK_LAYOUT}">${rail}${main}</div>`;
  if (onThisPage) return `<div class="${BOOK_LAYOUT} enscribe-layout--book-noleft">${main}${onThisPage}</div>`;
  return main;
}

// chapter-nav OFF while the right "on this page" rail is still present: a two-column
// grid with NO left rail. The base `.enscribe-layout--toc` desktop rule reserves a
// 14rem left column; this overrides it (same specificity, so it must be injected AFTER
// default.css — which the conditional-append below guarantees).
export const BOOK_NAV_NOLEFT_CSS = `@media (min-width: 900px) {
  .enscribe-layout--book.enscribe-layout--book-noleft {
    grid-template-columns: minmax(0, var(--enscribe-content-width)) 13rem;
    max-width: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 13rem);
  }
}`;

// chapter-nav-depth >= 2: the rail nests each chapter's sections beneath it. The nested
// list reuses the rail anchor styling; this indents and de-emphasises the section links.
export const BOOK_NAV_DEPTH_CSS = `.enscribe-chapter-rail .enscribe-rail-sections {
  list-style: none;
  margin: 0;
  padding-left: var(--enscribe-space-3);
}
.enscribe-chapter-rail .enscribe-rail-section a {
  font-size: var(--enscribe-text-xs);
  color: var(--enscribe-text-muted);
}
.enscribe-chapter-rail .enscribe-rail-section a:hover { color: var(--enscribe-link); }`;

// #293 (+ the mobile follow-up) — prev/next chapter arrows (`‹` / `›`). ONE control (chapterNavArrows),
// reading ONE prev/next source (prevNextParts), with TWO responsive renderings. Gated on
// `page-navigation` (the SAME flag as the bottom prev/next bar); lives here (not default.css) so a
// `page-navigation=false` book stays byte-identical.
//
//  - MOBILE (< 984px, single full-width column, no gutter): the arrows render IN-FLOW at the FOOT of the
//    chapter as tappable buttons showing the chevron + the destination chapter title (the FPP3 pattern —
//    a reader who finishes the chapter lands right on them). The redundant text foot links
//    (`.enscribe-chapter-nav`) are HIDDEN below 984px, so the foot has ONE coherent affordance (the
//    arrows REPLACE the text links on mobile). No overlap, no shrinking the narrow column.
//  - DESKTOP (>= 984px): each arrow is a fixed GUTTER chevron CENTERED in the free gutter between the
//    reading column and its rail (14rem left rail, 13rem right rail in 3-col), tracking the grid via
//    inherited per-variant vars — with clearance on BOTH sides, never over the rail or the content, at
//    any width; the text foot links stay. The mobile title label is hidden here (bare chevron).
//    (#420 shipped the chevrons here but its calc omitted the grid's own horizontal padding, dropping
//    the right chevron onto the on-this-page rail at every desktop width — corrected below.)
//
// Guarded by a headless width-sweep-vs-all-neighbors check (packages/cli/test/arrows-clearance.test.js):
// both chevrons rect-intersect none of {column, left rail, right rail, back-to-top} across 984–1700px.
export const CHAPTER_ARROWS_CSS = `.enscribe-chapter-arrows {
  display: flex;
  align-items: stretch;
  gap: var(--enscribe-space-3);
  margin-top: var(--enscribe-space-8);
}
.enscribe-chapter-arrow {
  display: inline-flex;
  align-items: center;
  gap: var(--enscribe-space-2);
  max-width: 48%;
  min-height: 2.75rem;
  box-sizing: border-box;
  padding: var(--enscribe-space-2) var(--enscribe-space-3);
  border: 1px solid var(--enscribe-border);
  border-radius: var(--enscribe-radius, 6px);
  background: var(--enscribe-bg-raised, #fff);
  color: var(--enscribe-text-secondary);
  font-size: var(--enscribe-text-sm, 0.875rem);
  line-height: 1.2;
  text-decoration: none;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.enscribe-chapter-arrow--next { margin-left: auto; text-align: right; }
.enscribe-chapter-arrow-glyph { flex: none; font-size: 1.4rem; line-height: 1; }
.enscribe-chapter-arrow-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.enscribe-chapter-arrow:hover,
.enscribe-chapter-arrow:focus-visible { color: var(--enscribe-link); border-color: var(--enscribe-link); }
.enscribe-chapter-arrow:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0, 82, 204, 0.35); }
@media (max-width: 983.98px) {
  .enscribe-chapter-nav { display: none; }   /* on mobile the foot arrows REPLACE the text links (no stacking) */
}
@media (min-width: 984px) {
  .enscribe-chapter-arrows { margin-top: 0; }   /* fixed children → no in-flow foot row */
  .enscribe-layout--book {
    --enscribe-book-gridw: calc(14rem + var(--enscribe-space-12) + var(--enscribe-content-width));
    --enscribe-book-lrail: 14rem;
    --enscribe-book-rrail: 0px;
    /* The chevron centers in the FREE GUTTER (the grid's column-gap = --enscribe-space-12) between the
       content column and a rail. Its diameter is therefore < the gutter, and the clearance each side is
       (--enscribe-space-12 - this) / 2. At 3rem gutter / 2rem diameter that is 0.5rem each side. */
    --enscribe-book-arrow-size: 2rem;
  }
  .enscribe-layout--book.enscribe-layout--book-3col {
    --enscribe-book-gridw: calc(14rem + var(--enscribe-space-12) + var(--enscribe-content-width) + var(--enscribe-space-12) + 13rem);
    --enscribe-book-rrail: 13rem;
  }
  .enscribe-layout--book.enscribe-layout--book-noleft {
    --enscribe-book-gridw: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 13rem);
    --enscribe-book-lrail: 0px;
    --enscribe-book-rrail: 13rem;
  }
  .enscribe-chapter-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    justify-content: center;
    gap: 0;
    width: var(--enscribe-book-arrow-size);
    height: var(--enscribe-book-arrow-size);
    min-height: 0;
    max-width: none;
    padding: 0;
    border-radius: 50%;
    font-size: 1.4rem;
    line-height: 1;
    opacity: 0.5;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    transition: opacity 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .enscribe-chapter-arrow--next { margin-left: 0; }
  .enscribe-chapter-arrow-label { display: none; }   /* bare chevron in the gutter */
  .enscribe-chapter-arrow:hover,
  .enscribe-chapter-arrow:focus-visible { opacity: 1; }
  /* Sit the chevron CENTERED in the free gutter between the content column and the rail, on both the
     standalone book and the website-embedded book page. The offset is, from the viewport edge:
       grid-box margin  +  the grid's own horizontal padding  +  the rail width  +  half the leftover gutter.
     The margin is max(0px, (100vw - gridw)/2) — 0px (not space-2) because the grid fills the viewport when
     it is narrower than its gridw, so its real side margin is 0 there; a space-2 floor there shoved the
     chevron toward the rail. The --enscribe-content-padding term was the missing piece (#420 sized the
     grid box but not its padding), which is exactly what dropped the chevron onto the on-this-page rail. */
  .enscribe-chapter-arrow--prev {
    left: calc(max(0px, (100vw - var(--enscribe-book-gridw, 0px)) / 2) + var(--enscribe-content-padding) + var(--enscribe-book-lrail, 0px) + (var(--enscribe-space-12) - var(--enscribe-book-arrow-size)) / 2);
  }
  .enscribe-chapter-arrow--next {
    right: calc(max(0px, (100vw - var(--enscribe-book-gridw, 0px)) / 2) + var(--enscribe-content-padding) + var(--enscribe-book-rrail, 0px) + (var(--enscribe-space-12) - var(--enscribe-book-arrow-size)) / 2);
  }
}`;

// #459 part 1 — the FLOATING book-nav regime. Engaged when the author moves a nav to a
// non-default side (composeBookBody / applyBookToc add `.enscribe-layout--book-float` + per-side
// docks). The reading column centers as a single column and each nav becomes a FIXED dock on its
// chosen side, z-index ABOVE the scrolling content — so a right dock over right-margin notes lets the
// notes pass BEHIND it (the ruling's required stacking; margin-css.js owns the note gutter itself).
// The `top:` offset reads `--enscribe-site-nav-height` (0 on a standalone/single-page book, 3.25rem
// on a website page), so the same rule tucks the docks under the website top bar automatically — no
// per-surface override. Injected only when floating (default books stay the sticky-grid, byte-stable),
// so it lives OUTSIDE default.css like BOOK_NAV_NOLEFT_CSS; it must be injected AFTER the base sheet
// (all four channels do) and AFTER CHAPTER_ARROWS_CSS (so the float override of the gutter chevrons
// wins). Below the desktop breakpoint the docks fall back into normal flow (stacked with the content).
// Authority: notes/specs/book-navigation.md ("Floating placement" + "The stacking rule").
export const BOOK_FLOAT_CSS = `.enscribe-layout--book-float {
  display: block;
  max-width: var(--enscribe-content-width);
  margin: 0 auto;
}
.enscribe-layout--book-float .enscribe-book-dock { margin: var(--enscribe-space-6) 0; }
@media (min-width: 900px) {
  .enscribe-layout--book-float {
    max-width: none;
    padding: 0;
  }
  /* The reading column keeps the readable measure but SHRINKS to leave a fixed dock gutter
     (14rem + gap) on each side, so the fixed docks never underlap the text at any width >= 900px. */
  .enscribe-layout--book-float > .enscribe-body {
    max-width: min(var(--enscribe-content-width), calc(100vw - 2 * (14rem + var(--enscribe-space-12))));
    margin: 0 auto;
  }
  .enscribe-layout--book-float .enscribe-book-dock {
    position: fixed;
    top: calc(var(--enscribe-site-nav-height, 0px) + var(--enscribe-space-8));
    width: 14rem;
    max-height: calc(100vh - var(--enscribe-site-nav-height, 0px) - 2 * var(--enscribe-space-8));
    overflow-y: auto;
    z-index: 30;
    margin: 0;
    /* Opaque page-colour panel: invisible on a plain page (matches the body), but it OCCLUDES
       scrolling margin notes that pass under it, so "notes pass behind the nav" is a clean pass
       behind an opaque panel (the ruling's word), not text bleeding through. Theme-aware token. */
    background: var(--enscribe-bg);
  }
  .enscribe-layout--book-float .enscribe-book-dock--left  { left: var(--enscribe-space-6); }
  .enscribe-layout--book-float .enscribe-book-dock--right { right: var(--enscribe-space-6); }
  /* Same-side navs stack in one dock (the whole-book rail above the in-page rail). */
  .enscribe-layout--book-float .enscribe-book-dock > * + * { margin-top: var(--enscribe-space-8); }
  /* A docked on-this-page rail is always shown (it is no longer a sticky grid column). */
  .enscribe-layout--book-float .enscribe-onthispage { position: static; max-height: none; overflow: visible; }
}
@media (min-width: 984px) {
  /* The #293 gutter chevrons anchor to the grid columns, which the float regime removes; drop them
     here and let the foot prev/next text links (visible at this width) carry chapter navigation. */
  .enscribe-layout--book-float .enscribe-chapter-arrows { display: none; }
}`;

// back-to-top ON: a fixed scroll-to-top control, hidden until the reader scrolls down
// past one viewport. JS off → the control stays `hidden` (no broken affordance).
export const BACK_TO_TOP_CSS = `.enscribe-back-to-top {
  position: fixed;
  right: var(--enscribe-space-6);
  bottom: var(--enscribe-space-6);
  width: 2.75rem;
  height: 2.75rem;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--enscribe-border);
  border-radius: 50%;
  background: var(--enscribe-bg-raised, #fff);
  color: var(--enscribe-text-secondary);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
.enscribe-back-to-top.enscribe-back-to-top--visible { display: flex; }
.enscribe-back-to-top:hover { color: var(--enscribe-link); border-color: var(--enscribe-link); }`;

// The control markup, inserted into each chapter view when back-to-top is on. `hidden`
// until the script enables it, so a no-JS reader never sees a dead button.
export const BACK_TO_TOP_HTML =
  '<button type="button" class="enscribe-back-to-top" data-enscribe-back-to-top aria-label="Back to top" hidden>↑</button>';

// Reveal the control past one viewport of scroll; clicking it smooth-scrolls to top.
// Idempotent and re-bindable (guards a dataset flag) so the live router can call it after
// each chapter swap. The static separate-pages path runs the IIFE-wrapped string form
// (BACK_TO_TOP_JS) as an inline <script>; the live path imports and calls this directly.
export function bindBackToTop() {
  var btn = document.querySelector('[data-enscribe-back-to-top]');
  if (!btn || btn.dataset.enscribeBound === '1') return;
  btn.dataset.enscribeBound = '1';
  btn.hidden = false;
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    btn.classList.toggle('enscribe-back-to-top--visible', y > window.innerHeight);
  }
  btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export const BACK_TO_TOP_JS = `(${bindBackToTop.toString()})();`;

/** Inject the active book-nav CSS as a single <style> in the document head — the live
 *  path, where chapter views are swapped via innerHTML (so they can't carry head CSS).
 *  At defaults a book injects only the chapter-arrows CSS (#293 — `page-navigation` is on by
 *  default); with page-navigation off (and chapter-nav on, depth 1, back-to-top off) it
 *  injects nothing. Idempotent-UPDATE via a fixed element id (#420): a live website mounts
 *  different books under one document, so a second book with a different nav config must
 *  REFRESH the style element, not inherit the first book's (the old early-return did the
 *  latter; a standalone book, which calls this once, is unaffected). */
export function injectBookNavStyles(bookNav, doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d) return;
  const css = [];
  if (!bookNav.chapterNav) css.push(BOOK_NAV_NOLEFT_CSS);
  if (bookNav.chapterNavDepth >= 2) css.push(BOOK_NAV_DEPTH_CSS);
  if (bookNav.backToTop) css.push(BACK_TO_TOP_CSS);
  if (bookNav.pageNavigation) css.push(CHAPTER_ARROWS_CSS);   // #293 — same gate as the bottom prev/next bar
  if (resolveBookPlacement(bookNav).floating) css.push(BOOK_FLOAT_CSS);   // #459 — AFTER arrows so the float override wins
  const text = css.join('\n');
  const existing = d.getElementById('enscribe-book-nav-style');
  if (existing) {
    if (existing.textContent !== text) existing.textContent = text;
    return;
  }
  if (!text) return;
  const style = d.createElement('style');
  style.id = 'enscribe-book-nav-style';
  style.textContent = text;
  d.head.appendChild(style);
}
