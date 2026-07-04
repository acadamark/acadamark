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
  // #246 per-page numbering: a two-page site (Alpha / Beta), each multi-section with a figure + a
  // cross-page ref, exercising restart-per-page + cross-page resolution against per-page labels.
  'numbering-site.emd': read('numbering-site.emd'),
  'num-alpha.emd': read('num-alpha.emd'),
  'num-beta.emd': read('num-beta.emd'),
  // #314/#318: a website with a BOOK page (bookp, 2 chapters) + 2nd book (atlasp) + an article (artp), with
  // cross-page <ref>s in all four directions — the parity-effect proof that the live path now composes like
  // the static build (book-pages render AS books; cross-page refs read the target's NATIVE number).
  'p314-master.emd': read('p314-master.emd'),
  'p314-artp.emd': read('p314-artp.emd'),
  'p314-bookp.emd': read('p314-bookp.emd'),
  'p314-bch1.emd': read('p314-bch1.emd'),
  'p314-bch2.emd': read('p314-bch2.emd'),
  'p314-atlasp.emd': read('p314-atlasp.emd'),
  'p314-am1.emd': read('p314-am1.emd'),
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
    // #331: each website page is now deployed/fetched at `<src>/index.emd` (its own directory), and a book
    // page's chapter children resolve MASTER-RELATIVE at `<src>/<child>`. Map a request back to a FILES key:
    // a trailing `/index.emd` is a page master → key on the parent segment (the page src); any other path
    // → key on its own last segment (the master, the footer, or a book child by its filename).
    const segs = String(u).split('?')[0].split('/').filter(Boolean);
    let name = segs[segs.length - 1];
    if (name === 'index.emd' && segs.length >= 2) name = segs[segs.length - 2];
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
// The rendered <ref> anchor for a target colon-id: { href, text } (text stripped of inner markup).
function refAnchor(html, targetId) {
  const m = String(html).match(new RegExp(`<a ([^>]*?)href="([^"]*?#${targetId.replace(/:/g, '\\:')})"([^>]*?)>([\\s\\S]*?)</a>`));
  return m ? { href: m[2], text: m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() } : null;
}
// Scheme-normalize a cross-page href → its owner page slug (live keeps `?page=owner#anchor`).
const ownerOfHref = (href) => (String(href).match(/[?&]page=([^#&]+)/) || [])[1] ?? null;

export async function run() {
  // (Removed with the maintainer's nav-only decision: the shell's `buildOnThisPage` rail builder and its
  // frame/aside-skip unit test. The website shell no longer manufactures an on-this-page rail — it
  // renders the nav bar; the PAGE owns its layout, including whether it has a ToC. A page's rail comes
  // only from the page itself: an article's `<config toc>`, a book's own chapter-rail + on-this-page.)

  // (Retired with the old docs-site: the GENERATED Documentation catalog block — it imported
  // docs-site/gen-reference.js (buildLayer1Catalog/buildShorthandCatalog) to render the auto-built
  // Shorthand/eHTML catalogs through the website type. Those generators retired with the docs-site
  // archival; the new docs site (docs-source/) hand-authors its vocabulary as a book, so there is no
  // generated catalog to exercise here. The mountLiveWebsite parity tests below — the load-bearing
  // #314/#318 coverage — do not use the generators and stand on their own.)

  // ── mount: chrome (brand + dropdown + sidebar + footer) + first-page content + cross-page ref ──
  {
    const { dom, orig } = installDom();
    try {
      const root = await mountLiveWebsite('#root', MASTER);
      // Brand from <meta> (title + icon), not hardcoded.
      const brand = root.querySelector('.enscribe-site-header .enscribe-site-brand');
      assert.ok(brand && /Demo Site/.test(brand.textContent), 'brand shows the <meta> title');
      assert.ok(root.querySelector('.enscribe-site-brand-icon[src="logo.png"]'), 'brand shows the <meta icon>');
      // Top bar: the <nav-group> "Docs" is a native <details> disclosure dropdown (CSS-only, no JS).
      const toggle = root.querySelector('.enscribe-site-dropdown-toggle');
      assert.ok(toggle && /Docs/.test(toggle.textContent), 'a <nav-group> renders a top-bar dropdown toggle');
      assert.strictEqual(toggle.tagName, 'SUMMARY', 'the dropdown toggle is a native <summary> (not a JS-wired <button>)');
      // Sidebar (ON-path): the master opts in via <config sidebar> (S1.5 — default OFF). The group is
      // a NON-LINK label; its child pages are links.
      const sidebar = root.querySelector('.enscribe-site-sidebar');
      assert.ok(sidebar, 'the opted-in sidebar is mounted');
      const groupLabel = [...sidebar.querySelectorAll('nav-label')].find((s) => /Docs/.test(s.textContent));
      assert.ok(groupLabel && groupLabel.tagName === 'NAV-LABEL', 'the sidebar renders the group as a non-link <nav-label> (not an <a>)');
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

      // ── dropdown OPENS via the NATIVE <details> disclosure (no script to open; the panel is CSS-revealed) ──
      const details = toggle.closest('details');
      assert.ok(details && details.classList.contains('enscribe-site-dropdown'), 'the toggle is a <summary> inside the <details> dropdown');
      assert.ok(details.querySelector('.enscribe-site-dropdown-panel'), 'the panel is the <details> content (revealed by CSS on [open])');
      assert.ok(!toggle.hasAttribute('aria-expanded'), 'no aria-expanded JS-state attribute (native <summary> exposes its own open/closed state)');
      assert.strictEqual(details.open, false, 'dropdown starts closed');
      toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(details.open, true, 'clicking the summary opens the dropdown (native <details>, no script)');
      toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(details.open, false, 'clicking the summary again closes it (native toggle)');
      console.log('PASS: chrome — the top-bar dropdown OPENS via the native <details> (CSS-revealed panel, no aria-expanded)');

      // ── dismissal (the fix): an OPEN dropdown closes on an outside-click and on Escape (was broken: a
      //    native <details> stays open until the summary is re-clicked). bindWebsiteNavDismiss() wired the
      //    document-level handlers in mountLiveWebsite for the persistent chrome. ──
      toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(details.open, true, 're-opened for the outside-click check');
      dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(details.open, false, 'a click OUTSIDE the open dropdown dismisses it');
      toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(details.open, true, 're-opened for the Escape check');
      dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      assert.strictEqual(details.open, false, 'Escape dismisses the open dropdown');
      assert.strictEqual(dom.window.document.activeElement, toggle, 'Escape returns focus to the summary (a11y)');
      console.log('PASS: dropdown dismissal — outside-click + Escape close the open dropdown (focus returns to summary)');

      // ── internal nav: content swaps, chrome (header + footer) PERSISTS, aria-current moves ──
      const headerBefore = root.querySelector('.enscribe-site-header');
      const footerBefore = root.querySelector('.enscribe-site-footer');
      clickLink(dom, root, '?page=guide');
      assert.ok(root.querySelector('[data-enscribe-content]').innerHTML.includes('Installation'), 'clicking ?page=guide swaps the content to Guide');
      assert.strictEqual(root.querySelector('.enscribe-site-header'), headerBefore, 'the top bar is NOT rebuilt on a page swap (persistent chrome)');
      assert.strictEqual(root.querySelector('.enscribe-site-footer'), footerBefore, 'the footer survives the page swap (same element)');
      assert.strictEqual(activeHref(root), '?page=guide', 'aria-current moved to Guide');
      console.log('PASS: S2b — content-region swap; persistent header + footer; aria-current moves');

      // ── re-open + dismiss AFTER a SPA page swap: the document-level dismissal still works (the handler
      //    lives on the persistent document, so the content swap left it neither dead nor double-bound) ──
      toggle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(details.open, true, 're-opening the dropdown after a page swap still opens it');
      dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.strictEqual(details.open, false, 'outside-click still dismisses after a SPA navigation (handler not dead, not double-bound)');
      console.log('PASS: dropdown dismissal survives a SPA page swap (persistent document handler, idempotent)');

      // ── nav-only shell: NO shell on-this-page rail (maintainer decision). The shell renders the nav
      //    bar; the PAGE owns its layout, so its headings render in the CONTENT — not in a separate
      //    shell rail region (which double-railed a config-toc article and whose grid crushed a book).
      clickLink(dom, root, '?page=reference');
      assert.ok(!root.querySelector('[data-enscribe-onthispage]'),
        'the shell builds NO on-this-page rail region (it renders the nav bar; the page owns its layout)');
      const refContent = root.querySelector('[data-enscribe-content]');
      assert.ok(/API Reference/.test(refContent.textContent) && /Functions/.test(refContent.textContent),
        'the page\'s headings render in the content (the page lays itself out)');
      console.log('PASS: nav-only — the shell manufactures no on-this-page rail; the page owns its layout');

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

  // ── #246/core: a website is UNNUMBERED by default (section numbering off for ALL types) ──
  // Section headings carry no number; the per-page numbering MACHINERY stays intact, proven by the FLOAT
  // counters (they still reset per page); a cross-page ref to an unnumbered section shows its TITLE.
  {
    const { dom, orig } = installDom();
    try {
      const root = await mountLiveWebsite('#root', FILES['numbering-site.emd']);
      const content = () => root.querySelector('[data-enscribe-content]');

      // Page A (Alpha, first/default): sections are UNnumbered (no <config number-sections>; default OFF),
      // and the page title carries no number.
      assert.strictEqual(content().querySelectorAll('.section-number').length, 0,
        'page A: section headings are unnumbered by default (numbering is opt-in)');
      assert.ok(!content().querySelector('book-part-title .section-number'),
        'the page title carries no number');
      // Floats stay numbered, per page — the per-page ('page' scope) machinery is intact and dormant only for sections.
      assert.ok(/Figure 1\./.test(content().textContent), 'page A figure numbers per-page (Figure 1)');

      // Page B (Beta): also unnumbered; its figure RESTARTS at Figure 1 (the float per-page reset still works).
      popTo(dom, '?page=beta');
      assert.strictEqual(content().querySelectorAll('.section-number').length, 0,
        'page B: section headings are unnumbered');
      assert.ok(/Figure 1\./.test(content().textContent),
        'page B figure RESTARTS per page (Figure 1, not Figure 2) — float per-page reset intact');

      // Cross-page refs resolve GLOBALLY (to ?page=owner#anchor). The section is unnumbered → the ref
      // shows its TITLE ("Alpha One"); the figure is still numbered → "figure 1".
      const refTo = (href) => [...content().querySelectorAll('a')].find((a) => a.getAttribute('href') === href);
      const secRef = refTo('?page=alpha#sec:a1');
      const figRef = refTo('?page=alpha#fig:alpha');
      assert.ok(secRef && /Alpha One/i.test(secRef.textContent),
        'a cross-page <ref> to an UNnumbered section resolves to ?page=owner#anchor with the section TITLE ("Alpha One")');
      assert.ok(figRef && /figure 1/i.test(figRef.textContent),
        'a cross-page <ref> to a still-numbered figure shows "figure 1" + ?page=owner#anchor');
      console.log('PASS: #246/core — a website is unnumbered by default (sections no number; floats still per-page); cross-page section ref shows the title');
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

  // ── #314 / #318 — THE PARITY EFFECT: a book page renders AS a book + cross-page refs in all 4 directions ──
  // The live #300, step 2 (#324): mountLiveWebsite now composes through composeSiteRegistry (the SAME core the
  // static build calls), so a BOOK page keeps BOOK numbering ("figure 2.1", NOT a flattened "figure 1") and a
  // cross-page <ref> reads its target's NATIVE number off ONE merged registry — resolved at render time, never
  // by re-reading finished HTML. Assert the display NUMBER + the scheme-normalized OWNER, never the raw href.
  {
    const { dom, orig } = installDom();
    try {
      const root = await mountLiveWebsite('#root', FILES['p314-master.emd']);
      const content = () => root.querySelector('[data-enscribe-content]');

      // (1) article→book: the article's ref to the BOOK figure shows the book NATIVE number "figure 2.1" (the
      // composition signature — a flattened page-scope build would show "figure 1") + links to the book page.
      const aToB = refAnchor(content().innerHTML, 'fig:bookp');
      assert.ok(aToB, 'article page resolves its <ref @fig:bookp> (cross-page into the book)');
      assert.strictEqual(aToB.text, 'figure 2.1', `article→book shows the BOOK native "figure 2.1" (got "${aToB && aToB.text}") — NOT a flattened "figure 1"`);
      assert.strictEqual(ownerOfHref(aToB.href), 'bookp', 'article→book links to ?page=bookp');
      console.log(`PASS: #314 — article→book ref shows the book NATIVE "${aToB.text}" (composition, not flattened) → ?page=bookp`);

      // ── #318: authored <a {slug}> internal LINKS resolve at RENDER TIME (one registry, ?page= scheme, no parse5) ──
      // On the default (artp) view. Assert on the OWNER (scheme-normalized) + the DISPLAY text, never a raw href. A
      // page-LINK is `?page=slug` with NO #fragment; a cross-page <ref> carries `#anchor`, so the fragment excludes it.
      const art = content();
      const pageLinks = [...art.querySelectorAll('a')]
        .map((a) => ({ owner: ownerOfHref(a.getAttribute('href')), frag: (a.getAttribute('href') || '').includes('#'), text: a.textContent.replace(/\s+/g, ' ').trim(), el: a }))
        .filter((l) => l.owner && !l.frag);
      // (a) resolvable → owner bookp, the authored label kept
      assert.ok(pageLinks.some((l) => l.owner === 'bookp' && l.text === 'the book page'),
        '<a bookp | the book page> resolves to a ?page=bookp link with its authored label');
      // (b) auto-label → an empty <a atlasp | > fills from the TARGET PAGE TITLE ("Atlas")
      assert.ok(pageLinks.some((l) => l.owner === 'atlasp' && l.text === 'Atlas'),
        '<a atlasp | > auto-labels from the target page title ("Atlas")');
      // (c) broken slug → DEGRADE: a ref-error marker, label kept, no live ?page= owner (always-renders, no throw)
      const deadLink = [...art.querySelectorAll('a.ref-error')].find((a) => /a dead link/.test(a.textContent));
      assert.ok(deadLink && !ownerOfHref(deadLink.getAttribute('href')),
        'a broken <a no-such-page> degrades to an inert ref-error marker (label kept, no live ?page= link)');
      // (d) NESTED-label slug link `<a bookp | go to <a atlasp | the atlas> here>`: BOTH the outer (?page=bookp)
      //     and the inner (?page=atlasp) resolve — the case the old serialized-HTML regex could NOT (it stopped at
      //     the inner </a>, leaving one link unresolved). The render-time tree-pass walks each <a> node, so both
      //     resolve. (HTML5 forbids a nested <a>, so jsdom HOISTS the inner anchor to a SIBLING on innerHTML — the
      //     two are siblings in the DOM, both resolved. The strict tree-level nesting PRESERVATION is asserted in
      //     cross-page-links.test.js, where the hast serializes <a …>see <a …>the atlas</a> here</a> intact.)
      assert.ok(pageLinks.some((l) => l.owner === 'atlasp' && l.text === 'the atlas'),
        'the nested INNER <a atlasp | the atlas> resolved (?page=atlasp) — the link the old regex left dead');
      assert.ok(pageLinks.some((l) => l.owner === 'bookp' && /go to/.test(l.text)),
        'the nested OUTER <a bookp | …> resolved (?page=bookp) too — both nested links resolve');
      console.log('PASS: #318 — <a {slug}> links resolve live: ?page= + auto-label + broken-degrade + nested-label (render-time, one registry, no re-parse)');

      // (2) the book PAGE renders AS a native book — chapter ROUTES (?page=bookp&chapter=one/two), not one
      //     collapsed book-part. Chapter-as-page: the chapter is the query, fully-qualified with the page slug.
      popTo(dom, '?page=bookp');
      const hrefs = [...content().querySelectorAll('a')].map((a) => a.getAttribute('href'));
      assert.ok(hrefs.includes('?page=bookp&chapter=one') && hrefs.includes('?page=bookp&chapter=two'),
        'the book page renders AS a book — its chapter routes (?page=bookp&chapter=one/two) are present (not flattened)');
      console.log('PASS: #314 — the book PAGE renders as a native book (its chapters ?chapter=one/two are navigable)');

      // (3) inside chapter one: the three OUTBOUND ref directions resolve to native numbers + the right scheme.
      popTo(dom, '?page=bookp&chapter=one');
      const ch1 = content().innerHTML;
      const bToA = refAnchor(ch1, 'fig:artp');      // book→article: the article's native "figure 1"
      const bToB = refAnchor(ch1, 'fig:atlasp');    // book→book: the OTHER book's native "figure 1.1"
      const within = refAnchor(ch1, 'fig:bookp');   // within-book CROSS-chapter (fig:bookp is in chapter two)
      assert.ok(bToA && bToA.text === 'figure 1' && ownerOfHref(bToA.href) === 'artp',
        `book→article shows the article native "figure 1" → ?page=artp (got ${JSON.stringify(bToA)})`);
      assert.ok(bToB && bToB.text === 'figure 1.1' && ownerOfHref(bToB.href) === 'atlasp',
        `book→book shows the OTHER book's native "figure 1.1" → ?page=atlasp (got ${JSON.stringify(bToB)})`);
      // refAnchor reads the raw innerHTML, where the href's `&` serializes as the entity `&amp;` (getAttribute
      // would decode it — as the rail assertion above shows). Decode it to compare the functional URL.
      assert.ok(within && within.text === 'figure 2.1' && within.href.replace(/&amp;/g, '&') === '?page=bookp&chapter=two#fig:bookp',
        `within-book cross-chapter ref shows "figure 2.1" + the owning chapter route + section (?page=bookp&chapter=two#fig:bookp) (got ${JSON.stringify(within)})`);
      console.log('PASS: #314 — book→article "figure 1"→?page=artp · book→book "figure 1.1"→?page=atlasp · within-book cross-chapter "figure 2.1"→?page=bookp&chapter=two#fig:bookp');

      // (4) navigating within the book to chapter two: the figure carries its BOOK native label "Figure 2.1".
      popTo(dom, '?page=bookp&chapter=two');
      assert.ok(/Figure\s*2\.1\b/.test(content().textContent),
        'the book figure carries its BOOK native label "Figure 2.1" (chapter-scoped), not a page-scope "Figure 1"');
      console.log('PASS: #314 — the book figure is "Figure 2.1" (book numbering) on its chapter view');
    } finally {
      restoreDom(orig);
    }
  }

  // ── #unify — a BOOK page in EDIT mode edits PER-CHAPTER (the gap audit P1 fixed; the test 5.1 whose absence let it survive) ──
  // Before the unification, mountLiveWebsite's edit route was book-blind: a book page fell to the single-unit
  // renderPageStandalone, which renders the UNASSEMBLED master (empty chapters, no rail). The S2c edit tests
  // above exercise only ARTICLE pages, and the per-chapter book edit was tested only via mountLiveBook DIRECTLY
  // (a route the SPA never takes) — so this combination (a book PAGE inside a website, in edit mode) had ZERO
  // coverage. Assert the fix end-to-end: the per-chapter edit view (rail + Source/Preview tabs + ASSEMBLED
  // chapter prose in the preview + the chapter's OWN source in the editor), a ?chapter= change switching the
  // editable chapter, and an edit round-tripping into the preview.
  {
    const { dom, orig } = installDom();
    const stub = makeEditorStub();
    try {
      const root = await mountLiveWebsite('#root', FILES['p314-master.emd'], { editor: stub.editor, editDebounceMs: 0 });
      const content = () => root.querySelector('[data-enscribe-content]');
      const preview = () => content().querySelector('[data-edit-pane="preview"]');
      // Navigate to the BOOK page in edit mode, then into chapter ONE (the ?chapter= route).
      popTo(dom, '?page=bookp');
      popTo(dom, '?page=bookp&chapter=one');
      // (1) the per-chapter EDIT view is reached — Write/Preview tabs + the book's chapter rail (NOT the empty master).
      assert.ok(content().querySelector('[data-edit-tab]'),
        'a book page in edit mode shows the per-chapter Write/Preview edit view (tabs present), not the article fallback');
      const railHrefs = [...content().querySelectorAll('a')].map((a) => a.getAttribute('href'));
      assert.ok(railHrefs.includes('?page=bookp&chapter=one') && railHrefs.includes('?page=bookp&chapter=two'),
        'the editable book carries its chapter rail (?chapter=one/two routes) — NOT the rail-less empty master');
      // (2) the editor mounted with THIS CHAPTER's source (Chapter One), NOT the book master (<meta type=book>).
      assert.ok(stub.last && /Chapter One/.test(stub.last.value),
        `the editor holds chapter ONE's source (got: ${JSON.stringify(stub.last && stub.last.value.slice(0, 36))})`);
      assert.ok(!/type=book/.test(stub.last.value),
        'the editor is NOT mounted with the unassembled book master — that was the bug');
      // (3) the PREVIEW pane holds the ASSEMBLED chapter prose — the empty-master degrade rendered nothing here.
      assert.ok(/Chapter One/.test(preview().textContent),
        'the preview pane renders the ASSEMBLED chapter content (Chapter One), not an empty book skeleton');
      // (4) typing in the editor round-trips into THAT chapter's preview (debounce 0 → ready after a tick).
      stub.last.onChange('<section | Chapter One>\n\nUNIFY-EDIT-MARKER');
      await tick();
      assert.ok(/UNIFY-EDIT-MARKER/.test(preview().textContent),
        'an edit to the chapter source re-renders that chapter\'s preview (round-trip), like the article edit');
      // (5) a ?chapter= change switches the EDITABLE chapter — the editor re-mounts with chapter TWO's source.
      const priorMount = stub.last;
      popTo(dom, '?page=bookp&chapter=two');
      assert.ok(stub.last !== priorMount && /Chapter Two/.test(stub.last.value),
        'a ?chapter= change switches the editable chapter (editor re-mounts with chapter TWO source)');
      assert.strictEqual(priorMount.destroyed, true, 'the prior chapter editor was destroyed on the chapter switch (no leak)');
      console.log('PASS: #unify — a book PAGE edits PER-CHAPTER in the website (rail + assembled preview + per-chapter source + ?chapter= switch + round-trip)');
    } finally { restoreDom(orig); }
  }

  console.log('All live website render (#246 S2a engine + S2b chrome + #314 composition) browser-entry checks passed.');
}
