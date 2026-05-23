# acadamark — session handoff

**Written:** 2026-05-22, at the end of the pipeline-refactor session.
**Updated:** 2026-05-22, after PG-13, RC-12, F2, F1, and G1 (inline TeX shortcuts) landed.
**Purpose:** Orient the next session. The pipeline refactor (R1–R4) and the first
Layer 2 feature (G1) are complete. This document records where things stand,
the working method, and the forward backlog.

---

## 1. Where things stand

The five-slice pipeline refactor is done, verified, committed, and pushed.
Additionally, four more slices have landed since the R4 handoff.

| Slice | What it did | Commit |
|-------|-------------|--------|
| R1 | Unified numbering into one type-agnostic stage; `assign()` record-only, `numberRegistry()` numbers all types | (earlier session) |
| R2 | New `src/lib/discover.js` — one read-only document-order discovery walk; `numbering.js` migrated onto it; AUD-09 sections fixed | (earlier in this arc) |
| R3a | Notes re-architecture — notes discovered in place; placement deferred to a new late `acadamarkNotePlacement` plugin; `pendingNotes`/`fillNotes` extract-and-reinstall machinery removed | `bcff550` |
| R3b | New `src/lib/walk-replace.js` — the replacing counterpart to `discover()`; the three hand-rolled `walkAndReplace`/`walkAndSplice` copies collapsed into it | `f8743c5` |
| R4 | `libraryLoad` reclassified as an explicit index-build (`buildCitationIndex`); data strand is now index-then-resolve | `7fe5303` |

**Since R4:** Layer 0, Layer 1, and the first Layer 2 item (G1) are now complete.

| Slice | What it did | Commit |
|-------|-------------|--------|
| PG-13 verify | Confirmed markdown pass-through escapes work in named-tag content (test RC-14) | `411c6b0` |
| RC-12 repair | Fixed a pre-existing fixture-typo failure in `test-recursive.js` that had been aborting the parser test runner before later tests ran | `fb3479f` |
| F2 | Doc-staleness sweep: `interpreter.md`, `pipeline.md`, `BUILD.md`, `interpreter-design.md`, `hover-previews-deferred.md` all current | `f00c877` |
| F1 | `@`/`#` sigil semantics: `#` always assigns, `@` always refers; `<ref @key>` and `<cite @key>` canonical; ~33 fixture occurrences migrated | `c86da33` |
| G1 Phase 0 | Read-only investigation; found the two-surface requirement the spec had missed; findings in `notes/G1-phase0-findings.md` | `5548caf` |
| G1a | Inline TeX shortcuts — grammar surface: `SuperscriptShortcut`/`SubscriptShortcut`/`BraceContentItem` Peggy rules; `^{}`/`\^` escape extension; shortcuts work inside `<...>` content | `b6304a3` |
| G1b | Inline TeX shortcuts — top-level prose surface: `tokenizeShortcutTag` micromark tokenizer (`syntax.js` + `from-markdown.js`); shortcuts now work in prose outside any tag; completes G1 (DF-1 + PG-12) | `99aaa0b` |

**G1 two-surface design (on record for future parser work):** The Peggy grammar
only runs on `<...>` constructs; top-level prose requires a micromark tokenizer.
The G1 Phase 0 investigation found this; the original spec had missed it. The
lesson: before any parser slice, verify whether the feature needs a grammar rule,
a micromark tokenizer, or both.

**G1 slice-sizing note:** G1 overflowed one GHC output turn and was split mid-arc
into G1a + G1b along the two-surfaces seam. A slice that will touch many files or
produce a lot of output should be split *before* running, not discovered at the
limit. The natural split is usually a real architectural boundary.

**G1 correctness model:** G1 is an **output-adding slice** — the fixture
snapshots for `document-10-shortcuts.acm` are new (expected, reviewed), and the
existing snapshots were unchanged. See the correctness-models note in the working
method section below.

**One F1 nuance to have on record:** The Phase 0 prediction that HAST snapshots
would pass without regeneration was incomplete — the snapshots store source-position
metadata (column/offset), which shifts by one per `@` character added. `document-8-expected.json`
was regenerated; HTML content was verified unchanged. The correct correctness
model for a syntax-migration slice is “HTML content stable,” not “snapshot
byte-stable.” This was not an output regression.

**Backlog detail** is in:
- `notes/specified-not-implemented.md` — full inventory; DF-1 and PG-12 adopted (G1); DF-7 adopted (F1).
- `notes/acadamark-backlog-roadmap.md` — dependency-ordered roadmap; Layer 0, Layer 1, and G1 are done;
  the next items are OQ-1/OQ-2 decisions, then the Layer 3 free leaves.

---

## 2. Key project facts (for a fresh session with no context)

- **Project:** acadamark — structured academic-publishing system. HTML+CSS+JS
  substrate, a custom shorthand authoring syntax, a unified/remark/rehype
  pipeline. Two-layer model: Layer 1 (semantic HTML), Layer 2 (authoring
  shorthand).
- **Repo root:** `/home/balter/academark/`
- **Interpreter:** `packages/acadamark-interpreter/src/`
- **Parser:** `packages/remark-acadamark/src/`
- **Vocabulary:** `packages/layer1-vocabulary/elements/`
- **Run tests:** Interpreter: `cd packages/acadamark-interpreter && node test/run.js`
  (23 suites). Parser: run all five files in `packages/remark-acadamark/test/`
  separately (`test-grammar.js`, `test.js`, `test-recursive.js`, etc.) — the
  parser suite has no top-level runner. **Both suites must be green before a
  slice is declared done.** Render fixtures: `node test/render-fixtures.js` in
  `packages/acadamark-interpreter`, then `git diff test/fixtures/` — **empty
  diff is the correctness proof** for output-neutral changes.
- **Tooling:** GitHub Copilot agent mode (referred to as "GHC"). Semantic
  indexing is enabled on the repo.

### The architecture, as it now stands

The interpreter pipeline is **shape → index → number → resolve**:

- **shape** — `remarkRecursiveContent`, `acadamarkArticleStructuring`,
  `acadamarkSectionNesting`. Transforms the tree into its structural form.
- **index** — `acadamarkConfigDiscovery`; the citation index-build
  (`buildCitationIndex`, R4); `acadamarkNotes` (register-only, R3a);
  `acadamarkNumbering` discovery walk (R2). Records everything into the
  registry / `file.data`.
- **number** — `acadamarkApplyNumbers`: `numberRegistry()` (one type-agnostic
  numbering pass) + `fillNumbering()`.
- **resolve** — `acadamarkRefResolution`, `acadamarkCiteResolution`,
  `acadamarkNotePlacement` (R3a — splices note markers, builds the note-list),
  `acadamarkBibliography`.

Two shared walk helpers:
- `src/lib/discover.js` — read-only document-order traversal, visitor-map
  interface.
- `src/lib/walk-replace.js` — the replacing counterpart (find-by-tagname,
  splice replacements).
Both descend acadamarkTag `.content` (guarded by `!isOpaqueContent`) and mdast
`.children`.

### Working patterns that held through the whole refactor — keep these

- **Phase 0 before every non-trivial slice.** A read-only investigation,
  scoped to a findings document that ends in a "recommended scope" verdict.
  Phase 0 can be **light** (a scope-check when the design is settled — G1's
  was) or **heavy** (when the design is open — R3's was). Every Phase 0 in
  this arc caught something the plan could not have known (R2's notes-extraction
  ordering problem; R3's a/b split; R4's Shape A/B fork; G1's two-surface
  requirement). Do not skip it.
- **Each slice ends green** — full suite passing — with the correct output
  proof for the slice type (see "Both correctness models" below). Deliberate
  output changes get explicit tests instead.
- **Commit each slice clean before starting the next.**
- **GHC prompts are separate artifacts** — a short implementation prompt per
  slice, pointing at the plan/findings already in the repo, with a hard "stop
  after this slice" instruction.
- **`git commit -F` with a message file, never `-m`** — `!` and backticks in
  slice messages trigger shell history expansion and mangle the message. The
  message file goes *outside* `.git/` (e.g. `/tmp/`), then deleted. This has
  caused problems in this project before; always use `-F`.
- **Pre-split big slices into turn-sized pieces.** G1 overflowed one GHC
  output turn and had to be split mid-arc into G1a + G1b. The lesson: a slice
  that will touch many files or produce a lot of output should be split *before*
  running, not discovered at the limit. The natural seam is usually a real
  architectural boundary (G1's was its two surfaces).

### Both correctness models — state both explicitly

Conflating these two models is a trap. Know which one applies before a slice starts.

**Output-neutral slices** (most refactor work): the proof is an **empty fixture
diff**. Run `node test/render-fixtures.js` in `packages/acadamark-interpreter`,
then `git diff test/fixtures/` — it must be empty. A changed snapshot is a red
flag and means something regressed. Snapshots must not change.

**Output-adding slices** (like G1, or any "implement a new feature"): the proof
is **"the diff shows exactly the intended new output and nothing else."** Snapshots
*will* change, and that is expected and reviewed. Regenerating an
intentionally-changed fixture's snapshot is correct here. Verify that existing
snapshots were unchanged; only the new fixture's snapshot is new.

### Key planning documents in the repo

- `notes/pipeline-refactor-plan.md` + `pipeline-refactor-plan-amendment.md` +
  `pipeline-refactor-plan-amendment-2.md` — the refactor plan and its two
  in-flight revisions (the R2/R3 reboundary; the R3a/R3b split).
- `notes/audit-findings.md` — the rolling AUD findings list (through AUD-19).
- `notes/audit-2026-Q2/` — the 2026-Q2 audit outputs, plus Phase 0 findings
  documents: `R2-phase0-findings.md`, `R3-phase0-findings.md`,
  `R4-phase0-findings.md`, `G1-phase0-findings.md`, `F1-phase0-findings.md`.
- `notes/audit-cleanup-stopping-point.md` — the audit-cleanup tracking doc.

---

### Decided design calls (settled — do not re-litigate)

These were live questions earlier in the arc and are now resolved.

- **`#` always assigns an id; `@` always refers to one (F1, commit `c86da33`).**
  `<ref @key>`, `<cite @key>`, `<cite [@a, @b]>` are the canonical attribute-
  position forms. The unbraced-inline `@` form is explicitly deferred (parked
  in the roadmap).
- **`^{`/`_{` braced form only; bare `^`/`_` are literal text, not errors (G1,
  commit `b6304a3`).** `snake_case`, `a^b`, URLs with `^`/`_` are untouched.
  Only `^{` and `_{` trigger a shortcut. `^{}` (empty braces) and `^{abc`
  (unmatched) are parse errors.

---

## 3. The backlog

Nothing below is urgent or a loose end. The refactor is complete; this is the
project's forward work, correctly filed. Roughly ordered: tidy-ups, then bugs,
then the recurring-cost item, then the substantive design work.

### 3.1 Tidy-ups — small, optional, anytime

- **Fold the refactor-plan amendments back into the plan.** Three documents
  (`pipeline-refactor-plan.md` + two amendments) now describe R2/R3/R4 across
  separate files. Consolidate into one coherent record and mark the plan
  "complete." Purely cosmetic; do it whenever it bugs you.
- **Stray working-tree files.** A file literally named `h`, and possibly a
  `*:Zone.Identifier` NTFS artifact, may still be in the working tree
  (untracked — they won't have been committed). Run a plain `git status`;
  `cat h` to confirm it's junk, then delete. Zone.Identifier files recur
  whenever a file is added on WSL; harmless, just sweep occasionally.

### 3.2 Bugs to file / fix

- **Double KaTeX CSS injection.** Documents containing math (e.g. document-6,
  document-9) carry the KaTeX stylesheet **twice** — a ~12 KB block and a
  ~370 KB block, as two separate `<style>` elements. Math-free documents
  (document-7, document-8) have it once. Effect: ~370 KB wasted per math
  document — doc-6/doc-9 render at ~710–737 KB vs ~336 KB for doc-7/doc-8. It
  does not affect appearance (the same CSS twice renders the same), but it is a
  real asset-injection bug, the same class as the old AUD-16 font-wiring gap.
  **Filed as AUD-19** in `notes/audit-findings.md`. Fix: guard against
  double-injection in the asset-injection path in `index.js`.
- **AUD-18 — `<data>` nodes remain in the tree (already filed).**
  `libraryLoad`/`buildCitationIndex` reads `<data>` and `<library>` nodes but
  never removes them; the compile step handles or silently ignores them. Low
  priority — an observation, not a malfunction. Filed during R4.

### 3.3 The `integration.test.js` mirror — a proven recurring cost (AUD-17)

`test/integration.test.js` hand-maintains a copy of the `index.js` plugin
pipeline. The two are **not linked** — every change to the real pipeline must
be duplicated by hand in the test, with nothing enforcing it. Filed as AUD-17
during R3a.

**Four consecutive slices — R3a, R3b, R4, G1b — each required a manual mirror
update.** This is no longer a theoretical hazard; it is a confirmed,
recurring tax that every future pipeline change pays. **Recommended fix:** have
the integration test import and use the real pipeline assembly from `index.js`
rather than rebuilding it by hand. This is a small, well-bounded cleanup and a
good early candidate — it removes a cost that any future pipeline change would
otherwise keep paying.

### 3.4 Shape B — the `indexInputs` consolidation (deferred from R4)

R4 reclassified `libraryLoad` as an index-build but stopped at "Shape A": the
citation index-build is now explicit, but `config-discovery` was left in its
current pipeline position and **not** merged into a combined `indexInputs`
step. The full consolidation — one `indexInputs` stage running both
`config-discovery` and the citation index-build, after the shape stage —
requires **moving `config-discovery` to after `article-structuring`**. That is
a pipeline reordering whose safety R4 Phase 0 explicitly did **not** verify.

**This is a real follow-on slice.** It needs its own Phase 0 scope-check: does
`config-discovery` depend on the pre-structuring tree shape (e.g. `<config>`
nodes being at root level before article-wrapping)? Do any tests depend on the
current order? Only after that check should the reordering and consolidation be
implemented. It completes the architecture's "index" stage as a single
combined step — worthwhile, but optional polish, not a correctness need.

### 3.5 AUD-09 remainder — code-block cross-references

R2 fixed AUD-09 for **sections** (`<ref #sec:...>` now resolves). The other
half — code blocks — was explicitly deferred. A code block is only an
`acadamarkTag` reachable by the discovery walk's `.content` descent when it is
written in the shorthand-wrapped form with a colon-id; a plain fenced code
block is a native mdast `code` node with no such id. Registering code blocks
for cross-reference needs a small investigation of that representation
question first. Filed in the AUD-09 entry of `audit-findings.md`.

### 3.6 Theme / visual design slice (substantive — and the fun one)

Three related items, all surfaced reviewing the rendered documents at the end
of this session. They belong together as **one post-refactor design slice** —
a slice that *deliberately* changes rendered output, so it must NOT be bundled
with anything relying on the empty-fixture-diff proof, and it needs visual
verification across all 9 fixture documents.

1. **Cross-document inconsistency is fixture authoring, not CSS.** The `:root`
   design tokens (fonts, colors, spacing) are byte-identical across all
   rendered documents — the theme is *not* drifting. What differs is which
   structural regions each demo document has: some fixtures have
   `<article-front>` / `<article-title>` (a title block), others dive straight
   into body content; `<article-back>` is present in some, absent in others.
   Two documents that differ this way *look* like different designs even with
   identical CSS. If the demo set should feel like one family, the fix is in
   the `.acm` fixture sources — give them consistent front matter — not in the
   stylesheet.

2. **Modern typography: sans-serif body, serif/almost-serif headings.** The
   theme is all CSS variables; body and headings currently both use
   `--acm-font-sans` (Inter). The change: add a third token
   (`--acm-font-heading` / `--acm-font-serif`), point the heading rules
   (`h1`–`h6`, `article-title`) at it, subset and base64-bundle the new face
   the same way Inter is bundled (the slice-7 font pipeline already does this).
   Candidate heading faces: Source Serif 4 (safe, scholarly), Newsreader
   (in-between), Fraunces (the "almost-serif with character" option). Decide
   the pairing when scoping the slice.

3. **Citation hover/link affordance.** Citation markers currently give no
   visual signal that they are hoverable (preview) or clickable (jump to
   bibliography) — an invisible affordance. The fix is NOT web-link styling
   (blue/underline is noisy and unscholarly in running prose). The scholarly
   convention: a subtle colour shift at rest (between `--acm-text-primary` and
   `--acm-text-secondary`, *not* `--acm-link`), with the underline / background
   tint and `cursor: pointer` appearing on `:hover` — the hover state itself
   becomes the affordance, pairing with the existing hover-preview. A few CSS
   rules on the citation-marker class.

### 3.7 Older deferred items still standing

From the 2026-Q2 audit and earlier, still in `notes/audit-findings.md`,
unaffected by the refactor:

- **AUD-04** — no-pipe/no-content short form `<tag attrs>` misread as a
  long-form opener. Workaround: `<tag attrs | >`.
- **AUD-05** — `<csv>` / `<tsv>` shortcut tags registered in `dsl-registry.js`
  but not implemented.
- **AUD-06** — `remark-gfm` not installed; plain pipe-table syntax doesn't
  work. Workaround: `<table md | ...>`.
- **AUD-07** — `table.md` vocabulary entry shows a `<csv | ...>` example that
  relies on the unimplemented AUD-05 shortcut.
- **AUD-08** — self-closing `<tag />` broken for DSL-registry tags. Workaround:
  empty long-form `<tag>\n</tag>`.
- **AUD-13** — `<config>` silently accepts metadata kwargs that belong in
  `<meta>` — no warning, no visible output.
- **AUD-14** — citations / rich content inside `caption="..."` kwarg strings
  are not parsed (the cite tag becomes literal text). See DD-1/DD-2 in the
  design directions for the fix direction.
- **AUD-15** — no documented matrix of which tag forms (short, pipe, long-form,
  self-closing) work for which tags.
- **GAP-9** — `document-9-demo` has no integration test or snapshot, despite
  being the most complex fixture. Filed in `audit-findings.md`.

### 3.8 Deferred design conversations

- **FLAGGED-1** — reconcile markdown `##` vs the `<#>` sigil for sections;
  decide the canonical form.
- ~~**FLAGGED-2** — the cross-reference sigil redesign: `@` for reference, `#`
  for assignment, unifying `<cite>` / `<ref>`, enabling unbraced inline
  references.~~ **Implemented as F1 (commit `c86da33`).** Attribute-position
  only; unbraced-inline `@` form remains deferred.

---

## 4. Suggested next steps (not prescriptive — your call)

Layer 0, Layer 1, and G1 (first Layer 2 item) are done. Reasonable next moves:

1. **OQ-1 and OQ-2** — short design-note decisions that unblock G2 (render-mode
   lowering) and G3 (math/GFM idioms). Either order.
2. **`integration.test.js` mirror fix (3.3)** — small, well-bounded, retires
   a recurring tax (paid four times now: R3a, R3b, R4, G1b).
3. **Layer 3 leaves** — any time, by appetite; the `<ref>`-attributes slice
   (PG-3/4/5) and PG-10 are easy satisfying ones.
4. **Architecture tier** (JATS, multi-file, book) — when you know the direction.

See `notes/acadamark-backlog-roadmap.md` for the full dependency-ordered list.

---

*The pipeline refactor — R1 through R4 — is complete. G1 (inline TeX shortcuts,
DF-1 + PG-12) is also complete. The interpreter is shape → index → number →
resolve. Tests green, output as expected, everything committed and pushed. This
is a clean handoff: nothing dangling, only the backlog above.*
