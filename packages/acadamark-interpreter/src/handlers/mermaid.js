// Mermaid handler — emits external-DSL markup for `<mermaid>` blocks.
//
// `<mermaid>` is an external DSL per `DESIGN.md` §"DSL handlers: included
// vs external". The handler does NOT render the diagram — rendering
// happens external to acadamark, either in the consumer's browser
// (Mermaid's CDN library scans the DOM for `class="mermaid"` and renders
// in-place) or at build time via a headless pre-render pass that finds
// blocks by their `data-acadamark-dsl="mermaid"` attribute.
//
// Emitted markup (sibling-figcaption layout):
//   [<figcaption class="title">title</figcaption>]      (optional title above)
//   <pre class="mermaid" data-acadamark-dsl="mermaid">…source…</pre>
//   [<figcaption>Figure N. caption text</figcaption>]   (optional caption below)
//
// `<pre>` is Mermaid's documented container element. `class="mermaid"`
// is the CDN scanning convention. `data-acadamark-dsl="mermaid"` is the
// acadamark-specific contract for build-time tooling.
//
// Phase 2 slice 2c (2026-05-27) — initial implementation.
// Phase 3 slice 3c (2026-05-28) — refactored to consume the unified
// renderFrameable helper. Caption / title arrive as <caption> / <title>
// child tags (lifted from kwargs at the gate, or author-written).
// Mermaid joins the figure counter (slice 3b NUMBERED_TAGNAMES wiring)
// and now gets a "Figure N." prefix in its caption when numbered.

import { extractFrameableChildren, renderFrameable } from '../lib/frameable.js';

/**
 * Handler for the `<mermaid>` external DSL tag. Emits pass-through
 * markup; rendering happens external to acadamark.
 *
 * @param {object} state - mdast-util-to-hast state
 * @param {object} node  - acadamarkTag with tagname "mermaid"
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function mermaidHandler(state, node) {
  const source = typeof node.content === 'string' ? node.content.trim() : '';
  const id = node.id ?? null;

  // Class list: `mermaid` (the CDN scanning convention) plus any
  // author-supplied classes.
  const classes = ['mermaid'];
  if (node.classes?.length) classes.push(...node.classes);

  const wrapperProps = {
    className: classes,
    'dataAcadamarkDsl': 'mermaid',
  };
  if (id) wrapperProps.id = id;

  const { captionHast, titleHast } = extractFrameableChildren(state, node);

  return renderFrameable({
    kind: 'mermaid',
    bodyHast: [{ type: 'text', value: source }],
    wrapperEl: 'pre',
    wrapperProps,
    captionHast,
    titleHast,
    computedNumber: node.computedNumber ?? null,
    scope: node._scope ?? null,
  });
}
