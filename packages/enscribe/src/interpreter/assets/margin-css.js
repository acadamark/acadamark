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
// Below the breakpoint the relocated `sidenote` copy hides and the bottom
// <note-list> shows (the fallback); at/above it, the copy floats into the right
// margin gutter beside its marker. Precise top-alignment to a marker's line, and
// pixel-tuning the ToC+margin combination, need JS / further CSS work (deferred #33).

export const MARGIN_CSS = `/* Margin column (#33) — margin notes relocated beside their markers; injected only when used. */

/* ── Default / narrow (the mobile fallback) ────────────────────────────────── */
/* The relocated margin copy hides here; the bottom note-list shows instead. */
sidenote { display: none; }

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
  .enscribe-layout--margin sidenote {
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
  .enscribe-layout--margin sidenote > sup {
    font-family: var(--enscribe-font-sans);
    font-size: var(--enscribe-text-xs);
    color: var(--enscribe-link);
    margin-right: var(--enscribe-space-1);
  }

  /* On wide screens the bottom note-list is redundant with the relocated copies. */
  .enscribe-layout--margin note-list { display: none; }

  /* ── ARTICLE ToC + margin combined (#33 part 2, folded loose end) ───────────
     An ARTICLE with BOTH a ToC sidebar and margin content uses a three-track
     grid — ToC | body | margin gutter — so the floats land in a real gutter
     track instead of overrunning the ToC layout's two-column grid.
     #459 part 1: gated :not(.enscribe-layout--book) — a book ALWAYS carries
     .enscribe-layout--toc (BOOK_LAYOUT), so this rule used to match books too and
     manufacture a phantom third track that fought the book's own 3-column grid and
     dropped the on-this-page rail into the note gutter (the "two grids on one
     wrapper" collision). Books now route margin through their own section below. */
  .enscribe-layout--toc.enscribe-layout--margin:not(.enscribe-layout--book) {
    display: grid;
    grid-template-columns: 14rem minmax(0, var(--enscribe-content-width)) 18rem;
    column-gap: var(--enscribe-space-12);
    max-width: calc(14rem + var(--enscribe-content-width) + 18rem + 2 * var(--enscribe-space-12));
  }
  /* In the combined grid the body is the middle track and the gutter is the
     third track, so the floats use the column-gap offset, not the single-layout
     negative margin against the body. */
  .enscribe-layout--toc.enscribe-layout--margin:not(.enscribe-layout--book) .enscribe-body { margin-right: 0; }
  .enscribe-layout--toc.enscribe-layout--margin:not(.enscribe-layout--book) sidenote {
    margin-right: calc(-1 * (18rem + var(--enscribe-space-12)));
  }

  /* ── BOOK + margin (#459 part 1 — the ruling's layering model) ──────────────
     A book's reading interface owns its own layout, so margin notes on a book do
     NOT reuse the article combined grid (disabled above). Instead the book drops
     its grid and lays out as a single reading column with the two navs FLOATING
     (fixed) above it: the chapter rail on the left, the on-this-page rail on the
     right OVER an 18rem note gutter, and the margin-note copies float into that gutter
     and SCROLL with the text — so they pass BEHIND the fixed right rail (required
     author's-choice behavior, never a bug — notes/specs/book-navigation.md).
     The top offset reads --enscribe-site-nav-height so the fixed navs clear a website
     top bar automatically. Delivered on the single-page compiler surface (the one
     that projects book margin notes today); the per-chapter surfaces get the rules
     but not yet the projection (#467). Explicit placement (--book-float) supplies
     its own docks, so the class-based nav fixing here is guarded :not(--book-float). */
  .enscribe-layout--book.enscribe-layout--margin {
    display: block;
    max-width: none;
    padding: 0;
  }
  .enscribe-layout--book.enscribe-layout--margin > .enscribe-body {
    max-width: var(--enscribe-content-width);
    margin-left: calc(13rem + var(--enscribe-space-12));    /* clear the fixed left rail */
    margin-right: calc(18rem + var(--enscribe-space-12));   /* the note gutter (right rail floats over it) */
  }
  .enscribe-layout--book.enscribe-layout--margin > .enscribe-body sidenote {
    margin-right: calc(-1 * (18rem + var(--enscribe-space-12)));
  }
  .enscribe-layout--book.enscribe-layout--margin:not(.enscribe-layout--book-float) .enscribe-chapter-rail,
  .enscribe-layout--book.enscribe-layout--margin:not(.enscribe-layout--book-float) .enscribe-onthispage {
    position: fixed;
    top: calc(var(--enscribe-site-nav-height, 0px) + var(--enscribe-space-8));
    width: 13rem;
    max-height: calc(100vh - var(--enscribe-site-nav-height, 0px) - 2 * var(--enscribe-space-8));
    overflow-y: auto;
    z-index: 30;   /* above the scrolling margin notes; below the website top bar (100) */
    background: var(--enscribe-bg);   /* opaque page-colour panel so the notes pass cleanly BEHIND it */
  }
  .enscribe-layout--book.enscribe-layout--margin:not(.enscribe-layout--book-float) .enscribe-chapter-rail { left: var(--enscribe-space-6); }
  .enscribe-layout--book.enscribe-layout--margin:not(.enscribe-layout--book-float) .enscribe-onthispage { right: var(--enscribe-space-6); }
}
`;
