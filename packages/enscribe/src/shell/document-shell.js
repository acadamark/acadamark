// The static document shell (#395 D2 / audit W3) — the minimal complete-page frame around a
// rendered document fragment. The STATIC sibling of emit-shell.js (the live shell): where the
// live shell mounts the engine to render client-side, this shell wraps an already-rendered
// fragment so `enscribe render`'s default output is a complete, styled, standalone document
// (doctype → standards mode, charset, viewport, a real <title>, the document stylesheet).
//
// Deliberately NOT here:
//   - Font / KaTeX assets: the rendered fragment already carries them in the form the
//     pipeline chose (--embed → inline <style>; --no-embed → the #297-bound CDN <link>
//     forms). Adding HEAD_ASSET_LINKS here would double-load them.
//   - Site/book chrome: pageShell (publish-pages.js) and the website shell own those.
//     If those shells and this one ever converge on a shared core, that consolidation is
//     its own slice — this module stays the minimal document frame.
//
// A PURE string builder (no fs), like its siblings: the caller resolves the stylesheet and
// passes the ready <head> block for it (an inline <style> or a <link>), so the delivery
// decision stays with the caller.

import { escapeHtml } from '../core/escape-html.js';

/**
 * Wrap a rendered document fragment in the minimal standalone page frame.
 *
 * @param {string} body - the rendered document fragment (carries its own font/KaTeX assets).
 * @param {object} o
 * @param {string} o.title - the page title (plain text; escaped here).
 * @param {string} [o.stylesheet] - a ready head block for the document stylesheet
 *   (`<style>…</style>` or `<link rel="stylesheet" …>`); empty for none.
 * @param {string} [o.themeVariant] - #398: the document-tier light/dark default
 *   (`<config theme-variant=…>`). 'light'/'dark' stamp data-theme-variant on <html> —
 *   the hook the baked dark CSS keys on (`:root[data-theme-variant="dark"]`, and the
 *   auto media block's `:not([data-theme-variant="light"])` escape). 'auto'/absent
 *   stamps nothing: the document follows prefers-color-scheme.
 * @returns {string} the complete HTML document.
 */
export function emitDocumentShell(body, { title, stylesheet = '', themeVariant }) {
  const variantAttr = themeVariant === 'light' || themeVariant === 'dark'
    ? ` data-theme-variant="${themeVariant}"` : '';
  return `<!DOCTYPE html>
<html lang="en"${variantAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${stylesheet ? stylesheet + '\n' : ''}</head>
<body>
${body}
</body>
</html>
`;
}
