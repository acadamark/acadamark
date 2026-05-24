# Acadamark

An academic publishing system that uses HTML+CSS+JS as its substrate and a shorthand authoring syntax on top — combining the simplicity of markdown with the expressiveness needed for scholarly work.

## Motto

> Not re-inventing the wheel. Re-discovering the wheel.

In this case, HTML is the wheel.

## If you write academic documents

You already have a tool for this, and you already know its cost.

If you write in **LaTeX**, you have power and precision — and a compile step that fails on a stray brace, an error message that points three lines from the real problem, and a syntax that a co-author who doesn't already know it cannot touch.

If you write in **Quarto, RMarkdown, or Bookdown**, you started with markdown's ease — and then needed citations, cross-references, numbered figures, callouts, and watched the clean syntax accrete curly-brace attributes and fenced-div directives, each flavor incompatible with the next, each its own toolchain.

If you write in **Word**, everything is visible and nothing is structured — equation editors fight you, numbering renumbers itself wrong, and the document has no clean path into the scholarly publishing pipeline at all.

All three share one assumption: the rich, finished document is something you *compile to* or *export to*. But the renderer for rich, structured documents already exists, runs on every device, and needs nothing installed — the web browser. HTML is a mature, semantic document format. What's missing isn't the renderer. It's a way to *write* HTML that doesn't make you quit. That's what acadamark is.

## The idea in one paragraph

Markdown's success comes from a simple bargain: a small set of typing conventions that map cleanly onto HTML. For academic writing, that bargain breaks down — citations, cross-references, figure numbering, theorems, and structured sections all require extensions, and every project that has tried to add them (RMarkdown, Bookdown, Quarto, Pandoc filters) has invented its own incompatible flavor. Meanwhile, HTML+CSS+JS is already a complete, universally supported typesetting system. Acadamark proposes that the right move isn't another markdown extension — it's a rigorous set of HTML conventions for academic content, plus a uniform shorthand for authoring them that's easier on the fingers than raw HTML.

## Why HTML?

HTML+CSS+JS already does most of what academic typesetting needs. It's universally rendered (every browser, every platform). It's exportable to nearly anything via existing tools (Pandoc going *outward* from HTML is mature and reliable). It composes — every JS library, every CSS framework, every web component slots in. The only things HTML lacks are (1) a standard vocabulary for academic semantics like citations and cross-references, and (2) an authoring syntax that doesn't make humans want to quit. Acadamark adds both.

## What acadamark is, in two layers

**Layer 1 — Semantic HTML for academic publishing.** A defined set of HTML elements, custom elements, and `data-*` attributes that express the semantics academic documents need: numbered sections, captioned figures, citations, cross-references, theorems, embedded DSLs (LaTeX math, ABC music, Mermaid diagrams, CSV tables). This layer is independently valuable — you can author it directly if you want, and any tool that produces acadamark-conformant HTML benefits from the rest of the ecosystem.

**Layer 2 — Authoring shorthand.** A compact syntax that translates losslessly into Layer 1 HTML. It comes in two registers:

- *Markdown-like shorthand* for casual prose. Standard markdown syntax works for the things markdown does well — headings, emphasis, lists, links, fenced code.

- *Tag shorthand* for anything that needs attributes, identifiers, or academic semantics. The form is `<tag #id .class attr=value | content>` — attributes first, then a pipe, then content — read as "tag with these attributes containing this content." Tags don't require explicit closing — like LaTeX's `\section{}`, a new peer-level tag implicitly ends the previous one.

Both registers compile to the same Layer 1 HTML.

## A taste

```
## Introduction

This claim is supported by recent work <cite smith2023, jones2024>.

<figure #fig:elephant .wrap align=right src=elephant.jpg |
  An adult African elephant, photographed in Tanzania.>

See <ref #fig:elephant> for context.

## Methods

We followed the protocol described in <cite jones2024>.
```

Standard markdown headings carry the prose structure; tag shorthand is reached for only where academic semantics need it — here, a citation, a captioned and identified figure, and a cross-reference to that figure. Referenceable elements take a typed colon-id (`#fig:elephant`), so a reference names both the kind of target and the target itself. The whole example compiles to standard, semantic HTML that any browser can render and any converter can process.

## Status

Acadamark is implemented. The shorthand parser, the interpreter, and the Layer 1 vocabulary all exist and are tested, and a set of example documents demonstrates the system end to end — sections, citations, cross-references, figures, math, code, tables, and notes all render to self-contained HTML.

The implementation is built on the [unified](https://unifiedjs.com/) ecosystem (remark/rehype), replacing earlier regex-based prototypes. See [`STATUS.md`](STATUS.md) for a current snapshot of what works and what doesn't, [`DESIGN.md`](DESIGN.md) for the design rationale, [`BUILD.md`](BUILD.md) for the implementation plan, and [`notes/interpreter.md`](notes/interpreter.md) and [`notes/pipeline.md`](notes/pipeline.md) for the architecture.

## Reading order

The project has accumulated enough documentation that knowing where to start matters. See the [Reading order section in `notes/doc-ownership.md`](notes/doc-ownership.md#reading-order-for-newcomers) for a guided path through the spec and implementation docs.

## Project goals

Acadamark's purpose, in four parts:

1. **Specify** a complete vocabulary of HTML conventions for academic publishing (Layer 1).
2. **Author** that vocabulary efficiently via a uniform shorthand (Layer 2).
3. **Build** the smallest possible reference implementation by leveraging existing parser infrastructure rather than reinventing it.
4. **Demonstrate** that a working academic document — sections, citations, cross-references, figures, math, code — can round-trip from acadamark source through HTML to PDF and other formats using only off-the-shelf tools downstream.

Goals 1 through 3 are substantially achieved; goal 4 is demonstrated for HTML output, with JATS export and other downstream targets still ahead. See [`STATUS.md`](STATUS.md) for detail.

## Non-goals

- Replacing markdown for the things markdown already does well.
- Replacing LaTeX for math typesetting (we delegate to KaTeX/MathJax).
- Building a parser from scratch (we delegate to the unified ecosystem).
- Inventing yet another markdown flavor with its own bespoke extensions.

## License

TBD.
