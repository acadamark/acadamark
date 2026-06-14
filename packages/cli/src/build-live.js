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
import { buildEnscribePipeline, isMasterSrcEntry, emitLiveShell } from '@enscribejs/enscribe';

const require = createRequire(import.meta.url);

// The shipped assets a live folder needs, resolved via @enscribejs/enscribe's package exports
// (filename in the folder -> export specifier). Adding ./shell/* + ./browser-global made these
// resolvable from outside the package.
const ASSET_SPECS = {
  'enscribe.browser.global.js': '@enscribejs/enscribe/browser-global',
  'default.css': '@enscribejs/enscribe/default.css',
  'enscribe-shell.css': '@enscribejs/enscribe/shell/enscribe-shell.css',
  'editor-codemirror.js': '@enscribejs/enscribe/shell/editor-codemirror.js',
};

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
 * @param {string} [opts.title] - the shell <title> (defaults to the master filename).
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
  copyInto(masterPath, masterName);
  const masterTree = buildEnscribePipeline({}).parse(readFileSync(masterPath, 'utf8'));
  const children = [...new Set((masterTree.children ?? []).filter(isMasterSrcEntry).map((n) => n.kwargs.src))];
  for (const src of children) copyInto(join(masterDir, src), src);

  // 2. the shell assets + engine bundle, copied flat (resolved via the package exports).
  for (const [name, spec] of Object.entries(ASSET_SPECS)) copyInto(require.resolve(spec), name);

  // 3. the emitted live shell — flat assetBase, so every reference resolves inside the folder.
  writeFileSync(
    join(out, 'index.html'),
    emitLiveShell({ master: masterName, title: title ?? masterName, edit, assetBase: './' }),
    'utf8',
  );

  return { outDir: out, master: masterName, children, assets: Object.keys(ASSET_SPECS) };
}
