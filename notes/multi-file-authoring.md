# Multi-file authoring

Multi-file authoring lets an acadamark document be split across several
files — one file per chapter, separate files for appendices, shared
bibliography files — with a project-level configuration tying them
together. This document describes the intended mechanism. (Whether it is
built is a STATUS question; the open work is tracked as DF-4 in
`notes/acadamark-backlog-roadmap.md`.)

## Use cases

- **Books.** A book has a top-level structure (front matter, chapters,
  back matter) that splits naturally across files — one file per chapter,
  with a master file describing the structure.
- **Long papers with appendices.** A paper's main text and its appendices
  are often best maintained separately. Reviewers see the main text;
  appendices are supplementary.
- **Collaborative authoring.** When different authors write different
  sections, separate files reduce merge conflicts and let each author
  work independently. A coordinator assembles the parts via the master
  file.
- **Reusable content.** A bibliography file, a glossary, or a set of
  common figures may be shared across multiple documents. The include
  mechanism enables this.

## Design references

Two ecosystems have well-developed multi-file support, both worth
consulting:

- **Quarto** uses `_quarto.yml` at the project root. The configuration
  lists files in the project, their order, and metadata. Cross-references
  work across files via the project-level resolver.
- **MyST** uses `_toc.yml` for table-of-contents and project structure.
  The mystmd CLI processes the project as a whole, resolving
  cross-references and citations across all included files.

Both systems separate the project configuration (the toc) from the
authoring (the markdown files). The toc is structural; the files are
content.

## Mechanism

The mechanism has two layers.

**Project configuration.** A project-level file (`acadamark.yml` or
similar) describes:

- Which files belong to the project.
- The order/structure (which file is which chapter, what is front-matter
  vs body vs back-matter).
- Project-level metadata (authors, title, license) inherited by all files.
- Bibliography source paths.

**Include directive.** Within an acadamark file, an explicit include
references another file:

```
<include src="chapter-1.acm">
```

The interpreter reads the included file's content and inserts it at the
include's location. The included file's content is processed as if it
were inline (recursive parsing, structural transformations, etc.).

The project configuration is the canonical structure; explicit includes
are an authoring affordance for finer-grained control. Both work;
documents using only the project config work; documents using only
includes work; mixed use works.

## Cross-reference implications

Cross-references across files require the resolver to know about all
files in the project at resolution time:

- Citations (`<cite goodall2024>`) reference the project-wide
  bibliography registry; entries come from any file's `<library>` blocks
  or any explicitly-included `<bib-entry>`.
- Cross-references (`<ref fig-1>`) reference numbered elements anywhere
  in the project. The numbering plugins process the project as a whole,
  not file-by-file.
- Notes (`<note>`) are numbered across the project; placement depends on
  `note-position` (chapter-end notes vs document-end notes).

Multi-file processing is therefore not "process each file separately and
concatenate." The plugin pipeline operates on the project's combined
AST, not per-file ASTs.

## Plugin pipeline shape

The interpreter pipeline (see `notes/pipeline.md`) extends to multi-file
processing without redesign. The registries (configuration, citation,
numbered-elements) are shared resources populated by multiple file passes
before resolution runs.

- **Phase 1 (Discovery).** Reads config, library, bib-entry from all
  files. Registry is project-wide.
- **Phase 2 (Structural transformation).** Per-file structural
  transformation runs, but the project-level structure (book front/body/
  back containing chapters) is enforced at a separate level — a
  "project structuring" stage.
- **Phase 3 (Resolution and rendering).** Cross-references resolve
  against project-wide registries. Bibliography assembles from the
  project's cited entries.

A project-level interpreter wrapper coordinates the per-file processing.
The interpreter itself stays focused; the wrapper handles project-level
concerns.

## Authoring patterns

Five patterns deserve explicit framing.

1. **Order in the toc vs. order in book-body.** The toc is authoritative;
   the structural plugin places content based on file association.

2. **Chapter metadata.** Each chapter's `<meta>` block stays inside its
   `<book-part>` as the chapter's descriptive metadata container (holding
   `<book-part-title>`, chapter-specific `<author>`, etc.). Project-level
   metadata (book title, book authors) lives in the project configuration
   file, not in any single chapter.

3. **Bibliography.** A shared bibliography file (e.g. `references.bib`)
   referenced from the project config is the typical pattern.
   Chapter-level `<library>` blocks add chapter-specific references. Both
   work; the resolver merges.

4. **Cross-references across chapters.** Chapter 3 references a figure
   in chapter 1. The numbering plugin processes the project in chapter
   order so chapter 1's figures get their numbers first. The resolver
   knows about all numbered elements across chapters.

5. **Standalone-chapter view.** An author can render just one chapter,
   not the whole book. The interpreter supports this — processing a
   single file with its references stub-resolved (showing `[?ref]`
   markers for cross-file references that cannot resolve in single-file
   mode).

## Related references

- `notes/pipeline.md` — the pipeline; describes registries that extend
  to multi-file.
- `packages/layer1-vocabulary/elements/book.md` — book-shaped documents
  that benefit most from multi-file.
- `packages/layer1-vocabulary/elements/book-part.md` — chapters as
  book-parts.
- MyST's `_toc.yml` documentation: https://mystmd.org/
- Quarto's `_quarto.yml` documentation: https://quarto.org/
