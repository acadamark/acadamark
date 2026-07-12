// Minipage no-external guard (#115, extended by #411).
//
// A minipage body is a SEALED, self-contained sub-document: it must not reach
// out to external files, and (#411, Ariel: "one document, one library") it must
// not carry its own citation library — a box `<cite>` resolves against the
// DOCUMENT's library through the seal's read-through, so a boxed `<library>`
// could only shadow or fork the one registry. Forbidden constructs render a
// VISIBLE flag, never a silent drop:
//
//   - a `<data>`/bare `<library>` in the box → a `__library-error` from the #410
//     misplacement family (library-load.js owns the factory + message, including
//     the cite-count hint naming how many box cites cannot resolve against the
//     unloaded library), plus a generic `__asset-error` for a `<data>` that also
//     carried non-library declarations;
//   - a body `<fig src="@id">` asset-store pull → a `__asset-error` in place
//     (unchanged from #115).
//
// PLACEMENT OF THE FLAGS (the #411 fix for a silent-loss bug): article-structuring
// runs BEFORE this guard and relocates `<data>` to a ROOT SIBLING of `<article>`,
// and projectMinipageBody later splices only the article's regions — so an error
// node left at the `<data>` node's own position is DISCARDED by the projection
// (pre-#411, a boxed `<data>` vanished with no flag at all). The guard therefore
// blanks the forbidden node in place and injects the visible flags through
// injectBodyErrors, which targets `<article-body>` — inside the projection, so
// the flag always survives into the rendered box.
//
// This runs as an ordinary pipeline plugin, but is a NO-OP on every normal
// document (the ENSCRIBE_MINIPAGE_SUBRUN flag is only set by the deferred phase
// on a minipage sub-run's VFile). Placed after structuring and BEFORE the
// citation / asset index passes (steps 5 / 5.7 / 5.8), so a forbidden node is
// neutralized before any of those would resolve it — the reject-not-resolve
// guarantee — and before library-load's misplacement classifier would flag a
// bare boxed `<library>` with the (here misleading) "move it into <data>"
// advice. The walk respects `isOpaqueContent`, so a NESTED minipage's
// still-opaque body is not descended (that body's own sub-run guards its own
// level).
//
// NOT forbidden: a plain `<fig src="path.png">` / `<fig src="http://…">` image.
// That is not an asset-store pull (no `@`), it cannot pull enscribe source, and
// the spec scopes the forbid to the `@src`/`<data>`/`<library>` mechanisms. A
// plain external image inside a minipage is allowed.

import { isEnscribeTag } from '../lib/ast-helpers.js';
import { assetError } from './asset-load.js';
import { libraryError, minipageLibraryMessage, countCites } from './library-load.js';
import { makeErrorNode, injectBodyErrors } from '../lib/error-injection.js';
import { ENSCRIBE_MINIPAGE_SUBRUN } from '../../core/file-data-keys.js';

const FORBID_MESSAGE = 'external assets (@src / <data>) are not allowed inside a minipage';

/** Blank a forbidden node in place (its visible flag is injected into the body
 * instead — see the placement note above). Leftover tag fields are harmless:
 * every walk keys on `type`. */
function blankNode(node) {
  node.type = 'text';
  node.value = '';
  node.tagname = undefined;
  node.content = null;
  node.children = undefined;
}

/**
 * Neutralize forbidden constructs in a minipage body, in place. `@src` pulls
 * become in-place `__asset-error`s (inline positions survive projection);
 * `<data>` and bare `<library>` nodes are blanked, with their flags collected
 * into `errors` for body injection.
 */
function neutralize(node, errors, boxCites) {
  if (!node || typeof node !== 'object') return;
  if (isEnscribeTag(node, 'data')) {
    const libs = (Array.isArray(node.content) ? node.content : [])
      .filter((c) => isEnscribeTag(c, 'library'));
    for (const lib of libs) {
      errors.push(libraryError(lib.kwargs?.src ?? '', minipageLibraryMessage(boxCites)));
    }
    const nonLibrary = (Array.isArray(node.content) ? node.content : []).some(
      (c) => isEnscribeTag(c) && !isEnscribeTag(c, 'library'),
    );
    if (nonLibrary || libs.length === 0) {
      errors.push(makeErrorNode('__asset-error', 'ref', '<data>', FORBID_MESSAGE));
    }
    blankNode(node);
    return;
  }
  if (isEnscribeTag(node, 'library')) {
    // A bare boxed <library> (outside <data>) — same prohibition, same family
    // flag; blanked here so library-load's bare-misplacement classifier (whose
    // advice is "move it into <data>" — unhelpful in a box) never sees it.
    errors.push(libraryError(node.kwargs?.src ?? '', minipageLibraryMessage(boxCites)));
    blankNode(node);
    return;
  }
  if (isEnscribeTag(node, 'include')) {
    // #424: an <include src> is an outward pull — the sealed sub-document must not
    // reach external files. In-place visible rejection (body-flow position survives
    // the projection), same reject-not-resolve guarantee as the other pulls.
    const incSrc = typeof node.kwargs?.src === 'string' ? node.kwargs.src : '';
    node.type = 'enscribeTag';
    node.tagname = '__include-error';
    node.kwargs = { src: incSrc, message: `<include${incSrc ? ` src="${incSrc}"` : ''}> is not allowed inside a minipage — the box is a sealed sub-document with no outward pulls` };
    node.content = null;
    return;
  }
  const src = node?.kwargs?.src;
  if (isEnscribeTag(node) && typeof src === 'string' && src.startsWith('@')) {
    assetError(node, src, FORBID_MESSAGE);
    return; // the node is now an __asset-error (no content to descend)
  }
  if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
    for (const c of node.content) neutralize(c, errors, boxCites);
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) neutralize(c, errors, boxCites);
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
    const errors = [];
    const boxCites = countCites(tree.children ?? []);
    for (const child of tree.children ?? []) neutralize(child, errors, boxCites);
    injectBodyErrors(tree, errors);
  };
}
