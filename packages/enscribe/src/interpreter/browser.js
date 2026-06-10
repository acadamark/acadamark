// src/browser.js — browser entry façade.
//
// The library's browser-facing API: turn enscribe source into HTML with one
// call, using browser-safe defaults so nothing tries to read the filesystem.
// This is the tsup entry point (see tsup.config.js); the package.json "browser"
// field swaps hover-preview assets to their build-inlined variant transparently
// inside index.js, so this file stays a thin wrapper over buildEnscribePipeline.
//
// Defaults rationale (Phase 14 Slice 1, "external-by-default" per the ratified
// embedResources design):
//   embedResources: false  → fonts + KaTeX CSS link to CDNs rather than inlining
//                            base64 (avoids fs reads; smaller HTML).
//   hoverPreviewMode: 'link' → third-party Tippy/Popper load from CDN; enscribe's
//                            own hover CSS/JS come from the build-inlined bundle.
//   dslMode: 'live-link'   → mermaid/abc render client-side from CDN scripts
//                            instead of being statically rendered via jsdom.
// A caller can override any of these (e.g. render(src, { embedResources: true })
// for self-contained output), and the finer-grained per-resource options
// (katexCss / documentFontsCss / per-DSL *Mode) still take precedence.

import { buildEnscribePipeline, collectLibrarySources } from './index.js';
import { preloadSources } from './lib/preload-library-sources.js';
import { ENSCRIBE_LOADED_SOURCES } from '../core/file-data-keys.js';

const BROWSER_DEFAULTS = {
  embedResources: false,
  hoverPreviewMode: 'link',
  dslMode: 'live-link',
};

// #48: memoize the built pipeline. The pipeline build depends only on the
// resolved options (the plugin set is fixed; options configure the interpreter),
// NOT on the source — which arrives later, per call, via processSync. So one
// processor can be reused across every render() that shares options. The
// playground re-renders on each debounced keystroke with stable options, so this
// turns N pipeline builds into 1. A unified processor is reusable across
// processSync calls — per-render state lives on the VFile, never the processor —
// and this was verified output-identical to a fresh build per call. The cache is
// keyed on the resolved options, so changing any option uses (and caches) a
// distinct pipeline; a stale pipeline is never served. Unbounded by design: the
// key space is the set of distinct option combinations a session uses, which is
// tiny (the playground uses one).
const _pipelineCache = new Map();

/**
 * Stable string key for a resolved-options object: entries sorted by name, then
 * JSON-encoded. The documented option values are primitives (booleans / strings
 * / null), so this is a faithful, collision-free key.
 */
function pipelineKey(resolvedOptions) {
  const entries = Object.entries(resolvedOptions).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return JSON.stringify(entries);
}

/**
 * The memoized render pipeline for these options, built (and cached) on first
 * use and reused thereafter. render() and renderInto() go through it. Exported
 * for tests (a reuse / instance-identity check); not part of the documented
 * public surface.
 *
 * @param {object} [options] - pipeline options; override BROWSER_DEFAULTS as needed.
 * @returns {import('unified').Processor}
 */
export function getPipeline(options = {}) {
  const resolved = { ...BROWSER_DEFAULTS, ...options };
  const key = pipelineKey(resolved);
  let processor = _pipelineCache.get(key);
  if (!processor) {
    processor = buildEnscribePipeline(resolved);
    _pipelineCache.set(key, processor);
  }
  return processor;
}

/**
 * Render enscribe source to an HTML string.
 *
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options; override BROWSER_DEFAULTS as needed.
 * @returns {string} Serialized HTML.
 */
export function render(source, options = {}) {
  return String(getPipeline(options).processSync(source));
}

// #133: a <library src> fast-path gate — true only if the source might carry an
// external library source, so renderAsync can short-circuit to the sync render
// for the common (inline / no-src) case without a discovery parse.
const HAS_LIBRARY_SRC = /<library\b[^>]*\bsrc\s*=/i;

/**
 * Fetch a library source's text, resolving a relative src against the document
 * base URL. Throws (→ a visible error) on a non-OK response or a network/CORS
 * failure — a runtime fact for cross-origin URLs, surfaced, not gated.
 */
async function fetchSourceText(src, baseUrl) {
  const url = baseUrl ? new URL(src, baseUrl).href : src;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  return res.text();
}

/**
 * Render enscribe source to HTML, loading any external `<library src="…">`
 * sources first (#133). The async counterpart of render(): it pre-fetches each
 * source (relative paths against `document.baseURI`; cross-origin URLs are
 * CORS-limited and surface a visible error), then runs the same synchronous
 * pipeline with the loaded content. Sources that fail to load render a visible
 * error block; the document still renders (always-renders).
 *
 * For a document with no `<library src>` this is just render() — no fetch, no
 * extra parse.
 *
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<string>} Serialized HTML.
 */
export async function renderAsync(source, options = {}) {
  if (!HAS_LIBRARY_SRC.test(source)) return render(source, options);
  const srcs = collectLibrarySources(source);
  if (srcs.length === 0) return render(source, options);
  const baseUrl = (typeof document !== 'undefined' && document.baseURI) || undefined;
  const loaded = await preloadSources(srcs, (src) => fetchSourceText(src, baseUrl));
  return String(
    getPipeline(options).processSync({ value: source, data: { [ENSCRIBE_LOADED_SOURCES]: loaded } }),
  );
}

/**
 * renderAsync + write into a DOM element (the async counterpart of renderInto).
 * Like renderInto, the result is assigned via innerHTML, so call executeAssets
 * after this to activate any injected interactive scripts.
 *
 * @param {string|Element} target - a CSS selector or an Element to fill.
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Promise<Element>} The element that was written into.
 */
export async function renderIntoAsync(target, source, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`renderIntoAsync: target not found: ${String(target)}`);
  }
  el.innerHTML = await renderAsync(source, options);
  return el;
}

/**
 * Render enscribe source and write it into a DOM element.
 *
 * @param {string|Element} target - a CSS selector or an Element to fill.
 * @param {string} source - enscribe/markdown source text.
 * @param {object} [options] - pipeline options (see render()).
 * @returns {Element} The element that was written into.
 *
 * LIMITATION (Phase 14 Slice 1): the rendered HTML is assigned via innerHTML,
 * which the HTML spec deliberately prevents from executing any injected
 * <script> elements. So the hover-preview init script and any DSL (mermaid/abc)
 * activation scripts emitted into the fragment will NOT run automatically here.
 * To make an interactive document live, call executeAssets(el) AFTER renderInto
 * (the two-step pattern, Phase 14 Slice 2); or render() a full HTML page the
 * browser parses normally, where the scripts run during parse.
 */
export function renderInto(target, source, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`renderInto: target not found: ${String(target)}`);
  }
  el.innerHTML = render(source, options);
  return el;
}

/**
 * Activate the enscribe-injected <script> assets inside an element whose HTML
 * was set via innerHTML (renderInto, or a manual `el.innerHTML = render(...)`).
 *
 * Why this exists (Phase 14 Slice 2): innerHTML leaves injected <script>s inert
 * (see renderInto's LIMITATION). The interactive layer enscribe emits — Tippy/
 * Popper hover-previews and the live-link DSL bundles (mermaid/abc) — is a set
 * of <script> elements that therefore never run. executeAssets walks the subtree
 * and re-creates each so the browser executes it, completing the two-step
 * `render → executeAssets` pattern.
 *
 * Scope: this only handles scripts ENSCRIBE itself injects. It is not a general
 * "run every script in this HTML" facility — executing arbitrary markup-derived
 * JS is a consumer's decision, not ours.
 *
 * Three properties make it correct rather than a naive re-inject loop:
 *
 *   1. Order + readiness. The injected scripts have load-order dependencies:
 *      `mermaid.initialize(...)` needs the mermaid lib; the hover-preview init
 *      needs Tippy, which needs Popper. External (src) scripts load
 *      asynchronously, so we process the list in document order and AWAIT each
 *      external script's load before moving on — exactly the blocking, in-order
 *      semantics the browser gives parsed (non-async) scripts. A parallel
 *      Promise.all would run `mermaid.initialize` before `mermaid` exists.
 *
 *   2. Dedup. In a live editor this runs on every edit. Re-fetching and
 *      re-evaluating the multi-megabyte mermaid/Tippy/Popper bundles each
 *      keystroke is wasteful and can re-clobber globals, so an external src
 *      already loaded into <head> is skipped (its global is already there). The
 *      check is <head>-scoped, not whole-document, so the inert original still in
 *      the target subtree is not mistaken for a completed load (see
 *      externalAlreadyLoaded).
 *
 *   3. DSL re-render kick. mermaid's init is `mermaid.initialize({ startOnLoad:
 *      true })`, which only renders on the initial DOMContentLoaded — correct for
 *      a parsed full-page file, but a no-op when markup is injected after load.
 *      So after the scripts run we call `mermaid.run()` to scan for unrendered
 *      diagrams. (abc's init self-renders via its readyState-`else` branch when
 *      re-executed, so it needs no kick.)
 *
 * @param {string|Element} target - a CSS selector or the Element written into.
 * @returns {Promise<Element>} resolves with the element once assets have run.
 */
export async function executeAssets(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`executeAssets: target not found: ${String(target)}`);
  }

  for (const original of [...el.querySelectorAll('script')]) {
    const src = original.getAttribute('src');
    if (src) {
      if (!externalAlreadyLoaded(src)) {
        await loadExternalScript(original);
      }
    } else {
      runInlineScript(original);
    }
  }

  // DSL re-render kick (property 3). Guarded: a mid-edit invalid diagram makes
  // mermaid.run() reject, which must not break the editor loop.
  if (window.mermaid && typeof window.mermaid.run === 'function') {
    try {
      await window.mermaid.run();
    } catch {
      /* invalid/in-progress diagram source — ignore until the next render */
    }
  }

  return el;
}

/**
 * True if this external src has already been loaded by a prior pass.
 *
 * Scoped to <head> ON PURPOSE: loadExternalScript appends loaded externals to
 * <head>, whereas the inert injected originals sit in the TARGET subtree (in
 * <body>). A whole-document query would match the original `<script src>` against
 * itself and wrongly report "already loaded", so the external library would never
 * actually run (the silent failure that left mermaid/Tippy dead in the editor).
 */
function externalAlreadyLoaded(src) {
  return [...document.head.querySelectorAll('script[src]')].some(
    (s) => s.getAttribute('src') === src || s.src === src,
  );
}

/** Re-create an external <script src>, append to <head>, resolve on load. */
function loadExternalScript(original) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    for (const { name, value } of [...original.attributes]) {
      s.setAttribute(name, value);
    }
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`executeAssets: failed to load ${original.getAttribute('src')}`));
    document.head.appendChild(s);
  });
}

/**
 * Re-create an inline <script> so it executes, replacing the inert original in
 * place (keeping it inside the target subtree, which the next render wipes).
 */
function runInlineScript(original) {
  const s = document.createElement('script');
  s.textContent = original.textContent;
  original.replaceWith(s);
}
