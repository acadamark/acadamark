// Host accept-sets — the host / role axis of the #22 two-axis model.
//
// In the host/language model (DESIGN.md §"The two axes: host and language"),
// each host element owns the set of languages it admits. This module is the
// accept-set lookup: "is language L valid for host H?". The host owns the
// authoritative list — the `table` host's accept-set is the table handler's
// format dispatch table (`TABLE_FORMATS`), which is its source of truth — and
// this map just points at it.
//
// Slice 2 (output-neutral) wired the first host, `table`, and provided the
// lookup; slice 3 declared the `diagram` and storage-host (`library`, `data`)
// accept-sets below. Since #85 the lookup is consulted in production: the
// normalize-to-canonical gate validates each format-word host's leading
// language against its accept-set via `hostAcceptsLanguage` (an observe-only
// step — an out-of-set language gets a located, non-fatal `file.message`
// diagnostic and the node still renders). Each host handler additionally
// dispatches through its own format table. There is deliberately NO `fig`
// accept-set: framed inline SVG is the first-class `<svg>` frameable element,
// not a `<fig svg>` format word. The `<fig svg>` second path was retired (#81)
// — see `format-words.md` and the svg note in `dsl-registry.js`.

import { TABLE_FORMATS } from '../handlers/table.js';
import { deriveDslHostMemberships } from '../../core/dsl-registrations.js';

/**
 * Host name → the set of language identifiers it admits. Wired hosts: `table`,
 * `diagram`, and the storage hosts `library` / `data`. There is deliberately no
 * `fig` accept-set (see the module header).
 */
export const HOST_ACCEPT_SETS = new Map([
  ['table', new Set(TABLE_FORMATS)],
  // #22 slice 3: the diagram host admits the external diagram engines. The set is
  // open — a new engine (D2, Graphviz, …) is a new registration SEED
  // (core/dsl-registrations.js), which lands here automatically: the `diagram`
  // membership is DERIVED from the seeds' `host` field (#341), not hand-written.
  ...deriveDslHostMemberships(),
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
