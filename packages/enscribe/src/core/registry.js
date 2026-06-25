// Generic numbering registry for the enscribe interpreter.
//
// Used by structural plugins (notes, equations, figures, tables) to assign
// sequential numbers to document elements, look up entries by id, and
// enumerate all entries of a type.
//
// Each "type" (e.g., "note", "equation", "figure") has its own independent
// numbered counter. Entries are keyed by id within a type; ids are either
// author-provided or auto-generated as "${type}-${sequence}".
//
// Entry shape: { type, id, number, numbered, data }
//   type     — the registry type string (e.g. "equation")
//   id       — the entry's id (author-provided or auto-generated)
//   number   — undefined before numberRegistry() runs; sequential number after;
//              null for entries with numbered:false (deliberately unnumbered)
//   numbered — whether this entry participates in the visible sequence
//   data     — caller-supplied payload
//
// Entries whose id contains ":" are also indexed in the cross-type label index
// so that ref-resolution can look them up without knowing the type.
//
// The registry is created fresh per document via createRegistry(). It is not a
// module-level singleton — callers own the lifecycle.
//
// ensureRegistry(file) is a convenience that attaches a registry to
// file.data.enscribeRegistry, creating it on first call. Pass null/undefined
// to get a transient registry (useful in isolated tests).

import { isColonId } from './colon-id.js';
import { ENSCRIBE_REGISTRY } from './file-data-keys.js';

/**
 * Create a new registry instance.
 *
 * @returns {object} registry with assign, lookup, entries, findByLabel, reset
 */
export function createRegistry() {
  // type → { sequence: number, entries: Map<id, entry> }
  const types = new Map();
  // Cross-type label index: ids containing ":" → entry
  const labelIndex = new Map();

  function ensure(type) {
    if (!types.has(type)) {
      types.set(type, { sequence: 0, entries: new Map() });
    }
    return types.get(type);
  }

  return {
    /**
     * Register an entry of the given type.
     *
     * If `providedId` is null/undefined/empty, an id is auto-generated as
     * `${type}-${sequence}`. If `numbered` is true (default), a sequential
     * display number is assigned; otherwise number is null.
     *
     * Entries whose id contains ":" are added to the cross-type label index.
     *
     * Returns the full entry `{ type, id, number, numbered, data }`.
     *
     * @param {string} type - e.g., "note", "equation", "figure"
     * @param {string|null|undefined} providedId - author-specified id, or null
     * @param {{ numbered?: boolean, data?: object }} [opts]
     * @returns {{ type: string, id: string, number: undefined, numbered: boolean, data: object }}
     */
    assign(type, providedId, { numbered = true, data = {} } = {}) {
      const t = ensure(type);
      t.sequence += 1;
      const id = providedId || `${type}-${t.sequence}`;
      const entry = { type, id, number: undefined, numbered, data };
      t.entries.set(id, entry);
      if (isColonId(id)) {
        labelIndex.set(id, entry);
      }
      return entry;
    },

    /**
     * Look up an entry by id within a type.
     * Returns null if the type or id is not found.
     *
     * @param {string} type
     * @param {string} id
     * @returns {object|null}
     */
    lookup(type, id) {
      const t = types.get(type);
      if (!t) return null;
      return t.entries.get(id) ?? null;
    },

    /**
     * Look up an entry by its colon-label id, across all types.
     * Only ids containing ":" are indexed. Returns null if not found.
     *
     * @param {string} id - e.g., "eqn:newton", "fig:scatter"
     * @returns {object|null}
     */
    findByLabel(id) {
      return labelIndex.get(id) ?? null;
    },

    /**
     * Get all entries of a type in assignment order.
     * Returns an empty array if the type has no entries.
     *
     * @param {string} type
     * @returns {Array<object>}
     */
    entries(type) {
      const t = types.get(type);
      if (!t) return [];
      return Array.from(t.entries.values());
    },

    /**
     * Assign sequential display numbers to all registered entries.
     *
     * Iterates every registered type in insertion order. For each type,
     * walks entries in insertion order (= document order) and assigns the
     * next positive integer to entries with `numbered: true`; sets
     * `number: null` for entries with `numbered: false`. Mutates entries
     * in place.
     *
     * Call exactly once, after all assign() calls are complete and before
     * any consumer reads entry.number.
     */
    numberRegistry() {
      for (const t of types.values()) {
        let counter = 0;
        for (const entry of t.entries.values()) {
          entry.number = entry.numbered ? ++counter : null;
        }
      }
    },

    /**
     * Reset all state. Useful for testing or between documents.
     */
    reset() {
      types.clear();
      labelIndex.clear();
    },
  };
}

/**
 * Build a ONE-WAY read-through registry over a parent registry. Two consumers: #115,
 * minipage outbound refs (the parent is the enclosing document's registry); and #300,
 * the static-website composition's per-page numbering, where the parent is a hand-rolled
 * findByLabel-only stub over the merged SITE registry (so a cross-page `<ref>` reads its
 * target's native number). It wraps a FRESH child registry: every WRITE (assign / number /
 * reset) and every enumeration (entries / lookup) is child-local, so the child's
 * labels and counters never touch the parent — the seal (private numbering,
 * inbound-forbidden) is preserved. Only `findByLabel` reads through: the child's
 * own labels shadow, then the parent is consulted on a miss, so a body `<ref>` to
 * a DOCUMENT label resolves (outbound) while the parent is never mutated. The
 * parent may itself be a read-through registry (nested minipages), so the
 * fall-through chains up through every enclosing scope.
 *
 * Why a wrapper and not a copy: createRegistry's label index is a private
 * closure with no enumerate/seed API, so the parent's labels cannot be copied in;
 * delegating findByLabel to the live parent object is the only way to read them
 * without ever writing to it (registry.js findByLabel is the single method
 * ref-resolution calls).
 *
 * @param {object} parent - the parent. `findByLabel` is the ONLY method called on it (read on a
 *   child miss), so the parent may be a full registry OR a duck-typed `{ findByLabel }` stub (the
 *   #300 site-registry parent is the latter). It is never written to.
 * @returns {object} a registry with the same method surface, child-private writes
 */
export function makeReadThroughRegistry(parent) {
  const child = createRegistry();
  return {
    assign: (type, providedId, opts) => child.assign(type, providedId, opts),
    lookup: (type, id) => child.lookup(type, id),
    entries: (type) => child.entries(type),
    numberRegistry: () => child.numberRegistry(),
    reset: () => child.reset(),
    // Child labels shadow; the parent is the read-through fallback (never written).
    findByLabel: (id) => child.findByLabel(id) ?? parent.findByLabel(id),
  };
}

/**
 * Return the shared registry attached to `file.data.enscribeRegistry`,
 * creating it on first call. If `file` is null/undefined or has no `.data`
 * property, returns a fresh transient registry (not attached anywhere) so
 * isolated tests and direct plugin invocations continue to work.
 *
 * @param {object|null|undefined} file - unified VFile, or null for transient mode
 * @returns {object} registry instance
 */
export function ensureRegistry(file) {
  if (!file?.data) return createRegistry();
  if (!file.data[ENSCRIBE_REGISTRY]) {
    file.data[ENSCRIBE_REGISTRY] = createRegistry();
  }
  return file.data[ENSCRIBE_REGISTRY];
}
