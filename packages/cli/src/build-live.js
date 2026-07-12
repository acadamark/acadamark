// Live-folder build helper (#215).
//
// The file-I/O half of the live-shell emitter: pure `emitLiveShell` (params -> shell HTML) lives in
// the engine package; THIS resolves the shipped shell assets + engine bundle (via the package exports)
// and copies them, the master, and the document bodies into an output dir, then writes the emitted shell
// with `assetBase: './'`. Layout (#331): the chrome assets copy FLAT; for a WEBSITE master each page is
// deployed in its OWN directory — master at `<src>/index.emd`, a book page's `<chapter src>` children
// BESIDE it at `<src>/<child>` — so same-named children across pages don't collide last-wins (the runtime
// fetches `<src>/index.emd` and resolves children master-relative). Co-located figure ASSETS are copied
// PER-FOLDER under the page's `<src>/` too (#352 — the live SPA resolves a page's `<img src>` against that
// dir), so two pages' same-named assets stay distinct. A standalone book/article folder stays flat (its
// children already sit beside their own master). The
// result is a portable, self-standing LIVE FOLDER — open it (served over HTTP) to read; `?edit` mounts
// the #211 edit loop — with no CDN dependency for the chrome (the CodeMirror-from-CDN load inside the
// editor factory is the #117-deferred asset concern).
//
// This is the Live delivery mode with sibling assets (the wired default); the delivery-mode model
// (shell / fetch / asset seam, and the unbuilt single-file mode) is specced in
// `notes/specs/delivery-modes.md`.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, basename, join, resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
import { buildEnscribePipeline, isMasterSrcEntry, emitLiveShell, emitSingleFileShell, extractDocumentTitle, getInlineDisplayHead, SINGLE_FILE_ASSETS } from '@enscribejs/enscribe';
import { ENSCRIBE_NAV_MODEL } from '@enscribejs/enscribe/core/file-data-keys';
import { classifyDocType } from '@enscribejs/enscribe/interpreter/lib/classify-doc-type';
import { resolvePageSource, pageDirAssets } from './static-website.js';

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
 * @param {string[]} [only] - copy just this subset of SHELL_ASSET_SPECS names (the `inlined` delivery
 *   copies ONLY the editor sibling — engine + CSS are inlined into the shell). Default: all four.
 * @returns {string[]} the copied filenames.
 */
export function copyShellAssets(destDir, only) {
  mkdirSync(destDir, { recursive: true });
  const names = only ?? Object.keys(SHELL_ASSET_SPECS);
  for (const name of names) {
    copyFileSync(require.resolve(SHELL_ASSET_SPECS[name]), join(destDir, name));
  }
  return names;
}

// Read the chrome + display bytes for the INLINED asset-delivery mode (#364/#365): the engine bundle,
// the two chrome stylesheets, the document-display <style> pair (fonts + KaTeX, via the single-source
// getInlineDisplayHead), and the bundled editor (#365 — so an inlined editable artifact edits offline
// too). All resolved from the SAME package exports copyShellAssets copies — one authority
// (SHELL_ASSET_SPECS), so inlined and siblings can never ship different bytes.
function readInlineChrome() {
  return {
    engine: readFileSync(require.resolve(SHELL_ASSET_SPECS['enscribe.browser.global.js']), 'utf8'),
    defaultCss: readFileSync(require.resolve(SHELL_ASSET_SPECS['default.css']), 'utf8'),
    shellCss: readFileSync(require.resolve(SHELL_ASSET_SPECS['enscribe-shell.css']), 'utf8'),
    displayHead: getInlineDisplayHead(),
    editor: readFileSync(require.resolve(SHELL_ASSET_SPECS['editor-codemirror.js']), 'utf8'),
  };
}

// The asset-delivery values the CLI `--assets` option exposes (delivery-modes.md §"Asset delivery").
const DELIVERY_VALUES = new Set(['siblings', 'cdn', 'inlined']);

/**
 * Discover a master document's `<… src>` structure children — the same `master + its src children`
 * recognition (isMasterSrcEntry) the assembler and the browser live-loader use, so a multi-file
 * document's child sources are copied alongside it. Deduped, document-order. Returns `[]` for a
 * single-file document (the common case today). Shared by buildLiveFolder and docs-live (#207).
 *
 * @param {string} masterSource - the master document's `.emd` source text.
 * @returns {string[]} the child `src` filenames, deduped.
 */
/** The assembler `<… src>` children of an ALREADY-PARSED master tree, deduped, document order. The
 *  per-parsed-tree core (#316/1-E) so buildLiveFolder can reuse its single pass; discoverMasterSrcChildren
 *  wraps it with a parse for external callers. */
function srcChildrenOf(tree) {
  return [...new Set((tree.children ?? []).filter(isMasterSrcEntry).map((n) => n.kwargs.src))];
}

export function discoverMasterSrcChildren(masterSource) {
  return srcChildrenOf(buildEnscribePipeline({}).parse(masterSource));
}

/** The external page `src`s of a website nav model (descending `<nav-group>`s), deduped, document order.
 *  The per-nav-model core (#316/1-E), reused by buildLiveFolder's single pass. */
function collectWebsitePageSrcs(navModel) {
  const srcs = [];
  const walk = (entries) => {
    for (const e of entries ?? []) {
      if (e.kind === 'group') walk(e.children);
      else if (e.kind === 'page' && e.src) srcs.push(e.src);
    }
  };
  walk((navModel ?? { entries: [] }).entries);
  return [...new Set(srcs)];
}

/**
 * Discover a WEBSITE master's pages (#223 / #246). A website's pages are `<item src>` entries nested
 * inside `<nav>` — NOT assembler children (MASTER_SRC_TAGS excludes `<item>`), so discoverMasterSrcChildren
 * returns `[]` for a website and the live folder would 404 on every page fetch. The pages live in the nav
 * model: run the website pipeline once and read the external page srcs (descending `<nav-group>`s) — the
 * SAME set mountLiveWebsite fetches at runtime, so the folder ships exactly the pages the shell requests.
 * Deduped, document order.
 *
 * @param {string} masterSource - the website master's `.emd` source text.
 * @returns {string[]} the external page `src` filenames, deduped.
 */
export function discoverWebsitePages(masterSource) {
  const proc = buildEnscribePipeline({});
  const file = { data: {} };
  proc.runSync(proc.parse(masterSource), file);
  return collectWebsitePageSrcs(file.data[ENSCRIBE_NAV_MODEL]);
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
 * @param {'siblings'|'cdn'|'inlined'} [opts.delivery='siblings'] - the chrome asset-delivery mode
 *   (#363/#364; delivery-modes.md §"Asset delivery"). `siblings` (default) copies the four chrome assets
 *   flat and references them; `cdn` copies none and references the pinned jsDelivr package; `inlined`
 *   embeds engine + CSS + display assets + the editor in the shell (copying NO chrome), so the served
 *   folder needs no network. The document `.emd` content is copied flat in every mode (it is fetched).
 * @returns {{ outDir: string, master: string, children: string[], assets: string[], delivery: string }}
 */
export function buildLiveFolder({ master, outDir, title, edit = false, delivery = 'siblings', headExtra = '' }) {
  if (!DELIVERY_VALUES.has(delivery)) {
    throw new Error(`buildLiveFolder: unknown asset delivery "${delivery}" (expected siblings | cdn | inlined)`);
  }
  const masterPath = resolve(master);
  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  const masterName = basename(masterPath);
  const masterDir = dirname(masterPath);

  // Copy `srcPath` into the folder as `name`, skipping a self-copy (the source may already be there,
  // e.g. when building in place over a committed example folder).
  const copyInto = (srcPath, name) => {
    const dest = join(out, name);
    if (resolve(srcPath) !== dest) {
      mkdirSync(dirname(dest), { recursive: true });   // a website page may sit in a subdir (sources/…); flat for book/article (no-op)
      copyFileSync(srcPath, dest);
    }
  };

  // 1. the master + its children — so the folder is self-standing (the shell fetches them). A website's
  //    pages are NOT assembler children (`<item>` is excluded from MASTER_SRC_TAGS); discover them from
  //    the nav model instead (#223/#246), so the folder ships every page the shell will fetch. Book and
  //    article masters keep the assembler child set — byte-identical.
  //
  //    ONE structuring pass (#316/1-E): parse the master ONCE and derive BOTH the website decision and
  //    the page/child set from it (the discovery helpers each re-parse, for external callers). A website
  //    needs the structuring runSync (its pages live in the nav model on file.data); a book/article needs
  //    only the parse (its children are `<… src>` nodes in the parsed tree).
  const masterSource = readFileSync(masterPath, 'utf8');
  copyInto(masterPath, masterName);
  const proc = buildEnscribePipeline({});
  const tree = proc.parse(masterSource);
  const isWebsite = classifyDocType(tree).type === 'website';
  let children;
  if (isWebsite) {
    const file = { data: {} };
    proc.runSync(tree, file);
    children = collectWebsitePageSrcs(file.data[ENSCRIBE_NAV_MODEL]);
  } else {
    children = srcChildrenOf(tree);
  }
  for (const src of children) {
    // #286: a website nav `<item src>` may resolve to a PAGE-DIRECTORY (src="home" → its body
    // home/index.emd, the #278 page-body model). Map it to its entry FILE via the SAME resolver the
    // static build uses (resolvePageSource — one shared resolver, not a fork) so copyFileSync gets a
    // file, not a directory (the EISDIR crash, #286). The dest stays `src`: the live shell fetches each
    // page by its raw src (fetchSourceText(p.src) — no /index.emd fallback), so the body must be served
    // at exactly that path. Book/article children are always flat `.emd` files, so they skip the resolver
    // and copy as before (byte-identical). An unresolvable website page is skipped (warn), not a crash.
    const resolved = isWebsite ? resolvePageSource(masterDir, src) : null;
    if (isWebsite && !resolved) {
      console.warn(`enscribe build (--live): nav item src "${src}" did not resolve to a .emd or page-directory — skipped`);
      continue;
    }
    const pageSourcePath = resolved ? resolved.sourcePath : join(masterDir, src);
    // #331: a WEBSITE page is deployed in its OWN directory — the master at `<src>/index.emd`, its book
    // children BESIDE it at `<src>/<childSrc>` — so two books' same-named chapters (frameables.emd, code.emd,
    // …) no longer collide last-wins in a single flat namespace and serve the WRONG book's content. At runtime
    // the live shell fetches the page master at `<src>/index.emd` and resolves a book page's children
    // MASTER-RELATIVE (`new URL(childSrc, masterUrl)` → `<src>/<childSrc>`): deploy + runtime express the ONE
    // rule "children are master-relative" — the same `new URL(rel, base)` everywhere, no fetch fork (browser.js
    // eager pre-fetch). Uniform across page TYPES: an article page is deployed at `<src>/index.emd` too (it just
    // has no children). The standalone book/article folder (the non-website `else` path) keeps its flat layout —
    // its children already sit beside their own master, no cross-page collision.
    const pageDest = isWebsite ? join(src, 'index.emd') : src;
    copyInto(pageSourcePath, pageDest);

    // A website PAGE may itself be a MULTI-FILE master — a book (`<meta type=book>` with `<chapter src>` /
    // `<appendix src>` children). Those children are NOT website pages, so collectWebsitePageSrcs never sees
    // them; without this they 404. Copy each child BESIDE the page master, under the page's own dir, so the
    // master-relative runtime fetch finds it there (and two books' same-named children stay distinct). Reuses
    // `srcChildrenOf` — the SAME child-source discovery the standalone-book path (the `else` branch) uses.
    if (isWebsite) {
      for (const childSrc of srcChildrenOf(proc.parse(readFileSync(pageSourcePath, 'utf8')))) {
        copyInto(join(resolved.pageDir, childSrc), join(src, childSrc));
      }

      // #352: co-located page assets (figure images, data files) are deployed PER-FOLDER under the page's
      // own `<src>/` — mirroring the static tree AND the source, NOT flattened to the outDir root. A
      // `<fig src=elephant.jpg>` renders `<img src="elephant.jpg">`, which the live SPA now resolves against
      // the page's `<src>/` (browser.js `resolveWebsitePageAssets`), so the per-folder copy is exactly where
      // it looks. This keeps two books' same-named DISTINCT assets distinct (retiring the last-wins flatten
      // collision) and holds live≡static parity on the terms render-parity.md states (display number +
      // scheme-normalized owner, never the raw href). pageDirAssets with destPrefix=`${src}/` yields the
      // per-folder names.
      for (const { from, to } of pageDirAssets(resolved.pageDir, masterDir, `${src}/`)) {
        copyInto(from, to);
      }
    }
  }

  // 2. the chrome assets, per the delivery mode (#363/#364). `siblings` copies all four flat; `cdn`
  //    copies none (the shell references the pinned jsDelivr package); `inlined` copies ONLY the editor
  //    sibling (engine + CSS + display are inlined into the shell). The document `.emd` content copied
  //    above is unchanged — every mode fetches it; delivery is about the chrome only.
  let copiedAssets;                 // the chrome filenames written into the folder (informational)
  let shellAssetOpts;               // the emitLiveShell asset options for this delivery
  if (delivery === 'cdn') {
    copiedAssets = [];
    shellAssetOpts = { assets: SINGLE_FILE_ASSETS };
  } else if (delivery === 'inlined') {
    copiedAssets = [];              // #365: engine + CSS + editor all inlined into the shell — copy no chrome
    shellAssetOpts = { assetBase: './', inline: readInlineChrome() };
  } else {                          // siblings (the deployed default)
    copiedAssets = copyShellAssets(out);
    shellAssetOpts = { assetBase: './' };
  }

  // 3. the emitted live shell. Title default (#228): explicit `title` → the document's own `<title>` →
  //    the filename. The delivery-specific asset options select siblings / cdn / inlined.
  const shellTitle = title ?? (extractDocumentTitle(masterSource) || masterName);
  writeFileSync(
    join(out, 'index.html'),
    emitLiveShell({ master: masterName, title: shellTitle, edit, headExtra, ...shellAssetOpts }),
    'utf8',
  );

  return { outDir: out, master: masterName, children, assets: copiedAssets, delivery };
}

// #313 slice 4 — binary packaging: embed a single file's EXTERNAL referenced assets into its source so
// the one file is truly self-contained (renders the assets when opened from anywhere, no dangling path).
// EMBEDDED assets (`<fig #id fmt>base64</fig>`) and `<dataset>`s already travel — they are base64/text
// INSIDE the .emd source. The gap is EXTERNAL file references; we close it as a parse-guided SOURCE edit
// (the engine re-parses the edited source at mount — no serialize-then-reparse; the round-trip invariant,
// data-store.md Piece 3), reusing the EXISTING rendering paths (no new format):
//   - `<fig src="local.png">`   → swap the src VALUE to a `data:<mime>;base64,…` URI (the same data: URI
//     an embedded asset resolves to; the fig handler emits it as an <img> verbatim).
//   - `<table fmt src="local.csv"/>` → rewrite to inline long-form `<table fmt>…bytes…</table>` (the same
//     inline-data path `<table fmt | …>` uses; long-form is `>`-safe where the pipe form is not).
// The asset BYTES stay opaque (base64 / verbatim text), read at build (the build has fs access). A `@id`
// ref / a `data:` URI / an http(s) URL / a missing file is left untouched (already portable, or warned).

// Image extension → MIME for the embedded `data:` URI. External figs are format-agnostic by path, so we
// map by extension (a superset of the embedded-asset FORMAT_MIME, since a data: URI can carry any type).
const IMG_EXT_MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.bmp': 'image/bmp',
};

/** A `src` that names a LOCAL FILE to embed: not an `@id` store ref, not an already-inline `data:` URI,
 *  not an http(s)/protocol/absolute-network URL (those resolve from the web anywhere — already portable). */
function isLocalAssetSrc(src) {
  return typeof src === 'string' && src.length > 0
    && !src.startsWith('@') && !src.startsWith('data:')
    && !/^[a-z][a-z0-9+.-]*:\/\//i.test(src) && !src.startsWith('//');
}

/** Build a regex matching the `src=` attribute (optionally quoted) for an exact path value. */
function srcAttrRegex(path) {
  const esc = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(\\bsrc\\s*=\\s*)(["'])?${esc}\\2?`);
}

/**
 * Embed a document's external referenced assets INTO its `.emd` source, returning the rewritten source +
 * a count. Parse-guided: each external `<fig|figure src>` / `<table src>` body use-site is found in the
 * (bare-parsed) `tree` with its exact source span (so references inside opaque `<code>` examples — which
 * are not parsed nodes — are never touched), its bytes are read relative to `masterDir`, and the source
 * span is rewritten in place (edits applied back-to-front so offsets stay valid).
 *
 * @param {string} source - the master `.emd` source
 * @param {object} tree - the bare-parsed master (proc.parse) — body fig/table are nodes with positions
 * @param {string} masterDir - directory the external paths resolve against
 * @param {(msg:string)=>void} warn
 * @returns {{ source: string, embedded: number }}
 */
function embedExternalAssets(source, tree, masterDir, warn) {
  const edits = [];   // { start, end, newText }

  const visit = (nodes) => {
    for (const n of nodes ?? []) {
      if (!n || typeof n !== 'object') continue;
      const tag = n.tagname;
      const src = n.kwargs?.src;
      if ((tag === 'fig' || tag === 'figure' || tag === 'table') && isLocalAssetSrc(src) && n.position) {
        const start = n.position.start.offset;
        const end = n.position.end.offset;
        const span = source.slice(start, end);
        const abs = resolve(masterDir, src);
        try {
          if (tag === 'table') {
            // A table needs INLINE data (the handler reads node.content). Rewrite the self-closing
            // external table to long-form inline: drop the src attribute, turn `/>` into `>bytes</table>`.
            if (!n.selfClosing && !/\/>\s*$/.test(span)) {
              warn(`enscribe build (--single-file): <table src="${src}"> is not self-closing — not embedded (inline its data, or use a self-closing <table … src="…" />). Left as a path.`);
              continue;
            }
            const bytes = readFileSync(abs, 'utf8');
            const opening = span.replace(srcAttrRegex(src), '').replace(/\s*\/>\s*$/, '>');
            // Long-form opaque content begins on the line AFTER the opening `>`, so newline-sandwich the
            // bytes: `<table fmt>\n<bytes>\n</table>`. The CSV/TSV/… parser ignores the framing newlines.
            edits.push({ start, end, newText: `${opening}\n${bytes}${bytes.endsWith('\n') ? '' : '\n'}</table>` });
          } else {
            // A fig embeds as a data: URI in its src (the same form an embedded asset resolves to).
            const mime = IMG_EXT_MIME[extname(src).toLowerCase()];
            if (!mime) {
              warn(`enscribe build (--single-file): <fig src="${src}"> has an unrecognized image extension — not embedded. Left as a path.`);
              continue;
            }
            const b64 = readFileSync(abs).toString('base64');
            edits.push({ start, end, newText: span.replace(srcAttrRegex(src), `$1"data:${mime};base64,${b64}"`) });
          }
        } catch (err) {
          warn(`enscribe build (--single-file): could not read external asset "${src}" (${err.message}) — left as a path (it will dangle if the file moves).`);
          continue;
        }
      }
      if (Array.isArray(n.content)) visit(n.content);
      if (Array.isArray(n.children)) visit(n.children);
    }
  };
  visit(tree.children ?? []);

  if (edits.length === 0) return { source, embedded: 0 };
  edits.sort((a, b) => b.start - a.start);   // back-to-front: earlier offsets stay valid as we splice
  let out = source;
  for (const e of edits) out = out.slice(0, e.start) + e.newText + out.slice(e.end);
  return { source: out, embedded: edits.length };
}

/**
 * Build a SINGLE self-contained HTML file for ONE document (delivery-modes.md §Single-file): read the
 * master `.emd`, embed its EXTERNAL referenced assets into the source (#313 slice 4), EMBED that source in
 * the file (a `<template>` the engine reads at mount via `mountLiveDocument`), and reference the
 * chrome/display assets from the web. The file renders with no fetch of the document AND no fetch of its
 * assets — one truly self-contained file. No sibling assets, no sources folder.
 *
 * EDITABILITY GATE (scope C): the document is editable IFF it is self-contained — no `<… src>` structure
 * children (article/book) AND not a multi-page website (whose `<item src>` pages are external). A
 * non-self-contained master is emitted READ-ONLY (its children/pages are NOT embedded — single document,
 * scope B; site-in-a-file is a follow-on) and a warning is issued. The same `srcChildrenOf` /
 * `discoverWebsitePages` signals the served build and the browser live-loader use.
 *
 * @param {object} opts
 * @param {string} opts.master - path to the master `.emd`.
 * @param {string} [opts.title] - the page <title>. Order: explicit → the document's `<title>` → filename.
 * @param {boolean} [opts.edit=false] - default the editable file to the editor (`?edit` always works).
 * @param {string} [opts.assetBase] - override the web asset base (default: jsDelivr; see emit-shell.js).
 * @param {'cdn'|'inlined'} [opts.delivery='cdn'] - the chrome asset-delivery mode (#363/#364). `cdn`
 *   (default) references the pinned jsDelivr package; `inlined` embeds engine + CSS + display assets in
 *   the file so it opens from `file://` with NO network at all. `siblings` is invalid for a single file
 *   (there are no siblings) and throws.
 * @param {(msg:string)=>void} [opts.warn=console.warn] - warning sink (the CLI silences it under --quiet).
 * @returns {{ html: string, master: string, editable: boolean, childSrcs: string[], websitePages: string[], type: string, embeddedAssets: number, delivery: string }}
 */
export function buildSingleFile({ master, title, edit = false, assetBase, delivery = 'cdn', warn = (m) => console.warn(m) }) {
  if (delivery === 'siblings') {
    throw new Error('buildSingleFile: --assets siblings is invalid for a single file (it has no siblings); use cdn or inlined');
  }
  if (!DELIVERY_VALUES.has(delivery)) {
    throw new Error(`buildSingleFile: unknown asset delivery "${delivery}" (expected cdn | inlined)`);
  }
  const masterPath = resolve(master);
  const masterName = basename(masterPath);
  const masterDir = dirname(masterPath);
  const masterSource = readFileSync(masterPath, 'utf8');

  // One structuring read: parse once, derive type + the external-source signals from it.
  const proc = buildEnscribePipeline({});
  const tree = proc.parse(masterSource);
  const type = classifyDocType(tree).type;
  const childSrcs = srcChildrenOf(tree);
  const websitePages = type === 'website' ? discoverWebsitePages(masterSource) : [];
  // Editability is about `<… src>` STRUCTURE children (article/book/website pages), NOT asset references —
  // computed from the parsed tree, BEFORE embedding assets, so embedding external assets (a fig/table
  // `src` is not a structure child) never changes the classification (#313 slice 4).
  const editable = childSrcs.length === 0 && websitePages.length === 0;

  if (!editable) {
    if (websitePages.length > 0) {
      warn(`enscribe build (--single-file): "${masterName}" is a website with ${websitePages.length} external page(s) — a single self-contained file carries ONE document, not a site (site-in-a-file is a follow-on). Emitting READ-ONLY; the pages load from the web at render, and editing is disabled.`);
    } else {
      warn(`enscribe build (--single-file): "${masterName}" pulls in ${childSrcs.length} external <… src> child(ren), which are NOT embedded in a single file. Emitting READ-ONLY; the children load from the web at render, and editing is disabled. For a self-contained single file, inline the children into one document.`);
    }
  }

  // #313 slice 4: embed EXTERNAL referenced assets (external <fig src>/<table src> files) into the source
  // so the one file carries everything (embedded assets + <dataset>s already travel in the source).
  const { source: packagedSource, embedded: embeddedAssets } = embedExternalAssets(masterSource, tree, masterDir, warn);

  const fileTitle = title ?? (extractDocumentTitle(masterSource) || masterName);
  // INLINED delivery (#364): embed the chrome + display bytes so the file needs no network at all.
  const inline = delivery === 'inlined' ? readInlineChrome() : undefined;
  const html = emitSingleFileShell({ source: packagedSource, title: fileTitle, edit, editable, assetBase, inline });
  return { html, master: masterName, editable, childSrcs, websitePages, type, embeddedAssets, delivery };
}
