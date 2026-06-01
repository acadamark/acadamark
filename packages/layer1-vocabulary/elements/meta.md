---
semantic_role: meta
html_output:
  element: meta
  is_html_native: false
  default_attributes: {}
  notes: |
    Enscribe's <meta> is a custom element distinct from HTML's <meta>
    (which is a void element used for character encoding, viewport, etc.).
    Enscribe's <meta> is a structured container for descriptive metadata —
    information about what the document is. Operational and configuration
    content lives in <data> and <config>, respectively.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-document-type
      values: [article, book, book-part]
      default: article
      notes: |
        Declares the document type. Read by the structural plugin
        (enscribeArticleStructuring / enscribeBookStructuring) to
        decide which Layer 1 wrapper to generate around the document:
        type=article → <article> with <article-front>/<article-body>/<article-back>;
        type=book → <book> with <book-front>/<book-body>/<book-back>;
        type=book-part → <book-part> containing <meta> and body content directly
        (no nested front/body/back wrappers).
        Default is "article" — the most common case. If <meta> has no type
        kwarg the structural plugin treats the document as article-shaped.
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
    - element: keywords
      required: false
  notes: |
    The structured-child content above is one of two equivalent authoring
    forms for <meta>. The other is the kwarg form: <meta title="..."
    author="..." doi="...">. The normalize-to-canonical gate lifts the
    kwarg form to the canonical child-tag form per the META_KWARGS
    allowlist (title / subtitle / author / date / doi / license / lang /
    version / keywords). Unknown kwargs are dropped with a diagnostic;
    <config>-shaped kwargs (e.g. citation-style) on <meta> get a
    "did you mean <config>?" misuse hint.

    NOTE on <abstract>: an <abstract> tag is the *its own element*, not
    a child of <meta> — descriptive but distinct from descriptive
    metadata. The vocabulary entry for <abstract> is not yet written
    (filed as a finding in GitHub Issues). Until that entry exists,
    documents that include an abstract should author it as <abstract>
    outside <meta>; in <meta>, the key 'abstract' is NOT in the
    allowlist and would be dropped with a diagnostic.
content_handler: default
jats_counterpart:
  element: 'article-meta, book-meta, or book-part-meta'
  notes: |
    The JATS mapping depends on the document type (driven by <meta>'s
    type kwarg, or by the surrounding container if <meta> is nested):
      type=article (or default) → <article-meta> inside <front>
      type=book → <book-meta> inside <book-front>
      type=book-part → <book-part-meta> inside <book-part>
    At Layer 1 the element is always <meta>; the exporter constructs
    the type-specific JATS container and the surrounding region wrappers
    (<front>, <book-front>, <book-part>) at export time.
shorthand_examples:
  - source: |
      <meta type=article>
        <title | The Effect of Elephants on Climate>
        <author | Jane Goodall>
        <date | 2024-03-15>
      </meta>

      <section | Introduction>
      The paper begins.
    layer1_html: |
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
            <p>The paper begins.</p>
          </section>
        </article-body>
      </article>
    notes: |
      Author writes <meta type=article> at the top with no <article>
      wrapper. The structural plugin reads type=article and generates:
        - the <article> container
        - <article-front> wrapping the original <meta>
        - <article-body> wrapping the section content
      <title> is promoted to <article-title> as the first child of <meta>.
      <meta> itself survives in the output, inside <article-front>.
  - source: |
      <meta type=book>
        <title | A Natural History of Elephants>
        <author | Jane Goodall>
      </meta>

      <chapter | Origins>
      Content.
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
            <p>Content.</p>
          </book-part>
        </book-body>
      </book>
    notes: |
      type=book generates the book-shaped wrapper instead. Changing the
      single kwarg switches the entire output structure. Each book-part
      contains its own <meta> with <book-part-title>; no <book-part-meta>
      wrapper.
interpreter_strategy: schema
related_plugins:
  - name: enscribeArticleStructuring
    purpose: |
      When <meta type=article> (or <meta> with no type, defaulting to
      article) is present, generates the <article> wrapper plus
      <article-front>/<article-body>/<article-back> regions; promotes
      <title>/<subtitle> in <meta> to <article-title>/<article-subtitle>;
      places <meta> inside <article-front>. See notes/specs/pipeline.md.
  - name: enscribeBookStructuring
    purpose: |
      When <meta type=book> or <meta type=book-part> is present (or
      via shorthand expansions like <chapter>), generates the
      <book>/<book-part> wrapper. For books: also generates
      <book-front>/<book-body>/<book-back>. For book-parts: <meta> and
      body content sit directly inside <book-part> with no nested region
      wrappers. See notes/specs/pipeline.md.

---

# `<meta>`

Document-level descriptive metadata. Holds title, author, date, abstract — content *about* the document. Tells the reader what the document is.

## Semantic intent

`<meta>` is enscribe's structured container for descriptive metadata, parallel to HTML's `<head>`, RMarkdown's YAML frontmatter (the descriptive parts), or JATS's `<article-meta>` and `<book-meta>`.

The element is for **descriptive content only**: the document's title, who wrote it, when it was published, what it's about (abstract, keywords). Anything that helps a reader orient before reading.

For other kinds of non-narrative content, enscribe uses dedicated elements:

- **`<data>`** — referenced resources (inline bibliography blocks, embedded image data, lookup tables). Tells the document where to find supporting material.
- **`<config>`** — build and render configuration (output format, citation style, stylesheets, themes). Tells the build system how to process the document.

Splitting these concerns into distinct elements keeps `<meta>` reading-friendly and prevents technical configuration from cluttering descriptive metadata.

## Where `<meta>` appears

`<meta>` is placed at the top of the document. Its `type` kwarg declares the document type; the structural plugin reads this and generates the appropriate Layer 1 wrapper structure around the content.

The typical authoring path:

```
<meta type=article>
  <title | ...>
  <author | ...>
</meta>

(body content)
```

The structural plugin produces:

```html
<article>
  <article-front>
    <meta data-document-type="article">
      <article-title>...</article-title>
      <author>...</author>
    </meta>
  </article-front>
  <article-body>(body content)</article-body>
</article>
```

`<meta>` survives in the output — it isn't dissolved or replaced. The structural plugin wraps it in the appropriate region (`<article-front>`, `<book-front>`) but leaves the element itself intact.

Inside book-parts (`<book-part>`), `<meta>` sits directly as a child of the book-part (no nested `<book-part-front>` wrapper). For chapters authored via the `<chapter | Title>` shorthand, the structural plugin creates `<meta>` to hold the promoted `<book-part-title>`.

## Type kwarg and title promotion

The `type` kwarg drives both the wrapper generation and the title-element promotion:

| `<meta type=...>` | Wrapper generated | `<title>` promotes to |
|-------------------|-------------------|-----------------------|
| `article` (default) | `<article>` + `<article-front>`/`<article-body>`/`<article-back>` | `<article-title>` |
| `book` | `<book>` + `<book-front>`/`<book-body>`/`<book-back>` | `<book-title>` |
| `book-part` | `<book-part>` (no nested regions) | `<book-part-title>` |

Same mapping for `<subtitle>` → `<article-subtitle>` / `<book-subtitle>` / `<book-part-subtitle>`.

If an author writes the wrapper explicitly (e.g. `<article | Title>` with content inside), the structural plugin does not override it — explicit authoring is an escape hatch.

## Title authoring: two paths

The document title can be supplied via either an explicit container shorthand or `<meta>`'s `<title>` child:

```
<article | My Title>
<section | Body>
```

or:

```
<meta type=article>
  <title | My Title>
</meta>

<section | Body>
```

Both paths produce identical Layer 1 output (the second is preferred in the meta-driven model). Precedence: `<meta>` wins if both are present. See the "Title precedence" section below for warning behavior.

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
- `<author>` — author. `<author>` is itself a structured-data-container tag (parallel to `<meta>`): it accepts both a kwarg form (`<author name="…" orcid="…" +corresponding>`) and a child-tag form (`<author><name | …><affiliation | …><orcid | …><email | …></author>`); the kwarg form lifts to the child-tag form at the normalize-to-canonical gate. Layer 1 `<author>` bears child tags plus the `+corresponding` boolean kwarg. Multiple authors are sibling `<author>` elements inside `<meta>`. See [`<author>`](author.md) and `DESIGN.md` §"Structured-data-container tags."
- `<editor>` — editor (multiple allowed; common in edited volumes).
- `<date>` — date (multiple allowed; type kwarg distinguishes publication, submission, etc.).
- `<doi>`, `<license>`, `<lang>`, `<version>`, `<keywords>` — additional document-descriptive metadata. The kwarg forms (`doi=`, `license=`, etc.) lift to these child tags at the gate; the child-tag forms are authored directly. (Vocabulary entries for the names without existing `.md` files in `packages/layer1-vocabulary/elements/` are filed as findings in GitHub Issues.)

**Not in `<meta>`:** `<abstract>` is its own tag, distinct from descriptive metadata; an `<abstract>` vocabulary entry is filed as a separate finding. Operational content (configuration, references) does not go in `<meta>`; it goes in `<config>` or `<data>` respectively.

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

`<meta>` maps to one of three JATS containers depending on the document type (driven by the `type` kwarg or by the surrounding wrapper). The JATS exporter constructs the type-specific JATS container and the surrounding region wrappers at export time.

| enscribe | JATS |
|-----------|------|
| `<meta type=article>` (in `<article>`) | `<article-meta>` (inside `<front>`) |
| `<meta type=book>` (in `<book>`) | `<book-meta>` (inside `<book-front>`) |
| `<meta type=book-part>` (in `<book-part>`) | `<book-part-meta>` (inside `<book-part>`) |
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

**Minimal metadata (default article).**

```
<meta>
  <title | The Document Title>
</meta>

<section | Body>
Content.
```

`type` defaults to `article`; the structural plugin generates an `<article>` wrapper.

**Common scholarly metadata.**

```
<meta type=article>
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

**Edited volume (book).**

```
<meta type=book>
  <title | Selected Topics in Conservation Biology>
  <editor | The Editor>
  <date type=publication | 2024>
</meta>

<chapter | First Chapter>
<author | Chapter Author>
Chapter content.
```

Switching the volume from article to book is a single kwarg edit on `<meta>` — the structural plugin generates the book-shaped output instead.

The book has an editor; each chapter has its own author.

## Design context

This element's role is governed by two `DESIGN.md` directions
(§"Design directions (discovered through implementation)"):

- **"`<meta>` is for metadata; `<config>` is for options"** —
  `<meta>` holds metadata that appears in or shapes the rendered
  document (title, author, date, affiliations, abstract). Blurring
  with `<config>` would produce silent failure (a title placed in
  `<config>` would simply vanish).
- The kwarg-form ↔ child-tag-form equivalence (`title="X"` versus
  `<title>X</title>`) is the **"Caption-bearing elements support
  two equivalent forms"** direction generalized to structured-data
  containers. The normalize-to-canonical gate's `liftStructuredKwargs`
  is the implementation; `<meta>` is one of the two registered
  structured elements (with `<author>`).

## See also

- [`<data>`](data.md) — for resources referenced by the document but not displayed inline.
- [`<config>`](config.md) — for build and render configuration.
- [`<title>`](title.md), [`<author>`](author.md), [`<date>`](date.md), [`<abstract>`](abstract.md) — descriptive metadata children.
- [`<article>`](article.md), [`<book>`](book.md) — containers that hold metadata.
