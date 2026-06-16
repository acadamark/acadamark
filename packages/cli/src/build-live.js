// Live-folder build helper (#215).
//
// The file-I/O half of the live-shell emitter: pure `emitLiveShell` (params -> shell HTML) lives in
// the engine package; THIS resolves the shipped shell assets + engine bundle (via the package
// exports), copies them + the master + its `src` children FLAT into an output dir, and writes the
// emitted shell with `assetBase: './'`. The result is a portable, self-standing LIVE FOLDER — open
// it (served over HTTP) to read; `?edit` mounts the #211 edit loop — with no CDN dependency for the
// chrome (the CodeMirror-from-CDN load inside the editor factory is the #117-deferred asset concern).

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, basename, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { buildEnscribePipeline, isMasterSrcEntry, emitLiveShell, extractDocumentTitle } from '@enscribejs/enscribe';

const require = createRequire(import.meta.url);

// The shipped assets a live shell references, resolved via @enscribejs/enscribe's package exports
// (filename in the deployment -> export specifier). Adding ./shell/* + ./browser-global made these
// resolvable from outside the package. SINGLE AUTHORITY: this is the one list of "what a live shell
// needs" — buildLiveFolder copies them flat into its folder; a multi-page site (docs-live, #207)
// copies them ONCE into a shared dir via copyShellAssets and points many shells' assetBase at it. A
// fifth asset added here flows to both consumers, no drift.
export const SHELL_ASSET_SPECS = {
  'enscribe.browser.global.js': '@enscribejs/enscribe/browser-global',
  'default.css': '@enscribejs/enscribe/default.css',
  'enscribe-shell.css': '@enscribejs/enscribe/shell/enscribe-shell.css',
  'editor-codemirror.js': '@enscribejs/enscribe/shell/editor-codemirror.js',
};

/**
 * Copy the live-shell assets (SHELL_ASSET_SPECS) into `destDir`, once. The reusable copy step for ANY
 * live deployment: a self-standing folder (buildLiveFolder, assets beside the shell) OR a shared
 * asset dir many per-page shells point their `assetBase` at (docs-live, #207 — the ~3 MB engine bundle
 * must not be copied per page). Resolves each asset via the package exports, so the caller needs no
 * knowledge of the package's internal layout. Throws if the engine bundle isn't built — gate on its
 * presence first if graceful degradation is wanted.
 *
 * @param {string} destDir - directory to copy the assets into (created if missing).
 * @returns {string[]} the copied filenames (the keys of SHELL_ASSET_SPECS).
 */
export function copyShellAssets(destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const [name, spec] of Object.entries(SHELL_ASSET_SPECS)) {
    copyFileSync(require.resolve(spec), join(destDir, name));
  }
  return Object.keys(SHELL_ASSET_SPECS);
}

/**
 * Discover a master document's `<… src>` structure children — the same `master + its src children`
 * recognition (isMasterSrcEntry) the assembler and the browser live-loader use, so a multi-file
 * document's child sources are copied alongside it. Deduped, document-order. Returns `[]` for a
 * single-file document (the common case today). Shared by buildLiveFolder and docs-live (#207).
 *
 * @param {string} masterSource - the master document's `.emd` source text.
 * @returns {string[]} the child `src` filenames, deduped.
 */
export function discoverMasterSrcChildren(masterSource) {
  const tree = buildEnscribePipeline({}).parse(masterSource);
  return [...new Set((tree.children ?? []).filter(isMasterSrcEntry).map((n) => n.kwargs.src))];
}

/**
 * Build a self-standing live folder for a master document — book OR article (#216): copy the master
 * + its `src` children + the shell assets + engine bundle into `outDir` (flat), and write the
 * emitted live shell there. The shell is type-agnostic (it mounts via mountLiveShell, which
 * dispatches by `<meta type>` at runtime), so this helper does not care which kind the master is.
 *
 * @param {object} opts
 * @param {string} opts.master - path to the master `.emd` (a `<meta type=book>` with book-part `src`
 *   children, or a `<meta type=article>` — single-file, or with `<section src>` children).
 * @param {string} opts.outDir - the live folder to write (created if missing).
 * @param {string} [opts.title] - the shell <title>. Order: explicit `title` → the master
 *   document's own `<title>` → the master filename (#228).
 * @param {boolean} [opts.edit=false] - default the shell to the editor (#213; `?edit` always works).
 * @returns {{ outDir: string, master: string, children: string[], assets: string[] }}
 */
export function buildLiveFolder({ master, outDir, title, edit = false }) {
  const masterPath = resolve(master);
  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  const masterName = basename(masterPath);
  const masterDir = dirname(masterPath);

  // Copy `srcPath` into the folder as `name`, skipping a self-copy (the source may already be there,
  // e.g. when building in place over a committed example folder).
  const copyInto = (srcPath, name) => {
    const dest = join(out, name);
    if (resolve(srcPath) !== dest) copyFileSync(srcPath, dest);
  };

  // 1. the master + its `src` children — so the folder is self-standing (the shell fetches them).
  const masterSource = readFileSync(masterPath, 'utf8');
  copyInto(masterPath, masterName);
  const children = discoverMasterSrcChildren(masterSource);
  for (const src of children) copyInto(join(masterDir, src), src);

  // 2. the shell assets + engine bundle, copied flat into the folder (assetBase './').
  copyShellAssets(out);

  // 3. the emitted live shell — flat assetBase, so every reference resolves inside the folder.
  //    Title default (#228): explicit `title` → the document's own `<title>` → the filename.
  const shellTitle = title ?? (extractDocumentTitle(masterSource) || masterName);
  writeFileSync(
    join(out, 'index.html'),
    emitLiveShell({ master: masterName, title: shellTitle, edit, assetBase: './' }),
    'utf8',
  );

  return { outDir: out, master: masterName, children, assets: Object.keys(SHELL_ASSET_SPECS) };
}
