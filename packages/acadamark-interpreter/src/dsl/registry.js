// DSL render registry — INTERNAL, v0.1.0.
//
// Answers, for an external DSL named `mermaid` / `abc`: what is its container
// tag, its contract class, its live bundle + pinned CDN URL + init script, and
// its (optional) static renderer? This is an *asset-emit* concern, consumed in
// `compileToHtml` (src/index.js) — distinct from `HANDLER_REGISTRY`
// (interpret-plugin.js), which is the *parse/dispatch* concern answering "what
// turns a <mermaid> tag into contract hast?". The two share the static-Map idiom
// but are separate tables with separate consumers; conflating them would couple
// parse-time dispatch to view-time asset policy.
// See notes/dsl-rendering-architecture-findings.md §Q1.
//
// INTERNAL boundary (Q5). This module is deliberately NOT added to
// acadamark-interpreter/package.json `exports` (which exposes only
// ./src/index.js). `getDsl` / `getRegisteredDsls` are reachable inside the
// workspace but not through the package's public surface — reachability, not
// just documentation, enforces "internal."
//
// SPECULATIVE LIFESPAN (v0.2.0). For v0.1.0 the registry is a static `Map`
// literal built at module load, exactly like `HANDLER_REGISTRY`: both DSLs are
// known at build, so a literal Map suffices. There is no runtime
// `registerDsl(spec)` mutation. v0.2.0 is planned to add a public, setup-time
// `registerDsl` as a thin additive layer over this same structure (the built-in
// literal becomes the seed); when that lands, this header note and the
// not-in-`exports` boundary above are the things to revisit.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ─── Pinned CDN URLs ────────────────────────────────────────────────────────
// Read the installed versions so the CDN (live-link) URL always matches the
// inlined (live-inline) bundle. Same idiom as KATEX_CDN_URL in src/index.js.
const _mermaidVersion = require('mermaid/package.json').version;
const _abcjsVersion = require('abcjs/package.json').version;

/** jsDelivr URL for the Mermaid UMD bundle, pinned to the installed version. */
export const MERMAID_CDN_URL = `https://cdn.jsdelivr.net/npm/mermaid@${_mermaidVersion}/dist/mermaid.min.js`;
/** jsDelivr URL for the abcjs browser bundle, pinned to the installed version. */
export const ABCJS_CDN_URL = `https://cdn.jsdelivr.net/npm/abcjs@${_abcjsVersion}/dist/abcjs-basic-min.js`;

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
// notes/dsl-rendering-architecture-findings.md §Q3.

let _mermaidJs = null;
function getMermaidJs() {
  if (_mermaidJs === null) {
    const dir = dirname(fileURLToPath(import.meta.resolve('mermaid')));
    _mermaidJs = readFileSync(join(dir, 'mermaid.min.js'), 'utf8');
  }
  return _mermaidJs;
}

let _abcjsJs = null;
function getAbcjsJs() {
  if (_abcjsJs === null) {
    const dir = dirname(fileURLToPath(import.meta.resolve('abcjs')));
    _abcjsJs = readFileSync(join(dir, 'dist', 'abcjs-basic-min.js'), 'utf8');
  }
  return _abcjsJs;
}

// ─── Init scripts ─────────────────────────────────────────────────────────────
// The init JS emitted (inline or alongside a <script src>) so the live library
// renders the contract markup at view time.

// Mermaid self-registers a DOMContentLoaded handler from `startOnLoad: true` and
// scans for `class="mermaid"`, so no explicit run() / readiness guard is needed.
const MERMAID_INIT = `mermaid.initialize({ startOnLoad: true });`;

// abcjs does NOT scan the DOM: the consumer must find each marked element and
// call ABCJS.renderAbc on its source. The assets are prepended (unshift) ahead
// of the DSL elements, so this script can run before they parse — hence the
// readyState guard (the hover-preview.js init pattern). `el.textContent` reads
// the verbatim source the <pre> container preserves (this is why the M2 fix —
// abc's <div> → <pre> — is a prerequisite for abc-live: a <div> source is
// reflowed by the formatter and would feed abcjs corrupted notation).
const ABCJS_INIT = `(function () {
  function renderAll() {
    document.querySelectorAll('[data-acadamark-dsl="abc"]').forEach(function (el) {
      ABCJS.renderAbc(el, el.textContent);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();`;

// ─── Registration records ─────────────────────────────────────────────────────
// Per-DSL record (see findings §Q1 table):
//   name           — the data-acadamark-dsl value and the registry key.
//   containerTag    — must match the handler's wrapperEl (mermaid.js / abc.js).
//   contractClass   — the scanning class the handler emits.
//   liveAssets      — { bundleLoader, cdnUrl, initScript } for live mode.
//   staticRenderer  — (source) => svgString, or null when the DSL has no
//                     build-time renderer. `null` is the single source of truth
//                     the mode resolver checks to fail-explicitly on `static`.
//   detector        — optional (hastNode) => boolean; omitted here, so the
//                     consumer's default detector (keys off `name`) applies.

const mermaidRegistration = {
  name: 'mermaid',
  containerTag: 'pre',
  contractClass: 'mermaid',
  liveAssets: {
    bundleLoader: getMermaidJs,
    cdnUrl: MERMAID_CDN_URL,
    initScript: MERMAID_INIT,
  },
  // Mermaid is LIVE-ONLY: its only browserless render path needs a headless
  // browser (see findings §Q2/§Net-effect). `null` is permanent for mermaid.
  staticRenderer: null,
};

const abcRegistration = {
  name: 'abc',
  // M2 fix (Slice 1): the handler's wrapperEl moved <div> → <pre> so the source
  // survives serialization verbatim; this field tracks that change.
  containerTag: 'pre',
  contractClass: 'abc',
  liveAssets: {
    bundleLoader: getAbcjsJs,
    cdnUrl: ABCJS_CDN_URL,
    initScript: ABCJS_INIT,
  },
  // SPECULATIVE LIFESPAN (Slice 2): abc HAS a build-time renderer (abcjs via
  // jsdom, synchronous), but it is out of scope for Slice 1. `null` here is
  // temporary — Slice 2 replaces it with the jsdom static renderer. Until then,
  // requesting `static` for a document containing abc fails explicitly.
  staticRenderer: null,
};

const DSL_REGISTRY = new Map([
  [mermaidRegistration.name, mermaidRegistration],
  [abcRegistration.name, abcRegistration],
]);

/**
 * Look up a single DSL registration by name.
 * @param {string} name
 * @returns {object|null} the registration record, or null if unregistered.
 */
export function getDsl(name) {
  return DSL_REGISTRY.get(name) ?? null;
}

/**
 * All registered DSL records, in registration order. The asset-injection loop
 * in compileToHtml iterates this once per compile.
 * @returns {object[]}
 */
export function getRegisteredDsls() {
  return [...DSL_REGISTRY.values()];
}

// ─── Mode resolution ──────────────────────────────────────────────────────────

/** The four valid DSL render modes. `skip` is the default. */
export const VALID_DSL_MODES = ['skip', 'live-inline', 'live-link', 'static'];

/**
 * Resolve the render mode for one DSL from the plugin options, applying the
 * precedence `‹name›Mode ?? dslMode ?? 'skip'`. Validates the token only;
 * whether a DSL *supports* the resolved mode (e.g. `static` requires a
 * staticRenderer) is checked at the injection site, where the record is in
 * hand and the DSL's presence in the document is known.
 *
 * @param {string} name      registry key (e.g. 'mermaid')
 * @param {object} [options] the acadamarkInterpreter options object
 * @returns {'skip'|'live-inline'|'live-link'|'static'}
 * @throws if the resolved value is not a known mode token.
 */
export function resolveDslMode(name, options = {}) {
  const mode = options[`${name}Mode`] ?? options.dslMode ?? 'skip';
  if (!VALID_DSL_MODES.includes(mode)) {
    throw new Error(
      `Invalid DSL mode '${mode}' for '${name}'. ` +
        `Valid modes: ${VALID_DSL_MODES.join(', ')}.`,
    );
  }
  return mode;
}
