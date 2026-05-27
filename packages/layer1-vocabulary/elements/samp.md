---
semantic_role: samp
html_output:
  element: samp
  is_html_native: true
  default_attributes: {}
acadamark_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: prose
  becomes: children
  notes: |
    The sample output as text — typically a literal value, message,
    or short fragment a program would produce.
content_handler: default
jats_counterpart:
  element: '(no direct JATS counterpart; HTML-native)'
  notes: |
    JATS has no dedicated element for sample output. The exporter
    emits the content as inline text with no special JATS markup.
    The same situation as the other programming-related HTML-native
    inline elements (<kbd>, <var>, <output>); recorded honestly per
    the <lang> precedent.
shorthand_examples:
  - source: 'The command prints <samp | Hello, world!> to stdout.'
    layer1_html: '<p>The command prints <samp>Hello, world!</samp> to stdout.</p>'
    notes: |
      Sample output from a program. Browsers render <samp> in a
      monospace font by default, distinguishing it from surrounding
      prose.
  - source: 'Set <var | threshold> to <samp | 0.05>.'
    layer1_html: '<p>Set <var>threshold</var> to <samp>0.05</samp>.</p>'
    notes: |
      <samp> for the sample value paired with <var> for the variable
      name — the natural pair for documenting configuration in
      technical writing.
interpreter_strategy: schema
---

# `<samp>`

Sample output. HTML-native inline element for marking literal values, messages, or short fragments a program would produce. Common in technical writing and tutorials.

## Semantic intent

`<samp>` marks sample output — what a program prints, returns, or displays. Browsers render it in a monospace font by default. The conventional companion to `<var>` (variable name) and `<kbd>` (keyboard input) when documenting interactive behavior.

## Authoring

```
The command prints <samp | Hello, world!> to stdout.
```

## JATS mapping

**No direct JATS counterpart.** The exporter emits the content as inline text by default. Recorded honestly per the `<lang>` precedent.

## See also

- [`<var>`](var.md), [`<kbd>`](kbd.md), [`<output>`](output.md) — sibling programming-related inline elements.
- [`<inline-code>`](inline-code.md), [`<code-block>`](code-block.md) — for actual source code rather than output samples.
