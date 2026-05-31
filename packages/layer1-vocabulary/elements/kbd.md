---
semantic_role: kbd
html_output:
  element: kbd
  is_html_native: true
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: prose
  becomes: children
  notes: |
    The keyboard input as text — typically a single key, a chord
    (Ctrl+C), or a short sequence. Inline elements within <kbd> are
    permitted but unusual; nested <kbd> is the conventional way to
    distinguish individual keys in a chord.
content_handler: default
jats_counterpart:
  element: '(no direct JATS counterpart; HTML-native)'
  notes: |
    JATS has no dedicated element for keyboard input — the closest
    is <named-content content-type="..."> with a chosen content-type,
    or simply emitting the text as inline prose. The exporter chooses
    per the target schema variant; the default is to emit the kbd
    content as inline text with no special JATS markup. This is a
    conscious tradeoff: <kbd> is a presentation concern for technical
    documentation, not a scholarly-content concern JATS models.
shorthand_examples:
  - source: 'Press <kbd | Ctrl+C> to copy.'
    layer1_html: '<p>Press <kbd>Ctrl+C</kbd> to copy.</p>'
    notes: |
      Single chord as a kbd block. Browsers render <kbd> in a
      monospace font by default, distinguishing it from surrounding
      prose.
  - source: 'Press <kbd | <kbd | Ctrl>+<kbd | C>> to copy.'
    layer1_html: '<p>Press <kbd><kbd>Ctrl</kbd>+<kbd>C</kbd></kbd> to copy.</p>'
    notes: |
      Nested <kbd> distinguishes individual keys in a chord. Browsers
      render the outer block as the chord and the inner blocks as
      individual keys, both monospace.
interpreter_strategy: schema
---

# `<kbd>`

Keyboard input. HTML-native inline element for marking keys, chords, or sequences typed by the user. Common in technical documentation and tutorials.

## Semantic intent

`<kbd>` marks text that the reader is expected to type or press on a keyboard. Browsers render it in a monospace font by default to distinguish it visually from surrounding prose.

Nested `<kbd>` is the conventional pattern for distinguishing individual keys in a chord:

```
Press <kbd | <kbd | Ctrl>+<kbd | C>> to copy.
```

The outer block is the chord; the inner blocks are individual keys.

## Authoring

```
Press <kbd | Ctrl+C> to copy.
```

## JATS mapping

**No direct JATS counterpart.** `<kbd>` is a presentation concern for technical documentation, not a scholarly-content concern JATS models. The JATS exporter emits the content as inline text by default; consumers needing a specific JATS markup pattern can override via the exporter's content-type configuration.

This is the same situation as `<lang>` — recorded honestly per the precedent set by that entry.

## See also

- [`<var>`](var.md), [`<samp>`](samp.md), [`<output>`](output.md) — sibling programming-related inline elements (same HTML-native, no-JATS-counterpart situation).
- [`<inline-code>`](inline-code.md) — for inline code (e.g. function names, variable values) — semantically distinct from keyboard input.
