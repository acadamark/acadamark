// Single-chapter book PAGING — now an OPT-IN escape hatch (Phase 8 Slice 3;
// repurposed in Slice C).
//
// As of Slice C the book + ToC DEFAULT is the one-scroll reading interface (left
// chapter rail, per-chapter prev/next, right "on this page" rail — see
// lib/toc.test.js). The single-chapter PAGING script is injected ONLY when
// `chapterNav: true` is passed explicitly. This test pins that gate: the default
// does NOT page, the opt-in does, and the script (when opted in) is valid JS.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';
import { CHAPTER_NAV_JS } from '../../src/interpreter/assets/chapter-nav-asset.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const render = (src, opts = {}) =>
  String(buildEnscribePipeline({ embedResources: false, ...opts }).processSync(src));
// A unique marker of the injected PAGING script (its "show whole book" toggle).
const hasPaging = (html) => html.includes("'Show whole book'") && html.includes('enscribe-chapter-showall');

const ARTICLE = `<# A #>\n\nx\n\n<# B #>\n\ny\n\n<# C #>\n\nz\n\n<# D #>\n\nw`;

export async function run() {
  const book = readFileSync(join(FIXTURES, 'document-44-cross-feature-monograph.emd'), 'utf8');

  // ── gating: paging is OPT-IN; the book + ToC default is the one-scroll interface ─
  assert.ok(!hasPaging(render(book, { toc: true })), 'book + toc default does NOT page (one-scroll reading interface)');
  assert.ok(!hasPaging(render(book, { toc: 'auto' })), 'book + toc:auto default does NOT page');
  assert.ok(hasPaging(render(book, { toc: true, chapterNav: true })), 'chapterNav:true opts INTO the paging view');
  assert.ok(!hasPaging(render(book, { toc: true, chapterNav: false })), 'chapterNav:false stays off (as does the default)');
  assert.ok(!hasPaging(render(book, { chapterNav: true })), 'chapterNav:true without a ToC → no paging (it needs the ToC selector + ids)');
  assert.ok(!hasPaging(render(ARTICLE, { toc: true, chapterNav: true })), 'an article never gets the paging view');
  console.log('PASS: paging is opt-in (chapterNav:true); the book + ToC default is the one-scroll interface');

  // ── the default book + ToC is the reading interface, not paging ─────────────
  {
    const def = render(book, { toc: true });
    assert.ok(/enscribe-layout--book/.test(def), 'default book + toc renders the reading-interface layout');
    assert.ok(!def.includes('class="chapter-hidden"'), 'no chapter-hidden in the default build output');
    assert.equal(render(book), render(book, { chapterNav: true }), 'chapterNav alone (no toc) is a no-op');
    console.log('PASS: book + ToC default is the one-scroll reading interface (no paging markup)');
  }

  // ── the opt-in paging script is valid JavaScript ────────────────────────────
  {
    assert.doesNotThrow(() => new Function(CHAPTER_NAV_JS), 'paging script parses');
    assert.ok(/DOMContentLoaded/.test(CHAPTER_NAV_JS) && /querySelectorAll\('book-part'\)/.test(CHAPTER_NAV_JS),
      'script defers to DOM-ready and operates on book-part elements');
    // Slice C: the paging script no longer writes its own ToC highlight (scroll-spy
    // is the sole highlighter) — the competing `.active` write is gone.
    assert.ok(!/classList\.toggle\('active'/.test(CHAPTER_NAV_JS), 'paging script no longer competes for the ToC active class (scroll-spy is sole)');
    console.log('PASS: opt-in paging script is valid, DOM-ready-guarded, and no longer competes for the highlight');
  }

  console.log('All chapter-nav (opt-in paging) tests passed.');
}
