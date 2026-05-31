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

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, 'fixtures', 'sample.emd');
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
