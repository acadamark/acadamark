# Layer 1 Minimal Vocabulary — Revised Draft

This is the revised draft of acadamark's Layer 1 semantic HTML vocabulary, incorporating decisions made in design discussion. It is the spec that goes in `packages/layer1-vocabulary/` and serves as the target for acadamark's interpreter, JATS export, and (optionally) hand-authoring.

The four governing rules from `notes/layer1-naming.md` apply throughout: container-role naming, defer to HTML where HTML suffices, named depth ladder for sections, consult JATS first.

## Scope

The vocabulary targets four document types:

- **Article** — research papers, essays, blog posts, magazine articles, letters.
- **Book** — long-form documents with chapters and parts.
- **Chapter** — when nested in a book; structurally an article.
- **Book-part** — major divisions within a book (Part I, Part II).

Poems, plays, scripts, and scores are out of scope. They have specialized vocabulary that doesn't share enough with prose documents to be worth forcing into the same model.

## Element list (~35 elements)

### Container elements

Four distinct top-level containers, each with optional front/body/back. Following BITS (the JATS sibling for books) precedent, distinct elements are used for distinct structural roles rather than collapsing them under attribute disambiguation.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<article>` | `<article>` | A self-contained document or a sectional response. |
| `<book>` | BITS `<book>` | A book-length work composed of parts and chapters. |
| `<book-part>` | BITS `<book-part book-part-type="part">` | Major division within a book (Part I, Part II). |
| `<chapter>` | BITS `<book-part book-part-type="chapter">` | A chapter; structurally an article nested in a book. |

Each container has its own three-part structure:

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<article-front>` | `<front>` | Article metadata. |
| `<article-body>` | `<body>` | Article main content. |
| `<article-back>` | `<back>` | Article apparatus. |
| `<book-front>` | BITS `<book-front>` | Book metadata. |
| `<book-body>` | BITS `<book-body>` | Book main content (contains parts, chapters). |
| `<book-back>` | BITS `<book-back>` | Book apparatus. |
| `<chapter-front>` | BITS `<book-part-meta>` | Chapter metadata. |
| `<chapter-body>` | BITS `<body>` (in book-part) | Chapter content. |
| `<chapter-back>` | BITS `<back>` (in book-part) | Chapter apparatus (often unused). |

`<book-part>` typically does not have its own front/body/back; it just contains chapters. If a `<book-part>` does need metadata (a part introduction, a part epigraph), it can use the same front/body/back pattern, named `<book-part-front>` etc.

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

### Document metadata (lives in `<article-front>` or `<chapter-front>`)

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<article-title>` | `<article-title>` | Document title. |
| `<article-subtitle>` | `<subtitle>` | Document subtitle. |
| `<chapter-title>` | BITS `<book-part-meta>/<title>` | Chapter title. |
| `<chapter-subtitle>` | BITS `<book-part-meta>/<subtitle>` | Chapter subtitle. |
| `<book-title>` | BITS `<book-title-group>/<book-title>` | Book title. |
| `<book-subtitle>` | BITS `<book-title-group>/<subtitle>` | Book subtitle. |
| `<book-part-title>` | BITS `<book-part-meta>/<title>` | Book-part title. |
| `<author>` | `<contrib>` (with `<string-name>` content) | Author. Content is a single name string. |
| `<abstract>` | `<abstract>` | Abstract. |
| `<keywords>` | `<kwd-group>` | Keywords list. |
| `<publication-date>` | `<pub-date>` | Date of publication. |

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

A `sec-type` attribute on `<section>` carries semantic classification, following JATS:

| Value | Purpose |
|-------|---------|
| (unset) | Default. |
| `intro` | Introduction. |
| `methods` | Methods. |
| `results` | Results. |
| `discussion` | Discussion. |
| `conclusion` | Conclusion. |
| `appendix` | Appendix (typically in `<article-back>`). |
| `acknowledgments` | Acknowledgments. |

Book-specific section types (prologue, epilogue, foreword, dedication) follow the same pattern with their own values.

### Floats — captioned, numbered, self-contained content

A `<float>` is a self-contained content unit that has a number, has a caption, can be cross-referenced, and may appear out of textual flow. The term is borrowed from LaTeX, where it has the same semantic meaning. Tables, figures, code listings, equations, and diagrams are all floats.

Note on the name: `<float>` collides slightly with CSS's `float: left` property, which is unfortunate. The CSS meaning has faded since Grid and Flexbox replaced float-based layout. In academic publishing contexts (LaTeX users, JATS users), "float" already has the correct semantic meaning. The collision is contextual and not literal — the element name and the CSS property are in different namespaces. The name is provisional and may change if a better term surfaces during implementation; alternatives considered include `<exhibit>` and `<panel>`, both with their own tradeoffs.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<float>` | `<fig>`, `<table-wrap>`, `<disp-formula>`, etc. (per content type) | Universal captioned-content wrapper. |
| `<caption>` | `<caption>` | Caption for a float. |

Usage:

```
<float #fig:elephant>
  <img src=elephant.jpg>
  <caption | An adult African elephant.>
</float>

<float #tab:revenue>
  <table>...</table>
  <caption | Annual revenue, by region.>
</float>

<float #lst:fibonacci>
  <pre><code>...</code></pre>
  <caption | The fibonacci function.>
</float>

<float #eq:euler>
  <math>...</math>
  <caption | Euler's identity.>
</float>
```

Numbering is per-domain. Figures are numbered separately from tables, which are numbered separately from listings, equations, etc. The numbering plugin determines the domain by inspecting the float's content (`img` → figure, `table` → table, `pre code` → listing, `math` → equation).

JATS export converts each `<float>` to its appropriate JATS element based on content: `<fig>` for image content, `<table-wrap>` for tables, `<disp-formula>` for equations, etc. The mapping is content-type-driven, not element-name-driven.

### Block-level content (lives in body or section)

Almost all standard HTML.

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<p>` | `<p>` | Paragraph. |
| `<table>` | `<table>` | Table (with full HTML `<thead>`, `<tbody>`, etc.). |
| `<ul>`, `<ol>`, `<li>` | `<list>` | Lists. |
| `<dl>`, `<dt>`, `<dd>` | `<def-list>` | Definition lists. |
| `<blockquote>` | `<disp-quote>` | Long quotation. |
| `<pre><code>` | `<code>` | Display code. |
| `<aside>` | `<boxed-text>` | Sidebar / pull-out box. |
| `<hr>` | `<hr>` | Horizontal rule. |

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
| `<abbr>` | `<abbrev>` | Abbreviation. |
| `<term>` | `<named-content>` | A term being introduced. |

`<cite>` and `<ref>` are kept as separate elements (rather than unified under JATS-style `<xref ref-type>`) because they have distinct authoring intent and behavior. JATS export converts both to `<xref>` with the appropriate `ref-type`.

### Apparatus (lives in `<article-back>`)

| Element | JATS counterpart | Purpose |
|---------|------------------|---------|
| `<bibliography>` | `<ref-list>` | Bibliography. |
| `<bib-entry>` | `<ref>` | Single bibliography entry. |
| `<note-list>` | `<fn-group>` | Footnote/endnote block. |
| `<glossary>` | `<glossary>` | Glossary. |
| `<glossary-entry>` | `<glossary>/<def-item>` | Single glossary entry. |

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

Some attributes apply at the root container level rather than per-element:

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `document-type` | (per container, see above) | Finer classification within container category. |
| `note-position` | `foot` \| `end` \| `side` | Where notes are displayed in render mode. Defaults to `foot`. |
| `numbering-style` | (TBD) | How numbers are displayed (Arabic, Roman, etc.). |

These live on the root container element (`<article>`, `<book>`, `<chapter>`).

## Math and code (delegated)

Per `notes/idioms.md`, math and code are delegated to existing parsers and renderers:

- Inline math becomes mdast `inlineMath` (from `remark-math`), rendered by `rehype-katex`.
- Display math becomes mdast `math`, rendered by `rehype-katex`.
- Inline code becomes mdast `inlineCode`, rendered natively.
- Code blocks become mdast `code`, rendered by `rehype-shiki` or similar.

These don't need new Layer 1 elements. Display math can be wrapped in `<float>` for numbering and captioning.

## What's deliberately not in the minimal set

- **Document types beyond the four targeted.** Poetry, drama, music, scripts each have their own vocabulary that would distort the minimal set.
- **Rich author modeling.** ORCID, affiliations as nested objects, role attribution, contribution statements. Future extension if needed.
- **Funding sources, peer review metadata, related-article links, copyright statements, version history.** All real JATS elements; deferred until needed.
- **Embedded DSL elements.** Mermaid, ABC notation, etc. Handled by long-form DSL tags at the parser layer; their Layer 1 representation is `<float>` containing appropriate child content.
- **Per-note positioning.** Note position is document-global. Per-note overrides are a future extension.

## Decisions baked in (with brief rationale)

For future readers and contributors, the load-bearing decisions:

1. **Distinct container elements (Option Y).** `<article>`, `<book>`, `<book-part>`, `<chapter>` are separate elements rather than a single recursive `<article>` with `document-type` distinctions. This matches BITS, makes JATS export simpler, and gives authors a more discoverable vocabulary. The cost is a slightly larger element list; the cost is bounded.

2. **Citations and cross-refs as separate first-class elements.** `<cite>` and `<ref>` are distinct rather than unified under `<xref ref-type>`. They have distinct authoring intent and behavior. JATS export reunifies them.

3. **Notes as first-class with global positioning.** `<note>` and `<note-list>` are first-class elements. The foot/end/side distinction is a presentation concern handled by a document-level `note-position` attribute. Per-note overrides are deferred.

4. **`<float>` as the universal captioned-content element.** Tables, figures, listings, and equations all wrap in `<float>`. Numbering is per-domain based on content type. Name is provisional; may change if a better term surfaces.

5. **Captions as a sibling element inside `<float>`.** `<caption>` is a child of `<float>`, not an attribute on the captioned content. This allows rich content (cross-refs, citations, math) inside captions.

6. **Simple `<author>`.** Content is a single name string. Rich author metadata is a future extension.

7. **`<bib-entry>` for bibliography entries.** Verbose but avoids collision with `<ref>`.

8. **Section depth as named ladder, not recursive nesting.** `<section>` / `<sub-section>` / `<sub-sub-section>` is the depth ladder. Per `notes/layer1-naming.md` Rule 3.

## Where this fits in the project

- This vocabulary is the target for `acadamarkTagInterpret` (the interpreter) and for `rehypeAcadamarkToJats` (JATS export).
- It is implementable as W3C custom elements (mostly registration-only, since the elements are semantic markers rather than interactive components).
- It can be authored directly (any tool producing conformant HTML works) or through acadamark's shorthand (the primary authoring path).
- It is the deliverable that makes acadamark's pitch concrete: this is what "academic markdown for the web that can submit to journals" actually outputs.

## Where this lives

This document goes in `packages/layer1-vocabulary/` as the spec. Per-element reference pages live in `packages/layer1-vocabulary/docs/elements/`. Custom-element implementations (registration only) live in `packages/layer1-vocabulary/src/`.

## Next steps

1. Set up the `packages/layer1-vocabulary/` package structure in the monorepo.
2. Specify per-element attribute lists, with JATS as primary reference. This is the second draft.
3. Implement custom-element registration. Minimal JS.
4. Update `BUILD.md` to reflect the vocabulary as a deliverable and to add the third resolver plugin (notes, alongside citations and cross-refs).
5. Resume acadamark parser slices (4 and 5) with this vocabulary as the interpreter target.
