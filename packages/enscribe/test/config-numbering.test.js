// Section numbering — the sibling half of #218 (notes/specs/toc-and-numbering.md).
//
// Numbering is config-driven (`<config number-sections …>`), stamped in the shared `runSync`
// (numberSections), so the static build and the live render number identically. This gate covers:
// hierarchical numbers (1 / 1.1 / 1.1.1), `number-depth` (the deepest numbered level), `-numbered`
// (outside the sequence — no number AND no counter advance), independence from `toc-depth`, the
// composition with the ToC listing (numbers show un-glued), default-off, and static≡live parity.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { render } from '../src/interpreter/browser.js';

const BROWSER_DEFAULTS = { embedResources: false, hoverPreviewMode: 'link', dslMode: 'live-link' };
const staticRender = (src) => String(buildEnscribePipeline(BROWSER_DEFAULTS).processSync(src));
const liveRender = (src) => render(src); // resolves over BROWSER_DEFAULTS internally

const META = '<meta type=article>\n<title | T>\n</meta>\n\n';
// Three levels + a sibling, for depth + sequence checks.
const LEVELS = [
  '<section | Alpha>', '', 'a.', '',
  '<sub-section | Beta>', '', 'b.', '',
  '<sub-sub-section | Gamma>', '', 'g.', '',
  '<section | Delta>', '', 'd.',
].join('\n');

const bodyNav = (h) => (h.match(/<nav class="enscribe-contents"[\s\S]*?<\/nav>/) || [''])[0];

// The stamped number on the `<tag-title>` whose text contains `titleText`: the contents of its
// `section-number` span, or null when the heading carries no number, or 'NO-TITLE' if not found.
function numFor(h, tag, titleText) {
  const re = new RegExp('<' + tag + '-title>([\\s\\S]*?)</' + tag + '-title>', 'g');
  for (const m of h.matchAll(re)) {
    const inner = m[1];
    const textOnly = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (textOnly.includes(titleText)) {
      const num = inner.match(/<section-number>([^<]*)</);
      return num ? num[1] : null;
    }
  }
  return 'NO-TITLE';
}

export async function run() {
  // ── Gate 1: number-sections stamps hierarchical numbers (1 / 1.1 / 1.1.1 / 2) ─────────────────
  {
    const h = staticRender(META + '<config number-sections=true />\n\n' + LEVELS);
    assert.strictEqual(numFor(h, 'section', 'Alpha'), '1');
    assert.strictEqual(numFor(h, 'sub-section', 'Beta'), '1.1');
    assert.strictEqual(numFor(h, 'sub-sub-section', 'Gamma'), '1.1.1');
    assert.strictEqual(numFor(h, 'section', 'Delta'), '2');
    console.log('PASS: #218 — number-sections stamps hierarchical 1 / 1.1 / 1.1.1 / 2');
  }

  // ── Gate 2: number-depth bounds the numbered levels (number-depth=2 → no level-3 number) ───────
  {
    const h = staticRender(META + '<config number-sections=true number-depth=2 />\n\n' + LEVELS);
    assert.strictEqual(numFor(h, 'section', 'Alpha'), '1');
    assert.strictEqual(numFor(h, 'sub-section', 'Beta'), '1.1');
    assert.strictEqual(numFor(h, 'sub-sub-section', 'Gamma'), null, 'level-3 heading is past number-depth=2 → no number');
    console.log('PASS: #218 — number-depth=2 numbers only levels 1-2');
  }

  // ── Gate 3: -numbered — no number AND the counter does not advance ───────────────────────────
  {
    const UN = META + '<config number-sections=true />\n\n' +
      '<section | First>\n\nx.\n\n<section -numbered | Skip>\n\ny.\n\n<section | Third>\n\nz.';
    const h = staticRender(UN);
    assert.strictEqual(numFor(h, 'section', 'First'), '1');
    assert.strictEqual(numFor(h, 'section', 'Skip'), null, '-numbered heading carries no number');
    assert.strictEqual(numFor(h, 'section', 'Third'), '2',
      'the next numbered sibling continues unbroken — the -numbered heading did not advance the counter');
    console.log('PASS: #218 — -numbered: no number, no counter advance (next sibling continues)');
  }

  // ── Gate 4: number-depth and toc-depth are INDEPENDENT (both directions) ───────────────────────
  {
    // numbered shallow (2), listed deep (3): Gamma is unnumbered but still listed.
    const a = staticRender(META + '<config number-sections=true number-depth=2 toc=true toc-depth=3 toc-location=body />\n\n' + LEVELS);
    assert.strictEqual(numFor(a, 'sub-sub-section', 'Gamma'), null, 'number-depth=2 → Gamma unnumbered');
    assert.ok(bodyNav(a).includes('Gamma'), 'toc-depth=3 → Gamma IS listed (independent of number-depth)');

    // numbered deep (3), listed shallow (2): Gamma is numbered but not listed.
    const b = staticRender(META + '<config number-sections=true number-depth=3 toc=true toc-depth=2 toc-location=body />\n\n' + LEVELS);
    assert.strictEqual(numFor(b, 'sub-sub-section', 'Gamma'), '1.1.1', 'number-depth=3 → Gamma numbered 1.1.1');
    assert.ok(!bodyNav(b).includes('Gamma'), 'toc-depth=2 → Gamma NOT listed (independent of number-depth)');
    console.log('PASS: #218 — number-depth and toc-depth act independently (both directions)');
  }

  // ── Gate 5: composition — numbered headings show their numbers in the listing (un-glued) ───────
  {
    const nav = bodyNav(staticRender(META + '<config number-sections=true toc=true toc-location=body />\n\n' + LEVELS));
    assert.ok(/<toc-num>1<\/toc-num>/.test(nav) && /<toc-title>Alpha<\/toc-title>/.test(nav),
      'a numbered section lists its number + title in separate spans (un-glued "1 Alpha")');
    assert.ok(/<toc-num>1.1<\/toc-num>/.test(nav), 'nested numbers compose too (1.1)');
    console.log('PASS: #218 — numbered headings show their numbers in the contents listing (composition)');
  }

  // ── Gate 6: default OFF for articles — no numbers, additive ────────────────────────────────────
  {
    const h = staticRender(META + LEVELS);
    assert.ok(!/<section-number>/.test(h), 'no number-sections → no numbers (article default off)');
    const off = staticRender(META + '<config number-sections=false />\n\n' + LEVELS);
    assert.ok(!/<section-number>/.test(off), 'number-sections=false → no numbers');
    console.log('PASS: #218 — numbering is default-off for articles (additive)');
  }

  // ── Gate 7 (load-bearing): the stamp runs in the shared runSync → static ≡ live ────────────────
  {
    for (const cfg of [
      '<config number-sections=true />',
      '<config number-sections=true number-depth=2 toc=true toc-location=right />',
      '<config number-sections=true />\n\n<section | First>\n\nx.\n\n<section -numbered | Skip>\n\ny.\n\n<section | Third>\n\nz.',
    ]) {
      const src = cfg.includes('section') ? META + cfg : META + cfg + '\n\n' + LEVELS;
      assert.strictEqual(staticRender(src), liveRender(src),
        `static ≡ live numbering from the same config (${cfg.split('\n')[0]})`);
    }
    console.log('PASS: #218 — numbering runs in the shared runSync; static and live number identically');
  }

  console.log('All section-numbering (#218) checks passed.');
}
