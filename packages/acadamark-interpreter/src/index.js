// Main entry for acadamark-interpreter.
//
// Exports the unified plugin `acadamarkInterpreter`, which wires together:
//   1. remarkRecursiveContent  — parses string pipe-content into mdast
//   2. acadamarkConfigDiscovery — Phase 1: discovery (no tree mutation)
//   3. acadamarkArticleStructuring — Phase 2: wraps doc in article structure
//   4. acadamarkSectionNesting — Phase 2: nests section/sub-section/... nodes
//   5. acadamarkNotes — Phase 3: numbers notes, replaces inline nodes, collects
//      content into note-list
//   6. A custom compiler that converts the final mdast → hast → HTML string
//      via mdast-util-to-hast (with the acadamarkTag custom handler) and
//      hast-util-to-html.
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
//   katexCss: 'inline' (default) | 'link' | 'skip'
//     'inline' — emit a <style> block containing KaTeX CSS (documents work
//                out-of-the-box; no external request required).
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

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
// Relative path import: remark-acadamark does not re-export this module via
// its package exports field; we access it directly within the workspace.
import remarkRecursiveContent from '../../remark-acadamark/src/recursive-content.js';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import rehypeFormat from 'rehype-format';

import { acadamarkConfigDiscovery } from './plugins/config-discovery.js';
import { acadamarkArticleStructuring } from './plugins/article-structuring.js';
import { acadamarkSectionNesting } from './plugins/section-nesting.js';
import { acadamarkNotes } from './plugins/notes.js';
import { acadamarkLibraryLoad } from './plugins/library-load.js';
import { acadamarkNumbering } from './plugins/numbering.js';
import { acadamarkRefResolution } from './plugins/ref-resolution.js';
import { acadamarkCiteResolution } from './plugins/cite-resolution.js';
import { acadamarkBibliography } from './plugins/bibliography.js';
import { acadamarkTagHandler, createAcadamarkTagHandler } from './interpret-plugin.js';
import { patchKatexFontUrls } from './assets/font-loader.js';

export { acadamarkConfigDiscovery, acadamarkArticleStructuring, acadamarkSectionNesting, acadamarkNotes, acadamarkLibraryLoad, acadamarkNumbering, acadamarkRefResolution, acadamarkCiteResolution, acadamarkBibliography, acadamarkTagHandler, createAcadamarkTagHandler };

// ─── KaTeX CSS ────────────────────────────────────────────────────────────────
// Resolve the KaTeX dist directory from its package entry point.
// import.meta.resolve('katex') → file://.../node_modules/katex/dist/katex.mjs
const _katexDir = dirname(fileURLToPath(import.meta.resolve('katex')));
const _katexCssPath = join(_katexDir, 'katex.min.css');

// Read KaTeX package version for a pinned CDN URL.
const _katexVersion = JSON.parse(
  readFileSync(join(_katexDir, '..', 'package.json'), 'utf8'),
).version;

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
    const raw = readFileSync(_katexCssPath, 'utf8');
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

const _thisDir = dirname(fileURLToPath(import.meta.url));

// Lazy-loaded inline assets.
let _tippyCss = null;
let _tippyLightBorderCss = null;
let _popperJs = null;
let _tippyJs = null;
let _hoverPreviewCss = null;
let _hoverPreviewJs = null;

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

function getHoverPreviewCss() {
  if (_hoverPreviewCss === null) {
    _hoverPreviewCss = readFileSync(
      join(_thisDir, 'assets', 'hover-preview.css'),
      'utf8',
    );
  }
  return _hoverPreviewCss;
}

function getHoverPreviewJs() {
  if (_hoverPreviewJs === null) {
    _hoverPreviewJs = readFileSync(
      join(_thisDir, 'assets', 'hover-preview.js'),
      'utf8',
    );
  }
  return _hoverPreviewJs;
}

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

/**
 * Unified plugin. Applies the full acadamark pipeline: recursive content
 * parsing, structural plugins, and mdast-to-HTML compilation.
 *
 * @this {import('unified').Processor}
 * @param {object} [options]
 * @param {'inline'|'link'|'skip'} [options.katexCss='inline'] CSS handling mode.
 * @param {'inline'|'link'|'skip'} [options.hoverPreviewMode='inline'] Hover preview mode.
 */
export function acadamarkInterpreter(options = {}) {
  const cssMode = options.katexCss ?? 'inline';
  const hoverMode = options.hoverPreviewMode ?? 'inline';
  const assetsDir = options.assetsDir ?? null;

  // Inner processor: used by remarkRecursiveContent to re-parse pipe-content
  // strings. It runs the same parser plugins as the outer processor but does
  // NOT include the structural or compile steps (those only run on the outer
  // tree, not on recursively-parsed subtrees).
  const innerProcessor = unified().use(remarkParse).use(remarkAcadamark);

  // 1. Parse pipe-content strings into mdast children.
  this.use(remarkRecursiveContent, { processor: innerProcessor });

  // 2–4. Structural transformation.
  this.use(acadamarkConfigDiscovery);
  this.use(acadamarkArticleStructuring);
  this.use(acadamarkSectionNesting);

  // 5. Library load: parse <library> content from <data> root siblings,
  //    store citation-js instance in file.data.acadamarkCitations.
  this.use(acadamarkLibraryLoad, { assetsDir });

  // 6. Notes: assign numbers, replace inline nodes, collect note-list.
  this.use(acadamarkNotes);

  // 7. Numbering: assign computedNumber to display-math and figure nodes.
  this.use(acadamarkNumbering);

  // 8. Ref resolution: replace <ref> nodes with __ref-marker or __ref-error.
  this.use(acadamarkRefResolution);

  // 9. Cite resolution: replace <cite> nodes with __cite-marker or __cite-error.
  this.use(acadamarkCiteResolution);

  // 10. Bibliography: render the bibliography and inject into article-back.
  this.use(acadamarkBibliography);

  // 11. Register a compiler: mdast → hast → HTML.
  // `this.compiler` is the standard unified API for registering the
  // stringify step; it is called by processor.stringify() and
  // processor.process().
  this.compiler = function compileToHtml(tree) {
    const tagHandler = createAcadamarkTagHandler({ assetsDir });
    const hast = toHast(tree, {
      handlers: { acadamarkTag: tagHandler },
      allowDangerousHtml: true,
    });

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

    // Format the hast tree for readable HTML output: block elements get
    // indentation and line breaks; inline content is preserved as-is.
    // rehype-format leaves <style> and <script> contents untouched.
    rehypeFormat()(hast);

    return toHtml(hast, { allowDangerousHtml: true });
  };
}
