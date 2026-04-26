# remark-acadamark — pure micromark archive

**This package is archived.** It is the Slices 1–2 implementation of the acadamark shorthand parser using a pure micromark state machine. All 29 tests pass against this implementation.

## Why archived

The micromark state machine approach works but does not scale gracefully. As the grammar grows (more attribute forms, DSL tags, multi-line support), the state machine becomes harder to read and modify. Modifications require careful management of token boundaries, backtracking, and rollback semantics that are not obvious from the code.

The active implementation switched to a **Peggy hybrid**: micromark handles only boundary detection (finding where each construct starts and ends), and a Peggy-compiled parser handles all grammar semantics (attribute parsing, sigil detection, content separation). This produces a grammar file (`grammar/acadamark.peggy`) that is directly readable, independently testable, and easy to extend.

## What is here

- `src/syntax.js` — micromark tokenizer: sigil tags (Slice 1) and named tags (Slice 2), with fine-grained token emission (`acadamarkTagName`, `acadamarkTagAttrString`, `acadamarkTagContent`, `acadamarkTagBody`, etc.)
- `src/from-markdown.js` — token-to-mdast converter, including the `parseAttributes` JS function
- `src/index.js` — remark plugin wrapper
- `test/test.js` — 29 integration tests covering all Slice 1 and 2 cases

## Key design decisions recorded here

- Sigil tags: `effects.attempt` with partial tokenizer for mirrored-closer detection. Multiple `acadamarkTagBody` tokens accumulate across failed-close attempts; fromMarkdown concatenates them.
- Named tags: rule B depth tracking for `>` in content (`<` only opens depth if followed by alpha, sigil, or `/`).
- Attribute parsing: permissive positional reading (allows `.`, `:`, `/` once a positional has started); keyword disambiguation by reading tag-name chars then checking for `=`.
- HTML collision: acadamark text-position tokenizer is prepended and takes priority over remark-parse's built-in HTML inline tokenizer.

See `notes/shorthand-syntax.md` in the project root for the full specification.
