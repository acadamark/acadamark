// Table handler — renders <table format | data> tags.
//
// Dispatch order:
//   1. node.positional[0] determines the input format (csv, tsv, json, yaml, md).
//   2. node.content is the raw data string (never recursively-parsed because
//      `LANGUAGES` maps 'table' to 'table', not 'default').
//   3. node.kwargs.src is an optional path to an external file; when present,
//      the file is read and its text used as the data source instead of content.
//   4. Parsed data is rendered to a hast <table> element.
//
// Numbering: node.computedNumber and node.registryType are set by the
// numbering plugin (runs before this handler). When computedNumber is not null,
// the caption receives a "Table N." label span.
//
// When no format word is given, content is treated as raw HTML (escape-hatch).
//
// See notes/tables-investigation.md for Phase 0 findings.
//
// This module also exports `parseCsv` / `parseTsv` (the format parsers) and
// `buildTableBodyHast`. The standalone `<csv>` / `<tsv>` handlers were retired in
// #22 slice 3 (`<csv>` → `<table csv>` gate shorthands), and the dead helpers
// they left behind (`renderParsedTable` / `renderDelimitedTable`) were removed in
// the #82 dead-code sweep.

// Node built-ins for the server/build path. In the browser bundle these are dead
// code (browser defaults never call them); tsup aliases both the node: and bare
// forms to a throwing stub. See packages/enscribe/src/interpreter/tsup.config.js.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';
import { convertChildren } from '../lib/ast-helpers.js';

// ─── Format parsers ───────────────────────────────────────────────────────────

/**
 * Parse CSV text into {headers, rows}.
 * Handles quoted fields per RFC 4180. Strips leading/trailing whitespace from
 * unquoted fields. Leading blank lines (from pipe-content formatting) are
 * skipped.
 *
 * @param {string} text
 * @param {object} opts
 * @param {boolean} opts.hasHeaders - whether the first row is the header
 * @returns {{ headers: string[]|null, rows: string[][] }}
 */
export function parseCsv(text, { hasHeaders }) {
  const allRows = parseDelimited(text, ',');
  return splitHeadersRows(allRows, hasHeaders);
}

/**
 * Parse TSV text into {headers, rows}.
 * RFC-4180-aware, sharing the same parser as CSV with the delimiter set to a
 * tab: a quoted field may contain tabs and doubled-up quotes (""). Unquoted
 * cells are trimmed (matching CSV).
 *
 * @param {string} text
 * @param {object} opts
 * @returns {{ headers: string[]|null, rows: string[][] }}
 */
export function parseTsv(text, { hasHeaders }) {
  const allRows = parseDelimited(text, '\t');
  return splitHeadersRows(allRows, hasHeaders);
}

/**
 * Parse JSON into {headers, rows}.
 * Supports:
 *   (a) Array of objects — headers from object keys (union, insertion order)
 *   (b) Array of arrays — first array is headers (unless -headers)
 *
 * @param {string} text
 * @param {object} opts
 * @returns {{ headers: string[]|null, rows: any[][] }}
 * @throws {Error} if JSON is invalid or doesn't match the expected shapes
 */
function parseJson(text, { hasHeaders }) {
  let data;
  try {
    data = JSON.parse(text.trim());
  } catch (err) {
    throw new Error(`JSON parse error: ${err.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('JSON table data must be an array');
  }
  if (data.length === 0) {
    return { headers: null, rows: [] };
  }
  if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
    // Array of objects
    const keySet = new Set();
    for (const row of data) {
      for (const key of Object.keys(row)) keySet.add(key);
    }
    const headers = hasHeaders ? [...keySet] : null;
    const keys = [...keySet];
    const rows = data.map(obj =>
      keys.map(k => (obj[k] !== undefined ? String(obj[k]) : '')),
    );
    return { headers: headers ? headers.map(String) : null, rows };
  }
  if (Array.isArray(data[0])) {
    // Array of arrays
    const allRows = data.map(row => row.map(cell => String(cell)));
    return splitHeadersRows(allRows, hasHeaders);
  }
  throw new Error('JSON table data must be an array of objects or array of arrays');
}

/**
 * Parse YAML into {headers, rows}.
 * Supports:
 *   (a) Sequence of mappings — headers from keys
 *   (b) Sequence of sequences — first sequence is headers (unless -headers)
 *
 * @param {string} text
 * @param {object} opts
 * @returns {{ headers: string[]|null, rows: any[][] }}
 * @throws {Error} if YAML is invalid or doesn't match expected shapes
 */
function parseYaml(text, { hasHeaders }) {
  let data;
  try {
    data = yaml.load(text.trim());
  } catch (err) {
    throw new Error(`YAML parse error: ${err.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('YAML table data must be a sequence');
  }
  if (data.length === 0) {
    return { headers: null, rows: [] };
  }
  if (typeof data[0] === 'object' && !Array.isArray(data[0]) && data[0] !== null) {
    // Sequence of mappings
    const keySet = new Set();
    for (const row of data) {
      for (const key of Object.keys(row)) keySet.add(key);
    }
    const keys = [...keySet];
    const headers = hasHeaders ? keys.map(String) : null;
    const rows = data.map(obj =>
      keys.map(k => (obj[k] !== undefined ? String(obj[k]) : '')),
    );
    return { headers, rows };
  }
  if (Array.isArray(data[0])) {
    // Sequence of sequences
    const allRows = data.map(row => row.map(cell => String(cell)));
    return splitHeadersRows(allRows, hasHeaders);
  }
  throw new Error('YAML table data must be a sequence of mappings or sequence of sequences');
}

/**
 * Parse a Markdown pipe table into {headers, rows}.
 * Supports standard GFM pipe syntax:
 *   | h1 | h2 |
 *   |----|----|
 *   | r1 | r2 |
 * The separator row (|---|---| or |:---|---:|) is detected and skipped.
 * Cells are trimmed.
 *
 * @param {string} text
 * @param {object} opts
 * @returns {{ headers: string[]|null, rows: string[][] }}
 */
function parseMd(text, { hasHeaders }) {
  const lines = text
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && l !== '');

  // Filter out separator lines (cells consist only of dashes and colons)
  const isSeparatorLine = l =>
    l
      .split('|')
      .filter(cell => cell.trim() !== '')
      .every(cell => /^:?-+:?$/.test(cell.trim()));

  const dataLines = lines.filter(l => !isSeparatorLine(l));

  const allRows = dataLines.map(line => {
    // Remove leading and trailing `|`, then split on unescaped `|`.
    // GFM pipe tables use `\|` to include a literal pipe in a cell.
    // Split on `|` NOT preceded by `\`, then replace `\|` → `|` in each cell.
    const inner = line.replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
    return inner
      .split(/(?<!\\)\|/)
      .map(cell => cell.trim().replace(/\\\|/g, '|'));
  });

  return splitHeadersRows(allRows, hasHeaders);
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a delimiter-separated text into rows of cells.
 * Handles RFC 4180 quoting, parameterized by delimiter — `,` for CSV and a tab
 * for TSV both route through here.
 *
 * @param {string} text
 * @param {string} delimiter
 * @returns {string[][]}
 */
function parseDelimited(text, delimiter) {
  const rows = [];
  const lines = text.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') continue;
    rows.push(parseCsvLine(line, delimiter));
  }
  return rows;
}

/**
 * Parse a single CSV line into an array of cell values.
 * Handles double-quote escaping (RFC 4180): quoted fields may contain
 * the delimiter, newlines, and doubled-up quotes ("").
 *
 * One field is read per iteration. A trailing empty field is produced ONLY when
 * the line ends on an unconsumed delimiter (`a,b,` → `['a','b','']`); a line that
 * ends on a closed quoted field gets NO trailing empty (`a,"b,c"` → `['a','b,c']`,
 * not `['a','b,c','']`). The earlier loop emitted a phantom trailing empty after
 * any field that reached end-of-line, which mis-split rows whose last column was a
 * quoted (e.g. comma-bearing) value into one extra empty column.
 *
 * @param {string} line
 * @param {string} delimiter
 * @returns {string[]}
 */
function parseCsvLine(line, delimiter) {
  const cells = [];
  let pos = 0;
  for (;;) {
    if (line[pos] === '"') {
      // Quoted field: may contain the delimiter, newlines, and doubled quotes.
      pos++; // skip opening quote
      let cell = '';
      while (pos < line.length) {
        if (line[pos] === '"') {
          if (line[pos + 1] === '"') {
            cell += '"'; // escaped quote
            pos += 2;
          } else {
            pos++; // closing quote
            break;
          }
        } else {
          cell += line[pos++];
        }
      }
      cells.push(cell);
      // A delimiter continues to the next field; end-of-line ends the row here —
      // no phantom trailing empty.
      if (line[pos] === delimiter) { pos++; continue; }
      break;
    }
    // Unquoted field: read until the next delimiter. A trailing delimiter leaves
    // pos at end-of-line, so this branch reads an empty final field (the real
    // trailing empty); end-of-input with no delimiter ends the row.
    const end = line.indexOf(delimiter, pos);
    if (end === -1) {
      cells.push(line.slice(pos).trim());
      break;
    }
    cells.push(line.slice(pos, end).trim());
    pos = end + 1;
  }
  return cells;
}

/**
 * Split row array into headers + body rows based on the hasHeaders flag.
 *
 * @param {string[][]} allRows
 * @param {boolean} hasHeaders
 * @returns {{ headers: string[]|null, rows: string[][] }}
 */
function splitHeadersRows(allRows, hasHeaders) {
  if (allRows.length === 0) return { headers: null, rows: [] };
  if (hasHeaders) {
    const [first, ...rest] = allRows;
    return { headers: first, rows: rest };
  }
  return { headers: null, rows: allRows };
}

// ─── hast builders ────────────────────────────────────────────────────────────

function makeTextNode(value) {
  return { type: 'text', value: String(value) };
}

function makeTd(cell, isHeader) {
  return {
    type: 'element',
    tagName: isHeader ? 'th' : 'td',
    properties: {},
    children: [makeTextNode(cell)],
  };
}

function makeTr(cells, isHeader) {
  return {
    type: 'element',
    tagName: 'tr',
    properties: {},
    children: cells.map(c => makeTd(c, isHeader)),
  };
}

function makeThead(headers) {
  return {
    type: 'element',
    tagName: 'thead',
    properties: {},
    children: [makeTr(headers, true)],
  };
}

function makeTbody(rows) {
  return {
    type: 'element',
    tagName: 'tbody',
    properties: {},
    children: rows.map(row => makeTr(row, false)),
  };
}

// Phase 3 slice 3c: caption construction moved into renderFrameable
// (lib/frameable.js). tableHandler builds the table BODY (thead + tbody)
// via buildTableBodyHast and lets renderFrameable produce the wrapped
// <table> with title/caption placement.

/**
 * Build an error placeholder table when parsing fails.
 *
 * @param {string} errorMsg
 * @param {string|null} id
 * @returns {import('hast').Element}
 */
function makeErrorTable(errorMsg, id) {
  const props = { className: ['table-parse-error'] };
  if (id) props.id = id;
  return {
    type: 'element',
    tagName: 'table',
    properties: props,
    children: [
      {
        type: 'element',
        tagName: 'tbody',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'tr',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'td',
                properties: { className: ['table-error-message'] },
                children: [makeTextNode(`??table-error: ${errorMsg}??`)],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── Format dispatch table = the host's accept-set ─────────────────────────────
//
// The `table` host's accepted formats (the format words the leading positional
// may name) are exactly the keys of this parser map. Lifted to module scope (it
// was a per-call local) so `TABLE_FORMATS` derives from it — the table handler
// is the single source of truth for its accept-set (DESIGN.md §"The two axes:
// host and language"; format-words.md §"The accept-set lives in the host"). The
// host-accept-set lookup (interpreter/lib/host-accept-sets.js) consults
// `TABLE_FORMATS`; this slice does not change how the handler dispatches.
const TABLE_PARSERS = { csv: parseCsv, tsv: parseTsv, json: parseJson, yaml: parseYaml, md: parseMd };

/** The `table` host's accept-set: the format words its content may declare. */
export const TABLE_FORMATS = Object.freeze(Object.keys(TABLE_PARSERS));

/**
 * Parse data-table text in a given format into {headers, rows} of string cells.
 * The single dispatch over the format → parser map, shared so the table-cell-parse
 * plugin (#21) parses identically to this handler. Throws on an unknown format.
 *
 * @param {string} format - a TABLE_FORMATS member
 * @param {string} rawData
 * @param {{hasHeaders: boolean}} opts
 * @returns {{ headers: string[]|null, rows: any[][] }}
 */
export function parseTableData(format, rawData, { hasHeaders }) {
  const parserFn = TABLE_PARSERS[format];
  if (!parserFn) throw new Error(`unknown format "${format}"`);
  return parserFn(rawData, { hasHeaders });
}

// ─── #21: parsed-cell rendering ────────────────────────────────────────────
//
// When the table-cell-parse plugin has opted cells into Enscribe inline markup,
// it stamps `node._parsedCells = { headers, rows }`, where each body cell is
// either a literal `{ text }` or a parsed `{ inline: <canonical inline mdast> }`
// (already resolved — refs/cites resolved by the resolution plugins, which the
// shared walkers route through the stamped cell arrays). The header row stays
// literal (column names). This builder renders that structure; the literal path
// (buildTableBodyHast) is untouched, so non-opted tables are byte-identical.

function makeParsedCell(state, node, cell) {
  const children = Array.isArray(cell?.inline)
    ? convertChildren(state, node, cell.inline)
    : [makeTextNode(cell?.text ?? '')];
  return { type: 'element', tagName: 'td', properties: {}, children };
}

function buildTableBodyFromParsedCells(state, node, parsedCells) {
  const children = [];
  if (parsedCells.headers) children.push(makeThead(parsedCells.headers));
  if (parsedCells.rows.length > 0) {
    children.push({
      type: 'element',
      tagName: 'tbody',
      properties: {},
      children: parsedCells.rows.map((row) => ({
        type: 'element',
        tagName: 'tr',
        properties: {},
        children: row.map((cell) => makeParsedCell(state, node, cell)),
      })),
    });
  }
  return children;
}

// ─── #106: complex (HTML-layout) table rendering ────────────────────────────
//
// The JATS importer can't express a colspan/rowspan/multi-row-header table in
// enscribe's flat table formats, so it preserves the grid LAYOUT but still runs
// each cell through the same inline conversion as body content, stamping
// `node._htmlTable = { rows: [{ section: 'head'|'body', cells: [{ header,
// colspan, rowspan, align, inline }] }] }` with already-resolved inline mdast
// (the shared walkers descended the stamp so refs/cites/notes resolved in the
// mdast phase). This builder renders that grid — spans and multi-row headers
// preserved — with each cell's inline converted via the normal child pipeline.

function makeGridCell(state, node, cell) {
  const props = {};
  if (cell.colspan) props.colSpan = cell.colspan;
  if (cell.rowspan) props.rowSpan = cell.rowspan;
  if (cell.align) props.align = cell.align;
  return {
    type: 'element',
    tagName: cell.header ? 'th' : 'td',
    properties: props,
    children: Array.isArray(cell.inline)
      ? convertChildren(state, node, cell.inline)
      : [makeTextNode(cell?.text ?? '')],
  };
}

function buildHtmlTableBodyHast(state, node, grid) {
  const children = [];
  let section = null;
  let rows = [];
  const flush = () => {
    if (!rows.length) return;
    children.push({
      type: 'element',
      tagName: section === 'head' ? 'thead' : 'tbody',
      properties: {},
      children: rows,
    });
    rows = [];
  };
  for (const row of grid.rows ?? []) {
    if (row.section !== section) { flush(); section = row.section; }
    rows.push({
      type: 'element',
      tagName: 'tr',
      properties: {},
      children: (row.cells ?? []).map((c) => makeGridCell(state, node, c)),
    });
  }
  flush();
  return children;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

/**
 * Table handler. Called by the interpret-plugin dispatcher when
 * interpreter_strategy === 'handler' and handler_module === './handlers/table.js'.
 *
 * @param {object} _state    - mdast-util-to-hast state (unused — data formats
 *                             produce structured output directly without child
 *                             mdast conversion)
 * @param {object} node      - enscribeTag with tagname 'table'
 * @param {object} _vocab    - vocabulary entry (unused — handler builds the
 *                             full element directly)
 * @param {object} [options] - interpreter options; options.assetsDir is the
 *                             base directory for resolving src= paths
 * @returns {import('hast').Element} hast element
 */
export function tableHandler(state, node, _vocab, options) {
  const format = node.positional?.[0] ?? null;
  const id = node.id ?? null;
  const hasHeaders = readBoolKwarg(node, 'headers', null, null, true);

  // Properties for the outer <table> element.
  const tableProps = {};
  if (id) tableProps.id = id;
  if (node.classes?.length) tableProps.className = node.classes;

  // Extract caption / title child tags. The gate lifts `caption=` /
  // `title=` kwargs to <caption> / <title> children before this handler
  // runs (Phase 3 slice 3c). For the `<table format | data>` shape the
  // content is the OPAQUE data string, so the caption / title can only
  // arrive via lifted kwargs (the data-string content has no children
  // to extract). For the no-format raw-HTML escape-hatch path the same
  // applies — the body is raw HTML.
  const { captionHast, titleHast } = extractFrameableChildren(state, node);

  // #106: complex (HTML-layout) imported table — render the stamped grid
  // (spans / multi-row headers preserved), each cell's resolved inline converted
  // via the normal child pipeline. Checked before the no-format raw branch below:
  // an imported complex table is also format-less, but it carries `_htmlTable`.
  if (node._htmlTable) {
    return renderFrameable({
      kind: 'table',
      bodyHast: buildHtmlTableBodyHast(state, node, node._htmlTable),
      wrapperEl: 'table',
      wrapperProps: tableProps,
      captionHast,
      titleHast,
      computedNumber: node.computedNumber ?? null,
      scope: node._scope ?? null,
    });
  }

  // No format word → raw HTML pass-through (escape-hatch form).
  // Caption/title not rendered in this escape-hatch path (author wrote
  // raw HTML and controls the entire output). Preserves slice 2a's
  // behavior.
  if (!format) {
    const rawContent = typeof node.content === 'string' ? node.content.trim() : '';
    return {
      type: 'raw',
      value: `<table${id ? ` id="${id}"` : ''}>\n${rawContent}\n</table>`,
    };
  }

  // #21: opted-in cells. The table-cell-parse plugin parsed the data and the
  // opted-in cells already (so refs/cites in cells could resolve in the mdast
  // phase); render straight from the stamped structure. Literal-cell tables are
  // never stamped, so they fall through to the parse path below unchanged.
  if (node._parsedCells) {
    return renderFrameable({
      kind: 'table',
      bodyHast: buildTableBodyFromParsedCells(state, node, node._parsedCells),
      wrapperEl: 'table',
      wrapperProps: tableProps,
      captionHast,
      titleHast,
      computedNumber: node.computedNumber ?? null,
      scope: node._scope ?? null,
    });
  }

  // Load content: src= takes precedence over inline pipe content.
  let rawData;
  const srcPath = node.kwargs?.src ?? null;
  if (srcPath) {
    // #195: source-agnostic. A pre-loaded src (browser fetch / CLI async preload, on
    // file.data[ENSCRIBE_LOADED_SOURCES], threaded here via options.loadedSources) is
    // used first; otherwise a filesystem path is read synchronously (CLI / processSync).
    // Mirrors plugins/library-load.js.
    const loaded = options?.loadedSources ?? null;
    if (loaded && Object.prototype.hasOwnProperty.call(loaded, srcPath)) {
      const entry = loaded[srcPath];
      if (entry?.error != null) {
        return makeErrorTable(`cannot load "${srcPath}": ${entry.error}`, id);
      }
      rawData = typeof entry?.content === 'string' ? entry.content : '';
    } else {
      const assetsDir = options?.assetsDir ?? null;
      if (!assetsDir) {
        return makeErrorTable(
          `src="${srcPath}" was not pre-loaded and no assetsDir is set — a path-style src needs an async render (renderAsync / the CLI render command)`,
          id,
        );
      }
      try {
        rawData = readFileSync(join(assetsDir, srcPath), 'utf8');
      } catch (err) {
        return makeErrorTable(`cannot read file "${srcPath}": ${err.message}`, id);
      }
    }
  } else {
    rawData = typeof node.content === 'string' ? node.content : '';
  }

  // Parse data according to format (TABLE_PARSERS is the module-scope dispatch
  // table; its keys are the host's accept-set, exported as TABLE_FORMATS).
  const parserFn = TABLE_PARSERS[format];
  if (!parserFn) {
    return makeErrorTable(`unknown format "${format}"`, id);
  }

  let parsed;
  try {
    parsed = parserFn(rawData, { hasHeaders });
  } catch (err) {
    return makeErrorTable(err.message, id);
  }

  const bodyHast = buildTableBodyHast(parsed);

  return renderFrameable({
    kind: 'table',
    bodyHast,
    wrapperEl: 'table',
    wrapperProps: tableProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
  });
}

/**
 * Build the body hast children for a table from parsed {headers, rows}
 * data — the [thead?, tbody?] sequence that goes inside <table>
 * alongside <caption>.
 *
 * Used by `tableHandler` to build the table body inside the `<table>` wrapper.
 *
 * @param {{ headers: string[]|null, rows: any[][] }} parsed
 * @returns {import('hast').Element[]}
 */
export function buildTableBodyHast(parsed) {
  const children = [];
  if (parsed.headers) children.push(makeThead(parsed.headers));
  if (parsed.rows.length > 0) children.push(makeTbody(parsed.rows));
  return children;
}
