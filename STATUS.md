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
- **2026-Q2 — Layer 0 "suspected closed" verifications cleared.** The
  backlog's Layer 0 section held four items the source entries had
  marked "SUSPECTED CLOSED" but never reconciled: GFM table support
  (`formerly AUD-06`), GFM pipe-table normalization to canonical
  `<table md>` (`formerly DF-20`), bare `$…$` math normalization to
  canonical `<$>` (`formerly DF-22`), and bare math inside recursive
  content e.g. `<aside | ... $x$ ...>` (`formerly OQ-1`). A
  verification slice read the current code (no code changes) and
  confirmed all four closed: `remark-gfm` ^4.0.1 and `remark-math`
  ^6.0.0 are dependencies of `acadamark-interpreter` and wired into
  both the outer pipeline and the inner processor (in
  `src/index.js` at L337/342/353); the normalization pass
  (`src/plugins/normalize-markdown.js`) contains the rewrite paths
  for `inlineMath` → `$`, `math` → `$$`, and `table` → `<table md>`
  (lines 207, 218, 237 respectively); fixture `document-11-bare-math.acm`
  exercises bare math at the outer surface (top-level inline + display)
  and at the inner surface (bare `$E=mc^2$` inside `<aside | ...>`);
  fixture `document-12-bare-table.acm` exercises bare pipe tables at
  the outer surface (top-level + aligned-columns) and at the inner
  surface (bare pipe table inside `<note placement=foot | ...>`); the
  `normalize-markdown.test.js` unit suite asserts byte-equivalence
  between each normalized node and the authored sigil/tag form
  ("normalized $ node matches authored <$ ... $> field-for-field" and
  the analogous assertions for `$$` and `<table md>`); all 13
  integration documents pass with snapshots stable. Items 1 and 2
  closed on one finding (the backlog entries themselves noted "same
  root"). Backlog Layer 0 section now empty (heading kept with a
  "Currently clear" note pointing here). Verification only: no
  product code, no spec falsehoods to correct (`idioms.md` and
  `recursive-content-spec.md` already describe the design as
  in-place). The opt-in math-coverage Phase 0 noted in the OQ-1 entry
  (three-column adequacy table: acadamark's intended math surface vs
  remark-math's tokenizer coverage vs acadamark's DSL-math coverage)
  was not in scope and remains opt-in scoping work; the verification
  did not surface a missing-construct concern for the constructs
  currently fixture-covered.
- **2026-Q2 — mechanical-fix batch (4 closed, 1 pulled).** A batch
  slice cleared four no-decision backlog items and pulled a fifth as
  decision-laden: (1) **Stale `related_plugins` plugin names in
  `cite.md`/`ref.md`/`note.md`** (`formerly AUD-24`) — verification
  found all three `name:` fields already correct
  (`acadamarkCiteResolution`, `acadamarkRefResolution`,
  `acadamarkNotes`) and the prior "rehype plugin" miscategorization
  in `ref.md` no longer present; closed as already-resolved at code
  level (stale backlog entry — same pattern as the Layer 0
  verifications). (2) **`shorthand-syntax.md` §"What the parser
  produces" 10→12 fields** — added `atRefs: []` and
  `selfClosing: false` to the spec passage, with defaults verified
  against the parser's grammar `makeNode` factory (the same
  ground-truth source the Slice 2 builders used); added a defaults
  note for clarity. Spec only. (3) **`table.md`'s `<csv | …>`
  example marked planned** (`formerly AUD-07`) — annotated both the
  YAML examples block and the prose "CSV (or TSV, JSON)" section
  with explicit "Planned — the standalone `<csv>` handler is not yet
  implemented" markers, preserving the examples as documentation of
  intended form while removing the trap that authors would assume
  `<csv>` works today. Cross-references the qualifying form
  `<table csv | ...>` (which DOES work today) as the current path.
  Vocabulary `data.js` regenerated and committed (the example text
  is carried into the generated module); pretest staleness guard
  confirmed in-sync. (4) **Double KaTeX CSS injection**
  (`formerly AUD-19`) — verification of the rendered `document-5`
  HTML found exactly one KaTeX `<style>` block (L848–L849,
  `font-family:KaTeX_AMS`); the second `<style>` block at L850–L891
  is the document fonts CSS (Inter / Source Code Pro,
  `font-family: 'Inter'`), not a second KaTeX block. The backlog
  entry's "double KaTeX" description was either a misdiagnosis at
  filing or fixed by an earlier slice without closing the item;
  closed as already-resolved at code level. (5) **`integration.test.js`
  hand-mirrored pipeline** (`formerly AUD-17`) — pulled from batch.
  Comparison showed the hand-mirror is currently identical to the
  real `index.js` pipeline (no drift today), but making the test
  import the real pipeline requires a design ruling: the mirror
  exists specifically so the test can capture intermediate hast for
  snapshot inspection, which the real pipeline does not expose
  through unified's standard API; three options identified
  (extend interpreter to expose hast via file.data; refactor compile
  step into an importable function; drop hast snapshots). Item stays
  open with the finding recorded; awaits ruling. The slice's escape
  hatch fired as designed. Two items in this batch (1 and 4) turned
  out to be stale backlog entries — already resolved in code — which
  is itself useful information about the AUD-era backlog hygiene; no
  unrecorded code changes were the cause for either (the changes
  predate this session's tracked history).
- **2026-Q2 — alpha-line tags written across the backlog; two
  Discussions closed.** A rulings slice tagged every open backlog
  item with one of `[alpha]` / `[post-alpha]` / `[alpha-if-cheap]` /
  `[undecided]` and added the five-point alpha-scope definition to
  `BACKLOG-ROADMAP.md` (Layer 1 elements + canonical acadamark +
  sigils/markdown idioms reducing to it + JATS conversion + acadamark
  conversion). The book / book-part item was split into two: a
  `[alpha]` book-structuring item and a `[post-alpha]` pagination
  item, with the print-requirements spec filed as a `[post-alpha]`
  spec companion. The executable code blocks item was promoted from
  Discussions to the Architecture tier with an alpha scope of
  in-browser JavaScript + Arquero + Vega-Lite. Two Discussions were
  closed by ruling: (i) the layer-naming-structure discussion closed
  with the decision to keep the current names — the layer metaphor is
  sound; the hierarchy custom-HTML / strict-acadamark /
  shorthand-acadamark / +markdown is a real ladder, recorded as the
  new "Layered model and terminology" section of `DESIGN.md`;
  (ii) the canonical-section-form discussion closed with the
  reduction-ladder ruling — named `<section>` and the sigil form
  `<#>` are co-equal canonical; the bare markdown `#` is a lossy
  reduction; the implementation verification is filed as a
  `[alpha-if-cheap]` free-leaf item under Other open work.
- **2026-Q2 — `[alpha-if-cheap]` items resolved; category emptied.**
  A read-only effort-scoping pass against the three `[alpha-if-cheap]`
  items, followed by user rulings written as a small backlog-edit
  slice, resolved every conditional alpha item to a final tag and
  emptied the category. Multi-file authoring → `[post-alpha]` (the
  effort-scoping found this is a multi-slice arc with four open
  design questions; the bundled four-MF-Q discussion item followed
  along as `[post-alpha]`; the spec records that the file-reader /
  path-resolution substrate could land early as a contained slice
  without committing to any MF-Q answer). The "refine note placement"
  bundled item was **dissolved**: per-section footnote collection →
  `[alpha]` (formerly PG-1; one contained slice over an
  already-nested section tree), and margin sidenotes → `[post-alpha]`
  (formerly PG-2) **coupled to the multi-column display rendering
  item** — the margin is structurally another column, and the
  multi-column layout engine is the machinery a margin needs;
  reciprocal cross-references recorded in both items. The
  section-form ladder verification → `[alpha]`, **renamed** "Build
  heading normalization and verify the section-form ladder converges"
  — the effort-scoping found the work is not pure verification: Form
  1 (named) converges today, Form 2 (sigil) is fixed as a side effect
  of the already-`[alpha]` hash-sigil dispatch bug, but Form 3 (bare
  markdown `#`) does not converge today and requires building the
  missing heading-normalization in `normalize-markdown.js` (a new
  NORMALIZATIONS entry, ~one slice; two bounded design questions
  recorded in the item — heading depth 4–6 handling, OQ-2
  interaction). The `[alpha-if-cheap]` tag is no longer in the
  legend's live category list; the legend carries a one-paragraph
  note explaining the transitional category and its closure for
  readers encountering the term in commit history.
- **2026-Q2 — alpha build Phase 1: hash-sigil dispatch + opacity
  bugs fixed.** The first alpha build slice. Two coupled `[alpha]`
  bugs closed: (i) **hash-sigil dispatch** — added `'#' → 'section'`,
  `'##' → 'sub-section'`, `'###' → 'sub-sub-section'` entries to
  `acadamark-core/src/sigil-mapping.js` PARSER_TO_VOCAB so the
  interpreter's vocabulary lookup resolves hash-sigil tagnames to
  their semantic Layer 1 keys; (ii) **hash-sigil isOpaqueContent
  discrepancy** — removed `isOpaqueContent: true` from the three
  hash-sigil grammar rules in `packages/remark-acadamark/grammar/
  acadamark.peggy` and regenerated the parser, so the grammar emits
  the spec-correct `isOpaqueContent: false`; the prior bug was
  runtime-masked by `from-markdown.js`'s contentHandler-based
  override (the override fired because hash sigils have
  `contentHandler === 'default'`), but the grammar source is now
  consistent with both `shorthand-syntax.md` and the DSL registry.
  A finding surfaced during fixture verification: PARSER_TO_VOCAB
  alone was insufficient because the structural plugins
  (`section-nesting.js`, `article-structuring.js`) match sections by
  tagname, not by `resolveVocabKey`. A small companion
  sigil-tagname normalization was added to `section-nesting.js`
  (a `normalizeSigilSectionNames` pre-walk that rewrites `#`/`##`/
  `###` to the canonical Layer 1 names before nesting), so the
  structural pipeline treats sigil and named sections identically.
  New integration fixture `document-14-hash-sigil-headings.acm`
  exercises all three sigil levels including a sigil with id and
  prose content (emphasis, inline code) in titles — the absence of
  such coverage was what let the bug stay latent through the
  acadamark-core extraction arc. A new `sigil-mapping.test.js` unit
  test in `acadamark-core` pins the PARSER_TO_VOCAB mappings. One
  grammar test (`test-grammar.js` L30) was updated to assert the
  spec-correct `isOpaqueContent: false`; previously it asserted the
  buggy `true`. Tests: acadamark-core 30/30, remark-acadamark
  128/128, acadamark-interpreter 24/24 — all 13 prior integration
  snapshots stable, document-14 snapshot written on first run.
  Downstream impact: the `[alpha]` section-form / heading-
  normalization item's Form 2 (sigil) prerequisite is now satisfied;
  that item now reduces to building Form 3 (bare-markdown) heading
  normalization in `normalize-markdown.js`.
- **2026-Q2 — normalize-to-canonical gate landed; section-form ladder
  converges; alpha item closed.** The lift architecture's
  implementation slice. Built `acadamark-core/src/tagname-sigil-map.js`
  — a single source-of-truth `[sigil, tagname]` pair list with both
  `SIGIL_TO_TAGNAME` (lift) and `TAGNAME_TO_SIGIL` (lower-direction;
  no consumer yet but built bidirectional from day one so the two
  directions cannot drift) derived from it, plus a load-time
  bijection assertion. Replaces the prior `sigil-mapping.js`'s
  one-directional `PARSER_TO_VOCAB` / `resolveVocabKey`. Renamed and
  rewrote `acadamark-interpreter/src/plugins/normalize-markdown.js`
  → `normalize-to-canonical.js`: the single early pipeline stage
  that coerces every authored form to canonical Layer 1 shape. The
  gate rewrites all sigil tagnames uniformly (sections AND math/code
  — the Option 2 decision from the lift/lower Phase 0); normalizes
  bare markdown headings to canonical sections at depths 1-3 and
  passes them through as literal `<h4>` / `<h5>` / `<h6>` at depths
  4-6 with an informative diagnostic; and recursively lifts inline
  markdown forms to their canonical Layer 1 equivalents (`emphasis`
  → `<i>`, `strong` → `<b>`, `delete` → `<s>`, `inlineCode` →
  `<inline-code>`, `link` → `<a>`, `image` → `<img>`, `break` →
  `<br>`, raw inline `html` → pass-through with diagnostic). The
  decision per the Phase 0's stylistic-vs-semantic ruling: bare
  markdown stars are stylistic (`<i>`/`<b>`), not semantic
  (`<em>`/`<strong>`). Removed the Phase 1 `normalizeSigilSectionNames`
  pre-walk from `section-nesting.js` (its work now happens at the
  gate); removed the now-redundant runtime `resolveVocabKey` call
  from `interpret-plugin.js` (the gate makes the runtime translation
  unreachable). Several handler / plugin sites that previously
  branched on sigil tagnames (`math.js` isDisplay check; `numbering.js`
  NUMBERED_TAGNAMES and code-block visitor) migrated to the canonical
  tagnames. Math/code behavior-neutrality verified: the math (doc-4,
  doc-5, doc-11) and code-block (doc-13) integration snapshots are
  unchanged under strict comparison — Option 2's gate-based tagname
  rewrite produces identical hast/HTML. The snapshots that DID change
  (doc-2, doc-3, doc-8, doc-14) all reflect expected lifts: `em`/`strong`
  → `i`/`b` in fixtures with bare markdown emphasis, and bare `##`
  → `<sub-section>` in doc-8's citations fixture (which had been
  rendering as `<h2>` until the gate). New integration fixtures:
  `document-15-bare-headings.acm` (bare-heading lift, depths 4-6
  pass-through, inline lift recursion into aside content) and
  `document-16-section-form-convergence.acm` (three forms of the same
  section title — named, sigil, bare-markdown — proving they produce
  structurally identical Layer 1 `<section>` nodes). New unit suite
  `acadamark-core/test/tagname-sigil-map.test.js` (33 cases including
  bijection and round-trip properties). The `[alpha]` "Build heading
  normalization and verify the section-form ladder converges" item
  closes — the convergence-proof fixture is its verification.
  `DESIGN.md` updated: new sections "Lift and lower: two mechanisms"
  (the cipher vs. the lossy lift), "The single gate" (with the rule
  that a new authored form is a new rule at the gate, never a sniff
  in a downstream plugin), "The `<h4>`-`<h6>` exception" (named,
  deliberate, narrow exception to Layer 1's otherwise-closed
  vocabulary), and "Deferred: section model in JATS export". Tests:
  acadamark-core 17+33=50/50; remark-acadamark 128/128;
  acadamark-interpreter 24/24 suites; 4 prior snapshots updated
  (each change explained as a consequence of the gate's lifts);
  math/code snapshots unchanged (behavior-neutrality verified).
- **2026-Q2 — alpha build Phase 2 slice 1: parser-side bugs (2 of 3
  closed, 1 pulled).** Targeted the three parser-side `[alpha]` bugs;
  closed two and pulled one via the escape hatch.
  **(i) Self-closing `<tag />` for DSL-registry tags** (formerly
  DF-21 / AUD-08). Cause: the long-form finder in `syntax.js`
  greedily claimed `<table />` because `table` is in the DSL
  registry, then treated the missing `</table>` as a tag error.
  Fix: added `prevWasSlash` tracking in `makeLongFormTokenizer`'s
  `scanOpenAttrs`; when `>` arrives with the flag set, the long-form
  tokenizer rejects, letting the named-tag tokenizer claim the
  construct and the grammar's `SelfClosingNamedTag` rule emit a
  `selfClosing: true` node. Spaces and tabs preserve the flag (so
  `<tag attr / >` still works); any other non-whitespace clears it.
  No grammar source change (the Peggy grammar already had
  `SelfClosingNamedTag`); the fix is in the micromark finder layer.
  **(ii) Render parser-error nodes visibly** (always-renders
  guarantee work, sibling of the blank-line item). Added
  `packages/acadamark-interpreter/src/handlers/parser-errors.js`
  with two compile-step handlers: `parseErrorHandler` for
  `acadamarkParseError` nodes (renders
  `<span class="parse-error">??parse: SUBTYPE "SOURCE"??</span>`)
  and `tagErrorHandler` for `acadamarkTagError` nodes (renders
  `<span class="tag-error">??tag: NAME — ERROR??</span>`, branching
  on the sigil-opener vs. long-form variants per the error-node
  spec). Wired into `toHast`'s `handlers` map in both the main
  `index.js` compiler and the parallel `runPipeline` in
  `integration.test.js`. Both handlers preserve mdast `position` on
  the emitted hast element so source location is carried into the
  output. The house style (`??...??` markers, distinguishing CSS
  classes) mirrors the existing unresolved-ref / unresolved-cite /
  table-parse-error markers per `principles.md`.
  **(iii) Blank-line termination error recovery** (formerly DF-16)
  — **pulled via the escape hatch**. The backlog entry explicitly
  records the item has a design question (where does the construct
  end? what shape does the recovery output take?) the entry says
  "stays open until both are settled"; the escape hatch is exactly
  the case it's armed for. Pulled, recorded with the finding;
  remains the sole open gap in the always-renders guarantee per
  `principles.md`.
  New integration fixture `document-17-parser-edge-cases.acm`
  exercises both fixes end-to-end: a self-closing `<table />` (no
  tag-error marker; clean self-close), and a deliberate `\z`
  unknown-escape that produces the visible `??parse:
  unknown-escape-sequence "\\z"??` marker, with surrounding prose
  unaffected. Spec drift: `principles.md` §"Current known gaps"
  updated — was "two gaps open," now "one gap remains open" with the
  parser-error-node renderer recorded as closed by this slice.
  Backlog: bug 1 (self-closing) and bug 3 (parser-error rendering)
  removed from both views; bug 2 (blank-line) updated with the pull
  finding; the tag-form-matrix item's mention of AUD-08's brokenness
  updated to note the fix. Tests: acadamark-core 50/50;
  remark-acadamark 128/128 (the grammar is unchanged; the syntax.js
  finder change is exercised through the integration suite);
  acadamark-interpreter 24/24 suites; all prior integration
  snapshots stable under strict comparison (no existing fixture
  exercised `<DSL />` or `\z`, which is itself a coverage finding
  the fixture closes); doc-17 snapshot written on first run.
- **2026-Q2 — alpha build Phase 2 slice 2: interpreter-side bugs
  (3 closed, 2 pulled).** Targeted the three interpreter-side
  `[alpha]` bugs (with the Phase 2 slice 1 lesson — escape hatch
  more readily armed). Step 1's design-question check fired
  immediately on bug 1; sub-bug PG-8 of bug 2 fired mid-step on
  investigation; the rest landed.
  **(i) `<ref>` honor its parsed attributes** (formerly PG-3/4/5) —
  **pulled at Step 1**. The backlog entry framed this as "effectively
  one slice" but the dependent specs (`ref.md`, `interpreter.md`
  §3.9) explicitly mark each individual sub-attribute — `format`
  kwarg, `type` kwarg, pipe-content link-text override — as
  "DEFERRED" with the design treatment open. The fourth sub-feature
  (`+link`/`+preview`/`+title` boolean flags) has no spec anywhere
  in the vocab or specs at all. Implementing this requires settling
  at least four design questions first; the implementation slice is
  gated on those rulings.
  **(ii) Small cite/config bugs cluster** (formerly PG-8/9/11) —
  partial: 2 of 3 closed.
  - **PG-9 (nested `<config>` not read):** closed. Rewrote
    `acadamarkConfigDiscovery` to walk the tree recursively through
    both mdast `children` and acadamarkTag `content` arrays (with
    opacity guards), so `<config>` blocks inside `<meta>`, inside a
    section, or anywhere else are discovered. Top-level discovery
    still works — the recursive walk is a superset, not a replacement.
  - **PG-11 (trailing whitespace before EOL):** closed. In
    `packages/remark-acadamark/src/syntax.js`, the flow-position
    `afterClose` (sigil-tag tokenizer) and `afterGt` (named-tag
    tokenizer) now skip trailing space/tab characters before checking
    for the line ending. Without this fix, `<# Heading #> ` (trailing
    space) was silently reclaimed by the text-position tokenizer as
    inline, which was rarely what the author meant. No grammar source
    change.
  - **PG-8 (multi-key citation key ordering):** **pulled** per the
    escape hatch. citation-js / CSL styles sort cluster items by
    author name internally as a CSL convention; preserving author
    input order would require either modifying the CSL style XML (not
    per-call), formatting each key individually and joining (loses
    cluster-level features), or patching citation-js. This is both a
    design question (should acadamark diverge from CSL convention?)
    and a non-trivial implementation choice. Re-filed as its own
    backlog item.
  **(iii) `<config>` no longer silently accepts metadata kwargs**
  (formerly AUD-13) — closed. `acadamarkConfigDiscovery` now validates
  every kwarg against an allowlist (`citation-style`,
  `number-equations`, `number-figures`, `number-tables`, and the
  `ref-prefix-*` prefix family). Unknown kwargs are dropped from the
  config map and a `file.message()` warning is emitted. Metadata-shaped
  kwargs (`title`, `subtitle`, `author`, `date`) get a more specific
  hint suggesting the author meant `<meta>` per DD-3 in `DESIGN.md`.
  New fixtures: `document-18-config-edge-cases.acm` (exercises PG-9
  recursive walk via a nested `<config>`, PG-11 trailing-whitespace
  sigil, and the end-to-end `ref-prefix-eqn` override producing
  "Eq. 1"); `document-19-config-unknown-kwargs.acm` (deliberately
  abuses `<config>` with `title=` and `foo-bar=`, asserts both are
  dropped and the `<meta>` title wins). New unit tests in
  `plugins/config-discovery.test.js` (the two prior tests used
  unspec'd kwargs `numbering=`/`note-position=` and were updated to
  use the actually-consumed `citation-style`/`ref-prefix-eqn`; three
  new tests pin the validation-and-warn behavior including the
  recursive walk and the metadata-hint case). Spec drift: none —
  `principles.md` doesn't list AUD-13 as a known gap; the `config.md`
  vocab entry describes a structured-children configuration interface
  that is not (yet) the implemented surface, which is a separate
  larger drift item, not introduced by this slice. Tests:
  acadamark-core 50/50; remark-acadamark 128/128 (grammar unchanged;
  the syntax.js change is exercised through integration); acadamark-
  interpreter 24/24 suites; all prior integration snapshots stable
  under strict comparison; doc-18 and doc-19 snapshots written on
  first run. Backlog: bug 3 (AUD-13) removed from both views; bug 1
  (PG-3/4/5) updated in both views with pull-at-Step-1 finding; bug 2
  (PG-8/9/11) reshaped — the bundled entry is gone; PG-9 + PG-11
  closed as part of this slice; PG-8 re-filed as its own pulled item
  with the finding. The remaining-AUD-N item's count updated from
  six to five (AUD-13 closed by fix, not by verify).
- **2026-Q2 — apparatus-tag reconciliation.** A reconciliation slice
  closing the `<ref>`-attributes bug pulled in Phase 2 slice 2 and
  formalizing the `<meta>` / `<config>` / `<data>` / `<library>`
  positioning + interface architecture per the user's settled
  rulings. Six pieces:
  **(i) `<ref>` reconciled as a normal tag.** The `type` and `format`
  kwargs flow to `data-ref-type` / `data-ref-format` attributes on
  the rendered anchor (via the marker → handler path); the `+link`
  flag controls anchor-vs-span rendering (`-link` → `<span class="ref">`,
  no `href`); the `+preview` flag controls hover-preview attachment
  (`-preview` → `data-no-preview="true"`, honored by the
  `hover-preview.js` attacher); `+title` is documented as reserved /
  unimplemented (original intent not recovered). `ref.md` and
  `interpreter.md` §3.9 had their "DEFERRED" / "open work" language
  removed; the kwarg `maps_to` declarations added; the boolean flag
  surface documented as a new `booleans:` section in the vocab entry.
  Sniffing-site audit: only `ref-resolution.js` (resolver) and
  `hover-preview.js` (preview attacher) touch `<ref>` behavior — both
  updated.
  **(ii) Apparatus-tag positioning rule.** A new
  `warnMisplacedApparatus` walk inside `article-structuring.js`
  emits an informative diagnostic when `<meta>` / `<config>` /
  `<data>` / `<library>` appears inside another tag's content (not
  at root). `<data>` is treated as transparent for `<library>`
  (the legitimate `<data><library /></data>` nesting). The rule is
  warning-level (informative diagnostic, not error); hardening to
  error-level enforcement is a separate later one-line ruling.
  **(iii) `<meta>` / `<config>` interface unified.** Both apparatus
  tags accept two equivalent authoring forms — kwargs and child tags
  — that reduce to the same Layer 1 canonical shape. For `<meta>`,
  the lift at `normalize-to-canonical.js` converts allowlisted
  kwargs to child tags (`title="X"` → `<title>X</title>`). For
  `<config>`, kwargs stay as kwargs (matching the existing
  config-discovery shape). The lift is one rule per tag at the
  single gate (per the architecture), not a sniff in a downstream
  plugin.
  **(iv) `<meta>` allowlist defined**:
  `title / subtitle / author / date / doi / license / lang / version /
  keywords`, plus `type` (which stays as a structural-routing kwarg,
  not lifted). `author` is flat per the ruling; structured author
  data is attempted at the JATS export boundary. `abstract` is
  deliberately NOT in the allowlist — it is its own tag; the
  missing `<abstract>` vocabulary entry is filed as a finding in a
  new backlog item alongside the missing `doi`/`license`/`lang`/
  `version`/`keywords` entries.
  **(v) `<config>` allowlist reconciled**. The AUD-13 fix's
  inferred allowlist is extended with the user's enumerated keys:
  live = `citation-style / number-equations / number-figures /
  number-tables / ref-prefix-*`; reserved = `theme / display-style /
  note-position / bibliography-position / reference-library /
  strict-mode`. Per the prompt's instruction NOT to silently
  implement new settings: reserved keys are accepted into the
  config map without warnings but no plugin consumes them yet;
  the per-key status is documented in
  `acadamark-interpreter/src/lib/apparatus-allowlists.js`.
  Adding a key here does not implement its behavior.
  **(vi) Misuse feedback** fires for the complete key sets in both
  directions: `<meta>`-shaped key in `<config>` gets a "did you
  mean `<meta>`?" hint; `<config>`-shaped key in `<meta>` gets a
  "did you mean `<config>`?" hint. Both are informative
  diagnostics, not errors; the offending kwarg is dropped.
  New shared module: `acadamark-interpreter/src/lib/apparatus-allowlists.js`
  (allowlists as data + predicates, single source of truth for the
  gate's lift, the misuse-feedback hints, and any future consumers).
  Validation moved out of `config-discovery.js` (which is now a
  read-only kwarg-collector) into the gate, keeping the
  single-gate architecture consistent.
  Three new fixtures: `document-20-apparatus-reconciliation.acm`
  (`<ref>` with kwargs/flags + misuse hint end-to-end);
  `document-21-meta-kwargs-and-children.acm` (kwarg form of `<meta>`
  produces the same Layer 1 shape as authored child-tag form);
  `document-22-apparatus-positioning.acm` (misplaced `<config>`
  inside an aside triggers the warning; document still renders).
  Five new unit tests added to `normalize-to-canonical.test.js`
  covering the four kwarg-handling paths (unknown drop, meta-shaped
  hint, lift, type-kwarg preservation, config-shaped-on-meta hint).
  Config-discovery's prior validation tests were noted as relocated
  (the gate owns validation now) — the recursive-walk test stays.
  Spec drift: `ref.md` and `interpreter.md` updated; `config.md`
  documents the kwarg surface alongside its existing structured-
  children one (resolving the drift Phase 2 slice 2 surfaced);
  `meta.md` removes `<abstract>` from the child-tag list and notes
  the missing-entry finding. `DESIGN.md` records the
  apparatus-tag positioning principle as a new principle
  (alongside "The single gate" and "The h4-h6 exception"). Tests:
  acadamark-core 50/50; remark-acadamark 128/128 (grammar
  unchanged); acadamark-interpreter 24/24 suites; all prior
  integration snapshots stable under strict comparison; the three
  new fixtures' snapshots written on first run. Backlog: the
  pulled `<ref>` honor-attributes item (formerly PG-3/4/5) removed
  from both views; the start-here shortlist's stale `<ref>` entry
  removed; one new alpha-if-cheap item filed for the missing
  `<meta>`-allowlist vocabulary entries. The escape hatch did not
  fire — neither `+preview` flag-gating (small) nor the
  kwarg→child-tag lift (a normalize rule) needed structural rework.
- **2026-Q2 — backlog reconciliation against current code.** A
  reconciliation slice ran with the working assumption that
  `BACKLOG-ROADMAP.md` might have drifted from reality (a
  recently-observed external copy listed several closed bugs as
  open). **The repo backlog had NOT drifted.** Every closed item
  was already correctly removed from both views by its closing
  slice; the three items in the Bugs section at the time of the
  reconciliation were exactly the three that genuinely remained
  open. Every status call was verified against evidence — the
  closing commit (`61fdf5f`, `e17a892`, `cf8ed69`, `d89e50a`,
  `578d6f0`) and the current code — not against slice reports or
  assumptions. The "recently-observed copy" was a stale external
  view, not the version-controlled file. The slice did fold in
  three owed recordings: (i) **PG-8 (multi-key cite ordering)
  closed as not-a-bug** — citation cluster ordering is delegated
  to citation-js / CSL by design; the broader principle
  ("citation formatting, ordering, and style questions are
  delegated to citation-js / CSL — acadamark does not reimplement
  or override them") is now recorded in `DESIGN.md` as a sibling
  of the existing processor-delegation principle. (ii) The
  missing-`<meta>`-allowlist-vocabulary item **re-tagged
  `[alpha-if-cheap]` → `[alpha]`** — small uniform element-spec
  entries with no expensive branch; not conditional alpha work.
  (iii) The blank-line-termination entry **updated with the
  decided Option A design** — blank line inside an open tag is a
  paragraph break, not a terminator; multi-paragraph tag content
  allowed; explicit `>` is the only terminator; unclosed tags
  detected at EOF (or a hard structural boundary, sub-question)
  produce a visible `acadamarkTagError`. The implementation
  question being investigated by a Phase 0 in progress.
  Two small stale cross-references found in passing and corrected
  (the sigil-first-class Discussion item's reference to closed
  hash-sigil bugs "above" and to the renamed `sigil-mapping` →
  `tagname-sigil-map` module). Backlog item count: 41 → 40
  (PG-8 removed from both views). No product code changed; no
  test runs needed.
- **2026-Q2 — blank-line-termination closed (formerly DF-16);
  always-renders guarantee fully honored.** A closing slice for the
  blank-line-termination bug. The Phase 0 for it had already verified
  that the chosen design (Option A — blank line inside a tag is a
  paragraph break, not a terminator; tag terminates only on its
  explicit closing `>` or at EOF; unclosed tag produces a visible
  `acadamarkTagError`) was *already implemented* in the current code:
  all three open-tag tokenizers in `syntax.js` scan through line
  endings transparently and terminate at EOF; `from-markdown.js`
  stamps `acadamarkTagError` for the EOF-without-closer case; the
  Phase 2 slice 1 `tagErrorHandler` (`handlers/parser-errors.js`)
  renders it visibly. Parser-level tests RC-6 (multi-paragraph
  content) and ML-8 (unterminated multi-line construct → error)
  already pin both halves at the parser level. Under the user's
  ruling on Q3 (EOF-only — no additional hard structural boundary
  terminator, to avoid reintroducing the blank-line-as-signal
  heuristic Option A was chosen to avoid), no implementation work
  remains. **This slice changed no product code.** Its product was:
  two new integration fixtures pinning the behavior end-to-end
  against regression — `document-23-multi-paragraph-tag-content.acm`
  (an `<aside>` with a blank-line-separated multi-paragraph content
  block; asserts two `<p>` children, no `tag-error` marker) and
  `document-24-unclosed-tag-at-eof.acm` (an `<aside>` opened with
  `|` and never closed; asserts the visible `??tag: …??` marker,
  the article body still renders, no document failure);
  `principles.md` §"Current known gaps" rewritten — both
  previously-tracked gaps (parser-error-node renderer; blank-line/
  EOF consumption) are now recorded as closed, and **no gaps remain
  open against the always-renders guarantee**; `DESIGN.md` gained a
  new "Multi-paragraph tag content; unclosed tags terminate at EOF"
  section recording the Option A design and the EOF-only ruling with
  its rationale (avoid the blank-line-as-signal heuristic) and
  acknowledged bounded tradeoff (an unclosed tag near document top
  swallows downstream content into the error node — bounded because
  the error renders visibly at the open position; tighter
  localization is an incremental future change, not foreclosed).
  Tests: acadamark-core 50/50; remark-acadamark 128/128 (RC-6 and
  ML-8 included); acadamark-interpreter 24/24 suites; **no existing
  snapshot changed** — the Phase 0's premise that the current code
  already implements Option A is confirmed empirically by zero
  pre-existing diffs. Backlog: DF-16 removed from both views; item
  count 40 → 39. Bugs section now holds exactly one item (AUD-17,
  the `integration.test.js` hand-mirror — a separate post-alpha
  item). The unusual nature of this closure —
  fixed-by-the-design-revealing-the-code-was-already-right, not
  fixed-by-a-code-change — is recorded here so a future reader
  doesn't search the diff for the "fix."
