// Ref-resolution plugin — replace <ref @id> nodes with __ref-marker or
// __ref-error internal nodes before the hast conversion step.
//
// Runs last in the structural pipeline (after numbering), so all numbered
// entries are already registered when this plugin walks the tree.
//
// For each <ref> node encountered:
//   - The target id is taken from node.atRefs[0] (canonical: <ref @eqn:newton>)
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

import { makeInternalMarker } from 'acadamark-core/tag';
import { ensureRegistry } from 'acadamark-core/registry';
import { walkReplace } from 'acadamark-core/walkers/walk-replace';
import { parseColonId } from 'acadamark-core/colon-id';
import { ACADAMARK_CONFIG } from 'acadamark-core/file-data-keys';

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
  code: 'listing',   // G4: code-block sigil registration (PG-6)
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
  const parsed = parseColonId(id);
  const prefix    = parsed ? parsed.prefix : null;
  const labelTail = parsed ? parsed.tail   : id;

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

function makeRefMarker(targetId, entry, config, srcNode) {
  return makeInternalMarker('__ref-marker', {
    kwargs: {
      targetId,
      text: computeRefText(targetId, entry, config),
      // Author kwargs flow through to data-attributes on the rendered anchor
      // (handled by handlers/ref.js's refMarkerHandler). This is the
      // "kwargs flow through like a normal tag" reconciliation — the kwargs
      // are no longer silently discarded; they become HTML data-attributes
      // available for styling/scripting, even though the auto-generated
      // display text still comes from the prefix dictionary.
      refType: srcNode?.kwargs?.type ?? null,
      refFormat: srcNode?.kwargs?.format ?? null,
      // Boolean flag controls (defaults established by the renderer).
      // `link` (default true): emit <a> anchor; -link emits <span> instead.
      // `preview` (default true): hover preview attaches to the rendered
      // anchor; -preview adds data-no-preview="true" so hover-preview.js
      // skips attaching tippy.
      // Both default to true when the flag is absent. We pass them through
      // as explicit booleans so the handler can distinguish "absent"
      // (default) from "explicit -flag" (suppress).
      linkFlag: srcNode?.booleans?.link ?? true,
      previewFlag: srcNode?.booleans?.preview ?? true,
    },
  });
}

function makeRefError(targetId) {
  return makeInternalMarker('__ref-error', {
    kwargs: { targetId: targetId ?? '(none)' },
  });
}

/**
 * Unified plugin. Replaces <ref> nodes with resolved markers or error nodes.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkRefResolution() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const config = file?.data?.[ACADAMARK_CONFIG];

    function processRef(node) {
      const targetId = node.atRefs?.[0] ?? node.kwargs?.target ?? null;

      if (!targetId) {
        file?.message?.('Reference has no id', node);
        return [makeRefError(null)];
      }

      const entry = registry.findByLabel(targetId);
      if (!entry) {
        file?.message?.(`Reference target not found: ${targetId}`, node);
        return [makeRefError(targetId)];
      }

      return [makeRefMarker(targetId, entry, config, node)];
    }

    walkReplace(tree.children, 'ref', processRef);
  };
}

