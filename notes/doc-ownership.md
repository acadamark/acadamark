# Documentation ownership

How acadamark's documentation is organized, so that every piece of information
has one home and the documentation stays coherent with the code.

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
| `notes/interpreter.md`, `notes/pipeline.md`, `notes/*-spec.md`, `idioms.md`, `principles.md`, `layer1-naming.md`, … | Spec | Their subject — the intended design, present-tense, built and unbuilt alike. |
| `notes/acadamark-backlog-roadmap.md` | Backlog / Roadmap | ALL open work — bugs, gaps, limitations, planned features, open questions — listed and routed by Layer 0-3. The only home for open work. |
| `STATUS.md` | Status | Current-state checklist; in-flight/next; milestones (append-only). |
| `doc-ownership.md` | Governance | This system. |
| `CLAUDE.md` | Governance | Collaboration conventions for AI sessions. |

Anything not here is code, an archived document, or does not belong in the repo
root / `notes/`.

## Where each kind of fact lives

- The intended design of any part of the system → its spec.
- Open work of any kind → the backlog/roadmap. Nowhere else.
- What is true now / what is built → STATUS.md checklist.
- What was completed and when → STATUS.md milestones (append-only).
- What is being worked on now → STATUS.md "in flight / next".
- Test count, vocabulary count, etc. → no document. Run `npm run verify`.

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
