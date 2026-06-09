# Layer 1 Vocabulary Specification

The enscribe Layer 1 semantic HTML vocabulary. This is the target for enscribe's interpreter, JATS export, and (optionally) hand-authoring.

This document is the high-level overview: scope, element list by category, governing rules, design decisions. **Field-level details — canonical kwarg value lists, defaults, content shapes, JATS mappings, render-mode lowering — live in the per-element entries under `elements/`.** When the two disagree, the per-element entries are authoritative.

The four governing rules from `notes/specs/layer1-naming.md` apply throughout: container-role naming, defer to HTML where HTML suffices, named depth ladder for sections, consult JATS first.

## Scope

The vocabulary targets four document types:

- **Article** — research papers, essays, blog posts, magazine articles, letters.
- **Book** — long-form documents with chapters and parts.
- **Book-part** — major divisions within a book (Part I, Part II, chapters, appendices). Chapters are book-parts with `book-part-type="chapter"`; the authoring shorthand `<chapter>` expands to that form.

Poems, plays, scripts, and scores are out of scope. They have specialized vocabulary that doesn't share enough with prose documents to be worth forcing into the same model.

## Element list

The vocabulary is enumerated below, with per-element files under
`packages/layer1-vocabulary/elements/` holding the authoritative spec for
each element. The tables below group elements by role. Elements listed
here without an entry are reserved (their per-element specs are open work
in the roadmap).

### Element categories (the `category` field)

Each element entry declares a `category` in its frontmatter — the
machine-readable form of the role grouping the tables below express in
prose. It exists so consumers can group the vocabulary mechanically (the
docs-site coverage gallery walks the entries and groups by `category`,
so completeness is structural rather than hand-maintained). The canonical
category values are:

`document-containers` · `structural-regions` · `sections` ·
`block-prose` · `frameables` · `math` · `code` ·
`inline-formatting` · `citations-and-references` ·
`structured-data-containers` · `metadata` · `theorem-family`

Every element entry carries exactly one of these. A consumer that
encounters a `category` outside this set should surface it loudly rather
than silently dropping the element — an unknown category means a new value
was introduced without being added here.

An element that the pipeline *produces* rather than the author *writes* —
the structural region wrappers (`article-front`, `book-body`, …), the
generated title/subtitle wrappers (`section-title`, `article-subtitle`, …),
and generated apparatus output assembled by the citation plugins
(`bibliography`, `bib-entry`) — additionally declares `authoring: generated`.
These elements are produced by a pipeline plugin; an explicit-form escape
hatch may render but is not the authoring path. The marker tells a consumer
expecting authored examples (again, the coverage gallery) to treat a
missing example as expected for these entries rather than as a coverage
hole. Its absence means the element is authored directly.

A related marker, `requires-context: <book | bibliography>`, flags an element
whose authored examples are **context-dependent** — they render correctly only
inside a larger document: a `<book>` for the book-part shorthands
(`requires-context: book`), a loaded bibliography for `<cite>`
(`requires-context: bibliography`). Rendered in isolation (as the coverage
gallery does) such an example degrades to a misleading "unknown tag" output, so
the gallery shows a short note ("Renders only within a book." / "Resolves
against a loaded bibliography.") instead of the isolated render. Like
`authoring: generated`, it is a gallery-display hint, not a parser/interpreter
input.

### Container elements

Three distinct top-level containers, each with front/body/back regions (for articles and books). Following BITS (the JATS sibling for books) precedent, distinct elements are used for distinct structural roles rather than collapsing them under attribute disambiguation.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<article>` | `<article>` | A self-contained document or a sectional response. |
| `<book>` | BITS `<book>` | A book-length work composed of parts and chapters. |
| `<book-part>` | BITS `<book-part>` (with `book-part-type` kwarg) | Major division within a book (Part I, Part II, chapter, appendix, preface, etc.). |

The authoring shorthand `<chapter>` expands at the parser layer to `<book-part book-part-type="chapter">`; it is not a separate Layer 1 element. Other shorthand expansions follow the same pattern (`<part>`, `<appendix>`, `<preface>`, etc.).

**`<appendix>` has two projections by document type (#100).** It is the one book-part shorthand valid in **both** book and article context (it has no standalone vocabulary meaning, so it is never ambiguous). In a **book** it lands in `<book-back>` and exports to BITS `<book-part book-part-type="appendix">`; in an **article** it lands in `<article-back>` and exports to JATS `<app>` collected in one `<app-group>` (multiple appendices → multiple `<app>` in the group). The authoring surface, title/id, render, and the #57 appendix-letter numbering (`A`, `A.1`, "Appendix A" cross-references) are identical across both — only the placement and the JATS element differ.

In practice, authors rarely write the container elements directly. The typical authoring path is `<meta type=...>` plus content; the structural plugin reads the `type` kwarg and generates the container plus region wrappers. The container elements are real Layer 1 elements that exist in output for semantic structure and clean JATS export. They remain available as explicit-form escape hatches.

Articles and books have a three-region structure (generated by the structural plugin):

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<article-front>` | `<front>` | Article metadata; holds `<meta>`. |
| `<article-body>` | `<body>` | Article main content. |
| `<article-back>` | `<back>` | Article apparatus. |
| `<book-front>` | BITS `<book-front>` | Book metadata; holds `<meta>` and front-matter book-parts. |
| `<book-body>` | BITS `<book-body>` | Book main content (contains body-matter book-parts). |
| `<book-back>` | BITS `<book-back>` | Book apparatus (back-matter book-parts plus bibliography, etc.). |

Book-parts do **not** have nested front/body/back wrappers. Each `<book-part>` directly contains `<meta>` (holding `<book-part-title>` and other descriptive metadata) followed by body content. This keeps the recursive book-part structure simple. Per-element details are in `elements/book-part.md`.

A `document-type` attribute on each container provides finer classification:

```
<article document-type="research-article">
<article document-type="essay">
<article document-type="review">
<article document-type="letter">
<article document-type="response">
<book document-type="textbook">
<book document-type="monograph">
<book document-type="edited-collection">
```

`document-type` values follow JATS conventions where they exist.

### Document metadata (lives inside `<meta>`)

`<meta>` is the metadata container that authors place at the top of a document. Its `type` kwarg (`article`, `book`, `book-part`) tells the structural plugin which Layer 1 wrapper to generate. `<meta>` survives in the output, placed inside `<article-front>` (or `<book-front>`, or directly inside `<book-part>`) by the structural plugin.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<meta>` | `<article-meta>` / `<book-meta>` / `<book-part-meta>` (per `type`) | Metadata container, placed at the top of the document. |
| `<article-title>` | `<article-title>` | Document title (promoted from `<title>` inside `<meta>` when `type=article`). |
| `<article-subtitle>` | `<subtitle>` | Document subtitle. |
| `<book-title>` | BITS `<book-title-group>/<book-title>` | Book title (promoted from `<title>` inside `<meta>` when `type=book`). |
| `<book-subtitle>` | BITS `<book-title-group>/<subtitle>` | Book subtitle. |
| `<book-part-title>` | BITS `<book-part-meta>/<title>` | Book-part title (promoted from `<title>` inside `<meta>` when `type=book-part`). |
| `<author>` | `<contrib>` (with `<string-name>` content) | Author. Content is a single name string. |
| `<abstract>` | `<abstract>` | Abstract. |
| `<keywords>` | `<kwd-group>` | Keywords list. *(Deferred — to be specified when the relevant slice arrives.)* |
| `<publication-date>` | `<pub-date>` | Date of publication. *(Deferred — to be specified when the relevant slice arrives.)* |

`<author>` is intentionally simple. Content is a single string name (matching LaTeX's `\author{}` model). Structured author metadata (given names, surname, ORCID, affiliation) is deferred to a future extension if needed. JATS export wraps the string in `<contrib><string-name>...</string-name></contrib>`.

### Section vocabulary (named depth ladder, per Rule 3)

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<section>` | `<sec>` | Top-level section within a body. |
| `<sub-section>` | `<sec>` (nested) | Depth 2. |
| `<sub-sub-section>` | `<sec>` (nested) | Depth 3. |
| `<section-title>` | `<title>` (in sec) | Section title. |
| `<sub-section-title>` | `<title>` (in nested sec) | Sub-section title. |
| `<sub-sub-section-title>` | `<title>` (nested deeper) | Sub-sub-section title. |

The depth ladder lives *inside* any container's body. Sections in a chapter use the same `<section>` / `<sub-section>` ladder as sections in a top-level article.

A `sec-type` attribute on `<section>` carries semantic classification, following JATS conventions for IMRaD-style papers and beyond. Field-level details (the canonical value list, defaults, mapping behavior) live in the per-element entries: see `elements/section.md`, `elements/sub-section.md`, and `elements/sub-sub-section.md`. Book-specific section types follow the same pattern with their own values.

### Captioned content — figures and tables

Captioned, numbered, self-contained content uses HTML-native `<figure>` with `<figcaption>` for captions. Tables, images, code listings, equations, and diagrams that need a caption are all wrapped in `<figure>`. Per Rule 2, no Layer 1 custom element is introduced — both `<figure>` and `<figcaption>` are standard HTML.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<figure>` | `<fig>`, `<table-wrap>`, `<disp-formula>`, etc. (per content type) | Captioned-content wrapper. |
| `<figcaption>` | JATS `caption` | Caption inside a `<figure>`. |

Usage:

```
<figure #fig:elephant src=elephant.jpg |
  An adult African elephant.>

<figure #tab:revenue |
  <table>...</table>
  Annual revenue, by region.>

<figure #lst:fibonacci |
  <pre><code>...</code></pre>
  The fibonacci function.>
```

See `elements/figure.md` for the per-element details (canonical kwarg list, content shape, JATS mapping, handler behavior).

Numbering is per-domain. Figures are numbered separately from tables, which are numbered separately from listings, equations, etc. The numbering plugin determines the domain by inspecting the figure's content (`img` → figure, `table` → table, `pre code` → listing, `math` → equation).

JATS export converts each `<figure>` to its appropriate JATS element based on content: `<fig>` for image content, `<table-wrap>` for tables, `<disp-formula>` for equations, etc. The mapping is content-type-driven, not element-name-driven.

### Block-level content (lives in body or section)

Almost all standard HTML.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<p>` | `<p>` | Paragraph. |
| `<table>` | `<table>` | Table (with full HTML `<thead>`, `<tbody>`, etc.). |
| `<ul>`, `<ol>`, `<li>` | `<list>` | Lists — render output of the `<list>` construct (see *Lists* below). |
| `<dl>`, `<dt>`, `<dd>` | `<def-list>` | Definition lists. *(Deferred — to be specified when the relevant slice arrives.)* |
| `<blockquote>` | `<disp-quote>` | Long quotation. |
| `<pre><code>` | `<code>` | Display code. *(Deferred — `<pre>` does not yet have a per-element entry; to be specified with the code-block slice.)* |
| `<aside>` | `<boxed-text>` | Sidebar / pull-out box. |
| `<hr>` | `<hr>` | Horizontal rule. |

**Lists (#137).** `<list>` / `<list ordered>` is the canonical authoring element; `<ul>` / `<ol>` / `<li>` are its HTML **render output, not authoring vocabulary**. The `ordered` flag selects an ordered list (`<ol>`); the default is unordered (`<ul>`). Items are written with the **block-scoped** paired sigil `<- content ->` (or the alternate `<* content *>`) — recognized only at flow position, never inline, so prose `<-` / `->` is safe — or the `-` / `*` markdown idiom. A `<list>` lowers to a markdown list node and reuses the existing list render; on export it becomes JATS `<list list-type="bullet|order">` with `<list-item>`. Multi-paragraph items, tag-based nesting, a bare `<li>` marker, and the ordered numbering scheme + `start` are deferred. See `notes/specs/lists.md`.

### Inline content

Citations, cross-references, and notes are first-class elements with their own semantics, distinct from each other.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<em>` | `<italic>` | Emphasis. |
| `<strong>` | `<bold>` | Strong emphasis. |
| `<code>` | `<monospace>` | Inline code. |
| `<a>` | `<ext-link>` | Hyperlink. |
| `<cite>` | `<xref ref-type="bibr">` | Citation reference (to a bibliography entry). |
| `<ref>` | `<xref ref-type="fig|sec|eq|...">` | Cross-reference (to a numbered element). |
| `<note>` | `<fn>` | Footnote/endnote/sidenote (inline marker). |
| `<abbr>` | `<abbrev>` | Abbreviation. *(Deferred — to be specified when the relevant slice arrives.)* |
| `<term>` | `<named-content>` | A term being introduced. *(Deferred — to be specified when the relevant slice arrives.)* |

`<cite>` and `<ref>` are kept as separate elements (rather than unified under JATS-style `<xref ref-type>`) because they have distinct authoring intent and behavior. JATS export converts both to `<xref>` with the appropriate `ref-type`.

### Apparatus (lives in `<article-back>`)

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<bibliography>` | `<ref-list>` | Bibliography. |
| `<bib-entry>` | `<ref>` | Single bibliography entry. |
| `<note-list>` | `<fn-group>` | Footnote/endnote block. |
| `<glossary>` | `<glossary>` | Glossary. *(Deferred — to be specified when the relevant slice arrives.)* |
| `<glossary-entry>` | `<glossary>/<def-item>` | Single glossary entry. *(Deferred — to be specified when the relevant slice arrives.)* |

`<bib-entry>` is the bibliography entry name, despite the verbosity, to avoid collision with the cross-reference `<ref>` element (which JATS unfortunately uses for both bibliography entries and cross-references).

### Theorem-family (deferred but reserved)

Not in the minimal set today. Listed to reserve the slot.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<theorem>` | `<statement content-type="theorem">` | Theorem statement. |
| `<proof>` | `<statement content-type="proof">` | Proof. |
| `<lemma>` | `<statement content-type="lemma">` | Lemma. |
| `<corollary>` | `<statement content-type="corollary">` | Corollary. |
| `<definition>` | `<def-list>` or `<statement>` | Definition. |
| `<example>` | `<statement content-type="example">` | Worked example. |

To be specified in a separate design pass following Rule 4.

## Document-level attributes

Some attributes apply at the root container level (`<article>`, `<book>`, `<book-part>`) rather than per-element:

- **`document-type`** — finer classification within a container category.
- **`note-position`** — where notes are displayed in render mode (`foot` / `end` / `side` / `chapter-end`).
- **`numbering-style`** — how numbers are displayed (Arabic, Roman, alpha).

Field-level details (canonical value lists, defaults, inheritance behavior) live in the per-element entries (`elements/article.md`, `elements/book.md`, `elements/book-part.md`).

## Math and code (delegated)

Per `notes/specs/idioms.md`, math and code are delegated to existing parsers and renderers:

- Inline math becomes mdast `inlineMath` (from `remark-math`), rendered by `rehype-katex`.
- Display math becomes mdast `math`, rendered by `rehype-katex`.
- Inline code becomes mdast `inlineCode`, rendered natively.
- Code blocks become mdast `code`, rendered by `rehype-shiki` or similar.

These don't need new Layer 1 elements. Display math can be wrapped in `<figure>` for numbering and captioning.

## What's deliberately not in the minimal set

- **Document types beyond the four targeted.** Poetry, drama, music, scripts each have their own vocabulary that would distort the minimal set.
- **Rich author modeling.** ORCID, affiliations as nested objects, role attribution, contribution statements. Future extension if needed.
- **Funding sources, peer review metadata, related-article links, copyright statements, version history.** All real JATS elements; deferred until needed.
- **Embedded DSL elements.** Mermaid, ABC notation, etc. Handled by long-form DSL tags at the parser layer; their Layer 1 representation is `<figure>` containing appropriate child content.
- **Per-note positioning.** Note position is document-global. Per-note overrides are a future extension.

## Decisions baked in (with brief rationale)

For future readers and contributors, the load-bearing decisions:

1. **Distinct container elements (Option Y).** `<article>`, `<book>`, and `<book-part>` are separate elements rather than a single recursive `<article>` with `document-type` distinctions. This matches BITS, makes JATS export simpler, and gives authors a more discoverable vocabulary. The cost is a slightly larger element list; the cost is bounded. Chapters, parts, appendices, etc. are `<book-part>` instances disambiguated by the `book-part-type` kwarg, not separate Layer 1 elements; the parser exposes them as authoring shorthands (`<chapter>`, `<part>`, `<appendix>`).

2. **Citations and cross-refs as separate first-class elements.** `<cite>` and `<ref>` are distinct rather than unified under `<xref ref-type>`. They have distinct authoring intent and behavior. JATS export reunifies them.

3. **Notes as first-class with global positioning.** `<note>` and `<note-list>` are first-class elements. The foot/end/side distinction is a presentation concern handled by a document-level `note-position` attribute. Per-note overrides are deferred.

4. **HTML-native `<figure>` and `<figcaption>` for captioned content.** Tables, figures, listings, and equations that need a caption all wrap in HTML's standard `<figure>` element, with the caption supplied via `<figcaption>`. This applies Rule 2 (defer to HTML where HTML suffices) — no Layer 1 custom element is introduced for captioned content. Numbering is per-domain based on content type. See `elements/figure.md` for per-element details.

5. **Captions as a sibling element inside `<figure>`.** `<figcaption>` is a child of `<figure>`, not an attribute on the captioned content. This allows rich content (cross-refs, citations, math) inside captions.

6. **Simple `<author>`.** Content is a single name string. Rich author metadata is a future extension.

7. **`<bib-entry>` for bibliography entries.** Verbose but avoids collision with `<ref>`.

8. **Section depth as named ladder, not recursive nesting.** `<section>` / `<sub-section>` / `<sub-sub-section>` is the depth ladder. Per `notes/specs/layer1-naming.md` Rule 3.

9. **Document type via `<meta type=...>`.** Authors declare document type as a kwarg on `<meta>` (`type=article` / `type=book` / `type=book-part`) rather than wrapping content in `<article>` / `<book>` / `<book-part>`. The structural plugin reads the type kwarg and generates the appropriate Layer 1 wrapper structure: article + front/body/back; book + front/body/back; book-part containing `<meta>` and body content directly (no nested front/body/back wrappers). The container elements (`<article>`, `<book>`, `<book-part>`) are real Layer 1 elements that exist in output for semantic structure and clean JATS export. Authors can still write them explicitly as an escape hatch. The `<book-part-meta>` element was removed (May 2026) because book-parts use the same `<meta>` container as articles and books.

## Where this fits in the project

- This vocabulary is the target for `enscribeInterpreter` (the interpreter) and for `enscribeToJats` (JATS export).
- It is implementable as W3C custom elements (mostly registration-only, since the elements are semantic markers rather than interactive components).
- It can be authored directly (any tool producing conformant HTML works) or through enscribe's shorthand (the primary authoring path).
- It is the deliverable that makes enscribe's pitch concrete: this is what "academic markdown for the web that can submit to journals" actually outputs.

For current project status see `STATUS.md`; for open work see
[GitHub Issues](https://github.com/enscribejs/enscribe/issues). The interpreter that consumes this
vocabulary is documented in `notes/specs/interpreter.md`; the pipeline that
produces and operates on Layer 1 elements is in `notes/specs/pipeline.md`.
