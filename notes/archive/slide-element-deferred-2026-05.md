# Deferred: `<slide>` element for presentations

**Status:** Not yet specified. Captured here so it doesn't get lost.

## What it is

Enscribe should eventually support presentation-style documents — slide decks rendered for screen presentation, similar to Quarto's revealjs output, Pandoc's beamer support, or LaTeX's beamer package. The natural element name is `<slide>`.

## Why it matters

Presentations are a major academic publishing format that enscribe doesn't currently address. Researchers regularly need to convert paper content into slides, and the source-of-truth → multiple-output pattern that enscribe already supports (HTML, JATS) extends naturally to presentation output.

A `<slide>` element gives authors a way to:

- Author presentations in enscribe's shorthand syntax.
- Reuse content between papers and slides (the same body text might appear in both with different formatting).
- Generate presentation HTML (revealjs-style) and printed handouts from the same source.
- Maintain consistent citation, figure, and equation handling between papers and presentations.

## Likely structure

A presentation document would use `<presentation>` as the top-level container (parallel to `<article>` and `<book>`), with `<slide>` elements as its body content. Each slide has a title, body content, and optionally speaker notes.

```
<presentation | The Effect of Elephants on Climate>
<meta>
  <author | Jane Goodall>
  <date | 2024-03-15>
</meta>

<slide | Introduction>
The opening slide content.

<slide | Methods>
- Bullet point one
- Bullet point two

<slide-notes |
Speaker notes for this slide. Not visible to audience.
>

<slide | Results>
<figure src=key-finding.jpg | The key finding.>
```

This is a sketch. Real design needs to consider:

- Slide-level attributes (transitions, layouts, themes).
- How `<presentation>` differs structurally from `<article>` and `<book>`.
- Whether slides should have explicit type kwargs (title-slide, content-slide, section-divider, etc.).
- How speaker notes work (separate elements vs. attribute on slide).
- How body content relates between paper-mode and presentation-mode (the same `<section>` rendering as a section in paper output but a slide in presentation output?).
- How math, figures, citations carry over from paper authoring conventions.

## Implementation considerations

This is a Layer 1 vocabulary addition plus a render-mode plugin (for presentation HTML output). Likely components:

- `<presentation>` vocabulary entry (parallel to `<article>` and `<book>`).
- `<slide>` vocabulary entry.
- `<slide-notes>` vocabulary entry (or notes-as-attribute on slide).
- A presentation render-mode plugin that lowers presentation Layer 1 to revealjs HTML or similar.
- A JATS counterpart for presentations (if scholarly archives support presentations; some do via specific extensions).

## When to address

After the core paper/book vocabulary is implemented and the first end-to-end papers work. Presentations build on the same primitives (sections, figures, math, citations) but add a new top-level format. Worth waiting until those primitives are stable before adding presentation-specific concerns.

The first concrete step would be a chat-side design pass on the presentation vocabulary, parallel to how we did the article and book design passes.

## See also

- [`<article>`](../packages/layer1-vocabulary/elements/article.md) — parallel structure for papers.
- [`<book>`](../packages/layer1-vocabulary/elements/book.md) — parallel structure for books.
- The Layer 1 SPEC.md — should eventually list `<presentation>`, `<slide>`, and `<slide-notes>` once specified.
