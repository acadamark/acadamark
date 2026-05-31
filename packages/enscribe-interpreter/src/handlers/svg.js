// SVG handler — renders `<svg>` as an HTML-native inline SVG element
// with optional frameable caption / title.
//
// The pipe content is the opaque SVG XML source. The handler wraps it
// in <svg> with passthrough attributes (viewBox, width, height) and
// uses the unified renderFrameable helper for caption / title /
// numbering — same shape as fig, treated as kind='svg' (which the
// helper maps to the inside-figure layout: <figcaption> child of an
// outer wrapper).
//
// Phase 3 slice 3c (2026-05-28). Vocab entry declared in slice 3b;
// handler wired in 3c.
//
// NOTE on the wrapper element. SVG is itself a captionable HTML5
// element, so the cleanest output is `<figure>` wrapping the `<svg>`
// element rather than the `<svg>` element holding its own
// `<figcaption>` child (which it can't — figcaption is not a valid
// child of svg). We use renderFrameable's inside-figure layout: a
// <figure> wrapper around the <svg>, with <figcaption> inside the
// wrapper.

import { mapAttributes } from '@enscribejs/core/map-attributes';
import { htmlEmit, aggregateHtmlProps } from '../lib/html-emit.js';
import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';

/**
 * Handler for the `<svg>` tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "svg"
 * @param {object} vocab - vocabulary entry for <svg>
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function svgHandler(state, node, vocab) {
  const source = typeof node.content === 'string' ? node.content : '';
  const { captionHast, titleHast } = extractFrameableChildren(state, node);

  // Build the inner <svg> element. Use buildProperties for schema-mapped
  // attributes (viewBox, width, height — all declared in svg.md).
  const svgProps = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));
  // The author-supplied SVG source goes into the <svg> as a `raw` hast
  // node (svg-as-XML pass-through). hast-to-html will emit it verbatim.
  const innerSvg = {
    type: 'element',
    tagName: 'svg',
    properties: svgProps,
    children: [{ type: 'raw', value: source }],
  };

  // No <figure> wrapping when there's no caption / title / number — keep
  // the bare <svg> as the output. This matches the principle that
  // surrounding markup is added only when it carries information.
  const hasFrameableContent =
    captionHast || titleHast || node.computedNumber != null;
  if (!hasFrameableContent) {
    return innerSvg;
  }

  // Phase 3 frameable surface: +border opts in to the frameable-border
  // class on the wrapping <figure>.
  const border = node.booleans?.border === true;

  // The SVG element itself carries id (per schema-mapped properties);
  // the wrapping <figure> doesn't need its own id. The frameable
  // border class belongs on the wrapper.
  const wrapperProps = {};

  return renderFrameable({
    kind: 'svg',
    bodyHast: [innerSvg],
    wrapperEl: 'figure',
    wrapperProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
    border,
  });
}
