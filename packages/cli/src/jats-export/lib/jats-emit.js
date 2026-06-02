// JATS attribute-emit callback for `mapAttributes` (@enscribejs/enscribe/core).
//
// Phase 5 slice 5a (2026-05-29). The JATS-target counterpart of
// `enscribe/interpreter/src/lib/html-emit.js`. Both callbacks share
// the same `mapAttributes(node, vocab, target, emit)` iteration shape
// from `@enscribejs/enscribe/core/map-attributes.js` (the lift the
// @enscribejs/enscribe/core extraction arc deferred, landed in this slice).
//
// Per-kind dispatch:
//   kind 'id'    → returns { targetKey: <jats-id-name>, mappedValue: <id> }
//                  (typically 'id'; JATS uses xml:id in some contexts but
//                   plain 'id' on most elements)
//   kind 'class' → returns { targetKey: 'specific-use', mappedValue: <classes-joined> }
//                  JATS has no native class concept; `specific-use` is
//                  the conventional carrier for class-like usage hints.
//                  Phase 5 slice 5a design call. (If a vocab entry
//                  doesn't want this default class→specific-use lift,
//                  it omits the `classes.maps_to.jats` declaration; the
//                  generic mapAttributes then skips classes entirely
//                  because `def.maps_to.jats` is undefined.)
//   kind 'kwarg' → returns { targetKey: <jats-attr-name>, mappedValue: <value> }
//                  The name comes from vocab `maps_to.jats`. When
//                  unspecified (most enscribe-specific `data-*`
//                  attributes today), the kwarg is skipped — slice 5a's
//                  scope is the foundation; per-element JATS attribute
//                  completion is slices 5b–5d work.

/**
 * The JATS emit callback. Returns the target-key + mapped-value pair
 * the export-side aggregator consumes (analogous to the HTML side's
 * `aggregateHtmlProps`).
 *
 * @param {string} kind  - 'id' | 'class' | 'kwarg'
 * @param {string} name  - target attribute name from vocab maps_to.jats
 * @param {any}    value - the value to emit
 * @returns {{ targetKey: string, mappedValue: any } | null}
 */
export function jatsEmit(kind, name, value) {
  if (kind === 'class') {
    // Join classes with a space — JATS `specific-use` is a single
    // string. Per the design call above; vocab can override by
    // omitting `classes.maps_to.jats`.
    const joined = Array.isArray(value) ? value.join(' ') : String(value);
    return { targetKey: name, mappedValue: joined };
  }
  return { targetKey: name, mappedValue: value };
}

/**
 * Aggregate `mapAttributes`'s return list into a string of XML
 * attributes for direct inclusion in a JATS element open tag.
 * Last-write-wins for duplicate target keys.
 *
 * @param {Array<{targetKey: string, mappedValue: any}>} results
 * @returns {string} Space-prefixed attribute string (e.g. ` id="x" lang="en"`),
 *                   or empty string when no attributes.
 */
export function aggregateJatsAttrs(results) {
  const seen = new Map();
  for (const r of results) {
    seen.set(r.targetKey, r.mappedValue);
  }
  if (seen.size === 0) return '';
  const parts = [];
  for (const [k, v] of seen) {
    parts.push(`${k}="${escapeXmlAttr(String(v))}"`);
  }
  return ' ' + parts.join(' ');
}

/**
 * Escape characters that are illegal in an XML double-quoted attribute
 * value: `&`, `<`, `"`. (Apostrophes are legal inside double-quoted
 * values; tabs / newlines are typically normalized by the XML parser
 * but escaped here for safety in tooling.)
 */
function escapeXmlAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}
