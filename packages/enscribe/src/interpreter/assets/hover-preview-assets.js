// Hover-preview assets — Node (server/build) variant.
//
// enscribe's own hover-preview CSS/JS are LOCAL assets (no CDN counterpart),
// unlike Tippy/Popper (third-party, CDN-served). So even hoverPreviewMode:'link'
// must inline these two files: 'link' only moves the third-party libraries to a
// CDN; there is nowhere to link enscribe's own hover styles/script from.
//
// That makes these two getters the ONE remaining fs read on the browser façade's
// default code path (every other inline/embed getter is uncalled under browser
// defaults). To keep the bundle browser-safe, package.json's "browser" field
// swaps this module for ./hover-preview-assets.browser.js, whose getters return
// strings inlined at build time by the tsup text loader (see tsup.config.js).
// Same getter API on both sides, so index.js imports one name and stays agnostic.
//
// This is core.md's sanctioned "bundled-asset alternative" for a
// server-only path (Phase 14 Slice 1). The .css/.js live in this same directory
// (src/assets/), so they are read as siblings here and imported as siblings in
// the browser variant.

// Node built-ins for the server/build path. This module is swapped out of the
// browser bundle entirely (package.json "browser" field → the .browser.js
// variant), so these never reach the bundle; tsup also aliases both the node: and
// bare forms to a throwing stub for any module that does. See tsup.config.js.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Deferred into an accessor (not computed at module load) so this file's mere
// import is side-effect-free; the fs read happens only when a document actually
// contains notes/refs/citations and hover assets are requested.
let _assetsDirCache = null;
function assetsDir() {
  if (_assetsDirCache === null) {
    _assetsDirCache = dirname(fileURLToPath(import.meta.url));
  }
  return _assetsDirCache;
}

let _hoverPreviewCss = null;
export function getHoverPreviewCss() {
  if (_hoverPreviewCss === null) {
    _hoverPreviewCss = readFileSync(join(assetsDir(), 'hover-preview.css'), 'utf8');
  }
  return _hoverPreviewCss;
}

let _hoverPreviewJs = null;
export function getHoverPreviewJs() {
  if (_hoverPreviewJs === null) {
    _hoverPreviewJs = readFileSync(join(assetsDir(), 'hover-preview.js'), 'utf8');
  }
  return _hoverPreviewJs;
}
