# acadamark — roadmap

The roadmap is the project's **linear narrative**. It names the phases the
project moves through, the items inside each phase in build order, and
the dependencies between them. **Alpha is a milestone along the
roadmap, not the only horizon** — the phases continue past it.

The roadmap is deliberately small. Item detail (rationale, history, file
paths, design tensions) lives in `BACKLOG.md`. Each roadmap item
cross-references its backlog entry; each `[alpha]` backlog entry
cross-references its roadmap phase. The two documents agree on what is in
alpha and where each item sits in the sequence.

For the slice-completion rule that keeps the roadmap and the backlog
agreeing, see the coherence check in `CONTRIBUTING.md`.

---

## The alpha milestone — what we are aiming at

The alpha release demonstrably includes five things:

1. The **Layer 1 custom-HTML elements** that render a rich document.
2. **Canonical acadamark shorthand** authoring that form.
3. **Further shorthands (sigils) and markdown idioms** reducing to it.
4. **JATS ⇔ Layer 1** conversion.
5. **Acadamark ⇔ Layer 1** conversion.

Each of the five lines above is a literal acceptance criterion. The
phases that follow are organized so that finishing them satisfies the
five-point definition; the final phase (Alpha integration check) is the
moment that compact is verified end-to-end.

Terminology used here (Layer 1, canonical acadamark, sigils, markdown
idioms, strict mode) is defined in `DESIGN.md` §"Layered model and
terminology."

---

## How the roadmap is organized

Phases are ordered by dependency where dependencies exist, and by
natural sequencing where they do not. Each phase carries:

- A short statement of **what the phase is** and **which line of the
  alpha definition it serves** (or "post-alpha" / "standing" if it does
  not).
- The **items in the phase**, each a cross-reference to a `BACKLOG.md`
  entry.
- Any **dependencies** on earlier phases or on resolved discussions.

Items inside a phase are listed in build order where one item must
precede another inside the phase; otherwise they are independently
pickable within the phase.

---

## Current position

Alpha phases 1–4 are closed; the milestone record is in
`STATUS.md`. The active phase is **Phase 5 (JATS export)**: slice
5a landed 2026-05-29 (`acadamark-jats-export` package + the
deferred `mapAttributes` lift to `acadamark-core` + minimal
article export); slices 5b–5d remain (body content; cross-refs +
notes + BITS book; bibliography + external DSLs). After Phase 5:
Phase 6 (alpha integration check) closes the alpha milestone.
Phase 7 onward is post-alpha.

---

## Phase 5 — JATS export *(alpha — line 4)*

The first half of the JATS bridge: Layer 1 → JATS XML. This is alpha
line 4, the payoff for vocabulary being JATS-aligned from the start
(`jats_counterpart` on every entry). JATS import is the deliberately
lossy direction and is post-alpha.

This phase has its own **Phase 0** because JATS export is a large arc
and the package boundary (`acadamark-jats-export`, not yet present)
needs siting against the inward-pointing `acadamark-core`.

**Items, in order:**

- **JATS-export Phase 0** *(done `f6bb311`, 2026-05-29)*.
  `notes/phase5-jats-export-findings.md`: package siting (Option A —
  new `acadamark-jats-export` package); attribute-mapper lift
  recommendation (do it in slice 5a — JATS export is the second
  consumer the deferral waited for); JATS section-model decision
  (Option I — map named sections to `<sec>` per JATS convention);
  vocabulary mapping inventory by JATS section; SPLIT-into-4-slices
  recommendation (5a → 5b → 5c → 5d).
- **Build JATS export (`rehypeAcadamarkToJats`)** *(formerly DF-18)*.
  Per Phase 0 SPLIT recommendation:
  - **Slice 5a — package + lift + minimal article export**
    *(done 2026-05-29)*. New `acadamark-jats-export` package;
    `mapAttributes` lift to `acadamark-core` (deferred lift from
    `6ae6844` resolved); vocab `maps_to` migrated to target-keyed
    form; article scaffolding + paragraphs + inline text export.
    Existing snapshots zero-diff (HTML behavior preserved).
  - **Slice 5b — body content** (frameables, lists, math, theorem
    family).
  - **Slice 5c — cross-references + footnotes + BITS book**.
  - **Slice 5d — bibliography + external DSLs**.

**Exits:** a Layer 1 document round-trips to JATS XML cleanly enough
for journal submission.

---

## Phase 6 — Alpha integration check *(alpha — verifies all five lines)*

A closing pass that verifies the five-point definition demonstrably
holds. Not new work; a verification that the work to date satisfies
the acceptance criteria.

**Items:**

- **Five-point verification fixtures.** One acceptance fixture per
  line of the alpha definition: Layer 1 elements render; canonical
  acadamark authors them; sigils and markdown idioms reduce to them;
  JATS export round-trips; Layer 2 ⇔ Layer 1 round-trips losslessly
  for canonical-form fixtures.
- **Resolve any gaps surfaced by the five-point verification.** Filed
  on the spot if found.

**Exits:** alpha milestone reached.

---

## Phase 7 — Lift-and-lower completeness *(post-alpha)*

The lift gate at `packages/acadamark-interpreter/src/plugins/normalize-to-canonical.js`
is the single home for normalizing all authored forms to canonical.
Alpha covers what is authored; this phase fills in the lowering
direction (Layer 1 → canonical-named or canonical-sigil) for
round-trip and authoring tooling that emits acadamark from Layer 1.

**Items:**

- **Lowering pass implementation.** The reverse direction of the
  tagname↔sigil cipher, plus the Layer 1 → canonical-acadamark
  rendering.
- **Strict mode** *(formerly DF-2)*. The configuration switch in
  which the normalization pass has nothing to do; markdown idioms
  produce errors rather than reducing.

---

## Phase 8 — Display targets *(post-alpha)*

The display ladder beyond the default Layer 1 + CSS target.

**Items:**

- **Render-mode lowering** *(formerly DF-19)*. Lossy lowering of
  Layer 1 to plain HTML headings for consumers that can't accept
  custom elements. Gated by **the section-title heading-level
  decision** *(formerly OQ-2 — Layer 2)* — that decision must land
  before this can be meaningfully scoped.
- **Multi-column display rendering** *(formerly DF-5)*. Gated by
  **MC-Q1 through MC-Q4** — four design questions filed as discussion
  items.
- **Margin sidenotes** *(formerly PG-2)*. Coupled to multi-column:
  the margin is another column, and the multi-column engine is the
  machinery a margin needs.
- **Pagination and print-targeted output.** Page breaks, running
  heads, print-oriented layout. Gated by the **print-requirements
  spec** being written.

---

## Phase 9 — Multi-file authoring *(post-alpha)*

A real architectural extension: `acadamark.yml` + `<include>`,
project-wide registries.

**Items:**

- **MF-Q1 through MF-Q4 resolution.** Four design questions filed as
  discussion items; must land before the build.
- **Build multi-file authoring** *(formerly DF-4)*. The file-reader /
  path-resolution substrate could land early as a single contained
  slice without committing to any MF-Q decision, if convenient — it
  makes the eventual build cheaper.

---

## Phase 10 — Executable code blocks *(alpha or post-alpha — scoped)*

In-browser JavaScript execution with Arquero (data) and Vega-Lite
(plots). Promoted from the Discussions group to an explicit
implementation phase with the user's alpha-line ruling: the alpha
scope is the browser-resident stack only. Other languages,
kernel-based execution, server-side sandboxing are post-alpha.

**Note:** the user's alpha-line ruling places this work in alpha
scope, but its position in the roadmap reflects size — it is a
sizeable arc and is sequenced after the structural arcs (Phases 2-5)
because those produce the rendering foundation it builds on.

**Items:**

- **Executable code blocks Phase 0.** Surface design (the
  `+eval`/`+echo`/`+output`/`+error`/`cache`/`dependencies`
  convention from RMarkdown/Quarto), processor integration (how the
  DSL-processor model in `DESIGN.md` extends), security posture for
  in-browser execution.
- **Build executable code blocks.** The build itself; alpha scope
  per the ruling.

---

## Phase 11 — Hardening and quality *(post-alpha; partly standing)*

Bug fixes, the apparatus tags' silent-drop fix, the spec-completeness
audit, test rewires.

**Items:**

- **`buildProperties` doesn't iterate `node.booleans`** *(filed by
  sub-slice 2 of the deferred-vocab work)*. The root-cause fix that
  `<author>` worked around for `+corresponding`.
- **`<data>` migration onto structured-element infrastructure**
  *(filed by `beb2fb3`)*.
- **Replace `integration.test.js`'s hand-mirrored pipeline with a
  shared assembly** *(formerly AUD-17)*.
- **Run a spec-completeness audit against the rebuild-from-docs
  standard.** One-time large pass; future passes will be ordinary
  per-slice coherence checks.

---

## Phase 12 — Vocabulary expansion *(post-alpha)*

Discussion items that, when resolved, become new vocabulary or new
parser surface.

**Items (each gated by its discussion resolution):**

- `<presentation>` / `<slide>` / `<slide-notes>` vocabulary *(formerly
  DF-6)*.
- Compact external-reference syntax (`wiki:`, `doi:`, `arxiv:`,
  `github:`).
- External-link rich previews (build-time metadata fetching).
- Just-in-time math symbol definitions.
- Smart-typography conversions (`--` → en-dash, `---` → em-dash).
- Bare-idiom shortcuts for underline and strikethrough.
- The sigil as a first-class category (canonical sigil registry).
- Hardening the colon-id convention into an explicit spec rule.
- Auditing documented language features against test-fixture coverage.
- The cross-reference type-prefix mismatch warning.
- `<data>` / `<library>` cleanup-pass discussion *(formerly AUD-18)*.
- The qualifying-tag pattern generalized beyond `<table>` *(formerly
  DF-17)*.
- Bibliography heading as a config kwarg *(formerly PG-10)*.
- `<html-passthrough>` spec and implementation *(formerly DF-3)*.

---

## Phase 13 — JATS import *(post-alpha)*

The other direction of the JATS bridge. Deliberately lossy (JATS's
vocabulary is far larger than Layer 1's); a useful on-ramp from the
existing scholarly corpus, not a round-trip guarantee.

Not yet scoped. Filed here as a phase because the project's overall
direction includes it; the work is post-alpha and waits.

---

## Standing items (not phased)

- **Spec-completeness audit follow-on slices.** The audit (Phase 11)
  is one-time; its findings become individual fix slices filed against
  whatever phase they belong to. The audit is a process; its only
  output is backlog items.
- **The unbraced-inline `@` form** *(parked; not on the active
  roadmap)*. Revisit only if/when the bare `@key` affordance is
  wanted.

---

## Cross-document agreement

Every `[alpha]` backlog item names its roadmap phase. Every roadmap
item names its backlog entry. A slice that closes an alpha item
updates this roadmap (the item moves out of "in flight" if it was
there, or the phase exits if the item was the last in the phase) and
removes the entry from `BACKLOG.md`. A slice that adds an alpha item
files it in `BACKLOG.md` and lists it in the appropriate phase here.
The contract is enforced by the coherence check in `CONTRIBUTING.md`.
