---
semantic_role: example
category: theorem-family
html_output:
  element: example
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
        Optional name suffix for the example's label.
  booleans:
    numbered:
      handled_by: handler
      default: true
      notes: |
        Whether this example participates in the example counter.
        <example> runs on its own counter (separate from theorem,
        lemma, definition counters), matching amsthm's conventional
        "example" theorem-style family. Default true.
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: statement
  attributes:
    content-type: example
  notes: |
    JATS <statement content-type="example">.
shorthand_examples:
  - source: |
      <example | The integers under addition form a group.>
    layer1_html: '<example><span class="example-label">Example 1.</span> The integers under addition form a group.</example>'
  - source: |
      <example #ex:integers>
      The integers $\mathbb{Z}$ under addition form a group: the
      operation is associative, $0$ is the identity, and every
      integer has an additive inverse.
      </example>
    layer1_html: |
      <example id="ex:integers">The integers $\mathbb{Z}$ under addition form a group: the operation is associative, $0$ is the identity, and every integer has an additive inverse.</example>
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<example>`

An example — a concrete illustration, typically following a definition or theorem. A theorem-family element with its own numbering counter.

## Semantic intent

`<example>` is the LaTeX/amsthm equivalent for the example theorem-style environment. Rhetorically: a worked instance demonstrating a definition, theorem, or technique.

The element is block-level; its content is body content directly. Examples often follow definitions or theorems and illustrate them.

## Numbering

`<example>` has **its own counter**, separate from the propositional theorem-family and from the definition counter. The amsthm convention: examples are numbered in their own sequence ("Example 1, Example 2, …").

## JATS mapping

| enscribe | JATS |
|---|---|
| `<example>` | `<statement content-type="example">` |

## See also

- [`<theorem>`](theorem.md) — anchor element; full design notes.
- [`<definition>`](definition.md) — the typical preceding element.
- [`<remark>`](remark.md) — for tangential observations rather than worked instances.
