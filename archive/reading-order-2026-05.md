# Reading order for understanding the project

This document describes the recommended reading path for understanding acadamark's design and current implementation state. The project has accumulated enough documentation that knowing where to start matters.

## For someone new to the project

1. `README.md` (project root) — the project's purpose and high-level approach.
2. `STATUS.md` — what's done, what's in flight, what's pending.
3. `DESIGN.md` — design rationale: premise, layered model, JATS section, scope decisions.
4. `notes/idioms.md` — the delegation principle that underlies acadamark's parser and interpreter.

## For understanding the parser

1. `notes/shorthand-syntax.md` — formal spec of the shorthand syntax with EBNF, worked examples, resolved decisions.
2. `notes/escape-rules-spec.md` — escape rules in named-tag content and sigil bodies.
3. `notes/multiline-spec.md` — multi-line construct rules.
4. `notes/recursive-content-spec.md` — design of the recursive-content plugin that re-parses string content into homogeneous `Node[]`.
5. `packages/remark-acadamark/` — the parser implementation. The Peggy grammar is in `grammar/acadamark.peggy`; the micromark extension in `src/syntax.js`.

## For understanding the vocabulary

1. `packages/layer1-vocabulary/SPEC.md` — high-level vocabulary specification.
2. `packages/layer1-vocabulary/README.md` — package-level overview.
3. `notes/layer1-naming.md` — the four governing rules (container-role naming, defer to HTML, named depth ladder, consult JATS first).
4. `notes/shape-tokens.md` — the `inline` / `block` / `section` content shape tokens used in vocabulary entries.
5. Individual entries in `packages/layer1-vocabulary/elements/` — field-level details for each element.

## For understanding the interpreter

1. `notes/interpreter.md` — interpreter architecture: plugin chain, handler dispatch, schema dispatch, handler implementations, error handling, asset injection.
2. `notes/pipeline.md` — pipeline stage ordering, plugin dependencies, configuration, data flow examples (paragraph, cross-reference, citation, note), asset bundling.
3. `notes/shape-tokens.md` — content shape tokens used by the interpreter for validation.

## For deferred features

The `notes/` directory contains design sketches and specs for features deferred to later slices:

- `archive/inline-tex-shortcuts-spec-2026-05.md` — `_{...}` and `^{...}` shorthands for sub/sup (archived; the feature shipped as G1 and the spec is preserved as the design record).
- `notes/dsl-engines.md` — engine adapters for math, csv, mermaid, etc.
- `notes/future-interpreter-sketches/` — exploratory sketches for the interpreter.

## Project-discipline references

- `CLAUDE.md` — working conventions for the project, read at the start of every session.
- `notes/principles.md` — error-recovery and "documents always render to something" principles.
