# Plugin pipeline

This document describes the structural plugin pipeline that transforms an acadamark AST into rendered HTML. It captures the order in which plugins run, the contract each plugin satisfies, and the dependencies between them.

The pipeline applies after the parser has produced an AST of acadamarkTag nodes (with content recursively parsed by the recursive-content plugin). It runs before the final HTML output is generated.

## Three phases

The pipeline has three phases. Plugins within a phase are mostly independent of each other; phases run in strict order.

**Phase 1: Discovery.** Find configuration and resources. Populate registries. No tree mutation — only side effects on registries.

**Phase 2: Structural transformation.** Mutate the AST to conform to Layer 1 structural conventions. Implicit containers added; content grouped into regions; titles extracted; section nesting normalized.

**Phase 3: Resolution and rendering.** Number elements, resolve references, place collected content, render to final HTML.

## Phase 1: Discovery

Discovery plugins read the AST without modifying it. They populate registries that subsequent phases consume.

### `acadamarkConfigDiscovery`

**Purpose.** Find `<config>` blocks throughout the document. Extract settings (output formats, citation style, numbering style, note position, bibliography source, stylesheets, etc.). Make settings available to subsequent plugins via a configuration registry.

**Contract.**
- Input: AST with possibly multiple `<config>` blocks anywhere in the document.
- Output: configuration registry populated. AST unchanged.
- Multiple `<config>` blocks merge; later declarations override earlier for the same setting.

**Dependencies.** None. Runs first.

### `acadamarkLibraryParsing`

**Purpose.** Find `<library>` blocks throughout the document. Dispatch to format-specific parser (BibTeX, CSL-JSON, RIS, etc.) based on the `format` kwarg. Parse opaque content into structured bibliography entries. Register entries in the citation registry under their ids (bibtex keys, CSL ids, etc.).

**Contract.**
- Input: AST with possibly multiple `<library>` blocks.
- Output: citation registry populated with parsed entries. AST unchanged.
- Duplicate ids across libraries: later wins, with warning.

**Dependencies.** None. Runs in parallel with config discovery.

### `acadamarkBibEntryRegistration`

**Purpose.** Find `<bib-entry>` elements throughout the document. Register each with the citation registry under its id.

**Contract.**
- Input: AST with possibly multiple `<bib-entry>` elements.
- Output: citation registry populated with these entries. AST unchanged.
- Duplicate ids: warns; first registration wins for `<bib-entry>` elements.

**Dependencies.** None. Runs in parallel with config and library parsing.

### Bibliography source resolution

**Purpose.** If `<config>` declared a bibliography source file, read the file, parse it, register entries with the citation registry.

**Contract.**
- Input: configuration registry (with bibliography source path), citation registry.
- Output: citation registry populated with entries from external file.

**Dependencies.** Runs after `acadamarkConfigDiscovery` (needs the source path). May run in parallel with `acadamarkLibraryParsing` and `acadamarkBibEntryRegistration` since all populate the same registry.

## Phase 2: Structural transformation

Structural plugins mutate the AST. They produce an AST that conforms to Layer 1 structural conventions, with implicit containers added and content grouped into expected regions.

### `acadamarkArticleStructuring`

**Purpose.** Handle article-shaped documents driven by `<meta type=article>`:

1. Recognize the document as article-shaped if any of:
   - A `<meta>` block is present with `type=article` (or with no type — `article` is the default).
   - No `<meta>` and no top-level container — an article is assumed.
   - An explicit `<article>` wrapper is present.
2. If no explicit `<article>` exists, generate one wrapping the document's top-level content.
3. Generate `<article-front>` and place the original `<meta>` inside it. `<meta>` is preserved — not dissolved.
4. Promote `<title>` and `<subtitle>` inside `<meta>` to `<article-title>` and `<article-subtitle>` (the promoted elements remain inside `<meta>`).
5. Generate `<article-body>` and place body content (sections, paragraphs, figures, asides, blockquotes, tables, lists) inside it.
6. Generate `<article-back>` and place back-matter (`<bibliography>`, `<note-list>`, `<data>`, `<config>`, plus appendix-typed book-parts if any) inside it.
7. Apply title-after-pipe rule: if `<article>` was written explicitly with pipe content (`<article | Title>`), promote that content to `<article-title>` as the first child of `<meta>` (creating `<meta>` if absent).
8. Resolve title precedence: if both `<meta>`'s `<title>` and the container's pipe-supplied title exist, `<meta>` wins; warning emitted.

If the author wrote `<article>`, `<article-front>`, `<article-body>`, or `<article-back>` explicitly, the plugin does not override; it operates within the explicit wrappers.

**Contract.**
- Input: AST after Phase 1 (registries populated). `<meta>` may be present or absent; container wrappers may be present or absent.
- Output: AST with `<article>` containing `<article-front>` (with `<meta>` inside), `<article-body>`, and `<article-back>` (each region present only if it has content).

**Dependencies.** Phase 1 complete. Independent of `acadamarkBookStructuring` (handles different document types — selection is driven by `<meta>`'s `type` kwarg, mutually exclusive).

### `acadamarkBookStructuring`

**Purpose.** Handle book-shaped documents driven by `<meta type=book>` (or by an explicit `<book>` wrapper):

1. Recognize the document as book-shaped if any of:
   - A `<meta>` block is present with `type=book`.
   - An explicit `<book>` wrapper is present.
2. If no explicit `<book>` exists, generate one wrapping the document's content.
3. Generate `<book-front>` and place the original `<meta>` inside it. Promote `<title>`/`<subtitle>` in `<meta>` to `<book-title>`/`<book-subtitle>` (the promoted elements remain inside `<meta>`).
4. Expand book-part shorthands: `<chapter>`, `<part>`, `<appendix>`, `<preface>`, etc. expand to `<book-part book-part-type="...">`.
5. For each book-part: apply title extraction (pipe content becomes `<book-part-title>` as the first child of `<meta>` inside the book-part; create `<meta>` if absent). **Book-parts do not have nested front/body/back wrappers** — `<meta>` and body content sit directly inside `<book-part>`.
6. Generate `<book-body>` and place body-matter book-parts inside it: `book-part-type` of `chapter`, `part`, `introduction`, `conclusion`, or `other` (default).
7. Generate `<book-back>` and place back-matter book-parts (`appendix`, `glossary`, `colophon`) plus back-matter elements (`<bibliography>`, `<note-list>`, `<data>`, `<config>`) inside it.
8. Move front-matter book-parts (`preface`, `foreword`, `dedication`) into `<book-front>`.

If the author wrote `<book>` or any of the region wrappers explicitly, the plugin does not override; it operates within the explicit wrappers.

**Book-part handling specifically.** When `<meta type=book-part>` appears at the top level (rare; usually book-parts are nested inside a book), the plugin generates a top-level `<book-part>` with `<meta>` containing the promoted `<book-part-title>` followed by body content. No nested region wrappers are generated inside the `<book-part>`.

**Contract.**
- Input: AST after Phase 1.
- Output: AST with `<book>` containing `<book-front>` (with `<meta>` inside), `<book-body>` (containing chapter-like book-parts), and `<book-back>` (containing appendix-like book-parts plus back-matter elements). Each region present only if it has content. Each `<book-part>` directly contains `<meta>` (if any metadata) and body content with no nested region wrappers.

**Dependencies.** Phase 1 complete. Independent of `acadamarkArticleStructuring`. The two plugins are mutually exclusive — a document is either article-shaped or book-shaped, determined by `<meta>`'s `type` kwarg.

### `acadamarkSectionNesting`

**Purpose.** Handle implicit closing of sections at peer-level boundaries. When a new `<section>` opens at the same depth as an open one, the open one is closed implicitly. The plugin restructures the tree so each section's children include only the content that belongs to it.

**Contract.**
- Input: AST with sections potentially flat (each `<section>` followed by its body content as siblings rather than children).
- Output: AST with each section properly containing its body content.

**Dependencies.** Runs after `acadamarkArticleStructuring` and `acadamarkBookStructuring` (which may have rearranged sections during their grouping passes).

### Title extraction

**Purpose.** For elements with `title_extraction: true`, the recursively-parsed pipe content becomes the children of the appropriate title element. The title element is added as the first child of the container.

**Contract.**
- Input: container element with pipe content already parsed.
- Output: container element with title element as first child; pipe content moved into title element.

**Dependencies.** This is conceptually part of the structural plugins (article and book structuring run it as part of their work). Listed here for clarity. Not a separate plugin in implementation.

## Phase 3: Resolution and rendering

Resolution plugins use the AST and registries to compute final attributes (numbers, link text, citation markers). The interpreter then produces the final HTML.

### Numbering plugins

**Purpose.** Assign sequential numbers to numbered elements (figures, tables, equations, sections, sub-sections, sub-sub-sections, listings, theorems). Apply the document's `numbering-style` setting (arabic, roman, alpha).

**Contract.**
- Input: AST with structural transformations complete.
- Output: numbered-elements registry populated. Each numbered element has a `data-number` attribute (or equivalent).

**Dependencies.** Phase 2 complete. Section numbering depends on section nesting being correct.

The specific numbering plugins (one per numbered element type, or one shared plugin) are implementation details. The contract is what matters.

### `acadamarkNoteNumbering`

**Purpose.** Assign sequential numbers to `<note>` elements based on document order. Generate the visible reference marker (typically a superscript number) at the note's source location.

**Contract.**
- Input: AST with notes possibly inline at their source positions.
- Output: AST with each `<note>` having a `data-note-number` attribute and a generated reference marker.

**Dependencies.** Phase 2 complete. Runs in parallel with other numbering plugins.

### `acadamarkCitationResolution`

**Purpose.** Find `<cite>` elements. Resolve each against the citation registry. Apply the document-level citation style (or per-citation override). Generate the rendered citation marker text.

**Contract.**
- Input: AST with `<cite>` elements; citation registry populated by Phase 1.
- Output: AST with each `<cite>` having generated content (the citation marker text). Cited entries flagged in registry for bibliography assembly.

**Dependencies.** Phase 1 (citation registry populated) and Phase 2 (structural transformations complete).

### `acadamarkCrossReferenceResolution`

**Purpose.** Find `<ref>` elements. Resolve each against the numbered-elements registry. Generate the rendered cross-reference text appropriate to the target type and format kwarg.

**Contract.**
- Input: AST with `<ref>` elements; numbered-elements registry populated by numbering plugins.
- Output: AST with each `<ref>` having generated content (link text).

**Dependencies.** Numbering plugins (the registry must be populated). Runs in parallel with citation resolution.

### `acadamarkNotePlacement`

**Purpose.** Move notes to their rendered position based on document-level `note-position` setting:
- `foot`: notes stay in source position; rendering pipeline (CSS or print) handles foot-of-page placement.
- `end`: notes collect into a `<note-list>` at the document back-matter location.
- `side`: notes stay in source position; rendering uses CSS-grid or floating positioning.
- `chapter-end`: notes collect into a `<note-list>` at the end of each chapter.

**Contract.**
- Input: AST with notes numbered (by `acadamarkNoteNumbering`) and possibly inline.
- Output: AST with notes in their appropriate rendered positions; `<note-list>` elements generated where needed.

**Dependencies.** `acadamarkNoteNumbering` (notes need numbers before placement).

### `acadamarkBibliographyAssembly`

**Purpose.** Read the citation registry, identify entries that were cited, sort according to the bibliography style, format each entry, place them as children of `<bibliography>`. Generate the `<bibliography>` element if not explicitly authored.

**Contract.**
- Input: citation registry with cited entries flagged (by `acadamarkCitationResolution`).
- Output: AST with `<bibliography>` element populated with formatted bibliography entries; auto-placed in `<article-back>` (or `<book-back>`) if no explicit `<bibliography>` was authored.

**Dependencies.** `acadamarkCitationResolution` (registry must reflect what was cited).

### `acadamarkTagInterpret`

**Purpose.** The main interpreter. Walks the AST. For each acadamarkTag node, looks up the vocabulary entry; dispatches based on `interpreter_strategy`:
- `schema`: applies the schema's transformation rules to produce Layer 1 HTML.
- `handler`: invokes the named handler module.

Produces the final HTML output.

**Contract.**
- Input: AST after all previous phases. All references resolved, all numbers assigned, all structural transformations complete.
- Output: HTML output (rehype tree, or string).

**Dependencies.** All previous phases. This is the last plugin in the pipeline.

## Pipeline ordering summary

```
Phase 1: Discovery (parallel)
├── acadamarkConfigDiscovery
├── acadamarkLibraryParsing
├── acadamarkBibEntryRegistration
└── (bibliography source resolution, after config discovery)

Phase 2: Structural transformation (sequential)
├── acadamarkArticleStructuring OR acadamarkBookStructuring
└── acadamarkSectionNesting

Phase 3: Resolution and rendering (mostly parallel with dependencies)
├── Numbering plugins (figures, tables, equations, sections)
│   └── acadamarkCrossReferenceResolution (depends on numbering)
├── acadamarkNoteNumbering
│   └── acadamarkNotePlacement (depends on note numbering)
├── acadamarkCitationResolution (depends on Phase 1 registries)
│   └── acadamarkBibliographyAssembly (depends on citation resolution)
└── acadamarkTagInterpret (depends on all previous)
```

## Implementation considerations

**Plugin framework.** Acadamark's plugins are unified/rehype plugins, conventional in the unified ecosystem. Each plugin operates on a tree visitor or via direct AST traversal.

**Registry storage.** Registries (configuration, citation, numbered-elements) live in the plugin context — the unified processor's data store or a similar shared state. Each plugin reads from and writes to the registry as needed. Registries are scoped to a single processing pass; they don't persist across documents.

**Error handling.** Each plugin follows the principle "documents always render to something." Errors (unresolved references, missing bibliography source, malformed library content) produce visible markers in the output rather than blocking the build. Specific error behaviors are documented in individual plugin specs (referenced from vocabulary entries).

**Slice plan.** The first interpreter slice will likely implement only:
- A subset of Phase 1 (config discovery is straightforward).
- The article-side of Phase 2 (article structuring, section nesting, title extraction).
- A minimal Phase 3 (just `acadamarkTagInterpret` for the in-scope vocabulary; no numbering, citations, cross-references yet).

Subsequent slices add the resolution plugins (citations, cross-references, notes) and book-shaped structural transformation. The pipeline contract above defines the interface between slices.

## Related references

- `notes/interpreter-design.md` — high-level interpreter architecture.
- `notes/shape-tokens.md` — shape token definitions used by the interpreter for validation.
- `packages/layer1-vocabulary/SPEC.md` — vocabulary specification.
- `packages/layer1-vocabulary/elements/` — vocabulary entries that reference these plugins.
