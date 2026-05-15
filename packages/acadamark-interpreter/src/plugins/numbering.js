// Numbering plugin — assign sequential numbers to display-math and figure nodes.
//
// Runs after acadamarkNotes (notes claim their numbers first). Walks the full
// mdast tree and, for each display-math ($$) or figure acadamarkTag, decides
// whether it should be numbered and, if so, assigns a counter-incremented
// number from the shared document registry.
//
// The decision follows this priority order:
//   1. +numbered / -numbered boolean kwarg on the tag itself
//   2. numbered=true / numbered=false string kwarg on the tag
//   3. Document-level config: number-equations / number-figures
//   4. Default: numbered (true)
//
// When numbered, the plugin:
//   - Calls registry.assign(type, id, { numbered: true }) to register the entry
//     (colon-ids go into the label index for cross-ref lookup)
//   - Sets node.computedNumber = entry.number  (integer)
//   - Sets node.registryType = 'equation' | 'figure'
//
// When not numbered:
//   - Calls registry.assign(type, id, { numbered: false }) so the entry is
//     still in the type map (for lookup) but does not claim a display number
//   - Sets node.computedNumber = null
//   - Sets node.registryType = type

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
 * Recursively walk an array of nodes, finding display-math and figure nodes
 * and assigning them computedNumber and registryType fields.
 *
 * Recurses into:
 *   - acadamarkTag .content arrays
 *   - mdast .children arrays
 *
 * @param {Array} nodes
 * @param {object} registry - shared document registry
 * @param {Map|null} config - document-level config (file.data.acadamarkConfig)
 */
function walkAndNumber(nodes, registry, config) {
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
        node.computedNumber = entry.number;   // number or null
        node.registryType = registryType;
      }
      // Recurse into acadamarkTag content.
      if (Array.isArray(node.content)) {
        walkAndNumber(node.content, registry, config);
      }
    }
    // Recurse into mdast children (paragraphs, lists, blockquotes, etc.)
    if (node.children && Array.isArray(node.children)) {
      walkAndNumber(node.children, registry, config);
    }
  }
}

/**
 * Unified plugin. Assigns computedNumber to display-math and figure nodes.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkNumbering() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const config = file?.data?.acadamarkConfig ?? null;
    walkAndNumber(tree.children, registry, config);
  };
}
