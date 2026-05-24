# Acadamark Documentation System — Design (final)

> The settled design of a minimal, enforceable documentation system. Three
> parts: (1) the system; (2) the proposed full content of the new
> `doc-ownership.md`; (3) the reconciliation plan that installs it. Parts 1–2
> are the agreed design. Part 3 becomes a GHC prompt.

---

## Part 1 — The system

### What went wrong

The inventory found 22 documents holding project-state content, the test count
in 4 documents with 3 different stale numbers, the backlog spread across 7
documents, and the L1-L3 slice plan invisible to the chat side of the project.
The cause was never a missing framework. It was that status, open work,
history, and design were tangled together inside documents whose job was
something else — and that documents fell out of agreement with each other and
with the code, silently, because nothing made staying in agreement part of
"done."

### The governing principle: coherence

The documentation and the code form one coherent description of the project.
The standard, stated concretely:

> **If every code file were deleted, the remaining documentation would be
> sufficient to rebuild the project.**

This is the test for whether the spec is complete. It also reframes spec-drift:
if the spec falls behind the code, it means a real design decision was made
during a code arc and recorded *only* in the code — the least readable place,
where the next person or the next session cannot find it without
reverse-engineering. A decision that lives only in code is a decision that will
have to be rediscovered. Coherence means no decision is in only one place.

### The five roles

Every document does exactly one of five jobs:

| Role | Job | Tense |
|------|-----|-------|
| **Spec** | Describe the intended design of the whole system — the blueprint | Present, timeless |
| **Backlog / Roadmap** | Hold all open work; list it (backlog) and route it (roadmap) | Future / imperative |
| **Status** | Show what is true *now* | Present + past |
| **Governance** | Define this system | — |
| **Front door** | Pitch the project (`README.md`) — carries no tracking detail | — |

### The two rules

**Rule 1 — One job per document.** A spec describes how the system is designed;
it carries no progress tracking — no "TODO," no "in slice N," no checkboxes, no
"done." The backlog/roadmap holds open work; it carries no architecture. STATUS
shows current state; it does not re-explain design. A document needing two jobs
is two documents.

**Rule 2 — No document states a computable fact.** Test counts, the
vocabulary-entry count, and similar fast-changing checkable numbers appear in no
document. The answer is `npm run verify`. A fact in zero documents cannot drift.

### Spec — the blueprint

The spec describes the intended coherent design of the whole system — built and
unbuilt parts alike, at the same fidelity, because the point of a blueprint is
how the parts relate, and the build line is not a line a blueprint respects.
Layer 1 is the canonical example: it does not fully exist, but it guides
everything, so it is fully specified.

The distinction Rule 1 draws is *describing an intended design* (the spec's job)
versus *tracking progress against it* (forbidden in the spec). The spec says
"Layer 1 includes `<theorem>`" in present-tense blueprint voice whether or not
`<theorem>` is built. Whether it is built is a STATUS question; the work to
build it is a backlog item. The spec is held to the rebuild standard above: it
must be sufficient, with the code gone, to rebuild what it describes.

### Backlog and roadmap — towns and route

Open work has two readings of one set of items:

- The **backlog** is the flat set — every open item, unordered. The towns to
  visit. Membership only: an item is open iff it is here.
- The **roadmap** is the same set arranged — sequenced, grouped by the Layer
  0-3 dependency structure, with priority and blocker reasoning. The route
  through the towns.

The two readings must never disagree: every backlog item appears in the
roadmap; every roadmap item is a real open item. **Whether they are one file
(two sections / one routed document) or two files is an ergonomic call for
whoever is doing the work — it is not a system rule.** What is a system rule:
they stay reconciled. An audit is a process whose only output is backlog items —
there is no separate "audit findings" document.

### STATUS — what is true now

Three sections, only these:
1. **Current state** — a capability checklist (`[x]` / `[~]` / `[ ]`).
2. **In flight / next** — what is being worked on, and the next item or two.
   This plus the roadmap is the handoff: a fresh session reads them and is
   oriented. There is no separate handoff document.
3. **Milestones** — append-only history; old entries never edited.

STATUS states no computable facts (Rule 2).

### The coherence check — how the system stays true

Structure alone does not prevent drift; drift happens when work completes and
not every affected document is brought back into agreement in the same motion.
So coherence is made a *checked, reported step of every unit of work* — the way
a green test suite already is. **Every implementation prompt ends with the
coherence check** (its text is in `doc-ownership.md`, Part 2). It verifies both
coordination pairs — spec ⇄ code, and backlog ⇄ roadmap — plus STATUS and Rule
2, and it requires an explicit report of what was reconciled, so that a silent
skip and a deliberate "nothing needed" cannot look the same.

The check does not enforce honesty; it makes drift *legible* — if a slice
plainly made a design decision and the report says the spec needed nothing,
that discrepancy is visible at commit time and can be caught.

---

## Part 2 — Proposed `doc-ownership.md` (full content)

> Replaces the current `doc-ownership.md` entirely.

```markdown
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
```

---

## Part 3 — The reconciliation plan

The system above is the target; the repo is the 22-document sprawl. The
reconciliation migrates one to the other, as **two GHC prompts** run in order:

- **Prompt 1 — Collapse the backlog** (the mechanical half). Steps 1–2 below:
  pull all open work into the single backlog/roadmap, archive the spent
  backlog-ish files. Cleanly separable, low judgment.
- **Prompt 2 — Specs, READMEs, BUILD.md, references, install** (the judgment
  half). Steps 3–9 below: strip status from specs, fix the package READMEs,
  migrate-and-retire BUILD.md, fix cross-references, update the roadmap to
  reality, install the new `doc-ownership.md`. These need a careful hand.

Both prompts themselves end with the coherence check — they are the first
slices to run under the new system and a fair test of it.

1. **Collapse all open work into the backlog/roadmap.** Every open item in
   `audit-findings.md` (AUD-21..27), `specified-not-implemented.md`
   (DF/DS/OQ/PG series), and `known-limitations.md` moves into
   `acadamark-backlog-roadmap.md`, placed in its Layer 0-3 section. Resolved
   items from those files become STATUS.md milestone lines, not backlog
   entries. The three source files are then archived.

2. **File the spec completeness audit as a backlog item.** A new roadmap item:
   audit every spec against the rebuild-from-docs standard — not "does it match
   the code" but "is it *sufficient* to rebuild." Large; its own future arc;
   not done now. (Under a working system this kind of item is always present
   and usually small; it is large now only because of accumulated debt.)

3. **Strip progress-tracking from specs (Rule 1).** Remove "TODO," "not yet
   implemented," "in slice N," "✓", checkboxes from every spec. Open work moves
   to the backlog; superseded-design notes are deleted (history is STATUS.md's
   milestones). Describing an unbuilt *design* stays — that is the spec's job;
   only *progress tracking* is removed.

4. **Fix the two package READMEs.** `packages/acadamark-interpreter/README.md`
   ("Slice 1 in progress" — the interpreter ships) and
   `packages/layer1-vocabulary/README.md` ("specification only" — the vocab is
   consumed end-to-end) describe current reality briefly and point at STATUS.md.

5. **Fix stale cross-references** (from the inventory): CLAUDE.md →
   `recursive-content.md` (real: `-spec.md`); reading-order.md → archived
   `inline-tex-shortcuts-spec.md`; vocab README → archived `plugin-pipeline.md`
   / `interpreter-design.md`; handoff → `notes/audit-2026-Q2/` (real:
   `archive/`).

6. **Migrate-and-retire `BUILD.md`.** `BUILD.md` is a planning-era document
   that predates the role separation — it is three things at once: a stale
   status snapshot ("the next focus is the first interpreter slice" — long
   shipped), genuinely good architectural content ("what's borrowed / what's
   novel," the unified rationale, the parser-knows-nothing principle), and a
   completed implementation plan (the Phase 1–3 list and the slice map, every
   slice "Done"). It cannot be assigned one role; it is retired:
   - The stale status section is **deleted** (the true version is STATUS.md's
     checklist).
   - The architectural content is **migrated into the specs** — read it against
     `interpreter.md`, `pipeline.md`, `DESIGN.md`, and where BUILD.md says
     something not already covered (or says it better), *improve the
     destination spec with it*. This is a deliberate spec-improvement, not a
     copy-paste, and not a "set aside for later" — the content moves directly
     from BUILD.md into a spec, in this slice. **Escape hatch:** if migrating a
     piece properly would require real spec rework beyond a clean merge, do not
     cram it and do not hold it aside — file a backlog item ("improve
     `interpreter.md` architecture section, drawing on archived BUILD.md") and
     let the archived BUILD.md be its named source. A too-large migration
     becomes tracked open work, never limbo.
   - The remainder — chiefly the implementation history (Phase 1–3, the slice
     map) — is **archived** as `archive/BUILD-2026-05.md`, a valuable record of
     how acadamark was built.
   `BUILD.md` is not retired until its unique architectural content has already
   arrived in a spec (or been filed as a backlog item). The name `BUILD.md`
   does not survive: under this system there is no separate "how to build it"
   plan — design is in the specs, work is in the roadmap.

7. **Retire `acadamark-session-handoff.md`.** Live content folds into STATUS.md
   (current state, in-flight/next); the file is archived.

8. **Update the roadmap to current reality.** The inventory found L2 marked
   partially-done in the roadmap but actually closed in code. Reconcile the
   layer ticks with STATUS.md's checklist (verified against code).

9. **Install the new `doc-ownership.md`** (Part 2) and add a pointer to the two
   rules and the coherence check at the top of `CLAUDE.md`, so AI sessions
   inherit them.

Result: ~22 state-tracking documents reduced to the five roles. Every
drift-prone fact is owned once or computed. Every future slice ends with the
coherence check, so the system stays true rather than needing periodic rescue.

---

## Notes for Ariel

- The system is small on purpose: two rules, one principle, one checklist. If it
  needed a thick manual it would be the wrong design.
- The behavioral core is the **coherence check** at the end of every prompt.
  Structure prevents some drift; the check prevents the rest, by making
  documentation consistency a reported part of "done."
- The spec completeness audit is filed, not done now. It is correctly an
  ordinary backlog item — large this once because the system was not running;
  ordinary and small once it is.
- The reconciliation is two slices: Prompt 1 collapses the backlog (mechanical),
  Prompt 2 does specs / READMEs / BUILD.md / references / install (judgment).
  Both end with the coherence check — the new system's first live test.
```
