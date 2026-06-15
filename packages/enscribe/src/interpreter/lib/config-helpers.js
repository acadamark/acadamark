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
