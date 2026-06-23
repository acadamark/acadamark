// `enscribe build -o <dir> <website-master>` — the static website emitter (#246 / #278).
//
// buildStaticWebsite walks a <meta type=website> master's nav and returns Map(outputPath → html)
// for a DIR-PER-PAGE static site. This gate proves the output shape on a mini fixture site (a
// page-directory article + a flat article + a two-chapter book): home maps to the dist root, every
// other page lives at <slug>/index.html, a book-page's chapters nest under its dir, the website nav
// chrome is injected, and cross-page nav links are the pretty /<slug>/ form (home → /), not ?page=.

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
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

  // ── dir-per-page output shape; home at root; book nested ─────────────────────────────────────
  {
    assert.ok(pages.has('index.html'), 'the home page maps to the dist-root index.html');
    assert.ok(!pages.has('home/index.html'), 'home does NOT also emit home/index.html (it maps to root)');
    assert.ok(pages.has('about/index.html'), 'a flat article page → about/index.html');
    assert.ok(pages.has('guide/index.html'), 'a book page → guide/index.html (book index)');
    const guideChapters = [...pages.keys()].filter((k) => k.startsWith('guide/') && k !== 'guide/index.html');
    assert.ok(guideChapters.length >= 2, `a book page emits its chapters nested under guide/ (got ${guideChapters.length})`);
    assert.deepEqual(warnings, [], `no render warnings on the mini site (got: ${warnings.join(' | ')})`);
    console.log('PASS: static-website — dir-per-page shape (home→root, article→<slug>/index.html, book chapters nested)');
  }

  // ── nav chrome injected; cross-page links are RELATIVE (no absolute /…, no ?page=) ───────────
  {
    const home = pages.get('index.html');
    assert.ok(home.includes('enscribe-site-header'), 'the home page carries the website top bar');
    assert.ok(home.includes('enscribe-site-sidebar'), 'the home page carries the sidebar');
    assert.ok(home.includes('Welcome'), 'the home article body is rendered into the content slot');
    assert.ok(!home.includes('?page='), 'no ?page= SPA-router links remain (a static site does not route by query)');
    // From the home page (dist root, depth 0): a sibling page → `about/index.html`; the book → `guide/index.html`;
    // the brand / home link → `index.html`. RELATIVE + explicit index.html, so file:// and any base path work.
    assert.ok(home.includes('href="about/index.html"'), 'a cross-page nav link is relative to the page (about/index.html)');
    assert.ok(home.includes('href="guide/index.html"'), 'the book page nav link is relative (guide/index.html)');
    assert.ok(home.includes('href="index.html"'), 'the brand / home link is relative (index.html)');
    assert.ok(!/href="\/(?!\/)/.test(home), 'NO absolute-path chrome links (href="/…") — they break on file:// and under a base path');

    // From a DEPTH-1 page (about/index.html): the same targets are reached with a `../` prefix.
    const about = pages.get('about/index.html');
    assert.ok(about.includes('href="../guide/index.html"'), 'a depth-1 page links up-and-over (../guide/index.html)');
    assert.ok(about.includes('href="../index.html"'), 'a depth-1 page links home as ../index.html');

    // a book chapter page also gets the website top bar, relativized for its depth
    const guideHome = pages.get('guide/index.html');
    assert.ok(guideHome.includes('enscribe-site-header'), 'a book page also carries the website top bar');
    assert.ok(guideHome.includes('href="../index.html"'), 'a book page links home as ../index.html (depth 1)');
    assert.ok(!guideHome.includes('?page='), 'a book page has no un-staticized ?page= links');
    console.log('PASS: static-website — chrome injected; cross-page links RELATIVE (file://-safe), no absolute /…, no ?page=');
  }

  // ── every emitted relative link resolves to an emitted page (the file:// "no broken link" gate) ──
  {
    for (const [outPath, html] of pages) {
      const dir = outPath.includes('/') ? outPath.replace(/\/[^/]*$/, '') : '';
      for (const m of html.matchAll(/href="([^"#]+)"/g)) {
        const href = m[1];
        if (/^(https?:|mailto:|#|\/\/)/.test(href) || href.startsWith('/')) continue; // external / in-page / (absolute caught above)
        if (!/\.html?$/.test(href)) continue; // only check page links (not e.g. a fragment-less asset)
        // resolve href relative to this page's directory, normalising ../
        const parts = (dir ? dir.split('/') : []);
        for (const seg of href.split('/')) {
          if (seg === '..') parts.pop();
          else if (seg !== '.' && seg !== '') parts.push(seg);
        }
        const resolved = parts.join('/');
        assert.ok(pages.has(resolved),
          `link "${href}" on page "${outPath}" resolves to an emitted file ("${resolved}")`);
      }
    }
    console.log('PASS: static-website — every relative page link resolves to an emitted file (no broken links on file://)');
  }

  console.log('All static-website (#278) tests passed.');
}
