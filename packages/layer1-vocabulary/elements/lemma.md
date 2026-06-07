---
semantic_role: lemma
category: theorem-family
html_output:
  element: lemma
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
        Optional name suffix for the lemma's label, parallel to
        <theorem>'s `name` kwarg. Honored by the Phase-2 handler.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this lemma participates in the propositional theorem-
        family shared counter. Default true; -numbered suppresses.
content:
  type: prose
  becomes: children
  notes: |
    Body content directly (no internal element parts), per the
    theorem-family convention.
content_handler: default
jats_counterpart:
  element: statement
  attributes:
    content-type: lemma
  notes: |
    JATS <statement content-type="lemma">. The Phase-2 handler
    constructs <label> and (when `name` is set) <title> at export.
shorthand_examples:
  - source: |
      <lemma | Every continuous function on a compact set attains its maximum.>
    layer1_html: |
      <lemma>Every continuous function on a compact set attains its maximum.</lemma>
  - source: |
      <lemma name="Zorn" #lem:zorn>
      Every non-empty partially-ordered set in which every chain has
      an upper bound contains a maximal element.
      </lemma>
    layer1_html: |
      <lemma id="lem:zorn" data-name="Zorn">Every non-empty partially-ordered set in which every chain has an upper bound contains a maximal element.</lemma>
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<lemma>`

A lemma — an auxiliary proposition, typically used as a stepping stone toward a theorem's proof. A sibling of `<theorem>` in the propositional theorem family.

## Semantic intent

`<lemma>` is the LaTeX/amsthm equivalent for the lemma theorem-style environment. It is rhetorically distinct from `<theorem>` (lemmas are subsidiary; theorems are the main results) but structurally identical and shares the same numbering counter.

The element is block-level; its content is body content directly, with no internal parts. The optional `name` kwarg becomes the "(Name)" suffix to the rendered label.

## Numbering

`<lemma>` shares its counter with `<theorem>`, `<corollary>`, and `<proposition>` — the four propositional theorem-family elements run on one document-wide sequence. See `<theorem>` for the convention's full rationale.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<lemma>` | `<statement content-type="lemma">` |
| `name` kwarg | `<title>` inside `<statement>` |
| Body content | `<p>` paragraphs inside `<statement>` |

## See also

- [`<theorem>`](theorem.md) — the anchor element for the theorem family; full design notes.
- [`<corollary>`](corollary.md), [`<proposition>`](proposition.md) — siblings sharing the propositional counter.
- [`<proof>`](proof.md) — the peer element for proofs (not a child of `<lemma>`).
