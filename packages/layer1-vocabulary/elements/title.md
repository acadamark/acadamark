---
semantic_role: title
html_output:
  element: title
  is_html_native: false
  default_attributes: {}
  notes: |
    Acadamark's <title> inside <meta> is a custom element distinct from
    HTML's <title> (which goes in <head> and represents the browser tab title).
    The render-mode plugin maps acadamark's metadata <title> to HTML's
    <title> in the rendered <head>. The structural plugin promotes
    acadamark's metadata <title> to <article-title> or <book-title> at
    Layer 1 based on the surrounding container.
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: prose
  becomes: children
  notes: |
    The title text. Inline elements work normally: <em>, <strong>,
    <i> for foreign words, <math> for mathematical content in titles.
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: 'article-title or book-title (inside title-group inside article-meta or book-meta)'
  notes: |
    JATS represents document titles via <article-title> inside <title-group>
    inside <article-meta>, or via <book-title> inside <book-meta>. Acadamark's
    metadata <title> gets promoted to the appropriate JATS structure at
    export time based on the surrounding container.
shorthand_examples:
  - source: |
      <meta>
        <title | The Effect of Elephants on Climate>
      </meta>
    layer1_html: |
      <article-front>
        <article-title>The Effect of Elephants on Climate</article-title>
      </article-front>
    notes: |
      Inside <article>, <title> in <meta> becomes <article-title>.
  - source: |
      <book>
        <meta>
          <title | A Comprehensive Guide>
        </meta>
      </book>
    layer1_html: |
      <book-front>
        <book-title>A Comprehensive Guide</book-title>
      </book-front>
    notes: |
      Inside <book>, <title> in <meta> becomes <book-title>.
  - source: |
      <meta>
        <title | The role of <i type=taxonomic | Loxodonta africana> in ecosystem dynamics>
      </meta>
    layer1_html: |
      <article-front>
        <article-title>The role of <i data-italic-type="taxonomic">Loxodonta africana</i> in ecosystem dynamics</article-title>
      </article-front>
    notes: |
      Titles can contain inline elements. The recursive content parsing
      handles nested constructs.
interpreter_strategy: schema
---

# `<title>` (in metadata context)

The document title, when authored inside `<meta>`. Promoted to `<article-title>` or `<book-title>` at Layer 1 based on the surrounding container.

## Semantic intent

`<title>` inside `<meta>` is the structured form for specifying a document's title. It mirrors HTML's `<title>` (in `<head>`) and the YAML `title:` field in RMarkdown/Quarto frontmatter. The element is part of acadamark's structured metadata vocabulary.

This element is distinct from HTML's `<title>`, despite sharing a name. HTML's `<title>` sits in `<head>` and represents the browser tab text. Acadamark's `<title>` is a metadata field; the render-mode plugin maps it to HTML's `<title>` for browser rendering.

## Authoring

```
<meta>
  <title | The Document Title>
</meta>
```

The pipe content is the title text, parsed as prose. Inline elements work normally.

## Two paths to a title

The document title can also be supplied via the container shorthand:

```
<article | The Document Title>
```

Both paths produce identical Layer 1 output (`<article-title>` in `<article-front>`). See the `<meta>` entry for precedence rules and warning behavior when both are present.

## Promotion to Layer 1

The `acadamarkArticleStructuring` and `acadamarkBookStructuring` plugins promote `<title>` from `<meta>` to the appropriate Layer 1 element:

| Surrounding container | Promotion target |
|----------------------|------------------|
| `<article>` | `<article-title>` |
| `<book>` | `<book-title>` |
| `<book-part>` (chapter, etc.) | `<book-part-title>` (rare; chapters typically get titles via shorthand) |

This promotion is mechanical. The metadata authoring vocabulary stays uniform (`<title>` always); the Layer 1 vocabulary diverges to match each container's expected structure.

## Content

`<title>` content is prose. Inline elements work normally — emphasis, italics for foreign words or taxa, math for mathematical content in titles, citations, and so on.

## Attributes

`id` and `class` are supported for cross-referencing or styling, though title cross-references are unusual in practice.

## JATS mapping

| Layer 1 (after promotion) | JATS |
|---------------------------|------|
| `<article-title>` | `<article-title>` (inside `<title-group>` inside `<article-meta>`) |
| `<book-title>` | `<book-title>` (inside `<book-title-group>` inside `<book-meta>`) |

The JATS exporter handles the structural wrapping (`<title-group>`, `<book-title-group>`).

## Render-mode lowering

In render mode, the title appears in two places:

- HTML `<head>` `<title>` for the browser tab.
- Visually displayed in the article header or title page (rendered from `<article-title>` in `<article-front>`).

Both come from the same Layer 1 source.

## See also

- [`<meta>`](meta.md) — the metadata wrapper that holds `<title>`.
- [`<subtitle>`](subtitle.md) — companion element for subtitles.
- [`<article-title>`](article-title.md), [`<book-title>`](book-title.md) — Layer 1 elements (rarely authored directly).
- [`<article>`](article.md), [`<book>`](book.md) — containers whose shorthand can also supply a title.
