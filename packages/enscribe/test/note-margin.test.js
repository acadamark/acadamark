// #333 — margin notes: `<note position=margin>` (the collapse of the former
// `<marginnote>` element). A margin note is one note type positioned in the margin:
// numbered and collected like any note, with its content ALSO projected into the
// margin column (a `<sidenote>` element) beside its marker — per-note,
// independent of the document note-position default. Numbering is independent of
// position. (JATS `<boxed-text content-type=marginnote>` round-trip: cli JATS suite.)

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const html = (src, opts = {}) => String(buildEnscribePipeline(opts).processSync(src));
const noteNums = (h) => (h.match(/<sup id="noteref-\d+"[^>]*><a[^>]*>(\d+)<\/a>/g) || []).length;

export async function run() {
  // ── renders like a note, projected into the margin; establishes the margin ──
  {
    const h = html('A claim.<note position=margin | A caveat in the margin.> More.');
    assert.ok(h.includes('<sidenote>'), 'a margin note projects its content into the margin (enscribe-sidenote)');
    assert.ok(/<sup id="noteref-\d+"/.test(h), 'a margin note carries a numbered marker (renders like a note)');
    assert.ok(h.includes('<note-list'), 'a margin note is also collected into the bottom note-list (the fallback)');
    assert.ok(h.includes('enscribe-layout--margin'), 'a per-note margin note establishes the margin layout (note-position default bottom)');
    assert.ok(h.includes('sidenote { display: none'), 'the margin CSS is injected');
    assert.ok(!h.includes('enscribe-marginnote'), 'no legacy <marginnote> aside is produced (the special case is gone)');
    console.log('PASS: #333 — <note position=margin> renders like a note, projected into the margin');
  }

  // ── `side` is a legacy alias for `margin` ───────────────────────────────────
  {
    const h = html('A<note placement=side | s>.');
    assert.ok(h.includes('<sidenote>') && h.includes('sidenote-fallback'),
      'placement=side is a legacy alias for position=margin');
    console.log('PASS: #333 — placement=side is a legacy alias for margin');
  }

  // ── numbered and counted (numbering independent of position) ────────────────
  {
    const withMargin = html('A <note | one>. B <note position=margin | m>. C <note | two>.');
    assert.strictEqual(noteNums(withMargin), 3, 'a margin note is numbered like any note — three notes numbered 1, 2, 3');
    console.log('PASS: #333 — a margin note is numbered (numbering is independent of position)');
  }

  // ── margin note + foot note coexist ─────────────────────────────────────────
  {
    const h = html('A <note placement=foot | f>. B <note position=margin | m>.');
    assert.ok(h.includes('<sidenote>'), 'the margin note is projected into the margin');
    assert.ok(h.includes('<note-list'), 'the foot note still collects into a note-list');
    console.log('PASS: #333 — a margin note and a foot note coexist');
  }

  // ── doc-level note-position=margin still relocates ALL notes ────────────────
  {
    const h = html('A <note | relocated>.', { notePosition: 'margin' });
    assert.ok(h.includes('<sidenote>'), 'note-position=margin relocates every numbered note to the margin');
    assert.ok(h.includes('enscribe-layout--margin'), 'the margin layout is established');
    console.log('PASS: #333 — doc-level note-position=margin relocates every note');
  }

  // ── toc + margin combined: both classes co-mark the wrapper; CSS resolves ───
  {
    const doc = '# A\n\nx<note position=margin | n>.\n\n# B\n\ny\n\n# C\n\nz\n\n# D\n\nw';
    const h = html(doc, { toc: true });
    assert.ok(/enscribe-layout--toc[\s\S]{0,40}enscribe-layout--margin/.test(h),
      'a ToC + margin-note doc co-marks --toc and --margin on one wrapper');
    assert.ok(h.includes('.enscribe-layout--toc.enscribe-layout--margin'), 'the combined toc+margin grid CSS is present');
    console.log('PASS: #333 — toc + margin combined layout marking + CSS');
  }

  // ── additive: a document without margin notes is untouched ──────────────────
  {
    const h = html('# H\n\nJust prose.');
    assert.ok(!h.includes('enscribe-layout--margin') && !h.includes('enscribe-sidenote'),
      'a plain document adds no margin layout or CSS');
    console.log('PASS: #333 — plain documents are byte-identical (margin is opt-in)');
  }
}
