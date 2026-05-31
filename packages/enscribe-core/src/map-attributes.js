// Phase 5 slice 5a (2026-05-29): generic attribute-iteration helper.
//
// The lift recorded as deferred in `notes/specs/enscribe-core.md`
// §"Output-stage-specific code" (the only architectural item the
// enscribe-core extraction arc left open, per commit `6ae6844`). The
// deferral was waiting for a second output-target consumer — JATS export
// (Phase 5) is that second consumer.
//
// THE PROBLEM
//
// Both HTML rendering (enscribe-interpreter) and JATS export
// (enscribe-jats-export) need to walk a node's id / classes / kwargs
// and produce target-specific attributes on the output element. The
// iteration shape is identical; only the per-attribute target-naming
// differs. Pre-lift, the HTML iteration lived in
// `enscribe-interpreter/src/lib/build-properties.js` as `buildProperties`
// — one 14-line function with two consumers inside the interpreter.
// JATS export's parallel iteration would duplicate this shape, which is
// the DRY problem the lift resolves.
//
// THE LIFT
//
// `mapAttributes(node, vocab, target, emit)`:
//   - Walks node.id, node.classes, node.kwargs in a fixed order.
//   - For each, calls `emit(kind, name, value)` where kind is 'id' /
//     'class' / 'kwarg', name is the target-specific output name from
//     the vocab's target-keyed `maps_to`, and value is the value.
//   - `emit` returns `{ targetKey, mappedValue }` (or null to skip).
//     The caller aggregates these into the target's output container.
//
// VOCAB SHAPE (per Phase 5 slice 5a target-keyed `maps_to` migration)
//
// Each vocab attribute's `maps_to` is now an object keyed by target:
//   maps_to:
//     html: rowspan
//     jats: rowspan
// (or HTML-only when JATS counterpart is unknown/unwanted)
//
// The lift mechanism is generic; the target identifier ('html' / 'jats')
// is the discriminator the emit callback uses.

/**
 * Walk a node's id / classes / kwargs and dispatch each to the target-
 * specific emit callback. The caller aggregates emit's return values
 * into the target's output container.
 *
 * @param {object} node    - enscribeTag node
 * @param {object} vocab   - vocabulary entry for node.tagname
 * @param {string} target  - target identifier: 'html' | 'jats' | …
 * @param {function} emit  - emit(kind, name, value) → { targetKey, mappedValue } | null
 *                           kind: 'id' | 'class' | 'kwarg'
 *                           name: target-specific attribute name (from vocab maps_to[target])
 *                           value: the value to emit
 *                           Returns null to skip this attribute.
 * @returns {Array<{targetKey: string, mappedValue: any}>} non-null emit results in
 *          the iteration order (id, class, then kwargs in node.kwargs key order).
 */
export function mapAttributes(node, vocab, target, emit) {
  const results = [];

  // id
  if (node.id) {
    const def = vocab?.enscribe_attributes?.id;
    const name = def?.maps_to?.[target];
    if (name) {
      const r = emit('id', name, node.id);
      if (r) results.push(r);
    }
  }

  // classes
  if (Array.isArray(node.classes) && node.classes.length > 0) {
    const def = vocab?.enscribe_attributes?.classes;
    const name = def?.maps_to?.[target];
    if (name) {
      const r = emit('class', name, node.classes);
      if (r) results.push(r);
    }
  }

  // kwargs
  const kwargDefs = vocab?.enscribe_attributes?.kwargs ?? {};
  for (const [key, value] of Object.entries(node.kwargs ?? {})) {
    const def = kwargDefs[key];
    if (!def) continue;
    if (def.handled_by === 'handler') continue;
    const name = def.maps_to?.[target];
    if (!name) continue;
    const r = emit('kwarg', name, value);
    if (r) results.push(r);
  }

  return results;
}
