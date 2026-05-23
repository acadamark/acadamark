// Shared normalization-walk helper — the type-predicate counterpart to walkReplace().
//
// walkNormalize(nodes, predicate, process) walks `nodes` in pre-order DFS.
// For each node where predicate(node) returns true, calls process(node) and
// replaces the node in place with the returned replacement node.
//
// Unlike walkReplace(), which matches by acadamarkTag tagname, this walker
// matches by an arbitrary predicate — designed for normalizing standard mdast
// nodes (e.g. inlineMath, math, heading, table) produced by delegated parsers
// like remark-math and remark-gfm, which are not acadamarkTag nodes.
//
// Descent rules are identical to walkReplace()'s:
//   - Recurse into acadamarkTag .content arrays, guarded by !node.isOpaqueContent
//     (math bodies, DSL payloads, and other opaque content are raw strings or
//     DSL payloads — not node trees — and must not be descended into)
//   - Recurse into mdast .children arrays (paragraphs, blockquotes, list
//     items, etc.)
//
// The replacement node is descended into after replacement. Rationale: a
// normalized acadamarkTag with non-opaque content (e.g. a heading normalized
// to a section node, whose content is inline mdast) may itself contain further
// normalizable nodes. For math nodes the content is opaque (isOpaqueContent:
// true) so descent into the replacement never recurses — the guard prevents it.
// This matches walkReplace()'s behavior, which advances past the replacement
// and then recurses into its children if the replacement is a non-opaque tag.
//
// NOTE: process() must return exactly one node (not an array). Normalization is
// always 1-to-1. If 1-to-N replacement becomes necessary, this contract can be
// extended — add a note here and update the splice call below.

import { isAcadamarkTag } from './ast-helpers.js';

/**
 * Walk a node array in-place, replacing nodes that match `predicate`.
 *
 * @param {Array}    nodes     - node array to walk and mutate
 * @param {Function} predicate - (node: object) => boolean
 *                               Returns true for nodes that should be replaced.
 * @param {Function} process   - (node: object) => object
 *                               Called for each matching node. Must return the
 *                               single replacement node. (1-to-1 contract.)
 */
export function walkNormalize(nodes, predicate, process) {
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (predicate(node)) {
      const replacement = process(node);
      nodes.splice(i, 1, replacement);
      // Descend into the replacement — it may itself carry normalizable content.
      // For opaque replacements (isOpaqueContent: true, e.g. math), the guards
      // below prevent any descent, so this is a no-op in the math case.
      if (isAcadamarkTag(replacement) && Array.isArray(replacement.content) && !replacement.isOpaqueContent) {
        walkNormalize(replacement.content, predicate, process);
      }
      if (replacement.children && Array.isArray(replacement.children)) {
        walkNormalize(replacement.children, predicate, process);
      }
      i++;
    } else {
      // Recurse into non-opaque acadamarkTag content.
      if (isAcadamarkTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
        walkNormalize(node.content, predicate, process);
      }
      // Recurse into mdast children.
      if (node.children && Array.isArray(node.children)) {
        walkNormalize(node.children, predicate, process);
      }
      i++;
    }
  }
}
