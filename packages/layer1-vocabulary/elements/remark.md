---
semantic_role: remark
category: theorem-family
html_output:
  element: remark
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
        Optional name suffix for the remark's label. Honored by the
        Phase-2 handler even though <remark> is unnumbered (a named
        remark may render as "Remark (Name):" without a number).
  booleans:
    numbered:
      handled_by: handler
      default: false
      notes: |
        Whether this remark is numbered. Default false — <remark> is
        conventionally unnumbered (the "remark" theorem-style family
        in amsthm is unnumbered). An author who wants numbering can
        opt-in per instance with +numbered, but most usage relies on
        the default.
content:
  shape:
    contains: [block]
  becomes: children
content_handler: default
jats_counterpart:
  element: statement
  attributes:
    content-type: remark
  notes: |
    JATS <statement content-type="remark">.
shorthand_examples:
  - source: |
      <remark | The converse does not hold in general.>
    layer1_html: '<remark><span class="remark-label">Remark.</span><p>The converse does not hold in general.</p></remark>'
  - source: |
      <remark>
      The hypothesis of compactness is essential here; without it
      the conclusion fails (consider $f(x) = 1/x$ on $(0, 1]$).
      </remark>
    layer1_html: |
      <remark>The hypothesis of compactness is essential here; without it the conclusion fails (consider $f(x) = 1/x$ on $(0, 1]$).</remark>
interpreter_strategy: handler
handler_module: ./handlers/theorem.js
---

# `<remark>`

A remark — a tangential observation accompanying a definition, theorem, or proof. A theorem-family element that is conventionally unnumbered.

## Semantic intent

`<remark>` is the LaTeX/amsthm equivalent for the remark theorem-style environment. Rhetorically: an aside about a definition or result — a clarification, a warning, a comment on related work — that the author wants to set apart visually but does not number for cross-reference.

The element is block-level; its content is body content directly.

## Numbering

`<remark>` is **unnumbered by default**, matching amsthm's conventional remark family. An author who wants numbering can opt-in with `+numbered`, but most usage relies on the default. The Phase-2 handler will render the label as "Remark:" (no number) or "Remark (Name):" when the optional `name` kwarg is set.

## JATS mapping

| enscribe | JATS |
|---|---|
| `<remark>` | `<statement content-type="remark">` |

## See also

- [`<theorem>`](theorem.md) — anchor element; full design notes.
- [`<aside>`](aside.md) — for tangential content with different rhetorical framing (not part of the theorem family).
