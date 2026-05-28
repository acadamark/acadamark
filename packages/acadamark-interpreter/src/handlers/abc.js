// ABC handler — emits external-DSL markup for `<abc>` music-notation
// blocks.
//
// `<abc>` is an external DSL per `DESIGN.md` §"DSL handlers: included vs
// external". The handler does NOT render the notation — rendering happens
// external to acadamark, either in the consumer's browser (a small init
// script calling `ABCJS.renderAbc` on each marked element) or at build
// time via a headless pre-render pass.
//
// Emitted markup:
//   <div class="abc" data-acadamark-dsl="abc">…source…</div>
//   <figcaption>optional caption</figcaption>   (only when caption is set)
//
// Unlike Mermaid, abcjs has no DOM-scanning initialization — the consumer
// needs an init script that finds each `data-acadamark-dsl="abc"` element
// and calls `ABCJS.renderAbc` on its content. The vocab entry abc.md
// shows a typical init script.
//
// `<div>` is the container (vs `<pre>` for Mermaid): abcjs replaces the
// element's content with rendered SVG, so a block-level container is
// natural; `<pre>`'s preformatted styling would only matter while the
// source is visible (briefly, before init runs).
//
// Phase 2 slice 2c (2026-05-27).

/**
 * Handler for the `<abc>` external DSL tag. Emits pass-through markup;
 * rendering happens external to acadamark via an abcjs init script.
 *
 * @param {object} _state - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node   - acadamarkTag with tagname "abc"
 * @returns {import('hast').Element|{type:'root',children:Array}}
 */
export function abcHandler(_state, node) {
  const source = typeof node.content === 'string' ? node.content.trim() : '';
  const caption = node.kwargs?.caption ?? null;
  const id = node.id ?? null;

  // Class list: `abc` (the conventional marker) plus any author-supplied
  // classes.
  const classes = ['abc'];
  if (node.classes?.length) classes.push(...node.classes);

  const properties = {
    className: classes,
    'dataAcadamarkDsl': 'abc',
  };
  if (id) properties.id = id;

  const wrapper = {
    type: 'element',
    tagName: 'div',
    properties,
    children: [{ type: 'text', value: source }],
  };

  if (caption === null) return wrapper;

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
