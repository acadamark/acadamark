// TSV handler — renders standalone `<tsv>` tags.
//
// Thin caller of the shared `renderDelimitedTable` (table.js); see
// handlers/csv.js for the design. `<tsv>` differs only in using `parseTsv`.
//
// Phase 2 slice 2a (2026-05-27) initial; Phase 3 slice 3c unified to the
// renderFrameable shape; #46 collapsed the csv/tsv duplication into
// renderDelimitedTable.

import { parseTsv, renderDelimitedTable } from './table.js';

/**
 * Handler for the `<tsv>` standalone tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "tsv"
 * @returns {import('hast').Element}
 */
export function tsvHandler(state, node) {
  return renderDelimitedTable(state, node, { kind: 'tsv', parse: parseTsv, label: 'tsv' });
}
