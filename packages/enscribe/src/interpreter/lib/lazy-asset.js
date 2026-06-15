// createLazyAsset — the one memoize shape the compiler's asset loaders all repeat:
// `let _x = null; if (_x === null) _x = compute(); return _x;` (read a CSS/JS/dir once,
// on first use, then cache). Extracted (audit F7) so the dozen loaders across index.js,
// font-loader.js, and hover-preview-assets.js share one accessor instead of hand-writing
// the cache each time. Behaviour-identical: the loader runs once on the first call and the
// result is returned thereafter (a null/empty result is not cached — same as the originals,
// which re-ran while `_x === null`; in practice every loader returns a non-empty value).
export function createLazyAsset(loader) {
  let value = null;
  return () => (value === null ? (value = loader()) : value);
}
