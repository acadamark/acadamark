// Figure handler — handler-strategy dispatch for <figure> elements.
//
// The figure element uses handler strategy because its output structure depends
// on the presence of the src kwarg: with src, it generates <img> + <figcaption>;
// without src, it generates <figcaption> only (the author places inner content
// directly in the pipe content, and the final paragraph is the caption by
// convention — but for slice 1 we treat all pipe content as the figcaption).
//
// Schema-mapped attributes (align, width, type) are handled by the same
// buildProperties logic used in the schema dispatcher.

import { unwrapSingleParagraph } from 'acadamark-core/paragraph-unwrap';
import { buildProperties } from '../lib/build-properties.js';
import { extractPlainText } from '../lib/ast-helpers.js';
import { formatLabel } from '../lib/frameable.js';

// The figure handler uses the shared `buildProperties` helper from
// `lib/build-properties.js` — see that file's comment for the deferred
// lift-to-acadamark-core question coupled to JATS export.

/**
 * Convert the figure's pipe content to hast child nodes for use in
 * <figcaption>. Unwraps a single paragraph (the typical case for pipe text).
 */
function buildCaptionHastNodes(state, node) {
  // Figcaption pipe content is always prose-like, so unconditionally unwrap a
  // single paragraph — this is the figure handler's per-call gate (vs the
  // schema dispatcher's vocab-driven gate; the shared mechanic lives in
  // acadamark-core/paragraph-unwrap).
  const nodes = unwrapSingleParagraph(node.content ?? []);

  return nodes.flatMap(child => {
    const h = state.one(child, node);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
}

/**
 * Figure handler. Called by the interpret-plugin dispatcher when
 * interpreter_strategy === 'handler' and handler_module === './handlers/figure.js'.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - acadamarkTag node with tagname 'figure'
 * @param {object} vocab - vocabulary entry for <figure>
 * @returns {object} hast element
 */
export function figureHandler(state, node, vocab) {
  const src = node.kwargs?.src ?? null;
  const altKwarg = node.kwargs?.alt ?? null;

  const properties = buildProperties(node, vocab);
  const captionHastNodes = buildCaptionHastNodes(state, node);
  const children = [];

  if (src) {
    // Image figure: <img> alt defaults to the figcaption text if not supplied.
    const captionText = altKwarg ?? extractPlainText(node.content ?? []);
    children.push({
      type: 'element',
      tagName: 'img',
      properties: {
        src,
        alt: captionText,
      },
      children: [],
    });
  }

  // Figcaption from pipe content. Present for both image figures and non-image
  // figures (the pipe content is always the caption in slice 1).
  // For numbered figures, prepend "Figure N." label span before the caption
  // content (Phase 3 slice 3b: rendered via the shared formatLabel primitive
  // — see lib/frameable.js for why a label-primitive is the right granularity
  // for the shared helper).
  // Note: only emit figcaption when there's caption content. A numbered
  // figure with no pipe content would lose its "Figure N." label — but
  // that's the pre-Phase-3 behavior and we preserve it here (no fixture
  // hits this case). Adding the label-only figcaption is a deliberate
  // follow-up if needed.
  if (captionHastNodes.length > 0) {
    const labelSpan = formatLabel('Figure', node.computedNumber);
    const finalCaption = labelSpan
      ? [labelSpan, { type: 'text', value: ' ' }, ...captionHastNodes]
      : captionHastNodes;
    children.push({
      type: 'element',
      tagName: 'figcaption',
      properties: {},
      children: finalCaption,
    });
  }

  // Phase 3 frameable surface: +border opts in to the frameable-border
  // class (CSS-targetable per the frameable design). When the kwarg is
  // present (parsed as a boolean kwarg via the +border / -border /
  // border=true author syntax), add the class to the existing classList.
  // The handler does this rather than relying on schema dispatch because
  // `border` is declared `handled_by: handler` on fig.md.
  if (node.booleans?.border === true) {
    const existing = Array.isArray(properties.className) ? properties.className : [];
    properties.className = [...existing, 'frameable-border'];
  }

  return {
    type: 'element',
    tagName: 'figure',
    properties,
    children,
  };
}
