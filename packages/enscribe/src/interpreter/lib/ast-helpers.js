// AST helper utilities for the enscribe interpreter structural plugins.
//
// Query helpers for enscribeTag nodes — the construction builders live in
// the inward-pointing `enscribe/core/tag` module (`makeTag`, `makeOpaqueTag`,
// `makeInternalMarker`, `isEnscribeTag`). `isEnscribeTag` is re-exported
// here so existing interpreter-side import sites continue to work.

export { isEnscribeTag } from '../../core/tag.js';
import { isEnscribeTag } from '../../core/tag.js';

/**
 * Return the section nesting depth of a node: 1 for section, 2 for
 * sub-section, 3 for sub-sub-section, 0 for anything else.
 */
export function sectionDepth(node) {
  if (!isEnscribeTag(node)) return 0;
  if (node.tagname === 'section') return 1;
  if (node.tagname === 'sub-section') return 2;
  if (node.tagname === 'sub-sub-section') return 3;
  return 0;
}

/**
 * Return the first node in an array that matches the given tagname, or null.
 */
export function findTag(nodes, name) {
  return nodes.find(n => isEnscribeTag(n, name)) ?? null;
}

/**
 * Recursively collect all plain-text values in a node tree (traverses both
 * .content and .children). Used to compute alt-text fallbacks.
 */
export function extractPlainText(nodes) {
  if (!nodes || !Array.isArray(nodes)) return '';
  let text = '';
  for (const node of nodes) {
    if (!node) continue;
    if (node.type === 'text') {
      text += node.value ?? '';
    } else if (node.children && Array.isArray(node.children)) {
      text += extractPlainText(node.children);
    } else if (node.content && Array.isArray(node.content)) {
      text += extractPlainText(node.content);
    }
  }
  return text.trim();
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
