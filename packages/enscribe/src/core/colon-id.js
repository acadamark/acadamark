// Colon-id helper — the cross-reference namespace convention.
//
// Per DESIGN.md ("Cross-references resolve only to colon-ids") and
// `notes/specs/interpreter.md` §3.9, a colon-id is the `type:name`
// shape — a non-empty type prefix followed by `:` followed by a name.
// Examples: `fig:scatter`, `eqn:model`, `sec:methods`.
//
// A leading-colon id (`:foo`) is NOT a valid colon-id: it lacks the
// type prefix that the convention depends on. The registry does not
// index leading-colon ids in its label index; ref-resolution does not
// resolve a ref against one.
//
// This helper consolidates two pre-existing ad-hoc checks that
// disagreed: registry.js used `id.includes(':')` (which accepted
// `:foo`); ref-resolution.js used `id.indexOf(':') > 0` (which rejected
// it). The spec-correct rule is the latter — non-empty type prefix
// required. Adopting the helper at the registry call site is a
// spec-conformance fix.

/**
 * True iff `id` is a colon-id of the form `type:name` with non-empty
 * type prefix.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function isColonId(id) {
  if (typeof id !== 'string') return false;
  return id.indexOf(':') > 0;
}

/**
 * Decompose a colon-id into its prefix and tail.
 * Returns `null` for inputs that are not colon-ids.
 *
 * @param {string} id
 * @returns {{ prefix: string, tail: string } | null}
 */
export function parseColonId(id) {
  if (!isColonId(id)) return null;
  const colonIdx = id.indexOf(':');
  return {
    prefix: id.slice(0, colonIdx),
    tail: id.slice(colonIdx + 1),
  };
}
