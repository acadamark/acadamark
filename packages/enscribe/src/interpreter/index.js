// Main entry for enscribe/interpreter.
//
// Exports the unified plugin `enscribeInterpreter`, which wires together,
// on the unified processor:
//   - remarkMath and remarkGfm — parser-level extensions registered on the
//     outer processor so bare $x$ math and bare GFM pipe tables are tokenized
//     at parse time (and on the inner processor below for the same reason
//     inside named-tag content).
//   - remarkRecursiveContent — re-parses each enscribeTag's pipe-content
//     string into a mdast subtree, given an inner processor whose plugin set
//     mirrors the outer parser plugins (remarkParse + remarkEnscribe +
//     remarkMath + remarkGfm).
//   - enscribeNormalizeMarkdown — rewrites delegated-parser nodes
//     (inlineMath, math, GFM table) to canonical enscribeTag nodes so the
//     downstream pipeline sees one node type.
//   - The discovery and structural plugins — enscribeConfigDiscovery,
//     enscribeArticleStructuring, enscribeSectionNesting.
//   - The semantic-processing plugins — buildCitationIndex (via an anonymous
//     plugin wrapper), enscribeNotes (register-only), enscribeNumbering
//     (register-only), an anonymous enscribeApplyNumbers plugin that calls
//     numberRegistry() and fillNumbering, enscribeRefResolution,
//     enscribeCiteResolution, enscribeNotePlacement, enscribeBibliography.
//   - A custom compiler that converts the final mdast → hast → HTML string
//     via mdast-util-to-hast (with the enscribeTag custom handler),
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
//   import remarkEnscribe from '@enscribejs/enscribe/parser';
//   import { enscribeInterpreter } from 'enscribe';
//
//   const result = await unified()
//     .use(remarkParse)
//     .use(remarkEnscribe)
//     .use(enscribeInterpreter)
//     .process(source);
//
//   console.log(String(result)); // HTML string
//
// OPTIONS
//   The full option set, with type / default / effect, is documented on the
//   enscribeInterpreter @param JSDoc below and in notes/specs/interpreter.md
//   §12; the authoring-facing version is the Authoring Guide's "Rendering and
//   output" chapter. The notes below detail the asset/DSL options; toc, theme,
//   chapterNav, and assetsDir are documented on the @param.
//
//   embedResources: boolean (default false)
//     The global embed-vs-external switch for the two resources enscribe would
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
import remarkEnscribe from '../parser/index.js';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
// Relative path import: @enscribejs/enscribe/parser does not re-export this module via
// its package exports field; we access it directly within the workspace.
import remarkRecursiveContent from '../parser/recursive-content.js';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import rehypeFormat from 'rehype-format';
import { smartTypography } from './smart-typography.js';

import { enscribeNormalizeToCanonical, enscribeNormalizeMarkdown } from './plugins/normalize-to-canonical.js';
import { enscribeConfigDiscovery } from './plugins/config-discovery.js';
import { enscribeArticleStructuring } from './plugins/article-structuring.js';
import { enscribeBookStructuring } from './plugins/book-structuring.js';
import { enscribeSectionNesting } from './plugins/section-nesting.js';
// #137: lower the `<list>` construct (+ `<-`/`<*` markers, `-`/`*` idiom) to a
// markdown list node, reusing the existing list render + JATS mapping.
import { enscribeListStructuring } from './plugins/list-structuring.js';
// #21: opt-in Enscribe inline markup in data-format table cells. Runs in the
// mdast phase so cell <ref>/<cite> become tree-resident before resolution.
import { enscribeTableCellParse } from './plugins/table-cell-parse.js';
import { enscribeHtmlTableCells } from './plugins/html-table-cells.js';
import { enscribeNotes } from './plugins/notes.js';
// Phase 5 slice 5c (2026-05-28): re-export enscribeNotePlacement so the
// JATS test pipeline can include it (it produces __note-list /
// __note-list-item / __note-marker nodes the JATS emitter consumes).
import { enscribeNotePlacement } from './plugins/note-placement.js';
import { buildCitationIndex, enscribeLibraryLoad } from './plugins/library-load.js';
import { enscribeNumbering, fillNumbering, numberSections } from './plugins/numbering.js';
import { enscribeRefResolution } from './plugins/ref-resolution.js';
import { enscribeCiteResolution } from './plugins/cite-resolution.js';
import { enscribeBibliography } from './plugins/bibliography.js';
import { enscribeTagHandler, createEnscribeTagHandler, htmlNodeHandler } from './interpret-plugin.js';
import { parseErrorHandler, tagErrorHandler } from './handlers/parser-errors.js';
import { getDocumentFontsCss, patchKatexFontUrls, DOCUMENT_FONTS_CDN_URL } from './assets/font-loader.js';
// Re-exported so consumers using documentFontsCss:'link' can reference the same
// font CDN URL (symmetry with the KATEX_CDN_URL export below).
export { DOCUMENT_FONTS_CDN_URL } from './assets/font-loader.js';
// Hover-preview CSS/JS (enscribe-local assets, no CDN). Lives in a swappable
// module: package.json's "browser" field substitutes the .browser.js variant
// (build-inlined strings) for browser bundles, while this Node import reads the
// sibling files from disk. See src/assets/hover-preview-assets.js for the why.
import { getHoverPreviewCss, getHoverPreviewJs } from './assets/hover-preview-assets.js';
// DSL render registry (internal): drives live-mode asset emission for external
// DSLs (mermaid, abc). Distinct concern from @enscribejs/enscribe/core's vocabulary
// registry imported immediately below.
import { getRegisteredDsls, resolveDslMode } from './dsl/registry.js';
import { ensureRegistry } from '../core/registry.js';
// Phase 8 Slice 2: <config theme=…> flows here via the config map on file.data.
import { ENSCRIBE_CONFIG, ENSCRIBE_STRICT_MODE, ENSCRIBE_LOADED_SOURCES } from '../core/file-data-keys.js';
// Phase 5 slice 5c (2026-05-28): re-export the table-format parsers so
// @enscribejs/cli can replicate the HTML pipeline's
// thead/tbody/tr/th/td emission inside <table-wrap>. Same re-export
// pattern as fillNumbering (slice 5b).
import { parseCsv, parseTsv } from './handlers/table.js';
// Render-quality bug-fix arc, JATS analog of slice B (2026-05-29):
// re-export the scoped-number formatter so @enscribejs/cli derives
// its <label> display numbers through the same helper the HTML render
// path and the cross-reference resolver use — keeping JATS <label>s and
// <xref>s in agreement (RQ-BOOK-M4, JATS side). Same re-export pattern as
// parseCsv above.
import { formatScopedNumber } from './lib/scoped-number.js';
// Phase 8 Slice 1: build-time table-of-contents. applyToc is a strict no-op
// unless the `toc` option enables it, preserving byte-identical output otherwise.
import { applyToc } from './lib/toc.js';
// #33: the margin column. applySidenotes (part 1) relocates numbered-note content
// into the margin when note-position=margin; markMarginLayout establishes the
// shared margin layout, factored out so it also fires for a <marginnote>-present
// document (part 2). The mdast tree (and thus JATS) is untouched. MARGIN_CSS is
// injected only when the margin is actually used, so default output — and the
// existing fixtures — stay byte-identical.
import { applySidenotes, markMarginLayout } from './lib/sidenotes.js';
import { MARGIN_CSS } from './assets/margin-css.js';
// #36 strict mode: the strictness register switch — parse off; re-parse with the
// register(s) disabled for sigil/canonical. `sigil` turns the markdown register
// off (canonical + sigils keep interpreting); `canonical` turns markdown AND
// sigils off (via the sigil-less enscribeSyntax variant), leaving only canonical
// named tags. flagStrictText + STRICT_FLAG_CSS add the lint, injected only when
// non-`off` (the sidenote-injection model).
import { resolveStrictMode, detectStrictMode, disableMarkdownIdioms, flagStrictText } from './lib/strict-mode.js';
import { STRICT_FLAG_CSS } from './assets/strict-flag-css.js';
// Phase 8 Slice 3: chapter-navigation client script (a string constant — no fs
// read — so the browser bundle stays fs-free). Injected only for book + ToC.
import { CHAPTER_NAV_JS } from './assets/chapter-nav-asset.js';
// #20: scroll-spy client script — the first first-party hand-authored render JS
// (distinct from the bundled DSL-rendering libraries). Injected whenever a ToC
// sidebar is rendered; a pure progressive enhancement over the existing ToC.
import { SCROLL_SPY_JS } from './assets/scroll-spy-asset.js';

export { enscribeNormalizeToCanonical, enscribeNormalizeMarkdown, enscribeConfigDiscovery, enscribeArticleStructuring, enscribeBookStructuring, enscribeSectionNesting, enscribeListStructuring, enscribeNotes, enscribeNotePlacement, enscribeLibraryLoad, buildCitationIndex, enscribeNumbering, fillNumbering, numberSections, enscribeRefResolution, enscribeCiteResolution, enscribeBibliography, enscribeTagHandler, createEnscribeTagHandler, parseCsv, parseTsv, formatScopedNumber };

// ─── KaTeX CSS ────────────────────────────────────────────────────────────────

// Pinned KaTeX version for the CDN URL — a literal, not an fs read, so this
// module loads in a browser bundle (the build slice's browser-safety boundary;
// see notes/specs/core.md). test/cdn-versions.test.js asserts it
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

// ─── Theme CSS (Phase 8 Slice 2) ──────────────────────────────────────────────
//
// Themes are `:root` custom-property overrides shipped in src/assets/themes/.
// The `theme` option (or a <config theme=…> setting) injects one inline, after
// the document's base default.css, so its tokens win the cascade. Always inlined
// (sub-1KB token files with no canonical CDN URL, unlike fonts / KaTeX) and read
// lazily — only when a theme is actually requested, keeping the browser bundle's
// fs-free default path intact.
const KNOWN_THEMES = new Set(['modern', 'compact']);
const _themeCss = new Map();
function getThemeCss(name) {
  if (!_themeCss.has(name)) {
    const dir = dirname(fileURLToPath(import.meta.url));
    _themeCss.set(name, readFileSync(join(dir, 'assets', 'themes', `${name}.css`), 'utf8'));
  }
  return _themeCss.get(name);
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
// enscribe's own hover CSS/JS moved to ./assets/hover-preview-assets.js so the
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

/**
 * Single-pass asset detection (#48). One walk of the rendered hast collects
 * every content-presence signal the compiler's conditional asset injection
 * needs, replacing the former one-walk-per-asset predicates (a separate full
 * traversal each for math, note markers, ref links, cite links, and one
 * `hasDslMarker` walk per registered DSL). Each flag uses the exact same
 * per-node predicate as before, so the emitted assets — and therefore the
 * output — are byte-identical; this only removes redundant traversals.
 *
 * @param {object} root  hast root (or any node)
 * @returns {{ math: boolean, notes: boolean, refLinks: boolean,
 *             citeLinks: boolean, dslNames: Set<string> }}
 */
function detectAssets(root) {
  const found = {
    math: false,
    notes: false,
    refLinks: false,
    citeLinks: false,
    marginnote: false,
    dslNames: new Set(),
  };
  (function walk(node) {
    if (node.type === 'element') {
      const props = node.properties ?? {};
      const tag = node.tagName;
      if (tag === 'inline-math' || tag === 'display-math') {
        found.math = true;
      } else if (tag === 'sup' && props.dataNoteId) {
        found.notes = true;
      } else if (tag === 'a' && Array.isArray(props.className) && props.className.includes('ref')) {
        found.refLinks = true;
      } else if (tag === 'cite' && Array.isArray(props.className) && props.className.includes('cite')) {
        found.citeLinks = true;
      } else if (tag === 'aside' && Array.isArray(props.className) && props.className.includes('enscribe-marginnote')) {
        // #33 part 2: a <marginnote> renders to <aside class="enscribe-marginnote">.
        // Its presence (independent of note-position) requires the margin column.
        found.marginnote = true;
      }
      // A DSL contract marker rides on a container element; collect it
      // independently of the tag-name checks above (a node is never both).
      if (props.dataEnscribeDsl) found.dslNames.add(props.dataEnscribeDsl);
    }
    for (const child of node.children ?? []) walk(child);
  })(root);
  return found;
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
//
// DSL presence is detected in the single detectAssets pass (#48): its
// `dslNames` set holds the `data-enscribe-dsl` markers found anywhere in the
// tree. A registration MAY still override detection via its optional `detector`
// field (the forward hook for custom DSLs) — that override is applied at the
// call site in the compiler, falling back to the precomputed set otherwise.

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
 * Splice enscribe's static-render class (and the contract element's id, when
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
      child.properties?.dataEnscribeDsl === dsl.name
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
 * Unified plugin. Applies the full enscribe pipeline: recursive content
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
 * @param {boolean|'auto'} [options.toc=false] Build-time table-of-contents sidebar. true always; 'auto' past three top-level sections; false (default) none. The layout CSS lives in default.css (consumer-supplied), scoped to `.enscribe-layout--toc`.
 * @param {'default'|'modern'|'compact'} [options.theme='default'] Inject a theme's `:root` token overrides inline (after the document's base default.css). 'default' (or unset) injects nothing. Also settable per-document via `<config theme=…>`; the option wins.
 * @param {'bottom'|'margin'} [options.notePosition='bottom'] Note render position (#33). 'bottom' (default) keeps numbered notes at the foot of the document; 'margin' projects each note's content into a wide margin column beside its marker (Tufte-style sidenotes) and injects the scoped sidenote CSS, falling back to the bottom rendering below a breakpoint. Display-only — markers, numbering, the note tree, and JATS are unchanged, and bottom-mode output (default) is byte-identical. Also settable per-document via `<config note-position=…>`; the option wins.
 * @param {boolean} [options.chapterNav] Single-chapter book navigation. For a book rendered with a ToC, injects a progressive-enhancement script that shows one chapter at a time (ToC as selector, prev/next, ←/→ keys, hash deep links, "show whole book"). Defaults on; `false` opts out. Ignored for articles and for books without a ToC.
 * @param {string|null} [options.assetsDir=null] Base directory for resolving `src=` paths in `<library src=…>` and `<table src=…>` (server-side only).
 * @param {boolean} [options.smartTypography=true] Smart typography (#54): curly quotes, en/em dashes, and ellipses in prose display output. A display-projection on the HTML side only — never the canonical AST / `.emd` / JATS. `false` disables it.
 * @param {'off'|'sigil'|'canonical'} [options.strictMode='off'] Strictness register switch (#36). Each value names the loosest register still interpreted. 'off' (default) interprets all three registers — today's behavior, byte-identical. 'sigil' turns the markdown register off: `*`, `#`, `-`, `>`, `` ` ``, `[](…)`, `$…$` pass through as literal characters (no escaping) while canonical tags and sigils stay live everywhere, including inside tag pipe bodies; would-be-markdown text is flagged with a visible lint. 'canonical' turns markdown AND sigils off (`<# #>`, `<$ $>`, `<->`, `<*>` also literal), leaving only canonical named tags — the canonical `<li>` and the `^{}`/`_{}` shortcuts stay live; would-be-markdown and would-be-sigil text is flagged. The flag CSS is injected only for a non-`off` rung. Native inferences (blank-line→paragraph, section nesting) stay on in all states. Layer 1 / JATS are unaffected. Also settable per-document via `<config strict-mode=…>`; the option wins.
 */
export function enscribeInterpreter(options = {}) {
  // embedResources is the global embed/external switch for the two resources
  // enscribe would otherwise inline (fonts, KaTeX CSS); default false → link
  // externally (lean output, the Quarto pattern). Each per-resource option below
  // overrides it when set explicitly. hoverPreviewMode and dslMode are NOT driven
  // by it — they keep their own defaults; the browser entry (src/browser.js) sets
  // those to 'link' / 'live-link' for client-side use.
  const embed = options.embedResources ?? false;
  const fontsMode = options.documentFontsCss ?? (embed ? 'inline' : 'link');
  const cssMode = options.katexCss ?? (embed ? 'inline' : 'link');
  const hoverMode = options.hoverPreviewMode ?? 'inline';
  const assetsDir = options.assetsDir ?? null;
  // Phase 8 Slice 1: table-of-contents. false (default) / true / 'auto'
  // (show only past a few top-level sections). Off → applyToc is a no-op.
  const tocOption = options.toc ?? false;
  // Phase 8 Slice 3: single-chapter book navigation. Defaults on for a book
  // that has a ToC (the ToC is the chapter selector); `false` forces it off.
  const chapterNavOption = options.chapterNav;
  // #54: smart typography — display-projection punctuation (curly quotes, dashes,
  // ellipses) on the HTML side only. On by default; `smartTypography: false` opts
  // out. Never touches the canonical AST / `.emd` / JATS (see smart-typography.js).
  const smartTypoOption = options.smartTypography;

  // G3: Register remarkMath on the outer processor so top-level bare $...$ is
  // tokenized. Must be registered before parse time (here, in the setup phase,
  // before .process() is called — unified resolves extensions lazily).
  this.use(remarkMath);
  // NORM-tables: Register remarkGfm on the outer processor so top-level bare
  // pipe tables are tokenized. footnotes, strikethrough, autolinks, and
  // tasklists are also enabled by remark-gfm; none collide with enscribe.
  // See notes/audit-findings.md AUD-20 for the Option A decision.
  this.use(remarkGfm);

  // Inner processor: used by remarkRecursiveContent to re-parse pipe-content
  // strings. It runs the same parser plugins as the outer processor but does
  // NOT include the structural or compile steps (those only run on the outer
  // tree, not on recursively-parsed subtrees).
  // G3: remarkMath added so bare $...$ inside named-tag content is tokenized
  // on both surfaces (outer and inner). The normalization pass then converts
  // all resulting inlineMath/math nodes to canonical enscribeTag nodes.
  // NORM-tables: remarkGfm added so bare pipe tables inside named-tag content
  // are tokenized and normalized on both surfaces.
  const innerProcessor = unified().use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);

  // #36 strict mode: the registers-OFF processors, one per non-`off` rung.
  //   sigilProcessor    — markdown idioms disabled; the enscribe extension intact
  //                       (tags + sigils interpret). For `sigil` mode. (remark-gfm /
  //                       remark-math are NOT added, so bare $ / pipe tables / ~~ are
  //                       off too.)
  //   canonicalProcessor — markdown idioms disabled AND the sigil register removed
  //                       from the finder (remarkEnscribe({ sigils:false })), so only
  //                       canonical named tags (+ <li>, + ^{}/_{}) interpret. For
  //                       `canonical` mode.
  // Used by resolveStrictMode to re-parse the source, and by recursive-content for
  // the sub-parses, when the mode is sigil/canonical.
  const sigilProcessor = unified().use(remarkParse).use(remarkEnscribe).use(disableMarkdownIdioms);
  const canonicalProcessor = unified().use(remarkParse).use(remarkEnscribe, { sigils: false }).use(disableMarkdownIdioms);

  // #36 (step 0): resolve the strict mode (option ?? <config strict-mode> ?? 'off')
  // and, when sigil/canonical, re-parse the source with the matching register(s)
  // off and swap the tree — before recursive-content, so its sub-parses run in the
  // same mode. A strict no-op for 'off' → the default parse is used unchanged
  // (byte-identical).
  this.use(resolveStrictMode, { sigilProcessor, canonicalProcessor, option: options.strictMode });

  // 1. Parse pipe-content strings into mdast children. In sigil/canonical mode the
  //    inner processor is the matching registers-off one (the register(s) stay off
  //    inside pipe bodies too); recursive-content selects it via the file.data mode.
  this.use(remarkRecursiveContent, { processor: innerProcessor, processorSigil: sigilProcessor, processorCanonical: canonicalProcessor });

  // 1.5. The normalize-to-canonical gate. Runs after step 1 so both outer
  //      and inner processor runs have completed. Runs before step 2 so no
  //      structural plugin sees a non-canonical form. Coerces every
  //      authored form to canonical Layer 1 shape: sigil tagnames rewritten
  //      via the tagname↔sigil cipher (lift direction); bare markdown
  //      headings normalized to sections (depths 1-3) or passed through as
  //      <hN> (depths 4-6); inline mdast forms lifted to canonical Layer 1
  //      inline elements. See plugins/normalize-to-canonical.js and
  //      DESIGN.md §"The single gate".
  this.use(enscribeNormalizeToCanonical);

  // 2–4. Structural transformation.
  this.use(enscribeConfigDiscovery);
  // Phase 4 slice 4a (2026-05-29): book-structuring runs BEFORE article-
  // structuring. For documents with <meta type=book> or <meta type=book-part>,
  // book-structuring wraps the tree in <book>/<book-part> and the
  // subsequent article-structuring sees the wrapped tree (no root <meta>
  // tag visible) and treats it as no-op-shaped. For articles,
  // book-structuring is a no-op and article-structuring does its work.
  this.use(enscribeBookStructuring);
  this.use(enscribeArticleStructuring);
  this.use(enscribeSectionNesting);
  // #137: lower `<list>` to a markdown list node. Runs after section nesting so
  // a `<list>` (sectionDepth 0, carried as section body content) is lowered
  // wherever it landed; before the semantic plugins, which see a plain list.
  this.use(enscribeListStructuring);

  // 5. Citation index (index-build, not a tree transformation): parse <library>
  //    content from <data> nodes (deep-collected wherever they land — at root
  //    in an article, nested in <book-body> in a book), build
  //    file.data.enscribeCitations. Requires enscribeConfigDiscovery
  //    (citation-style) to have run first.
  this.use(function enscribeCitationIndex() {
    return (tree, file) => buildCitationIndex(tree, file, { assetsDir });
  });

  // 5.5 (#21 / #105): parse opted-in data-table cells into canonical inline mdast.
  //     Runs BEFORE notes, numbering, and ref/cite resolution, so any <note> /
  //     <ref> / <cite> authored inside an opted-in cell is tree-resident when
  //     those passes run — the shared walkers (discover / walkReplace) descend the
  //     stamped cells, so cell footnotes register/number/hoist and cell refs/cites
  //     resolve exactly like body ones. (#21 originally placed this AFTER notes,
  //     leaving footnotes-in-cells out of scope; #105 moves it earlier to bring
  //     them in. A no-op for tables without an opt-in → byte-identical.)
  this.use(enscribeTableCellParse, { assetsDir });

  // 5.6 (#108): re-resolve Enscribe inline inside a no-format raw-HTML <table>
  //     escape hatch (the form the JATS importer serializes complex tables to in
  //     `.emd`). Parses the HTML-grid content, recovers each cell's inline source,
  //     and stamps the same `_htmlTable` shape #106 defined — so cell refs / cites
  //     / notes / math resolve on a fresh `.emd` render, closing the
  //     import-jats --emd → render round-trip. Runs with the cell-parse pass,
  //     before notes. A no-op for any table without a raw-HTML grid → byte-identical.
  this.use(enscribeHtmlTableCells);

  // 6. Notes: register note elements (record-only); splice __note-marker nodes
  //    into the tree; store pending data for the apply-numbers stage.
  this.use(enscribeNotes);

  // 7. Numbering: register equation, figure, and table elements (record-only);
  //    store pending { node, entry } pairs for the apply-numbers stage.
  this.use(enscribeNumbering);

  // 8. Apply numbers: single numbering stage. Calls numberRegistry() to assign
  //    all display numbers at once, then runs per-node fill steps.
  //    Runs after all registration (steps 6-7) and before ref/cite resolution (9-10).
  this.use(function enscribeApplyNumbers() {
    return (tree, file) => {
      const registry = ensureRegistry(file);
      registry.numberRegistry();
      fillNumbering(file);
      // #57: hierarchical section numbering (no-op unless number-sections is on;
      // default on for books, off for articles). Runs here so section registry
      // entries exist (registration ran in step 7) and cross-refs (step 9) see
      // the numbers.
      numberSections(tree, file);
    };
  });

  // 9. Ref resolution: replace <ref> nodes with __ref-marker or __ref-error.
  //    <note> nodes are still in the tree, so refs inside notes resolve naturally.
  this.use(enscribeRefResolution);

  // 10. Cite resolution: replace <cite> nodes with __cite-marker or __cite-error.
  //    <note> nodes are still in the tree, so cites inside notes resolve in
  //    document order (the intended correctness improvement from R3a).
  this.use(enscribeCiteResolution);

  // 11. Note placement: splice __note-marker nodes in place of <note> nodes;
  //    build __note-list-item nodes from the now-resolved note content; inject
  //    the __note-list into article-back. Runs after cite-resolution so note
  //    content is fully resolved before being moved to article-back.
  this.use(enscribeNotePlacement);

  // 12. Bibliography: render the bibliography and inject into article-back.
  this.use(enscribeBibliography);

  // 11. Register a compiler: mdast → hast → HTML.
  // `this.compiler` is the standard unified API for registering the
  // stringify step; it is called by processor.stringify() and
  // processor.process().
  this.compiler = function compileToHtml(tree, file) {
    // Document <config> values, resolved once for this compile. #19: `show-source`
    // (default off) reveals the authored DSL source behind a rendered diagram in a
    // native <details> disclosure; threaded into the diagram engine handlers via
    // the tag-handler opts. Read here — never stamped on the tree — so the mdast
    // tree (and therefore the JATS export, which consumes the same tree) is
    // identical whether the switch is on or off.
    const configMap = file?.data?.[ENSCRIBE_CONFIG];
    const showSource =
      configMap?.get('show-source') === true || configMap?.get('show-source') === 'true';
    // #195: per-render pre-loaded external sources (browser fetch / CLI async preload)
    // reach the table handler through the handler opts — the compiler has the VFile,
    // the toHast handlers do not.
    const loadedSources = file?.data?.[ENSCRIBE_LOADED_SOURCES] ?? null;
    const tagHandler = createEnscribeTagHandler({ assetsDir, showSource, loadedSources });
    const hast = toHast(tree, {
      handlers: {
        enscribeTag: tagHandler,
        // Author raw HTML: vocab tags pass through, non-vocab tags are escaped
        // to literal text (no HTML passthrough), and HTML comments are stripped.
        html: htmlNodeHandler,
        // Parser-error node renderers — the always-renders guarantee
        // (notes/specs/principles.md) requires enscribeParseError and
        // enscribeTagError nodes to render visibly at their source location.
        enscribeParseError: parseErrorHandler,
        enscribeTagError: tagErrorHandler,
      },
      allowDangerousHtml: true,
    });

    // #54: smart typography — curly quotes / en-em dashes / ellipsis on the prose
    // text of the rendered hast. Runs right after toHast, on the content tree only
    // (before any asset <style>/<script> are injected), and skips verbatim
    // subtrees (code / pre / math / raw) so their content stays byte-identical. A
    // pure display projection — the mdast tree (and the JATS export that consumes
    // it) is untouched. `smartTypography: false` opts out.
    if (smartTypoOption !== false) smartTypography(hast);

    // #48: detect every content asset in ONE walk (math / notes / refs / cites /
    // DSL markers), here on the content tree before any asset injection. The
    // injected <style>/<script>/<link> nodes and the ToC <nav> match none of the
    // predicates, so detecting before they are added is result-identical to the
    // former per-asset walks at each injection site — just one traversal, not six.
    const assets = detectAssets(hast);

    // Phase 8 Slice 1: table-of-contents. Runs before asset injection so the
    // assets land outside the layout wrapper (at the top of the body), and before
    // rehype-format so the generated <nav> is formatted with everything else.
    // A strict no-op when `toc` is off → byte-identical output for non-ToC docs.
    // Returns 'book' / 'article' / null so chapter-nav can gate on a book ToC.
    const tocType = applyToc(hast, tocOption);

    // #33: the margin column. Two independent triggers, either of which needs the
    // margin layout + CSS:
    //   - note-position=margin (part 1): relocate numbered-note content into the
    //     margin (applySidenotes; resolved like `theme` — the `notePosition`
    //     option wins over a `<config note-position=…>` setting, default 'bottom');
    //   - ≥1 <marginnote> present (part 2): the aside is authored in place and
    //     needs the margin to float into, INDEPENDENT of note-position.
    // markMarginLayout marks the (shared) layout and MARGIN_CSS is injected only
    // when one of those fires — so a default document adds nothing (byte-identical
    // fixtures). Display-only: the mdast tree (and the JATS export that consumes
    // it) is unchanged. Runs after applyToc so it can co-mark the layout wrapper,
    // and before rehype-format so any injected spans are formatted with the rest.
    const notePosition = options.notePosition ?? (configMap && configMap.get('note-position')) ?? 'bottom';
    const relocatedSidenotes = notePosition === 'margin' && applySidenotes(hast);
    if (relocatedSidenotes || assets.marginnote) {
      markMarginLayout(hast);
      hast.children.unshift(makeStyleElement(MARGIN_CSS));
    }

    // #36 strict mode: flag would-be-markdown (and, in canonical, would-be-sigil)
    // text and inject the flag CSS — only for a non-`off` rung. In 'off' this is a
    // strict no-op, so its output is byte-identical (the sidenote/margin CSS-
    // injection model). The mode was resolved by resolveStrictMode (file.data); the
    // sigil/canonical tree already has the register(s) off (re-parsed with the
    // matching disable), so the lint runs over text that genuinely passed literally.
    const strictMode = file?.data?.[ENSCRIBE_STRICT_MODE];
    if (strictMode === 'sigil' || strictMode === 'canonical') {
      flagStrictText(hast, strictMode);
      hast.children.unshift(makeStyleElement(STRICT_FLAG_CSS));
    }

    // Phase 8 Slice 3: inject the chapter-navigation script for a book that has a
    // ToC (which assigns the book-part ids the script navigates by). Default on;
    // `chapterNav: false` opts out. A pure enhancement — without it the book is
    // one long page — so it adds no markup beyond this one <script>.
    if (tocType === 'book' && chapterNavOption !== false) {
      hast.children.unshift(makeScriptElement(CHAPTER_NAV_JS));
    }

    // #20: scroll-spy — highlight the current section in the ToC sidebar as the
    // reader scrolls. Ships wherever a ToC sidebar is rendered (article or book);
    // no separate switch. A pure progressive enhancement: JS off → the ToC still
    // navigates, just no live highlight. Joins the existing render-JS injection
    // story (chapter-nav above, DSL libraries below) via the same
    // makeScriptElement path.
    if (tocType) {
      hast.children.unshift(makeScriptElement(SCROLL_SPY_JS));
    }

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

    // Inject the theme CSS (Phase 8 Slice 2) after the fonts, so its `:root`
    // overrides sit after the document's base default.css in the cascade. The
    // `theme` render option wins over a <config theme=…> document setting.
    const themeName = options.theme ?? (configMap && configMap.get('theme')) ?? 'default';
    if (themeName && themeName !== 'default') {
      if (KNOWN_THEMES.has(themeName)) {
        hast.children.unshift(makeStyleElement(getThemeCss(themeName)));
      } else {
        // Unknown theme name (e.g. a document carrying a theme this renderer
        // doesn't ship): warn and fall back to the default rather than failing
        // the whole render. No silent drop.
        // eslint-disable-next-line no-console
        console.warn(
          `[enscribe] unknown theme '${themeName}'; rendering with the default ` +
            `(available: ${[...KNOWN_THEMES].join(', ')}).`,
        );
      }
    }

    // Inject KaTeX CSS if the document uses math and the mode is not 'skip'.
    // Detection is done by walking the hast tree for inline-math / display-math
    // elements, so CSS is only added when actually needed.
    if (cssMode !== 'skip' && assets.math) {
      const cssNode =
        cssMode === 'link'
          ? makeLinkElement(KATEX_CDN_URL)
          : makeStyleElement(getKatexCss());
      hast.children.unshift(cssNode);
    }

    // Inject hover preview assets if the document has note markers, ref links,
    // or cite markers, and the mode is not 'skip'.
    if (hoverMode !== 'skip' && (assets.notes || assets.refLinks || assets.citeLinks)) {
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
      // #48: default detection reads the single-pass result; a custom DSL
      // `detector` still overrides (the forward hook documentUsesDsl provided).
      const usesDsl = dsl.detector ? dsl.detector(hast) : assets.dslNames.has(dsl.name);
      if (!usesDsl) continue;
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
 * Build a unified processor carrying the full enscribe pipeline:
 * remark-parse → @enscribejs/enscribe/parser → enscribeInterpreter. This is the single
 * shared assembly; consumers and the test suite call it instead of
 * hand-assembling the chain (AUD-17 — a hand-mirror previously drifted from
 * this assembly by omitting enscribeBookStructuring).
 *
 * Two ways to drive the returned processor:
 *   - HTML:           processor.processSync(source) → VFile (String(file) is HTML).
 *   - Intermediate hast (for snapshot inspection): processor.runSync(
 *     processor.parse(source)) returns the fully-transformed mdast (all
 *     structural plugins, including book-structuring, but not the compiler),
 *     which the caller can pass to toHast directly.
 *
 * @param {object} [options] Forwarded to enscribeInterpreter (embedResources,
 *   documentFontsCss, katexCss, hoverPreviewMode, dslMode, assetsDir).
 * @returns {import('unified').Processor}
 */
export function buildEnscribePipeline(options = {}) {
  return unified().use(remarkParse).use(remarkEnscribe).use(enscribeInterpreter, options);
}

/**
 * Lift a source document to its canonical-form mdast tree: parse + recursive
 * content + the normalize-to-canonical gate, and nothing after. The result is a
 * tree where markdown/sigil authored forms have been coerced to canonical
 * Layer 1 `enscribeTag` nodes, but BEFORE the structural plugins restructure it
 * — sections are not yet nested, and refs/cites/notes are not yet resolved (so
 * `<ref>`/`<cite>`/`<note>` remain as authorable tags). This is the input the
 * `enscribe lift` CLI command serializes back to canonical source.
 *
 * It reuses the same parse + recursive-content + normalize assembly that
 * `enscribeInterpreter` opens with (steps 1 and 1.5), so it cannot drift from
 * the real pipeline's lift behavior.
 *
 * #36: lift honors the document's `<config strict-mode>`. A sigil/canonical
 * document re-parses with the matching register(s) off, so a literal `# H` /
 * `*x*` / `<# H #>` stays literal text and round-trips losslessly (the markdown
 * register was the lossy element — a register-banned document has none). An
 * `off` document keeps the markdown-on parse, byte-identical and lossy by design.
 *
 * @param {string} source - enscribe/markdown source text.
 * @returns {import('mdast').Root} the post-normalize mdast tree.
 */
export function liftToCanonicalMdast(source) {
  // Parse once registers-on so detectStrictMode can find <config strict-mode>.
  const onInner = () => unified().use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);
  const tree = onInner().parse(source);

  const mode = detectStrictMode(tree, undefined);
  let outerTree = tree;
  let inner = onInner();
  if (mode === 'sigil' || mode === 'canonical') {
    // Re-parse with the matching register(s) off (sigil: markdown off; canonical:
    // markdown + sigils off), and use the same processor for the pipe-body sub-
    // parses so the register stays off there too.
    const sigils = mode !== 'canonical';
    const offProc = () => unified().use(remarkParse).use(remarkEnscribe, { sigils }).use(disableMarkdownIdioms);
    inner = offProc();
    outerTree = offProc().parse(source);
  }
  unified()
    .use(remarkRecursiveContent, { processor: inner })
    .use(enscribeNormalizeToCanonical)
    // Lower `<list>` (and its open markers) to a mdast list so the serializer sees
    // the canonical list shape — and so lift is idempotent (re-parsing the emitted
    // `<list>` / `<li>` lowers to the same list).
    .use(enscribeListStructuring)
    .runSync(outerTree);
  return outerTree;
}

/**
 * #133: discover every external `<library src="…">` source string in a document,
 * deduped, in document order. Used by the async pre-load (browser renderAsync /
 * the CLI render command) to know what to fetch before the synchronous render.
 *
 * Reuses `liftToCanonicalMdast` (parse + recursive-content + normalize) so the
 * `<library>` nodes inside `<data>` are revealed exactly as the real pipeline
 * sees them — no separate parser, no regex over the source.
 *
 * @param {string} source - enscribe/markdown source text.
 * @returns {string[]} the unique `src` strings.
 */
// #133: re-exported so the CLI render command can run the same load-then-fill
// pre-load (the browser uses them directly from this module).
export { preloadSources } from './lib/preload-library-sources.js';
export { ENSCRIBE_LOADED_SOURCES } from '../core/file-data-keys.js';

// #194: the multi-file master-document assembler. It lives in core (not the CLI)
// so both the CLI `build` command and the browser child-loader (#194) can import
// it — the browser render entry is in core and cannot depend on the CLI (wrong
// dependency direction). It is pure over its injected readFile/resolve/parse, so
// the relocation from the CLI package was behavior-neutral; see
// src/master-document/assemble.js.
export { assembleMasterDocument } from '../master-document/assemble.js';

export function collectLibrarySources(source) {
  const tree = liftToCanonicalMdast(source);
  const srcs = [];
  (function walk(nodes) {
    for (const n of nodes ?? []) {
      if (n?.type === 'enscribeTag' && n.tagname === 'library' && n.kwargs?.src) {
        srcs.push(n.kwargs.src);
      }
      if (n?.type === 'enscribeTag' && Array.isArray(n.content)) walk(n.content);
      if (Array.isArray(n?.children)) walk(n.children);
    }
  })(tree.children ?? []);
  return [...new Set(srcs)];
}

/**
 * #195: discover every external `<table src>` / `<csv src>` / `<tsv src>` data-source
 * string in a document, deduped, in document order — the table analog of
 * collectLibrarySources. Used by the async pre-load (browser renderAsync / the CLI
 * render command) to fetch table data before the synchronous render. After
 * liftToCanonicalMdast the gate has normalized `<csv>` / `<tsv>` to `<table>`, so the
 * data source rides on the `<table>` node's `src`; the {table,csv,tsv} set is kept for
 * robustness.
 *
 * @param {string} source - enscribe/markdown source text.
 * @returns {string[]} the unique table-data `src` strings.
 */
export function collectTableSources(source) {
  const tree = liftToCanonicalMdast(source);
  const srcs = [];
  const TABLE_TAGS = new Set(['table', 'csv', 'tsv']);
  (function walk(nodes) {
    for (const n of nodes ?? []) {
      if (n?.type === 'enscribeTag' && TABLE_TAGS.has(n.tagname) && n.kwargs?.src) {
        srcs.push(n.kwargs.src);
      }
      if (n?.type === 'enscribeTag' && Array.isArray(n.content)) walk(n.content);
      if (Array.isArray(n?.children)) walk(n.children);
    }
  })(tree.children ?? []);
  return [...new Set(srcs)];
}
