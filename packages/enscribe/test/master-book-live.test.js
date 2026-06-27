// Live app-shell book render — browser entry smoke (live track, L2 — #208).
//
// Drives the REAL browser entry (mountLiveBook) end-to-end in a jsdom document against a
// stubbed fetch (no live network; the master + child `.emd` served off disk), proving the
// full live path: fetch the master → assemble its chapter children → run the global pass
// → mount the current chapter from the URL hash → navigate (hashchange) → render lazily.
//
// This is the "your eyes" check made deterministic: it confirms a chapter renders LIVE
// from source (no pre-baked page involved), the chrome routes between chapters by hash,
// and a cross-chapter reference routes to its owning chapter. The byte-level content
// correctness is pinned separately by live-book-parity.test.js (Node-level); this proves
// the DOM mount + router wiring actually runs.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';
import { mountLiveBook } from '../src/interpreter/browser.js';

const BOOK_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'master-book');
const readBook = (name) => readFileSync(join(BOOK_DIR, name), 'utf8');
const BOOK_MASTER = readBook('master-book.emd');
const CHILDREN = {
  'preface.emd': readBook('preface.emd'),
  'chapter-1.emd': readBook('chapter-1.emd'),
  'chapter-2.emd': readBook('chapter-2.emd'),
  'appendix.emd': readBook('appendix.emd'),
};

// A jsdom window + a fetch stub serving the child `.emd` by filename (404 otherwise). The
// globals mountLiveBook reads (document / location / window / fetch) are set from it.
function installDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'https://example.com/book/',
  });
  const orig = {
    window: global.window, document: global.document,
    location: global.location, fetch: global.fetch,
  };
  global.window = dom.window;
  global.document = dom.window.document;
  // location is a non-configurable accessor on global in some runtimes; assign via
  // defineProperty so the bare `location` mountLiveBook reads resolves to jsdom's.
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

// Set the hash and fire hashchange synchronously (jsdom may also queue one — idempotent:
// the router keys off the current hash and a same-chapter route is a cache hit).
function navigate(dom, hash) {
  dom.window.location.hash = hash;
  dom.window.dispatchEvent(new dom.window.Event('hashchange'));
}

export async function run() {
  const { dom, orig } = installDom();
  try {
    // ── initial mount: empty hash → the COVER (#209) renders live ─────────────────────
    const root = await mountLiveBook('#root', BOOK_MASTER);
    assert.strictEqual(root, dom.window.document.getElementById('root'),
      'mountLiveBook returns the mounted element');
    assert.ok(root.querySelector('nav.enscribe-chapter-rail'),
      'the left chapter rail is mounted (C\'s chrome)');
    assert.ok(root.innerHTML.includes('Select a chapter to begin reading.'),
      'the empty hash lands on the COVER (the lede), not a chapter');
    assert.ok(root.innerHTML.includes('Field Methods in Savanna Ecology'),
      'the cover renders the book-title hero');
    assert.ok(!root.querySelector('book-part'),
      'the cover has no chapter content (no <book-part>)');
    assert.ok(root.querySelector('a.enscribe-book-home'),
      'the cover carries the return-to-cover masthead');
    assert.ok(root.innerHTML.includes('<a href="#counting-elephants"'),
      'the rail links chapters by hash route (#stem)');
    console.log('PASS: L2/#209 — mountLiveBook lands on the cover (book title + lede + masthead + rail)');

    // ── navigate to chapter 2 by hash: it renders lazily, with its cross-chapter ref ──
    navigate(dom, '#estimating-browse-pressure');
    assert.ok(root.querySelector('book-part') && root.innerHTML.includes('id="fig:browse"'),
      'navigating to #2-… lazily renders chapter 2 (its own fig:browse)');
    assert.ok(root.innerHTML.includes('<a href="#fig:transect" class="ref">figure 1.1</a>'),
      'chapter 2\'s cross-chapter ref renders "figure 1.1" as a bare #anchor (router-resolved)');
    assert.ok(root.innerHTML.includes('enscribe-toc-active'),
      'the rail marks the current chapter active');
    assert.ok(root.querySelector('a.enscribe-book-home'),
      'the chapter view carries the return-to-cover masthead');
    console.log('PASS: L2 — hash navigation lazily renders the target chapter with its chrome');

    // ── page-owns-convergence: the live book chapter SHIPS its rail animators ──────────
    // The chapter view carries the scroll-spy + on-this-page scripts WITH its rail, so the page owns
    // its interactivity (executeAssets runs them on mount; the shell injects none). Previously the live
    // book lost scrollspy because only the static/article paths injected the script.
    assert.ok([...root.querySelectorAll('script')].some((s) => /IntersectionObserver/.test(s.textContent)),
      'the live book chapter carries its scroll-spy script (page-owned interactivity — not shell-injected)');
    console.log('PASS: page-owns — the live book chapter ships its scroll-spy/on-this-page script with its rail');

    // ── a cross-chapter anchor routes to its OWNING chapter and mounts it ─────────────
    navigate(dom, '#fig:transect');
    assert.ok(root.innerHTML.includes('id="fig:transect"'),
      'navigating to #fig:transect mounts chapter 1 (the owner) — the figure is present');
    assert.ok(root.innerHTML.includes('Counting Elephants'),
      'the owning chapter (Counting Elephants) is the one mounted');
    console.log('PASS: L2 — a cross-chapter anchor routes to its owning chapter and mounts it');

    // ── lazy cache: returning to a visited chapter still renders it ───────────────────
    navigate(dom, '#estimating-browse-pressure');
    assert.ok(root.innerHTML.includes('id="fig:browse"'),
      'returning to a previously-rendered chapter renders it again (cache hit)');
    console.log('PASS: L2 — chapters render lazily and cached views re-mount on return');

    // ── round-trip (#209): the masthead route (its href="#") returns to the cover ─────
    navigate(dom, '#');                            // the masthead's cover-route href
    assert.ok(root.innerHTML.includes('Select a chapter to begin reading.') && !root.querySelector('book-part'),
      'following the masthead (cover route) from a chapter returns to the cover');
    console.log('PASS: L2/#209 — a chapter round-trips to the cover via the masthead route');
  } finally {
    restoreDom(orig);
  }

  console.log('All live app-shell book render (L2) browser-entry smoke checks passed.');
}
