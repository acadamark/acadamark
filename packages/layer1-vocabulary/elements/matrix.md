---
semantic_role: matrix
html_output:
  element: matrix
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` is the vocabulary lookup key (must match the
    tagname). Handler emits `<matrix>` wrapper directly; the schema
    field is not consulted under `interpreter_strategy: handler`.
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: opaque
  notes: |
    Author writes pure environment body (rows separated by `\\`, cells
    separated by `&`). The handler wraps in `\begin{matrix}...\end{matrix}`
    before passing to KaTeX (wrap-inside convention; see DESIGN.md and
    an earlier STATUS milestone).
content_handler: matrix
jats_counterpart:
  element: disp-formula
  notes: |
    JATS does not have a dedicated `<matrix>` element. The LaTeX math
    environment (after the handler wraps it) maps to JATS
    `<disp-formula>` with `<tex-math>` carrying the wrapped LaTeX
    source. The exporter decides whether to also emit MathML.
shorthand_examples:
  - source: |
      <matrix>
      1 & 2 \\
      3 & 4
      </matrix>
    layer1_html: |
      <matrix>(KaTeX-rendered HTML of \begin{matrix}1 & 2 \\ 3 & 4\end{matrix})</matrix>
    notes: |
      A 2×2 matrix. The handler wraps the body in
      `\begin{matrix}...\end{matrix}` before KaTeX renders.
interpreter_strategy: handler
handler_module: ./handlers/math.js
handler_responsibilities:
  - Read the opaque content as LaTeX math-environment body.
  - Wrap in `\begin{matrix}...\end{matrix}`.
  - Render via KaTeX with `displayMode: true`.
  - Emit a `<matrix>` wrapper element containing KaTeX's HTML output.
  - Apply id / classes from the node.
---

# `<matrix>`

A LaTeX `matrix` math environment. Authors write rows-and-cells; the handler wraps in `\begin{matrix}…\end{matrix}` and passes to KaTeX.

## Authoring

```
<matrix>
1 & 2 \\
3 & 4
</matrix>
```

Cells are separated by `&`; rows are terminated by `\\`. The body is pure environment content — the handler adds the `\begin{matrix}` / `\end{matrix}` wrapper (the "wrap-inside" convention).

## See also

- [`<cases>`](cases.md), [`<align>`](align.md), [`<eqnarray>`](eqnarray.md) — sibling math-environment tags.
- [`<math>`](math.md), [`<display-math>`](display-math.md) — non-environment block math.
