# Patch: BUILD.md — Add JATS export as a Phase 3 deliverable

## Change 1: Add a new entry to the pipeline diagram

### Find this in BUILD.md:

```js
  .use(rehypeKatex)                    // borrowed: math rendering
  .use(rehypeShiki)                    // borrowed: code highlighting
  .use(rehypeStringify)                // hast → HTML text
  .process(source)
```

### Note that JATS export is a *separate* pipeline, not part of the main HTML pipeline.

Add this paragraph before "Lines marked NOVEL are acadamark's contribution":

```markdown
The pipeline above produces HTML — acadamark's primary output. A *parallel* pipeline produces JATS XML by replacing `rehypeStringify` with a JATS converter and inserting `rehypeAcadamarkToJats` before serialization. Both pipelines start from the same Layer 1 hast tree, diverging only at the final stages. See "What's novel" below for `rehypeAcadamarkToJats`.
```

## Change 2: Add `rehype-acadamark-to-jats` to the "What's novel" section

### Find this in BUILD.md (the section listing novel plugins):

```markdown
### 6. `acadamarkCrossRefs` — cross-reference resolution

A rehype plugin. Walks the tree, finds `<ref>` nodes, resolves them against numbered elements (figures, sections, equations, theorems), generates the appropriate link text and anchor, replaces the `<ref>` with an `<a>`. Runs *after* numbering.
```

### Add this section immediately after:

```markdown
### 7. `rehypeAcadamarkToJats` — JATS XML export

A converter plugin (technically not a rehype plugin in the strict sense, since the output is XML rather than HTML, but conceptually parallel). Takes a Layer 1 hast tree and produces JATS XML. Maps acadamark custom elements (`<article-title>`, `<section-title>`, `<sub-section>`, etc.) to their JATS equivalents (`<article-title>`, `<title>` inside `<sec>`, nested `<sec>` elements). Restructures where JATS nesting differs from acadamark's. Pads out required JATS metadata with sensible defaults or explicit author-provided values from a frontmatter block.

The acadamark-to-JATS mapping table is the heart of this plugin. Most mappings are 1:1 element renames. A minority require restructuring — for example, acadamark's flat-then-nested section model maps cleanly onto JATS's recursive `<sec>` model, but acadamark's `<article-title>` plus `<article-subtitle>` becomes JATS's `<title-group>` containing `<article-title>` and `<subtitle>`.

This plugin is what makes acadamark a credible scholarly-publishing target rather than just "another web markdown."
```

## Change 3: Add JATS export to the implementation order

### Find this in BUILD.md:

```markdown
### Phase 3 — Completion

12. Extend numbering to sections, equations, theorems.
13. Add embedded DSL dispatch (Mermaid, ABC, CSV).
14. Specify and implement the remaining Layer 1 vocabulary (theorems, proofs, asides, etc.).
15. Document the Layer 1 specification rigorously.
```

### Replace with:

```markdown
### Phase 3 — Completion and bridges

12. Extend numbering to sections, equations, theorems.
13. Add embedded DSL dispatch (Mermaid, ABC, CSV).
14. Specify and implement the remaining Layer 1 vocabulary (theorems, proofs, asides, etc.), consulting the JATS tag library for naming and conventions before each new element.
15. Document the Layer 1 specification rigorously, including its mapping to JATS.
16. Implement `rehypeAcadamarkToJats` and demonstrate round-trip: an acadamark document → Layer 1 HTML → JATS XML → validated against the JATS schema.
```

## Change 4: Update dependencies

### Find this in BUILD.md (the dependencies list):

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

### Add at the bottom (with a comment that it's for Phase 3):

```
xast-util-to-xml          (for JATS XML serialization, Phase 3)
hast-util-to-xast         (for JATS XML serialization, Phase 3)
```

(`xast` is the xml AST in the unified ecosystem, parallel to mdast and hast. The conversion path is hast → xast → xml string.)
