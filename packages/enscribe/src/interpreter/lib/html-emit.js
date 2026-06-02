// HTML attribute-emit callback for `mapAttributes` (@enscribejs/enscribe/core).
//
// Phase 5 slice 5a (2026-05-29): replaces the slice-3b-era
// `buildProperties` wrapper (deleted in this slice; the lift to
// `@enscribejs/enscribe/core` made the wrapper redundant). Five interpreter sites
// (schema dispatch in `interpret-plugin.js`; the figure / svg / frame /
// theorem handlers) consume HTML attributes via:
//
//   const props = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));
//
// `htmlEmit` is the per-kind callback `mapAttributes` invokes:
//   kind 'id'    → returns { targetKey: 'id', mappedValue: <id-string> }
//   kind 'class' → returns { targetKey: 'className', mappedValue: <classes-array> }
//                  (hast's className is the array form; toHtml serializes
//                   to the space-separated string at output time)
//   kind 'kwarg' → returns { targetKey: <hast-attr-name>, mappedValue: <value> }
//
// The hast `className` form (array, not space-joined string) matches
// what `buildProperties` produced pre-lift. This is what mdast-util-to-hast
// expects on hast `properties`.
//
// `aggregateHtmlProps` consumes `mapAttributes`'s return list and
// produces the hast properties object — byte-identical to pre-lift
// `buildProperties` output.

/**
 * The HTML emit callback. Returns the target-key + mapped-value pair
 * that `aggregateHtmlProps` consumes.
 *
 * @param {string} kind  - 'id' | 'class' | 'kwarg'
 * @param {string} name  - target attribute name from vocab maps_to.html
 * @param {any}    value - the value to emit
 * @returns {{ targetKey: string, mappedValue: any }}
 */
export function htmlEmit(kind, name, value) {
  if (kind === 'class') {
    // hast's className convention: array of class strings; toHtml
    // space-joins at serialization.
    return { targetKey: 'className', mappedValue: value };
  }
  // id and kwarg both pass through the name + value directly.
  return { targetKey: name, mappedValue: value };
}

/**
 * Aggregate `mapAttributes`'s return list into a hast properties
 * object. Last-write-wins for duplicate target keys (shouldn't happen
 * in practice given vocab schema, but defensive).
 *
 * @param {Array<{targetKey: string, mappedValue: any}>} results
 * @returns {object} hast properties
 */
export function aggregateHtmlProps(results) {
  const props = {};
  for (const r of results) {
    props[r.targetKey] = r.mappedValue;
  }
  return props;
}
