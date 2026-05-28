// Phase 3 slice 3b (2026-05-28): shared label-formatting helpers for the
// frameable class (and the theorem family, which shares only this label
// primitive — see Q3 of slice 3b's findings).
//
// HELPER SHAPE — why this is a label primitive and not a wrapper helper:
//
// Slice 3b's Q1 investigation found three structurally different caption-
// rendering idioms across the existing frameable handlers:
//
//   - `<table>` / `<csv>` / `<tsv>` → `<caption>` is an INSIDE-the-table
//     child element (HTML-native: <table> contains <caption>).
//   - `<fig>` → `<figcaption>` is INSIDE a <figure> wrapper, alongside the
//     image / table / equation it captions.
//   - `<mermaid>` / `<abc>` → `<figcaption>` is a SIBLING after a custom
//     wrapper (<pre> / <div>), at the same DOM level as the wrapper.
//
// A "uniform frameable wrapper helper" taking { id, title, caption, border,
// computedNumber, body, kind } as input would have to switch between these
// three idioms inside the helper — a configurable rendering rule per kind.
// That's premature abstraction: the per-element customization belongs in
// the handler, not in the shared helper.
//
// The REAL DRY win across all six handlers (figure, table, csv, tsv,
// mermaid, abc) is the per-caption label rendering: "Figure 3.", "Table
// 1.", etc. — a one-line span shape per handler today, copy-pasted across
// six sites. That's the right granularity for the shared helper.
//
// formatLabel() produces just that span. Per-element handlers keep their
// own structural shapes and call formatLabel() where they currently build
// the label inline.
//
// THEOREM-FAMILY USE: theorem rendering is even more structurally
// different — the label is PREPENDED to the body content, no caption /
// border / wrapper involvement. Theorem-family handlers use formatLabel()
// to build the "Theorem N (Pythagoras)." span and then prepend it as a
// child of their custom-element output. Same primitive, completely
// different structural use.

/**
 * Build a hast span containing a numbered label like "Figure 3.",
 * "Table 2.", "Theorem 1 (Pythagoras).". Optional `name` adds the
 * parenthesized suffix (amsthm "(Pythagoras)" convention; ignored if
 * empty / null / undefined).
 *
 * The returned span carries a class derived from the lowercased prefix
 * (`figure-label`, `table-label`, `theorem-label`, etc.) so theme
 * stylesheets can target each prefix individually. The label-text ends
 * with a period (".") for the amsthm / chicago-author-date convention;
 * callers responsible for whitespace between the label and any following
 * body content.
 *
 * @param {string} prefix - The display word: "Figure", "Table",
 *                          "Theorem", "Lemma", etc. Case-preserved in the
 *                          rendered text; lowercased for the className.
 * @param {number|null|undefined} number - The numeric label (e.g. 3).
 *                          When null/undefined, returns null (no label
 *                          should render).
 * @param {string|null|undefined} [name] - Optional parenthesized name
 *                          suffix ("Pythagoras" → "(Pythagoras)").
 * @returns {import('hast').Element|null} A hast span element, or null when
 *                          the input has no number to render.
 */
export function formatLabel(prefix, number, name) {
  if (number == null) return null;
  const text = name
    ? `${prefix} ${number} (${name}).`
    : `${prefix} ${number}.`;
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: [`${prefix.toLowerCase()}-label`] },
    children: [{ type: 'text', value: text }],
  };
}
