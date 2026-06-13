// emit-shell params for the master-book DEV fixture shell (#215).
//
// The scattered source-tree asset paths #214 referenced (dist/, src/interpreter/assets/, src/shell/
// are not co-located, so the dev fixture passes explicit per-asset hrefs rather than a flat
// assetBase). Shared by render-fixtures.js (which regenerates master-book/index.html via the
// emitter) and shell-assets.test.js (the fidelity guard) so the committed shell IS the emitter
// output — the last hand-written shell is retired.
export const MASTER_BOOK_SHELL_PARAMS = {
  master: 'master-book.emd',
  title: 'Field Methods in Savanna Ecology — live shell',
  edit: false,
  assets: {
    engine: '../../../dist/enscribe.browser.global.js',
    defaultCss: '../../../src/interpreter/assets/default.css',
    shellCss: '../../../src/shell/enscribe-shell.css',
    editor: '../../../src/shell/editor-codemirror.js',
  },
};
