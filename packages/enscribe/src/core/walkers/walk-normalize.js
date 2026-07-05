// Shared normalization-walk helper — the type-predicate counterpart to walkReplace().
//
// walkNormalize(nodes, predicate, process) walks `nodes` in pre-order DFS.
// For each node where predicate(node) returns true, calls process(node) and
// replaces the node in place with the returned replacement node.
//
// Unlike walkReplace(), which matches by enscribeTag tagname, this walker
// matches by an arbitrary predicate — designed for normalizing standard mdast
// nodes (e.g. inlineMath, math, heading, table) produced by delegated parsers
// like remark-math and remark-gfm, which are not enscribeTag nodes.
//
// Descent rules are identical to walkReplace()'s:
//   - Recurse into enscribeTag .content arrays, guarded by !node.isOpaqueContent
//     (math bodies, DSL payloads, and other opaque content are raw strings or
//     DSL payloads — not node trees — and must not be descended into)
//   - Recurse into mdast .children arrays (paragraphs, blockquotes, list
//     items, etc.)
//
// The replacement node is descended into after replacement. Rationale: a
// normalized enscribeTag with non-opaque content (e.g. a heading normalized
// to a section node, whose content is inline mdast) may itself contain further
// normalizable nodes. For math nodes the content is opaque (isOpaqueContent:
// true) so descent into the replacement never recurses — the guard prevents it.
// This matches walkReplace()'s behavior, which advances past the replacement
// and then recurses into its children if the replacement is a non-opaque tag.
//
// NOTE: process() returns EITHER one node (the 1-to-1 case) OR an array of nodes
// (a 1-to-N fragment splice). 1-to-1 is the norm — most normalizers replace one
// mdast node with one canonical node. The 1-to-N form exists for the degenerate
// markdown-link fallback (`liftLink`), which splices the link's literal source in
// place as sibling text + inline nodes (no wrapper element), so it never emits an
// unhandled `<span>`. Each returned node is descended into (it may carry further
// normalizable content). A `null`/empty-array return deletes the node.

import { isEnscribeTag } from '../tag.js';

/**
 * Walk a node array in-place, replacing nodes that match `predicate`.
 *
 * @param {Array}    nodes     - node array to walk and mutate
 * @param {Function} predicate - (node: object) => boolean
 *                               Returns true for nodes that should be replaced.
 * @param {Function} process   - (node: object) => (object | object[])
 *                               Called for each matching node. Returns the single
 *                               replacement node (1-to-1), or an array of nodes
 *                               spliced in its place (1-to-N).
 */
export function walkNormalize(nodes, predicate, process) {
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (predicate(node)) {
      const result = process(node);
      if (Array.isArray(result)) {
        // 1-to-N: splice the fragment in place and DO NOT advance — the while loop
        // re-visits each spliced node from `i`, so any raw mdast among them (e.g. a
        // strong/emphasis child carried out of a lifted link) is itself normalized,
        // and its children are descended into by the normal loop. The 1-to-N producer
        // must not return a node that re-matches `predicate` (else re-visiting loops);
        // liftLink returns only text + already-canonical children, so it terminates.
        nodes.splice(i, 1, ...result);
      } else {
        nodes.splice(i, 1, result);
        // Descend into the replacement — it may itself carry normalizable content.
        // For opaque replacements (isOpaqueContent: true, e.g. math), the guards
        // below prevent any descent, so this is a no-op in the math case.
        if (isEnscribeTag(result) && Array.isArray(result.content) && !result.isOpaqueContent) {
          walkNormalize(result.content, predicate, process);
        }
        if (result.children && Array.isArray(result.children)) {
          walkNormalize(result.children, predicate, process);
        }
        i++;
      }
    } else {
      // Recurse into non-opaque enscribeTag content.
      if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
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
