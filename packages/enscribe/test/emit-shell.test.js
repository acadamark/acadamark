// Live shell emitter — pure unit test + fidelity (#215).
//
// emitLiveShell is a PURE function (params → shell HTML, no I/O), the inverse of #214's hand-written
// shell. This pins its contract: the author bits (master, title, edit) and the asset hrefs
// (assetBase flat, or explicit `assets`) are the only things that vary; the skeleton (link the
// chrome CSS, load the engine, import the default editor, mount, bootstrap with the #213 switch) is
// fixed. Plus the FIDELITY guard: the committed master-book/index.html IS the emitter's output —
// the last hand-written shell is retired.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { emitLiveShell, resolveShellAssets } from '../src/interpreter/index.js';
import { MASTER_BOOK_SHELL_PARAMS } from './fixtures/master-book/shell-params.mjs';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function run() {
  // ── required param + sensible defaults ──────────────────────────────────────────────
  {
    assert.throws(() => emitLiveShell({}), /master/, 'emitLiveShell requires a master filename');
    const html = emitLiveShell({ master: 'book.emd' });
    assert.ok(html.startsWith('<!DOCTYPE html>') && html.includes('</html>'), 'emits a full HTML document');
    assert.ok(html.includes('<title>book.emd</title>'), 'title defaults to the master filename');
    assert.ok(html.includes("mountLiveShell('#enscribe-book-root', 'book.emd', opts)"),
      'the bootstrap mounts the given master via mountLiveShell (type-agnostic dispatch, #216)');
    console.log('PASS: #215 — emitLiveShell requires `master`, defaults title, mounts the master');
  }

  // ── flat assetBase (the deployed layout) references the four assets next to the shell ──
  {
    const html = emitLiveShell({ master: 'book.emd', title: 'My Book', assetBase: './' });
    assert.ok(html.includes('<title>My Book</title>'), 'explicit title is used');
    assert.ok(html.includes('href="./default.css"'), 'flat: links ./default.css');
    assert.ok(html.includes('href="./enscribe-shell.css"'), 'flat: links ./enscribe-shell.css');
    assert.ok(html.includes("from './editor-codemirror.js'"), 'flat: imports ./editor-codemirror.js');
    assert.ok(html.includes('src="./enscribe.browser.global.js"'), 'flat: loads ./enscribe.browser.global.js');
    console.log('PASS: #215 — assetBase "./" emits the flat deployed asset layout');
  }

  // ── explicit `assets` (the dev scattered source tree) override assetBase ──────────────
  {
    const html = emitLiveShell({
      master: 'book.emd',
      assets: { engine: '../e.js', defaultCss: '../d.css', shellCss: '../s.css', editor: '../ed.js' },
    });
    assert.ok(html.includes('href="../d.css"') && html.includes('href="../s.css"') &&
      html.includes("from '../ed.js'") && html.includes('src="../e.js"'),
      'explicit asset hrefs are used verbatim (the dev fixture references the source tree)');
    console.log('PASS: #215 — explicit `assets` override the flat assetBase (scattered dev paths)');
  }

  // ── the edit switch (#213): edit=true defaults to the editor via data-enscribe-edit ───
  {
    const off = emitLiveShell({ master: 'book.emd', edit: false });
    const on = emitLiveShell({ master: 'book.emd', edit: true });
    assert.ok(/<div id="enscribe-book-root"><\/div>/.test(off),
      'edit=false → no data-enscribe-edit (read by default)');
    assert.ok(/<div id="enscribe-book-root" data-enscribe-edit><\/div>/.test(on),
      'edit=true → data-enscribe-edit on the mount (#213 — defaults to the editor)');
    for (const html of [off, on]) {
      assert.ok(html.includes("new URLSearchParams(location.search).has('edit')"),
        'the ?edit runtime switch is always present regardless of the edit flag');
    }
    console.log('PASS: #215 — the edit flag toggles data-enscribe-edit; ?edit always present (#213)');
  }

  // ── references, never copies: no inline chrome CSS / editorFactory in the output ──────
  {
    const html = emitLiveShell({ master: 'book.emd', edit: true });
    assert.ok(!html.includes('a.enscribe-book-home {') && !html.includes('.enscribe-edit-tabs {'),
      'no inline chrome CSS (it is linked via enscribe-shell.css)');
    assert.ok(!html.includes('esm.sh/codemirror'),
      'no inline editorFactory (it is imported from editor-codemirror.js)');
    assert.ok(html.includes('codeMirrorEditorFactory'), 'imports the default editor adapter');
    console.log('PASS: #215 — the emitted shell REFERENCES the package plumbing, never inlines it');
  }

  // ── resolveShellAssets: flat vs explicit ─────────────────────────────────────────────
  {
    assert.deepStrictEqual(resolveShellAssets('out/'), {
      engine: 'out/enscribe.browser.global.js', defaultCss: 'out/default.css',
      shellCss: 'out/enscribe-shell.css', editor: 'out/editor-codemirror.js',
    }, 'resolveShellAssets derives the flat layout from a base (adds a trailing slash)');
    assert.strictEqual(resolveShellAssets('./', { engine: 'X' }).engine, 'X',
      'an explicit asset href overrides the flat-derived one');
    console.log('PASS: #215 — resolveShellAssets: flat-from-base, explicit overrides');
  }

  // ── FIDELITY: the committed master-book/index.html IS the emitter output ──────────────
  {
    const committed = readFileSync(join(PKG, 'test/fixtures/master-book/index.html'), 'utf8');
    const generated = emitLiveShell(MASTER_BOOK_SHELL_PARAMS);
    assert.strictEqual(committed, generated,
      'master-book/index.html is byte-identical to emitLiveShell(MASTER_BOOK_SHELL_PARAMS) — the shell is generated, not hand-written (regenerate via render-fixtures.js if the emitter changes)');
    console.log('PASS: #215 — the committed master-book shell is byte-identical to the emitter output (fidelity)');
  }

  console.log('All live-shell emitter (#215) checks passed.');
}
