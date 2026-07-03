// Single source of truth for book-part-type → region membership.
//
// Front- and back-matter book-part-types are DERIVED from the vocab (#234): the
// `type.regions` map in `elements/book-part.md` frontmatter (front/back lists;
// body is the default — the complement). Region is NOT a vocab `category` (every
// book-part is `category: document-containers`), so it is held as a structured
// field on the `type` kwarg rather than routed through vocab-categories.js. Two
// consumers derive from these sets so they can never disagree (the F4 latent-risk
// the audit flagged):
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
// Body is the default, so a special region type is classified by adding it to the
// vocab `type.regions` map — the natural and only place to do it.

import { VOCABULARY } from '@enscribejs/ehtml';
import { tagnamesInCategory } from './vocab-categories.js';

const TYPE_KWARG = VOCABULARY['book-part']?.enscribe_attributes?.kwargs?.type ?? {};
const TYPE_VALUES = new Set(TYPE_KWARG.values ?? []);
const REGIONS = TYPE_KWARG.regions ?? {};

export const BOOK_PART_FRONT_TYPES = new Set(REGIONS.front ?? []);
export const BOOK_PART_BACK_TYPES = new Set(REGIONS.back ?? []);

// Load-time parity guard (the section-kinds.js F14 pattern, adapted): every
// front/back region member must be a real book-part `type` value — a subset
// check, NOT size-equality. Body is the complement, so "every value is
// classified" is trivially true and carries no information; the real drift to
// catch is a region token that is not a legal type (a typo or a removed type).
{
  const stray = [...BOOK_PART_FRONT_TYPES, ...BOOK_PART_BACK_TYPES].filter((t) => !TYPE_VALUES.has(t));
  if (stray.length) {
    throw new Error(
      `book-regions: region type(s) {${stray.join(', ')}} not in vocab book-part 'type' values ` +
      `{${[...TYPE_VALUES].sort().join(', ')}} — drift between the regions map and the value list.`,
    );
  }
}

/** A body book-part (chapter, part, introduction, conclusion, other — or any
 *  type not enumerated as front- or back-matter). Body is the default region. */
export function isBodyBookPart(type) {
  return !BOOK_PART_FRONT_TYPES.has(type) && !BOOK_PART_BACK_TYPES.has(type);
}

// ─── Book-region WRAPPER tagnames ────────────────────────────────────────────
// The three structural regions a <book> body is split into. Distinct from the
// book-part *type* regions above (which classify each <book-part>): these are the
// <book-front>/<book-body>/<book-back> wrapper elements themselves. Hand-encoded
// in five sites before #252 (two note-placement filters, bibliography, toc.js's
// and book-scaffold.js's BOOK_REGIONS map); now one source, mirroring section-kinds.js.

/** The three book-region wrapper tagnames, in document order. */
export const BOOK_REGION_TAGNAMES = Object.freeze(['book-front', 'book-body', 'book-back']);

/** Book-region wrapper tagname → its short presentation token (front/body/back). */
export const BOOK_REGIONS = Object.freeze({
  'book-front': 'front',
  'book-body': 'body',
  'book-back': 'back',
});

// Load-time guard (the book-regions subset-check style above): every wrapper
// tagname must be a real vocab `structural-regions` element. A SUBSET check —
// the category also holds the article-front/body/back regions, so equality would
// wrongly throw; the drift to catch is a renamed/removed book-region element.
{
  const structuralRegions = tagnamesInCategory('structural-regions');
  const stray = BOOK_REGION_TAGNAMES.filter((t) => !structuralRegions.has(t));
  if (stray.length) {
    throw new Error(
      `book-regions: wrapper tagname(s) {${stray.join(', ')}} not in vocab 'structural-regions' ` +
      `category {${[...structuralRegions].sort().join(', ')}} — drift.`,
    );
  }
}

/** Whether a tagname is one of the three book-region wrappers. */
export function isBookRegionTag(tagname) {
  return BOOK_REGION_TAGNAMES.includes(tagname);
}
