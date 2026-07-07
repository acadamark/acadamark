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
import { prevNextParts, chapterNavArrows, chapterNavBar } from '../../src/interpreter/lib/toc.js';

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
    assert.ok(/<toc-num>1<\/toc-num>/.test(rail) && /<toc-title>One<\/toc-title>/.test(rail),
      'chapter rail: number and title are SEPARATE elements (<toc-num> + <toc-title>, un-glued)');
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

  // #293 — the persistent edge arrows read the SAME prev/next source as the bottom bar.
  {
    const parts = [
      { id: 'a', clean: 'Alpha', number: '1' },
      { id: 'b', clean: 'Beta', number: '2' },
      { id: 'c', clean: 'Gamma', number: '3' },
    ];
    const href = (p) => `${p.id}.html`;

    // prevNextParts — the single source: null at the ends, both in the middle.
    assert.deepEqual(prevNextParts(parts, 0), { prev: null, next: parts[1] }, 'first chapter: no prev');
    assert.deepEqual(prevNextParts(parts, 2), { prev: parts[1], next: null }, 'last chapter: no next');
    assert.deepEqual(prevNextParts(parts, 1), { prev: parts[0], next: parts[2] }, 'middle chapter: both');

    // chapterNavArrows — a middle chapter yields two arrow links, ‹ prev / › next, with rel + a
    // destination-naming label; the hrefs come from `chapterHref` (reused, not re-derived).
    const mid = chapterNavArrows(parts, 1, href);
    assert.equal(mid.tagName, 'nav', 'arrows are a <nav> landmark');
    assert.equal(mid.children.length, 2, 'middle chapter has both arrows');
    assert.equal(mid.children[0].properties.rel, 'prev');
    assert.equal(mid.children[0].properties.href, 'a.html', 'prev arrow → the previous chapter page');
    assert.equal(mid.children[1].properties.rel, 'next');
    assert.equal(mid.children[1].properties.href, 'c.html', 'next arrow → the next chapter page');
    // Each arrow carries a glyph span (aria-hidden) + a destination-title label span (shown in the
    // mobile foot rendering, hidden in the desktop gutter). Prev = [glyph, label]; next = [label, glyph].
    const [prevGlyph, prevLabel] = mid.children[0].children;
    const [nextLabel, nextGlyph] = mid.children[1].children;
    assert.equal(prevGlyph.children[0].value, '‹', 'prev glyph is ‹');
    assert.equal(nextGlyph.children[0].value, '›', 'next glyph is ›');
    assert.equal(prevGlyph.properties.ariaHidden, 'true', 'the glyph is aria-hidden (the label carries meaning)');
    assert.deepEqual(prevGlyph.properties.className, ['enscribe-chapter-arrow-glyph'], 'glyph span is class-tagged for styling');
    assert.deepEqual(prevLabel.properties.className, ['enscribe-chapter-arrow-label'], 'label span is class-tagged (shown at the mobile foot)');
    assert.equal(prevLabel.children[0].value, '1 Alpha', 'prev label shows the destination chapter title');
    assert.equal(nextLabel.children[0].value, '3 Gamma', 'next label shows the destination chapter title');
    assert.match(mid.children[0].properties.ariaLabel, /Previous chapter: 1 Alpha/, 'prev arrow names its destination for assistive tech');
    assert.match(mid.children[1].properties.ariaLabel, /Next chapter: 3 Gamma/, 'next arrow names its destination');

    // Ends omit the unavailable direction; a one-chapter book has no arrows at all.
    const first = chapterNavArrows(parts, 0, href);
    assert.equal(first.children.length, 1, 'first chapter: one arrow');
    assert.equal(first.children[0].properties.rel, 'next', 'first chapter: next arrow only');
    const last = chapterNavArrows(parts, 2, href);
    assert.equal(last.children.length, 1, 'last chapter: one arrow');
    assert.equal(last.children[0].properties.rel, 'prev', 'last chapter: prev arrow only');
    assert.equal(chapterNavArrows([parts[0]], 0, href), null, 'a one-chapter book has no arrows');

    // No second source of truth: the arrows and the bottom bar resolve to the SAME prev/next pages.
    const bar = chapterNavBar(parts, 1, href);
    assert.deepEqual(
      mid.children.map((a) => a.properties.href),
      bar.children.map((a) => a.properties.href),
      'the edge arrows and the bottom bar point to the same prev/next pages',
    );

    console.log('PASS: #293 chapter arrows — one prevNext source, ‹/› + rel + labels, ends omit, one-chapter null, targets match the bar');
  }

  console.log('All ToC tests passed.');
}
