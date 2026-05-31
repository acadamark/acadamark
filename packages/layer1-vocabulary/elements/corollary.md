---
semantic_role: corollary
html_output:
  element: corollary
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
  kwargs:
    name:
      maps_to: data-name
      notes: |
        Optional name suffix for the corollary's label, parallel to
        <theorem>'s `name` kwarg.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this corollary participates in the propositional
        theorem-family shared counter. Default true.
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: statement
  attributes:
    content-type: corollary
  notes: |
    JATS <statement content-type="corollary">.
shorthand_examples:
  - source: |
      <corollary | Every prime greater than 2 is odd.>
    layer1_html: |
      <corollary>Every prime greater than 2 is odd.</corollary>
  - source: |
      <corollary #cor:bounded>
      Any continuous function on a closed interval is bounded.
      </corollary>
    layer1_html: |
      <corollary id="cor:bounded">Any continuous function on a closed interval is bounded.</corollary>
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<corollary>`

A corollary — a proposition that follows immediately from another (typically a preceding theorem). A sibling of `<theorem>` in the propositional theorem family.

## Semantic intent

`<corollary>` is the LaTeX/amsthm equivalent for the corollary theorem-style environment. Rhetorically: a result whose proof is brief because it derives directly from a prior theorem.

The element is block-level; its content is body content directly. Numbering: shared with `<theorem>`, `<lemma>`, `<proposition>` — see `<theorem>` for the convention's full rationale.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<corollary>` | `<statement content-type="corollary">` |

## See also

- [`<theorem>`](theorem.md) — anchor element; full design notes.
- [`<lemma>`](lemma.md), [`<proposition>`](proposition.md) — siblings sharing the propositional counter.
