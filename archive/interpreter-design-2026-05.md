> **Archived 2026-Q2.** This document describes an interpreter architecture (`acadamarkTagInterpret` as a single rehype plugin doing schema-driven dispatch) that was not implemented. The actual interpreter is a chain of mdast plugins plus toHast handlers. See `notes/interpreter.md` for the current architecture (to be written in audit Step 2). Retained here for historical reference.

---

# Interpreter design

This document records the architectural decisions for `acadamarkTagInterpret`, the plugin that transforms acadamark AST nodes into Layer 1 HTML. It is the bridge between the parser substrate and rendered output.

## Position in the pipeline

The interpreter runs as a rehype plugin, after `remarkRehype` has converted the mdast tree (with acadamarkTag nodes) into a hast tree. The interpreter walks the hast tree, finds nodes that originated as acadamarkTag, and replaces each with the corresponding Layer 1 HTML structure.

```
remarkParse + acadamark + remark-math + remark-gfm
  → recursive-content plugin (mdast)
  → remark-rehype (mdast → hast)
  → acadamarkTagInterpret  ← here
  → acadamarkSectionNesting
  → acadamarkNumbering
  → acadamarkCitations
  → acadamarkCrossRefs
  → rehype-katex
  → rehype-shiki
  → rehype-stringify
```

The interpreter produces Layer 1 HTML elements; downstream plugins (section nesting, numbering, citation/cross-ref resolution) operate on those elements.

## Design philosophy

Acadamark takes a top-down view of the entire system and leverages HTML to create output. It is not an HTML+ system — it is not "HTML with academic features added." It is an academic publishing system that uses HTML as the rendering substrate.

The interpreter is the place where this top-down view becomes concrete output. It is one plugin because the design is one coherent system, not a collection of HTML augmentations.

## Schema-driven dispatch with escape hatches

The interpreter uses a schema-driven approach for transformation, with escape hatches for tags that need imperative logic.

Each Layer 1 tag has a schema entry in the vocabulary describing:
- The output HTML element name.
- How acadamark attributes map to HTML attributes.
- Where content goes (as element children, as a specific sub-element, etc.).
- Any default attributes the output should carry.
- Whether the tag has children that should be wrapped specially (e.g., figure caption wrapped in `<figcaption>`).

For tags whose transformation cannot be expressed as a simple schema (because the output structure depends on attributes, or because external engine output needs to be embedded, or because the transformation is genuinely complex), the schema provides a handler function instead. The handler receives the acadamark node and returns a hast subtree.

This pattern matches how rehype-sanitize, rehype-format, and other unified-ecosystem plugins handle transformation: declarative for the common case, imperative escape hatch when needed.

Content shape validation (whether a tag's children are permitted in its content model) uses the `inline`, `block`, and `section` tokens defined in `notes/shape-tokens.md`. The schema's `contains` field references these tokens; the interpreter expands them at validation time against the central token-membership lists.

## Schemas live in the Layer 1 vocabulary

Schema definitions are part of each Layer 1 tag's vocabulary entry, not in a separate file. The vocabulary already specifies what each tag means semantically; the schema specifies how that semantic meaning becomes HTML.

This means:
- The `packages/layer1-vocabulary/` package is the source of truth for both vocabulary and rendering.
- The interpreter reads vocabulary entries to find schemas.
- Adding a new Layer 1 tag means adding a new vocabulary entry, which automatically includes a schema.
- The vocabulary package must exist before the interpreter can be built.

## Attribute mapping

Each schema entry describes how acadamark attributes map to HTML attributes.

Some mappings are conventionally direct:
- `id` → HTML `id`.
- `classes` → HTML `class` (joined with spaces).
- Most kwargs → corresponding HTML attributes.

Some mappings are tag-specific:
- `<cite>`'s positional argument becomes `data-cite-key`, not an HTML attribute named "positional."
- `<figure>`'s `src` kwarg generates an `<img>` child element.
- `<ref>`'s target id is captured from the `#id` positional argument (or `target=` kwarg). A pre-pass plugin (`acadamarkRefResolution`) walks the mdast, looks up each target in the label index, and replaces the `<ref>` node with a `__ref-marker` (resolved) or `__ref-error` (unresolved) internal node before hast conversion. The final rendered element is `<a class="ref" href="#id">text</a>` or `<a class="ref-error" href="#id">??ref: id??</a>` — no `data-ref-target` attribute is emitted.

The schema for each tag defines its specific mappings. Standard mappings (id, classes) can be defaults so that not every schema has to repeat them.

## Async by default

The interpreter is asynchronous. The transform function returns a promise. This allows DSL engines that produce output asynchronously (Mermaid, executable code) to integrate naturally. Synchronous engines (KaTeX) are wrapped in `Promise.resolve()` and integrate transparently.

Async also opens up parallelism: independent engine calls can run concurrently rather than serially.

## DSL engine integration

DSL tags (math, csv, mermaid, executable code, etc.) require external engines to process their content. The interpreter integrates these via an adapter pattern.

Each engine has an adapter:
- Lives alongside the engine (or in a dedicated adapters directory).
- Receives `(content, attributes)` from the interpreter.
- Calls the engine appropriately (sync or async).
- Converts engine output to a hast subtree.
- Handles errors by returning an error node, not throwing.

Adapters are registered with the interpreter at pipeline setup. The interpreter dispatches to the appropriate adapter based on the tag's `contentHandler` field (set by the parser via the DSL registry).

The DSL registry, the `contentHandler` field on AST nodes, and the engine adapters together form the dispatch mechanism. The interpreter doesn't know about specific engines; it knows how to call adapters.

## Error handling

Per the project's error-recovery principle: the parser always produces a tree; the document always renders to something. The interpreter inherits and extends this principle.

Error cases the interpreter handles:

- **Unknown tag.** A tagname not present in the vocabulary. Produce an `<acadamark-error>` element with diagnostic information. Continue processing the rest of the tree.
- **Engine failure.** A DSL engine's adapter throws or returns invalid output. Produce an error node containing the engine's error message. Continue.
- **Schema mismatch.** A tag's attributes are inconsistent with the schema (required attribute missing, etc.). Produce an error node noting the mismatch. Continue.
- **Existing parse errors.** `acadamarkTagError` and `acadamarkParseError` nodes from earlier stages are preserved and rendered as visible error markers in the output.

Errors are visible in the rendered document. The author can locate problems by looking at where rendering breaks. They never see a "compilation failed, no output" state.

## Configurability

The interpreter has minimal configurability in its initial form. Schemas describe the default rendering for each tag; there is no mechanism for documents to override the default.

If users later need overrides (custom citation styles, alternative figure layouts), configuration can be added. For now, vocabulary-as-default is the simplest design and matches the principle that acadamark is opinionated about its outputs.

## Slicing strategy

The interpreter is built in slices, each producing visible end-to-end output for a growing set of features.

**Slice I — Interpreter scaffolding plus structural tags.** The interpreter framework: schema-driven dispatch with escape hatches, async transform, error handling. Plus 16 in-scope structural tags:

- article
- section, sub-section, sub-sub-section
- p
- aside, blockquote
- hr
- figure (with figcaption)
- ul, ol, li
- em, strong
- code (inline)
- meta

The auto-generated child elements that the structural plugins produce — `<article-front>`, `<article-body>`, `<article-back>`, `<section-title>`, `<sub-section-title>`, `<sub-sub-section-title>` — are in scope by virtue of being created by the slice's plugins; they are not authored directly in this slice.

Excluded from this slice (deferred to subsequent slices): `<a>`, `<img>`, `<pre>`+`<code>` (display code block), `<cite>`, `<ref>`, `<note>`, math sigils, and other inline elements not listed above.

After this slice, simple structural acadamark documents render to real HTML.

**Slice II — Math.** Add the DSL engine adapter pattern. Implement math via KaTeX. After this slice, math renders.

**Slice III — Citations and cross-references.** Schema entries for `<cite>` and `<ref>` produce hast nodes with appropriate `data-*` attributes. The actual resolution (against bibliography, against numbered elements) is handled by separate resolver plugins (`acadamarkCitations`, `acadamarkCrossRefs`) which are also built in this or later slices.

**Subsequent slices.** Other DSL engines (CSV, mermaid). Theorem-family elements. Resolver plugins for numbering, citations, cross-references. Complete vocabulary coverage.

Each slice ends with passing tests, documentation updates, and a drift check.

## What's not in scope for the interpreter

- Citation resolution against a bibliography (separate plugin).
- Cross-reference resolution against numbered elements (separate plugin).
- Numbering of figures, equations, sections (separate plugin).
- Section nesting (separate plugin).
- Final HTML serialization (rehype-stringify).
- Math rendering itself (rehype-katex; the interpreter just produces math nodes).

Each of these is a separate concern handled by its own plugin. The interpreter focuses solely on tag-to-HTML transformation.

## Dependencies

The interpreter depends on:

- The Layer 1 vocabulary package (for schemas).
- Standard unified ecosystem packages (hast utilities).
- Engine adapters (for DSL tags).

The interpreter does not depend on the specific engines themselves. Adapters are registered separately, allowing the interpreter to be used with different engine implementations.

## Implementation status

- The interpreter does not yet exist. It is the next major piece of work after the parser.
- Prerequisites are complete: the Layer 1 vocabulary package is set up at `packages/layer1-vocabulary/`, and the attribute-spec pass is done — 63 per-element entries under `elements/` provide structured frontmatter with attribute lists, content shapes, JATS mappings, and render-mode lowering.
- The next major piece of work is the **first interpreter slice**, scoped to the 16 in-scope structural elements (article, section, sub-section, sub-sub-section, p, aside, blockquote, hr, figure, ul, ol, li, em, strong, code, meta) plus the structural plugins that produce `<article-front>` / `<article-body>` / `<article-back>`, section titles, and section nesting. See the "Slicing strategy" section above for the full slice scope.

## Why this matters

The interpreter is what makes acadamark a usable authoring system. Without it, the parser produces structured AST that nobody can render. With it, acadamark documents become HTML, and the rest of the unified ecosystem can take over for math rendering, syntax highlighting, and serialization.

The first interpreter slice is the first time the test document partially renders to actual HTML. That's the moment the project shifts from "parser substrate" to "academic publishing system."
