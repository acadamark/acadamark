// Edit loop — browser-entry smoke (the #203 payoff, DOM half).
//
// Drives the REAL mountLiveBook edit mode in a jsdom document, through a FAKE editor
// adapter (CodeMirror 6 needs real browser layout and does NOT run in jsdom — the engine
// owns the loop, the adapter only creates the editing surface, so the loop is testable here
// while real CodeMirror is a browser-only your-eyes check). Proves the DOM loop: mount →
// open a chapter (editor mounts with that chapter's source) → "type" (call onChange) → after
// the debounce the preview pane re-renders the edited chapter, and a structural edit's new
// number shows in a DIFFERENT chapter when navigated to. The byte-level incremental-rebuild
// correctness is pinned separately by live-edit-loop.test.js (Node).

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { mountLiveBook } from '../src/interpreter/browser.js';
import { renderLiveArticleEditView } from '../src/master-document/live-edit-view.js';

const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-book');
const readBook = (name) => readFileSync(join(BOOK_DIR, name), 'utf8');
const BOOK_MASTER = readBook('master-book.emd');
const CHILDREN = {
  'preface.emd': readBook('preface.emd'),
  'chapter-1.emd': readBook('chapter-1.emd'),
  'chapter-2.emd': readBook('chapter-2.emd'),
  'appendix.emd': readBook('appendix.emd'),
};

function installDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'https://example.com/book/',
  });
  const orig = { window: global.window, document: global.document, location: global.location, fetch: global.fetch };
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, 'location', { value: dom.window.location, configurable: true, writable: true });
  global.fetch = async (url) => {
    const name = String(url).split('/').pop();
    if (Object.prototype.hasOwnProperty.call(CHILDREN, name)) {
      return { ok: true, status: 200, statusText: 'OK', text: async () => CHILDREN[name] };
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

function navigate(dom, hash) {
  dom.window.location.hash = hash;
  dom.window.dispatchEvent(new dom.window.Event('hashchange'));
}
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

// A fake editor adapter: records the latest mount (so the test can read the value the engine
// handed it and call onChange to "type"), and counts destroys (to prove re-mount on navigate).
function makeFakeEditor() {
  const state = { mounts: 0, destroys: 0, value: null, onChange: null, mountEl: null };
  const editor = {
    mount(mountEl, { value, onChange }) {
      state.mounts += 1;
      state.value = value;
      state.onChange = onChange;
      state.mountEl = mountEl;
      mountEl.setAttribute('data-editor-mounted', '1');
      return { destroy() { state.destroys += 1; mountEl.removeAttribute('data-editor-mounted'); } };
    },
  };
  return { editor, state };
}

export async function run() {
  const { dom, orig } = installDom();
  const { editor, state } = makeFakeEditor();
  try {
    // ── mount in edit mode: the empty hash still lands on the cover (no editor there) ─────
    const root = await mountLiveBook('#root', BOOK_MASTER, { editor, editDebounceMs: 0 });
    assert.ok(root.innerHTML.includes('Select a chapter to begin reading.') && state.mounts === 0,
      'edit mode still opens on the cover; the cover has no editor');

    // ── open chapter 1: the editor mounts with chapter 1's source; the preview shows fig 1.1
    navigate(dom, '#counting-elephants');
    assert.strictEqual(state.mounts, 1, 'opening a chapter mounts the editor once');
    assert.ok(root.querySelector('[data-edit-pane="source"][data-editor-mounted="1"]'),
      'the editor is mounted into the source pane');
    assert.ok(state.value.includes('Aerial Transects'),
      'the editor is handed THIS chapter\'s source (chapter 1)');
    const preview = () => root.querySelector('[data-edit-pane="preview"]').innerHTML;
    assert.ok(preview().includes('id="fig:transect"') && preview().includes('Figure 1.1.'),
      'the preview pane renders chapter 1 live (fig:transect as Figure 1.1)');
    console.log('PASS: edit-loop DOM — opening a chapter mounts the editor + renders the live preview');

    // ── the layout fix: the chapter EDIT view composes through composeBookBody, so it carries BOTH
    //    rails — the chapter rail (left) and the on-this-page rail (right) — placed exactly as read
    //    mode, with the Write/Preview UI in the content column. (The old hand-rolled grid dropped the
    //    on-this-page rail and crammed the edit-main in by hand.)
    assert.ok(root.querySelector('nav.enscribe-chapter-rail'),
      'edit view: the left chapter rail is present');
    assert.ok(root.querySelector('nav.enscribe-onthispage'),
      'edit view: the on-this-page rail is present (restored — read mode\'s layout reused via composeBookBody)');
    assert.ok(root.querySelector('.enscribe-layout--book-3col'),
      'edit view: the 3-col book grid (rail + content + on-this-page) — composeBookBody, both rails');
    assert.ok(root.querySelector('main.enscribe-body .enscribe-edit-main [data-edit-pane="preview"]'),
      'edit view: the Write/Preview UI sits inside the content column (composeBookBody, no nested <main>)');
    console.log('PASS: book chapter edit view — composes via composeBookBody (both rails restored, edit UI in content column)');

    // ── "type" a structural edit: insert a figure before fig:transect → it renumbers to 1.2
    const editedCh1 = CHILDREN['chapter-1.emd'].replace(
      '<fig #fig:transect',
      '<fig #fig:newcount src=newcount.png | A newly added preliminary count.>\n\n<fig #fig:transect',
    );
    state.onChange(editedCh1);
    await tick();                                   // let the (0ms) debounce + rebuild fire
    assert.ok(preview().includes('id="fig:newcount"'),
      'after the debounce, the preview re-renders with the inserted figure');
    assert.ok(preview().includes('Figure 1.2.'),
      'the edit renumbered fig:transect to Figure 1.2 in the live preview');
    assert.strictEqual(state.mounts, 1,
      'the preview update did NOT remount the editor (cursor/focus preserved)');
    console.log('PASS: edit-loop DOM — typing re-renders only the current chapter\'s preview (debounced)');

    // ── the structural edit is consistent across chapters: chapter 2\'s cross-ref follows ──
    navigate(dom, '#estimating-browse-pressure');
    assert.strictEqual(state.destroys, 1, 'navigating away destroyed the chapter-1 editor');
    assert.strictEqual(state.mounts, 2, 'and mounted a fresh editor for chapter 2');
    assert.ok(state.value.includes('Browse Scoring'), 'chapter 2\'s source is handed to the editor');
    assert.ok(preview().includes('<a href="#fig:transect" class="ref">figure 1.2</a>'),
      'chapter 2\'s CROSS-chapter ref shows the new number (figure 1.2) — the global pass stayed consistent');
    console.log('PASS: edit-loop DOM — a structural edit\'s renumber shows in a referencing chapter on navigate');

    // ── the Write/Preview tabs toggle the panes ──────────────────────────────────────────
    const sourcePane = root.querySelector('[data-edit-pane="source"]');
    const previewPane = root.querySelector('[data-edit-pane="preview"]');
    // Display defaults to PREVIEW (#editability model): an editable page lands on the rendered document;
    // the editor (Source) is one click away. One source of truth — live-edit-view.js DEFAULT_TAB.
    assert.ok(sourcePane.hidden && !previewPane.hidden, 'Preview is the default landing view (source pane hidden)');
    root.querySelector('[data-edit-tab="source"]').click();
    assert.ok(!sourcePane.hidden && previewPane.hidden, 'clicking Source opens the editor, hides the preview');
    root.querySelector('[data-edit-tab="preview"]').click();
    assert.ok(sourcePane.hidden && !previewPane.hidden, 'clicking Preview flips back to the rendered document');
    console.log('PASS: edit-loop DOM — Preview is the default landing; the Write/Preview tabs toggle the panes');

    // ── the "preview — unsaved" marker is present (lost-on-reload is not silent) ──────────
    assert.ok(root.querySelector('.enscribe-edit-status'),
      'the edit view shows the unobtrusive "preview — unsaved" marker');
    console.log('PASS: edit-loop DOM — the preview-unsaved marker is shown (no save this slice)');
  } finally {
    restoreDom(orig);
  }

  // ── page-owns-convergence: the edit view does NOT impose a competing layout ───────────
  // The preview pane holds the page's OWN render framed like read mode: it carries the `content` class
  // (read-mode framing), and there is NO `enscribe-layout--edit` wrapper (which signalled a competing
  // layout). So a config-toc article's rail / a book's rails lay out in preview exactly as in read mode.
  {
    const view = renderLiveArticleEditView('<article class="enscribe-layout enscribe-layout--toc">body</article>');
    assert.ok(!view.includes('enscribe-layout--edit'),
      'the edit view has NO competing enscribe-layout--edit wrapper (the page owns its layout)');
    assert.ok(view.includes('content" data-edit-pane="preview"'),
      'the preview pane carries the `content` class — framing the page exactly as read mode does');
    assert.ok(view.includes('enscribe-layout--toc'),
      'the page\'s OWN layout survives intact inside the preview pane');
    console.log('PASS: page-owns — the edit preview holds the page layout (content-framed; no competing --edit wrapper)');
  }

  console.log('All live book edit-loop (#203) browser-entry smoke checks passed.');
}
