// #467 — the per-surface consumption guard: a note-position=margin book's projected side note
// and its book+margin layering reach the reader on ALL THREE per-chapter surfaces (separate-pages,
// live, website), and a non-margin book stays byte-stable (no --margin class, no MARGIN_CSS on the
// per-surface CSS it gates). The parity guard (margin-book-parity) proves the FRAGMENT; this proves
// the SHELL delivers the class + CSS the fragment's <sidenote> needs to float into the gutter.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VFile } from 'vfile';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { assembleMasterDocument } from '../src/master-document/assemble.js';
import { publishBookPages, publishBookPageBodies } from '../src/master-document/publish-pages.js';
import { buildLiveBook, renderLiveChapterView } from '../src/master-document/live-book.js';
import { composeWebsiteShellPage } from '../src/master-document/website-shell.js';

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const MARGIN_MARKER = /Margin column \(#33\)/;   // the MARGIN_CSS block's header comment

function numberedFor(dir) {
  const proc = buildEnscribePipeline({});
  const file = new VFile({ path: 'master-book.emd' });
  const numbered = proc.runSync(assembleMasterDocument({
    source: readFileSync(join(FIX, dir, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(FIX, dir, rel),
    parse: (s) => proc.parse(s),
  }), file);
  return { proc, file, numbered };
}

export function run_tests() {
  // ── margin book: each surface delivers <sidenote> + the --margin wrapper class + MARGIN_CSS ──
  {
    const { proc, file, numbered } = numberedFor('margin-book');

    // separate-pages: a full standalone page (shell + body).
    const pages = publishBookPages({ numbered, file, proc, defaultCss: '/* default */' });
    const chapterPage = [...pages.values()].find((h) => /<sidenote\b/.test(h));
    assert.ok(chapterPage, 'separate-pages: some chapter page carries a projected <sidenote>');
    assert.match(chapterPage, /enscribe-layout--margin/, 'separate-pages: the page wrapper carries .enscribe-layout--margin');
    assert.match(chapterPage, MARGIN_MARKER, 'separate-pages: the page head ships MARGIN_CSS');

    // live: the mounted chapter view.
    const model = buildLiveBook({ numbered, file });
    assert.strictEqual(model.bookNav.margin, true, 'live: the model marks the book as a margin book');
    const liveView = renderLiveChapterView(model, 1, { proc, file });
    assert.match(liveView, /<sidenote\b/, 'live: the chapter view carries a projected <sidenote>');
    assert.match(liveView, /enscribe-layout--margin/, 'live: the live wrapper carries .enscribe-layout--margin');

    // website: the page body (publishBookPageBodies) inside the universal shell (composeWebsiteShellPage).
    const bodies = publishBookPageBodies({ numbered, file, proc });
    const chapterBody = [...bodies.values()].map((b) => b.body).find((h) => /<sidenote\b/.test(h));
    assert.ok(chapterBody, 'website: a page body carries a projected <sidenote>');
    assert.match(chapterBody, /enscribe-layout--margin/, 'website: the page body wrapper carries .enscribe-layout--margin');
    const websitePage = composeWebsiteShellPage({ defaultCss: '/* default */', title: 'T', topBar: '', content: chapterBody });
    assert.match(websitePage, MARGIN_MARKER, 'website: the universal head ships MARGIN_CSS');

    console.log('PASS: #467 — margin projection reaches all three per-chapter surfaces (sidenote + --margin class + MARGIN_CSS)');
  }

  // ── non-margin book: no --margin class anywhere; MARGIN_CSS not in the surface-gated CSS ──
  {
    const { proc, file, numbered } = numberedFor('master-book');
    const model = buildLiveBook({ numbered, file });
    assert.strictEqual(model.bookNav.margin, false, 'non-margin: the model does NOT mark a margin book');

    const pages = publishBookPages({ numbered, file, proc, defaultCss: '/* default */' });
    for (const html of pages.values()) {
      assert.ok(!/enscribe-layout--margin/.test(html), 'non-margin separate-pages: no --margin class');
      assert.ok(!MARGIN_MARKER.test(html), 'non-margin separate-pages: MARGIN_CSS not shipped');
    }
    const liveView = renderLiveChapterView(model, 1, { proc, file });
    assert.ok(!/enscribe-layout--margin/.test(liveView), 'non-margin live: no --margin class');

    console.log('PASS: #467 — a non-margin book is byte-stable (no --margin class, no gated MARGIN_CSS)');
  }
}
