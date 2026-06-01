// Hover-preview assets — browser (bundle) variant.
//
// package.json's "browser" field maps ./hover-preview-assets.js → this file when
// tsup builds src/browser.js, so the bundle never reaches the fs-based getters in
// the Node variant. This file is ONLY ever processed by the bundler; Node never
// loads it — which is what makes the bare identifiers below safe (see next).
//
// The two identifiers __ENSCRIBE_HOVER_PREVIEW_CSS__ / __ENSCRIBE_HOVER_PREVIEW_JS__
// are NOT real variables — they are esbuild `define` substitution points.
// tsup.config.js reads hover-preview.css/.js at build time and passes them as
// define:{ __ENSCRIBE_HOVER_PREVIEW_CSS__: <json string>, ... }, so esbuild
// replaces each identifier with the asset's bytes as a string literal at parse
// time. The getters then just return the inlined constant — same API as the Node
// variant, so index.js is agnostic to which one it imports.
//
// Why define and not an import (the spec's preferred "bundle as strings" text
// loader): tsup's built-in CSS pipeline claims any import specifier containing the
// "css" substring at the resolve stage — before user plugins — so an import-based
// path delivers the CSS empty (the -js half worked, the -css half didn't; five
// import variants were verified to fail). `define` has no import specifier for
// tsup to intercept, so it is structurally immune. Full rationale lives in
// tsup.config.js's header.
//
// enscribe-core.md's "bundled-asset alternative" for a server-only path,
// realized for the browser side (Phase 14 Slice 1).

/* global __ENSCRIBE_HOVER_PREVIEW_CSS__, __ENSCRIBE_HOVER_PREVIEW_JS__ */

export function getHoverPreviewCss() {
  return __ENSCRIBE_HOVER_PREVIEW_CSS__;
}

export function getHoverPreviewJs() {
  return __ENSCRIBE_HOVER_PREVIEW_JS__;
}
