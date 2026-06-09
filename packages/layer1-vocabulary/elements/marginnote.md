---
semantic_role: marginnote
category: inline-formatting
html_output:
  element: aside
  is_html_native: true
  default_attributes:
    class: enscribe-marginnote
enscribe_attributes:
  id:
    maps_to: id
  classes:
    maps_to: class
content:
  type: prose
  becomes: children
content_handler: default
jats_counterpart:
  element: boxed-text
  attributes:
    content-type: marginnote
  notes: |
    JATS models a sidebar / aside as <boxed-text>; content-type="marginnote"
    marks the identity for round-trip. The inline-authored body is wrapped in a
    <p> (boxed-text takes block content).
shorthand_examples:
  - source: 'The result holds.<marginnote | A caveat, set in the margin.>'
    layer1_html: '<p>The result holds.<aside class="enscribe-marginnote">A caveat, set in the margin.</aside></p>'
    notes: |
      An unnumbered margin aside, authored in place. Unlike a numbered <note>,
      it is not collected, numbered, or relocated — it renders where written and
      floats into the margin column (note-position is irrelevant to it).
  - source: '<marginnote #m1 | A margin note with an id.>'
    layer1_html: '<aside id="m1" class="enscribe-marginnote">A margin note with an id.</aside>'
interpreter_strategy: schema
---

# `<marginnote>`

An unnumbered aside set in the page margin, authored in place — the Tufte "margin note", distinct from a numbered footnote/sidenote.

## Semantic intent

`<marginnote>` is a short, unnumbered remark that belongs beside the text rather than in the flow or at the foot of the document. It is **not** a numbered note: it carries no number, is never collected into a notes list, and the note-numbering machinery never sees it. Use a numbered `<note>` (optionally rendered in the margin via `note-position=margin`, #33 part 1) when the remark needs a number and a back-reference; use `<marginnote>` for an aside that simply sits in the margin.

## Authoring

```
The result holds.<marginnote | A caveat, set in the margin.>
```

The canonical inline form `<marginnote | body>` — attributes (an optional `#id`) before the pipe, inline body after. There is no markdown idiom and no sigil: the construct is canonical-only, hence inherently strict-safe (it always interprets; there is nothing for strict mode to ban).

## Content

Inline prose. The body goes through normal inline interpretation (emphasis, code, cross-references, citations all work). Multi-paragraph bodies are out of scope for now.

## Render

Renders in place as `<aside class="enscribe-marginnote">…</aside>`. Above the margin breakpoint it floats into the shared margin column (the same column sidenotes use); below it, it falls back to an inline-block aside. The margin column is established whenever a `<marginnote>` is present, independent of `note-position`.

## JATS mapping

| enscribe | JATS |
|-----------|------|
| `<marginnote>` | `<boxed-text content-type="marginnote">` |

`<boxed-text>` is JATS's sidebar/aside element; the `content-type` records the marginnote identity for round-trip. The inline body is wrapped in a `<p>` (boxed-text takes block content).

## See also

- [`<note>`](note.md) — numbered footnote/endnote/sidenote (collected and numbered; can render in the margin via `note-position=margin`).
- [`<aside>`](aside.md) — a block-level callout / boxed aside with a type classification.
