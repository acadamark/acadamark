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
  notes: |
    JATS <book> wraps <book-front>, <book-body>, and <book-back>. Acadamark's
    structural elements map directly. JATS uses <book-part> recursively for
    all major divisions discriminated by the book-part-type attribute.
    JATS's book-type attribute (with values like monograph, edited-volume,
    textbook, etc.) is not currently set by acadamark — sub-classification
    within the book category is deferred until a JATS-export slice needs it.
shorthand_examples:
  - source: |
      <meta type=book>
        <title | A Natural History of Elephants>
        <author | Jane Goodall>
      </meta>

      <chapter | Origins>
      <section | Early ancestors>
      Content here.

      <chapter | Modern populations>
      <section | African elephants>
      Content here.
    layer1_html: |
      <book>
        <book-front>
          <meta data-document-type="book">
            <book-title>A Natural History of Elephants</book-title>
            <author>Jane Goodall</author>
          </meta>
        </book-front>
        <book-body>
          <book-part book-part-type="chapter">
            <meta>
              <book-part-title>Origins</book-part-title>
            </meta>
            <section>
              <section-title>Early ancestors</section-title>
              <p>Content here.</p>
            </section>
          </book-part>
          <book-part book-part-type="chapter">
            <meta>
              <book-part-title>Modern populations</book-part-title>
            </meta>
            <section>
              <section-title>African elephants</section-title>
              <p>Content here.</p>
            </section>
          </book-part>
        </book-body>
      </book>
    notes: |
      Typical authoring path: <meta type=book> at the top with no <book>
      wrapper. The structural plugin generates <book> + the three region
      wrappers. Each book-part contains its own <meta> with the promoted
      <book-part-title>; no <book-part-meta> wrapper.
  - source: |
      <meta type=book>
        <title | The Comprehensive Guide>
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
      <book>
        <book-front>
          <meta data-document-type="book">
            <book-title>The Comprehensive Guide</book-title>
            <author>Author Name</author>
          </meta>
        </book-front>
        <book-body>
          <book-part book-part-type="part">
            <meta>
              <book-part-title>Part I: Foundations</book-part-title>
            </meta>
            <book-part book-part-type="chapter">
              <meta>
                <book-part-title>First Principles</book-part-title>
              </meta>
              <p>Content.</p>
            </book-part>
            <book-part book-part-type="chapter">
              <meta>
                <book-part-title>Background</book-part-title>
              </meta>
              <p>Content.</p>
            </book-part>
          </book-part>
          <book-part book-part-type="part">
            <meta>
              <book-part-title>Part II: Applications</book-part-title>
            </meta>
            <book-part book-part-type="chapter">
              <meta>
                <book-part-title>Practical Examples</book-part-title>
              </meta>
              <p>Content.</p>
            </book-part>
          </book-part>
        </book-body>
      </book>
interpreter_strategy: schema
related_plugins:
  - name: acadamarkBookStructuring
    runs_before: acadamarkTagInterpret
    purpose: |
      Reads <meta type=book> and generates the <book> wrapper plus
      <book-front>/<book-body>/<book-back> regions. Promotes
      <title>/<subtitle> in <meta> to <book-title>/<book-subtitle>.
      Expands book-part shorthands (<chapter>, <part>, <appendix>, etc.)
      to <book-part book-part-type="...">. Honors explicit <book> if
      the author wrote it. See notes/plugin-pipeline.md for the full pipeline.
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

## How `<book>` is produced

`<book>` is a real Layer 1 element that appears in output, but it's typically *generated by the structural plugin* rather than authored as a wrapper. The typical authoring path is:

```
<meta type=book>
  <title | A Natural History of Elephants>
  <author | ...>
</meta>

<chapter | Origins>
...

<chapter | Modern populations>
...
```

`acadamarkBookStructuring` reads `<meta type=book>` and generates:

- The outer `<book>` element.
- `<book-front>` wrapping the original `<meta>`.
- `<book-body>` wrapping the book-parts.
- `<book-back>` wrapping back-matter (bibliography, note-list, etc.), if any.

Unlike `<article>`, which has a default-on inference (no `<meta>` → still assume article-shaped), `<book>` requires `<meta type=book>` to be declared. Without it the document defaults to article-shaped.

## Explicit-form escape hatch

Authors can write `<book>` explicitly when they need attributes (id, classes, numbering-style) on the container, or full control over region placement:

```
<book #my-book numbering-style=arabic | A Natural History of Elephants>
<meta>
  <author | Jane Goodall>
</meta>

<chapter | Origins>
Content.
```

The title-after-pipe shorthand works: pipe content becomes `<book-title>` inside `<meta>`.

## Required structure

A book has three structural regions, mirroring JATS/BITS:

- `<book-front>` — front matter: `<meta>` (which holds the book's descriptive metadata; may also hold dedication, foreword, preface, table-of-contents in future expansions).
- `<book-body>` — the main content: book-parts.
- `<book-back>` — back matter: bibliography, glossary, index, appendices, colophon, note-list.

All three are generated by the structural plugin from the author's input.

## Book content model

Following JATS, all major book divisions — chapters, named parts, appendices, prefaces, forewords — are represented at Layer 1 by the same element: `<book-part>`. They are discriminated by the `book-part-type` attribute. The element nests recursively.

The Layer 1 vocabulary is uniform; the shorthand layer provides familiar names. See `<book-part>` for the full list of shorthand variants and their type mappings.

## Attributes

`numbering-style` and `note-position` work as for `<article>`. The `note-position` value `chapter-end` is book-specific.

Sub-classification within the book category (monograph, edited-volume, textbook, etc.) is not currently exposed as an attribute. JATS export will need this distinction eventually; the kwarg will be added back at that point.

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

**Simple book (meta-driven).**

```
<meta type=book>
  <title | The Book>
  <author | The Author>
</meta>

<chapter | First Chapter>
Content.

<chapter | Second Chapter>
Content.
```

**Book with named parts.**

```
<meta type=book>
  <title | The Comprehensive Volume>
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
<meta type=book>
  <title | Selected Topics in Field>
  <editor | Editor Name>
</meta>

<chapter | Topic A>
<author | Chapter A Author>
Chapter A content.

<chapter | Topic B>
<author | Chapter B Author>
Chapter B content.
```

On `<meta>` only the `type` (article/book/...) kwarg is available; the explicit `<book>` form is used when you need to set additional attributes (id, classes, numbering-style) on the container itself.

**Book with appendices.**

```
<meta type=book>
  <title | The Book>
  <author | The Author>
</meta>

<chapter | First Chapter>
Content.

<bibliography source="refs.bib">

<appendix | Glossary of Terms>
Glossary content.
```

The bibliography and appendix go into `<book-back>` automatically (the appendix because `book-part-type="appendix"` is a back-matter type).

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
