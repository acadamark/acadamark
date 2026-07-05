// Bundle-load smoke test — proves the built IIFE browser bundle actually LOADS
// in a browser-like context and renders, not merely that it builds.
//
// Why this exists (Phase 14 Slice 1.5): the Slice 1 bundle built and passed its
// byte-level checks but shipped a top-level `__require("fs")` that threw the
// instant the IIFE evaluated — before it could assign `window.enscribe`. So it
// "built" but never ran in a browser, and nothing caught it until a real page
// (the Slice 2 demo) tried to use the global. This test reproduces that exact
// failure mode at test time: it builds the bundle fresh, loads it via a <script>
// in a jsdom document, and asserts the global is usable. A regression — a stray
// un-aliased `node:`/bare built-in, a tsup-config change that re-externalizes a
// builtin — fails here instead of at a user's browser.
//
// It builds the bundle itself (rather than assuming `dist/` is fresh) so it is
// correct whether run via `npm test`, `npm run verify`, or `node test/run.js`.

import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(pkgRoot, 'dist', 'enscribe.browser.global.js');
const editorPath = join(pkgRoot, 'dist', 'editor-codemirror.js');

export async function run() {
  // Build fresh so the test reflects current src/ + tsup.config.js. A build
  // failure (e.g. a new un-aliased `node:` builtin with removeNodeProtocol:false)
  // surfaces here as a clear test failure rather than a silent gap.
  try {
    execSync('npm run build:lib', { cwd: pkgRoot, stdio: 'pipe' });
  } catch (err) {
    const out = `${err.stdout || ''}${err.stderr || ''}`.toString();
    throw new Error(`bundle-load: \`npm run build:lib\` failed:\n${out.slice(-1500)}`);
  }
  assert.ok(existsSync(bundlePath), `bundle-load: expected ${bundlePath} after build`);
  const code = readFileSync(bundlePath, 'utf8');

  // Load it the way a browser does: a <script> in a fresh document. jsdom runs
  // the script synchronously on append; a load-time throw is reported to the
  // virtual console as a jsdomError (and leaves window.enscribe undefined).
  const jsdomErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => jsdomErrors.push(e));
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    runScripts: 'dangerously',
    virtualConsole,
  });
  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = code;
  dom.window.document.head.appendChild(scriptEl);

  const enscribe = dom.window.enscribe;
  const errDetail = jsdomErrors
    .map((e) => e.detail?.message || e.detail || e.message || String(e))
    .join('; ');
  assert.ok(
    enscribe && typeof enscribe.render === 'function',
    'bundle-load: window.enscribe.render missing after load — the IIFE threw at ' +
      `evaluation (the Slice 1 failure class)${errDetail ? `: ${errDetail}` : ''}`,
  );
  // The full browser API surface should be present.
  for (const name of ['render', 'renderInto', 'executeAssets']) {
    assert.equal(
      typeof enscribe[name],
      'function',
      `bundle-load: window.enscribe.${name} should be a function`,
    );
  }

  // End-to-end: the pipeline runs inside the bundle. A plain paragraph is the
  // canonical pipeline example (pipeline.md §10.1) and is render-stable.
  const html = enscribe.render('hello world');
  assert.ok(
    html.includes('<p>hello world</p>'),
    `bundle-load: render('hello world') did not produce <p>hello world</p>; got: ${html.slice(0, 160)}`,
  );

  console.log('PASS: bundle-load (IIFE loads in a browser-like context; render/renderInto/executeAssets present; render works)');

  // ── #214: the shipped EDITOR asset bundles CodeMirror (no runtime CDN) ───────────────
  // The same build above also emits dist/editor-codemirror.js. Prove it is self-contained: CodeMirror
  // is INLINED (no esm.sh URL, no unbundled bare `import("codemirror")` a browser can't resolve), the
  // built module imports in Node with NO network, and it exposes the async codeMirrorEditorFactory.
  // (Importing the module does NOT evaluate CodeMirror — the factory's lazy `import('codemirror')` is
  // the boundary — so this runs without a DOM. A live EditorView mount is the browser check, which CC
  // cannot run; see the slice report's "needs a browser mount check on a ?edit page".)
  assert.ok(existsSync(editorPath), `bundle-load(editor): expected ${editorPath} after build`);
  const editorCode = readFileSync(editorPath, 'utf8');
  assert.ok(!/esm\.sh/.test(editorCode),
    'bundle-load(editor): no esm.sh URL in the shipped editor asset (CodeMirror is bundled, not CDN-loaded)');
  assert.ok(!/\bimport\(\s*["']codemirror["']\s*\)/.test(editorCode),
    'bundle-load(editor): no unbundled bare import("codemirror") remains (CodeMirror is inlined, not external)');
  assert.ok(/EditorView/.test(editorCode) && /basicSetup/.test(editorCode),
    'bundle-load(editor): the bundled asset contains CodeMirror (EditorView + basicSetup inlined)');
  assert.ok(editorCode.length > 100_000,
    `bundle-load(editor): the editor asset is substantial (CodeMirror inlined), got ${editorCode.length} bytes`);
  const editorMod = await import(pathToFileURL(editorPath).href);
  assert.equal(typeof editorMod.codeMirrorEditorFactory, 'function',
    'bundle-load(editor): the built module imports with NO network and exposes codeMirrorEditorFactory');
  console.log('PASS: bundle-load (editor asset bundles CodeMirror — no esm.sh, EditorView/basicSetup inlined, imports with no network, exposes codeMirrorEditorFactory)');
}
