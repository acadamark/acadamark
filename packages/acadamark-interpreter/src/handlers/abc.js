// ABC handler — emits external-DSL markup for `<abc>` music-notation
// blocks.
//
// `<abc>` is an external DSL per `DESIGN.md` §"DSL handlers: included vs
// external". The handler does NOT render the notation — rendering happens
// external to acadamark, either in the consumer's browser (a small init
// script calling `ABCJS.renderAbc` on each marked element) or at build
// time via a headless pre-render pass.
//
// Emitted markup (sibling-figcaption layout):
//   [<figcaption class="title">title</figcaption>]
//   <div class="abc" data-acadamark-dsl="abc">…source…</div>
//   [<figcaption>Figure N. caption text</figcaption>]
//
// Unlike Mermaid, abcjs has no DOM-scanning initialization — the consumer
// needs an init script that finds each `data-acadamark-dsl="abc"` element
// and calls `ABCJS.renderAbc` on its content. The vocab entry abc.md
// shows a typical init script.
//
// `<div>` is the container (vs `<pre>` for Mermaid): abcjs replaces the
// element's content with rendered SVG, so a block-level container is
// natural.
//
// Phase 2 slice 2c (2026-05-27) — initial.
// Phase 3 slice 3c (2026-05-28) — refactored to consume the unified
// renderFrameable helper. Caption / title arrive as <caption> / <title>
// child tags.

import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';

/**
 * Handler for the `<abc>` external DSL tag.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - acadamarkTag with tagname "abc"
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function abcHandler(state, node) {
  const source = typeof node.content === 'string' ? node.content.trim() : '';
  const id = node.id ?? null;

  const classes = ['abc'];
  if (node.classes?.length) classes.push(...node.classes);

  const wrapperProps = {
    className: classes,
    'dataAcadamarkDsl': 'abc',
  };
  if (id) wrapperProps.id = id;

  const { captionHast, titleHast } = extractFrameableChildren(state, node);

  return renderFrameable({
    kind: 'abc',
    bodyHast: [{ type: 'text', value: source }],
    wrapperEl: 'div',
    wrapperProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
  });
}
