// Shared document-order discovery walk.
//
// discover(tree, visitors) performs a read-only, pre-order DFS over the mdast
// tree, calling registered visitor callbacks for each matched enscribeTag node.
//
// visitors — Map<string, (node: object) => void>
//   Keyed by tagname. When a matching enscribeTag is encountered, its visitor
//   is called with the node. Visitors do any recording they need (e.g.
//   registry.assign(), pushing to a pending array); the walk itself never
//   mutates the tree and never writes to the registry.
//
// Descent rules:
//   - Recurse into enscribeTag .content arrays, guarded by !node.isOpaqueContent
//     (matches the pattern in cite-resolution.js — the one walker that correctly
//     skips opaque content such as math bodies and DSL payloads)
//   - Recurse into mdast .children arrays (paragraphs, blockquotes, lists, etc.)
//
// Pre-order (visit before descend) guarantees visitor call order matches
// document order, which is required for numbering to be sequential.

import { isEnscribeTag } from '../tag.js';
import { descendCellArrays } from './cell-descent.js';

/**
 * Recursively walk a node array in document order (pre-order DFS).
 * For each enscribeTag node whose tagname is in `visitors`, call the visitor.
 *
 * @param {Array} nodes
 * @param {Map<string, (node: object) => void>} visitors
 */
function walkDiscover(nodes, visitors) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (isEnscribeTag(node)) {
      const visitor = visitors.get(node.tagname);
      if (visitor) visitor(node);
      // Recurse into enscribeTag content. Skip opaque content — math bodies,
      // DSL payloads, etc. are not node trees and must not be descended into.
      if (Array.isArray(node.content) && !node.isOpaqueContent) {
        walkDiscover(node.content, visitors);
      }
    }
    // Recurse into mdast children (paragraphs, blockquotes, list items, etc.)
    if (node.children && Array.isArray(node.children)) {
      walkDiscover(node.children, visitors);
    }
    // #21 / #106: descend parsed (`_parsedCells`) and complex-HTML (`_htmlTable`)
    // table cells so discover-based passes (numbering) see their inline content.
    // Shared with walk-replace.js (#170). No-op without a stamp → byte-identical.
    descendCellArrays(node, (inline) => walkDiscover(inline, visitors));
  }
}

/**
 * Walk the document tree in pre-order DFS, calling registered visitor
 * callbacks for each matching enscribeTag node.
 *
 * Read-only. Does not mutate the tree or write to the registry.
 *
 * @param {{ children: Array }} tree - mdast root node
 * @param {Map<string, (node: object) => void>} visitors - keyed by tagname
 */
export function discover(tree, visitors) {
  walkDiscover(tree.children ?? [], visitors);
}
