// Single source of truth for the external-table-data tag set {table, csv, tsv}.
//
// Two consumers encode "which tags carry external table data" and must agree:
//   - index.js collectTableSources (the discovery path): membership test over the
//     mdast tagname, to gather `src` values for pre-fetch.
//   - browser.js renderAsync (the fast path): a regex gate over raw source, so the
//     sync render can short-circuit when no `<table|csv|tsv src>` is present.
// Before #253 the set was hand-written as a Set in one place and a regex alternation
// in the other; deriving the regex from the array keeps the two in lockstep.

/** The tagnames that can carry an external table-data `src`. */
export const TABLE_TAGS = Object.freeze(['table', 'csv', 'tsv']);

/** Raw-source gate: matches an opening `<table|csv|tsv …>` that carries a `src`.
 *  Derived from TABLE_TAGS so the regex cannot drift from the membership set. */
export const HAS_TABLE_SRC = new RegExp(`<(${TABLE_TAGS.join('|')})\\b[^>]*\\bsrc\\s*=`, 'i');
