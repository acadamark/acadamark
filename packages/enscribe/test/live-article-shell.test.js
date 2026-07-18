// Single-document (article) live render + the unified shell dispatch (#216).
//
// The book live mount has a cover, a chapter rail, hash routing, and a per-chapter cache; an ARTICLE
// needs none of that — it is ONE unit, so one render resolves every cross-reference and the document
// just mounts. This gate drives the unified `mountLiveShell` (the type-agnostic entry): it fetches a
// master, reads `<meta type>`, and dispatches an ARTICLE to mountLiveArticle (read + the single-unit
// #211 edit loop) and a BOOK to the unchanged book path. Driven through a fake editor factory +
// adapter (real CodeMirror is a your-eyes check), with a stubbed global.fetch + document.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { mountLiveShell } from '../src/interpreter/browser.js';

// A small, image-free single-file article: a labeled display equation + a `<ref>` to it, so the
// edit loop can prove that a structural edit (inserting a PRIOR labeled equation) renumbers the
// reference — the article's single global pass keeps in-document cross-references correct.
const ARTICLE = [
  '<meta type=article>',
  '<title | Live Article Smoke>',
  '<author | The Enscribe Team>',
  '</meta>',
  '',
  '<section | Model>',
  '',
  'A labeled display equation:',
  '',
  '<$$ #eqn:line | y = m x + b $$>',
  '',
  'See <ref @eqn:line> for the line model.',
].join('\n');

// The same article with a PRIOR labeled equation inserted — `#eqn:line` shifts from equation 1 to 2.
const ARTICLE_EDITED = [
  '<meta type=article>',
  '<title | Live Article Smoke>',
  '<author | The Enscribe Team>',
  '</meta>',
  '',
  '<section | Model>',
  '',
  'A prior labeled display equation:',
  '',
  '<$$ #eqn:zero | a = b $$>',
  '',
  'A labeled display equation:',
  '',
  '<$$ #eqn:line | y = m x + b $$>',
  '',
  'See <ref @eqn:line> for the line model.',
].join('\n');

// A MULTI-FILE article master: a `<section src>` child stitched in by the assembler, plus a
// cross-file `<ref>` (the master references a labeled equation that lives in the child). This
// exercises the article edit loop's assemble branch (HAS_MASTER_SRC → assembleMasterDocument over
// the in-memory children), which the single-file ARTICLE above does not.
const ARTICLE_MULTI = [
  '<meta type=article>',
  '<title | Multi-File Live Article>',
  '<author | The Enscribe Team>',
  '</meta>',
  '',
  '<section src="part.emd" />',
  '',
  '<section | Discussion>',
  '',
  'As shown in <ref @eqn:child>, the identity holds.',
].join('\n');
const PART = [
  '<meta title="Child Part" />',
  '',
  '<section | Foundations>',
  '',
  '<$$ #eqn:child | a = b $$>',
].join('\n');

// The shared book master fixtures, so the dispatch can be exercised both ways from the one entry.
const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-book');
const readBook = (name) => readFileSync(join(BOOK_DIR, name), 'utf8');
const SERVED = {
  'article.emd': ARTICLE,
  'article-multi.emd': ARTICLE_MULTI,
  'part.emd': PART,
  ...Object.fromEntries(
    ['master-book.emd', 'preface.emd', 'chapter-1.emd', 'chapter-2.emd', 'appendix.emd'].map((n) => [n, readBook(n)]),
  ),
};

function installDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'https://example.com/doc/',
  });
  const orig = { window: global.window, document: global.document, location: global.location, fetch: global.fetch };
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, 'location', { value: dom.window.location, configurable: true, writable: true });
  global.fetch = async (url) => {
    const name = String(url).split('/').pop();
    if (Object.prototype.hasOwnProperty.call(SERVED, name)) {
      return { ok: true, status: 200, statusText: 'OK', text: async () => SERVED[name] };
    }
    return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
  };
  return { dom, orig };
}
function restoreDom(orig) {
  global.window = orig.window;
  global.document = orig.document;
  Object.defineProperty(global, 'location', { value: orig.location, configurable: true, writable: true });
  global.fetch = orig.fetch;
}

// A fake editor factory + adapter: counts factory-builds and editor-mounts, and CAPTURES the
// `onChange` callback so a test can simulate an edit (the engine owns the debounce + re-render).
function makeFactory() {
  const s = { builds: 0, mounts: 0, lastValue: null, lastOnChange: null };
  const factory = async () => {
    s.builds += 1;
    return {
      mount(el, { value, onChange }) {
        s.mounts += 1;
        s.lastValue = value;
        s.lastOnChange = onChange;
        el.setAttribute('data-editor-mounted', '1');
        return { destroy() {} };
      },
    };
  };
  return { factory, s };
}

const previewHtml = (root) => {
  const pane = root.querySelector('[data-edit-pane="preview"]');
  return pane ? pane.innerHTML : '';
};
const refText = (html) => (html.match(/<a[^>]*href="#eqn:line"[^>]*>([^<]*)<\/a>/) || [null, null])[1];

export async function run() {
  // ── ARTICLE read: the document mounts, NO book chrome, NO "book-only" throw, editor never built ──
  {
    const { orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      const root = await mountLiveShell('#root', 'article.emd', { editorFactory: factory, edit: false });
      assert.strictEqual(s.builds, 0, 'read mode → the editorFactory is NOT called (CodeMirror never loaded)');
      assert.ok(root.querySelector('article'), 'the article renders (a single <article>, no book-only throw)');
      assert.ok(
        !root.innerHTML.includes('Select a chapter to begin reading.') &&
        !root.querySelector('.enscribe-book-home') &&
        !root.querySelector('book-part'),
        'NO book chrome — no cover lede, no return-to-cover masthead, no chapter <book-part>',
      );
      assert.strictEqual(refText(root.innerHTML), 'equation 1',
        'the in-document <ref> resolves in the single render (equation 1)');
      console.log('PASS: #216 — an article master live-renders via mountLiveShell (no book chrome, no throw)');
    } finally { restoreDom(orig); }
  }

  // ── ARTICLE edit: the single-unit #211 loop — Source/Preview panes + the editor mount; an edit
  //    re-renders the whole article and an in-document reference stays correct (renumbers) ──────────
  {
    const { orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      const root = await mountLiveShell('#root', 'article.emd', { editorFactory: factory, edit: true, editDebounceMs: 0 });
      assert.strictEqual(s.builds, 1, 'edit on → the editorFactory is built once (CodeMirror loaded host-side)');
      assert.strictEqual(s.mounts, 1, 'edit on → the editor mounts immediately (one unit — no navigation needed)');
      assert.ok(root.querySelector('[data-edit-pane="source"][data-editor-mounted="1"]'),
        'the editor mounts on the Source pane');
      assert.ok(root.querySelector('[data-edit-pane="preview"]'), 'the Preview pane is present');
      assert.strictEqual(s.lastValue, ARTICLE, 'the editor is seeded with the article master source');
      assert.strictEqual(refText(previewHtml(root)), 'equation 1', 'the initial preview ref is equation 1');

      // Simulate an edit that inserts a PRIOR labeled equation: `#eqn:line` shifts to equation 2.
      s.lastOnChange(ARTICLE_EDITED);
      await new Promise((r) => setTimeout(r, 10));   // let the (0ms) debounce + re-render run
      assert.strictEqual(refText(previewHtml(root)), 'equation 2',
        'after the edit, the in-document <ref> re-resolves to equation 2 (the single global pass renumbers)');
      console.log('PASS: #216 — the article edit loop re-renders the one unit; in-document refs stay correct');
    } finally { restoreDom(orig); }
  }

  // ── MULTI-FILE article edit: the assemble branch — a `<section src>` child is stitched into the
  //    preview, a cross-file <ref> resolves, and the editable unit is still the master itself ───────
  {
    const { orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      const root = await mountLiveShell('#root', 'article-multi.emd', { editorFactory: factory, edit: true, editDebounceMs: 0 });
      assert.strictEqual(s.lastValue, ARTICLE_MULTI,
        'the editable unit is the MASTER source (not a child) — the single-unit model holds for a multi-file article');
      const pv = previewHtml(root);
      assert.ok(/id="eqn:child"/.test(pv),
        'the `<section src>` child is assembled into the preview (the equation that lives in part.emd renders)');
      assert.ok(/<a[^>]*href="#eqn:child"[^>]*class="ref">[^<]+<\/a>/.test(pv) && !/ref-error/.test(pv),
        'a cross-file <ref> (master → child) resolves in the single global pass (no ref-error)');
      // An edit to the master re-renders the assembled whole (the child rides from memory).
      s.lastOnChange(ARTICLE_MULTI.replace('<section | Discussion>', '<section | Results and discussion>'));
      await new Promise((r) => setTimeout(r, 10));
      assert.ok(previewHtml(root).includes('Results and discussion') && /id="eqn:child"/.test(previewHtml(root)),
        'editing the master re-assembles + re-renders; the child content is preserved from memory');
      console.log('PASS: #216 — a multi-file article edits via the assemble branch; cross-file refs resolve');
    } finally { restoreDom(orig); }
  }

  // ── ONE shell, BOTH types: the SAME entry dispatches a BOOK master to the unchanged book path ────
  {
    const { orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      const root = await mountLiveShell('#root', 'master-book.emd', { editorFactory: factory, edit: false });
      assert.strictEqual(s.builds, 0, 'read mode → no editor built');
      assert.ok(root.innerHTML.includes('Select a chapter to begin reading.'),
        'a book master dispatches to the book path (the cover renders) — the dispatch is additive');
      console.log('PASS: #216 — one mountLiveShell drives BOTH an article and a book master (dispatch by <meta type>)');
    } finally { restoreDom(orig); }
  }

  // ── #445: the document tier on the STANDALONE floating corner — read-back initialization ────────
  // The gear's document tier renders on the floating corner of an editable standalone article and
  // initializes every control from the document's CURRENT <config> (see-what-you-set in the read
  // direction): a pinned boolean reflects as On/Off, a pinned enum as its value, and a pin OUTSIDE
  // the offered set (toc-depth=9) reflects as a one-off option — never misreported as "Default".
  {
    const { orig } = installDom();
    // A setValue-capable adapter (mirroring editor-codemirror's optional engine→editor push) so the
    // tier's rewrite path is live: setValue swaps the buffer AND fires onChange, the one-source path.
    const s = { lastValue: null };
    const factory = async () => ({
      mount(el, { value, onChange }) {
        s.lastValue = value;
        return { destroy() {}, setValue(v) { s.lastValue = v; onChange(v); } };
      },
    });
    SERVED['article-pinned.emd'] = [
      '<meta type=article>',
      '<title | Pinned Article>',
      '</meta>',
      '',
      '<config number-figures=false toc-depth=9 theme=tufte />',
      '',
      '<section | Body>',
      '',
      'Text.',
    ].join('\n');
    try {
      await mountLiveShell('#root', 'article-pinned.emd', { editorFactory: factory, edit: true, editDebounceMs: 0 });
      const corner = global.document.getElementById('enscribe-shell-actions-floating');
      assert.ok(corner, 'the floating corner is injected on a standalone live article');
      const docTier = corner.querySelector('.enscribe-settings-tier--doc');
      assert.ok(docTier && !docTier.hidden, 'the document tier renders + is visible on the editable standalone article');
      assert.equal(docTier.querySelector('select[data-doc="number-figures"]').value, 'false',
        'read-back: a pinned boolean (number-figures=false) initializes its toggle to Off');
      assert.equal(docTier.querySelector('select[data-doc="theme"]').value, 'tufte',
        'read-back: the pinned theme initializes the theme picker');
      assert.equal(docTier.querySelector('select[data-doc="toc-depth"]').value, '9',
        'read-back: an out-of-set pin (toc-depth=9) reflects as a one-off option, never as Default');
      assert.equal(docTier.querySelector('select[data-doc="number-tables"]').value, '',
        'read-back: an unpinned key initializes to Default');
      // The write path is the same one-source rewrite the website test proves; spot-check one control
      // end-to-end on THIS surface (the floating corner's wiring, not the website chrome's).
      const showSel = docTier.querySelector('select[data-doc="show-source"]');
      showSel.value = 'true';
      showSel.dispatchEvent(new global.window.Event('change'));
      assert.ok(/<config[^>]*\bshow-source=true\b/.test(s.lastValue),
        'a standalone-corner control rewrites the article <config> through the editor buffer');
      assert.ok(/\bnumber-figures=false\b/.test(s.lastValue) && /\btheme=tufte\b/.test(s.lastValue),
        'the pre-existing pins are untouched by the write');
      console.log('PASS: #445 — standalone corner: the document tier initializes from the pinned <config> and rewrites it');
    } finally { restoreDom(orig); }
  }

  // ── #445: a standalone BOOK in edit mode gets NO document tier (the unseen-master exclusion) ─────
  // The book's live loop edits its per-chapter files; the master <config> the controls would rewrite
  // is in no editor buffer, so the tier must not render — reader tier only (notes/specs/settings.md).
  {
    const { orig } = installDom();
    const { factory } = makeFactory();
    try {
      await mountLiveShell('#root', 'master-book.emd', { editorFactory: factory, edit: true, editDebounceMs: 0 });
      const corner = global.document.getElementById('enscribe-shell-actions-floating');
      assert.ok(corner, 'the floating corner (reader tier) is present on a standalone live book in edit mode');
      assert.ok(!corner.querySelector('.enscribe-settings-tier--doc') && !corner.querySelector('[data-doc]'),
        'a book in edit mode renders NO document tier — the master <config> is in no editor buffer (unseen-master)');
      console.log('PASS: #445 — a standalone book edit surface stays reader-tier-only (unseen-master exclusion)');
    } finally { restoreDom(orig); }
  }

  console.log('All single-document (article) live render + dispatch (#216) checks passed.');
}
