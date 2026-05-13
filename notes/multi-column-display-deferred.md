# Multi-column display — deferred feature

This document captures the design intent for multi-column display layouts in acadamark. The feature is deferred to a future slice; this note preserves the thinking.

## Status

Deferred. Not in slice 1 or planned subsequent slices. The feature becomes relevant when acadamark is used for typeset output (print PDF, journal-style layouts) where two-column or three-column formatting is the norm for scholarly content.

## Use cases

The feature targets several authoring patterns:

- **Journal articles.** Many scientific journals use two-column layouts. Authors writing for these venues want their acadamark documents to render in the appropriate column format.

- **Newspaper and magazine layouts.** Less common in scholarly contexts but relevant for some publication types (editorials, blog-style content with sidebar callouts, multi-column figures).

- **Side-by-side comparison.** Comparing two versions of code, two interpretations, or two arguments visually benefits from columnar layout. Currently authors might fake this with HTML tables; multi-column is a more honest representation.

- **Reference-card style.** Compact, columnar layouts for technical reference material (e.g., grammar tables, syntax summaries).

## Design references

Several ecosystems handle multi-column display:

- **LaTeX** has `\twocolumn` and `\onecolumn` as class options, plus the `multicol` package for fine-grained control. The mechanism is part of the document class.

- **CSS** has the `columns` property family (`column-count`, `column-width`, `column-gap`, etc.) for browser-rendered content. The browser handles content flow across columns.

- **Typst** has explicit column directives that can apply to specific content regions.

- **InDesign and traditional typesetting** treat columns as part of the page master, with content flowing through a sequence of frames.

The common pattern is: declare a column count for a content region; the renderer handles content flow.

## Likely mechanism

Two layers, similar to the multi-file approach:

**Document-level configuration.** The `<config>` block can declare the document's column behavior:

```
<config>
  <columns count=2>
</config>
```

This sets the default for the document body. Front matter (title, abstract) and back matter (bibliography, appendices) may have their own column conventions per journal style.

**Per-region overrides.** Sometimes a specific section or figure needs a different column count. A kwarg on `<section>` or wrapping in a generic column-control element could express this:

```
<section columns=1 | Wide section that spans columns>
Content here flows in a single column.
```

This is useful for figures that need to span both columns of a two-column layout, or for code blocks that don't fit in narrow columns.

## Render-mode lowering

Multi-column display is a render-mode concern, not a Layer 1 vocabulary concern. The Layer 1 structure stays the same regardless of column count; the render mode produces CSS that implements the columns.

For HTML output: CSS `column-count` on the relevant container.

For PDF output (via Pandoc or weasyprint or similar): CSS `column-count` is supported by some PDF renderers; explicit column-handling may be needed for others.

For typeset output (LaTeX → PDF): map `<config><columns count=2>` to `\documentclass[twocolumn]` or appropriate `multicol` usage.

## Interaction with figures

Figures in multi-column layouts have a wrinkle: a wide figure needs to span columns, breaking the column flow. The figure entry should support a `span` kwarg or similar:

```
<figure span=full src="...">
A figure that spans both columns of a two-column layout.
</figure>
```

The render-mode lowering applies appropriate CSS (`column-span: all`) or typeset directives.

## Interaction with tables

Tables face the same issue as figures. Wide tables need column-spanning behavior. The same `span` kwarg pattern works.

## Cascading and inheritance

If a document declares `<columns count=2>` at the document level, sections inherit unless they override. This matches how CSS cascades work and avoids per-section repetition.

If a section is `columns=1` and contains sub-sections, do the sub-sections inherit the section's count or the document default? Probably the parent section's count (immediate ancestor wins).

## Authoring patterns to consider

**1. Journal-specific column conventions.** Different journals have different defaults. A template system (project-level config plus journal templates) could handle this without authoring every paper from scratch.

**2. Responsive vs fixed.** For web display, columns may be responsive (more columns on wide screens, fewer on narrow). For print, columns are fixed. The render-mode lowering needs to know whether the target is responsive.

**3. Mixing column counts.** A document might have two-column body content with a single-column front matter (title spans the page). The structural plugin needs to apply different column treatments to different regions.

**4. Reflowing for accessibility.** Screen readers and assistive tech need content in reading order, not visual order. Multi-column layouts must preserve underlying reading order (linearization).

## What this means for slice 1

Slice 1 doesn't implement multi-column display. The architecture should accommodate it without requiring redesign.

Specifically:

- The `<config>` element already exists and can carry column settings.
- The structural plugin's output is column-agnostic; the render-mode plugin handles column formatting.
- The figure entry has a `type` kwarg that can be extended to include `multi-part` and (future) column-spanning behaviors.

The Layer 1 vocabulary doesn't change for multi-column support; what changes is the render-mode lowering.

## When to implement

Multi-column display becomes important when:

- Real publication targets require it (journal templates with two-column layouts).
- Typeset output (PDF) is implemented and needs print-quality column flow.
- Users have specific use cases (side-by-side comparison, reference cards).

Plausibly slice 4 or 5, after the core rendering pipeline is solid for single-column output.

## Related references

- `packages/layer1-vocabulary/elements/config.md` — the configuration element that would carry column settings.
- `packages/layer1-vocabulary/elements/figure.md` — figures that may span columns.
- CSS Multi-column Layout: https://www.w3.org/TR/css-multicol-1/
- LaTeX `multicol` package documentation.
