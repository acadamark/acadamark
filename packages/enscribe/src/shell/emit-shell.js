// Live shell emitter (#215).
//
// The inverse of #214's hand-written shell: a PURE function (params → shell HTML string, no I/O)
// that GENERATES the minimal live shell for any master — book OR article. The author bits are parameters —
// `master` filename, `title`, the `edit` switch (#213) — and `assetBase`/`assets` say where the
// shell finds the package plumbing it REFERENCES (the engine bundle, default.css, the shell chrome
// CSS, the default editor module). It's what the build helper, docs-live, and `serve` all call.
//
// `assetBase` makes deployment work. A DEPLOYED folder copies the four assets flat alongside the
// shell → `assetBase: './'`. The DEV fixture references the (scattered) source tree directly —
// dist/, src/interpreter/assets/, src/shell/ aren't co-located, so it passes the four hrefs via
// `assets` instead. The CodeMirror-from-CDN load lives inside the editor factory (a document-display
// CDN concern, #117-deferred); it is not part of `assetBase`.
//
// TYPE-AGNOSTIC (#216): the emitter does NOT read the master — it emits ONE shell that mounts via
// `mountLiveShell`, which fetches the master at runtime, reads `<meta type>`, and dispatches book ↔
// article. So the same emitted shell drives either kind, and a document that changes type never
// needs a re-emit. Staying pure (no emit-time master read) is the point — the dispatch lives in the
// engine, not here.
//
// The delivery-mode model this shell realizes (the Live mode — shell + runtime fetch + the asset
// seam below) is specced in `notes/specs/delivery-modes.md`.

import { escapeHtml } from '../core/escape-html.js';
import { HEAD_ASSET_LINKS } from '../interpreter/assets/font-loader.js';

// Document-display CDN assets (fonts + KaTeX, 'link' form) come from the SINGLE SOURCE HEAD_ASSET_LINKS in
// font-loader.js — the same set the static-website head and the separate-pages page shell link, guarded
// there by a load-time equality assertion against the CDN-URL constants. The live shell used to hardcode
// its OWN copy (#296: a fork cdn-versions.test.js did not guard, so the next KaTeX bump would silently
// drift it); routing it through HEAD_ASSET_LINKS closes the last head-asset copy. (These stay CDN links —
// the #117-deferred asset-mode concern — distinct from the shell chrome `assetBase` covers.)

// The flat deployed layout: the four assets copied next to the shell, referenced `{base}<filename>`.
const FLAT_FILENAMES = {
  engine: 'enscribe.browser.global.js',
  defaultCss: 'default.css',
  shellCss: 'enscribe-shell.css',
  editor: 'editor-codemirror.js',
};

// Single-file mode (delivery-modes.md §Single-file): the chrome assets load FROM THE WEB (the file
// carries only the document content, not the ~3 MB engine). The default is jsDelivr fronting the
// PINNED, PUBLISHED npm package — `@enscribejs/enscribe@0.4.1` — an immutable version, not the moving
// `@main` git ref the stopgap used. jsDelivr serves npm files with the correct MIME
// (`application/javascript` for the engine + editor, `text/css` for the stylesheets), so they execute
// as a `<script>` / import as a module / apply as a stylesheet.
//
// The npm tarball is NOT flat (unlike the deployed `site/live/`): the four assets sit at DIFFERENT
// subpaths under the package root (engine in `dist/`, the others scattered under `src/`). So the
// single-file default is a PER-ASSET map at those real paths — NOT a flat `base + filename` (which
// would 404). Bumping the pinned version is one edit to SINGLE_FILE_CDN_ROOT. Override the whole set
// with emitSingleFileShell's `assetBase` (a flat self-host) or `assets` (per-asset).
export const SINGLE_FILE_CDN_ROOT = 'https://cdn.jsdelivr.net/npm/@enscribejs/enscribe@0.4.1/';

// The four chrome assets at their REAL paths in the pinned tarball (verified non-404, correct MIME).
// These mirror the package `exports`: `./browser-global` → `dist/…`, `./default.css` →
// `src/interpreter/assets/…`, `enscribe-shell.css` via `./shell/*` → `src/shell/…`. The editor is the
// exception: `./shell/editor-codemirror.js` now resolves to the BUNDLED `dist/editor-codemirror.js`
// (CodeMirror inlined), so it points at `dist/…` here too — the raw `src/shell/editor-codemirror.js`
// carries a bare `import('codemirror')` that a browser cannot resolve without an import map. (This
// path is correct for the version that first publishes the bundled editor; bumping the pinned version
// on release is the one edit to SINGLE_FILE_CDN_ROOT, as noted above.)
export const SINGLE_FILE_ASSETS = Object.freeze({
  engine: SINGLE_FILE_CDN_ROOT + 'dist/enscribe.browser.global.js',
  defaultCss: SINGLE_FILE_CDN_ROOT + 'src/interpreter/assets/default.css',
  shellCss: SINGLE_FILE_CDN_ROOT + 'src/shell/enscribe-shell.css',
  editor: SINGLE_FILE_CDN_ROOT + 'dist/editor-codemirror.js',
});

/**
 * Resolve the four asset hrefs the shell references: the engine bundle, default.css, the shell
 * chrome CSS (#214), and the default editor module (#214). Explicit `assets` (the dev fixture's
 * scattered source paths) win; otherwise they are derived flat from `assetBase` (deployed).
 *
 * @param {string} assetBase - prefix for the flat layout (e.g. './').
 * @param {{engine?:string, defaultCss?:string, shellCss?:string, editor?:string}} [assets]
 * @returns {{engine:string, defaultCss:string, shellCss:string, editor:string}}
 */
export function resolveShellAssets(assetBase = './', assets) {
  const base = assetBase.endsWith('/') ? assetBase : assetBase + '/';
  return {
    engine: assets?.engine ?? base + FLAT_FILENAMES.engine,
    defaultCss: assets?.defaultCss ?? base + FLAT_FILENAMES.defaultCss,
    shellCss: assets?.shellCss ?? base + FLAT_FILENAMES.shellCss,
    editor: assets?.editor ?? base + FLAT_FILENAMES.editor,
  };
}

// The INLINED asset-delivery mode (#364; delivery-modes.md §"Asset delivery" → inlined): the chrome
// (engine bundle + default.css + shell CSS) and the document-display assets (fonts + KaTeX, as the
// `getInlineDisplayHead()` <style> pair) are EMBEDDED in the shell rather than referenced, so the
// artifact needs no network for its chrome. The bytes are passed IN (this module stays pure/no-I/O,
// like website-shell.js's `defaultCss`); the CLI build (build-live.js) reads them. `inline` shape:
// `{ engine, defaultCss, shellCss, displayHead[, editor] }` — `editor` (bundled editor bytes) is the
// #365 inlined-editor add; absent here, the editor rides its href delivery (sibling / CDN).

// Inline an IIFE/classic script's bytes into a <script> element, neutralizing any literal `</script`
// (which would prematurely terminate the element) as `<\/script` — valid inside a JS string, inert as
// code: the standard safe-inline transform. The engine bundle is IIFE and must run in GLOBAL scope so
// its `globalName` assignment reaches `window.enscribe`, hence a classic <script>, not a module.
function inlineScriptTag(js) {
  return `<script>${String(js).replace(/<\/(script)/gi, '<\\/$1')}</script>`;
}

// The document-display + chrome head as inline <style> — the inlined counterpart of the href head
// (two <link>s + HEAD_ASSET_LINKS). Order matches the href head: default.css, shell CSS, then the
// display <style> pair (fonts, KaTeX) so the cascade is identical.
function inlineHeadAssets(inline) {
  return (
    `<style>\n${inline.defaultCss}\n</style>\n` +
    `<style>\n${inline.shellCss}\n</style>\n` +
    inline.displayHead
  );
}

// The editor-delivery seam (#365): the `editorFactory` JS expression + any inert carrier the shell body
// must also emit, so the editor RIDES the asset-delivery choice like the rest of the chrome:
//   - href (siblings / cdn) — lazily dynamic-import the bundled editor asset by URL.
//   - inlined (`inlineEditorBytes` given) — carry the bundled editor in an escaped <template> and
//     blob-import it lazily on the factory call, so an inlined editable artifact edits with NO network.
// Both preserve the #213 "read mode loads nothing" invariant (the import/blob is created only when the
// factory runs, i.e. editing is on) and the #211 mount(el,{value,onChange})->{destroy()} adapter seam.
// The <template>+`.content.textContent` round-trip is the same robust carrier the .emd source uses:
// HTML-escaping the (minified, </script>-bearing) editor bytes and decoding them back on parse.
function editorDelivery(editorHref, inlineEditorBytes) {
  if (inlineEditorBytes) {
    return {
      editorTemplate: `<template id="enscribe-editor-src">${escapeHtml(inlineEditorBytes)}</template>\n`,
      editorFactoryExpr:
        `() => { const _s = document.getElementById('enscribe-editor-src').content.textContent; ` +
        `const _u = URL.createObjectURL(new Blob([_s], { type: 'text/javascript' })); ` +
        `return import(_u).then((m) => { URL.revokeObjectURL(_u); return m.codeMirrorEditorFactory(); }); }`,
    };
  }
  return {
    editorTemplate: '',
    editorFactoryExpr: `() => import('${editorHref}').then((m) => m.codeMirrorEditorFactory())`,
  };
}

/**
 * Emit the minimal live shell HTML for a master document — book OR article. Pure (no I/O): the type
 * is detected at runtime by `mountLiveShell`, not read here (#216), so one shell drives either kind.
 *
 * @param {object} opts
 * @param {string} opts.master - the master document's filename, fetched relative to the shell
 *   (e.g. `book.emd` or `article.emd`). Required.
 * @param {string} [opts.title] - the page <title> (defaults to the master filename).
 * @param {boolean} [opts.edit=false] - if true, the shell DEFAULTS to the editor by putting
 *   `data-enscribe-edit` on the mount element (#213); `?edit` still flips it at runtime regardless.
 * @param {string} [opts.assetBase='./'] - where the shell finds the package plumbing (flat layout).
 * @param {{engine?,defaultCss?,shellCss?,editor?}} [opts.assets] - explicit per-asset hrefs (dev:
 *   the scattered source tree); overrides `assetBase`.
 * @param {string} [opts.headExtra] - #399: extra raw <head> markup (e.g. favicon links), inserted
 *   verbatim after <title>. The engine stays brand-free — a caller that wants branding (the Enscribe
 *   site build) supplies it; the default emits none, so `enscribe build --live` output is unchanged.
 * @param {{engine:string,defaultCss:string,shellCss:string,displayHead:string,editor?:string}} [opts.inline]
 *   INLINED delivery (#364; delivery-modes.md → inlined): embed the chrome + display assets as BYTES
 *   instead of referencing them, so the shell needs no network for its chrome. When present, engine /
 *   default.css / shell CSS / display head are inlined; the editor rides `assets.editor` (sibling/CDN)
 *   unless `inline.editor` (bundled editor bytes, #365) is given, then it too is inlined. The bytes are
 *   read by the caller (build-live.js) — this module stays pure. The master is still fetched at runtime.
 * @returns {string} the shell HTML.
 */
export function emitLiveShell({ master, title, edit = false, assetBase = './', assets, inline, headExtra = '' } = {}) {
  if (!master || typeof master !== 'string') {
    throw new Error('emitLiveShell: `master` (the master document filename) is required');
  }
  const a = resolveShellAssets(assetBase, assets);
  const pageTitle = title ?? master;
  const editAttr = edit ? ' data-enscribe-edit' : '';
  const masterLiteral = master.replace(/'/g, "\\'");   // safe single-quoted JS string literal

  // INLINED delivery (#364): the chrome + display assets are embedded; the editor rides its href
  // delivery (a.editor) unless `inline.editor` bytes are supplied (#365). The master is still FETCHED.
  if (inline) {
    const { editorTemplate, editorFactoryExpr } = editorDelivery(a.editor, inline.editor);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>${headExtra ? '\n' + headExtra : ''}

<!--
  Generated by emitLiveShell (#215) — INLINED delivery (delivery-modes.md → inlined) for \`${master}\`.
  The engine bundle, chrome CSS, and document-display assets (fonts + KaTeX) are EMBEDDED, so the shell
  needs no network for its chrome. It still FETCHES the master (+ children) at runtime — "inlined"
  removes the CDN chrome dependency, not the content fetch; serve over HTTP. Read by default; \`?edit\`
  or \`data-enscribe-edit\` flips editing. Per #213 the editor loads only when editing is on.
-->
${inlineHeadAssets(inline)}
</head>
<body>
<!-- ${edit ? 'Defaults to the editor (data-enscribe-edit); remove it to read.' : 'Read by default; add `data-enscribe-edit` to default to the editor, or use `?edit`.'} -->
${editorTemplate}<div id="enscribe-book-root"${editAttr}></div>

<!-- The engine bundle (IIFE → window.enscribe), inlined. -->
${inlineScriptTag(inline.engine)}

<script type="module">
  // The default editor adapter (CodeMirror bundled in) is loaded LAZILY — read mode never loads it.
  // documentFontsCss/katexCss 'skip': the display assets are ALREADY inlined in this head (above), so
  // the per-render must NOT re-link them from the CDN — that is what makes the served folder offline.
  // (External-DSL diagram libs — mermaid/abc — are not bundled, so a diagram still loads its lib from
  // the CDN; text + math + fonts are fully offline. See delivery-modes.md.)
  const opts = { editorFactory: ${editorFactoryExpr}, documentFontsCss: 'skip', katexCss: 'skip' };
  if (new URLSearchParams(location.search).has('edit')) opts.edit = true;

  window.enscribe
    .mountLiveShell('#enscribe-book-root', '${masterLiteral}', opts)
    .catch((err) => {
      document.getElementById('enscribe-book-root').textContent = 'Failed to mount the live shell: ' + err.message;
      // eslint-disable-next-line no-console
      console.error(err);
    });
</script>
</body>
</html>
`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>${headExtra ? '\n' + headExtra : ''}

<!--
  Generated by emitLiveShell (#215) — the live shell for \`${master}\`. Read by default; flip editing
  on with \`?edit\` or by adding \`data-enscribe-edit\` to the mount <div>. The package plumbing is
  REFERENCED, not copied: the shell chrome CSS (#214), the default editor adapter (#213/#214), and
  the engine bundle. Per #213 the core engine stays editor-agnostic; CodeMirror is loaded host-side
  only when editing is on. Serve over HTTP. The KaTeX/fonts CDN links are document-display assets.
-->
<link rel="stylesheet" href="${a.defaultCss}">
<link rel="stylesheet" href="${a.shellCss}">
${HEAD_ASSET_LINKS}
</head>
<body>
<!-- ${edit ? 'Defaults to the editor (data-enscribe-edit); remove it to read.' : 'Read by default; add `data-enscribe-edit` to default to the editor, or use `?edit`.'} -->
<div id="enscribe-book-root"${editAttr}></div>

<!-- The engine bundle (IIFE → window.enscribe). -->
<script src="${a.engine}"></script>

<script type="module">
  // The default editor adapter ships with the package with CodeMirror BUNDLED into it. It is loaded
  // LAZILY: the factory dynamically imports the editor asset, so mountLiveShell fetches it only when
  // editing is on — a read-mode page never downloads the (large) bundled CodeMirror asset. A host
  // could pass its own factory.

  // The #213 host switch: \`?edit\` flips it at runtime; otherwise the \`data-enscribe-edit\` on the
  // mount <div> decides (default: read). The engine is unchanged.
  const opts = { editorFactory: () => import('${a.editor}').then((m) => m.codeMirrorEditorFactory()) };
  if (new URLSearchParams(location.search).has('edit')) opts.edit = true;

  window.enscribe
    .mountLiveShell('#enscribe-book-root', '${masterLiteral}', opts)
    .catch((err) => {
      document.getElementById('enscribe-book-root').textContent = 'Failed to mount the live shell: ' + err.message;
      // eslint-disable-next-line no-console
      console.error(err);
    });
</script>
</body>
</html>
`;
}

/**
 * Emit a SINGLE self-contained HTML file for ONE document (delivery-modes.md §Single-file). Unlike
 * `emitLiveShell` (which references a master FETCHED at runtime), this EMBEDS the document's `.emd`
 * source inside the file and mounts it via `mountLiveDocument` — so the file renders with no fetch of
 * the master (assets still load from the web — the pinned npm CDN; see SINGLE_FILE_ASSETS). Pure (no
 * I/O): the caller (the CLI `--single-file` build) supplies the source text + the editability decision.
 *
 * @param {object} opts
 * @param {string} opts.source - the document's `.emd` source text (embedded verbatim). Required.
 * @param {string} [opts.title] - the page <title>.
 * @param {boolean} [opts.edit=false] - default to the editor (only honored when `editable`); `?edit`
 *   flips it at runtime, also only when `editable`.
 * @param {boolean} [opts.editable=true] - whether the document is self-contained (no `<… src>`
 *   children) and therefore editable (gate C). When false the file is render-only (no editor loaded).
 * @param {string} [opts.assetBase] - a FLAT web base (e.g. a self-host) for the four chrome assets;
 *   when omitted the default is the pinned npm CDN per-asset map (SINGLE_FILE_ASSETS), since the npm
 *   package is not flat.
 * @param {{engine?,defaultCss?,shellCss?,editor?}} [opts.assets] - explicit per-asset hrefs (override
 *   individual entries of whichever base applies).
 * @param {{engine:string,defaultCss:string,shellCss:string,displayHead:string,editor?:string}} [opts.inline]
 *   INLINED delivery (#364): embed the chrome + display assets so the file opens from `file://` with NO
 *   network (the source is already embedded). The editor (when `editable`) rides `assets.editor` unless
 *   `inline.editor` (bundled editor bytes, #365) is given. Bytes are read by the caller (build-live.js).
 * @returns {string} the single-file HTML.
 */
export function emitSingleFileShell({ source, title, edit = false, editable = true, assetBase, assets, inline, headExtra = '' } = {}) {
  if (typeof source !== 'string') {
    throw new Error('emitSingleFileShell: `source` (the document .emd text) is required');
  }
  // Default: the pinned npm-CDN per-asset map (the package is not flat). An explicit `assetBase` (a
  // flat self-host layout) routes through resolveShellAssets like the served modes; `assets` overrides
  // individual entries either way.
  const a = assetBase !== undefined
    ? resolveShellAssets(assetBase, assets)
    : { ...SINGLE_FILE_ASSETS, ...assets };
  const pageTitle = title ?? 'enscribe document';

  // INLINED delivery (#364): the whole file is offline — the chrome + display assets are embedded
  // alongside the already-embedded source, so it opens from `file://` with no network. The editor (when
  // editable) rides its href delivery (a.editor) unless `inline.editor` bytes are supplied (#365).
  if (inline) {
    const embeddedSrc = escapeHtml(source);
    const editAttrInline = (editable && edit) ? ' data-enscribe-edit' : '';
    const { editorTemplate, editorFactoryExpr } = editable
      ? editorDelivery(a.editor, inline.editor)
      : { editorTemplate: '', editorFactoryExpr: null };
    // documentFontsCss/katexCss 'skip': the display assets are inlined in the head above, so the render
    // must NOT re-link them from the CDN — that is what makes this file open offline. (External-DSL
    // diagram libs are not bundled, so a diagram still needs the network; text + math + fonts are offline.)
    const editBootstrapInline = editable
      ? `  // Editable (self-contained): the default editor adapter is loaded LAZILY (only when editing is on).\n` +
        `  const opts = { editorFactory: ${editorFactoryExpr}, documentFontsCss: 'skip', katexCss: 'skip' };\n` +
        `  if (new URLSearchParams(location.search).has('edit')) opts.edit = true;`
      : `  // Render-only: external <… src> children are not embedded (one document). Editing is disabled.\n` +
        `  const opts = { documentFontsCss: 'skip', katexCss: 'skip' };`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>${headExtra ? '\n' + headExtra : ''}

<!--
  A SINGLE fully self-contained enscribe document (delivery-modes.md §Single-file, INLINED delivery).
  The document source AND the chrome/display assets (engine, CSS, fonts, KaTeX) are EMBEDDED — the file
  opens and renders with NO network at all (the \`file://\` case). ${editable ? '`?edit` opens Write/Preview over the embedded source.' : 'Render-only (external <… src> children not embedded here).'}
-->
${inlineHeadAssets(inline)}
</head>
<body>
<!-- The embedded document source — read at mount via .content.textContent (entities decoded on parse). -->
<template id="enscribe-source">${embeddedSrc}</template>

${editorTemplate}<div id="enscribe-book-root"${editAttrInline}></div>

<!-- The engine bundle (IIFE → window.enscribe), inlined. -->
${inlineScriptTag(inline.engine)}

<script type="module">
${editBootstrapInline}

  // Read the EMBEDDED source (no fetch of the document) and mount it. mountLiveDocument runs the same
  // <meta type> dispatch + edit switch as the served mountLiveShell, only without the master fetch.
  const source = document.getElementById('enscribe-source').content.textContent;

  window.enscribe
    .mountLiveDocument('#enscribe-book-root', source, opts)
    .catch((err) => {
      document.getElementById('enscribe-book-root').textContent = 'Failed to mount the document: ' + err.message;
      // eslint-disable-next-line no-console
      console.error(err);
    });
</script>
</body>
</html>
`;
  }
  // The carrier: an inert <template> holding the HTML-ESCAPED `.emd`. A <template>'s content is parsed
  // as inert HTML, so the escaped text round-trips — the bootstrap reads `.content.textContent` and the
  // browser has already decoded the entities back to the exact source. This is robust even when the
  // `.emd` contains `</script>`, `<`, or `&` (a raw <script> data block would not decode entities and
  // would terminate early at a literal `</script>`).
  const embedded = escapeHtml(source);
  // Gate C — editable IFF self-contained: a self-contained doc wires the editor + honors `?edit`; a doc
  // WITH `<… src>` children is render-only (its children are not embedded — one document, scope B), so
  // no editor module is loaded and `?edit` is inert.
  const editAttr = (editable && edit) ? ' data-enscribe-edit' : '';
  const editBootstrap = editable
    ? `  // Editable (self-contained): the default editor adapter (CodeMirror bundled in) is loaded LAZILY —
  // the factory dynamically imports the editor asset, so it is fetched only when editing is on.
  // \`?edit\` flips it; the \`data-enscribe-edit\` on the mount <div> is the default.
  const opts = { editorFactory: () => import('${a.editor}').then((m) => m.codeMirrorEditorFactory()) };
  if (new URLSearchParams(location.search).has('edit')) opts.edit = true;`
    : `  // Render-only: this document pulls in external <… src> children, which a single self-contained
  // file does not embed (one document only). Editing is disabled; children load from the web at render.
  const opts = {};`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>${headExtra ? '\n' + headExtra : ''}

<!--
  A SINGLE self-contained enscribe document (delivery-modes.md §Single-file). The document source is
  EMBEDDED below (the <template id="enscribe-source">); the engine reads it from there and renders —
  no fetch of the document. ${editable ? 'Self-contained → editable: `?edit` opens Write/Preview over the embedded source.' : 'Render-only (it pulls in external <… src> children, not embedded here).'}
  The chrome/display assets load from the WEB (jsDelivr by default); the file itself carries no engine.
-->
<link rel="stylesheet" href="${a.defaultCss}">
<link rel="stylesheet" href="${a.shellCss}">
${HEAD_ASSET_LINKS}
</head>
<body>
<!-- The embedded document source — read at mount via .content.textContent (entities decoded on parse). -->
<template id="enscribe-source">${embedded}</template>

<div id="enscribe-book-root"${editAttr}></div>

<!-- The engine bundle (IIFE → window.enscribe), loaded from the web. -->
<script src="${a.engine}"></script>

<script type="module">
${editBootstrap}

  // Read the EMBEDDED source (no fetch of the document) and mount it. mountLiveDocument runs the same
  // <meta type> dispatch + edit switch as the served mountLiveShell, only without the master fetch.
  const source = document.getElementById('enscribe-source').content.textContent;

  window.enscribe
    .mountLiveDocument('#enscribe-book-root', source, opts)
    .catch((err) => {
      document.getElementById('enscribe-book-root').textContent = 'Failed to mount the document: ' + err.message;
      // eslint-disable-next-line no-console
      console.error(err);
    });
</script>
</body>
</html>
`;
}
