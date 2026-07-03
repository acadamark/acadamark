---
semantic_role: sub-section
category: sections
semantic_family: structural-scaffolding
html_output:
  element: sub-section
  is_html_native: false
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
      notes: 'Same values as <section>. Optional classification of the sub-section role.'
    numbering-style:
      maps_to: data-numbering-style
      values: [arabic, roman, alpha, none]
  booleans:
    unlisted:
      maps_to: unlisted
      default: false
      notes: |
        Keep this sub-section out of the generated table of contents, regardless
        of toc-depth (#218). Display-only: it still renders; it is only absent
        from the contents listing. See notes/specs/toc-and-numbering.md. Authored
        as +unlisted; renders to the HTML attribute unlisted.
    unnumbered:
      maps_to: unnumbered
      default: false
      notes: |
        Skip this sub-section's number, regardless of number-depth (#218). Outside
        the numbered sequence — no number, no counter advance, subtree unnumbered;
        the next numbered sibling continues unbroken. See
        notes/specs/toc-and-numbering.md. Authored as +unnumbered.
content:
  shape:
    - element: sub-section-title
      required: false
      contains: [inline]
    - element: sub-section-subtitle
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
    JATS uses recursive <sec>; enscribe's <sub-section> becomes a nested
    <sec> at depth 2 inside its parent <sec>.
shorthand_examples:
  - source: |
      <sub-section | Quantitative analysis>
      Sub-section content.
    ehtml: |
      <sub-section>
        <sub-section-title>Quantitative analysis</sub-section-title>
        <p>Sub-section content.</p>
      </sub-section>
  - source: |
      <section | Results>
      <sub-section | Statistical methods>
      Sub-section content.

      <sub-sub-section | Regression analysis>
      Sub-sub-section content.

      <sub-section | Sensitivity analyses>
      Sub-section content.
    ehtml: |
      <section>
        <section-title>Results</section-title>
        <sub-section>
          <sub-section-title>Statistical methods</sub-section-title>
          <p>Sub-section content.</p>
          <sub-sub-section>
            <sub-sub-section-title>Regression analysis</sub-sub-section-title>
            <p>Sub-sub-section content.</p>
          </sub-sub-section>
        </sub-section>
        <sub-section>
          <sub-section-title>Sensitivity analyses</sub-section-title>
          <p>Sub-section content.</p>
        </sub-section>
      </section>
interpreter_strategy: schema
related_plugins:
  - name: enscribeSectionNesting
    runs_before: enscribeInterpreter
    purpose: 'Phase 2 — implicit closing of peer sub-sections. See notes/specs/pipeline.md for the full pipeline.'

---

# `<sub-section>`

A sub-section is a depth-2 division within a section. The middle level of enscribe's named-depth ladder.

## Semantic intent

Use `<sub-section>` to divide a `<section>` into named sub-regions. Most academic content stays at depth 1 or 2; sub-sub-sections (depth 3) are reserved for genuinely deep hierarchies.

The named-depth approach makes the structural role explicit. A reader sees `<sub-section>` and knows it's a depth-2 division without examining ancestors or counting nesting levels.

## Title-after-pipe shorthand

The shorthand form puts the sub-section title in the pipe content:

```
<sub-section | Statistical methods>
The methods used were as follows.
```

The pipe content becomes the children of `<sub-section-title>` — verbatim, after recursive parsing. Body content follows the closing `>` and is assigned by the structural plugin.

## Implicit closing

Sub-sections close implicitly when a peer-level sub-section opens within the same parent section. Same mechanism as `<section>` but at depth 2.

```
<section | Methods>

<sub-section | Data collection>
First sub-section content.

<sub-section | Analysis>
Second sub-section content. The first sub-section is implicitly closed.
```

A new `<section>` (depth 1) also closes any open sub-sections, because the parent section closes.

## Structure within a sub-section

A sub-section contains:

- An optional `<sub-section-title>` (supplied by title extraction from the pipe, or written explicitly).
- An optional `<sub-section-subtitle>` (written explicitly).
- Body content: paragraphs, sub-sub-sections, figures, asides, blockquotes, tables, lists.

## Attributes

`sec-type` and `numbering-style` work the same as for `<section>`.

## JATS mapping

`<sub-section>` maps to a JATS `<sec>` nested at depth 2 within its parent `<sec>`. The depth comes from the nesting structure, not from a separate attribute.

| enscribe Layer 1 | JATS |
|-------------------|------|
| `<sub-section>` | `<sec>` (nested at depth 2) |
| `<sub-section-title>` | `<title>` (inside the depth-2 `<sec>`) |
| `<sub-section-subtitle>` | `<subtitle>` |
| `sec-type` attribute | `sec-type` attribute |

## Authoring patterns

**Simple sub-section.**

```
<sub-section | Quantitative analysis>
Content.
```

**Sub-section with classification.**

```
<sub-section sec-type=methods | Statistical procedures>
Content.
```

**Sub-section containing sub-sub-sections.**

```
<sub-section | Statistical methods>
Brief introduction.

<sub-sub-section | Regression analysis>
Content.

<sub-sub-section | Sensitivity testing>
Content.
```

## Render-mode lowering

In semantic mode, `<sub-section>` and its title elements are preserved.

In render mode:

| Layer 1 element | Render-mode lowering |
|----------------|----------------------|
| `<sub-section>` | `<section>` (HTML5's recursive section element) |
| `<sub-section-title>` | `<h2>` (when within a `<section>` whose title is `<h1>`; level shifts based on document structure) |
| `<sub-section-subtitle>` | `<p class="subtitle">` |

The render-mode plugin determines heading levels based on the surrounding document. An article with article-title at `<h1>` makes section-title `<h2>` and sub-section-title `<h3>`.

## See also

- [`<section>`](section.md) — depth 1, the parent.
- [`<sub-sub-section>`](sub-sub-section.md) — depth 3, nested within sub-sections.
