# Contributing to enscribe

This file defines how enscribe's documentation is organized, so that every piece of information has one home and the documentation stays coherent with the code. A contributor — or an AI session — works against this system: a slice ends with the coherence check below, and a piece of content always has a single owning document.

## The coherence principle

The documentation and the code are one coherent description of the project.
The standard: **if every code file were deleted, the remaining documentation
would be sufficient to rebuild the project.** If the spec falls behind the
code, a design decision was made and recorded only in the code — fix that by
recording it in the spec.

## Two rules

1. **One job per document.** Every document does exactly one of: describe the
   intended design (a spec), name the build sequence (the roadmap), show where
   the project is now (STATUS.md), or define this system (this file). A spec
   carries no progress tracking. The roadmap carries no per-item detail. A
   document that needs two jobs is two documents. (Open work is not a document —
   it lives in GitHub Issues.)

2. **No document states a computable fact.** Test counts, vocabulary counts,
   and similar fast-changing checkable numbers appear in no document. Run
   `npm run verify`.

## The documents

| Document | Role | Holds |
|----------|------|-------|
| `README.md` | Front door | The pitch. No tracking detail. |
| `DESIGN.md` | Spec | Design rationale; the layer model; design directions. |
| `notes/specs/*.md` (`interpreter.md`, `pipeline.md`, `shorthand-syntax.md`, `escape-rules-spec.md`, `multiline-spec.md`, `recursive-content-spec.md`, `idioms.md`, `principles.md`, `layer1-naming.md`, `shape-tokens.md`, `multi-file-authoring.md`, `multi-column-display.md`) | Spec | Their subject — the intended design, present-tense, built and unbuilt alike. |
| `ROADMAP.md` | Roadmap | The high-level plan: the phases the work moves through and the release each milestone aims at, plus current position. No per-item detail — individual items live in GitHub Issues. |
| `STATUS.md` | Status | Capability checklist: what works today, what is planned. No changelog. |
| GitHub Issues | Open work | ALL open work — bugs, enhancements, features, open questions — grouped by milestone and label. The home for open-work detail. (Not a repo file.) |
| `CONTRIBUTING.md` | Governance | This system. |
| `CLAUDE.md` | Governance | Collaboration conventions for AI sessions. |

The live documentation lives in three places: governance and status docs (`README.md`, `DESIGN.md`, `STATUS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `ROADMAP.md`) at the repository root; specs in `notes/specs/`; the historical record in `notes/archive/`. Open work lives in GitHub Issues, not in a repo file. Anything outside those documentation locations is code or does not belong in the repo's documentation surface.

## The spec tier — DESIGN.md and notes/specs/

The "Spec" role covers two tiers. **`DESIGN.md` is the conceptual master
blueprint**: the layer model, the architectural primitives, the design
directions, the JATS relationship, the DSL-processor model, scope decisions —
*what enscribe fundamentally is*. **The `notes/specs/` files are the
technical blueprint set** — each is the implementation-precise design of one
subsystem, sitting inside the conceptual frame `DESIGN.md` provides. There is
no single master technical blueprint file; the technical blueprint is the
`notes/specs/` set, collectively. Each spec defers up to `DESIGN.md` for
architecture-level framing.

Both tiers are held to the rebuild-from-docs standard: `DESIGN.md` must be
sufficient at the conceptual level; each subsystem spec must be sufficient at
the technical level.

**Placement rule** (which already operated implicitly and is now stated): a
fact about *how the whole system is structured* belongs in `DESIGN.md`; a
fact about *how one subsystem works* belongs in that subsystem's
`notes/specs/` file. The DSL-processor model is the canonical example — it
is a cross-cutting architectural primitive, so it lives in `DESIGN.md`, not
as a peer subsystem spec.

### Subsystem index

Each subsystem's blueprint:

- **Authoring syntax / parser** — `notes/specs/shorthand-syntax.md` (the
  syntactic ground truth), with `notes/specs/escape-rules-spec.md`,
  `notes/specs/multiline-spec.md`, and `notes/specs/recursive-content-spec.md`
  for the related parser-layer details.
- **Interpreter / pipeline** — `notes/specs/interpreter.md` (interpreter
  architecture: dispatch, handlers, schema, asset injection) and
  `notes/specs/pipeline.md` (stage ordering, plugin dependencies, data flow).
- **Layer 1 vocabulary** — `notes/specs/layer1-naming.md` (the four naming
  rules) and `notes/specs/shape-tokens.md` (content-shape machinery). The
  per-element vocabulary entries live separately in
  `packages/layer1-vocabulary/elements/` with `SPEC.md` alongside.
- **Cross-cutting principles** — `notes/specs/idioms.md` (the lexer- and
  processor-delegation principle) and `notes/specs/principles.md`
  (always-renders, parser-knows-nothing-about-meaning, etc.).
- **Extension blueprints (designed, not built)** —
  `notes/specs/multi-file-authoring.md` and
  `notes/specs/multi-column-display.md`. Their design is specified at the
  rebuild standard; the unbuilt fact is tracked in GitHub Issues and the phase
  sits in `ROADMAP.md`.

## Where each kind of fact lives

- The intended design of any part of the system → its spec.
- Open work of any kind, with detail → [GitHub Issues](https://github.com/enscribejs/enscribe/issues), by milestone and label. Nowhere else.
- The build sequence and current position → `ROADMAP.md`. Nowhere else.
- What is true now / what is built → `STATUS.md` checklist.
- What is being worked on now → the active GitHub milestone.
- Test count, vocabulary count, etc. → no document. Run `npm run verify`.

## Reading order (for newcomers)

The document table above lists every doc and its role. For someone new to the
project, the recommended sequence:

1. `README.md` — the project's purpose and high-level approach.
2. `STATUS.md` — what is working today, what is in flight, what is pending.
3. `ROADMAP.md` — the phases the project moves through and the release each
   milestone aims at. Gives a one-screen view of where things are heading.
4. `DESIGN.md` — design rationale: the layer model, JATS relationship, DSL
   processor delegation, scope decisions, design directions.
5. `notes/specs/idioms.md` and `notes/specs/principles.md` — the cross-cutting principles
   (lexer delegation; always-renders; parser-knows-nothing-about-meaning).

For specific subsystems, read the spec for that subsystem under `notes/specs/`: the
parser specs together (`shorthand-syntax.md`, `escape-rules-spec.md`,
`multiline-spec.md`, `recursive-content-spec.md`); the interpreter spec
(`interpreter.md` and `pipeline.md`); the vocabulary spec
(`packages/layer1-vocabulary/SPEC.md` and the per-element entries); the naming
rules (`layer1-naming.md`); the shape-token machinery (`shape-tokens.md`).

Open work — [GitHub Issues](https://github.com/enscribejs/enscribe/issues).
Working conventions for AI sessions — `CLAUDE.md`.

## The coherence check

Every implementation slice ends with this check, and reports its result. A
slice is not done until code and documentation agree.

> **Coherence check — perform and report before committing.**
>
> 1. **Spec ⇄ code.** Did this slice make any decision about how the system is
>    *designed* (not merely coded)? If so, the relevant spec must state it now.
>    Test: *with the code deleted, would the spec still describe what this slice
>    decided?* If not, the spec has a hole — fix it in this slice.
>
> 2. **Issues ⇄ code.** Every item this slice completed: close (or check off)
>    its GitHub Issue. Every item this slice discovered: file a new GitHub Issue
>    with the appropriate milestone and labels — a finding reaches Issues in the
>    slice that surfaces it, not a follow-on slice. If the slice changes the
>    phase plan or a release's scope, update `ROADMAP.md` in the same edit.
>
> 3. **STATUS.** Flip the relevant `STATUS.md` checkbox for any capability that
>    shipped, and confirm the checklist still matches reality. STATUS is a
>    capability checklist, not a changelog — the commit log is the changelog.
>
> 4. **Rule 2.** No computable fact was written into any document.
>
> 5. **Report** what was reconciled. If a category needed nothing, say so
>    explicitly — a silent skip and a deliberate "nothing needed" must not look
>    the same.

## Maintenance

- An audit is a process; its only output is GitHub Issues. There is no
  "audit findings" document.
- An audit finding that is open work is filed as a GitHub Issue at the moment
  it is surfaced — when the Phase 0 report exists — not deferred to the fix
  slice. If the finding changes the phase plan, the roadmap is also updated in
  the same edit. Provisional filings are allowed; GitHub Issues, not a report
  or transcript, is the durable holding place for a surfaced finding. A Phase 0
  is not complete until its issue-worthy findings are filed. A fix slice
  resolves findings — refines, closes, or addresses them as spec edits — but is
  not the first place a finding reaches the issue tracker.
- A prior observation is a lead, not a fact. When a documentation pass
  migrates, transcribes, or files an observation from an earlier
  investigation, an older notes file, or a past slice, it must empirically
  re-verify that observation against the current code before recording it
  as live — the earlier observation establishes only that something was
  once true. Re-verification is part of the pass: the pass is not complete
  until every filed observation has been re-checked, and an observation
  that no longer holds is filed with its corrected status, not as live.
- A spec is edited the moment the design it describes changes — in the same
  slice, never "later."
- A limitation is one of two things and is filed accordingly — it never gets
  its own document. A limitation that is a bug or a missing feature is open
  work: it goes in GitHub Issues (and the roadmap if it changes the phase
  plan). A limitation that is a deliberate, permanent design boundary is part of the
  design: it goes in `DESIGN.md`'s "Design tensions and accepted tradeoffs"
  section, with its rationale. Every limitation must be classified as one
  or the other.
- Discussing an idea is a type of work. It can be filed as a GitHub Issue
  like any other — "discuss whether to do X" — and routed normally.
  Resolving the item produces a spec change, a work item, or a recorded
  decision not to pursue. An idea worth keeping does not become its own
  document or a "deferred" file; it becomes a discussion issue.
- The roadmap stays small. If a milestone's item list is growing past a
  handful of items, the right move is usually to split the phase, not to
  lengthen the roadmap. Item detail does not move into the roadmap to
  compensate; it stays in GitHub Issues.
