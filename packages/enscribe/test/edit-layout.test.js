// #435 — the edit-layout toggle (stacked ↔ side-by-side), the DOM + persistence half.
//
// Edit layout is a UI/SHELL setting (Ariel, 2026-07-16), NOT a <config> setting: ephemeral viewer state,
// persisted per-origin in localStorage like the reader tier, never written to the document. This gate
// drives the standalone ARTICLE edit surface through mountLiveShell (the same fake-adapter jsdom harness
// live-article-shell.test.js uses) and proves: the layout toggle rides the corner in edit mode; clicking
// it flips the split class + persists; the choice HOLDS across a reload (a fresh mount re-applies it); and
// a BOOK edit surface is deliberately excluded (no toggle, non-splittable edit-main) — the reported gap,
// enforced. Geometry (the two-column layout + the responsive collapse + corner clearance) is a real-
// browser check in packages/cli/test/arrows-clearance.test.js (jsdom has no layout engine).

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { mountLiveShell } from '../src/interpreter/browser.js';

const ARTICLE = [
  '<meta type=article>', '<title | Layout Toggle Smoke>', '</meta>', '',
  '<section | Model>', '', 'A paragraph of body text.',
].join('\n');
const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-book');
const readBook = (name) => readFileSync(join(BOOK_DIR, name), 'utf8');
const SERVED = {
  'article.emd': ARTICLE,
  ...Object.fromEntries(
    ['master-book.emd', 'preface.emd', 'chapter-1.emd', 'chapter-2.emd', 'appendix.emd'].map((n) => [n, readBook(n)]),
  ),
};

// A shared localStorage mock — it PERSISTS across the fresh doms below, so a "reload" (a new mount over a
// new document) sees the choice the prior session stored. (jsdom's per-dom window.localStorage would reset.)
function makeSharedStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
}

function installDom(storage) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url: 'https://example.com/doc/' });
  const orig = { window: global.window, document: global.document, location: global.location, fetch: global.fetch, localStorage: global.localStorage };
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, 'location', { value: dom.window.location, configurable: true, writable: true });
  Object.defineProperty(global, 'localStorage', { value: storage, configurable: true, writable: true });
  // The engine reads `localStorage` (global) and `window.localStorage` in different spots; point both at the shared mock.
  Object.defineProperty(dom.window, 'localStorage', { value: storage, configurable: true });
  global.fetch = async (url) => {
    const name = String(url).split('/').pop();
    return Object.prototype.hasOwnProperty.call(SERVED, name)
      ? { ok: true, status: 200, statusText: 'OK', text: async () => SERVED[name] }
      : { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
  };
  return { dom, orig };
}
function restoreDom(orig) {
  global.window = orig.window;
  global.document = orig.document;
  Object.defineProperty(global, 'location', { value: orig.location, configurable: true, writable: true });
  Object.defineProperty(global, 'localStorage', { value: orig.localStorage, configurable: true, writable: true });
  global.fetch = orig.fetch;
}
function makeFactory() {
  const s = { mounts: 0 };
  const factory = async () => ({ mount(el) { s.mounts += 1; el.setAttribute('data-editor-mounted', '1'); return { destroy() {} }; } });
  return { factory, s };
}

const LAYOUT_KEY = 'enscribe:edit-layout';
const toggleBtn = () => document.querySelector('[data-enscribe-layout-toggle]');
const editMain = () => document.querySelector('.enscribe-edit-main--splittable');
const isSplit = () => !!document.querySelector('.enscribe-edit-main--split');

export async function run() {
  const storage = makeSharedStorage();

  // ── ARTICLE edit: the toggle rides the corner; a click flips split + persists ─────────────────────
  {
    const { orig } = installDom(storage);
    try {
      await mountLiveShell('#root', 'article.emd', { editorFactory: makeFactory().factory, edit: true, editDebounceMs: 0 });
      assert.ok(toggleBtn(), 'edit mode on an article → the layout toggle renders in the (floating) corner');
      assert.ok(editMain(), 'the article edit view is split-CAPABLE (--splittable)');
      assert.equal(isSplit(), false, 'default is the STACKED view (no --split) — no surprise for existing users');
      assert.equal(toggleBtn().getAttribute('aria-pressed'), 'false', 'the toggle starts un-pressed');

      toggleBtn().click();   // → side-by-side
      assert.equal(isSplit(), true, 'clicking the toggle switches the edit view to SPLIT (--split on the edit-main)');
      assert.equal(storage.getItem(LAYOUT_KEY), 'split', 'the choice is persisted per-origin in localStorage');
      assert.equal(toggleBtn().getAttribute('aria-pressed'), 'true', 'the toggle reflects the pressed (split) state');

      toggleBtn().click();   // → back to stacked
      assert.equal(isSplit(), false, 'clicking again returns to the STACKED view');
      assert.equal(storage.getItem(LAYOUT_KEY), 'stacked', 'the stacked choice is persisted too');
      console.log('PASS: #435 — the layout toggle flips split ↔ stacked on an article edit surface and persists each choice');
    } finally { restoreDom(orig); }
  }

  // ── PERSISTENCE across a reload: set split, then a FRESH mount re-applies it with no click ────────
  {
    storage.setItem(LAYOUT_KEY, 'split');            // as if a prior session left it side-by-side
    const { orig } = installDom(storage);            // a fresh document = a reload
    try {
      await mountLiveShell('#root', 'article.emd', { editorFactory: makeFactory().factory, edit: true, editDebounceMs: 0 });
      assert.equal(isSplit(), true, 'a reload re-applies the persisted SPLIT layout on the fresh edit view (no click needed)');
      assert.equal(toggleBtn().getAttribute('aria-pressed'), 'true', 'the reloaded toggle reflects the persisted split state');
      console.log('PASS: #435 — the persisted layout HOLDS across a reload (toggle → reload → still side-by-side)');
    } finally { restoreDom(orig); }
  }

  // ── localStorage UNAVAILABLE (private mode / storage off): the toggle still flips BOTH ways in-session ─
  //    (it derives the next state from the applied DOM, not a read-back that would always report stacked) ──
  {
    const throwingStorage = { getItem: () => { throw new Error('storage off'); }, setItem: () => { throw new Error('storage off'); }, removeItem: () => {}, clear: () => {} };
    const { orig } = installDom(throwingStorage);
    try {
      await mountLiveShell('#root', 'article.emd', { editorFactory: makeFactory().factory, edit: true, editDebounceMs: 0 });
      assert.equal(isSplit(), false, 'storage off → still defaults to stacked (readEditLayout degrades to stacked)');
      toggleBtn().click();
      assert.equal(isSplit(), true, 'storage off → a click still switches to split (state read from the DOM, not the store)');
      toggleBtn().click();
      assert.equal(isSplit(), false, 'storage off → a second click still returns to stacked (the toggle is not one-way)');
      console.log('PASS: #435 — the toggle flips both ways in-session even with localStorage unavailable (no stuck-on)');
    } finally { restoreDom(orig); }
  }

  // ── BOOK edit: the deliberate GAP — a book chapter edit-main is nested in the 3-col reading column,
  //    so it is NOT split-capable and gets NO toggle (a competing-grid rebuild, out of this slice) ──
  {
    storage.setItem(LAYOUT_KEY, 'split');            // even with split persisted…
    const { orig } = installDom(storage);
    try {
      await mountLiveShell('#root', 'master-book.emd', { editorFactory: makeFactory().factory, edit: true, editDebounceMs: 0 });
      assert.ok(!toggleBtn(), 'a BOOK edit surface renders NO layout toggle (split is article-only — the reported gap)');
      assert.ok(!editMain(), 'the book chapter edit-main is NOT --splittable, so the persisted split can never apply to it');
      console.log('PASS: #435 — the layout toggle is absent on a book edit surface (the competing-grid gap, enforced structurally)');
    } finally { restoreDom(orig); }
  }

  console.log('All edit-layout toggle (#435) DOM + persistence checks passed.');
}
