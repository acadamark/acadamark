// HTML-canonical <header> wrapping of the article title block (#74).
//
// Wraps the contents of <article-front> in a semantic HTML5 <header>, so the
// leading front-matter run (title, subtitle, byline, and any future
// front-matter elements) is grouped as the article's header. The wrapper opens
// at the start of the front-matter region and closes at its end — i.e. before
// the first non-front-matter block (<article-body>).
//
// IMPLICIT — no author syntax. The author writes the title/subtitle as today;
// the system adds the wrapper.
//
// HTML-ONLY. This runs in the compiler AFTER mdast→hast, so <header> is an
// HTML-canonical structure that never enters the shared mdast tree. The JATS
// export reads that mdast (enscribeToJats(tree), no <header>) and groups the
// title independently via <front>/<title-group> — so JATS is unaffected.
//
// Article-scoped. Book front matter (<book-front>: book-title + book-parts) is
// a different structure and is deliberately out of scope here (#74).

/**
 * Wrap the <article-front> region's children in a single <header> element.
 * No-op when there is no <article> wrapper (e.g. a book) or no <article-front>
 * (a document with no title block stays byte-identical). Idempotent.
 *
 * @param {import('hast').Root} hast
 * @returns {import('hast').Root} the same tree, mutated in place
 */
export function wrapArticleFrontHeader(hast) {
  const roots = Array.isArray(hast?.children) ? hast.children : [];
  const article = roots.find(
    (c) => c.type === 'element' && c.tagName === 'article',
  );
  if (!article) return hast;

  const front = (article.children ?? []).find(
    (c) => c.type === 'element' && c.tagName === 'article-front',
  );
  if (!front) return hast;

  const kids = front.children ?? [];
  // Idempotent: skip if the front content is already a lone <header>.
  if (kids.length === 1 && kids[0]?.type === 'element' && kids[0].tagName === 'header') {
    return hast;
  }

  front.children = [
    { type: 'element', tagName: 'header', properties: {}, children: kids },
  ];
  return hast;
}
