---
semantic_role: em
category: inline-formatting
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
content_handler: default
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
    layer1_html: '<p>This has <i>emphasized</i> content.</p>'
    notes: |
      Plain markdown emphasis with single asterisks (or single underscores)
      produces <em> elements. This is the most common authoring path.
  - source: '<em | emphasized>'
    layer1_html: '<em>emphasized</em>'
    notes: |
      The explicit form is reached for when attributes are needed.
  - source: '<em #key-term .highlighted | distinguishing feature>'
    layer1_html: '<em id="key-term" class="highlighted">distinguishing feature</em>'
interpreter_strategy: schema
---

# `<em>`

Emphasis. The semantic element for stressed words or phrases — content the author wants the reader to notice as carrying particular weight in the surrounding sentence.

## Semantic intent

`<em>` represents semantic emphasis, not merely visual italics. The default rendering is italic, but the meaning is "this text carries emphasis." Screen readers may pronounce emphasized text with vocal stress; some accessibility tools surface emphasis distinctly.

For purely visual italic styling without semantic emphasis (foreign words, biological taxa, technical terms), use `<i>` instead. The HTML5 spec distinguishes the two; enscribe follows.

## Authoring

**Plain markdown (most common).**

```
This is *emphasized* content.
```

Single asterisks (or single underscores) around content produce `<em>` via remark. No explicit enscribe tags needed.

**Explicit form.**

```
<em | emphasized text>
```

Used when attributes are needed.

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
