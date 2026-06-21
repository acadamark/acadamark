// Minipage handler — renders `<minipage>` as a sealed frameable box (#115).
//
// A `<minipage>` is a LaTeX-style minipage: outwardly an ordinary frameable
// (title, caption, opt-in numbering, optional border, the <figure> wrapper),
// inwardly a SEALED sub-document. Its pipe content is opaque (a raw source
// string held on node.content) — the main pipeline never descends into it, so
// the body's floats, labels, and footnotes never touch the document. The body
// is processed in its own pipeline run by the deferred phase
// (plugins/minipage-deferred.js), which stamps the resolved Layer 1 mdast onto
// `node.minipageResolved`. This handler splices that resolved body into the
// <figure> shell.
//
// Wrapper element: <figure> (kind='minipage' → inside-figure layout in
// renderFrameable, so the <figcaption> sits inside the <figure>). The Layer 1
// tagname is `<minipage>` (the vocab key); the handler emits <figure> the same
// way frame.js does (the html_output.element `minipage` is only the
// handler-strategy lookup key — the handler controls the actual element).
//
// Caption / title are kwargs, not child tags: the body is opaque, so the
// normalize-to-canonical gate's frameable lift leaves caption=/title= as kwargs
// (the `typeof node.content === 'string'` opaque guard), and
// extractFrameableChildren reads them from node.kwargs — the same path
// svg/table/csv take.

import { mapAttributes } from '../../core/map-attributes.js';
import { htmlEmit, aggregateHtmlProps } from '../lib/html-emit.js';
import { extractFrameableChildren, renderFrameable, frameableBorderLook, readFrameableBorder } from '../lib/frameable.js';
import { convertChildren } from '../lib/ast-helpers.js';
import { qualifyMinipageIds, minipageScopeSlug } from '../lib/minipage.js';

/**
 * Handler for the `<minipage>` tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "minipage"
 * @param {object} vocab - vocabulary entry for <minipage>
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function minipageHandler(state, node, vocab) {
  // Body is opaque (node.content is a raw string), so extractFrameableChildren's
  // bodyContent is empty and caption/title come from the kwarg fallback. We use
  // only captionHast / titleHast here; the body is the deferred-phase result.
  const { captionHast, titleHast } = extractFrameableChildren(state, node);

  // The sealed body's resolved Layer 1 mdast, stamped by the deferred phase
  // (plugins/minipage-deferred.js). Absent only if the deferred phase did not
  // run (e.g. an isolated unit test of this handler) — render an empty box then.
  const resolvedBody = Array.isArray(node.minipageResolved) ? node.minipageResolved : [];
  const bodyHast = convertChildren(state, node, resolvedBody);
  // #267: the sealed body restarts ids per box (auto note-N / noteref-N, author colon-ids),
  // so two boxes collide on id="note-1" / id="fig:x" in the assembled document. Scope-qualify
  // every id defined in THIS box (and its in-box references) with the box's unique slug.
  qualifyMinipageIds(bodyHast, minipageScopeSlug(node));

  // Border defaults TRUE (per minipage.md); -border / border=false suppresses it.
  // Shared boolean read with the frame / aside handlers.
  const border = readFrameableBorder(node);
  // #58: border=<name> selects a named look (and implies border-on).
  const borderLook = frameableBorderLook(node);

  // wrapperProps carry id / class (border / numbered are handled_by handler and
  // skipped by mapAttributes).
  const wrapperProps = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));

  return renderFrameable({
    kind: 'minipage',
    bodyHast,
    wrapperEl: 'figure',
    wrapperProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
    border,
    borderLook,
  });
}
