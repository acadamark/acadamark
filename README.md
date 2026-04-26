# Acadamark

An academic publishing system that uses HTML+CSS+JS as its substrate and a shorthand authoring syntax on top — combining the simplicity of markdown with the expressiveness needed for scholarly work.

## Motto

> Not re-inventing the wheel. Re-discovering the wheel.

In this case, HTML is the wheel.

## The idea in one paragraph

Markdown's success comes from a simple bargain: a small set of typing conventions that map cleanly onto HTML. For academic writing, that bargain breaks down — citations, cross-references, figure numbering, theorems, and structured sections all require extensions, and every project that has tried to add them (RMarkdown, Bookdown, Quarto, Pandoc filters) has invented its own incompatible flavor. Meanwhile, HTML+CSS+JS is already a complete, universally supported typesetting system. Acadamark proposes that the right move isn't another markdown extension — it's a rigorous set of HTML conventions for academic content, plus a uniform shorthand for authoring them that's easier on the fingers than raw HTML.

## Why HTML?

HTML+CSS+JS already does most of what academic typesetting needs. It's universally rendered (every browser, every platform). It's exportable to nearly anything via existing tools (Pandoc going *outward* from HTML is mature and reliable). It composes — every JS library, every CSS framework, every web component slots in. The only things HTML lacks are (1) a standard vocabulary for academic semantics like citations and cross-references, and (2) an authoring syntax that doesn't make humans want to quit. Acadamark adds both.

## What acadamark is, in two layers

**Layer 1 — Semantic HTML for academic publishing.** A defined set of HTML elements, custom elements, and `data-*` attributes that express the semantics academic documents need: numbered sections, captioned figures, citations, cross-references, theorems, embedded DSLs (LaTeX math, ABC music, Mermaid diagrams, CSV tables). This layer is independently valuable — you can author it directly if you want, and any tool that produces acadamark-conformant HTML benefits from the rest of the ecosystem.

**Layer 2 — Authoring shorthand.** A compact syntax that translates losslessly into Layer 1 HTML. It comes in two registers:

- *Markdown-like shorthand* for casual prose. Standard markdown syntax works for the things markdown does well — headings, emphasis, lists, links, fenced code.

- *Tag shorthand* for anything that needs attributes, identifiers, or academic semantics. The form is `<tag #id .class attr=value | content>`, read as "tag with these attributes containing this content." Tags don't require explicit closing — like LaTeX's `\section{}`, a new peer-level tag implicitly ends the previous one.

Both registers compile to the same Layer 1 HTML.

## A taste

```
<# Introduction #intro>

This claim is supported by recent work <cite smith2023, jones2024>.

<figure #elephant .wrap align=right src=elephant.jpg |
  An adult African elephant, photographed in Tanzania.>

See <ref elephant> for context.

<# Methods #methods>

We followed the protocol described in <cite jones2024>.
```

This compiles to standard, semantic HTML that any browser can render and any converter can process.

## Status

Acadamark is in active design. The core conventions for sections, citations, and the shorthand syntax are specified. A working implementation is being rebuilt on the [unified](https://unifiedjs.com/) ecosystem (remark/rehype) to replace earlier regex-based prototypes. See [`DESIGN.md`](DESIGN.md) for the design rationale and [`BUILD.md`](BUILD.md) for the implementation plan.

## Project goals

1. **Specify** a complete vocabulary of HTML conventions for academic publishing.
2. **Author** that vocabulary efficiently via a uniform shorthand.
3. **Build** the smallest possible reference implementation by leveraging existing parser infrastructure rather than reinventing it.
4. **Demonstrate** that a working academic document — sections, citations, cross-references, figures, math, code — can round-trip from acadamark source through HTML to PDF and other formats using only off-the-shelf tools downstream.

## Non-goals

- Replacing markdown for the things markdown already does well.
- Replacing LaTeX for math typesetting (we delegate to KaTeX/MathJax).
- Building a parser from scratch (we delegate to the unified ecosystem).
- Inventing yet another markdown flavor with its own bespoke extensions.

## License

TBD.
