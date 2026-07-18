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
//   - The semantic-processing plugins — buildCitationIndex + buildAssetIndex
//     (one shared <data> harvest via the anonymous enscribeDataIndexes
//     wrapper), enscribeNotes (register-only), enscribeNumbering
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
import remarkRecoverUnclosedTags from './plugins/recover-unclosed-tags.js';
import { FLOW_TAGNAMES } from './lib/content-model.js';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
// #117: rehype-format, wrapped to be enscribe-inline-aware (it would otherwise treat custom
// INLINE elements — inline-math, term — as block and insert render-changing whitespace around
// them). See lib/format-html.js for the why; block custom elements are unaffected.
import { formatHtml } from './lib/format-html.js';
import { splitBlockParagraphs } from './lib/split-block-paragraphs.js';
import { smartTypography } from './smart-typography.js';

import { enscribeNormalizeToCanonical, enscribeNormalizeMarkdown } from './plugins/normalize-to-canonical.js';
import { enscribeDocTypeResolve } from './plugins/doc-type.js';
import { enscribeConfigDiscovery } from './plugins/config-discovery.js';
import { enscribeArticleStructuring } from './plugins/article-structuring.js';
import { enscribeBookStructuring } from './plugins/book-structuring.js';
import { enscribeWebsiteStructuring } from './plugins/website-structuring.js';
import { enscribeSectionNesting } from './plugins/section-nesting.js';
import { enscribeHeadingLevels } from './plugins/heading-levels.js';
import { enscribeSrcRebase } from './plugins/src-rebase.js';
// #137: lower the `<list>` construct (+ `<-`/`<*` markers, `-`/`*` idiom) to a
// markdown list node, reusing the existing list render + JATS mapping.
import { enscribeListStructuring } from './plugins/list-structuring.js';
// #21: opt-in Enscribe inline markup in data-format table cells. Runs in the
// mdast phase so cell <ref>/<cite> become tree-resident before resolution.
import { enscribeTableCellParse } from './plugins/table-cell-parse.js';
import { enscribeNotes } from './plugins/notes.js';
// Phase 5 slice 5c (2026-05-28): re-export enscribeNotePlacement so the
// JATS test pipeline can include it (it produces __note-list /
// __note-list-item / __note-marker nodes the JATS emitter consumes).
import { enscribeNotePlacement } from './plugins/note-placement.js';
import { buildCitationIndex, collectDataNodes, enscribeLibraryLoad } from './plugins/library-load.js';
import { buildAssetIndex, enscribeAssetResolution } from './plugins/asset-load.js';
import { enscribeNumbering, fillNumbering, numberSections } from './plugins/numbering.js';
import { enscribeRefResolution } from './plugins/ref-resolution.js';
import { enscribeMinipageGuard } from './plugins/minipage-guard.js';
import { projectMinipageBody, walkMinipageNodes, MAX_MINIPAGE_DEPTH, minipageDepthErrorNode, qualifyScopeIds, minipageScopeSlug } from './lib/minipage.js';
import { enscribeCiteResolution } from './plugins/cite-resolution.js';
import { enscribeBibliography } from './plugins/bibliography.js';
import { enscribeTagHandler, createEnscribeTagHandler, htmlNodeHandler } from './interpret-plugin.js';
import { parseErrorHandler, tagErrorHandler } from './handlers/parser-errors.js';
import { getDocumentFontsCss, patchKatexFontUrls, DOCUMENT_FONTS_CDN_URL, KATEX_CDN_URL } from './assets/font-loader.js';
// Re-exported so consumers using documentFontsCss:'link' can reference the same
// font CDN URL (symmetry with the KATEX_CDN_URL export below).
export { DOCUMENT_FONTS_CDN_URL } from './assets/font-loader.js';
// Hover-preview CSS/JS (enscribe-local assets, no CDN). Lives in a swappable
// module: package.json's "browser" field substitutes the .browser.js variant
// (build-inlined strings) for browser bundles, while this Node import reads the
// sibling files from disk. See src/assets/hover-preview-assets.js for the why.
import { getHoverPreviewCss, getHoverPreviewJs } from './assets/hover-preview-assets.js';
// KNOWN_THEMES + getThemeCss live in a swappable module pair (Node fs-read / browser build-inlined via
// tsup `define`) so a live `<config theme=…>` render never fs-reads in the bundle (the C4 crash, #430).
import { KNOWN_THEMES, getThemeCss } from './assets/theme-css.js';
// #452: re-exported so the static-website build can inject the site MASTER's `<config theme>` into every
// page's universal head (site-wide, the same way it threads theme-variant / repo) — the CLI is a first-class
// consumer of the theme tokens, like composeWebsiteShellPage.
export { KNOWN_THEMES, getThemeCss } from './assets/theme-css.js';
// DSL render registry (internal): drives live-mode asset emission for external
// DSLs (mermaid, abc). Distinct concern from @enscribejs/enscribe/core's vocabulary
// registry imported immediately below.
import { getRegisteredDsls, resolveDslMode } from './dsl/registry.js';
import { ensureRegistry, makeReadThroughRegistry } from '../core/registry.js';
// Phase 8 Slice 2: <config theme=…> flows here via the config map on file.data.
import { ENSCRIBE_CONFIG, ENSCRIBE_STRICT_MODE, ENSCRIBE_LOADED_SOURCES, ENSCRIBE_MINIPAGE_SUBRUN, ENSCRIBE_MINIPAGE_DEPTH, ENSCRIBE_REGISTRY, ENSCRIBE_CITATIONS, ENSCRIBE_PAGE_LINK_RESOLVER } from '../core/file-data-keys.js';
// #318: the render-time `<a {slug}>` page-link resolver — a hast tree-pass run in the compiler (just
// before serialization) when the website builder has injected a resolver on file.data. Imported for USE
// here; also re-exported at the barrel below (one home, cross-page-links.js).
import { resolvePageSlugLinksInTree } from '../master-document/cross-page-links.js';
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
import { extractPlainText } from './lib/ast-helpers.js';
import { TABLE_TAGS } from './lib/table-constants.js';
// Phase 8 Slice 1: build-time table-of-contents. applyToc is a strict no-op
// unless the `toc` option enables it, preserving byte-identical output otherwise.
import { applyToc, readTocConfig, applyConfigToc } from './lib/toc.js';
// #454: the ONE book-navigation config reader, shared with the separate-pages / live paths, so the
// compiler's single-scroll book interface honors chapter-nav / chapter-nav-depth / page-navigation /
// on-this-page identically (it silently ignored the first three before). Lives in interpreter/lib
// (not master-document) so importing it here is no cycle.
import { resolveBookNavConfig } from './lib/book-nav-config.js';
import { readConfigBool } from './lib/config-helpers.js';
// #33 / #333: the margin column. applySidenotes relocates margin-note content into
// the margin — every numbered note when note-position=margin, or just the per-note
// `<note position=margin>` otherwise; markMarginLayout establishes the shared margin
// layout when anything was relocated. The mdast tree (and thus JATS) is untouched. MARGIN_CSS is
// injected only when the margin is actually used, so default output — and the
// existing fixtures — stay byte-identical.
import { applySidenotes, markMarginLayout } from './lib/sidenotes.js';
import { MARGIN_CSS } from './assets/margin-css.js';
// #218: the config-driven contents-listing CSS — injected as a scoped <style> only when a
// `<config toc>` listing is rendered (additive; non-ToC docs stay byte-identical), the same
// opt-in injection model as MARGIN_CSS. Reuses default.css's base `.enscribe-layout--toc`.
import { TOC_CONFIG_CSS } from './assets/toc-config-css.js';
// #36 strict mode: the strictness register switch — parse off; re-parse with the
// register(s) disabled for sigil/canonical. `sigil` turns the markdown register
// off (canonical + sigils keep interpreting); `canonical` turns markdown AND
// sigils off (via the sigil-less enscribeSyntax variant), leaving only canonical
// named tags. flagStrictText + STRICT_FLAG_CSS add the lint, injected only when
// non-`off` (the sidenote-injection model).
import { resolveStrictMode, applyStrictModeReparse, disableMarkdownIdioms, flagStrictText, detectStrictMode, buildStrictOffProcessor } from './lib/strict-mode.js';
import { STRICT_FLAG_CSS } from './assets/strict-flag-css.js';
import { createLazyAsset } from './lib/lazy-asset.js';
// Phase 8 Slice 3: chapter-navigation client script (a string constant — no fs
// read — so the browser bundle stays fs-free). Now an OPT-IN paging escape hatch
// (chapterNav:true), NOT the book default — see the one-scroll reading interface
// (Slice C) below; injected only when explicitly opted in for a book + ToC.
import { CHAPTER_NAV_JS } from './assets/chapter-nav-asset.js';
// Slice C: the "on this page" rail client script (string constant, fs-free).
// Injected only for a book + ToC; drives the right rail of the one-scroll book
// reading interface. A pure progressive enhancement over static rail markup.
import { ON_THIS_PAGE_JS } from './assets/on-this-page-asset.js';
// #20: scroll-spy client script — the first first-party hand-authored render JS
// (distinct from the bundled DSL-rendering libraries). Injected whenever a ToC
// sidebar is rendered; a pure progressive enhancement over the existing ToC.
import { SCROLL_SPY_JS } from './assets/scroll-spy-asset.js';
// #454: the conditional book-nav CSS the single-scroll interface needs when its config asks for a
// non-default rail — the SAME shared assets the separate-pages pageShell injects (one source,
// book-nav-asset.js): the no-left grid when chapter-nav is off, the sub-section styling at
// chapter-nav-depth >= 2. default.css carries only the default (rail on, depth 1) layout.
import { BOOK_NAV_NOLEFT_CSS, BOOK_NAV_DEPTH_CSS, BOOK_FLOAT_CSS, COMBINED_NAV_CSS, COMBINED_NAV_JS, resolveBookPlacement } from './assets/book-nav-asset.js';

export { detectStrictMode, buildStrictOffProcessor } from './lib/strict-mode.js';   // #460: registers-off assembly
export { enscribeDocTypeResolve } from './plugins/doc-type.js';
export { enscribeNormalizeToCanonical, enscribeNormalizeMarkdown, enscribeConfigDiscovery, enscribeArticleStructuring, enscribeBookStructuring, enscribeWebsiteStructuring, enscribeSectionNesting, enscribeListStructuring, enscribeNotes, enscribeNotePlacement, enscribeLibraryLoad, buildCitationIndex, enscribeNumbering, fillNumbering, numberSections, enscribeRefResolution, enscribeCiteResolution, enscribeBibliography, enscribeTagHandler, createEnscribeTagHandler, parseCsv, parseTsv, formatScopedNumber };

// ─── KaTeX CSS ────────────────────────────────────────────────────────────────

// The pinned-version CDN URL moved to assets/font-loader.js (co-located with
// DOCUMENT_FONTS_CDN_URL — the two linked document-asset CDN URLs) so the static-website
// universal head can link both without importing this barrel (a cycle). Re-exported here,
// so the public API (and test/cdn-versions.test.js, which imports it from this module) is
// unchanged. The inline KaTeX CSS reader (getKatexCss) stays here — it is the fs path.
export { KATEX_CDN_URL } from './assets/font-loader.js';

// Lazy-loaded CSS string — only reads the file when math is actually present.
// Font URLs in the raw CSS are relative (e.g. url(fonts/KaTeX_Main-Regular.woff2))
// and are replaced with base64 data URIs so the CSS works when inlined in HTML.
const getKatexCss = createLazyAsset(() => {
  const katexDir = dirname(fileURLToPath(import.meta.resolve('katex')));
  return patchKatexFontUrls(readFileSync(join(katexDir, 'katex.min.css'), 'utf8'));
});

/**
 * The document-display head as INLINE <style> blocks — the offline counterpart of HEAD_ASSET_LINKS
 * (font-loader.js), which LINKS the same two assets from CDNs. Emits the base64-inlined document fonts
 * (getDocumentFontsCss) followed by the base64-inlined KaTeX CSS (getKatexCss), so a self-contained
 * shell needs NO network for its display assets. This is the SINGLE SOURCE the `inlined` asset-delivery
 * mode (delivery-modes.md §"Asset delivery" → inlined) uses for the shell head — mirroring how
 * HEAD_ASSET_LINKS is the single source for the siblings/cdn (link) form. fs-backed (both readers read
 * files), so it runs Node-side at build time; a browser bundle never calls it (inlined is a CLI build).
 *
 * @returns {string} two <style> blocks — document fonts, then KaTeX CSS.
 */
export function getInlineDisplayHead() {
  return `<style>\n${getDocumentFontsCss()}\n</style>\n<style>\n${getKatexCss()}\n</style>`;
}

// ─── Theme CSS (Phase 8 Slice 2) ──────────────────────────────────────────────
//
// Themes are `:root` custom-property overrides shipped in src/assets/themes/.
// The `theme` option (or a <config theme=…> setting) injects one inline, after the document's base
// default.css, so its tokens win the cascade. KNOWN_THEMES + getThemeCss are imported from the
// ./assets/theme-css.js module pair above: the Node variant reads the sub-1KB token file lazily (only
// when a theme is requested), the browser variant returns the same bytes build-inlined via tsup
// `define` — so a live `<config theme=…>` render is browser-safe (the C4 crash fix, #430).

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
const getTippyCss = createLazyAsset(() => {
  const tippyDir = dirname(fileURLToPath(import.meta.resolve('tippy.js')));
  return readFileSync(join(tippyDir, 'tippy.css'), 'utf8');
});

const getTippyLightBorderCss = createLazyAsset(() => {
  const tippyDir = dirname(fileURLToPath(import.meta.resolve('tippy.js')));
  return readFileSync(join(tippyDir, '..', 'themes', 'light-border.css'), 'utf8');
});

const getPopperJs = createLazyAsset(() => {
  const popperDir = dirname(fileURLToPath(import.meta.resolve('@popperjs/core')));
  return readFileSync(join(popperDir, '..', 'umd', 'popper.min.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
});

const getTippyJs = createLazyAsset(() => {
  const tippyDir = dirname(fileURLToPath(import.meta.resolve('tippy.js')));
  return readFileSync(join(tippyDir, 'tippy.umd.min.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
});

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
      }
      // A DSL contract marker rides on a container element; collect it
      // independently of the tag-name checks above (a node is never both).
      if (props.dataEnscribeDsl) found.dslNames.add(props.dataEnscribeDsl);
    }
    for (const child of node.children ?? []) walk(child);
  })(root);
  return found;
}

// makeAssetElement — one builder for the four asset hast elements the compiler injects:
// an inline <style> / <script> (raw verbatim content — no HTML escaping, which requires
// allowDangerousHtml in toHtml, already on) and an external stylesheet <link> / <script src>
// (empty children). The four named wrappers below keep the call sites readable.
function makeAssetElement(kind, content, meta = {}) {
  switch (kind) {
    case 'style':      return { type: 'element', tagName: 'style',  properties: {}, children: [{ type: 'raw', value: content }] };
    case 'script':     return { type: 'element', tagName: 'script', properties: {}, children: [{ type: 'raw', value: content }] };
    case 'link':       return { type: 'element', tagName: 'link',   properties: { rel: ['stylesheet'], href: meta.href }, children: [] };
    case 'script-src': return { type: 'element', tagName: 'script', properties: { src: meta.src, ...(meta.onerror ? { onError: meta.onerror } : {}) }, children: [] };
    default: throw new Error(`makeAssetElement: unknown kind '${kind}'`);
  }
}

function makeStyleElement(css) { return makeAssetElement('style', css); }
function makeScriptElement(js) { return makeAssetElement('script', js); }
function makeLinkElement(href) { return makeAssetElement('link', null, { href }); }
function makeScriptSrcElement(src, onerror) { return makeAssetElement('script-src', null, { src, onerror }); }

// #413 L6: the onerror handler a DSL's CDN <script src> carries in live-link mode. If the pinned CDN
// fails to load (offline, blocked, CDN down, wrong pin), the library global never appears and the
// diagrams cannot render. Always-renders → BOTH channels, from static bytes: (1) console.error names
// the missing CDN library; (2) a visible family-style hint (⚠ role=alert enscribe-dsl-error, matched
// by the name-agnostic family selector at default.css:469 — no new CSS) is inserted before each
// [data-enscribe-dsl=<name>] source container, so an offline reader sees "this failed" above the
// still-visible source. Unquoted attribute selector (the name is a safe identifier — mermaid/abc), so
// the whole thing is single-quote-only and needs no nested double quotes.
function dslCdnOnerror(name, cdnUrl) {
  return `(function(n,u){console.error('enscribe: failed to load '+n+' from CDN '+u+'; diagrams will not render');`
    + `var els=document.querySelectorAll('[data-enscribe-dsl='+n+']');`
    + `for(var i=0;i<els.length;i++){var el=els[i];if(el.getAttribute('data-enscribe-dsl-error'))continue;`
    + `el.setAttribute('data-enscribe-dsl-error','1');var h=document.createElement('div');`
    + `h.className='enscribe-dsl-error';h.setAttribute('role','alert');`
    + `h.textContent='⚠ '+n+' failed to load from its CDN — showing the source below';`
    + `el.parentNode.insertBefore(h,el);}})('${name}','${cdnUrl}')`;
}

// resolveOption — the compiler's three-tier setting fallthrough (render option > document
// <config> > default), previously hand-written per setting. Priority order preserved exactly.
// (show-source is NOT one of these — it is a config-only boolean coercion, not a fallthrough.)
function resolveOption(options, optKey, configMap, cfgKey, dflt) {
  return options[optKey] ?? (configMap && configMap.get(cfgKey)) ?? dflt;
}

// #281/#450: clear a <config quiet> document's OWN vfile message stream. Called at
// BOTH phase tails because messages are produced in two phases: the transform tail
// (the enscribeQuietSuppression plugin) covers runSync-only consumers — export-jats
// and lift never run the compiler — and the compiler tail (compileToHtml, just
// before serialization) covers the compile-stage producers (the tag handler's
// unknown-tag / handler-error warnings #412, the sidenote block-content warning)
// that the transform-tail clear runs too early to see. Emission-only: the tree and
// the rendered HTML are byte-identical, and the inline error markers the
// always-renders guarantee depends on (`enscribeTagError` / `__*-error` nodes) are
// TREE content, not vfile messages, so they are never touched. Clearing at one
// choke point per phase also covers any FUTURE compile-stage producer by
// construction (it clears the whole stream regardless of who added what).
function suppressMessagesIfQuiet(file) {
  if (!file || !Array.isArray(file.messages) || file.messages.length === 0) return;
  if (readConfigBool(file.data?.[ENSCRIBE_CONFIG], 'quiet', false)) {
    file.messages.length = 0;
  }
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
    // #413 L6: the CDN <script src> carries an onerror that names the miss (console) + reveals a visible
    // hint on each DSL container (in-document). The init script is guarded against the missing library
    // (dsl-registrations.js), so a failed CDN degrades to "source + a flag", never an uncaught throw.
    return [makeScriptSrcElement(cdnUrl, dslCdnOnerror(dsl.name, cdnUrl)), makeScriptElement(initScript)];
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
 * @param {'default'|'modern'|'compact'|'tufte'} [options.theme='default'] Inject a theme's token overrides (and, for a full-selector theme like `tufte`, its structural rules) inline, after the document's base default.css. 'default' (or unset) injects nothing. Also settable per-document via `<config theme=…>`; the option wins.
 * @param {'bottom'|'margin'} [options.notePosition='bottom'] Note render position (#33). 'bottom' (default) keeps numbered notes at the foot of the document; 'margin' projects each note's content into a wide margin column beside its marker (Tufte-style sidenotes) and injects the scoped sidenote CSS, falling back to the bottom rendering below a breakpoint. Display-only — markers, numbering, the note tree, and JATS are unchanged, and bottom-mode output (default) is byte-identical. Also settable per-document via `<config note-position=…>`; the option wins.
 * @param {boolean} [options.chapterNav] Opt-in single-chapter PAGING view (Slice C made the one-scroll reading interface the book default). When `true`, a book rendered with a ToC also gets the progressive-enhancement paging script that shows one chapter at a time (ToC as selector, prev/next, ←/→ keys, hash deep links, "show whole book"). Defaults OFF — the default book + ToC renders as one scrolling document with chapter-navigation chrome (left chapter rail, per-chapter prev/next, right "on this page" rail). Ignored for articles and for books without a ToC.
 * @param {string|null} [options.assetsDir=null] Base directory for resolving `src=` paths in `<library src=…>` and `<table src=…>` (server-side only).
 * @param {boolean} [options.smartTypography=true] Smart typography (#54): curly quotes, en/em dashes, and ellipses in prose display output. A display-projection on the HTML side only — never the canonical AST / `.emd` / JATS. `false` disables it.
 * @param {'off'|'sigil'|'canonical'} [options.strictMode='off'] Strictness register switch (#36). Each value names the loosest register still interpreted. 'off' (default) interprets all three registers — today's behavior, byte-identical. 'sigil' turns the markdown register off: `*`, `#`, `-`, `>`, `` ` ``, `[](…)`, `$…$` pass through as literal characters (no escaping) while canonical tags and sigils stay live everywhere, including inside tag pipe bodies; would-be-markdown text is flagged with a visible lint. 'canonical' turns markdown AND sigils off (`<# #>`, `<$ $>`, `<->`, `<*>` also literal), leaving only canonical named tags — the canonical `<li>` and the `^{}`/`_{}` shortcuts stay live; would-be-markdown and would-be-sigil text is flagged. The flag CSS is injected only for a non-`off` rung. Native inferences (blank-line→paragraph, section nesting) stay on in all states. eHTML / JATS are unaffected. Also settable per-document via `<config strict-mode=…>`; the option wins.
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
  // Opt-in single-chapter PAGING (Slice C). Default OFF — a book + ToC renders as
  // one scrolling document with chapter-navigation chrome (the reading interface);
  // `chapterNav: true` swaps in the paging script. The `=== true` gate below depends
  // on this staying a raw read (undefined unless the caller opts in).
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
  // Slice 4 (#279 replacement): the inner re-parse must NOT treat indented lines as an
  // indented code block. An indented container body (a tab-indented <nav>, an indented
  // <aside>) must re-parse its inner constructs, not get swallowed whole as a code block.
  // We turn OFF only `codeIndented` (the accepted narrowing: fenced ``` and <code> still
  // work inside container bodies; literal 4-space/tab-indented code blocks do not). Always
  // on — not gated on strict mode. The sigil/canonical processors below already disable
  // codeIndented via disableMarkdownIdioms (DISABLED_IDIOMS includes it), so only the
  // default innerProcessor needs this.
  const disableCodeIndented = function () {
    const data = this.data();
    data.micromarkExtensions ??= [];
    data.micromarkExtensions.push({ disable: { null: ['codeIndented'] } });
  };
  const innerProcessor = unified().use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm).use(disableCodeIndented);

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
  const sigilProcessor = buildStrictOffProcessor('sigil');       // #460: single-sourced construction
  const canonicalProcessor = buildStrictOffProcessor('canonical');

  // #36 (step 0): resolve the strict mode (option ?? <config strict-mode> ?? 'off')
  // and, when sigil/canonical, re-parse the source with the matching register(s)
  // off and swap the tree — before recursive-content, so its sub-parses run in the
  // same mode. A strict no-op for 'off' → the default parse is used unchanged
  // (byte-identical).
  this.use(resolveStrictMode, { sigilProcessor, canonicalProcessor, option: options.strictMode });

  // 0.5 (always-render). Recover an unclosed long-form tag: the finder consumes everything after an
  // unclosed `<tag>` to EOF and from-markdown flags it as ONE error whose handler drops the content —
  // so the rest of the document vanishes. Split each such error into the flagged opener marker + the
  // swallowed content re-parsed as document flow (siblings), so malformed input flags inline and the
  // rest still renders. The recovery re-parse mirrors the TOP-LEVEL document parse (remarkParse +
  // remarkEnscribe + remarkMath + remarkGfm), so recovered blocks parse identically to top-level flow;
  // it runs BEFORE recursive-content so the recovered tags get their own content parsed normally.
  const recoveryProcessor = unified().use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);
  this.use(remarkRecoverUnclosedTags, { processor: recoveryProcessor, processorSigil: sigilProcessor, processorCanonical: canonicalProcessor });

  // 1. Parse pipe-content strings into mdast children. In sigil/canonical mode the
  //    inner processor is the matching registers-off one (the register(s) stay off
  //    inside pipe bodies too); recursive-content selects it via the file.data mode.
  this.use(remarkRecursiveContent, { processor: innerProcessor, processorSigil: sigilProcessor, processorCanonical: canonicalProcessor, flowTagnames: FLOW_TAGNAMES });

  // 1.2 (#408): the universal child-relative src rebase. Runs after recursive-content
  //     (a child's nested tags exist as nodes) and before the gate (nothing downstream
  //     sees a child-relative path). A no-op on every non-assembled document.
  this.use(enscribeSrcRebase);

  // 1.5. The normalize-to-canonical gate. Runs after step 1 so both outer
  //      and inner processor runs have completed. Runs before step 2 so no
  //      structural plugin sees a non-canonical form. Coerces every
  //      authored form to canonical eHTML shape: sigil tagnames rewritten
  //      via the tagname↔sigil cipher (lift direction); bare markdown
  //      headings normalized to sections (depths 1-3) or passed through as
  //      <hN> (depths 4-6); inline mdast forms lifted to canonical eHTML
  //      inline elements. See plugins/normalize-to-canonical.js and
  //      DESIGN.md §"The single gate".
  //
  // Before the gate: resolve the document class once (<meta type> → file.data.docType,
  // validated against meta.md's declared set; unknown explicit type warns + falls back
  // to article). The gate's book-context detection and the structuring plugins read the
  // resolved value rather than re-reading <meta type> ad-hoc (Slice A).
  this.use(enscribeDocTypeResolve);
  this.use(enscribeNormalizeToCanonical);

  // 2–4. Structural transformation.
  this.use(enscribeConfigDiscovery);
  // #246 S1: website-structuring owns <meta type=website>, building the nav model on
  // file.data (no <article>/<book> wrapper). Like book/article structuring it gates on
  // the resolved class and is a byte-identical no-op for every other document, so order
  // among the three mutually-exclusive structurers does not matter; it sits first.
  this.use(enscribeWebsiteStructuring);
  // Phase 4 slice 4a (2026-05-29): book-structuring runs BEFORE article-
  // structuring. For documents with <meta type=book> or <meta type=book-part>,
  // book-structuring wraps the tree in <book>/<book-part> and the
  // subsequent article-structuring sees the wrapped tree (no root <meta>
  // tag visible) and treats it as no-op-shaped. For articles,
  // book-structuring is a no-op and article-structuring does its work.
  this.use(enscribeBookStructuring);
  this.use(enscribeArticleStructuring);
  this.use(enscribeSectionNesting);
  // #397: stamp computedHeadingLevel on outline title nodes (a structural fact —
  // 1 + enclosing outline containers). Runs after the structurers so nesting is
  // physical; the render stage (schemaDispatch) materializes the native heading
  // wrap from the stamp. Gated on <config heading-tags> (default on) inside the
  // plugin — off means nothing is stamped, so output is byte-identical to the
  // bare-element form by construction.
  this.use(enscribeHeadingLevels);
  // #137: lower `<list>` to a markdown list node. Runs after section nesting so
  // a `<list>` (sectionDepth 0, carried as section body content) is lowered
  // wherever it landed; before the semantic plugins, which see a plain list.
  this.use(enscribeListStructuring);

  // 4.9 (#115): minipage no-external guard. A NO-OP on every normal document;
  //     active only on a minipage SEALED sub-run (the deferred phase sets the
  //     ENSCRIBE_MINIPAGE_SUBRUN flag on the child VFile). Runs BEFORE the
  //     citation / asset index passes (5 / 5.7 / 5.8) so a forbidden @src/<data>
  //     in a sealed body is neutralized to a visible __asset-error before any of
  //     them would resolve it — reject, not resolve.
  this.use(enscribeMinipageGuard);

  // 5. Citation + asset indexes (index-build, not a tree transformation): parse <library>
  //    content from <data> nodes (deep-collected wherever they land — at root
  //    in an article, nested in <book-body> in a book), build
  //    file.data.enscribeCitations. Requires enscribeConfigDiscovery
  //    (citation-style) to have run first.
  //    Wave-1 walk merge: ONE collectDataNodes harvest feeds BOTH the citation
  //    index and the #190 asset index (formerly step 5.7's identical re-walk —
  //    nothing between them creates, moves, or removes <data> nodes; the two
  //    intervening table stamps are <table>-only and message-free). Constraints
  //    the fused shape must keep: (1) citation BEFORE asset — both unshift
  //    visible error nodes at the same body target, so consumer order is the
  //    rendered error-block order (asset errors above citation errors today) and
  //    the file.messages order; (2) the harvest hands LIVE node references — the
  //    asset index strips harvested declarations from those very nodes so
  //    numbering never sees them (#190); (3) the harvest runs after the minipage
  //    guard, which blanks boxed <data>/<library> in sealed sub-runs (#411).
  this.use(function enscribeDataIndexes() {
    return (tree, file) => {
      const dataNodes = collectDataNodes(tree.children ?? []);
      buildCitationIndex(tree, file, { assetsDir, dataNodes });
      buildAssetIndex(tree, file, { dataNodes });
    };
  });

  // 5.5 (#21 / #105 / #108): parse table-cell content into canonical inline mdast —
  //     ONE `table` walk, two mutually-exclusive branches (wave-1 walk merge):
  //     opted-in data-format cells stamp `_parsedCells` (#21/#105), and the
  //     no-format raw-HTML grid escape hatch stamps `_htmlTable` (#108, the form
  //     the JATS importer serializes complex tables to — closing the
  //     import-jats --emd → render round-trip). Runs BEFORE notes, numbering, and
  //     ref/cite resolution, so any <note> / <ref> / <cite> authored inside a
  //     stamped cell is tree-resident when those passes run — the shared walkers
  //     (discover / walkReplace) descend the stamped cells, so cell footnotes
  //     register/number/hoist and cell refs/cites resolve exactly like body ones.
  //     (#21 originally placed this AFTER notes, leaving footnotes-in-cells out of
  //     scope; #105 moves it earlier to bring them in. A no-op for tables without
  //     an opt-in or a grid → byte-identical.)
  this.use(enscribeTableCellParse, { assetsDir });

  // 5.8 (#190): Asset resolution: a body <fig src="@id"> pulls in an embedded asset —
  //     rewrite its src to a data: URI and adopt the asset id onto the placed figure
  //     (so it is the numbered cross-reference anchor). An unresolved @id becomes a
  //     visible __asset-error. Runs BEFORE numbering so the placed figure registers
  //     under the adopted id and the error node is not counted as a figure.
  this.use(enscribeAssetResolution);

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

  // 8.5 (#115): minipage deferred phase — the sealed sub-interpret. The parent
  //    registry is complete now (step 8 ran numberRegistry + fillNumbering +
  //    numberSections), so each minipage's held body can be processed. A minipage
  //    body is opaque (raw source on node.content), so steps 1-8 of THIS run never
  //    touched it — its floats took no document numbers, its labels never entered
  //    this registry, its notes never bubbled. Here it is finally processed, each
  //    body in its OWN pipeline run with its OWN VFile (fresh file.data ⇒ fresh
  //    registry via ensureRegistry — the seal). The sub-run resolves the body's
  //    own numbering / notes / refs / cites internally and we splice the resolved
  //    eHTML mdast onto node.minipageResolved for the compile-time handler.
  //
  //    Runs BEFORE step 9 so the parent's ref-resolution then walks past each
  //    minipage as an opaque black box (its body, still the raw string on
  //    node.content with isOpaqueContent set, is skipped; the resolved body lives
  //    on the side-channel field the walks don't traverse). A nested minipage in a
  //    body recurses here within that body's own sub-run (this same pass is in the
  //    sub-run's pipeline), bounded by ENSCRIBE_MINIPAGE_DEPTH.
  this.use(function enscribeMinipageDeferred() {
    return (tree, file) => {
      const depth = file?.data?.[ENSCRIBE_MINIPAGE_DEPTH] ?? 0;
      // The parent registry is COMPLETE here (step 8 numbered it). Seed it into
      // each sealed sub-run read-through (one-way): a body <ref> to a DOCUMENT
      // label resolves (outbound), but the child's own labels and counters stay
      // private — they never merge up, so inbound stays forbidden and numbering
      // stays private. See makeReadThroughRegistry.
      const parentRegistry = ensureRegistry(file);
      let proc = null; // built lazily; documents with no minipage build nothing
      walkMinipageNodes(tree, (node) => {
        if (depth + 1 > MAX_MINIPAGE_DEPTH) {
          node.minipageResolved = [minipageDepthErrorNode()];
          if (typeof file?.message === 'function') {
            // #427 sweep: name the rule (minipage:nesting-too-deep) so the summary buckets it by
            // rule, not the fallback `message` class — the §8-spirit inventory found this producer
            // unnamed alongside ref-resolution. Latent (it fires only past MAX_MINIPAGE_DEPTH, which
            // the docs build never reaches), but named now so it never lands in the fallback bucket.
            file.message(`minipage nesting exceeds the maximum depth (${MAX_MINIPAGE_DEPTH})`, node.position, 'minipage:nesting-too-deep');
          }
          return;
        }
        const bodySource = typeof node.content === 'string' ? node.content : '';
        if (!proc) proc = buildEnscribePipeline(options);
        // Fresh VFile per body, but seeded with a read-through view of the parent
        // registry (set BEFORE the sub-run so ensureRegistry reuses it). The
        // subrun flag turns on the no-external guard; the depth bounds nesting.
        const childFile = {
          data: {
            [ENSCRIBE_REGISTRY]: makeReadThroughRegistry(parentRegistry),
            // #411 (follow LaTeX): CITATIONS read through the seal. The box
            // resolves <cite> against the DOCUMENT's library — the parent's
            // citation index, shared BY REFERENCE, deliberately:
            //   - `cite`/`style` are read-only lookups;
            //   - `order` is MUTATED by the child's cite-resolution, so a boxed
            //     cite joins the document's first-cited order. This is the
            //     "boxed cites feed the bibliography" contract (#411): the
            //     document-wide References renders the whole registry today,
            //     but its empty-case gate (bibliography.js) and any future
            //     cited-only rendering read `citations.order` — replacing this
            //     with a copy would silently orphan a document whose only
            //     cites are boxed. Do NOT copy. (Known nuance: the deferred
            //     phase runs before parent cite-resolution, so boxed cites
            //     claim earlier order slots than textually-earlier document
            //     cites — invisible in author-date styles; a numeric-style
            //     ordering refinement would need position-aware ordering.)
            // The seal elsewhere is unchanged: notes stay box-local (LaTeX
            // seals footnotes), refs stay one-way read-through, and a boxed
            // <library> is prohibited (minipage-guard, the #410 flag family).
            ...(file?.data?.[ENSCRIBE_CITATIONS]
              ? { [ENSCRIBE_CITATIONS]: file.data[ENSCRIBE_CITATIONS] }
              : {}),
            [ENSCRIBE_MINIPAGE_SUBRUN]: true,
            [ENSCRIBE_MINIPAGE_DEPTH]: depth + 1,
          },
        };
        // The sub-run's diagnostics are DISCARDED by design — a sealed demo's messages belong to
        // the demo, not the host build (childFile is a plain object; unified coerces it to a
        // throwaway VFile whose .messages never reach the host stream). #427's optional debug-log
        // of those dropped messages (so an unintentionally-broken demo isn't perfectly invisible)
        // was DEFERRED: capturing them means turning this load-bearing minimal childFile into a
        // real VFile and adding a cross-environment (node/browser) debug channel to the core
        // interpreter — not the trivially-clean few-liner #427 gated it on. The box's error markers
        // render as visible HTML regardless, so a broken demo still shows on the page.
        const resolved = proc.runSync(proc.parse(bodySource), childFile);
        node.minipageResolved = projectMinipageBody(resolved);
        // #267: scope-qualify every id DEFINED in this box (auto note-N / noteref-N, author
        // colon-ids) with the box's document-unique slug, and rewrite its in-box references in
        // lockstep — on the RESOLVED MDAST, before the handler converts it to hast. Acting here
        // (not on the serialized hast) qualifies a table/csv colon-id on node.id before it is
        // baked into raw HTML, and composes with nesting: this same pass ran in the inner box's
        // sub-run, so descending node.minipageResolved adds the outer prefix to inner ids too.
        qualifyScopeIds(node.minipageResolved, minipageScopeSlug(node));
      });
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

  // 13 (#281). Page-scoped warning suppression. A document carrying <config quiet />
  //     suppresses ITS OWN authoring warnings — the vfile `file.messages` stream
  //     (raw-HTML passthrough, mis-placed apparatus, unknown-meta-kwarg, minipage
  //     depth, …) — from build/console output. This gates EMISSION only (see
  //     suppressMessagesIfQuiet for the byte-identity / inline-marker rationale).
  //     Per-document: each page's own <config quiet> clears only its own
  //     file.messages (a quiet page in a multi-page build does not silence its
  //     siblings). Runs after config-discovery (so `quiet` is on file.data).
  //
  //     This is the TRANSFORM tail — it clears the messages produced by the
  //     transforms above. It is NOT the whole story: producers also run in the
  //     COMPILER (the tag handler's unknown-tag/handler-error warnings #412, the
  //     sidenote block-content warning), which runs AFTER every transform, so the
  //     compiler clears again at its own tail (compileToHtml → suppressMessagesIfQuiet,
  //     #450). Keeping the transform-tail clear matters for runSync-only consumers
  //     (export-jats / lift) that never run the compiler.
  //
  //     No severity levels (#281): the document's whole message stream is cleared.
  //     vfile's `fatal` field is the future hook if a hard-error tier is ever wanted —
  //     narrow suppressMessagesIfQuiet to `!m.fatal` then. Today the pipeline emits no
  //     fatal messages (errors render as inline nodes, never `file.fail`), so clearing
  //     all == clearing warnings. NOTE: the `--quiet` CLI flag (a console.warn swap) is
  //     the orthogonal GLOBAL operator; this is the per-document one. They compose — one
  //     "quiet" notion, two scopes — and neither forks a new mechanism.
  this.use(function enscribeQuietSuppression() {
    return (tree, file) => suppressMessagesIfQuiet(file);
  });

  // ── Post-compile injection helpers (R3 / F10) ─────────────────────────────────
  // compileToHtml builds the hast, then runs these in a FIXED sequence. Every helper
  // injects via hast.children.unshift (PREPEND), so the call order in compileToHtml is
  // the REVERSE of the final node order — it is load-bearing and must not change (the
  // ToC nav + its CSS land first; CSS before JS; the book scripts go
  // chapter-nav → on-this-page → scroll-spy; the static-DSL replacement runs AFTER
  // formatHtml). Each closes over the resolved option config (options / fontsMode /
  // cssMode / hoverMode / tocOption / chapterNavOption) and takes the per-compile hast.

  // Table-of-contents. The #218 config-driven listing supersedes the legacy build-passed
  // `toc` OPTION (mutually exclusive — no double ToC). Returns { tocType, configTocShape }
  // for the book-script gates. The contents-listing CSS rides only when a listing was
  // rendered → a non-ToC document stays byte-identical.
  function injectToc(hast, configMap, file) {
    const tocConfig = readTocConfig(configMap);
    let tocType = null;
    let configTocShape = null;
    let bookNav = null;   // #459 part 2 — surfaced so injectBookScripts can gate the combined-nav script
    if (tocConfig) {
      configTocShape = applyConfigToc(hast, tocConfig);
    } else {
      // #454: the single-scroll BOOK reading interface now reads its WHOLE nav config from the ONE
      // shared reader (resolveBookNavConfig) — the same one the separate-pages / live paths use — so
      // chapter-nav / chapter-nav-depth / page-navigation / on-this-page behave identically on all
      // three book shapes (the compiler silently ignored the first three before, honoring only
      // on-this-page). Resolved whenever the interface is requested (toc on); applyToc uses it only for
      // a <book> (an article ignores it), and the separate-pages per-chapter renders (tocOption off)
      // never pay for it or fire its diagnostics. resolveBookNavConfig is null-safe (no config ⇒ all
      // defaults, so an unconfigured book is byte-identical). paginated:false — --single-page is
      // unpaginated (it IS split-by=none), so the split-by-deferred pagination warning does not apply.
      const wantsInterface = tocOption === true || tocOption === 'auto';
      bookNav = wantsInterface ? resolveBookNavConfig(file, { paginated: false }) : null;
      tocType = applyToc(hast, tocOption, bookNav);
      // #454: inject the conditional book-nav CSS the non-default rail needs (the same shared blocks
      // pageShell injects for separate-pages) — only when the interface actually rendered as a book.
      if (tocType === 'book' && bookNav) {
        if (!bookNav.chapterNav) hast.children.unshift(makeStyleElement(BOOK_NAV_NOLEFT_CSS));
        if (bookNav.chapterNavDepth >= 2 || (bookNav.combined && bookNav.onThisPage)) hast.children.unshift(makeStyleElement(BOOK_NAV_DEPTH_CSS));
        // #459 part 2: the combined expand/collapse layer (unshifted BEFORE the float block so it lands
        // AFTER BOOK_FLOAT_CSS in DOM source order, per its comment).
        if (bookNav.combined) hast.children.unshift(makeStyleElement(COMBINED_NAV_CSS));
        // #459 part 1: a non-default nav side floats the navs — applyBookToc emitted the docks + the
        // --book-float wrapper; deliver its stylesheet (the same BOOK_FLOAT_CSS all four surfaces share).
        if (resolveBookPlacement(bookNav).floating) hast.children.unshift(makeStyleElement(BOOK_FLOAT_CSS));
      }
    }
    if (configTocShape) {
      hast.children.unshift(makeStyleElement(TOC_CONFIG_CSS));
    }
    return { tocType, configTocShape, bookNav };
  }

  // #33 / #333 the margin column. Two triggers, one path: the document
  // note-position=margin (the `notePosition` option wins over <config note-position>)
  // relocates every numbered note; a per-note `<note position=margin>` relocates just
  // that note. applySidenotes projects both (all when the doc default is margin, else
  // only the margin notes) and reports whether anything moved into the column;
  // markMarginLayout + MARGIN_CSS fire only then → a default document adds nothing.
  // Display-only (the mdast tree / JATS export is unchanged).
  function injectMarginLayout(hast, assets, configMap, file) {
    // Wave-1 gate (re-arming #48's per-asset discipline; the `assets` param had been dead
    // since 84d8bc6): note-placement pairs every note-list item with a sup[data-note-id]
    // marker BY CONSTRUCTION (items and markers are built from the same pending array),
    // so no markers detected ⇒ nothing to collect, relocate, or warn about — skip
    // applySidenotes' full hast walk. detectAssets' notes predicate (truthy dataNoteId)
    // is the truthy twin of injectSpans' `!= null` — divergent only for ids '' / 0, which
    // the registry never mints. Gate + walk + markMarginLayout stay one unit: the
    // item⇒marker invariant is the ONLY assumption. NOTE this call must also stay AFTER
    // injectToc — markMarginLayout co-marks the layout wrapper applyToc may have created.
    if (!assets.notes) return;
    const notePosition = resolveOption(options, 'notePosition', configMap, 'note-position', 'bottom');
    // warn → the vfile channel (#402): a note whose body cannot be phrasing-projected into
    // the inline margin copy is skipped with a message, never silently (see sidenotes.js).
    const relocated = applySidenotes(hast, {
      all: notePosition === 'margin',
      warn: (m) => file?.message?.(m, undefined, 'sidenote:block-content'),
    });
    if (relocated) {
      markMarginLayout(hast);
      hast.children.unshift(makeStyleElement(MARGIN_CSS));
    }
  }

  // #36 strict mode: flag would-be-markdown (and, in canonical, would-be-sigil) text and
  // inject the flag CSS — only for a non-`off` rung (a strict no-op in 'off' → byte-identical).
  function injectStrictFlag(hast, file) {
    const strictMode = file?.data?.[ENSCRIBE_STRICT_MODE];
    if (strictMode === 'sigil' || strictMode === 'canonical') {
      flagStrictText(hast, strictMode);
      hast.children.unshift(makeStyleElement(STRICT_FLAG_CSS));
    }
  }

  // Slice C book reading-interface scripts, in their load-bearing unshift order:
  // chapter-nav (opt-in single-chapter paging), on-this-page (book right rail), then
  // scroll-spy (any ToC SIDEBAR — legacy book/article tocType OR a #218 config sidebar;
  // a body listing needs none). Pure progressive enhancements; articles inject none.
  function injectBookScripts(hast, tocType, configTocShape, bookNav) {
    if (tocType === 'book' && chapterNavOption === true) {
      hast.children.unshift(makeScriptElement(CHAPTER_NAV_JS));
    }
    if (tocType === 'book') {
      hast.children.unshift(makeScriptElement(ON_THIS_PAGE_JS));
    }
    if (tocType || configTocShape === 'sidebar') {
      hast.children.unshift(makeScriptElement(SCROLL_SPY_JS));
    }
    // #459 part 2: the combined nav's click-to-expand. Pure progressive enhancement — the current
    // chapter is expanded by static markup + CSS, so a no-JS reader is unaffected; this just reveals
    // the carets and binds the toggles.
    if (tocType === 'book' && bookNav?.combined) {
      hast.children.unshift(makeScriptElement(COMBINED_NAV_JS));
    }
  }

  // Document fonts (Inter, Source Code Pro): 'inline' base64 @font-face, 'link' the CDN,
  // 'skip' nothing. Emitted unconditionally (every document has body text) unless 'skip'.
  function injectFonts(hast) {
    if (fontsMode !== 'skip') {
      hast.children.unshift(
        fontsMode === 'link'
          ? makeLinkElement(DOCUMENT_FONTS_CDN_URL)
          : makeStyleElement(getDocumentFontsCss()),
      );
    }
  }

  // Theme CSS, after the fonts so its `:root` overrides win the cascade. The `theme`
  // option wins over <config theme=…>. Unknown theme → warn + fall back to default (no
  // silent drop, no injection). The nested guard is exact: outer (set, non-default),
  // inner (known → inject, else warn).
  function injectTheme(hast, configMap, file) {
    const themeName = resolveOption(options, 'theme', configMap, 'theme', 'default');
    if (themeName && themeName !== 'default') {
      if (KNOWN_THEMES.has(themeName)) {
        hast.children.unshift(makeStyleElement(getThemeCss(themeName)));
      } else {
        // Unknown theme → fall back to default, no injection. Route the warning through the
        // vfile message stream like every other diagnostic — it was a raw console.warn, the
        // one theme diagnostic OFF the message channel, so it carried no provenance and
        // <config quiet> could not govern it. On-stream it gains file provenance (the #402
        // reporting seam) and the #450 two-phase clear suppresses it under quiet (the compiler
        // tail runs suppressMessagesIfQuiet after this). Reachable via the `--theme` render
        // option (no config node → no source position); an unknown `<config theme=…>` value is
        // ALSO caught positioned by config-discovery's value validation (#401).
        file?.message?.(
          `unknown theme '${themeName}'; rendering with the default ` +
            `(available: ${[...KNOWN_THEMES].join(', ')}).`,
          undefined, 'theme:unknown',
        );
      }
    }
  }

  // KaTeX CSS — only when the document uses math and the mode is not 'skip'.
  function injectKaTeX(hast, assets) {
    if (cssMode !== 'skip' && assets.math) {
      const cssNode =
        cssMode === 'link'
          ? makeLinkElement(KATEX_CDN_URL)
          : makeStyleElement(getKatexCss());
      hast.children.unshift(cssNode);
    }
  }

  // Hover-preview assets (Tippy/Popper) — only when the document has note / ref / cite
  // markers and the mode is not 'skip'. The CONDITION reads the detectAssets result
  // (`assets`); the unshift uses a separate local array (formerly a shadowing `const
  // assets` — kept distinct here). CSS-first ordering within the bundle.
  function injectHoverPreview(hast, assets) {
    if (hoverMode !== 'skip' && (assets.notes || assets.refLinks || assets.citeLinks)) {
      const hoverAssets = buildHoverPreviewAssets(hoverMode);
      hast.children.unshift(...hoverAssets);
    }
  }

  // External-DSL (mermaid, abc) assets. Iterating the registry keeps this open to new
  // DSLs. Per present DSL: skip emits nothing; live-inline/live-link prepend the library
  // + init NOW (in registry order — the unshift reversal is preserved by keeping the one
  // loop); 'static' is COLLECTED and RETURNED for the caller's post-format replacement
  // (running it before formatHtml would let the formatter reflow the inlined SVG). A
  // 'static' DSL with no staticRenderer fails explicitly (the guard is not deferred).
  function injectDslAssets(hast, assets) {
    const staticDsls = [];
    for (const dsl of getRegisteredDsls()) {
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
        staticDsls.push(dsl);
        continue;
      }
      hast.children.unshift(...buildDslAssets(dsl, mode));
    }
    return staticDsls;
  }

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
    const showSource = readConfigBool(configMap, 'show-source', false);
    // #195: per-render pre-loaded external sources (browser fetch / CLI async preload)
    // reach the table handler through the handler opts — the compiler has the VFile,
    // the toHast handlers do not.
    const loadedSources = file?.data?.[ENSCRIBE_LOADED_SOURCES] ?? null;
    const tagHandler = createEnscribeTagHandler({ assetsDir, showSource, loadedSources, file }); // #412: file → unknown-tag/handler-error warnings join the message stream
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

    // #464: split block content out of paragraphs. A block-level construct authored inline
    // (an <aside>, an inline <fig>, display-math, a diagram, an injected asset-error box)
    // reaches here as a `<p>` wrapping the block — which every browser ejects (the #442 class
    // in normal flow). Emit the valid shape directly: `<p>before</p><block/><p>after</p>`.
    // Runs first (before typography / asset detection / injection) so every downstream pass
    // sees corrected paragraph structure. Byte-identical for a document with no inline blocks.
    splitBlockParagraphs(hast);

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

    // ── The post-compile injection phase (R3 / F10) ──────────────────────────────
    // FIXED ORDER. Each inject* prepends via hast.children.unshift, so this call
    // sequence is the REVERSE of the final node order — do NOT reorder. The implicit
    // constraints, made explicit: the ToC nav + its CSS land first (so the asset CSS/JS
    // sit outside the layout wrapper, at the top of the body); CSS is injected before JS;
    // the three book scripts go chapter-nav → on-this-page → scroll-spy; the static-DSL
    // replacement runs AFTER formatHtml. Values flowing between steps: injectToc yields
    // the tocType/configTocShape the book scripts gate on; injectDslAssets yields the
    // static DSLs replaced post-format. A no-op for every feature a document doesn't use →
    // byte-identical output for a default document. Each helper's rationale lives at its
    // definition above.
    const { tocType, configTocShape, bookNav: tocBookNav } = injectToc(hast, configMap, file);

    injectMarginLayout(hast, assets, configMap, file);

    injectStrictFlag(hast, file);

    injectBookScripts(hast, tocType, configTocShape, tocBookNav);

    injectFonts(hast);

    injectTheme(hast, configMap, file);

    injectKaTeX(hast, assets);

    injectHoverPreview(hast, assets);

    const staticDsls = injectDslAssets(hast, assets);

    // Format the hast tree for readable HTML output: block elements get
    // indentation and line breaks; inline content is preserved as-is.
    // rehype-format leaves <style>/<script>/<textarea> and <pre> subtrees untouched —
    // including a <code> NESTED IN <pre> (so a code block keeps its author whitespace).
    // A BARE <code> (inline code, not inside <pre>) is reflowed: its leading per-line
    // whitespace is stripped. That is by design (inline code is not whitespace-sensitive)
    // and is why multi-line code belongs in a code block (<pre><code>), not a bare <code>
    // — see ~/enscribe-reports/audit-code-indentation.md and lib/format-html.js.
    // formatHtml additionally keeps enscribe's inline custom elements (inline-math,
    // term) in the inline flow so no render-changing whitespace is inserted around
    // them (#117 — see lib/format-html.js).
    formatHtml(hast);

    // Static-mode DSL emit, AFTER formatting: replace each collected DSL's
    // contract elements with their build-time SVG (see replaceDslContractsWithSvg
    // for why this runs post-format).
    for (const dsl of staticDsls) {
      replaceDslContractsWithSvg(hast, dsl);
    }

    // #318: resolve authored `<a {slug}>` internal page links — but ONLY when a website builder injected a
    // resolver on file.data (a standalone document has none, so its `<a data-page-slug>` marker is left
    // untouched, byte-identical to before). LAST hast mutation before serialization, so every other pass
    // (smartTypography, asset injection, formatHtml) saw the unmodified markers exactly as before; the one
    // mechanism the static build and the live SPA both call, the URL scheme being the resolver's (no parse5).
    const pageLinkResolver = file?.data?.[ENSCRIBE_PAGE_LINK_RESOLVER];
    if (pageLinkResolver) resolvePageSlugLinksInTree(hast, pageLinkResolver);

    // #450: the COMPILER tail of the <config quiet> clear. Producers ran during
    // this compile (the tag handler's unknown-tag/handler-error warnings #412, the
    // sidenote block-content warning) AFTER the transform-tail clear, so a quiet
    // document clears again here — one choke point that also covers any future
    // compile-stage producer. Emission-only; the returned HTML is byte-identical.
    suppressMessagesIfQuiet(file);

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
 * eHTML `enscribeTag` nodes, but BEFORE the structural plugins restructure it
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
  // Parse once registers-on so applyStrictModeReparse (which runs detectStrictMode) can
  // find <config strict-mode>.
  const onInner = () => unified().use(remarkParse).use(remarkEnscribe).use(remarkMath).use(remarkGfm);
  const tree = onInner().parse(source);

  // The registers-off processors, built like the main compiler's (markdown off; sigils
  // off only for canonical). applyStrictModeReparse (F9, shared with resolveStrictMode)
  // does the detect + reparse; this standalone `enscribe lift` path then builds its OWN
  // inner processor (a separate instance, as before) so the pipe-body sub-parses keep the
  // register off too.
  const sigilProcessor = buildStrictOffProcessor('sigil');       // #460: single-sourced construction
  const canonicalProcessor = buildStrictOffProcessor('canonical');
  const { mode, reparsedTree } = applyStrictModeReparse(tree, source, undefined, sigilProcessor, canonicalProcessor);

  let outerTree = tree;
  let inner = onInner();
  if (reparsedTree) {
    outerTree = reparsedTree;
    inner = buildStrictOffProcessor(mode);
  }
  unified()
    .use(remarkRecursiveContent, { processor: inner, flowTagnames: FLOW_TAGNAMES })
    // Resolve the document class before the gate here too (lift / collect* path), so
    // book-context-gated book-part shorthand expansion fires for book documents — the
    // gate reads file.data.docType, which only enscribeDocTypeResolve populates.
    .use(enscribeDocTypeResolve)
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
export { assembleMasterDocument, spliceBookInterstitial, isMasterSrcEntry, isIncludeEntry, collectIncludeSrcs, composeRel, hasMasterSrcEntries, MASTER_SRC_TAGS } from '../master-document/assemble.js';
// Lazy live book rendering, L1 (#204): the engine foundation. harvestCrossRefRegistry
// reads anchor -> {number, title, type} off the numbered runSync tree (for L3 cross-
// chapter preview); renderChapter projects one <book-part> to its HTML fragment,
// byte-identical to its in-context full-render fragment (the per-chapter render the
// live lazy path, L2, drives).
export { harvestCrossRefRegistry } from './lib/cross-ref-registry.js';
export { renderChapter, extractBookPart } from '../master-document/render-chapter.js';
export { ENSCRIBE_CROSSREF_REGISTRY, ENSCRIBE_REGISTRY } from '../core/file-data-keys.js';
// #300 slice 2: the static website composition builder pre-seeds each page's numbering registry with
// a read-through over the merged SITE registry, so a cross-page <ref> resolves to its target's NATIVE
// number (the page numbered itself) — the minipage outbound-ref mechanism, reused site-wide.
export { makeReadThroughRegistry, ensureRegistry } from '../core/registry.js';
// Publishing, P1 (#205): the static separate-pages book build — one standalone HTML
// page per chapter at per-chapter URLs, cross-chapter refs resolving to cross-page
// links. The first consumer of L1 (renderChapter + registry) and C (the chrome).
// publishBookPageBodies (#295) is the sibling that returns each chapter's BODY FRAGMENT
// (no page shell), so the static-website build can host a book inside its own universal
// shell instead of stapling chrome onto a finished book page.
export { publishBookPages, publishBookPageBodies, prepareBook } from '../master-document/publish-pages.js';
// Live app-shell book render, L2 (#208): the live counterpart of P1 — render the CURRENT chapter live
// from .emd source, routed by the chapter-as-page scheme (`?chapter=<stem>` query; the hash is purely a
// section anchor) and lazy. buildLiveBook is the pure model (scaffold + router maps + harvested registry);
// renderLiveChapterView the per-chapter mounted view (renderChapter + C's chrome, `?chapter=` route hrefs);
// resolveRoute the pure router core (chapter from the query, section from the hash); chapterHref/coverHref/
// sectionHref the route-href builders. The browser entry (browser.js) wraps these with the fetch loader,
// the DOM mount, and the popstate/hashchange/query-nav router. Shares P1's book-scaffold for content parity.
export { buildLiveBook, renderLiveChapterContent, renderLiveChapterView, renderLiveCoverView, resolveRoute, chapterHref, coverHref, sectionHref } from '../master-document/live-book.js';
// Edit loop, L2 follow-up (#203 payoff): the incremental rebuilder (re-parse only the edited
// chapter via a memoized parse + clone; re-run the cheap global pass) and the GitHub-style
// Write/Preview edit view. The pure core of the authoring loop; browser.js mountLiveBook wires
// the in-memory source map, the debounced re-render, and the CodeMirror editor adapter onto it.
export { createIncrementalRebuilder, renderLiveChapterEditView, renderLiveChapterPreviewBody } from '../master-document/live-book.js';
// Live website nav helpers (#246 S2a). The nav-model flattener + the `?page=` not-found view that
// browser.js's mountLiveWebsite still uses. The website COMPOSITION itself (number each page natively →
// merge one registry → render per page) is the shared composeSiteRegistry below; the synthetic-<book>
// flatten that used to live here (buildWebsiteTree/buildLiveWebsite/renderLiveWebsitePage) was removed
// with the live #300 lift (#320).
export { renderNotFoundView, notFoundViewHtml, pageErrorViewHtml, NOT_FOUND_SLUG, flattenNavPages } from '../master-document/live-website.js';
// The browser-pure website COMPOSITION core (website.md Phase 1 — the live #300, step 1, #324): number
// each page natively → harvest → merge one site cross-ref registry → the read-through seed Phase 2 consumes.
// Browser-pure (I/O injected); the static build calls it, a later live caller will too. See compose-site.js.
export { composeSiteRegistry } from '../master-document/compose-site.js';
// The cross-page LINK LAYER — one home for both resolvers: the href-only cross-page <ref> rewriter
// (rewriteCrossPageHrefs, shared by the live SPA, the separate-pages book publish, and the static
// website) and the structural <a {slug}> page-link resolver (resolvePageSlugLinksInTree — #318, a
// render-time hast tree-pass; the compiler above runs it, both surfaces inject the resolver on
// file.data). See cross-page-links.js.
export { rewriteCrossPageHrefs, resolvePageSlugLinksInTree } from '../master-document/cross-page-links.js';
// Website nav CHROME (#246 S2b) — the sticky top bar, the left sidebar, and the chrome CSS.
// Exported so the STATIC website build (cli/src/static-website.js, #278) can inject the same chrome
// the live shell mounts. The live shell's interactive helpers (injectWebsiteNavStyles needs a DOM;
// setActivePage/buildOnThisPage are runtime) stay internal to the browser entry. (The top-bar dropdown
// is a native <details> disclosure — CSS-only — so it needs no JS wiring on either surface.)
export { buildWebsiteTopBar, buildWebsiteSidebar, WEBSITE_NAV_CSS, buildShellActions, SHELL_ACTIONS_CSS, GITHUB_MARK_SVG } from './assets/website-nav-asset.js';
// Static website SHELL (#295): one shell frames every static page — the universal head + the
// sticky top nav (the outer frame) + the page's content fragment in `.content`. Replaces the old
// per-page-type composition (decorateBookPage / composeArticlePage) so the book top nav is visible
// by construction. composeWebsiteShellPage is the full-document builder the static build calls.
export { composeWebsiteShellPage, WEBSITE_SHELL_CSS, collectDslNames, buildWebsiteDslHead } from '../master-document/website-shell.js';
// The pinned external-DSL CDN URLs — re-exported (symmetry with KATEX_CDN_URL above) so the static-website
// universal head's runtime-script assertions can reference the same versioned URLs the head emits (#298).
export { MERMAID_CDN_URL, ABCJS_CDN_URL } from './dsl/registry.js';
// slugifyPage (#278 slice 1): the title → slug helper website-structuring uses for page slugs, reused
// by the static build to slugify nav-GROUP titles into output-path segments (one slugifier, no drift).
// resolvePageSlug / allocatePageSlug (#300/#299 slice 1): the ONE three-tier slug resolver + the
// always-render collision allocator, reused by the static build so both builders compute the same slug.
export { slugifyPage, resolvePageSlug, allocatePageSlug } from './plugins/website-structuring.js';
// The single-document (article) live render (#216): an article is the simple case — one unit, no
// rail/cover/routing — so its edit view is just the SHARED Write/Preview pane (buildEditMain) in a
// chrome-free layout. browser.js mountLiveArticle wires the fetch + DOM + the single-source edit loop.
export { renderLiveArticleEditView } from '../master-document/live-edit-view.js';
// Live shell emitter (#215): the pure params → shell-HTML generator (the inverse of the #214
// hand-written shell), and resolveShellAssets (flat vs explicit asset hrefs). The build helper
// (CLI) imports these to generate a deployable live folder; the shell layer they reference ships
// at src/shell/ (exported via package.json "./shell/*").
export { emitLiveShell, emitSingleFileShell, resolveShellAssets, SINGLE_FILE_CDN_ROOT, SINGLE_FILE_ASSETS } from '../shell/emit-shell.js';

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
  (function walk(nodes) {
    for (const n of nodes ?? []) {
      if (n?.type === 'enscribeTag' && TABLE_TAGS.includes(n.tagname) && n.kwargs?.src) {
        srcs.push(n.kwargs.src);
      }
      if (n?.type === 'enscribeTag' && Array.isArray(n.content)) walk(n.content);
      if (Array.isArray(n?.children)) walk(n.children);
    }
  })(tree.children ?? []);
  return [...new Set(srcs)];
}

/**
 * #414: the `<title>` text of an already-parsed/imported mdast tree, or '' if it has
 * none. The tree-walking core of extractDocumentTitle (below), split out so callers
 * that already hold a tree — the CLI import commands convert JATS/pandoc input
 * straight to mdast — derive the same title without a source round-trip.
 *
 * @param {{ children?: Array }} tree - an mdast root carrying enscribeTag nodes.
 * @returns {string} the document `<title>` plain text (trimmed), or '' if absent.
 */
export function extractTitleFromTree(tree) {
  let title = '';
  (function walk(nodes) {
    for (const n of nodes ?? []) {
      if (title) return;
      if (n?.type === 'enscribeTag' && n.tagname === 'title') {
        title = extractPlainText(n.content ?? []);
        return;
      }
      if (n?.type === 'enscribeTag' && Array.isArray(n.content)) walk(n.content);
      if (Array.isArray(n?.children)) walk(n.children);
    }
  })(tree?.children ?? []);
  return title;
}

/**
 * #228: the document's `<title>` text, or '' if it has none. The source-introspection
 * analog of collectLibrarySources — used to default a live-shell `<title>` to the
 * document's own title instead of its filename. Uses liftToCanonicalMdast so the
 * `<title>` (raw text inside `<meta>` at parse stage) is structured, then the shared
 * plain-text collector (so inline markup in the title is stripped, not literal).
 *
 * @param {string} source - enscribe/markdown source text.
 * @returns {string} the document `<title>` plain text (trimmed), or '' if absent.
 */
export function extractDocumentTitle(source) {
  return extractTitleFromTree(liftToCanonicalMdast(source));
}
