# Lists — `<list>` / `<li>`  (marker model, HTML-shaped Layer 1)

## Shape
Lists work like sections: a marker, then content after it. `<li>` marks an item; the
item's content is everything after `<li>` until the next item marker, a nested `<list>`,
or `</list>`. No pipe, no wrapper — items aren't bounded by `>`. That is what makes
nesting clean.

Authoring: `<list>` / `<li>`. Layer 1: HTML (`ul` / `ol` / `li`). Render: identity.

## Item markers — three registers, one Layer 1
- Canonical: `<li>`
- Sigil: `<->` or `<*>`  (interchangeable, like markdown's two bullet chars)
- Markdown: `-` or `*`
All mark an item the same way.

## Item content
Runs after the marker until the next marker / nested `<list>` / `</list>`. It can be
multiple paragraphs — they follow the normal paragraph rules and need no indentation.
A single-paragraph item stays bare while a multi-paragraph item wraps: this is the
**tight/loose** content-model state (`<item>` carries `contains: [inline, block]`),
defined in `notes/specs/shape-tokens.md` §"Content model and single-paragraph wrapping".

## Recognition
Markers are recognized only at flow position — a marker begins a line. An inline
`<-` / `->` in prose (R's `x <- y`, an arrow) is never claimed. `<li>` is claimed by
enscribe's flow tokenizers ahead of the HTML-block construct, so the HTML tag name is
no collision here. A marker outside a `<list>` has no item to attach to and renders
literally (an unknown tag).

## `<list {args}>` container
- Explicit `</list>` close.
- Ordered vs unordered is the element: `<list>` → `ul`; `<list ordered>` → `ol`.
- `marker=` sets CSS `list-style-type`, passed straight through (decimal, lower-roman,
  upper-alpha, disc, …). `start=N`, `reversed` on ordered lists. Unknown → default + flag.

## Nesting
A `<list>…</list>` inside an item. The nested list belongs to that item; the next outer
`<li>` resumes the outer list.

## Layer 1 / export
Lowers to `ul`/`ol` + `li` (render is identity). JATS export translates to
`<list list-type>` / `<list-item>`.

## Round-trip
`<list>`/`<li>` ↔ Layer 1 ↔ sigil markers, lossless. Markdown `-`/`*` is the lossy register.

## Strict-mode
- `off`: `<li>`, `<->`/`<*>`, and `-`/`*` all author.
- `sigil`: `<li>` and `<->`/`<*>`; markdown off + flagged.
- `canonical`: only `<li>`; sigil + markdown off + flagged.