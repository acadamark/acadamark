// CSV handler — renders `<csv>` standalone tags.
//
// The DSL_REGISTRY entry `['csv', 'csv']` marks `<csv>` content opaque.
// The parser passes the CSV source through as `node.content` (string).
// This handler parses the CSV with the same `parseCsv` `table.js` uses for
// the qualifying form `<table csv | data>`, then renders the headers/rows
// into a hast `<table>` via the shared `renderParsedTable` helper.
//
// Sharing parsing + rendering keeps `<csv>` and `<table csv>` producing
// equivalent output for the same data. The `<csv>` form is the natural
// authoring shape for an unstyled CSV table; `<table csv>` is the
// qualifying form that lets `<table>` take CSV (or TSV / JSON / etc.) as
// its data format.
//
// Phase 2 slice 2a (2026-05-27).

import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { parseCsv, renderParsedTable } from './table.js';

/**
 * Handler for the `<csv>` standalone tag.
 *
 * Reads the opaque content string, parses as CSV, renders as a hast
 * `<table>`. Accepts the `-headers` boolean kwarg to suppress the
 * header-row treatment (same convention `<table csv>` uses).
 *
 * @param {object} _state  - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node    - acadamarkTag with tagname "csv"
 * @returns {import('hast').Element}
 */
export function csvHandler(_state, node) {
  const rawData = typeof node.content === 'string' ? node.content : '';
  const hasHeaders = readBoolKwarg(node, 'headers', null, null, true);
  const id = node.id ?? null;
  const captionText = node.kwargs?.caption ?? null;
  const computedNumber = node.computedNumber ?? null;

  const tableProps = {};
  if (id) tableProps.id = id;
  if (node.classes?.length) tableProps.className = node.classes;

  let parsed;
  try {
    parsed = parseCsv(rawData, { hasHeaders });
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
          children: [{ type: 'text', value: `??csv: ${err.message}??` }],
        },
      ],
    };
  }

  return renderParsedTable({ parsed, tableProps, captionText, computedNumber });
}
