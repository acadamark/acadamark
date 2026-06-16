// Configurable live shell — the host-side read↔edit switch (#213).
//
// One shell, one knob. `mountLiveShell` turns editing on/off from the HOST (not the
// document — editability is a deployment property, and only the host can load CodeMirror).
// The switch is the explicit `edit` option (the testable core) falling back to the
// `data-enscribe-edit` attribute on the mount element. OFF → read mode (byte-identical to
// #209), and the editor is NEVER built (CodeMirror is never loaded). ON → the `editorFactory`
// is built once and the #211 edit loop runs. Driven here through a fake factory + adapter
// (real CodeMirror is a browser-only your-eyes check).

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { mountLiveShell } from '../src/interpreter/browser.js';

const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-book');
const readBook = (name) => readFileSync(join(BOOK_DIR, name), 'utf8');
const SERVED = Object.fromEntries(
  ['master-book.emd', 'preface.emd', 'chapter-1.emd', 'chapter-2.emd', 'appendix.emd'].map((n) => [n, readBook(n)]),
);

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
function navigate(dom, hash) {
  dom.window.location.hash = hash;
  dom.window.dispatchEvent(new dom.window.Event('hashchange'));
}

// A fake editor factory + adapter, counting factory-builds and editor-mounts.
function makeFactory() {
  const s = { builds: 0, mounts: 0 };
  const factory = async () => {
    s.builds += 1;
    return {
      mount(el, { value, onChange }) {   // eslint-disable-line no-unused-vars
        s.mounts += 1;
        el.setAttribute('data-editor-mounted', '1');
        return { destroy() {} };
      },
    };
  };
  return { factory, s };
}

export async function run() {
  // ── flag OFF (explicit edit:false): read mode; the editor is never built ────────────────
  {
    const { dom, orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      const root = await mountLiveShell('#root', 'master-book.emd', { editorFactory: factory, edit: false });
      assert.strictEqual(s.builds, 0, 'edit off → the editorFactory is NOT called (CodeMirror never loaded)');
      assert.ok(root.innerHTML.includes('Select a chapter to begin reading.'),
        'edit off → read mode opens on the cover (#209)');
      navigate(dom, '#1-counting-elephants');
      assert.ok(root.querySelector('book-part') && !root.querySelector('[data-editor-mounted]'),
        'edit off → a chapter renders read-only (no editor pane)');
      console.log('PASS: shell #213 — flag off mounts read mode; the editor is never built');
    } finally { restoreDom(orig); }
  }

  // ── flag ON (explicit edit:true): the editor is built once; a chapter mounts it ─────────
  {
    const { dom, orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      const root = await mountLiveShell('#root', 'master-book.emd', { editorFactory: factory, edit: true });
      assert.strictEqual(s.builds, 1, 'edit on → the editorFactory is built once (CodeMirror loaded host-side)');
      assert.ok(root.innerHTML.includes('Select a chapter to begin reading.') && s.mounts === 0,
        'edit on → still opens on the cover (no editor on the cover)');
      navigate(dom, '#1-counting-elephants');
      assert.ok(root.querySelector('[data-edit-pane="source"][data-editor-mounted="1"]') && s.mounts === 1,
        'edit on → opening a chapter mounts the editor (the #211 loop)');
      console.log('PASS: shell #213 — flag on builds the editor once and mounts it on a chapter');
    } finally { restoreDom(orig); }
  }

  // ── the data-enscribe-edit attribute is the declarative knob (no explicit edit option) ──
  {
    const { dom, orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      dom.window.document.getElementById('root').setAttribute('data-enscribe-edit', '');
      const root = await mountLiveShell('#root', 'master-book.emd', { editorFactory: factory });
      assert.strictEqual(s.builds, 1, 'data-enscribe-edit present → edit mode (factory built)');
      navigate(dom, '#1-counting-elephants');
      assert.ok(root.querySelector('[data-editor-mounted="1"]'), 'data-enscribe-edit → the editor mounts');
      console.log('PASS: shell #213 — the data-enscribe-edit attribute enables edit mode');
    } finally { restoreDom(orig); }
  }

  // ── default (no attribute, no option) is read; and an explicit-off attribute stays read ──
  {
    const { dom, orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      const root = await mountLiveShell('#root', 'master-book.emd', { editorFactory: factory });
      assert.strictEqual(s.builds, 0, 'no attribute + no option → read (factory not called)');
      assert.ok(root.innerHTML.includes('Select a chapter to begin reading.'), 'default is read mode');
      console.log('PASS: shell #213 — default (no switch) is read mode');
    } finally { restoreDom(orig); }
  }
  {
    const { dom, orig } = installDom();
    const { factory, s } = makeFactory();
    try {
      dom.window.document.getElementById('root').setAttribute('data-enscribe-edit', 'false');
      await mountLiveShell('#root', 'master-book.emd', { editorFactory: factory });
      assert.strictEqual(s.builds, 0, 'data-enscribe-edit="false" → read (explicit off)');
      console.log('PASS: shell #213 — data-enscribe-edit="false" stays read mode');
    } finally { restoreDom(orig); }
  }

  console.log('All configurable live-shell host-switch (#213) checks passed.');
}
