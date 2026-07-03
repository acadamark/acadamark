---
semantic_role: cases
category: math
semantic_family: notation
html_output:
  element: cases
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` is the vocabulary lookup key (must match the
    tagname). Handler emits `<cases>` wrapper directly; the schema
    field is not consulted under `interpreter_strategy: handler`.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  notes: |
    Author writes pure environment body (each case on its own line,
    terminated by `\\`, with `&` separating value from condition). The
    handler wraps in `\begin{cases}...\end{cases}` before passing to
    KaTeX.
jats_counterpart:
  element: disp-formula
  notes: |
    JATS does not have a dedicated `<cases>` element. The LaTeX math
    environment maps to JATS `<disp-formula>` with `<tex-math>`
    carrying the wrapped LaTeX source.
shorthand_examples:
  - source: |
      <cases>
      x^2 & \text{if } x \ge 0 \\
      -x^2 & \text{if } x < 0
      </cases>
    layer1_html: |
      <cases>(KaTeX-rendered HTML of \begin{cases}...\end{cases})</cases>
    notes: |
      A two-case piecewise definition. Handler wraps in
      `\begin{cases}...\end{cases}`.
interpreter_strategy: handler
handler_module: ./handlers/math.js
handler_responsibilities:
  - Read the opaque content as LaTeX math-environment body.
  - Wrap in `\begin{cases}...\end{cases}`.
  - Render via KaTeX with `displayMode: true`.
  - Emit a `<cases>` wrapper element containing KaTeX's HTML output.
  - Apply id / classes from the node.
---

# `<cases>`

A LaTeX `cases` math environment for piecewise definitions.

## Authoring

```
<cases>
x^2 & \text{if } x \ge 0 \\
-x^2 & \text{if } x < 0
</cases>
```

Each case is `value & condition` separated by `&`; cases are terminated by `\\`. Body is pure environment content; handler adds the wrapper.

## See also

- [`<matrix>`](matrix.md), [`<align>`](align.md), [`<eqnarray>`](eqnarray.md) — sibling math-environment tags.
