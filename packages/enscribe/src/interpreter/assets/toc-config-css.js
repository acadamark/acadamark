// #218: config-driven contents-listing CSS (notes/specs/toc-and-numbering.md).
//
// Injected as a scoped <style> ONLY when a `<config toc>` listing is rendered (index.js
// gates it on the applyConfigToc shape). A document without `<config toc>` gets nothing
// added — the listing is opt-in / additive, so existing fixtures and the inlined-CSS
// goldens stay byte-identical. A STRING CONSTANT, not an fs read, so the browser bundle
// stays fs-free (matching MARGIN_CSS / SCROLL_SPY_JS).
//
// Reuses the base `.enscribe-layout` / `.enscribe-layout--toc` sidebar chrome and the
// `--enscribe-*` tokens from the consumer's default.css (the same dependency the legacy
// ToC layout and MARGIN_CSS have). The injected <style> sits in the body, after the head's
// default.css, so the right-column flip wins the cascade over the base left grid.
//
// Three placements:
//   - body (default): `.enscribe-contents` — an in-flow block at the top of the body,
//     shown in full. NOT a `.enscribe-toc`, so the sidebar rules never touch it.
//   - left:  the base `.enscribe-layout--toc` grid (sticky left sidebar) is reused as-is.
//   - right: `--toc-right` flips the grid column so the sticky listing sits on the right.
// A left/right listing is `.enscribe-toc--collapsible`: its per-parent nested <details>
// give toc-expand its initial collapse (baked at build time), interactive on desktop.

export const TOC_CONFIG_CSS = `
/* Body listing — an in-flow contents block, after the title block, shown in full. */
.enscribe-contents {
  font-family: var(--enscribe-font-sans);
  font-size: var(--enscribe-text-sm);
  line-height: var(--enscribe-line-height-tight);
  margin: 0 0 var(--enscribe-space-8);
  padding-bottom: var(--enscribe-space-6);
  border-bottom: 1px solid var(--enscribe-border);
}
.enscribe-contents-heading {
  margin: 0 0 var(--enscribe-space-2);
  font-family: var(--enscribe-font-sans);
  font-size: var(--enscribe-text-base);
  font-weight: 700;
  color: var(--enscribe-text-primary);
}
.enscribe-contents ul {
  list-style: none;
  margin: 0;
  padding-left: var(--enscribe-space-4);
}
.enscribe-contents > ul { padding-left: 0; }
.enscribe-contents li { margin: 0; }
.enscribe-contents a {
  color: var(--enscribe-text-secondary);
  text-decoration: none;
  padding: var(--enscribe-space-1) 0;
}
.enscribe-contents a:hover { color: var(--enscribe-link); }

/* Right-sidebar variant: flip the two-column grid so the sticky listing sits on the right
 * (the layout emits children [main, nav] in this order). Same total width as the left
 * variant; only the column order differs. */
@media (min-width: 900px) {
  .enscribe-layout--toc-right {
    grid-template-columns: minmax(0, var(--enscribe-content-width)) 14rem;
  }
}

/* Collapsible sidebar (toc-expand): the per-parent nested <details> stay interactive on
 * desktop — their summaries keep the native disclosure marker, unlike the always-open top
 * summary (hidden on desktop). The initial open/closed state is baked at build time from
 * toc-expand; the reader can toggle deeper levels. The summary holds the link (click the
 * marker to expand, the link to navigate). */
.enscribe-toc--collapsible .enscribe-toc-sub > summary.enscribe-toc-sub-summary {
  cursor: pointer;
  list-style-position: outside;
}
.enscribe-toc--collapsible .enscribe-toc-sub-summary a { display: inline; }
`;
