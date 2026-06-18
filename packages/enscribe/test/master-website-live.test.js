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
      // Sidebar: the group is a NON-LINK label; its child pages are links.
      const sidebar = root.querySelector('.enscribe-site-sidebar');
      assert.ok(sidebar, 'the sidebar is mounted');
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

  console.log('All live website render (#246 S2a engine + S2b chrome) browser-entry checks passed.');
}
