// `enscribe build --live` — the live-folder build helper (#215).
//
// buildLiveFolder copies the master + its `src` children + the shipped shell assets + engine bundle
// (resolved via @enscribejs/enscribe's package exports) flat into an output dir and writes the
// emitted shell (assetBase './'). This gate proves the result is a SELF-STANDING live folder: every
// asset the shell references resolves inside the folder (no 404), and the deployed shell mounts the
// master via mountLiveShell with the #213 ?edit switch. Built to a temp dir; the engine bundle is
// built first if absent (the build helper copies it).

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildLiveFolder, buildSingleFile } from '../src/build-live.js';
import { buildEnscribePipeline } from '@enscribejs/enscribe';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_MASTER = resolve(__dirname, '../../../examples/savanna-live/book.emd');
const ENSCRIBE_PKG = resolve(__dirname, '../../enscribe');

export function run_tests() {
  // buildLiveFolder copies the engine bundle (resolved via the @enscribejs/enscribe/browser-global
  // export); build it first if it isn't there, so this gate is self-contained.
  let bundlePresent = false;
  try { bundlePresent = existsSync(require.resolve('@enscribejs/enscribe/browser-global')); } catch { bundlePresent = false; }
  if (!bundlePresent) execSync('npm run build:lib', { cwd: ENSCRIBE_PKG, stdio: 'pipe' });

  const out = mkdtempSync(join(tmpdir(), 'enscribe-live-'));
  try {
    const res = buildLiveFolder({ master: EXAMPLE_MASTER, outDir: out, title: 'Live Folder Test' });

    // the master + its discovered children + the four assets + the shell are all in the folder
    assert.ok(existsSync(join(out, 'index.html')), 'index.html is written');
    assert.strictEqual(res.master, 'book.emd', 'the master is copied by basename');
    assert.deepStrictEqual([...res.children].sort(), ['chapter-one.emd', 'chapter-two.emd'],
      'the master\'s src children are discovered and copied');
    for (const name of [res.master, ...res.children, ...res.assets]) {
      assert.ok(existsSync(join(out, name)), `copied into the folder: ${name}`);
    }

    // EVERY local reference in the emitted shell resolves inside the folder (the no-404 gate)
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)].map((m) => m[1])
      .concat([...html.matchAll(/from '(\.\/[^']+)'/g)].map((m) => m[1]));
    assert.ok(refs.length >= 4, 'the shell references the copied assets');
    for (const r of refs) {
      assert.ok(existsSync(join(out, r.slice(2))), `the shell asset resolves (no 404): ${r}`);
    }

    // the deployed flat shell mounts the book and carries the #213 host switch
    assert.ok(html.includes('src="./enscribe.browser.global.js"') && html.includes("from './editor-codemirror.js'"),
      'the shell references the flat-copied engine bundle + default editor');
    assert.ok(html.includes("mountLiveShell('#enscribe-book-root', 'book.emd'") &&
      html.includes("new URLSearchParams(location.search).has('edit')"),
      'the shell mounts the master via mountLiveShell with the #213 ?edit switch');

    // #228: an explicit title is used verbatim (it wins over the document title and filename).
    assert.ok(html.includes('<title>Live Folder Test</title>'),
      'an explicit title is the shell <title>');

    console.log('PASS: #215 cli — buildLiveFolder writes a self-standing live folder; every asset resolves (no 404)');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }

  // ── #228: the shell <title> defaults to the document's own <title>, then the filename ──────────
  // Build to a temp dir and return the emitted shell's <title> text.
  const shellTitleFor = (opts) => {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-live-title-'));
    try {
      buildLiveFolder({ outDir: dir, ...opts });
      const m = readFileSync(join(dir, 'index.html'), 'utf8').match(/<title>([^<]*)<\/title>/);
      return m ? m[1] : null;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  {
    // no explicit title → the master's own <title> ("Savanna Field Notes"), NOT "book.emd"
    assert.strictEqual(shellTitleFor({ master: EXAMPLE_MASTER }), 'Savanna Field Notes',
      'no --title defaults the shell <title> to the document <title>, not the filename');

    // explicit title still wins over the document title
    assert.strictEqual(shellTitleFor({ master: EXAMPLE_MASTER, title: 'Override' }), 'Override',
      'an explicit --title overrides the document <title>');

    // a title-less master → fall back to the filename
    const bareDir = mkdtempSync(join(tmpdir(), 'enscribe-live-bare-'));
    try {
      const bare = join(bareDir, 'untitled.emd');
      writeFileSync(bare, '<meta type=article>\n<author | X>\n</meta>\n\nBody.\n');
      assert.strictEqual(shellTitleFor({ master: bare }), 'untitled.emd',
        'a master with no <title> falls back to the filename');
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }

    console.log('PASS: #228 cli — shell <title> defaults to the document <title> (explicit --title wins; filename fallback)');
  }

  // ── #223/#246: a WEBSITE master's nav pages are copied (they are NOT assembler children) ───────
  {
    // A website's `<item src>` pages live in the nav model, not the assembler child set
    // (MASTER_SRC_TAGS excludes `<item>`) — so the old discovery copied none and the live site 404'd
    // on every page fetch. Build a tiny site to a temp dir and confirm the pages are copied (nested).
    const siteDir = mkdtempSync(join(tmpdir(), 'enscribe-live-site-'));
    const out = mkdtempSync(join(tmpdir(), 'enscribe-live-site-out-'));
    try {
      writeFileSync(join(siteDir, 'site.emd'), [
        '<meta type=website>', '<title | Tiny Site>', '</meta>', '',
        '<nav>', '<item src="pages/a.emd" | A>',
        '<nav-group title="Docs">', '<item src="pages/b.emd" | B>', '</nav-group>', '</nav>',
      ].join('\n'));
      mkdirSync(join(siteDir, 'pages'));
      writeFileSync(join(siteDir, 'pages', 'a.emd'), '<section | Page A>\n\nBody A.');
      writeFileSync(join(siteDir, 'pages', 'b.emd'), '<section | Page B>\n\nBody B.');

      const res = buildLiveFolder({ master: join(siteDir, 'site.emd'), outDir: out });
      assert.deepStrictEqual([...res.children].sort(), ['pages/a.emd', 'pages/b.emd'],
        'the website\'s nav pages (descending groups), NOT assembler children, are discovered + copied');
      // The website master + shell assets sit flat at the folder root.
      assert.ok(existsSync(join(out, res.master)), `website master copied: ${res.master}`);
      for (const name of res.assets) assert.ok(existsSync(join(out, name)), `shell asset copied: ${name}`);
      // #331: each page is deployed in its OWN directory — master at `<src>/index.emd` — so same-named
      // children across pages cannot collide. (The runtime fetches `<src>/index.emd` to match.)
      for (const name of res.children) {
        assert.ok(existsSync(join(out, name, 'index.emd')), `page copied to its own dir: ${name}/index.emd`);
      }
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      assert.ok(html.includes("mountLiveShell('#enscribe-book-root', 'site.emd'"),
        'the shell mounts the website master (mountLiveShell dispatches it to mountLiveWebsite at runtime)');
      assert.ok(html.includes('<title>Tiny Site</title>'), 'the shell <title> is the master\'s <title>');
      console.log('PASS: #223/#246 cli — build --live ships a website folder with its nav pages copied (no 404)');
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
      rmSync(out, { recursive: true, force: true });
    }
  }

  // ── #286: a WEBSITE nav item that resolves to a PAGE-DIRECTORY (src="home" → home/index.emd) ──────
  {
    // Before #286, build --live copyFileSync'd the nav src directly; a page-directory src (home/, the
    // #278 page-body model the static build already supports) threw EISDIR ("illegal operation on a
    // directory"). The fix routes website page srcs through the SAME resolvePageSource the static path
    // uses, mapping the dir to its index.emd entry; the body is emitted at the path the live shell
    // fetches (the raw src). Mixed fixture: one page-directory item + one flat-file item.
    const siteDir = mkdtempSync(join(tmpdir(), 'enscribe-live-pagedir-'));
    const out = mkdtempSync(join(tmpdir(), 'enscribe-live-pagedir-out-'));
    try {
      writeFileSync(join(siteDir, 'site.emd'), [
        '<meta type=website>', '<title | Pagedir Site>', '</meta>', '',
        '<nav>', '<item src="home" | Home>', '<item src="flat.emd" | Flat>', '</nav>',
      ].join('\n'));
      mkdirSync(join(siteDir, 'home'));
      writeFileSync(join(siteDir, 'home', 'index.emd'), '<section | Home Page>\n\nHome body.');
      writeFileSync(join(siteDir, 'flat.emd'), '<section | Flat Page>\n\nFlat body.');

      // The crash repro: this call previously threw EISDIR on the page-directory nav item.
      let res;
      assert.doesNotThrow(
        () => { res = buildLiveFolder({ master: join(siteDir, 'site.emd'), outDir: out }); },
        'build --live no longer throws EISDIR on a page-directory nav item (#286)',
      );

      // The page-directory item is discovered by its raw src, alongside the flat page.
      assert.deepStrictEqual([...res.children].sort(), ['flat.emd', 'home'],
        'the page-directory nav item is discovered by its raw src alongside the flat page');
      // #331: each page's BODY is emitted at `<src>/index.emd` — the path the live shell now fetches —
      // giving every page its own directory (so book children can't collide across pages). The
      // page-directory item's resolved home/index.emd body lands at out/home/index.emd.
      assert.ok(existsSync(join(out, 'home', 'index.emd')), 'the page-directory body is emitted at out/home/index.emd');
      assert.strictEqual(readFileSync(join(out, 'home', 'index.emd'), 'utf8'), '<section | Home Page>\n\nHome body.',
        'out/home/index.emd holds the resolved home/index.emd body');
      // The flat-file page is namespaced the SAME uniform way (`<src>/index.emd`), keyed on the raw src.
      assert.ok(existsSync(join(out, 'flat.emd', 'index.emd')) && existsSync(join(out, 'index.html')),
        'the flat-file page is emitted at out/flat.emd/index.emd (uniform <src>/index.emd) and the shell is written');

      console.log('PASS: #286/#331 cli — build --live deploys each page at <src>/index.emd (own directory; no EISDIR)');
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
      rmSync(out, { recursive: true, force: true });
    }
  }

  // ── #fig-404: a page's co-located figure assets are copied FLAT into the live folder ──────────────
  {
    // A `<fig src=elephant.jpg>` in a page renders `<img src="elephant.jpg">`; the live shell resolves
    // that against its `/live/` location, i.e. FLAT under outDir. Before this, build --live copied the
    // master + sources + shell assets but NOT the co-located images, so every example figure 404'd. The
    // fix copies each page-directory's non-source files (pageDirAssets, shared with the static build)
    // flat. Fixture: a page-directory page with a co-located image + a book page whose chapter has one.
    const siteDir = mkdtempSync(join(tmpdir(), 'enscribe-live-figassets-'));
    const out = mkdtempSync(join(tmpdir(), 'enscribe-live-figassets-out-'));
    try {
      writeFileSync(join(siteDir, 'site.emd'), [
        '<meta type=website>', '<title | Fig Site>', '</meta>', '',
        '<nav>', '<item src="home" | Home>', '<item src="book" | Book>', '</nav>',
      ].join('\n'));
      // a flat page-directory with a co-located image
      mkdirSync(join(siteDir, 'home'));
      writeFileSync(join(siteDir, 'home', 'index.emd'), '<section | Home>\n\n<fig src=pic.png | A picture.>');
      writeFileSync(join(siteDir, 'home', 'pic.png'), Buffer.from('\x89PNG\r\n\x1a\n-home-pic', 'binary'));
      // a BOOK page whose chapter references a co-located image (in the book's own directory)
      mkdirSync(join(siteDir, 'book'));
      writeFileSync(join(siteDir, 'book', 'index.emd'),
        '<meta type=book>\n<title | B>\n</meta>\n\n<chapter src="ch.emd" | Ch>');
      writeFileSync(join(siteDir, 'book', 'ch.emd'), '<section | Ch>\n\n<fig src=plot.png | A plot.>');
      writeFileSync(join(siteDir, 'book', 'plot.png'), Buffer.from('\x89PNG\r\n\x1a\n-book-plot', 'binary'));
      // a non-image co-located file is carried too; a sibling .emd that is NOT a source is left to the
      // source-copy path (we only assert images here)

      buildLiveFolder({ master: join(siteDir, 'site.emd'), outDir: out });

      // Both images land FLAT in the live folder — a rendered `<img src>` resolves against the /live/
      // DOCUMENT base, not the chapter source, so assets MUST stay flat (#331 keeps them flat on purpose;
      // namespacing them would 404 or break live≡static parity).
      assert.ok(existsSync(join(out, 'pic.png')), 'the home page co-located image is copied flat (out/pic.png)');
      assert.ok(existsSync(join(out, 'plot.png')), 'the book chapter co-located image is copied flat (out/plot.png)');
      assert.strictEqual(readFileSync(join(out, 'pic.png')).toString('binary'), '\x89PNG\r\n\x1a\n-home-pic',
        'the copied image is byte-for-byte the source');
      // #331: the chapter SOURCE is now nested under the book page's own dir (out/book/ch.emd), where the
      // master-relative runtime fetch finds it — while the image stays flat.
      assert.ok(existsSync(join(out, 'book', 'ch.emd')), 'the book chapter source is copied under its page dir (out/book/ch.emd)');

      console.log('PASS: #fig-404/#331 cli — figure assets stay FLAT; chapter sources nest under the page dir');
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
      rmSync(out, { recursive: true, force: true });
    }
  }

  // ── #331: two book pages with SAME-named children land in SEPARATE per-page dirs (no flat collision) ──
  {
    // The share-blocker: before #331 every page's children were copied FLAT, so two books each with a
    // `frameables.emd` collided last-wins under outDir and one book served the OTHER's chapter content.
    // Now each page is deployed at `<src>/index.emd` with its children beside it, so same-named children
    // stay distinct. Fixture: two book pages, each with a `shared.emd` chapter carrying DISTINCT content.
    const siteDir = mkdtempSync(join(tmpdir(), 'enscribe-live-collide-'));
    const out = mkdtempSync(join(tmpdir(), 'enscribe-live-collide-out-'));
    try {
      writeFileSync(join(siteDir, 'site.emd'), [
        '<meta type=website>', '<title | Two Books>', '</meta>', '',
        '<nav>', '<item src="alpha" | Alpha>', '<item src="beta" | Beta>', '</nav>',
      ].join('\n'));
      for (const [book, marker] of [['alpha', 'ALPHA-only frameable'], ['beta', 'BETA-only frameable']]) {
        mkdirSync(join(siteDir, book));
        writeFileSync(join(siteDir, book, 'index.emd'),
          `<meta type=book>\n<title | ${book}>\n</meta>\n\n<chapter src="shared.emd" | Shared>`);
        writeFileSync(join(siteDir, book, 'shared.emd'), `<section | Shared>\n\n${marker}.`);
      }

      buildLiveFolder({ master: join(siteDir, 'site.emd'), outDir: out });

      // Each book's master + its same-named child live in the book's OWN directory — no collision.
      assert.ok(existsSync(join(out, 'alpha', 'index.emd')) && existsSync(join(out, 'beta', 'index.emd')),
        'each book master is at its own <src>/index.emd');
      assert.ok(existsSync(join(out, 'alpha', 'shared.emd')) && existsSync(join(out, 'beta', 'shared.emd')),
        'each book\'s same-named child sits beside its own master (no flat collision)');
      assert.match(readFileSync(join(out, 'alpha', 'shared.emd'), 'utf8'), /ALPHA-only/,
        'out/alpha/shared.emd holds ALPHA\'s content');
      assert.match(readFileSync(join(out, 'beta', 'shared.emd'), 'utf8'), /BETA-only/,
        'out/beta/shared.emd holds BETA\'s content (NOT alpha\'s — the #331 wrong-content bug is gone)');
      // And NOT a single flat shared.emd at the root (the old collided layout).
      assert.ok(!existsSync(join(out, 'shared.emd')),
        'no flat root-level shared.emd (the old last-wins collision is gone)');

      console.log('PASS: #331 cli — same-named children across book pages stay distinct (per-page-dir; no flat collision)');
    } finally {
      rmSync(siteDir, { recursive: true, force: true });
      rmSync(out, { recursive: true, force: true });
    }
  }

  // ── build --single-file (delivery-modes.md §Single-file): one file, embedded source, edit gate ──
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-single-'));
    try {
      const selfContained = '<meta type=article>\n<title | Solo Doc>\n</meta>\n\n<section | Body>\n\nSelf-contained `text`.';
      const soloPath = join(dir, 'solo.emd');
      writeFileSync(soloPath, selfContained);

      // self-contained → editable, one file, source embedded + mounted via mountLiveDocument (no fetch)
      const solo = buildSingleFile({ master: soloPath, warn: () => {} });
      assert.strictEqual(solo.editable, true, 'a self-contained document is editable');
      assert.deepStrictEqual(solo.childSrcs, [], 'no `<… src>` children');
      assert.ok(solo.html.includes('<template id="enscribe-source">'), 'the source is embedded in a <template>');
      assert.ok(/\.mountLiveDocument\('#enscribe-book-root'/.test(solo.html) && !solo.html.includes(".mountLiveShell('"),
        'the file mounts via mountLiveDocument (embedded read), not the fetching mountLiveShell');
      assert.ok(/cdn\.jsdelivr\.net\/npm\/@enscribejs\/enscribe@0\.4\.1\/dist\/enscribe\.browser\.global\.js/.test(solo.html),
        'the engine loads from the pinned npm CDN @0.4.1 (no embedded engine, no sibling assets)');
      assert.ok(solo.html.includes('codeMirrorEditorFactory'), 'editable → the editor is wired');
      // the source is embedded HTML-escaped (the round-trip via <template>.content.textContent is
      // proven in the engine suite's single-file test; here we confirm the escaped content is carried)
      assert.ok(solo.html.includes('&lt;section | Body&gt;') && solo.html.includes('Self-contained `text`.'),
        'the document source is embedded (HTML-escaped) in the file');

      // a document WITH `<… src>` children → render-only (gate C): warns, no editor wired
      const multiPath = join(dir, 'multi.emd');
      writeFileSync(multiPath, '<meta type=article>\n<title | Multi>\n</meta>\n\n<section src=a.emd />\n<section src=b.emd />');
      let warned = '';
      const multi = buildSingleFile({ master: multiPath, warn: (m) => { warned = m; } });
      assert.strictEqual(multi.editable, false, 'a document with `<… src>` children is NOT editable (render-only)');
      assert.deepStrictEqual([...multi.childSrcs].sort(), ['a.emd', 'b.emd'], 'the children are discovered');
      assert.ok(/render-only|self-contained/i.test(warned), 'a non-self-contained single-file emit warns');
      assert.ok(!multi.html.includes('codeMirrorEditorFactory') && multi.html.includes('const opts = {};'),
        'render-only → no editor module, edit disabled');

      console.log('PASS: single-file cli — buildSingleFile: self-contained→editable (embedded source, web assets); children→render-only (gate C)');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // ── #313 slice 4: binary packaging — the single file EMBEDS its external referenced assets ──────────
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-pkg-'));
    // Render the source embedded in a single-file's <template> (decode the entities the template carries),
    // through the SAME pipeline the browser mount uses — so we prove the embedded file actually renders.
    const renderEmbedded = (html) => {
      // The REAL <template> element (its content), not the comment that mentions the literal tag — so
      // anchor on the LAST occurrence (lastIndexOf), exactly as the browser's getElementById would target it.
      const OPEN = '<template id="enscribe-source">';
      const after = html.slice(html.lastIndexOf(OPEN) + OPEN.length);
      const tpl = after.slice(0, after.indexOf('</template>'));
      const src = tpl.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
      const proc = buildEnscribePipeline({});
      const file = { data: {} };
      return String(proc.stringify(proc.runSync(proc.parse(src), file), file));
    };
    try {
      // A tiny real PNG + a CSV with a # in a cell (opacity check).
      const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      writeFileSync(join(dir, 'cat.png'), Buffer.from(PNG_B64, 'base64'));
      writeFileSync(join(dir, 'data.csv'), 'item,code\nbolt,#B-1\nnut,#N-2\n');

      // (1) EXTERNAL fig → embedded as a data: URI in the source; no bare path survives.
      const figPath = join(dir, 'ext-fig.emd');
      writeFileSync(figPath, '<meta type=article>\n<title | F</title>\n</meta>\n\n<section | S>\n\n<fig src="cat.png" | A cat.>');
      const fig = buildSingleFile({ master: figPath, warn: () => {} });
      assert.strictEqual(fig.embeddedAssets, 1, 'external fig: one asset embedded');
      assert.ok(fig.html.includes(`data:image/png;base64,${PNG_B64}`), 'external fig: the PNG bytes are embedded as a data: URI in the source');
      assert.ok(!/src="cat\.png"|src=cat\.png/.test(fig.html), 'external fig: no bare external path survives');
      assert.match(renderEmbedded(fig.html), new RegExp(`<img[^>]*src="data:image/png;base64,${PNG_B64.slice(0, 16)}`), 'external fig: the embedded source renders an <img> with the data: URI (self-contained)');
      assert.strictEqual(fig.editable, true, 'embedding an external ASSET does not flip editability (it is not a structure child)');

      // (2) EXTERNAL table → embedded as inline long-form data; renders a grid; # cell is literal (opaque).
      const tabPath = join(dir, 'ext-table.emd');
      writeFileSync(tabPath, '<meta type=article>\n<title | T</title>\n</meta>\n\n<section | S>\n\n<table csv src="data.csv" />');
      const tab = buildSingleFile({ master: tabPath, warn: () => {} });
      assert.strictEqual(tab.embeddedAssets, 1, 'external table: one asset embedded');
      assert.ok(!/src="data\.csv"/.test(tab.html), 'external table: no bare external path survives');
      const tabHtml = renderEmbedded(tab.html);
      assert.match(tabHtml, /<th>item<\/th>/, 'external table: the embedded data renders a grid (header)');
      assert.match(tabHtml, /<td>bolt<\/td>/, 'external table: a body cell renders');
      assert.ok(tabHtml.includes('#B-1') && !/<h1/.test(tabHtml), 'external table: a # in a cell is literal text (opaque), not a heading');
      assert.strictEqual(tab.editable, true, 'embedding an external table source does not flip editability');

      // (3) REGRESSION — an EMBEDDED asset + a <dataset> already travel (nothing external to embed).
      const embPath = join(dir, 'emb.emd');
      writeFileSync(embPath, [
        '<meta type=article>', '<title | E</title>', '</meta>', '',
        '<section | S>', '', '<fig src="@logo" | logo>', '', '<table src="@grid" />', '',
        '<data>', `<fig #logo png>${PNG_B64}</fig>`, '<dataset #grid csv>\na,b\n1,2\n</dataset>', '</data>',
      ].join('\n'));
      const emb = buildSingleFile({ master: embPath, warn: () => {} });
      assert.strictEqual(emb.embeddedAssets, 0, 'embedded asset + dataset: nothing external to embed (they already travel in the source)');
      const embHtml = renderEmbedded(emb.html);
      assert.match(embHtml, new RegExp(`<img[^>]*src="data:image/png;base64,${PNG_B64.slice(0, 16)}`), 'embedded @id fig still resolves to a data: URI img');
      assert.match(embHtml, /<th>a<\/th>/, 'embedded @id dataset still renders a table grid');

      // (4) @id / data: / http(s) src are NOT treated as external files (left untouched).
      const skipPath = join(dir, 'skip.emd');
      writeFileSync(skipPath, '<meta type=article>\n<title | K</title>\n</meta>\n\n<section | S>\n\n<fig src="@a" | x>\n\n<fig src="data:image/png;base64,ZZ" | y>\n\n<fig src="https://example.com/i.png" | z>');
      const skip = buildSingleFile({ master: skipPath, warn: () => {} });
      assert.strictEqual(skip.embeddedAssets, 0, '@id / data: / http(s) srcs are not local files — none embedded');
      assert.ok(skip.html.includes('https://example.com/i.png'), 'an http(s) src is left untouched (portable from the web)');

      console.log('PASS: #313/4 cli — single-file embeds external fig (data: URI) + external table (inline); embedded/@id/dataset travel; editability unchanged');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
