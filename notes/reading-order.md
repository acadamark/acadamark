# Reading order for understanding the project

This document describes the recommended reading path for understanding acadamark's design and current implementation state. The project has accumulated enough documentation that knowing where to start matters.

## For someone new to the project

1. `README.md` (project root) — the project's purpose and high-level approach.
2. `STATUS.md` — what's done, what's in flight, what's pending.
3. `DESIGN.md` — design rationale: premise, layered model, JATS section, scope decisions.
4. `notes/idioms.md` — the delegation principle that underlies acadamark's parser and interpreter.

## For understanding the parser

1. `BUILD.md` — pipeline diagram, novel plugins, dependencies, slice plan.
2. `notes/shorthand-syntax.md` — formal spec of the shorthand syntax with EBNF, worked examples, resolved decisions.
3. `notes/escape-rules-spec.md` — escape rules in named-tag content and sigil bodies.
4. `notes/multiline-spec.md` — multi-line construct rules.
5. `notes/recursive-content-spec.md` — design of the recursive-content plugin that re-parses string content into homogeneous `Node[]`.
6. `packages/remark-acadamark/` — the parser implementation. The Peggy grammar is in `grammar/acadamark.peggy`; the micromark extension in `src/syntax.js`.

## For understanding the vocabulary

1. `packages/layer1-vocabulary/SPEC.md` — high-level vocabulary specification.
2. `packages/layer1-vocabulary/README.md` — package-level overview.
3. `notes/layer1-naming.md` — the four governing rules (container-role naming, defer to HTML, named depth ladder, consult JATS first).
4. `notes/shape-tokens.md` — the `inline` / `block` / `section` content shape tokens used in vocabulary entries.
5. Individual entries in `packages/layer1-vocabulary/elements/` — field-level details for each element.

## For understanding the interpreter (when implemented)

1. `notes/interpreter-design.md` — interpreter architecture: schema-driven dispatch with escape hatches, async transform, error handling, slice plan.
2. `notes/plugin-pipeline.md` — pipeline ordering and plugin contracts (discovery, structural transformation, resolution and rendering).
3. `notes/shape-tokens.md` — content shape tokens used by the interpreter for validation.

## For deferred features

The `notes/` directory contains design sketches and specs for features deferred to later slices:

- `notes/inline-tex-shortcuts-spec.md` — `_{...}` and `^{...}` shorthands for sub/sup.
- `notes/slide-element-deferred.md` — slide-element design, deferred.
- `notes/dsl-engines.md` — engine adapters for math, csv, mermaid, etc.
- `notes/text-based-DSLs.md` — discussion of DSLs that use plain-text source.
- `notes/future-interpreter-sketches/` — exploratory sketches for the interpreter.

## Project-discipline references

- `CLAUDE.md` — working conventions for the project, read at the start of every session.
- `notes/principles.md` — error-recovery and "documents always render to something" principles.
