// #33 (part 1): sidenote margin-render CSS.
//
// Injected as a scoped <style> ONLY when a document is in margin mode
// (note-position=margin) and has notes to project — so a default (bottom-
// footnote) document gets nothing added (the mode is opt-in / additive; existing
// fixtures stay byte-identical). A STRING CONSTANT, not an fs read, so the
// browser bundle stays fs-free — matching CHAPTER_NAV_JS / SCROLL_SPY_JS.
//
// Reuses the base `.enscribe-layout` / `.enscribe-body` chrome and the
// `--enscribe-*` tokens from the consumer's default.css (the same dependency the
// ToC layout has). These rules add only the sidenote-specific margin variant and
// the per-note float, all scoped to `.enscribe-layout--sidenotes`, so nothing
// here can affect a bottom-footnote document.
//
// Below the breakpoint the margin copies hide and the bottom <note-list> shows
// (the existing footnote rendering — the mobile fallback). At/above it, each note
// floats into a right-margin gutter near its marker. Precise top-alignment of a
// note to its marker's line needs JS measurement and is deferred (#33).

export const SIDENOTES_CSS = `/* Sidenotes (margin render mode, #33 part 1) — injected only in margin mode. */

/* Default / narrow (the mobile fallback): the margin copy is hidden; the bottom
   note-list shows. */
.enscribe-sidenote { display: none; }

@media (min-width: 900px) {
  /* Relax the body's single-column cap so body + margin gutter can be wider,
     only when a sidenote layout is present (mirrors the ToC layout). */
  body:has(.enscribe-layout--sidenotes) { max-width: none; padding: 0; }

  .enscribe-layout--sidenotes {
    margin: 0 auto;
    padding: 0 var(--enscribe-content-padding);
    /* the readable body column plus a margin gutter to its right */
    max-width: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 18rem);
  }

  /* The body keeps the readable measure; the gutter to its right holds the notes. */
  .enscribe-layout--sidenotes .enscribe-body {
    max-width: var(--enscribe-content-width);
    margin-right: calc(var(--enscribe-space-12) + 18rem);
  }

  /* Each note floats into the right gutter, near its marker. */
  .enscribe-layout--sidenotes .enscribe-sidenote {
    display: block;
    float: right;
    clear: right;
    width: 18rem;
    margin-right: -18rem;
    margin-bottom: var(--enscribe-space-3);
    font-size: var(--enscribe-text-sm);
    line-height: var(--enscribe-line-height-tight);
    color: var(--enscribe-text-secondary);
    text-indent: 0;
  }

  /* The note number, carried verbatim from the bottom-list <sup>. */
  .enscribe-layout--sidenotes .enscribe-sidenote > sup {
    font-family: var(--enscribe-font-sans);
    font-size: var(--enscribe-text-xs);
    color: var(--enscribe-link);
    margin-right: var(--enscribe-space-1);
  }

  /* On wide screens the bottom list is redundant with the margin copies. */
  .enscribe-layout--sidenotes note-list { display: none; }
}
`;
