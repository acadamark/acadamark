// Frame handler — renders the generic `<frame>` element with optional
// title, caption, border, and per-instance opt-in numbering.
//
// `<frame>` is the catch-all frameable container — a generic outlined
// box around arbitrary content. Per frame.md's vocab:
//   - border defaults to TRUE (the point of <frame> is the visual frame)
//   - numbered defaults to FALSE (most uses are one-off callouts)
//
// The handler:
//   - Extracts <caption> / <title> child tags from content
//   - Renders the remaining content as the body
//   - Calls renderFrameable with kind='frame' (inside-figure layout —
//     <figcaption> child of the <figure> wrapper)
//
// Wrapper element: <figure>. The eHTML tagname is `<frame>` (the
// vocab key), and `html_output.element: frame` in frame.md is only
// the vocab-key signal for handler-strategy entries — the handler
// controls actual HTML output. Using <figure> here lets the frameable
// caption/title placement work uniformly with the inside-figure layout
// from renderFrameable.
//
// Phase 3 slice 3c (2026-05-28). Vocab entry declared in slice 3b.

import { mapAttributes } from '../../core/map-attributes.js';
import { htmlEmit, aggregateHtmlProps } from '../lib/html-emit.js';
import { extractFrameableChildren, renderFrameable, frameableBorderLook, readFrameableBorder } from '../lib/frameable.js';
import { convertChildren } from '../lib/ast-helpers.js';

/**
 * Handler for the `<frame>` tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "frame"
 * @param {object} vocab - vocabulary entry for <frame>
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function frameHandler(state, node, vocab) {
  const { captionHast, titleHast, bodyContent } = extractFrameableChildren(state, node);
  const bodyHast = convertChildren(state, node, bodyContent);

  // Frame's `border` default is TRUE (per frame.md); -border / border=false
  // suppresses it. Shared boolean read with the aside handler (#170).
  const border = readFrameableBorder(node);
  // #58: border=<name> selects a named look (and implies border-on).
  const borderLook = frameableBorderLook(node);

  const wrapperProps = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));
  // Add data-frame-type if the type kwarg passed through (schema mapping
  // sets it for us via aggregateHtmlProps(mapAttributes(...)), since frame.md declares
  // `type: maps_to: data-frame-type`).

  return renderFrameable({
    kind: 'frame',
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
