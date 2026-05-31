// Figure handler — renders `<fig>` (canonical) and the `<figure>` authoring
// alias.
//
// Output: HTML5-native <figure> wrapper containing an optional <img>
// (from the `src` kwarg) and an optional <figcaption> (from either the
// new <caption> child tag — Phase 3 slice 3c canonical form — or the
// legacy pipe-content-as-caption fallback when no <caption> child is
// present).
//
// Slice 3c refactor: this handler now extracts <caption> / <title>
// child tags via the shared `extractFrameableChildren` helper, then
// calls `renderFrameable` to build the wrapped output. Behavior-
// preserving for the legacy pipe-as-caption authoring form (every
// existing fixture); enables formatted captions and titles via the
// new child-tag form.
//
// Schema-mapped attributes (align, width, type) flow through the same
// `buildProperties` helper used by the schema dispatcher.

import { mapAttributes } from 'enscribe-core/map-attributes';
import { htmlEmit, aggregateHtmlProps } from '../lib/html-emit.js';
import { extractPlainText } from '../lib/ast-helpers.js';
import { unwrapSingleParagraph } from 'enscribe-core/paragraph-unwrap';
import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';

/**
 * Legacy pipe-content-as-caption fallback. When the author writes
 * `<fig src=x.jpg | caption text>` without a `<caption>` child, the
 * pipe content (the remaining body after caption/title extraction)
 * becomes the figcaption. Returns hast children or null when the body
 * is empty.
 */
function buildPipeAsCaptionHast(state, node, bodyContent) {
  if (!bodyContent || bodyContent.length === 0) return null;
  const nodes = unwrapSingleParagraph(bodyContent);
  const children = nodes.flatMap(child => {
    const h = state.one(child, node);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
  return children.length > 0 ? children : null;
}

/**
 * Figure handler. Called by the interpret-plugin dispatcher when the
 * vocabulary's `interpreter_strategy === 'handler'` +
 * `handler_module === './handlers/figure.js'`.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - enscribeTag node with canonical tagname 'fig'
 *                          (the gate rewrites authored '<figure>' to 'fig'
 *                          before this handler runs).
 * @param {object} vocab - vocabulary entry for `<fig>`
 * @returns {object} hast element
 */
export function figureHandler(state, node, vocab) {
  const src = node.kwargs?.src ?? null;
  const altKwarg = node.kwargs?.alt ?? null;

  // Extract <caption> / <title> child tags first. These have priority
  // over the pipe-content-as-caption fallback (Phase 3 slice 3c
  // canonical form).
  const { captionHast: childCaptionHast, titleHast, bodyContent } =
    extractFrameableChildren(state, node);

  // Fallback: pipe-content-as-caption when no <caption> child exists.
  // Preserves the legacy figure-as-pipe-caption authoring form. The
  // body content (post caption/title extraction) IS the caption in
  // this fallback.
  const captionHast =
    childCaptionHast ?? buildPipeAsCaptionHast(state, node, bodyContent);

  // Image body: when src is present, generate an <img> as the body.
  // The alt text falls back to the caption (caption-as-content can be
  // arbitrary hast, so we plain-text-ify the original mdast for alt
  // when child <caption> isn't there).
  const bodyHast = [];
  if (src) {
    let altText = altKwarg;
    if (altText == null) {
      // Prefer child <caption>'s plain text if available; else legacy
      // pipe content's plain text.
      if (childCaptionHast) {
        altText = extractHastPlainText(childCaptionHast);
      } else {
        altText = extractPlainText(bodyContent ?? []);
      }
    }
    bodyHast.push({
      type: 'element',
      tagName: 'img',
      properties: { src, alt: altText },
      children: [],
    });
  }

  // Phase 3 frameable surface: +border opts in to the frameable-border class.
  const border = node.booleans?.border === true;

  // Properties for the wrapper (id, classes, schema-mapped attributes).
  const wrapperProps = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));

  return renderFrameable({
    kind: 'fig',
    bodyHast,
    wrapperEl: 'figure',  // HTML5-native; the canonical Layer 1 name is <fig>
                           // but the rendered HTML uses <figure>.
    wrapperProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
    border,
  });
}

/**
 * Extract plain text from a hast children list (for image alt fallback
 * when the caption came from a child <caption> tag, post-hast-conversion).
 */
function extractHastPlainText(children) {
  let text = '';
  for (const node of children ?? []) {
    if (node.type === 'text') {
      text += node.value ?? '';
    } else if (node.children) {
      text += extractHastPlainText(node.children);
    }
  }
  return text;
}
