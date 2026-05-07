---
semantic_role: meta
html_output:
  element: meta
  is_html_native: false
  default_attributes: {}
  notes: |
    Acadamark's <meta> is a custom element distinct from HTML's <meta>
    (which is a void element used for character encoding, viewport, etc.).
    Acadamark's <meta> is a structured container for descriptive metadata —
    information about what the document is. Operational and configuration
    content lives in <data> and <config>, respectively.
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: structured
  shape:
    - element: title
      required: false
      contains: [inline]
    - element: subtitle
      required: false
      contains: [inline]
    - element: author
      required: false
      multiple: true
    - element: editor
      required: false
      multiple: true
    - element: date
      required: false
      multiple: true
    - element: abstract
      required: false
    - element: keywords
      required: false
content_handler: default
jats_counterpart:
  element: 'article-meta or book-meta'
  notes: |
    JATS uses <article-meta> inside <front> for article descriptive metadata,
    or <book-meta> inside <book-front> for book descriptive metadata.
    Acadamark's <meta> maps to whichever is appropriate based on the
    surrounding container.
shorthand_examples:
  - source: |
      <meta>
        <title | The Effect of Elephants on Climate>
        <author | Jane Goodall>
        <date | 2024-03-15>
      </meta>

      <section | Introduction>
      The paper begins.
    layer1_html: |
      <article>
        <article-front>
          <article-title>The Effect of Elephants on Climate</article-title>
          <author>Jane Goodall</author>
          <date>2024-03-15</date>
        </article-front>
        <article-body>
          <section>
            <section-title>Introduction</section-title>
            <p>The paper begins.</p>
          </section>
        </article-body>
      </article>
interpreter_strategy: schema
related_plugins:
  - name: acadamarkArticleStructuring
    purpose: 'Promotes <meta> children to Layer 1 elements in <article-front>. See notes/plugin-pipeline.md for the full pipeline.'
  - name: acadamarkBookStructuring
    purpose: 'Same as above for books. See notes/plugin-pipeline.md for the full pipeline.'

---

# `<meta>`

Document-level descriptive metadata. Holds title, author, date, abstract — content *about* the document. Tells the reader what the document is.

## Semantic intent

`<meta>` is acadamark's structured container for descriptive metadata, parallel to HTML's `<head>`, RMarkdown's YAML frontmatter (the descriptive parts), or JATS's `<article-meta>` and `<book-meta>`.

The element is for **descriptive content only**: the document's title, who wrote it, when it was published, what it's about (abstract, keywords). Anything that helps a reader orient before reading.

For other kinds of non-narrative content, acadamark uses dedicated elements:

- **`<data>`** — referenced resources (inline bibliography blocks, embedded image data, lookup tables). Tells the document where to find supporting material.
- **`<config>`** — build and render configuration (output format, citation style, stylesheets, themes). Tells the build system how to process the document.

Splitting these concerns into distinct elements keeps `<meta>` reading-friendly and prevents technical configuration from cluttering descriptive metadata.

## Where `<meta>` appears

`<meta>` appears in document front-matter by convention:

- Inside `<article>`, `<meta>` typically appears at the start, before any sections. The structural plugin places it in `<article-front>`.
- Inside `<book>`, `<meta>` appears at the start, before any book-parts. The structural plugin places it in `<book-front>`.
- Inside `<book-part>` (chapter, part, etc.), a part-level `<meta>` could hold part-specific descriptive metadata.

This is convention, not requirement. The structural plugin places `<meta>` in the appropriate front-matter region regardless of source position.

## Title authoring: two paths

The document title can be supplied via either the container shorthand or `<meta>`:

```
<article | My Title>
<section | Body>
```

or:

```
<meta>
  <title | My Title>
</meta>

<section | Body>
```

Both paths produce identical Layer 1 output. Precedence: `<meta>` wins if both are present. See the "Title precedence" section below for warning behavior.

## Title precedence and warnings

When both the container shorthand and `<meta>`'s `<title>` are present, the structural plugin handles the conflict:

- **Both present, both have title content:** `<meta>`'s title wins. The container-pipe title is discarded. A warning is emitted noting the override.
- **`<meta>` present without `<title>`, container has shorthand title:** the shorthand title is used. A warning suggests moving it into `<meta>` for consistency.
- **`<meta>` present with `<title>`, container has no shorthand title:** `<meta>`'s title is used. No warning.
- **Container has shorthand title, no `<meta>`:** the shorthand title is used. No warning.
- **Neither present:** the document is untitled. No warning. (This supports drafting workflows.)

## Content

`<meta>` contains structured descriptive metadata fields. The vocabulary recognizes:

- `<title>` — document title.
- `<subtitle>` — document subtitle.
- `<author>` — author (multiple allowed).
- `<editor>` — editor (multiple allowed; common in edited volumes).
- `<date>` — date (multiple allowed; type kwarg distinguishes publication, submission, etc.).
- `<abstract>` — article abstract.
- `<keywords>` — keyword list (future; not yet specified).

Other elements may be added to the descriptive vocabulary as needs emerge. Operational content (configuration, references) does not go in `<meta>`; it goes in `<config>` or `<data>` respectively.

## What does NOT go in `<meta>`

The following belong elsewhere:

| Content | Goes in |
|---------|---------|
| Inline bibliography blocks (`<library>`) | `<data>` |
| Embedded image data | `<data>` |
| Lookup tables for cross-references | `<data>` |
| Output format specification | `<config>` |
| Citation style | `<config>` |
| Stylesheet references | `<config>` |
| Theme settings | `<config>` |
| Build-time settings | `<config>` |

Putting these in `<meta>` would clutter the descriptive metadata and confuse the structural responsibilities. The split is intentional.

## JATS mapping

`<meta>` maps to either `<article-meta>` (inside `<article-front>` → JATS `<front>`) or `<book-meta>` (inside `<book-front>`) depending on the surrounding container.

| acadamark | JATS |
|-----------|------|
| `<meta>` (in article) | `<article-meta>` (inside `<front>`) |
| `<meta>` (in book) | `<book-meta>` (inside `<book-front>`) |
| `<title>` (in meta) | `<article-title>` or `<book-title>` |
| `<subtitle>` (in meta) | `<subtitle>` (inside `<title-group>`) |
| `<author>` | `<contrib contrib-type="author">` |
| `<editor>` | `<contrib contrib-type="editor">` |
| `<date>` | `<pub-date>` or `<date>` (inside `<history>`) depending on type |
| `<abstract>` | `<abstract>` |

## Render-mode lowering

In semantic mode, `<meta>` and its children are preserved as Layer 1 elements.

In render mode (browser display), `<meta>` lowers to HTML `<head>` content:

| Layer 1 in `<meta>` | HTML `<head>` |
|--------------------|---------------|
| `<title>` | `<title>` |
| `<subtitle>` | `<meta name="subtitle" content="...">` |
| `<author>` | `<meta name="author" content="...">` |
| `<date>` | `<meta name="date" content="...">` |

The metadata appears both in HTML's `<head>` (for browser tooling, sharing, indexing) and may also be displayed as a title page or article header in the document body, depending on rendering style.

## Authoring patterns

**Minimal metadata.**

```
<meta>
  <title | The Document Title>
</meta>

<section | Body>
Content.
```

**Common scholarly metadata.**

```
<meta>
  <title | The Effect of Elephants on Climate>
  <author | Jane Goodall>
  <author | David Attenborough>
  <date type=publication | 2024-03-15>
  <abstract |
    This paper presents evidence that elephant populations significantly
    affect regional climate patterns through their role in shaping
    vegetation and carbon storage.
  >
</meta>

<section | Introduction>
The paper begins.
```

**Edited volume.**

```
<meta>
  <title | Selected Topics in Conservation Biology>
  <editor | The Editor>
  <date type=publication | 2024>
</meta>

<chapter | First Chapter>
<author | Chapter Author>
Chapter content.
```

The book has an editor; each chapter has its own author.

## See also

- [`<data>`](data.md) — for resources referenced by the document but not displayed inline.
- [`<config>`](config.md) — for build and render configuration.
- [`<title>`](title.md), [`<author>`](author.md), [`<date>`](date.md), [`<abstract>`](abstract.md) — descriptive metadata children.
- [`<article>`](article.md), [`<book>`](book.md) — containers that hold metadata.
