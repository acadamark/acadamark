/**
 * The tagname↔sigil map.
 *
 * A single source-of-truth list of [sigil, tagname] pairs relating each
 * sigil-form spelling of a Layer 1 element to its named-tag spelling.
 * Both lookup directions are derived from one literal so they cannot
 * drift. A load-time assertion enforces bijection in both directions.
 *
 * The two sides of a pair are structurally identical and differ only in
 * the tagname token — this is a *cipher* (substitution), not a transform.
 * Round-trip between sigil and named form is lossless by construction.
 *
 * Used by:
 *   - The normalize-to-canonical gate (lift direction: sigil → tagname) —
 *     `enscribe/interpreter/src/plugins/normalize-to-canonical.js`.
 *   - The future lowering pass (lower direction: tagname → sigil) — not
 *     yet built; the reverse map is exported so it exists from day one
 *     and is guaranteed consistent with the lift direction.
 *
 * See `DESIGN.md` §"Lift and lower" for the three-level / two-mechanism
 * architecture this module is the cipher half of.
 */

const PAIRS = [
  ['#',   'section'],
  ['##',  'sub-section'],
  ['###', 'sub-sub-section'],
  ['$',   'inline-math'],
  ['$$',  'display-math'],
  ['`',   'inline-code'],
  ['```', 'code-block'],
];

/**
 * Build a lookup map from one direction of PAIRS, asserting no key
 * collision. A duplicate key would silently break the bijection — fail
 * loud at module load instead.
 */
function buildMap(direction, label) {
  const m = {};
  for (const [s, t] of PAIRS) {
    const key = direction === 'sigil-to-tagname' ? s : t;
    const value = direction === 'sigil-to-tagname' ? t : s;
    if (Object.prototype.hasOwnProperty.call(m, key)) {
      throw new Error(
        `tagname-sigil-map: duplicate key '${key}' in ${label}; the map must be bijective`,
      );
    }
    m[key] = value;
  }
  return Object.freeze(m);
}

/** Map from sigil token (e.g. '#') to canonical tagname (e.g. 'section'). */
export const SIGIL_TO_TAGNAME = buildMap('sigil-to-tagname', 'SIGIL_TO_TAGNAME');

/** Map from canonical tagname (e.g. 'section') to sigil token (e.g. '#'). */
export const TAGNAME_TO_SIGIL = buildMap('tagname-to-sigil', 'TAGNAME_TO_SIGIL');

/**
 * Predicate: is this tagname a sigil token (i.e. one of the keys of
 * SIGIL_TO_TAGNAME)? Used by the gate to decide whether a node's tagname
 * needs rewriting to its canonical form.
 *
 * @param {string} tagname
 * @returns {boolean}
 */
export function isSigilTagname(tagname) {
  return Object.prototype.hasOwnProperty.call(SIGIL_TO_TAGNAME, tagname);
}
