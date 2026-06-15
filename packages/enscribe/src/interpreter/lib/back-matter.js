// Single source of truth for the tags that belong in a document's back-matter
// region (<article-back> / <book-back>).
//
// Shared by article-structuring.js and book-structuring.js, which each keep a
// trivial local isBackMatter() predicate over this set (the membership is the
// shared fact; the predicate is one line per plugin). The two used to hand-list
// identical sets (BACK_MATTER_TAGS / BOOK_BACK_TAGS) — add a back-matter tag to
// one and articles vs books would route it differently.
//
// <data> is deliberately NOT here: it is a root-level sibling of <article> /
// <book> (a citation registry processed by the library-load plugin), not
// document content rendered inside a back region.
export const BACK_MATTER_TAGS = new Set(['config', 'bibliography', 'note-list']);
