---
semantic_role: eqnarray
category: math
semantic_family: notation
html_output:
  element: eqnarray
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` is the vocabulary lookup key (must match the
    tagname). Handler emits `<eqnarray>` wrapper directly; the schema
    field is not consulted under `interpreter_strategy: handler`.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  notes: |
    Author writes pure environment body (each line `lhs & op & rhs`,
    terminated by `\\`). The handler wraps in
    `\begin{aligned}...\end{aligned}` before passing to KaTeX. KaTeX
    does not implement the LaTeX `eqnarray` environment standalone;
    `aligned` is the supported KaTeX equivalent and renders the same
    multi-line-equation visual output. `<eqnarray>` exists alongside
    `<align>` for LaTeX-source compatibility: an author copying
    `\begin{eqnarray}...\end{eqnarray}` source from a LaTeX document
    has a target enscribe tag whose name matches.
jats_counterpart:
  element: disp-formula
  notes: |
    JATS does not have a dedicated `<eqnarray>` element. Maps to JATS
    `<disp-formula>` with `<tex-math>` carrying the wrapped LaTeX
    source.
shorthand_examples:
  - source: |
      <eqnarray>
      f(x) &=& x^2 \\
      g(x) &=& 2x
      </eqnarray>
    layer1_html: |
      <eqnarray>(KaTeX-rendered HTML of \begin{aligned}...\end{aligned})</eqnarray>
    notes: |
      Two equations rendered via KaTeX's `aligned` env (the supported
      equivalent of LaTeX's `eqnarray`).
interpreter_strategy: handler
handler_module: ./handlers/math.js
handler_responsibilities:
  - Read the opaque content as LaTeX math-environment body.
  - Wrap in `\begin{aligned}...\end{aligned}` (KaTeX-supported equivalent
    of `eqnarray`).
  - Render via KaTeX with `displayMode: true`.
  - Emit an `<eqnarray>` wrapper element containing KaTeX's HTML output.
  - Apply id / classes from the node.
---

# `<eqnarray>`

A LaTeX `eqnarray`-shaped math environment. Provided for LaTeX-source compatibility (authors pasting `\begin{eqnarray}...` from a LaTeX document have a matching tag). Handler renders via KaTeX's `aligned` env, the supported equivalent.

## Authoring

```
<eqnarray>
f(x) &=& x^2 \\
g(x) &=& 2x
</eqnarray>
```

The LaTeX `eqnarray` env uses three `&` columns (lhs, op, rhs); KaTeX's `aligned` accepts the same notation and renders equivalently.

For new enscribe documents, prefer `<align>` (the modern LaTeX convention) over `<eqnarray>` (legacy). Both produce the same visual output via the same KaTeX env.

## See also

- [`<align>`](align.md) — modern equivalent for aligned multi-line equations.
- [`<matrix>`](matrix.md), [`<cases>`](cases.md) — sibling math-environment tags.
