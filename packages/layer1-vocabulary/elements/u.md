---
semantic_role: u
html_output:
  element: u
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-underline-type
      values: [misspelling, proper-name, editorial-correction, other]
content:
  type: prose
  becomes: children
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: underline
  notes: |
    JATS uses <underline> for underlined text. The element exists but
    is rarely used in scholarly publishing because underline conventionally
    indicates hyperlinks in modern web rendering.
shorthand_examples:
  - source: 'The author wrote <u type=misspelling | recieve> in the original.'
    layer1_html: '<p>The author wrote <u data-underline-type="misspelling">recieve</u> in the original.</p>'
  - source: 'The Chinese name <u type=proper-name | 王明> appears here.'
    layer1_html: '<p>The Chinese name <u data-underline-type="proper-name">王明</u> appears here.</p>'
interpreter_strategy: schema
---

# `<u>`

Underline styling for content that is unarticulated but explicitly rendered with an underline. Rarely used in modern web content because underline conventionally indicates hyperlinks.

## Semantic intent

`<u>` represents content that is rendered with an underline for a specific reason: marking a misspelling, indicating a Chinese proper name (a typographic convention), or noting an editorial correction. HTML5's redefinition of `<u>` is "unarticulated, though explicitly rendered" — text that has a non-textual annotation.

In modern web rendering, underline conventionally indicates a hyperlink. Using `<u>` on non-link content can confuse readers. Most acadamark documents won't need `<u>`.

## When `<u>` is appropriate

The legitimate uses are narrow:

- **Marking misspellings** in pedagogical or editorial contexts: `<u type=misspelling | recieve>` to flag the original error.
- **Chinese proper names**: a typographic convention in some publishing traditions.
- **Editorial corrections**: marking text that has been corrected in a scholarly edition.

For most other purposes, alternatives are better:

- For visual emphasis, use `<em>` or `<strong>`.
- For corrections in collaborative editing, use `<ins>` and `<del>`.
- For stylistic offset, use `<b>` or `<i>`.

## Authoring

`<u>` is reached for via the explicit form. There is no plain markdown shortcut for underline.

```
The author wrote <u type=misspelling | recieve> in the original.
```

## Attributes

`type` indicates the reason for underlining:

- `misspelling` — original spelling preserved with annotation.
- `proper-name` — Chinese proper name (typographic convention).
- `editorial-correction` — editor's correction in a scholarly edition.
- `other` — any other unarticulated annotation.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<u>` | `<underline>` |

## Render-mode lowering

`<u>` is HTML-native; no lowering needed. The `data-underline-type` attribute is preserved for stylesheet targeting.

## See also

- [`<em>`](em.md) — for semantic emphasis (preferred for most purposes).
- [`<strong>`](strong.md) — for strong importance.
- [`<ins>`](ins.md) — for inserted text in editorial contexts.
- [`<del>`](del.md) — for deleted text.
