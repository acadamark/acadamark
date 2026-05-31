# Audit cleanup — stopping point and resumption plan

Document updated at end of 2026-05-21 session. Audit cleanup is now five of six steps complete; this file describes the state, what's left, and the design conversations that are pending for the global review.

## Where we stopped

### Completed: audit cleanup Steps 1-3 (2026-05-14/15 session)

**Step 1 — Archive drifted notes.** Moved four documents to `archive/` with date-stamped names and archival headers:
- `notes/interpreter-design.md` → `archive/interpreter-design-2026-05.md`
- `notes/plugin-pipeline.md` → `archive/plugin-pipeline-2026-05.md`
- `notes/hover-previews-deferred.md` → `archive/hover-previews-deferred-2026-05.md`
- `notes/text-based-DSLs.md` → `archive/text-based-DSLs-2024-05.md`

**Step 2 — Fresh interpreter.md and pipeline.md.** Written from current code. `notes/interpreter.md` (938 lines) and `notes/pipeline.md` (715 lines) are the new authoritative architecture docs.

**Step 3 — STATUS.md rewrite.** Replaced from scratch (326 lines) as a current-state 2026-Q2 snapshot.

### Completed: audit cleanup Steps 5-6 (2026-05-21 session)

**Step 5 — DESIGN.md augmentation.** Added a new section "Design directions (discovered through implementation)" integrating DD-1 through DD-5 in condensed prose. Also fixed two stale clauses in the Layer 1 section ("in progress" / "implementation deferred" language) and corrected a malformed shorthand example (`<# Introduction #intro>` → `<# #intro | Introduction>`; attributes before pipe before content). `notes/design-directions.md` archived to `archive/design-directions-2026-05.md` (retains the fuller implementation-detail version and the DD-N numbering that audit-findings.md cross-references).

**Step 6 — README.md light edit.** Rewrote the stale "Status" section (system is implemented, not "in active design"). Corrected the taste example to works-today syntax: markdown `##` headings for sections, typed colon-id `#fig:elephant`, `<ref #fig:elephant>`. Reframed "Project goals" to note which goals are achieved. Added cross-references to STATUS.md, interpreter.md, pipeline.md.

### New design note filed

`at-sigil-reference-proposal.md` — proposes `@` for reference / `#` for assignment, with the `<cite>`/`<ref>` unification and unbraced-inline-reference payoff. Status: proposed, not scheduled. For the global review.

### Tests state

All test suites passing as of last run: 228 parser tests, 208 interpreter tests across 22 suites, 436 total. No code modified during audit cleanup — documentation only.

---

## What remains

### Step 4 — Surgical doc updates (mostly mechanical) — NOT YET DONE

The one remaining audit-cleanup step. Small targeted edits, mostly mechanical:

- `notes/recursive-content-spec.md` — the "Error recovery: blank-line termination" section describes future work as if implemented. Add "Status: deferred" qualifier.
- `notes/inline-tex-shortcuts-spec.md` — promote "Status: Not implemented" from near the bottom to the top.
- `BUILD.md` — pipeline diagram uses planning-era plugin names (`enscribeTagInterpret`, `enscribeCitations`, `enscribeCrossRefs`, `rehypeKatex`). Update to match the current pipeline; mark BUILD.md's status clearly.
- DRIFT-7, DRIFT-8, DRIFT-9: vocabulary entries (`cite.md`, `ref.md`, `note.md`) have `related_plugins` fields with wrong plugin names. Mechanical name fixes.
- Zone.Identifier ghost files (NTFS artifacts in `notes/`). Clean up if desired.

Probably 30-60 minutes. Single small Claude Code or Copilot session.

---

## Pending design conversations (for the global review)

These are not audit-cleanup steps. They are design questions surfaced during the audit and during the Step 5-6 work, parked for a focused review session.

### Pipeline architecture

interpreter.md and pipeline.md read as accreted rather than designed top-down — the "three phases" framing is retrospective. Position: continue with the emergent structure for fixing AUD findings and small deferrals; refactor before the client-side rebuild. Proposed working mode: generate visual representations (Mermaid flowcharts of plugin chain, dependencies, handler dispatch) so the structure can be seen without reading every line, then reduce to principles together.

### FLAGGED-1: Section syntax — markdown `##` vs `<#>` sigil

Document 9 uses markdown `## headings` for sections. The shorthand spec (and DESIGN.md's implicit-closing section) is built around the `<#>` sigil tag. Two forms for the identical operation, with no rule for which to use, violates the "explicit, consistent" principle. Decide which is canonical and reconcile DESIGN.md and `notes/shorthand-syntax.md` accordingly. The `<#>` form is the one that carries an id (needed for any section that will be cross-referenced), so the answer is probably not "drop `<#>`" — more likely "markdown headings are the convenience form, `<#>` is canonical / used when attributes are needed," but this needs deciding explicitly.

### FLAGGED-2: Cross-reference sigil redesign

Evaluate `@` for reference vs `#` for assignment. Full proposal in `at-sigil-reference-proposal.md`. Includes the `<cite>`/`<ref>` unification (both become `@key`) and the downstream unbraced-inline-reference affordance. This is a parser-grammar slice, not a tweak. The cross-reference system as a whole — `@`-vs-`#`, AUD-09 (section ids not registered), and the cite/ref unification — should be treated as one design unit.

---

## The AUD checklist (snapshot)

From `notes/audit-findings.md` as of session end. AUD-02 and AUD-03 are now also fully resolved by the completed cleanup steps.

### Cosmetic / CSS
- [ ] **AUD-01** — Equation numbers center-align instead of right-align.

### Parser bugs
- [ ] **AUD-04** — No-pipe/no-content short form misread as long-form opener. Workaround: `<tag attrs | >`.
- [ ] **AUD-08** — Self-closing `<tag />` broken for DSL-registry tags. Workaround: empty long-form `<tag>\n</tag>`.

### Parser / spec gaps
- [ ] **AUD-05** — `<csv>` and `<tsv>` shortcut tags registered but not implemented.
- [ ] **AUD-06** — `remark-gfm` not installed; plain pipe-table syntax doesn't work. Workaround: `<table md | ...>`.
- [ ] **AUD-09** — Section and code-block ids never registered; `<ref #sec:...>` always ref-errors. (See FLAGGED-2 — resolve with the cross-reference redesign.)

### Vocabulary / documentation gaps
- [ ] **AUD-07** — `table.md` shows `<csv | ...>` example relying on unimplemented AUD-05 shortcut.
- [ ] **AUD-12** — No first-class `<quote>`/`<blockquote>` vocabulary entry.
- [ ] **AUD-15** — No documented tag-forms matrix.

### Silent failures / authoring traps
- [ ] **AUD-13** — `<config>` silently accepts metadata kwargs (`title=`, `author=`). No warning.
- [ ] **AUD-14** — Citations and rich content in `caption="..."` kwarg strings not parsed. See DD-1/DD-2.

### Asset / build pipeline
- [x] **AUD-10** — KaTeX font URLs fail when CSS inlined. Fixed in slice 7 follow-up.
- [x] **AUD-11** — Body font fallback to serif on WSL/Linux. Fixed in slice 7 follow-up.
- [x] **AUD-16 / GAP-8** — `getDocumentFontsCss()` not wired into `src/index.js`; external consumers get system font fallback. Fixed 2026-05-21.

### Documentation drift (handled by audit cleanup)
- [x] **AUD-02** — `notes/interpreter-design.md` drift. Handled by Step 1 (archived) + Step 2 (replaced by interpreter.md).
- [x] **AUD-03** — `notes/hover-previews-deferred.md` says "deferred" but feature is implemented. Handled by Step 1 (archived).

### Suggested priority for fix slices

**Low-effort high-value group (~3-4 hours total):**
- ~~AUD-16~~ (wire `getDocumentFontsCss()` — done).
- AUD-01 (equation number CSS fix — 30 minutes).
- AUD-12 (add `<quote>` vocabulary entry + handler — 1-2 hours).
- AUD-13 (config kwarg validation — 30-60 minutes).

**Substantive group (real architectural work):**
- AUD-14 (caption-as-content + DD-1/DD-2 implementation) — touches multiple handlers.
- AUD-15 (tag-forms matrix + fixing parser conflicts) — touches parser; requires AUD-08.
- AUD-08 (self-closing for DSL-registry tags) — parser change, micromark vs Peggy precedence.
- AUD-09 (sections/code-blocks referenceable) — resolve with the cross-reference redesign (FLAGGED-2).

Deferred-feature work (inline TeX shortcuts, `<csv>`/`<tsv>` shortcuts, GFM tables) is separate; each is its own scope.

---

## Resumption checklist

When picking this up again:

1. [ ] Read this document.
2. [ ] Read `notes/interpreter.md` and `notes/pipeline.md` if not already familiar.
3. [ ] Decide priority:
   - [ ] Finish audit cleanup — only Step 4 remains (~30-60 min, mechanical).
   - [ ] Start fixing AUD findings — low-effort group first.
   - [ ] Implement a deferred feature (inline TeX shortcuts is well-specified and ready).
   - [ ] Begin the global review — pipeline architecture, plus FLAGGED-1 (section syntax) and FLAGGED-2 (cross-reference sigil redesign).
4. [ ] Set up a session with the appropriate tool (Claude Code for mechanical work, chat for design conversations, Copilot for substantive implementation).

The state is genuinely good. Documentation accurate. Architecture documented. Audit findings filed. Tests passing. No urgent work pending.
