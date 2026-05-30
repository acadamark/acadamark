// src/browser.js — browser entry façade.
//
// The library's browser-facing API: turn acadamark source into HTML with one
// call, using browser-safe defaults so nothing tries to read the filesystem.
// This is the tsup entry point (see tsup.config.js); the package.json "browser"
// field swaps hover-preview assets to their build-inlined variant transparently
// inside index.js, so this file stays a thin wrapper over buildAcadamarkPipeline.
//
// Defaults rationale (Phase 14 Slice 1, "external-by-default" per the ratified
// embedResources design):
//   embedResources: false  → fonts + KaTeX CSS link to CDNs rather than inlining
//                            base64 (avoids fs reads; smaller HTML).
//   hoverPreviewMode: 'link' → third-party Tippy/Popper load from CDN; acadamark's
//                            own hover CSS/JS come from the build-inlined bundle.
//   dslMode: 'live-link'   → mermaid/abc render client-side from CDN scripts
//                            instead of being statically rendered via jsdom.
// A caller can override any of these (e.g. render(src, { embedResources: true })
// for self-contained output), and the finer-grained per-resource options
// (katexCss / documentFontsCss / per-DSL *Mode) still take precedence.

import { buildAcadamarkPipeline } from './index.js';

const BROWSER_DEFAULTS = {
  embedResources: false,
  hoverPreviewMode: 'link',
  dslMode: 'live-link',
};

/**
 * Render acadamark source to an HTML string.
 *
 * @param {string} source - acadamark/markdown source text.
 * @param {object} [options] - pipeline options; override BROWSER_DEFAULTS as needed.
 * @returns {string} Serialized HTML.
 */
export function render(source, options = {}) {
  const processor = buildAcadamarkPipeline({ ...BROWSER_DEFAULTS, ...options });
  return String(processor.processSync(source));
}

/**
 * Render acadamark source and write it into a DOM element.
 *
 * @param {string|Element} target - a CSS selector or an Element to fill.
 * @param {string} source - acadamark/markdown source text.
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
 * Activate the acadamark-injected <script> assets inside an element whose HTML
 * was set via innerHTML (renderInto, or a manual `el.innerHTML = render(...)`).
 *
 * Why this exists (Phase 14 Slice 2): innerHTML leaves injected <script>s inert
 * (see renderInto's LIMITATION). The interactive layer acadamark emits — Tippy/
 * Popper hover-previews and the live-link DSL bundles (mermaid/abc) — is a set
 * of <script> elements that therefore never run. executeAssets walks the subtree
 * and re-creates each so the browser executes it, completing the two-step
 * `render → executeAssets` pattern.
 *
 * Scope: this only handles scripts ACADAMARK itself injects. It is not a general
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
