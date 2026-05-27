// Apparatus-tag kwarg / child-tag allowlists.
//
// Per the apparatus-tag reconciliation (2026-05-25), <meta> and <config> are
// both authorable in two surface forms:
//
//   - kwarg form:        <meta title="..."> / <config citation-style="apa">
//   - child-tag form:    <meta><title>...</title></meta> / <config><citation-style>...</citation-style></config>
//
// The Layer 1 canonical shape is the child-tag form. The normalize-to-canonical
// gate lifts the kwarg form into the canonical child-tag shape using these
// allowlists; unknown keys are dropped from the lift with an informative
// diagnostic.
//
// Allowlists live here (shared between the lift gate, the misuse-feedback
// check, and the discovery plugins) so a new accepted key is added in one
// place. Adding a key here does NOT add the implementation behind it — for
// <config> keys, the implementing plugin must consume the value. The
// per-key implementation status is documented in CONFIG_KWARGS below.

/**
 * <meta> allowlist — descriptive document metadata.
 *
 * Per the apparatus-tag reconciliation ruling: this is the complete <meta>
 * key set. `author` is FLAT (single value, not a structured author-object);
 * structured author data is attempted at the JATS export boundary, not
 * carried in the authoring surface. `abstract` is deliberately NOT here —
 * the abstract is its own tag (<abstract>); the missing <abstract>
 * vocabulary entry is filed as a separate item.
 */
export const META_KWARGS = new Set([
  'title',
  'subtitle',
  'author',
  'date',
  'doi',
  'license',
  'lang',
  'version',
  'keywords',
  // Pre-existing kwarg controlling document type — read by article-structuring
  // / book-structuring. Not lifted to a child tag; stays on <meta> as the
  // structural-routing signal.
  'type',
]);

/**
 * Subset of META_KWARGS that should be lifted from kwarg form to child-tag
 * form. `type` is excluded because it stays as a kwarg (it controls
 * structural routing, not document descriptive content).
 */
export const META_KWARGS_LIFTED = new Set([
  'title', 'subtitle', 'author', 'date', 'doi', 'license', 'lang', 'version', 'keywords',
]);

/**
 * <config> allowlist — processing and display settings.
 *
 * Each entry's value records the implementation status: 'live' (a plugin
 * consumes this setting today), 'reserved' (settled as a future setting,
 * not yet wired). 'reserved' settings are accepted into the config map
 * silently; their consumer can read them when implemented. Adding a key
 * here does NOT implement its behavior.
 */
export const CONFIG_KWARGS = new Map([
  // Live (consumed by current plugins).
  ['citation-style',          'live'],   // cite-resolution.js
  ['number-equations',        'live'],   // numbering.js
  ['number-figures',          'live'],   // numbering.js
  ['number-tables',           'live'],   // numbering.js

  // Reserved — the apparatus-tag reconciliation ruling enumerated these as
  // the intended <config> surface. The implementation per key is future
  // work; the allowlist accepts them so author input is not rejected
  // before the consumer lands. Unlike the live keys, no plugin reads these
  // yet; they sit in the config map awaiting implementation.
  ['theme',                   'reserved'],
  ['display-style',           'reserved'],
  ['note-position',           'reserved'],
  ['bibliography-position',   'reserved'],
  ['reference-library',       'reserved'],
  ['strict-mode',             'reserved'],
]);

/**
 * Wildcard <config> kwarg prefixes — `ref-prefix-eqn`, `ref-prefix-fig`,
 * etc. Any kwarg starting with one of these prefixes is accepted (live;
 * consumed by ref-resolution.js).
 */
export const CONFIG_KWARG_PREFIXES = ['ref-prefix-'];

/**
 * Predicate: does the given key match a <config>-accepted kwarg?
 */
export function isConfigKwarg(key) {
  if (CONFIG_KWARGS.has(key)) return true;
  return CONFIG_KWARG_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Predicate: does the given key belong to <meta>'s accepted kwargs?
 */
export function isMetaKwarg(key) {
  return META_KWARGS.has(key);
}
