---
semantic_role: inline-math
category: math
html_output:
  element: inline-math
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  notes: |
    The pipe content is LaTeX math source. It is passed directly to KaTeX
    as a string; it is not parsed as prose. The author is responsible for
    valid LaTeX math syntax.
content_handler: math
shorthand_examples:
  - source: 'The identity <$ a^2 + b^2 = c^2 $> holds for right triangles.'
    layer1_html: '<p>The identity <inline-math><span class="katex">…</span></inline-math> holds for right triangles.</p>'
    notes: |
      The `$` sigil. Opaque LaTeX content rendered inline by KaTeX and
      wrapped in <inline-math> for CSS targeting. The sigil carries no
      attributes — id and classes are not supported for inline math.
interpreter_strategy: handler
handler_module: ./handlers/math.js
jats_counterpart:
  element: inline-formula
  notes: |
    JATS <inline-formula> wraps MathML or TeX alternatives. The JATS
    exporter generates <tex-math> with the raw LaTeX source, plus
    optionally a <mml:math> rendered form.
---

# `<inline-math>`

Inline mathematical notation appearing in the flow of text. The content
is LaTeX math source rendered by KaTeX.

## Authoring syntax

```
<$ x^2 + y^2 = z^2 $>
```

The `$` sigil is the short form. No long form exists for inline math — the
content is always a single expression on one line.

## Rendered output

The element wraps KaTeX's HTML output in a `<inline-math>` container:

```html
<inline-math><span class="katex">...</span></inline-math>
```

KaTeX's HTML uses `aria-hidden` and a separate `aria-label` or MathML
for accessibility. The `<inline-math>` wrapper enables semantic identification
and CSS targeting without depending on KaTeX's internal class names.

## Error handling

When KaTeX encounters malformed LaTeX, it renders a visible error marker
(red text) rather than throwing. The `<inline-math>` wrapper still appears;
the KaTeX error span appears inside it. Documents always render to something.

## Notes

- Inline math renders with `displayMode: false` (KaTeX default).
- Display-mode math (centered, on its own line) uses `<display-math>`.
- The `$` sigil may not carry attributes. Id and classes are not supported
  for inline math currently; add them via a future `<inline-math>` named tag
  if needed.
