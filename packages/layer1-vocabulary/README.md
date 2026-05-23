# layer1-vocabulary

The Layer 1 semantic-HTML vocabulary for acadamark. A defined set of HTML
custom elements for academic content: articles, books, chapters, sections,
floats (figures, tables, equations, listings), citations, cross-references,
notes, and apparatus. Layer 1 is the archival representation that acadamark's
shorthand syntax compiles to, and the source format for acadamark's JATS
export.

The vocabulary is designed to be usable independently of acadamark. Any tool
that produces conformant Layer 1 HTML can feed into the same JATS export and
rendering pipeline. The shorthand parser is the primary authoring path, not
the only one.

## What this package contains

- [`SPEC.md`](SPEC.md) — high-level vocabulary specification (element
  list by category, governing rules, design decisions).
- [`elements/*.md`](elements/) — per-element entries with attribute lists,
  content shapes, JATS mappings, and render-mode lowering specified. The
  interpreter (`acadamark-interpreter`) consumes these entries at load
  time.

## Governing rules

The four rules from [`notes/layer1-naming.md`](../../notes/layer1-naming.md)
apply throughout:

1. **Container-role naming.** Custom elements follow `<container-role>`
   (e.g. `<article-title>`, `<figure-caption>`).
2. **Defer to HTML.** Where standard HTML elements suffice, use them
   (`<p>`, `<table>`, `<em>`, `<a>`).
3. **Named depth ladder.** Section depth is named (`<section>`,
   `<sub-section>`, `<sub-sub-section>`), not derived from nesting or
   heading levels.
4. **Consult JATS first.** Before defining a new element, check whether
   JATS has a settled vocabulary for the same concept.

## Documentation

- [`STATUS.md`](../../STATUS.md) — current project state.
- [`DESIGN.md`](../../DESIGN.md) — design rationale, JATS relationship,
  scope decisions.
- [`notes/layer1-naming.md`](../../notes/layer1-naming.md) — the four
  governing rules.
- [`notes/shape-tokens.md`](../../notes/shape-tokens.md) — the `inline` /
  `block` / `section` content shape tokens used in per-element entries.
- [`notes/pipeline.md`](../../notes/pipeline.md) — the structural plugin
  pipeline that operates on Layer 1 elements.
- [`notes/interpreter.md`](../../notes/interpreter.md) — handler dispatch
  and schema dispatch that consume vocabulary entries.
