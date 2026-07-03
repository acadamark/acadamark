---
semantic_role: article
category: document-containers
semantic_family: structural-scaffolding
html_output:
  element: article
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
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
      values: [bottom, margin]
      default: bottom
      notes: |
        Document-level note render mode (#33): "bottom" (default) keeps numbered
        notes at the foot of the document; "margin" projects each note into a
        margin column beside its marker (Tufte sidenotes). Where notes COLLECT
        (per-note end/foot/side; per-section or per-chapter) is the per-note
        `placement` kwarg plus `note-scope`, not this attribute — see <note>.
content:
  shape:
    - element: article-front
      required: false
    - element: article-body
      required: false
    - element: article-back
      required: false
title_extraction: true
jats_counterpart:
  element: article
  notes: |
    JATS <article> wraps <front>, <body>, and <back>. Enscribe uses
    <article-front>, <article-body>, <article-back> as parallel custom
    elements. The mapping is direct. JATS's article-type attribute (with
    values like research-article, review-article, editorial, etc.) is
    not currently set by enscribe — sub-classification within the
    article category is deferred until a JATS-export slice needs it.
shorthand_examples:
  - source: |
      <meta type=article>
        <title | The Effect of Elephants on Climate>
        <author | Jane Goodall>
        <date | 2024-03-15>
      </meta>

      <section | Introduction>
      The paper begins here.

      <section | Conclusion>
      The paper concludes here.
    ehtml: |
      <article>
        <article-front>
          <meta data-document-type="article">
            <article-title>The Effect of Elephants on Climate</article-title>
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
    notes: |
      Typical authoring path: <meta type=article> at the top with no
      <article> wrapper. The structural plugin generates the <article>
      container and the three region wrappers. <title> in <meta> is
      promoted to <article-title>; <meta> itself survives inside
      <article-front>.
  - source: |
      <article | The Effect of Elephants on Climate>
      <meta>
        <author | Jane Goodall>
      </meta>

      <section | Introduction>
      The paper begins here.
    ehtml: |
      <article>
        <article-front>
          <meta>
            <article-title>The Effect of Elephants on Climate</article-title>
            <author>Jane Goodall</author>
          </meta>
        </article-front>
        <article-body>
          <section>
            <section-title>Introduction</section-title>
            <p>The paper begins here.</p>
          </section>
        </article-body>
      </article>
    notes: |
      Explicit-form escape hatch: <article | Title>. The structural plugin
      respects the explicit wrapper. Pipe content from <article> becomes
      <article-title>, placed as the first child of <meta> (creating
      <meta> if absent, or appending if present).
  - source: |
      <section | Introduction>
      The introduction.

      <section | Conclusion>
      The conclusion.
    ehtml: |
      <article>
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
      No <meta> and no <article> declared. The structural plugin assumes
      article-shaped (the default) and wraps the sections in an implicit
      article. <article-front> is omitted because there's no metadata.
interpreter_strategy: schema
related_plugins:
  - name: enscribeArticleStructuring
    runs_before: enscribeInterpreter
    purpose: |
      Reads <meta type=article> (or <meta> with no type, defaulting to
      article) and generates the <article> wrapper plus
      <article-front>/<article-body>/<article-back> regions. Promotes
      <title>/<subtitle> in <meta> to <article-title>/<article-subtitle>.
      Honors explicit <article> if the author wrote it. See
      notes/specs/pipeline.md for the full pipeline.

---

# `<article>`

An article represents a single self-contained piece of writing intended to be read as one document. Research papers, journal articles, blog posts, reports, memos. The most common top-level container in enscribe.

## Semantic intent

`<article>` is the canonical container for a single-document deliverable. Use it for any piece of writing that stands on its own and isn't part of a larger work. Compare:

- `<article>` — a single self-contained document.
- `<book>` — a multi-part work containing book-parts.
- `<book-part>` — a chapter, named part, or appendix within a book.

When in doubt, use `<article>`. It's the default for most academic and editorial writing.

## How `<article>` is produced

`<article>` is a real Layer 1 element that appears in output, but it's typically *generated by the structural plugin* rather than authored as a wrapper. The typical authoring path is:

```
<meta type=article>
  <title | The Title>
  <author | ...>
</meta>

(section content, figures, paragraphs)
```

`enscribeArticleStructuring` reads `<meta type=article>` (or `<meta>` with no type — the default is `article`) and generates:

- The outer `<article>` element.
- `<article-front>` wrapping the original `<meta>`.
- `<article-body>` wrapping the section content.
- `<article-back>` wrapping back-matter (bibliography, note-list, etc.), if any.

Authors don't typically write `<article>` directly. The meta-driven path is preferred because changing document type is a single kwarg edit.

## Explicit-form escape hatch

Authors can write `<article>` explicitly when they need fine control — for example to set attributes (id, classes, numbering-style) on the container:

```
<article #my-paper numbering-style=roman>
<meta>
  <author | Author Name>
</meta>

<section | Introduction>
Body content.
```

The structural plugin respects the explicit wrapper. The title-after-pipe shorthand works on explicit `<article>` too: `<article | The Title>` produces an `<article-title>` placed as the first child of `<meta>` (creating `<meta>` if absent).

## Required structure

`<article>` contains three structural regions, mirroring JATS:

- `<article-front>` — front matter: `<meta>` (which holds the article's descriptive metadata).
- `<article-body>` — the main content: sections, paragraphs, figures.
- `<article-back>` — back matter: bibliography, notes, data, config.

All three are generated by the structural plugin from the author's input. Authors can also place `<data>` or `<config>` blocks explicitly in front matter if they prefer.

## Attributes

`numbering-style` controls how numbered elements (figures, equations, sections) are numbered throughout the document. Document-level default; individual numbered elements can override.

`note-position` selects the document-level note **render mode** — `bottom` (default; notes at the foot of the document) or `margin` (Tufte sidenotes, #33). Where notes *collect* (per-note `end`/`foot`/`side`, and per-section vs per-chapter) is the per-note `placement` kwarg and `note-scope` — see [`<note>`](note.md).

Sub-classification within the article category (research-article, review-article, editorial, letter, etc.) is not currently exposed as an attribute. JATS export will need this distinction eventually; the kwarg will be added back at that point.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<article>` | `<article>` |
| `<article-front>` | `<front>` (specifically `<article-meta>` inside) |
| `<article-body>` | `<body>` |
| `<article-back>` | `<back>` |
| `<article-title>` | `<article-title>` (inside `<title-group>` in `<article-meta>`) |

JATS's `article-type` attribute (research-article, review-article, etc.) is not currently populated; sub-classification is deferred.

The `numbering-style` and `note-position` kwargs are enscribe-specific (they describe rendering preferences, not JATS-standard metadata). They're preserved as `data-*` attributes for downstream processors but not exported to JATS.

## Authoring patterns

**Minimal article (sections only).**

```
<section | Introduction>
The introduction.

<section | Conclusion>
The conclusion.
```

No `<meta>` and no `<article>`. The structural plugin assumes article-shaped (the default) and wraps the sections in an implicit article.

**Typical article with metadata (meta-driven).**

```
<meta type=article>
  <title | The Effect of Elephants on Climate>
  <author | Jane Goodall>
  <date | 2024-03-15>
</meta>

<section | Introduction>
The introduction.
```

The preferred authoring path. `<meta type=article>` declares the document type; the structural plugin generates `<article>`/`<article-front>`/`<article-body>`/`<article-back>` around the content. `<title>` is promoted to `<article-title>`.

**Article with explicit `<article>` and custom attributes.**

```
<article #my-paper numbering-style=roman | Custom Numbering Paper>
<meta>
  <author | Author Name>
</meta>
<abstract | A brief summary of the paper.>

<section | Introduction>
Body content.
```

Use the explicit form when you need a custom id or numbering style on the `<article>` element itself. The title-after-pipe shorthand still applies.

**Fully explicit structure (escape hatch).**

```
<article #my-paper>
  <article-front>
    <meta>
      <article-title | The Effect of Elephants on Climate>
      <author | Jane Goodall>
      <abstract | A brief summary.>
    </meta>
  </article-front>
  <article-body>
    <section | Introduction>
    Body content.
  </article-body>
  <article-back>
    <bibliography></bibliography>
  </article-back>
</article>
```

Use the fully explicit form when you need precise control over what goes in front, body, or back. The structural plugin doesn't override anything an author wrote explicitly.

## Render-mode lowering

In semantic mode (the default), `<article>` and its children remain as Layer 1 elements with explicit semantics. Render-mode lowering of the article structure to plain HTML (`<article-front>` → `<header>`, `<article-title>` → `<h1>`, etc.) is a future, unbuilt feature ([#40](https://github.com/enscribejs/enscribe/issues/40)) specified in [`notes/specs/render-mode.md`](../../../../notes/specs/render-mode.md).

## See also

- [`<book>`](book.md) — for multi-part works.
- [`<book-part>`](book-part.md) — for chapters, parts, appendices within books.
- [`<meta>`](meta.md) — for document metadata.
- [`<section>`](section.md) — for content divisions within an article body.
