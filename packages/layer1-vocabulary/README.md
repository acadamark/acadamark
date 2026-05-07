# layer1-vocabulary

A semantic HTML vocabulary for academic publishing.

## What this is

Layer 1 is a defined set of HTML custom elements for academic content: articles, books, chapters, sections, floats (figures, tables, equations, listings), citations, cross-references, notes, and apparatus. It is the archival representation that acadamark's shorthand syntax compiles to, and the source format for acadamark's JATS export.

The vocabulary is designed to be usable independently of acadamark. Any tool that produces conformant Layer 1 HTML can feed into the same JATS export and rendering pipeline. The shorthand parser is the primary authoring path, but not the only one.

## Current state

**This package currently contains the vocabulary specification only.** The spec is `SPEC.md` in this directory. Per-element reference pages will live in `docs/elements/` as they are written. Custom-element implementations (registration only — these are semantic markers, not interactive components) will live in `src/` when that work begins.

The spec is settled: ~35 elements covering articles, books, chapters, book-parts, sections, floats, inline semantics, and apparatus. Decisions are documented in the spec with rationale. The theorem-family elements (`<theorem>`, `<proof>`, `<lemma>`, etc.) are reserved but not yet specified.

## What comes next

1. **Attribute spec.** Each element gets its allowed attributes specified, with JATS as the primary reference. This is the second draft of the vocabulary.
2. **Custom-element registration.** Minimal JS registration in `src/`. These elements are semantic markers; the implementations are mostly one-liners.
3. **Interpreter integration.** `acadamarkTagInterpret` (the remark→rehype plugin) consumes this vocabulary as its output target.
4. **JATS export.** `rehypeAcadamarkToJats` converts Layer 1 HTML to JATS XML for journal submission.

## Relationship to JATS

JATS (Journal Article Tag Suite) is the primary reference for the Layer 1 vocabulary. Where a JATS counterpart exists, acadamark uses it or maps cleanly to it. Where acadamark deliberately diverges (simpler nesting, HTML conventions, custom-element constraints), the divergence is documented in the spec. The planned JATS export is a mostly-mechanical transform as a result.

## Related documents

- [`SPEC.md`](SPEC.md) — high-level vocabulary specification.
- `../../notes/shape-tokens.md` — content shape tokens (`inline`, `block`, `section`) used in entries' `contains` fields.
- `../../notes/plugin-pipeline.md` — structural plugin pipeline (discovery, structural transformation, resolution and rendering).
- `../../notes/interpreter-design.md` — interpreter architecture (schema-driven dispatch with escape hatches).
- `../../notes/idioms.md` — design principles (delegation to existing parsers, two-layer rule).

## Governing rules

The four rules from `notes/layer1-naming.md` apply throughout:

1. **Container-role naming.** Custom elements follow `<container-role>` (e.g., `<article-title>`, `<figure-caption>`).
2. **Defer to HTML.** Where standard HTML elements suffice, use them (`<p>`, `<table>`, `<em>`, `<a>`). Custom elements only where HTML has no semantic equivalent.
3. **Named depth ladder.** Section depth is named (`<section>`, `<sub-section>`, `<sub-sub-section>`), not derived from nesting or heading levels.
4. **Consult JATS first.** Before defining a new element, check whether JATS has a settled vocabulary for the same concept.
