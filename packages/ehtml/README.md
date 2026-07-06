# ehtml

The eHTML semantic-HTML vocabulary for enscribe. A defined set of HTML
custom elements for academic content: articles, books, chapters, sections,
floats (figures, tables, equations, listings), citations, cross-references,
notes, and apparatus. eHTML is the archival representation that enscribe's
shorthand syntax compiles to, and the source format for enscribe's JATS
export.

The vocabulary is designed to be usable independently of enscribe. Any tool
that produces conformant eHTML can feed into the same JATS export and
rendering pipeline. The shorthand parser is the primary authoring path, not
the only one.

## What this package contains

- [`SPEC.md`](SPEC.md) — high-level vocabulary specification (element
  list by category, governing rules, design decisions).
- [`elements/*.md`](elements/) — per-element entries with attribute lists,
  content shapes, JATS mappings, and render-mode lowering specified. The
  interpreter (`enscribe/interpreter`) consumes these entries at load
  time.

## Governing rules

The four rules from [`notes/specs/ehtml-naming.md`](../../notes/specs/ehtml-naming.md)
apply throughout:

1. **Container-role naming.** Custom elements follow `<container-role>`
   (e.g. `<article-title>`, `<figure-caption>`).
2. **Defer to HTML.** Where standard HTML elements suffice, use them
   (`<p>`, `<table>`, `<em>`, `<a>`).
3. **Named depth ladder.** Section depth is named (`<section>`,
   `<sub-section>`, `<sub-sub-section>`), not derived from nesting or
   heading levels.
4. **Consult the reference mirrors.** Before defining a new element,
   check whether the established academic-document models (JATS, TEI,
   RASH, Scholarly-HTML — no single model privileged) have a settled
   vocabulary for the same concept.

## Documentation

- [`STATUS.md`](../../STATUS.md) — current project state.
- [`DESIGN.md`](../../DESIGN.md) — design rationale, JATS relationship,
  scope decisions.
- [`notes/specs/ehtml-naming.md`](../../notes/specs/ehtml-naming.md) — the four
  governing rules.
- [`notes/specs/shape-tokens.md`](../../notes/specs/shape-tokens.md) — the `inline` /
  `block` / `section` content shape tokens used in per-element entries.
- [`notes/specs/pipeline.md`](../../notes/specs/pipeline.md) — the structural plugin
  pipeline that operates on eHTML elements.
- [`notes/specs/interpreter.md`](../../notes/specs/interpreter.md) — handler dispatch
  and schema dispatch that consume vocabulary entries.
