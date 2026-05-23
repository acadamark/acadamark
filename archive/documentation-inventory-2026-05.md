# Documentation inventory

Read-only inventory of every project document that tracks state, backlog,
status, work-in-progress, audit findings, history/milestones, session
continuity, or doc governance. Produced 2026-05-23. Scope: repo root, `notes/`,
`packages/*/` — excluding `node_modules/` and `archive/`. Per-element
vocabulary entries under `packages/layer1-vocabulary/elements/` are
deliberately out of scope (they are reference content, not project-state
documents).

Purpose: make the current sprawl completely visible so a redesign can
collapse it. No edits applied. No recommendations made.

---

## §1. The catalogue

### Top-level (repo root)

| Path | Lines | Last modified | Apparent purpose (one line) | Categories |
|---|---:|---|---|---|
| `README.md` | 92 | 2026-05-23 | Project premise and entry-point for a new reader. | Status (summary), milestones (implicit), cross-references to other docs |
| `DESIGN.md` | 252 | 2026-05-23 | Design rationale: layered model, JATS relationship, scope decisions, design directions DD-1..DD-5. | Design (primary), milestones (implicit) |
| `BUILD.md` | 215 | 2026-05-22 | Planning-era implementation plan (explicitly marked stale at top). Has a parser slice map. | Status (stale), backlog (stale), plan, history |
| `STATUS.md` | 94 | 2026-05-23 | Thin capability checklist + arc-level milestones list. Rewritten 2026-Q2. | Status, milestones, points-at-others for backlog |
| `CLAUDE.md` | 108 | 2026-04-26 | Working conventions for Claude Code sessions. | Doc governance (working method), backlog hints (deferred features) |
| `claude.md` | 24 | 2026-04-26 | Older / shorter working-conventions file. **Lowercase twin of CLAUDE.md.** | Doc governance (duplicate of CLAUDE.md material) |
| `audit-shape.md` | 148 | 2026-05-14 | A chat transcript / planning note titled like an audit doc — discusses audit-shape options (A/B/C) before the 2026-Q2 audit ran. | Audit (historical planning), session continuity (one-off) |
| `acadamark-session-handoff.md` | 416 | 2026-05-22 | Cross-session orientation: where things stand, working method, decided design calls, full backlog. Explicitly calls itself "one of three tracking documents." | Status, WIP, backlog, handoff, milestones, working method |

### `notes/` — live documents

#### Status / backlog / governance tracking documents

| Path | Lines | Last modified | Apparent purpose | Categories |
|---|---:|---|---|---|
| `notes/acadamark-backlog-roadmap.md` | 371 | 2026-05-22 | Dependency-ordered roadmap in four layers (Layer 0/1/2/3) + Architecture tier + Deferred. Companion to `specified-not-implemented.md` and the session handoff. | Backlog (primary), WIP, milestones (per-layer ticks) |
| `notes/specified-not-implemented.md` | 620 | 2026-05-23 | Full inventory of every specified-but-unbuilt item: DF-1..22, PG-1..13, DS-1..5, OQ-1..2 — each with code-verification notes and AUD cross-refs. | Backlog (inventory), audit cross-references, status per item |
| `notes/audit-findings.md` | 784 | 2026-05-23 | Rolling AUD findings list: AUD-01 through AUD-26 (plus GAP-8/9), each with status (Open/Resolved/Fixed). | Audit (primary), backlog (per-finding status), history (closure notes) |
| `notes/audit-cleanup-stopping-point.md` | 134 | 2026-05-21 | Snapshot of where a 6-step "audit cleanup" arc paused. Has its own AUD checklist + FLAGGED-1/FLAGGED-2 design conversations. | Audit (historical), WIP (Step 4 still listed open), backlog (per-AUD checklist) |
| `notes/doc-ownership.md` | 143 | 2026-05-23 | Stated single-owner mapping for each fact category. Explicitly tries to fix doc drift. | Doc governance (primary) |
| `notes/process.md` | 59 | 2026-05-14 | The slice-verification process: `npm run verify`, snapshot updates. | Doc governance (working method) |
| `notes/reading-order.md` | 47 | 2026-05-14 | Recommended reading paths for newcomers, parser-focused, vocab-focused, interpreter-focused. | Doc governance (navigation) |
| `notes/principles.md` | 41 | 2026-05-05 | Always-renders, delegation, spec-first, max-correct-output principles. | Doc governance (principles); pointed at by audit/handoff for rationale |
| `notes/pipeline-refactor-plan.md` | 344 | 2026-05-21 | The R1–R4 pipeline refactor plan. Status: "Plan. Not yet implemented." (Now superseded — R1–R4 are landed.) | Plan (historical), WIP (stale), milestones |
| `notes/pipeline-refactor-plan-amendment.md` | 115 | 2026-05-22 | Amendment 1 to the refactor plan (R2/R3 reboundary). | Plan (historical amendment) |
| `notes/pipeline-refactor-plan-amendment-2.md` | 103 | 2026-05-22 | Amendment 2 to the refactor plan (R3a/R3b split). | Plan (historical amendment) |
| `notes/known-limitations.md` | 186 | 2026-05-23 | Documented intentional limitations and deferred features per subsystem. | Backlog (limitations form), status per item, cross-refs to AUD |
| `notes/audit/documentation-inventory.md` | (this file) | 2026-05-23 | This file. | Audit (deliverable) |

#### Spec documents (not primarily state, but cross-referenced by state docs)

These are noted for completeness because the state docs point at them and
because several of them carry small embedded status notes. They are not
"tracking documents" in the strict sense — they are specs — but they
participate in the same web of cross-references.

| Path | Lines | Last modified | Apparent purpose | Categories |
|---|---:|---|---|---|
| `notes/interpreter.md` | 1417 (after AUD-26 fix) | 2026-05-23 | Interpreter architecture spec. Just-corrected in AUD-26 slice. | Spec (primary); has embedded backlog cross-refs |
| `notes/pipeline.md` | ~960 (after AUD-26 fix) | 2026-05-23 | Pipeline-stage spec. Just-corrected in AUD-26 slice. | Spec (primary); has embedded backlog cross-refs |
| `notes/shorthand-syntax.md` | 851 | 2026-05-23 | Authoring-syntax spec with EBNF and worked examples. | Spec |
| `notes/idioms.md` | 90 | 2026-05-22 | The delegation principle: "delegate the lexer; own the node identity." | Spec / principle |
| `notes/escape-rules-spec.md` | 234 | 2026-05-22 | Escape rules in named-tag content and sigil bodies. | Spec |
| `notes/recursive-content-spec.md` | 133 | 2026-05-21 | Design of the recursive-content plugin. | Spec |
| `notes/multiline-spec.md` | 158 | 2026-05-14 | Multi-line construct rules. | Spec |
| `notes/layer1-naming.md` | 158 | 2026-04-25 | Four Layer-1 naming rules. | Spec / principle |
| `notes/shape-tokens.md` | 172 | 2026-05-12 | inline/block/section content shape tokens. | Spec |
| `notes/at-sigil-reference-proposal.md` | 60 | 2026-05-21 | Pre-F1 proposal doc. F1 is now landed; spec may be stale. | Spec (historical proposal); status implicit |
| `notes/authoring-features-survey.md` | 259 | 2026-05-12 | Feature-comparison survey vs. other tools. | Reference |
| `notes/dsl-engines.md` | 161 | 2026-05-06 | Planned DSL engine adapters (math, csv, mermaid…). | Spec / backlog hints (DSL items unbuilt) |
| `notes/multi-column-display-deferred.md` | 127 | 2026-05-12 | Spec for a deferred feature (DF-5). | Spec (deferred); status in title |
| `notes/multi-file-authoring-deferred.md` | 109 | 2026-05-12 | Spec for a deferred feature (DF-4). | Spec (deferred); status in title |
| `notes/slide-element-deferred.md` | 75 | 2026-05-06 | Spec for a deferred feature (DF-6). | Spec (deferred); status in title |

#### Sketches

| Path | Lines | Last modified | Purpose | Categories |
|---|---:|---|---|---|
| `notes/future-interpreter-sketches/figures.md` | — | 2026-04-26 | Old interpreter sketch. | Historical sketch |
| `notes/future-interpreter-sketches/shorthand-tag-processing.md` | — | 2026-04-26 | Old interpreter sketch. | Historical sketch |
| `notes/future-interpreter-sketches/tables.md` | — | 2026-04-26 | Old interpreter sketch. | Historical sketch |

### `packages/` — package-level docs that carry status

| Path | Lines | Last modified | Apparent purpose | Categories |
|---|---:|---|---|---|
| `packages/acadamark-interpreter/README.md` | 45 | 2026-05-12 | **Severely stale**: says "Slice 1 in progress (May 2026)"; lists the dispatcher, structural plugins, figure handler as "pending". All shipped. | Status (stale), plan (stale) |
| `packages/layer1-vocabulary/README.md` | 43 | 2026-05-07 | Vocabulary intro. Says "currently contains the vocabulary specification only" and pending list includes the interpreter integration (now landed). | Status (stale), plan (stale) |
| `packages/layer1-vocabulary/SPEC.md` | 255 | 2026-05-12 | Vocabulary spec. States "62 per-element entries" — actually 66 vocabulary keys today (67 after blockquote shorthand alias). | Spec, status (drifted count) |
| `packages/layer1-vocabulary/docs/README.md` | 5 | — | Stub. | (placeholder) |
| `packages/layer1-vocabulary/src/README.md` | 5 | — | Stub. | (placeholder) |
| `packages/remark-acadamark-pure-micromark-archive/README.md` | 25 | 2026-04-26 | Marks itself as archived; explains why the live parser switched to Peggy hybrid. | History |

**Distinct project-state documents identified: 22** (the eight root-level
candidates + the twelve `notes/` tracking docs + the two stale `packages/*`
READMEs — not counting the spec docs, the vocabulary SPEC, the sketches, the
archived parser README, or this inventory file).

---

## §2. The "L1 / L2 / L3 slices" — what the prior session set up

**Priority finding requested by the prompt.**

### What the repo actually contains

The literal strings `L1`, `L2`, `L3`, `L-slice`, `L1-3` do **not appear
anywhere** in any tracked file outside `node_modules/`. A whole-tree grep for
those exact terms returned only false positives inside vendored libraries
(`citation.min.js` and the citation-js RIS plugin) and nothing in `notes/`,
`packages/`, or the root.

The closest matches — what the chat side most likely remembers as "the L1/L2/L3
slices" — are in two documents, with two different conventions. Both are
quoted below. **The most likely intended referent is the first.**

### Candidate A (most likely): `notes/acadamark-backlog-roadmap.md` — the four-layer dependency model

This document is dated 2026-05-22 and is the project's authoritative
forward roadmap; the session handoff and `doc-ownership.md` both name it as
the owner of "what to build, in what order, and why." It organizes the entire
backlog into **Layer 0 / Layer 1 / Layer 2 / Layer 3**, with an additional
"Architecture tier" and an "Explicitly deferred" bucket.

Quoting the structural prose at lines 30–45:

> The backlog is shallow, not deep. Most inventory items are **independent
> leaves** — no dependency, do in any order, anytime. Only a few real dependency
> chains exist. The roadmap is therefore four layers:
>
> - **Layer 0 — verify first.** One item that may already be done.
> - **Layer 1 — foundational.** Items that change the core model or the authoring
>   syntax. Things authored or built afterward depend on these being settled, so
>   they come first — not because they are hard, but because they are *upstream*.
> - **Layer 2 — gated.** Items blocked by a specific decision, by a Layer 1 item,
>   or by a piece of architecture that must be built first. They cannot start
>   until their gate clears.
> - **Layer 3 — free leaves.** No dependencies. Do any of these at any time, in
>   any order. This is most of the backlog.

And the dependency-graph block at lines 50–107 spells out what work each
"layer" contains. Verbatim, abbreviated for the layers in question:

```
LAYER 0   ✔ PG-13 (closed — test RC-14, commit 411c6b0)

LAYER 1   ✔ @/# SIGIL SEMANTICS (F1, commit c86da33)
            ✔ DOC-STALENESS SWEEP (F2, commit f00c877)

LAYER 2   ✔ G1 — INLINE TEX SHORTCUTS (G1a b6304a3 + G1b 99aaa0b)
          NORM — THE NORMALIZATION PASS  ◄─── new architectural piece
          G3 — MARKDOWN-FORM MATH / GFM  (DF-22, DF-20)
          G2 — RENDER-MODE LOWERING (DF-19)   ◄─── OUT OF CURRENT SCOPE
          G4 — CROSS-REFERENCE REGISTRATION  (AUD-09, PG-6, PG-7)

LAYER 3   independent leaves — no dependencies, any order:
          PG-3, PG-4, PG-5   (<ref> attribute handling)
          PG-1, PG-2          (per-section / margin notes)
          PG-8, PG-9, PG-10, PG-11
          DF-2 (strict mode), DF-3 (html-passthrough — needs spec first)
          DF-8/9/10/11 (DSL handlers — grouped, see below)
          DF-13/14/15 (deferred vocab elements — grouped)
          DF-21 (self-closing), DF-17 (qualifying-tag generalization)
          DF-5 (multi-column)
          pipeline.md note-numbering underexplanation (doc-clarity, see Layer 3)
```

**Current status per layer (paraphrasing the document's own ticks):**

- **Layer 0** — done (PG-13 closed).
- **Layer 1** — done (F1 + F2 both landed).
- **Layer 2** — partially done. G1 landed; **NORM** and **G3** built since the
  roadmap was last updated (commits `ec0d071` NORM-tables and the math
  normalization arc); **G4** also landed for both halves (R2 sections + G4
  code-blocks per the AUD-09 closure note). The roadmap itself has not been
  updated to reflect NORM/G3/G4 ticks — it still describes them as forthcoming.
- **Layer 3** — not started as a batch; PG-6 is closed (G4), PG-13 is closed
  (Layer 0). Everything else is still listed as a free leaf.

**Suggested order** (also in the roadmap, lines 343–371) names the next steps
in this layered model:

> 1. Math-coverage Phase 0 — read-only investigation (formerly OQ-1).
> 2. NORM Phase 0 — architecture and initial scope.
> 3. NORM implementation slice.
> 4. G3 — markdown-form math and GFM tables.
> 5. G4 — cross-reference registration.
> 6. Layer 3 leaves — any time, by appetite.
> 7. Architecture tier — when output/format direction is known.

Steps 1–4 are already substantially done in code; the roadmap has not been
updated to reflect this.

### Candidate B (less likely): `notes/pipeline-refactor-plan.md` — "Tier 1 / Tier 2 / Tier 3"

The pipeline refactor plan's section 1 introduces a different three-bucket
framing for post-audit work. Lines 16–20:

> **Sequencing:** This refactor is Tier 2 of the post-audit work. Tier 1
> (small, independent AUD fixes) is complete. The refactor proper is done as
> the slices described in section 6. Tier 3 fixes (the AUD findings this
> refactor absorbs or reshapes) are folded into the relevant slices, never
> fixed separately beforehand.

This is "Tier 1/2/3", not "L1/L2/L3", and its subject (R1–R4 pipeline refactor)
is complete. It is filed here only because it is the only other tiered
work-organization scheme in the repo.

### What this means for the prompt's request

The prompt says: "Find where the L1/L2/L3 slices are defined… what each
L-slice actually is, what work each contains, and what their current status
is (done / in progress / not started)."

The exact term "L1/L2/L3 slices" appears in no file. The most plausible
referent is the **Layer 0/1/2/3** scheme in
`notes/acadamark-backlog-roadmap.md` — the user's "L" is almost certainly a
shortening of "Layer". On that reading, the answer is:

- **Layer 0**: done (1 item, closed).
- **Layer 1**: done (2 items, both landed: F1 sigil semantics; F2 doc sweep).
- **Layer 2**: partially done in code but not in the roadmap. G1 landed
  pre-rewrite; NORM, G3, and both halves of G4 have all landed in code since
  but the roadmap has not been updated to tick them. **The roadmap currently
  describes Layer 2 as a forthcoming arc; the code already largely closes
  it.** This is a major drift hazard — see §3 below.
- **Layer 3**: not started as a batch. PG-6 closed via G4. Everything else is
  a "free leaf" awaiting appetite.

If the user instead meant the Tier 1/2/3 framing of the refactor plan, all
three tiers are complete (R1–R4 landed).

---

## §3. Overlaps, contradictions, duplication, gaps, and stale cross-references

### §3.1 Overlap by category

The same kind of content appears in multiple documents. Listed in rough
descending order of severity.

**Open-work / backlog content appears in seven places:**

1. `notes/audit-findings.md` — AUD-01..26 + GAP-8/9.
2. `notes/specified-not-implemented.md` — DF/PG/DS/OQ items.
3. `notes/acadamark-backlog-roadmap.md` — layered roadmap referencing both
   above series.
4. `acadamark-session-handoff.md` §3 — "The backlog" section listing AUD
   items, bugs to file/fix, AUD-09 remainder, theme slice, older deferred
   items.
5. `notes/audit-cleanup-stopping-point.md` §"The AUD checklist (snapshot)" —
   a separate AUD-01..16 checklist (frozen at the 2026-05-21 snapshot).
6. `notes/known-limitations.md` — limitations that overlap with PG/AUD items
   (e.g. multi-key cite sort, sidenote margin rendering, ref kwargs ignored).
7. `STATUS.md` "Known open items" — names AUD-21/22/23/24/25/26 + AUD-08
   inline.

**Status-of-each-item statements appear in multiple documents** for many of
the same items:

- AUD-09 status is stated in `audit-findings.md` (resolved), in
  `audit-cleanup-stopping-point.md` (open, flagged to be resolved with the
  cross-reference redesign), in `acadamark-session-handoff.md` (partially
  resolved + code-block-half deferred), in `specified-not-implemented.md`
  PG-6 (closed), and in `notes/known-limitations.md` "Note cross-references"
  (closed-by-design). These four formulations are not contradictory in
  spirit but they each say "the status" — and only `audit-findings.md` is
  the doc-ownership-declared owner.
- F1 status (landed at commit `c86da33`) is restated in
  `acadamark-session-handoff.md`, `acadamark-backlog-roadmap.md`,
  `specified-not-implemented.md` DF-7, and the handoff's "decided design
  calls" section.
- G1 status is restated in three places (handoff, roadmap,
  specified-not-implemented under DF-1).

**Pipeline architecture description appears in five places** (this is the
recurring drift target — AUD-02, F2 sweep, and AUD-26 have each been the
correction round):

- `notes/pipeline.md` — the doc-ownership-declared owner.
- `notes/interpreter.md` — a parallel description.
- `acadamark-session-handoff.md` §2 "The architecture, as it now stands" —
  "shape → index → number → resolve" with an enumerated plugin breakdown.
- `BUILD.md` — has a planning-era pipeline diagram (explicitly marked stale
  at the top, but the diagram is still in the body).
- `STATUS.md` — has a one-line shape summary
  (`shape → index → number → resolve`) and a pointer.

**Milestones / project history appear in three places:**

- `STATUS.md` "Milestones" — the explicit arc-level history list.
- `acadamark-session-handoff.md` §1 "Where things stand" — slice tables for
  R1..R4 and post-R4 work.
- `audit-cleanup-stopping-point.md` "Where we stopped" — completed Steps 1–6
  with dates and commits.

**Working method / process appears in three places:**

- `notes/process.md` — the doc-ownership-declared owner of the verify
  script and snapshot updates.
- `CLAUDE.md` — slice-cadence, drift checks, two-surface workflow,
  output-verbosity rules.
- `acadamark-session-handoff.md` §0 / §2 — "the slice rhythm", "both
  correctness models", "working patterns that held through the whole
  refactor".

**"Decided design calls / settled decisions" appear in three places:**

- `DESIGN.md` "Design directions (discovered through implementation)"
  (DD-1..DD-5) — the doc-ownership-declared owner.
- `acadamark-session-handoff.md` §"Decided design calls" — restates F1
  (sigil semantics) and G1 (braced shortcuts only).
- `audit-cleanup-stopping-point.md` FLAGGED-1 / FLAGGED-2 — pre-decision
  versions of what became F1 and PG-13/G1.

**Reading-order / navigation appears in two places:**

- `notes/reading-order.md` — the explicit reading-paths doc.
- `README.md` — has a "Reading order" section that points at
  `notes/reading-order.md`.

(This pair is a clean pointer relationship, not a duplication. Listed for
completeness.)

### §3.2 Concrete contradictions

**Test-count drift — four documents, four different numbers, all stale.**

| Document | What it says | Reality |
|---|---|---|
| `notes/process.md` line 43 | "22 suites as of 2026-Q2 audit" | 25 suites |
| `notes/audit-cleanup-stopping-point.md` line 31 | "228 parser tests, 208 interpreter tests across 22 suites, 436 total" | Stale on all three numbers |
| `acadamark-session-handoff.md` line 34 | "→ expect `23/23 suites passed`" | 25 |
| `acadamark-session-handoff.md` line 133 | "(23 suites)" | 25 |

`STATUS.md` line 55 explicitly says STATUS.md "deliberately states no test
count" — and `doc-ownership.md` line 70 says "Not owned by any committed
document — the count changes nearly every slice and goes stale the moment
it is written down." The four occurrences above all violate the
doc-ownership rule.

**Vocabulary entry count — three different numbers in three places:**

| Document | What it says | Reality (from `packages/layer1-vocabulary/elements/*.md`) |
|---|---|---|
| `STATUS.md` line 51 | "66 per-element vocabulary entries" | 66 files, 67 vocabulary keys with the `blockquote` shorthand alias (per AUD-12 closure) |
| `packages/layer1-vocabulary/SPEC.md` line 19 | "62 per-element entries currently in `elements/`" | 66 |
| `BUILD.md` line 11 | "63 per-element entries" | 66 |

**Pipeline plugin order — historic mismatch (now resolved for the two main
docs, still drifted elsewhere):**

- `notes/interpreter.md` and `notes/pipeline.md`: both now describe the
  13-plugin pipeline (post-AUD-26 fix).
- `acadamark-session-handoff.md` §2 "The architecture, as it now stands":
  describes the same shape but does not enumerate normalize-markdown.
- `BUILD.md` § "The pipeline": shows a planning-era diagram with
  `acadamarkTagInterpret`, `acadamarkCitations`, `acadamarkCrossRefs`,
  `rehypeKatex`, `rehypeShiki` — names that never existed in code. The
  document's top banner flags this, but the diagram is still in the body.

**Audit-findings status snapshot — `audit-cleanup-stopping-point.md`
disagrees with `audit-findings.md` on every item that has moved since
2026-05-21:**

- Stopping-point says AUD-09 is open / blocked on cross-reference redesign.
  `audit-findings.md` says fully resolved (R2 + G4).
- Stopping-point says AUD-12 (`<quote>` / `<blockquote>` vocab gap) is open.
  `audit-findings.md` says fixed 2026-05-21.
- Stopping-point's AUD list stops at AUD-16; `audit-findings.md` runs
  through AUD-26.

**`notes/pipeline-refactor-plan.md` self-status:**

- Header (line 3): "Status: Plan. Not yet implemented."
- `acadamark-session-handoff.md` §1: "The pipeline refactor — R1 through R4 —
  is complete."

R1..R4 are landed; the plan's "Plan. Not yet implemented." header is stale.

**`packages/acadamark-interpreter/README.md`:**

- Says "Slice 1 in progress (May 2026)".
- Lists the dispatcher, structural plugins, handlers, and expected-output
  hast JSON files as "pending".
- All of this shipped. Every "pending" item exists in code.

**`packages/layer1-vocabulary/README.md`:**

- Says "This package currently contains the vocabulary specification only…
  Custom-element implementations… will live in `src/` when that work begins."
- The interpreter ships now and consumes the vocabulary in full.

**`notes/reading-order.md`:**

- Recommends `BUILD.md` for understanding the parser (line 14).
- But `BUILD.md` is explicitly marked planning-era and refers to a pipeline
  that was never built.

### §3.3 Duplication of specific facts (drift hazards)

Facts copied into multiple files, each a future-drift hazard:

1. **Test count** (4 occurrences, 3 different numbers, all stale — see above).
2. **Vocabulary count** (3 occurrences, 3 different numbers).
3. **Pipeline shape** ("shape → index → number → resolve" appears in STATUS.md
   and the handoff; the full ordered plugin list appears in pipeline.md,
   interpreter.md, BUILD.md, handoff).
4. **Slice/item commit hashes** (F1 = `c86da33`, G1a = `b6304a3`, G1b =
   `99aaa0b`, F2 = `f00c877`, etc.) — restated in
   `acadamark-session-handoff.md`, `acadamark-backlog-roadmap.md`, and
   `specified-not-implemented.md`. Each next slice adds another set of
   hashes in (at minimum) the same three places.
5. **"What the system supports" lists.** `STATUS.md` has a capability
   checklist. `audit-shape.md` lines 38–75 has a different capability list
   ("Content types / Authoring / Architecture / Testing / Documentation").
   `README.md` has a paragraph-form capability summary.
6. **Working method.** Slice rhythm, Phase 0 prerequisite, `git commit -F`
   habit — present in CLAUDE.md, `notes/process.md`, and the handoff.
7. **Decided design calls.** F1 description and G1 braced-only decision are
   restated in `DESIGN.md` (DD section), `acadamark-session-handoff.md`,
   `notes/acadamark-backlog-roadmap.md`, and
   `notes/specified-not-implemented.md` (DF-7, DF-1).

### §3.4 Gaps — categories without a clear home

- **Phase 0 findings archive.** All current Phase 0 findings documents (R2,
  R3, R4, OQ1, NORM, math-coverage, G4, F1, G1, AUD-26) live in
  `archive/audit-2026-Q2/` (out of scope per the prompt, but worth noting:
  there is no "live" Phase 0 home — completed findings go straight to
  archive, while in-flight findings have no documented home).
- **"What just landed" / per-commit change log.** No document owns this; the
  session handoff carries it as a slice table but explicitly says "every few
  months, not every slice" is the cadence (STATUS.md milestone section). Git
  log is the de-facto owner, but the project consistently writes prose
  histories per arc.
- **"Decided design calls (settled, do not re-litigate)".** The handoff has
  a §"Decided design calls" section; DESIGN.md's DD-section has another;
  doc-ownership says DESIGN.md owns design decisions. The handoff's status
  vs. DESIGN.md's status for a given decided call is not currently
  reconcilable from doc-ownership rules.
- **Audit reports (snapshot vs. rolling).** `audit-cleanup-stopping-point.md`
  is half-snapshot, half-rolling-tracker. `audit-findings.md` is the
  rolling tracker. The "report" half of `audit-cleanup-stopping-point.md` is
  unreplaced — it is a frozen 2026-05-21 view that pre-dates the audit
  arc's actual completion, and `audit-findings.md` does not subsume it
  cleanly because the stopping-point doc also carries FLAGGED-1 / FLAGGED-2
  design conversations and a 6-step process plan.
- **Multi-document ownership ambiguity.** `acadamark-session-handoff.md`
  doc-ownership entry says "Session orientation — where things stand,
  working method, the slice rhythm" — but it also carries the backlog,
  the architecture description, the milestones, decided design calls, and
  the working-style appendix. By scope it overlaps every owner on the
  ownership table.

### §3.5 Cross-references and pointer staleness

Stale cross-references identified:

- `CLAUDE.md` line 22 points at `notes/recursive-content.md`. The actual
  file is named `notes/recursive-content-spec.md` (CLAUDE.md hedges with
  "when this file exists" but the spec exists under a different name).
- `notes/reading-order.md` line 39 points at
  `notes/inline-tex-shortcuts-spec.md`. This file does **not** exist in
  `notes/` — it was archived to
  `archive/inline-tex-shortcuts-spec-2026-05.md` per the archive README.
- `notes/reading-order.md` line 14 recommends `BUILD.md` for parser
  understanding; BUILD.md is planning-era and recommends a pipeline that
  was never built.
- `packages/layer1-vocabulary/README.md` lines 32–33 point at
  `../../notes/plugin-pipeline.md` and `../../notes/interpreter-design.md`.
  Both files were archived in the 2026-Q2 cleanup (`archive/plugin-pipeline-2026-05.md`
  and `archive/interpreter-design-2026-05.md`).
- `acadamark-session-handoff.md` line 222 points at `notes/audit-2026-Q2/`
  (no leading `archive/`); the directory's real path is
  `archive/audit-2026-Q2/`.
- `audit-cleanup-stopping-point.md` describes "Steps 1–3 / Step 4 / Steps
  5–6" as live work; Steps 5–6 are completed and Step 4 has been overtaken
  by the subsequent F2 sweep that did not follow the Step-4 plan. The
  document never says it is superseded.

---

## §4. `notes/doc-ownership.md` — what it currently governs

The file (143 lines, last modified 2026-05-23) declares itself the cure for
documentation drift: "every category of fact has exactly one owning document.
Every other mention of that fact is a pointer to the owner, never a copy."
It enumerates seventeen rows in its ownership table.

### §4.1 What it claims to own

The table maps fact categories to owning documents:

| Fact category | Stated owner |
|---|---|
| Project premise, layered model, display ladder, JATS relationship, scope decisions, accepted tradeoffs | `DESIGN.md` |
| Current project state — what is built, in flight, pending | `STATUS.md` |
| Pipeline plugin chain — names, order, what each produces | `notes/pipeline.md` |
| Interpreter internals — dispatch, handlers, schema, asset injection | `notes/interpreter.md` |
| Shorthand syntax — grammar, attribute forms, closing rules, node shapes | `notes/shorthand-syntax.md` |
| Layer 1 vocabulary — element entries, attributes, JATS mappings | `packages/layer1-vocabulary/SPEC.md` + `elements/*.md` |
| Layer 1 naming rules, render-mode lowering map, compilation targets | `notes/layer1-naming.md` |
| Backlog — what to build, dependency order, layer structure | `notes/acadamark-backlog-roadmap.md` |
| Specified-but-unbuilt inventory — DF/PG/DS/OQ items | `notes/specified-not-implemented.md` |
| Audit findings — AUD/DRIFT/GAP items | `notes/audit-findings.md` |
| Session orientation — where things stand, working method, slice rhythm | `acadamark-session-handoff.md` |
| Build plan — phases, BUILD-era slice map | `BUILD.md` |
| Core principles — always-renders, delegation, spec-first, max-correct-output | `notes/principles.md` |
| Delegation principle in detail, two-layer rule, accepted bare idioms | `notes/idioms.md` |
| Development process — verify script, snapshot updates, browser verification | `notes/process.md` |
| Reading order — where a newcomer starts | `notes/reading-order.md` |
| Documentation ownership (this file) | `notes/doc-ownership.md` |

It also has a "Specific drift hazards" section that names four facts as
particularly prone to copying: test count (no owner — verify script is
authority), pipeline plugin order (owned by `pipeline.md`), slice/item
status (owned by `specified-not-implemented.md` / `audit-findings.md`), and
doc-staleness items themselves (owned by the same two).

### §4.2 What it does NOT cover (gaps in the ownership table)

Tracking documents that exist in the repo but do NOT appear in the
ownership table:

1. **`audit-shape.md`** (root, 148 lines) — not in the table. It is a chat
   transcript / planning note, and the table has no row for "design-session
   conversation transcripts" or "pre-audit planning notes."
2. **`notes/audit-cleanup-stopping-point.md`** — not in the table. Half
   process-snapshot, half AUD checklist, half design-conversations parking
   lot. No row covers it.
3. **`notes/pipeline-refactor-plan.md`** + **two amendments** — not in the
   table. The handoff §"Key planning documents in the repo" calls them out
   as planning documents; the ownership table has no "refactor planning"
   category.
4. **`notes/known-limitations.md`** — not in the table. Carries limitation
   statements that overlap with PG/AUD items (owned by
   `specified-not-implemented.md` and `audit-findings.md`). The
   relationship to those owners is undefined.
5. **`packages/acadamark-interpreter/README.md`** and
   **`packages/layer1-vocabulary/README.md`** — not in the table. Both carry
   status claims; both are severely drifted.
6. **`CLAUDE.md`** and **`claude.md`** — not in the table. Both carry
   working-conventions content that overlaps with `notes/process.md` (which
   IS in the table).
7. **Phase 0 findings documents** (current location:
   `archive/audit-2026-Q2/`) — no category covers them.
8. **`notes/at-sigil-reference-proposal.md`** — not in the table. Pre-F1
   proposal; status implicit (F1 landed, proposal is historical). No
   category for "superseded proposals."
9. **`notes/dsl-engines.md`** — not in the table. Listed as planning by the
   roadmap; status not declared.
10. **`notes/future-interpreter-sketches/*`** — not in the table.

### §4.3 What's already broken in the stated ownership

- The doc-ownership rule explicitly forbids copies of the test count; four
  documents have stale copies (see §3.2).
- The doc-ownership rule says `notes/pipeline.md` owns the plugin chain
  order; `BUILD.md` still presents its own (planning-era, never-existed)
  chain as a diagram, and `acadamark-session-handoff.md` §2 enumerates a
  parallel one.
- The doc-ownership rule says `notes/specified-not-implemented.md` and
  `notes/audit-findings.md` own item status; the
  `audit-cleanup-stopping-point.md` AUD checklist is a separate status
  copy, and the handoff §3 lists per-item status independently.
- The doc-ownership rule says `STATUS.md` owns "what is built, in flight,
  pending"; the two `packages/*/README.md` files both state what is built
  and pending (and both are stale).

The doc-ownership file is structurally sound (it correctly identifies the
problem and the cure) but it is not enforced — at least seven of the
tracking documents in §1 are outside its scope, and three of the in-scope
categories are demonstrably being violated by documents that the table does
not bind.

---

## §5. Summary for redesign

### §5.1 The sprawl, quantified

**22 distinct documents currently hold state / backlog / status / WIP
content.** Breakdown:

- Repo root: 8 documents (`README.md`, `DESIGN.md`, `BUILD.md`, `STATUS.md`,
  `CLAUDE.md`, `claude.md`, `audit-shape.md`,
  `acadamark-session-handoff.md`).
- `notes/` tracking layer: 12 documents (backlog-roadmap,
  specified-not-implemented, audit-findings, audit-cleanup-stopping-point,
  doc-ownership, process, reading-order, principles, pipeline-refactor-plan
  + 2 amendments, known-limitations).
- `packages/*/README.md` with material status content: 2 documents
  (acadamark-interpreter, layer1-vocabulary).

If specs that carry embedded status are counted, add another 6+ (interpreter,
pipeline, shorthand-syntax, layer1-naming, at-sigil-reference-proposal, the
three "*-deferred" specs).

### §5.2 Top overlaps and contradictions, ranked

Ranked by how much confusion they currently cause.

1. **Backlog content scattered across 7 documents.** The same items appear
   in audit-findings, specified-not-implemented, backlog-roadmap, the
   handoff, the stopping-point doc, known-limitations, and STATUS. Their
   stated statuses for a given item agree most of the time but not always
   (AUD-09 is the clearest case; AUD-12 contradicts between stopping-point
   and audit-findings).
2. **Test-count drift.** Four occurrences, three different numbers, all
   stale, all in violation of an explicit doc-ownership rule that says no
   document should write the count down.
3. **Two stale `packages/*/README.md` files** that say the system is
   pre-implementation when it is post-implementation. These are likely the
   first thing a third-party consumer of the npm packages would read.
4. **The roadmap is out of date.** `acadamark-backlog-roadmap.md` describes
   NORM, G3, and G4 as Layer-2 work to be done; all three have landed in
   code (commits including `ec0d071` NORM-tables and the G4 closure noted
   in `audit-findings.md` AUD-09). The roadmap has not been updated since
   2026-05-22. This is the biggest factor blocking a fresh session from
   knowing what is actually open.
5. **`audit-cleanup-stopping-point.md` is overtaken by events.** Its
   "Step 4 still to do" item was overtaken by the F2 sweep; its AUD
   checklist is frozen at 2026-05-21; its FLAGGED-1/FLAGGED-2 conversations
   were resolved (FLAGGED-2 became F1, landed). Yet nothing in the document
   says it is superseded.
6. **`BUILD.md` is planning-era and recommended for reading by
   `notes/reading-order.md`.** A newcomer following the recommended path
   will read a stale architecture diagram and a planning narrative for a
   pipeline that was never built (despite a header warning).
7. **Two `claude.md` files.** Same purpose, two filenames (case-sensitive
   filesystems treat them as different files; case-insensitive ones don't).
8. **`doc-ownership.md` has gaps.** At least seven tracking documents
   are not in its table; three of its in-scope categories have known
   violations (see §4.3).

### §5.3 Distinct kinds of information being tracked (flat list, for the redesign)

So the redesign can decide the minimal set of homes:

1. Project premise / pitch (one paragraph, marketing-aimed).
2. Layered design rationale (Layer 1 vs Layer 2, the display ladder, JATS).
3. Current capabilities checklist (what works today).
4. Current architecture description (pipeline + interpreter).
5. Build plan / phases (the long-arc roadmap).
6. Short-term roadmap / next-up sequencing.
7. Backlog item inventory (DF / PG / DS / OQ — the specified-but-unbuilt
   items, with per-item code-verification).
8. Audit findings inventory (AUD / GAP — the discovered-during-work items,
   with per-item closure status).
9. Per-item status for both #7 and #8 (Open / In flight / Resolved).
10. Decided design calls (the "settled, do not re-litigate" list).
11. Arc-level history / milestones (what shipped in which era).
12. Per-commit / per-slice change record (currently in handoff slice
    tables, also in git log).
13. Known limitations (intentional simplifications, deferred features —
    overlaps with #7/#8 but is framed for end-users, not for slice
    planners).
14. Cross-session orientation ("start here on a cold session").
15. Working method / process (slice rhythm, Phase 0 discipline, verify
    script, snapshot rules, `git commit -F` habit).
16. Project communication style / collaboration conventions (CLAUDE.md
    surface).
17. Reading order for newcomers (navigation).
18. Core principles (always-renders, delegation, spec-first,
    max-correct-output).
19. Spec for each subsystem (parser syntax, escape rules, multi-line,
    recursive content, vocabulary naming, shape tokens, interpreter,
    pipeline).
20. Vocabulary spec (high-level + per-element).
21. Refactor plans (planning-era, current, and amendments).
22. Phase 0 investigation findings (per slice, currently archived).
23. Pre-decision design proposals (e.g. at-sigil-reference-proposal).
24. Sketches and exploratory designs (future-interpreter-sketches/).
25. Doc-governance / ownership (this category itself).
26. Deferred-feature specs (multi-column, multi-file, slide-element, etc.).
27. Package-level descriptions / per-npm-package overviews.
28. Archive READMEs (one row in this inventory, the bulk in
    `archive/README.md`, out of scope per prompt).

That's 28 categories that the current 22 documents (plus ~16 spec and
package-level docs) collectively carry, with overlap and gaps as described
above. The redesign decides which subset of those 28 needs a document, and
how many homes per category are acceptable (the current `doc-ownership.md`
rule is "exactly one").

### §5.4 What this inventory does not say

This report does not propose a redesign, recommend collapsing any specific
document, or rank documents by importance. It does not say which copy of a
disagreement is "correct" — only that copies exist and disagree. The
question of which document should own each of the 28 categories above, and
which should be deleted or merged, is the subject of the redesign
conversation, not of this inventory.

The one item this report could not directly answer — "what are the L1/L2/L3
slices, where are they defined, what is the status of each" — is answered
as best the repo allows in §2: the term itself does not appear, but the
near-certain referent is the Layer 0/1/2/3 model in the backlog roadmap,
and the roadmap's status ticks are themselves out of date.

---

*End of inventory.*
