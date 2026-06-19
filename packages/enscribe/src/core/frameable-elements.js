// Frameable-element kwarg-to-child-tag lift registry.
//
// Phase 3 slice 3c (2026-05-28). Companion to structured-elements.js — same
// mechanism (kwarg → child-tag lift at the normalize-to-canonical gate),
// different conceptual home.
//
// WHY A SEPARATE REGISTRY FROM STRUCTURED_ELEMENTS:
//
// `structured-elements.js` is explicitly restricted (by its header comment)
// to *structured-data-containers* — tags whose primary purpose is holding a
// small record of named fields. `<meta>` and `<author>` are the examples;
// neither has prose-bearing body content.
//
// Frameable elements (`<fig>`, `<table>`, `<csv>`, `<tsv>`, `<mermaid>`,
// `<abc>`, `<svg>`, `<frame>`) are body-content tags — their primary content
// is the captioned material (image, table data, diagram source, prose). The
// kwarg-to-child-tag lift is a *convenience for caption + title*, not the
// element's primary interface. Mislabeling them as structured-data-containers
// would conflate two distinct design intents.
//
// Same lift MECHANISM, different conceptual REGISTRY. The lift code in
// normalize-to-canonical.js is shaped the same way for both registries; the
// per-registry spec differs only in which kwargs lift to which children.
//
// LIFTED KWARGS PER ELEMENT:
//
// Caption-as-content (Option A from Phase 3 Phase 0 / Q1.5): `caption=` lifts
// to `<caption>` child on every frameable. The kwarg form stays accepted
// permanently as the convenient short form for plain-text captions; the
// child-tag form supports formatted/long captions with citations,
// emphasis, etc.
//
// `title=` lifts to `<title>` child on the same surface. Same rationale —
// short-form for plain text, long-form for formatted titles. (As of slice
// 3c, no fixture exercises formatted titles, but the lift is wired so the
// pattern is uniform with caption.)

/**
 * Per-tag spec for a frameable element's kwarg-to-child-tag lift.
 *
 * Fields:
 *   liftedKwargs   Set<string>  — kwargs that lift from kwarg to child-tag.
 *                                 The child holds the kwarg's value as a
 *                                 single text node (same shape as
 *                                 structured-elements lift).
 *
 * No acceptedKwargs / booleanKwargs / childAllowlist / misusePartnerTag /
 * validateChildren — the frameable-lift mechanism only handles the lift
 * itself, NOT kwarg validation (frameable elements accept other kwargs
 * outside of this lift list; those are governed by per-element vocab
 * schemas and the schema dispatcher's `buildProperties`, not by this
 * registry).
 */
// Every frameable lifts the same two kwargs; one shared read-only Set (#255) rather
// than ten identical literals. Read-only (spec.liftedKwargs.has(key)), so sharing the
// instance is safe.
const FRAMEABLE_LIFTABLE_KWARGS = new Set(['caption', 'title']);

export const FRAMEABLE_LIFTABLE = new Map([
  ['fig',     { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['table',   { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['csv',     { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['tsv',     { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['mermaid', { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['abc',     { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['diagram', { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],  // #22 slice 3: the diagram host
  ['svg',     { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['frame',   { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
  ['aside',   { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],  // #31: aside joins the frameable class
  // #115: minipage is a frameable, so caption=/title= lift to child tags — but
  // its body is opaque (a raw source string), so liftFrameableKwargs' opaque
  // guard (`typeof node.content === 'string'`) leaves them as kwargs, read via
  // extractFrameableChildren's kwarg fallback, exactly like svg/table/csv.
  ['minipage', { liftedKwargs: FRAMEABLE_LIFTABLE_KWARGS }],
]);

/**
 * Predicate: is the given tagname a frameable element with a lift spec?
 *
 * @param {string} tagname
 * @returns {boolean}
 */
export function isFrameableLiftable(tagname) {
  return FRAMEABLE_LIFTABLE.has(tagname);
}

/**
 * Return the lift spec for a frameable, or null.
 *
 * @param {string} tagname
 * @returns {object|null}
 */
export function getFrameableLiftSpec(tagname) {
  return FRAMEABLE_LIFTABLE.get(tagname) ?? null;
}
