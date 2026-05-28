// TSV handler — renders `<tsv>` standalone tags.
//
// Mirrors handlers/csv.js with TSV parsing instead of CSV. See that file's
// header for the design rationale; the two handlers share parsing +
// rendering helpers from table.js.
//
// Phase 2 slice 2a (2026-05-27).

import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { parseTsv, renderParsedTable } from './table.js';

/**
 * Handler for the `<tsv>` standalone tag.
 *
 * Reads the opaque content string, parses as TSV (tab-separated values),
 * renders as a hast `<table>`. Accepts the `-headers` boolean kwarg to
 * suppress the header-row treatment.
 *
 * @param {object} _state  - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node    - acadamarkTag with tagname "tsv"
 * @returns {import('hast').Element}
 */
export function tsvHandler(_state, node) {
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
    parsed = parseTsv(rawData, { hasHeaders });
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
          children: [{ type: 'text', value: `??tsv: ${err.message}??` }],
        },
      ],
    };
  }

  return renderParsedTable({ parsed, tableProps, captionText, computedNumber });
}
