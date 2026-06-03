---
semantic_role: frame
html_output:
  element: frame
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    title:
      handled_by: handler
      notes: |
        Optional title rendered at the top of the frame (the frameable
        title-top convention), as a title= kwarg or a <title> child tag.
    caption:
      handled_by: handler
      notes: |
        Optional caption text rendered at the bottom of the frame
        (the frameable caption-bottom convention). The caption= kwarg
        lifts to a <caption> child tag at the gate.
    type:
      maps_to: data-frame-type
      notes: |
        Optional classification of what the frame contains (note,
        warning, tip, theorem-block, etc.), preserved as the
        data-frame-type attribute. Since <frame> renders as
        <figure class="frameable-border"> (not a custom <frame> element),
        authors target it with the rendered figure —
        figure[data-frame-type="note"] { … } — not a ".frame" selector.
  booleans:
    numbered:
      handled_by: handler
      default: false
      notes: |
        Whether this frame participates in the document-wide figure
        sequence. **Off by default for frame** (unlike <fig>/<svg>/etc.)
        because a generic frame is typically a sidebar / callout /
        annotation, not a numbered float. Use +numbered to opt in.
    border:
      handled_by: handler
      default: true
      notes: |
        The frameable surface. **On by default for frame** (unlike
        <fig>/<svg>/etc.) because the whole point of the generic
        <frame> element is the visual frame. Use -border to suppress
        the outline and just use the frame as a semantic grouping
        wrapper. border=<name> selects a named look (accent / thick /
        dashed / subtle) and implies the border on; the look renders as a
        frameable-border-<name> modifier class (document names it, theme
        defines it — #58; see frameable.md).
content:
  type: prose
  becomes: children
  notes: |
    The pipe content is the frame's body. Prose (paragraphs, inline,
    embedded elements) — same content model as <aside> or <section>.
    Recursive content parsing applies.
content_handler: default
jats_counterpart:
  element: boxed-text
  attributes: {}
  notes: |
    JATS <boxed-text> is the closest counterpart — a generic boxed,
    set-apart content block. The `type` kwarg can map to JATS's
    content-type attribute. For numbered frames, wrap in <fig> at
    export.
shorthand_examples:
  - source: '<frame | A short callout.>'
    layer1_html: |
      <figure class="frameable-border">A short callout.</figure>
    notes: |
      The simplest case. The handler emits a <figure> wrapper (the vocab
      html_output.element `frame` is only the lookup key for handler-strategy
      entries — the handler controls the actual element). +border is default on
      for <frame>, so the class appears automatically.
  - source: |
      <frame type=note title="Important" |
      Make sure to read this carefully.
      >
    layer1_html: |
      <figure class="frameable-border" data-frame-type="note">
        <figcaption class="title">Important</figcaption>
        Make sure to read this carefully.
      </figure>
    notes: |
      With a title rendered at the top.
  - source: |
      <frame #fig:method-box +numbered caption="Workflow steps" |
      1. Collect data.
      2. Clean.
      3. Model.
      >
    layer1_html: |
      <figure class="frameable-border" id="fig:method-box">
        1. Collect data.
        2. Clean.
        3. Model.
        <figcaption>Figure 1. Workflow steps</figcaption>
      </figure>
    notes: |
      Numbered frame, opted in via +numbered. Shares the figure
      counter with <fig>/<svg>/<mermaid>/<abc>.
interpreter_strategy: handler
handler_module: ./handlers/frame.js
handler_responsibilities:
  - Emit the <frame> wrapper element (a custom element; not HTML-native).
  - Apply `frameable-border` class by default (border flag default true).
  - Render optional title at the top of the frame.
  - Render optional caption (with "Figure N." label prefix if numbered) at the bottom.
  - Pass through type kwarg as data-frame-type.
---

# `<frame>`

A generic frameable container — an outline-box wrapper around arbitrary content with optional title and caption. The catch-all member of the frameable class.

## Semantic intent

`<frame>` exists because not every framed piece of content is a `<fig>`, `<table>`, or `<svg>` — some are sidebars, callouts, theorem-block wrappers, methodology boxes, or just visually-separated content blocks that the author wants to draw attention to. `<frame>` provides a generic wrapper with the frameable surface (id, title, caption, border, numbered) and no opinion about what's inside.

## Frameable membership

`<frame>` is the generic member of the frameable class. Unlike `<fig>`/`<svg>` (which default to numbered+borderless), `<frame>` defaults the opposite way: **borderless by default → no, +border is default-true; numbered by default → no, default-false**. The reasoning:

- A generic `<frame>` is most often used as a visual callout where the frame IS the point — so border defaults on.
- A generic `<frame>` is not always a numbered float — it's often a one-off annotation that doesn't need cross-referencing. So numbering defaults off; authors opt in via `+numbered` when they want it.

## Authoring patterns

**Plain frame.**

```
<frame | Important context the reader should keep in mind.>
```

Renders as a bordered box with the content inside.

**Titled frame.**

```
<frame type=note title="Methodology" |
We used random forests with 500 trees…
>
```

The title renders at the top of the frame; the `type` is preserved as a data attribute for CSS targeting.

**Numbered frame (callable from elsewhere).**

```
<frame #fig:setup +numbered caption="Experimental setup" |
…description…
>
```

Numbered frames share the figure counter; `<ref @fig:setup>` resolves to "Figure N".

## Attributes

- `title` — optional title at the top of the frame.
- `caption` — optional caption at the bottom (with "Figure N." prefix when numbered).
- `type` — classification (note / warning / tip / methodology / etc.). Renders as `data-frame-type` for CSS targeting.
- `+border` / `-border` — the frameable surface. **Default: on.**
- `border=<name>` — select a named border look — `accent`, `thick`, `dashed`, or `subtle` (the default theme's starter menu); implies the border on. The document names the look; the theme defines how it renders (#58). Emitted as a `frameable-border-<name>` modifier class. See `frameable.md`.
- `+numbered` / `-numbered` — the frameable surface. **Default: off.**

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<frame>` | `<boxed-text>` |
| `type` kwarg | `content-type` attribute |
| Numbered `<frame>` | `<fig><boxed-text/><caption/></fig>` |

## See also

- [`<fig>`](fig.md) — image figures.
- [`<svg>`](svg.md) — inline SVG.
- [`<aside>`](aside.md) — tangential content (semantically distinct: an aside breaks the main flow's argument; a frame visually sets apart content that's still part of the argument).
