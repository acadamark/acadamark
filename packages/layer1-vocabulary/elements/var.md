---
semantic_role: var
category: inline-formatting
html_output:
  element: var
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
  notes: |
    The variable name as text — typically a single short identifier
    (x, n, foo, threshold). Inline elements within <var> are permitted
    but unusual.
jats_counterpart:
  element: '(no direct JATS counterpart; HTML-native)'
  notes: |
    JATS has no dedicated element for variable names in prose — for
    mathematical variables, the typical JATS pattern is to use <italic>
    or to embed in <mml:math> for proper mathematics markup. For
    programming-language variable references, the exporter emits the
    content as inline text with no special JATS markup. This is a
    conscious tradeoff: <var> is an HTML / technical-prose convention,
    not a scholarly-content concern JATS models.
shorthand_examples:
  - source: 'The function takes a parameter <var | n> and returns <var | n>²+1.'
    layer1_html: '<p>The function takes a parameter <var>n</var> and returns <var>n</var>²+1.</p>'
    notes: |
      Variable names in prose. Browsers render <var> in italic by
      default, distinguishing it from surrounding prose.
  - source: 'Set <var | threshold> to <samp | 0.05>.'
    layer1_html: '<p>Set <var>threshold</var> to <samp>0.05</samp>.</p>'
    notes: |
      <var> for the variable name and <samp> for a sample value —
      the natural pair for documenting configuration in technical writing.
interpreter_strategy: schema
---

# `<var>`

A variable name. HTML-native inline element for marking variables — mathematical (`x`, `n`) or programming (`threshold`, `count`). Common in technical writing and documentation.

## Semantic intent

`<var>` marks a variable reference in prose. Browsers render it in italic by default. Two typical use cases:

- **Mathematical variables** in prose paragraphs — `the function f(x) = <var | x>² + 1`. (For full mathematical typesetting use math elements.)
- **Programming-language variables / configuration knobs** — `<var | threshold>` referenced in surrounding prose.

## Authoring

```
The function takes a parameter <var | n> and returns <var | n>²+1.
```

## JATS mapping

**No direct JATS counterpart.** For mathematical variables, the typical JATS pattern is `<italic>` or proper `<mml:math>` markup; for programming variables, JATS has no dedicated element. The exporter emits the content as inline text by default. Recorded honestly per the `<lang>` precedent.

## See also

- [`<samp>`](samp.md), [`<kbd>`](kbd.md), [`<output>`](output.md) — sibling programming-related inline elements (same HTML-native, no-JATS-counterpart situation).
- Math elements (`<inline-math>`, `<display-math>`) — for full mathematical typesetting.
