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
import { findTag } from './ast-helpers.js';
import { makeTag } from '../../core/tag.js';

export const BACK_MATTER_TAGS = new Set(['config', 'bibliography', 'note-list']);

/**
 * Find — or create — the document's back-matter region: <article-back> for an
 * article, <book-back> for a book. A document has exactly one root, so order is
 * moot; returns null if the tree has neither root.
 *
 * #264: consolidated from the equivalent copies that lived in note-placement.js
 * and bibliography.js. <article>/<book> are root children and <…-back> is a direct
 * child of their content, so the shallow `findTag` is correct for both — making
 * this the single home is output-neutral (proven by the empty fixture diff).
 */
export function findOrCreateBackMatter(treeChildren) {
  const article = findTag(treeChildren, 'article');
  if (article) {
    let back = findTag(article.content ?? [], 'article-back');
    if (!back) { back = makeTag('article-back'); (article.content ??= []).push(back); }
    return back;
  }
  const book = findTag(treeChildren, 'book');
  if (book) {
    let back = findTag(book.content ?? [], 'book-back');
    if (!back) { back = makeTag('book-back'); (book.content ??= []).push(back); }
    return back;
  }
  return null;
}
