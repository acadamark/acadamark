// Structured-element registry.
//
// A *structured-data-container* tag holds a small structured record of named
// fields. It is NOT a DSL (a DSL interprets a foreign language — Mermaid,
// LaTeX, CSV — and lives in dsl-registry.js); it is NOT prose-bearing body
// content. Examples: <meta>, <author>.
//
// A structured-element tag accepts two authoring forms:
//
//   - kwarg form:     <meta title="X" author="Y">
//                     <author name="Jane" orcid="0000-…" +corresponding>
//
//   - child-tag form: <meta><title>X</title><author>Y</author></meta>
//                     <author><name>Jane</name><orcid>0000-…</orcid></author>
//
// The Layer 1 canonical shape is the child-tag form. The
// normalize-to-canonical gate lifts the kwarg form to the canonical child-tag
// form per the per-tag spec recorded in this registry. The interpreter's
// `liftStructuredKwargs` (in normalize-to-canonical.js) consumes the specs
// here; this module owns the data.
//
// This registry is **separate** from DSL_REGISTRY by design:
//   - dsl-registry.js owns DSL content-handler dispatch (math, code, csv,
//     mermaid, …) and a historically-broad "long-form-eligibility" role for
//     several non-DSL containers.
//   - structured-elements.js owns the kwarg/child-tag interface, the per-tag
//     allowlists, and the misuse-feedback partner pointers.
//   - Both registries contribute to `LONG_FORM_TAGS` (the parser's combined
//     long-form-eligibility view; see longFormTags() / LONG_FORM_TAGS below
//     and the consult site in remark-acadamark/src/syntax.js).
//
// See DESIGN.md §"Structured-data-container tags" for the design.

import { DSL_REGISTRY } from './dsl-registry.js';

/**
 * Per-tag spec for a structured-element tag.
 *
 * Fields:
 *   acceptedKwargs   Set<string>  — kwargs the tag accepts at all (the union
 *                                   of lifted + non-lifted scalar fields).
 *   liftedKwargs     Set<string>  — subset of accepted that the gate lifts
 *                                   from kwarg to child-tag form. The rest of
 *                                   accepted stay as kwargs on the canonical
 *                                   Layer 1 node.
 *   booleanKwargs    Set<string>  — kwargs that are boolean markers (e.g.
 *                                   `+corresponding`); always stay as kwargs;
 *                                   never lifted to child tags. Boolean
 *                                   markers are also accepted (no need to
 *                                   re-list in acceptedKwargs).
 *   childAllowlist   Set<string>  — child tags the tag accepts under the
 *                                   child-tag form. Used only when
 *                                   `validateChildren` is true.
 *   validateChildren boolean      — if true, an unrecognized child-tag inside
 *                                   the structured element gets an
 *                                   informative diagnostic (warn, not error).
 *                                   Default false so behavior is opt-in per
 *                                   tag (the <meta> migration preserves
 *                                   existing behavior by leaving this off).
 *   misusePartnerTag string|null  — if set, an unknown kwarg that is accepted
 *                                   by the partner tag triggers a "did you
 *                                   mean <partner>?" hint. Today: <meta> and
 *                                   <config> point at each other (<config> is
 *                                   not a structured element under this
 *                                   registry — it has only kwargs, no child-
 *                                   tag form — but it participates in the
 *                                   misuse-feedback pairing).
 */

export const STRUCTURED_ELEMENTS = new Map([
  // ── <meta> ─────────────────────────────────────────────────────────────────
  //
  // Migrated from DSL_REGISTRY['meta'] (`578d6f0` apparatus-tag reconciliation
  // installed <meta>'s container behavior; this slice moved its
  // long-form-eligibility from DSL_REGISTRY to here without changing what gets
  // accepted, lifted, or warned). Behavior-preserving migration: the same
  // kwargs are accepted; the same subset is lifted to child tags; the same
  // misuse-feedback hints fire for <config>-shaped kwargs.
  //
  // The misuse partner is <config>. Cross-hint fires from the <config> side
  // by the symmetric mechanism in normalize-to-canonical (the <config>
  // handling still lives in apparatus-allowlists.js since <config> is not a
  // structured element — see that file's header).
  [
    'meta',
    {
      acceptedKwargs: new Set([
        'title',
        'subtitle',
        'author',
        'date',
        'doi',
        'license',
        'lang',
        'version',
        'keywords',
        // `type` is allowlisted but NOT lifted — it controls structural
        // routing (article / book / book-part) in article-structuring, not
        // descriptive document content.
        'type',
      ]),
      liftedKwargs: new Set([
        'title', 'subtitle', 'author', 'date',
        'doi', 'license', 'lang', 'version', 'keywords',
      ]),
      booleanKwargs: new Set(),
      childAllowlist: new Set([
        'title', 'subtitle', 'author', 'editor', 'date',
        'doi', 'license', 'lang', 'version', 'keywords',
      ]),
      // Behavior preservation: <meta> has never validated its children;
      // opting in here would surface new warnings on existing fixtures
      // (<abstract> outside <meta>'s child list, etc.). Leave off in this
      // slice; revisit when child-validation is itself the topic of a slice.
      validateChildren: false,
      misusePartnerTag: 'config',
    },
  ],

  // ── <author> ───────────────────────────────────────────────────────────────
  //
  // New in this slice. Supersedes the earlier "author is flat for alpha"
  // ruling: <author> now carries structured author data as Layer 1 child
  // tags, with the kwarg form lifting to the child-tag form at the gate.
  //
  // Child elements: <name>, <affiliation>, <orcid>, <email>.
  //
  // Boolean kwarg: +corresponding (a scalar marker — stays a kwarg on the
  // canonical Layer 1 <author>, does not become a child tag).
  //
  // validateChildren: true — <author>'s allowlist is small and well-defined,
  // and this is a fresh interface (no existing fixtures rely on lax behavior).
  // Surface unknown children with a diagnostic.
  [
    'author',
    {
      acceptedKwargs: new Set(['name', 'affiliation', 'orcid', 'email']),
      liftedKwargs: new Set(['name', 'affiliation', 'orcid', 'email']),
      booleanKwargs: new Set(['corresponding']),
      childAllowlist: new Set(['name', 'affiliation', 'orcid', 'email']),
      validateChildren: true,
      misusePartnerTag: null,
    },
  ],
]);

/**
 * Predicate: is the given tagname a registered structured-element tag?
 *
 * @param {string} tagname
 * @returns {boolean}
 */
export function isStructuredElement(tagname) {
  return STRUCTURED_ELEMENTS.has(tagname);
}

/**
 * Return the spec for a registered structured-element tag, or null.
 *
 * @param {string} tagname
 * @returns {object|null}
 */
export function getStructuredSpec(tagname) {
  return STRUCTURED_ELEMENTS.get(tagname) ?? null;
}

// ─── Combined long-form-eligibility view ─────────────────────────────────────
//
// The parser's micromark long-form tokenizer (remark-acadamark/src/syntax.js)
// consults this set via `.has(tagname)` to decide whether `<tag>…</tag>` is
// long-form-parseable. The set is the union of DSL_REGISTRY's tags and
// STRUCTURED_ELEMENTS's tags. Computed at module load so the parser holds a
// stable reference.
//
// A note on coupling: this view is the only point where DSL_REGISTRY and
// STRUCTURED_ELEMENTS meet. Each registry is otherwise independent; only the
// parser's long-form admission needs the union.

function buildLongFormTags() {
  const set = new Set();
  for (const tag of DSL_REGISTRY.keys()) set.add(tag);
  for (const tag of STRUCTURED_ELEMENTS.keys()) set.add(tag);
  return set;
}

export const LONG_FORM_TAGS = buildLongFormTags();
