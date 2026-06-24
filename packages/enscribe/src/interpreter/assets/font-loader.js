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
// forms to a throwing stub. See packages/enscribe/src/interpreter/tsup.config.js.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createLazyAsset } from '../lib/lazy-asset.js';
import { escapeHtml } from '../../core/escape-html.js';

// Directory resolution is deferred into accessors (not computed at module load)
// so this module imports cleanly in a browser bundle; the fs reads themselves
// stay Node-only and run only when inline font embedding is actually requested.
const fontsDir = createLazyAsset(() => join(dirname(fileURLToPath(import.meta.url)), 'fonts'));

const katexFontsDir = createLazyAsset(() => join(dirname(fileURLToPath(import.meta.resolve('katex'))), 'fonts'));

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

// Pinned KaTeX version for the CDN URL — a literal, not an fs read, so this module loads in a
// browser bundle (the build slice's browser-safety boundary; see notes/specs/core.md).
// test/cdn-versions.test.js asserts KATEX_CDN_URL equals the installed katex version, so a
// dependency bump fails loudly. Co-located here with DOCUMENT_FONTS_CDN_URL (the two linked
// document-asset CDN URLs) and re-exported from index.js, so the static-website universal head
// (master-document/website-shell.js) can link both without importing index.js (a cycle).
const _katexVersion = '0.16.45';

/**
 * CDN URL for KaTeX CSS, pinned to the installed version.
 * Exported so consumers using 'link' mode can reference the same URL.
 */
export const KATEX_CDN_URL = `https://cdn.jsdelivr.net/npm/katex@${_katexVersion}/dist/katex.min.css`;

// The document head's LINKED display assets — the document fonts (Inter body + Source Code Pro code) and
// the KaTeX math CSS — as ONE authored `<link>` set: the SINGLE SOURCE every STRING-form shell links. Both
// the static-website universal head (master-document/website-shell.js) and the separate-pages page shell
// (master-document/publish-pages.js) link EXACTLY this. Routing both here is the fix for #297 — the page
// shell linked NEITHER, so a standalone separate-pages book rendered math as bare KaTeX HTML and code in a
// system mono font. Emitted UNCONDITIONALLY (a math-free page just carries an unused KaTeX sheet, harmless)
// so a multi-page head stays byte-identical across pages. The full-document rehype render injects the SAME
// two assets as hast nodes via the consolidated injector (index.js: makeLinkElement of these constants),
// math-gated there to keep single-document output lean. (There is NO separate syntax-highlight stylesheet:
// code is plain `<pre><code class="language-X">`, styled by default.css's pre/code rules + the Source Code
// Pro web font carried in the FONTS link — so linking the fonts is what re-styles code.)
export const HEAD_ASSET_LINKS =
  `<link rel="stylesheet" href="${escapeHtml(DOCUMENT_FONTS_CDN_URL)}">\n` +
  `<link rel="stylesheet" href="${escapeHtml(KATEX_CDN_URL)}">`;

// §3 single-source guard (the section-kinds.js pattern): tie the authored link set back to its CDN-URL
// source so a future shell can't fork a divergent copy (hardcode a URL, drop or add a link). The hrefs
// parsed out of HEAD_ASSET_LINKS must equal, in order, the two document-asset constants the consolidated
// injector also uses. Fails loud at module load.
{
  const linkedHrefs = [...HEAD_ASSET_LINKS.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
  const sourceHrefs = [escapeHtml(DOCUMENT_FONTS_CDN_URL), escapeHtml(KATEX_CDN_URL)];
  const equal =
    linkedHrefs.length === sourceHrefs.length && linkedHrefs.every((h, i) => h === sourceHrefs[i]);
  if (!equal) {
    throw new Error(
      `font-loader: HEAD_ASSET_LINKS drifted from its CDN-URL source — linked [${linkedHrefs.join(', ')}] ` +
        `must be exactly [${sourceHrefs.join(', ')}]. Edit DOCUMENT_FONTS_CDN_URL / KATEX_CDN_URL, not a copy.`,
    );
  }
}

/**
 * Build @font-face CSS for document fonts (Inter, Source Code Pro).
 * Reads woff2 files from src/assets/fonts/ and base64-encodes them.
 * Result is cached after first call (createLazyAsset).
 *
 * @returns {string} CSS block of @font-face rules.
 */
export const getDocumentFontsCss = createLazyAsset(() => {
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

  return rules.join('\n');
});

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
