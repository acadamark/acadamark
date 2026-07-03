---
semantic_role: math
category: math
semantic_family: notation
html_output:
  element: math
  is_html_native: false
  default_attributes: {}
  notes: |
    `html_output.element` here is the vocabulary lookup key (must match
    the tagname). The handler emits a `<math>` wrapper element directly;
    the schema field is not consulted under
    `interpreter_strategy: handler`. (Same pattern the csv/tsv
    entries follow.)
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  notes: |
    The content is LaTeX math source. It is passed directly to KaTeX
    (displayMode: true) as a string; not parsed as prose. The author is
    responsible for valid LaTeX math syntax.
jats_counterpart:
  element: disp-formula
  notes: |
    JATS `<disp-formula>` wraps a displayed equation, same as the
    counterpart for `<display-math>` (the `<$$>` sigil). The two surfaces
    are semantic synonyms in enscribe; both map to JATS
    `<disp-formula>`.
shorthand_examples:
  - source: |
      <math>
      E = mc^2
      </math>
    ehtml: |
      <math>(KaTeX-rendered HTML)</math>
    notes: |
      Long-form `<math>` block. Semantically equivalent to the
      `<$$ E = mc^2 $$>` display-math sigil — both render block-level
      LaTeX math via KaTeX. Use the long-form when the source is
      multi-line or when explicit tag bounds aid readability; use the
      sigil for brevity.
interpreter_strategy: handler
handler_module: ./handlers/math.js
handler_responsibilities:
  - Read the opaque content as LaTeX source.
  - Render via KaTeX with `displayMode: true` (block-level).
  - Emit a `<math>` wrapper element containing KaTeX's HTML output.
  - Apply id / classes from the node.
---

# `<math>`

Block-level mathematical notation, long-form syntax. Semantically equivalent to the `<$$ ... $$>` display-math sigil.

## Semantic intent

`<math>` is the long-form authoring shape for block-level LaTeX math display. Use the long form when:

- The math source is multi-line and the explicit tag bounds aid readability.
- The author prefers the named-tag form over the sigil for stylistic consistency.
- A CSS/export pipeline needs to distinguish long-form `<math>` from sigil `<display-math>` (Layer 1 keeps them as separate elements; downstream styling can target either).

The sigil form `<$$ ... $$>` is the more compact authoring shape and remains the recommended default.

## Authoring

```
<math>
\sum_{i=1}^{n} x_i = X
</math>
```

The content between the opening and closing tags is LaTeX math source, passed directly to KaTeX in displayMode.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<math>` | `<disp-formula>` |
| `id` | `id` attribute on `<disp-formula>` |

## See also

- [`<display-math>`](display-math.md) — the `<$$>` sigil counterpart.
- [`<inline-math>`](inline-math.md) — for inline math.
- [`<matrix>`](matrix.md), [`<cases>`](cases.md), [`<align>`](align.md), [`<eqnarray>`](eqnarray.md) — math environment tags.
