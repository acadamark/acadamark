// CSV handler — renders standalone `<csv>` tags.
//
// Thin caller of the shared `renderDelimitedTable` (table.js): `<csv>` and
// `<tsv>` differ only in the parser used, the frameable `kind`, and the
// parse-error label, so the body lives in table.js (which also owns the
// parsers and the table-body machinery).
//
// Phase 2 slice 2a (2026-05-27) initial; Phase 3 slice 3c unified to the
// renderFrameable shape; #46 collapsed the csv/tsv duplication into
// renderDelimitedTable.

import { parseCsv, renderDelimitedTable } from './table.js';

/**
 * Handler for the `<csv>` standalone tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "csv"
 * @returns {import('hast').Element}
 */
export function csvHandler(state, node) {
  return renderDelimitedTable(state, node, { kind: 'csv', parse: parseCsv, label: 'csv' });
}
