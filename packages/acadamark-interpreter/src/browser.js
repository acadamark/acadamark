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
 * For an interactive document, either render() a full HTML page the browser
 * parses normally, or have the consumer re-inject/execute those scripts after
 * calling renderInto. Auto-executing injected scripts is intentionally out of
 * scope (it would mean eval-ing markup-derived JS); a future slice can add an
 * opt-in activation helper if the demand is real.
 */
export function renderInto(target, source, options = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) {
    throw new Error(`renderInto: target not found: ${String(target)}`);
  }
  el.innerHTML = render(source, options);
  return el;
}
