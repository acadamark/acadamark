---
semantic_role: proposition
category: theorem-family
html_output:
  element: proposition
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
        Optional name suffix for the proposition's label.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this proposition participates in the propositional
        theorem-family shared counter. Default true.
content:
  type: prose
  shape:
    contains: [block]
  becomes: children
content_handler: default
jats_counterpart:
  element: statement
  attributes:
    content-type: proposition
  notes: |
    JATS <statement content-type="proposition">.
shorthand_examples:
  - source: |
      <proposition | The sum of two even integers is even.>
    layer1_html: '<proposition><span class="proposition-label">Proposition 1.</span><p>The sum of two even integers is even.</p></proposition>'
  - source: |
      <proposition name="Cauchy-Schwarz">
      For any vectors $u$, $v$ in an inner-product space,
      $|\langle u, v \rangle| \le \|u\| \, \|v\|$.
      </proposition>
    layer1_html: |
      <proposition data-name="Cauchy-Schwarz">For any vectors $u$, $v$ in an inner-product space, $|\langle u, v \rangle| \le \|u\| \, \|v\|$.</proposition>
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<proposition>`

A proposition — a true mathematical statement, typically less weighty than a theorem but with a real proof. A sibling of `<theorem>` in the propositional theorem family.

## Semantic intent

`<proposition>` is the LaTeX/amsthm equivalent for the proposition theorem-style environment. Rhetorically distinct from `<theorem>` (proposition is a smaller-stakes result; theorem is a major one) but structurally identical and shares the same numbering counter.

The element is block-level; its content is body content directly. Numbering: shared with `<theorem>`, `<lemma>`, `<corollary>` — see `<theorem>` for the convention's full rationale.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<proposition>` | `<statement content-type="proposition">` |

## See also

- [`<theorem>`](theorem.md) — anchor element; full design notes.
- [`<lemma>`](lemma.md), [`<corollary>`](corollary.md) — siblings sharing the propositional counter.
