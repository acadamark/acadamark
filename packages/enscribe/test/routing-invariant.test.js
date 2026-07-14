// #404 routing invariant — page ownership is a TOTAL function of assembled tree position, on BOTH the
// static separate-pages projection AND the live book router. The deciding case: a cross-reference to
// FRONT-region content (pre-first-part loose content, which renders on the cover) — historically it
// harvested `chapter: null` and every consumer silently gave up (a bare dead `#anchor`). Now it is
// owned by the cover on both surfaces. In-memory (assembled child map), no fixture files.

import assert from 'node:assert';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  publishBookPages,
  buildLiveBook,
  renderLiveCoverView,
  renderLiveChapterView,
  resolveRoute,
} from '../src/interpreter/index.js';
import { COVER_STEM } from '../src/master-document/live-book.js';

const MASTER =
  '<meta type=book title="Front-Ref Book" />\n\n' +
  'Preamble loose content, before any chapter.\n\n' +
  '<$$ #eqn:loose | E = mc^2 $$>\n\n' +
  '<chapter src=ch1.emd />\n<chapter src=ch2.emd />\n';
const CHILDREN = {
  'ch1.emd': '<meta type=book-part title="First Chapter" />\n\nSee <ref @eqn:loose> and <ref @fig:x>.\n',
  'ch2.emd': '<meta type=book-part title="Second Chapter" />\n\n<figure #fig:x src=x.png | X>\n',
};

function numberBook() {
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'master.emd' });
  const tree = assembleMasterDocument({
    source: MASTER, readFile: (p) => CHILDREN[p], resolve: (r) => r, parse: (s) => proc.parse(s),
  });
  return { proc, file, numbered: proc.runSync(tree, file) };
}

export function run() {
  // ── STATIC separate-pages: a front-region cross-ref resolves to the cover, not a dead #anchor ──
  {
    const { proc, file, numbered } = numberBook();
    const pages = publishBookPages({ numbered, file, proc, defaultCss: '' });
    const ch1 = [...pages.entries()].find(([k]) => k.includes('first'))?.[1] ?? '';
    assert.ok(/href="index\.html#eqn:loose"/.test(ch1),
      'static: the front-region ref resolves to the COVER (index.html#eqn:loose), not a bare #anchor');
    assert.ok(/href="second-chapter\.html#fig:x"/.test(ch1),
      'static: the cross-chapter ref still resolves to its chapter page (regression guard)');
    const cover = pages.get('index.html');
    assert.ok(/id="eqn:loose"/.test(cover), 'static: the front content (its anchor) really renders on the cover');
  }
  console.log('PASS: #404 static — front-region cross-ref → cover (ownership total, no dead anchor)');

  // ── LIVE book router: the same anchor is cover-owned; the cover view renders it; the route lands there ──
  {
    const { proc, file, numbered } = numberBook();
    const model = buildLiveBook({ numbered, file });
    assert.equal(model.idToStem.get('eqn:loose'), COVER_STEM,
      'live: a front-region anchor is owned by the cover (COVER_STEM) in idToStem — not route-less');
    assert.deepEqual(resolveRoute('', '#eqn:loose', model), { cover: true, anchor: 'eqn:loose' },
      'live: a bare cover-owned anchor routes to the cover and scrolls there (not a no-op/cover-less fallback)');
    const cover = renderLiveCoverView(model, { proc, file });
    assert.ok(/id="eqn:loose"/.test(cover), 'live: the cover view renders the front content (parity with the static cover)');
    // A chapter view's front-ref rewrites to the cover ROUTE (`?#anchor` for a standalone book), not a
    // bare dead `#eqn:loose` — so clicking it switches to the cover and scrolls to the front content.
    const ch1View = renderLiveChapterView(model, 0, { proc, file });
    assert.ok(/href="\?#eqn:loose"/.test(ch1View),
      'live: the chapter view rewrites the front-ref to the cover route (?#eqn:loose), not a bare dead anchor');
  }
  console.log('PASS: #404 live — front-region anchor is cover-owned; cover renders it; route lands on cover');

  // ── unknown chapter route stays a null resolveRoute contract (the browser caller renders not-found) ──
  {
    const { file, numbered } = numberBook();
    const model = buildLiveBook({ numbered, file });
    assert.equal(resolveRoute('no-such-chapter', '', model), null,
      'live: resolveRoute returns null for an unknown stem (the browser router turns null into the not-found view)');
  }
  console.log('PASS: #404 live — unknown chapter stem → resolveRoute null (not-found is the caller\'s render)');

  // ── COVER-OFF book: a pre-first-part anchor resolves to the FIRST CHAPTER, never a nonexistent cover ──
  // A cover-off book has no cover view (it lands on the first chapter; the static build redirects its
  // index there). #439: pre-first-part loose content is now flowed into the first chapter as lead
  // content (it has no front landing surface when cover=off), so `#eqn:loose` is genuinely chapter-1
  // content — resolveRoute owns it to the first chapter, never routing to a cover that doesn't exist.
  {
    const proc = buildEnscribePipeline({});
    const file = new VFile({ path: 'master.emd' });
    const src = MASTER.replace('<meta type=book title="Front-Ref Book" />',
      '<meta type=book title="Front-Ref Book" />\n<config cover=false />');
    const tree = assembleMasterDocument({ source: src, readFile: (p) => CHILDREN[p], resolve: (r) => r, parse: (s) => proc.parse(s) });
    const numbered = proc.runSync(tree, file);
    const model = buildLiveBook({ numbered, file });
    assert.equal(model.bookNav.cover, false, 'guard: the book is cover-off');
    const dest = resolveRoute('', '#eqn:loose', model);
    assert.equal(dest.cover, false,
      'live: a cover-off book routes a front-region anchor to a chapter, NOT a nonexistent cover (#404)');
    assert.equal(dest.index, 0, 'live: it degrades to the first chapter (mirroring the static cover-off redirect)');
  }
  console.log('PASS: #404 live — cover-off book: front-region anchor degrades to first chapter, not a nonexistent cover');
}

if (import.meta.url === `file://${process.argv[1]}`) run();
