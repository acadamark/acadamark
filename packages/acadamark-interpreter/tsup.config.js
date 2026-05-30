// tsup configuration for the acadamark browser library (Phase 14 Slice 1;
// node-builtin aliasing made symmetric in Slice 1.5).
//
// Bundles src/browser.js (the render/renderInto façade) into a self-contained
// browser library, ESM + IIFE. Two mechanisms do the load-bearing work:
//
//   1. symmetric node-builtin alias — our server-only code paths (table src=,
//      library src=, DSL live-inline/static, inline font/KaTeX embedding) import
//      fs/url/path/module at module top level, but under the browser façade's
//      defaults none of those code paths execute. esbuild (platform:'browser')
//      would otherwise leave the built-ins as runtime `require()` calls that, in
//      the IIFE form, become a top-level `__require("fs")` and throw the instant
//      the IIFE evaluates — before it can assign `window.acadamark` (the Slice 1
//      defect: the bundle "built" but never loaded in a browser). So esbuild
//      `alias` (in esbuildOptions, below) redirects every built-in specifier to
//      src/assets/node-builtin-stub.js, a real module whose members throw only
//      when CALLED. "Never called" is the design invariant; binding the import is
//      harmless, and the throw is a loud backstop if that invariant is violated.
//
//      The alias covers BOTH specifier forms — `fs` and `node:fs`, `path` and
//      `node:path`, etc. — so src/ may use whichever it likes (modern `node:` is
//      preferred). Making the `node:` form actually reach the alias takes one
//      extra option, `removeNodeProtocol: false` (set below). By default tsup
//      installs a `node-protocol-plugin` whose onResolve claims every
//      `node:`-prefixed specifier and externalizes it — and a plugin onResolve
//      runs BEFORE esbuild consults `alias`, so a `from 'node:fs'` import would
//      slip past the alias and ship as a load-time `__require("fs")` (empirically
//      confirmed in the Slice 1.5 probe: plain symmetric aliasing alone still
//      threw at load). Disabling that plugin lets the `node:` alias keys fire.
//      A consequence worth noting: with the plugin off, a node: built-in that is
//      NOT aliased no longer externalizes silently — esbuild fails the build with
//      "Could not resolve", so a stray new built-in is caught at build time rather
//      than at browser load. The bundle-load smoke test (test/bundle-load.test.js)
//      is the runtime backstop. (Slice 1.5 retired the earlier bare-only
//      convention; appending our own resolve plugin to beat node-protocol-plugin
//      was tried and does not work — tsup rebuilds options.plugins after
//      esbuildOptions, discarding the mutation, though it honors options.alias.)
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

// Absolute path to the node-builtin stub (see header item 1). The esbuild `alias`
// in esbuildOptions redirects every (bare) fs/url/path/module specifier here, so
// the browser bundle resolves — and loads — without a live `__require` of a built-in.
const nodeBuiltinStub = join(assetsDir, 'node-builtin-stub.js');

export default defineConfig({
  entry: { 'acadamark.browser': 'src/browser.js' },
  format: ['esm', 'iife'],
  globalName: 'acadamark',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  sourcemap: true,
  clean: true,
  // Disable tsup's node-protocol-plugin so `node:`-prefixed specifiers are NOT
  // externalized before esbuild consults `alias` — without this, the `node:fs`
  // alias key never fires and a `from 'node:fs'` import ships as a load-time
  // `__require("fs")`. See header item 1.
  removeNodeProtocol: false,
  // dts deferred until the bundle itself is verified (added in a follow-up build).
  define: {
    __ACADAMARK_HOVER_PREVIEW_CSS__: JSON.stringify(hoverPreviewCss),
    __ACADAMARK_HOVER_PREVIEW_JS__: JSON.stringify(hoverPreviewJs),
  },
  esbuildOptions(options) {
    // Resolve the Node built-ins to the throwing stub via esbuild `alias` (see
    // header item 1). Both specifier forms are keyed — bare and `node:`-prefixed —
    // so src/ may import either (`removeNodeProtocol: false` above is what lets the
    // `node:` keys actually fire). Bundled dependencies that import builtins in
    // bare form (e.g. citation-js) are covered by the bare keys.
    options.alias = {
      ...options.alias,
      fs: nodeBuiltinStub,
      'node:fs': nodeBuiltinStub,
      path: nodeBuiltinStub,
      'node:path': nodeBuiltinStub,
      url: nodeBuiltinStub,
      'node:url': nodeBuiltinStub,
      module: nodeBuiltinStub,
      'node:module': nodeBuiltinStub,
    };
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
