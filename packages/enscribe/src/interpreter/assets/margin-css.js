// #33 / #333: margin-column CSS — the layout for margin notes (relocated numbered
// notes: `note-position=margin` for every note, or per-note `<note position=margin>`).
//
// Injected as a scoped <style> ONLY when a document uses the margin — i.e. when
// applySidenotes relocated ≥1 note into the column. A default (bottom-footnote)
// document gets nothing added — the margin is opt-in / additive, and existing
// fixtures stay byte-identical. A STRING CONSTANT, not an fs read, so the browser
// bundle stays fs-free (matching CHAPTER_NAV_JS / SCROLL_SPY_JS).
//
// Reuses the base `.enscribe-layout` / `.enscribe-body` chrome and the
// `--enscribe-*` tokens from the consumer's default.css (the same dependency the
// ToC layout has). Everything is scoped to `.enscribe-layout--margin`, so nothing
// here affects a non-margin document.
//
// Below the breakpoint the relocated `.enscribe-sidenote` copy hides and the bottom
// <note-list> shows (the fallback); at/above it, the copy floats into the right
// margin gutter beside its marker. Precise top-alignment to a marker's line, and
// pixel-tuning the ToC+margin combination, need JS / further CSS work (deferred #33).

export const MARGIN_CSS = `/* Margin column (#33) — margin notes relocated beside their markers; injected only when used. */

/* ── Default / narrow (the mobile fallback) ────────────────────────────────── */
/* The relocated margin copy hides here; the bottom note-list shows instead. */
.enscribe-sidenote { display: none; }

@media (min-width: 900px) {
  /* Relax the body cap so body + margin gutter can be wider (mirrors the ToC
     layout); only when a margin layout is present. */
  body:has(.enscribe-layout--margin) { max-width: none; padding: 0; }

  .enscribe-layout--margin {
    margin: 0 auto;
    padding: 0 var(--enscribe-content-padding);
    /* the readable body column plus a margin gutter to its right */
    max-width: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 18rem);
  }

  /* The body keeps the readable measure; the gutter to its right holds the notes. */
  .enscribe-layout--margin .enscribe-body {
    max-width: var(--enscribe-content-width);
    margin-right: calc(var(--enscribe-space-12) + 18rem);
  }

  /* The margin copy floats into the right gutter, near its anchor. */
  .enscribe-layout--margin .enscribe-sidenote {
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
  .enscribe-layout--margin .enscribe-sidenote > sup {
    font-family: var(--enscribe-font-sans);
    font-size: var(--enscribe-text-xs);
    color: var(--enscribe-link);
    margin-right: var(--enscribe-space-1);
  }

  /* On wide screens the bottom note-list is redundant with the relocated copies. */
  .enscribe-layout--margin note-list { display: none; }

  /* ── ToC + margin combined (#33 part 2, folded loose end) ───────────────────
     A document with BOTH a ToC sidebar and margin content uses a three-track
     grid — ToC | body | margin gutter — so the floats land in a real gutter
     track instead of overrunning the ToC layout's two-column grid. */
  .enscribe-layout--toc.enscribe-layout--margin {
    display: grid;
    grid-template-columns: 14rem minmax(0, var(--enscribe-content-width)) 18rem;
    column-gap: var(--enscribe-space-12);
    max-width: calc(14rem + var(--enscribe-content-width) + 18rem + 2 * var(--enscribe-space-12));
  }
  /* In the combined grid the body is the middle track and the gutter is the
     third track, so the floats use the column-gap offset, not the single-layout
     negative margin against the body. */
  .enscribe-layout--toc.enscribe-layout--margin .enscribe-body { margin-right: 0; }
  .enscribe-layout--toc.enscribe-layout--margin .enscribe-sidenote {
    margin-right: calc(-1 * (18rem + var(--enscribe-space-12)));
  }
}
`;
