// Single source of truth for book-part-type → region membership.
//
// Front- and back-matter book-part-types are enumerated here; everything else
// is BODY (the default region). Two consumers derive from this set so they can
// never disagree (the F4 latent-risk the audit flagged):
//
//   - book-structuring.js routes each <book-part> to <book-front> / <book-body>
//     / <book-back> by these sets, defaulting to body.
//   - numbering.js gates the chapter counter on isBodyBookPart — only body
//     book-parts advance it. A preface must NOT push the first chapter to "2",
//     which silently mis-prefixed cross-refs as "figure 2.1" before the Phase 5
//     fix (visible in doc-38's pre-fix snapshot). numbering used to re-list the
//     body types as its own closed set; deriving the check as the complement of
//     FRONT ∪ BACK keeps the two passes in lockstep.
//
// Body is the default, so a future special region type is classified by adding
// it to FRONT or BACK below — the natural and only place to do it.

export const BOOK_PART_FRONT_TYPES = new Set(['preface', 'foreword', 'dedication']);
export const BOOK_PART_BACK_TYPES  = new Set(['appendix', 'glossary', 'colophon', 'afterword']);

/** A body book-part (chapter, part, introduction, conclusion, other — or any
 *  type not enumerated as front- or back-matter). Body is the default region. */
export function isBodyBookPart(type) {
  return !BOOK_PART_FRONT_TYPES.has(type) && !BOOK_PART_BACK_TYPES.has(type);
}
