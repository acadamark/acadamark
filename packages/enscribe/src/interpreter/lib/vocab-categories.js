// Single source for reading the vocab `category` field (audit F14 — the capstone).
//
// Every eHTML element declares a `category` in VOCABULARY. This module is the ONE place
// that reads it: it builds a `category → Set(tagnames)` index once at module load and
// exposes a single query, exactly as doc-type.js is the one place that reads `<meta type>`.
// Kind-distinctions that ARE a vocab category derive from tagnamesInCategory(); distinctions
// that carry an ORTHOGONAL axis the category does not structurally hold stay curated (see
// R5's report: book-part REGIONS by type-attribute value, APPARATUS_TAGS by document-edge-
// ness, and the section DEPTH set — a curated subset of the `sections` category, which also
// contains the section title/subtitle children).

import { VOCABULARY } from '@enscribejs/ehtml';

const CATEGORY_INDEX = new Map();
for (const [tag, spec] of Object.entries(VOCABULARY)) {
  const category = spec?.category;
  if (!category) continue;
  if (!CATEGORY_INDEX.has(category)) CATEGORY_INDEX.set(category, new Set());
  CATEGORY_INDEX.get(category).add(tag);
}

const EMPTY = new Set();

/**
 * The set of tagnames whose vocab `category` is exactly `category`. The ONE place the
 * interpreter reads VOCABULARY[*].category; callers derive their kind-sets from this query
 * (F14). Treat the returned Set as READ-ONLY (it backs the shared index). Unknown category
 * → an empty set.
 *
 * @param {string} category
 * @returns {Set<string>}
 */
export function tagnamesInCategory(category) {
  return CATEGORY_INDEX.get(category) ?? EMPTY;
}
