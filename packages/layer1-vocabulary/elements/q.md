---
semantic_role: q
category: inline-formatting
html_output:
  element: q
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
        URL of the source being quoted. Same as <blockquote>'s cite
        attribute but for inline quotations.
content:
  shape:
    contains: [inline]
  becomes: children
jats_counterpart:
  element: 'inline-quote or just text with quotation marks'
  notes: |
    JATS doesn't have a dedicated inline-quotation element. The exporter
    typically emits the quoted text wrapped in literal quotation marks
    (Unicode left/right double quotes) rather than a JATS element.
shorthand_examples:
  - source: 'She said <q | hello> in passing.'
    layer1_html: '<p>She said <q>hello</q> in passing.</p>'
    notes: |
      Browsers automatically render <q> with quotation marks. Authors
      do not include quotation marks in the content.
  - source: 'The phrase <q cite=https://example.com | to be or not to be> is iconic.'
    layer1_html: '<p>The phrase <q cite="https://example.com">to be or not to be</q> is iconic.</p>'
interpreter_strategy: schema
---

# `<q>`

Inline quotation. Short quoted material that flows within surrounding prose, distinct from block-level quoted passages (which use `<blockquote>`).

## Semantic intent

`<q>` represents a quotation embedded within a sentence or paragraph. The browser renders quotation marks automatically — authors do not type the quote characters. The element carries the semantic role "this is quoted material" rather than just visually displaying quotes.

For longer quoted passages displayed as separate blocks, use `<blockquote>` instead.

## Authoring

`<q>` is reached for via the explicit form. Plain markdown does not have a syntax for inline quotations — authors who want quoted text in prose typically just write the quotation marks themselves (`"text"`). The semantic `<q>` element is reached for when:

- The quotation needs an `id` for cross-referencing.
- The source URL should be recorded via `cite`.
- Browser-generated quotation marks (which adapt to language and nesting) are preferred.

```
She said <q | hello> in passing.
```

The browser renders this as: She said "hello" in passing — with the quote marks generated automatically.

## When to write quote marks vs. use `<q>`

For most casual quotations, just typing quote marks is fine:

```
She said "hello" in passing.
```

The result is functionally similar. Use `<q>` when you specifically want:

- Language-aware quotation marks (browsers adapt to the document language).
- Proper nesting of nested quotations (browsers alternate between styles automatically).
- Semantic markup for tooling that distinguishes quoted from unquoted text.
- Source attribution via the `cite` attribute.

## Attributes

`cite` provides the URL of the source being quoted. Optional but recommended when a source URL is available.

## JATS mapping

JATS has no direct equivalent for inline quotations. The exporter typically renders `<q>` as the quoted text wrapped in Unicode quotation marks (left/right double quotes) without a JATS element wrapper.

| enscribe | JATS |
|-----------|------|
| `<q>` | quoted text wrapped in `"..."` (Unicode) |
| `cite` attribute | not exported (no JATS equivalent for inline quote sources) |

This is one of several places enscribe Layer 1 doesn't fully round-trip to JATS.

## Render-mode lowering

`<q>` is HTML-native; no lowering needed. Browser rendering handles the quotation marks.

## See also

- [`<blockquote>`](blockquote.md) — for block-level quoted passages.
- [`<cite>`](cite.md) — for citations to bibliography entries (different semantic role).
