// Phase 4 bug-fix arc, slice B (2026-05-29): the canonical scoped-number
// formatter. Single source of truth for how a registry number is rendered
// as a display string in a chapter- or section-scoped document.
//
// WHY THIS EXISTS
//
// Before slice B the chapter-prefix logic lived in exactly one place —
// `computeRefText` in plugins/ref-resolution.js — so a *cross-reference*
// to a numbered target rendered "figure 1.3", but the *caption/label* on
// that same target (rendered independently via formatLabel / the math
// handler, reading the bare `node.computedNumber`) rendered "Figure 3.".
// The two derivations disagreed (RQ-BOOK-M4). That divergence is the
// textbook symptom of duplicated logic: two sites computing "the display
// number" with only one of them applying the scope prefix.
//
// `formatScopedNumber` consolidates that derivation. computeRefText and
// every caption/label render site now call this one function, so the
// cross-reference text and the target's label text agree *by
// construction* — they can no longer drift, because there is only one
// definition of the format.
//
// WHY NOT PUT THE PREFIX ON `computedNumber` ITSELF
//
// `node.computedNumber` is the bare per-scope integer assigned by
// fillNumbering, and it is *also* consumed by the JATS exporter
// (@enscribejs/cli reads it for `<label>` text). Keeping it a bare
// integer and deriving the display string here means the HTML caption
// fix leaves JATS output untouched by nature, not by accident.
//
// FORMAT (must mirror the pre-slice-B inline logic in computeRefText
// exactly — see that function's history):
//   - no scope, or chapter === 0 (front/back-matter, articles)  → "N"
//   - chapter scope (section === 0)                              → "C.N"
//   - section scope (section > 0)                                → "C.S.N"

/**
 * Render a registry number as a display string, applying the chapter /
 * section prefix when the node's scope calls for it.
 *
 * @param {number|null|undefined} number - the bare per-scope registry
 *        number (node.computedNumber / entry.number). null/undefined for
 *        an unnumbered target.
 * @param {{chapter:number, section:number}|null|undefined} scope - the
 *        node's `_scope` stamp (numbering.js's walkWithScope) or an
 *        entry's `data.scope`. Absent for articles / unscoped documents.
 * @returns {string|null} the display string, or null when `number` is
 *        null/undefined (callers treat null as "no number to show").
 */
export function formatScopedNumber(number, scope) {
  if (number == null) return null;
  if (scope && scope.chapter > 0) {
    // 'section' scope includes the section index when non-zero.
    if (scope.section > 0) return `${scope.chapter}.${scope.section}.${number}`;
    return `${scope.chapter}.${number}`;
  }
  return `${number}`;
}
