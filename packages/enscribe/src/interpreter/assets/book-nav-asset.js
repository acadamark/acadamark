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

/** Compose a book chapter/cover body from the chrome pieces present (#221). At defaults
 *  (left rail on) this is exactly the pre-#221 layout; chapter-nav off drops the left
 *  column — `--book-noleft` (a 2-col grid) when a right rail remains, or no grid at all
 *  when neither rail is present. The back-to-top control rides inside `<main>` (it is
 *  fixed-positioned, so DOM location is immaterial). Shared by the static separate-pages
 *  build (publish-pages.js) and the live render (live-book.js). */
export function composeBookBody({ rail = '', content = '', prevNext = '', onThisPage = '', backToTop = '' }) {
  const main = `<main class="enscribe-body">${content}${prevNext}${backToTop}</main>`;
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
 *  A NO-OP at defaults (chapter-nav on, depth 1, back-to-top off), so a default live book
 *  is byte-unchanged. Idempotent via a fixed element id. */
export function injectBookNavStyles(bookNav, doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d || d.getElementById('enscribe-book-nav-style')) return;
  const css = [];
  if (!bookNav.chapterNav) css.push(BOOK_NAV_NOLEFT_CSS);
  if (bookNav.chapterNavDepth >= 2) css.push(BOOK_NAV_DEPTH_CSS);
  if (bookNav.backToTop) css.push(BACK_TO_TOP_CSS);
  if (!css.length) return;
  const style = d.createElement('style');
  style.id = 'enscribe-book-nav-style';
  style.textContent = css.join('\n');
  d.head.appendChild(style);
}
