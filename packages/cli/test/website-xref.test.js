// #320 — REAL website parity corpus: static build ≡ live SPA, both surfaces composed the SAME way.
//
// The live #300 (step 2, #324) routed the live path through the shared composition core
// (composeSiteRegistry) — the SAME core the static build calls — so a website now composes ONE way on
// both surfaces: number each page in its OWN native scope, merge one site cross-ref registry, render per
// page. NOTHING is flattened. This test proves the PARITY directly: it drives the REAL static build
// (buildStaticWebsite) AND the REAL live SPA (mountLiveWebsite in jsdom — the same browser entry
// master-website-live.test.js drives) over one multi-page corpus, and asserts they AGREE.
//
// It replaces the old `liveRender`/`buildWebsiteTree` MIRROR: that hand-rolled the live render through the
// page-scope flatten (buildWebsiteTree/buildLiveWebsite/renderLiveWebsitePage), so it was article-only by
// design (a book page flattened to page scope) and could never test the book direction. Those flatten
// functions are deleted in this slice (#320); the real composition path covers the book direction here.
//
// THE CONTRACT (notes/specs/render-parity.md "The website path"): static ≡ live on the DISPLAY NUMBER and
// the SCHEME-NORMALIZED owner — never the raw href. The display number must be byte-identical (a book
// target reads its BOOK-native "figure 2.1", not a flattened "figure 1"). The owner is the OWNING nav-PAGE,
// once each surface's URL scheme is normalized away: static emits depth-relative `.html` paths (a book page
// is many chapter-files under the page dir; the home page collapses to the dist root), live keeps the SPA's
// `?page=owner` route (a book page is ONE route, its chapters in-page `#hash`). Both name the same page.
//
// The corpus is the shared p314 fixture (packages/enscribe/test/fixtures/master-website/p314-*): an article
// page (artp, the home page) + a book page (bookp, two chapters, numbering on) + a second book (atlasp),
// with cross-page <ref>s in ALL FOUR directions (article→book, book→article, book→book, within-book).

import assert from 'node:assert';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { JSDOM, VirtualConsole } from 'jsdom';
import { buildStaticWebsite } from '../src/static-website.js';
// The live browser entry. browser.js is enscribe's tsup browser entry — the package export map exposes it
// only as a BUILT bundle (`@enscribejs/enscribe/browser` → dist), so the test drives the SOURCE directly,
// the same way enscribe's own master-website-live.test.js imports it. jsdom + the source are both reachable
// from this package (jsdom hoists to the workspace root; the source is a sibling-package relative path).
import { mountLiveWebsite } from '../../enscribe/src/interpreter/browser.js';

// ── the shared p314 corpus ──────────────────────────────────────────────────────────────────────────
const FX = join(import.meta.dirname, '..', '..', 'enscribe', 'test', 'fixtures', 'master-website');
const P314 = ['p314-master', 'p314-artp', 'p314-bookp', 'p314-bch1', 'p314-bch2', 'p314-atlasp', 'p314-am1'];
const FILES = Object.fromEntries(P314.map((n) => [`${n}.emd`, readFileSync(join(FX, `${n}.emd`), 'utf8')]));
const MASTER = FILES['p314-master.emd'];

// The nav pages (their `<meta slug>`s) and the home page (the first nav item). Used to normalize a static
// href back to its owning nav-PAGE slug (see staticOwner): the URL scheme is the only allowed difference.
const PAGE_SLUGS = new Set(['artp', 'bookp', 'atlasp']);
const HOME_SLUG = 'artp';

// ── scheme normalizers: a cross-page href → the OWNING nav-page slug, on each surface ─────────────────
// Static: depth-relative `.html` path. The owner is the first path segment that is a known page slug
// (`bookp/two.html` → bookp; `../atlasp/maps.html` → atlasp). No page segment means either the dist root
// (`../` → the home page) or a sibling chapter file of the CURRENT book (`two.html` → the current page).
function staticOwner(href, currentSlug) {
  const segs = String(href).replace(/#.*$/, '').split('/').filter((s) => s && s !== '..' && s !== '.');
  for (const s of segs) { const slug = s.replace(/\.html$/, ''); if (PAGE_SLUGS.has(slug)) return slug; }
  return segs.length === 0 ? HOME_SLUG : currentSlug;
}
// Live: the SPA route `?page=owner#anchor` → owner; a bare `#anchor` (intra-page / same-book) → the current page.
function liveOwner(href, currentSlug) {
  const m = String(href).match(/[?&]page=([^#&]+)/);
  return m ? m[1] : currentSlug;
}

// The rendered <ref> anchor for a target colon-id: { href, text } (text stripped of inner markup).
function refAnchor(html, targetId) {
  const m = String(html).match(new RegExp(`<a ([^>]*?)href="([^"]*?#${targetId.replace(/:/g, '\\:')})"([^>]*?)>([\\s\\S]*?)</a>`));
  return m ? { href: m[2], text: m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() } : null;
}
// The NATIVE "Figure N[.M]" label a figure carries on its own page (the byte-identity target for refs to it).
function figureLabel(html) {
  return (String(html).match(/figure-label[^>]*>\s*Figure\s*([0-9]+(?:\.[0-9]+)*)/i) || [])[1];
}

// ── live SPA harness (jsdom), mirroring master-website-live.test.js ───────────────────────────────────
function installDom(url = 'https://example.com/site/', files = FILES) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (err) => { if (!/Not implemented/.test(err && err.message)) throw err; });
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url, virtualConsole: vc });
  const orig = { window: global.window, document: global.document, location: global.location, history: global.history, fetch: global.fetch };
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(global, 'location', { value: dom.window.location, configurable: true, writable: true });
  Object.defineProperty(global, 'history', { value: dom.window.history, configurable: true, writable: true });
  global.fetch = async (u) => {
    // #331: each website page is now fetched at `<src>/index.emd` (its own directory); a book page's
    // chapter children resolve master-relative at `<src>/<child>`. Map back to a FILES key: a trailing
    // `/index.emd` → the parent segment (the page src); otherwise the path's own last segment.
    const segs = String(u).split('?')[0].split('/').filter(Boolean);
    let name = segs[segs.length - 1];
    if (name === 'index.emd' && segs.length >= 2) name = segs[segs.length - 2];
    return Object.prototype.hasOwnProperty.call(files, name)
      ? { ok: true, status: 200, statusText: 'OK', text: async () => files[name] }
      : { ok: false, status: 404, statusText: 'Not Found', text: async () => '' };
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
const pop = (dom, search) => { dom.window.history.pushState(null, '', search); dom.window.dispatchEvent(new dom.window.Event('popstate')); };

export async function run_tests() {
  // ── STATIC: build the whole site from the p314 master on disk. ──
  const dir = mkdtempSync(join(tmpdir(), 'enscribe-parity-'));
  for (const [name, body] of Object.entries(FILES)) writeFileSync(join(dir, name), body);
  // #408: the pages reference these assets; the referenced-vs-shipped audit verifies they exist
  // (and ships them) — write the real files so the fixture is truthful and the audit stays quiet.
  for (const svg of ['a.svg', 'b.svg', 'w.svg']) writeFileSync(join(dir, svg), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const { pages: S, warnings } = buildStaticWebsite({ masterSource: MASTER, masterDir: dir, defaultCss: '' });
  assert.ok(!warnings.some((m) => /not found|failed/i.test(m)), `static: no cross-page resolution failures (warnings: ${warnings.join(' | ')})`);

  // ── LIVE: mount the SPA in jsdom and capture each page's rendered HTML (article + book chapter views). ──
  const { dom, orig } = installDom();
  let L;   // { artp, bookpOne, bookpTwo, atlaspMaps } — rendered innerHTML per view
  try {
    const root = await mountLiveWebsite('#root', MASTER);
    const content = () => root.querySelector('[data-enscribe-content]').innerHTML;
    const artp = content();                       // first render is the home page (artp)
    // Chapter-as-page: a chapter is the `?page=<book>&chapter=<stem>` route (not a hash).
    pop(dom, '?page=bookp&chapter=one'); const bookpOne = content();
    pop(dom, '?page=bookp&chapter=two'); const bookpTwo = content();
    // atlasp is a single-chapter book; a bare ?page=atlasp shows its cover, so route to the chapter
    // — the same chapter the static build emits as atlasp/maps.html — to see the figure's native label.
    pop(dom, '?page=atlasp&chapter=maps'); const atlaspMaps = content();
    L = { artp, bookpOne, bookpTwo, atlaspMaps };
  } finally {
    restoreDom(orig);
  }

  // ── the book pages render AS books on BOTH surfaces — book-native numbering (the flattening-gone proof) ──
  // A flattened page-scope build would label this figure "Figure 1"; composition keeps the chapter-scoped
  // "Figure 2.1" (bookp ch2) / "Figure 1.1" (atlasp). Byte-identical static≡live.
  {
    const sBook = figureLabel(S.get('bookp/two.html'));
    const lBook = figureLabel(L.bookpTwo);
    assert.equal(sBook, '2.1', `static: the book figure's NATIVE label is chapter-scoped "2.1" (got "${sBook}")`);
    assert.equal(lBook, '2.1', `live: the book figure's NATIVE label is chapter-scoped "2.1" (got "${lBook}") — NOT a flattened "1"`);
    const sAtlas = figureLabel(S.get('atlasp/maps.html'));
    const lAtlas = figureLabel(L.atlaspMaps);
    assert.equal(sAtlas, '1.1', `static: the atlas figure's NATIVE label is "1.1" (got "${sAtlas}")`);
    assert.equal(lAtlas, '1.1', `live: the atlas figure's NATIVE label is "1.1" (got "${lAtlas}")`);
    console.log('PASS: #320 — book pages render AS books on BOTH surfaces (native "Figure 2.1" / "1.1", not a flattened "1")');
  }

  // ── the four directions: static ≡ live on display NUMBER + scheme-normalized OWNER ────────────────────
  // Each direction reads the SAME logical <ref> off each surface and asserts: (1) the display text (the
  // number) is byte-identical, and (2) the owner — once `.html`/`?page=` are normalized away — is the same
  // nav-page, and is the expected one. `currentSlug` is the page the ref is RENDERED on (for the home→root
  // and within-book sibling-file normalizations).
  const direction = (label, targetId, expectedText, expectedOwner, staticHtml, liveHtml, currentSlug) => {
    const s = refAnchor(staticHtml, targetId);
    const l = refAnchor(liveHtml, targetId);
    assert.ok(s, `static: ${label} resolves its <ref @${targetId}> (cross-page, not dangling)`);
    assert.ok(l, `live: ${label} resolves its <ref @${targetId}>`);
    assert.equal(s.text, expectedText, `static: ${label} shows "${expectedText}" (got "${s.text}")`);
    assert.equal(s.text, l.text, `${label}: display number byte-identical static≡live (static "${s.text}" / live "${l.text}")`);
    const sOwner = staticOwner(s.href, currentSlug);
    const lOwner = liveOwner(l.href, currentSlug);
    assert.equal(sOwner, expectedOwner, `static: ${label} links to page "${expectedOwner}" (got "${sOwner}" from "${s.href}")`);
    assert.equal(sOwner, lOwner, `${label}: owner matches once the scheme is normalized (static "${s.href}"→${sOwner} / live "${l.href}"→${lOwner})`);
    console.log(`PASS: #320 — ${label}: "${s.text}" + owner ${sOwner} (static "${s.href}" ≡ live "${l.href}")`);
  };

  // (1) article→book: the home article's ref to the BOOK figure → book-native "figure 2.1", owner bookp.
  direction('article→book', 'fig:bookp', 'figure 2.1', 'bookp', S.get('index.html'), L.artp, 'artp');
  // (2) book→article: a book chapter's ref to the ARTICLE figure → article "figure 1", owner artp (the
  //     home page — static collapses it to the dist root `../`, live keeps `?page=artp`; both normalize to artp).
  direction('book→article', 'fig:artp', 'figure 1', 'artp', S.get('bookp/one.html'), L.bookpOne, 'bookp');
  // (3) book→book: a book chapter's ref to the OTHER book's figure → its native "figure 1.1", owner atlasp.
  direction('book→book', 'fig:atlasp', 'figure 1.1', 'atlasp', S.get('bookp/one.html'), L.bookpOne, 'bookp');
  // (4) within-book: a book chapter's ref to a figure in the SAME book (cross-chapter: fig:bookp is in ch2)
  //     → "figure 2.1", owner the book page itself (static a sibling `two.html`, live `?page=bookp&chapter=two`
  //     — both stay within the bookp page; the owner normalizes to bookp on both surfaces).
  direction('within-book', 'fig:bookp', 'figure 2.1', 'bookp', S.get('bookp/one.html'), L.bookpOne, 'bookp');

  // ── #419: the live SPA renders an inline `<item | Title>` page — parity with the static build ──────────
  // The #417 acceptance shape: a site whose HOME is an INLINE page (its authored body IS the page — the
  // zero-length-splice case, no source file), plus one EXTERNAL page (so nav is exercised both ways). Before
  // #419 the live SPA filtered inline pages out and skipped them (a console.info); now it renders them through
  // the SAME source-less tree seam the static build uses. Static ≡ live on the inline page's body content.
  {
    const INLINE_MASTER =
      '<meta type=website title="Inline Site" />\n\n<nav>\n<item | Home>\n\nWelcome INLINEBODY419 to the inline home.\n\n<item src="about.emd" | About>\n</nav>\n';
    const inlineFiles = { 'about.emd': '<meta type=article title="About" />\n\nThe ABOUTBODY419 external page.\n' };

    // STATIC: the inline Home is the FIRST nav entry → the dist-root index.html; the external page renders too.
    const idir = mkdtempSync(join(tmpdir(), 'enscribe-inline-'));
    for (const [n, b] of Object.entries(inlineFiles)) writeFileSync(join(idir, n), b);
    const { pages: SI } = buildStaticWebsite({ masterSource: INLINE_MASTER, masterDir: idir, defaultCss: '' });
    const sInline = SI.get('index.html');
    assert.ok(sInline && /INLINEBODY419/.test(sInline), 'static: the inline home page renders its authored body');
    assert.ok(SI.get('about/index.html')?.includes('ABOUTBODY419'), 'static: the external page renders too (nav both ways)');

    // LIVE: mount the SPA; the inline home is the first render; navigate to the external page and back.
    const { dom: idom, orig: iorig } = installDom('https://example.com/site/', inlineFiles);
    let lHome, lAbout, lHomeAgain;
    try {
      const root = await mountLiveWebsite('#root', INLINE_MASTER);
      const content = () => root.querySelector('[data-enscribe-content]').innerHTML;
      lHome = content();                                  // first render = the inline home page
      pop(idom, '?page=about'); lAbout = content();       // nav forward → the external page
      pop(idom, '?page=home'); lHomeAgain = content();    // nav back → the inline page (slug 'home')
    } finally { restoreDom(iorig); }

    assert.ok(/INLINEBODY419/.test(lHome), 'live (#419): the inline home page renders its authored body — no longer skipped');
    assert.ok(/ABOUTBODY419/.test(lAbout), 'live (#419): the external page renders (nav forward works)');
    assert.ok(/INLINEBODY419/.test(lHomeAgain), 'live (#419): routing back to the inline page re-renders it (nav backward works)');

    // PARITY: the inline page's body PARAGRAPH is byte-identical on both surfaces. (Extract the <p> that
    // carries the marker — not the head og:description meta the static page also derives from the body.)
    const bodyText = (html) => (String(html).match(/<p[^>]*>([^<]*INLINEBODY419[^<]*)<\/p>/) || [, ''])[1].trim();
    assert.equal(bodyText(sInline), bodyText(lHome),
      `#419: the inline page's body paragraph is identical static≡live ("${bodyText(sInline)}" vs "${bodyText(lHome)}")`);
    console.log(`PASS: #419 — the live SPA renders the inline <item | Title> page; body identical static≡live ("${bodyText(lHome)}")`);
  }

  console.log('All #320 website parity (static ≡ live, all four directions, book direction now covered) checks passed.');
}
