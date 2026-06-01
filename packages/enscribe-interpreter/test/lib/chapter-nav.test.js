// Single-chapter book navigation (Phase 8 Slice 3).
//
// The runtime behavior (show/hide, ToC selector, prev/next, keyboard, hash,
// cross-chapter links, show-all) is a browser concern verified manually; here we
// test the build-time contract: the script is injected only for a book that has
// a ToC, it is a pure enhancement (no markup beyond the <script>, so a document
// without it is byte-identical), and the injected script is valid JavaScript.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildEnscribePipeline } from '../../src/index.js';
import { CHAPTER_NAV_JS } from '../../src/assets/chapter-nav-asset.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const render = (src, opts = {}) =>
  String(buildEnscribePipeline({ embedResources: false, ...opts }).processSync(src));
// A unique marker of the injected script (the "show whole book" toggle).
const hasNav = (html) => html.includes("'Show whole book'") && html.includes('enscribe-chapter-showall');

const ARTICLE = `<# A #>\n\nx\n\n<# B #>\n\ny\n\n<# C #>\n\nz\n\n<# D #>\n\nw`;

export async function run() {
  const book = readFileSync(join(FIXTURES, 'document-44-cross-feature-monograph.emd'), 'utf8');

  // ── gating ──────────────────────────────────────────────────────────────────
  assert.ok(hasNav(render(book, { toc: true })), 'book + toc → chapter-nav script injected');
  assert.ok(hasNav(render(book, { toc: 'auto' })), 'book + toc:auto (5 chapters) → injected');
  assert.ok(!hasNav(render(book, { toc: true, chapterNav: false })), 'chapterNav:false opts out');
  assert.ok(!hasNav(render(book, {})), 'book without a ToC → no script (it needs the ToC selector + ids)');
  assert.ok(!hasNav(render(ARTICLE, { toc: true })), 'an article never gets chapter-nav');
  console.log('PASS: chapter-nav gating (book + ToC only)');

  // ── output-neutral: it adds no markup beyond the one <script> ───────────────
  {
    // Without a ToC the book is byte-identical to before this feature.
    assert.equal(render(book), render(book, { chapterNav: true }), 'chapterNav alone (no toc) is a no-op');
    assert.equal(render(book), render(book, { toc: false, chapterNav: false }), 'book default byte-identical');
    // The hiding class is never in the build output — it is applied at runtime.
    assert.ok(!render(book, { toc: true }).includes('class="chapter-hidden"'), 'no chapter-hidden in the build output (runtime-only)');
    console.log('PASS: chapter-nav is a pure enhancement (no extra build markup)');
  }

  // ── the injected script is valid JavaScript ─────────────────────────────────
  {
    assert.doesNotThrow(() => new Function(CHAPTER_NAV_JS), 'chapter-nav script parses');
    // it defers until the DOM is ready, and queries book-part elements
    assert.ok(/DOMContentLoaded/.test(CHAPTER_NAV_JS) && /querySelectorAll\('book-part'\)/.test(CHAPTER_NAV_JS),
      'script defers to DOM-ready and operates on book-part elements');
    console.log('PASS: injected script is valid + DOM-ready-guarded');
  }

  console.log('All chapter-nav tests passed.');
}
