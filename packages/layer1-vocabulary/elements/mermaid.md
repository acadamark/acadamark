---
semantic_role: mermaid
html_output:
  element: mermaid
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` here is the vocabulary lookup key (must match
    the tagname). The handler emits the wrapper element shape directly
    (a `<pre class="mermaid" data-acadamark-dsl="mermaid">…</pre>`) so
    the schema field is not consulted under
    `interpreter_strategy: handler`.

    `<mermaid>` is an **external DSL** per `DESIGN.md` §"DSL handlers:
    included vs external". Acadamark preserves the source as marked
    markup; rendering to SVG happens external to acadamark — at view
    time in the browser (Mermaid's CDN library scans the DOM for
    `class="mermaid"` and renders in-place) or at build time via a
    headless pre-render pass that finds blocks by their
    `data-acadamark-dsl="mermaid"` attribute.
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
        `<figcaption>` sibling after the rendered diagram. Diagrams that
        participate in figure numbering use the `<figure>` wrapping
        pattern; the bare `caption` kwarg here is for simple unnumbered
        captions.
content:
  type: opaque
  notes: |
    Author writes Mermaid diagram source verbatim. Acadamark preserves
    the content unmodified inside the wrapper element. Mermaid's
    rendering library (loaded from CDN at view time, or run at build
    time) parses the source.
content_handler: mermaid
jats_counterpart:
  element: '(no direct JATS counterpart; rendered as <graphic>/<inline-graphic> at export)'
  notes: |
    JATS has no Mermaid-source counterpart. At JATS export the rendered
    SVG (produced by the consumer's view-time or build-time tooling) is
    embedded as a `<graphic>` element. The acadamark source itself
    (Mermaid notation) is preserved in the canonical Layer 1 form for
    round-trip; export emits the rendered SVG instead of the source.
shorthand_examples:
  - source: |
      <mermaid>
      graph LR
        A[Start] --> B{Decision}
        B -->|yes| C[OK]
        B -->|no| D[Stop]
      </mermaid>
    layer1_html: |
      <pre class="mermaid" data-acadamark-dsl="mermaid">graph LR
        A[Start] --> B{Decision}
        B -->|yes| C[OK]
        B -->|no| D[Stop]</pre>
    notes: |
      A simple flowchart. Mermaid's CDN library scans the DOM for
      `class="mermaid"` and replaces the `<pre>` content with rendered
      SVG. The `data-acadamark-dsl="mermaid"` attribute lets build-time
      tooling find the same blocks unambiguously, independent of the
      CDN-specific class convention.
interpreter_strategy: handler
handler_module: ./handlers/mermaid.js
handler_responsibilities:
  - Read the opaque content as Mermaid source.
  - Emit a `<pre class="mermaid" data-acadamark-dsl="mermaid">…</pre>`
    wrapper preserving the source verbatim.
  - Apply id / classes from the node (the `mermaid` class is added by
    the handler in addition to any author-supplied classes; the
    `data-acadamark-dsl` attribute is always present).
  - Honor the optional `caption` kwarg by emitting a sibling
    `<figcaption>`.
---

# `<mermaid>`

A Mermaid diagram block. External DSL — the source is preserved as marked markup; rendering to SVG happens external to acadamark.

## Semantic intent

`<mermaid>` is acadamark's tag for Mermaid diagram source (flowcharts, sequence diagrams, Gantt charts, etc.). The handler emits a `<pre class="mermaid" data-acadamark-dsl="mermaid">…</pre>` wrapper that preserves the diagram source. Rendering happens external to acadamark by one of two paths:

1. **View-time rendering** — the consumer's HTML includes Mermaid's library from a CDN (e.g. `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>`). Mermaid's default initialization scans the DOM for `class="mermaid"` elements and replaces their content with rendered SVG. The acadamark wrapper matches that convention, so no extra wiring is needed.

2. **Build-time rendering** — a pre-render pass (running Mermaid in a headless browser context) finds blocks by their `data-acadamark-dsl="mermaid"` attribute and replaces the source with rendered SVG before publication. The `data-acadamark-dsl` attribute is the acadamark-specific contract; it's independent of Mermaid's CDN class convention, which may change between versions.

See `DESIGN.md` §"DSL handlers: included vs external" for the architectural framing.

## Authoring

```
<mermaid>
graph LR
  A[Start] --> B{Decision}
  B -->|yes| C[OK]
  B -->|no| D[Stop]
</mermaid>
```

The content is Mermaid source, preserved verbatim. Any Mermaid diagram type (flowchart, sequence, class, state, ER, Gantt, etc.) works — acadamark doesn't parse the source.

## Attributes

`id` — cross-reference target; preserved on the rendered wrapper.
`class` — author-supplied classes; added to the wrapper alongside `mermaid`.
`caption` — optional caption text; rendered as a sibling `<figcaption>`. For numbered figures, use `<figure>` wrapping instead.

## See also

- [`<abc>`](abc.md) — the other external DSL (music notation).
- `DESIGN.md` §"DSL handlers: included vs external" — the architectural framing.
- [`<figure>`](figure.md) — for numbered, captioned diagram blocks.
