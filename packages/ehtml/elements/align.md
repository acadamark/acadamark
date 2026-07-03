---
semantic_role: align
category: math
semantic_family: notation
html_output:
  element: align
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` is the vocabulary lookup key (must match the
    tagname). Handler emits `<align>` wrapper directly; the schema
    field is not consulted under `interpreter_strategy: handler`.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  notes: |
    Author writes pure environment body (each line `lhs & rhs`,
    terminated by `\\`). The handler wraps in
    `\begin{aligned}...\end{aligned}` before passing to KaTeX. (KaTeX
    supports the `aligned` environment for inline-into-disp-mode
    contexts; the `align` LaTeX environment proper is a top-level
    document env that KaTeX does not support standalone. Using
    `aligned` inside KaTeX's displayMode produces the equivalent
    visual output.)
jats_counterpart:
  element: disp-formula
  notes: |
    JATS does not have a dedicated `<align>` element. The LaTeX math
    environment maps to JATS `<disp-formula>` with `<tex-math>`
    carrying the wrapped LaTeX source.
shorthand_examples:
  - source: |
      <align>
      x^2 + y^2 &= z^2 \\
      a + b &= c
      </align>
    layer1_html: |
      <align>(KaTeX-rendered HTML of \begin{aligned}...\end{aligned})</align>
    notes: |
      Two aligned equations. The `&` marks the alignment column (here,
      the `=` sign). Handler wraps in `\begin{aligned}...\end{aligned}`
      (KaTeX-compatible variant of LaTeX's `align`).
interpreter_strategy: handler
handler_module: ./handlers/math.js
handler_responsibilities:
  - Read the opaque content as LaTeX math-environment body.
  - Wrap in `\begin{aligned}...\end{aligned}` (KaTeX-supported variant).
  - Render via KaTeX with `displayMode: true`.
  - Emit an `<align>` wrapper element containing KaTeX's HTML output.
  - Apply id / classes from the node.
---

# `<align>`

A LaTeX `align`-shaped math environment for multi-line aligned equations. Handler uses KaTeX's `aligned` environment (the supported equivalent — KaTeX does not implement the top-level `align` env standalone).

## Authoring

```
<align>
x^2 + y^2 &= z^2 \\
a + b &= c
</align>
```

Each line is `lhs & rhs` separated by `&`; lines are terminated by `\\`. The `&` marks the alignment column (typically the `=` sign). Body is pure environment content; handler adds the `\begin{aligned}...\end{aligned}` wrapper.

## Why `aligned` under the hood

KaTeX supports `aligned` (an inline-into-disp-mode environment) but not the top-level LaTeX `align` (which is a document-level environment KaTeX's display-math context cannot host directly). The visual output is equivalent; the source author writes `<align>` and the handler picks the supported KaTeX env.

## See also

- [`<matrix>`](matrix.md), [`<cases>`](cases.md), [`<eqnarray>`](eqnarray.md) — sibling math-environment tags.
