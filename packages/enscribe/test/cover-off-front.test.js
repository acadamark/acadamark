// #439 — cover=off must not orphan pre-first-chapter book content.
//
// Content authored BEFORE the first chapter is front-region content. With a cover (the default) it
// renders on the cover page and numbers flat ("Figure 1"). But `<config cover=false>` replaces the cover
// with a redirect stub — so before #439 the front content + its ids rendered on NO page, silently, an
// always-renders violation + a static/live parity gap. The fix (Ariel's option a): when cover=off, flow
// the front content into the FIRST chapter's page as LEAD content, numbering in chapter 1's scope
// ("Figure 1.1") — the ratified interstitial rule. This gate pins that, and that cover=on is unchanged.

import assert from 'node:assert';
import { VFile } from 'vfile';
import { buildEnscribePipeline, publishBookPages } from '../src/interpreter/index.js';
import { collectFrontLoose } from '../src/master-document/publish-pages.js';

const book = (cfg) =>
  `<meta type=book title="Cover-off Front" />\n\n<config number-sections${cfg} />\n\n` +
  `Front prose before any chapter.\n\n<fig #fig:front src=front.png | A front-region figure.>\n\n` +
  `<chapter | First>\n\nChapter one body.\n\n<fig #fig:one src=one.png | A chapter-one figure.>\n\n` +
  `<chapter | Second>\n\nChapter two body.\n`;

function build(cfg) {
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'book.emd', value: book(cfg) });
  const numbered = proc.runSync(proc.parse(book(cfg)), file);
  const bookEl = numbered.children.find((n) => n.type === 'enscribeTag' && n.tagname === 'book');
  const pages = publishBookPages({ numbered, file, proc, defaultCss: '/*c*/' });
  return { pages, frontLoose: collectFrontLoose(bookEl) };
}

// The <figcaption> text for a figure id, or '(absent)' if the figure isn't on the page.
const figCaption = (html, id) => {
  const m = (html || '').match(new RegExp(`<figure[^>]*id="${id}"[\\s\\S]*?<figcaption[\\s\\S]*?</figcaption>`));
  return m ? m[0].match(/<figcaption[\s\S]*?<\/figcaption>/)[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '(absent)';
};
const renderedSomewhere = (pages, re) => [...pages.values()].some((h) => re.test(h));

export function run() {
  // ── cover=off: front content flows to chapter 1's LEAD, numbering in chapter 1's scope ───────────
  {
    const { pages, frontLoose } = build(' cover=false');
    assert.ok(renderedSomewhere(pages, /A front-region figure/),
      'cover=off: the pre-first-chapter content is NOT dropped (it renders on some page) — the #439 fix');
    const first = pages.get('first.html');
    assert.match(figCaption(first, 'fig:front'), /Figure 1\.1\b/,
      'cover=off: the front figure renders on the FIRST chapter page and numbers in chapter 1\'s scope ("Figure 1.1")');
    assert.match(figCaption(first, 'fig:one'), /Figure 1\.2\b/,
      'cover=off: the chapter\'s own figure shifts to 1.2 (the front figure took 1.1) — one continuous chapter-1 scope');
    assert.equal(figCaption(pages.get('index.html'), 'fig:front'), '(absent)',
      'cover=off: index.html is the redirect stub — the front figure is not there (it moved to the chapter)');
    assert.equal(frontLoose.length, 0,
      'cover=off: the front loose content left book-front (moved to chapter 1) — no double-render surface remains');
  }

  // ── cover=on (default): UNCHANGED — front content renders on the cover, numbering flat ───────────
  {
    const { pages, frontLoose } = build('');
    assert.match(figCaption(pages.get('index.html'), 'fig:front'), /Figure 1\.\s/,
      'cover=on: the front figure renders on the COVER and numbers flat ("Figure 1") — unchanged');
    assert.equal(figCaption(pages.get('first.html'), 'fig:front'), '(absent)',
      'cover=on: the front figure is on the cover, not the first chapter — unchanged');
    assert.match(figCaption(pages.get('first.html'), 'fig:one'), /Figure 1\.1\b/,
      'cover=on: the chapter\'s own figure is "Figure 1.1" — unchanged');
    assert.ok(frontLoose.length > 0,
      'cover=on: the front content stays in book-front (rendered on the cover) — unchanged');
  }

  console.log('PASS: #439 — cover=off flows pre-chapter content to chapter 1 lead (figure 1.1), nothing dropped; cover=on unchanged');
}
