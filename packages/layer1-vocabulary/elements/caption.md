---
semantic_role: caption
category: frameables
html_output:
  element: caption
  is_html_native: true
  default_attributes: {}
  notes: |
    `<caption>` is the canonical child-tag authoring form for a frameable's
    caption (Phase 3 slice 3c). The frameable handler consumes it and renders
    it as the wrapper-appropriate element — `<figcaption>` inside a figure /
    svg / frame, `<caption>` inside a table. A `caption=` kwarg lowers to this
    child form before the handler runs, so every frameable receives one shape.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    contains: [block]
  becomes: children
  notes: |
    A caption is flow content: it can hold one or several paragraphs (and
    block content). Per the single-paragraph wrapping rule
    (notes/specs/shape-tokens.md "Content model and single-paragraph
    wrapping"), `contains: [block]` classifies it as flow, so a
    single-paragraph caption WRAPS in `<p>` — identical to the
    multi-paragraph case, and identical across both authoring forms (the
    `<caption>` child tag and the legacy pipe-content-as-caption fallback),
    which both route through the one parse-time content-model gate.
content_handler: default
jats_counterpart:
  element: caption
  notes: |
    JATS models a float caption as <caption> (containing <title>? and
    <p>+), inside <fig> / <table-wrap>. The flow content model here matches
    JATS's <p>-bearing caption.
interpreter_strategy: schema
---

A frameable's caption — the descriptive text rendered with a figure, table, or
other [[frame]]. The canonical authoring form is a `<caption>` child tag; the
legacy `<fig src=… | caption text>` pipe-content form is also accepted.

A caption's content model is **flow** (it can hold paragraphs and block
content), so a single-paragraph caption wraps in `<p>` for consistency with the
multi-paragraph case — and both authoring forms produce identical caption
content, because both are decided by the one parse-time content-model gate
rather than a per-form rule.
