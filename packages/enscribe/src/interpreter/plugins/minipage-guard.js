// Minipage no-external guard (#115).
//
// A minipage body is a SEALED, self-contained sub-document: it must not reach
// out to external files. The asset half — `<data>` declaration hosts (embedded
// base64 / external image paths / external <library> bibtex) and body
// `<fig src="@id">` asset-store references — is the outward-pull surface, so it
// is forbidden inside a minipage. A forbidden construct renders a VISIBLE
// `__asset-error` block, never a silent drop (and never a working image).
//
// This runs as an ordinary pipeline plugin, but is a NO-OP on every normal
// document (the ENSCRIBE_MINIPAGE_SUBRUN flag is only set by the deferred phase
// on a minipage sub-run's VFile). Placed after the normalize-to-canonical gate
// and BEFORE the citation / asset index passes (steps 5 / 5.7 / 5.8), so a
// forbidden node is neutralized before any of those would resolve it — the
// reject-not-resolve guarantee. The walk respects `isOpaqueContent`, so a NESTED
// minipage's still-opaque body is not descended (that body's own sub-run guards
// its own level).
//
// NOT forbidden: a plain `<fig src="path.png">` / `<fig src="http://…">` image.
// That is not an asset-store pull (no `@`), it cannot pull enscribe source, and
// the spec scopes the forbid to the `@src`/`<data>` asset mechanism. A plain
// external image inside a minipage is allowed.

import { isEnscribeTag } from '../lib/ast-helpers.js';
import { assetError } from './asset-load.js';
import { ENSCRIBE_MINIPAGE_SUBRUN } from '../../core/file-data-keys.js';

const FORBID_MESSAGE = 'external assets (@src / <data>) are not allowed inside a minipage';

/**
 * Is this node a forbidden external pull inside a minipage body?
 *   - any `<data>` node (the declaration host for embedded/external assets and
 *     external <library> sources), or
 *   - any node whose `src` kwarg is an `@`-reference to the asset store.
 */
function isForbiddenExternal(node) {
  if (isEnscribeTag(node, 'data')) return true;
  const src = node?.kwargs?.src;
  return typeof src === 'string' && src.startsWith('@');
}

/**
 * Neutralize forbidden external pulls in a minipage body, in place, into visible
 * `__asset-error` nodes. Walks `content` (skipping opaque bodies — a nested
 * minipage's raw source) and `children`.
 *
 * @param {object} node
 */
function neutralize(node) {
  if (!node || typeof node !== 'object') return;
  if (isEnscribeTag(node) && isForbiddenExternal(node)) {
    const ref = typeof node.kwargs?.src === 'string' ? node.kwargs.src : `<${node.tagname}>`;
    assetError(node, ref, FORBID_MESSAGE);
    return; // the node is now an __asset-error (no content to descend)
  }
  if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
    for (const c of node.content) neutralize(c);
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) neutralize(c);
  }
}

/**
 * The guard plugin. No-op unless this run is a minipage sub-run.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeMinipageGuard() {
  return (tree, file) => {
    if (!file?.data?.[ENSCRIBE_MINIPAGE_SUBRUN]) return;
    for (const child of tree.children ?? []) neutralize(child);
  };
}
