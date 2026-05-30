// tsup configuration for the acadamark browser library (Phase 14 Slice 1).
//
// Bundles src/browser.js (the render/renderInto façade) into a self-contained
// browser library, ESM + IIFE. Two mechanisms do the load-bearing work:
//
//   1. nodeBuiltinStubs (esbuild plugin) — our server-only code paths (table
//      src=, library src=, DSL live-inline/static, inline font/KaTeX embedding)
//      import node:fs/url/path/module at module top level, but under the browser
//      façade's defaults none of those code paths execute. esbuild
//      (platform:'browser') would error on unresolved built-ins, so we resolve
//      them to a virtual stub whose members throw if ever called. "Never called"
//      is the design invariant; the throw is a loud backstop if that invariant is
//      ever violated.
//
//   2. esbuild `define` for the hover-preview assets — acadamark's own
//      hover-preview.css/.js have no CDN, so even hoverPreviewMode:'link' must
//      inline them. The browser variant of the asset module
//      (src/assets/hover-preview-assets.browser.js, swapped in via package.json's
//      "browser" field) references two bare identifiers,
//      __ACADAMARK_HOVER_PREVIEW_CSS__ / __ACADAMARK_HOVER_PREVIEW_JS__; the
//      `define` map below substitutes each with the file's bytes as a string
//      literal at parse time.
//
//      Why `define` rather than a text-loader plugin (the obvious approach, and
//      the spec's preferred "bundle as strings"): tsup ships a built-in CSS
//      pipeline whose onResolve claims any import specifier CONTAINING the "css"
//      substring — not the `.css` suffix, the bare substring — at the resolve
//      stage, before user plugins run, and through every indirection tried (a
//      real ./hover-preview.css import, a private-namespace onResolve, a
//      .css→text loader-map override, a ?inline query suffix, and even a virtual
//      `acadamark:hover-preview-css` specifier — all five verified to fail, the
//      asset coming out empty with a stray dist stylesheet emitted). The tell was
//      the asymmetry: the -js half of the identical plugin worked, the -css half
//      didn't, because only the latter's specifier contained "css". `define`
//      sidesteps the resolve pipeline entirely — there is no import specifier for
//      tsup to intercept, only an identifier substituted with a string literal.
//      Structurally immune, not merely working-for-now.
//
// jsdom / mermaid / abcjs are NOT statically imported anywhere reachable here —
// node-assets.js resolves them at runtime via import.meta.resolve / createRequire,
// which esbuild does not follow — so those multi-megabyte packages stay out of the
// bundle. citation-js IS bundled (ratified Decision 1): it powers <library>/<cite>
// parsing, which must work client-side.

import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Read the hover-preview asset bytes at config-eval time so `define` can inline
// them (see header). The assets live beside their getter module in src/assets/,
// resolved relative to this config file's own directory.
const assetsDir = join(dirname(fileURLToPath(import.meta.url)), 'src', 'assets');
const hoverPreviewCss = readFileSync(join(assetsDir, 'hover-preview.css'), 'utf8');
const hoverPreviewJs = readFileSync(join(assetsDir, 'hover-preview.js'), 'utf8');

const nodeBuiltinStubs = {
  name: 'acadamark-node-builtin-stubs',
  setup(build) {
    build.onResolve({ filter: /^(node:)?(fs|path|url|module)$/ }, (args) => ({
      path: args.path,
      namespace: 'node-stub',
    }));
    build.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => ({
      contents: [
        'const u = (n) => () => {',
        '  throw new Error(n + " is not available in the acadamark browser bundle");',
        '};',
        'export const readFileSync = u("fs.readFileSync");',
        'export const fileURLToPath = u("url.fileURLToPath");',
        'export const dirname = u("path.dirname");',
        'export const join = u("path.join");',
        'export const resolve = u("path.resolve");',
        'export const createRequire = u("module.createRequire");',
        'export default {};',
      ].join('\n'),
      loader: 'js',
    }));
  },
};

export default defineConfig({
  entry: { 'acadamark.browser': 'src/browser.js' },
  format: ['esm', 'iife'],
  globalName: 'acadamark',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: true,
  clean: true,
  // dts deferred until the bundle itself is verified (added in a follow-up build).
  define: {
    __ACADAMARK_HOVER_PREVIEW_CSS__: JSON.stringify(hoverPreviewCss),
    __ACADAMARK_HOVER_PREVIEW_JS__: JSON.stringify(hoverPreviewJs),
  },
  esbuildPlugins: [nodeBuiltinStubs],
  esbuildOptions(options) {
    // Silence the `empty-import-meta` warning class for the IIFE build only-by-
    // effect. Every import.meta.resolve / import.meta.url in the graph sits in an
    // inline-embed or live-inline code path (getKatexCss, the Tippy/Popper
    // getters, the DSL bundle loaders, font dir resolvers) that the browser
    // façade's defaults (katexCss/documentFontsCss 'link', hoverPreviewMode
    // 'link', dslMode 'live-link') never call. import.meta being empty in IIFE is
    // therefore unreachable, not a latent bug. Scoped to this one known class so a
    // genuinely new warning still surfaces.
    options.logOverride = { ...options.logOverride, 'empty-import-meta': 'silent' };
  },
});
