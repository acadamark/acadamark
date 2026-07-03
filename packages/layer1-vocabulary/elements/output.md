---
semantic_role: output
category: inline-formatting
semantic_family: emphasis-and-marking
html_output:
  element: output
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
    The result of a calculation as text — typically a single value
    or short result fragment.
jats_counterpart:
  element: '(no direct JATS counterpart; HTML-native)'
  notes: |
    JATS has no dedicated element for calculation results. The
    exporter emits the content as inline text with no special JATS
    markup. The same situation as the other programming-related
    HTML-native inline elements (<kbd>, <var>, <samp>); recorded
    honestly per the <lang>  precedent.
shorthand_examples:
  - source: 'The function returns <output | 42> for the test input.'
    layer1_html: '<p>The function returns <output>42</output> for the test input.</p>'
    notes: |
      Result of a calculation in prose. <output> is semantically
      distinct from <samp> — <samp> is what a program prints (a
      display artifact); <output> is the result of a computation
      (a semantic value). Browsers render both similarly.
interpreter_strategy: schema
---

# `<output>`

The result of a calculation. HTML-native inline element. Semantically distinct from `<samp>` (sample program output): `<output>` is the computed *value* itself; `<samp>` is the *display artifact*. Both render similarly by default.

## Semantic intent

`<output>` marks a computed result in prose. The HTML5 specification treats `<output>` as a form-output element with form-control semantics; in technical prose, the lighter "this is a computed value" reading is what enscribe adopts. The distinction from `<samp>` is fine but real:

- `<samp>` — *the program printed `Hello, world!`*. A display artifact.
- `<output>` — *the function returned `42`*. A computed value.

In practice many documents use either consistently and the distinction matters more to indexers and accessibility tools than to readers.

## Authoring

```
The function returns <output | 42> for the test input.
```

## JATS mapping

**No direct JATS counterpart.** The exporter emits the content as inline text by default. Recorded honestly per the `<lang>` precedent.

## See also

- [`<samp>`](samp.md) — for *sample program output* (the display artifact, not the computed value).
- [`<var>`](var.md), [`<kbd>`](kbd.md) — sibling programming-related inline elements.
