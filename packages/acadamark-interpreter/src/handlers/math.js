// Math handler — renders math sigils and the math-environment tag family
// through KaTeX.
//
// Coverage:
//   - inline-math (the `<$ ... $>` sigil's canonical name)
//   - display-math (the `<$$ ... $$>` sigil's canonical name)
//   - math (long-form `<math>...</math>` — semantically equivalent to
//     display-math; block-level, no env wrap)
//   - matrix, cases, align, eqnarray — math-environment tags
//     (Phase 2 slice 2b, 2026-05-27)
//
// All six tags arrive here as acadamarkTag nodes with `node.content` as an
// opaque LaTeX source string and `isOpaqueContent: true`. The dispatch
// reads `node.tagname` to decide:
//   - which KaTeX displayMode (inline-math → false, all others → true)
//   - whether to wrap the body in a LaTeX environment (envs → yes; sigils
//     and <math> long-form → no)
//   - which wrapper element to emit (matches the source tagname, so each
//     tag retains its source-intent in the Layer 1 output)
//
// Wrap-inside convention for the env tags (Phase 2 slice 2b, Q2): authors
// write pure environment body (`<matrix>1 & 2 \\ 3 & 4</matrix>`); the
// handler adds `\begin{<env>}...\end{<env>}` before passing to KaTeX. The
// `<align>` and `<eqnarray>` tags both render via KaTeX's `aligned`
// environment (the supported equivalent of LaTeX's `align` / `eqnarray`
// top-level envs, which KaTeX does not implement standalone).
//
// KaTeX's output is an HTML string; we parse it into hast with
// hast-util-from-html (fragment mode).
//
// Error handling: throwOnError: false makes KaTeX render a visible error
// span rather than throwing. Documents always render to something.

import katex from 'katex';
import { fromHtml } from 'hast-util-from-html';
import { formatScopedNumber } from '../lib/scoped-number.js';

/**
 * Extract the LaTeX source string from the node.
 *
 * For math sigil nodes, `node.content` is always an opaque string.
 * The leading and trailing spaces are trimmed (the sigil syntax
 * `<$ ... $>` typically produces " x^2 " with surrounding spaces).
 *
 * @param {object} node - acadamarkTag node with tagname "$" or "$$"
 * @returns {string}
 */
function extractLatex(node) {
  const raw = node.content ?? '';
  // content is a string for opaque nodes (isOpaqueContent: true)
  return (typeof raw === 'string' ? raw : '').trim();
}

/**
 * Render LaTeX source to a hast tree using KaTeX.
 *
 * @param {string} latex     - LaTeX source
 * @param {boolean} isDisplay - whether to use KaTeX display mode
 * @returns {import('hast').Element[]} hast children
 */
function renderToHast(latex, isDisplay) {
  const html = katex.renderToString(latex, {
    displayMode: isDisplay,
    throwOnError: false,
    errorColor: '#cc0000',
    output: 'html',
  });

  // Parse KaTeX's HTML string into a hast fragment. fromHtml wraps in a
  // root node; we take .children to get the bare element list.
  const root = fromHtml(html, { fragment: true });

  // Strip position data added by hast-util-from-html — it refers to the
  // KaTeX HTML string positions, which are meaningless in the output tree.
  return stripPositions(root.children);
}

/**
 * Recursively remove position data from hast nodes produced by fromHtml.
 * Position data in KaTeX output refers to character offsets inside KaTeX's
 * generated HTML string, not the source document — it would be confusing
 * and bulky to keep.
 */
function stripPositions(nodes) {
  return nodes.map(node => {
    if (node.type === 'element') {
      const { position: _p, children, ...rest } = node;
      return { ...rest, children: stripPositions(children ?? []) };
    }
    if (node.type === 'text' || node.type === 'comment') {
      const { position: _p, ...rest } = node;
      return rest;
    }
    return node;
  });
}

// ─── Per-tag dispatch spec ────────────────────────────────────────────────────
//
// Each entry tells the handler:
//   - displayMode: KaTeX displayMode flag (true for block, false for inline)
//   - envName:     LaTeX environment name to wrap the body in, or null for
//                  no wrap (the body is passed to KaTeX as-is)
//
// The wrapper element emitted by the handler matches the source tagname
// (not derived from this spec) — that's what keeps `<matrix>` distinct from
// `<align>` in the rendered Layer 1 output.
//
// `<align>` and `<eqnarray>` both map to KaTeX's `aligned` environment
// (KaTeX doesn't implement the top-level LaTeX `align` / `eqnarray` envs).
const MATH_TAG_SPEC = new Map([
  ['inline-math',  { displayMode: false, envName: null }],
  ['display-math', { displayMode: true,  envName: null }],
  ['math',         { displayMode: true,  envName: null }],
  ['matrix',       { displayMode: true,  envName: 'matrix' }],
  ['cases',        { displayMode: true,  envName: 'cases' }],
  ['align',        { displayMode: true,  envName: 'aligned' }],
  ['eqnarray',     { displayMode: true,  envName: 'aligned' }],
]);

/**
 * Math handler. Called by the interpret-plugin dispatcher when the
 * vocabulary entry for any of the six math-family tagnames specifies
 * `interpreter_strategy: handler` + `handler_module: ./handlers/math.js`.
 *
 * The parser emits sigil tagnames `$` and `$$`; the normalize-to-canonical
 * gate rewrites these to `inline-math` / `display-math` before downstream
 * stages run. The long-form tags (`math`, `matrix`, `cases`, `align`,
 * `eqnarray`) reach this handler with their authored tagname. The handler
 * dispatches on `node.tagname` against `MATH_TAG_SPEC`.
 *
 * Wrap-inside convention for env tags: the author writes pure environment
 * body (e.g. `<matrix>1 & 2 \\ 3 & 4</matrix>`); the handler wraps in
 * `\begin{<envName>}…\end{<envName>}` before passing to KaTeX.
 *
 * @param {object} _state - mdast-util-to-hast state (unused — no child nodes)
 * @param {object} node   - acadamarkTag with one of the canonical math
 *                           tagnames in MATH_TAG_SPEC
 * @returns {import('hast').Element} hast element
 */
export function mathHandler(_state, node) {
  const spec = MATH_TAG_SPEC.get(node.tagname);
  if (!spec) {
    // Defensive — should be unreachable given the vocab/registry wiring.
    // Fall through to display-mode-no-wrap as a sensible default.
    return mathHandler(_state, { ...node, tagname: 'display-math' });
  }

  const rawLatex = extractLatex(node);
  const latex = spec.envName
    ? `\\begin{${spec.envName}}\n${rawLatex}\n\\end{${spec.envName}}`
    : rawLatex;
  const katexChildren = renderToHast(latex, spec.displayMode);

  // Build properties: id and classes, if present on the node.
  const properties = {};
  if (node.id) properties.id = node.id;
  if (node.classes?.length) properties.className = node.classes;

  // For any numbered math-family node, append an equation-number span
  // after the KaTeX output: <span class="equation-number">(N)</span>.
  //
  // Phase 3 slice 3a (2026-05-28): the branch now fires for every tag
  // whose vocab entry maps to the 'equation' registry-type — display-math,
  // long-form <math>, and the four math envs (matrix/cases/align/eqnarray).
  // All five tags joined NUMBERED_TAGNAMES in the same slice, so
  // node.computedNumber is now set for all of them. The dispatch is
  // implicit: any node arriving here with computedNumber != null gets
  // numbered, regardless of tagname. The inline-math sigil never gets
  // computedNumber (not in NUMBERED_TAGNAMES) so it stays unaffected.
  const children =
    node.computedNumber != null
      ? [
          ...katexChildren,
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['equation-number'] },
            // Slice B (RQ-BOOK-M4): chapter-prefix the equation number in
            // books ("(2.1)") to match cross-references ("equation 2.1").
            // Bare number for articles (node._scope absent).
            children: [{ type: 'text', value: `(${formatScopedNumber(node.computedNumber, node._scope)})` }],
          },
        ]
      : katexChildren;

  return {
    type: 'element',
    tagName: node.tagname,
    properties,
    children,
  };
}
