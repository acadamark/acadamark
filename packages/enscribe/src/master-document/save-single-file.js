// Self-saving single-file document (#351) — serialize the edited source back into the single-file
// vessel and write it out.
//
// The single-file vessel (emitSingleFileShell, delivery-modes.md §Single-file) embeds its `.emd` in a
// `<template id="enscribe-source">` and self-renders from it at mount (`.content.textContent`). SAVE
// completes the one explicitly-marked gap ("edits are preview-only, no save"): it reuses that EXACT
// vessel structure — take the pristine vessel HTML (the document as loaded, snapshotted before mount
// mutated the DOM), swap ONLY the `<template>`'s content for the edited source, and write the result.
// So the saved file is the original vessel with a new embedded source: it preserves the vessel's
// asset-delivery mode (inlined stays inlined, CDN stays CDN) and self-renders when reopened — no
// re-build, no re-render. This is NOT a new format or a new editor; it serializes specced machinery.

import { escapeHtml } from '../core/escape-html.js';

// The embedded-source carrier, byte-for-byte as emitSingleFileShell writes it. The open tag is a fixed
// literal (no varying attributes), so a targeted string splice is exact and touches nothing else in the
// vessel — the inlined engine/CSS, the CDN links, and the bootstrap all stay identical.
//
// Locating the REAL element needs care: the literal string appears in the vessel in up to THREE places —
//   1. the real `<template>` element in <body> (the target);
//   2. the CDN vessel's head COMMENT ("EMBEDDED below (the <template id="enscribe-source">)"); and
//   3. INSIDE the inlined engine `<script>` — the engine bundle contains emitSingleFileShell's own source,
//      whose template-literal `<template id="enscribe-source">` survives minification (inlined delivery).
// The real element is the one in <body> BEFORE the first `<script>` (the head carries only <style>/<link>,
// never a script). So we search only the region up to the first `<script>` — excluding (3) entirely — and
// take the LAST match in it, which skips the head comment (2) and lands on the real element (1). The
// embedded source is HTML-escaped, so the raw open string never appears inside it or the editor template
// (id `enscribe-editor-src`, a different string).
const SRC_OPEN = '<template id="enscribe-source">';
const SRC_CLOSE = '</template>';

/**
 * Produce the saved single-file HTML: the pristine vessel with its embedded source swapped for
 * `editedSource`. PURE (string surgery only). The replacement is HTML-escaped with the SAME 3-entity
 * `escapeHtml` emitSingleFileShell uses, so the saved `<template>` round-trips back to the exact edited
 * source via `.content.textContent` on reopen. `editedSource` containing `</template>`, `<`, or `&` is
 * safe — escaping neutralizes it, so it cannot terminate the template early.
 *
 * @param {string} pristineHtml - the single-file vessel HTML as loaded (before mount mutated the DOM).
 * @param {string} editedSource - the edited `.emd` source to embed.
 * @returns {string} the saved self-contained HTML.
 */
export function serializeSavedFile(pristineHtml, editedSource) {
  // Search only the pre-<script> region so a copy of the literal inside the inlined engine bundle can
  // never be matched; take the last match there to skip the CDN head-comment mention.
  const firstScript = pristineHtml.indexOf('<script');
  const region = firstScript === -1 ? pristineHtml : pristineHtml.slice(0, firstScript);
  const open = region.lastIndexOf(SRC_OPEN);
  if (open === -1) {
    throw new Error('serializeSavedFile: no <template id="enscribe-source"> in the vessel (not a single-file document?)');
  }
  const contentStart = open + SRC_OPEN.length;
  const close = pristineHtml.indexOf(SRC_CLOSE, contentStart);
  if (close === -1) {
    throw new Error('serializeSavedFile: the <template id="enscribe-source"> is unterminated');
  }
  return pristineHtml.slice(0, contentStart) + escapeHtml(editedSource) + pristineHtml.slice(close);
}

/**
 * A filesystem-safe filename (`.html`) derived from the document title (or a default). Used as the
 * download name and the save-picker's suggested name.
 *
 * @param {string} [title] - the document title (e.g. `document.title`).
 * @returns {string} a `.html` filename.
 */
export function suggestedFileName(title) {
  const stem = String(title || '')
    .trim()
    .replace(/[^\w.-]+/g, '-')   // collapse any non-word run to a single dash
    .replace(/^-+|-+$/g, '')     // trim leading/trailing dashes
    || 'enscribe-document';
  return /\.html?$/i.test(stem) ? stem : stem + '.html';
}

/**
 * Write the saved HTML out — progressive enhancement, both paths, feature-detected (never hard-fails
 * where the File System Access API is absent):
 *   - PRIMARY (File System Access API — Chromium/Edge): the true self-saving experience. With a handle
 *     already held (a prior save this session), overwrite that file IN PLACE — no prompt. On the first
 *     save, a save picker chooses the target; the chosen handle is RETURNED so the caller can persist
 *     it and overwrite in place next time.
 *   - FALLBACK (Firefox/Safari and any non-secure context): download a fresh self-contained HTML file.
 *
 * @param {string} html - the saved single-file HTML (from `serializeSavedFile`).
 * @param {object} [opts]
 * @param {FileSystemFileHandle|null} [opts.fileHandle] - a handle from a prior save → overwrite in place.
 * @param {string} [opts.suggestedName] - the picker's suggested / download filename.
 * @returns {Promise<{method:'fsa'|'download', handle?:object}>} how it wrote, and the FSA handle to persist.
 */
export async function writeSavedFile(html, { fileHandle = null, suggestedName = 'enscribe-document.html' } = {}) {
  // In-place overwrite: we already hold the target's handle from an earlier save this session.
  if (fileHandle && typeof fileHandle.createWritable === 'function') {
    const writable = await fileHandle.createWritable();
    await writable.write(html);
    await writable.close();
    return { method: 'fsa', handle: fileHandle };
  }
  // First save via the File System Access API: pick a target, then persist the handle for in-place saves.
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Enscribe self-contained document', accept: { 'text/html': ['.html', '.htm'] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(html);
    await writable.close();
    return { method: 'fsa', handle };
  }
  // Universal fallback: download a fresh self-contained artifact (a new file each time).
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { method: 'download' };
}
