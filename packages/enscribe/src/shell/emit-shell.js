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
 * @returns {string} the shell HTML.
 */
export function emitLiveShell({ master, title, edit = false, assetBase = './', assets } = {}) {
  if (!master || typeof master !== 'string') {
    throw new Error('emitLiveShell: `master` (the master document filename) is required');
  }
  const a = resolveShellAssets(assetBase, assets);
  const pageTitle = title ?? master;
  const editAttr = edit ? ' data-enscribe-edit' : '';
  const masterLiteral = master.replace(/'/g, "\\'");   // safe single-quoted JS string literal

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>

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
  // The default editor adapter ships with the package (CodeMirror loaded host-side, only when
  // editing is on — importing this module loads nothing). A host could pass its own factory.
  import { codeMirrorEditorFactory } from '${a.editor}';

  // The #213 host switch: \`?edit\` flips it at runtime; otherwise the \`data-enscribe-edit\` on the
  // mount <div> decides (default: read). The engine is unchanged.
  const opts = { editorFactory: codeMirrorEditorFactory };
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
