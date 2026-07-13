// Theme CSS — Node (server/build) variant.
//
// The bundled themes (modern/compact/tufte) are token-retune (+ small structural) stylesheets layered
// over default.css. On the server/build path this reads them from disk on demand. The browser bundle
// cannot fs-read: getThemeCss used to live inline in index.js and THREW when the bundle called it, so a
// live `<config theme=tufte>` document crashed its client render (the C4 defect, #430/#413). So
// package.json's "browser" field swaps this module for ./theme-css.browser.js, whose getThemeCss
// returns strings inlined at build time by a tsup `define` (see tsup.config.js). Same
// KNOWN_THEMES + getThemeCss API on both sides, so index.js — and the settings panel's theme picker —
// imports one name and stays agnostic. Mirrors the hover-preview-assets.js / .browser.js pair.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The bundled theme names — the picker's list and the injection gate. 'default' is the base
// default.css (no injection), so it is NOT in this set. Kept in step with the themes/ dir and the
// `<config theme=…>` enum by config-discovery.test.js (#401); the browser variant derives the same set
// from the inlined map's keys, so "listed" ⟺ "deliverable client-side" there.
export const KNOWN_THEMES = new Set(['modern', 'compact', 'tufte']);

const _themeCss = new Map();
export function getThemeCss(name) {
  if (!_themeCss.has(name)) {
    const dir = dirname(fileURLToPath(import.meta.url));
    _themeCss.set(name, readFileSync(join(dir, 'themes', `${name}.css`), 'utf8'));
  }
  return _themeCss.get(name);
}
