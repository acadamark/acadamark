# Pipeline refactor plan — amendment 2, 2026-05-22

This is the second amendment to `pipeline-refactor-plan.md`. It revises slice
R3 following R3's Phase 0 investigation
(`notes/audit-2026-Q2/R3-phase0-findings.md`). It supersedes the "Revised R3"
section of `pipeline-refactor-plan-amendment.md`. The principle (section 2),
the target structure (section 3), and the R2 description (amendment 1) are
unchanged.

## What Phase 0 found

R3 as described in amendment 1 — "re-architect notes for deferred placement,
then migrate the three walkers onto `discover()`" — bundles two changes that
should be separate.

The walker migration depends on a design decision that the notes
re-architecture does not: how a shared replacement-walk helper relates to
`discover()` (a shared `walkAndReplace` helper, in-place node mutation, or
extending `discover()`'s interface). The notes re-architecture has no such open
question.

More importantly, Phase 0 confirmed that **once notes are no longer extracted,
`ref-resolution.js` and `cite-resolution.js` work correctly with their existing
`walkAndReplace` code, unmodified.** Their entanglement was with the notes
plugin's mid-pipeline extraction, not with refs or cites as such. Removing the
extraction removes the entanglement. Migrating those two walkers is therefore
pure code-quality cleanup — not a correctness requirement.

Bundling a code-quality cleanup that needs an unmade design decision into the
same slice as the highest-risk surgery in the refactor (the notes
re-architecture) is the R1 mistake. R3 is split.

## Revised R3 — split into R3a and R3b

### R3a — Notes re-architecture (the correctness slice)

Re-architect `acadamarkNotes` so notes are discovered in place and placement is
deferred to a late pipeline stage. This is the real fix; it is the necessary
slice.

- Revise `acadamarkNotes` to use `discover()` for **registration only**: visit
  `<note>` nodes, register each in the registry, record `{ node, entry }` in
  `acadamarkNotesPending`. Delete its `walkAndReplace` and `processNote`. The
  `<note>` node stays in the tree at its authored position. No marker is
  created at this stage; no content is copied.
- Add a new `acadamarkNotePlacement` plugin, running late — after
  `acadamarkCiteResolution`, before `acadamarkBibliography`. It splices each
  `<note>` out, puts a marker in its place, builds the `__note-list-item`
  nodes from the (now resolved) live note content, and injects the
  `__note-list` into `article-back`. This is the current `fillNotes` logic,
  moved to a late stage and reading live `<note>.content` instead of a shallow
  copy.
- Remove the `fillNotes` export from `notes.js` and its call from
  `acadamarkApplyNumbers` in `index.js`.
- `ref-resolution.js` and `cite-resolution.js` are **not** touched in R3a.
  Their existing `walkAndReplace` works correctly once notes stay in the tree.

**Why this works:** with notes in the tree through discovery and resolution, a
`<ref>` or `<cite>` inside a note is discovered and resolved in place, in
document order, exactly like one in a caption. The ordering problem R2 Phase 0
identified was caused entirely by the extraction; removing the extraction
removes it.

**Correctness proof:** the final rendered HTML is unchanged for every existing
fixture — `acadamarkNotePlacement` produces the same internal nodes in the same
positions as `fillNotes`, just later. The empty fixture-diff proof still holds.

**One intended behavior change, not visible in the fixture diff:** citations
inside notes are currently resolved after note content is reinstalled into
`article-back`, so inline citations always take earlier "first-cited" slots
than note-embedded citations regardless of authored order. After R3a,
note-embedded citations are resolved in true document order. This is a
correctness improvement. No existing fixture exercises it, so the fixture diff
stays empty — R3a must add an explicit test for it so the change is recorded
and protected.

### R3b — Shared replacement-walk helper (the cleanup slice)

After R3a lands clean: collapse the three near-identical `walkAndReplace`
copies (in `ref-resolution.js`, `cite-resolution.js`, and the new
`acadamarkNotePlacement`) into one shared helper, correctly guarded with
`!node.isOpaqueContent`.

- The design question — shared `walkAndReplace` helper vs. in-place node
  mutation vs. extending `discover()` — is decided in R3b, not before. Phase 0
  recommends the shared-helper approach (no change to `discover()`'s
  interface); R3b's own prompt finalizes it.
- No correctness change. Proof: unchanged test suite + empty fixture diff.

R3b is optional follow-on cleanup. It does not block R4.

## R4 — unchanged

Reclassify `libraryLoad` as index-build, per the original plan.

## Net effect on the plan

R3 becomes two slices. R3a is the real fix and carries all the risk and all the
new capability; it has a clean correctness proof. R3b is mechanical cleanup
behind R3a, with its own small design decision made deliberately rather than
under the pressure of the larger slice. The seam between them is exact: R3a
removes `fillNotes`; R3b removes the three `walkAndReplace` copies. They share
no entangled code path.
