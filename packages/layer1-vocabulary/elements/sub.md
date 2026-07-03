---
semantic_role: sub
category: inline-formatting
semantic_family: emphasis-and-marking
html_output:
  element: sub
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
jats_counterpart:
  element: sub
shorthand_examples:
  - source: 'Water is H<sub | 2>O.'
    layer1_html: '<p>Water is H<sub>2</sub>O.</p>'
  - source: 'The vector x<sub | i> represents the i-th component.'
    layer1_html: '<p>The vector x<sub>i</sub> represents the i-th component.</p>'
interpreter_strategy: schema
---

# `<sub>`

Subscript. Inline content rendered below the baseline of surrounding text.

## Semantic intent

`<sub>` represents subscripted content — chemical formula numbers, mathematical indices, footnote markers in some conventions. The element is HTML-native and renders below the baseline by default.

## Authoring

`<sub>` is reached for via the explicit form.

```
Water is H<sub | 2>O.

The vector x<sub | i> represents the i-th component.
```

The inline TeX `_{...}` shortcut (G1) lets authors write `H_{2}O` directly in prose, producing the same `<sub>` output. The original design record is preserved at `notes/archive/inline-tex-shortcuts-spec-2026-05.md`.

For mathematical content with rich notation, use the math sigil:

```
The expression <$ x_{ij} $> appears in the matrix.
```

The math sigil renders via KaTeX, which handles complex subscript notation.

## Content

`<sub>` contains prose. Most subscripts are short text or numbers, but the recursive parsing pass handles arbitrary nested content if needed.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<sub>` | `<sub>` |

Direct mapping; the element name and semantics match.

## Render-mode lowering

`<sub>` is HTML-native; no lowering needed.

## See also

- [`<sup>`](sup.md) — for superscript content.
- The math sigil `<$...$>` — for mathematical notation with rich subscript/superscript.
- [`notes/archive/inline-tex-shortcuts-spec-2026-05.md`](../../notes/archive/inline-tex-shortcuts-spec-2026-05.md) — design record for the `_{...}` shorthand (now implemented as G1).
