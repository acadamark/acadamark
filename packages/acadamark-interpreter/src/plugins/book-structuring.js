// Phase 4 slice 4a — Book structuring plugin.
//
// Reads the top-level mdast content of a book document and wraps it in the
// Layer 1 book structure: <book> > <book-front> + <book-body> + <book-back>.
// Book-parts (<chapter>, <part>, <appendix>, etc., already lifted to
// <book-part book-part-type="..."> by the vocab's shorthand_expansions) are
// routed into the appropriate region based on their book-part-type.
//
// This plugin is the forward-referenced `acadamarkBookStructuring` declared
// in book.md's and book-part.md's related_plugins block. The vocab entries
// describe the intended behavior in detail; this implementation realizes
// that behavior.
//
// Document type detection (via <meta type=...>):
//   - type=book                          → handled here → wrapped in <book>
//   - type=book-part                     → handled here → wrapped in <book-part>
//                                          (a single-chapter file; multi-file
//                                          authoring will assemble these later)
//   - type=article (default, or absent)  → no-op; acadamarkArticleStructuring handles
//
// Region placement by book-part-type (matches book-part.md §"Where book-parts
// appear", L188-200):
//   - chapter, part, introduction, conclusion, other → book-body
//   - preface, foreword, dedication                  → book-front
//   - appendix, glossary, colophon                   → book-back
//
// Title promotion: <title> inside <meta> becomes <book-title>;
//                  <subtitle> inside <meta> becomes <book-subtitle>.
// Inside each <book-part>, the same promotion happens to
// <book-part-title> / <book-part-subtitle>.
//
// Per-book-part authorship: an <author> child of a <book-part> stays inside
// the book-part's <meta> region (or is created if no <meta> exists). This
// is the edited-volume case (book.md §"Edited volume" example, L287-302).
//
// Pipeline position: runs BEFORE acadamarkArticleStructuring. If this plugin
// transforms the tree (creates <book>), article-structuring sees the
// transformed tree and skips silently (its precondition for wrapping is the
// flat list of root children at gate-output time; a tree with <book> at root
// doesn't match).

import { makeTag } from 'acadamark-core/tag';
import { isAcadamarkTag, findTag } from '../lib/ast-helpers.js';

// Book-part-type → region routing.
const BOOK_PART_FRONT_TYPES = new Set(['preface', 'foreword', 'dedication']);
const BOOK_PART_BACK_TYPES  = new Set(['appendix', 'glossary', 'colophon']);
// chapter, part, introduction, conclusion, other → book-body (default)

// Back-matter tags inside a book (besides appendix/glossary book-parts).
// Same as articles: bibliography, note-list, config.
const BOOK_BACK_TAGS = new Set(['config', 'bibliography', 'note-list']);

function isBookPartTag(node) {
  return isAcadamarkTag(node) && node.tagname === 'book-part';
}

/**
 * First-pass: gather sibling content between consecutive book-parts into
 * each book-part's content array. The parser produces
 * `<chapter | Title>\nbody paragraph\n...\n<chapter | Next>` as a flat
 * list at root level — the title is the chapter's pipe content; the
 * paragraphs are root-level siblings that authorially belong INSIDE the
 * chapter.
 *
 * This function walks the flat children list, and for each book-part,
 * absorbs subsequent non-book-part / non-meta / non-back-matter
 * siblings into the book-part's content (preserving the pipe-content
 * title at the front via restructureBookPart's later promotion).
 *
 * The <meta> node and back-matter tags (bibliography, etc.) stay at
 * root level for the partition pass.
 *
 * @param {Array} children — root.children (flat list from the parser)
 * @param {object|null} metaNode — the <meta> tag (kept at root)
 * @returns {Array} new children list with book-parts absorbing their body
 */
function assembleBookPartContents(children, metaNode) {
  const out = [];
  let currentBookPart = null;
  for (const node of children) {
    if (node === metaNode) {
      out.push(node);
      currentBookPart = null;
      continue;
    }
    if (isBookPartTag(node)) {
      out.push(node);
      currentBookPart = node;
      continue;
    }
    if (isBackMatter(node)) {
      out.push(node);
      currentBookPart = null;
      continue;
    }
    // Other content: if we have an open book-part, absorb into it;
    // otherwise (no book-part yet seen, or after a back-matter tag),
    // leave at root level.
    if (currentBookPart) {
      if (!Array.isArray(currentBookPart.content)) currentBookPart.content = [];
      currentBookPart.content.push(node);
    } else {
      out.push(node);
    }
  }
  return out;
}

function bookPartType(node) {
  return node?.kwargs?.['book-part-type'] ?? 'other';
}

function isBackMatter(node) {
  return isAcadamarkTag(node) && BOOK_BACK_TAGS.has(node.tagname);
}

/**
 * Promote <title>/<subtitle> inside a <meta> node to scope-appropriate
 * names (<book-title>/<book-subtitle> at book level;
 * <book-part-title>/<book-part-subtitle> inside a book-part).
 */
function promoteTitles(metaNode, scope) {
  const titleName = scope === 'book-part' ? 'book-part-title' : 'book-title';
  const subtitleName = scope === 'book-part' ? 'book-part-subtitle' : 'book-subtitle';
  for (const child of metaNode.content ?? []) {
    if (!isAcadamarkTag(child)) continue;
    if (child.tagname === 'title') child.tagname = titleName;
    else if (child.tagname === 'subtitle') child.tagname = subtitleName;
  }
}

/**
 * Restructure a <book-part>'s content: ensure it has a <meta> child holding
 * the book-part's metadata (title, subtitle, author) and that title/subtitle
 * are promoted to book-part-scoped names. Per book-part.md, book-parts do
 * NOT have nested book-part-front/body/back wrappers; <meta> and body sit
 * directly inside <book-part>.
 *
 * Also recursively restructures any nested <book-part>s (the "<part>
 * containing <chapter>s" pattern).
 */
function restructureBookPart(bookPartNode) {
  const content = Array.isArray(bookPartNode.content) ? bookPartNode.content : [];

  // Find or extract the existing <meta>. The vocab's shorthand_expansion
  // path (<chapter | Title>) doesn't directly create a meta — the title
  // promotion happens here when we see a title-shaped first child or a
  // <meta> already in content.
  let metaNode = findTag(content, 'meta');

  // The shorthand_expansion lifts <chapter | Title> to
  // <book-part book-part-type="chapter">Title-content</book-part>.
  // If the first content children are a <book-part-title> or <title>
  // sitting at top level (not inside a <meta>), wrap them into a <meta>.
  if (!metaNode) {
    // Look for title-shaped tags at top level OR for an <author> tag at
    // top level (edited-volume per-book-part authorship).
    const titleishAtTop = content.find(c =>
      isAcadamarkTag(c) && (c.tagname === 'title' || c.tagname === 'book-part-title' ||
                            c.tagname === 'subtitle' || c.tagname === 'book-part-subtitle' ||
                            c.tagname === 'author'));
    if (titleishAtTop) {
      // Gather all consecutive title/author tags at the top of content into
      // a synthesized <meta>. The remaining content stays as body.
      const metaContent = [];
      const bodyContent = [];
      for (const child of content) {
        if (isAcadamarkTag(child) && (
          child.tagname === 'title' || child.tagname === 'book-part-title' ||
          child.tagname === 'subtitle' || child.tagname === 'book-part-subtitle' ||
          child.tagname === 'author'
        )) {
          metaContent.push(child);
        } else {
          bodyContent.push(child);
        }
      }
      metaNode = makeTag('meta', metaContent);
      bookPartNode.content = [metaNode, ...bodyContent];
    }
  }

  // Promote titles inside <meta> (if present) to book-part-scoped names.
  if (metaNode) {
    promoteTitles(metaNode, 'book-part');
  }

  // Recurse into nested <book-part> children (parts containing chapters).
  for (const child of bookPartNode.content) {
    if (isBookPartTag(child)) {
      restructureBookPart(child);
    }
  }
}

/**
 * Acadamark book structuring plugin.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkBookStructuring() {
  return (tree, _file) => {
    const children = tree.children ?? [];

    // Document type detection.
    const metaNode = findTag(children, 'meta');
    const docType = metaNode?.kwargs?.type ?? 'article';
    if (docType !== 'book' && docType !== 'book-part') {
      return; // article — let acadamarkArticleStructuring handle it
    }

    // Handle type=book-part (single-chapter file; multi-file authoring
    // will assemble these in Phase 9). Wrap the content in <book-part>
    // and skip the full book-wrapping.
    if (docType === 'book-part') {
      const bookPart = makeTag('book-part', children);
      bookPart.kwargs = { 'book-part-type': metaNode?.kwargs?.['book-part-part-type'] ?? 'chapter' };
      restructureBookPart(bookPart);
      tree.children = [bookPart];
      return;
    }

    // type=book: assemble into front, body, back regions.
    //
    // First pass: gather sibling content for each book-part. Authoring
    // pattern (per book-part.md L72-80):
    //
    //   <chapter | Origins>           ← title (in pipe content)
    //   Body paragraph.               ← these belong INSIDE the chapter
    //   Another paragraph.
    //
    //   <chapter | Next>              ← next chapter — boundary
    //   ...
    //
    // The parser produces each <chapter>/<preface>/etc. tag with its
    // pipe content as the title (an array of inline mdast that
    // restructureBookPart will lift to <book-part-title>). The
    // following paragraphs / sections / figures sit as siblings at the
    // root level. We need to move them into the book-part's content
    // (after the title) so the structural model matches the authoring.
    const assembledChildren = assembleBookPartContents(children, metaNode);

    const frontContent = []; // book-meta + front-matter book-parts
    const bodyContent  = []; // chapter/part/etc. book-parts
    const backContent  = []; // appendix/glossary book-parts + bibliography/etc.

    // The <meta> goes into book-front first.
    if (metaNode) {
      promoteTitles(metaNode, 'book');
      // Strip the type=book kwarg from the canonical meta — the document
      // type is now expressed structurally by the <book> wrapper.
      // (Preserving it does no harm; the vocab leaves it in place.)
      frontContent.push(metaNode);
    }

    for (const node of assembledChildren) {
      if (node === metaNode) continue;

      if (isBookPartTag(node)) {
        // Restructure first (synthesize meta if needed, promote titles).
        restructureBookPart(node);
        const type = bookPartType(node);
        if (BOOK_PART_FRONT_TYPES.has(type)) {
          frontContent.push(node);
        } else if (BOOK_PART_BACK_TYPES.has(type)) {
          backContent.push(node);
        } else {
          bodyContent.push(node);
        }
      } else if (isBackMatter(node)) {
        backContent.push(node);
      } else {
        // Loose body content not inside a book-part. Per book-body.md L26-28,
        // body-level prose belongs inside book-parts. We still preserve
        // such content in book-body for now (don't drop it) — the warning
        // for misplaced content can be filed separately.
        bodyContent.push(node);
      }
    }

    // Build region wrappers. Skip empty regions (matches article behavior).
    const regions = [];
    if (frontContent.length > 0) regions.push(makeTag('book-front', frontContent));
    if (bodyContent.length  > 0) regions.push(makeTag('book-body',  bodyContent));
    if (backContent.length  > 0) regions.push(makeTag('book-back',  backContent));

    const book = makeTag('book', regions);
    tree.children = [book];
  };
}
