# Contributing to acadamark

This file defines how acadamark's documentation is organized, so that every piece of information has one home and the documentation stays coherent with the code. A contributor — or an AI session — works against this system: a slice ends with the coherence check below, and a piece of content always has a single owning document.

## The coherence principle

The documentation and the code are one coherent description of the project.
The standard: **if every code file were deleted, the remaining documentation
would be sufficient to rebuild the project.** If the spec falls behind the
code, a design decision was made and recorded only in the code — fix that by
recording it in the spec.

## Two rules

1. **One job per document.** Every document does exactly one of: describe the
   intended design (a spec), hold open work (the backlog/roadmap), show where
   the project is now (STATUS.md), or define this system (this file). A spec
   carries no progress tracking. The backlog carries no architecture. A
   document that needs two jobs is two documents.

2. **No document states a computable fact.** Test counts, vocabulary counts,
   and similar fast-changing checkable numbers appear in no document. Run
   `npm run verify`.

## The documents

| Document | Role | Holds |
|----------|------|-------|
| `README.md` | Front door | The pitch. No tracking detail. |
| `DESIGN.md` | Spec | Design rationale; the layer model; design directions. |
| `notes/specs/*.md` (`interpreter.md`, `pipeline.md`, `shorthand-syntax.md`, `escape-rules-spec.md`, `multiline-spec.md`, `recursive-content-spec.md`, `idioms.md`, `principles.md`, `layer1-naming.md`, `shape-tokens.md`, `multi-file-authoring.md`, `multi-column-display.md`) | Spec | Their subject — the intended design, present-tense, built and unbuilt alike. |
| `BACKLOG-ROADMAP.md` | Backlog / Roadmap | ALL open work — bugs, gaps, limitations, planned features, open questions — listed and routed by Layer 0-3. The only home for open work. |
| `STATUS.md` | Status | Current-state checklist; in-flight/next; milestones (append-only). |
| `CONTRIBUTING.md` | Governance | This system. |
| `CLAUDE.md` | Governance | Collaboration conventions for AI sessions. |

The live documentation lives in three places: governance and status docs (`README.md`, `DESIGN.md`, `STATUS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `BACKLOG-ROADMAP.md`) at the repository root; specs in `notes/specs/`; the historical record in `notes/archive/`. Anything outside those three is code or does not belong in the repo's documentation surface.

## Where each kind of fact lives

- The intended design of any part of the system → its spec.
- Open work of any kind → the backlog/roadmap. Nowhere else.
- What is true now / what is built → STATUS.md checklist.
- What was completed and when → STATUS.md milestones (append-only).
- What is being worked on now → STATUS.md "in flight / next".
- Test count, vocabulary count, etc. → no document. Run `npm run verify`.

## Reading order (for newcomers)

The document table above lists every doc and its role. For someone new to the
project, the recommended sequence:

1. `README.md` — the project's purpose and high-level approach.
2. `STATUS.md` — what is working today, what is in flight, what is pending.
3. `DESIGN.md` — design rationale: the layer model, JATS relationship, DSL
   processor delegation, scope decisions, design directions.
4. `notes/specs/idioms.md` and `notes/specs/principles.md` — the cross-cutting principles
   (lexer delegation; always-renders; parser-knows-nothing-about-meaning).

For specific subsystems, read the spec for that subsystem under `notes/specs/`: the
parser specs together (`shorthand-syntax.md`, `escape-rules-spec.md`,
`multiline-spec.md`, `recursive-content-spec.md`); the interpreter spec
(`interpreter.md` and `pipeline.md`); the vocabulary spec
(`packages/layer1-vocabulary/SPEC.md` and the per-element entries); the naming
rules (`layer1-naming.md`); the shape-token machinery (`shape-tokens.md`).

Open work — `BACKLOG-ROADMAP.md`. Working conventions for AI
sessions — `CLAUDE.md`.

## The coherence check

Every implementation slice ends with this check, and reports its result. A
slice is not done until code and documentation agree.

> **Coherence check — perform and report before committing.**
> 1. **Spec ⇄ code.** Did this slice make any decision about how the system is
>    *designed* (not merely coded)? If so, the relevant spec must state it now.
>    Test: *with the code deleted, would the spec still describe what this slice
>    decided?* If not, the spec has a hole — fix it in this slice.
> 2. **Backlog ⇄ roadmap.** Every item completed: removed. Every item
>    discovered: added. The flat list and the routed view agree.
> 3. **STATUS.** Checklist still matches reality; a milestone line added for
>    what was completed; "in flight / next" updated.
> 4. **Rule 2.** No computable fact was written into any document.
> 5. **Report** what was reconciled. If a category needed nothing, say so
>    explicitly — a silent skip and a deliberate "nothing needed" must not look
>    the same.

## Maintenance

- An audit is a process; its only output is backlog items. There is no
  "audit findings" document.
- A spec is edited the moment the design it describes changes — in the same
  slice, never "later."
- A limitation is one of two things and is filed accordingly — it never gets
  its own document. A limitation that is a bug or a missing feature is open
  work: it goes in the backlog. A limitation that is a deliberate, permanent
  design boundary is part of the design: it goes in `DESIGN.md`'s "Design
  tensions and accepted tradeoffs" section, with its rationale. Every
  limitation must be classified as one or the other.
- Discussing an idea is a type of work. It can be filed as a backlog item like
  any other — "discuss whether to do X" — and routed normally. Resolving the
  item produces a spec change, a work item, or a recorded decision not to
  pursue. An idea worth keeping does not become its own document or a
  "deferred" file; it becomes a discussion item in the backlog.
