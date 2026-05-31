# Pipeline refactor plan — amendment, 2026-05-22

This amendment revises slices R2 and R3 following R2's Phase 0 investigation
(`notes/audit-2026-Q2/R2-phase0-findings.md`). It supersedes the R2 and R3
descriptions in section 6 of `pipeline-refactor-plan.md`. The principle
(section 2) and target structure (section 3) are unchanged.

## What Phase 0 found

The cross-reference strand cannot be migrated as one unit in R2, because it is
cut in half by the notes strand.

The current `enscribeNotes` plugin (step 6 of the pipeline) does **placement
by extraction**: it splices `<note>` nodes out of the tree mid-pipeline and
stashes their content in a `pendingNotes` array. The content — including any
`<ref>` authored inside a note — is off the tree from step 6 until `fillNotes`
reinstalls it at step 8.

Consequently there is no single point where one discovery walk sees both all
numbered elements (which must be registered before `numberRegistry()` runs at
step 8) and all `<ref>` nodes in their final positions (refs inside notes are
not back in the tree until after step 8).

This is not a property of notes or of refs. It is an artifact of the notes
plugin mutating the tree out from under the pipeline. A `<ref>` inside a
`<note>` should be no different from a `<ref>` inside a caption — discovered in
place, in document order. The current code makes it different only because
notes are physically removed from the tree partway through.

## The corrected model

The target architecture: a note exists at its authored position in the tree.
Everything inside it — refs, citations, math — is discovered in place, exactly
like the contents of a caption or a quote. A note's **placement** (into a
footnote list, sidebar, or wherever its display mode dictates) is a rendering
concern, deferred to the end of the pipeline. Discovery operates on the whole
authored tree; placement operates on the output. The two are separate.

The current notes plugin does not implement this — it conflates discovery-time
tree structure with display-time placement by extracting notes early. R3 fixes
this.

## Revised R2 — Establish the discovery walk; migrate numbering; AUD-09 sections

**Scope:** new `src/lib/discover.js`; `numbering.js`; the section vocabulary
types. `ref-resolution.js` is **not** touched in R2.

- Write `src/lib/discover.js`: a shared, read-only, document-order traversal
  with a visitor-map interface (`Map<tagname, (node) => void>`). It descends
  into both enscribeTag `.content` arrays (guarded by `!node.isOpaqueContent`)
  and mdast `.children`. It does not write to the registry — visitors do.
- Rewrite `enscribeNumbering` to use `discover()`; delete `walkAndCollect`.
  Numbering registers `$$`/`figure`/`table` via visitors, exactly as before,
  in the same document order.
- Add section registration (AUD-09, sections only): the discovery walk visits
  `section`/`sub-section`/`sub-sub-section` and registers each with
  `numbered: false` — sections become findable by label, not numbered through
  the registry. Visible section numbering ("Section 2.3") is out of scope and
  belongs with the FLAGGED-2 cross-reference redesign.
- **AUD-09 code blocks: deferred.** Code blocks have a representation question
  (a code block is only an `enscribeTag` reachable by `.content` descent when
  written in the shorthand-wrapped form with a colon-id). That deserves its own
  small investigation. R2 handles AUD-09 for sections only; a note is filed for
  code blocks.
- `ref-resolution.js` keeps its existing `walkAndReplace`. Unchanged in R2.

**End state:** the discovery walk exists and numbering uses it. `<ref #sec:...>`
resolves. No rendered output changes (empty fixture diff is the proof). Tests
green.

**Why ref-resolution is not in R2:** its `walkAndReplace` is entangled with the
notes plugin's mid-pipeline extraction, not with refs as such. Migrating it
before the notes timing is fixed would mean working around the extraction
(stale parent-array positions, or in-place node mutation). R3 fixes the notes
timing first; ref migration then falls out cleanly.

## Revised R3 — Restore defer-placement for notes; then migrate notes + refs

**This is the real fix, chosen deliberately.** R3 is not "migrate two plugins."
It is: re-architect the notes plugin so it implements the corrected model —
discover notes in place, defer placement to the end of the pipeline — and only
then migrate notes and ref-resolution onto the shared discovery walk.

- Re-architect `enscribeNotes` so it no longer extracts `<note>` nodes
  mid-pipeline. Notes stay in the tree at their authored positions through
  discovery. Placement into the display structure (footnote list / sidebar /
  inline per display mode) is deferred to a late pipeline stage. This removes
  the `pendingNotes` extract-and-reinstall machinery — the corrected design is
  less machinery, not more.
- With notes no longer extracted, there is a clean point where the discovery
  walk sees the entire authored tree. Migrate `notes.js` and
  `ref-resolution.js` onto `discover()` from R2. Both become pure
  discover-then-resolve consumers.
- Migrate `cite-resolution.js` onto the discovery walk as well (its
  `walkAndReplace` is the same pattern). Delete all the hand-rolled
  `walkAndReplace` copies.
- Add a unit test for `<ref>` inside `<note>` content before landing — this is
  currently resolved but has no dedicated test; the re-architecture must not
  regress it.

**End state:** one discovery walk for the whole document. Notes implement
discover-in-place / place-at-the-end. The triplicated `walkAndReplace`
redundancy is gone.

## R4 — unchanged

Reclassify `libraryLoad` as index-build, per the original plan.

## Net effect on the plan

R2 is slightly smaller than originally scoped (ref-resolution deferred). R3 is
larger and more sharply defined: it owns the notes re-architecture, which is
the real fix the original plan did not name. The total work is about the same;
the slice boundary is cut along the actual seam — the notes plugin's placement
timing — rather than across it.
