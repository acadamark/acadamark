// Theorem-family handler — prepends a "Theorem N (Name)." label to the
// rendered body of theorem, lemma, corollary, proposition, definition,
// example, remark, and proof.
//
// Phase 3 slice 3b (2026-05-28). Closes the theorem-family numbering
// loop opened in slice 3a:
//   - Slice 3a wired NUMBERED_TAGNAMES so theorem-family nodes get
//     `computedNumber` populated and cross-references resolve to
//     "Theorem N".
//   - This slice (3b) adds the visible label rendering on the element
//     itself. Pre-3b, theorems rendered as bare `<theorem id="..."
//     data-name="...">body</theorem>` via schema dispatch with no
//     visible number.
//
// COUNTER ASSIGNMENT (settled in `theorem.md`'s prose, wired in slice 3a's
// `numbering.js` extension):
//   - theorem / lemma / corollary / proposition → shared 'theorem'
//     counter (amsthm "plain" style; all four share one sequence)
//   - definition → own 'definition' counter
//   - example → own 'example' counter
//   - remark / proof → unnumbered (NOT in NUMBERED_TAGNAMES, so
//     `computedNumber` is undefined and the label is suppressed)
//
// LABEL FORMAT (amsthm convention):
//   "Theorem N." with no name, or "Theorem N (Pythagoras)." with the
//   optional `name=` kwarg. The kwarg lifts to `data-name` per the vocab
//   schema (for accessibility / CSS targeting / JATS export); the handler
//   reads `node.kwargs.name` directly for the label rendering. Same
//   primitive `formatLabel` used by figure / table handlers — see
//   `lib/frameable.js` for the shared-helper design rationale.
//
// HANDLER SHAPE: prepend label span + non-breaking-space-equivalent
// (regular space) to the converted body content, emit as the custom
// element matching the source tagname (preserves the source-intent
// distinction — `<theorem>` vs `<lemma>` vs etc. in the Layer 1 output).

import { unwrapSingleParagraph } from '../../core/paragraph-unwrap.js';
import { mapAttributes } from '../../core/map-attributes.js';
import { htmlEmit, aggregateHtmlProps } from '../lib/html-emit.js';
import { formatLabel } from '../lib/frameable.js';
import { formatScopedNumber } from '../lib/scoped-number.js';

// Tagname → display-prefix mapping. Title-Cased per the amsthm
// convention ("Theorem 1.", "Lemma 2.", etc.).
const THEOREM_PREFIXES = new Map([
  ['theorem',     'Theorem'],
  ['lemma',       'Lemma'],
  ['corollary',   'Corollary'],
  ['proposition', 'Proposition'],
  ['definition',  'Definition'],
  ['example',     'Example'],
  ['remark',      'Remark'],
  ['proof',       'Proof'],
]);

/**
 * Convert the theorem's pipe content (the body) to hast children. Prose-
 * shape unwrap matches the schema-dispatch behavior for prose content.
 */
function buildBodyHast(state, node) {
  const content = node.content ?? [];
  if (!Array.isArray(content)) return [];
  // Prose-bearing tag — single-paragraph unwrap so `<theorem | text>`
  // produces `<theorem>text</theorem>` not `<theorem><p>text</p></theorem>`.
  const nodes = unwrapSingleParagraph(content);
  return nodes.flatMap(child => {
    const h = state.one(child, node);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
}

/**
 * Theorem-family handler. Dispatched via HANDLER_REGISTRY when any of the
 * eight theorem-family vocab entries declares
 * `interpreter_strategy: handler` + `handler_module: ./handlers/theorem.js`.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with one of the theorem-family tagnames
 * @param {object} vocab - vocabulary entry for that tagname
 * @returns {import('hast').Element}
 */
export function theoremFamilyHandler(state, node, vocab) {
  const prefix = THEOREM_PREFIXES.get(node.tagname) ?? node.tagname;
  const properties = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));

  // For numbered tags, prepend a label span; for unnumbered
  // (remark/proof), formatLabel returns null and no label appears.
  const name = node.kwargs?.name ?? null;
  // Slice B (RQ-BOOK-M4): chapter-prefix the theorem number in books so
  // the label ("Theorem 2.1.") matches cross-references ("theorem 2.1").
  // formatScopedNumber returns the bare number when node._scope is absent
  // (articles) and null when computedNumber is null (unnumbered
  // remark/proof), so formatLabel's null-guard and the fallbackLabel path
  // below are both preserved unchanged.
  const labelSpan = formatLabel(prefix, formatScopedNumber(node.computedNumber, node._scope), name);

  // For unnumbered remark/proof, still render the unboxed-label form
  // common in academic typography: "Remark." / "Proof." (no number).
  // The shared formatLabel helper requires a number; build the
  // numberless label inline here. Same className shape for consistency.
  const fallbackLabel =
    labelSpan == null && (node.tagname === 'remark' || node.tagname === 'proof')
      ? {
          type: 'element',
          tagName: 'span',
          properties: { className: [`${prefix.toLowerCase()}-label`] },
          children: [{ type: 'text', value: `${prefix}.` }],
        }
      : null;

  const effectiveLabel = labelSpan ?? fallbackLabel;

  const bodyHast = buildBodyHast(state, node);
  const children = effectiveLabel
    ? [effectiveLabel, { type: 'text', value: ' ' }, ...bodyHast]
    : bodyHast;

  return {
    type: 'element',
    tagName: node.tagname,
    properties,
    children,
  };
}
