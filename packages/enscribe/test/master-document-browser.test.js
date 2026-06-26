// #194 — browser child-loader: a multi-file MASTER document rendered live via the
// browser entry (renderMasterAsync), against a stubbed global.fetch + document
// (no live network; deterministic). This is the browser counterpart of the CLI
// master-document test: same master + child sources, same byte-exact cross-file
// assertions (continuous figure/section numbering, cross-file <ref> resolution),
// proving the browser path produces the same assembled output as the CLI build.
//
// The child sources are the shared canonical fixtures at
// packages/enscribe/test/fixtures/master-xref/* — read from disk here and served
// by the mock fetch — so a divergence between the browser and CLI assembled
// output would surface as a failed assertion.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderMasterAsync, renderMasterIntoAsync } from '../src/interpreter/browser.js';

// ── the master + its three <section src> children: the shared canonical fixtures
//    at test/fixtures/master-xref/, read from disk (no inline copies to drift) ──
const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-xref');
const readFixture = (name) => readFileSync(join(FIXTURE_DIR, name), 'utf8');

const MASTER = readFixture('master-xref.emd');
const ALPHA = readFixture('alpha.emd');
const BETA = readFixture('beta.emd');
const GAMMA = readFixture('gamma.emd');

const CHILDREN = { 'alpha.emd': ALPHA, 'beta.emd': BETA, 'gamma.emd': GAMMA };

// Slice B (#190): the multi-file BOOK master + its book-part `src` children, from
// the shared fixture at test/fixtures/master-book/ — proves the browser live path
// discovers + assembles `<chapter src>` / `<preface src>` / `<appendix src>` (not
// just `<section src>`) and structures the result as a `<book>`.
const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-book');
const readBook = (name) => readFileSync(join(BOOK_DIR, name), 'utf8');
const BOOK_MASTER = readBook('master-book.emd');
const BOOK_CHILDREN = {
  'preface.emd': readBook('preface.emd'),
  'chapter-1.emd': readBook('chapter-1.emd'),
  'chapter-2.emd': readBook('chapter-2.emd'),
  'appendix.emd': readBook('appendix.emd'),
};

// A mock fetch that serves the given children by filename and 404s anything else, so
// the resolve-against-baseURI path and the missing-child path are both exercised.
function installStubs(children = CHILDREN) {
  const orig = { fetch: global.fetch, document: global.document };
  global.document = { baseURI: 'https://example.com/paper/' };
  global.fetch = async (url) => {
    const name = String(url).split('/').pop();
    if (Object.prototype.hasOwnProperty.call(children, name)) {
      return { ok: true, status: 200, statusText: 'OK', text: async () => children[name] };
    }
    return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
  };
  return orig;
}
function restoreStubs(orig) {
  global.fetch = orig.fetch;
  global.document = orig.document;
}

export async function run() {
  const orig = installStubs();
  try {
    // ── the master + children assemble into ONE article, rendered live ──────────
    const html = await renderMasterAsync(MASTER);
    {
      assert.equal((html.match(/<article>/g) || []).length, 1,
        'browser master assembles into a single <article>');
      console.log('PASS: #194 — browser renderMasterAsync assembles a master into one article');
    }

    // ── continuous FIGURE numbering across child files (alpha→1, beta→2, gamma→3) ─
    {
      // #326: <fig> is flow — the single-paragraph caption keeps its <p> (a
      // block, so the formatter may break the line between label and caption).
      assert.ok(/<span class="figure-label">Figure 1\.<\/span>\s*<p>The alpha figure\.<\/p>/.test(html),
        'browser cross-file: the first child file figure is Figure 1');
      assert.ok(/<span class="figure-label">Figure 2\.<\/span>\s*<p>The beta figure\.<\/p>/.test(html),
        'browser cross-file: the second child file figure continues as Figure 2');
      assert.ok(/<span class="figure-label">Figure 3\.<\/span>\s*<p>The gamma figure\.<\/p>/.test(html),
        'browser cross-file: the third child file figure continues as Figure 3');
      console.log('PASS: #194 — figures number continuously across child files (browser)');
    }

    // ── continuous SECTION numbering (number-sections=true in the master config) ──
    {
      assert.ok(html.includes('<section-title><span class="section-number">1</span>Alpha</section-title>'),
        'browser cross-file: first section numbered 1');
      assert.ok(html.includes('<section-title><span class="section-number">2</span>Beta</section-title>'),
        'browser cross-file: second section numbered 2');
      assert.ok(html.includes('<section-title><span class="section-number">3</span>Gamma</section-title>'),
        'browser cross-file: third section numbered 3');
      console.log('PASS: #194 — sections number continuously across child files (browser)');
    }

    // ── cross-file cross-REFERENCES resolve across boundaries (back/forward/section)
    {
      assert.ok(html.includes('<a href="#fig:gamma" class="ref">figure 3</a>'),
        'browser cross-file: a <ref> in alpha.emd resolves FORWARD to the figure in gamma.emd');
      assert.ok(html.includes('<a href="#fig:alpha" class="ref">figure 1</a>'),
        'browser cross-file: a <ref> in beta.emd resolves BACKWARD to the figure in alpha.emd');
      assert.ok(html.includes('<a href="#fig:beta" class="ref">figure 2</a>'),
        'browser cross-file: a <ref> in gamma.emd resolves backward to the figure in beta.emd');
      assert.ok(html.includes('<a href="#sec:alpha" class="ref">section 1</a>'),
        'browser cross-file: a <ref> resolves to a SECTION that lives in another file');
      console.log('PASS: #194 — cross-references resolve across file boundaries (browser)');
    }

    // ── an unresolved cross-ref still renders visibly (always-renders) ───────────
    {
      assert.ok(html.includes('class="ref-error"') && html.includes('??ref: fig:missing??'),
        'browser cross-file: an unresolved <ref> renders a visible error marker, not a crash');
      console.log('PASS: #194 — unresolved cross-ref renders visibly (browser)');
    }

    // ── error path: a missing child renders a visible inline error, clean render ──
    {
      const MASTER_MISSING = `<meta type=article title="Err Demo" />\n\n<section src="nope.emd" />`;
      const out = await renderMasterAsync(MASTER_MISSING);
      assert.ok(out.includes('could not load section source') && out.includes('nope.emd'),
        'missing child (404) renders a visible "could not load section source" note');
      assert.equal((out.match(/<article>/g) || []).length, 1,
        'the document still renders around the failed child (always-renders)');
      console.log('PASS: #194 — a failed child fetch renders a visible inline error; document still renders');
    }

    // ── a source with no <section src> is not a master → falls back to a normal render
    {
      const PLAIN = `<meta type=article title="Plain" />\n\nJust an ordinary paragraph.`;
      const out = await renderMasterAsync(PLAIN);
      assert.ok(out.includes('Just an ordinary paragraph') && out.includes('<article>'),
        'no <section src> → renderMasterAsync renders the source as an ordinary document');
      console.log('PASS: #194 — a non-master source falls back to the ordinary render path');
    }

    // ── renderMasterIntoAsync writes the assembled HTML into the target element ──
    {
      const el = {}; // a minimal Element stand-in: only innerHTML is touched here
      const ret = await renderMasterIntoAsync(el, MASTER);
      assert.strictEqual(ret, el, 'renderMasterIntoAsync returns the target element');
      assert.ok(typeof el.innerHTML === 'string' && el.innerHTML.includes('Figure 1.'),
        'renderMasterIntoAsync writes the assembled HTML into the element via innerHTML');
      console.log('PASS: #194 — renderMasterIntoAsync writes the assembled document into a DOM element');
    }
  } finally {
    restoreStubs(orig);
  }

  // ── Slice B: a BOOK master rendered live assembles into one <book> ───────────
  // The browser discovery now recognizes book-part `src` entries (not just
  // `<section src>`); the assembled tree carries `<meta type=book>` into the same
  // pipeline the CLI uses, so the live render is a `<book>` with front/body/back and
  // per-chapter numbering — proving the browser path matches the CLI build for books.
  const bookOrig = installStubs(BOOK_CHILDREN);
  try {
    const book = await renderMasterAsync(BOOK_MASTER);

    assert.equal((book.match(/<book>/g) || []).length, 1,
      'browser book master assembles into a single <book>');
    assert.ok(book.includes('<book-front>') && book.includes('<book-body>') && book.includes('<book-back>'),
      'browser book has front / body / back regions');
    assert.ok(book.includes('book-part-type="preface"') && book.includes('book-part-type="appendix"') &&
      (book.match(/book-part-type="chapter"/g) || []).length === 2,
      'browser book routes preface→front, two chapters→body, appendix→back');
    console.log('PASS: Slice B — browser renderMasterAsync assembles a book master into one <book>');

    // Per-chapter numbering + a cross-chapter <ref> resolve over the assembled tree.
    assert.ok(/Figure 1\.1\./.test(book) && /Figure 2\.1\./.test(book),
      'browser book: per-chapter figure numbering (chapter 1 → 1.1, chapter 2 → 2.1)');
    assert.ok(book.includes('<a href="#fig:transect" class="ref">figure 1.1</a>'),
      'browser book: a cross-chapter <ref> in chapter 2 resolves to chapter 1\'s figure 1.1');
    assert.ok(!book.includes('child fallback'),
      'browser book: the master pipe titles override each child file title (no fallback leak)');
    console.log('PASS: Slice B — browser book: per-chapter numbering + cross-chapter <ref> resolve');
  } finally {
    restoreStubs(bookOrig);
  }
}
