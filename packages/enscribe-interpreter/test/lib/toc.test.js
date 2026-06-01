// Table-of-contents sidebar (Phase 8 Slice 1).
//
// Covers the output-neutral guarantee (no ToC → byte-identical), the generated
// nav + layout wrapper, stable section-id assignment, nesting, the 'auto'
// threshold, and the book (chapter) case.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildEnscribePipeline } from '../../src/index.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const render = (src, opts = {}) =>
  String(buildEnscribePipeline({ embedResources: false, ...opts }).processSync(src));

const ARTICLE = `<# #sec:intro | Introduction #>

Body one.

<## Data Collection ##>

Sub.

<# Results and Discussion #>

Done.

<# Conclusion #>

End.`;

export async function run() {
  // ── output-neutral: no ToC → byte-identical ─────────────────────────────────
  {
    const base = render(ARTICLE);
    assert.equal(render(ARTICLE, { toc: false }), base, 'toc:false is byte-identical to the default');
    assert.equal(render(ARTICLE, {}), base, 'no toc option is byte-identical');
    assert.ok(!/enscribe-toc|enscribe-layout/.test(base), 'no ToC markup leaks into a non-ToC render');
    console.log('PASS: toc off → byte-identical, no ToC markup');
  }

  // ── toc:true → nav, layout wrapper, ids ─────────────────────────────────────
  {
    const html = render(ARTICLE, { toc: true });
    assert.ok(/<nav class="enscribe-toc" aria-label="Table of contents">/.test(html), 'nav landmark with aria-label');
    assert.ok(/<div class="enscribe-layout enscribe-layout--toc">/.test(html), 'layout wrapper');
    assert.ok(/<main class="enscribe-body">/.test(html), 'body wrapped in <main>');
    assert.ok(/<details class="enscribe-toc-details" open>[\s\S]*<summary/.test(html), 'collapsible <details> with summary (no-JS toggle)');

    // authored id preserved; anchorless sections get slugified sec: ids
    assert.ok(/id="sec:intro"/.test(html), 'authored id preserved');
    for (const id of ['sec:data-collection', 'sec:results-and-discussion', 'sec:conclusion']) {
      assert.ok(html.includes(`id="${id}"`), `assigned id ${id} on the section`);
      assert.ok(html.includes(`href="#${id}"`), `ToC links to #${id}`);
    }
    // nesting: Data Collection (sub-section) nests under Introduction
    const flat = html.replace(/\n\s*/g, ' ');
    assert.ok(/Introduction<\/a>\s*<ul>[\s\S]*?Data Collection/.test(flat), 'sub-section nested under its section');
    console.log('PASS: toc:true → nav + layout + stable ids + nesting');
  }

  // ── id collision safety ─────────────────────────────────────────────────────
  {
    // two sections that slugify to the same base → second gets -2
    const html = render(`<# Methods #>\n\nA.\n\n<# Methods #>\n\nB.\n\n<# Results #>\n\nC.\n\n<# End #>\n\nD.`, { toc: true });
    assert.ok(/id="sec:methods"/.test(html) && /id="sec:methods-2"/.test(html), 'colliding slugs de-duplicate (-2)');
    console.log('PASS: id collision → -2 suffix');
  }

  // ── 'auto' threshold (show only past three top-level sections) ───────────────
  {
    // ARTICLE has 3 top-level sections (intro, results, conclusion) → auto hides
    assert.ok(!/enscribe-toc/.test(render(ARTICLE, { toc: 'auto' })), "'auto' hides at 3 top-level sections");
    const four = ARTICLE + `\n\n<# Appendix #>\n\nMore.`;
    assert.ok(/enscribe-toc/.test(render(four, { toc: 'auto' })), "'auto' shows past 3 top-level sections");
    console.log("PASS: toc:'auto' threshold");
  }

  // ── book: chapters become ToC entries (titles read through the <meta> wrapper) ─
  {
    const src = readFileSync(join(FIXTURES, 'document-44-cross-feature-monograph.emd'), 'utf8');
    assert.equal(render(src, { toc: false }), render(src), 'book toc:false byte-identical');
    const html = render(src, { toc: true });
    const nav = (html.match(/<nav class="enscribe-toc"[\s\S]*?<\/nav>/) || [''])[0];
    assert.ok(/Foundations/.test(nav) && /Notation and Sources/.test(nav), 'chapter titles appear in the ToC');
    assert.ok(!/<a href="#[^"]*"><\/a>/.test(nav), 'no empty-title ToC links');
    assert.ok(!/enscribeParseError|enscribeTagError/.test(html), 'no error nodes');
    console.log('PASS: book → chapter ToC entries, titles resolved');
  }

  console.log('All ToC tests passed.');
}
