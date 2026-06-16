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
import { existsSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildLiveFolder } from '../src/build-live.js';

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
}
