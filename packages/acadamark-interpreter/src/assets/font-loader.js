// Font loader — generates base64-inlined @font-face CSS for document fonts and
// patches KaTeX CSS to replace relative font URLs with base64 data URIs.
//
// Two exports:
//
//   getDocumentFontsCss()
//     Reads woff2 files from src/assets/fonts/, base64-encodes them, and returns
//     a CSS string of @font-face rules suitable for inlining in a <style> block.
//     Called by render-fixtures.js (shell wrapper) and by any other consumer that
//     needs self-contained HTML output.
//
//   patchKatexFontUrls(css)
//     Accepts the raw KaTeX CSS string (which contains url(fonts/KaTeX_*.woff2)
//     references) and returns a patched version with each font URL replaced by a
//     base64 data URI. The font files are read from node_modules/katex/dist/fonts/.
//
// Both functions cache their results after the first call.
//
// Font choices (Slice 7):
//   Body / headings: Inter (subsetted to Latin, 5 weights/styles, ~190KB raw)
//   Monospace:       Source Code Pro Regular (subsetted to Latin, ~14KB raw)
//   Rationale: both fonts are available locally; source files from system font
//   directory; subsetting reduces each weight from ~180KB to ~35KB.

// Node built-ins for the server/build path. In the browser bundle these are dead
// code (browser defaults never call them); tsup aliases both the node: and bare
// forms to a throwing stub. See packages/acadamark-interpreter/tsup.config.js.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Directory resolution is deferred into accessors (not computed at module load)
// so this module imports cleanly in a browser bundle; the fs reads themselves
// stay Node-only and run only when inline font embedding is actually requested.
let _fontsDirCache = null;
function fontsDir() {
  if (_fontsDirCache === null) {
    _fontsDirCache = join(dirname(fileURLToPath(import.meta.url)), 'fonts');
  }
  return _fontsDirCache;
}

let _katexFontsDirCache = null;
function katexFontsDir() {
  if (_katexFontsDirCache === null) {
    _katexFontsDirCache = join(dirname(fileURLToPath(import.meta.resolve('katex'))), 'fonts');
  }
  return _katexFontsDirCache;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toBase64DataUri(filePath) {
  const data = readFileSync(filePath);
  return `data:font/woff2;base64,${data.toString('base64')}`;
}

// ─── Document fonts ───────────────────────────────────────────────────────────

// @font-face descriptors for Inter and Source Code Pro.
// Each entry: [ family, style, weight, filename ]
const DOCUMENT_FONT_FACES = [
  ['Inter', 'normal', '400', 'Inter-Regular.woff2'],
  ['Inter', 'italic', '400', 'Inter-Italic.woff2'],
  ['Inter', 'normal', '600', 'Inter-SemiBold.woff2'],
  ['Inter', 'normal', '700', 'Inter-Bold.woff2'],
  ['Inter', 'italic', '700', 'Inter-BoldItalic.woff2'],
  ['Source Code Pro', 'normal', '400', 'SourceCodePro-Regular.woff2'],
];

// CDN URL for document fonts, used by `documentFontsCss: 'link'` mode (the
// external-by-default counterpart to the inlined base64 faces getDocumentFontsCss
// emits). Google Fonts' css2 API serves @font-face CSS pointing at Google's own
// browser-subset woff2 files — one <link> instead of ~190KB of inlined base64.
// The families/weights/styles mirror DOCUMENT_FONT_FACES above: Inter 400/600/700
// upright + 400/700 italic, and Source Code Pro 400; `display=swap` matches the
// inlined faces' font-display.
//
// Unlike KATEX_CDN_URL and the DSL CDN URLs, this pins NO package version: Google
// Fonts is a living, versionless API, so there is no installed package to drift
// against (hence no cdn-versions.test.js guard). Trade-off: 'link' adds a
// third-party (Google) request — a privacy/archival cost that the self-contained
// `documentFontsCss: 'inline'` (or `embedResources: true`) avoids.
export const DOCUMENT_FONTS_CDN_URL =
  'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Code+Pro:wght@400&display=swap';

let _documentFontsCss = null;

/**
 * Build @font-face CSS for document fonts (Inter, Source Code Pro).
 * Reads woff2 files from src/assets/fonts/ and base64-encodes them.
 * Result is cached after first call.
 *
 * @returns {string} CSS block of @font-face rules.
 */
export function getDocumentFontsCss() {
  if (_documentFontsCss !== null) return _documentFontsCss;

  const rules = DOCUMENT_FONT_FACES.map(([family, style, weight, filename]) => {
    const filePath = join(fontsDir(), filename);
    const dataUri = toBase64DataUri(filePath);
    return `@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url(${dataUri}) format('woff2');
}`;
  });

  _documentFontsCss = rules.join('\n');
  return _documentFontsCss;
}

// ─── KaTeX fonts ─────────────────────────────────────────────────────────────

let _patchedKatexCss = null;

/**
 * Patch KaTeX CSS: replace each `url(fonts/KaTeX_*.woff2)` with a base64
 * data URI, so the CSS works when inlined in HTML without a web server.
 *
 * The raw KaTeX CSS uses relative URLs like `url(fonts/KaTeX_Math-Italic.woff2)`.
 * When the CSS is inlined in a <style> block, those URLs resolve relative to the
 * HTML document's location — which is correct when the HTML file lives next to a
 * fonts/ directory, but fails in all other cases (file://, different directory, etc).
 *
 * This function patches every such URL with an inline data URI.
 *
 * @param {string} rawCss - Raw KaTeX CSS string (from katex.min.css).
 * @returns {string} Patched CSS string with base64 font data URIs.
 */
export function patchKatexFontUrls(rawCss) {
  if (_patchedKatexCss !== null) return _patchedKatexCss;

  _patchedKatexCss = rawCss.replace(
    /url\(fonts\/(KaTeX_[^)]+\.woff2)\)/g,
    (_, filename) => {
      const filePath = join(katexFontsDir(), filename);
      const dataUri = toBase64DataUri(filePath);
      return `url(${dataUri})`;
    },
  );
  return _patchedKatexCss;
}
