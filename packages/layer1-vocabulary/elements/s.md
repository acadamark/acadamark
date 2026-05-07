---
semantic_role: s
html_output:
  element: s
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    type:
      maps_to: data-strikethrough-type
      values: [outdated, retracted, deleted, other]
content:
  type: prose
  becomes: children
content_handler: default
title_after_pipe: false
jats_counterpart:
  element: strike
  notes: |
    JATS uses <strike> for strikethrough text.
shorthand_examples:
  - source: 'The price is ~~$50~~ now $40.'
    layer1_html: '<p>The price is <s>$50</s> now $40.</p>'
    notes: |
      GFM's tilde syntax produces <s> elements. The most common
      authoring path for casual strikethrough.
  - source: 'The claim <s type=retracted | was unsupported> has been corrected.'
    layer1_html: '<p>The claim <s data-strikethrough-type="retracted">was unsupported</s> has been corrected.</p>'
interpreter_strategy: schema
---

# `<s>`

Strikethrough styling for content that is no longer relevant or accurate. Used for outdated information that hasn't been removed, retracted statements, or deleted content preserved with annotation.

## Semantic intent

`<s>` represents content that "is no longer relevant or accurate" per HTML5. The default rendering is strikethrough text, which visually indicates the content has been struck out while remaining readable.

For corrections in editorial workflows where the previous version should be visible alongside the new version, use `<del>` (deleted) and `<ins>` (inserted) instead. `<s>` is for content that is preserved but marked as outdated.

## Common cases

- **Outdated prices, dates, or values**: showing both old and new.
- **Retracted statements**: claims that have been disclaimed but preserved for transparency.
- **Deleted text in editorial contexts**: text the editor wants to remove but preserve as a strike.

For purely visual strikethrough without these specific meanings, the element is still appropriate — HTML doesn't have a stricter alternative.

## Authoring

**GFM tilde syntax (most common).**

```
The price is ~~$50~~ now $40.
```

GitHub-Flavored Markdown's double-tilde syntax produces `<s>` via remark-gfm.

**Explicit form.**

```
The claim <s type=retracted | was unsupported> has been corrected.
```

Used when attributes (id, class, type) are needed.

## Attributes

`type` indicates the reason for strikethrough:

- `outdated` — content no longer current (old prices, old dates).
- `retracted` — claims that have been retracted but preserved.
- `deleted` — content the editor has marked as deleted but preserved.
- `other` — any other strikethrough use.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<s>` | `<strike>` |

## Render-mode lowering

`<s>` is HTML-native; no lowering needed.

## See also

- [`<del>`](del.md) — for deleted text in editorial workflows.
- [`<ins>`](ins.md) — for inserted text in editorial workflows.
- GFM markdown's `~~...~~` syntax — the natural shortcut for casual strikethrough.
