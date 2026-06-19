// Table-of-contents sidebar (Phase 8 Slice 1).
//
// Covers the output-neutral guarantee (no ToC → byte-identical), the generated
// nav + layout wrapper, stable section-id assignment, nesting, the 'auto'
// threshold, and the book (chapter) case.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

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

  // ── book reading interface (Slice C): chapters become left-rail entries (titles
  //    read through the <meta> wrapper), and the book renders as one scrolling
  //    document with the three-column chrome (not the old paging view) ───────────
  {
    const src = readFileSync(join(FIXTURES, 'document-44-cross-feature-monograph.emd'), 'utf8');
    assert.equal(render(src, { toc: false }), render(src), 'book toc:false byte-identical');
    const html = render(src, { toc: true });
    // The book left rail is the chapter rail (nav.enscribe-toc.enscribe-chapter-rail).
    const nav = (html.match(/<nav class="enscribe-toc enscribe-chapter-rail"[\s\S]*?<\/nav>/) || [''])[0];
    assert.ok(nav, 'book renders a chapter rail (nav.enscribe-toc.enscribe-chapter-rail)');
    assert.ok(/Foundations/.test(nav) && /Notation and Sources/.test(nav), 'chapter titles appear in the chapter rail');
    assert.ok(!/<a href="#[^"]*"><\/a>/.test(nav), 'no empty-title rail links');
    // Slice C: the three-column book reading-interface layout (one scrolling doc).
    assert.ok(/enscribe-layout--book/.test(html), 'book gets the reading-interface layout');
    assert.ok(!/class="chapter-hidden"/.test(html), 'no paging by default (book is one scrolling document)');
    assert.ok(!/enscribeParseError|enscribeTagError/.test(html), 'no error nodes');
    console.log('PASS: book → chapter rail entries, reading-interface layout, no paging');
  }

  // ── book reading interface (Slice C): the three-column chrome ────────────────
  // An inline book with two chapters, each with sub-sections, so the right "on this
  // page" rail and per-chapter prev/next are exercised deterministically.
  {
    const BOOK = `<meta type=book>
<title | Test Book>
</meta>

<config number-sections />

<chapter | One>
Intro.

## Alpha

a

## Beta

b

<chapter | Two>
Intro two.

## Gamma

c`;
    const html = render(BOOK, { toc: true });

    // Left chapter rail: chapters only (no section nesting), un-glued numbers.
    const rail = (html.match(/<nav class="enscribe-toc enscribe-chapter-rail"[\s\S]*?<\/nav>/) || [''])[0];
    assert.ok(/enscribe-toc-num">1<\/span>/.test(rail) && /enscribe-toc-title">One<\/span>/.test(rail),
      'chapter rail: number and title are SEPARATE spans (un-glued)');
    assert.ok(!/Alpha|Beta|Gamma/.test(rail), 'chapter rail lists chapters only (sections live in the right rail)');

    // Right "on this page" rail: per-chapter section groups keyed by chapter id.
    const right = (html.match(/<nav class="enscribe-onthispage"[\s\S]*?<\/nav>/) || [''])[0];
    assert.ok(right, 'right "on this page" rail is emitted');
    assert.ok(/data-chapter="/.test(right) && /Alpha/.test(right) && /Gamma/.test(right),
      'right rail groups the chapters\' sections (data-chapter keyed)');

    // Per-chapter prev/next links (static markup, reading order).
    assert.ok(/<nav class="enscribe-chapter-nav"[\s\S]*?enscribe-chapter-next[\s\S]*?Two[\s\S]*?<\/nav>/.test(html),
      'chapter One has a next → Two link at its foot');

    // Both highlighters are injected; scroll-spy drives the left, on-this-page the right.
    assert.ok(html.includes("nav.enscribe-toc'") && html.includes('nav.enscribe-onthispage'),
      'both the scroll-spy (left) and on-this-page (right) scripts are injected');

    // PARITY GUARD (mirrors the article scroll-spy guard): the runtime highlight
    // hooks are NEVER in the static markup — they are set by the scripts at runtime.
    const body = html.slice(html.indexOf('enscribe-layout--book'));
    const navMarkup = body.slice(0, body.indexOf('</main>') >= 0 ? body.indexOf('</main>') : body.length);
    assert.ok(!/aria-current|enscribe-toc-active|onthispage-chapter--current|onthispage--spied/.test(navMarkup),
      'no runtime highlight/visibility hooks in the static rail markup (interactivity stays post-render)');

    console.log('PASS: book reading interface — chapter rail, right rail, prev/next, dual scripts, static-clean');
  }

  console.log('All ToC tests passed.');
}
