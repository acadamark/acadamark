// #452 / #456 — the theme-family consumption guard (the settings.md §"rule that keeps it honest").
//
// The audit-consumption matrix found display settings written on a surface that read them nowhere.
// This fixture pins the READ end for the theme family on each surface where the setting APPLIES, so a
// future change that drops the read fails here:
//   - #452 cell E: a book's `<config theme>` reaches every separate-pages chapter page (pageShell) —
//     the compiler injected it at the document root but renderChapter/extractBookPart discarded it.
//   - #452 cell F: a website MASTER's `<config theme>` reaches every page's head (composeWebsiteShellPage).
//   - #456:        a website master's `<config sidebar>` builds the static site sidebar (parity with live).
// theme-variant is guarded by theme-variant-multipage.test.js (#431) + master-website-live.test.js (#443,
// the live website); the live-book theme (applyDocumentTheme) is asserted in this file (#471) via a
// jsdom mountLiveShell of a themed master. Byte-stability of the DEFAULT (no theme / no sidebar) is
// asserted here too: every branch keeps the unset case free of the new markup, so the committed
// goldens are untouched.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  publishBookPages,
  composeWebsiteShellPage,
  buildWebsiteSidebar,
  getThemeCss,
} from '../src/interpreter/index.js';
import { mountLiveShell } from '../src/interpreter/browser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOK_DIR = join(__dirname, 'fixtures', 'master-book');
const ASSETS_DIR = join(__dirname, 'fixtures', 'assets');

// A stable marker of the Tufte theme tokens (the theme CSS names itself, and retunes the serif to Palatino).
const TUFTE_MARK = /Palatino|Tufte theme/;

export async function run() {
  // ── #452 cell E — a book's <config theme> tokens reach every separate-pages chapter page ──────────
  {
    const base = readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8');
    const buildPages = (masterSource) => {
      const proc = buildEnscribePipeline({ assetsDir: ASSETS_DIR });
      const file = new VFile({ path: 'master-book.emd' });
      const tree = assembleMasterDocument({
        source: masterSource,
        readFile: (p) => readFileSync(p, 'utf8'),
        resolve: (rel) => join(BOOK_DIR, rel),
        parse: (s) => proc.parse(s),
      });
      const numbered = proc.runSync(tree, file);
      return publishBookPages({ numbered, file, proc, defaultCss: '/*c*/' });
    };

    const themed = buildPages(base.replace('<config number-sections />', '<config number-sections theme=tufte />'));
    assert.ok(themed.size >= 2, `the book emits its chapter pages (got ${themed.size})`);
    for (const [name, html] of themed) {
      assert.ok(TUFTE_MARK.test(html), `#452 cell E: book chapter ${name} carries its <config theme=tufte> tokens`);
    }

    const plain = buildPages(base);
    for (const [name, html] of plain) {
      assert.ok(!TUFTE_MARK.test(html), `default book chapter ${name} carries no theme tokens (byte-stable, no theme <style>)`);
    }
    console.log('PASS: #452 cell E — a book <config theme> tokens ride every separate-pages chapter page');
  }

  // ── #452 cell F — a website MASTER's <config theme> is injected into every page's head ─────────────
  {
    const withTheme = composeWebsiteShellPage({
      defaultCss: '/*c*/', title: 'T', topBar: '', content: '<p>x</p>', themeCss: getThemeCss('tufte'),
    });
    assert.ok(TUFTE_MARK.test(withTheme), '#452 cell F: the master theme CSS is injected into the website page head');
    const without = composeWebsiteShellPage({ defaultCss: '/*c*/', title: 'T', topBar: '', content: '<p>x</p>' });
    assert.ok(!TUFTE_MARK.test(without), 'no master theme ⇒ the website head is byte-unchanged (no theme <style>)');
    console.log('PASS: #452 cell F — a website master <config theme> themes every page (composeWebsiteShellPage head)');
  }

  // ── #456 — a website master's <config sidebar> builds the static site sidebar (parity with live) ───
  {
    const entries = [
      { slug: 'one', title: 'One', kind: 'page', children: [] },
      { slug: 'two', title: 'Two', kind: 'page', children: [] },
    ];
    const sidebar = buildWebsiteSidebar(entries);
    assert.ok(/<nav class="enscribe-site-sidebar"/.test(sidebar), 'buildWebsiteSidebar emits the site sidebar nav');

    const withSidebar = composeWebsiteShellPage({
      defaultCss: '/*c*/', title: 'T', topBar: '', content: '<p>x</p>', sidebar,
    });
    assert.ok(/<div class="enscribe-site-withsidebar">/.test(withSidebar),
      '#456: a static website page with <config sidebar> wraps content in .enscribe-site-withsidebar');
    assert.ok(/<nav class="enscribe-site-sidebar"/.test(withSidebar),
      '#456: the sidebar nav element is present in the static page (the READ end the live site already had)');

    const noSidebar = composeWebsiteShellPage({ defaultCss: '/*c*/', title: 'T', topBar: '', content: '<p>x</p>' });
    // Match the ELEMENTS, not the class strings — the site chrome CSS (`.enscribe-site-withsidebar` /
    // `.enscribe-site-sidebar` rules) is always in the head; only the DOM nodes are gated on the opt-in.
    assert.ok(!/<div class="enscribe-site-withsidebar">/.test(noSidebar) && !/<nav class="enscribe-site-sidebar"/.test(noSidebar),
      'default (no sidebar) ⇒ the single-column body is byte-unchanged (no sidebar wrapper or nav element)');
    console.log('PASS: #456 — <config sidebar> builds the static website sidebar; default stays single-column');
  }

  // ── #452 cell E (live half) / #471 — live book <config theme> injects #enscribe-doc-theme ──────────
  {
    const themedMaster = readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8')
      .replace('<config number-sections />', '<config number-sections theme=tufte />');
    const SERVED = Object.fromEntries(
      ['preface.emd', 'chapter-1.emd', 'chapter-2.emd', 'appendix.emd'].map((n) => [
        n, readFileSync(join(BOOK_DIR, n), 'utf8'),
      ]),
    );
    SERVED['master-book.emd'] = themedMaster;

    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      url: 'https://example.com/book/',
    });
    const orig = {
      window: global.window, document: global.document,
      location: global.location, history: global.history, fetch: global.fetch,
    };
    global.window = dom.window;
    global.document = dom.window.document;
    Object.defineProperty(global, 'location', { value: dom.window.location, configurable: true, writable: true });
    Object.defineProperty(global, 'history', { value: dom.window.history, configurable: true, writable: true });
    global.fetch = async (url) => {
      const name = String(url).split('/').pop();
      if (Object.prototype.hasOwnProperty.call(SERVED, name)) {
        return { ok: true, status: 200, statusText: 'OK', text: async () => SERVED[name] };
      }
      return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
    };
    try {
      await mountLiveShell('#root', 'master-book.emd', { edit: false });
      const style = document.getElementById('enscribe-doc-theme');
      assert.ok(style, '#471: live book mount injects #enscribe-doc-theme for <config theme=tufte>');
      assert.ok(TUFTE_MARK.test(style.textContent || ''),
        '#471: #enscribe-doc-theme carries the Tufte theme CSS tokens');
      console.log('PASS: #471 — live book <config theme=tufte> injects #enscribe-doc-theme head style');
    } finally {
      global.window = orig.window;
      global.document = orig.document;
      Object.defineProperty(global, 'location', { value: orig.location, configurable: true, writable: true });
      Object.defineProperty(global, 'history', { value: orig.history, configurable: true, writable: true });
      global.fetch = orig.fetch;
    }
  }
}
