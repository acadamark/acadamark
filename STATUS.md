# Acadamark — Project Status

What acadamark can do today, what is in progress, and what is still aspirational.
For *why* the project exists, read `README.md` and `DESIGN.md`. For the
architecture, read `notes/specs/pipeline.md` and `notes/specs/interpreter.md`. For the open
backlog, read `BACKLOG-ROADMAP.md`.

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

- [x] `acadamark-core` — the inward-pointing shared foundation (`fs`-free, browser-safe)
- [x] `remark-acadamark` — the shorthand parser (Peggy + micromark hybrid)
- [x] `acadamark-interpreter` — the full mdast→HTML interpreter pipeline
- [x] `layer1-vocabulary` — 66 per-element vocabulary entries (build-time-generated `data.js` ships)
- [x] Example documents — 13 fixture `.acm` files exercising the system end to end

For the current test status, run `npm run verify` in `packages/acadamark-interpreter`.
(STATUS.md deliberately states no test count — a number is the fastest thing to
go stale.)

### Known open items

The backlog is tracked, not duplicated here. All open bugs, gaps, and
design findings live in `BACKLOG-ROADMAP.md` (the single
home for open work). Notable currently-open items include vocabulary
plugin-name drift (formerly AUD-24) and design-direction cross-referencing
(formerly AUD-25).

## In flight / next

Nothing currently in flight. The documentation-system reconciliation
arc (three slices) is complete — the system defined in
`CONTRIBUTING.md` is in force, and from here every implementation
slice ends with its coherence check. The project returns to ordinary
backlog work from `BACKLOG-ROADMAP.md`. Reasonable
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
  preserved in `notes/archive/`.)
- **Early–mid 2026 — parser and interpreter built.** The shorthand
  parser and the interpreter pipeline were built over a sequence of slices:
  tag grammar, sigil families, escape rules, multi-line content, recursive
  content, then the interpreter — section nesting, numbering, notes, citations,
  cross-references, figures, tables, math, hover previews, self-contained HTML
  output, bundled fonts.
- **April 2026 — first repository cleanup.** Historical exploration material
  moved to `notes/archive/` with an inventory README; stale artifacts removed.
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
  `notes/archive/audit-findings-2026-05.md` and
  `notes/archive/specified-not-implemented-2026-05.md`. Recorded here for history
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
  items closed:** DS-1 (`notes/specs/interpreter.md`); DS-2 (`notes/specs/pipeline.md`);
  DS-3 (`BUILD.md` parser slice table); DS-4 (`notes/interpreter-design.md`
  archived); DS-5 (`notes/hover-previews-deferred.md` archived) — all via
  the F2 doc-staleness sweep, commit `f00c877`.
- **2026-Q2 — `remark-acadamark-pure-micromark-archive` package deleted
  as dead weight.** The retired pure-micromark parser predecessor (kept on
  the workspace floor as a reference after the move to the Peggy hybrid
  architecture in `373c4b7`, "Switch to Peggy hybrid parser architecture")
  was deleted in commit `5acb555`. No live code or test depended on the
  package; its three documented live design decisions (rule B depth
  tracking, permissive identifier reading, text-position HTML collision
  priority) were already preserved in `notes/specs/shorthand-syntax.md`,
  and the freeze-property rationale for choosing the Peggy hybrid lives
  in the same spec's §"Parser architecture" — the remaining implementation
  technique was recoverable from git for anyone who wanted to inspect the
  original code. Same disposition the later `rehype-section-nesting`
  deletion (`30d49ba`) followed — git is the archive; dead code in the
  tree is a cost. The stale archive-pointer sentence in
  `shorthand-syntax.md` and the corresponding `notes/archive/README.md`
  "What's not in here" entry were updated in the same commit;
  `package-lock.json` regenerated by the workspace shrink. The fourth
  reference in `notes/archive/documentation-inventory-2026-05.md` was
  deliberately left unedited (frozen archival snapshot). Both
  parser-package test suites green after deletion. This deletion was the
  disposition precedent the later `rehype-section-nesting` deletion
  (milestone below) explicitly cites.
- **2026-Q2 — parser-bug verify-and-close.** A verify-and-close
  investigation established that four parser-bug backlog items were all
  misdiagnoses-at-filing — the parser code had been correct throughout —
  and closed them. **AUD-04** (no-pipe/no-content short form misread as
  long-form opener): fixed by `d882586` (the `afterOpenGt` discriminator
  that routes same-line `>` to the short-form named-tag tokenizer);
  filed open in `ff5163d` without re-verifying that the later multi-line
  work had resolved it; newly guarded by the
  short-form-no-content-no-pipe test added to
  `packages/remark-acadamark/test/test.js`. **AUD-21** (multi-line content
  in text-position named tags silently lost): fixed by `ff5163d` (the
  `!multiLine` early-return removed from `attrSection` / `content` states
  of `makeNamedTagTokenizer`, per `parser-newline-investigation.md`
  Issue 1); filed open by `495b47f`, which transcribed the
  investigation's pre-fix empirical results without checking that the
  same commit which added the investigation had also landed the fix;
  guarded by `packages/remark-acadamark/test/multiline-text-position.test.js`
  Issue 1. **AUD-22** (inline tag at line-start splits paragraphs): fixed
  by `ff5163d` (the flow-position guard added to `afterClose`/`afterGt`,
  Issue 2); same transcribe-without-re-verify filing as AUD-21; guarded
  by `packages/remark-acadamark/test/line-start-flow-reject.test.js`.
  **AUD-23** (multi-line content in text-position code-sigil tags
  produces an error node): fixed by `ff5163d` (the `!multiLine`
  early-return removed from the sigil `body()` state, Issue 3); the
  parser-cluster reconciliation Phase 0 had over-reported it as "still
  reproducing" because its probe placed the closing `` ```> `` at
  line-start, triggering CommonMark's fenced-code-block tokenizer — a
  block-level precedence rule, not the parser bug AUD-23 described;
  guarded by `packages/remark-acadamark/test/multiline-text-position.test.js`
  Issue 3.
- **2026-Q2 — `rehype-section-nesting` package deleted as dead machinery.**
  The standalone hast-stage section-nesting plugin (sole commit `15f171d`,
  2026-04-25, untouched for ~30 days) was superseded by the interpreter's
  mdast-stage `packages/acadamark-interpreter/src/plugins/section-nesting.js`
  (`fa95078`, 2026-05-12, "interpreter slice 1") — the architectural shift
  to mdast-stage nesting was needed because section-title extraction from
  pipe content is only feasible while content is still structured mdast.
  The rehype package was on no live call graph (no `import` / `require`
  outside its own source/tests; no other package depends on it; the
  interpreter's compile step goes `toHast` → `rehypeFormat` → `toHtml`
  without invoking it). Same disposition the `remark-acadamark-pure-
  micromark-archive` deletion (commit `5acb555`) used — git is the
  archive; dead code in the tree is a cost; the sole commit `15f171d`
  remains in history. The depth-by-name design principle the section-
  nesting cluster Phase 0 named as the harvest candidate was found, on
  re-verification against `layer1-naming.md`, to already be in the spec
  as Rule 3 ("Named section depth ladder") with the LaTeX equivalence
  table and the extensible-ladder note — no harvest edit was needed.
  STATUS.md component checkbox removed; backlog discussion item removed
  as moot; `package-lock.json` regenerated by the workspace shrink (one
  package removed; live-package deps unaffected). The `notes/archive/`
  references to the package (in `feature-test-document-slice3.5.md`,
  `test-result-slice3.5.txt`, `README.md`) were deliberately left
  untouched — a frozen archival snapshot's record of what existed on its
  date is correct historical content, not a broken pointer. Closes the
  section-nesting cluster and the `packages/` code ⇄ spec reconciliation
  arc; surfaced by the packages/ reconciliation — section-nesting cluster
  Phase 0.
- **2026-Q2 — pipeline.md note-numbering explanation closed
  (misdiagnosis at filing).** The Layer 3 doc-clarity backlog item
  asserting that `pipeline.md` §10.5 implies `fillNumbering` assigns note
  numbers was filed in `b996301` (2026-05-22 14:20) — four hours after
  `f00c877` (2026-05-22 10:26, the F2 doc-staleness sweep) had already
  added to §10.5 the exact clarification the item asks for
  (`fillNumbering(file) → (no-op for notes; acadamarkNumberingPending has
  equations/figures/tables)`). Git history confirms `f00c877` is the only
  commit ever to touch a `fillNumbering` mention in `pipeline.md`, so the
  clarification was present continuously from the moment it was added —
  including at the moment the backlog item was written. Item closed as
  misdiagnosis at filing; no spec edit needed (§10.5 is already correct);
  surfaced by the packages/ reconciliation — interpreter cluster Phase 0.
- **2026-Q2 — `acadamark-core` extraction arc complete.** Five slices
  (`0a4523a`, `2fabdf5`, `7cc6002`, `442202c`, and this slice's commit)
  extracted an inward-pointing `acadamark-core` package and reorganized
  the workspace dependency graph around it. The arc resolved the
  cross-package DRY audit's Bin A findings (Bin A.1 — the canonical
  `acadamarkTag` shape was restated with field-drift across 12
  hand-construction sites; Bin A.2 — the HTML attribute-mapper was
  duplicated in two interpreter sites). It split the Layer 1 vocabulary
  into a build-time generator and a committed, browser-safe, `fs`-free
  run-time data module, deleting the runtime `loadVocabulary` `fs` loader.
  It drew the build/run-time seam so it doubles as the browser-safety
  boundary — the package boundaries are now drawn to enable the future
  client-side build without redrawing them. Architecture-decision record
  at `notes/specs/acadamark-core.md` (includes the dependency diagram,
  per-module inventory, build/run-seam definition, and the standing
  client-side build constraints rule). T2-2's walker centralization
  preserved and broadened from interpreter-internal to package-spanning.
  Slice 4 was the arc's highest-risk step (the vocabulary split) and got
  its own Phase 0; an explicit equivalence-check test (loaded both ways,
  asserted deep-equal across every key) gated the consumer switch
  before the old loader was removed. Snapshot tests passed unchanged at
  every slice. Three traceability annotations recorded here because
  `BACKLOG-ROADMAP.md` is open-work-only: (i) the colon-id
  spec-conformance fix at `registry.js` in Slice 3 — leading-colon ids
  (`:foo`) are no longer indexed in the label index, matching the spec's
  `type:name` convention, the old behavior was the bug, 17 dedicated
  unit tests pin the new behavior; (ii) `acadamark-core/src/error-nodes.js`
  exports `makeParseError` / `makeTagError` builders that intentionally
  have zero callers today — the JS-side error-node sites are in-place
  mutations of an existing acadamarkTag stub (per the spec's "fields
  retained" long-form rule), not fresh constructions; the builders exist
  ahead of their consumers (the forthcoming parser-error renderer; JATS
  export's error handling), so a future reader should not "tidy away"
  apparently-unused exports; (iii) the deleted `loadVocabulary` loader
  emitted a spurious shorthand-alias self-conflict warning from
  iterating a map while mutating it — the replacement generator
  iterates primary entries only and does not reproduce the quirk; the
  noise is gone with the loader. Six new backlog items were filed at
  arc close (three Bugs for the `#`-sigil dispatch, the hash-sigil
  opacity discrepancy, and the `shorthand-syntax.md` 12-vs-10 tag-field
  gap; three Discussions for colon-id hardening, sigil-as-first-class-
  category, and documented-but-unfixtured coverage auditing). The arc's
  one outstanding deferred question — whether the HTML attribute-mapper
  iteration shape lifts to `acadamark-core` as a generic
  `mapAttributes(node, vocab, emit)` API — is recorded in the ADR; the
  lift waits for JATS export so the API is designed against a real
  second consumer.
