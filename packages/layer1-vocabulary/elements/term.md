---
semantic_role: term
category: inline-formatting
html_output:
  element: term
  is_html_native: false
  default_attributes: {}
enscribe_attributes:
  id:
    maps_to: id
    notes: |
      Optional id, useful for cross-referencing the term-introduction
      from later prose (e.g. <ref @term:eigenvector>).
  classes:
    maps_to: class
content:
  type: prose
  becomes: children
  notes: |
    The term being introduced — typically a noun phrase, italicized or
    visually distinguished in the rendered output.
content_handler: default
jats_counterpart:
  element: named-content
  attributes:
    content-type: term
  notes: |
    JATS uses <named-content content-type="term"> for marked
    terminology. The exporter constructs the named-content element
    with the content-type attribute from enscribe's <term>.
shorthand_examples:
  - source: 'An <term | eigenvector> is a non-zero vector that scales under a linear transformation.'
    layer1_html: '<p>An <term>eigenvector</term> is a non-zero vector that scales under a linear transformation.</p>'
    notes: |
      Standard term introduction. The element marks the word as
      "this is a term being introduced," typically rendered in italic
      or bold by default CSS.
  - source: 'An <term #term:eigenvector | eigenvector> is a non-zero vector that scales under a linear transformation. Later we generalize <term | eigenvector>s to operators.'
    layer1_html: '<p>An <term id="term:eigenvector">eigenvector</term> is a non-zero vector that scales under a linear transformation. Later we generalize <term>eigenvector</term>s to operators.</p>'
    notes: |
      First introduction carries an id so later references can link
      back to it. Subsequent uses of the same term (without an id)
      still mark it as a term being referenced, distinct from running
      prose, without re-asserting the introduction.
interpreter_strategy: schema
---

# `<term>`

A term being introduced or defined. Semantic emphasis distinct from `<em>` (general emphasis) and `<i>` (stylistic italics): `<term>` says *this word is the name of a concept being introduced here*.

## Semantic intent

`<term>` marks the first introduction of a technical term, named concept, or term of art. Distinct semantic roles for what may look similar visually:

| Element | Role |
|---|---|
| `<em>` | General emphasis — stress this phrase. |
| `<i>` | Stylistic italics — foreign words, ship names, taxonomic terms. |
| `<term>` | A term being introduced — *this is the name of the concept I'm now defining*. |

Default rendering typically italicizes a `<term>`, which is why authors sometimes reach for `<em>` or `<i>` instead. The semantic distinction matters: indexers, glossary generators, and accessibility tools can use `<term>` to find term definitions, which they cannot do reliably from `<em>` or `<i>`.

## Authoring

```
An <term | eigenvector> is a non-zero vector that scales under a linear transformation.
```

Optionally with an id for cross-reference:

```
An <term #term:eigenvector | eigenvector> is a non-zero vector ...
```

The id-carrying first introduction is the conventional pattern: define once with an id; reference back to it from later prose with `<ref @term:eigenvector>` (when ref / term integration lands).

## JATS mapping

| enscribe | JATS |
|---|---|
| `<term>X</term>` | `<named-content content-type="term">X</named-content>` |

## See also

- [`<em>`](em.md), [`<i>`](i.md) — distinct semantic roles (general emphasis; stylistic italics).
- [`<abbr>`](abbr.md) — for abbreviations / acronyms (different role).
