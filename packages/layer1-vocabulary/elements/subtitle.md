---
semantic_role: subtitle
html_output:
  element: subtitle
  is_html_native: false
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: subtitle
  notes: |
    JATS uses <subtitle> inside <title-group> (for articles) or
    <book-title-group> (for books).
shorthand_examples:
  - source: |
      <meta>
        <title | The Effect of Elephants on Climate>
        <subtitle | A Multi-Year Field Study in Tanzania>
      </meta>
    layer1_html: |
      <article-front>
        <article-title>The Effect of Elephants on Climate</article-title>
        <article-subtitle>A Multi-Year Field Study in Tanzania</article-subtitle>
      </article-front>
interpreter_strategy: schema
---

# `<subtitle>` (in metadata context)

The document subtitle. Authored inside `<meta>` adjacent to `<title>`.

## Semantic intent

`<subtitle>` provides a secondary title that complements the main title. Common in scholarly publishing where the main title is descriptive ("Climate Change") and the subtitle adds specificity ("Evidence from Long-Term Forest Studies").

## Authoring

```
<meta>
  <title | The Effect of Elephants on Climate>
  <subtitle | A Multi-Year Field Study in Tanzania>
</meta>
```

The subtitle is always written inside `<meta>` adjacent to `<title>`. There is no shorthand on the container element for subtitles (unlike titles, which have the container-pipe shorthand).

## Promotion to Layer 1

Like `<title>`, `<subtitle>` is promoted to a Layer 1 element based on the surrounding container:

| Surrounding container | Promotion target |
|----------------------|------------------|
| `<article>` | `<article-subtitle>` |
| `<book>` | `<book-subtitle>` |

## Content

Prose, parsed recursively. Inline elements work normally.

## JATS mapping

| Layer 1 (after promotion) | JATS |
|---------------------------|------|
| `<article-subtitle>` | `<subtitle>` (inside `<title-group>`) |
| `<book-subtitle>` | `<subtitle>` (inside `<book-title-group>`) |

## Render-mode lowering

In render mode, the subtitle appears with the title in the article header or title page. The `<head>` `<title>` (browser tab) typically uses just the main title, not the subtitle.

## See also

- [`<title>`](title.md) — the main title element.
- [`<meta>`](meta.md) — the metadata wrapper.
