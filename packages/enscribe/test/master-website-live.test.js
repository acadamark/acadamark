// Live app-shell WEBSITE render — browser entry smoke (#246 S2a engine + S2b chrome).
//
// Drives the REAL browser entry (mountLiveWebsite + the mountLiveShell dispatch) end-to-end in a
// jsdom document against a stubbed fetch (no network; the master + page/footer `.emd` served off
// disk). S2a: harvest the nav model → fetch external pages → one global pass → ?page= router (click
// + popstate + deep-link + not-found), cross-page <ref> → ?page=owner#anchor. S2b: the persistent
// chrome — brand (meta title + icon), the <nav-group> dropdown, the sidebar (group as a non-link
// label), aria-current moving on nav, the site-wide footer surviving a swap, the on-this-page rail.
// The website is LIVE-ONLY (no static golden), so this jsdom test is the reviewed snapshot.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { mountLiveWebsite, mountLiveShell } from '../src/interpreter/browser.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-website');
const read = (n) => readFileSync(join(DIR, n), 'utf8');
const MASTER = read('master-website.emd');
const FILES = {
  'master-website.emd': MASTER,
  'home.emd': read('home.emd'),
  'guide.emd': read('guide.emd'),
  'reference.emd': read('reference.emd'),
  'footer.emd': read('footer.emd'),
};

function installDom(url = 'https://example.com/site/') {
  // jsdom does not implement window.scrollTo (the scroll-to-top on a bare page swap); swallow that
  // "Not implemented" jsdomError, but re-throw any REAL error so a genuine fault still fails the test.
  const vc = new VirtualConsole();
  vc.on('jsdomError', (err) => { if (!/Not implemented/.test(err && err.message)) throw err; });
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url, virtualConsole: vc });
  const orig = {
    window: global.window, document: global.document,
    location: global.location, history: global.history, fetch: global.fetch,
  };
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, 'location', { value: dom.window.location, configurable: true, writable: true });
  Object.defineProperty(global, 'history', { value: dom.window.history, configurable: true, writable: true });
  global.fetch = async (u) => {
    const name = String(u).split('/').pop().split('?')[0];
    if (Object.prototype.hasOwnProperty.call(FILES, name)) {
      return { ok: true, status: 200, statusText: 'OK', text: async () => FILES[name] };
    }
    return { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
  };
  return { dom, orig };
}
function restoreDom(orig) {
  global.window = orig.window;
  global.document = orig.document;
  Object.defineProperty(global, 'location', { value: orig.location, configurable: true, writable: true });
  Object.defineProperty(global, 'history', { value: orig.history, configurable: true, writable: true });
  global.fetch = orig.fetch;
}
function popTo(dom, search) {
  dom.window.history.pushState(null, '', search);
  dom.window.dispatchEvent(new dom.window.Event('popstate'));
}
function clickLink(dom, root, href) {
  const a = [...root.querySelectorAll('a')].find((x) => x.getAttribute('href') === href);
  assert.ok(a, `a link with href="${href}" is present`);
  a.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
}
const activeHref = (root) => {
  const a = root.querySelector('.enscribe-site-header a[aria-current="page"], .enscribe-site-sidebar a[aria-current="page"]');
  return a && a.getAttribute('href');
};
// A fake editor adapter (like the article edit tests): captures each mount's value/onChange, reflects
// the value into the pane, and tracks destroy() so a re-mount on page nav is observable.
function makeEditorStub() {
  const mounts = [];
  return {
    mounts,
    get last() { return mounts[mounts.length - 1]; },
    editor: {
      mount(el, { value, onChange }) {
        const handle = { el, value, onChange, destroyed: false, destroy() { this.destroyed = true; } };
        el.textContent = value;
        mounts.push(handle);
        return handle;
      },
    },
  };
}
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

export async function run() {
  // ── mount: chrome (brand + dropdown + sidebar + footer) + first-page content + cross-page ref ──
  {
    const { dom, orig } = installDom();
    try {
      const root = await mountLiveWebsite('#root', MASTER);
      // Brand from <meta> (title + icon), not hardcoded.
      const brand = root.querySelector('.enscribe-site-header .enscribe-site-brand');
      assert.ok(brand && /Demo Site/.test(brand.textContent), 'brand shows the <meta> title');
      assert.ok(root.querySelector('.enscribe-site-brand-icon[src="logo.png"]'), 'brand shows the <meta icon>');
      // Top bar: the <nav-group> "Docs" is a dropdown.
      const toggle = root.querySelector('.enscribe-site-dropdown-toggle');
      assert.ok(toggle && /Docs/.test(toggle.textContent), 'a <nav-group> renders a top-bar dropdown toggle');
      // Sidebar (ON-path): the master opts in via <config sidebar> (S1.5 — default OFF). The group is
      // a NON-LINK label; its child pages are links.
      const sidebar = root.querySelector('.enscribe-site-sidebar');
      assert.ok(sidebar, 'the opted-in sidebar is mounted');
      const groupLabel = [...sidebar.querySelectorAll('.enscribe-nav-label')].find((s) => /Docs/.test(s.textContent));
      assert.ok(groupLabel && groupLabel.tagName === 'SPAN', 'the sidebar renders the group as a non-link <span> label (not an <a>)');
      assert.ok([...sidebar.querySelectorAll('a')].some((a) => a.getAttribute('href') === '?page=guide'), 'the sidebar nests the group\'s page links');
      // First-page content + the cross-page ref rewrite.
      assert.ok(root.querySelector('[data-enscribe-content]').innerHTML.includes('Welcome to the site'), 'content lands on the first page');
      assert.ok(root.innerHTML.includes('href="?page=guide#sec:install"'), 'cross-page <ref> → ?page=guide#sec:install');
      // Footer: present, OUTSIDE the content region.
      const footer = root.querySelector('.enscribe-site-footer');
      assert.ok(footer && /Built with enscribe/.test(footer.textContent), '<footer src> renders site-wide');
      assert.ok(!root.querySelector('[data-enscribe-content] .enscribe-site-footer'), 'the footer is OUTSIDE the content region');
      // aria-current on the active (Home) page.
      assert.strictEqual(activeHref(root), '?page=home', 'aria-current marks the active page (Home)');
      console.log('PASS: S2b — brand (meta title+icon), <nav-group> dropdown + non-link sidebar label, footer, aria-current');

      // ── dropdown opens on click ──
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'false', 'dropdown starts closed');
      toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(toggle.getAttribute('aria-expanded'), 'true', 'clicking the toggle opens the dropdown');
      assert.strictEqual(toggle.nextElementSibling.hidden, false, 'the dropdown panel is shown');
      console.log('PASS: S2b — the top-bar dropdown opens on click');

      // ── internal nav: content swaps, chrome (header + footer) PERSISTS, aria-current moves ──
      const headerBefore = root.querySelector('.enscribe-site-header');
      const footerBefore = root.querySelector('.enscribe-site-footer');
      clickLink(dom, root, '?page=guide');
      assert.ok(root.querySelector('[data-enscribe-content]').innerHTML.includes('Installation'), 'clicking ?page=guide swaps the content to Guide');
      assert.strictEqual(root.querySelector('.enscribe-site-header'), headerBefore, 'the top bar is NOT rebuilt on a page swap (persistent chrome)');
      assert.strictEqual(root.querySelector('.enscribe-site-footer'), footerBefore, 'the footer survives the page swap (same element)');
      assert.strictEqual(activeHref(root), '?page=guide', 'aria-current moved to Guide');
      console.log('PASS: S2b — content-region swap; persistent header + footer; aria-current moves');

      // ── on-this-page: a multi-heading page populates the rail ──
      clickLink(dom, root, '?page=reference');
      const otp = root.querySelector('[data-enscribe-onthispage]');
      assert.ok(otp && otp.querySelectorAll('li').length === 3, 'the on-this-page rail lists the page\'s three headings');
      assert.ok(/API Reference/.test(otp.textContent) && /Functions/.test(otp.textContent), 'on-this-page names the headings');
      console.log('PASS: S2b — the on-this-page rail rebuilds from the current page\'s headings');

      // ── popstate + unknown → not-found ──
      popTo(dom, '?page=home');
      assert.ok(root.querySelector('[data-enscribe-content]').innerHTML.includes('Welcome to the site'), 'popstate re-routes to Home');
      popTo(dom, '?page=nope');
      assert.ok(root.querySelector('[data-enscribe-content]').innerHTML.includes('Page not found'), 'an unknown ?page= renders not-found');
      console.log('PASS: S2a — popstate routing + unknown-slug not-found (intact under the chrome)');
    } finally {
      restoreDom(orig);
    }
  }

  // ── S1.5: the left sidebar is OFF by default — the off-path (no <config sidebar>) ──
  {
    const { dom, orig } = installDom();
    try {
      // A master WITHOUT <config sidebar> — the default. Same nav page (home.emd, served from FILES),
      // no opt-in: the chrome must mount with NO left sidebar, the top bar carrying the nav.
      const offMaster = [
        '<meta type=website>', '<title | Off Site>', '</meta>', '',
        '<nav>', '<item src="home.emd" | Home>', '</nav>',
      ].join('\n');
      const root = await mountLiveWebsite('#root', offMaster);
      assert.ok(root.querySelector('.enscribe-site-header'), 'the top bar (a website\'s primary nav) is always built');
      assert.ok(!root.querySelector('.enscribe-site-sidebar'),
        'a default master (no <config sidebar>) mounts NO left sidebar — the top bar is the only nav');
      assert.ok(root.querySelector('[data-enscribe-content]').innerHTML.includes('Welcome to the site'),
        'content still lands on the first page with the sidebar off');
      console.log('PASS: S1.5 — the left sidebar is OFF by default (a master opts in via <config sidebar>)');
    } finally {
      restoreDom(orig);
    }
  }

  // ── S2c: the per-page EDIT loop (editor adapter present) ──
  {
    const { dom, orig } = installDom();
    try {
      const stub = makeEditorStub();
      const root = await mountLiveWebsite('#root', MASTER, { editor: stub.editor, editDebounceMs: 0 });
      // The content region is the Write/Preview pane; the editor mounted with the FIRST page's SOURCE.
      const content = root.querySelector('[data-enscribe-content]');
      assert.ok(content.querySelector('[data-edit-tab]') && content.querySelector('[data-edit-pane="source"]'),
        'edit mode renders the Write/Preview pane in the content region');
      assert.ok(stub.last && /Welcome to the site/.test(stub.last.value),
        'the editor mounted with the current page (Home) SOURCE');
      assert.ok(content.querySelector('[data-edit-pane="preview"]').innerHTML.includes('Welcome to the site'),
        'the preview pane shows the rendered page');
      // The chrome is built around the edit pane (persistent).
      const headerBefore = root.querySelector('.enscribe-site-header');
      assert.ok(headerBefore, 'the chrome (top bar) wraps the edit pane');
      console.log('PASS: S2c — edit mode mounts the current page source + a rendered preview inside the chrome');

      // onChange re-renders the preview (standalone), debounced.
      stub.last.onChange('<section | Edited>\n\nBrand new content here.');
      await tick();
      assert.ok(root.querySelector('[data-edit-pane="preview"]').innerHTML.includes('Brand new content here'),
        'onChange(newSource) re-renders the preview (standalone)');
      console.log('PASS: S2c — onChange re-renders the preview');

      // Nav while editing: load the NEW page's source; the chrome persists; the prior editor re-mounts.
      const priorMount = stub.last;
      clickLink(dom, root, '?page=guide');
      assert.ok(stub.last !== priorMount && /Installation/.test(stub.last.value),
        'a ?page= nav loads the NEW page (Guide) source into the editor');
      assert.strictEqual(priorMount.destroyed, true, 'the prior page editor was destroyed on nav');
      assert.strictEqual(root.querySelector('.enscribe-site-header'), headerBefore,
        'the chrome (top bar) is the SAME element across the edit-mode nav (persistent)');
      console.log('PASS: S2c — nav-while-editing swaps the page source; chrome + editor adapter persist');
    } finally { restoreDom(orig); }
  }

  // ── S2c regression: a pending preview re-render must NOT leak into the next page (debounce cancelled on nav) ──
  {
    const { dom, orig } = installDom();
    try {
      const stub = makeEditorStub();
      const root = await mountLiveWebsite('#root', MASTER, { editor: stub.editor, editDebounceMs: 50 });
      stub.last.onChange('<section | Home>\n\nUNIQUE-HOME-MARKER content.');   // type on Home …
      clickLink(dom, root, '?page=guide');                                     // … then nav BEFORE the 50ms debounce fires
      await tick(80);                                                          // let the (cancelled) timer window pass
      const preview = root.querySelector('[data-edit-pane="preview"]').innerHTML;
      assert.ok(!/UNIQUE-HOME-MARKER/.test(preview), 'a pending Home preview re-render does NOT leak into the Guide pane');
      assert.ok(/Installation/.test(preview), 'the Guide preview is intact');
      console.log('PASS: S2c — a pending preview re-render is cancelled on nav (no cross-page leak)');
    } finally { restoreDom(orig); }
  }

  // ── deep-link on first load + mountLiveShell dispatch ──
  {
    const { dom, orig } = installDom('https://example.com/site/?page=guide#sec:install');
    try {
      const root = await mountLiveWebsite('#root', MASTER);
      assert.ok(root.querySelector('[data-enscribe-content]').innerHTML.includes('Installation'), 'a ?page=guide#anchor deep-link mounts Guide');
      console.log('PASS: S2a — ?page=…#anchor deep-link mounts the right page on first load');
    } finally { restoreDom(orig); }
  }
  {
    const { dom, orig } = installDom();
    try {
      const root = await mountLiveShell('#root', 'master-website.emd');
      assert.ok(root.querySelector('.enscribe-site-header'), 'mountLiveShell dispatches type=website → mountLiveWebsite (chrome present)');
      console.log('PASS: S2a — mountLiveShell routes type=website → mountLiveWebsite');
    } finally { restoreDom(orig); }
  }
  // ── S2c: mountLiveShell builds the editor + dispatches a website to the edit loop (+ the no-factory throw) ──
  {
    const { dom, orig } = installDom();
    try {
      const stub = makeEditorStub();
      let builds = 0;
      const root = await mountLiveShell('#root', 'master-website.emd', { edit: true, editorFactory: () => { builds++; return stub.editor; } });
      assert.strictEqual(builds, 1, 'mountLiveShell builds the editor once for a website + ?edit');
      assert.ok(root.querySelector('[data-enscribe-content] [data-edit-pane="source"]'), 'the website edit pane renders via the shell');
      assert.ok(stub.last && /Welcome to the site/.test(stub.last.value), 'the editor mounted the first page source');
      console.log('PASS: S2c — mountLiveShell builds the editor + dispatches a website to the edit loop');
      // edit:true but NO editorFactory → throws, the SAME contract as book/article.
      await assert.rejects(
        mountLiveShell('#root', 'master-website.emd', { edit: true }),
        /editorFactory/,
        'website + ?edit with no editorFactory throws',
      );
      console.log('PASS: S2c — website + ?edit with no editorFactory throws (same as book/article)');
    } finally { restoreDom(orig); }
  }

  console.log('All live website render (#246 S2a engine + S2b chrome) browser-entry checks passed.');
}
