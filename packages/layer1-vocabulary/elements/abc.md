---
semantic_role: abc
html_output:
  element: abc
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` here is the vocabulary lookup key (must match
    the tagname). The handler emits the wrapper element shape directly
    (a `<div class="abc" data-acadamark-dsl="abc">…</div>`); the schema
    field is not consulted under `interpreter_strategy: handler`.

    `<abc>` is an **external DSL** per `DESIGN.md` §"DSL handlers:
    included vs external". Acadamark preserves the source as marked
    markup; rendering to SVG happens external to acadamark — at view
    time in the browser (the consumer initializes abcjs with a small
    script calling `ABCJS.renderAbc` on each marked block) or at
    build time via a headless pre-render pass.
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    caption:
      handled_by: handler
      notes: |
        Optional caption text. When present, the handler emits a
        `<figcaption>` sibling after the wrapper.
content:
  type: opaque
  notes: |
    Author writes ABC notation source verbatim. Acadamark preserves the
    content unmodified inside the wrapper element. abcjs's rendering
    library (loaded from CDN at view time, or run at build time)
    parses the source.
content_handler: abc
jats_counterpart:
  element: '(no direct JATS counterpart; rendered as <graphic>/<inline-graphic> at export)'
  notes: |
    JATS has no ABC-notation counterpart. At JATS export the rendered
    notation (SVG or staff image, produced by the consumer's tooling)
    is embedded as a `<graphic>` element. The acadamark source itself
    is preserved in the canonical Layer 1 form for round-trip; export
    emits the rendered notation instead of the source.
shorthand_examples:
  - source: |
      <abc>
      X:1
      T:Twinkle, Twinkle, Little Star
      M:4/4
      L:1/4
      K:C
      C C G G | A A G2 | F F E E | D D C2 |
      </abc>
    layer1_html: |
      <div class="abc" data-acadamark-dsl="abc">X:1
      T:Twinkle, Twinkle, Little Star
      M:4/4
      L:1/4
      K:C
      C C G G | A A G2 | F F E E | D D C2 |</div>
    notes: |
      An ABC notation excerpt. The wrapper preserves the source verbatim
      for the consumer's abcjs initialization to find and render.
interpreter_strategy: handler
handler_module: ./handlers/abc.js
handler_responsibilities:
  - Read the opaque content as ABC notation source.
  - Emit a `<div class="abc" data-acadamark-dsl="abc">…</div>` wrapper
    preserving the source verbatim.
  - Apply id / classes from the node (the `abc` class is added by the
    handler alongside any author-supplied classes; the
    `data-acadamark-dsl` attribute is always present).
  - Honor the optional `caption` kwarg by emitting a sibling
    `<figcaption>`.
---

# `<abc>`

An ABC music notation block. External DSL — source preserved as marked markup; rendering to SVG happens external to acadamark.

## Semantic intent

`<abc>` is acadamark's tag for ABC notation source. The handler emits a `<div class="abc" data-acadamark-dsl="abc">…</div>` wrapper preserving the source.

Unlike Mermaid (which has a documented DOM-scanning initialization), abcjs requires explicit `ABCJS.renderAbc(target, source)` calls. The consumer's page needs a small initialization script that finds each `data-acadamark-dsl="abc"` element and calls abcjs on its content. A typical consumer script:

```html
<script src="https://cdn.jsdelivr.net/npm/abcjs/dist/abcjs-basic-min.js"></script>
<script>
  for (const el of document.querySelectorAll('[data-acadamark-dsl="abc"]')) {
    const source = el.textContent;
    el.textContent = '';
    ABCJS.renderAbc(el, source);
  }
</script>
```

A build-time pre-render pass can do the same via a headless browser, replacing the `<div>` content with rendered SVG before publication.

See `DESIGN.md` §"DSL handlers: included vs external" for the architectural framing.

## Authoring

```
<abc>
X:1
T:Twinkle, Twinkle, Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
</abc>
```

The content is ABC notation source, preserved verbatim. Standard ABC header fields (`X:`, `T:`, `M:`, `K:`, etc.) followed by the notation body.

## Attributes

`id` — cross-reference target; preserved on the wrapper.
`class` — author-supplied classes; added alongside `abc`.
`caption` — optional caption text; rendered as a sibling `<figcaption>`.

## See also

- [`<mermaid>`](mermaid.md) — the other external DSL (diagrams).
- `DESIGN.md` §"DSL handlers: included vs external" — the architectural framing.
