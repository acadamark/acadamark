// Tests for the enscribe CLI.
//
// Most cases drive run() directly with injected stdout/stderr buffers — fast and
// deterministic. Two cases spawn the real bin (`node bin/enscribe.js …`) to cover
// the executable wrapper, the shebang path, and the process exit code.
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { run } from '../src/cli.js';
import { hasPandoc } from '../src/pandoc-import.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, 'fixtures', 'sample.emd');
const JATS_FIXTURE = join(__dirname, 'fixtures', 'article.xml');
const BOOK_FIXTURE = join(__dirname, 'fixtures', 'book.emd');
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
    assert.ok(!plain.out.includes('enscribe-toc'), 'no --toc → no ToC markup (opt-in)');
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

  // ── render --toc → book chapter navigation ──────────────────────────────────
  {
    const nav = (out) => out.includes("'Show whole book'");
    const withToc = invoke(['render', BOOK_FIXTURE, '--toc']);
    assert.equal(withToc.code, 0, 'render book --toc exits 0');
    assert.ok(withToc.out.includes('<book-part'), 'book renders book-part chapters');
    assert.ok(nav(withToc.out), 'book + --toc injects the chapter-nav script (default on)');
    const noNav = invoke(['render', BOOK_FIXTURE, '--toc', '--no-chapter-nav']);
    assert.ok(!nav(noNav.out), '--no-chapter-nav opts out');
    const noToc = invoke(['render', BOOK_FIXTURE]);
    assert.ok(!nav(noToc.out), 'no --toc → no chapter-nav');
    console.log('PASS: render book --toc → chapter navigation');
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
      assert.ok(html.out.includes('<section-title>Introduction</section-title>'), 'sections imported');
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
    assert.ok(html.out.includes('<article-title>A Small JATS Article</article-title>'), 'title imported');
    assert.ok(html.out.includes('<b>bold</b>') && html.out.includes('<i>italic</i>'), 'inline imported');
    assert.ok(html.out.includes('<section-title>Introduction</section-title>'), 'section imported');

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

  console.log('All CLI tests passed.');
}
