// Host accept-sets — the host / role axis of the #22 two-axis model.
//
// In the host/language model (DESIGN.md §"The two axes: host and language"),
// each host element owns the set of languages it admits. This module is the
// accept-set lookup: "is language L valid for host H?". The host owns the
// authoritative list — the `table` host's accept-set is the table handler's
// format dispatch table (`TABLE_FORMATS`), which is its source of truth — and
// this map just points at it.
//
// Slice 2 (output-neutral) wires the ONE existing host, `table`, and provides
// the lookup; nothing in production dispatch consults it yet (the table handler
// still dispatches through its own parser table). Slice 3 declares the
// remaining hosts' accept-sets here (`diagram` → {mermaid, abc, …}, `fig` →
// {svg, …}) and turns the lookup on as it migrates the members.

import { TABLE_FORMATS } from '../handlers/table.js';

/**
 * Host name → the set of language identifiers it admits. Only `table` is wired
 * this slice; slice 3 adds `diagram`, `fig`, etc.
 */
export const HOST_ACCEPT_SETS = new Map([
  ['table', new Set(TABLE_FORMATS)],
  // #22 slice 3: the diagram host admits the external diagram engines. The set
  // is open — a new engine (D2, Graphviz, …) is a new entry here + a gate
  // shorthand, not a new vocabulary element.
  ['diagram', new Set(['mermaid', 'abc'])],
  // #22 slice 3: the storage hosts (library, and the <data> container that holds
  // <library> blocks) admit the bibliography payload languages. citation-js is
  // the parser; the format word names the language. (Container shape of <data>
  // stays the #24 question — this is only the language axis for its payloads.)
  ['library', new Set(['bibtex', 'csl-json', 'ris', 'endnote-xml', 'other'])],
  ['data', new Set(['bibtex', 'csl-json', 'ris', 'endnote-xml', 'other'])],
]);

/**
 * Is language `language` valid for host `host`? Consults the host's accept-set.
 * An unknown host (not yet wired) admits nothing — returns `false`.
 *
 * @param {string} host       host element name (e.g. 'table')
 * @param {string} language   language identifier (e.g. 'csv')
 * @returns {boolean}
 */
export function hostAcceptsLanguage(host, language) {
  const set = HOST_ACCEPT_SETS.get(host);
  return set ? set.has(language) : false;
}
