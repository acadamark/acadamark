// Table handler — renders <table format | data> tags.
//
// Dispatch order:
//   1. node.positional[0] determines the input format (csv, tsv, json, yaml, md).
//   2. node.content is the raw data string (never recursively-parsed because
//      DSL_REGISTRY maps 'table' to 'table', not 'default').
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
// This module also exports `parseCsv`, `parseTsv`, and the shared
// `renderParsedTable` helper for the standalone `<csv>` / `<tsv>` handlers
// (handlers/csv.js, handlers/tsv.js). Phase 2 slice 2a (2026-05-27) added
// those handlers; rather than duplicate the parsers and the
// headers/rows-to-hast machinery, the standalone handlers share table.js's
// implementation via these exports.

// Node built-ins for the server/build path. In the browser bundle these are dead
// code (browser defaults never call them); tsup aliases both the node: and bare
// forms to a throwing stub. See packages/enscribe/src/interpreter/tsup.config.js.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';

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
 * @param {string} line
 * @param {string} delimiter
 * @returns {string[]}
 */
function parseCsvLine(line, delimiter) {
  const cells = [];
  let pos = 0;
  while (pos <= line.length) {
    if (pos === line.length) {
      cells.push('');
      break;
    }
    if (line[pos] === '"') {
      // Quoted field
      pos++; // skip opening quote
      let cell = '';
      while (pos < line.length) {
        if (line[pos] === '"') {
          if (line[pos + 1] === '"') {
            // Escaped quote
            cell += '"';
            pos += 2;
          } else {
            pos++; // skip closing quote
            break;
          }
        } else {
          cell += line[pos++];
        }
      }
      cells.push(cell);
      // Skip delimiter if present
      if (line[pos] === delimiter) pos++;
    } else {
      // Unquoted field: read until delimiter
      const end = line.indexOf(delimiter, pos);
      if (end === -1) {
        cells.push(line.slice(pos).trim());
        break;
      } else {
        cells.push(line.slice(pos, end).trim());
        pos = end + 1;
      }
    }
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
// (lib/frameable.js). The handlers below build the table BODY (thead +
// tbody) via renderParsedTable and let renderFrameable produce the
// wrapped <table> with title/caption placement. The slice-3b
// makeCaption helper is gone — its job is renderFrameable's
// `buildCaptionEl`, called per kind.

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

  // Load content: src= takes precedence over inline pipe content.
  let rawData;
  const srcPath = node.kwargs?.src ?? null;
  if (srcPath) {
    const assetsDir = options?.assetsDir ?? null;
    if (!assetsDir) {
      return makeErrorTable(
        `src="${srcPath}" requires assetsDir option to be set`,
        id,
      );
    }
    try {
      rawData = readFileSync(join(assetsDir, srcPath), 'utf8');
    } catch (err) {
      return makeErrorTable(`cannot read file "${srcPath}": ${err.message}`, id);
    }
  } else {
    rawData = typeof node.content === 'string' ? node.content : '';
  }

  // Parse data according to format.
  const parsers = { csv: parseCsv, tsv: parseTsv, json: parseJson, yaml: parseYaml, md: parseMd };
  const parserFn = parsers[format];
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
 * Shared helper used by `tableHandler` and by the standalone `<csv>` /
 * `<tsv>` handlers (via the `renderParsedTable` wrapper below for
 * source-compat with slice 3b's signature).
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

/**
 * Backward-compat wrapper for the slice-3b `renderParsedTable` signature.
 *
 * Phase 3 slice 3c: csv.js and tsv.js no longer call this — they call
 * `buildTableBodyHast` + `renderFrameable` directly to get caption-as-
 * content support. This wrapper remains for any out-of-tree consumer
 * still on the slice-3b API; it constructs the table by delegating to
 * `renderFrameable` with a synthetic kwarg-derived caption (the old
 * captionText input becomes a single-text-node hast).
 *
 * @param {object} args
 * @param {{ headers: string[]|null, rows: any[][] }} args.parsed
 * @param {object} args.tableProps
 * @param {string|null} [args.captionText]
 * @param {number|null} [args.computedNumber]
 * @param {{chapter:number, section:number}|null} [args.scope] - node._scope
 *        for chapter-prefixed labels in books (slice B / RQ-BOOK-M4);
 *        defaults to null → bare number (article behavior).
 * @returns {import('hast').Element}
 */
export function renderParsedTable({ parsed, tableProps, captionText = null, computedNumber = null, scope = null }) {
  const bodyHast = buildTableBodyHast(parsed);
  const captionHast = captionText
    ? [{ type: 'text', value: String(captionText) }]
    : null;
  return renderFrameable({
    kind: 'table',
    bodyHast,
    wrapperEl: 'table',
    wrapperProps: tableProps,
    captionHast,
    titleHast: null,
    computedNumber,
    scope,
  });
}

/**
 * Shared renderer for the standalone `<csv>` / `<tsv>` handlers. The two
 * differ only in the parser used, the frameable `kind`, and the parse-error
 * label, so the whole body lives here; handlers/csv.js and handlers/tsv.js
 * are thin callers. (This module already owns the parsers and the
 * table-body machinery, so it is the natural home.)
 *
 * The parse-error placeholder is the caption-based form `<table><caption
 * class="table-parse-error">??label: msg??</caption></table>` — distinct
 * from the tbody-based `makeErrorTable` used by the multi-format `<table>`
 * handler, so it is built inline here rather than shared with that.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "csv" or "tsv"
 * @param {object} opts
 * @param {string} opts.kind  - frameable kind ('csv' | 'tsv')
 * @param {(text: string, o: {hasHeaders: boolean|null}) => {headers: string[]|null, rows: any[][]}} opts.parse
 * @param {string} opts.label - prefix shown in the parse-error placeholder ('csv' | 'tsv')
 * @returns {import('hast').Element}
 */
export function renderDelimitedTable(state, node, { kind, parse, label }) {
  const rawData = typeof node.content === 'string' ? node.content : '';
  const hasHeaders = readBoolKwarg(node, 'headers', null, null, true);
  const id = node.id ?? null;

  const tableProps = {};
  if (id) tableProps.id = id;
  if (node.classes?.length) tableProps.className = node.classes;

  // Extract <caption> / <title> children. For <csv>/<tsv> the content is
  // typically the opaque delimited string, but the gate lifts caption= /
  // title= kwargs to child tags first, so the lifted children sit in
  // node.content alongside the data; extractFrameableChildren handles both
  // the child-tag and lifted-from-kwarg paths uniformly.
  const { captionHast, titleHast } = extractFrameableChildren(state, node);

  let parsed;
  try {
    parsed = parse(rawData, { hasHeaders });
  } catch (err) {
    return {
      type: 'element',
      tagName: 'table',
      properties: tableProps,
      children: [
        {
          type: 'element',
          tagName: 'caption',
          properties: { className: ['table-parse-error'] },
          children: [{ type: 'text', value: `??${label}: ${err.message}??` }],
        },
      ],
    };
  }

  return renderFrameable({
    kind,
    bodyHast: buildTableBodyHast(parsed),
    wrapperEl: 'table',
    wrapperProps: tableProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
  });
}
