// Generic numbering registry for the acadamark interpreter.
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
// file.data.acadamarkRegistry, creating it on first call. Pass null/undefined
// to get a transient registry (useful in isolated tests).

import { isColonId } from './colon-id.js';
import { ACADAMARK_REGISTRY } from './file-data-keys.js';

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
 * Return the shared registry attached to `file.data.acadamarkRegistry`,
 * creating it on first call. If `file` is null/undefined or has no `.data`
 * property, returns a fresh transient registry (not attached anywhere) so
 * isolated tests and direct plugin invocations continue to work.
 *
 * @param {object|null|undefined} file - unified VFile, or null for transient mode
 * @returns {object} registry instance
 */
export function ensureRegistry(file) {
  if (!file?.data) return createRegistry();
  if (!file.data[ACADAMARK_REGISTRY]) {
    file.data[ACADAMARK_REGISTRY] = createRegistry();
  }
  return file.data[ACADAMARK_REGISTRY];
}
