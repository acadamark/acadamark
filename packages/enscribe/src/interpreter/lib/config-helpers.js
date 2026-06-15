// Shared config-reading helpers for the interpreter plugins.
import { findTag } from './ast-helpers.js';

/**
 * Resolve a config enum with a book-vs-article default (audit F8). The config value is
 * returned when it is in `allowed`; otherwise the default is chosen by whether the
 * document is a book (a `<book>` at root level in `treeChildren`). Shared by
 * counter-reset-scope (numbering.js) and note-scope (note-placement.js) — the same
 * shape, differing only in the allowed set and the two defaults.
 *
 * The `treeChildren ?? []` guard preserves both originals: numbering scanned
 * `treeChildren ?? []`, note-placement called `findTag(treeChildren, …)` (which assumes
 * a defined array) — `?? []` matches the former and is a safe no-op for the latter.
 *
 * @param {Array} treeChildren  - the tree's root children (scanned for a `<book>`)
 * @param {Map|undefined} config - the config map (file.data[ENSCRIBE_CONFIG])
 * @param {string} key          - the config kwarg name
 * @param {Set<string>} allowed - the accepted enum values
 * @param {string} bookDefault  - default when the document is a book
 * @param {string} articleDefault - default otherwise
 * @returns {string}
 */
export function resolveConfigEnum(treeChildren, config, key, allowed, bookDefault, articleDefault) {
  const value = config?.get?.(key);
  if (allowed.has(value)) return value;
  return findTag(treeChildren ?? [], 'book') ? bookDefault : articleDefault;
}

/**
 * Read a CONFIG-only boolean setting (audit F12 — the one place "is this config value
 * true?" is answered, for config-only readers). Returns `defaultValue` when the key is
 * absent; otherwise PRESENT-AND-NOT-EXPLICITLY-'false' → true. This is the SAME coercion
 * `readBoolKwarg` uses for its config tier and `configFlag` used for book-nav, so config
 * booleans now coerce one way everywhere.
 *
 * Canonical forms are byte-stable: a bare `<config X>` stores 'true' (#219) → true;
 * `=true` → 'true' → true; `=false` → 'false' → false. Undocumented values (e.g. `=''`,
 * `=yes`) are present-and-not-'false', so they read true — the standardization surfaced in
 * R4's report (it changed show-source / the toc gate for non-canonical input only; no
 * fixture authors such values). NOT for tri-state resolvers like number-sections, whose
 * unrecognized values fall through to a book/article default rather than coercing.
 *
 * @param {Map|null|undefined} configMap
 * @param {string} key
 * @param {boolean} defaultValue - returned when the key is absent
 * @returns {boolean}
 */
export function readConfigBool(configMap, key, defaultValue) {
  if (!configMap || !configMap.has(key)) return defaultValue;
  const v = configMap.get(key);
  return v !== 'false' && v !== false;
}
