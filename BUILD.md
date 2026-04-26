# Building Acadamark

This document describes how acadamark is implemented. It assumes you've read `DESIGN.md`.

## Architectural choice: unified/remark/rehype

Acadamark is built as a set of plugins on the [unified](https://unifiedjs.com/) ecosystem. This decision was made after considering three options:

| Approach | Pros | Cons |
|---|---|---|
| **Continue regex prototype** | Familiar; existing code works for some cases | Doesn't scale; edge cases break; no list handling; reinvents the wheel |
| **Hand-written grammar (Peggy/Chevrotain)** | Full control; clean grammar file | We'd build everything (lists, tables, math integration) ourselves; isolated from JS ecosystem |
| **unified plugins** | Inherits markdown parsing, lists, tables, math, syntax highlighting, footnotes, GFM; standard plugin model; massive existing user base | Learning curve for the AST mental model |

The unified ecosystem was chosen because the project's surface area shrinks dramatically — most of what acadamark needs already exists as plugins, and the novel work (shorthand syntax, citations, cross-references, section nesting) maps cleanly onto the plugin model. The "rediscovering the wheel" motto applies directly: unified is the wheel.

## Mental model

Three ideas, in order:

1. **A document is a tree, not a string.** Parse text into a tree, transform the tree, serialize back to text. Transformations compose; regex on strings doesn't.

2. **Two tree dialects.** *mdast* is the markdown AST. *hast* is the HTML AST. Markdown parses to mdast; mdast converts to hast; hast serializes to HTML. Acadamark plugins live on one or both trees.

3. **Named pieces.** *remark* handles markdown↔mdast. *rehype* handles HTML↔hast. *unified* chains them. *micromark* is the lower-level tokenizer used only when inventing genuinely new syntax (i.e., the acadamark shorthand).

## The pipeline

```js
unified()
  .use(remarkParse)                    // text → mdast
  .use(acadamarkShorthand)             // NOVEL: parse <tag | content>
  .use(remarkMath)                     // borrowed: $...$ and $$...$$
  .use(remarkGfm)                      // borrowed: tables, footnotes
  .use(remarkRehype, { allowDangerousHtml: true })  // mdast → hast
  .use(acadamarkTagInterpret)          // NOVEL: shorthand nodes → real HTML
  .use(acadamarkSectionNesting)        // NOVEL: implicit-close sections
  .use(acadamarkNumbering)             // NOVEL: figure/section/eq numbers
  .use(acadamarkCitations)             // NOVEL: resolve <cite> + bib
  .use(acadamarkCrossRefs)             // NOVEL: resolve <ref>
  .use(rehypeKatex)                    // borrowed: math rendering
  .use(rehypeShiki)                    // borrowed: code highlighting
  .use(rehypeStringify)                // hast → HTML text
  .process(source)
```

The pipeline above produces HTML — acadamark's primary output. A *parallel* pipeline produces JATS XML by replacing `rehypeStringify` with a JATS converter and inserting `rehypeAcadamarkToJats` before serialization. Both pipelines start from the same Layer 1 hast tree, diverging only at the final stages. See "What's novel" below for `rehypeAcadamarkToJats`.

Lines marked NOVEL are acadamark's contribution. Everything else is borrowed.

## What's borrowed

- **Markdown parsing** (remark): paragraphs, headings, emphasis, lists, links, blockquotes, fenced code, inline code, line breaks.
- **GFM** (remark-gfm): tables, footnotes, task lists, strikethrough, autolinks.
- **Math** (remark-math + rehype-katex): inline `$...$` and display `$$...$$`, rendered via KaTeX.
- **Syntax highlighting** (rehype-shiki or rehype-prism): fenced code blocks rendered with proper highlighting.
- **HTML serialization** (rehype-stringify): final output.
- **AST utilities** (unist-util-visit, hast-util-from-html, etc.): tree walking and manipulation.

## What's novel

### 1. `acadamarkShorthand` — the shorthand parser

The hardest piece. A micromark extension that teaches the tokenizer to recognize `<tagname #id .class attr=value | content>` as a syntactic construct, plus a remark plugin that converts the resulting tokens into mdast nodes.

This is the only place micromark is touched. A grammar in roughly 100–200 lines covers the syntax. Output is mdast nodes of a generic type `acadamarkTag` with parsed `name`, `id`, `classes`, `attributes`, `flags`, and `content` properties. The parser does *not* know what individual tags mean — it produces uniform generic nodes.

### 2. `acadamarkTagInterpret` — semantic interpretation

A separate plugin that walks the tree and transforms `acadamarkTag` nodes into proper HTML based on the tag name. This is where each tag's Layer 1 semantics live: `<figure>` becomes a `<figure>` with nested `<img>` and `<figcaption>`; `<cite>` becomes a `<cite>` with the right `data-*` attributes; etc.

Separating parsing from interpretation means new tags are added by writing transform rules, not by modifying the parser. New tags can be registered without touching micromark.

### 3. `acadamarkSectionNesting` — implicit-close sections

A rehype plugin that walks the hast tree, finds flat `<section>` markers with heading-level information, and restructures them into properly nested elements. The behavior matches the existing prototype, but implemented as tree manipulation rather than regex.

Estimated size: ~50 lines using `unist-util-visit`.

### 4. `acadamarkNumbering` — figure/section/equation numbers

A rehype plugin. Walks the tree assigning numbers to numbered elements based on their numbering domain (figures count separately from sections count separately from equations). Writes the assigned number into a `data-number` attribute that downstream plugins (cross-refs, captions) can read.

Runs *before* citations and cross-refs because both depend on numbers being assigned.

### 5. `acadamarkCitations` — citation resolution

A rehype plugin (possibly two: one for inline citations, one for the bibliography). Walks the tree, finds `<cite>` nodes, resolves their keys against a bibliography (BibTeX/CSL-JSON) using citation-js, formats them according to a chosen CSL style, and inserts the formatted reference list at a designated bibliography placeholder. The existing prototype's behavior is preserved; the implementation moves from regex to tree.

### 6. `acadamarkCrossRefs` — cross-reference resolution

A rehype plugin. Walks the tree, finds `<ref>` nodes, resolves them against numbered elements (figures, sections, equations, theorems), generates the appropriate link text and anchor, replaces the `<ref>` with an `<a>`. Runs *after* numbering.

### 7. `rehypeAcadamarkToJats` — JATS XML export

A converter plugin (technically not a rehype plugin in the strict sense, since the output is XML rather than HTML, but conceptually parallel). Takes a Layer 1 hast tree and produces JATS XML. Maps acadamark custom elements (`<article-title>`, `<section-title>`, `<sub-section>`, etc.) to their JATS equivalents (`<article-title>`, `<title>` inside `<sec>`, nested `<sec>` elements). Restructures where JATS nesting differs from acadamark's. Pads out required JATS metadata with sensible defaults or explicit author-provided values from a frontmatter block.

The acadamark-to-JATS mapping table is the heart of this plugin. Most mappings are 1:1 element renames. A minority require restructuring — for example, acadamark's flat-then-nested section model maps cleanly onto JATS's recursive `<sec>` model, but acadamark's `<article-title>` plus `<article-subtitle>` becomes JATS's `<title-group>` containing `<article-title>` and `<subtitle>`.

This plugin is what makes acadamark a credible scholarly-publishing target rather than just "another web markdown."

## Design principle: parser knows nothing about meaning

The shorthand parser produces generic `acadamarkTag` nodes. A separate interpretation pass converts those nodes into specific HTML based on tag name. This separation is enforced because:

- New tags can be added without touching the parser.
- Tag semantics can evolve without parser changes.
- Alternative interpretations (e.g., a different output dialect) can reuse the parser.
- Bugs in interpretation don't cascade into parsing.

## Implementation order

A vertical-slice strategy: get the smallest end-to-end pipeline working first, then deepen it.

### Phase 1 — Stable subset and parser foundations

Goal: a working pipeline that handles uncontroversial elements (headings, paragraphs, generic divs/spans, sections, links, images) via both standard markdown and the tag shorthand.

1. Set up the unified pipeline with all borrowed plugins. Confirm plain markdown → HTML works with math, code, tables.
2. Write a brief `notes/layer1-stable.md` listing the elements whose Layer 1 HTML representation is settled and uncontroversial. This anchors the parser work without requiring full Layer 1 specification.
3. Port the section-nesting prototype to a rehype plugin. The input/output are already well-understood from the existing prototype, so the work is purely "learn the AST API," not "design the feature." This is the recommended starting point.
4. Write the micromark extension for the tag shorthand. Start with the simplest form (`<tagname | content>`) and add features (`#id`, `.class`, `attr=value`, `+flag`, `-flag`) incrementally.
5. Write the `acadamarkTagInterpret` plugin with rules only for the stable-subset tags.
6. Test end-to-end: a document mixing markdown and shorthand for stable-subset elements should produce correct HTML.

### Phase 2 — Citations and cross-references

Goal: full citation and cross-reference support. This phase requires Layer 1 decisions for `<cite>`, `<ref>`, and the bibliography placeholder.

7. Specify the Layer 1 representation for citations and cross-references in `notes/layer1-citations.md`.
8. Port the citation prototype to a rehype plugin (with citation-js).
9. Implement minimal numbering (figures only) and cross-references.
10. Add interpretation rules for `<cite>`, `<ref>`, `<figure>`, and the bibliography to `acadamarkTagInterpret`.
11. Test on a document with three sections, two figures, three citations, one cross-reference, one equation, one code block.

### Phase 3 — Completion and bridges

12. Extend numbering to sections, equations, theorems.
13. Add embedded DSL dispatch (Mermaid, ABC, CSV).
14. Specify and implement the remaining Layer 1 vocabulary (theorems, proofs, asides, etc.), consulting the JATS tag library for naming and conventions before each new element.
15. Document the Layer 1 specification rigorously, including its mapping to JATS.
16. Implement `rehypeAcadamarkToJats` and demonstrate round-trip: an acadamark document → Layer 1 HTML → JATS XML → validated against the JATS schema.

## Shorthand parser — slice map

The shorthand parser (`packages/remark-acadamark`) is built in vertical slices. Each slice adds a self-contained capability with passing tests before the next begins. A drift check against `notes/shorthand-syntax.md` is performed at the end of each slice.

| Slice | Scope | Status | Done when |
|-------|-------|--------|-----------|
| 0 | Archive pure-micromark package; scaffold hybrid (Peggy + micromark finder) | Done | Archive committed, fresh package builds, grammar compiles |
| 1 | Sigil tags `<#...#>`, `<##...##>`, `<###...###>` | Done | 12 Slice 1 integration tests pass |
| 2 | Named tags `<tagname attrs \| content>` — all attribute forms via JS helper | Done | 29 total integration tests pass |
| 3 | Move all attribute parsing into Peggy rules; apply permissive `identifier` rule for id/value/positional | Next | All 57 existing tests pass; new tests for `:` in ids and permissive identifiers; drift check clean |
| 3.5 | Math and code sigils: `<$...$>`, `<$$...$$>`, `` <`...`> ``, `` <```...```> `` | — | Sigil tests for `$` and `` ` `` families pass; micromark finder extended; drift check clean |
| 4 | Long-form DSL tags `<csv>...</csv>` — opaque content, registry integration | — | `<csv>`, `<math>`, `<theorem>` etc. parse correctly |
| 5 | Qualifying-tag pattern `<table csv>...</table>` | — | First-positional DSL dispatch works |
| 6 | Recursive content parsing — named-tag content as array of child nodes | — | `<figure \| text with <em \| emphasis>>` produces nested AST |
| 7 | Multi-line constructs — newlines valid inside attr sections and content | — | Example 7 (multi-line figure) parses correctly |

## Recommended starting point

Don't read the unified docs cover to cover — that way lies despair. Start by writing the section-nesting rehype plugin. The input and output are already completely understood (the README's existing examples). Porting it forces you through `unist-util-visit`, the node structure, and the plugin signature, all on a problem where you already know the right answer. Once that works, tackle the micromark extension. By then the ecosystem will feel ordinary.

## Dependencies (initial)

```
unified
remark-parse
remark-gfm
remark-math
remark-rehype
rehype-katex
rehype-shiki
rehype-stringify
unist-util-visit
hast-util-from-html
citation-js
```

Plus, for JATS export (Phase 3):

```
xast-util-to-xml          (for JATS XML serialization, Phase 3)
hast-util-to-xast         (for JATS XML serialization, Phase 3)
```

(`xast` is the xml AST in the unified ecosystem, parallel to mdast and hast. The conversion path is hast → xast → xml string.)

Plus, for the shorthand extension:

```
micromark
micromark-util-types
```

## Prior art and references

- [unified handbook](https://unifiedjs.com/learn/) — the canonical introduction.
- [Creating a unified plugin](https://unifiedjs.com/learn/guide/create-a-plugin/).
- [micromark extension guide](https://github.com/micromark/micromark/tree/main/packages/micromark#extending-markdown) — for the shorthand parser.
- [Pandoc's markdown extensions](https://pandoc.org/MANUAL.html#pandocs-markdown) — reference for what *not* to do (proliferation of idioms).
- [Quarto](https://quarto.org/) — the most ambitious recent academic markdown system; useful as a feature checklist.
- [Djot](https://djot.net/) — John MacFarlane's successor to CommonMark; relevant for its directive syntax design.
