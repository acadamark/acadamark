# Multi-column display

Multi-column display is a render-mode concern: the Layer 1 structure of
the document is column-agnostic, and a downstream render-mode lowering
produces the CSS (or typeset directives) that implement column flow.
This document describes the intended mechanism. (Whether it is built is
a STATUS question; the open work is tracked as DF-5 in
`BACKLOG-ROADMAP.md`.)

## Use cases

The feature targets several authoring patterns:

- **Journal articles.** Many scientific journals use two-column layouts.
  Authors writing for these venues want their acadamark documents to
  render in the appropriate column format.
- **Newspaper and magazine layouts.** Less common in scholarly contexts
  but relevant for some publication types (editorials, blog-style content
  with sidebar callouts, multi-column figures).
- **Side-by-side comparison.** Comparing two versions of code, two
  interpretations, or two arguments visually benefits from columnar
  layout. Authors otherwise fake this with HTML tables; multi-column is a
  more honest representation.
- **Reference-card style.** Compact, columnar layouts for technical
  reference material (e.g., grammar tables, syntax summaries).

## Design references

Several ecosystems handle multi-column display:

- **LaTeX** has `\twocolumn` and `\onecolumn` as class options, plus the
  `multicol` package for fine-grained control. The mechanism is part of
  the document class.
- **CSS** has the `columns` property family (`column-count`,
  `column-width`, `column-gap`, etc.) for browser-rendered content. The
  browser handles content flow across columns.
- **Typst** has explicit column directives that can apply to specific
  content regions.
- **InDesign and traditional typesetting** treat columns as part of the
  page master, with content flowing through a sequence of frames.

The common pattern: declare a column count for a content region; the
renderer handles content flow.

## Mechanism

Two layers, similar to the multi-file approach.

**Document-level configuration.** The `<config>` block declares the
document's column behavior:

```
<config>
  <columns count=2>
</config>
```

This sets the default for the document body. Front matter (title,
abstract) and back matter (bibliography, appendices) may have their own
column conventions per journal style.

**Per-region overrides.** A specific section or figure may need a
different column count. A kwarg on `<section>` or wrapping in a generic
column-control element expresses this:

```
<section columns=1 | Wide section that spans columns>
Content here flows in a single column.
```

Useful for figures that need to span both columns of a two-column layout,
or for code blocks that do not fit in narrow columns.

## Render-mode lowering

Multi-column display is a render-mode concern, not a Layer 1 vocabulary
concern. The Layer 1 structure stays the same regardless of column count;
the render mode produces the directives that implement the columns.

- **HTML output:** CSS `column-count` on the relevant container.
- **PDF output** (via Pandoc / weasyprint / similar): CSS `column-count`
  is supported by some PDF renderers; explicit column-handling is needed
  for others.
- **Typeset output** (LaTeX → PDF): map `<config><columns count=2>` to
  `\documentclass[twocolumn]` or appropriate `multicol` usage.

## Interaction with figures

Figures in multi-column layouts have a wrinkle: a wide figure needs to
span columns, breaking the column flow. The figure entry supports a
`span` kwarg:

```
<figure span=full src="...">
A figure that spans both columns of a two-column layout.
</figure>
```

The render-mode lowering applies appropriate CSS (`column-span: all`) or
typeset directives.

## Interaction with tables

Tables face the same issue as figures. Wide tables need column-spanning
behavior. The same `span` kwarg pattern works.

## Cascading and inheritance

A document declaring `<columns count=2>` at the document level lets
sections inherit unless they override. This matches how CSS cascades
work and avoids per-section repetition.

When a section is `columns=1` and contains sub-sections, the
sub-sections inherit the section's count (immediate ancestor wins), not
the document default.

## Authoring patterns

Four patterns deserve explicit framing.

1. **Journal-specific column conventions.** Different journals have
   different defaults. A template system (project-level config plus
   journal templates) handles this without authoring every paper from
   scratch.

2. **Responsive vs fixed.** For web display, columns may be responsive
   (more columns on wide screens, fewer on narrow). For print, columns
   are fixed. The render-mode lowering knows whether the target is
   responsive.

3. **Mixing column counts.** A document may have two-column body content
   with single-column front matter (title spans the page). The structural
   plugin applies different column treatments to different regions.

4. **Reflowing for accessibility.** Screen readers and assistive tech
   need content in reading order, not visual order. Multi-column layouts
   preserve underlying reading order (linearization).

## Related references

- `packages/layer1-vocabulary/elements/config.md` — the configuration
  element that carries column settings.
- `packages/layer1-vocabulary/elements/figure.md` — figures that may
  span columns.
- CSS Multi-column Layout: https://www.w3.org/TR/css-multicol-1/
- LaTeX `multicol` package documentation.
