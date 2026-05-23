# Multi-file authoring — deferred feature

This document captures the design intent for multi-file authoring in acadamark. The feature is deferred to a future slice; this note preserves the thinking so it can be resumed when implementation begins.

## Status

Deferred. Not in slice 1 (interpreter scaffolding) or planned subsequent slices. The feature becomes relevant when acadamark is used for long-form documents (books, dissertations, large papers with appendices) or collaborative authoring where chapters live in separate files maintained by different authors.

## Use cases

The feature targets several authoring patterns:

- **Books.** A book has a top-level structure (front matter, chapters, back matter) that's natural to split across files — one file per chapter. The master file describes the structure and includes the chapter files.

- **Long papers with appendices.** A paper's main text and its appendices are often best maintained separately. Reviewers see the main text; appendices are supplementary. Separate files reflect this separation cleanly.

- **Collaborative authoring.** When different authors write different sections, separate files reduce merge conflicts and let each author work independently. A coordinator assembles the parts via the master file.

- **Reusable content.** A bibliography file, a glossary, or a set of common figures might be shared across multiple documents. The include mechanism enables this.

## Design references

Two ecosystems have well-developed multi-file support worth studying:

- **Quarto** uses `_quarto.yml` at the project root. The configuration lists files in the project, their order, and metadata. Cross-references work across files via the project-level resolver.

- **MyST** uses `_toc.yml` for table-of-contents and project structure. The mystmd CLI processes the project as a whole, resolving cross-references and citations across all included files.

Both systems separate the project configuration (the toc) from the authoring (the markdown files). The toc is structural; the files are content.

## Likely mechanism

The mechanism has two layers:

**Project configuration.** A project-level file (probably `acadamark.yml` or similar) describes:
- Which files belong to the project.
- The order/structure (which file is which chapter, what's front-matter vs body vs back-matter).
- Project-level metadata (authors, title, license) inherited by all files.
- Bibliography source paths.

**Include directive.** Within an acadamark file, an explicit include can reference other files:

```
<include src="chapter-1.acm">
```

The interpreter reads the included file's content and inserts it at the include's location. The included file's content is processed as if it were inline (recursive parsing, structural transformations, etc.).

The project configuration is the canonical structure; explicit includes are an authoring affordance for finer-grained control. Both should work; documents using only the project config work; documents using only includes work; mixed use works.

## Cross-reference implications

Cross-references across files require the resolver to know about all files in the project at resolution time:

- Citations (`<cite goodall2024>`) reference the project-wide bibliography registry; entries can come from any file's `<library>` blocks or any explicitly-included `<bib-entry>`.
- Cross-references (`<ref fig-1>`) reference numbered elements anywhere in the project. The numbering plugins must process the project as a whole, not file-by-file.
- Notes (`<note>`) are numbered across the project; placement depends on `note-position` (chapter-end notes vs document-end notes).

This means multi-file processing isn't just "process each file separately and concatenate." The plugin pipeline (Phases 1-3) operates on the project's combined AST, not per-file ASTs.

## Plugin pipeline impact

The plugin pipeline (`notes/pipeline.md`) is currently described for single-file processing. Multi-file support requires:

- **Phase 1 (Discovery):** Reads config, library, bib-entry from all files. Registry is project-wide.
- **Phase 2 (Structural transformation):** Per-file structural transformation runs, but the project-level structure (book front/body/back containing chapters) is enforced at a separate level — possibly a "project structuring" plugin.
- **Phase 3 (Resolution and rendering):** Cross-references resolve against project-wide registries. Bibliography assembles from the project's cited entries.

A project-level interpreter wrapper coordinates the per-file processing. The interpreter itself stays focused; the wrapper handles project-level concerns.

## Authoring patterns to consider

Several authoring patterns surface design questions:

**1. Order in the toc vs. order in book-body.** Does the toc determine chapter order, or does each chapter file's place in `book-body` via the structural plugin determine it? Probably the toc is authoritative; the structural plugin places content based on file association.

**2. Chapter metadata.** Each chapter's `<meta>` block stays inside its `<book-part>` as the chapter's descriptive metadata container (holding `<book-part-title>`, chapter-specific `<author>`, etc.). But project-level metadata (book title, book authors) lives where? Probably the project configuration file, not in any single chapter. The project configuration declares the book's metadata; chapters declare their own metadata.

**3. Bibliography.** A shared bibliography file (e.g., `references.bib`) referenced from the project config makes sense. Chapter-level `<library>` blocks add chapter-specific references. Both work; the resolver merges.

**4. Cross-references across chapters.** Chapter 3 references a figure in chapter 1. The numbering plugin must process the project in chapter order so chapter 1's figures get their numbers first. The resolver knows about all numbered elements across chapters.

**5. Standalone-chapter view.** Sometimes an author wants to render just one chapter, not the whole book. The interpreter should support this — process a single file with its references stub-resolved (showing `[?ref]` markers for cross-file references that can't resolve in single-file mode).

## What this means for slice 1

Slice 1 implements single-file processing. The interpreter's architecture should accommodate future multi-file work but doesn't need to support it now.

The key design principle is **the registries (configuration, citation, numbered-elements) are shared resources that can be populated by multiple files later.** Slice 1 implements them as per-pipeline state; multi-file just means the same registries are populated by multiple file passes before resolution runs.

The plugin contracts in `notes/pipeline.md` are compatible with multi-file processing — they specify what registries are read/written rather than how they're scoped. This means multi-file support is an architectural extension, not a redesign.

## When to implement

Multi-file support becomes valuable when:

- Real users want to author books in acadamark (most likely the first driver).
- Cross-file references emerge as a real need (when single-file processing hits its limits).
- A specific user has a use case that requires it.

Plausibly slice 3 or later. After citations resolve cleanly within a single file (slice 2), the extension to multi-file resolution is a natural next step.

## Related references

- `notes/pipeline.md` — the current single-file pipeline; describes registries that would extend to multi-file.
- `packages/layer1-vocabulary/elements/book.md` — book-shaped documents that benefit most from multi-file.
- `packages/layer1-vocabulary/elements/book-part.md` — chapters as book-parts.
- MyST's `_toc.yml` documentation: https://mystmd.org/
- Quarto's `_quarto.yml` documentation: https://quarto.org/
