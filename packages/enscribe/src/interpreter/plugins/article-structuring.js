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

import { makeTag } from '../../core/tag.js';
import { isEnscribeTag, findTag } from '../lib/ast-helpers.js';
import { warnSkippedDocType, warnTitlePrecedence } from '../lib/errors.js';
import { ENSCRIBE_DOC_TYPE } from '../../core/file-data-keys.js';
// #100: an article `<appendix>` lowers (at the gate) to the same
// `<book-part book-part-type="appendix">` the book uses. We reuse the book-side
// body absorption + title promotion, then route the appendix to <article-back>.
import {
  assembleBookPartContents,
  restructureBookPart,
  isBookPartTag,
  bookPartType,
} from './book-structuring.js';
// Tags that belong in <article-back> — the single source of truth shared with
// book-structuring (which routes the same set into <book-back>).
import { BACK_MATTER_TAGS } from '../lib/back-matter.js';
// Apparatus tags (the single source — F13). The suppressed subset is derived there.
import { APPARATUS_TAGS } from '../lib/apparatus-allowlists.js';

// <data> is NOT in BACK_MATTER_TAGS. It lives at root level as a sibling of
// <article>, because it is a data-only block (citation registry) processed by
// the library-load plugin — not document content rendered inside <article>.
function isBackMatter(node) {
  return isEnscribeTag(node) && BACK_MATTER_TAGS.has(node.tagname);
}

// Apparatus tags — document-apparatus, not body content. Per the apparatus-
// tag positioning principle (DESIGN.md §"Apparatus-tag positioning"), these
// belong at the document edges (typically <meta> at start, the rest at end),
// never mid-body inside another tag's content.
//
// <library> is included even though it is typically nested inside <data> —
// the position check below treats <data> as transparent for <library>'s
// purposes (a <library> inside <data> is correctly placed). APPARATUS_TAGS is
// imported from lib/apparatus-allowlists.js (the single source — F13).

/**
 * Recursively walk enscribeTag content arrays looking for apparatus tags
 * mid-body. An apparatus tag at root (handled by the partition below) or
 * nested inside <data> (legitimate — <library> sits in <data>) is fine; an
 * apparatus tag inside any *other* content is a positioning warning.
 *
 * Informative diagnostic only — the document still renders (per the always-
 * renders pattern). Hardening to an error is a separate one-line ruling.
 */
function warnMisplacedApparatus(nodes, file, parentTagname /* null at root */) {
  for (const node of (nodes ?? [])) {
    if (!isEnscribeTag(node)) continue;
    // At root (parentTagname === null), apparatus tags are correctly placed;
    // the partition below assigns them to front / back / data-siblings as
    // appropriate. Skip the warning for root-level apparatus tags.
    // Inside <data>, a nested <library> (or other apparatus tag) is legitimate.
    if (parentTagname !== null && parentTagname !== 'data' && APPARATUS_TAGS.has(node.tagname)) {
      file?.message?.(
        `<${node.tagname}> is a document-apparatus tag and belongs at the document edges ` +
        `(typically <meta> at the start, <config>/<data>/<library> at the end). ` +
        `Mid-body placement (inside <${parentTagname}>) is wrong — the structural plugin ` +
        `cannot route this tag to its correct region. The document still renders, but the ` +
        `apparatus tag is silently ignored at its mis-placed position.`,
        node,
        'article-structuring:apparatus-tag-mid-body',
      );
    }
    // Recurse into the node's content. Skip opaque content (no nested
    // enscribeTag nodes live there).
    if (Array.isArray(node.content) && !node.isOpaqueContent) {
      warnMisplacedApparatus(node.content, file, node.tagname);
    }
  }
}

/**
 * Promote <title> and <subtitle> inside <meta>.content to <article-title>
 * and <article-subtitle>. The elements are mutated in place; they remain
 * inside <meta>.
 */
function promoteTitles(metaNode) {
  const content = metaNode.content ?? [];
  for (const child of content) {
    if (!isEnscribeTag(child)) continue;
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
export function enscribeArticleStructuring() {
  return (tree, file) => {
    const children = tree.children ?? [];

    // Apparatus-tag positioning check: warn (informatively) on any
    // <meta>/<config>/<data>/<library> found mid-body. Runs before the
    // partition below, so the warning fires regardless of whether the
    // misplaced tag gets routed anywhere coherent.
    warnMisplacedApparatus(children, file, null);

    // Phase 4 slice 4a (2026-05-29): if enscribeBookStructuring already
    // wrapped the tree in <book> or <book-part>, the root will contain that
    // wrapper instead of a flat list of meta + body. Detect and skip
    // silently. Same disposition for the original warn-and-skip case
    // (was: warn on <meta type=book> at root) — book-structuring now
    // handles those upstream.
    //
    // #100: an APPENDIX book-part is exempt — in an article, `<appendix>`
    // lowers to `<book-part book-part-type="appendix">` at root, and that is
    // article content this plugin must structure (into <article-back>), not a
    // sign that book-structuring ran. A standalone book-part *document* is still
    // caught by the docType check below.
    const bookRoot =
      findTag(children, 'book') ||
      children.some((c) => isBookPartTag(c) && bookPartType(c) !== 'appendix');
    if (bookRoot) {
      return; // already structured by enscribeBookStructuring
    }

    // Detect document type from <meta> tag.
    const metaNode = findTag(children, 'meta');
    // Document class resolved once upstream (enscribeDocTypeResolve → file.data).
    const docType = file?.data?.[ENSCRIBE_DOC_TYPE] ?? 'article';

    if (docType === 'book' || docType === 'book-part') {
      // Defensive: should be unreachable post-book-structuring. Keep the
      // warn-and-skip as a safety net for the case where book-structuring
      // somehow didn't fire (e.g. a future test that disables it).
      warnSkippedDocType(docType);
      return; // out of scope for this plugin
    }

    if (docType === 'website') {
      // #246 S1: a website is structured by enscribeWebsiteStructuring (which builds a
      // nav model on file.data); it gets NO <article> wrapper. Without this guard the
      // non-book fall-through would wrap a website as a plain <article> — the silent
      // mis-render this slice closes.
      return;
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

    // #100: an article `<appendix>` lowered (at the gate) to
    // `<book-part book-part-type="appendix">`. Gather each appendix's following
    // sections into it (reusing the book-side body absorption), so the partition
    // routes the whole appendix — promoted title + body — to <article-back>. A
    // strict no-op when the article has no appendix, so non-appendix articles are
    // byte-identical.
    const hasAppendix = children.some(
      (n) => isBookPartTag(n) && bookPartType(n) === 'appendix',
    );
    const items = hasAppendix ? assembleBookPartContents(children, metaNode) : children;

    for (const node of items) {
      if (node === metaNode) continue; // goes to front
      if (node === explicitArticleTag) continue; // structural tag, not body
      if (isEnscribeTag(node, 'data')) {
        dataSiblings.push(node); // extracted to root level
      } else if (isBookPartTag(node) && bookPartType(node) === 'appendix') {
        restructureBookPart(node); // promote the pipe title → <book-part-title>
        backContent.push(node); // article appendices live in <article-back>
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
