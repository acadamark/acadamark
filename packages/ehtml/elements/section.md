---
semantic_role: section
category: sections
semantic_family: structural-scaffolding
html_output:
  element: section
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    sec-type:
      maps_to: data-sec-type
      values: [intro, methods, results, discussion, conclusion, supplementary, materials, references, other]
      notes: |
        Optional classification of the section's role. Maps to JATS sec-type
        attribute. Values match common JATS conventions for IMRaD-style papers.
    numbering-style:
      maps_to: data-numbering-style
      values: [arabic, roman, alpha, none]
      notes: 'Override the inherited numbering style for this section.'
  booleans:
    listed:
      maps_to: listed
      default: true
      notes: |
        Whether this section appears in the generated table of contents. On by
        default; -listed keeps the section OUT of the contents, regardless of
        toc-depth (#218). Display-only: the section still renders; it is only
        absent from the contents listing. The ToC is config-driven
        (<config toc=true>); see notes/specs/toc-and-numbering.md. The default
        (listed) renders no attribute; -listed renders the transparent
        listed="false" form (an opt-out records its deviation from the default).
    numbered:
      maps_to: numbered
      default: true
      notes: |
        Whether this section participates in heading numbering. On by default;
        -numbered puts the heading OUTSIDE the numbered sequence, regardless of
        number-depth (#218) — it gets no number AND does not advance the counter,
        so the next numbered sibling continues unbroken (the \\section* / Quarto
        .unnumbered behavior); its subtree carries no number either. Numbering is
        config-driven (<config number-sections=true>); see
        notes/specs/toc-and-numbering.md. The number stamp reads
        node.booleans.numbered === false in runSync; -numbered renders the
        transparent numbered="false" form (the default renders no attribute).
content:
  shape:
    - element: section-title
      required: false
      contains: [inline]
    - element: section-subtitle
      required: false
      contains: [inline]
    - element: body
      required: false
      contains: [block, section]
title_extraction: true
jats_counterpart:
  element: sec
  attributes:
    sec-type: from sec-type
  notes: |
    JATS uses recursive <sec> for all section depths. Enscribe uses named
    depth (<section>, <sub-section>, <sub-sub-section>) for explicit
    semantic clarity. The JATS exporter maps enscribe's depth ladder to
    nested <sec> elements.
shorthand_examples:
  - source: |
      <section | Introduction>
      The paper begins here.
    ehtml: |
      <section>
        <section-title>Introduction</section-title>
        <p>The paper begins here.</p>
      </section>
  - source: |
      <section #methods sec-type=methods | Methods>
      <section-subtitle | A description of our experimental approach>
      The methods used in this study were as follows.
    ehtml: |
      <section id="methods" data-sec-type="methods">
        <section-title>Methods</section-title>
        <section-subtitle>A description of our experimental approach</section-subtitle>
        <p>The methods used in this study were as follows.</p>
      </section>
  - source: |
      <section | Results>
      Results paragraph.

      <sub-section | Quantitative analysis>
      Sub-section content.

      <sub-section | Qualitative observations>
      Sub-section content.
    ehtml: |
      <section>
        <section-title>Results</section-title>
        <p>Results paragraph.</p>
        <sub-section>
          <sub-section-title>Quantitative analysis</sub-section-title>
          <p>Sub-section content.</p>
        </sub-section>
        <sub-section>
          <sub-section-title>Qualitative observations</sub-section-title>
          <p>Sub-section content.</p>
        </sub-section>
      </section>
interpreter_strategy: schema
related_plugins:
  - name: enscribeSectionNesting
    runs_before: enscribeInterpreter
    purpose: 'Phase 2 — implicit closing of peer sections. See notes/specs/pipeline.md for the full pipeline.'

---

# `<section>`

A section is a top-level division within an article body or a book-part body. Sections divide content into named regions — Introduction, Methods, Results, Discussion in an IMRaD paper; Origins, Modern Era, Decline in a historical chapter; whatever divisions the author chooses.

## Semantic intent

`<section>` is the canonical division within a document body. Use it for any major thematic break in the content. Compare:

- `<section>` — depth 1, top-level division within an article body or book-part body. This element.
- `<sub-section>` — depth 2, nested within a section.
- `<sub-sub-section>` — depth 3, nested within a sub-section.

The named-depth ladder is explicit. A reader sees `<section>` and knows it's a top-level division; sees `<sub-section>` and knows it's nested. No need to walk up the tree to determine depth.

## Title-after-pipe shorthand

The shorthand form puts the section title in the pipe content:

```
<section | Introduction>
The introduction begins here.
```

The pipe content becomes the children of `<section-title>` — verbatim, after recursive parsing. There is no first-line splitting. Body content (paragraphs, sub-sections, figures) follows the closing `>` and is assigned to the section by the implicit-closing structural plugin.

The explicit `<section-title>` and `<section-subtitle>` elements are available as alternate authoring forms.

## Implicit closing

Sections close implicitly when a peer-level section opens. This is the largest authoring affordance enscribe provides over raw HTML.

```
<section | Introduction>
First paragraph of introduction.

<section | Methods>
Methods paragraph.
```

The Methods section's opening implicitly closes the Introduction section. The author doesn't write `</section>`. The `enscribeSectionNesting` plugin handles this on the rehype tree, recognizing peer-level boundaries.

This works only at the same depth. A `<sub-section>` inside a `<section>` doesn't close the section because they're at different depths; the section continues until the next peer `<section>` or the end of its container.

## Structure within a section

A section contains:

- An optional `<section-title>` (supplied by title extraction from the pipe, or written explicitly).
- An optional `<section-subtitle>` (a secondary title; written explicitly).
- Body content: paragraphs, sub-sections, figures, asides, blockquotes, tables, lists.

The title and subtitle, if present, are the first children of the section. Body content follows.

## Attributes

`sec-type` indicates the section's role in the document. Used in scholarly publishing to classify sections by their function (intro, methods, results, etc.). Maps to JATS's `sec-type` attribute.

`numbering-style` overrides the inherited numbering style for this section and its descendants. Useful for sections that should number differently from the document default — for example, an appendix section using letters instead of numbers.

## JATS mapping

| enscribe eHTML | JATS |
|-------------------|------|
| `<section>` | `<sec>` |
| `<section-title>` | `<title>` (inside `<sec>`) |
| `<section-subtitle>` | `<subtitle>` (inside `<sec>`) |
| `sec-type` attribute | `sec-type` attribute |

JATS uses recursive `<sec>` for all section depths. Enscribe's named-depth ladder maps to nested `<sec>` elements at export time. A `<section>` containing a `<sub-section>` becomes a `<sec>` containing a `<sec>` (or `<sec sec-type="...">` if the type is specified).

## Authoring patterns

**Section with simple title and content.**

```
<section | Introduction>
The introduction begins here.
```

**Section with classification.**

```
<section sec-type=methods | Methods>
The methods used in this study.
```

The `sec-type` kwarg classifies the section for JATS export and for downstream tooling.

**Section with subtitle.**

```
<section | Materials>
<section-subtitle | Detailed listing of equipment used>
Body content.
```

The subtitle is written explicitly because the pipe slot is consumed by the title.

**Section with sub-sections.**

```
<section | Results>
Brief introductory paragraph.

<sub-section | Quantitative results>
Sub-section content.

<sub-section | Qualitative observations>
Sub-section content.
```

The `<section>` continues until a peer `<section>` opens or the parent container ends.

**Implicitly closed sections.**

```
<section | Introduction>
Introduction content.

<section | Methods>
Methods content. The introduction is implicitly closed.

<section | Results>
Results content. The methods section is implicitly closed.
```

No `</section>` tags needed. Each new section closes the previous one.

## Render-mode lowering

In semantic mode, `<section>`, `<section-title>`, and `<section-subtitle>` remain as eHTML elements.

In render mode:

| eHTML element | Render-mode lowering |
|----------------|----------------------|
| `<section>` | `<section>` (unchanged; HTML5 native) |
| `<section-title>` | `<h1>` (when at depth 1; depth determined by document structure) |
| `<section-subtitle>` | `<p class="subtitle">` |

When sections nest within articles, the heading levels shift. An article with `<article-title>` as `<h1>` makes `<section-title>` lower to `<h2>`. The render-mode plugin determines the level based on the document's structure.

## See also

- [`<sub-section>`](sub-section.md) — depth 2.
- [`<sub-sub-section>`](sub-sub-section.md) — depth 3.
- [`<article>`](article.md) — typical container for sections.
- [`<book-part>`](book-part.md) — also contains sections.
