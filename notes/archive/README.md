# Archive

This directory contains materials from enscribe's earlier phases, preserved for historical context. **Nothing here reflects the current architecture.** For current documentation, see:

- [`/README.md`](../README.md) — project overview
- [`/DESIGN.md`](../DESIGN.md) — design rationale
- [`/BUILD.md`](../BUILD.md) — implementation plan
- [`/notes/`](../notes/) — current specifications (Layer 1 naming, shorthand syntax)
- [`/packages/`](../packages/) — current implementation

## Why this material is archived, not deleted

Enscribe went through several false starts before settling on the current approach (HTML+CSS+JS as the substrate, unified/remark/rehype as the implementation ecosystem, JATS as the export target). The exploratory work that led there is genuinely useful:

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

- **`interpreter-design-2026-05.md`** — Pre-implementation interpreter architecture: `enscribeTagInterpret` as a single rehype plugin doing schema-driven dispatch. The actual interpreter is a chain of mdast plugins plus toHast handlers. Replaced by `notes/interpreter.md` (to be written in audit Step 2).

- **`plugin-pipeline-2026-05.md`** — Planning-era pipeline design using plugin names (`enscribeLibraryParsing`, `enscribeCitationResolution`, etc.) that diverged from implementation (`enscribeLibraryLoad`, `enscribeCiteResolution`, etc.). Replaced by `notes/pipeline.md` (to be written in audit Step 2).

- **`hover-previews-deferred-2026-05.md`** — Pre-implementation hover preview design exploration. Frames the feature as deferred; the feature is now implemented (Tippy.js + Popper.js). See `notes/hover-preview-investigation.md` for the post-implementation record.

- **`text-based-DSLs-2024-05.md`** — Brief reference list of DSL language names with Wikipedia links. Not a spec or design document; no replacement warranted.

## 2026-Q2 documentation-system reconciliation (2026-05-23): two tracking files retired

The first of two reconciliation slices installing the new documentation system (per `notes/audit/documentation-system-design-final.md`) collapsed all open work into `notes/enscribe-backlog-roadmap.md` as the single home. The previous practice of tracking open work across three files violated the new "one job per document" rule; these two were retired once their content had landed elsewhere. (`notes/known-limitations.md` was intentionally retained — see note below.)

- **`audit-findings-2026-05.md`** — The rolling AUD / GAP / DRIFT findings list (AUD-01 through AUD-26, plus GAP-8 and GAP-9). Open entries migrated to `notes/enscribe-backlog-roadmap.md`, placed into the appropriate Layer 0–3 section (with the original AUD ids preserved as "formerly AUD-N" markers). Resolved entries — AUD-01, -02, -03, -09, -10, -11, -12, -16, -20, -26 — recorded as a milestone paragraph in `STATUS.md`. Four entries (AUD-06, formerly DF-20, formerly DF-22, formerly OQ-1) were filed in Layer 0 as **SUSPECTED CLOSED** verification items, awaiting code confirmation against the NORM-tables / math-normalization arc.

- **`specified-not-implemented-2026-05.md`** — The full inventory of specified-but-unbuilt features (DF-1..DF-22, PG-1..PG-13, DS-1..DS-5, OQ-1..OQ-2), each with code-verification notes. Open entries migrated to `notes/enscribe-backlog-roadmap.md` with the same "formerly DF-N" / "formerly PG-N" / "formerly OQ-N" preservation; resolved entries (DF-1, DF-7, PG-6, PG-7, PG-12, PG-13, DS-1..DS-5) recorded as the same milestone paragraph in `STATUS.md`.

**`notes/known-limitations.md` is intentionally retained for the second reconciliation slice.** Most of its entries duplicated PG/AUD items and were migrated under their canonical ids; two entries ("custom elements not registered with the browser" and "only colon-ids are referenceable") are by-design constraints — spec content, not open work — and remain in `known-limitations.md` until reconciliation 2 migrates them into the relevant specs and then archives the file.

- **`known-limitations-2026-05.md`** (added by Reconciliation 2, 2026-05-23) — The previous "Known Limitations" document. Its two by-design entries (custom elements not registered with the browser; cross-references resolve only to colon-ids) were migrated into `DESIGN.md`'s "Design tensions and accepted tradeoffs" section as accepted-tradeoff entries. The remaining entries were already duplicates of items tracked elsewhere (the canonical PG / AUD / DF ids are in `notes/enscribe-backlog-roadmap.md` or closed in `STATUS.md` Milestones); they are preserved here in the archived copy as historical context.

- **`BUILD-2026-05.md`** (added by Reconciliation 2, 2026-05-23) — The previous "Building Enscribe" document. The stale "Where the project is now" status section was overtaken; the project's current state lives in `STATUS.md`. Four pieces of architectural content were migrated into the specs as deliberate additions (not pasted): the parser-substrate decision rationale (regex / hand-grammar / unified comparison) and the JATS export plugin shape went into `DESIGN.md`; the "mental model" preamble (trees-not-strings; mdast/hast; remark/rehype/micromark) went into `notes/pipeline.md` as a new §0; the parser-knows-nothing-about-meaning principle went into `notes/principles.md`. The remaining content — the original Phase 1 / Phase 2 / Phase 3 implementation plan and the shorthand parser slice map — is preserved here as implementation history.

- **`enscribe-session-handoff-2026-05.md`** (added by Reconciliation 2, 2026-05-23) — The previous cross-session orientation document ("where things stand, working method, decided design calls, full backlog"). Retired because the new documentation system does not need a separate handoff document — `STATUS.md` (current state + in flight/next) plus `notes/enscribe-backlog-roadmap.md` is the handoff. The handoff's "decided design calls" content was checked against the live specs: F1's `@`-as-reference / `#`-as-assignment rule is already captured in `DESIGN.md` (§"Layer 2: Authoring shorthand"); G1's braced-only `^{` / `_{` rule was missing from any live spec and was migrated into `notes/shorthand-syntax.md` (new "Inline TeX shortcuts" section). The handoff's slice-rhythm / Phase 0 discipline / correctness-models content was condensed into `CLAUDE.md` under "Slice cadence" and "Correctness models". The slice-by-slice tables and the discursive backlog tour are preserved here as historical context.

## 2026-Q2 documentation-system reconciliation (2026-05-23): final cleanup

The third and final reconciliation slice retired the spent planning artifacts that drove the documentation-system reconciliations themselves, plus the historical refactor-plan documents and one placeholder spec file.

- **`documentation-inventory-2026-05.md`** (added by Reconciliation 3, 2026-05-23) — The AUD-26 inventory deliverable: a complete map of project-state documents as of 2026-05-23, plus the contradictions/duplications/gaps that drove the documentation-system reconciliations. Its findings were consumed by Reconciliations 1 and 2; the file is preserved here as the snapshot the reconciliation worked from.

- **`documentation-system-design-2026-05.md`** (added by Reconciliation 3, 2026-05-23) — The settled design of the documentation system: five document roles, the rules, the rebuild-from-docs coherence principle, the coherence check. Part 2 was installed verbatim as `notes/doc-ownership.md` in Reconciliation 2; Reconciliation 3 added the limitations rule and the discussion-is-work rule (both as Maintenance entries in `doc-ownership.md`) bringing the installed file into full alignment with the design's intent. Part 3 (the reconciliation plan) became the three reconciliation prompts. Preserved here as the design record.

- **`audit-shape-2026-05.md`** (added by Reconciliation 3, 2026-05-23) — A pre-audit chat brainstorm from 2026-05-14 that proposed three possible shapes (A/B/C) for the upcoming 2026-Q2 audit and reflected on the slice-7 proof-of-principle state. The audit ran (effectively Shape C); the audit-then-reconciliations arc concluded. Capability inventory in the file maps to `STATUS.md`'s current-state checklist; client-side rebuild framing maps to DD-5 in `DESIGN.md`. Preserved here as the transcript that opened the arc.

- **`audit-cleanup-stopping-point-2026-05.md`** (added by Reconciliation 3, 2026-05-23) — A 2026-05-21 checkpoint snapshot of the "audit cleanup" arc. Steps 1–3 and 5–6 were complete; Step 4 was overtaken by the F2 doc-staleness sweep and Reconciliation 2's spec stripping. FLAGGED-2 (the cross-reference sigil redesign) landed as F1. FLAGGED-1 (the markdown `##` vs `<#>` sigil canonical-form question) was a real open design question and is now filed as a discussion item in the roadmap (per Reconciliation 3's discussion-is-work rule). The remainder is captured elsewhere.

- **`pipeline-refactor-plan-2026-05.md`** + **`pipeline-refactor-plan-amendment-2026-05.md`** + **`pipeline-refactor-plan-amendment-2-2026-05.md`** (all added by Reconciliation 3, 2026-05-23) — The pipeline-refactor planning record (R1–R4): the original plan, the R2/R3 reboundary amendment, and the R3a/R3b split amendment. All four slices landed in 2026-Q2. The conceptual "shape → index → number → resolve" framing the plan introduced was harvested into `notes/pipeline.md` §1 Overview during Reconciliation 3; the architectural decisions are implemented and live in `notes/pipeline.md` and `notes/interpreter.md`. The plan documents are preserved here as the design record.

- **`slide-element-deferred-2026-05.md`** (added by Reconciliation 3, 2026-05-23) — The previous placeholder file for `<presentation>` / `<slide>` / `<slide-notes>` vocabulary. The file was a starting sketch with six open questions, not a real blueprint, so under Reconciliation 3's discussion-is-work rule it collapsed into a single roadmap discussion item ("Discuss whether to add `<presentation>` / `<slide>` / `<slide-notes>` Layer 1 vocabulary for presentations") that carries the six questions as the discussion agenda. The two sibling `*-deferred.md` files (`multi-file-authoring-deferred.md` and `multi-column-display-deferred.md`) were genuine blueprints; they were renamed in place (dropping `-deferred`) and their bodies neutralized to present-tense blueprint voice — they remain in `notes/`, not archived.

## 2026-Q2 notes/ legacy sweep (2026-05-23): six pre-reconciliation documents resolved

The follow-on slice after the three-slice reconciliation arc audited the legacy documents in `notes/` that predated the reconciliation and were not in its scope. Each was resolved under the documentation system installed by Reconciliation 2; the harvest rule (no file archived until anything live in it has a home) governed each move.

- **`dsl-engines-2026-05.md`** (added by the legacy sweep, 2026-05-23) — The previous "DSL Engines" design note. Its live content — the processor-delegation model: content the browser cannot render natively is routed via a tag-to-processor registry to a specialized processor that returns something renderable — was migrated into `DESIGN.md` as a new top-level section "Embedded DSLs: processor delegation", positioned between the display-ladder section and Layer 2. The migration is present-tense blueprint voice (math and code use the model today; diagrams and executable code are the same mechanism extended). Stale "Implementation status" and "What's deferred" framing — which falsely said the interpreter does not yet exist — was dropped, not migrated. Mechanism details already covered in `notes/pipeline.md` and `notes/interpreter.md` were not duplicated. Preserved here as the original design note.

- **`reading-order-2026-05.md`** (added by the legacy sweep, 2026-05-23) — The previous "Reading order" document. A reading path is navigation of the spec set, so it belongs in governance; the path was harvested into `notes/doc-ownership.md` as a new "Reading order (for newcomers)" section built from the document table and reconciled against current paths (its two stale references — to the now-migrated `dsl-engines.md` and to `future-interpreter-sketches/` — did not carry forward). The README's pointer was repointed accordingly.

- **`process-2026-05.md`** (added by the legacy sweep, 2026-05-23) — The previous "Enscribe development process" document, predating the reconciliation arc (commits `82ebb10`, `ff5163d`). Its unique operational content — the `npm run verify` command, the browser-verification discipline for visible-output slices, and the `ENSCRIBE_UPDATE_SNAPSHOTS=1` snapshot-regeneration command — was condensed into `CLAUDE.md` as a new "Visual verification" subsection. A Rule 2 violation ("22 suites as of 2026-Q2 audit") was dropped, not migrated. Historical bug anecdotes (justification for the discipline) were also dropped — `CLAUDE.md` carries operating instructions, not justification.

- **`at-sigil-reference-proposal-2026-05.md`** (added by the legacy sweep, 2026-05-23) — The original `@`/`#` sigil-semantics proposal. Its main thrust shipped as F1 (commit `c86da33`); its unadopted unbraced-inline-`@` form is in the roadmap's Explicitly-deferred section; its rationale is captured in DESIGN.md §"Layer 2: Authoring shorthand". One previously-un-captured idea — the type-prefix-mismatch warning ("`@fig:priority` resolving to an equation could be a detectable mismatch worth warning") — was filed as a Layer 3 discussion item in the roadmap (per the discussion-is-work rule). The "prefix inference was considered and rejected" rationale rides inside that discussion item as context.

- **`authoring-features-survey-2026-05.md`** (added by the legacy sweep, 2026-05-23) — The previous catalogue of considered-and-deferred authoring features. Already-covered entries (multi-file, multi-column, `<abbr>`, `<keywords>`, `<aside>` callouts, ref `format` kwarg) are unchanged. The remaining entries were harvested into the roadmap: the existing "Deferred vocabulary elements" cluster (DF-13/14/15) was extended with the small additional vocab candidates (`<kbd>`, `<var>`/`<samp>`/`<output>`, `<details>`/`<summary>`, rich author metadata, `<license>`, `<doi>`, `<short-title>`, `<subject>`, `<thumbnail>`); four new Layer 3 discussion items were filed (compact external-reference syntax; external-link rich previews; just-in-time math symbol definitions; executable code blocks — the last with an explicit note that it is Architecture-tier-sized if the discussion concludes "yes" and would graduate to that tier). Out-of-scope entries (dropdowns/cards/tabs/grids; interactive widgets) were not filed.

- **`future-interpreter-sketches-figures-2026-05.md`**, **`future-interpreter-sketches-shorthand-tag-processing-2026-05.md`**, **`future-interpreter-sketches-tables-2026-05.md`** (all added by the legacy sweep, 2026-05-23) — Three pre-implementation sketches for an interpreter that now exists and is fully specified in `notes/interpreter.md` and `notes/pipeline.md`. All three retire clean: nothing in any of them describes an un-built idea or genuinely-novel design point. The `notes/future-interpreter-sketches/` directory was removed.

## `audit-2026-Q2/` Phase 0 findings

Phase 0 investigation findings from the 2026-Q2 audit and refactor arc (R2–R4, OQ1, NORM, math-coverage, G4, F1, G1). All conclusions have landed in code; retained as the design-rationale record for why the pipeline and normalization pass are shaped as they are.

Also contains the Audit 1A scaffolding files (drift-and-gaps, design-questions, fixes-applied), archived after open items were migrated into `notes/audit-findings.md`.

- **`R2-phase0-findings.md`** — Slice R2 (registry, numbering, ref-resolution, section registration) investigation.
- **`R3-phase0-findings.md`** — Slice R3 (handler layer, toHast, float/figure/table rendering) investigation.
- **`R4-phase0-findings.md`** — Slice R4 (notes, math, inline TeX shortcuts) investigation.
- **`OQ1-phase0-findings.md`** — OQ1 (open questions round 1: config, meta, bibliography placement) investigation.
- **`NORM-phase0-findings.md`** — NORM slice (normalize-markdown: bare math and bare pipe-table normalization) investigation.
- **`math-coverage-phase0-findings.md`** — Math coverage investigation (KaTeX, MathJax, rendering surface, font bundling).
- **`G4-phase0-findings.md`** — G4 (code-block cross-reference registration, PG-6/PG-7) investigation.
- **`F1-phase0-findings.md`** — F1 (citation key ordering, CSL sort override) investigation.
- **`G1-phase0-findings.md`** — G1 (inline TeX shortcuts: `^{}` superscript, `_{}` subscript) investigation.
- **`1A-drift-and-gaps.md`** — Audit 1A reading-pass drift and gap findings (DRIFT-1–11, GAP-1–7). Open items migrated to `notes/audit-findings.md` (AUD-21–26); items annotated in place before archiving.
- **`1A-design-questions.md`** — Audit 1A design questions (DQ-1–8). Open items migrated; items annotated in place before archiving.
- **`1A-fixes-applied.md`** — Audit 1A in-place mechanical fixes (FIX-1: process.md test count; FIX-2: known-limitations.md KaTeX font status).
- **`AUD-26-interpreter-pipeline-audit.md`** — AUD-26 Phase 0 doc-vs-code audit of `notes/interpreter.md` and `notes/pipeline.md` (2026-05-23). 14 stale divergences, zero `DRIFT?` findings; both docs corrected in a follow-on doc-only slice (no code changed). AUD-26 closed in `notes/audit-findings.md`.

## `investigations-2026-05/`

Spent Phase-0-style investigations whose conclusions have all landed in code or specs. **Note: `font-investigation.md` is the de-facto reference for the font-bundling rationale (font choices, Latin subsetting, base64 embedding approach) until a dedicated spec exists.** A pointer to it has been added to `notes/known-limitations.md`.

- **`citations-investigation.md`** — Citation.js / citeproc-js integration options; CSL style selection.
- **`cross-ref-investigation.md`** — Cross-reference resolution strategies; label-index design.
- **`font-investigation.md`** — Font selection, subsetting, and base64-embedding rationale. **De-facto font-bundling spec.**
- **`hover-preview-investigation.md`** — Post-implementation hover preview record (Tippy.js + Popper.js).
- **`parser-maturity-investigation.md`** — Parser ecosystem survey (micromark, Peggy, tree-sitter alternatives).
- **`tables-investigation.md`** — Table DSL options; pipe-table normalization decision.
- **`theme-investigation.md`** — CSS theming approach; variable naming conventions.
- **`parser-newline-investigation.md`** — Root-cause analysis of three parser bugs: (1) text-position named-tag multi-line content silently lost (nok backtrack), (2) inline tag at line-start captured as flow construct causing paragraph splitting (highest-impact), (3) code-sigil multi-line text position produces `enscribeTagError`. All three filed as AUD-21/22/23 in `notes/audit-findings.md`; this file is the root-cause record.
- **`enscribe_pipeline_runorder_vs_dependency.svg`** — Visual diagram of plugin run-order vs. dependency graph.
- **`document_elements_sources_display_processing.csv`** — Element-to-processing-strategy mapping table.

## `phase-findings-2026-05/` v0.1.0-era Phase 0 findings (archived 2026-06-01)

The Phase 0 read-only investigation findings for the v0.1.0-era phase sequence, plus the alpha acceptance record. Each findings document was the design baseline its implementation slice(s) were built from; all of their conclusions have landed in shipped code (the corresponding capabilities are `[x]` in `STATUS.md`). They are retained as the design-rationale record — the durable "why the build is shaped this way" that is hard to recover from finished code, exactly as the `audit-2026-Q2/` findings are. Moved out of top-level `notes/` (which holds only live working docs) once their phases closed.

Three live code comments that cite these as their rationale source were repointed to this folder when the files moved: `packages/enscribe/src/interpreter/dsl/registry.js` and `node-assets.js` (→ `dsl-rendering-architecture-findings.md`), and `packages/enscribe/test/same-line-long-form.test.js` (→ `issue1-same-line-long-form-findings.md`). The intra-batch cross-references *inside* these files (each findings doc naming the one before it as precedent) were left as written — archived files are frozen records.

- **`phase2-handler-findings.md`** — Phase 2 (the handler bundle) investigation.
- **`phase3-frameable-findings.md`** — Phase 3 (frameable elements) investigation. Forward-looking design **superseded by `notes/specs/frameable.md`** (the frameable-redesign spec, 2026-06-01); the shipped-build infrastructure survey is retained here as the rationale record.
- **`phase4-structuring-findings.md`** — Phase 4 (document structuring) investigation.
- **`phase5-jats-export-findings.md`** — Phase 5 (JATS export) investigation.
- **`phase6-alpha-integration-findings.md`** — Phase 6 (alpha integration) investigation; the analysis that produced the alpha acceptance mapping below.
- **`phase13-jats-import-findings.md`** — Phase 13 (JATS import) investigation.
- **`phase14-packaging-findings.md`** — Phase 14 (v0.1.0 packaging: client library, docs site, CLI) investigation.
- **`issue1-same-line-long-form-findings.md`** — Issue 1 (same-line long form, `<b>bold</b>`) investigation.
- **`dsl-purge-phase0-findings.md`** — DSL purge investigation.
- **`dsl-rendering-architecture-findings.md`** — DSL rendering-architecture investigation (the `skip` / `live-link` / `live-inline` / `static` render-mode model).
- **`alpha-acceptance-mapping.md`** — the alpha milestone acceptance record: for each of the five alpha acceptance lines, the fixture that demonstrates it and what that fixture shows. Companion to `phase6-alpha-integration-findings.md`. *Its fixture paths (`packages/enscribe-interpreter/…`, `packages/enscribe-jats-export/…`) predate the 7→3 package consolidation (`b0a9d71`) and are preserved as written.*

## Single archived documents (2026-05)

- **`inline-tex-shortcuts-spec-2026-05.md`** — Spec for the `^{}`/`_{}` superscript/subscript shortcut syntax. The G1 feature is built; this is the spec it was built against.
- **`feature-test-document-slice3.5.md`** — Slice-3.5-era markdown feature-test catalog. Originally `notes/test.amd` (wrong extension, stale name). Fully superseded by the current test suite.

---

## What's *not* in here

Code that's still part of the active project lives outside `archive/`:

- The current parser implementation is in `/packages/remark-enscribe/`.
- The pure-micromark parser predecessor (Slices 1–2 of the current parser, before the Peggy hybrid switch) previously lived at `/packages/remark-enscribe-pure-micromark-archive/` and has been removed from the working tree. Its full implementation is in the git commit graph (retired in `373c4b7`, "Switch to Peggy hybrid parser architecture"); the design rationale for choosing the Peggy hybrid is in `notes/specs/shorthand-syntax.md` §"Parser architecture".
- The current section-nesting plugin is in `/packages/rehype-section-nesting/`.

## Reading order, if you're curious

For someone trying to understand how enscribe got here:

1. `pre-rewrite-ideas/12-23-2023.md` — the original problem statement.
2. `pre-rewrite-ideas/4-7-2024.md` — the first prototype that worked.
3. `ai-conversation-logs/claude/parse_hierarchical_tags.md` — the moment the regex/DOM approach hit its ceiling.
4. `/DESIGN.md` (current) — the architecture that replaced the regex/DOM approach.
5. `/notes/shorthand-syntax.md` (current) — the syntax spec that grew out of the early brainstorms but is now precise enough to implement against.

Steps 1–3 are in this archive. Steps 4–5 are the current state.