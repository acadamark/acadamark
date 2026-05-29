// CSV handler — renders `<csv>` standalone tags.
//
// Reads opaque CSV content from node.content (string), parses with the
// shared `parseCsv` from table.js, and renders the headers/rows + an
// optional caption/title through the unified `renderFrameable` helper.
//
// Phase 3 slice 3c (2026-05-28): refactored from the slice-3b
// `renderParsedTable` call (which built the table + caption inline) to
// a `buildTableBodyHast` + `renderFrameable` pair, matching the
// uniform frameable-handler shape. Caption / title arrive as <caption>
// / <title> child tags (lifted from `caption=` / `title=` kwargs at the
// normalize-to-canonical gate; or author-written directly).
//
// Phase 2 slice 2a (2026-05-27) initial implementation.

import { readBoolKwarg } from '../lib/bool-kwarg.js';
import { parseCsv, buildTableBodyHast } from './table.js';
import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';

/**
 * Handler for the `<csv>` standalone tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - acadamarkTag with tagname "csv"
 * @returns {import('hast').Element}
 */
export function csvHandler(state, node) {
  const rawData = typeof node.content === 'string' ? node.content : '';
  const hasHeaders = readBoolKwarg(node, 'headers', null, null, true);
  const id = node.id ?? null;

  const tableProps = {};
  if (id) tableProps.id = id;
  if (node.classes?.length) tableProps.className = node.classes;

  // Extract <caption> / <title> children. For <csv> the content is
  // typically the opaque CSV string, but the gate lifts caption= / title=
  // kwargs to child tags first, so the lifted children sit in
  // node.content alongside the data. extractFrameableChildren handles
  // both the child-tag and lifted-from-kwarg paths uniformly.
  const { captionHast, titleHast } = extractFrameableChildren(state, node);

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

  return renderFrameable({
    kind: 'csv',
    bodyHast: buildTableBodyHast(parsed),
    wrapperEl: 'table',
    wrapperProps: tableProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
  });
}
