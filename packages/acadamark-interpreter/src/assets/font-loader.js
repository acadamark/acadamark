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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const _thisDir = dirname(fileURLToPath(import.meta.url));
const _fontsDir = join(_thisDir, 'fonts');

// Resolve the KaTeX dist/fonts directory.
const _katexDir = dirname(fileURLToPath(import.meta.resolve('katex')));
const _katexFontsDir = join(_katexDir, 'fonts');

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
    const filePath = join(_fontsDir, filename);
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
      const filePath = join(_katexFontsDir, filename);
      const dataUri = toBase64DataUri(filePath);
      return `url(${dataUri})`;
    },
  );
  return _patchedKatexCss;
}
