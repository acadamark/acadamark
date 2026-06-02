# Shape tokens

Vocabulary entries classify the content an element accepts using three abstract tokens in their `content.shape` / `contains` fields. This document defines those tokens and the classification convention.

> **Status.** These tokens were once expanded and enforced at runtime by a schema-validation subsystem (`interpreter/schema/validate.js` and a content-shape validator). **That subsystem was removed** — the interpreter no longer reads `content.shape`, and no code expands or checks these tokens today. They remain as the **content-model classification recorded in each vocabulary entry**: design metadata that documents the intended shape of an element's content for vocabulary authors and downstream readers, not a constraint the pipeline enforces. Dispatch keys on the tagname and the entry's `interpreter_strategy` / `enscribe_attributes`, not on `content.shape`.

## The three tokens

- **`inline`** — content that appears within a flow of prose without breaking the line (semantic emphasis, inline code, links, cross-references, inline note markers, and the like).
- **`block`** — content that produces a block-level visual unit, breaking the line and occupying its own vertical region (paragraphs, asides and blockquotes, figures, tables, lists, collected note lists and bibliographies).
- **`section`** — content that establishes or contains structural divisions: the `<section>` / `<sub-section>` / `<sub-sub-section>` depth ladder, and `<book-part>`.

These three categories are exhaustive for the Layer 1 vocabulary: every authored element belongs to one of them, determined by where it appears in source and how it renders. **The per-element classification lives in each element's vocabulary entry (`content.shape`), which is its source of truth** — this document defines what the tokens *mean*, not which elements carry which token.

## Using the tokens in vocabulary entries

Entries reference the tokens in their `content.shape` field's `contains` arrays. Illustrative shapes:

A paragraph contains inline content only:

```yaml
content:
  type: prose
  shape:
    contains: [inline]
```

A section contains block-level body content plus nested sub-sections:

```yaml
content:
  type: structured
  shape:
    - element: section-title
      required: false
    - element: body
      contains: [block, section]
```

A list item contains both inline content (most items) and block content (multi-paragraph items, nested lists):

```yaml
content:
  type: prose
  shape:
    contains: [inline, block]
```

Mixing categories within one content model is normal: section bodies mix `block` and `section`; list items, asides, and blockquotes mix `inline` and `block`.

## Classification is by source position, not content type

An element's token reflects **where it appears in source and what placement constraints apply**, not the nature of its eventual content. Two consequences worth recording:

- `<note>` is classified `inline` because its source position is inline (the marker sits in prose), even though the note's *displayed* body is block-level.
- Asides and blockquotes are always `block`, even when their content is short.

Some Layer 1 elements appear only as outputs of the structural pipeline (`<article-front>`, `<section-title>`, `<book-part-title>`, …) and carry no `inline`/`block`/`section` classification: they sit in fixed positions within their parent containers rather than as siblings in a flexible content model.

## Why three tokens

- **Two tokens (inline/block) is too coarse.** It cannot distinguish "block content within a section" from "section content within a section" — both are block-level in HTML, but their structural roles differ.
- **One token per element is too fine.** It produces unwieldy `contains` arrays and forces every container entry to enumerate its allowed elements; adding an element would touch every container.
- **Three tokens (inline / block / section)** match HTML's structural grammar (phrasing, flow, sectioning content), simplified to enscribe's authoring concerns. It is the natural granularity.

## Related references

- `packages/layer1-vocabulary/SPEC.md` — the vocabulary specification.
- `packages/layer1-vocabulary/elements/` — the individual entries, each declaring its own `content.shape`.
- `DESIGN.md` — the layer model and the vocabulary's place in it.
