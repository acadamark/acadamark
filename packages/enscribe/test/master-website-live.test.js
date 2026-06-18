// Live app-shell WEBSITE render — browser entry smoke (#246 S2a).
//
// Drives the REAL browser entry (mountLiveWebsite + the mountLiveShell dispatch) end-to-end in
// a jsdom document against a stubbed fetch (no network; the master + page `.emd` served off disk),
// proving the full live path: harvest the nav model → fetch the external pages → assemble + one
// global pass → mount the first page → navigate by `?page=` (click + popstate) → render lazily,
// with a cross-page `<ref>` rewritten to `?page=owner#anchor`. The website is LIVE-ONLY (no static
// golden), so this jsdom test is the reviewed snapshot.

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
};

// A jsdom window + a fetch stub serving the master + page `.emd` by filename (404 otherwise).
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
// Back/forward: pushState the new search, then fire popstate (pushState does NOT fire it itself).
function popTo(dom, search) {
  dom.window.history.pushState(null, '', search);
  dom.window.dispatchEvent(new dom.window.Event('popstate'));
}
// Internal-nav click on a `?page=` link (the delegated handler intercepts it).
function clickLink(dom, root, href) {
  const a = [...root.querySelectorAll('a')].find((x) => x.getAttribute('href') === href);
  assert.ok(a, `a link with href="${href}" is present`);
  a.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

export async function run() {
  // ── mount + initial route: first page; persistent chrome; cross-page ref rewrite ──
  {
    const { dom, orig } = installDom();
    try {
      const root = await mountLiveWebsite('#root', MASTER);
      assert.strictEqual(root, dom.window.document.getElementById('root'), 'mountLiveWebsite returns the mounted element');
      assert.ok(root.querySelector('nav.enscribe-website-nav'), 'the minimal website nav is mounted');
      assert.ok(root.querySelector('[data-enscribe-content]'), 'a persistent content region exists');
      assert.ok(root.innerHTML.includes('Welcome to the site'), 'empty ?page= lands on the FIRST page (Home)');
      assert.ok(root.innerHTML.includes('href="?page=guide#sec:install"'),
        'a cross-page <ref @sec:install> is rewritten to ?page=guide#sec:install (owner=guide ≠ home)');
      assert.strictEqual(dom.window.location.search, '?page=home',
        'the initial URL is normalized to ?page=home via replaceState');
      console.log('PASS: #246 S2a — mountLiveWebsite lands on the first page; cross-page ref → ?page=owner#anchor');

      // ── internal ?page= click: swaps ONLY the content region; chrome persists ──
      const navBefore = root.querySelector('nav.enscribe-website-nav');
      clickLink(dom, root, '?page=guide');
      assert.ok(root.innerHTML.includes('Installation') && root.innerHTML.includes('id="sec:install"'),
        'clicking ?page=guide lazily renders the Guide page (its #sec:install)');
      assert.strictEqual(root.querySelector('nav.enscribe-website-nav'), navBefore,
        'the nav chrome is NOT re-rendered on a page swap (only the content region swaps)');
      assert.strictEqual(dom.window.location.search, '?page=guide', 'the internal click pushState set ?page=guide');
      console.log('PASS: S2a — internal ?page= nav swaps the content region; persistent chrome survives');

      // ── back/forward (popstate) re-routes; the visited page re-mounts (cache) ──
      popTo(dom, '?page=home');
      assert.ok(root.innerHTML.includes('Welcome to the site'), 'popstate to ?page=home re-renders Home');
      console.log('PASS: S2a — popstate (back/forward) re-routes by ?page=');

      // ── unknown slug → a visible not-found view (not blank, not a silent redirect) ──
      popTo(dom, '?page=nope');
      assert.ok(root.innerHTML.includes('Page not found'), 'an unknown ?page= renders the not-found view');
      console.log('PASS: S2a — an unknown ?page= slug renders a visible not-found view');
    } finally {
      restoreDom(orig);
    }
  }

  // ── deep-link on first load: ?page=guide#sec:install mounts Guide ──
  {
    const { dom, orig } = installDom('https://example.com/site/?page=guide#sec:install');
    try {
      const root = await mountLiveWebsite('#root', MASTER);
      assert.ok(root.innerHTML.includes('Installation') && root.innerHTML.includes('id="sec:install"'),
        'a ?page=guide#anchor deep-link mounts the Guide page on first load');
      console.log('PASS: S2a — a ?page=…#anchor deep-link mounts the right page on first load');
    } finally {
      restoreDom(orig);
    }
  }

  // ── mountLiveShell routes a <meta type=website> master to mountLiveWebsite (the 3-way dispatch) ──
  {
    const { dom, orig } = installDom();
    try {
      const root = await mountLiveShell('#root', 'master-website.emd');
      assert.ok(root.querySelector('nav.enscribe-website-nav'),
        'mountLiveShell dispatches type=website → mountLiveWebsite (masterType)');
      console.log('PASS: S2a — mountLiveShell routes type=website → mountLiveWebsite (3-way dispatch)');
    } finally {
      restoreDom(orig);
    }
  }

  console.log('All live website render (#246 S2a) browser-entry checks passed.');
}
