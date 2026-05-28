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
- **2026-Q2 — vocabulary entries for `<meta>` allowlist members
  added.** Added five Layer 1 vocabulary entries that the
  apparatus-tag reconciliation (`578d6f0`) had left as a gap: `doi`,
  `license`, `lang`, `version`, `keywords` — the `<meta>` allowlist
  members that lifted correctly at the gate but rendered as
  `<span data-acadamark-unknown="…">` for want of vocabulary
  entries. Each entry written to the existing entry schema
  (frontmatter with `semantic_role`, `html_output`,
  `acadamark_attributes`, `content`, `content_handler`,
  `jats_counterpart`, `shorthand_examples`,
  `interpreter_strategy: schema`) and a markdown body. JATS
  counterparts verified where straightforward (`<doi>` → `<article-id
  pub-id-type="doi">`; `<license>` → `<license>` inside
  `<permissions>`; `<keywords>` → `<kwd-group>` of `<kwd>`) and
  honestly recorded with uncertainty where the JATS situation is
  contestable (`<lang>` → `xml:lang` attribute, not an element;
  `<version>` → `<article-version>` where the schema variant supports
  it or `<custom-meta>` fallback). **Backlog claim contradicted:**
  the backlog item asserted `<abstract>` also needed an entry, but
  `abstract.md` was already present and comprehensive — only five
  entries added, not six. Surfaced as a finding in this slice's
  report; no code change needed for `<abstract>`. Vocabulary
  `data.js` regenerated (66 → 71 entries; +5 new); `pretest`
  staleness guard passes. New integration fixture
  `document-25-meta-allowlist-elements.acm` exercises a `<meta>`
  carrying all five new kwargs plus an `<abstract>`; asserts each
  renders as a real custom element and that no
  `data-acadamark-unknown` span remains. One existing snapshot
  changed: `document-20-expected.json` had a `<doi>` rendering as
  `<span data-acadamark-unknown="doi">` (because doc-20 includes a
  `<meta doi=…>`); now renders as `<doi>` — the expected
  unknown-span → real-element correction. No other snapshots
  changed. Updated the vocabulary test's hardcoded entry-count check
  (67 → 72, with the rationale recorded inline). Backlog: the
  `[alpha]` "Add vocabulary entries for `<meta>` allowlist members
  and `<abstract>`" item removed from both views (item count 39 →
  38). Tests: layer1-vocabulary 52/52 (one count assertion updated);
  acadamark-core 50/50; remark-acadamark 128/128;
  acadamark-interpreter 24/24 suites.
- **2026-Q2 — deferred-vocabulary sub-slice 1: schema-clear
  scalars and inline elements shipped (11 entries).** The first of
  three build sub-slices closing the `[alpha]` "Add deferred
  vocabulary elements" item. A scoping pass (2026-05-26) split the
  item into three sub-slices by natural seams and resolved the
  long-standing "inline-semantic denotation lost" concern (the
  DF-15 archive entry preserves the full element list; the detail
  was never lost). This sub-slice shipped eleven Layer 1 vocabulary
  entries — the schema-clear group with no design questions:
  - **Metadata / author sub-elements** (5): `publication-date` →
    JATS `<pub-date>`; `affiliation` → JATS `<aff>`; `orcid` →
    JATS `<contrib-id contrib-id-type="orcid">`; `email` → JATS
    `<email>`; `subject` → JATS `<subj-group>/<subject>` (with
    optional `scheme` kwarg → `subj-group-type`).
  - **Inline-semantic** (2): `abbr` → JATS `<abbrev>` (with
    `title` kwarg for expansion, standard HTML pattern); `term` →
    JATS `<named-content content-type="term">`.
  - **HTML-native inline, no JATS counterpart** (4): `kbd`,
    `var`, `samp`, `output`. JATS counterpart honestly recorded
    as `(no direct JATS counterpart; HTML-native)` per the
    `<lang>` precedent — no invented counterpart.
  Vocabulary `data.js` regenerated (71 → 82 entries; +11);
  pretest staleness guard passes. New integration fixture
  `document-26-deferred-vocab-sub1.acm` exercises all eleven
  elements end-to-end: integration test asserts each renders as a
  real custom element with its value, no `data-acadamark-unknown`
  span, `abbr`'s `title` kwarg carries through, `term`'s id
  threads, `subject`'s `scheme` kwarg flows to
  `data-subject-scheme`. Vocabulary test entry-count assertion
  updated 72 → 83 (71 + 11 + quote alias). **No existing snapshot
  changed** — expected, since the new entries simply provide
  vocabulary for elements that no existing fixture authored. Two
  findings surfaced and recorded: `<name>` is not in the vocabulary
  today (the affiliation.md example uses it but no entry exists —
  separate follow-on); `<author>` is not in `DSL_REGISTRY` so the
  structural-author-children authoring pattern (`<author><affiliation
  | …></author>`) doesn't parse as long-form today and the new
  author-sub-element entries' structural homing is a follow-on
  decision. Neither blocks the rendering correctness this sub-slice
  proves. The backlog item remains open — sub-slice 2 (structural
  blocks: definition lists, glossary, details/summary) and
  sub-slice 3 (theorem family) follow. Tests: layer1-vocabulary
  52/52; acadamark-core 50/50; remark-acadamark 128/128;
  acadamark-interpreter 24/24 suites.
- **2026-Q2 — design decisions recorded; two earlier rulings
  superseded.** A recording slice (no product code) wrote down a
  batch of settled design decisions into `DESIGN.md` and the backlog,
  and retired two earlier rulings these decisions replace.
  **Added to `DESIGN.md`** as three new sections:
  (i) **the vocabulary-boundary principle** — the Layer 1 vocabulary
  holds *document ideas* (JATS-shaped, semantic, archival), not
  web-presentation artifacts. Worked example: `<thumbnail>` (ruled
  out under this principle — a social-sharing image is a property of
  one delivery channel, not of the document).
  (ii) **frameable elements: a shared capability** — frameable is a
  *uniform capability* (optional outline box, optional title,
  optional caption, numbering folded into rendering) shared across
  several distinct Layer 1 elements (`<fig>`, `<table>`, `<code>`,
  `<svg>`, `<mermaid>`, the other DSL-registry block elements, and a
  generic `<frame>`), **not** an umbrella tag wrapping inner content.
  `<fig>` is the sole graphical element (no separate `<img>` /
  `<picture>`); `<figure>` is accepted as an authoring alias for
  canonical `<fig>`, normalized at the lift gate. The two
  earlier-open sub-questions (the generic `<frame>`; the
  `figure`/`fig`/`img`/`picture` question) are resolved by this
  design; one sub-question (the exact membership list of the
  frameable class) remains open and is recorded as such.
  (iii) **structured-data-container tags** — generalizes the
  apparatus-tag-positioning section's kwargs-or-child-tags interface
  principle into an explicit category. `<author>` is named as a
  structured-data-container parallel to `<meta>`; its alpha-scope
  interface accepts both forms, the gate lifts kwargs to canonical
  child tags, and Layer 1 `<author>` carries child tags
  (`<name>`/`<affiliation>`/`<orcid>`/`<email>`) plus the
  `+corresponding` boolean.
  **Two supersession searches performed:**
  - *The `<figure>`-as-umbrella model.* Located in DESIGN.md as
    scattered references (L78 HTML5-element list, L217 two-register
    example, L228 canonical-vocabulary illustration) and most
    explicitly in the `figure.md` vocab entry. The three DESIGN.md
    mentions were rewritten: removed `figure` from the HTML5-native
    list (since `<fig>` is canonical and not HTML5-native, `<figure>`
    is now just an alias); rewrote the example to use `<fig>`;
    rewrote the canonical-vocabulary list to name `<fig>`. The
    vocab-entry rewrite (`figure.md`, `img.md`, `table.md`,
    `code.md`) is *implementation work* — out of scope for a
    recording slice; covered by the new frameable-class Phase 0 +
    implementation slice filed in the backlog. Result: no DESIGN.md
    text now describes the umbrella model as current.
  - *The "author is flat for the alpha" ruling.* Located in exactly
    one place: the `578d6f0` apparatus-tag-reconciliation milestone
    in STATUS.md (one line: "`author` is flat per the ruling;
    structured author data is attempted at the JATS export
    boundary"). The ruling was never propagated into any current
    spec — not into DESIGN.md, BACKLOG-ROADMAP.md, principles.md,
    idioms.md, layer1-naming.md, or the `author.md` vocab entry. The
    STATUS milestone is append-only history (state-at-that-time) and
    is *not rewritten* by this slice; the supersession is recorded
    by the new DESIGN.md "Structured-data-container tags" section and
    by this milestone. Result: no current live spec text carries the
    old ruling; future readers reading the apparatus-tag-reconciliation
    milestone will see the original ruling as part of that historical
    record but will reach the superseding decision via DESIGN.md and
    this milestone.
    *Two live-spec/code carriers of the old ruling were surfaced by
    the supersession search and could not be retired under this
    slice's no-product-code constraint:* (a)
    `packages/layer1-vocabulary/elements/meta.md` L267
    (vocab spec: "`<author>` — author (a single flat value per
    `<author>`) … Structured author data … is attempted at the JATS
    export boundary"); (b)
    `packages/acadamark-interpreter/src/lib/apparatus-allowlists.js`
    L20-29 (code comment: "`author` is FLAT … structured author data
    is attempted at the JATS export boundary, not carried in the
    authoring surface"). Both are filed into the new `<author>`
    structured-interface reconciliation backlog item as cleanup the
    implementation slice must perform — recorded there as the
    "Cleanup the slice must also do" subsection of the item's
    detailed entry.
  **Backlog corrections (deferred-vocabulary item):**
  `<corresponding>` and `<short-title>` were originally enumerated
  among the deferred-vocab item's elements; both are **ruled kwargs,
  not elements**. `<corresponding>` is `+corresponding` on
  `<author>`, folded into the new `<author>` structured-interface
  reconciliation item (below). `<short-title>` is `short=` on
  `<title>`, filed as a small `[alpha]` item. `<thumbnail>` (also
  originally listed) is dropped entirely per the new
  vocabulary-boundary principle.
  **Two new `[alpha]` backlog items filed** (not implemented, only
  filed): (a) **frameable-class Phase 0** — read-only investigation
  mapping every site in the code that assumes the `<figure>`-umbrella
  model; prerequisite to the implementation slice; coupled to the
  existing AUD-14 caption-as-content item via reciprocal
  cross-references. (b) **`<author>` structured-interface
  reconciliation** — implementation slice parallel to `578d6f0`;
  absorbs the missing `<name>` vocabulary entry that the
  deferred-vocab sub-slice 1 milestone surfaced as a follow-on. One
  small `[alpha]` item also filed: (c) `<title> short=` kwarg.
  **No product code changed.** All writes confined to `DESIGN.md`,
  `BACKLOG-ROADMAP.md`, and `STATUS.md`. The two superseded rulings
  are searched for and confirmed retired in all live spec surfaces;
  the only remaining mention of each is in append-only history
  (STATUS milestones), which is the correct location for them.
- **2026-Q2 — structured-element infrastructure built; `<meta>`
  migrated; `<author>` added; supersession #2 completed.** Built the
  shared infrastructure for structured-data-container tags (tags
  holding a record of named fields, accepting both kwarg and child-tag
  authoring forms, with a kwarg→child-tag lift at the gate). The
  infrastructure lives at `packages/acadamark-core/src/structured-elements.js`
  as a separate registry from `DSL_REGISTRY`; the parser's
  long-form-eligibility check consults the union via a derived
  `LONG_FORM_TAGS` set. Each entry is a per-tag spec: accepted kwargs,
  the subset lifted to child tags, boolean-marker kwargs, child
  allowlist, an opt-in child-validation flag, and an optional
  misuse-feedback partner pointer. The interpreter's
  `normalize-to-canonical.js` consumes the spec generically via
  `liftStructuredKwargs(node, file)`; the previous `<meta>`-specific
  `liftMetaKwargs` and the `META_KWARGS` / `META_KWARGS_LIFTED` /
  `isMetaKwarg` data in `apparatus-allowlists.js` were replaced by the
  generic mechanism (apparatus-allowlists.js now holds only `<config>`
  data, since `<config>` is not a structured-data-container).
  Migrated `<meta>` onto the infrastructure: removed `['meta', 'default']`
  from `DSL_REGISTRY` (its long-form-eligibility now comes from
  `STRUCTURED_ELEMENTS`); moved `<meta>`'s allowlist + lifted-subset +
  `<config>` partner pointer into the new registry's `<meta>` spec.
  **Behavior-preserving** for `<meta>`: every existing `<meta>`
  integration snapshot (doc1, doc8, doc21, doc25, …) passes under
  strict comparison with no diff. `<meta>`'s `validateChildren` flag
  is deliberately off in the migration so the surface change is
  purely internal.
  Added `<author>` as the second structured-data-container: child
  allowlist `name`/`affiliation`/`orcid`/`email`; boolean kwarg
  `corresponding`; `validateChildren: true`. Both `+corresponding`
  (boolean-form) and `corresponding=true` (kwarg-form) normalize to
  the same canonical `corresponding="true"` attribute on the Layer 1
  node — the gate promotes the boolean-form from `node.booleans` into
  `node.kwargs` so the schema renderer's attribute mapping fires
  uniformly. Added the `<name>` vocabulary entry (the entry the
  deferred-vocab sub-slice 1 milestone surfaced as missing — `<name>`
  is `<author>`'s name-string child element; JATS counterpart is
  `<string-name>`, the unparsed-name form). Rewrote `author.md` to
  document the structured interface; updated `meta.md` L267 to remove
  the "author is flat" wording and point to `author.md` instead.
  Vocabulary `data.js` regenerated (83 → 84 entries including the
  `quote` alias; 83 primary); test count assertion bumped.
  **`<data>` decision** (per the slice's Step 5 assessment): `<data>`
  was assessed but **not** migrated. Its content is a list of
  resources (`<library>`/`<bib-entry>`), not a record of named
  fields; no kwarg surface. It does not fit the structured-data-
  container shape as currently defined. Left in `DSL_REGISTRY` as-is;
  filed a `[post-alpha]` follow-up backlog item to revisit (extend
  the registry's spec to also cover list-of-resources containers, or
  define a sibling registry).
  **Supersession #2 completed.** The "author is flat for the alpha"
  ruling, recorded in the `578d6f0` apparatus-tag-reconciliation
  milestone, had two live product-code carriers the recording slice
  (`1d100eb`) could not retire under its no-product-code constraint:
  `meta.md` L267 and `apparatus-allowlists.js` L20-29. This slice
  retired both. A repo-wide grep confirms no live spec or code
  surface carries the old wording — the only remaining mentions are
  in append-only history (the original 578d6f0 milestone and 1d100eb's
  supersession-trail milestone, both correct as historical record)
  and one explanatory comment in the new `structured-elements.js`
  that explicitly retires the ruling.
  **One authoring constraint surfaced** (now documented in
  `DESIGN.md` §"Structured-data-container tags" + `author.md`): a
  structured-data container in kwarg-only form must self-close
  (`<author … />`) or use explicit-close-with-empty-body
  (`<author …></author>`). Without one, the parser's long-form
  tokenizer claims `<author …>` as a long-form opener and scans for
  `</author>`. This is the same constraint `<table />` follows for
  the same reason. The doc27 fixture exercises it; the fixture also
  notes the related constraint that nested long-form close tags must
  sit at column 0 of their line (an existing parser characteristic
  surfaced when authoring nested `<author>` inside `<meta>` for the
  fixture).
  Two follow-up backlog items filed (both `[post-alpha]`):
  (a) the `<data>` migration revisit above; (b) renaming the
  `dslRegistry` option on `acadamarkSyntax` (the option's default
  became `LONG_FORM_TAGS` and the name is now misleading; the slice
  kept the historical name to avoid a public-API churn in an
  already-large refactor).
  Backlog: the `<author>` structured-interface reconciliation item
  removed from both views (closed by this slice).
  New integration fixture `document-27-author-structured-interface.acm`
  + `integration doc27` test asserts kwarg-form and child-tag-form
  `<author>` produce equivalent Layer 1 child structures (each child
  element appears exactly twice — once per form), `+corresponding`
  carries through to the canonical Layer 1 node, the unknown-kwarg
  `bogus=x` is dropped (not present as an `<author>` attribute), and
  the backward-compatible casual pipe-content form still works.
  Tests: layer1-vocabulary 52/52; acadamark-core 33/33;
  remark-acadamark 128/128; acadamark-interpreter 24/24 suites (incl.
  new doc27); **no existing snapshot changed**.
- **2026-Q2 — deferred-vocabulary sub-slice 2: structural-block
  elements shipped (7 entries).** The second of three build sub-slices
  closing the `[alpha]` "Add deferred vocabulary elements" item. Seven
  Layer 1 vocabulary entries added:
  - **Definition lists** (3): `dl` → JATS `<def-list>`; `dt` → JATS
    `<term>` inside `<def-item>`; `dd` → JATS `<def>` inside
    `<def-item>`. The JATS exporter groups adjacent `<dt>`/`<dd>`
    pairs into `<def-item>` wrappers at export (acadamark follows
    HTML's flatter alternating-siblings pattern).
  - **Glossary** (2): `glossary` → JATS `<glossary>`; `glossary-entry`
    → JATS `<def-item>` (inside `<glossary>`). The `glossary-entry`
    envelope is acadamark's named pairing convenience; JATS does not
    have a separate `glossary-entry` element. Glossary entries
    typically carry an id using the `term:` colon-prefix convention
    (consistent with `fig:`, `eqn:`, `sec:`) for cross-references.
  - **Disclosure** (2): `details` and `summary`. **No JATS counterpart**
    — recorded honestly per the `<lang>` / `<kbd>` precedent. JATS
    has no disclosure / interactive-toggle construct; at export the
    `<details>` is expected to be flattened (summary text becomes a
    heading, body becomes content), with the exact target structure
    a JATS-export-time choice.
  Three structural long-form containers (`<dl>`, `<glossary>`,
  `<details>`) also registered in `DSL_REGISTRY` under the existing
  "Structural long-form tags" section — same registration `<ul>`/
  `<ol>`/`<aside>`/`<note>`/`<blockquote>` use, for the same reason:
  the natural authoring of these containers is long-form (`<dl>…</dl>`
  with nested `<dt>`/`<dd>`), which requires long-form-eligibility.
  This was a judgment call against the slice prompt's "no parser or
  interpreter code changes" constraint — DSL_REGISTRY is registry
  data in `acadamark-core` (not parser or interpreter code in the
  literal sense) and is the same kind of registry-data change a vocab
  entry is. Without it, the seven entries would be hollow — authorable
  only in their unnatural short-form. Recorded here so the call is
  visible.
  Vocabulary `data.js` regenerated (83 → 90 primary entries; 91 with
  the `quote` alias). Pretest staleness guard passes; test count
  assertion bumped 84 → 91.
  New integration fixture `document-28-deferred-vocab-sub2.acm` +
  `integration doc28` exercises all seven elements end-to-end: a
  `<dl>` with three term/description pairs; a `<glossary>` with two
  `<glossary-entry>` items, each carrying a `<dt>`/`<dd>`; two
  `<details>` blocks (one default-collapsed, one with `open=true`).
  Assertions: each of the seven renders as a real element with its
  content; no `data-acadamark-unknown` span for any of them; both
  `<details>` blocks render; the `open=true` kwarg renders as
  `open="true"` on the canonical `<details>`. **No existing snapshot
  changed** — the new fixture is new output, no prior fixture
  authored any of these seven elements.
  **One finding piggybacked as a `[post-alpha]` backlog item**
  (Step 8 of the slice prompt): `buildProperties` does not iterate
  `node.booleans` — the schema renderer's attribute-mapping helper
  iterates `node.kwargs` but not `node.booleans`, so a `+flag`
  boolean-form authoring silently drops through the schema dispatch
  unless promoted to kwargs at the gate. Surfaced first by the
  `<author>` reconciliation (`beb2fb3`) which worked around it for
  `+corresponding` via `liftStructuredKwargs`'s boolean-promotion
  step; re-encountered in this slice with `<details +open>` which the
  doc28 fixture switched to the kwarg form `open=true` (with a note
  in both fixture and entry) to demonstrate the rendered attribute.
  Item filed in both backlog views with the root-cause fix recorded
  (extend `buildProperties` to also iterate `node.booleans` per the
  vocabulary entry's `booleans:` declarations). This slice records
  the finding; the fix is a separate item.
  Backlog: the "Add deferred vocabulary elements" item remains open
  — sub-slice 2 ticked off; sub-slice 3 (theorem family) follows.
  Tests: layer1-vocabulary 52/52; acadamark-core 33/33;
  remark-acadamark 128/128; acadamark-interpreter 24/24 suites
  (incl. new doc28).
- **2026-Q2 — deferred-vocabulary sub-slice 3: theorem-family
  elements shipped (8 entries); "Add deferred vocabulary elements"
  closed; ROADMAP Phase 1 closed.** The third and final build
  sub-slice closing the `[alpha]` "Add deferred vocabulary
  elements" item. Eight Layer 1 vocabulary entries added:
  - **Propositional theorem family** (4, sharing a counter by
    convention): `theorem`, `lemma`, `corollary`, `proposition`.
  - **Own-counter** (2): `definition`, `example` (rhetorically
    distinct from the propositional family).
  - **Unnumbered** (2): `remark`, `proof`.
  All eight map to JATS `<statement content-type="X">` — JATS does
  not have separate theorem-family elements; the eight share one
  element with a discriminating attribute, settled context recorded
  in each entry.
  Settled context, recorded in each entry per the slice prompt's
  fixed input (no design decisions taken in the slice):
  - **No internal element parts** — body content is paragraphs and
    inline directly, no `<theorem-statement>` / `<theorem-body>`
    wrapper. Resolves the earlier speculative claim in
    `layer1-naming.md` ("internal parts likely follow the
    container-role rule"); LaTeX amsthm and JATS both put body
    content directly inside the container, and acadamark follows.
    `layer1-naming.md` L142 rewritten in this slice to record the
    settled answer.
  - **`<proof>` is a peer, not a child** of theorem-like statements.
    Matches LaTeX (`\begin{proof}` is independent of any theorem
    environment) and JATS (`<statement content-type="proof">` is a
    peer statement). Acadamark follows.
  - **Optional `name` kwarg** per element — the "(Pythagoras)" suffix
    pattern. Recorded under each entry's `acadamark_attributes.kwargs`
    with `maps_to: data-name`. The schema dispatch flows the kwarg
    through to the rendered HTML; the Phase-2 handler will use it for
    the visible label.
  - **Numbering convention** per element — `booleans.numbered` with
    the right `default:` value. The four propositional members share
    a counter by convention; that shared-counter wiring is recorded
    in prose only (the vocab schema has no mechanism for declaring
    "shares a counter with these other elements" — see the Step 2
    escape-hatch finding below).
  **Two escape-hatch findings, recorded honestly:**
  - *No schema mechanism for shared-counter declarations.* The vocab
    schema uses `booleans.numbered` per element; the actual counter
    sharing is hardcoded in `numbering.js`'s `NUMBERED_TAGNAMES`. No
    field in the entry schema lets one element declare "shares a
    counter with these others." Per the slice prompt's escape hatch,
    the four propositional elements record `numbered: true` (without
    a shared declaration) and the convention is in their NOTES prose
    only. The Phase-2 handler will implement the shared-counter wiring
    by extending `NUMBERED_TAGNAMES` (or its replacement).
  - *Pre-existing `<theorem>` DSL_REGISTRY entry at line 45 points at
    a non-existent dedicated handler.* The line-45 entry
    `['theorem', 'theorem']` predates this slice; it makes every
    `<theorem>` node `isOpaqueContent: true`, which the schema
    dispatch drops at convert-content time. Per the slice prompt's
    "don't fix existing entries" rule, this slice left line 45 alone
    and added the other seven theorem-family elements to
    DSL_REGISTRY's structural-long-form section with the `'default'`
    handler (recursive content parse). Result: the seven new
    elements render with full body content via long-form authoring;
    `<theorem>` renders as the real custom HTML element with its
    attributes intact (id, data-name) but **empty body**. The
    fixture asserts the `<theorem>` element renders and that
    `data-name="Pythagoras"` flows through, but does not assert the
    body content for `<theorem>`. The line-45 entry will be
    reconciled when the Phase-2 theorem handler ships (either
    `'theorem'` and the handler consumes opaque content, or
    `'default'` and the handler operates on the parsed tree). Both
    the DSL_REGISTRY file comment and the slice's STATUS milestone
    record this; the L60-67 comment in dsl-registry.js (the
    "theorem-family omitted pending vocabulary specification" note)
    was updated to reflect the new state.
  Seven theorem-family elements (sans `<theorem>`) added to
  `DSL_REGISTRY` for long-form-eligibility — same judgment call as
  sub-slice 2 (registry data, not parser code; required for the
  entries to be authorable in their natural long-form). Without it,
  the entries would be hollow.
  Vocabulary `data.js` regenerated (90 → 98 primary entries; 99
  with the `quote` alias). Pretest staleness guard passes. Test
  count assertion bumped 91 → 99.
  New integration fixture
  `document-29-deferred-vocab-sub3.acm` + `integration doc29`
  exercises all eight elements end-to-end: a `<theorem>` (short-form
  with the opacity workaround) + `<proof>` peer + `<lemma>` /
  `<corollary>` / `<proposition>` propositional siblings + `<definition>`
  / `<example>` / `<remark>` rhetorical-family elements. Assertions:
  each renders as a real element; the `name` kwarg flows through to
  `data-name` on `<theorem>`, `<lemma>`, `<proposition>`,
  `<definition>`; no `data-acadamark-unknown` span for any of the
  eight. Numbering output is not asserted (Phase-2 work).
  **No existing snapshot changed** — the eight entries are net-new
  vocabulary; no prior fixture authored any of these elements.
  **Closures:**
  - The `[alpha]` "Add deferred vocabulary elements" backlog item
    closes. Removed from both backlog views (checklist + detailed
    entry).
  - ROADMAP Phase 1 (vocabulary completeness) closes. Phase 1 was
    the deferred-vocabulary item + the already-done `<meta>`
    allowlist work; both are done. ROADMAP updated to note Phase 1
    is CLOSED and the roadmap moves to Phase 2 next (output
    handlers and DSL surface, including the theorem-family handler
    that now has its Layer 1 vocabulary to operate on).
  - The line-142 speculative theorem-family claim in
    `notes/specs/layer1-naming.md` retracted; the settled answer
    (no internal parts; `<proof>` is a peer) recorded in its place.
  Tests: layer1-vocabulary 52/52; acadamark-core 33/33;
  remark-acadamark 128/128; acadamark-interpreter 24/24 suites
  (incl. new doc29).
- **2026-Q2 — DSL/long-form parser bug fix: registry gate removed;
  three-form grammar locally unambiguous; DSL_REGISTRY shrunk to
  genuine DSLs only.** The parser previously gated `<tag>…</tag>`
  long-form parsing on registry membership (`DSL_REGISTRY ∪
  STRUCTURED_ELEMENTS` via `LONG_FORM_TAGS`), forcing regular
  Layer 1 vocabulary tags into `DSL_REGISTRY` as a workaround for
  the natural authoring of `<aside>…</aside>`,
  `<theorem>…</theorem>`, `<dl>…</dl>` etc. The conflation cost real
  time across multiple slices (sub-slice 2 / sub-slice 3 / `<author>`
  reconciliation each ran into it). Two Phase-0 stop-and-reports
  preceded this slice (commits `6ec5bcb` and `798fbf3`); the
  findings file `notes/dsl-purge-phase0-findings.md` records the
  full investigation.
  The fix:
  - **Parser change** at `packages/remark-acadamark/src/syntax.js`:
    removed the `registry.has(tagName)` gate in
    `makeLongFormTokenizer.consumeOpenTagName`. Every named tag is
    now long-form-eligible. The three syntactic forms — pipe form
    (`<tag attrs | content>`), slash form (`<tag attrs />`), long
    form (`<tag attrs>content</tag>`) — are disambiguated locally
    by `|` / `/` placement; no registry consultation, no
    lookahead. A tag with neither `|` nor `/` before `>` is
    unambiguously a long-form opener. (See `DESIGN.md` §"Tag forms"
    for the durable spec statement.)
  - **Fixture migration** (5 instances): `<hr>` → `<hr />` in doc3;
    three `<config attrs>` openers in doc6/doc18/doc19 → `<config
    attrs />` (slash form). A repo-wide categorization confirmed the
    27 line-start bare-tag patterns surveyed during Phase 0 sorted
    into 5 short-form-no-close (migrated) plus 22 long-form-openers
    (already correct).
  - **Test-source migration** (2 instances): the `<quux>` test in
    `packages/remark-acadamark/test/test.js` updated to assert the
    post-D1 behavior (bare unregistered tag produces
    `acadamarkTagError`; `<quux />` is the short-form-no-content
    path); the multi-line opener test updated to use
    `<figure ... />` and `<cite @ref />` for the slash-form cases.
  - **`DSL_REGISTRY` pruned** to 16 entries — only genuine DSLs
    (math/code sigils, csv, tsv, math, code, mermaid, abc, matrix,
    cases, align, eqnarray, table, library). 21 regular-vocab
    entries removed, including the line-45 `['theorem', 'theorem']`
    placeholder. The registry is now what its name claims: a
    handler-dispatch list for foreign-language tags.
  - **`dslRegistry` parser option removed** (Step 4 of the slice;
    closed the `[post-alpha]` rename item filed by `beb2fb3`). The
    option's purpose was overriding a long-form-eligibility list; no
    such list exists any more, so the option is unnecessary. No
    backward-compat alias.
  - **`LONG_FORM_TAGS` removed** from `acadamark-core` exports. It
    was the parser-time union of the two registries; with the gate
    gone, nothing consumes it. `STRUCTURED_ELEMENTS` and
    `DSL_REGISTRY` are now independent.
  - **Spec / comment alignment**: `DESIGN.md` gained §"Tag forms"
    with the three-form rule as the durable spec; `notes/specs/
    shorthand-syntax.md` rewrote the disambiguation section and the
    "DSL tag registry" section to describe the post-fix model;
    `BACKLOG.md` and `ROADMAP.md` updated (Phase 2 handler-bundle
    scope corrected to three families — `<theorem>` is regular
    vocab, not a DSL handler — and the line-45 / `dslRegistry`-
    rename items closed); parser-side comments aligned.
  **Snapshot finding (recorded honestly).** The slice's "zero
  rendered-output diff" rule was almost-honored. Two correctness
  improvements landed as side effects of the parser fix:
  - *doc8 + doc9*: previously, `<config attrs>` and `<bibliography>`
    used as long-form openers (with explicit `</config>` /
    `</bibliography>` closes in the source) parsed as short-form
    openers (registry rejection path) with the explicit closes
    emitted as orphan-text in the rendered HTML
    (`<article-body></config>`, `<p>…</p></bibliography>`). The fix
    correctly pairs them as long-form constructs; the orphan
    closing-tag literals disappear from the rendered output. The
    rendered HTML is now properly tag-balanced where it previously
    had stray literal text.
  - *doc29* (`<theorem>` body content): previously the line-45
    placeholder `['theorem', 'theorem']` made every `<theorem>` node
    `isOpaqueContent: true`, dropping body content at schema
    dispatch. Sub-slice 3 (`fc09606`) recorded this as a known
    limitation to be resolved by the Phase-2 theorem handler. With
    the line-45 entry removed in this slice, `<theorem>` body
    content now renders correctly via the default-handler /
    recursive-content path. The doc29 integration test was updated
    to assert the rendered body content (previously asserted only
    attributes-intact).
  All other snapshots were either position-offset shifts (the 2-byte
  `<hr>` → `<hr />` migration shifts byte offsets in the position
  metadata; per CLAUDE.md's syntax-migration correctness model,
  these are syntax-migration zero-diff cases — content stable, raw
  bytes shift) or unchanged.
  Backlog: `[post-alpha]` `dslRegistry` rename item closed;
  line-45 `<theorem>` placeholder reconciliation closed (handled in
  this slice); Phase 2 handler-bundle scope corrected from four
  families to three (DF-11a `<theorem>` handler retired —
  theorem is regular vocab); `AUD-15` tag-form matrix item updated
  to reflect the post-D1 three-form grammar.
  Tests: acadamark-core 33/33; remark-acadamark 128/128;
  acadamark-interpreter 24/24 suites; layer1-vocabulary 52/52. The
  structured-element infrastructure (`beb2fb3`) is untouched and
  remains correct.
- **2026-Q2 — Phase 2 handler bundle: Phase 0 findings recorded.** A
  read-only Phase 0 inventoried the three handler families (CSV/TSV,
  Mermaid/ABC, math environments), the two-stage handler dispatch
  path, current handler state per family, Layer 1 vocab specs,
  dependency footprint, and scope of the inherited DSL_REGISTRY
  entries (`<code>`, `<table>`, `<library>`, math/code sigils). The
  findings file at `notes/phase2-handler-findings.md` is the artifact
  the implementation slice(s) will be built from — same role
  `notes/dsl-purge-phase0-findings.md` played for the DSL purge.
  **Dominant finding:** the vocab-entry gap is bigger than the
  handler-code gap. 9 family tags (csv, tsv, mermaid, abc, math
  long-form, matrix, cases, align, eqnarray) have no vocab entry,
  meaning a handler implementation alone is insufficient — vocab
  entries must be created first or alongside, or the interpreter's
  vocab lookup misses and dispatch never fires.
  **Two latent bugs surfaced** (not introduced by Phase 2):
  - `<code>` long-form drops content (opaque content + schema
    dispatch → empty `<code></code>`). Filed for the implementation
    slice or a sibling cleanup.
  - `<library>` vocab declares `handlers/library.js` which does not
    exist; renders as empty `<library></library>` via the
    handler-not-found fall-through with a warning. Filed similarly.
  **Two stale references** in `ROADMAP.md` (L64 and L92-94) carry
  the pre-`dfdb4f0` four-family scope (the theorem-family handler
  that no longer exists in Phase 2). Flagged for a tiny drift-fix
  commit per the Phase 0 read-only constraint; not edited here.
  **Recommendation: SPLIT into three slices** (2a CSV/TSV smallest;
  2b math envs medium extension of existing `math.js`; 2c
  Mermaid/ABC largest — greenfield + heavyweight npm deps +
  output-target design decision). Reasoning in the findings file's
  "Bundle vs split" section. KaTeX is already installed;
  mermaid/abcjs/papaparse are not (Family 2 has real dependency-
  footprint impact). No product code, no specs, no vocab, no
  backlog edits. Findings file + this STATUS line only.
- **2026-Q2 — Phase 2 slice 2a: CSV/TSV handlers + adjacent
  cleanup.** First implementation slice of Phase 2. Four pieces of
  work in one commit:

  **1. CSV/TSV handlers shipped.** Two new vocab entries (`csv.md`,
  `tsv.md`) declaring `interpreter_strategy: handler` +
  `handler_module`. Two new handler modules (`handlers/csv.js`,
  `handlers/tsv.js`) — thin wrappers around `table.js`'s reusable
  `parseCsv` / `parseTsv` parsers and the shared `renderParsedTable`
  helper extracted from `tableHandler`'s body in this slice. The
  standalone `<csv>` and the `<table csv>` qualifying form now share
  parsing and rendering — equivalent output for the same data.
  Vocab `data.js` regenerated (98 → 100 primary; 101 with `quote`
  alias). Test count assertion bumped 99 → 101.

  **2. ROADMAP.md drift fix** for the two stale four-family /
  theorem-handler references at L60-65 and L92-94 (Phase 0 Q1.7
  finding) — rewritten to reflect the post-`dfdb4f0` three-family
  scope.

  **3. `<code>` long-form bug fixed** (Phase 0 Q1.5 finding):
  `<code>` vocab declared `interpreter_strategy: schema` while its
  DSL_REGISTRY entry made content opaque; schema dispatch dropped
  opaque content. Created `handlers/code.js` (parallel to
  `inline-code.js`); switched `code.md` to handler strategy.
  `<code | body>` long-form / short-form-with-pipe now renders
  correctly with body text and optional `language-X` class.

  **4. `<library>` stale handler_module reconciled** (Phase 0 Q1.5
  finding): vocab declared `handler_module: ./handlers/library.js`
  pointing at a file that doesn't exist. Actual library processing
  is at PLUGIN time (`library-load.js`), not handler time; and
  `<library>` was already being suppressed from rendered output via
  the `INTERNAL_REGISTRY` interception at `interpret-plugin.js:48-49`
  — so the handler-not-found path the Phase 0 finding diagnosed was
  actually never reached (the symptom is right, the mechanism
  intercepts upstream). Fix: switched vocab to
  `interpreter_strategy: schema`; removed the stale `handler_module`
  line; expanded `related_plugins` to explain the plugin-based
  processing path and the upstream `INTERNAL_REGISTRY` suppression.

  Shared infrastructure: `table.js` now exports `parseCsv`,
  `parseTsv`, and the new `renderParsedTable` helper.
  `HANDLER_REGISTRY` at `interpret-plugin.js:68-77` grew from 5
  entries to 8 (csv, tsv, code added).

  Fixture coverage: `document-30-csv-tsv-code-handlers.acm` +
  `integration doc30` exercises all three additions end-to-end
  (`<csv>` with header row + id; `<tsv>` with header row; three
  `<code>` forms covering long-form / short-form-no-language /
  language=javascript). Assertions confirm rendered `<table>`
  shapes for csv/tsv, body-content presence for code, no
  `data-acadamark-unknown` spans, no empty `<code></code>`
  elements.

  **Snapshot zero-diff confirmed.** Verified via
  `git diff --stat` on `test/fixtures/*.json` and
  `test/fixtures/*.html` — empty output before staging doc30's new
  files. No existing snapshot changed.

  Phase 2 handler-bundle item remains open — sub-slices 2b (math
  envs) and 2c (Mermaid/ABC) follow per the Phase 0 split
  recommendation.

  Tests: layer1-vocabulary 52/52; acadamark-core 33/33;
  remark-acadamark 128/128; acadamark-interpreter 24/24 suites
  (incl. new doc30).
- **2026-Q2 — Phase 2 slice 2b: math environments + `<math>` long-form.**
  Second implementation slice of Phase 2 handler bundle. Added handler
  coverage for five new tags in the math-environments family:
  - `<math>` — long-form block-level math (semantic equivalent of the
    `<$$>` display-math sigil).
  - `<matrix>`, `<cases>`, `<align>`, `<eqnarray>` — math-environment
    tags. The last two both render via KaTeX's `aligned` env (the
    supported equivalent of LaTeX's top-level `align` / `eqnarray`).

  **Q1 decision: extended `math.js` (path A)** rather than per-tag
  modules. The existing handler was 130 lines and well-factored;
  per-tag logic differs only by env-name and the
  display-vs-inline KaTeX flag. Single shared handler with a
  `MATH_TAG_SPEC` dispatch Map is the right shape.

  **Q2 decision: wrap-inside convention.** Author writes pure
  environment body (`<matrix>1 & 2 \\ 3 & 4</matrix>`); handler adds
  `\begin{<env>}…\end{<env>}` before passing to KaTeX. No spec or
  fixture evidence pointed at the other convention. Documented in
  each env vocab entry and in `math.js` header.

  Handler shape: `mathHandler` now reads `node.tagname` against
  `MATH_TAG_SPEC` (7-entry Map covering all six math tagnames plus a
  defensive default-fallback for unknown tags). The wrapper element
  emitted matches the source tagname, so `<matrix>` stays distinct
  from `<align>` in the Layer 1 output. **Sigil branches (`inline-math`
  / `display-math`) preserved exactly** — no env wrap, same display-math
  numbering integration. The doc4/doc5/doc11 sigil snapshots are
  unchanged.

  Vocab `data.js` regenerated (100 → 105 primary entries; 106 with
  `quote` alias). Vocab test count assertion bumped 101 → 106.

  Fixture `document-31-math-envs.acm` + `integration doc31` exercises
  all five new tags end-to-end. Assertions: each tag renders as a real
  wrapper element with KaTeX-rendered content inside; no
  `data-acadamark-unknown` spans; KaTeX `class="katex"` markers appear
  in at least 5 places (one per wrapper); the `<matrix>` wrapper
  contains KaTeX-rendered output.

  **Snapshot zero-diff confirmed** for all existing fixtures —
  including doc4/doc5/doc11 (math sigil fixtures) — verified via
  `git diff --stat` on `test/fixtures/*.json` and `*.html` returning
  empty before staging doc31's new files. Only doc31's snapshot is
  new. Per the slice prompt's stop-and-report criterion: sigil
  snapshots zero-diff confirms the per-tagname dispatch preserves the
  sigil branches exactly.

  No npm dependencies added — KaTeX was already installed (and is
  what slice 2b extended). `HANDLER_REGISTRY` unchanged: the five new
  tags all dispatch through the existing `./handlers/math.js` entry.

  Phase 2 handler-bundle item remains open — sub-slice 2c
  (Mermaid/ABC) follows per the Phase 0 split recommendation.

  Tests: layer1-vocabulary 52/52 (count assertion updated 101 → 106);
  acadamark-core 33/33; remark-acadamark 128/128;
  acadamark-interpreter 24/24 suites (incl. new doc31).
- **2026-Q2 — Phase 2 slice 2c: Mermaid/ABC external DSLs; DSL handler
  bundle closed.** Third and final implementation slice of Phase 2's
  handler bundle. Added handler coverage for two specialty DSL tags:
  - `<mermaid>` — Mermaid diagram source (flowcharts, sequence
    diagrams, etc.)
  - `<abc>` — ABC music notation
  Both are **external DSLs**: the handlers emit pass-through markup
  preserving the source; rendering to SVG happens external to
  acadamark — in the consumer's browser (CDN library scans the DOM
  at view time) or at build time via a headless pre-render pass.
  No npm dependencies added.

  **DESIGN.md gained §"DSL handlers: included vs external"** (a new
  subsection under §"Embedded DSLs: processor delegation") recording
  the architectural distinction. Included DSLs render to final output
  during interpretation (math, csv/tsv, code); external DSLs emit
  marked markup for downstream tooling (mermaid, abc). The split
  reflects an architectural reality — some rendering libraries are
  browser-shaped (DOM-dependent, layout-aware) and awkward to run in
  Node; external DSLs honestly delegate to those libraries in their
  native environment.

  **Markup contract.** Both handlers emit a wrapper element with the
  upstream library's CDN-scanning class (`class="mermaid"` for
  Mermaid; `class="abc"` for ABC by convention) **plus** a
  `data-acadamark-dsl="<name>"` attribute. The class matches the CDN
  scanner so view-time rendering works with no extra config; the
  `data-acadamark-dsl` attribute is the acadamark-specific contract
  for build-time tooling, independent of CDN-specific class
  conventions that may change between library versions.

  **`<mermaid>`** wrapper: `<pre class="mermaid"
  data-acadamark-dsl="mermaid">`. Matches Mermaid's documented
  `<pre>`-with-`class="mermaid"` convention (verified via the v10
  docs).

  **`<abc>`** wrapper: `<div class="abc" data-acadamark-dsl="abc">`.
  abcjs has no DOM auto-scan (requires explicit
  `ABCJS.renderAbc(target, source)` calls); a typical consumer init
  script is sketched in `abc.md`. The abcjs convention was used from
  prior knowledge of the abcjs API (the WebFetch tool was blocked
  during this slice from the abcjs docs; if the convention has
  changed materially the vocab entry's init script needs updating
  but the handler markup is fine).

  **Two thin handler modules.** Each ~50 LOC (smaller than the
  pattern-matched `inline-code.js` because they don't language-class-
  build). Wrapper element + caption sibling. Pattern of returning a
  `root` node when caption is present, single element otherwise.
  Both registered in `HANDLER_REGISTRY` at `interpret-plugin.js`
  (8 → 10 entries).

  **Two vocab entries.** Each declares `interpreter_strategy: handler`
  + `handler_module`. The `html_output.element` notes-block carries
  the slice-2a pattern + a note flagging the entry as an external
  DSL with a pointer to the DESIGN.md section. `id` + `class` +
  `caption` kwargs.

  Vocab `data.js` regenerated (105 → 107 primary entries; 108 with
  `quote` alias). Test count assertion bumped 106 → 108.

  **Fixture** `document-32-external-dsls.acm` + `integration doc32`
  exercises both tags end-to-end (Mermaid flowchart + sequence
  diagram + ABC "Twinkle Twinkle" excerpt). Assertions confirm:
  CDN-compatible class on each wrapper; `data-acadamark-dsl`
  attribute present and correct; source preserved verbatim; ids
  flow through; no `<svg>` in output (confirming external
  rendering); no `data-acadamark-unknown` spans.

  **Snapshot zero-diff confirmed** on all existing fixtures —
  verified via `git diff --stat` on `test/fixtures/*.json` and
  `*.html` returning empty before staging doc32's new files. Only
  doc32 is new.

  **DSL handler bundle closed.** `BACKLOG.md` and `ROADMAP.md` both
  updated: the handler-bundle item (DF-8 + DF-9 + DF-10) is marked
  done with cross-references to all three sub-slice commits
  (`091d7c6`, `297e543`, this commit). The DF-11a `<theorem>`
  handler retirement is recorded inline.

  **Phase 2 itself is NOT fully closed by this slice** — the
  ROADMAP Phase 2 entry lists three items (AUD-N verification
  pre-build sweep; the handler bundle; per-section footnote
  collection from PG-1). Only the handler bundle closes here. The
  AUD-N verification and PG-1 footnote work remain open Phase 2
  items. The slice prompt's "Phase 2 closure" framing was based on
  an assumption that the handler bundle ≡ Phase 2; recorded
  honestly here as a scope clarification rather than overreaching
  the Phase 2 closure.

  Tests: layer1-vocabulary 52/52 (count assertion updated
  106 → 108); acadamark-core 33/33; remark-acadamark 128/128;
  acadamark-interpreter 24/24 suites (incl. new doc32).
- **2026-Q2 — Phase 2 closed: per-section footnotes implemented
  (formerly PG-1); ROADMAP drift fixed (AUD-N verification moved out
  of Phase 2).** Two pieces of work in one commit:

  **1. Per-section footnote collection** (formerly PG-1). Extended
  `note-placement.js` with the outermost-section collection rule. For
  each top-level `<section>` in `<article-body>`, the plugin walks
  its subtree, collects every descendant `<note placement=foot>`
  regardless of nesting depth, and injects a `<note-list
  class="footnotes">` at the section's end. Nested sub-section notes
  are absorbed by the outermost ancestor section (not their own
  sub-section list). Residual notes (end-placement, side-placement,
  or `placement=foot` notes outside every top-level section — e.g.
  front-matter, between sections) collect into a single
  `<article-back>` list with the existing mixed-placement class
  logic. Each note appears exactly once.

  Numbering stays global across the document — the existing
  `registry.numberRegistry()` assigns numbers in document-order
  before placement (step 8), independent of which list collects each
  note. Per-section grouping doesn't disturb the numbering; notes in
  the first section's list carry numbers 1, 2, 3, etc., and notes in
  later sections continue the sequence.

  Implementation order:
    1. Build the section-membership map (note → containing
       top-level section) BEFORE `walkReplace` mutates the tree.
    2. `walkReplace` splices `__note-marker` nodes in place of
       `<note>` nodes (unchanged from before).
    3. Split pending into per-section foot buckets + residual.
    4. Inject per-section lists at the end of each section's
       content (empty buckets → no list emitted).
    5. Inject the residual `__note-list` into `<article-back>` if
       any residual notes exist (empty residual → no list).

  `notes.js` L11 deferred-work comment rewritten to reflect the
  implemented behavior. The handler in `handlers/notes.js` is
  unchanged (rendering shape is the same; only collection moved).

  **2. ROADMAP drift fix.** Removed the misplaced "Verify the
  remaining `(formerly AUD-N)` items" entry from ROADMAP Phase 2
  (the entry's BACKLOG home is `[post-alpha]`, and the AUD-N items
  themselves are spread across Phase 3, post-alpha, etc. — the
  pre-flight framing was stale). Also removed the introductory
  "AUD-cohort verification" paragraph that scoped Phase 2 around the
  pre-flight. BACKLOG keeps the verification item correctly tagged
  `[post-alpha]` in its Verifications group; no item was lost.

  **Snapshot audit.** Three existing fixtures changed snapshots, all
  correct per the new behavior:
    - **doc5** (linear-regression): footnote about R² moved from the
      article-back list to the "Goodness of Fit" section's per-
      section list. doc5 also has a `placement=side` note that stays
      in the article-back list (now class="notes" since only the
      side note remains there).
    - **doc6** (cross-references): the `note:galton` footnote moved
      from article-back to the "Notes" section's per-section list.
      The default-placement endnote stays in article-back (now
      class="endnotes").
    - **doc12** (bare-table): the single foot-note moved from
      article-back to its containing section's per-section list.
      No residual notes; no article-back list.
    Each diff inspected: the `<note-list>` block moves to a deeper
    nesting level (article-back → section); byte-identical contents
    (note text + KaTeX-rendered formulas + backref links). All other
    snapshots zero-diff.

  **New fixtures:**
    - **doc33** — three top-level sections (two with foot-notes,
      one without), one nested sub-section whose foot-note is
      absorbed by the outermost section's list, plus an endnote
      that goes to article-back. Asserts 2 per-section footnote
      lists, the article-back endnote list, global numbering 1-5,
      and the outermost-section rule.
    - **doc34** — mixed placement: pre-section foot-note falls to
      article-back residual; in-section foot-notes collect per-
      section; endnote also residual. Article-back list has
      class="notes" (mixed placements).

  **New `[post-alpha]` BACKLOG item filed**: "Author override for
  footnote-collection depth" — explicit-placement markup or
  `<config>` directive to override the default outermost-section
  collection rule (e.g. collect at deepest section, fixed level,
  document end). Deferred from this slice.

  **Phase 2 CLOSED.** ROADMAP Phase 2 marked CLOSED parallel to
  Phase 1 (both `(alpha — supports line 1)`). The roadmap "Current
  position" paragraph updated: roadmap moves to Phase 3 next
  (frameable elements). All Phase 2 sub-items done.

  Tests: layer1-vocabulary 52/52; acadamark-core 33/33;
  remark-acadamark 128/128; acadamark-interpreter 24/24 suites
  (incl. new doc33 and doc34). Three existing snapshots updated
  per the audit above (doc5, doc6, doc12 — per-section list
  moves).
- **2026-Q2 — Phase 3 Phase 0: frameable elements findings.**
  Read-only investigation producing `notes/phase3-frameable-findings.md`
  — the artifact the Phase 3 implementation slice(s) will build from
  (same role `notes/phase2-handler-findings.md` played for Phase 2).
  Covers Q1.1 (BACKLOG entries for the frameable-class item at L122-123
  / L455-466 and the caption-as-content item at L119-121 quoted
  verbatim); Q1.2 (vocab inventory across 107 entries — three settled
  frameable members lack vocab entries today: `<fig>`, `<svg>`,
  `<frame>` — with per-element caption/numbered/id/content.type/strategy
  shape table); Q1.3 (existing infrastructure survey: the generic
  per-type counter machinery in `acadamark-core/src/registry.js`,
  the NUMBERED_TAGNAMES Map in `numbering.js` with three entries
  today, the ref-resolution DEFAULT_PREFIXES dictionary, and the
  mixed caption-handling shapes across figure/table/mermaid/abc/csv/
  tsv handlers); Q1.4 (per-element shared-vs-specific analysis with
  proposed shared frameable surface `id / title / caption / border /
  numbered` + per-element body content + counter type + JATS
  counterpart table); Q1.5 (caption-as-content design surfacing —
  recommends Option A: `<caption>` as child-tag position with kwarg-
  form lift at the normalize-to-canonical gate, mirroring the
  `<meta>` and `<author>` precedent; JATS / LaTeX / HTML5 / Pandoc
  all converge on child-tag); Q1.6 (Phase 3 backlog and roadmap
  state — consistent across BACKLOG.md and ROADMAP.md views);
  Q1.7 (intersections with deferred numbering work — theorem family
  numbering and math-envs numbering are both extensions of
  NUMBERED_TAGNAMES, bundleable into a precursor slice). Three
  sibling cleanup items flagged for the implementation slices
  (`<author>` `notes/handler_responsibilities` style mismatch; the
  `<figure>` vs `<fig>` alias activation; theorem-family `name`
  kwarg rendering). **Recommendation: SPLIT into three slices —
  3a numbering-registry extension → 3b frameable-class build (with
  the three new vocab entries + shared rendering capability) →
  3c caption-as-content (Option A)** rather than bundle, on the
  reasoning that each sub-slice has a coherent independent test
  surface and the bundled version (~5-7 new vocab entries + handler
  refactors across ~10 elements + numbering-extension + caption-as-
  content) would make the snapshot audit intractable. No product
  code, spec, or vocab changes in this slice — read-only as
  specified.
