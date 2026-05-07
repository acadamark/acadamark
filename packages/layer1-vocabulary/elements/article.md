---
semantic_role: article
html_output:
  element: article
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    document-type:
      maps_to: data-document-type
      values: [research-article, review-article, editorial, letter, brief-report, case-report, other]
      default: research-article
    numbering-style:
      maps_to: data-numbering-style
      values: [arabic, roman, alpha]
      default: arabic
    note-position:
      maps_to: data-note-position
      values: [foot, end, side]
      default: foot
content:
  type: structured
  shape:
    - element: article-front
      required: false
      contains: [meta, article-title, article-subtitle, author, abstract]
    - element: article-body
      required: false
      contains: [section, sub-section, p, figure, aside, blockquote, table, list-elements]
    - element: article-back
      required: false
      contains: [bibliography, appendix, note-list]
content_handler: default
title_after_pipe: true
jats_counterpart:
  element: article
  attributes:
    article-type: from document-type
  notes: |
    JATS <article> wraps <front>, <body>, and <back>. Acadamark uses
    <article-front>, <article-body>, <article-back> as parallel custom
    elements. The mapping is direct.
shorthand_expansions:
  - shorthand: 'first line after pipe'
    expands_to: article-title
    notes: |
      Authors write <article | The Title>; the first line after the pipe
      becomes <article-title> in <article-front>.
  - shorthand: article-title
    expands_to: article-title
    notes: |
      Available as an escape hatch for multi-line titles or titles with
      complex inline structure.
shorthand_examples:
  - source: |
      <article | The Effect of Elephants on Climate>
      <meta>
        <author | Jane Goodall>
        <date | 2024-03-15>
      </meta>

      <section | Introduction>
      The paper begins here.

      <section | Conclusion>
      The paper concludes here.
    layer1_html: |
      <article data-document-type="research-article">
        <article-front>
          <article-title>The Effect of Elephants on Climate</article-title>
          <meta>
            <author>Jane Goodall</author>
            <date>2024-03-15</date>
          </meta>
        </article-front>
        <article-body>
          <section>
            <section-title>Introduction</section-title>
            <p>The paper begins here.</p>
          </section>
          <section>
            <section-title>Conclusion</section-title>
            <p>The paper concludes here.</p>
          </section>
        </article-body>
      </article>
  - source: |
      <section | Introduction>
      The introduction.

      <section | Conclusion>
      The conclusion.
    layer1_html: |
      <article data-document-type="research-article">
        <article-body>
          <section>
            <section-title>Introduction</section-title>
            <p>The introduction.</p>
          </section>
          <section>
            <section-title>Conclusion</section-title>
            <p>The conclusion.</p>
          </section>
        </article-body>
      </article>
    notes: |
      No <article> declared. The structural plugin wraps the sections in
      an implicit article with default attributes.
interpreter_strategy: schema
related_plugins:
  - name: acadamarkArticleStructuring
    runs_before: acadamarkTagInterpret
    purpose: |
      Wraps top-level content in implicit <article> when no explicit
      container exists. Extracts title from the pipe content. Groups
      children into <article-front>, <article-body>, <article-back>.
---

# `<article>`

An article represents a single self-contained piece of writing intended to be read as one document. Research papers, journal articles, blog posts, reports, memos. The most common top-level container in acadamark.

## Semantic intent

`<article>` is the canonical container for a single-document deliverable. Use it for any piece of writing that stands on its own and isn't part of a larger work. Compare:

- `<article>` — a single self-contained document.
- `<book>` — a multi-part work containing book-parts.
- `<book-part>` — a chapter, named part, or appendix within a book.

When in doubt, use `<article>`. It's the default for most academic and editorial writing.

## Title-after-pipe shorthand

The shorthand form puts the article title in the pipe content:

```
<article | The Title of the Article>
```

The first line after the pipe becomes `<article-title>` in `<article-front>`. Subsequent content (sections, body) follows naturally.

Authors don't typically write `<article-title>` explicitly. The pipe-after-tagname convention handles the common case. The explicit element is available as an escape hatch when needed (multi-line titles, titles with complex inline content).

## Required structure

An article *can* contain three structural regions, mirroring JATS:

- `<article-front>` — front matter: title, subtitle, metadata, authors, abstract.
- `<article-body>` — the main content: sections, paragraphs, figures.
- `<article-back>` — back matter: bibliography, appendices, notes.

None of these are required. An article with only body content is valid.

## Implicit structure

Acadamark provides defaults for documents without explicit structure:

**No top-level container.** A document that starts with section content gets wrapped in an implicit `<article>` with default kwarg values.

**No explicit `<article-front>`, `<article-body>`, `<article-back>`.** When these wrappers are missing, the `acadamarkArticleStructuring` plugin groups children:

- Title (from pipe content or explicit `<article-title>`) goes into `<article-front>`.
- Any `<meta>` block goes into `<article-front>`.
- Front-matter elements (`<author>`, `<abstract>`, etc.) go into `<article-front>`.
- Body content (sections, paragraphs, figures) goes into `<article-body>`.
- Back-matter elements (`<bibliography>`, `<appendix>`, `<note-list>`) go into `<article-back>`.

This grouping is mechanical, not interpretive.

## Attributes

`document-type` indicates the kind of article. Values match common JATS classifications (`research-article`, `review-article`, `editorial`, `letter`, `brief-report`, `case-report`, `other`). Defaults to `research-article`. Used by the JATS exporter to set `<article article-type="...">`.

`numbering-style` controls how numbered elements (figures, equations, sections) are numbered throughout the document. Document-level default; individual numbered elements can override.

`note-position` controls where notes appear (`foot`, `end`, `side`). Document-level default; individual `<note>` elements can override.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<article>` | `<article>` |
| `<article-front>` | `<front>` (specifically `<article-meta>` inside) |
| `<article-body>` | `<body>` |
| `<article-back>` | `<back>` |
| `<article-title>` | `<article-title>` (inside `<title-group>` in `<article-meta>`) |

The `document-type` kwarg maps to JATS's `article-type` attribute on `<article>`.

The `numbering-style` and `note-position` kwargs are acadamark-specific (they describe rendering preferences, not JATS-standard metadata). They're preserved as `data-*` attributes for downstream processors but not exported to JATS.

## Authoring patterns

**Minimal article (sections only).**

```
<section | Introduction>
The introduction.

<section | Conclusion>
The conclusion.
```

The implicit `<article>` wrapper makes this a valid document.

**Article with title and metadata.**

```
<article | The Effect of Elephants on Climate>
<meta>
  <author | Jane Goodall>
  <date | 2024-03-15>
</meta>

<section | Introduction>
The introduction.
```

The title comes from the pipe; the `<meta>` block goes into the implicit `<article-front>`.

**Article with explicit attributes.**

```
<article #my-paper document-type=research-article numbering-style=roman | Custom Numbering Paper>
<meta>
  <author | Author Name>
</meta>
<abstract | A brief summary of the paper.>

<section | Introduction>
Body content.
```

Use the form-with-attributes when you need a custom id, document type, or numbering style.

**Fully explicit structure.**

```
<article #my-paper>
  <article-front>
    <article-title | The Effect of Elephants on Climate>
    <meta>
      <author | Jane Goodall>
    </meta>
    <abstract | A brief summary.>
  </article-front>
  <article-body>
    <section | Introduction>
    Body content.
  </article-body>
  <article-back>
    <bibliography source="refs.bib">
  </article-back>
</article>
```

Use the explicit form when you need fine control over what goes in front, body, or back. The `<article-title>` element is used here as the explicit form (rather than the pipe shorthand) because attributes are set on `<article>` directly.

## Render-mode lowering

In semantic mode (the default), `<article>` and its children remain as Layer 1 elements with explicit semantics.

In render mode (a separate downstream plugin), the article structure can be lowered for browser display:

| Layer 1 element | Render-mode lowering |
|----------------|----------------------|
| `<article>` | `<article>` (unchanged) |
| `<article-front>` | `<header>` |
| `<article-body>` | (transparent — children rendered directly) |
| `<article-back>` | `<footer>` |
| `<article-title>` | `<h1>` |
| `<article-subtitle>` | `<p class="subtitle">` |

The lowering preserves semantic structure where HTML supports it and removes wrappers where they don't add value at the rendering layer.

## See also

- [`<book>`](book.md) — for multi-part works.
- [`<book-part>`](book-part.md) — for chapters, parts, appendices within books.
- [`<meta>`](meta.md) — for document metadata.
- [`<section>`](section.md) — for content divisions within an article body.
