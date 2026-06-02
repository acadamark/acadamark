// DSL Node-only assets — INTERNAL, server-only.
//
// This module concentrates every Node-only code path the DSL registry needs:
// the readFileSync bundle loaders (live-inline mode) and the jsdom-shimmed
// build-time abc→SVG renderer (static mode). It is split out of registry.js so
// that registry.js itself carries NO fs/url/path/module imports and stays
// importable in a browser bundle (the build slice's browser-safety boundary;
// see notes/specs/core.md — this module is one of the ✗ server-only
// paths named there).
//
// Browser-safety mechanics. The library build (tsup) stubs the Node built-ins
// (fs/url/path/module) this module imports, so its *top level* loads without
// error even in a browser bundle: top level is only imports + function
// declarations, never a Node call. The functions themselves are reached only in
// Node — under the browser façade's `dslMode: 'live-link'` default the registry
// calls neither a bundleLoader nor the staticRenderer, so these bodies never
// run client-side. The package references they need (mermaid / abcjs / jsdom)
// are resolved at *runtime* via import.meta.resolve / createRequire — dynamic,
// so esbuild does not pull those multi-megabyte packages into the bundle.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// ─── Lazy bundle loaders ──────────────────────────────────────────────────────
// `liveAssets.bundleLoader` realizes the findings' `bundlePath` as a memoized
// loader fn (the §2 inline-loader pattern from src/index.js: getPopperJs /
// getTippyJs). Lazy + cached means the multi-megabyte bundle file is read only
// when a document actually renders that DSL in live-inline mode — skip (the
// default) and live-link never touch it.
//
// We inline the UMD `dist/mermaid.min.js` (self-contained for the diagram types
// the fixtures use), NOT the package entry `dist/mermaid.core.mjs` that
// import.meta.resolve('mermaid') points at (an ESM code-split build that pulls
// chunks dynamically and is not usable as a single inline <script>). See
// notes/archive/phase-findings-2026-05/dsl-rendering-architecture-findings.md §Q3.

let _mermaidJs = null;
export function getMermaidJs() {
  if (_mermaidJs === null) {
    const dir = dirname(fileURLToPath(import.meta.resolve('mermaid')));
    _mermaidJs = readFileSync(join(dir, 'mermaid.min.js'), 'utf8');
  }
  return _mermaidJs;
}

let _abcjsJs = null;
export function getAbcjsJs() {
  if (_abcjsJs === null) {
    const dir = dirname(fileURLToPath(import.meta.resolve('abcjs')));
    _abcjsJs = readFileSync(join(dir, 'dist', 'abcjs-basic-min.js'), 'utf8');
  }
  return _abcjsJs;
}

// ─── Static (build-time) renderer: abc → inline SVG ─────────────────────────────
// abc is the one DSL with a clean browserless build-time path: abcjs renders SVG
// in Node with only a jsdom DOM shim — no headless browser, because abcjs
// computes its own glyph-based layout and so does not need a layout engine /
// getBBox for the default render (the getBBox uses in abcjs are gated behind the
// per-line-split and click-selection features, which the default render does not
// invoke). `ABCJS.renderAbc(el, source)` is SYNCHRONOUS and mutates `el` in place
// (it returns tune metadata, not markup), so the renderer reads back
// `el.innerHTML`. Being synchronous, it runs inside the synchronous compiler —
// unlike mermaid, whose only no-browser path is async and young (findings §Q2),
// which is why mermaid stays live-only and its staticRenderer is permanently null.
//
// jsdom version pin (^25). jsdom is held at v25 — the last major requireable
// under CommonJS `require()`. jsdom 26+ pulls in @asamuzakjp/css-color, which
// eagerly `require()`s the ESM-only @csstools/css-calc; under Node's CommonJS
// loader (before require(esm) is unflagged) that throws ERR_REQUIRE_ESM at load.
// A synchronous renderer needs a synchronous `require`, so v25 is the pin.
// Revisit when the toolchain's Node makes require(esm) the default.
//
// jsdom scoping. One jsdom window + one abcjs module are created lazily and
// memoized (the cost is paid once, on first static render — skip / live never
// touch jsdom). `createRequire` is resolved here too (not at module top level)
// so the browser bundle's stubbed `module` is never called at load. abcjs
// resolves the GLOBAL `document` at call time (document.createElementNS, not
// element.ownerDocument), so each render installs the jsdom window's
// document/window on globalThis for the duration of the synchronous renderAbc
// call and restores them in `finally`. Because renderAbc is synchronous and
// single-threaded, the global shim is never observable outside the call.

let _abcStaticEnv = null;
function getAbcStaticEnv() {
  if (_abcStaticEnv === null) {
    const require = createRequire(import.meta.url);
    const { JSDOM } = require('jsdom');
    const abcjs = require('abcjs');
    const { window } = new JSDOM('<!DOCTYPE html><body></body>');
    _abcStaticEnv = { window, abcjs };
  }
  return _abcStaticEnv;
}

/**
 * Render abc notation source to an SVG markup string at build time, via abcjs
 * under a jsdom shim. Synchronous. Returns abcjs's `<svg>` markup verbatim (with
 * no enscribe class / id — the emit path in src/index.js decorates it).
 *
 * Fails explicitly (throws, naming the source) rather than degrading silently —
 * there is no fallback to skip mode:
 *  - if abcjs / jsdom throws (e.g. a non-string source), the error is re-thrown
 *    wrapped with the offending source;
 *  - if the render yields no `<svg>` (e.g. an `undefined` source produces empty
 *    output), that is also a thrown error.
 * Note: abcjs is lenient with malformed *notation* — it renders something rather
 * than failing — so these guards catch renderer/argument faults, not bad music.
 *
 * @param {string} source  abc notation text
 * @returns {string} SVG markup
 */
export function renderAbcStatic(source) {
  const { window, abcjs } = getAbcStaticEnv();
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  globalThis.document = window.document;
  globalThis.window = window;
  let html;
  try {
    const el = window.document.createElement('div');
    abcjs.renderAbc(el, source);
    html = el.innerHTML;
  } catch (err) {
    throw new Error(
      `abc static render failed for source:\n${String(source)}\n\n` +
        `abcjs/jsdom error: ${err.message}`,
    );
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
  if (!/<svg[\s>]/i.test(html)) {
    throw new Error(`abc static render produced no SVG for source:\n${String(source)}`);
  }
  return html;
}
