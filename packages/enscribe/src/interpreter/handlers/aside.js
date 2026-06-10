// Aside handler — renders <aside> as a frameable boxed-prose element (#31).
//
// <aside> is a frameable boxed-prose member: it carries the shared frameable
// surface (title at top, caption at bottom, optional border) on top of its
// existing `type` taxonomy and <boxed-text> JATS export. Per the per-member
// defaults (frameable.md), boxed prose has border ON and numbered OFF by
// default; a numbered <aside> counts in its OWN "Box N" series (the `box`
// counter / ref-prefix), not the figure counter.
//
// The wrapper element is <aside> (kept first-class, per frameable.md and the
// #31 decision) — NOT <figure>. renderFrameable's boxed-prose layout places
// the title/caption as <p class="title"> / <p class="caption"> inside the
// <aside>, reusing the .title / .caption styling hooks the figure family uses
// (figcaption is invalid outside <figure>).
//
// This mirrors frameHandler; the only differences are kind/wrapperEl ('aside')
// and that the `type` kwarg maps to data-aside-type via the vocab schema.

import { mapAttributes } from '../../core/map-attributes.js';
import { htmlEmit, aggregateHtmlProps } from '../lib/html-emit.js';
import { extractFrameableChildren, renderFrameable, frameableBorderLook, readFrameableBorder } from '../lib/frameable.js';
import { convertChildren } from '../lib/ast-helpers.js';

/**
 * Handler for the `<aside>` tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag with tagname "aside"
 * @param {object} vocab - vocabulary entry for <aside>
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function asideHandler(state, node, vocab) {
  const { captionHast, titleHast, bodyContent } = extractFrameableChildren(state, node);
  const bodyHast = convertChildren(state, node, bodyContent);

  // Boxed prose: border defaults TRUE; -border / border=false suppresses it.
  // Shared boolean read with the frame handler (#170).
  const border = readFrameableBorder(node);
  // #58: border=<name> selects a named look (and implies border-on).
  const borderLook = frameableBorderLook(node);

  // wrapperProps carry id / class / data-aside-type (the `type` taxonomy maps
  // to data-aside-type via the vocab schema; border/numbered are handled_by
  // handler and skipped by mapAttributes).
  const wrapperProps = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));

  return renderFrameable({
    kind: 'aside',
    bodyHast,
    wrapperEl: 'aside',
    wrapperProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
    border,
    borderLook,
  });
}
