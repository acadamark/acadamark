# Audit cleanup — stopping point and resumption plan

Document captured at end of 2026-05-14/15 session. Audit cleanup is partially complete; this file describes the state, what's left to do, and the architectural conversation that's still pending.

## Where we stopped

### Completed during this session

**Step 1 — Archive drifted notes.** Moved four documents to `archive/` with date-stamped names and archival headers pointing to replacements:
- `notes/interpreter-design.md` → `archive/interpreter-design-2026-05.md`
- `notes/plugin-pipeline.md` → `archive/plugin-pipeline-2026-05.md`
- `notes/hover-previews-deferred.md` → `archive/hover-previews-deferred-2026-05.md`
- `notes/text-based-DSLs.md` → `archive/text-based-DSLs-2024-05.md`

`archive/README.md` updated with new entries. `notes/reading-order.md` updated to point to replacement documents.

**Step 2 — Fresh interpreter.md and pipeline.md.** Written from current code by Copilot. interpreter.md (938 lines) describes the interpreter architecture: plugin chain, handler dispatch, INTERNAL_REGISTRY pattern, schema dispatch, asset injection, error handling. pipeline.md (715 lines) describes the full data flow: source → mdast → transforms → hast → HTML, with worked examples.

These are the new authoritative architecture docs. They replace `notes/interpreter-design.md` and `notes/plugin-pipeline.md` (now archived).

**Step 3 — STATUS.md rewrite.** Replaced from scratch (326 lines, replacing previous 310-line stale version). New STATUS.md is a current-state snapshot of 2026-Q2: what exists, what doesn't, architecture overview cross-referencing interpreter.md and pipeline.md, design decisions preserved with two additions (schema-vs-handler dispatch; updated Peggy entry without "not yet built" claim), working-style appendix preserved with one paragraph about audit pattern added.

**New design directions captured (DD-1 through DD-5).** In `notes/design-directions.md`:
- DD-1: Content gets parsed; arguments don't.
- DD-2: Tags with caption-like content support two equivalent forms (compact and explicit).
- DD-3: `<meta>` is for document metadata; `<config>` is for document options.
- DD-4: All tag forms work for all tags where semantically meaningful.
- DD-5: Standalone HTML is the build target; client-side rendering is the future target.

**New audit findings filed (AUD-12 through AUD-16).** In `notes/audit-findings.md` and `notes/audit-2026-Q2/`:
- AUD-12: `<quote>`/`<blockquote>` vocabulary gap.
- AUD-13: `<config>` silently accepts metadata kwargs.
- AUD-14: Citations in caption strings not parsed.
- AUD-15: No documented tag-forms matrix.
- AUD-16 (= GAP-8): `getDocumentFontsCss()` not wired into main pipeline.

**Audit 1A output documents.** In `notes/audit-2026-Q2/`:
- `1A-fixes-applied.md` — log of in-place fixes from the mechanical spec review.
- `1A-drift-and-gaps.md` — DRIFT-1 through DRIFT-11, GAP-1 through GAP-8.
- `1A-design-questions.md` — DQ-1 through DQ-8.

### Tests state

All test suites passing:
- 228 parser tests (`packages/remark-acadamark/`).
- 208 interpreter tests across 22 suites (`packages/acadamark-interpreter/`).
- 436 total.

No code was modified during audit cleanup. Documentation only.

---

## What remains

### Step 4 — Surgical doc updates (mostly mechanical)

Small targeted edits to existing documents. Mostly mechanical, no design decisions.

- `notes/recursive-content-spec.md` — the "Error recovery: blank-line termination" section describes future work as if implemented. Add "Status: deferred" qualifier.
- `notes/inline-tex-shortcuts-spec.md` — promote "Status: Not implemented" from near the bottom to the top of the document.
- `BUILD.md` — pipeline diagram uses planning-era plugin names (`acadamarkTagInterpret`, `acadamarkCitations`, `acadamarkCrossRefs`, `rehypeKatex`). Update to match the current pipeline. Mark BUILD.md status clearly (planning doc vs current state).
- DRIFT-7, DRIFT-8, DRIFT-9: vocabulary entries (`cite.md`, `ref.md`, `note.md`) have `related_plugins` fields with wrong plugin names. Mechanical name fixes.
- Zone.Identifier ghost files (NTFS artifacts in `notes/`). Clean them up if desired.

Probably 30-60 minutes total. Can be done as a single small Copilot session OR by hand in Claude Code OR me drafting text for you to paste.

### Step 5 — DESIGN.md augmentation with DD-1 through DD-5

DESIGN.md exists and is mostly current. Doesn't yet capture the design directions discovered through implementation. Add a section integrating DD-1 through DD-5 into DESIGN.md, then retire `notes/design-directions.md` (move to archive, or delete since the content is now in DESIGN.md).

Me-led writing; you reviewing. No Copilot needed.

Probably 30-45 minutes.

### Step 6 — README.md light edit

Existing README is good. Light edit needed:
- "Status" section says "in active design" / "rebuilt on unified" / "earlier regex-based prototypes" — outdated. Should reflect that the system is implemented.
- The taste example uses `<# Introduction #intro>` and `<cite smith2023, jones2024>`. Verify these match current syntax (the cite comma syntax works post parser-maturity slice; the `<#>` sigil... worth confirming).
- "Project goals" section is forward-looking — could be updated to "what acadamark achieves" for current state, with goals split into "what's done" and "what's next."

Me-led writing; you reviewing. No Copilot needed.

Probably 20-30 minutes.

### Total remaining

Maybe 2 hours of work spread across Steps 4-6. None of it requires the substantive Copilot capacity that Steps 2 and 3 needed. Can be done piecemeal across multiple sessions.

---

## The architectural conversation (pending)

You observed that interpreter.md and pipeline.md feel ad-hoc — laundry lists rather than top-down architecture. I agreed: the interpreter pipeline accreted slice by slice, with the "three phases" framing applied retrospectively. The Layer 1 / Layer 2 vision was top-down; the implementation architecture was emergent.

Your position on this:

1. **Continue with emergent structure for now.** Fix accumulated issues (the 16+ AUD findings). Implement deferred features (inline TeX shortcuts, others) within the current architecture.
2. **Refactor before client-side rebuild.** The client-side/live-rendering target is a big enough shift that going in with clean foundations matters.
3. **The refactor analysis is something you do well**, but stamina is a real consideration. You'd need deep codebase exploration.
4. **Possible collaboration mode:** generate visualizations (Mermaid flowcharts) and parameter-based representations that let you see structure without reading every line of code. Think together about reduction to principles.

This is captured as a future direction. Not something to start now.

**When ready to take it on, the working pattern would be:**
- Generate visual representations of the current pipeline, plugin dependencies, handler dispatch, and registry interactions.
- You think about how the pieces relate; we discuss principles that would reduce the set.
- Together we sketch what a refactored architecture would look like.
- A real architectural slice happens with the refactored design as target.

Not now. After remaining audit cleanup steps. Before client-side rebuild.

---

## The AUD checklist (snapshot)

For quick reference when resuming work. From `notes/audit-findings.md` as of session end:

### Cosmetic / CSS
- [ ] **AUD-01** — Equation numbers center-align instead of right-align.

### Parser bugs
- [ ] **AUD-04** — No-pipe/no-content short form misread as long-form opener. Workaround: `<tag attrs | >`.
- [ ] **AUD-08** — Self-closing `<tag />` broken for DSL-registry tags. Workaround: empty long-form `<tag>\n</tag>`.

### Parser / spec gaps
- [ ] **AUD-05** — `<csv>` and `<tsv>` shortcut tags registered but not implemented.
- [ ] **AUD-06** — `remark-gfm` not installed; plain pipe-table syntax doesn't work. Workaround: `<table md | ...>`.
- [ ] **AUD-09** — Section and code-block ids never registered; `<ref #sec:...>` always ref-errors.

### Vocabulary / documentation gaps
- [ ] **AUD-07** — `table.md` shows `<csv | ...>` example relying on unimplemented AUD-05 shortcut.
- [ ] **AUD-12** — No first-class `<quote>`/`<blockquote>` vocabulary entry.
- [ ] **AUD-15** — No documented tag-forms matrix.

### Silent failures / authoring traps
- [ ] **AUD-13** — `<config>` silently accepts metadata kwargs (`title=`, `author=`). No warning.
- [ ] **AUD-14** — Citations and rich content in `caption="..."` kwarg strings not parsed. See DD-1/DD-2 for direction.

### Asset / build pipeline
- [x] **AUD-10** — KaTeX font URLs fail when CSS inlined. **Fixed** in slice 7 follow-up.
- [x] **AUD-11** — Body font fallback to serif on WSL/Linux. **Fixed** in slice 7 follow-up.
- [ ] **AUD-16 / GAP-8** — `getDocumentFontsCss()` not wired into `src/index.js`; external consumers get system font fallback.

### Documentation drift (handled by audit cleanup)
- [x] **AUD-02** — `notes/interpreter-design.md` drift. **Handled by Step 1** (archived) and **Step 2** (replaced by interpreter.md).
- [x] **AUD-03** — `notes/hover-previews-deferred.md` says "deferred" but feature is implemented. **Handled by Step 1** (archived).

### Suggested priority for fix slices

Two natural groupings:

**Low-effort high-value group (~3-4 hours total):**
- AUD-16 (wire `getDocumentFontsCss()` — 15 minutes).
- AUD-01 (equation number CSS fix — 30 minutes).
- AUD-12 (add `<quote>` vocabulary entry + handler — 1-2 hours).
- AUD-13 (config kwarg validation — 30-60 minutes).

**Substantive group (real architectural work):**
- AUD-14 (caption-as-content + DD-1/DD-2 implementation) — substantial; touches multiple handlers.
- AUD-15 (tag-forms matrix documentation + fixing parser conflicts) — touches parser; requires AUD-08 fix.
- AUD-08 (self-closing for DSL-registry tags) — parser change, micromark vs Peggy precedence.
- AUD-09 (sections and code-blocks registerable for cross-references) — numbering plugin extension.

The deferred-feature work (inline TeX shortcuts, `<csv>`/`<tsv>` shortcuts, GFM tables) is separate; each is its own scope.

---

## Resumption checklist

When picking this up again:

1. [ ] Read this document.
2. [ ] Read `notes/interpreter.md` and `notes/pipeline.md` if not already familiar.
3. [ ] Decide priority:
   - [ ] Finish audit cleanup (Steps 4-6) — 2 hours, mostly small edits.
   - [ ] Start fixing AUD findings — low-effort group first probably.
   - [ ] Implement a deferred feature (inline TeX shortcuts is well-specified and ready).
   - [ ] Begin the pipeline-architecture refactor conversation (visualizations, principles).
4. [ ] Set up a session with whichever tool is appropriate (Claude Code for mechanical work, chat for design conversations, Copilot for substantive implementation).

The state is genuinely good. Documentation accurate. Architecture documented. Audit findings filed. Tests passing. No urgent work pending.
