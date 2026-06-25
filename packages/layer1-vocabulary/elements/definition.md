---
semantic_role: definition
category: theorem-family
html_output:
  element: definition
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
        Optional name suffix for the definition's label.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this definition participates in the definition counter.
        <definition> runs on its own counter (separate from the
        propositional theorem-family counter), matching amsthm's
        conventional "definition" theorem-style family. Default true.
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: statement
  attributes:
    content-type: definition
  notes: |
    JATS <statement content-type="definition">.
shorthand_examples:
  - source: |
      <definition | A *group* is a set with an associative binary operation, identity, and inverses.>
    layer1_html: '<definition><span class="definition-label">Definition 1.</span> A <i>group</i> is a set with an associative binary operation, identity, and inverses.</definition>'
  - source: |
      <definition name="Group" #def:group>
      A *group* is a set $G$ together with a binary operation
      $\cdot$ satisfying associativity, identity, and inverses.
      </definition>
    layer1_html: |
      <definition id="def:group" data-name="Group">A <em>group</em> is a set $G$ together with a binary operation $\cdot$ satisfying associativity, identity, and inverses.</definition>
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<definition>`

A definition — a formal introduction of a mathematical term and its meaning. A theorem-family element with its own numbering counter (rhetorically distinct from the propositional family).

## Semantic intent

`<definition>` is the LaTeX/amsthm equivalent for the definition theorem-style environment. Rhetorically distinct from the propositional family (`<theorem>`, `<lemma>`, etc.) — definitions introduce terms rather than assert truths — and consequently runs on its own counter.

The element is block-level; its content is body content directly. The defined term typically appears in emphasis (`*term*`) within the definition body.

## Numbering

`<definition>` has **its own counter**, separate from the propositional theorem-family. The amsthm convention: definitions are numbered in their own sequence ("Definition 1, Definition 2, …") rather than mixing with theorems.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<definition>` | `<statement content-type="definition">` |

## See also

- [`<theorem>`](theorem.md) — anchor element for the theorem family; full design notes.
- [`<example>`](example.md) — also runs on its own counter (rhetorically parallel: definition-and-example clusters in many texts).
