// Phase 1 — Configuration discovery plugin.
//
// Walks the entire mdast tree (recursively through both mdast `children` and
// acadamarkTag `content` arrays) finding every <config> block — at root, inside
// <meta>, inside sections, anywhere. Extracts their kwargs, validates them
// against the known-config-kwarg allowlist, and populates a settings Map on the
// unified VFile (file.data.acadamarkConfig). The AST is not modified.
//
// Recursive walk: closes formerly-PG-9 ("deeply-nested <config> not read");
// before this fix, a <config> nested inside <meta> or a section was silently
// ignored. The walk visits the entire tree because <config> blocks should be
// findable in any authoring position — the spec says configuration declared
// anywhere is available everywhere.
//
// Validation: unknown kwargs emit a file.message() warning. Metadata-shaped
// kwargs (title, subtitle, author, date) get a more specific hint suggesting
// the author meant <meta>. This closes formerly-AUD-13 ("<config> silently
// accepts metadata kwargs that belong in <meta>") per DESIGN.md DD-3.
//
// Multiple <config> blocks merge; later entries override earlier ones for the
// same key. Document-order traversal is preserved.

import { isAcadamarkTag } from 'acadamark-core/tag';
import { ACADAMARK_CONFIG } from 'acadamark-core/file-data-keys';

// Known config kwargs the interpreter consumes. Add a new key here when a new
// plugin consumes a new <config> setting; this list IS the documented surface.
//
// Wildcards: a string ending in '*' matches any kwarg whose name starts with
// the prefix (e.g. 'ref-prefix-*' matches 'ref-prefix-eqn', 'ref-prefix-fig').
const KNOWN_CONFIG_KWARGS = new Set([
  'citation-style',       // cite-resolution.js
  'number-equations',     // numbering.js — suppress equation numbering
  'number-figures',       // numbering.js — suppress figure numbering
  'number-tables',        // numbering.js — suppress table numbering
]);

const KNOWN_CONFIG_KWARG_PREFIXES = [
  'ref-prefix-',          // ref-resolution.js — per-prefix display word override
];

// Metadata-shaped kwargs that belong in <meta>, not <config>. An author who
// writes <config title="..."> almost certainly meant <meta>; surface that
// hypothesis in the warning text per DD-3.
const METADATA_KWARGS = new Set([
  'title', 'subtitle', 'author', 'date',
]);

function isKnownKwarg(key) {
  if (KNOWN_CONFIG_KWARGS.has(key)) return true;
  return KNOWN_CONFIG_KWARG_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Recursively visit every acadamarkTag with tagname 'config' in the tree,
 * descending through both mdast `children` and acadamarkTag `content` arrays.
 * The visit pattern mirrors `walkNormalize` but is type-specialized for
 * config discovery.
 */
function visitConfigs(nodes, visit) {
  for (const node of (nodes ?? [])) {
    if (isAcadamarkTag(node) && node.tagname === 'config') {
      visit(node);
    }
    // Descend through mdast children.
    if (node && Array.isArray(node.children)) {
      visitConfigs(node.children, visit);
    }
    // Descend through acadamarkTag content arrays (skip opaque content).
    if (isAcadamarkTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
      visitConfigs(node.content, visit);
    }
  }
}

/**
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkConfigDiscovery() {
  return (tree, file) => {
    const config = new Map();

    visitConfigs(tree.children ?? [], (node) => {
      const kwargs = node.kwargs ?? {};
      for (const [key, value] of Object.entries(kwargs)) {
        if (!isKnownKwarg(key)) {
          // Unknown kwarg — warn rather than silently accepting (formerly
          // AUD-13). Metadata-shaped kwargs get a more specific hint per DD-3.
          if (METADATA_KWARGS.has(key)) {
            file?.message?.(
              `<config> does not accept '${key}' — this kwarg belongs in <meta>. ` +
              `<meta> holds descriptive document metadata (title, author, date); ` +
              `<config> holds processing options (citation-style, numbering, etc.). ` +
              `See DESIGN.md "<meta> is for metadata; <config> is for options".`,
              node,
              'config-discovery:metadata-kwarg-in-config',
            );
          } else {
            file?.message?.(
              `<config> received unknown kwarg '${key}'. Known kwargs: ` +
              `${[...KNOWN_CONFIG_KWARGS].join(', ')}, ` +
              `or any starting with ${KNOWN_CONFIG_KWARG_PREFIXES.join(' / ')}.`,
              node,
              'config-discovery:unknown-kwarg',
            );
          }
          // Skip — do not stash an unknown kwarg in the config map.
          continue;
        }
        // Later entries override earlier entries for the same key.
        config.set(key, value);
      }
    });

    if (file) {
      file.data ??= {};
      file.data[ACADAMARK_CONFIG] = config;
    }
  };
}
