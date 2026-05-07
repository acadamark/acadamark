---
semantic_role: book
html_output:
  element: book
  is_html_native: false
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    document-type:
      maps_to: data-document-type
      values: [monograph, edited-volume, textbook, proceedings, reference-work, other]
      default: monograph
    numbering-style:
      maps_to: data-numbering-style
      values: [arabic, roman, alpha]
      default: arabic
    note-position:
      maps_to: data-note-position
      values: [foot, end, side, chapter-end]
      default: foot
content:
  type: structured
  shape:
    - element: book-front
      required: false
    - element: book-body
      required: false
    - element: book-back
      required: false
content_handler: default
title_extraction: true
jats_counterpart:
  element: book
  attributes:
    book-type: from document-type
  notes: |
    JATS <book> wraps <book-front>, <book-body>, and <book-back>. Acadamark's
    structural elements map directly. JATS uses <book-part> recursively for
    all major divisions discriminated by the book-part-type attribute.
shorthand_examples:
  - source: |
      <book | A Natural History of Elephants>
      <meta>
        <author | Jane Goodall>
      </meta>

      <chapter | Origins>
      <section | Early ancestors>
      Content here.

      <chapter | Modern populations>
      <section | African elephants>
      Content here.
    layer1_html: |
      <book data-document-type="monograph">
        <book-front>
          <book-title>A Natural History of Elephants</book-title>
          <meta>
            <author>Jane Goodall</author>
          </meta>
        </book-front>
        <book-body>
          <book-part book-part-type="chapter">
            <book-part-meta>
              <book-part-title>Origins</book-part-title>
            </book-part-meta>
            <section>
              <section-title>Early ancestors</section-title>
              <p>Content here.</p>
            </section>
          </book-part>
          <book-part book-part-type="chapter">
            <book-part-meta>
              <book-part-title>Modern populations</book-part-title>
            </book-part-meta>
            <section>
              <section-title>African elephants</section-title>
              <p>Content here.</p>
            </section>
          </book-part>
        </book-body>
      </book>
  - source: |
      <book | The Comprehensive Guide>
      <meta>
        <author | Author Name>
      </meta>

      <part | Part I: Foundations>
      <chapter | First Principles>
      Content.

      <chapter | Background>
      Content.

      <part | Part II: Applications>
      <chapter | Practical Examples>
      Content.
    layer1_html: |
      <book data-document-type="monograph">
        <book-front>
          <book-title>The Comprehensive Guide</book-title>
          <meta>
            <author>Author Name</author>
          </meta>
        </book-front>
        <book-body>
          <book-part book-part-type="part">
            <book-part-meta>
              <book-part-title>Part I: Foundations</book-part-title>
            </book-part-meta>
            <book-part book-part-type="chapter">
              <book-part-meta>
                <book-part-title>First Principles</book-part-title>
              </book-part-meta>
              <p>Content.</p>
            </book-part>
            <book-part book-part-type="chapter">
              <book-part-meta>
                <book-part-title>Background</book-part-title>
              </book-part-meta>
              <p>Content.</p>
            </book-part>
          </book-part>
          <book-part book-part-type="part">
            <book-part-meta>
              <book-part-title>Part II: Applications</book-part-title>
            </book-part-meta>
            <book-part book-part-type="chapter">
              <book-part-meta>
                <book-part-title>Practical Examples</book-part-title>
              </book-part-meta>
              <p>Content.</p>
            </book-part>
          </book-part>
        </book-body>
      </book>
interpreter_strategy: schema
related_plugins:
  - name: acadamarkBookStructuring
    runs_before: acadamarkTagInterpret
    purpose: 'Implicit-book wrapping, region grouping, title extraction, book-part placement. See notes/plugin-pipeline.md for the full pipeline.'
deferred_features:
  - name: book-part-import
    description: |
      Future support for <book-part src="..."> and shorthand forms
      (<chapter src="...">, <part src="...">) to reference book-parts from
      external files. The build system would inline the referenced content
      before rendering.
---

# `<book>`

A book represents a multi-part work meant to be read as a single bound deliverable. Monographs, textbooks, edited volumes, conference proceedings, reference works.

## Semantic intent

Use `<book>` for any multi-part work where the parts are conceptually pieces of one whole. The book is the unit that gets a single ISBN, a single title page, often a single bibliography. Compare:

- `<article>` — single self-contained document; no major divisions.
- `<book>` — multi-part work; this element.
- `<book-part>` — a structural division within a book (chapter, part, appendix, etc.).

Use `<book>` even for short multi-part works. The structural division is the determining factor, not page count.

## Title-after-pipe shorthand

The shorthand form puts the book title in the pipe content:

```
<book | A Natural History of Elephants>
```

The pipe content becomes the children of `<book-title>` — verbatim, after recursive parsing. Subsequent content (metadata, chapters, parts) follows naturally.

The explicit `<book-title>` element is available when needed.

## Structure

A book has three structural regions:

- `<book-front>` — front matter: title page, copyright, dedication, foreword, preface, table of contents, metadata.
- `<book-body>` — the main content: book-parts.
- `<book-back>` — back matter: bibliography, glossary, index, appendices, colophon.

None of these are required. A book with only body content is valid.

## Book content model

Following JATS, all major book divisions — chapters, named parts, appendices, prefaces, forewords — are represented at Layer 1 by the same element: `<book-part>`. They are discriminated by the `book-part-type` attribute. The element nests recursively.

The Layer 1 vocabulary is uniform; the shorthand layer provides familiar names. See `<book-part>` for the full list of shorthand variants and their type mappings.

## Implicit structure

Acadamark provides defaults for book-shaped documents that lack explicit structure:

**Top-level book.** A document that uses `<book>` as its top-level container is treated as a book. There is no implicit `<book>` wrapping; books require explicit declaration.

**Implicit book-front, book-body, book-back.** When wrappers are missing, the `acadamarkBookStructuring` plugin groups children:

- Title (from pipe content or explicit `<book-title>`) goes into `<book-front>`.
- Any `<meta>` block goes into `<book-front>`.
- Front-matter elements (`<author>`, `<editor>`, `<dedication>`, `<foreword>`, `<preface>`, `<table-of-contents>`) go into `<book-front>`.
- Body content (book-parts of any type) goes into `<book-body>`.
- Back-matter elements (`<bibliography>`, `<appendix>`, `<glossary>`, `<index>`, `<colophon>`, `<note-list>`) go into `<book-back>`.

This grouping is mechanical, not interpretive.

## Attributes

`document-type` indicates the kind of book. Used by JATS export to set `<book book-type="...">`.

`numbering-style` and `note-position` work as for `<article>`. The `note-position` value `chapter-end` is book-specific.

## JATS mapping

| acadamark Layer 1 | JATS |
|-------------------|------|
| `<book>` | `<book>` |
| `<book-front>` | `<book-front>` |
| `<book-body>` | `<book-body>` |
| `<book-back>` | `<book-back>` |
| `<book-part>` | `<book-part>` |
| `<book-title>` | `<book-title>` (inside `<book-meta>`) |

## Authoring patterns

**Simple book.**

```
<book | The Book>
<meta>
  <author | The Author>
</meta>

<chapter | First Chapter>
Content.

<chapter | Second Chapter>
Content.
```

**Book with named parts.**

```
<book | The Comprehensive Volume>
<meta>
  <author | The Author>
</meta>

<part | Part I: Foundations>
<chapter | First Chapter>
Content.

<part | Part II: Applications>
<chapter | Second Chapter>
Content.
```

**Edited volume with multiple authors.**

```
<book document-type=edited-volume | Selected Topics in Field>
<meta>
  <editor | Editor Name>
</meta>

<chapter | Topic A>
<author | Chapter A Author>
Chapter A content.

<chapter | Topic B>
<author | Chapter B Author>
Chapter B content.
```

**Book with appendices.**

```
<book | The Book>
<meta>
  <author | The Author>
</meta>

<chapter | First Chapter>
Content.

<bibliography source="refs.bib">

<appendix | Glossary of Terms>
Glossary content.
```

The bibliography and appendix go into `<book-back>` automatically.

## Multi-file authoring (deferred)

For books too long to comfortably author in a single file, the planned future feature is book-part import:

```
<book | The Book>
<meta>
  <author | The Author>
</meta>

<chapter src="chapters/01-introduction.amd">
<chapter src="chapters/02-background.amd">
```

The build system would inline the referenced content before rendering.

## Render-mode lowering

| Layer 1 element | Render-mode lowering |
|----------------|----------------------|
| `<book>` | `<article>` |
| `<book-front>` | `<header>` |
| `<book-body>` | (transparent) |
| `<book-back>` | `<footer>` |
| `<book-part>` | `<section class="<type>">` |
| `<book-title>` | `<h1>` |
| `<book-part-title>` | heading element appropriate to depth |

## See also

- [`<article>`](article.md) — single self-contained document.
- [`<book-part>`](book-part.md) — divisions within a book.
- [`<meta>`](meta.md) — document metadata.
