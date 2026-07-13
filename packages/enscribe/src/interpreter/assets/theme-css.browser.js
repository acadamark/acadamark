// Theme CSS — browser (bundle) variant.
//
// package.json's "browser" field maps ./theme-css.js → this file when tsup builds the browser bundle,
// so the bundle never reaches the fs-based getter in the Node variant (which THREW in-bundle — the C4
// crash: a live `<config theme=tufte>` document died in getThemeCss). This file is ONLY processed by
// the bundler; Node never loads it, which is what makes the bare identifier below safe.
//
// __ENSCRIBE_THEME_CSS__ is NOT a real variable — it is an esbuild `define` substitution point.
// tsup.config.js reads the themes/ dir at build time and passes the `{ name: bytes }` map as
// define:{ __ENSCRIBE_THEME_CSS__: <json> }, so esbuild replaces the identifier with an object literal
// at parse time. KNOWN_THEMES is derived from that map's keys, so "listed in the picker" ⟺ "deliverable
// client-side" by construction — and since the map is a build-time readdir of themes/, it shares the
// exact authority config-discovery.test.js already guards. `define` (not an import) for the same reason
// hover-preview-assets.browser.js does: tsup's CSS pipeline hijacks any import specifier containing the
// "css" substring, so an import-based theme .css delivers empty. `define` has no specifier to intercept.

/* global __ENSCRIBE_THEME_CSS__ */

const THEME_CSS = __ENSCRIBE_THEME_CSS__;

export const KNOWN_THEMES = new Set(Object.keys(THEME_CSS));

export function getThemeCss(name) {
  return THEME_CSS[name];
}
