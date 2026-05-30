// Main entry for acadamark-interpreter.
//
// Exports the unified plugin `acadamarkInterpreter`, which wires together,
// on the unified processor:
//   - remarkMath and remarkGfm — parser-level extensions registered on the
//     outer processor so bare $x$ math and bare GFM pipe tables are tokenized
//     at parse time (and on the inner processor below for the same reason
//     inside named-tag content).
//   - remarkRecursiveContent — re-parses each acadamarkTag's pipe-content
//     string into a mdast subtree, given an inner processor whose plugin set
//     mirrors the outer parser plugins (remarkParse + remarkAcadamark +
//     remarkMath + remarkGfm).
//   - acadamarkNormalizeMarkdown — rewrites delegated-parser nodes
//     (inlineMath, math, GFM table) to canonical acadamarkTag nodes so the
//     downstream pipeline sees one node type.
//   - The discovery and structural plugins — acadamarkConfigDiscovery,
//     acadamarkArticleStructuring, acadamarkSectionNesting.
//   - The semantic-processing plugins — buildCitationIndex (via an anonymous
//     plugin wrapper), acadamarkNotes (register-only), acadamarkNumbering
//     (register-only), an anonymous acadamarkApplyNumbers plugin that calls
//     numberRegistry() and fillNumbering, acadamarkRefResolution,
//     acadamarkCiteResolution, acadamarkNotePlacement, acadamarkBibliography.
//   - A custom compiler that converts the final mdast → hast → HTML string
//     via mdast-util-to-hast (with the acadamarkTag custom handler),
//     conditional asset injection, and hast-util-to-html.
// See notes/specs/interpreter.md §2 and notes/specs/pipeline.md §1/§4 for
// the per-stage descriptions and ordering rationale.
//
// WIRING CHOICE
// remark-rehype is not installed in this workspace; we use mdast-util-to-hast
// directly and register a custom `compiler` function on the unified processor.
// This avoids a dependency while keeping the pipeline fully within the unified
// ecosystem convention (parse → run → compile → process).
//
// Consumer usage:
//   import { unified } from 'unified';
//   import remarkParse from 'remark-parse';
//   import remarkAcadamark from 'remark-acadamark';
//   import { acadamarkInterpreter } from 'acadamark-interpreter';
//
//   const result = await unified()
//     .use(remarkParse)
//     .use(remarkAcadamark)
//     .use(acadamarkInterpreter)
//     .process(source);
//
//   console.log(String(result)); // HTML string
//
// OPTIONS
//   embedResources: boolean (default false)
//     The global embed-vs-external switch for the two resources acadamark would
//     otherwise inline: document fonts and KaTeX CSS. false (the default) links
//     them externally (lean output — the Quarto pattern); true inlines them
//     (self-contained output — no network needed to view). The per-resource
//     options below override it when set explicitly. It does NOT drive
//     hoverPreviewMode or dslMode — those keep their own defaults (the browser
//     entry, src/browser.js, sets them to link / live-link for client use).
//
//   documentFontsCss: 'inline' | 'link' | 'skip'   (default: embedResources ? 'inline' : 'link')
//     'inline' — emit a <style> of @font-face rules with base64-inlined woff2
//                (self-contained; ~190KB).
//     'link'   — emit a <link rel="stylesheet"> to the font CDN (DOCUMENT_FONTS_CDN_URL).
//     'skip'   — emit nothing; the consumer supplies the fonts.
//   Fonts are emitted unconditionally (every document has body text) unless 'skip'.
//
//   katexCss: 'inline' | 'link' | 'skip'   (default: embedResources ? 'inline' : 'link')
//     'inline' — emit a <style> block containing KaTeX CSS (no external request).
//     'link'   — emit a <link rel="stylesheet"> to the KaTeX CDN.
//     'skip'   — emit no CSS; consumer handles stylesheet inclusion.
//   CSS is only emitted when the document contains math elements.
//
//   hoverPreviewMode: 'inline' (default) | 'link' | 'skip'
//     'inline' — emit inline <style>/<script> blocks for Tippy.js hover
//                previews on note markers.
//     'link'   — emit <link>/<script src> elements pointing to the CDN.
//     'skip'   — emit no hover preview assets; consumer handles JS/CSS.
//   Assets are only emitted when the document contains note markers.
//
//   dslMode: 'skip' (default) | 'live-inline' | 'live-link' | 'static'
//     How external DSLs (mermaid, abc) are rendered. Applies to every
//     registered DSL unless overridden per DSL.
//     'skip'        — emit only the pass-through contract markup; no library.
//                     The publisher wires up rendering. (The default — the
//                     engine pulls in no DSL library unless asked to.)
//     'live-inline' — also emit the DSL's library inline (a <script> carrying
//                     the bundled source) plus its init call, so the browser
//                     renders at view time with no external request.
//     'live-link'   — same, but load the library from its pinned CDN via
//                     <script src> instead of inlining it.
//     'static'      — render at build time and inline the result: an inline
//                     <svg> replaces the contract markup, with no client-side
//                     library or init emitted. Not every DSL has a static
//                     renderer: abc does (abcjs + jsdom), but mermaid is
//                     live-only, so requesting 'static' for a document
//                     containing mermaid is an error.
//   mermaidMode / abcMode: same value space (mermaidMode excludes 'static'),
//     overriding dslMode for that one DSL; resolved as ‹dsl›Mode ?? dslMode ??
//     'skip'. Assets are only emitted when the document contains that DSL's
//     elements. See src/dsl/registry.js and notes/specs/render-quality.md §9.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
// Relative path import: remark-acadamark does not re-export this module via
// its package exports field; we access it directly within the workspace.
import remarkRecursiveContent from 'remark-acadamark/recursive-content';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import rehypeFormat from 'rehype-format';

import { acadamarkNormalizeToCanonical, acadamarkNormalizeMarkdown } from './plugins/normalize-to-canonical.js';
import { acadamarkConfigDiscovery } from './plugins/config-discovery.js';
import { acadamarkArticleStructuring } from './plugins/article-structuring.js';
import { acadamarkBookStructuring } from './plugins/book-structuring.js';
import { acadamarkSectionNesting } from './plugins/section-nesting.js';
import { acadamarkNotes } from './plugins/notes.js';
// Phase 5 slice 5c (2026-05-28): re-export acadamarkNotePlacement so the
// JATS test pipeline can include it (it produces __note-list /
// __note-list-item / __note-marker nodes the JATS emitter consumes).
import { acadamarkNotePlacement } from './plugins/note-placement.js';
import { buildCitationIndex, acadamarkLibraryLoad } from './plugins/library-load.js';
import { acadamarkNumbering, fillNumbering } from './plugins/numbering.js';
import { acadamarkRefResolution } from './plugins/ref-resolution.js';
import { acadamarkCiteResolution } from './plugins/cite-resolution.js';
import { acadamarkBibliography } from './plugins/bibliography.js';
import { acadamarkTagHandler, createAcadamarkTagHandler } from './interpret-plugin.js';
import { parseErrorHandler, tagErrorHandler } from './handlers/parser-errors.js';
import { getDocumentFontsCss, patchKatexFontUrls, DOCUMENT_FONTS_CDN_URL } from './assets/font-loader.js';
// Re-exported so consumers using documentFontsCss:'link' can reference the same
// font CDN URL (symmetry with the KATEX_CDN_URL export below).
export { DOCUMENT_FONTS_CDN_URL } from './assets/font-loader.js';
// Hover-preview CSS/JS (acadamark-local assets, no CDN). Lives in a swappable
// module: package.json's "browser" field substitutes the .browser.js variant
// (build-inlined strings) for browser bundles, while this Node import reads the
// sibling files from disk. See src/assets/hover-preview-assets.js for the why.
import { getHoverPreviewCss, getHoverPreviewJs } from './assets/hover-preview-assets.js';
// DSL render registry (internal): drives live-mode asset emission for external
// DSLs (mermaid, abc). Distinct concern from acadamark-core's vocabulary
// registry imported immediately below.
import { getRegisteredDsls, resolveDslMode } from './dsl/registry.js';
import { ensureRegistry } from 'acadamark-core/registry';
// Phase 5 slice 5c (2026-05-28): re-export the table-format parsers so
// acadamark-jats-export can replicate the HTML pipeline's
// thead/tbody/tr/th/td emission inside <table-wrap>. Same re-export
// pattern as fillNumbering (slice 5b).
import { parseCsv, parseTsv } from './handlers/table.js';
// Render-quality bug-fix arc, JATS analog of slice B (2026-05-29):
// re-export the scoped-number formatter so acadamark-jats-export derives
// its <label> display numbers through the same helper the HTML render
// path and the cross-reference resolver use — keeping JATS <label>s and
// <xref>s in agreement (RQ-BOOK-M4, JATS side). Same re-export pattern as
// parseCsv above.
import { formatScopedNumber } from './lib/scoped-number.js';

export { acadamarkNormalizeToCanonical, acadamarkNormalizeMarkdown, acadamarkConfigDiscovery, acadamarkArticleStructuring, acadamarkBookStructuring, acadamarkSectionNesting, acadamarkNotes, acadamarkNotePlacement, acadamarkLibraryLoad, buildCitationIndex, acadamarkNumbering, fillNumbering, acadamarkRefResolution, acadamarkCiteResolution, acadamarkBibliography, acadamarkTagHandler, createAcadamarkTagHandler, parseCsv, parseTsv, formatScopedNumber };

// ─── KaTeX CSS ────────────────────────────────────────────────────────────────

// Pinned KaTeX version for the CDN URL — a literal, not an fs read, so this
// module loads in a browser bundle (the build slice's browser-safety boundary;
// see notes/specs/acadamark-core.md). test/cdn-versions.test.js asserts it
// equals the installed katex version, so a dependency bump fails loudly here.
const _katexVersion = '0.16.45';

/**
 * CDN URL for KaTeX CSS, pinned to the installed version.
 * Exported so consumers using 'link' mode can reference the same URL.
 */
export const KATEX_CDN_URL = `https://cdn.jsdelivr.net/npm/katex@${_katexVersion}/dist/katex.min.css`;

// Lazy-loaded CSS string — only reads the file when math is actually present.
// Font URLs in the raw CSS are relative (e.g. url(fonts/KaTeX_Main-Regular.woff2))
// and are replaced with base64 data URIs so the CSS works when inlined in HTML.
let _katexCss = null;
function getKatexCss() {
  if (_katexCss === null) {
    const katexDir = dirname(fileURLToPath(import.meta.resolve('katex')));
    const raw = readFileSync(join(katexDir, 'katex.min.css'), 'utf8');
    _katexCss = patchKatexFontUrls(raw);
  }
  return _katexCss;
}

// ─── Hover-preview assets ─────────────────────────────────────────────────────
// For inline mode: Popper UMD + Tippy UMD (non-bundle). Popper sets
// window.Popper; Tippy reads window.Popper. Source map comments stripped to
// avoid harmless 404 console warnings.
//
// The "tippy-bundle.umd.min.js" in the npm package still has a UMD factory
// that reads window.Popper externally — it does NOT self-contain Popper.
// We ship Popper explicitly so both inline and link modes work without
// loading extra scripts.

// CDN URLs — Popper first, then Tippy (non-bundle), then init script.
export const POPPER_CDN_JS_URL = `https://unpkg.com/@popperjs/core@2.11.8/dist/umd/popper.min.js`;
export const TIPPY_CDN_JS_URL = `https://unpkg.com/tippy.js@6.3.7/dist/tippy.umd.min.js`;
export const TIPPY_CDN_CSS_URL = `https://unpkg.com/tippy.js@6.3.7/dist/tippy.css`;
export const TIPPY_CDN_LIGHT_BORDER_URL = `https://unpkg.com/tippy.js@6.3.7/themes/light-border.css`;

// Lazy-loaded inline assets (third-party Tippy/Popper, used by inline hover mode).
// acadamark's own hover CSS/JS moved to ./assets/hover-preview-assets.js so the
// browser bundle can swap in build-inlined strings; see the import near the top.
let _tippyCss = null;
let _tippyLightBorderCss = null;
let _popperJs = null;
let _tippyJs = null;

function getTippyCss() {
  if (_tippyCss === null) {
    const tippyDir = dirname(fileURLToPath(import.meta.resolve('tippy.js')));
    _tippyCss = readFileSync(join(tippyDir, 'tippy.css'), 'utf8');
  }
  return _tippyCss;
}

function getTippyLightBorderCss() {
  if (_tippyLightBorderCss === null) {
    const tippyDir = dirname(fileURLToPath(import.meta.resolve('tippy.js')));
    _tippyLightBorderCss = readFileSync(join(tippyDir, '..', 'themes', 'light-border.css'), 'utf8');
  }
  return _tippyLightBorderCss;
}

function getPopperJs() {
  if (_popperJs === null) {
    const popperDir = dirname(fileURLToPath(import.meta.resolve('@popperjs/core')));
    const raw = readFileSync(join(popperDir, '..', 'umd', 'popper.min.js'), 'utf8');
    _popperJs = raw.replace(/\/\/# sourceMappingURL=.*$/m, '');
  }
  return _popperJs;
}

function getTippyJs() {
  if (_tippyJs === null) {
    const tippyDir = dirname(fileURLToPath(import.meta.resolve('tippy.js')));
    const raw = readFileSync(join(tippyDir, 'tippy.umd.min.js'), 'utf8');
    _tippyJs = raw.replace(/\/\/# sourceMappingURL=.*$/m, '');
  }
  return _tippyJs;
}

// getHoverPreviewCss / getHoverPreviewJs are imported from
// ./assets/hover-preview-assets.js (swappable Node/browser variants).

// ─── CSS injection helpers ────────────────────────────────────────────────────

/** Walk a hast tree and return true if it contains any math elements. */
function hasMathElements(node) {
  if (
    node.type === 'element' &&
    (node.tagName === 'inline-math' || node.tagName === 'display-math')
  ) {
    return true;
  }
  return (node.children ?? []).some(hasMathElements);
}

/** Walk a hast tree and return true if it contains any note marker elements. */
function hasNoteMarkers(node) {
  if (
    node.type === 'element' &&
    node.tagName === 'sup' &&
    node.properties?.dataNoteId
  ) {
    return true;
  }
  return (node.children ?? []).some(hasNoteMarkers);
}

/** Walk a hast tree and return true if it contains any resolved ref links. */
function hasRefLinks(node) {
  if (
    node.type === 'element' &&
    node.tagName === 'a' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes('ref')
  ) {
    return true;
  }
  return (node.children ?? []).some(hasRefLinks);
}

/** Walk a hast tree and return true if it contains any resolved cite markers. */
function hasCiteLinks(node) {
  if (
    node.type === 'element' &&
    node.tagName === 'cite' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes('cite')
  ) {
    return true;
  }
  return (node.children ?? []).some(hasCiteLinks);
}

function makeStyleElement(css) {
  return {
    type: 'element',
    tagName: 'style',
    properties: {},
    // Use a raw node so the CSS is emitted verbatim (no HTML escaping).
    // Requires allowDangerousHtml: true in toHtml, which we already use.
    children: [{ type: 'raw', value: css }],
  };
}

function makeScriptElement(js) {
  return {
    type: 'element',
    tagName: 'script',
    properties: {},
    children: [{ type: 'raw', value: js }],
  };
}

function makeLinkElement(href) {
  return {
    type: 'element',
    tagName: 'link',
    properties: { rel: ['stylesheet'], href },
    children: [],
  };
}

function makeScriptSrcElement(src) {
  return {
    type: 'element',
    tagName: 'script',
    properties: { src },
    children: [],
  };
}

/**
 * Build hover preview asset nodes for injection into the hast tree.
 * Returns an array of hast elements (CSS nodes first, JS nodes last).
 *
 * @param {'inline'|'link'} mode
 * @returns {import('hast').Element[]}
 */
function buildHoverPreviewAssets(mode) {
  if (mode === 'link') {
    return [
      makeLinkElement(TIPPY_CDN_CSS_URL),
      makeLinkElement(TIPPY_CDN_LIGHT_BORDER_URL),
      // hover-preview.css is local (not on CDN); always inline it.
      makeStyleElement(getHoverPreviewCss()),
      makeScriptSrcElement(POPPER_CDN_JS_URL),
      makeScriptSrcElement(TIPPY_CDN_JS_URL),
      makeScriptElement(getHoverPreviewJs()),
    ];
  }
  // 'inline' mode: Popper + Tippy + init, all as inline scripts.
  return [
    makeStyleElement(getTippyCss() + '\n' + getTippyLightBorderCss() + '\n' + getHoverPreviewCss()),
    makeScriptElement(getPopperJs() + '\n' + getTippyJs() + '\n' + getHoverPreviewJs()),
  ];
}

// ─── External-DSL assets ──────────────────────────────────────────────────────

/**
 * Walk a hast tree; return true if it contains a container carrying the given
 * DSL's contract marker (data-acadamark-dsl === name). Same detector shape as
 * hasMathElements / hasNoteMarkers above.
 */
function hasDslMarker(node, name) {
  if (node.type === 'element' && node.properties?.dataAcadamarkDsl === name) {
    return true;
  }
  return (node.children ?? []).some((child) => hasDslMarker(child, name));
}

/**
 * Does the document use this DSL? Defaults to the contract-marker walk above; a
 * registration MAY override it via its optional `detector` field. No built-in
 * registration overrides it in v0.1.0 — this is the forward hook for custom
 * DSLs registered through the planned v0.2.0 public API.
 */
function documentUsesDsl(root, dsl) {
  return dsl.detector ? dsl.detector(root) : hasDslMarker(root, dsl.name);
}

/**
 * Build the asset nodes for one DSL in a live mode. Mirrors
 * buildHoverPreviewAssets: 'live-link' emits a <script src> to the pinned CDN
 * plus an inline init <script>; 'live-inline' emits one inline <script> with
 * the bundled library source followed by its init (the bundle is read lazily,
 * only here, via the registration's bundleLoader).
 *
 * @param {object} dsl  a DSL registration record (src/dsl/registry.js)
 * @param {'live-inline'|'live-link'} mode
 * @returns {import('hast').Element[]}
 */
function buildDslAssets(dsl, mode) {
  const { bundleLoader, cdnUrl, initScript } = dsl.liveAssets;
  if (mode === 'live-link') {
    return [makeScriptSrcElement(cdnUrl), makeScriptElement(initScript)];
  }
  // 'live-inline': bundled library source + init in a single inline <script>.
  return [makeScriptElement(bundleLoader() + '\n' + initScript)];
}

/**
 * Extract the verbatim source text of a DSL contract element: the text-node
 * children concatenated. The handler emits the DSL source as a single text node
 * inside the <pre> container; this reads it back for the static renderer.
 *
 * @param {import('hast').Element} el
 * @returns {string}
 */
function extractDslSource(el) {
  return (el.children ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.value)
    .join('');
}

/**
 * Splice acadamark's static-render class (and the contract element's id, when
 * present) into the rendered <svg>'s opening tag. abcjs's root <svg> carries no
 * class or id of its own (verified), so this adds attributes rather than merging.
 * A string splice on the first `<svg` keeps the SVG bytes otherwise verbatim —
 * avoiding a hast round-trip that could alter case-sensitive SVG attributes
 * (viewBox, preserveAspectRatio, …).
 *
 * @param {string} svg        SVG markup from the static renderer
 * @param {string|undefined} id   id to preserve on the rendered <svg>, or undefined
 * @param {string} className  the static-render class (registration.staticClass)
 * @returns {string}
 */
function decorateStaticSvg(svg, id, className) {
  const attrs =
    ` class="${className}"` +
    (id != null ? ` id="${String(id).replace(/"/g, '&quot;')}"` : '');
  return svg.replace(/<svg\b/, `<svg${attrs}`);
}

/**
 * Static-mode emit: walk the hast tree and replace each of this DSL's contract
 * elements with a raw node carrying the build-time-rendered SVG (decorated with
 * the static class + preserved id). This is a *mutation* — not the additive
 * prepend of live/skip — because static replaces the source with its rendering.
 *
 * Must run AFTER rehype-format: the formatter reflows whitespace inside non-
 * whitespace-sensitive containers, which would corrupt the inlined SVG's
 * <text>/<tspan> runs (the RQ-DSL-M2 class of bug). Emitting the SVG as a raw
 * node after formatting means hast-util-to-html (allowDangerousHtml) serializes
 * it verbatim. The contract element's id moves onto the <svg> (so cross-refs
 * survive); its sibling <figcaption>s are untouched (they are siblings, not
 * children, of the contract element).
 *
 * @param {object} node  hast node (root or element)
 * @param {object} dsl   DSL registration (its staticRenderer + staticClass)
 */
function replaceDslContractsWithSvg(node, dsl) {
  if (!node || !Array.isArray(node.children)) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (
      child.type === 'element' &&
      child.properties?.dataAcadamarkDsl === dsl.name
    ) {
      const svg = dsl.staticRenderer(extractDslSource(child));
      const decorated = decorateStaticSvg(svg, child.properties.id, dsl.staticClass);
      node.children[i] = { type: 'raw', value: decorated };
    } else {
      replaceDslContractsWithSvg(child, dsl);
    }
  }
}

/**
 * Unified plugin. Applies the full acadamark pipeline: recursive content
 * parsing, structural plugins, and mdast-to-HTML compilation.
 *
 * @this {import('unified').Processor}
 * @param {object} [options]
 * @param {boolean} [options.embedResources=false] Global embed (true) vs external-link (false) switch for fonts + KaTeX CSS.
 * @param {'inline'|'link'|'skip'} [options.documentFontsCss] Document-fonts handling; default embedResources ? 'inline' : 'link'.
 * @param {'inline'|'link'|'skip'} [options.katexCss] KaTeX CSS handling; default embedResources ? 'inline' : 'link'.
 * @param {'inline'|'link'|'skip'} [options.hoverPreviewMode='inline'] Hover preview mode.
 * @param {'skip'|'live-inline'|'live-link'|'static'} [options.dslMode='skip'] External-DSL render mode (all DSLs).
 * @param {'skip'|'live-inline'|'live-link'} [options.mermaidMode] Override dslMode for mermaid (live-only; no 'static').
 * @param {'skip'|'live-inline'|'live-link'|'static'} [options.abcMode] Override dslMode for abc.
 */
export function acadamarkInterpreter(options = {}) {
  // embedResources is the global embed/external switch for the two resources
  // acadamark would otherwise inline (fonts, KaTeX CSS); default false → link
  // externally (lean output, the Quarto pattern). Each per-resource option below
  // overrides it when set explicitly. hoverPreviewMode and dslMode are NOT driven
  // by it — they keep their own defaults; the browser entry (src/browser.js) sets
  // those to 'link' / 'live-link' for client-side use.
  const embed = options.embedResources ?? false;
  const fontsMode = options.documentFontsCss ?? (embed ? 'inline' : 'link');
  const cssMode = options.katexCss ?? (embed ? 'inline' : 'link');
  const hoverMode = options.hoverPreviewMode ?? 'inline';
  const assetsDir = options.assetsDir ?? null;

  // G3: Register remarkMath on the outer processor so top-level bare $...$ is
  // tokenized. Must be registered before parse time (here, in the setup phase,
  // before .process() is called — unified resolves extensions lazily).
  this.use(remarkMath);
  // NORM-tables: Register remarkGfm on the outer processor so top-level bare
  // pipe tables are tokenized. footnotes, strikethrough, autolinks, and
  // tasklists are also enabled by remark-gfm; none collide with acadamark.
  // See notes/audit-findings.md AUD-20 for the Option A decision.
  this.use(remarkGfm);

  // Inner processor: used by remarkRecursiveContent to re-parse pipe-content
  // strings. It runs the same parser plugins as the outer processor but does
  // NOT include the structural or compile steps (those only run on the outer
  // tree, not on recursively-parsed subtrees).
  // G3: remarkMath added so bare $...$ inside named-tag content is tokenized
  // on both surfaces (outer and inner). The normalization pass then converts
  // all resulting inlineMath/math nodes to canonical acadamarkTag nodes.
  // NORM-tables: remarkGfm added so bare pipe tables inside named-tag content
  // are tokenized and normalized on both surfaces.
  const innerProcessor = unified().use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm);

  // 1. Parse pipe-content strings into mdast children.
  this.use(remarkRecursiveContent, { processor: innerProcessor });

  // 1.5. The normalize-to-canonical gate. Runs after step 1 so both outer
  //      and inner processor runs have completed. Runs before step 2 so no
  //      structural plugin sees a non-canonical form. Coerces every
  //      authored form to canonical Layer 1 shape: sigil tagnames rewritten
  //      via the tagname↔sigil cipher (lift direction); bare markdown
  //      headings normalized to sections (depths 1-3) or passed through as
  //      <hN> (depths 4-6); inline mdast forms lifted to canonical Layer 1
  //      inline elements. See plugins/normalize-to-canonical.js and
  //      DESIGN.md §"The single gate".
  this.use(acadamarkNormalizeToCanonical);

  // 2–4. Structural transformation.
  this.use(acadamarkConfigDiscovery);
  // Phase 4 slice 4a (2026-05-29): book-structuring runs BEFORE article-
  // structuring. For documents with <meta type=book> or <meta type=book-part>,
  // book-structuring wraps the tree in <book>/<book-part> and the
  // subsequent article-structuring sees the wrapped tree (no root <meta>
  // tag visible) and treats it as no-op-shaped. For articles,
  // book-structuring is a no-op and article-structuring does its work.
  this.use(acadamarkBookStructuring);
  this.use(acadamarkArticleStructuring);
  this.use(acadamarkSectionNesting);

  // 5. Citation index (index-build, not a tree transformation): parse <library>
  //    content from <data> nodes (deep-collected wherever they land — at root
  //    in an article, nested in <book-body> in a book), build
  //    file.data.acadamarkCitations. Requires acadamarkConfigDiscovery
  //    (citation-style) to have run first.
  this.use(function acadamarkCitationIndex() {
    return (tree, file) => buildCitationIndex(tree, file, { assetsDir });
  });

  // 6. Notes: register note elements (record-only); splice __note-marker nodes
  //    into the tree; store pending data for the apply-numbers stage.
  this.use(acadamarkNotes);

  // 7. Numbering: register equation, figure, and table elements (record-only);
  //    store pending { node, entry } pairs for the apply-numbers stage.
  this.use(acadamarkNumbering);

  // 8. Apply numbers: single numbering stage. Calls numberRegistry() to assign
  //    all display numbers at once, then runs per-node fill steps.
  //    Runs after all registration (steps 6-7) and before ref/cite resolution (9-10).
  this.use(function acadamarkApplyNumbers() {
    return (tree, file) => {
      const registry = ensureRegistry(file);
      registry.numberRegistry();
      fillNumbering(file);
    };
  });

  // 9. Ref resolution: replace <ref> nodes with __ref-marker or __ref-error.
  //    <note> nodes are still in the tree, so refs inside notes resolve naturally.
  this.use(acadamarkRefResolution);

  // 10. Cite resolution: replace <cite> nodes with __cite-marker or __cite-error.
  //    <note> nodes are still in the tree, so cites inside notes resolve in
  //    document order (the intended correctness improvement from R3a).
  this.use(acadamarkCiteResolution);

  // 11. Note placement: splice __note-marker nodes in place of <note> nodes;
  //    build __note-list-item nodes from the now-resolved note content; inject
  //    the __note-list into article-back. Runs after cite-resolution so note
  //    content is fully resolved before being moved to article-back.
  this.use(acadamarkNotePlacement);

  // 12. Bibliography: render the bibliography and inject into article-back.
  this.use(acadamarkBibliography);

  // 11. Register a compiler: mdast → hast → HTML.
  // `this.compiler` is the standard unified API for registering the
  // stringify step; it is called by processor.stringify() and
  // processor.process().
  this.compiler = function compileToHtml(tree) {
    const tagHandler = createAcadamarkTagHandler({ assetsDir });
    const hast = toHast(tree, {
      handlers: {
        acadamarkTag: tagHandler,
        // Parser-error node renderers — the always-renders guarantee
        // (notes/specs/principles.md) requires acadamarkParseError and
        // acadamarkTagError nodes to render visibly at their source location.
        acadamarkParseError: parseErrorHandler,
        acadamarkTagError: tagErrorHandler,
      },
      allowDangerousHtml: true,
    });

    // Inject document fonts (Inter, Source Code Pro). fontsMode — driven by
    // embedResources unless documentFontsCss overrides — picks the form: 'inline'
    // emits a <style> of base64 @font-face rules (self-contained), 'link' a <link>
    // to the font CDN (lean, external-by-default), 'skip' nothing. Emitted
    // unconditionally (every document has body text) unless 'skip'.
    if (fontsMode !== 'skip') {
      hast.children.unshift(
        fontsMode === 'link'
          ? makeLinkElement(DOCUMENT_FONTS_CDN_URL)
          : makeStyleElement(getDocumentFontsCss()),
      );
    }

    // Inject KaTeX CSS if the document uses math and the mode is not 'skip'.
    // Detection is done by walking the hast tree for inline-math / display-math
    // elements, so CSS is only added when actually needed.
    if (cssMode !== 'skip' && hasMathElements(hast)) {
      const cssNode =
        cssMode === 'link'
          ? makeLinkElement(KATEX_CDN_URL)
          : makeStyleElement(getKatexCss());
      hast.children.unshift(cssNode);
    }

    // Inject hover preview assets if the document has note markers, ref links,
    // or cite markers, and the mode is not 'skip'.
    if (hoverMode !== 'skip' && (hasNoteMarkers(hast) || hasRefLinks(hast) || hasCiteLinks(hast))) {
      const assets = buildHoverPreviewAssets(hoverMode);
      // Prepend CSS, append JS (after DOM) — both before main content.
      // In practice: CSS <style>/<link> first, then JS <script> last.
      // We prepend all assets and let CSS-first ordering handle the rest.
      hast.children.unshift(...assets);
    }

    // Inject external-DSL (mermaid, abc) render assets. Iterating the registry —
    // rather than naming each DSL here — keeps this open to new DSLs without
    // edits. For each DSL present in the document, its resolved mode decides the
    // shape:
    //   - skip (default): emit nothing (the contract markup already stands);
    //   - live-inline / live-link: prepend the library + init (additive);
    //   - static: defer to a post-format replacement pass (collected here).
    // A DSL resolving to 'static' with no staticRenderer (mermaid) fails
    // explicitly — the presence check means a global dslMode:'static' is only an
    // error for documents that actually contain such a DSL.
    // See src/dsl/registry.js and notes/specs/render-quality.md §9.
    const staticDsls = [];
    for (const dsl of getRegisteredDsls()) {
      if (!documentUsesDsl(hast, dsl)) continue;
      const mode = resolveDslMode(dsl.name, options);
      if (mode === 'skip') continue;
      if (mode === 'static') {
        if (!dsl.staticRenderer) {
          throw new Error(
            `dslMode 'static' is not available for '${dsl.name}': it has no static renderer.\n` +
              `Use ${dsl.name}Mode 'live-inline', 'live-link', or 'skip' ` +
              `(or leave dslMode at the default 'skip').`,
          );
        }
        // Static is a tree mutation that must run after rehype-format (running
        // before it would let the formatter reflow the inlined SVG); collect the
        // DSL now and apply the replacement below.
        staticDsls.push(dsl);
        continue;
      }
      // live-inline / live-link
      hast.children.unshift(...buildDslAssets(dsl, mode));
    }

    // Format the hast tree for readable HTML output: block elements get
    // indentation and line breaks; inline content is preserved as-is.
    // rehype-format leaves <style> and <script> contents untouched.
    rehypeFormat()(hast);

    // Static-mode DSL emit, AFTER formatting: replace each collected DSL's
    // contract elements with their build-time SVG (see replaceDslContractsWithSvg
    // for why this runs post-format).
    for (const dsl of staticDsls) {
      replaceDslContractsWithSvg(hast, dsl);
    }

    return toHtml(hast, { allowDangerousHtml: true });
  };
}

/**
 * Build a unified processor carrying the full acadamark pipeline:
 * remark-parse → remark-acadamark → acadamarkInterpreter. This is the single
 * shared assembly; consumers and the test suite call it instead of
 * hand-assembling the chain (AUD-17 — a hand-mirror previously drifted from
 * this assembly by omitting acadamarkBookStructuring).
 *
 * Two ways to drive the returned processor:
 *   - HTML:           processor.processSync(source) → VFile (String(file) is HTML).
 *   - Intermediate hast (for snapshot inspection): processor.runSync(
 *     processor.parse(source)) returns the fully-transformed mdast (all
 *     structural plugins, including book-structuring, but not the compiler),
 *     which the caller can pass to toHast directly.
 *
 * @param {object} [options] Forwarded to acadamarkInterpreter (embedResources,
 *   documentFontsCss, katexCss, hoverPreviewMode, dslMode, assetsDir).
 * @returns {import('unified').Processor}
 */
export function buildAcadamarkPipeline(options = {}) {
  return unified().use(remarkParse).use(remarkAcadamark).use(acadamarkInterpreter, options);
}
