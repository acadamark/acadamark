# Acadamark — Project Status

A living document describing where acadamark is as a project: what's built, what's in flight, what's pending, and the design decisions that got us here. Read this alongside `README.md`, `DESIGN.md`, and `BUILD.md` to come up to speed quickly.

Last updated: June 2026 (post-2026-Q2 audit; interpreter fully implemented).

## Premise

HTML+CSS+JS is already a complete typesetting substrate. Every browser renders it. Pandoc converts it outward to almost any format. What it lacks for academic publishing is (1) standard conventions for academic semantics, and (2) an ergonomic authoring syntax. Acadamark adds both, in two independently valuable layers:

- **Layer 1**: a defined vocabulary of HTML elements, custom elements, and `data-*` attributes for academic content (sections, figures, citations, cross-references, theorems, etc.).
- **Layer 2**: a uniform shorthand syntax (`<tag attrs | content>`) that compiles losslessly to Layer 1.

Motto: "not re-inventing the wheel; re-discovering the wheel." HTML is the wheel. The unified/remark/rehype ecosystem is the wheel for the implementation side.

JATS (Journal Article Tag Suite) is acadamark's reference vocabulary for Layer 1 and its first-class export target. The pitch is "academic markdown for the web that can submit to journals."

For the full design rationale, read `DESIGN.md`. For the implementation plan, read `BUILD.md`.

## Where things stand

The shorthand parser (`remark-acadamark`) and interpreter pipeline (`acadamark-interpreter`) are both fully implemented and end-to-end tested: a `.acm` source document compiles to self-contained HTML with math, figures, tables, notes, citations, cross-references, hover previews, and bundled fonts. 436 tests pass across the two packages. Active work is the 2026-Q2 audit: reconciling stale documentation with the implemented state, filing architectural findings for future slices, and resolving design questions before the next implementation phase begins.

## Architecture

### Layered model

| Layer | What it is | Status |
|-------|-----------|--------|
| Layer 1 — Semantic HTML | A vocabulary of elements (`<section>`, `<sub-section>`, `<article-title>`, `<section-title>`, `<figure>`, etc.) and `data-*` attributes | Specified: `packages/layer1-vocabulary/SPEC.md` + 66 per-element entries. Supporting docs: `notes/layer1-naming.md`, `notes/shape-tokens.md`. |
| Layer 2 — Shorthand syntax | `<tag attrs \| content>` for named tags; `<# ... #>` / `<$ ... $>` sigil families; long-form `<tag>...</tag>` for DSL content | Specified (`notes/shorthand-syntax.md`); parser fully implemented through Slice 4 + escape rules + multi-line + recursive content. |
| Compilation targets | Semantic mode (preserves Layer 1 elements, archival) and render mode (lowers to `<h1>`/`<h2>` for browser default styling, lossy) | Specified; render-mode plugin not implemented. |
| JATS export | Maps Layer 1 to JATS XML for journal submission | Specified as a future deliverable; not implemented. |

### Implementation

Acadamark is built as plugins on the [unified](https://unifiedjs.com/) ecosystem (remark for mdast, rehype for hast, micromark for the tokenizer, Peggy for the grammar). This decision was made deliberately: it means markdown parsing, lists, footnotes, and math integration are inherited, and acadamark's novel work maps cleanly onto the plugin model.

The interpreter does not use `remark-rehype`. It applies a chain of mdast-level transform plugins, then converts with `mdast-util-to-hast` directly, passing element-specific handler functions. This keeps all academic semantics at the mdast level where the full document structure is visible.

For the full pipeline description, see `notes/pipeline.md`. For the interpreter architecture and all plugins, see `notes/interpreter.md`.

### Pipeline (summary)

```
text source
  → remarkParse + remarkAcadamark     mdast with acadamarkTag nodes
  → remarkRecursiveContent             named-tag content re-parsed as Node[]
  → acadamarkConfigDiscovery           <config> kwargs → file.data.acadamarkConfig
  → acadamarkArticleStructuring        article front/body/back skeleton
  → acadamarkSectionNesting            sigil sections nested by depth
  → acadamarkLibraryLoad               <library> BibTeX → citation-js
  → acadamarkNotes                     <note> → markers + note-list
  → acadamarkNumbering                 equations / figures / tables numbered
  → acadamarkRefResolution             <ref> → __ref-marker or __ref-error
  → acadamarkCiteResolution            <cite> → __cite-marker or __cite-error
  → acadamarkBibliography              formatted bibliography injected
  → toHast (with handlers)             mdast → hast; element handlers dispatch per tagname
  → asset injection                    KaTeX CSS + fonts + hover JS inlined
  → rehypeStringify                    hast → self-contained HTML string
```

Plugin names marked NOVEL above are acadamark's contribution. All others are borrowed.

## What exists

### Code that exists and is tested

**`packages/remark-acadamark/`** — the shorthand parser. A Peggy + micromark hybrid: micromark tokenizes tag boundaries in the source stream; a Peggy grammar parses the attribute string inside each tag. Produces `acadamarkTag` mdast nodes. 228 tests passing.

Capabilities:
- Sigil tags: `<# ... #>` (section), `<$ ... $>` (inline math), `<$$ ... $$>` (display math), `` <` ... `> `` (inline code), `` <``` ... ```> `` (code block)
- Named tags: `<tagname #id .class attr=value +flag -flag | content>`
- Long-form DSL tags: `<tagname attrs>multi-line content</tagname>` (for DSL-registry tags)
- All attribute forms: positionals, `#id`, `.class`, `[bracketed,list]`, `key=value`, `+flag`, `-flag`, quoted values, self-closing `/>` (limited — see AUD-08)
- Multi-line constructs: flow-position tags allow line endings in attribute sections and content
- Escape rules: `\<`, `\|`, `\\` → literal characters; `\X` for other ASCII punctuation passed to remark
- Recursive content: `remarkRecursiveContent` plugin re-parses named-tag `content` strings as full mdast subtrees (enabling nested tags, citations, math inside named-tag content)
- Defensive error nodes: unclosed constructs produce `acadamarkTagError` rather than halting output

**`packages/acadamark-interpreter/`** — the full interpretation pipeline. Converts an `acadamarkTag`-bearing mdast document into a self-contained HTML string. 208 tests across 22 suites passing (9 integration fixture tests + 13 unit-test suites).

Plugin chain and capabilities:
- `acadamarkConfigDiscovery` — reads `<config>` kwargs into `file.data.acadamarkConfig`
- `acadamarkArticleStructuring` — builds `<article-front>` / `<article-body>` / `<article-back>` skeleton; promotes title from `<meta>`
- `acadamarkSectionNesting` — nests `<#>`, `<##>`, `<###>` sigil sections by depth
- `acadamarkLibraryLoad` — loads `<library>` BibTeX content (inline or `src=`) via citation-js
- `acadamarkNotes` — converts `<note>` elements to inline markers + a note-list (supports `placement=foot/end/side`)
- `acadamarkNumbering` — assigns sequential numbers to `$$` equations, `figure`, and `table` elements
- `acadamarkRefResolution` — resolves `<ref #id>` against the registry; produces `__ref-marker` (resolved) or `__ref-error` (unresolved)
- `acadamarkCiteResolution` — resolves `<cite key>` against the loaded citation library; produces `__cite-marker` or `__cite-error`
- `acadamarkBibliography` — formats the bibliography with citation-js (chicago-author-date by default) and injects it at an author-specified `<bibliography>` or auto-appended to `<article-back>`
- `toHast` with handlers — dispatches each `acadamarkTag` node by tagname to a schema (for simple elements) or a handler function (for complex ones: `figure`, `math`, `table`, `code-block`, `inline-code`)
- Asset injection — KaTeX CSS (patched to base64 fonts), Inter + Source Code Pro body fonts (subsetted, base64), Tippy.js + Popper.js hover previews (injected only when document has notes/refs/citations)

Working end-to-end: math (inline + display, numbered), figures (with captions and cross-references), tables (CSV, TSV, JSON, YAML, Markdown formats), code blocks (language class), notes/endnotes, cross-references, citations, bibliography, section nesting, article front/body/back structure, hover previews, self-contained HTML output.

**`packages/rehype-section-nesting/`** — standalone rehype plugin that nests flat `<section>` / `<sub-section>` / `<sub-sub-section>` elements by depth. 10 tests passing. Predates the interpreter; still used in the interpreter's pipeline.

**`packages/remark-acadamark-pure-micromark-archive/`** — preserved pure-micromark predecessor (Slices 1–2). Not part of the active build; kept as architectural history.

### Documentation that exists

- **`README.md`** — project overview and motivation
- **`DESIGN.md`** — full design rationale: problem statement, layered model, JATS relationship, authoring shorthand design, tradeoffs
- **`BUILD.md`** — implementation plan: pipeline architecture, novel plugins, phase order, slice map
- **`notes/shorthand-syntax.md`** — formal spec for the parser with EBNF, worked examples, and resolved decisions
- **`notes/interpreter.md`** — architecture and internals of the full interpreter pipeline
- **`notes/pipeline.md`** — end-to-end data flow through all pipeline stages with worked examples
- **`notes/layer1-naming.md`** — four naming rules for Layer 1 vocabulary, compilation targets
- **`notes/principles.md`** — core project principles (always-renders, delegation, spec-first, maximum-correct-output)
- **`notes/design-directions.md`** — five architectural directions (DD-1 through DD-5) for future work
- **`notes/known-limitations.md`** — current limitations with workarounds and fix locations
- **`notes/audit-findings.md`** — filed audit findings (AUD-01 through AUD-15+)
- **`notes/audit-2026-Q2/1A-drift-and-gaps.md`** — Audit 1A findings: spec documents that describe reality incorrectly (DRIFT-1 through DRIFT-11), missing documentation for things that exist (GAP-1 through GAP-7)
- **`notes/audit-2026-Q2/1A-design-questions.md`** — design questions raised by Audit 1A that require a chat-session decision before any code or spec changes
- **`packages/layer1-vocabulary/SPEC.md`** — Layer 1 vocabulary overview
- **`packages/layer1-vocabulary/elements/`** — 66 per-element entries with attribute lists, content shapes, JATS mappings

### Example documents

The interpreter's test suite includes 9 fixture `.acm` documents that cover a range of real authoring scenarios:

1. **document-1-minimal** — bare-minimum article: `<meta>` block with title and author, one paragraph
2. **document-2-realistic** — multi-author paper with sections, figures, and citations
3. **document-3-edge-cases** — parser and interpreter edge cases: nested tags, error recovery, unusual inputs
4. **document-4-math-minimal** — inline and display math, numbered equations, `<ref>` to equations
5. **document-5-linear-regression** — short methods paper with math, figures, and cross-references
6. **document-6-cross-references** — exercises the full cross-reference system: figures, equations, notes
7. **document-7-tables** — all table formats (CSV, TSV, JSON, YAML, Markdown), captions, cross-references
8. **document-8-citations** — BibTeX `<library>`, `<cite>` markers, auto-placed bibliography, chicago-author-date formatting
9. **document-9-demo** — comprehensive demo combining all features: structure, math, figures, tables, citations, notes, cross-references

### Vocabulary

`packages/layer1-vocabulary/elements/` contains 66 per-element `.md` files. Coverage includes: article structure (`article`, `meta`, `config`, `article-front`, `article-body`, `article-back`, `article-title`, `article-subtitle`), sections (`section`, `sub-section`, `sub-sub-section`), inline semantics (`em`, `strong`, `code`, `sub`, `sup`, `abbr`), figures and media (`figure`, `caption`), tables (`table`), math (`display-math`, `inline-math`), citations and references (`cite`, `ref`, `bibliography`), notes (`note`, `note-list`, `note-list-item`, `note-marker`), and more.

Not yet specified or implemented as first-class elements: theorem-family (`theorem`, `proof`, `lemma`, `definition`), and several less-common elements. These appear in the survey at `notes/authoring-features-survey.md`.

## What doesn't yet exist

### JATS export (`rehypeAcadamarkToJats`)

The plugin that converts Layer 1 hast to JATS XML. This is a Phase 3 deliverable. It is the bridge to professional scholarly publishing (journal submission, CrossRef, PubMed, archival). The architecture is designed to make this mostly mechanical — most Layer 1 elements are 1:1 renames. Not started.

### Render-mode lowering plugin

The plugin that lowers `<section-title>` → `<h1>`, `<sub-section-title>` → `<h2>`, etc. for browser default styling. Specified in `notes/layer1-naming.md`; not implemented. Documents currently render with custom-element tags in-place; themes handle styling via CSS custom elements.

### Client-side rendering (DD-5)

The current pipeline is build-time only. DD-5 (see `notes/design-directions.md`) targets a future where `.acm` source files render directly in the browser without a server-side build step — similar to JupyterLite. Not started; drives architectural decisions (avoid Node-specific APIs in plugin code).

### Theorem-family elements

`<theorem>`, `<proof>`, `<lemma>`, `<corollary>`, `<definition>`, `<example>`. Reserved in `packages/layer1-vocabulary/SPEC.md`. No vocabulary entries, no handler, no tests.

### Code syntax highlighting

`rehype-shiki` or `rehype-prism` is listed as a dependency in `BUILD.md` but not wired into the pipeline. Code blocks emit `<pre><code class="language-X">` with the language class available; highlighting is not applied.

### GFM table support (`remark-gfm`)

`remark-gfm` is not installed. Plain pipe-table syntax (` | h1 | h2 | `) is not recognized. The `<table md | ...>` form provides equivalent capability via the interpreter's Markdown-table parser. See AUD-06 in `notes/audit-findings.md`.

### Cross-references to sections and code blocks

The numbering plugin only registers equations, figures, and tables. Section and code-block nodes are not added to the registry, so `<ref #sec:intro>` always produces a `ref-error`. See AUD-09 in `notes/audit-findings.md`.

## Active work and next steps

### 2026-Q2 audit (in progress)

Audit 1A (reading pass) is complete. Findings are in `notes/audit-2026-Q2/`:

- **1A-drift-and-gaps.md** — spec documents that inaccurately describe the implementation (DRIFT-1 through DRIFT-11: `interpreter-design.md` pipeline is entirely wrong, plugin names are wrong in `plugin-pipeline.md`, STATUS.md "doesn't exist" claims are stale, etc.) and documentation gaps for things that do exist (GAP-1 through GAP-7: no spec for asset injection, no spec for hover trigger logic, design directions not propagated to vocabulary entries, etc.).
- **1A-design-questions.md** — eight design questions (DQ-1 through DQ-8) that require a chat-session decision before any code or spec changes are made.

Audit 1B (the design-question chat session) is pending. After 1B, a fixes pass will address DRIFT items and selected GAP items.

### Deferred work with open slots

The following are filed with no current slice assignment. Each requires a design pass before implementation:

- **Caption-as-content** (AUD-14, DD-1, DD-2): citations and rich content inside captions (`caption="... <cite Key>"`) not parsed. Requires either recursive parsing of `role: content` kwargs or promoting captions to first-class child elements.
- **Self-closing form for DSL-registry tags** (AUD-08, DD-4): `<library src="refs.bib" />` produces an error. Requires `/>` awareness in the micromark long-form tokenizer.
- **Parser newline bugs** (GAP-6): three inline-tag behavior bugs in edge positions (inline tags at line-start, multi-line inline content, code sigil in text position). Not yet in `audit-findings.md`.
- **Tag-forms reference** (AUD-15): no inventory of which tag forms work for which tags; no test coverage per form per tag.

For the BUILD.md slice plan and phase order, read `BUILD.md`.

## Key design decisions

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

The shorthand parser produces uniform `acadamarkTag` nodes with `tagname`, `positionals`, `booleans`, `kwargs`, `id`, `classes`, `content`. Whether `<cite jones2001>` means "look up a citation" is not the parser's concern — that's the interpreter's job. This separation means new tags are added by writing transform rules, not by modifying the parser.

### Schema-vs-handler dispatch in the interpreter

The interpreter dispatches `acadamarkTag` nodes in two modes. For vocabulary elements whose transform is a straightforward attribute-and-content mapping, the vocabulary entry's `html_output` schema drives the transform declaratively (`tagName`, `buildProperties`, `convertContent`). For elements whose output structure depends on inputs in complex ways (figures, math, tables, code blocks), a registered handler function produces the hast subtree imperatively. Both modes are supported; the schema is the default, the handler is the escape hatch. See `notes/interpreter.md` §Handler dispatch.

### Peggy hybrid for the parser

The parser uses micromark for tokenizing tag boundaries in the source stream (the micromark layer is small and stable) and a Peggy grammar for parsing the attribute string inside each tag (declarative, readable, incrementally extendable). This split was chosen for the *freeze property*: micromark state-machine code is hard to modify; future grammar changes go in Peggy, where they're visible and bounded. The pure-micromark predecessor lives at `packages/remark-acadamark-pure-micromark-archive/` for reference.

### `>` in content rule (rule B)

When scanning content, a `<` only opens a nested-construct depth level if followed by an ASCII letter, a registered sigil character, or `/`. Otherwise the `<` is literal. This means `<figure | a < b>` works correctly (the `< ` doesn't increment depth, so the `>` closes the figure). Bare `>` without a matching tag-like `<` still closes early — authors must use `&gt;` for literal `>` in prose.

### Identifier character class

The identifier rule is split into `IdentifierStart` and `IdentifierCont`. Start excludes attribute-prefix characters (`+`, `-`, `#`, `.`, `=`) so they can't begin an identifier. Cont allows `:` and `-` mid-identifier, so `#fig:body-cross-section` and `#my-cool-id` work. `:` is also allowed in start position, so `<ref #fig:body-cross-section>` parses without quoting.

## Open design questions

Audit 1A raised eight design questions requiring chat-session decisions before any fixes are applied. These are filed in `notes/audit-2026-Q2/1A-design-questions.md` (DQ-1 through DQ-8):

- DQ-1: What to do with `notes/interpreter-design.md` (stale architecture doc — rewrite, retire, or archive)?
- DQ-2: Does `notes/plugin-pipeline.md` need a name-fix pass or a fuller architecture revision?
- DQ-3: Should `notes/hover-previews-deferred.md` be renamed to signal it's historical?
- DQ-4: Where do DD-1 through DD-5 live long-term (propagated to spec docs, or standalone)?
- DQ-5: What is the slice plan for the three parser newline bugs?
- DQ-6: Should comma-separated positionals for `<cite>` be added to the grammar or documented as unsupported?
- DQ-7: How should the `<meta>` / `<config>` boundary be clarified and enforced?
- DQ-8: Should the AUD / DRIFT / GAP finding numbering be unified going forward?

## Repository structure

```
archive/        Historical design notes, earlier implementation explorations
notes/          Spec documents, design directions, audit findings, investigations
packages/
  remark-acadamark/                   Shorthand parser (Peggy + micromark hybrid)
  acadamark-interpreter/              Full interpreter pipeline
  layer1-vocabulary/                  66 per-element vocabulary entries + SPEC.md
  rehype-section-nesting/             Standalone section-nesting rehype plugin
  remark-acadamark-pure-micromark-archive/   Predecessor parser (archived)
BUILD.md        Implementation plan and slice map
DESIGN.md       Design rationale
README.md       Project overview
STATUS.md       This file
```

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

A pattern that emerged in 2026-Q2: large audit passes and documentation rewrites are also well suited to Claude Code, since they require broad file reading and careful synthesis. The 2026-Q2 audit (reading all sources, writing `notes/interpreter.md`, `notes/pipeline.md`, and this revised STATUS.md) was executed in Claude Code using a chat-crafted spec.

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