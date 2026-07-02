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
  shape:
    contains: [inline]
  becomes: children
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
    layer1_html: '<style>/* Margin column (#33) — shared by sidenotes and marginnotes; injected only when used. */ /* ── Default / narrow (the mobile fallback) ────────────────────────────────── */ /* A relocated sidenote hides (the bottom note-list shows instead); a marginnote has no list to fall back to, so it renders inline as a block aside. */ .enscribe-sidenote { display: none; } .enscribe-marginnote { display: inline-block; font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); } @media (min-width: 900px) { /* Relax the body cap so body + margin gutter can be wider (mirrors the ToC layout); only when a margin layout is present. */ body:has(.enscribe-layout--margin) { max-width: none; padding: 0; } .enscribe-layout--margin { margin: 0 auto; padding: 0 var(--enscribe-content-padding); /* the readable body column plus a margin gutter to its right */ max-width: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 18rem); } /* The body keeps the readable measure; the gutter to its right holds the notes. */ .enscribe-layout--margin .enscribe-body { max-width: var(--enscribe-content-width); margin-right: calc(var(--enscribe-space-12) + 18rem); } /* Both kinds of margin content float into the right gutter, near their anchor. */ .enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--margin .enscribe-marginnote { display: block; float: right; clear: right; width: 18rem; margin-right: -18rem; margin-bottom: var(--enscribe-space-3); font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); text-indent: 0; } /* The sidenote number, carried verbatim from the bottom-list <sup>. */ .enscribe-layout--margin .enscribe-sidenote > sup { font-family: var(--enscribe-font-sans); font-size: var(--enscribe-text-xs); color: var(--enscribe-link); margin-right: var(--enscribe-space-1); } /* On wide screens the bottom note-list is redundant with the relocated copies. */ .enscribe-layout--margin note-list { display: none; } /* ── ToC + margin combined (#33 part 2, folded loose end) ─────────────────── A document with BOTH a ToC sidebar and margin content uses a three-track grid — ToC | body | margin gutter — so the floats land in a real gutter track instead of overrunning the ToC layout''s two-column grid. */ .enscribe-layout--toc.enscribe-layout--margin { display: grid; grid-template-columns: 14rem minmax(0, var(--enscribe-content-width)) 18rem; column-gap: var(--enscribe-space-12); max-width: calc(14rem + var(--enscribe-content-width) + 18rem + 2 * var(--enscribe-space-12)); } /* In the combined grid the body is the middle track and the gutter is the third track, so the floats use the column-gap offset, not the single-layout negative margin against the body. */ .enscribe-layout--toc.enscribe-layout--margin .enscribe-body { margin-right: 0; } .enscribe-layout--toc.enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--toc.enscribe-layout--margin .enscribe-marginnote { margin-right: calc(-1 * (18rem + var(--enscribe-space-12))); } } </style><div class="enscribe-layout enscribe-layout--margin"><main class="enscribe-body"><article><article-body><p>The result holds. <aside class="enscribe-marginnote">A caveat, set in the margin.</aside></p></article-body></article></main></div>'
    notes: |
      An unnumbered margin aside, authored in place. Unlike a numbered <note>,
      it is not collected, numbered, or relocated — it renders where written and
      floats into the margin column (note-position is irrelevant to it).
  - source: '<marginnote #m1 | A margin note with an id.>'
    layer1_html: '<style>/* Margin column (#33) — shared by sidenotes and marginnotes; injected only when used. */ /* ── Default / narrow (the mobile fallback) ────────────────────────────────── */ /* A relocated sidenote hides (the bottom note-list shows instead); a marginnote has no list to fall back to, so it renders inline as a block aside. */ .enscribe-sidenote { display: none; } .enscribe-marginnote { display: inline-block; font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); } @media (min-width: 900px) { /* Relax the body cap so body + margin gutter can be wider (mirrors the ToC layout); only when a margin layout is present. */ body:has(.enscribe-layout--margin) { max-width: none; padding: 0; } .enscribe-layout--margin { margin: 0 auto; padding: 0 var(--enscribe-content-padding); /* the readable body column plus a margin gutter to its right */ max-width: calc(var(--enscribe-content-width) + var(--enscribe-space-12) + 18rem); } /* The body keeps the readable measure; the gutter to its right holds the notes. */ .enscribe-layout--margin .enscribe-body { max-width: var(--enscribe-content-width); margin-right: calc(var(--enscribe-space-12) + 18rem); } /* Both kinds of margin content float into the right gutter, near their anchor. */ .enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--margin .enscribe-marginnote { display: block; float: right; clear: right; width: 18rem; margin-right: -18rem; margin-bottom: var(--enscribe-space-3); font-size: var(--enscribe-text-sm); line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-secondary); text-indent: 0; } /* The sidenote number, carried verbatim from the bottom-list <sup>. */ .enscribe-layout--margin .enscribe-sidenote > sup { font-family: var(--enscribe-font-sans); font-size: var(--enscribe-text-xs); color: var(--enscribe-link); margin-right: var(--enscribe-space-1); } /* On wide screens the bottom note-list is redundant with the relocated copies. */ .enscribe-layout--margin note-list { display: none; } /* ── ToC + margin combined (#33 part 2, folded loose end) ─────────────────── A document with BOTH a ToC sidebar and margin content uses a three-track grid — ToC | body | margin gutter — so the floats land in a real gutter track instead of overrunning the ToC layout''s two-column grid. */ .enscribe-layout--toc.enscribe-layout--margin { display: grid; grid-template-columns: 14rem minmax(0, var(--enscribe-content-width)) 18rem; column-gap: var(--enscribe-space-12); max-width: calc(14rem + var(--enscribe-content-width) + 18rem + 2 * var(--enscribe-space-12)); } /* In the combined grid the body is the middle track and the gutter is the third track, so the floats use the column-gap offset, not the single-layout negative margin against the body. */ .enscribe-layout--toc.enscribe-layout--margin .enscribe-body { margin-right: 0; } .enscribe-layout--toc.enscribe-layout--margin .enscribe-sidenote, .enscribe-layout--toc.enscribe-layout--margin .enscribe-marginnote { margin-right: calc(-1 * (18rem + var(--enscribe-space-12))); } } </style><div class="enscribe-layout enscribe-layout--margin"><main class="enscribe-body"><article><article-body><aside class="enscribe-marginnote" id="m1">A margin note with an id.</aside></article-body></article></main></div>'
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
