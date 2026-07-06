---
semantic_role: strong
category: inline-formatting
semantic_family: emphasis-and-marking
html_output:
  element: strong
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  shape:
    contains: [inline]
  becomes: children
jats_counterpart:
  element: bold
  attributes:
    toggle: 'yes'
shorthand_examples:
  - source: 'This is **strongly emphasized** content.'
    ehtml: '<p>This is <b>strongly emphasized</b> content.</p>'
    notes: |
      Plain markdown with double asterisks (or double underscores) produces the
      visual <b>, not the semantic <strong> — markdown emphasis maps to the
      visual tag. <strong> is reached only by the explicit form.
  - source: '<strong | important>'
    ehtml: '<strong>important</strong>'
  - source: '<strong #critical .warning | This is critical.>'
    ehtml: '<strong id="critical" class="warning">This is critical.</strong>'
interpreter_strategy: schema
---

# `<strong>`

Strong emphasis. The semantic element for content of greater importance, seriousness, or urgency than ordinary emphasis.

## Semantic intent

`<strong>` represents content with strong importance — words or phrases the reader should treat as carrying greater weight than surrounding emphasized text. The default rendering is bold, but the meaning is "this text matters more."

For purely visual bold styling without semantic importance (keywords, product names, stylistic offset), use `<b>` instead.

## Authoring

`<strong>` is authored via the explicit form — plain markdown does not produce it.

```
<strong | content>
```

Plain markdown's `**...**` produces the visual [`<b>`](b.md), **not** `<strong>`: markdown emphasis maps to the visual tag, and the semantic importance element is reached only by writing `<strong>` explicitly.

## Content

`<strong>` contains prose, parsed recursively like any prose-bearing element.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<strong>` | `<bold toggle="yes">` |

The `toggle="yes"` attribute means bold state toggles relative to surrounding text.

## Render-mode lowering

`<strong>` is HTML-native; no lowering needed.

## See also

- [`<b>`](b.md) — for purely visual bold styling.
- [`<em>`](em.md) — for ordinary emphasis (italic by default).
