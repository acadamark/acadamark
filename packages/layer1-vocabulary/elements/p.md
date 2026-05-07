---
semantic_role: paragraph
html_output:
  element: p
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-paragraph-type
      values: [normal, lead, intro, abstract, summary, other]
      notes: |
        Optional classification of the paragraph's role. Mostly used for
        styling (lead paragraphs render larger; abstract paragraphs styled
        distinctly).
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: p
  notes: |
    Direct mapping to JATS <p>. JATS does not have paragraph type
    classifications natively; the data-paragraph-type attribute is
    preserved as an HTML data attribute but does not appear in JATS export.
shorthand_examples:
  - source: '<p | A simple paragraph.>'
    layer1_html: '<p>A simple paragraph.</p>'
  - source: 'A paragraph written without explicit tags.'
    layer1_html: '<p>A paragraph written without explicit tags.</p>'
    notes: |
      In most cases, paragraphs do not need to be written with explicit
      tags. Plain markdown handles paragraph separation: blank lines
      delineate paragraphs. The explicit <p> form is used when attributes
      (id, classes, type) are needed.
  - source: '<p type=lead | The opening paragraph of an article.>'
    layer1_html: '<p data-paragraph-type="lead">The opening paragraph of an article.</p>'
interpreter_strategy: schema
---

# `<p>`

A paragraph represents a unit of prose at the block level. The most common content element in any document.

## Semantic intent

Most paragraphs are written without explicit tags. Plain text separated by blank lines becomes paragraphs through standard markdown parsing — this is the simplest, most natural authoring path. The explicit `<p>` form is reached for only when attributes are needed: an id for cross-referencing, classes for styling, or a type kwarg for classification.

## When to use the explicit form

Most authoring uses implicit paragraphs:

```
First paragraph of text.

Second paragraph of text.
```

Both become `<p>` elements without any explicit `<p>` tag. The blank line is the paragraph separator (standard markdown).

The explicit `<p>` form is reached for in these cases:

**Need an id for cross-referencing.**

```
<p #key-finding | This is the key finding of the paper.>
```

**Need a class for styling.**

```
<p .lede | The article's opening paragraph.>
```

**Need to classify the paragraph's role.**

```
<p type=abstract | This is the article's abstract.>
```

## Content

Paragraphs contain prose. Like other prose-bearing elements, content is recursively parsed: emphasis, citations, cross-references, and inline acadamark constructs all work normally.

A paragraph cannot contain block-level elements (other paragraphs, sections, asides, blockquotes). Block-level content needs to be at the document/section level, not nested inside a paragraph.

## Attributes

`type` indicates the paragraph's role:

- `normal` — regular paragraph (default; usually omitted).
- `lead` — opening paragraph rendered with distinct styling.
- `intro` — introductory paragraph (similar to lead but in non-article contexts).
- `abstract` — the article's abstract paragraph.
- `summary` — a summary paragraph at the end of a section.
- `other` — anything not covered above.

The classification is informational. The `<p>` element renders the same way regardless of type unless CSS rules target the specific data attribute.

## JATS mapping

Direct mapping to JATS `<p>`. The element name and standard attributes (id, class) preserve. The `data-paragraph-type` attribute is acadamark-specific and not exported to JATS.

| acadamark | JATS |
|-----------|------|
| `<p>` | `<p>` |

## Authoring patterns

**Implicit paragraphs (the common case).**

```
First paragraph.

Second paragraph.

Third paragraph.
```

**Explicit paragraph with id.**

```
<p #key-claim | This is the key claim that the paper rests on.>

The next paragraph follows normally.
```

**Lead paragraph in an article.**

```
<article | The Effect of Elephants on Climate>
<meta>
  <author | Jane Goodall>
</meta>

<p type=lead | This article presents new evidence that elephant
populations significantly affect regional climate patterns.>

The remainder of the article follows.
```

**Paragraph with multiple attribute types.**

```
<p #abstract type=abstract .scholarly | The abstract content here.>
```

## Render-mode lowering

`<p>` is HTML-native and doesn't need lowering.

## See also

- Plain markdown paragraphs are typically preferred over explicit `<p>` tags.
- [`<blockquote>`](blockquote.md) — for paragraph-level quoted content.
- [`<aside>`](aside.md) — for paragraph-level tangential content.
