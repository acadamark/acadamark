---
semantic_role: blockquote
category: block-prose
semantic_family: quotation-and-sourcing
html_output:
  element: blockquote
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    cite:
      maps_to: cite
      notes: |
        URL of the source being quoted. Maps to HTML's standard cite
        attribute on <blockquote>. For inline citation references
        (citing a bibliography entry), use a <cite> element inside the
        blockquote instead.
    type:
      maps_to: data-blockquote-type
      values: [verse, dialogue, epigraph, pullquote, other]
      notes: |
        Optional classification of the quotation's role. Affects styling
        and may affect JATS export.
content:
  shape:
    contains: [block]
  becomes: children
jats_counterpart:
  element: 'disp-quote or epigraph'
  notes: |
    JATS uses <disp-quote> for displayed quotations in the main flow and
    <epigraph> for opening epigraphs. The exporter dispatches based on type:
    type=epigraph maps to <epigraph>; everything else to <disp-quote>.
shorthand_expansions:
  - shorthand: quote
    expands_to: blockquote
    notes: |
      Authoring shortcut. <quote> is the preferred authoring form;
      <blockquote> is the Layer 1 element. The shorthand expands at
      the interpreter; the rendered HTML uses HTML's native <blockquote>.
shorthand_examples:
  - source: '<quote | A short quotation.>'
    ehtml: '<blockquote><p>A short quotation.</p></blockquote>'
    notes: |
      The <quote> shorthand expands to <blockquote> at Layer 1.
  - source: |
      <quote cite=https://example.com/source |
      A longer quotation that may contain multiple paragraphs.

      The second paragraph of the quotation.
      >
    ehtml: |
      <blockquote cite="https://example.com/source">
        <p>A longer quotation that may contain multiple paragraphs.</p>
        <p>The second paragraph of the quotation.</p>
      </blockquote>
  - source: |
      <quote type=epigraph |
      All happy families are alike; each unhappy family is unhappy in its own way.
      >
    ehtml: |
      <blockquote data-blockquote-type="epigraph">
        <p>All happy families are alike; each unhappy family is unhappy in its own way.</p>
      </blockquote>
  - source: '<blockquote | Same as `<quote>` but using the explicit Layer 1 name.>'
    ehtml: '<blockquote><p>Same as <code>&#x3C;quote></code> but using the explicit Layer 1 name.</p></blockquote>'
    notes: |
      Authors can also write <blockquote> directly. Both forms produce
      the same Layer 1 output.
interpreter_strategy: schema
---

# `<blockquote>` (authored as `<quote>`)

A blockquote represents an extended quotation set apart from the main text. Block-level quoted material — multiple sentences, paragraphs, or longer passages from another source.

The preferred authoring form is `<quote>`, a shorthand that expands to `<blockquote>` at Layer 1.

## Semantic intent

Use `<quote>` (or the explicit `<blockquote>`) for substantial quotations that deserve visual separation from the main flow. Brief inline quotations should use `<q>` (HTML's inline quotation element) or just regular punctuation. The element is HTML-native and matches HTML5's semantic intent.

The `cite` kwarg points at the source URL when one is available — typically a web page, a digital edition, or a permalink. For citations to a bibliography entry, use a `<cite>` element inside the blockquote.

The `type` kwarg classifies the quotation's role. Different quotation types render differently and may map to different JATS elements at export.

## The `<quote>` shorthand

The `<quote>` authoring form is preferred over `<blockquote>` because it's shorter, more familiar, and parallel to the inline `<q>` element. The shorthand expands at the interpreter; Layer 1 uses HTML's native `<blockquote>`.

This pattern matches how `<chapter>`, `<part>`, and `<appendix>` are shorthand expansions for `<book-part>` with type discrimination — the authoring layer prioritizes readable names while Layer 1 stays HTML-aligned.

Authors can write either form. Both produce identical Layer 1 output:

```
<quote | A short quotation.>
```

is equivalent to:

```
<blockquote | A short quotation.>
```

## Content

Blockquotes contain prose. Multi-paragraph blockquotes get their paragraphs structured automatically (each paragraph becomes a `<p>` child of the blockquote).

Blockquotes can contain inline elements (emphasis, citations, references), nested enscribe constructs, and markdown idioms. They can also contain attribution as a separate paragraph or as a `<cite>` element.

## Attributes

`cite` is HTML's standard attribute for the source URL of the quotation.

`type` indicates the quotation's role:

- `verse` — poetry or verse where line breaks are meaningful.
- `dialogue` — quoted dialogue, typically with speaker attribution.
- `epigraph` — quotation at the beginning of a work or chapter, setting tone.
- `pullquote` — emphasized quotation pulled from the surrounding text for visual effect.
- `other` — anything not covered above.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<blockquote>` (no type) | `<disp-quote>` |
| `<blockquote type=epigraph>` | `<epigraph>` |
| `<blockquote type=verse>` | `<disp-quote content-type="verse">` |
| `<blockquote type=dialogue>` | `<disp-quote content-type="dialogue">` |
| `<blockquote type=pullquote>` | `<disp-quote content-type="pullquote">` |
| `cite` attribute | `xlink:href` on the JATS element |

## Authoring patterns

**Simple quotation.**

```
<quote | A short quotation.>
```

**Multi-paragraph quotation with source.**

```
<quote cite=https://example.com/source |
The first paragraph.

The second paragraph.
>
```

**Epigraph at the start of a chapter.**

```
<chapter | The Beginning>

<quote type=epigraph |
"It was the best of times, it was the worst of times..."
— Charles Dickens
>

Chapter content begins here.
```

**Quotation with citation.**

```
<quote |
The quoted text appears here.

<cite jones2024>
>
```

The `<cite>` element provides a citation reference; the surrounding quote provides the visual treatment.

## Render-mode lowering

`<blockquote>` is HTML-native and doesn't need lowering. Attributes are preserved.

## See also

- [`<aside>`](aside.md) — tangential content (different semantic role).
- [`<cite>`](cite.md) — for citation references inside or alongside a quotation.
- [`<q>`](q.md) — for inline quotations (HTML-native).
