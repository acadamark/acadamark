// Numbering plugin — register display-math, figure, and table nodes; fill numbers.
//
// Runs after acadamarkNotes (notes claim their positions first). Walks the full
// mdast tree and, for each display-math ($$), figure, or table acadamarkTag,
// decides whether it should be numbered and registers the entry in the shared
// document registry.
//
// After this plugin runs, computedNumber is NOT yet set on nodes. It is set
// by fillNumbering(), which is called from the acadamarkApplyNumbers stage
// after registry.numberRegistry() has assigned all display numbers.
//
// The numbering decision follows this priority order:
//   1. +numbered / -numbered boolean kwarg on the tag itself
//   2. numbered=true / numbered=false string kwarg on the tag
//   3. Document-level config: number-equations / number-figures / number-tables
//   4. Default: numbered (true)
//
// This plugin:
//   - Calls registry.assign(type, id, { numbered }) to register the entry
//     (colon-ids go into the label index for cross-ref lookup)
//   - Sets node.registryType = 'equation' | 'figure' | 'table'  (used by handlers)
//   - Pushes { node, entry } into file.data.acadamarkNumberingPending
//
// fillNumbering(file) (exported):
//   - Reads acadamarkNumberingPending and sets node.computedNumber from entry.number

import { isAcadamarkTag } from '../lib/ast-helpers.js';
import { ensureRegistry } from '../lib/registry.js';
import { readBoolKwarg } from '../lib/bool-kwarg.js';

// Maps the parser-emitted tagname to the registry type used for display labels.
const NUMBERED_TAGNAMES = new Map([
  ['$$', 'equation'],
  ['figure', 'figure'],
  ['table', 'table'],
]);

// Maps registry type to the document-level config key that can suppress numbering.
const CONFIG_KEY = {
  equation: 'number-equations',
  figure: 'number-figures',
  table: 'number-tables',
};

/**
 * Recursively walk an array of nodes, finding display-math, figure, and table
 * nodes and registering them in the document registry. Pushes { node, entry }
 * into `pending` for each numbered candidate. Does NOT set computedNumber —
 * that is done by fillNumbering() after registry.numberRegistry() runs.
 *
 * Sets node.registryType on each matched node (used by compile-time handlers).
 *
 * Recurses into:
 *   - acadamarkTag .content arrays
 *   - mdast .children arrays
 *
 * @param {Array} nodes
 * @param {object} registry - shared document registry
 * @param {Map|null} config - document-level config (file.data.acadamarkConfig)
 * @param {Array} pending - accumulates { node, entry } pairs
 */
function walkAndCollect(nodes, registry, config, pending) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (isAcadamarkTag(node)) {
      const registryType = NUMBERED_TAGNAMES.get(node.tagname);
      if (registryType) {
        const configKey = CONFIG_KEY[registryType];
        const numbered = readBoolKwarg(node, 'numbered', config, configKey, true);
        const entry = registry.assign(
          registryType,
          node.id || null,
          { numbered, data: {} },
        );
        node.registryType = registryType;  // used by compile-time handlers
        // computedNumber is set later by fillNumbering(), after numberRegistry() runs.
        pending.push({ node, entry });
      }
      // Recurse into acadamarkTag content.
      if (Array.isArray(node.content)) {
        walkAndCollect(node.content, registry, config, pending);
      }
    }
    // Recurse into mdast children (paragraphs, lists, blockquotes, etc.)
    if (node.children && Array.isArray(node.children)) {
      walkAndCollect(node.children, registry, config, pending);
    }
  }
}

/**
 * Unified plugin. Registers display-math, figure, and table nodes in the
 * document registry and stores pending { node, entry } pairs in
 * file.data.acadamarkNumberingPending. Does NOT assign computedNumber —
 * call fillNumbering(file) after registry.numberRegistry() runs.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkNumbering() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const config = file?.data?.acadamarkConfig ?? null;
    const pending = [];
    walkAndCollect(tree.children, registry, config, pending);
    if (file?.data) {
      file.data.acadamarkNumberingPending = pending;
    }
  };
}

/**
 * Fill computedNumber on each pending node from the registry entry.
 *
 * Must be called after registry.numberRegistry() has run. Reads
 * file.data.acadamarkNumberingPending and sets node.computedNumber = entry.number
 * (a positive integer for numbered entries, null for unnumbered).
 *
 * @param {import('vfile').VFile} file
 */
export function fillNumbering(file) {
  for (const { node, entry } of file?.data?.acadamarkNumberingPending ?? []) {
    node.computedNumber = entry.number;
  }
}
