// Phase 1 — Configuration discovery plugin.
//
// Walks the entire mdast tree (recursively through both mdast `children` and
// enscribeTag `content` arrays) finding every <config> block — at root,
// inside <meta>, inside sections, anywhere. Extracts their kwargs and
// populates a settings Map on the unified VFile (file.data.enscribeConfig).
// The AST is not modified.
//
// Recursive walk: closes formerly-PG-9 ("deeply-nested <config> not read");
// before that fix, a <config> nested inside <meta> or a section was silently
// ignored. The walk visits the entire tree because <config> blocks should be
// findable in any authoring position — the spec says configuration declared
// anywhere is available everywhere.
//
// Kwarg validation (AUD-13): performed at the normalize-to-canonical gate
// (plugins/normalize-to-canonical.js) per the apparatus-tag reconciliation
// (2026-05-25). By the time this plugin runs, every <config> node's kwargs
// have been validated against the allowlist; unknown kwargs are already
// dropped with diagnostics emitted at the gate. This plugin trusts what
// reaches it and simply copies into the settings Map.
//
// Multiple <config> blocks merge; later entries override earlier ones for
// the same key. Document-order traversal is preserved.

import { isEnscribeTag } from 'enscribe-core/tag';
import { ENSCRIBE_CONFIG } from 'enscribe-core/file-data-keys';

/**
 * Recursively visit every enscribeTag with tagname 'config' in the tree,
 * descending through both mdast `children` and enscribeTag `content` arrays.
 */
function visitConfigs(nodes, visit) {
  for (const node of (nodes ?? [])) {
    if (isEnscribeTag(node) && node.tagname === 'config') {
      visit(node);
    }
    // Descend through mdast children.
    if (node && Array.isArray(node.children)) {
      visitConfigs(node.children, visit);
    }
    // Descend through enscribeTag content arrays (skip opaque content).
    if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
      visitConfigs(node.content, visit);
    }
  }
}

/**
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeConfigDiscovery() {
  return (tree, file) => {
    const config = new Map();

    visitConfigs(tree.children ?? [], (node) => {
      const kwargs = node.kwargs ?? {};
      for (const [key, value] of Object.entries(kwargs)) {
        // Later entries override earlier entries for the same key.
        config.set(key, value);
      }
    });

    if (file) {
      file.data ??= {};
      file.data[ENSCRIBE_CONFIG] = config;
    }
  };
}
