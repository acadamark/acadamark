// Live app-shell book render — browser entry smoke (live track, L2 — #208).
//
// Drives the REAL browser entry (mountLiveBook) end-to-end in a jsdom document against a
// stubbed fetch (no live network; the master + child `.emd` served off disk), proving the
// full live path: fetch the master → assemble its chapter children → run the global pass
// → mount the chapter from the `?chapter=` route → navigate → render lazily.
//
// This is the "your eyes" check made deterministic: it confirms a chapter renders LIVE
// from source (no pre-baked page involved), the chrome routes between chapters by the
// chapter-as-page scheme (a CLICK on a `?chapter=` rail link is intercepted as SPA nav;
// back/forward replays via popstate), a section deep-link `?chapter=<stem>#<id>` lands on
// the chapter with the section present (the capability this slice unblocks), and a
// cross-chapter reference routes to its owning chapter. Byte-level content correctness is
// pinned separately by live-book-parity.test.js (Node-level); this proves the DOM mount +
// router wiring actually runs.

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
    location: global.location, history: global.history, fetch: global.fetch,
  };
  global.window = dom.window;
  global.document = dom.window.document;
  // location/history are non-configurable accessors on global in some runtimes; assign via
  // defineProperty so the bare `location`/`history` the router reads resolve to jsdom's. history is
  // required now that chapter nav is the `?chapter=` route (the click interceptor pushState's it).
  Object.defineProperty(global, 'location', { value: dom.window.location, configurable: true, writable: true });
  Object.defineProperty(global, 'history', { value: dom.window.history, configurable: true, writable: true });
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
  Object.defineProperty(global, 'history', { value: orig.history, configurable: true, writable: true });
  global.fetch = orig.fetch;
}

// Navigate by setting the URL (pushState) and firing popstate — the deep-link / back-forward path the
// standalone router listens on. The chapter is the `?chapter=` query; `hash` (optional) is the section
// anchor. `search` like '?chapter=stem' or '?' (cover).
function goto(dom, search, hash = '') {
  dom.window.history.pushState(null, '', `${search}${hash}`);
  dom.window.dispatchEvent(new dom.window.Event('popstate'));
}
// Click a route link in the mounted DOM — exercises the REAL query-nav interceptor (bindRouteNav):
// a `?chapter=` rail/ref link is intercepted (no reload), pushState + route. Picks the first link whose
// href starts with `hrefPrefix`.
function clickRouteLink(dom, root, hrefPrefix) {
  const a = [...root.querySelectorAll('a[href^="?"]')]
    .find((x) => (x.getAttribute('href') || '').startsWith(hrefPrefix));
  assert.ok(a, `a route link starting with "${hrefPrefix}" exists to click`);
  a.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

export async function run() {
  const { dom, orig } = installDom();
  try {
    // ── initial mount: no chapter → the COVER (#209) renders live ─────────────────────
    const root = await mountLiveBook('#root', BOOK_MASTER);
    assert.strictEqual(root, dom.window.document.getElementById('root'),
      'mountLiveBook returns the mounted element');
    assert.ok(root.querySelector('nav.enscribe-chapter-rail'),
      'the left chapter rail is mounted (C\'s chrome)');
    assert.ok(root.innerHTML.includes('Select a chapter to begin reading.'),
      'no ?chapter= lands on the COVER (the lede), not a chapter');
    assert.ok(root.innerHTML.includes('Field Methods in Savanna Ecology'),
      'the cover renders the book-title hero');
    assert.ok(!root.querySelector('book-part'),
      'the cover has no chapter content (no <book-part>)');
    assert.ok(root.querySelector('a.enscribe-book-home'),
      'the cover carries the return-to-cover masthead');
    assert.ok(root.innerHTML.includes('<a href="?chapter=counting-elephants"'),
      'the rail links chapters by the ?chapter= route (standalone: no ?page=)');
    console.log('PASS: L2/#209 — mountLiveBook lands on the cover (book title + lede + masthead + rail)');

    // ── CLICK a rail chapter link: the interceptor makes it SPA nav (no reload), renders lazily ──
    clickRouteLink(dom, root, '?chapter=estimating-browse-pressure');
    assert.ok(root.querySelector('book-part') && root.innerHTML.includes('id="fig:browse"'),
      'clicking the chapter-2 rail link lazily renders chapter 2 (its own fig:browse)');
    assert.ok(root.innerHTML.includes('<a href="?chapter=counting-elephants#fig:transect" class="ref">figure 1.1</a>'),
      'chapter 2\'s cross-chapter ref is the owning chapter route + section anchor (?chapter=<owner>#<id>)');
    assert.ok(root.innerHTML.includes('enscribe-toc-active'),
      'the rail marks the current chapter active');
    assert.strictEqual(dom.window.location.search, '?chapter=estimating-browse-pressure',
      'the click pushed the ?chapter= route into the URL (a history entry — Back walks chapters)');
    console.log('PASS: L2 — a rail-link click is intercepted as ?chapter= SPA nav and renders the chapter');

    // ── page-owns-convergence: the live book chapter SHIPS its rail animators ──────────
    assert.ok([...root.querySelectorAll('script')].some((s) => /IntersectionObserver/.test(s.textContent)),
      'the live book chapter carries its scroll-spy script (page-owned interactivity — not shell-injected)');
    console.log('PASS: page-owns — the live book chapter ships its scroll-spy/on-this-page script with its rail');

    // ── THE UNBLOCKED CAPABILITY: a SECTION deep-link `?chapter=<stem>#<id>` lands on the chapter ──
    // with the section present — chapter (query) and section (hash) coexist (the whole point of the slice).
    goto(dom, '?chapter=estimating-browse-pressure', '#fig:browse');
    assert.ok(root.querySelector('book-part') && root.querySelector('#fig\\:browse'),
      'a section deep-link loads the chapter AND the section element is present (deep-linkable section)');
    console.log('PASS: chapter-as-page — a section deep-link ?chapter=<stem>#<id> loads the chapter with the section');

    // ── a cross-chapter ref routes to its OWNING chapter + section and mounts it ───────
    goto(dom, '?chapter=counting-elephants', '#fig:transect');
    assert.ok(root.innerHTML.includes('id="fig:transect"'),
      'the cross-chapter route mounts chapter 1 (the owner) — the figure is present');
    assert.ok(root.innerHTML.includes('Counting Elephants'),
      'the owning chapter (Counting Elephants) is the one mounted');
    console.log('PASS: L2 — a cross-chapter ref routes to its owning chapter + section and mounts it');

    // ── graceful fallback: a bare section hash with NO chapter resolves to its owning chapter ──
    goto(dom, '?', '#fig:transect');
    assert.ok(root.innerHTML.includes('id="fig:transect"') && root.innerHTML.includes('Counting Elephants'),
      'a chapterless #section falls back to its owning chapter (old #id deep-links still land)');
    console.log('PASS: L2 — a chapterless section hash falls back to its owning chapter');

    // ── lazy cache: returning to a visited chapter still renders it ───────────────────
    goto(dom, '?chapter=estimating-browse-pressure');
    assert.ok(root.innerHTML.includes('id="fig:browse"'),
      'returning to a previously-rendered chapter renders it again (cache hit)');
    console.log('PASS: L2 — chapters render lazily and cached views re-mount on return');

    // ── round-trip (#209): the masthead route (its href="?") returns to the cover ─────
    const masthead = root.querySelector('a.enscribe-book-home');
    assert.strictEqual(masthead.getAttribute('href'), '?', 'the masthead cover-route href is ? (no chapter)');
    masthead.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.ok(root.innerHTML.includes('Select a chapter to begin reading.') && !root.querySelector('book-part'),
      'following the masthead (cover route, ?) from a chapter returns to the cover');
    console.log('PASS: L2/#209 — a chapter round-trips to the cover via the masthead route');
  } finally {
    restoreDom(orig);
  }

  console.log('All live app-shell book render (L2) browser-entry smoke checks passed.');
}
