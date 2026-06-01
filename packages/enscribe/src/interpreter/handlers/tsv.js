// TSV handler — renders `<tsv>` standalone tags.
//
// Mirrors handlers/csv.js with TSV parsing instead of CSV. See that
// file's header for the design and the slice 3c refactor rationale.
//
// Phase 2 slice 2a (2026-05-27) initial; Phase 3 slice 3c refactor to
// the unified renderFrameable shape.

import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { parseTsv, buildTableBodyHast } from './table.js';
import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';

/**
 * Handler for the `<tsv>` standalone tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "tsv"
 * @returns {import('hast').Element}
 */
export function tsvHandler(state, node) {
  const rawData = typeof node.content === 'string' ? node.content : '';
  const hasHeaders = readBoolKwarg(node, 'headers', null, null, true);
  const id = node.id ?? null;

  const tableProps = {};
  if (id) tableProps.id = id;
  if (node.classes?.length) tableProps.className = node.classes;

  const { captionHast, titleHast } = extractFrameableChildren(state, node);

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

  return renderFrameable({
    kind: 'tsv',
    bodyHast: buildTableBodyHast(parsed),
    wrapperEl: 'table',
    wrapperProps: tableProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
  });
}
