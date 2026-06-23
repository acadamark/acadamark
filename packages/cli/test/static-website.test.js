// `enscribe build -o <dir> <website-master>` — the static website emitter (#246 / #278).
//
// buildStaticWebsite walks a <meta type=website> master's nav and returns Map(outputPath → html)
// for a static site whose OUTPUT mirrors the nav TREE (#278 slice 1). This gate proves the shape on a
// mini fixture site (a page-directory article + a flat article + a page under a <nav-group> + a
// two-chapter book): home maps to the dist root; every other page lives at its nav-path
// <group…>/<slug>/index.html; a book-page's chapters nest under its nav-path dir; the website nav
// chrome is injected; and cross-page links are PRETTY trailing-slash path URLs relative to the current
// page's depth (home → the right number of ../ to root), not absolute /… and not the SPA's ?page=.

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildStaticWebsite, resolvePageSource } from '../src/static-website.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(__dirname, 'fixtures/website-mini');

export function run_tests() {
  const masterSource = readFileSync(join(FIX, 'index.emd'), 'utf8');
  const { pages, warnings } = buildStaticWebsite({ masterSource, masterDir: FIX, defaultCss: '/* default.css */' });

  // ── page-dir resolution (#278): a directory src resolves to <src>/index.emd ──────────────────
  {
    const home = resolvePageSource(FIX, 'home');
    assert.ok(home && home.sourcePath.endsWith(join('home', 'index.emd')), 'a page-directory src → <src>/index.emd');
    const about = resolvePageSource(FIX, 'about');
    assert.ok(about && about.sourcePath.endsWith('about.emd'), 'a flat src → <src>.emd');
    assert.equal(resolvePageSource(FIX, 'nope'), null, 'an unresolvable src → null');
    console.log('PASS: static-website — page-dir resolution (dir → index.emd; flat → .emd)');
  }

  // ── nav-path output shape: home at root; pages at <navPath>/index.html; a GROUPED page nests ──
  {
    assert.ok(pages.has('index.html'), 'the home page maps to the dist-root index.html');
    assert.ok(!pages.has('home/index.html'), 'home does NOT also emit home/index.html (it maps to root)');
    assert.ok(pages.has('about/index.html'), 'a top-level article → about/index.html');
    assert.ok(pages.has('resources/deep-page/index.html'),
      'a page under the "Resources" nav-group lands at resources/deep-page/index.html (group slug + page slug)');
    assert.ok(!pages.has('deep/index.html'), 'the grouped page is NOT flat at the top level (deep/index.html)');
    // NB: nav-path is recursive in the emitter (group-in-group → deeper paths), but the PARSER's
    // same-name nesting limitation means a <nav-group> inside a <nav-group> does not nest today, so
    // only single-level groups are currently expressible. Single level is what the real docs site uses.
    assert.ok(pages.has('guide/index.html'), 'a book page → guide/index.html (book index)');
    const guideChapters = [...pages.keys()].filter((k) => k.startsWith('guide/') && k !== 'guide/index.html');
    assert.ok(guideChapters.length >= 2, `a book page emits its chapters nested under guide/ (got ${guideChapters.length})`);
    assert.deepEqual(warnings, [], `no render warnings on the mini site (got: ${warnings.join(' | ')})`);
    console.log('PASS: static-website — nav-path output (home→root, grouped page → <group>/<slug>/index.html, book nested)');
  }

  // ── chrome links are PRETTY trailing-slash path URLs, relative to the page's depth (no ?page=) ──
  {
    const home = pages.get('index.html');
    assert.ok(home.includes('enscribe-site-header'), 'the home page carries the website top bar');
    assert.ok(home.includes('enscribe-site-sidebar'), 'the home page carries the sidebar');
    assert.ok(home.includes('Welcome'), 'the home article body is rendered into the content slot');
    assert.ok(!home.includes('?page='), 'no ?page= SPA-router links (a static site has no router)');
    assert.ok(!/href="[^"]*\/index\.html"/.test(home), 'no <navPath>/index.html link targets — pretty trailing-slash URLs');
    assert.ok(!/href="\/(?!\/)/.test(home), 'no absolute-path chrome links (href="/…")');
    // From home (dist root, depth 0): a top-level page → `about/`; a GROUPED page → `resources/deep-page/`;
    // the book → `guide/`; the brand / home → `./`. Trailing slash, relative.
    assert.ok(home.includes('href="about/"'), 'home → a top-level page is `about/` (trailing slash, relative)');
    assert.ok(home.includes('href="resources/deep-page/"'), 'home → the grouped page is `resources/deep-page/` (nav-path URL)');
    assert.ok(home.includes('href="guide/"'), 'home → the book is `guide/`');
    assert.ok(home.includes('href="./"'), 'home → home (self) is `./`');

    // From the DEPTH-2 grouped page (resources/deep-page/index.html): two `../` back to root, then the target.
    const deep = pages.get('resources/deep-page/index.html');
    assert.ok(deep.includes('href="../../"'), 'the depth-2 grouped page links home as `../../` (two segments up)');
    assert.ok(deep.includes('href="../../about/"'), 'the depth-2 page links a top-level page as `../../about/`');
    assert.ok(deep.includes('href="../../guide/"'), 'the depth-2 page links the book as `../../guide/`');

    // a book chapter page also carries the top bar, relativized for ITS depth (guide/ = depth 1)
    const guideHome = pages.get('guide/index.html');
    assert.ok(guideHome.includes('enscribe-site-header'), 'a book page also carries the website top bar');
    assert.ok(guideHome.includes('href="../"'), 'a depth-1 book page links home as `../`');
    assert.ok(!guideHome.includes('?page='), 'a book page has no un-staticized ?page= links');
    console.log('PASS: static-website — pretty trailing-slash URLs, relative to depth (home from every depth), no /index.html / absolute / ?page=');
  }

  // ── every emitted chrome link resolves to an emitted page (the "no broken link" gate) ──────────
  {
    for (const [outPath, html] of pages) {
      const dir = outPath.includes('/') ? outPath.replace(/\/[^/]*$/, '') : '';
      for (const m of html.matchAll(/href="([^"#]+)"/g)) {
        const href = m[1];
        if (/^(https?:|mailto:|\/\/)/.test(href) || href.startsWith('/')) continue; // external / absolute (caught above)
        let target;
        if (href === './' || href.endsWith('/')) target = `${href}index.html`; // a trailing-slash page URL → its index.html
        else if (/\.html?$/.test(href)) target = href;                         // a book-internal chapter file
        else continue;                                                         // not a page link
        const parts = (dir ? dir.split('/') : []);
        for (const seg of target.split('/')) {
          if (seg === '..') parts.pop();
          else if (seg !== '.' && seg !== '') parts.push(seg);
        }
        const resolved = parts.join('/');
        assert.ok(pages.has(resolved),
          `link "${href}" on page "${outPath}" resolves to an emitted page ("${resolved}")`);
      }
    }
    console.log('PASS: static-website — every chrome link resolves to an emitted page (no broken links)');
  }

  // ── nav diagnostics are SURFACED, not swallowed (a duplicate page slug warns) ──────────────────
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-coll-'));
    writeFileSync(join(dir, 'index.emd'),
      '<meta type=website>\n<title|C>\n</meta>\n\n<nav>\n<item src="a" +homepage | Overview>\n<item src="b" | Overview>\n</nav>\n');
    writeFileSync(join(dir, 'a.emd'), '<meta type=article>\n<title|Overview>\n</meta>\n\nA');
    writeFileSync(join(dir, 'b.emd'), '<meta type=article>\n<title|Overview>\n</meta>\n\nB');
    const { warnings } = buildStaticWebsite({ masterSource: readFileSync(join(dir, 'index.emd'), 'utf8'), masterDir: dir, defaultCss: '' });
    assert.ok(warnings.some((w) => /slug-collision/.test(w)),
      `a duplicate page slug surfaces the nav slug-collision warning (got: ${warnings.join(' | ') || 'none'})`);
    console.log('PASS: static-website — nav diagnostics surfaced (duplicate slug warns, not silently disambiguated)');
  }

  // ── resolvePageSource: a directory without index.emd does NOT shadow a sibling <src>.emd ────────
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-shadow-'));
    mkdirSync(join(dir, 'mybook'));                       // a directory, but NO mybook/index.emd
    writeFileSync(join(dir, 'mybook.emd'), '<meta type=book>\n<title|B>\n</meta>\n');
    const r = resolvePageSource(dir, 'mybook');
    assert.ok(r && r.sourcePath.endsWith('mybook.emd'),
      'a src dir lacking index.emd falls through to the sibling <src>.emd (no silent shadow)');
    console.log('PASS: static-website — a content-less src dir does not shadow a sibling .emd');
  }

  console.log('All static-website (#278) tests passed.');
}
