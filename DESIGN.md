# Acadamark Design

This document captures the design decisions behind acadamark and the reasoning that led to them. It's intended for contributors, for future maintainers, and for the author returning after time away.

## Summary

Academic writing today means LaTeX, a markdown-extension flavor (Quarto, RMarkdown, Bookdown), or Word. The first two treat the finished rich document as something you *compile to* or *render to*, never something you work in directly; Word lets you work in it directly but leaves it structurally inert, with no clean path into the scholarly pipeline. Yet the rich-document renderer already exists, runs on every device, and needs nothing installed: the web browser. HTML is a mature, semantic document format, and the browser displays it natively. What has never been built is the *authoring* layer that would make HTML practical to write — which is the gap that sends academic writing back to those conversion pipelines.

HTML is not hard because its model is wrong. It is hard because it is verbose to type and noisy to read: every element a matched pair of tags, every attribute a quoted pair, every nesting opened and closed by hand. Markdown solved exactly that — the typing — but only for a small set of constructs, and it solved it by abandoning HTML's richness rather than compressing it. The moment a document needs a captioned and numbered figure, a citation, a sidenote, a cross-reference, markdown falls back to raw embedded HTML or to an external processor.

Acadamark is the missing authoring layer. It is a uniform shorthand for a manageable vocabulary of semantic HTML — markdown-like in ease of typing, but without markdown's ceiling and without inventing a new adornment for every feature. An acadamark document *is* HTML: the browser renders it directly, with no compile step in the path.

The project separates two things:

- **Layer 1** — the canonical semantic HTML: a defined vocabulary of custom elements and attributes for academic content. This is the archival, lossless, source-of-truth form.
- **Layer 2** — the authoring shorthand: a uniform `<tag attrs | content>` syntax that is the practical way a human types Layer 1.

The shape of the system:

```
                 ┌─────────────────────────────┐
                 │  display targets            │
                 │  · Layer 1 + CSS            │
                 │  · Layer 1 + CSS + JS       │
   ┌──────────┐  │  · render mode (lowered)    │
   │  Layer 2 │  └─────────────────────────────┘
   │ shorthand│              ▲
   │ (.acm)   │              │  display
   └──────────┘              │
        ▲                    │
        │  lossless          │
        │  round-trip        │
        ▼                    │
   ┌─────────────────────────────────┐         ┌──────────────┐
   │  Layer 1                        │ ──────► │  JATS XML    │
   │  canonical semantic HTML        │  export │  (scholarly  │
   │  (the source of truth)          │ ◄┄┄┄┄┄┄ │   interchange)│
   └─────────────────────────────────┘  import └──────────────┘
                                     (lossy, with simplifications)
```

Two relationships matter, and they are not the same. Layer 2 and Layer 1 are a **lossless round-trip**: they are one document in two notations — the shorthand is simply a faster way to type the canonical form, and any Layer 1 document can be written back as shorthand. JATS, by contrast, sits outside that loop: Layer 1 **exports** to JATS as a first-class, clean operation (this is acadamark's bridge to professional scholarly publishing), while JATS **import** into Layer 1 is supported but acknowledged-lossy — a one-way conversion that applies necessary simplifications, not a faithful reconstruction.

Everything below is the *how*. The working principles in `notes/specs/principles.md`, the delegation rules in `notes/specs/idioms.md`, and the Layer 1 vocabulary specs are implementations of what this summary states; when a design decision is in question, it should trace back to here.

## The problem

The barrier acadamark addresses is an authoring barrier. The rendering substrate — HTML+CSS+JS, running in every browser — is already capable of academic typesetting. What is missing is a layer between "rich enough to express scholarly content" and "simple enough to author and display": a manageable vocabulary of HTML conventions for academic semantics, and an ergonomic authoring syntax on top of it.

Academic typesetting today splits roughly three ways, and each leaves that authoring layer unbuilt:

- **LaTeX** is powerful and self-consistent, but fragile (compile-time failures), arcane to read, and outside the dominant web ecosystem.

- **Markdown extensions** (RMarkdown, Bookdown, Quarto, Pandoc filters) add academic features at the cost of fragmenting the markdown ecosystem. Each invents its own syntax for citations, cross-references, figure attributes, and so on. None compose with each other. Each requires its own parser, often outside the JavaScript ecosystem where the rendering ultimately happens. Extensions also accrete idioms — trailing curly-brace attributes, fenced div blocks, double-colon directives — that erode the visual simplicity that made markdown attractive in the first place.

- **Raw HTML** can express anything but is laborious to author by hand and lacks standard conventions for academic semantics. This is the verbosity problem the summary describes: HTML's model is sound, but typing and reading it by hand is the barrier.

There is also a gap on the receiving end. JATS (Journal Article Tag Suite) has become the widely accepted interchange format for scholarly articles, but JATS is an XML vocabulary with no standard display target — a JATS document is not directly readable; it needs a stylesheet or a viewer. And JATS is vast: it is built for completeness, not for authoring or for display.

## Core insight

Treat HTML as the ground truth, not the export target.

Most markdown-extension projects start from "markdown plus features" and the features are shaped by what the parser happened to make easy. Acadamark inverts this: first define the HTML conventions that express academic semantics, then design the shortest authoring path to that HTML.

This produces two layers, independently valuable:

- **Layer 1 (semantic HTML)** is a target anyone can write to. A different authoring tool, a converter from another format, or a hand-author can all produce acadamark-conformant HTML. The downstream ecosystem (rendering, export, accessibility tooling) treats it as ordinary HTML.

- **Layer 2 (shorthand)** is one possible authoring surface for Layer 1. Decoupling them means the shorthand can evolve, be replaced, or coexist with alternatives without disturbing the semantic foundation.

Two terms are used throughout this document and the project. *Rich text* is text embellished with the things ordinary documents have — bold, italic, links, tables, images. *Rich documents* are text documents that additionally carry the apparatus of scholarly writing — figures, captioned and numbered, citations, notes, cross-references, theorems, embedded math and diagrams. Layer 1 is, in essence, a vocabulary for rich documents: a set of custom HTML elements that lets a browser display the things a rich document needs and JATS already names.

## Layer 1: Semantic HTML conventions

The Layer 1 specification (see `notes/`) defines:

- **Structural elements.** Standard HTML5 (`article`, `section`, `figure`, `aside`, `nav`) wherever it suffices. Custom elements (`<sub-section>`, `<theorem>`, `<proof>`, etc.) where HTML5 is insufficient, using the native custom-elements mechanism.

- **Semantic attributes.** A defined vocabulary of `data-*` attributes for academic metadata: `data-cite-key`, `data-figure-number`, `data-ref-target`, `data-numbering-style`, etc. Standard `id` and `class` retain their normal meanings.

- **Embedded DSLs.** A convention for embedding domain-specific text (LaTeX math, ABC music notation, Mermaid diagrams, CSV tables) using fenced code blocks tagged with a language identifier, dispatched to appropriate renderers.

- **Citation and reference semantics.** Citation keys and reference lists expressed as HTML elements with defined attributes, allowing any CSL-compliant processor to format them.

- **Numbering and cross-reference semantics.** Numbered elements declare their numbering domain; references resolve against those domains in a post-parse pass.

The specification is the deliverable for Layer 1. Anyone can produce conformant HTML by any means.

Layer 1 has one further property that the rest of this document leans on heavily: it is *canonical*. It is the archival representation — custom-element-rich, semantically explicit, lossless. It is the form the JATS export reads. And it is the input to every way of displaying an acadamark document. The "Layer 1 is canonical; display is a downstream ladder" section below states this precisely and explains why it has to be so.

## JATS as reference and export target

JATS is the established XML schema for academic articles, developed by NIH/NLM and used throughout scholarly publishing. JATS has spent two decades refining a vocabulary for academic content — author lists, affiliations, abstracts, structured references, glossaries, funding statements, and much more. Acadamark does not duplicate this work.

Two principles govern acadamark's relationship to JATS:

**JATS as reference vocabulary.** When Layer 1 needs to define a new element, the JATS tag library is the first reference. Acadamark adopts JATS naming and conventions where they're sensible, recognizing that JATS is XML and acadamark is HTML — so exact transcription isn't always right, but the design decisions usually transfer. The goal is to avoid inventing worse versions of decisions JATS already got right. (See `notes/specs/layer1-naming.md` for the binding rule.)

**JATS as first-class export target.** Acadamark Layer 1 HTML compiles to JATS XML via the `rehype-acadamark-to-jats` plugin. This makes acadamark documents submittable to journals and ingestable by the scholarly publishing ecosystem (PubMed, CrossRef, archival systems) without requiring Pandoc as a runtime dependency or hand-conversion. The pitch is not "academic markdown for the web" but "academic markdown for the web that can submit to journals."

JATS import is the weaker, deliberately lossy direction. A JATS document can be converted *into* Layer 1, but the conversion applies necessary simplifications — JATS's vocabulary is far larger than Layer 1's, and constructs with no Layer 1 equivalent are reduced rather than faithfully preserved. Import is a useful on-ramp from the existing scholarly corpus; it is not a round-trip guarantee. The only lossless round-trip in the system is between Layer 2 shorthand and Layer 1, because those two are the same document in two notations.

The relationship is instructive. JATS is the vocabulary acadamark *consults* when growing Layer 1, and the format acadamark *exports* to. In effect, Layer 1 is a small, displayable, authorable projection of JATS: where JATS has 200-plus elements and no display target, Layer 1 has perhaps 30-some elements and renders directly in a browser. The point of acadamark's Layer 1 is to be the manageable set of custom HTML elements that lets most JATS-shaped documents be displayed and authored without the full weight of the XML schema.

What acadamark does *not* do, and where it differs from JATS:

- JATS is XML; acadamark is HTML. JATS documents require a stylesheet or viewer to be readable. Acadamark documents are directly browser-renderable.
- JATS has no authoring syntax. Acadamark's shorthand is what humans actually type.
- JATS rewards completeness; acadamark rewards getting started. Required JATS metadata can be filled with defaults or generated at export time.

Acadamark stays a small subset of JATS in vocabulary terms — but a subset that compiles cleanly into JATS for downstream use.

## Layer 1 is canonical; display is a downstream ladder

A question surfaces naturally once the two-layer model is in place: when an acadamark document is processed, is the output standard HTML+CSS that any browser renders with no help — or is it custom HTML that needs a little JavaScript to come fully to life?

The question is real, but it conflates two things that should be kept apart. One is *what canonical artifact does processing produce*. The other is *how does that artifact get displayed*. Standard HTML+CSS seems to answer both at once, because it is both a representation and something a browser renders natively. But that is what makes it a trap. The two questions have different answers, and separating them dissolves the apparent fork.

**The canonical artifact is Layer 1 — semantic HTML with custom elements.** This is not a fresh decision; it is the spine of everything above. Container-role naming, the named depth ladder, the JATS-as-reference rule, the entire vocabulary — all of it exists to make Layer 1 a *semantically explicit* representation. Layer 1 is the archival form, the JATS export source, and the input to every display strategy.

**Display is a separate, downstream concern, and it has three targets that form a ladder** from richest to plainest:

1. **Layer 1 + CSS, no JavaScript.** The default, and it reaches further than people expect. Browsers render unknown custom elements as generic boxes; CSS styles them without complaint. A `<section-title>` given block display and heading-sized type *is* a heading, visually. The structure of a rich document — sections, figures, captions, typography — needs no JavaScript at all.

2. **Layer 1 + CSS + conditionally-injected JavaScript.** For the things CSS genuinely cannot do: hover previews for citations, cross-reference popovers, other interactive affordances. The interpreter already works this way — it injects the hover-preview bundle only when a document actually contains notes, refs, or citations. The JavaScript is opt-in per document, by content.

3. **Render mode — a lossy lowering to plain HTML headings.** For consumers that cannot accept custom elements at all: a plain feed, an email, a context where custom-element CSS will not be loaded. Render mode lowers `<section-title>` to `<h1>`, `<sub-section-title>` to `<h2>`, and so on.

The decisive fact is the asymmetry between these. Lowering only runs one way. Layer 1 can always be projected down to plain HTML+CSS. Plain HTML+CSS can never be raised back to Layer 1, because the semantic information has been discarded — once `<section-title>` has become `<h1>`, nothing in the output records that it was ever the title of a section rather than, say, the title of the article. This is why render mode is described as *lossy*, and why it cannot be the canonical form. If the lowered HTML were canonical, the JATS export would be trying to reconstruct article-title-versus-section-title from h1-versus-h1 — exactly the distinction the lowering threw away. The JATS bridge works *because* the canonical form is the semantic one.

So "compiles to HTML" means compiles to Layer 1. How Layer 1 reaches a screen is a display-target choice, made per consumer, not per document. The answer to the original question is "both" — but the targets are not peers. One is the source; the others are projections of it.

One honest caveat belongs here. Custom elements styled with CSS carry no built-in semantics: to a screen reader, a `<section-title>` is not a heading, it is an unknown element. This is a genuine accessibility gap, and it is the strongest reason render mode is a first-class display target rather than an afterthought — lowering to real `<h1>`/`<h2>` elements restores heading semantics for assistive technology and for tools that read document outlines. But notice the gap argues for *having* a good lowering, not for making lowered HTML canonical. The fix is to ship render mode well, not to discard the semantics at the source.

## Embedded DSLs: processor delegation

Some content cannot be rendered by HTML alone — LaTeX math, ABC music notation, Mermaid diagrams, CSV tables, executable code. Acadamark handles this through a uniform mechanism: tag content the browser cannot render natively is routed, by a tag-to-processor registry, to a specialized processor that returns something the browser *can* render — HTML, SVG, or a rendered code block. The processor delegates the lexer (and the rendering); acadamark owns the tag identity and the routing.

The model is in production. Math content inside `<$ … $>` or `<$$ … $$>` is handed to KaTeX, which returns HTML. Fenced code inside `` <` … `> `` and `` <``` … ``` > `` is handed to a syntax highlighter. The tag-to-processor mapping is the DSL registry; a new processor (Mermaid, ABC, executable code) is added by extending the registry — the parser and interpreter do not need to know about the new content type. Each tag's content stays as a verbatim string through the recursive-content pass (its content handler is not `default`), so the processor receives the source exactly as the author wrote it.

Each processor has its own attribute vocabulary. CSV uses `align`, `header`; Mermaid uses `theme`, `layout`; executable Python uses `+eval`, `+echo`, `+output`. There is no global "valid processor attribute" list — what each tag accepts is what its processor accepts. A small set of attributes converges by convention because they describe the *output* rather than the engine: `caption`, `id`, `class`, `align`, `width`, `height`. Engines free-pass options they do not apply.

Source language and display target are fused in the current model: `<csv>` means both "the source is CSV" and "render as a table"; `<mermaid>` means "the source is Mermaid" and "render as a diagram." This works for the common cases. A future split — `<csv #data> … </csv>` plus `<chart source=#data type=bar>` — would let the same data drive multiple displays; it is a natural extension when the need surfaces, not a redesign.

The processor-delegation model is the structural counterpart of the lexer-delegation principle in `notes/specs/idioms.md`. There, remark provides the lexer for markdown constructs and acadamark owns the node identity; here, a specialized processor provides the rendering for non-native content and acadamark owns the tag identity and the routing. The two principles are the same shape — observed, not invented as a meta-principle: delegate the specialized work, own the vocabulary.

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
- `@key` is a reference: `<ref @fig:elephant>`, `<cite @smith2023>`. The `@` always means "refers to an id"; `#` always means "assigns an id."
- Everything after `|` is the element's content, which may contain nested shorthand.

### Implicit closing

Block-level tags don't require explicit closing. A new peer-level tag implicitly ends the previous one, mirroring LaTeX's `\section{}`. This is the single largest authoring affordance over raw HTML and the main reason the shorthand exists.

For example:

```
<# #intro | Introduction #>
Some text.

<# #methods | Methods #>
More text.
```

becomes (in semantic mode):

```html
<section id="intro">
  <section-title>Introduction</section-title>
  <p>Some text.</p>
</section>
<section id="methods">
  <section-title>Methods</section-title>
  <p>More text.</p>
</section>
```

Inline tags (citations, references, inline math) do require explicit closing where ambiguity would otherwise arise, but the `| content` form typically resolves this.

### Two-register coexistence

The two registers mix freely. Use markdown for prose, drop into tag shorthand when you need attributes or academic constructs:

```
# Introduction

Standard markdown paragraph with *emphasis* and a [link](url).

<figure #fig:elephant align=right src=elephant.jpg | An adult elephant.>

More markdown prose, with a citation <cite @smith2023>.
```

The translation rule is strict: any acadamark document maps to exactly one Layer 1 HTML document. There is no ambiguity. And because the mapping is exact, it runs both ways — Layer 1 can be expressed back as shorthand without loss. This is the lossless round-trip the summary describes.

## Why this is not just another markdown extension

Three differences:

1. **The target is specified independently.** Layer 1 stands alone, and it is canonical. Markdown extensions typically conflate syntax and semantics; acadamark separates them, and keeps the semantic form — not a display projection of it — as the source of truth.

2. **The shorthand is uniform.** One construct (`<tag attrs | content>`) handles all cases that need attributes, instead of accreting per-feature idioms (trailing curly braces for headings, fenced divs for callouts, special prefixes for citations, etc.).

3. **The implementation rides on existing infrastructure.** Acadamark builds on the unified/remark/rehype ecosystem rather than reimplementing parsing, list handling, math rendering, syntax highlighting, etc.

### Why the unified ecosystem

The parser-substrate decision had three candidates: continue the original regex prototype, hand-write a grammar (Peggy or Chevrotain), or build on unified/remark/rehype. Each is briefly:

- **Regex.** Familiar, and existing prototype code worked for some cases. But the approach doesn't scale: edge cases break, list handling has to be rebuilt, every new feature reinvents wheels remark already has.
- **Hand-written grammar.** Clean grammar file, full control over the syntax. But the cost is rebuilding everything around it — lists, tables, math integration, syntax highlighting — outside the JS ecosystem where rendering ultimately happens.
- **Unified plugins.** Acadamark inherits markdown parsing, lists, tables, math, syntax highlighting, footnotes, GFM autolinks. The novel work (shorthand syntax, citations, cross-references, section nesting) maps cleanly onto the plugin model. The learning curve is the AST mental model.

The unified ecosystem is what acadamark uses. The project's surface area shrinks dramatically because most of what acadamark needs already exists as plugins. The "rediscovering the wheel" motto applies directly: unified is the wheel.

### The JATS export plugin

`rehype-acadamark-to-jats` takes a Layer 1 hast tree and produces JATS XML. Most mappings are 1:1 element renames; a minority require restructuring. For example, acadamark's flat-then-nested section model maps cleanly onto JATS's recursive `<sec>` model, but acadamark's `<article-title>` plus `<article-subtitle>` becomes JATS's `<title-group>` containing `<article-title>` and `<subtitle>`. Required JATS metadata is padded with sensible defaults or explicit author-provided values from a `<meta>` block. The acadamark-to-JATS mapping table is the heart of the plugin, and it is small — a few dozen entries — because the Layer 1 vocabulary is itself small. This is what makes acadamark a credible scholarly-publishing target rather than just "another web markdown."

## Design tensions and accepted tradeoffs

**Shorthand is less readable than plain markdown.** Acknowledged. The shorthand is more readable than HTML and more readable than markdown plus the trailing-attribute extensions that academic markdown flavors require. Where plain markdown suffices, acadamark uses it. The shorthand is reached for only when needed.

**Implicit closing differs from HTML.** Standard HTML linters may flag acadamark source. This is acceptable because acadamark source is not HTML — it compiles to HTML. Tooling for the shorthand is a separate concern from HTML tooling.

**`@` for references collides with social-media usage.** Not a real problem in academic prose. Pandoc has used `@key` for citations for years without confusion.

**Custom elements have no built-in semantics without help.** A custom element styled by CSS displays correctly but is, to a screen reader or an outline tool, semantically inert. Acadamark accepts this as the cost of a semantically explicit canonical form, and answers it with the display ladder: the default target adds CSS, and render mode lowers custom elements to their plain-HTML equivalents where real heading semantics are needed. Static export to other formats (PDF, EPUB, DOCX) goes through Pandoc or similar, which handles custom elements via configuration. The accessibility gap is met by lowering, not by abandoning the semantic vocabulary.

**The interpreter does not call `customElements.define()`.** Layer 1 elements (`<note-list>`, `<article-body>`, `<article-front>`, …) are emitted as raw custom HTML elements; browsers treat them as instances of `HTMLElement` with no built-in behavior. CSS targeting works; ARIA semantics and JavaScript behavior do not exist by default. This is intentional: registering custom elements is an application-layer concern, and the host application or theme is the right place to do it. The interpreter's job is to emit semantically explicit HTML; turning a `<note-list>` into a behaviorally rich element is a downstream choice that depends on the host context.

**Cross-references resolve only to colon-ids.** The cross-reference registry indexes targets by colon-id (`fig:scatter`, `eqn:model`, `sec:methods`) — the `type:name` convention — not by every id in the document. A `<ref #figure-3>` against a non-colon id produces a `ref-error` even if `figure-3` is a valid id elsewhere. This is intentional and is the reason the colon convention exists: colon-ids unambiguously identify a referenceable target across types, and the labelled-target/free-id distinction lets authors use ordinary ids for non-referenceable hooks (URL anchors, CSS targets) without crowding the cross-reference namespace. The convention is the price authors pay for unambiguous cross-references.

## Design directions (discovered through implementation)

The sections above describe acadamark's design as it was conceived. Building the system surfaced a further set of directions — principles that weren't obvious at the outset but became clear once real documents were being authored and rendered. They are recorded here because they guide ongoing work. Open items that bear on these directions live in `BACKLOG-ROADMAP.md`; `notes/archive/design-directions-2026-05.md` retains the fuller implementation-level version with its DD-numbering.

**Content gets parsed; arguments don't.** A value's syntactic form — keyword argument, positional, pipe-content, child element — is incidental. What matters is its semantic role. *Arguments* are configuration: `citation-style="apa"`, `placement="end"`, `src="refs.bib"`. They are opaque strings or enumerations and pass through the pipeline uninterpreted. *Content* is authored prose-and-structure that may contain nested tags, citations, math, or emphasis, and must be parsed recursively. The trap is content-shaped values that happen to be written as keyword arguments — a `caption="..."` containing a `<cite>` is content wearing an argument's clothing, and must be parsed as such. The direction: vocabulary entries declare each keyword argument's role, and the interpreter treats `role: content` arguments the same as child nodes.

**Caption-bearing elements support two equivalent forms.** Elements like figures, tables, and code blocks carry both metadata (id, format hint) and content-like material (caption, alt text). Authors should be able to choose a compact form, where the caption is a keyword argument, or an explicit form, where the caption is a child element — and both produce identical output. The compact form suits brief captions; the explicit form suits captions with rich content or elements with several content sections. This generalizes the previous direction: the explicit form is simply the case where content-shaped material is given its own element rather than an argument slot.

**`<meta>` is for metadata; `<config>` is for options.** Two document-level constructs with a boundary that must stay sharp. `<meta>` holds metadata that appears in or shapes the rendered document — title, author, date, affiliations, abstract — and is JATS-like in spirit. `<config>` holds processing options that never render — citation style, numbering preferences, theme settings. Each should validate the attributes it accepts rather than silently absorbing the other's. Blurring them produces silent failure: a title placed in `<config>` simply vanishes.

**All tag forms work for every tag where they make sense.** The shorthand grammar admits several tag forms — short, pipe-content, multi-line pipe-content, long-form nesting, self-closing. The principle is that for any given tag, every form that is *semantically* meaningful should *actually* work, and produce equivalent output. Where a form is silently broken for some tags but not others, authors have no way to know the rule, and the uniformity that justifies the shorthand erodes. The direction: vocabulary entries declare which forms each tag supports, tests cover each declared form, and parser-level conflicts that block a declared form are treated as bugs.

**Standalone HTML is the build target; client-side rendering is the future target.** This direction concerns *when* processing happens, a separate axis from the *what form* question settled by the display ladder above. The pipeline today produces self-contained HTML at build time — every document carries its own CSS, fonts, rendered citations, and interactive infrastructure, so it can be emailed, archived, or read offline and render identically anywhere. That does not change. But a further target is full client-side rendering: an `.acm` source file loaded directly in a browser, parsed and rendered without a build step, in the spirit of JupyterLite. Reaching it means the parser, the plugin pipeline, and the handlers must all run in the browser, not only in Node. This is not current work, but it shapes current decisions — plugin code stays framework-agnostic, pure where possible, and free of Node-specific APIs, so the eventual port is a migration rather than a rewrite.

**Markdown forms are shorthand for the canonical acadamark form.** Several constructs exist in both registers — `$x$` and `<$ x $>`, a GFM pipe table and `<table>`, `# Heading` and `<# ... #>`. Where a construct exists in both, the acadamark form is canonical and the markdown form is *surface shorthand for it*, not an independent parallel path. This refines the delegation principle by drawing a line through the middle of it. Delegation still holds for *tokenizing*: finding `$x$` in a stream of text is hard, remark already does it well, and acadamark does not reimplement it — that would be reinventing a working wheel. But delegation does **not** extend to *node identity*. When remark's tokenizer finds a markdown construct that has an acadamark equivalent, the resulting standard node (`inlineMath`, `table`, `heading`, ...) is rewritten into its canonical `acadamarkTag` form by a normalization pass, before any structural or semantic plugin runs. Downstream of normalization, only the acadamark form exists; every later plugin — numbering, cross-references, asset detection, the eventual JATS export — sees one node type per construct, not two. The markdown spelling is genuinely just a faster way to type the canonical thing. The split is: *delegate the lexer, own the node identity.* Reusing remark's finder is not reinventing the wheel; accepting remark's name for what it found would be ceding the vocabulary, and the vocabulary is the project. This also makes the remark dependency shrink gracefully over time rather than by a hard cut: a markdown construct stays delegated as long as remark's tokenizer is an adequate wheel for it, and acadamark supersedes at the lexer level only for a specific construct, only when remark's coverage is genuinely inadequate and a deliberate decision is made — never reflexively. The principle is universal in intent: it governs every markdown/acadamark overlap. Its implementation is incremental: the normalization pass grows one construct at a time, and a construct not yet covered is a not-yet-done item, never a decision that it was meant to stay a separate path.

## What's deliberately out of scope

- A new markdown parser. Use remark.
- A new HTML parser. Use rehype.
- A math renderer. Use KaTeX or MathJax.
- A citation formatter. Use citation-js with CSL.
- A diagram renderer. Use Mermaid.
- A code highlighter. Use Shiki or Prism.
- A PDF generator. Use Pandoc, Paged.js, or Prince downstream.

JATS export is *in* scope (see "JATS as reference and export target" above). Render mode — the lossy lowering of Layer 1 to plain HTML headings — is also *in* scope: it is the third rung of the display ladder, not a discarded alternative to it. The project's contribution is the specification (Layer 1, the canonical semantic form), the shorthand (Layer 2), the glue plugins that connect them to the existing ecosystem, the display targets that render Layer 1 for different consumers, and the bridge to scholarly publishing via JATS.
