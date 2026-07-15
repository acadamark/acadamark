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
import { emitLiveShell, emitSingleFileShell, resolveShellAssets, getInlineDisplayHead } from '../src/interpreter/index.js';
import { HEAD_ASSET_LINKS } from '../src/interpreter/assets/font-loader.js';
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

  // ── #396: the no-JavaScript fallback — every JS-mounted shell carries a <noscript> notice ──
  //    A live / single-file shell mounts its content with JS, so without scripting it is a blank page.
  //    All four templates (live served/inlined, single-file served/inlined — editable AND read-only)
  //    emit ONE brand-free <noscript> notice immediately before the mount <div>. The static emitters
  //    (website-shell/document-shell) embed rendered HTML and need none, so they are not checked here.
  {
    const noscriptRe = /<noscript>[^<]*JavaScript[^<]*<\/noscript>\s*(?:<template[^>]*>[\s\S]*?<\/template>\s*)?<div id="enscribe-book-root"/;
    const cases = {
      'live served': emitLiveShell({ master: 'book.emd' }),
      'live inlined': emitLiveShell({ master: 'book.emd', inline: { engine: 'e', defaultCss: '.d{}', shellCss: '.s{}', displayHead: '<style></style>' } }),
      'single-file served (editable)': emitSingleFileShell({ source: 'x', editable: true }),
      'single-file inlined (read-only)': emitSingleFileShell({ source: 'x', editable: false, inline: { engine: 'e', defaultCss: '.d{}', shellCss: '.s{}', displayHead: '<style></style>' } }),
    };
    for (const [label, html] of Object.entries(cases)) {
      assert.strictEqual(html.split('<noscript>').length - 1, 1, `${label}: exactly one <noscript> notice`);
      assert.ok(html.includes('Please enable JavaScript'), `${label}: the notice names the JavaScript requirement`);
      assert.ok(!html.includes('Enscribe'), `${label}: the notice is brand-free (engine code ships in every user's build)`);
      assert.ok(noscriptRe.test(html), `${label}: the notice sits immediately before the mount <div> (the blank it replaces)`);
    }
    console.log('PASS: #396 — every JS-mounted shell (live + single-file, both deliveries) carries the brand-free <noscript> fallback');
  }

  // ── flat assetBase (the deployed layout) references the four assets next to the shell ──
  {
    const html = emitLiveShell({ master: 'book.emd', title: 'My Book', assetBase: './' });
    assert.ok(html.includes('<title>My Book</title>'), 'explicit title is used');
    assert.ok(html.includes('href="./default.css"'), 'flat: links ./default.css');
    assert.ok(html.includes('href="./enscribe-shell.css"'), 'flat: links ./enscribe-shell.css');
    assert.ok(html.includes("import('./editor-codemirror.js')"), 'flat: lazily dynamic-imports ./editor-codemirror.js');
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
      html.includes("import('../ed.js')") && html.includes('src="../e.js"'),
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

  // ── #296 §3 single-source guard (coding-conventions §3 sanctions "fails loud at load OR TEST"):
  //    the live shell head routes its document assets through the single source HEAD_ASSET_LINKS —
  //    verbatim, exactly once, with NO independently-hardcoded KaTeX/fonts CDN URL. This closes the last
  //    head-asset fork (#296): the live shell used to hardcode its own copy, which cdn-versions.test.js
  //    (guarding the CONSTANT, not this copy) could not catch on a KaTeX bump. A future re-hardcode fails
  //    here. This is the "equality assertion covering emit-shell's emitted set" in its proper home — over
  //    the ACTUAL emitted shell, not a literal copy in the font-loader module-load block (which would
  //    reintroduce the very fork §3 exists to prevent).
  {
    const shell = emitLiveShell(MASTER_BOOK_SHELL_PARAMS);
    assert.strictEqual(shell.split(HEAD_ASSET_LINKS).length - 1, 1,
      '#296: the live shell head carries HEAD_ASSET_LINKS verbatim, exactly once (the single source)');
    const outsideSource = shell.split(HEAD_ASSET_LINKS).join('');
    assert.ok(!/cdn\.jsdelivr\.net\/npm\/katex@/.test(outsideSource),
      '#296: no KaTeX CDN URL appears outside HEAD_ASSET_LINKS (no independent hardcoded copy)');
    assert.ok(!/fonts\.googleapis\.com/.test(outsideSource),
      '#296: no document-fonts CDN URL appears outside HEAD_ASSET_LINKS (no independent hardcoded copy)');
    console.log('PASS: #296 — the live shell head links its document assets only via HEAD_ASSET_LINKS (last fork closed)');
  }

  // ── INLINED delivery (#364): chrome + display assets embedded; the artifact needs no network ────────
  //    The `inline` bytes are supplied by the caller (build-live.js reads them). We hand small stand-ins
  //    for engine/CSS and the REAL getInlineDisplayHead() (fonts + KaTeX <style>), and assert the emitter
  //    embeds them instead of referencing them. The inlined engine carries CDN URL LITERALS (KaTeX/DSL
  //    constants) internally, so a "no network" check must look at the shell OUTSIDE the inlined engine
  //    <script> — real resource references are `href=/src="http"` attributes and `import('http')`, none
  //    of which the inlined chrome emits (the editor is the one exception in single-file, #365 closes it).
  {
    const displayHead = getInlineDisplayHead();
    assert.ok(displayHead.includes('@font-face') && displayHead.includes('<style>'),
      'getInlineDisplayHead: inline <style> with base64 @font-face (the offline counterpart of HEAD_ASSET_LINKS)');
    const inline = {
      engine: 'window.enscribe={render(){}};/* engine </script> guard */',
      defaultCss: '.d{}', shellCss: '.s{}', displayHead,
    };
    // strip the inlined engine <script>…</script> (its internal URL literals are not resource refs)
    const stripEngine = (h) => h.replace(/<script>[\s\S]*?<\/script>/, '<script>ENGINE</script>');
    const realRefs = (h) => [...stripEngine(h).matchAll(/(?:href|src)="(https?:[^"]+)"|import\('(https?:[^']+)'/g)]
      .map((m) => m[1] || m[2]);

    // engine </script> in the bytes is neutralized so it can't terminate the inline <script> early.
    const live = emitLiveShell({ master: 'index.emd', inline, assetBase: './' });
    assert.ok(live.includes('<style>\n.d{}\n</style>') && live.includes('<style>\n.s{}\n</style>'),
      'inlined live: chrome CSS embedded as <style>, not <link>');
    assert.ok(!live.includes('<link rel="stylesheet"'), 'inlined live: no <link> stylesheet references');
    assert.ok(!live.includes('<script src='), 'inlined live: the engine is an inline <script>, not a src reference');
    assert.ok(live.includes('window.enscribe={render(){}}') && live.includes('<\\/script>'),
      'inlined live: engine bytes inlined with </script> neutralized');
    assert.ok(live.includes("documentFontsCss: 'skip', katexCss: 'skip'"),
      'inlined live: the render SKIPS re-linking display assets (the head already inlines them → offline)');
    assert.ok(live.includes("import('./editor-codemirror.js')"),
      'inlined chrome, no inline.editor: the editor rides its href delivery (here the ./ sibling)');
    assert.deepStrictEqual(realRefs(live), [],
      'inlined live folder (sibling editor): ZERO real network references — fully offline');

    const sf = emitSingleFileShell({ source: '<meta type=article><title|T></meta>', title: 'T', editable: true, inline });
    assert.ok(sf.includes('<template id="enscribe-source">'), 'inlined single-file still embeds the source');
    assert.ok(!sf.includes('<script src=') && !sf.includes('<link rel="stylesheet"'),
      'inlined single-file: engine + CSS embedded, no references');
    assert.ok(sf.includes("documentFontsCss: 'skip', katexCss: 'skip'"),
      'inlined single-file: the render skips re-linking display assets');
    assert.deepStrictEqual(realRefs(sf), ['https://cdn.jsdelivr.net/npm/@enscribejs/enscribe@0.5.0/dist/editor-codemirror.js'],
      'inlined chrome, no inline.editor: the editor rides its href delivery (here the CDN)');
    console.log('PASS: #364 — inlined delivery embeds engine + CSS + display assets (editor rides its href delivery when not inlined)');
  }

  // ── #365 — the editor RIDES the asset-delivery choice: inlined editor (template + blob-import) ───────
  //    When `inline.editor` bytes are supplied, the bundled editor is carried in an escaped <template>
  //    and blob-imported lazily — so an inlined EDITABLE artifact edits with NO network. This is what
  //    makes an inlined single-file fully offline (read AND edit).
  {
    const inline = {
      engine: 'window.enscribe={render(){}};/* </script> */',
      defaultCss: '.d{}', shellCss: '.s{}', displayHead: getInlineDisplayHead(),
      editor: 'export const codeMirrorEditorFactory = () => ({ mount(){} });/* </script> in bytes */',
    };
    const stripEngine = (h) => h.replace(/<script>[\s\S]*?<\/script>/, '<script>ENGINE</script>');
    const realRefs = (h) => [...stripEngine(h).matchAll(/(?:href|src)="(https?:[^"]+)"|import\('(https?:[^']+)'/g)]
      .map((m) => m[1] || m[2]);

    for (const [label, html] of [
      ['live folder', emitLiveShell({ master: 'index.emd', inline, assetBase: './' })],
      ['single-file', emitSingleFileShell({ source: 'x', title: 'T', editable: true, inline })],
    ]) {
      assert.ok(html.includes('<template id="enscribe-editor-src">'),
        `inlined ${label}: the bundled editor is carried in an inert <template>`);
      assert.ok(html.includes("URL.createObjectURL(new Blob([_s]"),
        `inlined ${label}: the editor factory blob-imports the carried bytes lazily (read mode loads nothing)`);
      assert.ok(!html.includes("import('./editor-codemirror.js')") && !html.includes('editor-codemirror.js"'),
        `inlined ${label}: NO editor href — the editor is inlined, not referenced`);
      // the editor bytes carry a literal </script>; the escaped <template> must round-trip it, not break out.
      assert.ok(html.includes('&lt;/script&gt;'), `inlined ${label}: editor </script> is HTML-escaped in the template (safe round-trip)`);
      assert.deepStrictEqual(realRefs(html), [],
        `inlined ${label} with inline editor: ZERO real network references — fully offline (read AND edit)`);
    }
    // read-only single-file (not editable): no editor at all, still fully offline.
    const ro = emitSingleFileShell({ source: 'x', editable: false, inline });
    assert.ok(!ro.includes('<template id="enscribe-editor-src">') && !ro.includes('editorFactory'),
      'inlined read-only single-file: no editor is emitted (editing disabled), still offline');
    console.log('PASS: #365 — the editor rides the delivery choice: inlined editor is a <template>+blob-import, no network');
  }

  console.log('All live-shell emitter (#215) checks passed.');

  // ── #399: headExtra — brand-free by default, caller-supplied head links when given ──
  {
    const plain = emitLiveShell({ master: 'book.emd' });
    assert.ok(!plain.includes('favicon'), 'no headExtra → no brand markup (the engine stays brand-free)');
    const links = '<link rel="icon" href="favicon.svg" type="image/svg+xml">';
    const branded = emitLiveShell({ master: 'book.emd', headExtra: links });
    assert.ok(branded.includes('</title>\n' + links), 'headExtra lands verbatim after <title>');
    assert.equal(branded.replace(links, '').replace('</title>\n', '</title>'), plain.replace('</title>', '</title>'),
      'headExtra is the ONLY difference');
    console.log('PASS: #399 — emitLiveShell headExtra (brand-free default; verbatim insertion)');
  }
}
