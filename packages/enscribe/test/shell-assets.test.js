// Packaged shell foundation — reference, don't copy (#214).
//
// The live shell's plumbing — the masthead + edit-mode chrome CSS, and the default editor adapter
// — moved from hand-copied <style>/inline-script blocks INTO the package, so a shell REFERENCES it.
// This gate proves the relocation is location-not-behavior:
//   - enscribe-shell.css carries the masthead CSS character-identical to publish-pages' BOOK_HOME_CSS
//     (so the static-page copy and the live-shell copy can never drift) + the edit-mode chrome;
//   - the minimal shell references those package assets and no longer inlines either;
//   - the default editorFactory ships as a host-side, lazy module (importing it loads no CodeMirror).
// Behavior (read↔edit via the #213 host switch) is unchanged — its functional gate is
// live-book-shell.test.js (mountLiveBookShell is untouched); real CodeMirror is a your-eyes check.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BOOK_HOME_CSS } from '../src/master-document/publish-pages.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(PKG, rel), 'utf8');

export async function run() {
  const shellCss = read('src/shell/enscribe-shell.css');
  const shellHtml = read('test/fixtures/master-book/index.html');
  const editorMod = read('src/shell/editor-codemirror.js');

  // ── enscribe-shell.css ships the masthead (verbatim, no drift) + the edit-mode chrome ───────
  {
    assert.ok(shellCss.includes(BOOK_HOME_CSS),
      'enscribe-shell.css carries the masthead CSS character-for-character (== publish-pages BOOK_HOME_CSS; the static + live copies cannot drift)');
    for (const sel of [
      '.enscribe-edit-main', '.enscribe-edit-tabs', '.enscribe-edit-tab--active',
      '.enscribe-edit-status', '.enscribe-edit-pane--source .cm-editor', '.enscribe-edit-error',
    ]) {
      assert.ok(shellCss.includes(sel), `enscribe-shell.css carries the edit-mode chrome rule ${sel}`);
    }
    console.log('PASS: #214 — enscribe-shell.css ships the masthead (verbatim) + edit-mode chrome CSS');
  }

  // ── the minimal shell REFERENCES the package plumbing — nothing hand-copied left ────────────
  {
    assert.ok(shellHtml.includes('href="../../../src/shell/enscribe-shell.css"'),
      'the shell <link>s the packaged enscribe-shell.css');
    assert.ok(shellHtml.includes("from '../../../src/shell/editor-codemirror.js'"),
      'the shell imports the packaged default editorFactory module');
    assert.ok(!shellHtml.includes('a.enscribe-book-home {'),
      'the shell no longer inlines the masthead CSS rule (referenced, not copied)');
    assert.ok(!shellHtml.includes('.enscribe-edit-tabs {'),
      'the shell no longer inlines the edit-mode chrome CSS (referenced, not copied)');
    assert.ok(!shellHtml.includes('esm.sh/codemirror'),
      'the shell no longer inlines the CodeMirror editorFactory (it imports the packaged module)');
    console.log('PASS: #214 — the minimal shell references the package plumbing (no copied CSS / editorFactory)');
  }

  // ── the shipped editorFactory is host-side and lazy (importing it loads no CodeMirror) ──────
  {
    assert.ok(/export async function codeMirrorEditorFactory\b/.test(editorMod),
      'editor-codemirror.js exports codeMirrorEditorFactory');
    assert.ok(/await import\(\s*['"]https:\/\/esm\.sh\/codemirror/.test(editorMod),
      'codeMirrorEditorFactory LAZILY imports CodeMirror from a CDN (host-side; not in the core engine bundle)');
    console.log('PASS: #214 — the default editorFactory ships as a host-side, lazy shell-layer module');
  }

  // ── the #213 read↔edit host switch is intact in the minimal shell (behavior unchanged) ──────
  {
    assert.ok(shellHtml.includes("new URLSearchParams(location.search).has('edit')"),
      'the shell still reads the `?edit` host switch');
    assert.ok(/mountLiveBookShell\(\s*'#enscribe-book-root'\s*,\s*'master-book\.emd'/.test(shellHtml),
      'the shell still mounts via mountLiveBookShell with the author master filename');
    console.log('PASS: #214 — the #213 host switch (?edit / data-enscribe-edit) is intact');
  }

  console.log('All packaged-shell-foundation (#214) checks passed.');
}
