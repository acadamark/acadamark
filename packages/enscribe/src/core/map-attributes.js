// Phase 5 slice 5a (2026-05-29): generic attribute-iteration helper.
//
// The lift recorded as deferred in `notes/specs/core.md`
// §"Output-stage-specific code" (the only architectural item the
// @enscribejs/enscribe/core extraction arc left open, per commit `6ae6844`). The
// deferral was waiting for a second output-target consumer — JATS export
// (Phase 5) is that second consumer.
//
// THE PROBLEM
//
// Both HTML rendering (enscribe/interpreter) and JATS export
// (@enscribejs/cli) need to walk a node's id / classes / kwargs
// and produce target-specific attributes on the output element. The
// iteration shape is identical; only the per-attribute target-naming
// differs. Pre-lift, the HTML iteration lived in
// `enscribe/interpreter/src/lib/build-properties.js` as `buildProperties`
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

  // booleans (+flag / -flag). Mirrors the kwargs loop. Handler-strategy
  // booleans (handled_by: 'handler' — e.g. +numbered on figures/tables, +link
  // on refs) flow through their element's handler and are skipped here so they
  // are not double-mapped. A boolean with a target maps_to emits its attribute
  // when true; a false boolean is omitted (HTML boolean-attribute semantics)
  // unless a false mapping is declared (not yet a supported vocab shape).
  //
  // #270: a boolean attribute may be declared either under enscribe_attributes.
  // booleans (the common shape) OR as a boolean-VALUED kwarg — `values:
  // ['true','false']`, e.g. <details>'s `open`, which also accepts the `open=true`
  // kwarg form (mapped by the kwargs loop above). `boolDefOf` resolves a key to its
  // declaration from either home, so the `+key` / `-key` form maps for both shapes
  // without special-casing any tag.
  const booleanDefs = vocab?.enscribe_attributes?.booleans ?? {};
  const isBoolValuedKwarg = (d) =>
    !!d && Array.isArray(d.values) && d.values.length === 2 &&
    d.values.includes('true') && d.values.includes('false');
  const boolDefOf = (key) =>
    booleanDefs[key] ?? (isBoolValuedKwarg(kwargDefs[key]) ? kwargDefs[key] : undefined);

  for (const [key, value] of Object.entries(node.booleans ?? {})) {
    const def = boolDefOf(key);
    if (!def || def.handled_by === 'handler') continue;
    const name = def.maps_to?.[target];
    if (!name) continue;
    if (value === true) {
      const r = emit('boolean', name, true);
      if (r) results.push(r);
    }
  }

  return results;
}
