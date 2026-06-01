# Multi-file authoring

Multi-file authoring lets an enscribe document be split across several
files — one file per chapter, separate files for appendices, shared
bibliography files — with a project-level configuration tying them
together. This document describes the intended mechanism. (Whether it is
built is a STATUS question; the open work is tracked in
GitHub Issues.)

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

**Project configuration.** A project-level file (`enscribe.yml` or
similar) describes:

- Which files belong to the project.
- The order/structure (which file is which chapter, what is front-matter
  vs body vs back-matter).
- Project-level metadata (authors, title, license) inherited by all files.
- Bibliography source paths.

**Include directive.** Within an enscribe file, an explicit include
references another file:

```
<include src="chapter-1.emd">
```

The interpreter reads the included file's content and inserts it at the
include's location. The included file's content is processed as if it
were inline (recursive parsing, structural transformations, etc.).

The pipeline integration of `<include>` is an open design question
(MF-Q4 in §"Open design questions" below): *where* in the pipeline
include expansion runs (a structural plugin walking the AST versus a
parser-level re-parse of the referenced file inline), and *when*
include-referenced files that are not listed in the project config are
discovered in time to participate in Phase 1's project-wide registries,
are both undecided.

The project configuration and the explicit include directive are two
mechanisms that can each carry the document's structure on its own — a
document using only the project config, or only includes, is well-defined
in each case taken alone. How the two mechanisms interact when a single
document uses both is an open design question (MF-Q1 in §"Open design
questions" below): when the project config lists a file and another file
also `<include>`s it, the de-duplication rule and the ordering precedence
have not been decided.

## Cross-reference implications

Cross-references across files require the resolver to know about all
files in the project at resolution time:

- Citations (`<cite goodall2024>`) reference the project-wide
  bibliography registry; entries come from any file's `<library>` blocks
  or any explicitly-included `<bib-entry>`.
- Cross-references (`<ref fig-1>`) reference numbered elements anywhere
  in the project. The numbering plugins process the project as a whole,
  not file-by-file.
- Notes (`<note>`) are numbered across the project. The `placement` kwarg
  on `<note>` (values `end`, `foot`, `side`, per `notes/specs/interpreter.md`
  §3.6) governs where each note appears. A chapter-end placement mode for
  multi-file documents depends on the per-section / per-chapter note
  collection work tracked in GitHub Issues landing first;
  it is not a currently available `placement` value.

Multi-file processing is therefore not "process each file separately and
concatenate." The plugin pipeline operates on the project's combined
AST, not per-file ASTs.

## Plugin pipeline shape

The interpreter pipeline (see `notes/specs/pipeline.md`) extends to multi-file
processing without redesign of the per-phase responsibilities. The
registries (configuration, citation, numbered-elements) are shared
resources populated by multiple file passes before resolution runs; *what
each phase does* is unchanged from the single-file pipeline. The
difference is that the registries span the project rather than a single
file.

- **Phase 1 (Discovery).** `enscribeConfigDiscovery` reads `<config>`
  blocks (per `notes/specs/pipeline.md` §4.1 and `notes/specs/interpreter.md`
  §3.2). In multi-file mode the configs read from every file accumulate
  into the project-wide config registry.
- **Phase 2 (Structural transformation).** Per-file structural
  transformation runs as in the single-file pipeline. The project-level
  structure (book front/body/back containing chapters) is enforced at a
  separate level — a "project structuring" stage.
- **Phase 3 (Resolution and rendering).** Includes the existing
  `buildCitationIndex` step (`pipeline.md` §4.4 / `interpreter.md` §3.5),
  which is the step that reads `<library>` / `<data>` citation source —
  citation library loading is a Phase 3 responsibility in the core
  pipeline and remains so in multi-file mode, with the resulting citation
  index spanning the project. Cross-references resolve against
  project-wide registries; bibliography assembles from the project's
  cited entries.

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
   metadata (book title, book authors) is *sourced* from the project
   configuration file, not from any single chapter. Where project-level
   metadata *lands in the assembled multi-file AST* — for example as a
   synthesized top-level front-matter block, or distributed as
   per-chapter inherited defaults — is an open design question (MF-Q3 in
   §"Open design questions" below).

3. **Bibliography.** A shared bibliography file (e.g. `references.bib`)
   referenced from the project config is the typical pattern.
   Chapter-level `<library>` blocks add chapter-specific references. Both
   work; the resolver merges.

4. **Cross-references across chapters.** Chapter 3 references a figure
   in chapter 1. The numbering plugin processes the project in chapter
   order so chapter 1's figures get their numbers first. The resolver
   knows about all numbered elements across chapters.

5. **Standalone-chapter view.** An author can render just one chapter,
   not the whole book — processing a single file with its cross-file
   references stub-resolved (the spec shows `[?ref]` for the
   cross-reference case as an illustrative marker shape). The
   *invocation mechanism* for standalone mode (CLI flag, `<config>`
   option, automatic-on-missing-project-config), the *scope of stub
   resolution* (in particular, whether standalone mode loads the
   project-config-declared shared bibliography to resolve `<cite>` or
   treats cross-file cites as unresolved stubs), and the *stub-marker
   family* (the corresponding shapes for cites, notes, and any other
   cross-file reference) are open design questions (MF-Q2 in §"Open
   design questions" below).

## Open design questions

These are undecided design forks the rest of the spec previously presented
as settled. They are not blocking issues — they are decisions owed
*before* the multi-file feature is built.
Each is filed as a discussion item in GitHub Issues (surfaced by
the Front C extensions-cluster spec audit); the decision happens there,
not in this spec.

- **MF-Q1 — project-config / `<include>` interaction.** When the project
  configuration lists a file and another file also `<include>`s it: is
  the inclusion de-duplicated (project config canonical, redundant
  `<include>` silently skipped) or does the file appear at every
  referenced position (both mechanisms run independently)? And if
  ordering disagrees between the project config and an `<include>`
  position, which wins? Undecided.

- **MF-Q2 — standalone-chapter mode: invocation and bibliography scope.**
  Three undecided sub-points:
  - *Invocation:* CLI flag, `<config>` option, automatic-on-missing-
    project-config, or some combination?
  - *Bibliography scope:* in standalone mode, is the project-config-
    declared shared bibliography loaded (so cross-file `<cite>` still
    resolves) or treated as unavailable (all cross-file cites become
    unresolved stubs)?
  - *Stub-marker family:* the spec illustrates `[?ref]` for the
    cross-reference case; the corresponding marker shapes for cites,
    notes, and any other cross-file reference are not enumerated.

- **MF-Q3 — project-metadata placement in the assembled AST.** The spec
  states project metadata is *sourced* from the project config file but
  does not say where it *lands* in the assembled multi-file AST. Two
  shapes (among possible others) the spec does not choose between: a
  synthesized top-level front-matter block (e.g. a `<book-front>`
  containing a `<meta>` populated from the project config, prepended to
  the assembled book AST) versus distribution as inherited defaults
  available to each chapter's per-chapter `<meta>` lookups without
  appearing as a separate AST node. Different shapes affect downstream
  cross-reference resolution, JATS export, and rendering.

- **MF-Q4 — `<include>` pipeline placement and discovery timing.** Two
  undecided sub-points:
  - *Pipeline placement:* is `<include>` expansion a structural plugin
    that walks the parsed AST and splices included file content, or a
    parser-level extension that re-parses the referenced file inline
    during the initial parse? The choice has consequences (whether the
    included file sees the parent's `<config>` context; whether it runs
    through its own recursive-content pass; what stage owns the
    file-reading concern).
  - *Discovery timing:* Phase 1 is project-wide, but `<include>`
    directives are inside file content and only visible once parsing has
    happened. Does a pre-Phase-1 discovery sweep collect all transitive
    include targets, or are include-referenced files not listed in the
    project config invisible to Phase 1's project-wide registries?

## Related references

- `notes/specs/pipeline.md` — the pipeline; describes registries that extend
  to multi-file.
- `packages/layer1-vocabulary/elements/book.md` — book-shaped documents
  that benefit most from multi-file.
- `packages/layer1-vocabulary/elements/book-part.md` — chapters as
  book-parts.
- MyST's `_toc.yml` documentation: https://mystmd.org/
- Quarto's `_quarto.yml` documentation: https://quarto.org/
