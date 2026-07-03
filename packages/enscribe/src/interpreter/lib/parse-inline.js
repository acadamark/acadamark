// Shared inline-cell parser (#21).
//
// Parses a raw string (a data-table cell that opted into markup) into canonical
// eHTML inline mdast, through the SAME parse + recursive-content + gate
// assembly the rest of the document uses (the front of the real pipeline, the
// same steps `liftToCanonicalMdast` opens with) — NOT a forked parser. The
// result is canonical inline `enscribeTag` / text nodes: `<a>` links, `<i>` /
// `<b>` emphasis, inline `<code>`, inline math, and the still-authorable
// `<ref>` / `<cite>` (resolved later by the resolution plugins, once the
// table-cell-parse plugin has made these nodes tree-resident).
//
// "Inline" = phrasing content only. A single-line cell parses to one paragraph;
// we unwrap it to its inline children (the standard `unwrapSingleParagraph`
// idiom). A cell that somehow parses to block content (a list, a heading) keeps
// those blocks — the same as GFM, which does not allow block content in a cell;
// the renderer simply converts whatever phrasing it gets.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkEnscribe from '../../parser/index.js';
import remarkRecursiveContent from '../../parser/recursive-content.js';
import { enscribeNormalizeToCanonical } from '../plugins/normalize-to-canonical.js';
import { unwrapSingleParagraph } from '../../core/paragraph-unwrap.js';

/**
 * Parse a cell string into canonical inline mdast nodes.
 *
 * @param {string} text - the raw cell value
 * @returns {Array<object>} canonical inline mdast (phrasing) nodes
 */
export function parseInlineCellToMdast(text) {
  const inner = unified().use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);
  const tree = unified()
    .use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm)
    .parse(text);
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    .runSync(tree);
  return unwrapSingleParagraph(tree.children ?? []);
}
