// Phase 1 — Configuration discovery plugin.
//
// Walks the mdast tree (at root.children level only — the tree is still flat
// when this plugin runs, before article structuring). Finds any <config>
// blocks, extracts their kwargs, and populates a settings Map attached to the
// unified VFile (file.data.acadamarkConfig). The AST is not modified.
//
// This is scaffolding for future plugins (numbering, citation, etc.). Slice 1
// has no consumers; the registry is established so they have somewhere to read
// from when they are implemented.

import { ACADAMARK_CONFIG } from 'acadamark-core/file-data-keys';

/**
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkConfigDiscovery() {
  return (tree, file) => {
    const config = new Map();

    // Walk root.children only. Config blocks at top level are the expected
    // authoring position. Deeply-nested <config> blocks are deferred.
    for (const node of tree.children ?? []) {
      if (node?.type !== 'acadamarkTag' || node.tagname !== 'config') continue;
      const kwargs = node.kwargs ?? {};
      for (const [key, value] of Object.entries(kwargs)) {
        // Later entries override earlier entries for the same key.
        config.set(key, value);
      }
    }

    if (file) {
      file.data ??= {};
      file.data[ACADAMARK_CONFIG] = config;
    }
  };
}
