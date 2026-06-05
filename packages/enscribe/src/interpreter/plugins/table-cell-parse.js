// Data-table cell parsing (#21).
//
// Table cells can carry Enscribe inline markup, but data-format tables
// (<table csv|tsv|json|yaml|md | …>) hold *data*, so the safe default is
// LITERAL cells. This plugin implements the opt-in that overrides that default,
// keyed by table kind:
//   - markdown / pipe tables already inline-parse via remark-gfm (untouched).
//   - data-format tables are literal UNLESS the author opts in:
//       +parse-text                 parse all cells
//       -parse-text                 force all literal (overrides a global default)
//       parse-columns="a, b"        parse only the named columns
//     or a doc-wide <config parse-data-tables=true> default (per-table wins).
//
// Precedence (per-table attribute > global config > kind baseline) falls out of
// readBoolKwarg's priority (booleans > kwargs > config > default) for the
// all-cells flag, with parse-columns adding named columns on top.
//
// WHY a plugin (not the render handlers): an opted-in cell may contain a <ref>
// or <cite>, which only resolve if they are tree-resident when the resolution
// plugins (numbering / ref-resolution / cite-resolution) run. So this plugin
// runs in the mdast phase, BEFORE those, and parses opted-in cells into canonical
// inline mdast stamped on `node._parsedCells`. The shared walkers (discover /
// walkReplace) descend that stamp, so the resolution plugins reach the cell
// content for free. Both render channels (HTML table handler, JATS table emitter)
// then read `_parsedCells` — a parsed column parses in BOTH.
//
// Data payload stays literal: parsing happens on a READ of node.content / the
// src= file; nothing is written back. parse-columns is a display/semantic
// directive on the table, not a mutation of the asset (the asset three-layer
// model — format/identity untouched, display interpreted).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discover } from '../../core/walkers/discover.js';
import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { parseTableData, TABLE_FORMATS } from '../handlers/table.js';
import { parseInlineCellToMdast } from '../lib/parse-inline.js';
import { ENSCRIBE_CONFIG } from '../../core/file-data-keys.js';

const TABLE_FORMAT_SET = new Set(TABLE_FORMATS);

/** Doc-wide default for whether data-format tables parse their cells. */
const GLOBAL_CONFIG_KEY = 'parse-data-tables';

/**
 * Unified mdast-transform plugin. Stamps `node._parsedCells` on data-format
 * `<table>` nodes whose cells opted into Enscribe markup. A no-op for every
 * other table (so non-opted documents are byte-identical).
 *
 * @param {object} [options]
 * @param {string|null} [options.assetsDir] base dir for resolving `src=` paths
 * @returns {(tree: object, file: object) => void}
 */
export function enscribeTableCellParse(options = {}) {
  const { assetsDir = null } = options;
  return function tableCellParse(tree, file) {
    const config = file?.data?.[ENSCRIBE_CONFIG] ?? null;
    discover(tree, new Map([['table', (node) => stampTable(node, config, assetsDir)]]));
  };
}

function stampTable(node, config, assetsDir) {
  const format = node.positional?.[0] ?? null;
  // Only data-format tables. The no-format raw-HTML escape-hatch and any
  // out-of-accept-set token are left to the handler untouched.
  if (!format || !TABLE_FORMAT_SET.has(format)) return;

  // Resolve the opt-in directive. `parse-text` (the +/- all-cells flag) goes
  // through readBoolKwarg so per-table +/- beats the global config beats the
  // off baseline. `parse-columns` adds named columns on top.
  const parseAll = readBoolKwarg(node, 'parse-text', config, GLOBAL_CONFIG_KEY, false);
  const parseColsRaw = node.kwargs?.['parse-columns'];
  const parseCols = typeof parseColsRaw === 'string'
    ? parseColsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : null;
  if (!parseAll && (!parseCols || parseCols.length === 0)) return; // no opt-in → literal

  // Read the data string (src= file or inline content). Read-only — the stored
  // payload is never mutated.
  let rawData;
  const srcPath = node.kwargs?.src ?? null;
  if (srcPath) {
    if (!assetsDir) return;                 // can't read → leave to the handler (literal)
    try { rawData = readFileSync(join(assetsDir, srcPath), 'utf8'); }
    catch { return; }                       // read error → handler emits the error table
  } else {
    rawData = typeof node.content === 'string' ? node.content : '';
  }

  const hasHeaders = readBoolKwarg(node, 'headers', null, null, true);
  let parsed;
  try { parsed = parseTableData(format, rawData, { hasHeaders }); }
  catch { return; }                         // parse error → handler emits the error table

  const headers = parsed.headers;
  const columnParses = (c) => {
    if (parseAll) return true;
    if (parseCols && headers && parseCols.includes(headers[c])) return true;
    return false;
  };

  // Body cells: parsed columns → canonical inline mdast (resolved later by the
  // resolution plugins via the walkers); other columns → literal text. Headers
  // (column names) stay literal.
  const rows = parsed.rows.map((row) =>
    row.map((cell, c) =>
      columnParses(c)
        ? { inline: parseInlineCellToMdast(String(cell)) }
        : { text: String(cell) },
    ),
  );

  node._parsedCells = { headers, rows };
}
