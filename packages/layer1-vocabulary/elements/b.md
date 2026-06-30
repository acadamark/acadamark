---
semantic_role: b
category: inline-formatting
html_output:
  element: b
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-bold-type
      values: [keyword, product-name, lead, offset, other]
content:
  shape:
    contains: [inline]
  becomes: children
content_handler: default
jats_counterpart:
  element: bold
  attributes:
    toggle: 'no'
shorthand_examples:
  - source: 'The keyword <b type=keyword | recursion> is fundamental.'
    layer1_html: '<p>The keyword <b data-bold-type="keyword">recursion</b> is fundamental.</p>'
  - source: 'Use <b type=product-name | Acrobat> to read the file.'
    layer1_html: '<p>Use <b data-bold-type="product-name">Acrobat</b> to read the file.</p>'
interpreter_strategy: schema
---

# `<b>`

Bold styling without semantic importance. Used for stylistic offset of words or phrases that aren't more important than surrounding text but conventionally appear in bold.

## Semantic intent

`<b>` represents content that is stylistically distinct via bold styling without carrying additional importance. HTML5 redefined the element from its original "bold visual styling" role into a semantic role: stylistic offset.

Common cases:

- **Keywords**: technical terms or important concepts highlighted at first appearance.
- **Product names**: proper nouns for products being mentioned.
- **Lead-in text**: the opening words of a paragraph rendered bold by convention.
- **Other stylistic offset**: any case where bold is the conventional rendering without implying importance.

For content of greater importance or seriousness (warnings, critical claims, urgency), use `<strong>` instead.

## When to choose `<b>` vs `<strong>`

- `<strong>` says "this matters more." Screen readers may emphasize. The content has greater importance than surrounding text.
- `<b>` says "this is conventionally bold but isn't more important." Screen readers don't emphasize. The bold is typographic, not meaningful.

Most authors should default to `<strong>` (or markdown's `**bold**`) for ordinary importance and reach for `<b>` only when the bold-without-importance pattern applies.

## Authoring

`<b>` is reached for via the explicit form. Plain markdown's `**...**` produces `<strong>`, not `<b>`.

```
The keyword <b type=keyword | recursion> means a function calling itself.
```

## Attributes

`type` indicates the conventional reason for bold styling:

- `keyword` — technical terms highlighted at first appearance.
- `product-name` — proper nouns for products.
- `lead` — opening words of a paragraph styled distinctly.
- `offset` — generic stylistic offset.
- `other` — any other conventional bold use.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<b>` | `<bold toggle="no">` |

The `toggle="no"` indicates bold is asserted, not toggled relative to context.

## Render-mode lowering

`<b>` is HTML-native; no lowering needed.

## See also

- [`<strong>`](strong.md) — for semantic strong importance.
- [`<i>`](i.md) — analogous element for italic-without-emphasis.
