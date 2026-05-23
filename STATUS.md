# Acadamark — Project Status

What acadamark can do today, what is in progress, and what is still aspirational.
For *why* the project exists, read `README.md` and `DESIGN.md`. For the
architecture, read `notes/pipeline.md` and `notes/interpreter.md`. For the open
backlog, read `notes/acadamark-backlog-roadmap.md`.

This file is deliberately thin. It records *state*, not *explanation* — and
state-descriptions go stale, so there is as little of it here as possible. When
something ships, flip a checkbox; that is the whole maintenance burden.

## Current state

Legend: `[x]` working and tested · `[~]` partial / in progress · `[ ]` not started.

### Authoring — what a `.acm` document can express

- [x] Markdown prose (paragraphs, emphasis, lists, links, fenced code) via remark
- [x] Tagged shorthand — `<tag #id .class attr=value +flag -flag | content>`
- [x] Sigil tags — sections `<# #>`, inline/display math `<$ $>` `<$$ $$>`, code `` <` `> `` `` <``` ```> ``
- [x] Implicit section closing (peer-level tag ends the previous)
- [x] Multi-line tag content; escape rules (`\<`, `\|`, `\\`)
- [x] Nested tags inside named-tag content (recursive content parsing)
- [x] Sections, three-deep named ladder (`section` / `sub-section` / `sub-sub-section`)
- [x] Figures with captions
- [x] Tables — CSV, TSV, JSON, YAML, and Markdown formats
- [x] Inline and display math (KaTeX), numbered equations
- [x] Notes — footnotes / endnotes / sidenotes
- [x] Citations and bibliography (citation-js, BibTeX `<library>`, CSL styles)
- [x] Cross-references to figures, equations, tables, sections, and code blocks
- [x] Bare markdown forms normalized to canonical acadamark nodes (`$x$`, GFM tables)
- [~] Self-closing form `<tag />` — works for plain tags, broken for DSL-registry tags (AUD-08)
- [ ] Caption-as-content — citations / rich content inside `caption="..."` (AUD-14)
- [ ] Theorem family — `<theorem>`, `<proof>`, `<lemma>`, `<definition>`

### Output — what processing produces

- [x] Self-contained HTML — CSS, fonts, rendered citations all inlined
- [x] Conditionally-injected hover previews (notes / refs / citations)
- [x] Bundled subsetted fonts (Inter, Source Code Pro) and patched KaTeX fonts
- [ ] Render mode — lossy lowering of custom elements to plain `<h1>`/`<h2>`
- [ ] JATS XML export (`rehypeAcadamarkToJats`) — the journal-submission bridge
- [ ] Code syntax highlighting (dependency listed, not wired in)
- [ ] Client-side rendering — `.acm` rendered in-browser with no build step

### Components

- [x] `remark-acadamark` — the shorthand parser (Peggy + micromark hybrid)
- [x] `acadamark-interpreter` — the full mdast→HTML interpreter pipeline
- [x] `rehype-section-nesting` — standalone section-nesting plugin
- [x] `layer1-vocabulary` — 66 per-element vocabulary entries
- [x] Example documents — 13 fixture `.acm` files exercising the system end to end

For the current test status, run `npm run verify` in `packages/acadamark-interpreter`.
(STATUS.md deliberately states no test count — a number is the fastest thing to
go stale.)

### Known open items

The backlog is tracked, not duplicated here. All open bugs, gaps, and
design findings live in `notes/acadamark-backlog-roadmap.md` (the single
home for open work). Notable currently-open items include the three
parser-newline bugs (formerly AUD-21/22/23), vocabulary plugin-name
drift (formerly AUD-24), and design-direction cross-referencing
(formerly AUD-25).

## In flight / next

Nothing currently in flight. The documentation-system reconciliation
arc (three slices) is complete — the system defined in
`notes/doc-ownership.md` is in force, and from here every implementation
slice ends with its coherence check. The project returns to ordinary
backlog work from `notes/acadamark-backlog-roadmap.md`. Reasonable
next candidates by appetite: the integration-test mirror fix (formerly
AUD-17, a small slice that retires a recurring tax paid four times in
the R3/R4/G1 arc); the asset-double-injection fix (formerly AUD-19);
the four Layer 0 SUSPECTED CLOSED verifications (each a small code-check
that probably closes the item).

## Milestones

Arc-level history — the eras of the project, not a per-commit log (git holds
that). One line gets added every few months, not every slice.

- **Pre-2026 — origins.** Project conceived as a shorthand-over-HTML
  approach to academic publishing. Early regex-based prototypes explored the
  idea; superseded by the unified/remark/rehype rewrite. (Predecessor material
  preserved in `archive/`.)
- **Early–mid 2026 — parser and interpreter built.** The shorthand
  parser and the interpreter pipeline were built over a sequence of slices:
  tag grammar, sigil families, escape rules, multi-line content, recursive
  content, then the interpreter — section nesting, numbering, notes, citations,
  cross-references, figures, tables, math, hover previews, self-contained HTML
  output, bundled fonts.
- **April 2026 — first repository cleanup.** Historical exploration material
  moved to `archive/` with an inventory README; stale artifacts removed.
- **2026-Q2 — pipeline refactor.** The interpreter pipeline was refactored into
  a four-stage architecture (shape → index → number → resolve) across slices
  R1–R4, with a following doc-staleness sweep.
- **2026-Q2 — Layer 2 completion.** Math and GFM-table normalization and
  code-block cross-reference registration landed, closing the Layer 2 authoring
  surface.
- **2026-Q2 — documentation audit and `notes/` cleanup.** A full audit
  reconciled the specs with the implemented code; open findings were filed into
  their owning documents; spent investigations and Phase 0 records were
  archived; `DESIGN.md`, `README.md`, and this file were rewritten. The `notes/`
  directory now holds only live documents.
- **2026-Q2 — individually-tracked closures recorded for archival.** The
  2026-Q2 documentation audit and follow-on slices closed a series of
  individually-tracked findings now archived to
  `archive/audit-findings-2026-05.md` and
  `archive/specified-not-implemented-2026-05.md`. Recorded here for history
  before the source files were retired. **AUD items closed:** AUD-01 (equation
  number right-align, slice 7 CSS); AUD-02 (`interpreter-design.md` pipeline
  drift, F2 sweep, file archived); AUD-03 (`hover-previews-deferred.md`
  obsolete, F2 sweep, file archived); AUD-09 (section + code-block ids
  referenceable via `<ref>`; section half in R2, code-block half in G4,
  2026-05-23); AUD-10 + AUD-11 + AUD-16 (KaTeX font URLs base64-patched,
  Inter + Source Code Pro bundled, `getDocumentFontsCss()` wired into
  `src/index.js`, 2026-05-21); AUD-12 (`<blockquote>` / `<quote>` first-class
  vocabulary entry + shorthand-alias machinery, 2026-05-21); AUD-20 (GFM
  table normalization Option A, NORM-tables slice, commit `ec0d071`,
  2026-05-22); AUD-26 (`interpreter.md` and `pipeline.md` corrected against
  implemented code, 2026-05-23). **Specified-but-unimplemented items
  closed:** DF-1 (inline TeX shortcuts adopted as G1, commits `b6304a3`
  G1a + `99aaa0b` G1b); DF-7 (`@`-sigil reference syntax adopted as F1,
  commit `c86da33`); PG-6 (code-block colon-ids referenceable via `<ref>`,
  G4); PG-7 (closed as by-design: auto-generated note ids intentionally
  not referenceable, G4); PG-12 (`\^`/`\_`/`\{`/`\}` escape decisions
  settled with G1, commit `b6304a3`); PG-13 (markdown pass-through
  escapes inside named-tag content verified by test RC-14). **Doc-staleness
  items closed:** DS-1 (`notes/interpreter.md`); DS-2 (`notes/pipeline.md`);
  DS-3 (`BUILD.md` parser slice table); DS-4 (`notes/interpreter-design.md`
  archived); DS-5 (`notes/hover-previews-deferred.md` archived) — all via
  the F2 doc-staleness sweep, commit `f00c877`.
