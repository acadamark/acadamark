---
semantic_role: display-math
category: math
semantic_family: notation
html_output:
  element: display-math
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this equation participates in the document-wide numbered
        sequence. Use +numbered (default) to number, -numbered to suppress.
        Can also be written as numbered=true / numbered=false.
        When suppressed, the equation renders without a number and is not
        added to the numbered counter. The config key number-equations=false
        suppresses all equations unless overridden per-element with +numbered.
content:
  notes: |
    The pipe content is LaTeX math source. It is passed directly to KaTeX
    as a string; it is not parsed as prose. The author is responsible for
    valid LaTeX math syntax.
shorthand_examples:
  - source: '<$$ \sum_{i=1}^{n} x_i = X $$>'
    ehtml: '<display-math><span class="katex-display">…</span><equation-number>(1)</equation-number></display-math>'
    notes: |
      The `$$` sigil. Display-mode LaTeX rendered by KaTeX on its own line;
      numbered by default (the equation number is appended after the KaTeX
      output).
interpreter_strategy: handler
handler_module: ./handlers/math.js
jats_counterpart:
  element: disp-formula
  notes: |
    JATS <disp-formula> wraps a displayed equation. The JATS exporter
    generates <tex-math> with the raw LaTeX source plus optionally
    <mml:math>. The id attribute (for cross-references) maps to JATS
    id. Equation numbering maps to JATS <label>.
---

# `<display-math>`

Block-level mathematical notation, centered on its own line. The content
is LaTeX math source rendered by KaTeX in display mode.

## Authoring syntax

```
<$$ \sum_{i=1}^{n} x_i = X $$>
```

The `$$` sigil is the short form. No long form exists for display math.

## Rendered output

The element wraps KaTeX's display-mode HTML in a `<display-math>` container:

```html
<display-math><span class="katex-display">...</span></display-math>
```

## Id and cross-references

A `<display-math>` element may carry an id for cross-reference targets
(e.g., `<$$ id=eq:pythagorean ... $$>`). Cross-reference resolution
(`<ref>`) is a future slice; the id attribute passes through now.

## Equation numbering

Display equations are numbered in document order. The `+numbered` boolean
kwarg controls per-equation numbering (default true); `-numbered` suppresses
the number. The document-level config key `number-equations=false` suppresses
all equations. A per-element `+numbered` override takes priority over config.

The numbering plugin (`plugins/numbering.js`) sets `node.computedNumber` on
each display-math node before the hast conversion step. The math handler then
appends `<equation-number>(N)</equation-number>` after the KaTeX children.

## Error handling

Same as `<inline-math>`: KaTeX errors render visibly rather than throwing.

## Notes

- Display math renders with `displayMode: true` (KaTeX option).
- Inline math uses `<inline-math>`.
