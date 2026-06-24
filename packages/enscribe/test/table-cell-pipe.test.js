// Pipe-form enscribe tags inside parsed table cells (#283).
//
// A `+parse-text` data table parses its cells as enscribe markup. An enscribe tag carries its own pipe
// (`<note | footnote>`, `<i | em>`, `<# title #>`), which collided with the Markdown table column
// separator: `parseMd` split the row mid-tag, so the tag was lost (escaped to literal `&#x3C;note`).
// `<cite @key>` / `<ref @id>` (no pipe) and the hand-escaped `\|` form already worked — so this was a
// PIPE-collision, not (as first suspected) a block-level categorization of `<note>`. The fix makes the
// cell splitter tag-aware: a `|` inside a tag span is tag content, not a column boundary.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const R = (src) => String(buildEnscribePipeline({}).processSync(src));
const tbl = (rows, head = '| H1 | H2 |\n|---|---|\n') => R(`<table md +parse-text>\n${head}${rows}\n</table>`);
const tds = (html) => (html.match(/<td[^>]*>[\s\S]*?<\/td>/g) || []).map((t) => t.replace(/<\/?td[^>]*>/g, ''));

export async function run() {
  // ── the #283 repro: a block <note> with a pipe is recognized in a parsed cell ───────────────────
  {
    const out = R('<table md +parse-text>\n| H |\n|---|\n| x<note | cell footnote> |\n</table>');
    assert.ok(!/&#x3C;note|&lt;note/.test(out), 'the cell <note> is NOT escaped to literal text');
    assert.equal(tds(out).length, 1, 'the tag-internal pipe does not split the cell (one cell, not two)');
    assert.ok(/noteref|data-note-id|enscribe-note/.test(out), 'a footnote marker is rendered in the cell');
    assert.ok(/note-1|enscribe-notes/.test(out), 'the cell note is COLLECTED (registered/numbered), like a body note');
    console.log('PASS: #283 — a pipe-form <note | …> is recognized and collected in a parsed cell');
  }

  // ── the collision was general (any pipe-form tag), not <note>-specific ──────────────────────────
  {
    assert.deepStrictEqual(tds(tbl('| x<i | em> | y |')), ['x<i>em</i>', 'y'],
      '<i | em> parses (italic) and the real column separator still splits the row');
    console.log('PASS: #283 — any pipe-form tag (e.g. <i | em>) survives; real column separators still split');
  }

  // ── back-compat: normal columns split, `\|` escapes, no-pipe tags unaffected ─────────────────────
  {
    assert.deepStrictEqual(tds(tbl('| a | b |')), ['a', 'b'], 'a normal two-column row still splits on |');
    assert.deepStrictEqual(tds(tbl('| p \\| q | r |')), ['p | q', 'r'], 'an escaped \\| is still a literal pipe in the cell');
    assert.equal(tds(tbl('| <note | n1> | <note | n2> |')).length, 2,
      'two pipe-form tags separated by a real | split into two cells (the boundary | is at tag depth 0)');
    // a no-pipe tag was never affected — confirm it still parses.
    assert.ok(/<cite|enscribe-cite|cite-error/.test(tbl('| x<cite @smith2024> | y |')),
      '<cite @key> (no pipe) still parses in a cell (it was never the bug)');
    console.log('PASS: #283 — back-compat: normal columns split, \\| escapes, no-pipe tags unaffected');
  }

  console.log('All table-cell pipe-form-tag (#283) checks passed.');
}
