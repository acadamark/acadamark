// Math handler — renders <$ ... $> and <$$ ... $$> through KaTeX.
//
// The parser produces acadamarkTag nodes with:
//   tagname: "$"  → inline math,  contentHandler: "math"
//   tagname: "$$" → display math, contentHandler: "math-display"
//   content: string (opaque LaTeX source), isOpaqueContent: true
//
// This handler calls KaTeX to render the LaTeX source, then wraps the result
// in a <inline-math> or <display-math> element. KaTeX's output is an HTML
// string; we parse it into hast with hast-util-from-html (fragment mode).
//
// Error handling: throwOnError: false makes KaTeX render a visible error span
// rather than throwing. Documents always render to something.

import katex from 'katex';
import { fromHtml } from 'hast-util-from-html';

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

/**
 * Math handler. Called by the interpret-plugin dispatcher when
 * the vocabulary entry for "inline-math" or "display-math" specifies
 * interpreter_strategy: handler with handler_module: ./handlers/math.js.
 *
 * The parser emits tag names "$" and "$$"; the normalize-to-canonical gate
 * (plugins/normalize-to-canonical.js) rewrites these to "inline-math" /
 * "display-math" via the tagname↔sigil map's lift direction before any
 * downstream stage runs. node.tagname is therefore the canonical vocabulary
 * key here ("inline-math" or "display-math"), which this handler reads to
 * determine inline vs display mode.
 *
 * @param {object} _state - mdast-util-to-hast state (unused — no child nodes)
 * @param {object} node   - acadamarkTag with canonical tagname "inline-math"
 *                           or "display-math" (the gate has rewritten the
 *                           parser-emitted "$" / "$$")
 * @returns {import('hast').Element} hast element
 */
export function mathHandler(_state, node) {
  const isDisplay = node.tagname === 'display-math';
  const latex = extractLatex(node);
  const katexChildren = renderToHast(latex, isDisplay);

  // Build properties: id and classes, if present on the node.
  const properties = {};
  if (node.id) properties.id = node.id;
  if (node.classes?.length) properties.className = node.classes;

  // For numbered display-math, append an equation-number span after the
  // KaTeX output: <span class="equation-number">(N)</span>.
  // node.computedNumber is set by the numbering plugin; null means unnumbered.
  const children =
    isDisplay && node.computedNumber != null
      ? [
          ...katexChildren,
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['equation-number'] },
            children: [{ type: 'text', value: `(${node.computedNumber})` }],
          },
        ]
      : katexChildren;

  return {
    type: 'element',
    tagName: isDisplay ? 'display-math' : 'inline-math',
    properties,
    children,
  };
}
