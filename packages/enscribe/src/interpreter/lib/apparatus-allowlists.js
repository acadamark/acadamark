// Apparatus-tag kwarg allowlists.
//
// Per the apparatus-tag reconciliation (2026-05-25, `578d6f0`), <meta> and
// <config> are both authorable with kwargs, with kwargs accepted against a
// per-tag allowlist and a misuse-feedback hint fired when a kwarg appears on
// the wrong apparatus tag.
//
// HISTORICAL NOTE on <meta>: <meta>'s kwarg allowlist used to live in this
// file (META_KWARGS, META_KWARGS_LIFTED, isMetaKwarg). The 2026-05-27
// structured-element-infrastructure slice moved <meta>'s spec to its
// canonical home — the structured-element registry at
// `@enscribejs/enscribe/core/structured-elements.js`. <meta> is now one of several
// structured-data-container tags (alongside <author>); its kwargs / lifted
// subset / misuse-partner pointer all live in that registry's spec entry.
// The interpreter's lift gate consumes the spec from there.
//
// This file shrinks accordingly: only <config>'s allowlist remains here.
// <config> is NOT a structured-data-container — its content is processing
// options, not a record of named document-descriptive fields, and the
// authoring surface today is kwargs-only (no child-tag form lifted by the
// gate). <config> stays kwarg-driven and stays here.
//
// The misuse-feedback pairing still works across the file boundary: <meta>'s
// spec (in structured-elements.js) names 'config' as its misusePartnerTag,
// and `isConfigKwarg` (exported from this file) is what the gate consults to
// fire the "did you mean <config>?" hint from the <meta> side. The reverse
// direction — `<meta>`-shaped kwarg on `<config>` — is handled by the
// <config> branch in normalize-to-canonical.js, which consults
// `isStructuredKwarg('meta', key)` (imported from structured-elements).

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
  // Phase 3 slice 3a (2026-05-28): the three new theorem-family counter
  // suppressions. Same pattern as number-equations/figures/tables —
  // setting any of these to false in a <config> block suppresses the
  // entire counter for the document.
  ['number-theorems',         'live'],   // numbering.js (theorem/lemma/corollary/proposition)
  ['number-definitions',      'live'],   // numbering.js (<definition>)
  ['number-examples',         'live'],   // numbering.js (<example>)

  // Phase 4 slice 4a (2026-05-29): two scope knobs for book documents.
  // Articles default to none/section; books default to chapter/chapter.
  // counter-reset-scope: 'none' | 'chapter' | 'section'
  //   none    — global counters across the whole document
  //   chapter — counters reset at each <book-part> boundary
  //   section — counters reset at each <book-part> AND outermost
  //             <section> boundary
  // note-scope: 'document' | 'chapter' | 'section'
  //   document — single back-matter <note-list> (article-back / book-back)
  //   chapter  — per-book-part <note-list> at each chapter's end
  //   section  — per-outermost-section <note-list> (article default;
  //              slice 7001aaa behavior)
  ['counter-reset-scope',     'live'],   // numbering.js + ref-resolution.js
  ['note-scope',              'live'],   // note-placement.js
  ['bibliography-heading',    'live'],   // bibliography.js (overrides the "References" heading)

  // Reserved — the apparatus-tag reconciliation ruling enumerated these as
  // the intended <config> surface. The implementation per key is future
  // work; the allowlist accepts them so author input is not rejected
  // before the consumer lands. Unlike the live keys, no plugin reads these
  // yet; they sit in the config map awaiting implementation.
  ['theme',                   'live'],     // index.js compiler (Phase 8 Slice 2)
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
