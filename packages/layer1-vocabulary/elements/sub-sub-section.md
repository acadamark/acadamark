---
semantic_role: sub-sub-section
html_output:
  element: sub-sub-section
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    sec-type:
      maps_to: data-sec-type
      values: [intro, methods, results, discussion, conclusion, supplementary, materials, references, other]
    numbering-style:
      maps_to: data-numbering-style
      values: [arabic, roman, alpha, none]
content:
  type: structured
  shape:
    - element: sub-sub-section-title
      required: false
      contains: [inline]
    - element: sub-sub-section-subtitle
      required: false
      contains: [inline]
    - element: body
      required: false
      contains: [block]
      notes: |
        Sub-sub-sections do not contain further nested section levels. Depth
        bottoms out at three. Documents requiring deeper nesting should
        reorganize their structure or extend the depth ladder explicitly.
content_handler: default
title_extraction: true
jats_counterpart:
  element: sec
  attributes:
    sec-type: from sec-type
  notes: |
    JATS uses recursive <sec>; enscribe's <sub-sub-section> becomes a nested
    <sec> at depth 3 inside its parent.
shorthand_examples:
  - source: |
      <sub-sub-section | Regression analysis>
      Detailed methods for the regression.
    layer1_html: |
      <sub-sub-section>
        <sub-sub-section-title>Regression analysis</sub-sub-section-title>
        <p>Detailed methods for the regression.</p>
      </sub-sub-section>
  - source: |
      <section | Methods>
      <sub-section | Statistical methods>
      <sub-sub-section | Regression>
      Linear regression was performed.

      <sub-sub-section | Sensitivity testing>
      Sensitivity tests were performed.
    layer1_html: |
      <section>
        <section-title>Methods</section-title>
        <sub-section>
          <sub-section-title>Statistical methods</sub-section-title>
          <sub-sub-section>
            <sub-sub-section-title>Regression</sub-sub-section-title>
            <p>Linear regression was performed.</p>
          </sub-sub-section>
          <sub-sub-section>
            <sub-sub-section-title>Sensitivity testing</sub-sub-section-title>
            <p>Sensitivity tests were performed.</p>
          </sub-sub-section>
        </sub-section>
      </section>
interpreter_strategy: schema
related_plugins:
  - name: enscribeSectionNesting
    runs_before: enscribeInterpreter
    purpose: 'Phase 2 — implicit closing of peer sub-sub-sections. See notes/specs/pipeline.md for the full pipeline.'

---

# `<sub-sub-section>`

A sub-sub-section is a depth-3 division within a sub-section. The deepest level of enscribe's named-depth ladder.

## Semantic intent

Use `<sub-sub-section>` for genuinely deep content hierarchies — typically detailed methods sections, technical appendices, or comprehensive analyses where three levels of organization are needed. Most academic writing doesn't reach this depth; if you find yourself reaching for sub-sub-sections frequently, consider whether the content would be clearer with shallower divisions.

The depth ladder bottoms out here. There is no `<sub-sub-sub-section>` element. If a document genuinely needs deeper structure, the conventions are:

- Reorganize the content into shallower hierarchies.
- Use a different containing element (a separate book-part, perhaps) to reset the depth.
- Add `<sub-sub-sub-section>` to the vocabulary as an explicit extension if a real use case emerges.

The cap at three levels is a deliberate authoring constraint, mirroring LaTeX's `\section`/`\subsection`/`\subsubsection` ladder.

## Title-after-pipe shorthand

The shorthand form puts the sub-sub-section title in the pipe content:

```
<sub-sub-section | Regression analysis>
Detailed regression methods.
```

## Implicit closing

Sub-sub-sections close implicitly when a peer-level sub-sub-section opens, or when any ancestor section opens (which closes the parent sub-section, which transitively closes any open sub-sub-section).

## Structure within a sub-sub-section

A sub-sub-section contains:

- An optional `<sub-sub-section-title>` (supplied by title extraction from the pipe, or written explicitly).
- An optional `<sub-sub-section-subtitle>`.
- Body content: paragraphs, figures, asides, blockquotes, tables, lists.

Notably, a sub-sub-section does not contain further nested section levels.

## Attributes

`sec-type` and `numbering-style` work the same as for `<section>` and `<sub-section>`.

## JATS mapping

`<sub-sub-section>` maps to a JATS `<sec>` nested at depth 3 within its grandparent `<sec>`.

| enscribe Layer 1 | JATS |
|-------------------|------|
| `<sub-sub-section>` | `<sec>` (nested at depth 3) |
| `<sub-sub-section-title>` | `<title>` (inside the depth-3 `<sec>`) |
| `<sub-sub-section-subtitle>` | `<subtitle>` |
| `sec-type` attribute | `sec-type` attribute |

## Authoring patterns

**Simple sub-sub-section.**

```
<sub-sub-section | Regression analysis>
Content.
```

**Within a deep methods section.**

```
<section | Methods>
<sub-section | Statistical methods>
<sub-sub-section | Regression>
Content for regression.

<sub-sub-section | Bootstrap>
Content for bootstrap.
```

The implicit closing handles the boundaries: each new `<sub-sub-section>` at peer depth closes the previous one.

## Render-mode lowering

In semantic mode, `<sub-sub-section>` and its title elements are preserved.

In render mode:

| Layer 1 element | Render-mode lowering |
|----------------|----------------------|
| `<sub-sub-section>` | `<section>` (HTML5's recursive section element) |
| `<sub-sub-section-title>` | `<h3>` (when nested within sections whose titles lower to `<h1>` and `<h2>`) |
| `<sub-sub-section-subtitle>` | `<p class="subtitle">` |

The render-mode plugin determines heading levels based on the surrounding document.

## See also

- [`<section>`](section.md) — depth 1.
- [`<sub-section>`](sub-section.md) — depth 2, the parent.
