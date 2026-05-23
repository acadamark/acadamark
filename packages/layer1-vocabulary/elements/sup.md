---
semantic_role: sup
html_output:
  element: sup
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
content_handler: default
jats_counterpart:
  element: sup
shorthand_examples:
  - source: 'The 1<sup | st> edition of the work.'
    layer1_html: '<p>The 1<sup>st</sup> edition of the work.</p>'
  - source: 'The function f(x) = x<sup | 2>.'
    layer1_html: '<p>The function f(x) = x<sup>2</sup>.</p>'
  - source: 'The isotope <sup | 12>C is abundant.'
    layer1_html: '<p>The isotope <sup>12</sup>C is abundant.</p>'
interpreter_strategy: schema
---

# `<sup>`

Superscript. Inline content rendered above the baseline of surrounding text.

## Semantic intent

`<sup>` represents superscripted content — ordinal markers, mathematical exponents, isotope numbers, footnote markers. The element is HTML-native and renders above the baseline by default.

## Authoring

`<sup>` is reached for via the explicit form.

```
The 1<sup | st> edition of the work.

The function f(x) = x<sup | 2>.

The isotope <sup | 12>C is abundant.
```

The inline TeX `^{...}` shortcut (G1) lets authors write `1^{st}`, `x^{2}`, `^{12}C` directly in prose, producing the same `<sup>` output. The original design record is preserved at `archive/inline-tex-shortcuts-spec-2026-05.md`.

For mathematical content with rich notation, use the math sigil:

```
The expression <$ x^{2y+1} $> is the result.
```

The math sigil renders via KaTeX, which handles complex superscript notation.

## Content

`<sup>` contains prose. Most superscripts are short text or numbers, but the recursive parsing pass handles arbitrary nested content if needed.

## JATS mapping

| acadamark | JATS |
|-----------|------|
| `<sup>` | `<sup>` |

Direct mapping; the element name and semantics match.

## Render-mode lowering

`<sup>` is HTML-native; no lowering needed.

## See also

- [`<sub>`](sub.md) — for subscript content.
- The math sigil `<$...$>` — for mathematical notation with rich subscript/superscript.
- [`archive/inline-tex-shortcuts-spec-2026-05.md`](../../archive/inline-tex-shortcuts-spec-2026-05.md) — design record for the `^{...}` shorthand (now implemented as G1).
