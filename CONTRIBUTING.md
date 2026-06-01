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
   intended design (a spec), hold open work as an unordered pool (the
   backlog), name the build sequence (the roadmap), show where the project is
   now (STATUS.md), or define this system (this file). A spec carries no
   progress tracking. The backlog carries no sequencing. The roadmap carries
   no per-item detail. A document that needs two jobs is two documents.

2. **No document states a computable fact.** Test counts, vocabulary counts,
   and similar fast-changing checkable numbers appear in no document. Run
   `npm run verify`.

## The documents

| Document | Role | Holds |
|----------|------|-------|
| `README.md` | Front door | The pitch. No tracking detail. |
| `DESIGN.md` | Spec | Design rationale; the layer model; design directions. |
| `notes/specs/*.md` (`interpreter.md`, `pipeline.md`, `shorthand-syntax.md`, `escape-rules-spec.md`, `multiline-spec.md`, `recursive-content-spec.md`, `idioms.md`, `principles.md`, `layer1-naming.md`, `shape-tokens.md`, `multi-file-authoring.md`, `multi-column-display.md`) | Spec | Their subject — the intended design, present-tense, built and unbuilt alike. |
| `BACKLOG.md` | Backlog | ALL open work — bugs, gaps, limitations, planned features, open questions — as an unordered pool, queryable by tag, with detail. The only home for open-work detail. |
| `ROADMAP.md` | Roadmap | The linear build narrative: phases, items in each phase in build order, dependencies, and current position. Alpha is a milestone along the roadmap. Each item is a cross-reference to its `BACKLOG.md` entry. |
| `STATUS.md` | Status | Current-state checklist; in-flight/next; milestones. |
| `CONTRIBUTING.md` | Governance | This system. |
| `CLAUDE.md` | Governance | Collaboration conventions for AI sessions. |

The live documentation lives in three places: governance and status docs (`README.md`, `DESIGN.md`, `STATUS.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `BACKLOG.md`, `ROADMAP.md`) at the repository root; specs in `notes/specs/`; the historical record in `notes/archive/`. Anything outside those three is code or does not belong in the repo's documentation surface.

### Why backlog and roadmap are two documents

They do different jobs. The backlog is a *pool*: every open item, queryable
by tag, with full detail (rationale, history, file paths, design tensions).
Its readers ask "what is open in subsystem X?" or "what is the full story of
item Y?" The roadmap is a *narrative*: a small, stable, linear path through
phases, with each item a cross-reference to its backlog entry. Its readers
ask "what comes next?" or "where does item Y sit in the build sequence?"

The two documents agree on what is open and on alpha membership; they
disagree on shape because they serve different questions. The coherence
check (below) names the rule that keeps them in agreement.

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
  rebuild standard; the unbuilt fact lives in `BACKLOG.md` and the phase
  sits in `ROADMAP.md`.

## Where each kind of fact lives

- The intended design of any part of the system → its spec.
- Open work of any kind, with detail → `BACKLOG.md`. Nowhere else.
- The build sequence and current position → `ROADMAP.md`. Nowhere else.
- What is true now / what is built → `STATUS.md` checklist.
- What is being worked on now → `STATUS.md` "in flight / next".
- Test count, vocabulary count, etc. → no document. Run `npm run verify`.

## Reading order (for newcomers)

The document table above lists every doc and its role. For someone new to the
project, the recommended sequence:

1. `README.md` — the project's purpose and high-level approach.
2. `STATUS.md` — what is working today, what is in flight, what is pending.
3. `ROADMAP.md` — the phases the project moves through, with alpha as a
   milestone. Gives a one-screen view of where things are heading.
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

Open work in detail — `BACKLOG.md`. Working conventions for AI
sessions — `CLAUDE.md`.

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
> 2. **Backlog ⇄ code.** Every item this slice completed: the corresponding
>    `BACKLOG.md` entry is removed (checklist line and detailed entry, both
>    views in the same edit). Every item this slice discovered: a new entry
>    is added in both views. Backlog claims (file paths, sibling-items, status
>    notes) for any item this slice touched are re-verified against current
>    code; stale claims are corrected. Provisional findings reach the backlog
>    in the slice that surfaces them — not deferred to a follow-on slice.
>
> 3. **Roadmap ⇄ backlog.** Cross-references stay live:
>    - Every `[alpha]` `BACKLOG.md` entry carries a `→ roadmap: Phase N`
>      cross-reference; every `ROADMAP.md` item names its `BACKLOG.md` entry.
>    - When a slice **closes** an `[alpha]` item: the entry is removed from
>      `BACKLOG.md` *and* the corresponding line is removed from `ROADMAP.md`.
>      If the closed item was the last in its phase, the phase exits.
>    - When a slice **adds** an `[alpha]` item: the entry is filed in
>      `BACKLOG.md` *and* listed in the appropriate `ROADMAP.md` phase with
>      its cross-reference.
>    - When a slice **rules** an item alpha vs post-alpha: the tag changes
>      in the backlog entry; if alpha, the item appears in the roadmap; if
>      post-alpha, it appears in the roadmap only if its phase already
>      includes post-alpha items (Phases 7+).
>    - When a slice **changes a phase's scope** (an alpha item moves to a
>      different phase, two phases merge, a phase splits): the roadmap edit
>      is made in the same slice; backlog cross-references update to match.
>    - The roadmap and the backlog agree on alpha membership: the set of
>      `[alpha]` entries in `BACKLOG.md` equals the set of items appearing
>      in `ROADMAP.md`'s alpha phases (Phases 1-6 currently).
>
> 4. **STATUS.** Checklist still matches reality; a milestone line added for
>    what was completed; "in flight / next" updated.
>
> 5. **Rule 2.** No computable fact was written into any document.
>
> 6. **Report** what was reconciled. If a category needed nothing, say so
>    explicitly — a silent skip and a deliberate "nothing needed" must not look
>    the same.

## Maintenance

- An audit is a process; its only output is backlog items. There is no
  "audit findings" document.
- An audit finding that is a backlog item is filed into
  `BACKLOG.md` at the moment it is surfaced — when the Phase 0
  report exists — not deferred to the fix slice. If the finding is alpha-
  shaped, the roadmap is also updated in the same edit. Provisional filings
  are allowed; the backlog, not a report or transcript, is the durable
  holding place for a surfaced finding. A Phase 0 is not complete until
  its backlog-worthy findings are filed. A fix slice resolves findings —
  refines, closes, or addresses them as spec edits — but is not the first
  place a finding reaches the backlog.
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
  work: it goes in `BACKLOG.md` (and the roadmap if alpha-shaped). A
  limitation that is a deliberate, permanent design boundary is part of the
  design: it goes in `DESIGN.md`'s "Design tensions and accepted tradeoffs"
  section, with its rationale. Every limitation must be classified as one
  or the other.
- Discussing an idea is a type of work. It can be filed as a backlog item
  like any other — "discuss whether to do X" — and routed normally.
  Resolving the item produces a spec change, a work item, or a recorded
  decision not to pursue. An idea worth keeping does not become its own
  document or a "deferred" file; it becomes a discussion item in the
  backlog.
- The roadmap stays small. If a phase's item list is growing past a handful
  of items, the right move is usually to split the phase, not to lengthen
  it. Item detail does not move into the roadmap to compensate; it stays
  in the backlog.
