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
 *  is `1-counting-elephants` — a body chapter with sub-sections. */
function chrome(configLine = '') {
  const s = buildBook(configLine);
  const pages = publishBookPages({ numbered: s.numbered, file: s.file, proc: s.proc, defaultCss: DEFAULT_CSS });
  const l = buildBook(configLine);
  const model = buildLiveBook({ numbered: l.numbered, file: l.file });
  const chapterView = renderLiveChapterView(model, 1, { proc: l.proc, file: l.file });
  return { pages, staticPage: pages.get('1-counting-elephants.html'), chapterView, model };
}

// Element open-tag markers — NOT bare class strings, which also appear in the inlined
// default.css selectors (e.g. `.enscribe-chapter-rail`) and the chrome JS.
const RAIL = '<nav class="enscribe-toc enscribe-chapter-rail"';
const PREV_NEXT = '<nav class="enscribe-chapter-nav"';
const BACK_TO_TOP_BTN = '<button type="button" class="enscribe-back-to-top"';
const BACK_TO_TOP_RULE = '.enscribe-back-to-top--visible';   // a distinctive injected-CSS rule
const RAIL_SECTIONS = '<ul class="enscribe-rail-sections"';

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
    console.log('PASS: book-nav defaults — full chrome present, both paths');
  }

  // ── chapter-nav=false: the rail is gone in both paths ─────────────────────────────
  {
    const { staticPage, chapterView } = chrome('<config chapter-nav=false />');
    assert.ok(!staticPage.includes(RAIL), 'chapter-nav=false: static rail gone');
    assert.ok(!chapterView.includes(RAIL), 'chapter-nav=false: live rail gone');
    console.log('PASS: chapter-nav=false removes the chapter rail (static + live)');
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
}
