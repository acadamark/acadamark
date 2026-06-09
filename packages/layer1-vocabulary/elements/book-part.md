---
semantic_role: book-part
category: document-containers
requires-context: book
html_output:
  element: book-part
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    book-part-type:
      maps_to: book-part-type
      values: [chapter, part, appendix, preface, foreword, introduction, conclusion, glossary, dedication, other]
      required: true
      notes: |
        Always present in Layer 1. The shorthand layer typically supplies
        this via a shorthand element name (e.g., <chapter> sets it to "chapter").
    numbering-style:
      maps_to: data-numbering-style
      values: [arabic, roman, alpha, none]
    note-position:
      maps_to: data-note-position
      values: [foot, end, side, chapter-end]
content:
  type: structured
  shape:
    - element: meta
      required: false
      contains: [book-part-title, book-part-subtitle, author]
      notes: |
        Book-parts use the same <meta> container as articles and books for
        descriptive metadata. Unlike books, book-parts do NOT have nested
        <book-part-front>/<book-part-body>/<book-part-back> wrappers —
        <meta> and body content sit directly inside <book-part>.
    - element: body
      required: false
      contains: [section, sub-section, p, figure, aside, blockquote, table, book-part]
      notes: 'Body content sits as direct children of <book-part> after <meta>.'
content_handler: default
title_extraction: true
jats_counterpart:
  element: book-part
  attributes:
    book-part-type: from book-part-type
  notes: 'Direct mapping to JATS <book-part>. Recursive structure preserved exactly.'
shorthand_expansions:
  - shorthand: chapter
    expands_to: 'book-part book-part-type="chapter"'
    notes: 'The most common book-part type.'
  - shorthand: part
    expands_to: 'book-part book-part-type="part"'
    notes: 'Named major divisions ("Part I: Foundations").'
  - shorthand: appendix
    expands_to: 'book-part book-part-type="appendix"'
    notes: 'Typically appears in book-back.'
  - shorthand: preface
    expands_to: 'book-part book-part-type="preface"'
    notes: 'Front-matter prose by the author. Typically in book-front.'
  - shorthand: foreword
    expands_to: 'book-part book-part-type="foreword"'
    notes: 'Front-matter prose by someone other than the author.'
  - shorthand: introduction
    expands_to: 'book-part book-part-type="introduction"'
  - shorthand: conclusion
    expands_to: 'book-part book-part-type="conclusion"'
  - shorthand: glossary
    expands_to: 'book-part book-part-type="glossary"'
shorthand_examples:
  - source: |
      <chapter | Origins>
      Content of the chapter.
    layer1_html: |
      <book-part book-part-type="chapter">
        <meta>
          <book-part-title>Origins</book-part-title>
        </meta>
        <p>Content of the chapter.</p>
      </book-part>
  - source: |
      <part | Part I: Foundations>
      <chapter | First Chapter>
      Content.

      <chapter | Second Chapter>
      Content.
    layer1_html: |
      <book-part book-part-type="part">
        <meta>
          <book-part-title>Part I: Foundations</book-part-title>
        </meta>
        <book-part book-part-type="chapter">
          <meta>
            <book-part-title>First Chapter</book-part-title>
          </meta>
          <p>Content.</p>
        </book-part>
        <book-part book-part-type="chapter">
          <meta>
            <book-part-title>Second Chapter</book-part-title>
          </meta>
          <p>Content.</p>
        </book-part>
      </book-part>
  - source: |
      <preface | A Note from the Author>
      I wrote this book because...

      <chapter | Chapter One>
      Body content.

      <appendix | Notation>
      Notation conventions used in this book.
    layer1_html: |
      <book-part book-part-type="preface">
        <meta>
          <book-part-title>A Note from the Author</book-part-title>
        </meta>
        <p>I wrote this book because...</p>
      </book-part>

      <book-part book-part-type="chapter">
        <meta>
          <book-part-title>Chapter One</book-part-title>
        </meta>
        <p>Body content.</p>
      </book-part>

      <book-part book-part-type="appendix">
        <meta>
          <book-part-title>Notation</book-part-title>
        </meta>
        <p>Notation conventions used in this book.</p>
      </book-part>
    notes: |
      The structural plugin places the preface in book-front, the chapter
      in book-body, and the appendix in book-back based on book-part-type.
interpreter_strategy: schema
related_plugins:
  - name: enscribeBookStructuring
    runs_before: enscribeInterpreter
    purpose: |
      Generates <book-part> from <meta type=book-part> or from book-part
      shorthand expansions (<chapter>, <part>, <appendix>, etc.). Inside
      each <book-part>, <meta> and body content sit directly — no nested
      front/body/back wrappers. Promotes <title>/<subtitle> in <meta> to
      <book-part-title>/<book-part-subtitle>. At the book level, places
      book-parts into the appropriate region (<book-front>, <book-body>,
      <book-back>) based on book-part-type. See notes/specs/pipeline.md.
deferred_features:
  - name: book-part-import
    description: |
      Future support for <book-part src="..."> and shorthand forms
      (<chapter src="...">, <part src="...">) to reference book-parts from
      external files.
---

# `<book-part>`

A book-part is any major division within a book — a chapter, a named part, an appendix, a preface, a glossary. The single Layer 1 element handles all of these via the `book-part-type` attribute.

## Semantic intent

In JATS and in this vocabulary, all major book divisions share the same structural shape: an optional metadata block, a body of content, and possibly recursively nested book-parts. The differences are purely classificatory — captured by the `book-part-type` attribute, not by separate element names.

The shorthand layer provides familiar names for the common types: `<chapter>`, `<part>`, `<appendix>`, `<preface>`, etc. These all expand to `<book-part>` with the appropriate type at Layer 1.

## Title-after-pipe shorthand

The shorthand form puts the book-part's title in the pipe content:

```
<chapter | Origins>
The chapter content begins here.
```

The pipe content becomes the children of `<book-part-title>` — verbatim, after recursive parsing.

The explicit `<book-part-title>` element is available when needed (multi-line titles, complex inline content, or when constructing the meta wrapper explicitly).

## Where book-parts appear

Book-parts appear inside `<book-body>` (most book-parts) or in `<book-front>` and `<book-back>` (for front-matter and back-matter types).

The `enscribeBookStructuring` plugin places book-parts automatically based on their type:

| book-part-type | Placement |
|----------------|-----------|
| chapter | book-body |
| part | book-body |
| introduction | book-body |
| conclusion | book-body |
| preface | book-front |
| foreword | book-front |
| dedication | book-front |
| appendix | book-back |
| glossary | book-back |
| colophon | book-back |
| other | book-body (default) |

Authors who want a book-part placed differently can use `<book-front>`, `<book-body>`, or `<book-back>` wrappers explicitly.

## Structure within a book-part

Each book-part contains:

- An optional `<meta>` block holding the book-part's title, subtitle, and (in edited volumes) author.
- Content: paragraphs, sections, figures, asides, and possibly nested book-parts.

`<meta>` is the same metadata container used by `<article>` and `<book>`. Inside a book-part it holds `<book-part-title>` and `<book-part-subtitle>` (instead of `<article-title>` or `<book-title>`).

Unlike books, book-parts do **not** have nested `<book-part-front>` / `<book-part-body>` / `<book-part-back>` wrappers — `<meta>` and body content sit directly inside `<book-part>`. This keeps the recursive book-part structure simple.

`<meta>` is added automatically by the structural plugin when title elements appear inside a book-part without an explicit `<meta>` (for example, when the author uses `<chapter | Title>`, the plugin creates `<meta>` to hold the promoted `<book-part-title>`).

## Recursive nesting

Book-parts can contain other book-parts. The most common pattern is parts containing chapters:

```
<part | Part I: Foundations>
<chapter | First Chapter>
Content.
```

In Layer 1, this is `<book-part book-part-type="part">` containing `<book-part book-part-type="chapter">`.

## Attributes

`book-part-type` is required at Layer 1. It's set automatically by the shorthand expansion. Authors who write `<book-part>` directly must specify the type.

`numbering-style` overrides the book-level numbering style for this book-part. Common uses:

- Disable numbering for prefaces and forewords: `numbering-style=none`.
- Use roman numerals for front-matter chapters: `numbering-style=roman`.

`note-position` overrides the book-level note position for this book-part.

## JATS mapping

Direct mapping to JATS `<book-part>`. The element name, the recursive structure, and the `book-part-type` attribute are all preserved exactly.

| enscribe Layer 1 | JATS |
|-------------------|------|
| `<book-part>` | `<book-part>` |
| `book-part-type` attribute | `book-part-type` attribute |
| `<meta>` | `<meta>` |
| `<book-part-title>` | `<title>` inside `<meta>`, or `<book-part-title>` directly |

## Authoring patterns

**A simple chapter.**

```
<chapter | The Title>
Content.
```

**A chapter with its own author (in an edited volume).**

```
<chapter | The Title>
<author | Chapter Author>
Content.
```

The `<author>` element is chapter-specific, distinct from the book's editor in `<meta>`.

**A chapter that disables numbering.**

```
<chapter numbering-style=none | Preface to the Second Edition>
Front-matter content.
```

Useful when a chapter is conceptually a chapter (it's body-matter) but shouldn't be numbered alongside the others.

**Nested book-parts.**

```
<part | Part I>
<chapter | Chapter One>
Content.

<chapter | Chapter Two>
Content.
```

**Appendix in back matter.**

```
<appendix | Notation Conventions>
Content.
```

The structural plugin places this in `<book-back>` because `book-part-type="appendix"` is a back-matter type.

**Direct use of `<book-part>` for unusual types.**

```
<book-part book-part-type="other" id="rare-thing" | An Unusual Section>
Content for something not covered by the standard shorthands.
```

The shorthand layer covers the common cases; `<book-part>` directly is the escape hatch.

## Render-mode lowering

In semantic mode, `<book-part>` and its attributes are preserved.

In render mode, `<book-part>` is lowered to `<section>` with a class indicating the type:

| Layer 1 | Render-mode lowering |
|---------|----------------------|
| `<book-part book-part-type="chapter">` | `<section class="chapter">` |
| `<book-part book-part-type="part">` | `<section class="part">` |
| `<book-part book-part-type="appendix">` | `<section class="appendix">` |
| etc. | `<section class="<type>">` |

The class name is the `book-part-type` value verbatim.

## Why one element instead of separate `<chapter>`, `<part>`, etc.

The single `<book-part>` element with type discriminator was chosen because:

- It matches JATS exactly, avoiding mapping divergence in the JATS exporter.
- It captures the structural truth: chapters, parts, appendices, prefaces all have the same shape.
- The recursive nesting (parts containing chapters) works naturally with a single element type.
- Adding new book-part types is a vocabulary update, not a new Layer 1 element.

The shorthand layer preserves authoring ergonomics. Authors don't write `<book-part book-part-type="chapter">`; they write `<chapter | Title>`.

## See also

- [`<book>`](book.md) — the container that holds book-parts.
- [`<book-front>`](book-front.md), [`<book-body>`](book-body.md), [`<book-back>`](book-back.md) — structural regions.
- [`<meta>`](meta.md) — the metadata container used inside book-parts (and articles, books).
- [`<book-part-title>`](book-part-title.md) — title element for a book-part, promoted from `<title>` in `<meta>`.
