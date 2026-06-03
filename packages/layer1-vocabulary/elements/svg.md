---
semantic_role: svg
html_output:
  element: svg
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    width:
      maps_to: width
      notes: |
        SVG width attribute. CSS length or unitless number. Maps directly
        to the rendered <svg> element's width attribute.
    height:
      maps_to: height
      notes: |
        SVG height attribute. Same shape as width.
    viewBox:
      maps_to: viewBox
      notes: |
        SVG viewBox attribute. Defines the coordinate system. Passes
        through to the rendered <svg> element.
    caption:
      handled_by: handler
      notes: |
        Optional caption text rendered in a sibling <figcaption>.
        Phase 3 slice 3c will lift this kwarg to a <caption> child tag
        at the normalize-to-canonical gate, matching the frameable
        convention.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this SVG participates in the document-wide figure
        sequence (shares the `figure` counter with <fig>, <mermaid>,
        <abc>). Use +numbered (default) to number, -numbered to
        suppress.
    border:
      handled_by: handler
      default: false
      notes: |
        Phase 3 frameable surface. When +border is set, the rendered
        <svg> wrapper gains the `frameable-border` class.
content:
  type: opaque
  becomes: raw-svg-source
  notes: |
    The pipe content is the SVG source — pass-through to the rendered
    <svg> element. Treated as opaque (not re-parsed by the recursive
    content step) because SVG is its own XML language and the parser
    has no business interpreting it.
content_handler: opaque
jats_counterpart:
  element: graphic
  attributes: {}
  notes: |
    JATS uses <graphic> for embedded images (raster or vector). Inline
    SVG in enscribe exports as <graphic xlink:href="#svg-N"> with the
    SVG content placed in the article's resource bundle, or — when the
    export target supports it — as <graphic> with the SVG inline.
    Wrapping in <fig>...</fig> is the captioned form for JATS.
shorthand_examples:
  - source: |
      <svg -numbered viewBox="0 0 100 100" width=200 height=200 |
        <circle cx="50" cy="50" r="40" fill="blue" />
      >
    layer1_html: |
      <svg viewBox="0 0 100 100" width="200" height="200">
        <circle cx="50" cy="50" r="40" fill="blue" />
      </svg>
    notes: |
      A lone inline SVG. `<svg>` is numbered by default (it shares the
      figure counter), so `-numbered` is what opts out of framing for a
      purely inline graphic. The source is opaque pipe content; the
      attributes pass through to the rendered <svg> element.
  - source: |
      <svg #fig:diagram viewBox="0 0 100 100" caption="A simple circle" |
        <circle cx="50" cy="50" r="40" />
      >
    layer1_html: |
      <figure>
        <svg id="fig:diagram" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" />
        </svg>
        <figcaption>Figure 1. A simple circle</figcaption>
      </figure>
    notes: |
      Captioned and numbered → framed by the ordinary frameable rule: the
      handler wraps the <svg> in a <figure> with the <figcaption> as a
      sibling inside the wrapper (figcaption is not a valid child of <svg>).
      Shares the figure counter with <fig>; `<ref @fig:diagram>` resolves
      to "Figure N".
interpreter_strategy: handler
handler_module: ./handlers/svg.js
handler_responsibilities:
  - Emit the <svg> element with the standard SVG attributes (width, height, viewBox).
  - Preserve the pipe-content SVG source verbatim as the rendered <svg>'s inner content.
  - When +border is set, add `frameable-border` to the class list.
  - When captioned or numbered, frame the <svg> by wrapping it in a <figure> with the <figcaption> as a sibling inside the wrapper (figcaption is not a valid child of <svg>); the figcaption carries the "Figure N." label prefix and any caption text. A bare <svg -numbered> with no caption renders as a lone <svg>.
---

# `<svg>`

Inline SVG embedded in the document. A member of the Phase 3 frameable class — captionable, numberable, optionally bordered.

`<svg>` lets an author embed vector graphics directly without going through `<fig>`'s image-via-src path. The pipe content is the SVG XML source, treated as opaque (the parser does not interpret it).

## Semantic intent

SVG is a first-class web image format and a frequent academic-publishing need (diagrams, scientific plots, custom illustrations). `<svg>` provides a direct authoring surface for SVG that integrates with enscribe's frameable infrastructure for numbering and captioning.

The rendered output is HTML-native `<svg>` (which browsers handle natively). For JATS export, the SVG content lifts to `<graphic>` with appropriate referencing.

## Frameable membership

`<svg>` is a member of the Phase 3 frameable class — and it is the **canonical home for framed inline SVG**. It shares the figure counter with `<fig>`, `<mermaid>`, `<abc>`. The shared frameable surface attributes apply: `id`, `caption`, `border`, `numbered`. A captioned or numbered `<svg>` is framed by the ordinary frameable rule — wrapped in a `<figure>` with the `<figcaption>` inside, matching `<fig>`. A bare `<svg -numbered>` with no caption stays a lone `<svg>`.

There is **no `<fig svg>` form**: a `(svg, fig)` format-word path would be a redundant second route to the same framed inline SVG that `<svg>`-as-frameable already provides, so it was retired (#81). Inline SVG goes through `<svg>`.

## Why a handler

The handler is needed because:

- The pipe content is opaque SVG source, not parsed as enscribe.
- The frameable caption rendering needs to emit a `<figcaption>` sibling when numbered or captioned.
- The `+border` flag adds the `frameable-border` class.

## Authoring patterns

**Inline SVG.**

```
<svg viewBox="0 0 100 100" width=200 height=200 |
  <circle cx="50" cy="50" r="40" fill="blue" />
>
```

**Captioned SVG (frameable).**

```
<svg #fig:phase-diagram caption="Water's phase diagram" |
  <!-- ... SVG source ... -->
>
```

The id enables `<ref @fig:phase-diagram>` cross-references resolving to "Figure N".

## Attributes

- `width`, `height`, `viewBox` — standard SVG attributes; pass through to the rendered element.
- `caption` — optional caption text. Frames the SVG: the `<svg>` is wrapped in a `<figure>` with the caption in a `<figcaption>` inside.
- `+border` — Phase 3 frameable surface; adds `frameable-border` class.
- `+numbered` / `-numbered` — participates in the figure counter by default.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<svg>` | `<graphic>` (typically via `<fig>` wrapper) |
| Captioned `<svg>` | `<fig><graphic.../><caption>...</caption></fig>` |

## See also

- [`<fig>`](fig.md) — image figures via src.
- [`<frame>`](frame.md) — generic frameable wrapper.
- [`<mermaid>`](mermaid.md) — diagram via Mermaid DSL.
- [`<abc>`](abc.md) — music notation via abc DSL.
