// #408 — the universal child-relative src rebase (master-document.md §Path resolution).
//
// The ratified rule: relative paths in a child document resolve against the CHILD's own
// directory, recursively — one rule for every sourced form, matching the LaTeX \input
// intuition. The assembler stamps each structure marker with its child's directory
// (`_srcDir`, assemble.js); this pass walks the assembled tree's flat siblings tracking
// the current base, and prefixes every relative `src` kwarg in that child's subtree so
// the build's single master-relative resolve (assetsDir = masterDir / the master URL)
// finds the child's assets.
//
// Universal by construction: ANY tag's `src` kwarg — no tag alternation to extend (the
// regex-alternation trap #408 named). Only kwargs are touched, never content strings, so
// opaque bodies (code, math, data) and syntax examples cannot be corrupted; the hoisted
// <data> block keeps its own string-level rebase in assemble.js (its content is an opaque
// string end to end). Skipped values: absolute paths, URL schemes, and `@id` store
// references (resolved from the document store, not the filesystem).
//
// A tree with no stamped markers (every non-assembled document) is a no-op — output
// byte-identical by construction.

import { isEnscribeTag } from '../lib/ast-helpers.js';

const NON_REBASABLE = /^(?:[a-z][a-z0-9+.-]*:|\/|@|#)/i;

function joinRel(dir, src) {
  return dir ? `${dir}/${src}` : src;
}

function rebaseSubtree(node, dir) {
  if (!node || typeof node !== 'object') return;
  // A hoisted <data> block was already rebased at assembly time (assemble.js's
  // string-level rewrite, before the recursive parser structured its content) —
  // descending here would rebase its srcs a second time.
  if (isEnscribeTag(node, 'data')) return;
  if (isEnscribeTag(node) && typeof node.kwargs?.src === 'string' && node.kwargs.src !== '') {
    const src = node.kwargs.src;
    if (!NON_REBASABLE.test(src)) node.kwargs = { ...node.kwargs, src: joinRel(dir, src) };
  }
  if (Array.isArray(node.content)) for (const c of node.content) rebaseSubtree(c, dir);
  if (Array.isArray(node.children)) for (const c of node.children) rebaseSubtree(c, dir);
}

/**
 * @returns {(tree: import('mdast').Root) => void}
 */
export function enscribeSrcRebase() {
  return (tree) => {
    for (const node of tree.children ?? []) {
      // The assembler stamps each top-level child-body node with its child's
      // directory (flat-dir children are left unstamped — a no-op rebase).
      // Master-authored content carries no stamp and stays master-relative.
      if (typeof node?._srcDir === 'string' && node._srcDir !== '') {
        rebaseSubtree(node, node._srcDir);
      }
    }
  };
}
