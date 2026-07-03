# Enscribe Design

This document captures the design decisions behind enscribe and the reasoning that led to them. It's intended for contributors, for future maintainers, and for the author returning after time away.

## Summary

Academic writing today means LaTeX, a markdown-extension flavor (Quarto, RMarkdown, Bookdown), or Word. The first two treat the finished rich document as something you *compile to* or *render to*, never something you work in directly; Word lets you work in it directly but leaves it structurally inert, with no clean path into the scholarly pipeline. Yet the rich-document renderer already exists, runs on every device, and needs nothing installed: the web browser. HTML is a mature, semantic document format, and the browser displays it natively. What has never been built is the *authoring* layer that would make HTML practical to write — which is the gap that sends academic writing back to those conversion pipelines.

HTML is not hard because its model is wrong. It is hard because it is verbose to type and noisy to read: every element a matched pair of tags, every attribute a quoted pair, every nesting opened and closed by hand. Markdown solved exactly that — the typing — but only for a small set of constructs, and it solved it by abandoning HTML's richness rather than compressing it. The moment a document needs a captioned and numbered figure, a citation, a sidenote, a cross-reference, markdown falls back to raw embedded HTML or to an external processor.

Enscribe is the missing authoring layer. It is a uniform shorthand for a manageable vocabulary of semantic HTML — markdown-like in ease of typing, but without markdown's ceiling and without inventing a new adornment for every feature. An enscribe document *is* HTML: the browser renders it directly, with no compile step in the path.

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
   │ (.emd)   │              │  display
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

Source files carry the `.emd` extension — the canonical short form — with `.enscribe` accepted as a long-form alias. The extension is a labelling convention only: the parser operates on source text and never dispatches on a file extension, so an enscribe document is recognized by its content, not its filename.

Two relationships matter, and they are not the same. Layer 2 and Layer 1 are a **lossless round-trip**: they are one document in two notations — the shorthand is simply a faster way to type the canonical form, and any Layer 1 document can be written back as shorthand. JATS, by contrast, sits outside that loop: Layer 1 **exports** to JATS as a first-class, clean operation (this is enscribe's bridge to professional scholarly publishing), while JATS **import** into Layer 1 is supported but acknowledged-lossy — a one-way conversion that applies necessary simplifications, not a faithful reconstruction.

> Note: "first-class" here predates the "reference standards: guide, don't gate" decision (`notes/decisions.md`); JATS is now positioned alongside TEI / Scholarly HTML as a reference standard, not a first-class gate. The architecture prose will be reconciled with the interop-cluster work.

Everything below is the *how*. The working principles in `notes/specs/principles.md`, the delegation rules in `notes/specs/idioms.md`, and the Layer 1 vocabulary specs are implementations of what this summary states; when a design decision is in question, it should trace back to here.

## The problem

The barrier enscribe addresses is an authoring barrier. The rendering substrate — HTML+CSS+JS, running in every browser — is already capable of academic typesetting. What is missing is a layer between "rich enough to express scholarly content" and "simple enough to author and display": a manageable vocabulary of HTML conventions for academic semantics, and an ergonomic authoring syntax on top of it.

Academic typesetting today splits roughly three ways, and each leaves that authoring layer unbuilt:

- **LaTeX** is powerful and self-consistent, but fragile (compile-time failures), arcane to read, and outside the dominant web ecosystem.

- **Markdown extensions** (RMarkdown, Bookdown, Quarto, Pandoc filters) add academic features at the cost of fragmenting the markdown ecosystem. Each invents its own syntax for citations, cross-references, figure attributes, and so on. None compose with each other. Each requires its own parser, often outside the JavaScript ecosystem where the rendering ultimately happens. Extensions also accrete idioms — trailing curly-brace attributes, fenced div blocks, double-colon directives — that erode the visual simplicity that made markdown attractive in the first place.

- **Raw HTML** can express anything but is laborious to author by hand and lacks standard conventions for academic semantics. This is the verbosity problem the summary describes: HTML's model is sound, but typing and reading it by hand is the barrier.

There is also a gap on the receiving end. JATS (Journal Article Tag Suite) has become the widely accepted interchange format for scholarly articles, but JATS is an XML vocabulary with no standard display target — a JATS document is not directly readable; it needs a stylesheet or a viewer. And JATS is vast: it is built for completeness, not for authoring or for display.

## Core insight

Treat HTML as the ground truth, not the export target.

Most markdown-extension projects start from "markdown plus features" and the features are shaped by what the parser happened to make easy. Enscribe inverts this: first define the HTML conventions that express academic semantics, then design the shortest authoring path to that HTML.

This produces two layers, independently valuable:

- **Layer 1 (semantic HTML)** is a target anyone can write to. A different authoring tool, a converter from another format, or a hand-author can all produce enscribe-conformant HTML. The downstream ecosystem (rendering, export, accessibility tooling) treats it as ordinary HTML.

- **Layer 2 (shorthand)** is one possible authoring surface for Layer 1. Decoupling them means the shorthand can evolve, be replaced, or coexist with alternatives without disturbing the semantic foundation.

Two terms are used throughout this document and the project. *Rich text* is text embellished with the things ordinary documents have — bold, italic, links, tables, images. *Rich documents* are text documents that additionally carry the apparatus of scholarly writing — figures, captioned and numbered, citations, notes, cross-references, theorems, embedded math and diagrams. Layer 1 is, in essence, a vocabulary for rich documents: a set of custom HTML elements that lets a browser display the things a rich document needs and JATS already names.

## Layer 1: Semantic HTML conventions

The Layer 1 specification (see `notes/`) defines:

- **Structural elements.** Standard HTML5 (`article`, `section`, `figure`, `aside`, `nav`) wherever it suffices. Custom elements (`<sub-section>`, `<theorem>`, `<proof>`, etc.) where HTML5 is insufficient, using the native custom-elements mechanism. (Figures use HTML5's native `<figure>`; `<fig>` is retained as its JATS export name and an authoring alias — see "Frameable elements" below.)

- **Semantic attributes.** A defined vocabulary of `data-*` attributes for academic metadata: `data-cite-key`, `data-figure-number`, `data-ref-target`, `data-numbering-style`, etc. Standard `id` and `class` retain their normal meanings.

- **Embedded DSLs.** A convention for embedding domain-specific text (LaTeX math, ABC music notation, Mermaid diagrams, CSV tables) using fenced code blocks tagged with a language identifier, dispatched to appropriate renderers.

- **Citation and reference semantics.** Citation keys and reference lists expressed as HTML elements with defined attributes, allowing any CSL-compliant processor to format them.

- **Numbering and cross-reference semantics.** Numbered elements declare their numbering domain; references resolve against those domains in a post-parse pass.

The specification is the deliverable for Layer 1. Anyone can produce conformant HTML by any means.

Layer 1 has one further property that the rest of this document leans on heavily: it is *canonical*. It is the archival representation — custom-element-rich, semantically explicit, lossless. It is the form the JATS export reads. And it is the input to every way of displaying an enscribe document. The "Layer 1 is canonical; display is a downstream ladder" section below states this precisely and explains why it has to be so.

## JATS as reference and export target

JATS is the established XML schema for academic articles, developed by NIH/NLM and used throughout scholarly publishing. JATS has spent two decades refining a vocabulary for academic content — author lists, affiliations, abstracts, structured references, glossaries, funding statements, and much more. Enscribe does not duplicate this work.

Two principles govern enscribe's relationship to JATS:

**JATS as reference vocabulary.** When Layer 1 needs to define a new element, the JATS tag library is the first reference. Enscribe adopts JATS naming and conventions where they're sensible, recognizing that JATS is XML and enscribe is HTML — so exact transcription isn't always right, but the design decisions usually transfer. The goal is to avoid inventing worse versions of decisions JATS already got right. (See `notes/specs/layer1-naming.md` for the binding rule.)

**JATS as first-class export target.** Enscribe Layer 1 HTML compiles to JATS XML via the CLI's `enscribeToJats` exporter. This makes enscribe documents submittable to journals and ingestable by the scholarly publishing ecosystem (PubMed, CrossRef, archival systems) without requiring Pandoc as a runtime dependency or hand-conversion. The pitch is not "academic markdown for the web" but "academic markdown for the web that can submit to journals."

JATS import is the weaker, deliberately lossy direction. A JATS document can be converted *into* Layer 1, but the conversion applies necessary simplifications — JATS's vocabulary is far larger than Layer 1's, and constructs with no Layer 1 equivalent are reduced rather than faithfully preserved. Import is a useful on-ramp from the existing scholarly corpus; it is not a round-trip guarantee. The only lossless round-trip in the system is between Layer 2 shorthand and Layer 1, because those two are the same document in two notations.

The relationship is instructive, and its *direction* matters. JATS is the vocabulary enscribe *consults* when growing Layer 1, and the format enscribe *exports* to — but it does not *shape* Layer 1. **Layer 1 is HTML-shaped, not JATS-shaped.** An enscribe document is HTML internally, authored through the registers; its HTML render is a (near-)identity projection rather than a translation, and JATS export is the translation — a first-class feature, not the mission. The mission is rich documents that render as HTML; JATS is a feature reached *from* that base, so the translation cost belongs on the export, not the render. Where JATS has 200-plus XML elements and no display target, Layer 1 is a manageable set of HTML elements that render directly in a browser and translate cleanly to JATS on export. (This reframes an earlier "Layer 1 is a projection of JATS" framing; the migration to a fully HTML-shaped vocabulary is tracked in [#147](https://github.com/enscribejs/enscribe/issues/147) and is described honestly in "The vocabulary-boundary principle" below.)

What enscribe does *not* do, and where it differs from JATS:

- JATS is XML; enscribe is HTML. JATS documents require a stylesheet or viewer to be readable. Enscribe documents are directly browser-renderable.
- JATS has no authoring syntax. Enscribe's shorthand is what humans actually type.
- JATS rewards completeness; enscribe rewards getting started. Required JATS metadata can be filled with defaults or generated at export time.

Enscribe stays a small subset of JATS in vocabulary terms — but a subset that compiles cleanly into JATS for downstream use.

## The vocabulary-boundary principle

The Layer 1 vocabulary holds *document ideas* — HTML-shaped, semantic, archival. It does **not** hold web-presentation artifacts. The test for whether something belongs in the vocabulary is one question: *is it a property of the document, or of how some channel happens to display the document?* If it is a property of the document, it is a Layer 1 candidate. If it is a property of a display channel — a thumbnail for social-media sharing, a favicon, an Open Graph image, a per-platform render hint — it does not belong in Layer 1 even if a renderer would find it useful.

The principle keeps Layer 1 small and HTML-shaped. The vocabulary's job is to be the archival representation of the document; presentation artifacts that decorate one delivery channel are correctly held elsewhere (build configuration, theme assets, per-target metadata files), not in the source-of-truth vocabulary.

**The semantic-gap rule (what "HTML-shaped" means concretely).** HTML is rich for *structure* — lists, sections, figures, tables have direct elements — and thin for *scholarly semantics* — citations, cross-references, affiliations have no native element. The rule the vocabulary follows: **use the real HTML element where one exists; a `<span>` / `<div>` carrying a class and `data-*` attributes where it does not.** A list is `<ul>`/`<ol>`/`<li>`, not a custom `<list>` in the output; a citation, which HTML cannot name, is a classed element with `data-*` metadata. This is exactly the surface JATS export reads back to translate — the class and `data-*` are what carry the document idea across the gap.

**Migration state — honest.** This is the *decided direction*, not a finished state. As of v0.4.0, **lists are the inaugural case**: `<list>` / `<li>` author the construct and lower to plain `<ul>` / `<ol>` / `<li>`. **Figures are the second migrated group** ([#147](https://github.com/enscribejs/enscribe/issues/147)): the canonical Layer 1 element is HTML-native `<figure>` / `<figcaption>` (the figure handler already emits it), with `<fig>` retained as the JATS export name and an authoring alias. The rest of the vocabulary — sections, the semantic-only elements — still renders as custom Layer 1 elements today and migrates element-group by element-group under the tracking epic, [#147](https://github.com/enscribejs/enscribe/issues/147), each step gated by two byte-identical invariants (the HTML render and the JATS export must not change). The model is the target the vocabulary is moving toward; it is not yet fully realized.

**Worked example:** `<thumbnail>` was considered during the deferred-vocabulary scoping and ruled out under this principle. A thumbnail image used for social-media link previews is a property of how one channel (a social platform's link unfurler) displays a pointer *to* the document; it is not a property of the document itself. The same author considering "what would my document need?" does not name a thumbnail; only the consideration "what does Twitter need to make this link pretty?" produces one. That distinction is the principle in action.

The principle does not prevent presentation concerns from being addressed by enscribe — they are addressed by the display ladder (next section), by theme CSS, and by per-target export configuration. It only governs the *vocabulary*: what gets a Layer 1 entry, and what does not.

## Layer 1 is canonical; display is a downstream ladder

A question surfaces naturally once the two-layer model is in place: when an enscribe document is processed, is the output standard HTML+CSS that any browser renders with no help — or is it custom HTML that needs a little JavaScript to come fully to life?

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

Some content cannot be rendered by HTML alone — LaTeX math, ABC music notation, Mermaid diagrams, CSV tables, executable code. Enscribe handles this through a uniform mechanism: tag content the browser cannot render natively is routed, by a tag-to-processor registry, to a specialized processor that returns something the browser *can* render — HTML, SVG, or a rendered code block. The processor delegates the lexer (and the rendering); enscribe owns the tag identity and the routing.

The model is in production. Math content inside `<$ … $>` or `<$$ … $$>` is handed to KaTeX, which returns HTML. Fenced code inside `` <` … `> `` and `` <``` … ``` > `` is handed to a syntax highlighter. The tag-to-processor mapping is the DSL registry; a new processor (Mermaid, ABC, executable code) is added by extending the registry — the parser and interpreter do not need to know about the new content type. Each tag's content stays as a verbatim string through the recursive-content pass (its content handler is not `default`), so the processor receives the source exactly as the author wrote it.

Each processor has its own attribute vocabulary. CSV uses `align`, `header`; Mermaid uses `theme`, `layout`; executable Python uses `+eval`, `+echo`, `+output`. There is no global "valid processor attribute" list — what each tag accepts is what its processor accepts. A small set of attributes converges by convention because they describe the *output* rather than the engine: `caption`, `id`, `class`, `align`, `width`, `height`. Engines free-pass options they do not apply.

The processor-delegation model is the structural counterpart of the lexer-delegation principle in `notes/specs/idioms.md`. There, remark provides the lexer for markdown constructs and enscribe owns the node identity; here, a specialized processor provides the rendering for non-native content and enscribe owns the tag identity and the routing. The two principles are the same shape — observed, not invented as a meta-principle: delegate the specialized work, own the vocabulary.

A tag like `<csv>` quietly names two independent things at once: a **source language** (the bytes are CSV) and a **display host** (render them as a table); `<mermaid>` likewise fuses "the source is Mermaid" with "show it as a diagram." Naming those two separately — a host, a language, and a binding between them — is the principled form of this model, and the fused standalone tags become shorthands for the bound form rather than disappearing. Letting a single source drive *several* displays (`<csv #data>` feeding both a table and a `<chart source=#data>`) is a further reuse along the language axis — a natural extension when the need surfaces, not a redesign. The two axes are set out below.

### The two axes: host and language

Every DSL tag resolves on two independent axes, and the **format word** — the leading positional — is the binding between them.

**The language axis: the registry as a type system.** Each embedded language is a *type*, in the sense a mimetype is a type: `text/csv`, `application/x-tex`, `image/svg+xml`. The DSL registry is the type registry. A language registers not in the abstract but against one or more **`(purpose, host)`** bindings — pairs of "what is this content *for*" and "which host element may carry it." There are three purposes: **display** (render the content to a visual form — a table, a diagram, typeset math), **storage** (hold a structured payload for the document machinery to consume — a bibliography library), and **evaluation** (run the content — executable code). Purpose is never authored: it is *derived from the host* — a `table` host is display, a `data`/`library` host is storage, a code-output host is evaluation — and it lives in the registration only so the system knows which hosts a language is legal in. A declarative spec language (Vega-Lite, say) is a **display** language: enscribe renders the spec, exactly as it renders Mermaid source. It is not evaluation — **evaluation** is reserved for content that is actually run. (Concretely, the binding is realized as the **host's accept-set** — the host→language direction admission actually needs; an explicit per-language `(purpose, host)` binding record was built and then removed as redundant once the accept-set carried the load, #85.)

**The host axis: the role apparatus.** The host is the Layer 1 vocabulary element — `table`, `diagram`, `math`, `fig`, `code`, `data`/`library`. The host, not the language, carries the document *role*: the counter and caption, the JATS counterpart, the cross-reference type, frameable membership. And each host **owns its accept-set** — the languages it will admit. This names existing structure, not a new one: the table host's admitted formats already live in the table handler, which is their source of truth.

**The format word binds the two.** `<diagram mermaid>` reads as "the *diagram* host, rendered by the *mermaid* language"; `<table csv>` as "the *table* host, parsed by the *csv* language." Adding a diagram engine — D2, Graphviz, PlantUML — is a new word on the language axis, admitted by the diagram host's accept-set, not a new vocabulary element. The vocabulary grows on the language axis; the host axis stays small.

**`<svg>` is not a special case.** SVG is a display language whose display handler is *passthrough*: the source bytes are already the rendered form and the browser draws SVG natively, where Mermaid's display handler invokes a JavaScript library to produce the rendered form. "Render natively" versus "invoke a library" is a per-language property of the display handler, not an exception in the model — both are display languages on a host. SVG content is framed (gets a caption and number) only when authored as a frameable, by the ordinary frameable rule; there is no defer-to-HTML carve-out.

**`<code>` is a show-not-render host.** Code's "language" — JavaScript, Python, Rust — selects a *highlighter grammar*, drawn from the syntax highlighter's own vocabulary, not from this render registry. The code host *shows* its source (optionally highlighted) rather than rendering or parsing it into another form, so it sits outside the host/language binding: its language is chosen by `lang=` or the fenced ` ```js ` idiom, on a different type system entirely. This is why the leading-positional format word does not apply to `<code>`.

**Standalone tags are shorthands; languages are permanent.** A fused standalone tag (`<mermaid>`, `<csv>`) is a shorthand that expands to its bound `(host, language)` form, kept permanently the way the markdown idioms are kept. Retiring such a tag retires only *the tag* — the language stays first-class in the registry, free to be hosted elsewhere. The language axis and the tag namespace are independent.

**The documented exception — the math environments.** Not every standalone tag is a fused shorthand. The LaTeX-math environment tags (`<matrix>`, `<cases>`, `<align>`, `<eqnarray>`) stay standalone rather than collapsing into `<math …>` languages: each is single-engine and source-compatible with `\begin{…}`, so it reads best as a dedicated tag, and the familiarity is worth more than the symmetry. They are the deliberate exception to the format-word collapse (`notes/specs/format-words.md`).

The per-host mechanics — how a host owns and is validated against its accept-set, the shorthand-expansion and clobber rules, and the reserved scoping syntax — are specified in `notes/specs/format-words.md`. This section owns the architecture; that document owns the subsystem.

### DSL handlers: included vs external

Enscribe's DSL handlers fall into two categories, distinguished by who owns the rendering — enscribe itself, or an external library:

- **Included DSLs.** The rendering primitive lives in enscribe's own vocabulary and pipeline: the handler renders source to final output using machinery enscribe owns and always bundles, and that output is included in enscribe's HTML. Examples: `<math>` and the math-environment tags (KaTeX); `<csv>`/`<tsv>` (Layer-1 tables); `<code>` and the code sigils. The output works without client JavaScript and enscribe owns the rendering end-to-end.

- **External DSLs.** enscribe does not own the rendering and never parses the DSL's semantics into the core; it delegates to an external library. The handler always emits the pass-through markup contract (a wrapper carrying `class` and `data-enscribe-dsl`). Each external DSL's registry entry additionally declares how enscribe can render it on the publisher's behalf, and the publisher chooses per DSL among three modes: **skip** (default) — emit only the contract, the publisher wires rendering; **live** — also emit the external library (inlined or CDN-linked) so the browser renders the contract markup at view time; **static** — invoke the external library at build time (an optional, opt-in dependency) and inline the resulting SVG. Examples: `<mermaid>` (live only) and `<abc>` (live or static). In every mode the semantics stay external; only *when* rendering happens and *who* triggers it differ.

The distinction reflects an architectural reality: some rendering libraries are designed for the browser (DOM-dependent, layout-aware, SVG-generating) and are awkward to run in Node. External DSLs honestly delegate to those libraries in their native environment rather than dragging heavyweight browser-shaped dependencies into the enscribe build. The libraries that back live and static mode are optional dependencies declared per DSL in the registry; the default build (skip mode) pulls none of them, so the engine stays lean unless the publisher asks enscribe to do the rendering. Not every DSL offers every mode — Mermaid's only browserless path needs a headless browser, so enscribe registers it live-only; abc registers both.

Both categories use `interpreter_strategy: handler` in their vocab entries; the category is a property of what the handler does (resolve to final output vs. wrap source in marked markup), not a separate schema field. External-DSL handlers emit a wrapper element with a `data-enscribe-dsl="<name>"` attribute — the contract for downstream build-time tooling that wants to find external-DSL blocks unambiguously, independent of CDN-specific class conventions. The wrapper's class also matches the upstream library's CDN scanning convention where one exists (e.g. `class="mermaid"` for Mermaid) so a consumer who drops in `<script src="cdn/mermaid">` gets working in-browser rendering with no extra wiring.

### Citation formatting is delegated to citation-js / CSL

A specific application of the delegation pattern: **citation formatting, ordering, and style questions are delegated to citation-js / CSL — enscribe does not reimplement or override them.** Bibliography rendering, cluster ordering, author-name disambiguation, "ibid" suppression, locale-specific punctuation, and every other citation-presentation concern is the CSL style's job; enscribe hands the citation keys and the chosen style to citation-js and accepts the result. This is what makes "any CSL-compliant processor" interchangeable with citation-js in principle: enscribe holds only the citation keys and the user-chosen style name, both standard CSL inputs.

The practical consequence: an authoring-side request that would *override* a CSL convention is not an enscribe concern. The canonical example is within-cluster citation ordering — CSL styles sort cluster items by their own internal rules (typically alphabetical-by-author); preserving author input order against that sort would require either overriding the CSL style's XML or patching citation-js. Both are out of scope by this principle. The author who needs a non-CSL ordering chooses a CSL style that produces it, or hand-formats the cluster as prose rather than as a `<cite>`. Enscribe stays on the CSL side of that boundary.

## Layer 2: Authoring shorthand

Two registers, both compiling to Layer 1.

### Register A: Markdown-like

Standard CommonMark works for paragraphs, emphasis, links, lists, fenced code, and headings. Where markdown is sufficient, enscribe uses markdown unmodified.

### Register B: Tag shorthand

For anything requiring attributes or academic semantics, enscribe uses a uniform tag form:

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

### Tag forms

Enscribe tags appear in three syntactic forms:

1. **Pipe form** — `<tag attrs | content>` — short-form with body content. The pipe marks the start of body content; the closing `>` terminates the tag.
2. **Slash form** — `<tag attrs />` — short-form with no body content. Covers void tags (`<hr />`, `<br />`) and attribute-only tags (`<cite @ref />`, `<ref @key />`). The `/` before `>` marks the tag as self-closing.
3. **Long form** — `<tag attrs>content</tag>` — content bounded by an explicit closing tag.

The parser disambiguates short-form from long-form by the presence of `|` or `/` before the closing `>`. No registry consultation, no vocabulary lookup, no lookahead. A tag with neither `|` nor `/` is unambiguously a long-form opener.

All three forms work for every tag where they make sense. Void tags (`<hr />`, `<br />`) are typically authored in slash form only — long form has no useful content to put inside. Attribute-only tags like `<cite>` and `<ref>` are typically slash form when no body content is needed. Container tags like `<aside>`, `<theorem>`, `<dl>` are typically long form when their body is multiple paragraphs or nested children, and pipe form when the body is short inline content. The choice is the author's; the parser accepts all three for any tag.

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

Inline tags (citations, references, inline math) are typically authored in pipe form (`<cite | @smith2023>`) or slash form (`<cite @smith2023 />`) when used at flow position; the three-form grammar is locally unambiguous regardless of the tag, so the author's choice depends on readability rather than parser constraint.

### Two-register coexistence

The two registers mix freely. Use markdown for prose, drop into tag shorthand when you need attributes or academic constructs:

```
# Introduction

Standard markdown paragraph with *emphasis* and a [link](url).

<fig #fig:elephant align=right source=elephant.jpg | An adult elephant.>

More markdown prose, with a citation <cite @smith2023>.
```

The translation rule is strict: any enscribe document maps to exactly one Layer 1 HTML document. There is no ambiguity. And because the mapping is exact, it runs both ways — Layer 1 can be expressed back as shorthand without loss. This is the lossless round-trip the summary describes.

## Layered model and terminology

The layered model has more names than the two-layer summary suggests, because the shorthand register itself splits into a strict subset and a convenience-extended superset. The terms below are the names used consistently across the spec set and the backlog.

- **Layer 1 (custom-HTML, or semantic HTML).** The canonical, archival representation of a document: the JATS-aligned vocabulary of elements (`<article>`, `<section>`, `<fig>`, `<cite>`, `<ref>`, `<note>`, etc.) catalogued in `packages/ehtml/elements/`. A Layer 1 document is the source of truth; every other authoring form reduces to one. Two documents that reduce to the same Layer 1 are equivalent.

- **Canonical enscribe.** The lossless shorthand register — the tag form `<tag #id .class attr=value | content>` and the small set of sigil shorthands defined as canonical (`<#>` / `<##>` / `<###>` for sections; `<$>` / `<$$>` for math; the code-fence sigils). Every canonical-enscribe construct round-trips to and from Layer 1 without loss. The translation is bidirectional; either direction recovers the other.

- **Markdown idioms (lossy convenience shortcuts).** The CommonMark constructs that enscribe also accepts — markdown headings (`#`, `##`, `###`), markdown emphasis (`*`, `_`), markdown lists, markdown tables (via remark-gfm), inline-code backticks, math via `$…$`. These reduce *into* Layer 1 but do not round-trip back from it: Layer 1 → enscribe renders the canonical surface, not the markdown idiom. The relationship is one-way reduction; the markdown surface is a convenience for authoring.

- **Strict mode (shipped, #36).** The `<config strict-mode=…>` switch (with a matching `strictMode` render option) that turns the looser registers off, from the top down, making the stricter rungs round-trip-lossless. Three values, each naming the *loosest* register still interpreted: `off` (everything — the default, today's behaviour), `sigil` (no markdown; canonical tags and sigils interpret), `canonical` (no markdown, no sigils; only canonical named tags, plus the `<li>` marker and the `^{}`/`_{}` shortcuts). A non-`off` rung *flags* would-be-shorthand text rather than erroring — it always renders, never fails. The intended use is round-trip-critical pipelines: when an author needs the guarantee that what they wrote comes back unchanged from a Layer 1 → enscribe conversion, the stricter rungs are how they ask for it.

Strict mode is the lens that makes the base explicit: **enscribe is the base; markdown is one accommodation, the loosest of three registers, switched off by `strict-mode`.** Markdown is not the center — it is the most accommodating register, offered for the muscle memory of authors who already type it, sitting on top of a base that does not depend on it. The ladder is: *markdown idiom* → reduces to → *canonical enscribe* → bidirectionally equivalent to → *Layer 1*; `strict-mode` walks down it (`off` → `sigil` → `canonical`), banning one register per rung. The middle step is what makes the round-trip work. The lossy step (markdown idiom → canonical) is acceptable because it goes in the direction of *more* information, not less — naming what was implicit — and a strict-mode document opts out of it entirely.

### The section-form reduction ladder

The same ladder is the substrate for an explicit decision about section heading forms, recorded here because it has been settled and is referenced from the backlog. Three surfaces all denote a section:

- `<section>…<section-title>…</section-title>…</section>` — the named Layer 1 element form.
- `<#>…<# #>…</#>` (and the `<# | title #>` shorthand) — the sigil-tag form: canonical enscribe.
- `# Title` — the bare markdown heading.

The decision: the named form and the sigil form are **co-equal canonical** surfaces — both round-trip to Layer 1 losslessly, and a Layer 1 → enscribe conversion may emit either. The bare markdown heading is a **lossy reduction** to the canonical surface — it produces a section but is not what the round-trip emits. The id-bearing variant `<# #sec:intro | … #>` carries its id through the ladder; the bare-markdown form has no surface for an id and is therefore strictly less expressive than the canonical surfaces.

The implementation check that all three forms actually converge to the identical Layer 1 `<section>` node is satisfied as of the normalize-to-canonical gate landing (the `document-16-section-form-convergence.emd` integration fixture is the convergence proof; the three forms produce structurally identical Layer 1 `<section>` nodes, modulo id presence on the two forms that author one).

## Lift and lower: two mechanisms, not one

Converting between syntax levels uses two distinct mechanisms with different contracts — keeping them apart is what lets each one be simple.

**The tagname↔sigil map (a cipher).** Converts between Layer 1's two canonical-enscribe spellings (named tag ↔ sigil). Pure, **bidirectional**, **lossless**, **data**: a literal source-of-truth list of name↔sigil pairs (`section`↔`#`, `sub-section`↔`##`, `sub-sub-section`↔`###`, `inline-math`↔`$`, `display-math`↔`$$`, `inline-code`↔`` ` ``, `code-block`↔` ``` `). The two sides of a pair are structurally identical and differ only in the tagname token — a substitution, not a transform. The map lives at `packages/enscribe/src/core/tagname-sigil-map.js`; both directions are derived from one literal so they cannot drift. The lift direction (`SIGIL_TO_TAGNAME`) is consumed today by the gate (see below); the lower direction (`TAGNAME_TO_SIGIL`) is reserved for the future lowering pass.

**The lossy lift.** Converts Layer 2 markdown idioms *up* to Layer 1 canonical. **Lift-only** (one-way; Layer 1 lowers to canonical-named-form, not to bare markdown), **lossy** (a markdown idiom may have multiple canonical representations, and one is chosen), a small set of transforms. Each rule is a per-construct rewrite — an mdast `heading` and a canonical section node are different shapes, not the same shape with a different tagname.

## The single gate

All lifting to canonical happens at one early pipeline stage — the **normalize-to-canonical gate** at `packages/enscribe/src/interpreter/plugins/normalize-to-canonical.js`. The gate runs after both parsers (the enscribe Peggy parser and the remark markdown lexer, including remark-math and remark-gfm) have produced nodes, and before any structural plugin runs. Every stage after the gate sees only canonical Layer 1 nodes; no downstream stage handles, sniffs for, or branches on a non-canonical authored form.

The gate's job at a glance:

| Authored form | What the gate emits |
|---|---|
| Named `<section>` / `<sub-section>` / etc. | itself (already canonical) |
| Sigil `<#>` / `<##>` / `<###>` (sections), `<$>` / `<$$>` (math), `` <` `` / ` ``` ` (code) | the canonical Layer 1 name (`section` / `inline-math` / etc.) via the tagname↔sigil map |
| Bare markdown `#` / `##` / `###` (depths 1-3) | a canonical `<section>` / `<sub-section>` / `<sub-sub-section>` enscribeTag |
| Bare markdown emphasis (`*foo*`) | `<i>` |
| Bare markdown strong (`**foo**`) | `<b>` |
| Bare GFM strikethrough (`~~foo~~`) | `<s>` |
| Bare inline code (`` `foo` ``) | the canonical `<inline-code>` |
| Bare markdown link (`[text](url)`) | **literal text** — `[text](url)` is no longer an authoring idiom; the `<a>` tag (`<a URL \| text>`) is the only link form. An *autolinked* bare URL or email (remark-gfm) still lifts to `<a>`, since its text is its target. |
| Bare markdown image (`![alt](url)`) | **literal text** — no longer an idiom; images are `<fig>` / `<figure>`. |
| Bare `$x$` or `$$x$$` math | `inline-math` — both inline forms (including a single-line `$$…$$`) lift to **inline** math per remark-math. **Display** math comes from a block `$$…$$` (the fences on their own lines) → `display-math`, or from the canonical `<$$ \| … $$>` tag. |
| GFM pipe table | a canonical `<table md>` enscribeTag |

**A new authored form is a new rule at the gate — never a new sniff in a downstream plugin.** This rule is the architecture's payoff: one shape downstream means one set of behaviors, no per-form forking, and a new authored convention has an obvious and structurally enforced place to live.

### The `<h4>`–`<h6>` exception

Layer 1's section ladder caps at three levels (`section` / `sub-section` / `sub-sub-section`). Markdown allows heading depths 1–6. The gate normalizes depths 1–3 to the canonical section ladder; depths 4–6 are **passed through as literal `<h4>` / `<h5>` / `<h6>` HTML elements**, with an informative diagnostic per occurrence ("heading depth N exceeds Layer 1's three section levels; passed through as `<hN>`"). This is a deliberate, narrow, named exception to Layer 1's otherwise-closed custom-element vocabulary — recorded explicitly so a future reader does not assume the vocabulary is perfectly closed.

The exception is one-directional: lifted into the rendered output, not part of the round-trip cipher. Lowering Layer 1 → canonical that encounters an `<h4>` in the input is a separate policy decision deferred to the lowering work.

### Deferred: section model in JATS export

Layer 1's three named section elements (`section` / `sub-section` / `sub-sub-section`, LaTeX-shaped, depth capped at three) are a deliberate choice. The alternative — a single nesting-depth-typed `<section>` — is reconsidered in the JATS export arc, where JATS's own section model interacts with this choice. The decision is recorded there, not here.

## Apparatus-tag positioning

A small set of enscribe tags carry information *about* the document rather than the document's body content: `<meta>` (descriptive metadata — title, author, etc.), `<config>` (processing and display settings), `<data>` (referenced resources), `<library>` (bibliography source). These are the **document-apparatus tags**.

The positioning rule: apparatus tags belong at the **document edges**, not in the middle of body flow. The convention is `<meta>` at the start; `<config>` / `<data>` / `<library>` at the end. The structural plugins assume this — they route apparatus tags from the root level into their appropriate regions (`<article-front>`, `<article-back>`, or to root-level siblings). An apparatus tag found mid-body (inside another tag's content array) cannot be routed coherently; the structural plugin emits an informative diagnostic and leaves the misplaced tag where it is. The document still renders (per the always-renders pattern).

`<library>` is a special case: it is legitimately nested inside `<data>` (the typical authoring pattern is `<data><library src="refs.bib" /></data>`). The position check treats `<data>` as transparent — a `<library>` inside `<data>` is correctly placed; a `<library>` anywhere else triggers the warning.

The rule is enforced today as a warning, not a hard error: a misplaced apparatus tag does not fail rendering. Hardening to error-level enforcement is a separate later decision.

Apparatus tags also have a coupled interface principle. Each apparatus tag can be authored two equivalent ways: with **kwargs** for scalar values (`<meta title="X" author="Y">`) or with **child tags** for structured values (`<meta><title>X</title><author>Y</author></meta>`). The Layer 1 canonical shape is the child-tag form. The normalize-to-canonical gate lifts the kwarg form to the canonical child-tag form per a per-tag spec — but only for the true structured-data containers (`<meta>` / `<author>`, via `STRUCTURED_ELEMENTS`); unknown kwargs are dropped with informative diagnostics. `<config>` is the exception in this group: it has **no** child-tag form, so its allowlist (`CONFIG_KWARGS`) only *validates* kwargs and config stays kwargs-only — its structured form, when built, is a fenced data block, not child tags (see the "Configuration and metadata are data" direction below). A kwarg on the wrong apparatus tag — e.g. `<config title=…>` — additionally gets a "did you mean `<meta>`?" misuse hint, and symmetrically for `<meta citation-style=…>`. Both forms are valid authoring; both reduce to the same canonical shape; the lift is the same single-gate normalization the architecture uses for every other authored form.

## Document structure: articles, books, and websites

Enscribe supports two single-document shapes, distinguished by
`<meta type=...>`: **articles** (the default; `type=article` or
absent) and **books** (`type=book`, with chapters / parts / appendices
as recursive `<book-part>` children) — plus a third class, **websites**
(`type=website`), which composes many such documents into a multi-page
site (see *The website document class*, below). The article and book
shapes share most of the authoring surface — sections, paragraphs,
frameables, math, citations, notes, references — but their structural
wrappers differ.

The distinction matters because the scholarly-publishing ecosystem
draws it: JATS has two parallel DTDs (the **article DTD** for
journal articles; **BITS**, the Book Interchange Tag Suite, for
books). LaTeX has the same split (the `article` document class
vs. the `book` class). Enscribe inherits the distinction so the
Layer 1 output maps cleanly to either DTD without per-document
restructuring.

The pipeline expression of the distinction: two structural plugins —
`enscribeArticleStructuring` and `enscribeBookStructuring` — sit
side-by-side as Stage 3 (post-gate). For each document, exactly one
of them transforms the tree:

- **The document class is resolved once first.** `enscribeDocTypeResolve`
  reads `<meta type>` before structuring, validates it against the
  declared set (`article` / `book` / `book-part` / `website`), stores it on
  `file.data`, and reports an explicitly-set unknown type with a
  non-fatal diagnostic (falling back to `article`). The structuring
  plugins read that resolved class rather than re-reading `<meta type>`.
- **`enscribeBookStructuring` runs first.** For a `book` or `book-part`
  class it wraps the children into `<book>` with `<book-front>` /
  `<book-body>` / `<book-back>` regions, routing each `<book-part>` to
  its appropriate region by its `type` (chapter / part / introduction →
  body; preface / foreword / dedication → front; appendix / glossary /
  colophon → back). Otherwise it's a no-op.
- **`enscribeArticleStructuring` runs next.** If the tree is already
  book-wrapped, it skips silently. Otherwise it does its article
  shape (`<article>` containing `<article-front>` / `<article-body>`
  / `<article-back>`).

Downstream plugins (numbering, note-placement, cross-reference
resolution) are aware of both shapes: they detect the document type
by walking the post-structuring tree's root and dispatch
accordingly. Per-document configuration knobs surface the
article-vs-book defaults that diverge:

- **`<config counter-reset-scope>`** — `none` (article default;
  global counters) / `chapter` (book default; per-`<book-part>`
  resets) / `section` (deeper resets, per-outermost-`<section>`).
  Cross-reference rendering follows the scope: chapter scope
  produces "Figure 1.3"; section scope produces "Figure 1.2.3";
  none produces "Figure 3" (current article behavior).
- **`<config note-scope>`** — `document` (single back-matter list)
  / `chapter` (book default; per-`<book-part>` collection at
  chapter end) / `section` (article default; outermost-section
  collection, per the `7001aaa` PG-1 behavior).

The two shapes share everything below the structural wrapper. The
frameable handlers, the theorem family, math, citations, and notes
all work identically inside an article or a book. The shape divides
the *outer container*; the *body authoring surface* is one enscribe.

### The website document class

A **website** (`type=website`) is the third document class, at a
different level from article and book: it is not a single document with
a structural wrapper but a **multi-page site**, whose master declares a
navigation tree of pages — and **each page is itself natively an article
or a book**. Output is HTML only (a site is not a scholarly document, so
there is no JATS/BITS projection).

The site is built by **composition, not flattening** — the decision a
re-implementation must preserve. Each page is numbered in its *own native
scope* (an article as an article, a book as a book, so a book figure stays
"2.1" rather than a flattened "1"); every page's cross-reference anchors
merge into one *site registry*; and each page is rendered natively over a
*read-through* of that registry, so a cross-page reference resolves to its
target's native number and links to the page that owns it, in every
direction. Flattening every page into one page-scope assembly was rejected
because it destroys native numbering and a page-isolated render cannot see
the site registry (the cause of the #300 regression). This is the
conceptual placement; the full model — the two-phase number-then-render,
page identity, the static/live URL schemes, and the always-render
invariants — is specified in `notes/specs/website.md`.

## Structured-data-container tags

The kwargs-or-child-tags interface principle described for apparatus tags above is not unique to apparatus. It applies to a more general category — **structured-data-container tags** — of which `<meta>` was the first member and `<author>` is the second. (`<config>` is *not* a structured-data container: its body is processing options, not a record of named document-descriptive fields, and the authoring surface today is kwargs-only.)

A structured-data-container tag is one whose body is *structured enscribe data* (a set of named fields, scalar or composite), not free authored prose with embedded tags. It is distinct from a DSL tag — a DSL interprets a foreign language inside enscribe (LaTeX math inside `<$>`, Mermaid source inside `<mermaid>`); a structured-data container holds enscribe's own structured fields. Both kinds carry "non-prose" content, but the kind of non-prose is different.

By this distinction `<data>` / `<library>` are **not** structured-data containers: their body is a foreign-format payload (BibTeX, CSL-JSON, …) read by an external parser, so they sit on the language axis as a **storage host** — `<library bibtex>` is a `(host, language)` binding with purpose *storage* (see §"The two axes: host and language" above and `notes/specs/format-words.md`). They are registered on the DSL/language side, not in `STRUCTURED_ELEMENTS`. The container *shape* of `<data>` — whether it should additionally expose a structured-field interface — was the question tracked by issue #24, now **resolved: no**. `<data>` / `<library>` remain storage hosts and do not gain a structured-field interface or a `STRUCTURED_ELEMENTS` entry. The kwarg↔child-tag lift has nothing to act on here — a foreign-format payload (BibTeX, CSL-JSON, …) has no enscribe-native fields to lift — and re-expressing those external schemas as enscribe fields would re-mirror the external parsers, crossing the "delegate to existing tools, don't reimplement them" boundary the language axis exists to honor (#24).

The interface for every structured-data container is uniform: the tag accepts kwargs for scalar fields *and* child tags for the same fields in their structured form; the normalize-to-canonical gate lifts the kwarg form to the canonical child-tag form per a per-tag spec; the canonical Layer 1 shape carries child tags (plus any boolean-marker kwargs). This is the same single-gate normalization the architecture uses for every other authored form.

### Infrastructure

The structured-data-container registry is **`STRUCTURED_ELEMENTS`** in `packages/enscribe/src/core/structured-elements.js`. Each entry is a per-tag spec recording its accepted kwargs, the subset that lifts to child tags, boolean-marker kwargs, the child allowlist, an opt-in child-tag-validation flag, and an optional misuse-feedback partner pointer. The registry is **separate from `DSL_REGISTRY`** by design — `DSL_REGISTRY` is the handler-dispatch list for DSLs (foreign-language tags like `<math>` / `<mermaid>` / `<csv>` interpreted by an external processor); `STRUCTURED_ELEMENTS` is the kwarg/child-tag interface registry. Neither registry gates parser-time long-form admission — every named tag is long-form-eligible (see §"Tag forms" above) — so the two registries are independent and serve unrelated downstream concerns.

The lift gate consumes the spec generically in `normalize-to-canonical.js`'s `liftStructuredKwargs(node, file)`. Adding a new structured-data container is a registry-entry edit plus (when the tag is new) a vocabulary entry — no gate-code change.

### `<author>`

`<author>` is a structured-data-container, parallel to `<meta>`. Its allowlisted child elements: `<name>`, `<affiliation>`, `<orcid>`, `<email>`. Its boolean kwarg: `+corresponding` (a scalar marker; stays a kwarg on the canonical Layer 1 node, never lifted to a child tag).

Authored kwarg form (self-closing — see *Kwarg-form authoring* below):

```
<author name="Jane Goodall" affiliation="Cambridge University" orcid=0000-0001-2345-6789 +corresponding />
```

Authored child-tag form (equivalent after lift):

```
<author>
  <name | Jane Goodall>
  <affiliation | Cambridge University>
  <orcid | 0000-0001-2345-6789>
</author>
```

Both reduce to the same canonical Layer 1 shape. Multiple authors are sibling `<author>` elements inside `<meta>`. The `+corresponding` and `corresponding=true` surface forms both normalize to a `corresponding="true"` attribute on the canonical Layer 1 node — the gate promotes the `+`-form from the parser's `node.booleans` surface into `node.kwargs` so the schema renderer's attribute mapping fires uniformly.

(`<author>` is not itself document-apparatus in the apparatus-positioning sense — it lives as a child of `<meta>`, not at the document edges — so it is not subject to the apparatus-positioning rule. It shares the interface principle, not the positioning principle.)

### Kwarg-form authoring: the self-close requirement

A structured-data container is long-form-eligible (its child-tag form is `<tag>…</tag>`). A consequence: a kwarg-only authoring (no pipe content, no `/`) is otherwise indistinguishable from a long-form opener, and the parser claims it as long-form and scans forward for `</tag>`. The kwarg form therefore **must self-close** — `<author name="…" />` — or use explicit long-form-with-empty-body — `<author name="…"></author>`. This is the same constraint `<table />` follows for the same reason. (`<meta>`'s existing fixtures all use the explicit-close form, so the constraint is not new; it becomes visible with `<author>` because the kwarg-only form is more natural for short author records.)

## Frameable elements: a shared capability

A small group of Layer 1 elements share a common capability: they interrupt the text flow, may carry an optional outline box, an optional title (rendered at the top), and an optional caption (rendered below). Numbering — "Fig. 3", "Table 2" — is folded into the caption-and-title rendering; it is *not* a separate authored field or attribute. We call this capability **frameable**.

The canonical, buildable definition of this capability — its members, the shared attribute surface, the per-member `border` / `numbered` defaults, and the JATS mapping — lives in `notes/specs/frameable.md`; that spec is the build target. This section records the *rationale*: why frameable is a shared capability rather than an umbrella element, and what it supersedes.

Frameable is a **capability shared by several distinct elements**, not an umbrella element that wraps them. Every frameable element carries the *identical* attribute set and the *identical* behavior — title, caption, border, numbering — because the capability is shared. Authoring a frameable construct does not nest an inner content element inside an outer wrapper; the frameable element *is* the construct.

### Members

The frameable elements include `<figure>`, `<table>`, `<code>`, `<svg>`, `<mermaid>`, and the other DSL-registry block elements — each a first-class member that simply *also* possesses the frameable capability. There is also a generic `<frame>`: a sibling general-purpose captioned container for content that has no specific frameable element of its own. `<frame>`'s content is deliberately unrestricted — an author may place anything inside; enscribe does not police it (the same posture enscribe takes elsewhere, e.g. not policing a `<title>` placed inside a `<footnote>`). The class also includes the boxed-prose member `<aside>` (tangential content; callouts and admonitions via its `type`). The authoritative membership list — and what is deliberately excluded (`<blockquote>`, math, the theorem family) — is in `notes/specs/frameable.md`.

### `<figure>` is the sole graphical element

Every image in Layer 1 is a `<figure>`. There is **no** `<img>` or `<picture>` as a distinct Layer 1 element, and no custom element alongside it — the one graphical element is HTML's own `<figure>`. It carries `source`, `title`, `caption`, `border`, and `alt-text`. A caption on a `<figure>` is optional; there is no separate "unwrapped image" element for the uncaptioned case — an uncaptioned image is a `<figure>` with no caption.

The canonical Layer 1 element is the HTML-native `<figure>` — figures are HTML-shaped, the second migrated group after lists under the HTML-shaped direction ([#147](https://github.com/enscribejs/enscribe/issues/147)). `<fig>` — the JATS name inherited from Layer 1's earlier JATS-mirroring — is retained in two roles: the **JATS export target** (the translation emits `<fig>`, keeping the export close to pass-through) and an **authoring alias** for `<figure>`. (Internally the interpreter still keys the vocabulary entry and dispatches the figure handler under `fig`; the handler emits HTML-native `<figure>`. Making the internal name follow the canonical is a deferred follow-on — it touches the parser's normalize-to-canonical gate and the tagname-keyed lookups, so it is sequenced separately from this metadata/spec migration.) The `fig`↔`figure` pair is a real and bounded alias case, not arbitrary; allowing it does not open a general aliasing precedent for other tags.

### What this supersedes

This design **replaces** the prior `<figure>`-as-*umbrella* model, in which a `<figure>` was a single element that wrapped an inner content element (an `<img>` generated from a `src` kwarg, or an author-placed `<table>` / `<code>` / `<equation>`) plus a `<figcaption>`. Under the current design there is no umbrella: the graphical figure — canonically the flat, first-class `<figure>` (named `<fig>` in the v0.1.0 build, recanonicalized to `<figure>` under #147) — stands on its own for graphical content; `<table>`/`<code>`/`<svg>`/`<mermaid>` are their own first-class elements for their own content; the frameable capability is shared across all of them at the same level. A consequence: removing the umbrella also removes the layer of tag nesting the umbrella enforced (`<figure type=table | <table>…</table>>` collapses to a frameable `<table>` directly).

This supersession shipped in the v0.1.0 frameable build — the `<fig>`/`<svg>`/`<frame>` vocabulary, the figure-handler refactor, the bare-markdown-image lift to `<fig>`, and caption-as-content. The later redesign — promoting `<aside>` into the class and folding callouts/admonitions into it — is defined in `notes/specs/frameable.md` and tracked in GitHub issue #31.

### Membership and remaining questions

The membership list — and the formerly-open questions (the generic `<frame>`, the `figure`/`fig`/`img`/`picture` decision, and the later aside-vs-blockquote and callout-folding questions) — are resolved in `notes/specs/frameable.md`. Any still-undecided points are tracked there (under that spec's "Open sub-questions") and in issue #31.

## Multi-paragraph tag content; unclosed tags terminate at EOF

A blank line inside an open tag is a **paragraph break, not a terminator** — multi-paragraph tag content is allowed (`<aside | First paragraph.\n\nSecond paragraph.>` produces an aside with two paragraph children). A tag terminates only on its **explicit closing `>`** or at **EOF**. An unclosed tag — one whose stream ends without its closer — produces a visible `enscribeTagError` at the tag's opening position; the consumed span renders as the error node's best-effort content.

EOF is the **only** terminator besides the explicit `>`. There is no additional "hard structural boundary" terminator (e.g. end of region, start of a new structural construct). This was a deliberate design choice: a structural-boundary terminator would require the tokenizer to detect blank-line-followed-by-a-tag-opener, reintroducing exactly the blank-line-as-signal heuristic this design was chosen to avoid. The bounded cost of EOF-only termination — an unclosed tag near the top of a long document swallows the rest of the document into the error node — is acceptable: the error renders visibly at the open position (so the author sees *where* the problem is) and the conspicuously missing downstream content is itself a strong author signal. Tighter localization, if ever needed, is an incremental future change — not foreclosed by EOF-only.

The design rests on and reinforces the always-renders guarantee in `principles.md`: errors stay bounded enough that the document renders and the author can locate the problem. Multi-paragraph tag content is a desirable feature; it yields to the always-renders guarantee if the two ever conflict, but under EOF-only termination they do not. Integration fixtures `document-23-multi-paragraph-tag-content.emd` and `document-24-unclosed-tag-at-eof.emd` pin both halves against regression.

## Why this is not just another markdown extension

Three differences:

1. **The target is specified independently.** Layer 1 stands alone, and it is canonical. Markdown extensions typically conflate syntax and semantics; enscribe separates them, and keeps the semantic form — not a display projection of it — as the source of truth.

2. **The shorthand is uniform.** One construct (`<tag attrs | content>`) handles all cases that need attributes, instead of accreting per-feature idioms (trailing curly braces for headings, fenced divs for callouts, special prefixes for citations, etc.).

3. **The implementation rides on existing infrastructure.** Enscribe builds on the unified/remark/rehype ecosystem rather than reimplementing parsing, list handling, math rendering, syntax highlighting, etc.

### Why the unified ecosystem

The parser-substrate decision had three candidates: continue the original regex prototype, hand-write a grammar (Peggy or Chevrotain), or build on unified/remark/rehype. Each is briefly:

- **Regex.** Familiar, and existing prototype code worked for some cases. But the approach doesn't scale: edge cases break, list handling has to be rebuilt, every new feature reinvents wheels remark already has.
- **Hand-written grammar.** Clean grammar file, full control over the syntax. But the cost is rebuilding everything around it — lists, tables, math integration, syntax highlighting — outside the JS ecosystem where rendering ultimately happens.
- **Unified plugins.** Enscribe inherits markdown parsing, lists, tables, math, syntax highlighting, footnotes, GFM autolinks. The novel work (shorthand syntax, citations, cross-references, section nesting) maps cleanly onto the plugin model. The learning curve is the AST mental model.

The unified ecosystem is what enscribe uses. The project's surface area shrinks dramatically because most of what enscribe needs already exists as plugins. The "rediscovering the wheel" motto applies directly: unified is the wheel.

### The JATS exporter

The `enscribeToJats` exporter takes the structured Layer 1 mdast tree (before the hast compile) and produces JATS XML by direct string assembly. Most mappings are 1:1 element renames; a minority require restructuring. For example, enscribe's flat-then-nested section model maps cleanly onto JATS's recursive `<sec>` model, but enscribe's `<article-title>` plus `<article-subtitle>` becomes JATS's `<title-group>` containing `<article-title>` and `<subtitle>`. Required JATS metadata is padded with sensible defaults or explicit author-provided values from a `<meta>` block. The enscribe-to-JATS mapping table is the heart of the exporter, and it is small — a few dozen entries — because the Layer 1 vocabulary is itself small. This is what makes enscribe a credible scholarly-publishing target rather than just "another web markdown."

### Package structure

The project is organized as an npm workspace of three packages: **`enscribe`** (the Layer 1 core, the shorthand parser, and the interpreter — the `src/core/`, `src/parser/`, and `src/interpreter/` folders), **`@enscribejs/cli`** (the `enscribe` command: rendering, JATS export/import, and the pandoc bridge), and **`@enscribejs/ehtml`** (the generated vocabulary data). Within `enscribe` the dependency graph points inward through the shared `src/core/` folder, which depends on nothing internal; the parser and interpreter depend on it. The build/run-time seam doubles as the browser-safety boundary — `src/core/` and the shippable runtime paths are filesystem-free by design, so the client-side build does not have to redraw the boundaries. See `notes/specs/core.md` for the full architecture-decision record, including the dependency diagram, the per-module inventory, the seam definition, and the standing client-side build constraints rule.

## Design tensions and accepted tradeoffs

**`enscribe import` via pandoc does not preserve LaTeX cross-references.** Pandoc does not carry LaTeX label/reference commands through structurally, so cross-references in LaTeX or Quarto sources imported through the pandoc bridge arrive as plain text rather than resolvable `<ref>` links. This is a pandoc limitation, not an enscribe one, and is accepted as a known limitation of the import path.

**Shorthand is less readable than plain markdown.** Acknowledged. The shorthand is more readable than HTML and more readable than markdown plus the trailing-attribute extensions that academic markdown flavors require. Where plain markdown suffices, enscribe uses it. The shorthand is reached for only when needed.

**Implicit closing differs from HTML.** Standard HTML linters may flag enscribe source. This is acceptable because enscribe source is not HTML — it compiles to HTML. Tooling for the shorthand is a separate concern from HTML tooling.

**`@` for references collides with social-media usage.** Not a real problem in academic prose. Pandoc has used `@key` for citations for years without confusion.

**Custom elements have no built-in semantics without help.** A custom element styled by CSS displays correctly but is, to a screen reader or an outline tool, semantically inert. Enscribe accepts this as the cost of a semantically explicit canonical form, and answers it with the display ladder: the default target adds CSS, and render mode lowers custom elements to their plain-HTML equivalents where real heading semantics are needed. Static export to other formats (PDF, EPUB, DOCX) goes through Pandoc or similar, which handles custom elements via configuration. The accessibility gap is met by lowering, not by abandoning the semantic vocabulary.

**The interpreter does not call `customElements.define()`.** Layer 1 elements (`<note-list>`, `<article-body>`, `<article-front>`, …) are emitted as raw custom HTML elements; browsers treat them as instances of `HTMLElement` with no built-in behavior. CSS targeting works; ARIA semantics and JavaScript behavior do not exist by default. This is intentional: registering custom elements is an application-layer concern, and the host application or theme is the right place to do it. The interpreter's job is to emit semantically explicit HTML; turning a `<note-list>` into a behaviorally rich element is a downstream choice that depends on the host context.

**Cross-references resolve only to colon-ids.** The cross-reference registry indexes targets by colon-id (`fig:scatter`, `eqn:model`, `sec:methods`) — the `type:name` convention — not by every id in the document. A `<ref @figure-3>` against a non-colon id produces a `ref-error` even if `figure-3` is a valid id elsewhere. This is intentional and is the reason the colon convention exists: colon-ids unambiguously identify a referenceable target across types, and the labelled-target/free-id distinction lets authors use ordinary ids for non-referenceable hooks (URL anchors, CSS targets) without crowding the cross-reference namespace. The convention is the price authors pay for unambiguous cross-references.

**The pipe (short) form cannot carry opaque content with a bare `>`.** An opaque-content tag whose body contains a bare `>` — a mermaid arrow `-->`, a math comparison `a > b` — must be written in the long form `<tag …>…</tag>` (or a sigil form), not the pipe form `<tag | … >`. The short form closes at the first depth-0 `>`, which an opaque body cannot distinguish from a content `>`; redefining the closer would only trade one breakage for another. The long form's `</tag>` closer and the sigil forms' mirrored closers are distinct tokens, so they are unambiguous. The mechanics are in `notes/specs/shorthand-syntax.md` (short-form closing rules); this entry records the accepted boundary (#269).

## Design directions (discovered through implementation)

The sections above describe enscribe's design as it was conceived. Building the system surfaced a further set of directions — principles that weren't obvious at the outset but became clear once real documents were being authored and rendered. They are recorded here because they guide ongoing work. Open items that bear on these directions are tracked in GitHub Issues; `notes/archive/design-directions-2026-05.md` retains the fuller implementation-level version with its DD-numbering.

**Content gets parsed; arguments don't.** A value's syntactic form — keyword argument, positional, pipe-content, child element — is incidental. What matters is its semantic role. *Arguments* are configuration: `citation-style="apa"`, `placement="end"`, `src="refs.bib"`. They are opaque strings or enumerations and pass through the pipeline uninterpreted. *Content* is authored prose-and-structure that may contain nested tags, citations, math, or emphasis, and must be parsed recursively. The trap is content-shaped values that happen to be written as keyword arguments — a `caption="..."` containing a `<cite>` is content wearing an argument's clothing, and must be parsed as such. The direction: vocabulary entries declare each keyword argument's role, and the interpreter treats `role: content` arguments the same as child nodes.

**Caption-bearing elements support two equivalent forms.** Elements like figures, tables, and code blocks carry both metadata (id, format hint) and content-like material (caption, alt text). Authors should be able to choose a compact form, where the caption is a keyword argument, or an explicit form, where the caption is a child element — and both produce identical output. The compact form suits brief captions; the explicit form suits captions with rich content or elements with several content sections. This generalizes the previous direction: the explicit form is simply the case where content-shaped material is given its own element rather than an argument slot.

**`<meta>` is for metadata; `<config>` is for options.** Two document-level constructs with a boundary that must stay sharp. `<meta>` holds metadata that appears in or shapes the rendered document — title, author, date, affiliations, abstract — and is JATS-like in spirit. `<config>` holds processing options that never render — citation style, numbering preferences, theme settings. Each should validate the attributes it accepts rather than silently absorbing the other's. Blurring them produces silent failure: a title placed in `<config>` simply vanishes.

**Configuration and metadata are data, not prose — author them in a data register.** Configuration and metadata are *data*: named settings and key/values, sometimes nested. Authoring data in a prose register — a named tag with body content, or a hand-written tree of child tags — is a category mismatch, and it is the friction behind the long-running `<config>` authoring questions and the stray-child render that surfaced in [#133](https://github.com/enscribejs/enscribe/issues/133). The settled direction ([#134](https://github.com/enscribejs/enscribe/issues/134)) gives data its own register, split by shape. **Flat settings are kwargs on the tag** — `<config citation-style=author-year number-sections=true />` — exactly as today; this is how every live `<config>` option is authored now. **Structured settings will be a fenced data block inside the tag** — a bounded island of a data mini-language (e.g. YAML) between the tag's delimiters, the same "foreign language behind a fence" pattern `<library>` uses for BibTeX and `<$$ … $$>` for LaTeX, parsed by an existing library per *delegate the lexer* (enscribe does not write a data parser). What structured settings are **not** is a hand-authored tree of child tags (`<config><numbering><sections>true</sections></numbering></config>`): verbose, indistinguishable from body content, and the source of #133's stray child. This is the one place the kwargs-or-child-tags interface of the structured-data containers above does *not* extend — `<meta>` / `<author>` carry their named descriptive *fields* as child tags by design, but `<config>` options, and bulk or nested settings generally, get the data block instead of a child-tag tree. Each register normalizes to its own canonical target: `<config>` settings into the configuration registry that drives the pipeline; `<meta>` fields into the canonical `<meta>` structured-children shape that exports to JATS `<article-meta>` — the same Layer 2 → Layer 1 move as prose, where the author writes the easy register and the normalizer produces the canonical one. This direction keeps [#123](https://github.com/enscribejs/enscribe/issues/123)'s ruling (flat `<config>` is kwargs-only) and adds the structured register above it. The structured-block register is **unbuilt**: its mechanics — the data language (YAML / TOML / JSON), and whether document-level metadata also gains a `---` front-matter surface — are open build choices tracked in #134. What is settled, and recorded here, is the *shape* of the answer: kwargs for flat, a fenced data block for structured, never a child-tag tree.

**All tag forms work for every tag where they make sense.** The shorthand grammar admits several tag forms — short, pipe-content, multi-line pipe-content, long-form nesting, self-closing. The principle is that for any given tag, every form that is *semantically* meaningful should *actually* work, and produce equivalent output. Where a form is silently broken for some tags but not others, authors have no way to know the rule, and the uniformity that justifies the shorthand erodes. The direction: vocabulary entries declare which forms each tag supports, tests cover each declared form, and parser-level conflicts that block a declared form are treated as bugs.

**Standalone HTML is the build target; client-side rendering is the future target.** This direction concerns *when* processing happens, a separate axis from the *what form* question settled by the display ladder above. The pipeline produces self-contained HTML at build time — with `embedResources: true`, every document carries its own CSS, fonts, rendered citations, and interactive infrastructure, so it can be emailed, archived, or read offline and render identically anywhere. (The *default* now links fonts and KaTeX CSS to CDNs for leaner output; full self-containment is opt-in but remains a first-class build target.) That archival target does not change. But a further target is full client-side rendering: an `.emd` source file loaded directly in a browser, parsed and rendered without a build step, in the spirit of JupyterLite. Reaching it means the parser, the plugin pipeline, and the handlers must all run in the browser, not only in Node — and that has begun to arrive. The browser façade (`render` / `renderInto`, plus the async `renderAsync` for `<library src>` bibliographies and `renderMasterAsync` for multi-file masters) already runs the same pipeline client-side; the remaining gap to the full target is environment-gated I/O, not engine work. This shapes every current decision — plugin code stays framework-agnostic, pure where possible, and free of Node-specific APIs, so reaching the full target is a migration rather than a rewrite.

**The browser is the engine.** Every other document system ships a compiler you run at a command line or inside special software; enscribe ships neither. The browser is the only substrate that is a renderer, an interactive runtime, and a compute environment at once — and it is already installed on every machine. LaTeX, Quarto, RMarkdown, and Typst each bolt a compiler plus a viewer onto a format; enscribe declines to build either and rides the one everyone already has. Because the browser is renderer, runtime, and compute environment at once, the live in-browser render is the primary surface — where authoring, code execution, and interaction happen — and the static CLI compile is its export-and-archival projection (static-site content, large projects). The two are one engine and byte-identical on matched options (the "Live and static rendering are one engine" direction below states that parity precisely); that parity is what licenses the live surface as primary — it certifies that what you edit and see *is* the document, not an approximation of some authoritative output elsewhere. In-browser editing and shareable, self-contained interactive documents are where this leads.

**Non-goal — full-fidelity export to legacy binary formats.** Enscribe targets the end products the browser is natively good at: HTML, print-to-PDF, reveal.js-style decks, interactive dashboards. It does not chase clean docx/pptx export. People want the end product, not the format; and a format with gravity is imported *to*, not begging to export — clean import is the importer's job, not enscribe's.

**Live and static rendering are one engine, not two.** Enscribe does not ship a document renderer — it uses the universal one everyone already runs, the web browser (the substrate premise of the Summary). What it *does* ship is a single compiler to the HTML that browser renders, and that compiler has two co-equal, first-class modes: **static/compiled** (the CLI's `.emd` → HTML build — one file, or, for a separate-pages book, a per-chapter page set; see the granularity axis below) and **live** (in-browser `.emd` → DOM). Neither is a primary mode with the other a fallback: both drive the *same* `buildEnscribePipeline`, the CLI's `doBuild` and the browser's `render*` entries call it identically, and multi-file assembly runs through the *same* `assembleMasterDocument` in both. Because it is one engine, the modes carry a guarantee — *on the same source with matched options, live and static produce byte-identical rendered output.* The reader sees the same document regardless of mode, and regardless of whether the content bytes arrived from Node's `fs` (static) or the browser's `fetch` (live): the engine consumes already-loaded content and is **source-agnostic** about how it was loaded. Two kinds of difference are deliberately scoped *out* of this guarantee, because they are content-equivalent packaging rather than divergent rendering — the *default* resource packaging (the CLI's self-contained inline fonts/assets vs the browser's CDN links) and the *default* DSL delivery (baked static SVG vs a live CDN-linked library). Match those options and the output converges; the divergences that remain are environment-gated I/O (Node-`fs` paths the browser reaches via `fetch`, or leaves as unreached dead code behind the browser-safety seam), never engine divergences. Two cautions on the words: this whole-pipeline *live/static* sense is **not** the per-DSL *skip/live/static* modes under "Embedded DSLs" above (those choose *when* an external library renders one diagram, and deliberately emit different markup per mode), and *byte-identical* here is the cross-mode render invariant — distinct from the *byte-identical* vocabulary-migration invariant under the vocabulary-boundary principle, which holds the HTML and JATS output steady across a Layer 1 rename. The normative statement — the two entry points, exactly what is in and out of byte-parity, and the source-agnostic rule, with the audit evidence that it holds today — lives in `notes/specs/render-parity.md`.

**A book renders one chapter at a time, and the chapter is a projection of the whole.** The same one-engine guarantee runs along a second axis: granularity. A render is two steps — a *global pass* (`proc.runSync`: structure, number, and resolve every cross-reference) that produces a numbered tree *without rendering anything to HTML*, and a *compile* (`proc.stringify`: mdast → hast → HTML, where the expensive work lives — images, diagrams, tables, code). The global pass is cheap and whole-book; the compile is the part worth deferring. So a book has two render projections of the *same numbered tree*: **full** (the static build and today's live render compile every chapter) and **per-chapter** (`renderChapter` compiles one `<book-part>` — the unit the live lazy path renders on demand as the reader navigates). The invariant that makes this safe is the granularity analogue of live≡static: *a chapter compiled in isolation is byte-identical to that chapter's content within the full-book compile.* It holds because the global pass bakes every cross-chapter concern into the tree before any compile — a cross-reference's number ("figure 1.1") is resolved against the numbering registry whole-book, per-chapter figure numbering and per-chapter notes are stamped in place — so a `<book-part>` subtree is self-contained and its compile is a pure projection (the only depth-sensitive detail, `rehype-format`'s indentation, is reproduced by compiling the chapter at its in-context nesting depth). The cross-reference *registry* — `anchor → {number, title, type}`, harvested from that same numbered tree — is the bridge for the cross-chapter case: a reference whose target chapter was *never compiled* still shows its number, and a preview of it can show the target's number and title without rendering the target. So "render only the chapter you're viewing" is not an approximation of the full render; it is a slice of it, guaranteed equal. This per-chapter render is *not* the single-chapter **paging** view (an opt-in runtime display mode, `chapterNav`, that hides all but one already-rendered chapter); it is a compile-time engine projection — the foundation two tracks build on. The **publishing track** is static: `enscribe build` compiles each chapter to its own standalone page at a per-chapter URL (`1-introduction.html`), the shareable artifact — open the link with no JavaScript and read that chapter, its chrome linking to the sibling pages, its cross-chapter references resolving to the *owning chapter's page* via the registry (page-implicit references, as `notes/specs/master-document.md` settles: the author names the target, never the page, so a reference survives a page being renamed or moved). The **editing-surface track** is live: the same per-chapter compile run in the browser, routed by URL, re-rendering only the chapter in view (and, on edit, only the chapter being edited). Both share the per-chapter compile and the registry; the difference is *when* the compile runs (build time vs view time) and *where* the bytes land (a file vs the DOM) — the one-engine guarantee again, now along granularity. Whole-book-in-one-file stays a build mode (`--single-page`), and is the reference render the per-chapter content is proven equal to.

**Markdown forms are shorthand for the canonical enscribe form.** Several constructs exist in both registers — `$x$` and `<$ x $>`, a GFM pipe table and `<table>`, `# Heading` and `<# ... #>`. Where a construct exists in both, the enscribe form is canonical and the markdown form is *surface shorthand for it*, not an independent parallel path. This refines the delegation principle by drawing a line through the middle of it. Delegation still holds for *tokenizing*: finding `$x$` in a stream of text is hard, remark already does it well, and enscribe does not reimplement it — that would be reinventing a working wheel. But delegation does **not** extend to *node identity*. When remark's tokenizer finds a markdown construct that has an enscribe equivalent, the resulting standard node (`inlineMath`, `table`, `heading`, ...) is rewritten into its canonical `enscribeTag` form by a normalization pass, before any structural or semantic plugin runs. Downstream of normalization, only the enscribe form exists; every later plugin — numbering, cross-references, asset detection, the eventual JATS export — sees one node type per construct, not two. The markdown spelling is genuinely just a faster way to type the canonical thing. The split is: *delegate the lexer, own the node identity.* Reusing remark's finder is not reinventing the wheel; accepting remark's name for what it found would be ceding the vocabulary, and the vocabulary is the project. This also makes the remark dependency shrink gracefully over time rather than by a hard cut: a markdown construct stays delegated as long as remark's tokenizer is an adequate wheel for it, and enscribe supersedes at the lexer level only for a specific construct, only when remark's coverage is genuinely inadequate and a deliberate decision is made — never reflexively. The principle is universal in intent: it governs every markdown/enscribe overlap. Its implementation is incremental: the normalization pass grows one construct at a time, and a construct not yet covered is a not-yet-done item, never a decision that it was meant to stay a separate path.

## What's deliberately out of scope

- A new markdown parser. Use remark.
- A new HTML parser. Use rehype.
- A math renderer. Use KaTeX or MathJax.
- A citation formatter. Use citation-js with CSL.
- A diagram renderer. Use Mermaid.
- A code highlighter. Use Shiki or Prism.
- A PDF generator. Use Pandoc, Paged.js, or Prince downstream.

JATS export is *in* scope (see "JATS as reference and export target" above). Render mode — the lossy lowering of Layer 1 to plain HTML headings — is also *in* scope: it is the third rung of the display ladder, not a discarded alternative to it. The project's contribution is the specification (Layer 1, the canonical semantic form), the shorthand (Layer 2), the glue plugins that connect them to the existing ecosystem, the display targets that render Layer 1 for different consumers, and the bridge to scholarly publishing via JATS.

## Positioning among rich-document systems

This section situates Enscribe in the landscape of established authoring systems that handle the same territory: structured documents with first-class footnotes, citations, math, cross-references, theorem-family content, and figures. It is positioning analysis, not a roadmap commitment — it records why Enscribe exists alongside these systems, what it intends to interoperate with, and where it deliberately defers to a better-suited tool.

### The matrix

For each system, a column marks whether the format has *first-class* support for the listed element. "First-class" means dedicated semantic representation, not just visual styling: a `<theorem>` tag is first-class; `**Theorem 1.**` styled in bold is not.

| System | Footnotes | Citations (structured) | Cross-references | Math | Theorem-family | Figures | Tables | DSL blocks (preserved source) | First-class HTML rendering | Authoring shorthand | Standardization |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Enscribe** | ✓ | ✓ (CSL) | ✓ (scoped) | ✓ (KaTeX) | ✓ | ✓ | ✓ | ✓ | ✓ (Layer 1) | ✓ (sigils) | — (in development) |
| **JATS** | ✓ | ✓ (structured) | ✓ | ✓ (MathML) | ✓ (`<statement>`) | ✓ | ✓ | ◐ (preserves but as opaque) | ✗ (XML, not rendering format) | ✗ | ✓ (NISO standard) |
| **TEI** | ✓ | ✓ (rich) | ✓ | ◐ (MathML) | ◐ (encodable but informal) | ✓ | ✓ | ✗ | ✗ (XML, not rendering format) | ✗ | ✓ (community standard) |
| **DocBook** | ✓ | ✓ (structured) | ✓ | ◐ (MathML) | ◐ (admonitions; not formal) | ✓ | ✓ | ✗ | ✗ (XML, not rendering format) | ✗ | ✓ (OASIS standard) |
| **LaTeX** | ✓ | ✓ (BibTeX/biblatex) | ✓ | ✓✓ (native) | ✓ (amsthm) | ✓ | ✓ | ◐ (via packages) | ✗ (PDF target) | ◐ (macros) | — (de facto) |
| **DOCX (OOXML)** | ✓ | ◐ (Word-specific) | ✓ | ✓ (OMML) | ✗ (styled paragraphs) | ✓ | ✓ | ✗ | ✗ (Word target) | ✗ | ✓ (ISO/IEC 29500) |
| **ODT** | ✓ | ◐ (citation entries) | ✓ | ✓ (MathML) | ✗ (styled paragraphs) | ✓ | ✓ | ✗ | ✗ (LibreOffice target) | ✗ | ✓ (OASIS standard) |
| **RST (reStructuredText)** | ✓ | ✓ | ✓ | ◐ (via roles) | ✗ (directive convention) | ✓ | ✓ | ✗ | ◐ (Sphinx) | ◐ | — (de facto) |
| **AsciiDoc** | ✓ | ✓ | ✓ | ◐ (via STEM) | ◐ (admonitions) | ✓ | ✓ | ✗ | ◐ (Asciidoctor) | ◐ | — (community spec) |
| **Quarto** | ✓ | ✓ (CSL) | ✓ | ✓ (LaTeX-in-Markdown) | ◐ (custom divs) | ✓ | ✓ | ✓ (executable code) | ◐ (via Pandoc) | ◐ (Markdown-based) | — (single-vendor) |
| **CommonMark + GFM** | ◐ (extension) | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ (spec) |

Legend: ✓ first-class; ✓✓ best-in-class; ◐ partial / via convention or extension; ✗ not supported or significantly worse than first-class.

### What distinguishes Enscribe

The matrix isolates a combination no other system holds at once: **first-class rich-element semantics + HTML as the primary rendered target + a JavaScript-native (unified/remark/rehype) pipeline + an authoring shorthand that lifts to the canonical structure.** Each existing system has at least one of these in some form; none has all four. The decisive one is first-class HTML rendering as the *primary* artifact — JATS, TEI, and DocBook are XML archival/exchange formats that need a separate stylesheet or pipeline to render; LaTeX targets PDF; DOCX targets Word; and Quarto's HTML is a Pandoc-derived output, not the format's own primary artifact. An Enscribe document, by contrast, *is* HTML and ships as the rendered article — email the `.html`, open it in any browser, no build pipeline at view time. CommonMark earns partial credit (it has authoring shorthand and renders to HTML) but lacks the rich-element coverage; Quarto and RST/AsciiDoc carry some shorthand for rich elements but fall back to directive-style syntax that does not lift to a canonical structure.

The mechanics behind each of the four are developed earlier in this document — first-class HTML in the Summary and "The browser is the engine"; the lifting shorthand in the Layer 2 sections and "Why this is not just another markdown extension"; the pipeline base in "Why the unified ecosystem." The point here is only that the *combination* is what the landscape lacks, and that the matrix makes it visible. The closest neighbour is Quarto, and the distinction is architectural: Quarto is Pandoc-anchored and multi-vendor (Posit); Enscribe is unified-anchored and HTML-primary. The two can coexist, serving slightly different tooling preferences within one broad audience.

### What Enscribe doesn't claim

Honest about what Enscribe is *not* trying to be:

- **Not a journal archive format.** JATS is the right tool for that role. Enscribe targets JATS for lossless export, so content authored in Enscribe can deposit into JATS-based archival workflows (PubMed Central, publisher submission, institutional repositories).
- **Not a humanities scholarship platform.** TEI is richer for manuscript encoding, philological work, and humanities-specific apparatus. Enscribe's vocabulary leans toward STEM-style scholarly articles; TEI serves humanities-style scholarship better. (A future TEI export could broaden this — see below — but is not currently planned.)
- **Not a typesetting system.** LaTeX produces print-quality PDF that Enscribe's HTML rendering does not match for print contexts. Users who need print-quality PDF either accept what HTML-to-PDF tools produce (Prince, WeasyPrint, browser print) or use a LaTeX export pipeline when print fidelity matters.
- **Not a Word replacement.** DOCX is what reviewers and collaborators use. Enscribe accepts that DOCX export is necessary for collaboration and intends to support it (via the Pandoc bridge), but does not claim to replace Word for users who collaborate heavily with Word users.
- **Not a one-vendor ecosystem.** Quarto is a single-vendor project (Posit). Enscribe is intended to be community-developable; the Layer 1 vocabulary is a stable target that multiple implementations could share.

### Why a new system rather than extending an existing one

The natural question is "why not just extend LaTeX, add features to Quarto, or contribute to Pandoc?" Each existing system has architectural commitments that constrain it: LaTeX is procedural and macro-based, so adding declarative-semantic features means fighting the architecture; Pandoc's AST is an opinionated lingua franca whose extension requires consensus across many format maintainers; Quarto inherits Pandoc's architecture and layers single-vendor decisions on top; JATS is a destination format, not an authoring format; TEI is a community-governed XML standard with a far larger vocabulary than Enscribe needs. Enscribe's specific combination — rich-element first-class semantics + HTML as primary target + JavaScript-native pipeline + lifting shorthand — is the novelty no single one of them holds, and first-class HTML rendering is the decisive differentiator (it is what enables distributable documents, live-editable demo sites, browser playgrounds, and JavaScript-native composability). This is the broader, per-system form of the argument "Why this is not just another markdown extension" makes against the markdown-extension flavors specifically.

### Interaction strategy

Enscribe is not isolationist. Its strategy for interoperating with the rest of the landscape:

- **JATS** — Lossless export (done). Import (planned). Round-trip JATS → Enscribe → JATS should preserve content faithfully, modulo some DSL handling. JATS is the archival/exchange hub.
- **LaTeX** — First-class export and import planned (post-v0.1.0), targeting the academic audience that currently writes in LaTeX. Math fidelity is the strongest mapping; theorem-family content also maps cleanly.
- **Pandoc** — Bidirectional bridge planned (post-v0.1.0): a Pandoc reader for Enscribe (export to anything Pandoc supports) and a Pandoc-AST consumer that emits Enscribe (import from anything Pandoc reads). This gives breadth coverage for formats that don't warrant first-class effort.
- **DOCX** — The Pandoc bridge handles the basic case. First-class DOCX export/import is a future consideration if the collaboration-with-Word audience needs higher fidelity.
- **TEI** — Not currently planned; a future consideration if Enscribe broadens into humanities scholarship. The mapping is asymmetric (TEI is richer), but a useful subset could be exported.
- **Quarto** — Adjacent rather than interoperating. Quarto and Enscribe serve similar audiences with different architectural commitments; users choose between them on tooling preference (Pandoc-based vs. unified-based; multi-format-target vs. HTML-primary).
- **DocBook, RST, AsciiDoc** — Reachable through the Pandoc bridge; probably not worth first-class effort given audience sizes.

### Future TEI consideration

If Enscribe broadens scope beyond STEM-leaning scholarship into humanities authoring, first-class TEI export becomes relevant. The mapping considerations: TEI's structural vocabulary (front/body/back, multi-level divs) maps cleanly to Enscribe's book and article structures; its footnote/cross-reference apparatus maps cleanly; its `<bibl>` / `<biblStruct>` map to Enscribe's structured citations; its `<div type="theorem">` convention is a natural target for the theorem family. TEI's rich manuscript-encoding features (variants, witness lists, named entities, etymological data) have no counterparts in Enscribe and would simply not be generated by an Enscribe-to-TEI export. A TEI import would face the same asymmetry: humanities-specific markup would be dropped or stored as opaque content. This is a later-phase consideration if pursued, not a near-term commitment.
