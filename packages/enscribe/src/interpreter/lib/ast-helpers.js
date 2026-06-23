// AST helper utilities for the enscribe interpreter structural plugins.
//
// Query helpers for enscribeTag nodes — the construction builders live in
// the inward-pointing `@enscribejs/enscribe/core/tag` module (`makeTag`, `makeOpaqueTag`,
// `makeInternalMarker`, `isEnscribeTag`). `isEnscribeTag` is re-exported
// here so existing interpreter-side import sites continue to work.

export { isEnscribeTag } from '../../core/tag.js';
import { isEnscribeTag } from '../../core/tag.js';
import { SECTION_DEPTH_MAP } from './section-kinds.js';

/**
 * Return the section nesting depth of a node: 1 for section, 2 for
 * sub-section, 3 for sub-sub-section, 0 for anything else. Depths derive from
 * the single source of truth in section-kinds.js (SECTION_DEPTH_MAP misses —
 * including any non-section tagname — fall through to 0).
 */
export function sectionDepth(node) {
  if (!isEnscribeTag(node)) return 0;
  return SECTION_DEPTH_MAP.get(node.tagname) ?? 0;
}

/**
 * Return the first node in an array that matches the given tagname, or null.
 */
export function findTag(nodes, name) {
  return nodes.find(n => isEnscribeTag(n, name)) ?? null;
}

/**
 * Recursively collect all plain-text values in a node tree. Traverses mdast
 * `.children` and enscribeTag `.content` (array of child nodes), and includes
 * an opaque-content node's verbatim string `.content` (code, math, …) as a
 * leaf — #290; also works on hast (which only has `.children`). The shared
 * plain-text collector — used for image alt-text fallbacks and citation-key
 * text extraction.
 *
 * @param {Array} nodes
 * @param {object} [opts]
 * @param {boolean} [opts.trim=true] - trim the result (and each recursive
 *        sub-result). Pass false for callers that need the raw concatenation
 *        (hast alt-text, cite-key text), preserving their pre-unification
 *        no-trim behavior.
 * @returns {string}
 */
export function extractPlainText(nodes, { trim = true } = {}) {
  if (!nodes || !Array.isArray(nodes)) return '';
  let text = '';
  for (const node of nodes) {
    if (!node) continue;
    if (node.type === 'text') {
      text += node.value ?? '';
    } else if (node.children && Array.isArray(node.children)) {
      text += extractPlainText(node.children, { trim });
    } else if (node.content && Array.isArray(node.content)) {
      text += extractPlainText(node.content, { trim });
    } else if (node.isOpaqueContent && typeof node.content === 'string') {
      // #290: opaque-content nodes (code, math, …) hold their text as a raw
      // string in `content`, not an array of child nodes, so the array
      // branches above skip them and the text is silently dropped —
      // corrupting titles, figure alt-text, cite text, and `<a {slug}>`
      // auto-labels whenever the source has an inline opaque tag. Treat the
      // opaque string as one sub-result, mirroring the recursive branches'
      // `trim` handling (so the sigil-captured surrounding spaces in math —
      // `<$ x^2 $>` stores " x^2 " — don't double the separators that
      // adjacent text nodes already provide).
      text += trim ? node.content.trim() : node.content;
    }
  }
  return trim ? text.trim() : text;
}

/**
 * Convert an array of mdast/enscribeTag child nodes to hast via the
 * mdast-to-hast `state.one`, dropping nulls and flattening array results.
 * The shared shape behind the per-handler body / caption / content conversions.
 *
 * @param {object} state  - mdast-util-to-hast state
 * @param {object} parent - parent node (for state.one positioning)
 * @param {Array}  nodes  - mdast/enscribeTag nodes to convert (nullish becomes [])
 * @returns {Array} hast child nodes
 */
export function convertChildren(state, parent, nodes) {
  return (nodes ?? []).flatMap((child) => {
    const h = state.one(child, parent);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
}
