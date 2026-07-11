// Tests for the enscribe CLI.
//
// Most cases drive run() directly with injected stdout/stderr buffers — fast and
// deterministic. Two cases spawn the real bin (`node bin/enscribe.js …`) to cover
// the executable wrapper, the shebang path, and the process exit code.
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync, readdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { run } from '../src/cli.js';
import { hasPandoc } from '../src/pandoc-import.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, 'fixtures', 'sample.emd');
const JATS_FIXTURE = join(__dirname, 'fixtures', 'article.xml');
const BOOK_FIXTURE = join(__dirname, 'fixtures', 'book.emd');
const WEBSITE_FIXTURE = join(__dirname, 'fixtures', 'website.emd');
const TEX_FIXTURE = join(__dirname, 'fixtures', 'paper.tex');
const BIN = join(__dirname, '..', 'bin', 'enscribe.js');
const VERSION = createRequire(import.meta.url)('../package.json').version;

// A minimal Writable-like sink that accumulates written strings.
function sink() {
  return { text: '', write(s) { this.text += s; return true; } };
}

/** Drive run() with captured streams. */
function invoke(argv) {
  const out = sink(), err = sink();
  const code = run(argv, { stdout: out, stderr: err });
  return { code, out: out.text, err: err.text };
}

export function run_tests() {
  // ── render → HTML ──────────────────────────────────────────────────────────
  {
    const { code, out } = invoke(['render', FIXTURE]);
    assert.equal(code, 0, 'render exits 0');
    assert.ok(out.includes('<article>'), 'render emits an <article>');
    assert.ok(out.includes('<section id="sec:intro">'), 'section with id rendered');
    assert.ok(out.includes('<b>bold</b>') && out.includes('<i>italic</i>'), 'inline formatting rendered');
    assert.ok(out.includes('katex'), 'inline math rendered via KaTeX');
    // Default is --embed (self-contained): KaTeX CSS inlined, not linked.
    assert.ok(out.includes('<style') && !out.includes('katex.min.css"'), 'default render is self-contained (--embed)');
    console.log('PASS: render → self-contained HTML');
  }

  // ── render default → complete styled standalone page (#395 D2 / audit W3) ───
  {
    const { out } = invoke(['render', FIXTURE]);
    assert.ok(out.startsWith('<!DOCTYPE html>'), 'default output opens with the doctype (standards mode)');
    assert.ok(out.includes('<meta charset="UTF-8">'), 'charset present');
    assert.match(out, /<title>[^<]+<\/title>/, 'a real <title> derived from the document');
    assert.ok(out.includes('--enscribe-content-width'), 'default stylesheet inlined (styled by default)');
    assert.ok(out.trimEnd().endsWith('</html>'), 'the page closes properly');

    // --fragment: the pre-#395 bare-eHTML output, demoted to an explicit choice.
    const frag = invoke(['render', FIXTURE, '--fragment']);
    assert.equal(frag.code, 0, '--fragment exits 0');
    assert.ok(!frag.out.includes('<!DOCTYPE') && !frag.out.includes('<title>'), '--fragment has no shell');
    assert.ok(!frag.out.includes('--enscribe-content-width'), '--fragment inlines no default stylesheet');
    assert.ok(frag.out.includes('<article>'), '--fragment still carries the document');

    // --css replaces the inlined default stylesheet with a link.
    const linked = invoke(['render', FIXTURE, '--css', 'house.css']);
    assert.ok(linked.out.includes('<link rel="stylesheet" href="house.css">'), '--css links the given sheet');
    assert.ok(!linked.out.includes('--enscribe-content-width'), '--css REPLACES the default sheet (not adds)');

    // --emit-css makes the default stylesheet obtainable (audit W3); no input needed.
    const css = invoke(['render', '--emit-css']);
    assert.equal(css.code, 0, '--emit-css exits 0 without an input document');
    assert.ok(css.out.includes('--enscribe-content-width') && !css.out.includes('<!DOCTYPE'), '--emit-css prints the raw stylesheet');

    // --fragment + --css is a contradiction, refused helpfully.
    const clash = invoke(['render', FIXTURE, '--fragment', '--css', 'x.css']);
    assert.equal(clash.code, 1, '--fragment --css exits 1');
    assert.ok(clash.err.includes('--fragment'), 'the conflict message names the flags');

    // --title overrides the derived title.
    const titled = invoke(['render', FIXTURE, '--title', 'My Page']);
    assert.ok(titled.out.includes('<title>My Page</title>'), '--title overrides the derived title');
    console.log('PASS: render default → styled standalone; --fragment/--css/--emit-css/--title surface');
  }

  // ── render --no-embed → external asset links ────────────────────────────────
  {
    const { code, out } = invoke(['render', FIXTURE, '--no-embed']);
    assert.equal(code, 0);
    assert.ok(out.includes('katex.min.css') || out.includes('fonts.googleapis.com'), '--no-embed links assets externally');
    console.log('PASS: render --no-embed → external assets');
  }

  // ── render --toc → table-of-contents sidebar markup ─────────────────────────
  {
    const plain = invoke(['render', FIXTURE]);
    const toc = invoke(['render', FIXTURE, '--toc']);
    assert.equal(toc.code, 0, 'render --toc exits 0');
    assert.ok(toc.out.includes('<nav class="enscribe-toc"') && toc.out.includes('enscribe-layout--toc'), '--toc adds the ToC nav + layout');
    assert.ok(toc.out.includes('href="#sec:intro"'), '--toc links the sections');
    assert.ok(!plain.out.includes('<nav class="enscribe-toc"'), 'no --toc → no ToC markup (opt-in)');
    // bad value rejected
    const bad = invoke(['render', FIXTURE, '--toc=sidebar']);
    assert.equal(bad.code, 1, "--toc with a bad value exits 1");
    assert.ok(bad.err.includes("--toc takes 'auto'"), 'helpful message for bad --toc value');
    console.log('PASS: render --toc → ToC sidebar markup');
  }

  // ── render --theme → injected theme CSS ─────────────────────────────────────
  {
    const plain = invoke(['render', FIXTURE]);
    const modern = invoke(['render', FIXTURE, '--theme', 'modern']);
    assert.equal(modern.code, 0, 'render --theme modern exits 0');
    assert.ok(modern.out.includes('Modern theme') && modern.out.includes('--enscribe-font-body'), '--theme modern injects modern.css');
    assert.ok(!plain.out.includes('Modern theme'), 'no --theme → no theme CSS');
    const compact = invoke(['render', FIXTURE, '--theme=compact']);
    assert.ok(compact.out.includes('Compact theme'), '--theme=compact injects compact.css');
    console.log('PASS: render --theme → injected theme CSS');
  }

  // ── render --toc → book reading interface; --chapter-nav opts into paging ────
  {
    const paging = (out) => out.includes("'Show whole book'"); // marker of the opt-in paging script
    const withToc = invoke(['render', BOOK_FIXTURE, '--toc']);
    assert.equal(withToc.code, 0, 'render book --toc exits 0');
    assert.ok(withToc.out.includes('<book-part'), 'book renders book-part chapters');
    // Slice C: the default book + --toc is the one-scroll reading interface, NOT paging.
    assert.ok(withToc.out.includes('enscribe-layout--book'), 'book + --toc → reading-interface layout');
    assert.ok(!paging(withToc.out), 'book + --toc does NOT page by default (one scrolling document)');
    const withPaging = invoke(['render', BOOK_FIXTURE, '--toc', '--chapter-nav']);
    assert.ok(paging(withPaging.out), '--chapter-nav opts INTO the single-chapter paging view');
    const noToc = invoke(['render', BOOK_FIXTURE]);
    assert.ok(!paging(noToc.out) && !noToc.out.includes('class="enscribe-layout--book'), 'no --toc → no chrome, no paging');
    console.log('PASS: render book --toc → reading interface; --chapter-nav → opt-in paging');
  }

  // ── import (pandoc bridge) ──────────────────────────────────────────────────
  {
    // These need no pandoc:
    const help = invoke(['import', '--help']);
    assert.equal(help.code, 0);
    assert.ok(help.out.includes('import LaTeX / Quarto / DOCX') && help.out.includes('--from'), 'import --help');

    const missing = invoke(['import', 'no-such-file.tex']);
    assert.equal(missing.code, 1, 'missing input → exit 1');
    assert.ok(missing.err.includes('input file not found'), 'helpful message for missing input');

    if (hasPandoc()) {
      const html = invoke(['import', TEX_FIXTURE]);
      assert.equal(html.code, 0, 'import .tex exits 0 (pandoc present)');
      assert.ok(html.out.includes('<article>'), 'import → an <article>');
      assert.ok(html.out.includes('<b>bold</b>') && html.out.includes('<i>italic</i>'), 'LaTeX bold/italic imported');
      assert.ok(html.out.includes('katex'), 'LaTeX math rendered via KaTeX');
      assert.match(html.out, /<section-title>\s*<h2>Introduction<\/h2>/, 'sections imported');
      const emd = invoke(['import', TEX_FIXTURE, '--emd']);
      assert.ok(emd.out.includes('<section #') && (emd.out.includes('<b | bold>') || emd.out.includes('<b>bold</b>')), '--emd → canonical source');
      console.log('PASS: import .tex via pandoc (HTML + --emd)');
    } else {
      const noPandoc = invoke(['import', TEX_FIXTURE]);
      assert.equal(noPandoc.code, 1, 'missing pandoc → exit 1');
      assert.ok(noPandoc.err.includes('pandoc is required') && noPandoc.err.includes('pandoc.org/installing'), 'helpful pandoc-install message');
      console.log('PASS: import → helpful error when pandoc is not installed (functional test skipped)');
    }
  }

  // ── export-jats → JATS XML ──────────────────────────────────────────────────
  {
    const { code, out } = invoke(['export-jats', FIXTURE]);
    assert.equal(code, 0, 'export-jats exits 0');
    assert.ok(out.startsWith('<?xml'), 'XML declaration present');
    assert.ok(out.includes('JATS-archivearticle1-3.dtd'), 'JATS 1.3 doctype');
    assert.ok(out.includes('<article-title>A CLI Sample Document</article-title>'), 'title exported');
    assert.ok(out.includes('<string-name>The Enscribe Project</string-name>'), 'author exported');
    assert.ok(out.includes('<bold>bold</bold>') && out.includes('<italic>italic</italic>'), 'inline → JATS inline');
    assert.ok(out.includes('<inline-formula><tex-math>'), 'math → inline-formula/tex-math');
    console.log('PASS: export-jats → JATS 1.3 XML');
  }

  // ── export-jats refuses a website (HTML-only; #246) ──────────────────────────
  {
    const { code, err } = invoke(['export-jats', WEBSITE_FIXTURE]);
    assert.equal(code, 1, 'export-jats on a <meta type=website> exits non-zero');
    assert.ok(/no JATS\/BITS projection/.test(err), 'the error explains a website is HTML-only');
    console.log('PASS: export-jats refuses a website (no JATS/BITS projection)');
  }

  // ── export-jats --package → self-contained package (dir + assets/), href rewrite (#313) ──────
  {
    const PKG_FIXTURE = join(__dirname, 'fixtures', 'jats-package', 'article.emd');
    const PKG_ASSET   = join(__dirname, 'fixtures', 'jats-package', 'logo.png');
    const outDir = mkdtempSync(join(tmpdir(), 'enscribe-jats-pkg-'));
    try {
      const { code, out } = invoke(['export-jats', PKG_FIXTURE, '--package', '-o', outDir]);
      assert.equal(code, 0, 'export-jats --package exits 0');
      const xmlPath = join(outDir, 'article.xml');
      const assetPath = join(outDir, 'assets', 'logo.png');
      assert.ok(existsSync(xmlPath), 'package writes <stem>.xml');
      assert.ok(existsSync(assetPath), 'package copies the external asset into assets/');
      assert.equal(Buffer.compare(readFileSync(PKG_ASSET), readFileSync(assetPath)), 0,
        'the copied asset is byte-identical to the source');
      const xml = readFileSync(xmlPath, 'utf8');
      assert.ok(xml.includes('<graphic xlink:href="assets/logo.png"/>'),
        'the figure href is rewritten to the package-relative assets/ path');
      assert.ok(!xml.includes('xlink:href="logo.png"'), 'no dangling as-authored href remains');
      assert.ok(out.includes('assets/'), 'the CLI reports the package it wrote');
      console.log('PASS: export-jats --package → dir + assets/, href rewritten, asset copied byte-identical');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }

  // ── export-jats (lone-file) on a doc with an external asset → warns it will dangle (#313) ─────
  {
    const PKG_FIXTURE = join(__dirname, 'fixtures', 'jats-package', 'article.emd');
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...a) => warnings.push(a.join(' '));
    let out;
    try {
      out = invoke(['export-jats', PKG_FIXTURE]).out;
    } finally {
      console.warn = origWarn;
    }
    assert.ok(out.includes('<graphic xlink:href="logo.png"/>'),
      'lone-file mode leaves the external href as authored (back-compat, dangling)');
    assert.ok(warnings.some((w) => /will dangle/.test(w)),
      'lone-file mode warns that the external reference will dangle');
    console.log('PASS: export-jats (lone-file) leaves external hrefs as-authored + warns they dangle');
  }

  // ── export-jats --package without -o → a helpful error ───────────────────────────────────────
  {
    const PKG_FIXTURE = join(__dirname, 'fixtures', 'jats-package', 'article.emd');
    const { code, err } = invoke(['export-jats', PKG_FIXTURE, '--package']);
    assert.equal(code, 1, '--package without -o exits non-zero');
    assert.ok(/needs an output directory/.test(err), 'the error explains -o <dir> is required');
    console.log('PASS: export-jats --package without -o → helpful error');
  }

  // ── lift → canonical source ─────────────────────────────────────────────────
  {
    const { code, out } = invoke(['lift', FIXTURE]);
    assert.equal(code, 0, 'lift exits 0');
    assert.ok(out.includes('<meta type=article>'), 'meta block emitted');
    assert.ok(out.includes('<section #sec:intro | Introduction>'), 'sigil heading → canonical <section> with id');
    assert.ok(out.includes('<b | bold>') || out.includes('<b>bold</b>'), 'markdown **bold** → canonical <b>');
    assert.ok(out.includes('<i | italic>') || out.includes('<i>italic</i>'), 'markdown *italic* → canonical <i>');
    assert.ok(out.includes('<$E = mc^2$>') || out.includes('$E = mc^2$'), 'inline math → opaque math form');
    assert.ok(!out.includes('**') && !/^#+ /m.test(out), 'no markdown bold/heading idioms remain');
    console.log('PASS: lift → canonical source');
  }

  // ── lower → shorthand / markdown ────────────────────────────────────────────
  {
    const sh = invoke(['lower', FIXTURE]);
    assert.equal(sh.code, 0, 'lower exits 0');
    assert.ok(sh.out.includes('<# Results #>'), 'lower → section sigil (no-id section)');
    assert.ok(sh.out.includes('<# #sec:intro | Introduction #>'), 'lower → section sigil carrying the id');
    assert.ok(!sh.out.includes('<section'), 'no canonical <section> tag remains');

    const md = invoke(['lower', '--markdown', FIXTURE]);
    assert.equal(md.code, 0);
    assert.ok(/^# Results$/m.test(md.out), 'lower --markdown → markdown heading for the no-id section');
    assert.ok(md.out.includes('**bold**') && md.out.includes('*italic*'), 'lower --markdown → markdown bold/italic');
    // An id-bearing section cannot be a markdown heading (lossy), so it stays a sigil.
    assert.ok(md.out.includes('<# #sec:intro | Introduction #>'), 'lower --markdown keeps the id-bearing section as a sigil');
    console.log('PASS: lower → shorthand / markdown');
  }

  // ── import-jats → HTML and --emd ────────────────────────────────────────────
  {
    const html = invoke(['import-jats', JATS_FIXTURE]);
    assert.equal(html.code, 0, 'import-jats exits 0');
    assert.ok(html.out.includes('<article>'), 'import-jats → an <article>');
    assert.match(html.out, /<article-title>\s*<h1>A Small JATS Article<\/h1>/, 'title imported');
    assert.ok(html.out.includes('<b>bold</b>') && html.out.includes('<i>italic</i>'), 'inline imported');
    assert.match(html.out, /<section-title>\s*<h2>Introduction<\/h2>/, 'section imported');

    // citations resolve in the rendered output, and a bibliography is present.
    assert.ok(html.out.includes('data-keys="ref-doe2020"') || html.out.includes('Doe'), 'cite resolved in HTML');
    assert.ok(html.out.includes('An Earlier Study'), 'bibliography rendered in HTML');
    // math (inline tex-math + display formula) renders via KaTeX.
    assert.ok(html.out.includes('katex'), 'imported math renders via KaTeX in HTML');
    // figure, table, and cross-references render; footnote inlined.
    assert.ok(html.out.includes('src="plot.png"'), 'imported figure image rendered');
    assert.ok(!/\?\?ref/.test(html.out), 'imported cross-references resolve');
    // theorem family + DSL block render.
    assert.ok(/Theorem/i.test(html.out) && html.out.includes('Main Result'), 'imported theorem renders');
    assert.ok(/data-enscribe-dsl="mermaid"|class="mermaid/.test(html.out), 'imported mermaid DSL renders');
    // reduction policy: reader content preserved, publishing metadata dropped.
    assert.ok(html.out.includes('Keywords:') && html.out.includes('importing, round-trip'), 'keywords preserved');
    assert.ok(html.out.includes('Funded by Grant 7') && html.out.includes('We thank our collaborators'), 'funding + acknowledgments preserved');
    assert.ok(!html.out.includes('1234-5678') && !html.out.includes('CC-BY'), 'metadata (ISSN, license) dropped, not rendered');

    const emd = invoke(['import-jats', '--emd', JATS_FIXTURE]);
    assert.equal(emd.code, 0);
    assert.ok(emd.out.includes('<meta type=article>'), '--emd → canonical meta');
    assert.ok(emd.out.includes('<section #sec:intro | Introduction>'), '--emd → canonical section with id');
    assert.ok(emd.out.includes('<section | Results>'), '--emd → canonical section (no id)');
    assert.ok(emd.out.includes('<b | bold>') || emd.out.includes('<b>bold</b>'), '--emd → canonical bold');
    assert.ok(emd.out.includes('<cite @ref-doe2020>'), '--emd → in-text cite');
    assert.ok(emd.out.includes('@article{ref-doe2020,'), '--emd → BibTeX entry in library');
    assert.ok(emd.out.includes('<bibliography>'), '--emd → bibliography placement');
    assert.ok(emd.out.includes('<$E = mc^2$>'), '--emd → inline math sigil');
    assert.ok(emd.out.includes('<$$ #eqn:result |') || emd.out.includes('\\sum_{i=1}^{n} x_i'), '--emd → display math with id');
    assert.ok(emd.out.includes('<fig #fig:fig1 src=plot.png |'), '--emd → canonical figure');
    assert.ok(emd.out.includes('<table #tab:tab1 csv'), '--emd → canonical table');
    assert.ok(emd.out.includes('<ref @fig:fig1>') && emd.out.includes('<ref @tab:tab1>'), '--emd → cross-references');
    assert.ok(emd.out.includes('<note | An imported footnote.>'), '--emd → inlined footnote');
    assert.ok(emd.out.includes('<theorem #thm:main name="Main Result"'), '--emd → canonical theorem');
    assert.ok(emd.out.includes('<ref @thm:main>'), '--emd → theorem cross-reference');
    assert.ok(emd.out.includes('<mermaid #fig:fig-flow'), '--emd → DSL block with preserved source');
    console.log('PASS: import-jats → HTML and --emd');
  }

  // ── import-jats renders imported DSL diagrams by default (#172) ──────────────
  // article.xml carries a Mermaid figure (<fig specific-use="enscribe-dsl-mermaid">).
  // Before #172 the import command left dslMode unset → 'skip', shipping the
  // diagram as un-rendered <pre> source (unlike `render`). Now it inherits the
  // same standalone DSL posture; --dsl-mode still overrides.
  {
    const live = invoke(['import-jats', JATS_FIXTURE]);            // default: embed → live-inline
    const skip = invoke(['import-jats', JATS_FIXTURE, '--dsl-mode', 'skip']);
    assert.equal(live.code, 0, 'import-jats exits 0');
    assert.ok(live.out.includes('data-enscribe-dsl="mermaid"'), 'the imported mermaid figure is present');
    assert.ok(live.out.includes('mermaid.initialize'),
      'default import-jats renders the diagram (mermaid runtime injected, not bare <pre>)');
    assert.ok(!skip.out.includes('mermaid.initialize'),
      '--dsl-mode skip still ships the diagram un-rendered (explicit override honored)');
    console.log('PASS: #172 — import-jats renders imported diagrams by default');
  }

  // ── -o writes to a file ─────────────────────────────────────────────────────
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-cli-'));
    const outFile = join(dir, 'out.html');
    try {
      const { code } = invoke(['render', FIXTURE, '-o', outFile]);
      assert.equal(code, 0);
      assert.ok(existsSync(outFile), '-o created the file');
      assert.ok(readFileSync(outFile, 'utf8').includes('<article>'), '-o file holds the HTML');
      console.log('PASS: -o writes output to a file');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // ── --version / --help ──────────────────────────────────────────────────────
  {
    const v = invoke(['--version']);
    assert.equal(v.code, 0);
    assert.equal(v.out.trim(), VERSION, '--version prints the package version');

    const h = invoke(['--help']);
    assert.equal(h.code, 0);
    assert.ok(h.out.includes('Usage:') && h.out.includes('render') && h.out.includes('export-jats'), '--help lists commands');

    const none = invoke([]);
    assert.equal(none.code, 0);
    assert.ok(none.out.includes('Usage:'), 'no args prints help');

    const rh = invoke(['render', '--help']);
    assert.equal(rh.code, 0);
    assert.ok(rh.out.includes('--no-embed') && rh.out.includes('--dsl-mode'), 'render --help shows command options');
    console.log('PASS: --version, --help, render --help');
  }

  // ── error cases: exit 1 + helpful message ───────────────────────────────────
  {
    const missing = invoke(['render']);
    assert.equal(missing.code, 1, 'missing input → exit 1');
    assert.ok(missing.err.includes('no input file'), 'helpful message for missing input');

    const notFound = invoke(['render', 'does-not-exist.emd']);
    assert.equal(notFound.code, 1, 'file not found → exit 1');
    assert.ok(notFound.err.includes('not found'), 'helpful message for missing file');

    const badCmd = invoke(['frobnicate', 'x.emd']);
    assert.equal(badCmd.code, 1, 'unknown command → exit 1');
    assert.ok(badCmd.err.includes("unknown command 'frobnicate'"), 'helpful message for unknown command');

    const badFlag = invoke(['render', FIXTURE, '--wat']);
    assert.equal(badFlag.code, 1, 'unknown flag → exit 1');
    assert.ok(badFlag.err.includes('unknown option'), 'helpful message for unknown flag');

    const badMode = invoke(['render', FIXTURE, '--dsl-mode', 'nonsense']);
    assert.equal(badMode.code, 1, 'bad dsl-mode → exit 1');
    assert.ok(badMode.err.includes('--dsl-mode must be one of'), 'helpful message for bad dsl-mode');
    console.log('PASS: error cases exit 1 with helpful messages');
  }

  // ── real bin invocation (spawn) ─────────────────────────────────────────────
  {
    const r = spawnSync(process.execPath, [BIN, 'render', FIXTURE], { encoding: 'utf8' });
    assert.equal(r.status, 0, 'node bin/enscribe.js render → exit 0');
    assert.ok(r.stdout.includes('<article>'), 'spawned render emits HTML to stdout');

    const v = spawnSync(process.execPath, [BIN, '--version'], { encoding: 'utf8' });
    assert.equal(v.status, 0);
    assert.equal(v.stdout.trim(), VERSION, 'spawned --version prints version');

    const bad = spawnSync(process.execPath, [BIN, 'render', 'nope.emd'], { encoding: 'utf8' });
    assert.equal(bad.status, 1, 'spawned error → exit 1');
    assert.ok(bad.stderr.includes('not found'), 'spawned error message on stderr');
    console.log('PASS: real bin invocation (spawn) — stdout/stderr/exit code');
  }

  // ── build → static separate-pages book (default) + --single-page (P1) ────────
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-build-pages-'));
    try {
      const r = invoke(['build', BOOK_FIXTURE, '-o', dir]);
      assert.equal(r.code, 0, 'book build (separate-pages, the book default) exits 0');
      const files = readdirSync(dir).sort();
      assert.ok(files.includes('index.html'), 'separate-pages build writes index.html');
      // book.emd has 4 chapters → 4 chapter pages + index
      assert.equal(files.length, 5, 'one standalone page per chapter (4) plus index.html');
      for (const f of files) {
        const html = readFileSync(join(dir, f), 'utf8');
        assert.ok(html.startsWith('<!DOCTYPE html>') && html.includes('<html') && html.includes('</html>'),
          `${f} is a complete standalone HTML document`);
        assert.ok(html.includes('.enscribe-layout'), `${f} inlines default.css (via @enscribejs/enscribe/default.css)`);
        assert.ok(/<nav class="enscribe-toc enscribe-chapter-rail"/.test(html), `${f} carries the chapter-rail chrome`);
        assert.ok(html.includes('<a class="enscribe-book-home" href="index.html"'),
          `${f} carries the return-to-cover masthead (#206) — every page links home to index.html`);
      }
      console.log('PASS: build — separate-pages book (default) writes standalone per-chapter pages + index');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    // --single-page builds the whole book in one fragment (to stdout).
    const single = invoke(['build', BOOK_FIXTURE, '--single-page']);
    assert.equal(single.code, 0, '--single-page book build exits 0');
    assert.ok((single.out.match(/<book-part/g) || []).length >= 4, '--single-page emits the whole book (every chapter)');
    assert.ok(!single.out.startsWith('<!DOCTYPE html>'), '--single-page emits the render fragment (the established CLI shape), not a page shell');

    // separate-pages needs an output directory — without -o it errors clearly.
    const noOut = invoke(['build', BOOK_FIXTURE]);
    assert.equal(noOut.code, 1, 'separate-pages book build without -o exits 1');
    assert.ok(/output directory/.test(noOut.err), 'the error names the missing output directory');
    console.log('PASS: build — --single-page retained; separate-pages requires -o <dir>');
  }

  // ── #363 — the --assets asset-delivery option surface ───────────────────────────────────────────
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-cli-assets-'));
    try {
      // --single-file --assets inlined → an offline file (the message says so; the output has no net refs
      // outside the inlined engine).
      const inl = invoke(['build', FIXTURE, '--single-file', '--assets', 'inlined', '-o', join(dir, 'inl.html')]);
      assert.equal(inl.code, 0, '--single-file --assets inlined exits 0');
      assert.ok(/inlined → offline/.test(inl.out), 'the message reports the inlined/offline delivery');
      const inlHtml = readFileSync(join(dir, 'inl.html'), 'utf8').replace(/<script>[\s\S]*?<\/script>/, 'X');
      const inlRefs = [...inlHtml.matchAll(/(?:href|src)="(https?:[^"]+)"|import\('(https?:[^']+)'/g)].map((m) => m[1] || m[2]);
      assert.deepStrictEqual(inlRefs, [], '--assets inlined: the file has ZERO network references (offline)');

      // --single-file --assets cdn (the default) → references the pinned jsDelivr package.
      const cdn = invoke(['build', FIXTURE, '--single-file', '--assets', 'cdn', '-o', join(dir, 'cdn.html')]);
      assert.equal(cdn.code, 0, '--single-file --assets cdn exits 0');
      assert.ok(readFileSync(join(dir, 'cdn.html'), 'utf8').includes('cdn.jsdelivr.net/npm/@enscribejs/enscribe@'),
        '--assets cdn: chrome referenced from the pinned jsDelivr package');

      // Invalid combinations exit 1 with a clear message (parse + mode-applicability guards).
      const sib = invoke(['build', FIXTURE, '--single-file', '--assets', 'siblings', '-o', join(dir, 'x.html')]);
      assert.equal(sib.code, 1, '--single-file --assets siblings exits 1');
      assert.ok(/no siblings/.test(sib.err), 'siblings is rejected for a single file with a clear message');

      const stat = invoke(['build', FIXTURE, '--assets', 'cdn', '-o', join(dir, 's.html')]);
      assert.equal(stat.code, 1, '--assets on a plain static build exits 1');
      assert.ok(/applies to --live or --single-file/.test(stat.err), 'the error explains --assets only applies to --live / --single-file');

      const bogus = invoke(['build', FIXTURE, '--single-file', '--assets', 'bogus', '-o', join(dir, 'b.html')]);
      assert.equal(bogus.code, 1, 'an unknown --assets value exits 1');
      assert.ok(/must be one of siblings, cdn, inlined/.test(bogus.err), 'the error lists the valid --assets values');

      // --live threads the delivery into buildLiveFolder (cdn → the shell references the CDN, no copies).
      const live = invoke(['build', WEBSITE_FIXTURE, '--live', '--assets', 'cdn', '-o', join(dir, 'live')]);
      assert.equal(live.code, 0, '--live --assets cdn exits 0');
      assert.ok(/\[cdn\]/.test(live.out), 'the live-folder message reports the cdn delivery');
      assert.ok(!existsSync(join(dir, 'live', 'enscribe.browser.global.js')), '--live --assets cdn copies no chrome (referenced from the CDN)');

      console.log('PASS: #363 — the --assets option selects siblings/cdn/inlined per mode; invalid combinations error clearly');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log('All CLI tests passed.');
}
