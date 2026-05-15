// Phase 2 — Article structuring plugin.
//
// Reads the top-level mdast content and wraps it in the Layer 1 article
// structure: <article> > <article-front> + <article-body> + <article-back>.
//
// Document type detection (via <meta type=...>):
//   - type=article (default, or absent)  → handled here → wrapped in <article>
//   - type=book or type=book-part        → skipped (emit warning; out of scope)
//   - No <meta> at all                   → article-shaped by default
//
// Title promotion: <title> inside <meta> becomes <article-title>;
//                  <subtitle> inside <meta> becomes <article-subtitle>.
//   Both elements stay inside <meta> after promotion.
//
// Title-after-pipe: if root.children contains a bare <article | Title> tag
//   (short-form, with pipe content), that content becomes <article-title>
//   inside <meta>. If <meta> already has a <title>, <meta> wins and a warning
//   is emitted. This path is uncommon; the usual authoring path is <meta>.
//
// Region classification for slice 1:
//   front  → <meta> (if present)
//   body   → everything that is not <meta> and not back-matter, and not a
//             bare <article> short-form tag, and not a <data> root sibling
//   back   → <config>, <bibliography>, <note-list> (often empty)
//   root siblings → <data> (citation data blocks; live at root, not inside article)
//
// The three regions are emitted only when they have content. Empty regions
// are suppressed entirely. This matches the plugin-pipeline.md contract.

import { makeTag, isAcadamarkTag, findTag } from '../lib/ast-helpers.js';
import { warnSkippedDocType, warnTitlePrecedence } from '../lib/errors.js';

// Tags that belong in <article-back>.
const BACK_MATTER_TAGS = new Set(['config', 'bibliography', 'note-list']);

// <data> is NOT in BACK_MATTER_TAGS. It lives at root level as a sibling of
// <article>, because it is a data-only block (citation registry) processed by
// the library-load plugin — not document content rendered inside <article>.
function isBackMatter(node) {
  return isAcadamarkTag(node) && BACK_MATTER_TAGS.has(node.tagname);
}

/**
 * Promote <title> and <subtitle> inside <meta>.content to <article-title>
 * and <article-subtitle>. The elements are mutated in place; they remain
 * inside <meta>.
 */
function promoteTitles(metaNode) {
  const content = metaNode.content ?? [];
  for (const child of content) {
    if (!isAcadamarkTag(child)) continue;
    if (child.tagname === 'title') {
      child.tagname = 'article-title';
    } else if (child.tagname === 'subtitle') {
      child.tagname = 'article-subtitle';
    }
  }
}

/**
 * Apply the title-after-pipe rule: if there is a bare <article | Title> tag
 * at the top level (short-form tag with pipe content), use that content as
 * <article-title>. If <meta> already has a <title> / <article-title>, the
 * meta value wins (with a warning); the pipe-supplied title is discarded.
 *
 * Returns the <article> tag if found (so the caller can exclude it from body
 * content), or null.
 *
 * @param {Array}  children - root.children before structuring
 * @param {object|null} metaNode - the <meta> tag, if present
 * @returns {object|null} the <article> tag (to exclude from body), or null
 */
function applyTitleAfterPipe(children, metaNode) {
  const articleTag = findTag(children, 'article');
  if (!articleTag) return null;

  // A bare <article> with no pipe content is treated as an empty placeholder;
  // nothing to promote.
  const pipeContent = articleTag.content;
  if (!pipeContent || pipeContent.length === 0) return articleTag;

  if (!metaNode) {
    // No meta: create one with an article-title from the pipe content.
    // We mutate the existing article tag's surrounding context by building a
    // fresh meta node and injecting it; the caller handles insertion.
    articleTag._generatedMeta = makeTag('meta', [
      makeTag('article-title', pipeContent),
    ]);
    return articleTag;
  }

  // Meta exists: check for existing title.
  const existingTitle = findTag(metaNode.content ?? [], 'article-title');
  if (existingTitle) {
    warnTitlePrecedence('article');
    return articleTag; // discard pipe content; meta wins
  }

  // No existing title in meta: inject article-title from pipe content.
  metaNode.content = [
    makeTag('article-title', pipeContent),
    ...(metaNode.content ?? []),
  ];
  return articleTag;
}

/**
 * @returns {(tree: import('mdast').Root) => void}
 */
export function acadamarkArticleStructuring() {
  return (tree) => {
    const children = tree.children ?? [];

    // Detect document type from <meta> tag.
    const metaNode = findTag(children, 'meta');
    const docType = metaNode?.kwargs?.type ?? 'article';

    if (docType === 'book' || docType === 'book-part') {
      warnSkippedDocType(docType);
      return; // out of scope for this plugin
    }

    // Promote <title> / <subtitle> inside <meta> to article-scoped names.
    if (metaNode) {
      promoteTitles(metaNode);
    }

    // Handle title-after-pipe from an explicit <article | Title> tag.
    const explicitArticleTag = applyTitleAfterPipe(children, metaNode);
    let effectiveMeta = metaNode;
    if (explicitArticleTag?._generatedMeta) {
      effectiveMeta = explicitArticleTag._generatedMeta;
    }

    // Partition children into front, body, back, and root siblings.
    const frontContent = effectiveMeta ? [effectiveMeta] : [];
    const bodyContent = [];
    const backContent = [];
    const dataSiblings = []; // <data> nodes: stay at root, outside <article>

    for (const node of children) {
      if (node === metaNode) continue; // goes to front
      if (node === explicitArticleTag) continue; // structural tag, not body
      if (isAcadamarkTag(node, 'data')) {
        dataSiblings.push(node); // extracted to root level
      } else if (isBackMatter(node)) {
        backContent.push(node);
      } else {
        bodyContent.push(node);
      }
    }

    // Build region nodes. Only emit a region when it has content — empty
    // regions add no semantic value and produce visual noise in the output.
    const regions = [];
    if (frontContent.length > 0) regions.push(makeTag('article-front', frontContent));
    if (bodyContent.length  > 0) regions.push(makeTag('article-body',  bodyContent));
    if (backContent.length  > 0) regions.push(makeTag('article-back',  backContent));

    // Build the <article> wrapper.
    const article = makeTag('article', regions);

    // Replace the root's children: article first, then <data> siblings.
    // <data> nodes live at root level (outside <article>) so the library-load
    // plugin can find them by walking tree.children directly.
    tree.children = [article, ...dataSiblings];
  };
}
