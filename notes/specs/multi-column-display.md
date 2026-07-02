# Multi-column display

Multi-column display is a render-mode concern: the Layer 1 structure of
the document is column-agnostic, and a downstream render-mode lowering
produces the CSS (or typeset directives) that implement column flow.
This document describes the intended mechanism. (Whether it is built is
a STATUS question; the open work is tracked in
GitHub Issues.)

## Use cases

The feature targets several authoring patterns:

- **Journal articles.** Many scientific journals use two-column layouts.
  Authors writing for these venues want their enscribe documents to
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

**Document-level configuration.** The `<config>` element declares the
document's column behavior. Per the config-as-data direction
(`DESIGN.md` §"Design directions" → "Configuration and metadata are
data"; [#134](https://github.com/enscribejs/enscribe/issues/134)), a flat
setting like this is a **kwarg** — `<config columns=2>` — which works with
the existing discovery mechanism without modification:

```
<config columns=2 />
```

Should column configuration ever grow structured (per-region counts,
named column sets), it belongs in `<config>`'s future **fenced data
block** — the one data register all structured config uses — *not* a
nested `<columns>` child element. The earlier sketch of a nested-element
form (`<config><columns count=2></config>`) is **foreclosed by #134**:
structured config is authored as data, never as a hand-written child-tag
tree. (The narrow remaining question — whether column settings need any
structure beyond a flat kwarg — is MC-Q1 below.)

Whichever surface it takes, the document-level setting sets the default
for the document body. Front matter (title, abstract) and back matter
(bibliography, appendices) may have their own column conventions per
journal style.

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

- **HTML output:** CSS `column-count` on a container that carries the
  column setting. *Which* container — the whole-body container
  (`<article-body>` / `<book-body>`) or each `<section>` individually — is
  an open design question (MC-Q2 in §"Open design questions" below); the
  choice affects cascade semantics and the behavior of figures that
  cross section boundaries.
- **PDF output** (via Pandoc / weasyprint / similar): CSS `column-count`
  is supported by some PDF renderers; explicit column-handling is needed
  for others.
- **Typeset output** (LaTeX → PDF): map the document column setting to
  `\documentclass[twocolumn]` or appropriate `multicol` usage.

## Interaction with figures

Figures in multi-column layouts have a wrinkle: a wide figure needs to
span columns, breaking the column flow. The figure entry takes a
`span` kwarg whose value space is an open design question (MC-Q3 in
§"Open design questions" below):

```
<figure span=full src="...">
A figure that spans both columns of a two-column layout.
</figure>
```

`span=full` is the canonical "span everything" value; whether other
values (e.g. `span=2` for spanning two columns of a three-column layout,
`span=column-set`, `span=none`) are accepted is undecided. The cascade
interaction — what `span=full` means inside a section that is already
`columns=1` — is also undecided.

The render-mode lowering applies appropriate CSS (`column-span: all`) or
typeset directives.

## Interaction with tables

Tables face the same issue as figures. Wide tables need column-spanning
behavior. The same `span` kwarg pattern is intended (and inherits the
same undecided value-space and cascade questions from MC-Q3).

## Cascading and inheritance

A document declaring `<config columns=2>` at the document level lets
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
   are fixed. *How* the render-mode lowering is told which behavior the
   target wants — a build / CLI target option distinguishing web from
   print, or a `<config>` setting authors mark in source — is an open
   design question (MC-Q4 in §"Open design questions" below).

3. **Mixing column counts.** A document may have two-column body content
   with single-column front matter (title spans the page). The structural
   plugin applies different column treatments to different regions.

4. **Reflowing for accessibility.** Screen readers and assistive tech
   need content in reading order, not visual order. Multi-column layouts
   preserve underlying reading order (linearization).

## Open design questions

These are undecided design forks the rest of the spec previously presented
as settled. They are not blocking issues — they are decisions owed
*before* the multi-column feature is built.
Each is filed as a discussion item in GitHub Issues (surfaced by
the Front C extensions-cluster spec audit); the decision happens there,
not in this spec.

- **MC-Q1 — `<config>` surface for column settings.** Largely settled by
  the config-as-data direction (`DESIGN.md` §"Configuration and metadata
  are data"; [#134](https://github.com/enscribejs/enscribe/issues/134)): a
  flat column setting is a kwarg — `<config columns=2>` — and any
  structured column configuration belongs in `<config>`'s future fenced
  data block, the one register all structured config uses. The
  nested-element form (`<config><columns count=2></config>`) is **ruled
  out** — structured config is never a hand-written child-tag tree. What
  remains open is narrow and downstream: whether column settings ever need
  more than a flat kwarg, and the exact key names. (Aside: the older claim
  that deeply-placed `<config>` blocks are not read is itself stale — that
  discovery gap is closed; the doc cleanup is tracked in
  [#162](https://github.com/enscribejs/enscribe/issues/162).)

- **MC-Q2 — render-mode container for `column-count`.** Which container
  carries the CSS `column-count` (and the analogous typeset
  directives)? Two candidates: the whole-body container
  (`<article-body>` / `<book-body>`), so the entire body flows in
  columns; or each `<section>` independently, so per-section override is
  the natural unit. The choice affects cascade semantics (where the
  "immediate ancestor wins" rule applies) and the behavior of figures
  that cross section boundaries. Undecided.

- **MC-Q3 — `span` kwarg value space and cascade interaction.** The
  spec illustrates `span=full`. The fork: which other values are
  accepted (e.g. `span=2` for a fractional span in a three-column
  layout, `span=column-set`, `span=none`), and what does `span=full`
  mean inside a section that is already `columns=1` (no-op, or widens
  the figure beyond the single-column section's width)? Undecided.

- **MC-Q4 — responsive-vs-fixed signaling mechanism.** How does the
  render-mode lowering know whether the target is responsive (web,
  where column count can adapt to viewport width) or fixed (print,
  where columns are constant)? Two candidates: a build / CLI target
  option (e.g. `--target=web` vs `--target=print`), or a `<config>`
  setting in source. The choice affects authoring conventions —
  authors mark intent in source vs. the build target drives the
  lowering. Undecided.

## Related references

- `packages/layer1-vocabulary/elements/config.md` — the configuration
  element that carries column settings.
- `packages/layer1-vocabulary/elements/fig.md` — figures that may
  span columns.
- CSS Multi-column Layout: https://www.w3.org/TR/css-multicol-1/
- LaTeX `multicol` package documentation.
