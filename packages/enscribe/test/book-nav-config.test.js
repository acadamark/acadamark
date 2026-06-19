// Book navigation config (#221): the <config> toggles drive the chrome, and the static
// separate-pages build and the live render gate it IDENTICALLY (book-only, default ON for
// books except back-to-top). Defaults reproducing the pre-#221 chrome is proven byte-for-
// byte by separate-pages-parity / live-book-parity / render-chapter-parity; THIS suite
// asserts each toggle actually changes the rendered chrome, in BOTH paths (so the same
// <config> drives both — the #218/#207 static≡live discipline applied to book nav).

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  publishBookPages,
  buildLiveBook,
  renderLiveChapterView,
  renderLiveCoverView,
  resolveHash,
} from '../src/interpreter/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const BOOK_DIR = join(FIXTURES_DIR, 'master-book');
const DEFAULT_CSS = readFileSync(join(__dirname, '..', 'src', 'interpreter', 'assets', 'default.css'), 'utf8');
const MASTER = readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8');

/** Assemble + number the master-book with an optional `<config …/>` injected after </meta>. */
function buildBook(configLine) {
  const proc = buildEnscribePipeline({ assetsDir: join(FIXTURES_DIR, 'assets') });
  const file = new VFile({ path: 'master-book.emd' });
  const source = configLine ? MASTER.replace('</meta>', `</meta>\n\n${configLine}`) : MASTER;
  const tree = assembleMasterDocument({
    source,
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
  });
  return { proc, file, numbered: proc.runSync(tree, file) };
}

/** The static body-chapter page + index, and the live body-chapter view + model, for a
 *  given config. Static and live get independent numbered trees (publishBookPages and
 *  buildLiveBook each assign ids), matching how the two real flows run. Chapter 1 (index 1)
 *  is `counting-elephants` — a body chapter with sub-sections. */
function chrome(configLine = '') {
  const s = buildBook(configLine);
  const pages = publishBookPages({ numbered: s.numbered, file: s.file, proc: s.proc, defaultCss: DEFAULT_CSS });
  const l = buildBook(configLine);
  const model = buildLiveBook({ numbered: l.numbered, file: l.file });
  const chapterView = renderLiveChapterView(model, 1, { proc: l.proc, file: l.file });
  return { pages, staticPage: pages.get('counting-elephants.html'), chapterView, model };
}

// Element open-tag markers — NOT bare class strings, which also appear in the inlined
// default.css selectors (e.g. `.enscribe-chapter-rail`) and the chrome JS.
const RAIL = '<nav class="enscribe-toc enscribe-chapter-rail"';
const PREV_NEXT = '<nav class="enscribe-chapter-nav"';
const BACK_TO_TOP_BTN = '<button type="button" class="enscribe-back-to-top"';
const BACK_TO_TOP_RULE = '.enscribe-back-to-top--visible';   // a distinctive injected-CSS rule
const RAIL_SECTIONS = '<ul class="enscribe-rail-sections"';
const ON_THIS_PAGE = '<nav class="enscribe-onthispage"';   // #248: the per-chapter on-this-page rail

export async function run() {
  // ── defaults: the full chrome, both paths (the byte-identical baseline) ───────────
  {
    const { staticPage, chapterView, pages, model } = chrome();
    assert.ok(staticPage.includes(RAIL), 'default: static chapter rail present');
    assert.ok(chapterView.includes(RAIL), 'default: live chapter rail present');
    assert.ok(staticPage.includes(PREV_NEXT), 'default: static prev/next present');
    assert.ok(chapterView.includes(PREV_NEXT), 'default: live prev/next present');
    assert.ok(!pages.get('index.html').includes('http-equiv="refresh"'), 'default: index.html is a real cover');
    assert.equal(resolveHash('', model).cover, true, 'default: live empty hash → cover');
    assert.ok(!staticPage.includes(BACK_TO_TOP_BTN), 'default: no back-to-top control');
    assert.ok(!staticPage.includes(RAIL_SECTIONS), 'default: rail is chapters-only (depth 1)');
    assert.ok(staticPage.includes(ON_THIS_PAGE), 'default: static on-this-page rail present');
    assert.ok(chapterView.includes(ON_THIS_PAGE), 'default: live on-this-page rail present');
    console.log('PASS: book-nav defaults — full chrome present, both paths');
  }

  // ── chapter-nav=false: the rail is gone in both paths ─────────────────────────────
  {
    const { staticPage, chapterView } = chrome('<config chapter-nav=false />');
    assert.ok(!staticPage.includes(RAIL), 'chapter-nav=false: static rail gone');
    assert.ok(!chapterView.includes(RAIL), 'chapter-nav=false: live rail gone');
    console.log('PASS: chapter-nav=false removes the chapter rail (static + live)');
  }

  // ── on-this-page=false: the on-this-page rail is gone in both scaffold paths; the
  //    chapter rail is unaffected (independent toggles) — #248 ───────────────────────
  {
    const { staticPage, chapterView } = chrome('<config on-this-page=false />');
    assert.ok(!staticPage.includes(ON_THIS_PAGE), 'on-this-page=false: static rail gone');
    assert.ok(!chapterView.includes(ON_THIS_PAGE), 'on-this-page=false: live rail gone');
    assert.ok(staticPage.includes(RAIL), 'on-this-page=false: chapter rail still present (independent toggle)');
    console.log('PASS: on-this-page=false removes the on-this-page rail (static + live); chapter rail unaffected');
  }

  // ── single-scroll book interface (applyBookToc, the compiler `toc` path): on-this-page
  //    gates the 3rd column, collapsing 3-col → the existing 2-col layout — #248. (The
  //    blocks above cover the separate-pages + live paths; this covers the third shape.) ─
  {
    const BOOK = [
      '<meta type=book>', '<title | Field Guide>', '</meta>', '',
      '<chapter #c1 | One>', '', 'Body.', '', '<# #s1 | Alpha #>', '', 'a', '',
      '<chapter #c2 | Two>', '', 'Body.', '', '<# #s2 | Beta #>', '', 'b', '',
      '<chapter #c3 | Three>', '', 'Body.', '', '<# #s3 | Gamma #>', '', 'c', '',
      '<chapter #c4 | Four>', '', 'Body.', '', '<# #s4 | Delta #>', '', 'd',
    ].join('\n');
    const THREE_COL = 'enscribe-layout--book enscribe-layout--book-3col"';
    const render = (src) => String(buildEnscribePipeline({ embedResources: false, toc: true }).processSync(src));
    const on = render(BOOK);
    assert.ok(on.includes(ON_THIS_PAGE), 'single-scroll default: on-this-page rail present');
    assert.ok(on.includes(THREE_COL), 'single-scroll default: 3-col book layout');
    const off = render(BOOK.replace('</meta>', '</meta>\n\n<config on-this-page=false />'));
    assert.ok(!off.includes(ON_THIS_PAGE), 'single-scroll on-this-page=false: rail gone');
    assert.ok(!off.includes(THREE_COL), 'single-scroll on-this-page=false: not 3-col');
    assert.ok(off.includes('enscribe-layout--book"'), 'single-scroll on-this-page=false: dropped to the existing 2-col --book layout');
    console.log('PASS: single-scroll applyBookToc — on-this-page gates the 3rd column (3-col → 2-col)');
  }

  // ── page-navigation=false: prev/next gone, rail untouched ─────────────────────────
  {
    const { staticPage, chapterView } = chrome('<config page-navigation=false />');
    assert.ok(!staticPage.includes(PREV_NEXT), 'page-navigation=false: static prev/next gone');
    assert.ok(!chapterView.includes(PREV_NEXT), 'page-navigation=false: live prev/next gone');
    assert.ok(staticPage.includes(RAIL), 'page-navigation=false: rail still present');
    console.log('PASS: page-navigation=false removes prev/next (rail unaffected)');
  }

  // ── cover=false: static index redirects; live empty hash → first chapter ──────────
  {
    const { pages, model } = chrome('<config cover=false />');
    const index = pages.get('index.html');
    assert.ok(index.includes('http-equiv="refresh"'), 'cover=false: static index.html is a redirect');
    assert.ok(/url=[^"]*\.html/.test(index), 'cover=false: the redirect targets the first chapter page');
    const dest = resolveHash('', model);
    assert.ok(dest.cover === false && dest.index === 0, 'cover=false: live empty hash → first chapter');
    console.log('PASS: cover=false lands on the first chapter (static redirect + live route)');
  }

  // ── back-to-top: control + CSS in static; control in the live view ────────────────
  {
    const { staticPage, chapterView } = chrome('<config back-to-top />');
    assert.ok(staticPage.includes(BACK_TO_TOP_BTN), 'back-to-top: static control present');
    assert.ok(staticPage.includes(BACK_TO_TOP_RULE), 'back-to-top: static CSS injected');
    assert.ok(chapterView.includes(BACK_TO_TOP_BTN), 'back-to-top: live control present in the view');
    console.log('PASS: back-to-top adds the scroll-to-top control (static CSS+control, live control)');
  }

  // ── chapter-nav-depth=2: the rail nests sections under chapters, both paths ────────
  {
    const { staticPage, chapterView } = chrome('<config chapter-nav-depth=2 />');
    assert.ok(staticPage.includes(RAIL_SECTIONS), 'depth=2: static rail nests sections');
    assert.ok(chapterView.includes(RAIL_SECTIONS), 'depth=2: live rail nests sections');
    console.log('PASS: chapter-nav-depth=2 nests sections under chapters in the rail');
  }

  // ── static ≡ live: the same <config> drives an identical rail (target hrefs aside) ─
  {
    const { staticPage, chapterView } = chrome('<config chapter-nav-depth=2 />');
    const railOf = (html) => {
      const m = html.match(/<nav class="enscribe-toc enscribe-chapter-rail"[\s\S]*?<\/nav>/);
      return m ? m[0].replace(/href="[^"]*"/g, 'href="·"') : null;
    };
    const sRail = railOf(staticPage);
    const lRail = railOf(chapterView);
    assert.ok(sRail && lRail, 'both paths emit a chapter rail');
    assert.equal(sRail, lRail, 'static ≡ live: the chapter rail is byte-identical once target hrefs are normalised');
    console.log('PASS: static ≡ live — one <config> drives an identical rail (hrefs aside)');
  }

  // ── #226: `<config toc>` renders a whole-book contents OVERVIEW on the cover, in BOTH the
  //    separate-pages cover and the live cover view (the chapter rail is the book's sidebar
  //    ToC; this is the landing index). No `<config toc>` ⇒ no overview (byte-identical cover). ─
  {
    const CONTENTS = '<nav class="enscribe-contents"';

    // default book (no <config toc>): neither cover has the overview.
    const plain = chrome();
    assert.ok(!plain.pages.get('index.html').includes(CONTENTS), 'no <config toc>: static cover has no overview');
    assert.ok(!renderLiveCoverView(plain.model).includes(CONTENTS), 'no <config toc>: live cover has no overview');

    // <config toc>: the overview renders on BOTH covers.
    const s = buildBook('<config toc />');
    const staticCover = publishBookPages({ numbered: s.numbered, file: s.file, proc: s.proc, defaultCss: DEFAULT_CSS }).get('index.html');
    const l = buildBook('<config toc />');
    const liveCover = renderLiveCoverView(buildLiveBook({ numbered: l.numbered, file: l.file }));
    assert.ok(staticCover.includes(CONTENTS), '<config toc>: static cover renders the contents overview');
    assert.ok(liveCover.includes(CONTENTS), '<config toc>: live cover renders the contents overview');
    // cross-shape hrefs: static cross-page (`slug.html`, `slug.html#id`), live route (`#stem`).
    assert.ok(/href="counting-elephants\.html"/.test(staticCover), 'static overview: chapter href is the page URL');
    assert.ok(/href="counting-elephants\.html#/.test(staticCover), 'static overview: section href is page#anchor');
    assert.ok(/href="#counting-elephants"/.test(liveCover), 'live overview: chapter href is the #stem route');
    // static ≡ live: the same listing, modulo href form (proves both shapes build one overview).
    const listingOf = (html) => {
      const m = html.match(/<nav class="enscribe-contents"[\s\S]*?<\/nav>/);
      return m ? m[0].replace(/href="[^"]*"/g, 'href="·"') : null;
    };
    assert.ok(listingOf(staticCover) && listingOf(liveCover), 'both covers emit the overview');
    assert.equal(listingOf(staticCover), listingOf(liveCover), 'static ≡ live: the cover overview is byte-identical once hrefs are normalised');
    console.log('PASS: #226 — <config toc> renders the whole-book contents overview on the cover (static + live, parity)');
  }

  // ── #226: `toc-location=left|right` on a book → a located non-fatal diagnostic (the rail is
  //    the book's sidebar ToC) and the overview still renders on the cover (always-renders). ──
  {
    const CONTENTS = '<nav class="enscribe-contents"';
    const s = buildBook('<config toc toc-location=left />');
    const cover = publishBookPages({ numbered: s.numbered, file: s.file, proc: s.proc, defaultCss: DEFAULT_CSS }).get('index.html');
    assert.ok(cover.includes(CONTENTS), 'toc-location=left: the overview still renders on the cover');
    assert.ok(s.file.messages.some((m) => m.source === 'book-navigation' && m.ruleId === 'toc-location-on-book'),
      'toc-location=left on a book: a located diagnostic is emitted');
    console.log('PASS: #226 — toc-location=left on a book emits a located diagnostic and renders on the cover');
  }
}
