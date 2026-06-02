// The shared gate-expansion map (#22 slice 2).
//
// A *shorthand* tag rewrites, at the normalize-to-canonical gate, to a
// canonical (host) tag — optionally injecting a leading positional and/or
// kwargs, optionally gated by a per-document condition. The gate's
// tagname-alias group foresaw this map ("can lift to a shared map when a second
// alias family lands"); the shorthand machinery is that second family, so this
// is the shared map rather than a mechanism beside book-part. Two families are
// expressible in it:
//
//   - book-part shorthands — <chapter> -> <book-part book-part-type="chapter">,
//     gated on book context (kwargs-injecting). Lifted into this map in slice 2.
//   - the DSL shorthands — <csv> -> <table csv>, <mermaid> -> <diagram mermaid>
//     (positional-injecting, unconditional). NOT registered this slice:
//     changing a DSL tag's node identity is slice-3 work, gated by the JATS
//     guard there.
//
// Clobber + reservation policy (format-words.md §"Standalone tags are loadable
// shorthands"):
//   - duplicate shorthand: later-wins + warn — matches the vocab generator's
//     documented "warn, non-fatal, second-wins" behavior.
//   - a shorthand that shadows a RESERVED name (a host or core-vocabulary name)
//     is rejected + warned — UNLESS it is conditional, in which case the
//     condition is the deliberate disambiguation. (This is exactly why
//     <glossary> can be a book-part shorthand: it shadows the standalone
//     <glossary> vocab tag but only in book context; in articles it keeps its
//     standalone meaning.)

/**
 * @typedef {object} ShorthandEntry
 * @property {string}   tagname            canonical host tagname to rewrite to
 * @property {string[]} [positional]       positional values to prepend
 * @property {Object<string,string>} [kwargs]  kwargs to inject (merged over existing)
 * @property {(ctx: object) => boolean} [condition]  per-document gate; omit for unconditional
 */

/**
 * Create a shorthand-expansion registry.
 *
 * @param {object} [opts]
 * @param {Set<string>} [opts.reservedNames]  host + core-vocabulary names a
 *   shorthand may not shadow (only enforced for UNCONDITIONAL shorthands).
 * @param {(msg: string) => void} [opts.warn]  warning sink (default console.warn).
 * @returns {{ register: Function, matches: Function, expand: Function, map: Map }}
 */
export function createShorthandRegistry({ reservedNames = new Set(), warn = console.warn } = {}) {
  const map = new Map();

  /**
   * Register a shorthand. Returns true if registered, false if rejected by the
   * reservation policy.
   * @param {string} shorthand
   * @param {ShorthandEntry} entry
   */
  function register(shorthand, entry) {
    const { tagname, positional = [], kwargs = {}, condition = null } = entry;
    // Reservation: an UNCONDITIONAL shorthand may not shadow a reserved name.
    // A conditional shorthand is allowed to coexist (the condition disambiguates).
    if (!condition && reservedNames.has(shorthand)) {
      warn(`[enscribe] shorthand "${shorthand}" is reserved (host or core-vocabulary name); not registered`);
      return false;
    }
    if (map.has(shorthand)) {
      warn(`[enscribe] shorthand "${shorthand}" already registered; later definition wins`);
    }
    map.set(shorthand, { tagname, positional, kwargs, condition });
    return true;
  }

  /**
   * Does this node's tagname have a registered shorthand whose condition (if
   * any) passes in `ctx`? Used as the gate group's predicate so first-match
   * dispatch is preserved: a conditional shorthand that fails its condition does
   * NOT match, leaving the node to its other normalizations.
   */
  function matches(node, ctx = {}) {
    const entry = map.get(node?.tagname);
    if (!entry) return false;
    if (entry.condition && !entry.condition(ctx)) return false;
    return true;
  }

  /**
   * Apply the expansion in place: rewrite tagname, prepend positional, merge
   * kwargs. Caller has already established `matches()`. No-op if unregistered.
   */
  function expand(node) {
    const entry = map.get(node?.tagname);
    if (!entry) return node;
    node.tagname = entry.tagname;
    if (entry.positional.length > 0) {
      node.positional = [...entry.positional, ...(node.positional ?? [])];
    }
    if (Object.keys(entry.kwargs).length > 0) {
      node.kwargs = { ...node.kwargs, ...entry.kwargs };
    }
    return node;
  }

  return { register, matches, expand, map };
}
