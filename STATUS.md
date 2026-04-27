# Acadamark — Project Status

A living document describing where acadamark is as a project: what's built, what's in flight, what's pending, and the design decisions that got us here. Read this alongside `README.md`, `DESIGN.md`, and `BUILD.md` to come up to speed quickly.

Last updated: April 2026 (Slice 3.5 of the shorthand parser, fully closed).

## Premise (briefest possible recap)

HTML+CSS+JS is already a complete typesetting substrate. Every browser renders it. Pandoc converts it outward to almost any format. What it lacks for academic publishing is (1) standard conventions for academic semantics, and (2) an ergonomic authoring syntax. Acadamark adds both, in two independently valuable layers:

- **Layer 1**: a defined vocabulary of HTML elements, custom elements, and `data-*` attributes for academic content (sections, figures, citations, cross-references, theorems, etc.).
- **Layer 2**: a uniform shorthand syntax (`<tag attrs | content>`) that compiles losslessly to Layer 1.

Motto: "not re-inventing the wheel; re-discovering the wheel." HTML is the wheel. The unified/remark/rehype ecosystem is the wheel for the implementation side.

JATS (Journal Article Tag Suite) is acadamark's reference vocabulary for Layer 1 and its first-class export target. The pitch is "academic markdown for the web that can submit to journals."

For the full design rationale, read `DESIGN.md`. For the implementation plan, read `BUILD.md`.

## Architecture as it stands

### Layered model

| Layer | What it is | Status |
|-------|-----------|--------|
| Layer 1 — Semantic HTML | A vocabulary of elements (`<section>`, `<sub-section>`, `<article-title>`, `<section-title>`, `<figure>`, etc.) and `data-*` attributes | Partly specified (`notes/layer1-naming.md`); full vocabulary not yet enumerated |
| Layer 2 — Shorthand syntax | A uniform tag form with attributes and content; sigil tags for headings/math/code; long-form for DSL content | Specified (`notes/shorthand-syntax.md`); parser implemented through Slice 3 |
| Compilation targets | Semantic mode (preserves Layer 1 elements, archival) and render mode (lowers to `<h1>`/`<h2>` for browser default styling, lossy) | Specified at the level of "this is how it should work"; render-mode plugin not implemented |
| JATS export | Maps Layer 1 to JATS XML for journal submission | Specified as a Phase 3 deliverable; not implemented |

### Implementation ecosystem

Acadamark is built as a set of plugins on the [unified](https://unifiedjs.com/) ecosystem:

- **remark** for markdown ↔ mdast
- **rehype** for HTML ↔ hast
- **micromark** for the lower-level tokenizer (used only for the acadamark shorthand)
- **Peggy** for the grammar definition of named tags (a recent architectural choice — see below)

The decision to build on unified was made deliberately over alternatives (continuing the regex prototype, hand-writing a grammar). The rationale: unified gives us markdown parsing, lists, tables, footnotes, math integration, and syntax highlighting essentially for free, and acadamark's novel work (shorthand syntax, citations, cross-references, section nesting) maps cleanly onto the plugin model. The surface area shrinks dramatically.

### The pipeline (canonical)

```js
unified()
  .use(remarkParse)                    // text → mdast
  .use(remarkAcadamark)                // NOVEL: parse <tag | content>
  .use(remarkMath)                     // borrowed: $...$ and $$...$$
  .use(remarkGfm)                      // borrowed: tables, footnotes
  .use(remarkRehype)                   // mdast → hast
  .use(acadamarkTagInterpret)          // NOVEL: shorthand nodes → real HTML
  .use(rehypeSectionNesting)           // NOVEL: implicit-close sections
  .use(acadamarkNumbering)             // NOVEL: figure/section/eq numbers
  .use(acadamarkCitations)             // NOVEL: resolve <cite> + bib
  .use(acadamarkCrossRefs)             // NOVEL: resolve <ref>
  .use(rehypeKatex)                    // borrowed: math rendering
  .use(rehypeShiki)                    // borrowed: code highlighting
  .use(rehypeStringify)                // hast → HTML text
```

A parallel JATS export pipeline replaces `rehypeStringify` with `rehypeAcadamarkToJats` and a hast-to-xast converter. Both pipelines share everything before the final stages.

## Key design decisions and their rationale

These are the decisions that, if questioned later, should not be re-litigated without good reason. Each has been thought through.

### Container-role naming for custom elements

Custom elements follow the pattern `<container-role>`: `<article-title>`, `<section-title>`, `<figure-caption>`. The container is the parent the element belongs in; the role is what it does there. This makes element names self-documenting and encodes the parent-child relationship in the name itself, so misuse is visible.

### Named depth ladder for sections

Section depth is named, not derived from heading levels or DOM nesting:

| Element             | Depth | LaTeX equivalent  |
|---------------------|-------|-------------------|
| `<section>`         | 1     | `\section`        |
| `<sub-section>`     | 2     | `\subsection`     |
| `<sub-sub-section>` | 3     | `\subsubsection`  |

If depth 4+ is needed, extend with `<sub-sub-sub-section>`. This is LaTeX-style, not recursive HTML-style. The reason: implicit closing (a new peer-level tag closes the previous one) is the largest authoring affordance over raw HTML, and it requires knowing the depth of each tag at parse time.

### Two compilation targets

Layer 1 is the canonical, archival representation: custom-element-rich, semantically explicit, lossless. *Render mode* (a separate downstream plugin) lowers title elements to `<h1>`/`<h2>`/`<h3>` for browser default styling. Render mode is lossy — once `<section-title>` becomes `<h1>`, the semantic role is no longer recoverable. Render mode is for display; semantic mode is for archival, conversion, and downstream tooling.

### JATS as reference vocabulary AND export target

When Layer 1 needs to define a new element, the JATS tag library is the *first* reference, not an afterthought. JATS has spent two decades refining this vocabulary; acadamark inherits that thinking rather than reinventing it. This rule is binding (Rule 4 in `notes/layer1-naming.md`), not advisory. It means the planned JATS export plugin (`rehypeAcadamarkToJats`) becomes a mostly-mechanical transform rather than a deep restructuring.

### Shorthand syntax: `<tagname [attrs] | content>`

One uniform construct handles all tags that need attributes or academic semantics. The `|` separator makes the boundary between attributes and content explicit. `|` absent means no content. Multiple positional, multiple flags, multiple classes are all allowed and order-free. Sigil tags use mirrored closers (`<#...#>`, `<$...$>`); long-form DSL tags use HTML long form (`<csv>...</csv>`).

The shorthand is *only* reached for when needed. Plain markdown is used wherever it suffices; the shorthand is for when attributes, ids, classes, or academic constructs are needed.

### Parser-knows-nothing-about-meaning

The shorthand parser produces uniform `acadamarkTag` nodes with `tagname`, `positional`, `booleans`, `kwargs`, `id`, `classes`, `content`. Whether `<cite jones2001>` means "look up a citation" is not the parser's concern — that's the interpreter's job (`acadamarkTagInterpret`, a separate rehype plugin not yet built). This separation means new tags are added by writing transform rules, not by modifying the parser.

### Peggy hybrid for the parser (the recent pivot)

The parser was originally written in pure micromark. It worked through Slices 1–2. Mid-project, we switched to a Peggy hybrid: micromark still tokenizes the outer construct (recognizing `<tagname ...>` boundaries in the text stream), but the attribute string inside is parsed by a Peggy grammar.

The reason: readability and the **freeze property**. With pure micromark, every change to the attribute syntax means modifying state-machine code that's hard to read. With the Peggy hybrid, the micromark layer is small and stable; future changes go in the grammar, which is declarative and far easier for contributors to follow. The pure-micromark predecessor lives at `/packages/remark-acadamark-pure-micromark-archive/` for reference.

### `>` in content rule (rule B)

When scanning content, a `<` only opens a nested-construct depth level if followed by an ASCII letter, a registered sigil character, or `/`. Otherwise the `<` is literal. This means `<figure | a < b>` works correctly (the `< ` doesn't increment depth, so the `>` closes the figure). Bare `>` without a tag-like `<` still closes early, so `<figure | 1 > 0>` gives content `1 ` — authors must use `&gt;` for literal `>` in prose.

### Identifier character class (Slice 3)

The identifier rule is split into `IdentifierStart` and `IdentifierCont`. Start excludes the attribute-prefix characters (`+`, `-`, `#`, `.`, `=`) so they can't begin an identifier — that's flag/id/class/keyword territory. Cont allows `:` and `-` mid-identifier, so `#fig:body-cross-section` and `#my-cool-id` work. `:` is allowed in start position as well, which is why `<ref #fig:body-cross-section>` parses. The decision was for the restrictive Option B with the start/cont split. Settled and implemented.

## Inventory: what exists, what doesn't

### Code that exists and is tested

- **`packages/rehype-section-nesting/`** — working plugin, 10 tests passing. Nests flat `<section>` / `<sub-section>` / `<sub-sub-section>` based on the named depth ladder. Idempotent.

- **`packages/remark-acadamark/`** — current Peggy hybrid parser, 60 integration tests + 51 grammar unit tests passing through Slice 3.5:
  - Sigil tags `<# ... #>` with attributes (Slice 1)
  - Named tags `<tag attrs | content>` and `<tag attrs>` (Slice 2)
  - All attribute forms parsed via Peggy rules: `#id`, `.class`, `+flag`, `-flag`, `key=value`, `[bracketed,list]`, positionals; permissive `identifier` rule with start/cont split (Slice 3)
  - Dollar and backtick sigil families: `<$ ... $>`, `<$$ ... $$>`, `` <` ... `> ``, `` <``` ... ```> `` (Slice 3.5)
  - Both flow (block) and text (inline) positions for all sigil families
  - Asymmetric `=` rule in `IdentifierCont`: URLs with query strings (`https://example.com?q=value`) work as bare positionals or keyword values
  - Defensive `acadamarkTagError` node for unclosed single-line sigil openers

- **`packages/remark-acadamark-pure-micromark-archive/`** — preserved pure-micromark predecessor (Slices 1–2). Not part of the active build, but kept in `/packages/` because it's still part of the current project's architectural history.

### Specs that exist

- **`README.md`** — project overview
- **`DESIGN.md`** — design rationale (premise, layered model, JATS section, scope decisions)
- **`BUILD.md`** — implementation plan (pipeline diagram, novel plugins, dependencies, phase order)
- **`notes/layer1-naming.md`** — four rules (container-role, defer to HTML, named depth, consult JATS first), two compilation targets, open decisions
- **`notes/shorthand-syntax.md`** — formal spec with EBNF, 25 worked examples, resolved decisions, open questions
- **`grammar/acadamark.peggy`** — the Peggy grammar file; owns all attribute parsing end-to-end as of Slice 3 (JS helper removed)

### What does NOT yet exist

- **`acadamarkTagInterpret`** — the rehype plugin that maps generic `acadamarkTag` nodes to specific Layer 1 HTML based on tag name. Will need a design pass on the schema-registration model first (probably a new `notes/tag-schemas.md`).
- **`rehypeAcadamarkToJats`** — JATS XML export. Phase 3 deliverable.
- **`acadamarkSectionNesting`** for sections produced by markdown headings — currently `rehype-section-nesting` only operates on Layer 1 named elements. If markdown-only input should also get section-wrapped, a separate concern.
- **`acadamarkNumbering`, `acadamarkCitations`, `acadamarkCrossRefs`** — Phase 2 plugins.
- **End-to-end demo** — a single document that goes from shorthand source through Layer 1 HTML and renders in a browser. This is the milestone that will make the project feel real.

## Active work and immediate next steps

### Just completed

**Slice 3.5 of the shorthand parser** (closed April 2026, 60/60 integration tests): dollar and backtick sigil families added (`$`, `$$`, `` ` ``, `` ``` ``). Three items landed during closeout:

1. *Test document fixed* — `notes/test.amd` rewrote multi-line sigil examples (sections 1.9, 8.4) as single-line; test document now exercises all 11 parts cleanly with 136 recognized tags.
2. *Inline sigil registration* — all sigil families now recognized in text (inline) position as well as flow (block). Previously only named tags were inline.
3. *Asymmetric `=` identifier fix* — `IdentifierCont` now allows `=`, making URLs with query strings (`https://example.com?q=value`) work as bare positionals or keyword values. `=` remains excluded from `IdentifierStart`, keeping keyword disambiguation unaffected.
4. *Defensive error for unclosed sigil openers* — a sigil opener with no same-line closer emits `acadamarkTagError` instead of falling through to remark (which caused runaway fenced-code-block parsing for backtick sigils). Spec documents the node shape and notes this is a finite-lifespan guard.

**Known deferral: multi-line constructs.** Both named and sigil tags are single-line only. The defensive error makes this safe to defer. Spec updated to reflect both constructs are deferred to the same future slice.

### Pending

- **Slice 4** — long-form DSL tags (`<csv>...</csv>`, `<theorem>...</theorem>`), with registry integration.
- **Slice 5** — qualifying-tag pattern (`<table csv>...</table>`).

### After the parser slices

Next step is setting up `packages/layer1-vocabulary/` as the first step into the vocabulary phase. This will be the subject of the next design session.

After Slice 5, the parser is feature-complete for the current spec and the parser implementation phase is done.

### Open design work to slot in before recursive parsing

The content-shape question (`string | Node[]` heterogeneous vs. always `Node[]` homogeneous) is flagged in both `notes/shorthand-syntax.md` and the "Open design questions" section below. Slices 3.5, 4, and 5 don't force the decision — none of them touch recursive content parsing — but resolving it before recursive parsing starts is the right move. A short design session is appropriate whenever it fits naturally; not blocking on slice work.

### After the parser

**The interpreter**. `acadamarkTagInterpret` is the next major plugin. It needs a schema registration model — something like:

```js
registerTag('figure', {
  positionalsTo: ['src'],
  requires: [],
  produces: (node) => /* hast subtree */
})
```

This is non-trivial to design well. A `notes/tag-schemas.md` should precede the implementation.

**The end-to-end demo**. Once even a minimal interpreter exists (handling, say, just `<#>`, `<figure>`, and `<a>`), wire up the full pipeline and produce a rendered HTML document from shorthand source. This is the moment the project shifts from "specification work" to "real software."

## Open design questions

Flagged here so they don't get re-litigated implicitly later.

- **Multi-line constructs**: both named and sigil tags are single-line only through Slice 3.5. Spec has multi-line attribute examples (Example 7) that are not yet implemented. Deferred to a future slice alongside multi-line sigil design.
- **Render-mode mapping for `<article-title>` + `<section-title>`**: when both are present, do section titles become `<h2>` (because article title takes `<h1>`)? Or stay `<h1>` and rely on document structure? Decide when building the render-mode plugin.
- **Markdown-input section wrapping**: plain markdown produces a flat sequence of `<h1>`, `<p>`, `<h2>`. Should heading-delimited regions get wrapped in `<section>` elements (à la `rehype-section`)? Or declare that markdown-only input doesn't get section treatment? Decide when building the full pipeline.
- **Theorem-family elements**: `<theorem>`, `<proof>`, `<lemma>`, `<corollary>`, `<definition>`, `<example>` — to be specified, following the container-role rule and consulting JATS.
- **Citation and reference vocabulary**: the Layer 1 representation of citations, bibliography entries, and cross-references — to be specified before the citation plugin is built.
- **JATS mapping divergences**: as the Layer 1 vocabulary grows, some elements will deliberately diverge from JATS (HTML vs. XML conventions, simpler nesting). Each divergence should be documented in the spec for that element. A consolidated "acadamark ↔ JATS mapping table" should appear once the Layer 1 vocabulary is mature.
- **Raw-HTML escape mechanism**: acadamark's text-position tokenizer consumes `<tagname ...>` constructs, which means HTML's bare boolean attributes (`<input disabled>`) and self-closing slashes (`<br/>`) don't work. A passthrough mechanism (e.g., `<html-passthrough>...</html-passthrough>`) is planned but not specified. Deferred phase.
- 
### Open design work to slot in before recursive parsing

Content shape decided: homogeneous `Node[]` with text as a node type, matching mdast/hast. See "Resolved decisions" in `notes/shorthand-syntax.md`. No outstanding pre-recursive-parsing design work.

## Repository cleanup (completed April 2026)

Historical material from earlier exploration phases has been moved to `archive/` with a README explaining what's preserved and why. `jats-updates/` (stale patch artifacts) and `files.zip:Zone.Identifier` (Windows ADS noise) were deleted. The `notes/` directory was trimmed to current specs only; pre-rewrite scope notes moved to `archive/`. See `archive/README.md` for the full inventory of historical materials.

## Working-style appendix

This section is for collaborators (including future-me) who want to know how acadamark has been worked on, not just what it is.

### The chat-as-strategy / Claude-Code-as-tactics split

For most of this project's recent phase, work has been split between two surfaces:

- **claude.ai chat sessions** are used for design discussions, drift analysis, prompt-crafting, and decisions. The conversation produces specifications, decisions, and prompts — not code.
- **Claude Code in VS Code** is used for tactical implementation: writing files, running tests, applying diffs. It receives prompts crafted in the chat session and executes them.

This split has worked well. The chat session functions as the design layer; Claude Code functions as the implementation layer. The chat session has more bandwidth for stepping back and questioning architecture; Claude Code has more bandwidth for the mechanical work of editing files and running tests.

When Claude Code runs into trouble (gets stuck, misinterprets a prompt, loses context), the rewind feature is the standard tool for backing out. Forking is for branching exploration; rewind is for "this turn went sideways, try again differently."

### Decision style

Decisions are made deliberately, not reflexively. When a question comes up — "should sigil tags allow attributes without a `|`?" — the workflow is typically: chat session sketches options and tradeoffs, settles on a direction, drafts the spec edit, confirms the diff, then sends Claude Code to implement. Drift analysis at the end of each slice catches inconsistencies between spec and implementation.

This is slower than just-coding, but it produces specs and code that don't drift apart, and it produces decisions that survive scrutiny later. Acadamark has been worked on intermittently over years; deliberate decisions are what makes the project resumable after long gaps.

### Pushback is welcome and explicitly preferred

Ariel has stated explicitly that it's helpful when Claude pushes back rather than nodding along. Disagreement, alternative framings, "have you considered X?" — these are not interruptions to the work, they're part of the work. Claude should not collapse into agreement when there's a substantive concern to raise. This applies in both the chat session and Claude Code prompts (the prompt template Ariel uses includes a note encouraging pushback).

This style is part of why the project's decisions hold up. It also means that "yes, sounds good" responses from Claude are themselves a useful signal — they mean Claude actually agrees, not that Claude is being agreeable.

### Spec-first discipline

When something is unclear, the answer is to clarify the spec first, then implement. The shorthand syntax spec went through several rounds of revision before any parser code was written for the relevant slices. This has paid off — the parser implementation has been mostly mechanical, with the hard thinking already done in the spec.

The corollary: don't let the implementation drift ahead of the spec. If implementation reveals a question the spec doesn't answer, stop and update the spec, even if it slows things down.

### Background context worth knowing

Ariel is a physicist by training, currently a data analyst at Nationwide, and has worked on acadamark intermittently over several years. The project sits at the intersection of two longstanding interests: rigorous quantitative thinking (which shows up in the careful spec work) and a frustration with the academic publishing tooling landscape (which is the project's motivation). Acadamark is not a commercial project or a job task — it's a project Ariel cares about because the existing options (LaTeX, Pandoc, Quarto, RMarkdown) are all flawed in ways that matter.

This context is relevant because it explains why "ship fast" is not the right pressure to apply. The right pressure is "build something that's actually right and that Ariel will still want to use in two years." That favors deliberate decisions over speed.