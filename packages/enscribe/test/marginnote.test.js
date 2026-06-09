// #33 part 2 — <marginnote>: an unnumbered margin aside, authored in place.
//
// Distinct from a numbered <note>: it is never numbered, collected, or relocated.
// It renders <aside class="enscribe-marginnote"> where written and shares the
// margin column with sidenotes — the column is established whenever a marginnote
// is present, independent of note-position. (JATS <boxed-text> is covered by the
// cli JATS suite.)

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const html = (src, opts = {}) => String(buildEnscribePipeline(opts).processSync(src));
const noteNums = (h) => (h.match(/<sup id="noteref-\d+"[^>]*><a[^>]*>(\d+)<\/a>/g) || []).length;

export async function run() {
  // ── renders in place as an aside; establishes the margin (even at bottom) ───
  {
    const h = html('A claim.<marginnote | A caveat in the margin.> More.');
    assert.ok(h.includes('<aside class="enscribe-marginnote">A caveat in the margin.</aside>'), 'marginnote renders <aside class="enscribe-marginnote"> in place');
    assert.ok(h.includes('enscribe-layout--margin'), 'a marginnote establishes the margin layout (note-position default bottom)');
    assert.ok(h.includes('.enscribe-marginnote'), 'the margin CSS is injected');
    console.log('PASS: #33p2 — <marginnote> renders an in-place aside + establishes the margin');
  }

  // ── independent of note-position: bottom-mode notes stay at the bottom ──────
  {
    const h = html('A <note | numbered note>. B <marginnote | aside>.');
    assert.ok(h.includes('<note-list'), 'numbered notes still render at the bottom (note-position=bottom)');
    assert.ok(h.includes('class="enscribe-marginnote"'), 'the marginnote renders in the margin');
    console.log('PASS: #33p2 — marginnote + bottom notes: margin established, notes stay at the foot');
  }

  // ── uncounted: a marginnote does not change note numbering ──────────────────
  {
    const withMn = html('A <note | one>. B <marginnote | aside>. C <note | two>.');
    const without = html('A <note | one>. B. C <note | two>.');
    assert.strictEqual(noteNums(withMn), noteNums(without), 'note count is identical with vs without a marginnote');
    assert.strictEqual(noteNums(withMn), 2, 'the two numbered notes are still numbered 1, 2');
    console.log('PASS: #33p2 — marginnote is uncounted (numbering unchanged)');
  }

  // ── sidenote (margin mode) + marginnote: both in the margin column ──────────
  {
    const h = html('A <note | relocated>. B <marginnote | aside>.', { notePosition: 'margin' });
    assert.ok(h.includes('class="enscribe-sidenote"'), 'the numbered note is relocated to the margin (sidenote)');
    assert.ok(h.includes('class="enscribe-marginnote"'), 'the marginnote is in the margin');
    assert.ok(h.includes('enscribe-layout--margin'), 'both share one margin layout');
    console.log('PASS: #33p2 — sidenote + marginnote coexist in the margin column');
  }

  // ── mobile fallback CSS: marginnote is inline-block below the breakpoint ────
  {
    const h = html('X<marginnote | y>.');
    assert.ok(/\.enscribe-marginnote\s*\{[^}]*display:\s*inline-block/.test(h), 'marginnote falls back to inline-block below the breakpoint');
    assert.ok(/@media \(min-width: 900px\)[\s\S]*\.enscribe-marginnote\s*\{[\s\S]*float:\s*right/.test(h), 'marginnote floats into the margin above the breakpoint');
    console.log('PASS: #33p2 — marginnote mobile fallback (inline-block) + desktop float CSS');
  }

  // ── toc + margin combined: both classes co-mark the wrapper; CSS resolves ───
  {
    const doc = '# A\n\nx<marginnote | n>.\n\n# B\n\ny\n\n# C\n\nz\n\n# D\n\nw';
    const h = html(doc, { toc: true });
    assert.ok(/class="enscribe-layout enscribe-layout--toc enscribe-layout--margin"|enscribe-layout--toc[\s\S]{0,40}enscribe-layout--margin/.test(h), 'a ToC + marginnote doc co-marks --toc and --margin on one wrapper');
    assert.ok(h.includes('.enscribe-layout--toc.enscribe-layout--margin'), 'the combined toc+margin grid CSS is present');
    console.log('PASS: #33p2 — toc + margin combined layout marking + CSS');
  }

  // ── additive: a document without a marginnote (or margin notes) is untouched ─
  {
    const h = html('# H\n\nJust prose.');
    assert.ok(!h.includes('enscribe-layout--margin') && !h.includes('enscribe-marginnote'), 'a plain document adds no margin layout or CSS');
    console.log('PASS: #33p2 — plain documents are byte-identical (margin is opt-in)');
  }
}
