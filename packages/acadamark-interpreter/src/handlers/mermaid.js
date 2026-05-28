// Mermaid handler — emits external-DSL markup for `<mermaid>` blocks.
//
// `<mermaid>` is an external DSL per `DESIGN.md` §"DSL handlers: included
// vs external". The handler does NOT render the diagram — rendering
// happens external to acadamark, either in the consumer's browser
// (Mermaid's CDN library scans the DOM for `class="mermaid"` and renders
// in-place) or at build time via a headless pre-render pass that finds
// blocks by their `data-acadamark-dsl="mermaid"` attribute.
//
// Emitted markup:
//   <pre class="mermaid" data-acadamark-dsl="mermaid">…source…</pre>
//   <figcaption>optional caption</figcaption>   (only when caption is set)
//
// `<pre>` is Mermaid's documented container element. `class="mermaid"` is
// the CDN scanning convention. `data-acadamark-dsl="mermaid"` is the
// acadamark-specific contract for build-time tooling (independent of any
// CDN-specific class convention that may change).
//
// Phase 2 slice 2c (2026-05-27).

/**
 * Handler for the `<mermaid>` external DSL tag. Emits pass-through
 * markup; rendering happens external to acadamark.
 *
 * @param {object} _state - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node   - acadamarkTag with tagname "mermaid"
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function mermaidHandler(_state, node) {
  const source = typeof node.content === 'string' ? node.content.trim() : '';
  const caption = node.kwargs?.caption ?? null;
  const id = node.id ?? null;

  // Class list: `mermaid` (the CDN scanning convention) plus any
  // author-supplied classes.
  const classes = ['mermaid'];
  if (node.classes?.length) classes.push(...node.classes);

  const properties = {
    className: classes,
    'dataAcadamarkDsl': 'mermaid',
  };
  if (id) properties.id = id;

  const wrapper = {
    type: 'element',
    tagName: 'pre',
    properties,
    children: [{ type: 'text', value: source }],
  };

  if (caption === null) return wrapper;

  // When a caption is set, return a root containing the wrapper plus a
  // <figcaption>. The toHast pipeline accepts root-shaped returns from a
  // handler and inlines their children at the call site.
  return {
    type: 'root',
    children: [
      wrapper,
      {
        type: 'element',
        tagName: 'figcaption',
        properties: {},
        children: [{ type: 'text', value: String(caption) }],
      },
    ],
  };
}
