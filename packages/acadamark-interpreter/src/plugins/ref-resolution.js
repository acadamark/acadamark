// Ref-resolution plugin — replace <ref #id> nodes with __ref-marker or
// __ref-error internal nodes before the hast conversion step.
//
// Runs last in the structural pipeline (after numbering), so all numbered
// entries are already registered when this plugin walks the tree.
//
// For each <ref> node encountered:
//   - The target id is taken from node.id (canonical: <ref #eqn:newton>)
//     or node.kwargs.target (legacy: <ref target=eqn:newton>).
//   - If no target id: produces __ref-error and emits a file warning.
//   - If target not found in label index: produces __ref-error + warning.
//   - If found: produces __ref-marker with targetId and pre-computed text.
//
// The resulting internal nodes are rendered by handlers/ref.js.
//
// NOTE: Only colon-ids (ids containing ':') are indexed by the registry.
// A <ref> targeting an id without ':' will always produce __ref-error.
// Authors must use labeled elements (e.g., <$$ #eqn:newton | ...>) to create
// referenceable targets.
//
// Reference text is computed from the id prefix and the DEFAULT_PREFIXES
// dictionary. Example: #eqn:newton → "equation 1". Config key
// ref-prefix-{prefix} overrides the word (e.g., ref-prefix-eqn="Eq.").
//
// When the entry.number is null (target registered but unnumbered), the
// label-tail of the id is used as link text: #eqn:energy → "energy".

import { ensureRegistry } from '../lib/registry.js';
import { walkReplace } from '../lib/walk-replace.js';

/**
 * Built-in prefix → display-word dictionary.
 * The colon-prefix of the target id (e.g., "eqn" from "eqn:newton") selects
 * the word. Config key ref-prefix-{prefix} overrides these per-document.
 */
const DEFAULT_PREFIXES = {
  eqn:  'equation',
  fig:  'figure',
  note: 'note',
  tab:  'table',
  sec:  'section',
  thm:  'theorem',
  lem:  'lemma',
  def:  'definition',
  ex:   'example',
};

/**
 * Compute the display text for a resolved cross-reference.
 *
 * Cases:
 *   1. entry.number !== null, known prefix  →  "equation 3"  (or config word)
 *   2. entry.number !== null, unknown prefix → "3"            (just number)
 *   3. entry.number === null                 →  "energy"      (label-tail)
 */
function computeRefText(id, entry, config) {
  const colonIdx = id.indexOf(':');
  const prefix    = colonIdx > 0 ? id.slice(0, colonIdx) : null;
  const labelTail = colonIdx > 0 ? id.slice(colonIdx + 1) : id;

  if (entry.number === null) {
    // Target exists but is unnumbered — author chose -numbered. Use label-tail.
    return labelTail;
  }

  const prefixWord =
    (prefix && config?.get(`ref-prefix-${prefix}`)) ||
    (prefix && DEFAULT_PREFIXES[prefix]) ||
    null;

  return prefixWord ? `${prefixWord} ${entry.number}` : `${entry.number}`;
}

function makeRefMarker(targetId, entry, config) {
  return {
    type: 'acadamarkTag',
    tagname: '__ref-marker',
    id: null,
    classes: [],
    kwargs: {
      targetId,
      text: computeRefText(targetId, entry, config),
    },
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

function makeRefError(targetId) {
  return {
    type: 'acadamarkTag',
    tagname: '__ref-error',
    id: null,
    classes: [],
    kwargs: { targetId: targetId ?? '(none)' },
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

/**
 * Unified plugin. Replaces <ref> nodes with resolved markers or error nodes.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkRefResolution() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const config = file?.data?.acadamarkConfig;

    function processRef(node) {
      const targetId = node.id ?? node.kwargs?.target ?? null;

      if (!targetId) {
        file?.message?.('Reference has no id', node);
        return [makeRefError(null)];
      }

      const entry = registry.findByLabel(targetId);
      if (!entry) {
        file?.message?.(`Reference target not found: ${targetId}`, node);
        return [makeRefError(targetId)];
      }

      return [makeRefMarker(targetId, entry, config)];
    }

    walkReplace(tree.children, 'ref', processRef);
  };
}

