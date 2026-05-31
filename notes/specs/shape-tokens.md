# Shape tokens

Vocabulary entries use abstract tokens in their `content.shape` and `contains` fields to specify what kinds of children an element accepts. This document defines those tokens.

## The three tokens

Enscribe uses three shape tokens:

- **`inline`** — content that appears within a flow of prose without breaking the line.
- **`block`** — content that produces a block-level visual unit, breaking the line and occupying its own vertical region.
- **`section`** — content that establishes or contains structural divisions (sections, sub-sections, book-parts).

These three categories are exhaustive for the Layer 1 vocabulary. Every element belongs to one of them based on where it appears in source and how it renders.

## Membership

### `inline` elements

Elements that appear within prose flow:

- `<em>`, `<strong>` — semantic emphasis.
- `<code>` — inline code.
- `<i>`, `<b>`, `<u>`, `<s>` — visual styling without semantic emphasis.
- `<a>` — hyperlinks.
- `<img>` — embedded images.
- `<span>` — generic inline container.
- `<q>` — inline quotations.
- `<sub>`, `<sup>` — subscript and superscript.
- `<cite>` — citation references.
- `<ref>` — cross-references.
- `<note>` — inline note markers.

When math sigils and inline-TeX shortcuts are implemented, they also belong to `inline`.

### `block` elements

Elements that produce block-level content:

- `<p>` — paragraphs.
- `<aside>`, `<blockquote>` — block-level supplementary content.
- `<figure>` — captioned figures.
- `<hr>` — thematic breaks.
- `<ul>`, `<ol>` — lists (and their `<li>` children).
- `<table>` — tables.
- `<note-list>` — collected notes.
- `<bibliography>` — rendered bibliography.

DSL engine tags that produce block output (`<csv>`, `<mermaid>`, math display sigils) also belong to `block`.

### `section` elements

Elements that establish or contain structural divisions:

- `<section>`, `<sub-section>`, `<sub-sub-section>` — the section depth ladder.
- `<book-part>` — book-internal structural divisions (chapters, parts, appendices via shorthand expansions).

These elements typically contain a mix of `block` and `section` children (sections contain paragraphs and nested sub-sections; book-parts contain sections).

## Using the tokens in vocabulary entries

Vocabulary entries reference these tokens in their `content.shape` field's `contains` arrays.

### Examples

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

An article body contains everything except inline (you don't put bare text directly inside `<article-body>`; it goes in paragraphs):

```yaml
contains: [block, section]
```

### Container expansion

The tokens are expanded by the interpreter at validation time. When an entry's `contains` field includes `inline`, the validator accepts any element from the inline list. The expansion is mechanical — no special-casing per element.

Adding a new element to the vocabulary means classifying it into one of the three categories. The element's vocabulary entry declares its category implicitly through the `html_output` and behavior; the central registration of which elements belong to which token happens here.

## Edge cases and clarifications

### Elements that could belong to multiple categories

A few elements have arguments for both inline and block placement:

**`<note>`**: Inline by default (the marker in prose is a superscript number). The note's *content* (when displayed in a footnote or endnote) is block-level, but `<note>` itself is classified as `inline` because its source position is inline.

**`<img>`**: Inline by default. For block-level captioned images, wrap in `<figure>`. The bare `<img>` is `inline`.

**`<aside>`, `<blockquote>`**: Always `block`. These are block-level even when their content is short.

The classification is about where the element appears in source and what category constraints apply to it, not about the element's content type.

### Custom Layer 1 elements (article-front, section-title, etc.)

Some Layer 1 elements appear only as outputs of the structural plugin — they're not authored directly. Examples: `<article-front>`, `<section-title>`, `<book-part-title>`, `<book-part-subtitle>`. These don't need `inline`/`block`/`section` classification because they appear in fixed positions within their parent containers, not as siblings in flexible content models.

If an author *does* write one of these directly (using the explicit-form escape hatch), the structural plugin treats it the same as the auto-generated version.

### DSL engine tags

DSL engine tags (`<csv>`, `<math>`, `<mermaid>`, `<python>`, etc.) classify based on their output, not their source form:

- DSL tags producing inline output (inline math, inline code) are `inline`.
- DSL tags producing block output (display math, code blocks, generated tables, generated figures) are `block`.

The classification happens when the DSL is added to the engine registry.

### Nested categories

Section elements can recursively contain section elements (sub-sections inside sections; nested book-parts inside book-parts). The recursion is constrained by the depth ladder for sections and by structural conventions for book-parts.

Within a single content model, mixing categories is normal:

- Section bodies mix `block` and `section`.
- List items mix `inline` and `block`.
- Asides and blockquotes hold `inline` and `block` content.

The validator allows any combination of categories the entry declares.

## Why three tokens

The three-token design was chosen because:

- **Two tokens (inline/block) is too coarse.** It can't distinguish "block content within a section" from "section content within a section" — both are technically block-level in HTML, but their structural roles differ significantly.
- **Many tokens (one per element) is too fine.** It produces unwieldy `contains` arrays and forces vocabulary entries to enumerate every allowed element. Adding a new element requires touching every container's entry.
- **Three tokens (inline/block/section)** matches HTML's structural grammar (phrasing content, flow content, sectioning content) and enscribe's authoring concerns. It's the natural granularity.

This is the same approach HTML5's content categories take, simplified to enscribe's specific needs.

## Future extensions

If the vocabulary grows in ways that need additional tokens, this document expands. Possibilities:

- **`metadata`** — for elements that appear inside `<meta>` blocks (title, author, date, abstract). Currently treated as a fixed shape rather than a flexible content category.
- **`bibliographic`** — for elements appearing inside `<bib-entry>` (author, year, title, journal, etc.). Currently treated as a fixed shape.

Both of these are arguably already implicit categories. They're not added to the formal token system because their use cases are narrow and their shapes are mostly fixed; flexibility isn't needed.

## Related references

- `packages/layer1-vocabulary/SPEC.md` — high-level vocabulary specification.
- `packages/layer1-vocabulary/elements/` — individual vocabulary entries.
- `notes/specs/interpreter.md` — interpreter architecture; describes how these tokens are used during schema-driven dispatch and content-shape validation.
- `notes/specs/pipeline.md` — structural plugin pipeline that produces the AST shape these tokens describe.
