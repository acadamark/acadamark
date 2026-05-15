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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { readBoolKwarg } from '../lib/bool-kwarg.js';

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
function parseCsv(text, { hasHeaders }) {
  const allRows = parseDelimited(text, ',');
  return splitHeadersRows(allRows, hasHeaders);
}

/**
 * Parse TSV text into {headers, rows}.
 * Splits on tab. Strips non-tab leading/trailing whitespace from cells.
 *
 * @param {string} text
 * @param {object} opts
 * @returns {{ headers: string[]|null, rows: string[][] }}
 */
function parseTsv(text, { hasHeaders }) {
  const lines = text.trim().split('\n').filter(l => l.trim() !== '');
  const allRows = lines.map(line =>
    line.split('\t').map(cell => cell.trim()),
  );
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
    // Remove leading and trailing `|`, then split
    const inner = line.replace(/^\|/, '').replace(/\|$/, '');
    return inner.split('|').map(cell => cell.trim());
  });

  return splitHeadersRows(allRows, hasHeaders);
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a delimiter-separated text into rows of cells.
 * Handles RFC 4180 quoting for CSV (delimiter = ',').
 * TSV is handled separately (simpler split).
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

/**
 * Build a <caption> element. When computedNumber is not null, prepend a
 * "Table N." label span before the caption text.
 *
 * @param {string} captionText
 * @param {number|null} computedNumber
 * @returns {import('hast').Element}
 */
function makeCaption(captionText, computedNumber) {
  const children = [];
  if (computedNumber != null) {
    children.push({
      type: 'element',
      tagName: 'span',
      properties: { className: ['table-label'] },
      children: [makeTextNode(`Table ${computedNumber}.`)],
    });
    children.push(makeTextNode(' '));
  }
  if (captionText) {
    children.push(makeTextNode(captionText));
  }
  return {
    type: 'element',
    tagName: 'caption',
    properties: {},
    children,
  };
}

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
 * @param {object} node      - acadamarkTag with tagname 'table'
 * @param {object} _vocab    - vocabulary entry (unused — handler builds the
 *                             full element directly)
 * @param {object} [options] - interpreter options; options.assetsDir is the
 *                             base directory for resolving src= paths
 * @returns {import('hast').Element} hast element
 */
export function tableHandler(_state, node, _vocab, options) {
  const format = node.positional?.[0] ?? null;
  const id = node.id ?? null;
  const captionText = node.kwargs?.caption ?? null;
  const computedNumber = node.computedNumber ?? null;
  const hasHeaders = readBoolKwarg(node, 'headers', null, null, true);

  // Properties for the outer <table> element.
  const tableProps = {};
  if (id) tableProps.id = id;
  if (node.classes?.length) tableProps.className = node.classes;

  // No format word → raw HTML pass-through (escape-hatch form).
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

  // Build the table element.
  const tableChildren = [];

  if (captionText !== null || computedNumber !== null) {
    tableChildren.push(makeCaption(captionText, computedNumber));
  }

  if (parsed.headers) {
    tableChildren.push(makeThead(parsed.headers));
  }

  if (parsed.rows.length > 0) {
    tableChildren.push(makeTbody(parsed.rows));
  }

  return {
    type: 'element',
    tagName: 'table',
    properties: tableProps,
    children: tableChildren,
  };
}
