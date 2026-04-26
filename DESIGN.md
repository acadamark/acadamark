# Acadamark Design

This document captures the design decisions behind acadamark and the reasoning that led to them. It's intended for contributors, for future maintainers, and for the author returning after time away.

## The problem

Academic typesetting today splits roughly three ways:

- **LaTeX** is powerful and self-consistent, but fragile (compile-time failures), arcane to read, and outside the dominant web ecosystem.

- **Markdown extensions** (RMarkdown, Bookdown, Quarto, Pandoc filters) add academic features at the cost of fragmenting the markdown ecosystem. Each invents its own syntax for citations, cross-references, figure attributes, and so on. None compose with each other. Each requires its own parser, often outside the JavaScript ecosystem where the rendering ultimately happens. Extensions also accrete idioms — trailing curly-brace attributes, fenced div blocks, double-colon directives — that erode the visual simplicity that made markdown attractive in the first place.

- **Raw HTML** can express anything but is laborious to author by hand and lacks standard conventions for academic semantics.

The dominant rendering substrate — HTML+CSS+JS, running in every browser — is already capable of academic typesetting. The gap is conventions for academic semantics and an ergonomic authoring syntax.

## Core insight

Treat HTML as the ground truth, not the export target.

Most markdown-extension projects start from "markdown plus features" and the features are shaped by what the parser happened to make easy. Acadamark inverts this: first define the HTML conventions that express academic semantics, then design the shortest authoring path to that HTML.

The two layers are independently valuable:

- **Layer 1 (semantic HTML)** is a target anyone can write to. A different authoring tool, a converter from another format, or a hand-author can all produce acadamark-conformant HTML. The downstream ecosystem (rendering, export, accessibility tooling) treats it as ordinary HTML.

- **Layer 2 (shorthand)** is one possible authoring surface for Layer 1. Decoupling them means the shorthand can evolve, be replaced, or coexist with alternatives without disturbing the semantic foundation.

## Layer 1: Semantic HTML conventions

The Layer 1 specification (in progress, see `notes/`) defines:

- **Structural elements.** Standard HTML5 (`article`, `section`, `figure`, `aside`, `nav`) wherever it suffices. Custom elements (`<sub-section>`, `<theorem>`, `<proof>`, etc.) where HTML5 is insufficient, using the native custom-elements mechanism.

- **Semantic attributes.** A defined vocabulary of `data-*` attributes for academic metadata: `data-cite-key`, `data-figure-number`, `data-ref-target`, `data-numbering-style`, etc. Standard `id` and `class` retain their normal meanings.

- **Embedded DSLs.** A convention for embedding domain-specific text (LaTeX math, ABC music notation, Mermaid diagrams, CSV tables) using fenced code blocks tagged with a language identifier, dispatched to appropriate renderers.

- **Citation and reference semantics.** Citation keys and reference lists expressed as HTML elements with defined attributes, allowing any CSL-compliant processor to format them.

- **Numbering and cross-reference semantics.** Numbered elements declare their numbering domain; references resolve against those domains in a post-parse pass.

The specification is the deliverable for Layer 1. Implementation is deferred — anyone can produce conformant HTML by any means.

## JATS as reference and export target

JATS (Journal Article Tag Suite) is the established XML schema for academic articles, developed by NIH/NLM and used throughout scholarly publishing. JATS has spent two decades refining a vocabulary for academic content — author lists, affiliations, abstracts, structured references, glossaries, funding statements, and much more. Acadamark does not duplicate this work.

Two principles govern acadamark's relationship to JATS:

**JATS as reference vocabulary.** When Layer 1 needs to define a new element, the JATS tag library is the first reference. Acadamark adopts JATS naming and conventions where they're sensible, recognizing that JATS is XML and acadamark is HTML — so exact transcription isn't always right, but the design decisions usually transfer. The goal is to avoid inventing worse versions of decisions JATS already got right. (See `notes/layer1-naming.md` for the binding rule.)

**JATS as first-class export target.** Acadamark Layer 1 HTML compiles to JATS XML via a planned plugin (`rehype-acadamark-to-jats`). This makes acadamark documents submittable to journals and ingestable by the scholarly publishing ecosystem (PubMed, CrossRef, archival systems) without requiring Pandoc as a runtime dependency or hand-conversion.

This is acadamark's bridge to professional publishing. The pitch is not "academic markdown for the web" but "academic markdown for the web that can submit to journals."

What acadamark does *not* do, and where it differs from JATS:

- JATS is XML; acadamark is HTML. JATS documents require a stylesheet or viewer to be readable. Acadamark documents are directly browser-renderable.
- JATS has no authoring syntax. Acadamark's shorthand is what humans actually type.
- JATS rewards completeness; acadamark rewards getting started. Required JATS metadata can be filled with defaults or generated at export time.

Acadamark stays a small subset of JATS in vocabulary terms — perhaps 30 elements where JATS has 200+ — but a subset that compiles cleanly into JATS for downstream use.

## Layer 2: Authoring shorthand

Two registers, both compiling to Layer 1.

### Register A: Markdown-like

Standard CommonMark works for paragraphs, emphasis, links, lists, fenced code, and headings. Where markdown is sufficient, acadamark uses markdown unmodified.

### Register B: Tag shorthand

For anything requiring attributes or academic semantics, acadamark uses a uniform tag form:

```
<tagname #id .class1 .class2 attribute=value +flag -flag | content>
```

Conventions:

- `#text` becomes `id="text"`.
- `.text` becomes a class (multiple permitted).
- `attribute=value` is self-explanatory.
- `+flag` and `-flag` set boolean attributes (`flag="true"`, `flag="false"`).
- Everything after `|` is the element's content (which may contain nested shorthand).
- The first positional argument may be "special" depending on the tag — e.g. `<cite smith2023, jones2024>` treats the first argument as a comma-separated citation key list.

### Implicit closing

Block-level tags don't require explicit closing. A new peer-level tag implicitly ends the previous one, mirroring LaTeX's `\section{}`. This is the single largest authoring affordance over raw HTML and the main reason the shorthand exists.

For example:

```
<# Introduction #intro>
Some text.

<# Methods #methods>
More text.
```

becomes:

```html
<section id="intro">
  <h1>Introduction</h1>
  <p>Some text.</p>
</section>
<section id="methods">
  <h1>Methods</h1>
  <p>More text.</p>
</section>
```

Inline tags (citations, references, inline math) do require explicit closing where ambiguity would otherwise arise, but the `| content` form typically resolves this.

### Two-register coexistence

The two registers mix freely. Use markdown for prose, drop into tag shorthand when you need attributes or academic constructs:

```
# Introduction

Standard markdown paragraph with *emphasis* and a [link](url).

<figure #elephant align=right src=elephant.jpg | An adult elephant.>

More markdown prose, with a citation <cite smith2023>.
```

The translation rule is strict: any acadamark document maps to exactly one Layer 1 HTML document. There is no ambiguity.

## Why this is not just another markdown extension

Three differences:

1. **The target is specified independently.** Layer 1 stands alone. Markdown extensions typically conflate syntax and semantics; acadamark separates them.

2. **The shorthand is uniform.** One construct (`<tag attrs | content>`) handles all cases that need attributes, instead of accreting per-feature idioms (trailing curly braces for headings, fenced divs for callouts, special prefixes for citations, etc.).

3. **The implementation rides on existing infrastructure.** Acadamark builds on the unified/remark/rehype ecosystem rather than reimplementing parsing, list handling, math rendering, syntax highlighting, etc.

## Design tensions and accepted tradeoffs

**Shorthand is less readable than plain markdown.** Acknowledged. The shorthand is more readable than HTML and more readable than markdown plus the trailing-attribute extensions that academic markdown flavors require. Where plain markdown suffices, acadamark uses it. The shorthand is reached for only when needed.

**Implicit closing differs from HTML.** Standard HTML linters may flag acadamark source. This is acceptable because acadamark source is not HTML — it compiles to HTML. Tooling for the shorthand is a separate concern from HTML tooling.

**`@` for references collides with social-media usage.** Not a real problem in academic prose. Pandoc has used `@key` for citations for years without confusion.

**Custom elements require JS for full rendering.** True, but acceptable: the project's premise is that HTML+CSS+JS is the rendering substrate. Static export to other formats (PDF, EPUB, DOCX) goes through Pandoc or similar, which handles custom elements via configuration.

## What's deliberately out of scope

- A new markdown parser. Use remark.
- A new HTML parser. Use rehype.
- A math renderer. Use KaTeX or MathJax.
- A citation formatter. Use citation-js with CSL.
- A diagram renderer. Use Mermaid.
- A code highlighter. Use Shiki or Prism.
- A PDF generator. Use Pandoc, Paged.js, or Prince downstream.

JATS export is *in* scope and is a planned deliverable (see "JATS as reference and export target" above). The project's contribution is the specification (Layer 1), the shorthand (Layer 2), the glue plugins that connect them to the existing ecosystem, and the bridge to scholarly publishing via JATS.
