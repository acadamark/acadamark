---
semantic_role: em
category: inline-formatting
semantic_family: emphasis-and-marking
html_output:
  element: em
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
  element: italic
  attributes:
    toggle: 'yes'
  notes: |
    JATS uses <italic> for emphasized text. The toggle attribute controls
    whether the italic state is asserted or toggled relative to surrounding
    text (inheritance behavior).
shorthand_examples:
  - source: 'This has *emphasized* content.'
    ehtml: '<p>This has <i>emphasized</i> content.</p>'
    notes: |
      Plain markdown with single asterisks (or single underscores) produces the
      visual <i>, not the semantic <em> — markdown emphasis maps to the visual
      tag. <em> is reached only by the explicit form.
  - source: '<em | emphasized>'
    ehtml: '<em>emphasized</em>'
    notes: |
      The explicit form is reached for when attributes are needed.
  - source: '<em #key-term .highlighted | distinguishing feature>'
    ehtml: '<em id="key-term" class="highlighted">distinguishing feature</em>'
interpreter_strategy: schema
---

# `<em>`

Emphasis. The semantic element for stressed words or phrases — content the author wants the reader to notice as carrying particular weight in the surrounding sentence.

## Semantic intent

`<em>` represents semantic emphasis, not merely visual italics. The default rendering is italic, but the meaning is "this text carries emphasis." Screen readers may pronounce emphasized text with vocal stress; some accessibility tools surface emphasis distinctly.

For purely visual italic styling without semantic emphasis (foreign words, biological taxa, technical terms), use `<i>` instead. The HTML5 spec distinguishes the two; enscribe follows.

## Authoring

`<em>` is authored via the explicit form — plain markdown does not produce it.

```
<em | emphasized text>
```

Plain markdown's `*...*` produces the visual [`<i>`](i.md), **not** `<em>`: markdown emphasis maps to the visual tag, and the semantic emphasis element is reached only by writing `<em>` explicitly.

## Content

`<em>` contains prose. Inline elements work normally; the recursive parsing pass handles content as it does for any prose-bearing element.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<em>` | `<italic toggle="yes">` |

The `toggle="yes"` attribute means the italic state toggles relative to surrounding text — emphasized text inside an italic context becomes upright, and vice versa. This matches `<em>`'s semantic role: stress relative to context.

## Render-mode lowering

`<em>` is HTML-native; no lowering needed.

## See also

- [`<i>`](i.md) — for purely visual italic styling without semantic emphasis.
- [`<strong>`](strong.md) — for stronger emphasis (bold by default).
