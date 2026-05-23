# Archive

This directory contains materials from acadamark's earlier phases, preserved for historical context. **Nothing here reflects the current architecture.** For current documentation, see:

- [`/README.md`](../README.md) — project overview
- [`/DESIGN.md`](../DESIGN.md) — design rationale
- [`/BUILD.md`](../BUILD.md) — implementation plan
- [`/notes/`](../notes/) — current specifications (Layer 1 naming, shorthand syntax)
- [`/packages/`](../packages/) — current implementation

## Why this material is archived, not deleted

Acadamark went through several false starts before settling on the current approach (HTML+CSS+JS as the substrate, unified/remark/rehype as the implementation ecosystem, JATS as the export target). The exploratory work that led there is genuinely useful:

- It documents *why* certain dead ends are dead ends, which prevents re-litigating them.
- It captures the original problem framing, which sometimes drifts as a project matures.
- The earliest notes (late 2023) show the core insight — "HTML is already a typesetting substrate; we just need conventions and a shorthand" — emerging from frustration with markdown extensions and Quarto/Pandoc opinions. That insight is still load-bearing.

That said, none of the code or class designs in here will be reused. The current architecture is fundamentally different from anything sketched here.

## What's in here

### `pre-rewrite-ideas/`

Brainstorms, syntax sketches, and partial implementations from before the unified-ecosystem rewrite. Notable contents:

- **`12-23-2023.md`** — the original brainstorm. Compares LaTeX, markdown extensions, and HTML+CSS as typesetting substrates. First articulation of the "uniform `<tag attrs | content>` shorthand" idea. Many of the syntax decisions here survived into the current spec; many didn't.
- **`4-7-2024.md`** — milestone note describing the first working section-nesting prototype (regex-based). The hierarchy `article > section > sub-section > sub-sub-section > sub-sub-sub-section` was settled here.
- **`4-20-2024.md`** — broader scope notes: typesetting vs. markup languages, page description languages, the table of "what features need processing."
- **`flow.md`** — early sketch of a processing pipeline and shorthand-tag conventions. Influenced the current `notes/shorthand-syntax.md` but is not authoritative.
- **`javascript_library_plan/`** — class-hierarchy designs for an `Academark` class with `Collection`, `Options`, and per-feature processors. This OOP design has been entirely superseded by the current plugin architecture, where each concern is a separate unified plugin rather than a method on a god-class.
- **`html-markup.md`, `footnotes.md`, `schema-for-academic-publications.md`, `from_ai.md`** — small reference notes and feature checklists.
- **`design-directions-2026-05.md`** — The DD-1 through DD-5 design directions, integrated into `DESIGN.md` (section "Design directions discovered through implementation"); retained because `notes/audit-findings.md` cross-references the DD-numbers. This file carries the fuller implementation-detail version including YAML sketches.

### `ai-conversation-logs/`

Summaries and transcripts of conversations with AI assistants (ChatGPT and Claude) during the exploratory phase. These document the process of working through parser design problems — recursive descent vs. PEG vs. token-stream approaches, DOM-based vs. text-based pipelines, how to handle nested custom tags, how to integrate Citation.js and citeproc-js, and so on.

The technical conclusions in these logs are mostly obsolete — the current implementation uses neither the regex prototypes nor the recursive-descent sketches discussed here. What remains useful is the *negative information*: each log ends with "here's what didn't work and why," which is harder to recover from finished code.

The most consequential single document is `claude/parse_hierarchical_tags.md` (and its accompanying SVG), which traces the realization that `DOMParser`'s auto-correction makes DOM-based hierarchy repair fundamentally awkward. That insight is part of why the current implementation works on mdast/hast trees produced by a real grammar (via micromark + Peggy) rather than trying to repair browser-parsed DOM after the fact.

## 2026-Q2 audit: notes documents retired to archive

Four notes documents were moved here during the 2026-Q2 audit because their content described a system that no longer matches what was built.

- **`interpreter-design-2026-05.md`** — Pre-implementation interpreter architecture: `acadamarkTagInterpret` as a single rehype plugin doing schema-driven dispatch. The actual interpreter is a chain of mdast plugins plus toHast handlers. Replaced by `notes/interpreter.md` (to be written in audit Step 2).

- **`plugin-pipeline-2026-05.md`** — Planning-era pipeline design using plugin names (`acadamarkLibraryParsing`, `acadamarkCitationResolution`, etc.) that diverged from implementation (`acadamarkLibraryLoad`, `acadamarkCiteResolution`, etc.). Replaced by `notes/pipeline.md` (to be written in audit Step 2).

- **`hover-previews-deferred-2026-05.md`** — Pre-implementation hover preview design exploration. Frames the feature as deferred; the feature is now implemented (Tippy.js + Popper.js). See `notes/hover-preview-investigation.md` for the post-implementation record.

- **`text-based-DSLs-2024-05.md`** — Brief reference list of DSL language names with Wikipedia links. Not a spec or design document; no replacement warranted.

## `audit-2026-Q2/` Phase 0 findings

Phase 0 investigation findings from the 2026-Q2 audit and refactor arc (R2–R4, OQ1, NORM, math-coverage, G4, F1, G1). All conclusions have landed in code; retained as the design-rationale record for why the pipeline and normalization pass are shaped as they are.

- **`R2-phase0-findings.md`** — Slice R2 (registry, numbering, ref-resolution, section registration) investigation.
- **`R3-phase0-findings.md`** — Slice R3 (handler layer, toHast, float/figure/table rendering) investigation.
- **`R4-phase0-findings.md`** — Slice R4 (notes, math, inline TeX shortcuts) investigation.
- **`OQ1-phase0-findings.md`** — OQ1 (open questions round 1: config, meta, bibliography placement) investigation.
- **`NORM-phase0-findings.md`** — NORM slice (normalize-markdown: bare math and bare pipe-table normalization) investigation.
- **`math-coverage-phase0-findings.md`** — Math coverage investigation (KaTeX, MathJax, rendering surface, font bundling).
- **`G4-phase0-findings.md`** — G4 (code-block cross-reference registration, PG-6/PG-7) investigation.
- **`F1-phase0-findings.md`** — F1 (citation key ordering, CSL sort override) investigation.
- **`G1-phase0-findings.md`** — G1 (inline TeX shortcuts: `^{}` superscript, `_{}` subscript) investigation.

## `investigations-2026-05/`

Spent Phase-0-style investigations whose conclusions have all landed in code or specs. **Note: `font-investigation.md` is the de-facto reference for the font-bundling rationale (font choices, Latin subsetting, base64 embedding approach) until a dedicated spec exists.** A pointer to it has been added to `notes/known-limitations.md`.

- **`citations-investigation.md`** — Citation.js / citeproc-js integration options; CSL style selection.
- **`cross-ref-investigation.md`** — Cross-reference resolution strategies; label-index design.
- **`font-investigation.md`** — Font selection, subsetting, and base64-embedding rationale. **De-facto font-bundling spec.**
- **`hover-preview-investigation.md`** — Post-implementation hover preview record (Tippy.js + Popper.js).
- **`parser-maturity-investigation.md`** — Parser ecosystem survey (micromark, Peggy, tree-sitter alternatives).
- **`tables-investigation.md`** — Table DSL options; pipe-table normalization decision.
- **`theme-investigation.md`** — CSS theming approach; variable naming conventions.
- **`acadamark_pipeline_runorder_vs_dependency.svg`** — Visual diagram of plugin run-order vs. dependency graph.
- **`document_elements_sources_display_processing.csv`** — Element-to-processing-strategy mapping table.

## Single archived documents (2026-05)

- **`inline-tex-shortcuts-spec-2026-05.md`** — Spec for the `^{}`/`_{}` superscript/subscript shortcut syntax. The G1 feature is built; this is the spec it was built against.
- **`feature-test-document-slice3.5.md`** — Slice-3.5-era markdown feature-test catalog. Originally `notes/test.amd` (wrong extension, stale name). Fully superseded by the current test suite.

---

## What's *not* in here

Code that's still part of the active project lives outside `archive/`:

- The current parser implementation is in `/packages/remark-acadamark/`.
- The pure-micromark parser predecessor (Slices 1–2 of the current parser, before the Peggy hybrid switch) is in `/packages/remark-acadamark-pure-micromark-archive/`. It's archived but kept in `/packages/` because it's still part of the current project's architectural history at the implementation level — not a pre-rewrite artifact.
- The current section-nesting plugin is in `/packages/rehype-section-nesting/`.

## Reading order, if you're curious

For someone trying to understand how acadamark got here:

1. `pre-rewrite-ideas/12-23-2023.md` — the original problem statement.
2. `pre-rewrite-ideas/4-7-2024.md` — the first prototype that worked.
3. `ai-conversation-logs/claude/parse_hierarchical_tags.md` — the moment the regex/DOM approach hit its ceiling.
4. `/DESIGN.md` (current) — the architecture that replaced the regex/DOM approach.
5. `/notes/shorthand-syntax.md` (current) — the syntax spec that grew out of the early brainstorms but is now precise enough to implement against.

Steps 1–3 are in this archive. Steps 4–5 are the current state.