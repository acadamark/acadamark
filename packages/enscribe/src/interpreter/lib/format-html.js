// Enscribe-inline-aware HTML formatting (#117).
//
// The rendered eHTML is pretty-printed for readable view-source by rehype-format,
// which indents block structure and leaves whitespace-sensitive contexts alone: `<pre>`
// subtrees (so a `<code>` NESTED IN `<pre>` — a code block — keeps its author whitespace),
// `<textarea>`, `<script>`/`<style>`, and inline runs. NOTE: a BARE `<code>` (inline code,
// not inside `<pre>`) is NOT spared — its leading per-line whitespace is reflowed away. That
// is by design (inline code is not whitespace-sensitive); multi-line code therefore belongs in
// a code block, not a bare `<code>` (see ~/enscribe-reports/audit-code-indentation.md, and the
// multi-line-`<code>` lint in plugins/asset-load.js). ONE correctness gap: rehype-format classifies
// inline-vs-block via `hast-util-phrasing`, whose "inline" set is a FIXED list of HTML
// phrasing tag names. Every enscribe CUSTOM element is therefore treated as block — correct
// for `<article>` / `<section>` / `<book-part>` / `<display-math>` / … (they SHOULD break onto
// their own lines), but WRONG for the handful that render INLINE in prose.
//
// For an inline custom element, block treatment inserts a newline+indent AROUND it. When the
// element is tight against a non-space character — `($x$)`, `[$c$]`, `(gizmo)` — that inserted
// whitespace renders as a SPACE: `($x$)` → `( x)`, `(gizmo)` → `( gizmo)`. A visual-neutrality
// bug (the formatter changing the rendering), latent in the current goldens (their math/terms
// are space-surrounded) but real for tight authoring.
//
// `hast-util-format` exposes no way to extend its inline set, so we present the inline custom
// elements to the formatter as a known phrasing element (`<span>`) and restore the real
// tagName immediately after. A classification HINT, not whitespace hand-rolling: the formatter
// (and the `minifyWhitespace` it runs first) then keeps them in the inline flow, inserting NO
// whitespace around them. Math interiors (KaTeX `<span>`s, the `<svg>` path data) are already
// phrasing/embedded content, so they stay on one line, untouched.

import rehypeFormat from 'rehype-format';

/**
 * Enscribe custom elements that render INLINE in prose. These — and ONLY these — are presented
 * to rehype-format as `<span>` so it does not insert render-changing whitespace around them.
 *
 * Add a tagName here ONLY if it renders a NON-HTML-native element that flows inline within text.
 * BLOCK custom elements (`article` / `section` / `book-part` / `display-math` / the
 * `align`/`cases`/`matrix`/`eqnarray` math environments / metadata / `glossary` / …) must NOT be
 * listed — they are correctly block-formatted by rehype-format's default, and listing one would
 * wrongly flow it inline.
 *
 * The DERIVED-DISPLAY elements below were formerly emitted as inline `<span class="…">` (the
 * span→custom-element conversion). They flow inline exactly where their span did — a number/label
 * prepended to a title or caption, a diagnostic/flag/ref marker in prose, a ToC number/title/arrow
 * inside a link, a margin sidenote after its marker. rehype-format classifies unknown custom
 * elements as BLOCK (hast-util-phrasing has a fixed inline set), so WITHOUT this list it would
 * insert a newline+indent around each — a render-changing whitespace regression. Listing them keeps
 * the conversion a pure `<span class="X">` → `<X>` swap (same inline position, no added whitespace).
 */
export const ENSCRIBE_INLINE_ELEMENTS = new Set([
  'inline-math', 'term',
  // numbering + labels (frameable.js formatLabel emits the per-kind label family)
  'section-number', 'equation-number',
  'figure-label', 'table-label', 'box-label', 'minipage-label',
  'theorem-label', 'lemma-label', 'corollary-label', 'definition-label', 'example-label',
  'proposition-label', 'remark-label', 'proof-label', 'axiom-label', 'conjecture-label',
  // ToC / nav chrome (lib/toc.js), the margin sidenote (lib/sidenotes.js)
  'toc-num', 'toc-title', 'nav-label', 'book-home-title', 'chapter-arrow', 'sidenote',
  // diagnostics (parser-errors.js, strict-mode.js) and the unlinked cross-ref (ref.js)
  'parse-error', 'tag-error', 'md-flag', 'ref',
]);

/**
 * Format a compiled hast tree for readable view-source, enscribe-inline-aware. rehype-format
 * indents the block structure; the enscribe inline custom elements are temporarily presented
 * as `<span>` so no render-changing whitespace is inserted around them, then restored. Mutates
 * `hast` in place (like `rehypeFormat()(hast)`), changing only inter-block source whitespace —
 * the rendered tree is unchanged.
 *
 * @param {import('hast').Root} hast - the compiled document hast.
 */
export function formatHtml(hast) {
  // Swap inline custom elements → `<span>` (record the originals to restore).
  const swapped = [];
  (function walk(node) {
    if (node.type === 'element' && ENSCRIBE_INLINE_ELEMENTS.has(node.tagName)) {
      swapped.push([node, node.tagName]);
      node.tagName = 'span';
    }
    if (node.children) for (const child of node.children) walk(child);
  })(hast);

  rehypeFormat()(hast);

  // Restore the real tagNames (rehype-format mutates child arrays but keeps element identity).
  for (const [node, tagName] of swapped) node.tagName = tagName;
}
