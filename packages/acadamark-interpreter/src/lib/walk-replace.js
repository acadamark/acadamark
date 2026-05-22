// Shared replacement-walk helper — the mutating counterpart to discover().
//
// walkReplace(nodes, tagname, process) walks `nodes` in pre-order DFS, and for
// each acadamarkTag whose tagname matches, calls process(node) and splices the
// returned replacement array in place of the original node. Handles 1-to-N
// replacement (process may return 1, 2, or more nodes — as cite-resolution
// does for a <cite> with mixed found/missing keys).
//
// For non-matching nodes: recurses into
//   - acadamarkTag .content arrays, guarded by !node.isOpaqueContent
//     (math bodies, DSL payloads, and other opaque content are not node trees
//     and must not be descended into)
//   - mdast .children arrays (paragraphs, blockquotes, list items, etc.)
//
// This descent logic is identical to discover()'s, making the two walks
// consistent: discover() registers nodes read-only; walkReplace replaces them.
//
// Taken from the guarded copy in cite-resolution.js (the one walker that
// correctly skipped opaque content) and generalized over tagname. The
// ref-resolution.js copy previously lacked the !isOpaqueContent guard; the
// note-placement.js copy (walkAndSplice) used a slightly different signature
// (noteMap + createMarker instead of a single process callback). All three
// now delegate here.

import { isAcadamarkTag } from './ast-helpers.js';

/**
 * Walk a node array in-place, replacing acadamarkTag nodes of a given tagname.
 *
 * @param {Array}    nodes    - node array to walk and mutate
 * @param {string}   tagname  - the acadamarkTag tagname to match
 * @param {Function} process  - (node: object) => Array<object>
 *                              Called for each matching node. Must return an
 *                              array of replacement nodes (may be empty, 1, or
 *                              multiple). The splice advances by the returned
 *                              array's length.
 */
export function walkReplace(nodes, tagname, process) {
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (isAcadamarkTag(node, tagname)) {
      const replacements = process(node);
      nodes.splice(i, 1, ...replacements);
      i += replacements.length;
    } else {
      // Recurse into non-opaque acadamarkTag content.
      if (isAcadamarkTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
        walkReplace(node.content, tagname, process);
      }
      // Recurse into mdast children.
      if (node.children && Array.isArray(node.children)) {
        walkReplace(node.children, tagname, process);
      }
      i++;
    }
  }
}
