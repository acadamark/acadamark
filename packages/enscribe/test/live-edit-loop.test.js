// Edit loop — incremental rebuild (the #203 payoff; live track).
//
// The epic-closing invariant, at the pure-engine level (no DOM, no editor): editing a
// chapter's source rebuilds the live book model so that (a) only the edited chapter is
// re-PARSED (every unchanged child + the master is served from the parse cache), and
// (b) the cheap global pass re-runs over the whole assembled tree, so a STRUCTURAL edit
// (a new labeled figure) renumbers cross-references — including one in ANOTHER chapter.
//
// This is what makes the browser edit loop both cheap (one chapter parsed, one rendered
// per keystroke) and correct (cross-chapter refs stay consistent). The DOM half — the
// CodeMirror pane, the debounce, the preview pane update — is driven over a fake editor
// adapter in master-book-live.test.js; real CodeMirror is a browser-only your-eyes check.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildEnscribePipeline,
  createIncrementalRebuilder,
  renderLiveChapterContent,
} from '../src/interpreter/index.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const BOOK_DIR = join(FIXTURES_DIR, 'master-book');
const read = (name) => readFileSync(join(BOOK_DIR, name), 'utf8');

export async function run() {
  const proc = buildEnscribePipeline({ assetsDir: join(FIXTURES_DIR, 'assets') });
  // Count outer parses so we can prove the rebuild is incremental (the assembler is the
  // only caller of proc.parse — recursive pipe-content parsing uses a separate inner processor).
  const realParse = proc.parse.bind(proc);
  let parseCount = 0;
  proc.parse = (s) => { parseCount += 1; return realParse(s); };

  const masterSource = read('master-book.emd');
  const childNames = ['preface.emd', 'chapter-1.emd', 'chapter-2.emd', 'appendix.emd'];
  const sources = new Map(childNames.map((n) => [n, read(n)]));
  const rebuilder = createIncrementalRebuilder({ masterSource, sources, proc });

  // ── initial rebuild: cold cache → master + every child is parsed once ────────────────
  parseCount = 0;
  const r0 = rebuilder.rebuild();
  assert.strictEqual(parseCount, 1 + childNames.length,
    `the first rebuild parses the master + all ${childNames.length} children once (cold cache)`);

  const ch2Idx = r0.model.stemToIndex.get('estimating-browse-pressure');
  const ch1Idx = r0.model.stemToIndex.get('counting-elephants');
  const ctx0 = { proc, file: r0.file };
  {
    assert.strictEqual(r0.model.registry.get('fig:transect').number, '1.1',
      'before the edit, fig:transect is figure 1.1');
    const ch2 = renderLiveChapterContent(r0.model.parts[ch2Idx], r0.model, ctx0);
    assert.ok(ch2.includes('<a href="#fig:transect" class="ref">figure 1.1</a>'),
      'before the edit, chapter 2\'s cross-chapter ref renders "figure 1.1"');
    console.log('PASS: edit-loop — initial rebuild builds a correct model (figure 1.1, cross-ref resolves)');
  }

  // ── edit chapter 1: insert a NEW figure before fig:transect → it renumbers to 1.2 ─────
  const editedCh1 = read('chapter-1.emd').replace(
    '<fig #fig:transect',
    '<fig #fig:newcount src=newcount.png | A newly added preliminary count.>\n\n<fig #fig:transect',
  );
  assert.notStrictEqual(editedCh1, read('chapter-1.emd'), 'the edit actually changed chapter 1\'s source');
  sources.set('chapter-1.emd', editedCh1);

  parseCount = 0;
  const r1 = rebuilder.rebuild();

  // (a) incremental: ONLY the edited chapter was re-parsed.
  {
    assert.strictEqual(parseCount, 1,
      'the rebuild re-parses ONLY the edited chapter (master + the other 3 children come from the parse cache)');
    console.log('PASS: edit-loop — incremental: editing one chapter re-parses exactly that one chapter');
  }

  // (b) structural edit renumbers cross-references across the whole book.
  {
    assert.strictEqual(r1.model.registry.get('fig:newcount').number, '1.1',
      'the inserted figure is 1.1');
    assert.strictEqual(r1.model.registry.get('fig:transect').number, '1.2',
      'fig:transect renumbered to 1.2 (the new figure pushed it down)');
    const ctx1 = { proc, file: r1.file };
    const ch1 = renderLiveChapterContent(r1.model.parts[ch1Idx], r1.model, ctx1);
    assert.ok(ch1.includes('id="fig:newcount"'),
      'the edited chapter 1 renders the newly inserted figure');
    const ch2 = renderLiveChapterContent(r1.model.parts[ch2Idx], r1.model, ctx1);
    assert.ok(ch2.includes('<a href="#fig:transect" class="ref">figure 1.2</a>'),
      'chapter 2\'s CROSS-chapter ref now renders "figure 1.2" — the global pass kept it consistent');
    console.log('PASS: edit-loop — a structural edit renumbers a cross-chapter reference (1.1 → 1.2)');
  }

  // ── a rebuild with NO source change re-parses nothing (every source is cached) ────────
  {
    parseCount = 0;
    rebuilder.rebuild();
    assert.strictEqual(parseCount, 0,
      'a rebuild after no source change parses nothing — the cache holds every current source');
    console.log('PASS: edit-loop — a no-change rebuild re-parses nothing (parse cache holds)');
  }

  console.log('All live book edit-loop (#203) incremental-rebuild checks passed.');
}
