// HTML attribute-mapping helper for the interpreter's hast conversion.
//
// Takes an acadamarkTag node and its vocabulary spec; returns a properties
// object suitable for placing on a hast element. Copies `node.id` /
// `node.classes` directly; iterates `node.kwargs` and applies each
// vocabulary-declared `maps_to` mapping when `handled_by !== 'handler'`
// (handler-managed kwargs are intentionally skipped here — the per-tag
// handler picks them up itself). This is the canonical iteration shape for
// the vocabulary's `acadamark_attributes` schema applied to HTML output.
//
// PLACEMENT NOTE (deliberate; do not lift without coupling to JATS export).
// This is HTML-stage attribute mapping. The acadamark-core architecture
// Phase 0 identified that its generic iteration shape may later lift to
// `acadamark-core` as a `mapAttributes(node, vocab, emit)` callback API
// when JATS export — a second output target — is built; at that point the
// per-target emission (HTML's `def.maps_to`, JATS's per-target field)
// splits from the shared iteration. That lift is deliberately deferred
// until the JATS use case is concrete: a generic API written against zero
// real consumers would lock in the wrong shape. See
// `notes/specs/acadamark-core.md` for the architecture-decision record
// and the deferred-question rationale.
//
// In the meantime, this lives in the interpreter — one function, two call
// sites (the schema dispatcher in `interpret-plugin.js` and the figure
// handler in `handlers/figure.js`). It resolves DRY audit finding Bin A.2
// (the function was duplicated across those two sites).

/**
 * Build the HTML properties object for an acadamarkTag node, applying the
 * vocabulary's `acadamark_attributes.kwargs[k]` → `maps_to` mappings for
 * kwargs whose `handled_by !== 'handler'`.
 *
 * @param {object} node  - acadamarkTag node
 * @param {object} vocab - vocabulary spec for the node's tagname
 * @returns {object} hast-compatible properties
 */
export function buildProperties(node, vocab) {
  const props = {};

  if (node.id) props.id = node.id;
  if (node.classes?.length) props.className = node.classes;

  const kwargDefs = vocab.acadamark_attributes?.kwargs ?? {};
  for (const [key, value] of Object.entries(node.kwargs ?? {})) {
    const def = kwargDefs[key];
    if (def?.maps_to && def.handled_by !== 'handler') {
      props[def.maps_to] = value;
    }
  }
  return props;
}
