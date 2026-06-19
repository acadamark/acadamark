// Minipage sealed sub-interpret helpers (#115).
//
// The deferred phase (an inline pass in index.js, between apply-numbers and
// ref-resolution) runs each minipage's held body through its OWN pipeline run
// with its OWN VFile — hence its own registry, the seal — and stamps the
// resolved Layer 1 mdast onto `node.minipageResolved` for the handler to splice.
// These are the pure helpers it uses; the sub-run itself lives in index.js
// because it needs that module's buildEnscribePipeline (passed in to avoid a
// circular import).

import { isEnscribeTag } from './ast-helpers.js';

// Nesting bound for a minipage-in-a-minipage chain. recursive-content's
// MAX_DEPTH does NOT bound this — each sealed sub-run starts a fresh parse with
// its own depth-0 counter — so the deferred phase carries its own depth on
// file.data and stops here. A real document never approaches this; it guards
// against pathologically deep authored nesting.
export const MAX_MINIPAGE_DEPTH = 10;

const ARTICLE_REGIONS = new Set(['article-front', 'article-body', 'article-back']);

/**
 * Project a sealed sub-run's resolved mdast down to the body content to splice
 * into the <figure> shell. The sub-run produces a full `<article>` (so
 * note-placement has an `<article-back>` boundary for LaTeX-local footnotes);
 * we flatten its region children in document order — `<article-body>` content
 * first, then `<article-back>` (the `__note-list`) — dropping the article /
 * region wrapper elements. The result reads as: body content, then the
 * box-bottom footnote list, exactly the LaTeX minipage layout.
 *
 * @param {import('mdast').Root} resolvedRoot - the sub-run's runSync output
 * @returns {Array} body-level mdast nodes
 */
export function projectMinipageBody(resolvedRoot) {
  const children = resolvedRoot?.children ?? [];
  const docRoot = children.find((c) => isEnscribeTag(c, 'article'));
  if (!docRoot) {
    // No article wrapper (an empty body, or a non-article-typed body — out of
    // scope). Splice the resolved top-level nodes as-is rather than dropping them.
    return children;
  }
  const regionKids = Array.isArray(docRoot.content) ? docRoot.content : (docRoot.children ?? []);
  const out = [];
  for (const child of regionKids) {
    if (isEnscribeTag(child) && ARTICLE_REGIONS.has(child.tagname)) {
      const inner = Array.isArray(child.content) ? child.content : (child.children ?? []);
      out.push(...inner);
    } else {
      // A non-region direct child of <article> (unusual) — keep it in place.
      out.push(child);
    }
  }
  return out;
}

/**
 * Visit every `<minipage>` node in a tree, in document order, WITHOUT descending
 * into a minipage's own body. A minipage body is opaque (raw source held on
 * node.content), so there is nothing to descend at the top level — and its
 * nested minipages are resolved by that minipage's OWN sealed sub-run, not by
 * this walk. The walk descends ordinary structural content (skipping any opaque
 * content) and mdast children.
 *
 * @param {object} node - a tree root or any node
 * @param {(minipage: object) => void} fn
 */
export function walkMinipageNodes(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (isEnscribeTag(node, 'minipage')) {
    fn(node);
    return; // do not descend the sealed body
  }
  if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
    for (const c of node.content) walkMinipageNodes(c, fn);
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) walkMinipageNodes(c, fn);
  }
}

/**
 * A visible mdast error node stamped as a minipage body when the nesting bound
 * is exceeded (a backstop; see MAX_MINIPAGE_DEPTH).
 *
 * @returns {object} an mdast paragraph
 */
export function minipageDepthErrorNode() {
  return {
    type: 'paragraph',
    children: [{
      type: 'text',
      value: `⚠ minipage nesting exceeds the maximum depth (${MAX_MINIPAGE_DEPTH}); body not rendered`,
    }],
  };
}
