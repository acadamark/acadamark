# acadamark — backlog roadmap

**Written:** 2026-05-22. Companion to `notes/specified-not-implemented.md` (the
full inventory) and the session handoff. Suggested repo home: `notes/`.

This document organizes the 35-item specified-but-not-implemented inventory into
a **dependency-ordered roadmap**. It is ordered by *what depends on what* and by
*how fundamental* an item is — not by difficulty. (GHC executes slices quickly;
staging by difficulty is not useful. Staging by dependency is.)

Every item keeps its inventory id (DF / PG / DS / OQ) so it cross-references
`specified-not-implemented.md`. Dependencies are marked **[verified]** (GHC
code-checked the relationship) or **[inferred]** (the specs imply it; confirm in
the slice's Phase 0).

---

## How to read this

The backlog is shallow, not deep. Most of the 35 items are **independent
leaves** — no dependency, do in any order, anytime. Only a few real dependency
chains exist. The roadmap is therefore four layers:

- **Layer 0 — verify first.** One item that may already be done.
- **Layer 1 — foundational.** Items that change the core model or the authoring
  syntax. Things authored or built afterward depend on these being settled, so
  they come first — not because they are hard, but because they are *upstream*.
- **Layer 2 — gated.** Items blocked by a specific decision or by a Layer 1
  item. They cannot start until their gate clears.
- **Layer 3 — free leaves.** No dependencies. Do any of these at any time, in
  any order. This is most of the backlog.

Separately: **doc-staleness (DS-1…DS-5)** is not a feature backlog — it is one
cleanup slice, and it should be done early because every later slice is read
against those docs.

---

## The dependency graph

```
LAYER 0   PG-13 (verify — may already be fixed)
              │
              ▼ (if real, becomes a Layer 3 leaf; if not, drops off)

LAYER 1   ┌─────────────────────────────────────────────┐
(found-   │  @/# SIGIL SEMANTICS                          │
 ational) │  # always-assigns · @ always-refers           │
          │  unifies <ref> and <cite> key syntax          │
          │  (folds in DF-7 + PG-12-adjacent)             │
          └───────────────────┬───────────────────────────┘
                              │ everything authored after
                              │ uses @-form; parser grammar
                              │ changes; fixtures migrate
                              ▼
          ┌─────────────────────────────────────────────┐
          │  DOC-STALENESS SWEEP  (DS-1…DS-5)             │
          │  not blocked by anything — do early so the   │
          │  docs the next slices are read against are   │
          │  true                                         │
          └───────────────────────────────────────────────┘

LAYER 2   OQ-1 ───────────────▶ DF-22, DF-20   (math/gfm idioms)
(gated)   OQ-2 ───────────────▶ DF-19          (render-mode lowering)
          DF-1 ⟺ PG-12         (one slice — escape rules are part
                                of the inline-TeX feature)
          cross-ref registration: AUD-09 / PG-6 / PG-7
                                (adjacent to Layer 1 — same subsystem,
                                 NOT blocked by it; can ride along or follow)

LAYER 3   independent leaves — no dependencies, any order:
(free)    PG-3, PG-4, PG-5   (<ref> attribute handling)
          PG-1, PG-2          (per-section / margin notes)
          PG-8, PG-9, PG-10, PG-11
          DF-2 (strict mode), DF-3 (html-passthrough — needs spec first)
          DF-8/9/10/11 (DSL handlers — grouped, see below)
          DF-13/14/15 (deferred vocab elements — grouped)
          DF-21 (self-closing), DF-17 (qualifying-tag generalization)
          DF-5 (multi-column)

ARCH      DF-18 (JATS export), DF-4 (multi-file), DF-12 (book types)
(its own  — each a multi-slice project; DF-19 also lands here once
 arc)       OQ-2 is decided. Sequence by intent, not dependency.

DEFERRED  the unbraced-inline @ form (prose-grammar change) — explicitly
          parked; revisit only if/when the bare @key affordance is wanted.
```

---

## Layer 0 — verify first

### PG-13 — markdown pass-through escapes inside named-tag content

GHC's own note: this *may already be resolved* by `remarkRecursiveContent`. The
stored `\*`-style escapes are meant to be processed when content is re-fed
through remark — which now happens. **Action:** one dedicated test. If it passes,
PG-13 is closed (not a backlog item at all). If it fails, PG-13 is a Layer 3
leaf. Do this before anything else — it is minutes of work and it removes a
phantom item.

---

## Layer 1 — foundational

These come first because they are *upstream* of other work — a syntax change or
a model change that later work is authored against.

### F1 — The `@`/`#` sigil-semantics slice  *(folds in DF-7)*  **[IMPLEMENTED]**

**Status:** Complete. Committed as a single slice. Clean break (no alias).
`#` assigns ids; `@` refers to them. All fixtures migrated. See commit message
for full change inventory.

**Decision (made):** `#` ALWAYS assigns an id; `@` ALWAYS refers to one.
Universal rule, no exceptions.

**Scope:**
- `@`-prefixed identifiers recognized in `<ref>` and `<cite>` attribute
  positions.
- `<cite>` migrates from positional keys (`<cite smith2023>`) to `@`-keys
  (`<cite @smith2023>`). This unifies `<ref>` and `<cite>` key syntax — they
  become the same gesture. Touches `cite-resolution.js` key extraction, not
  only `ref-resolution.js`.
- `#`-as-reference-marker (`<ref #fig:…>`) is removed or kept as a deprecated
  alias — **Phase 0 decision** (the proposal leans clean-break "while the
  system is small").
- Every fixture and real document migrates `<ref #…>` → `<ref @…>` and
  `<cite key>` → `<cite @key>`.

**Why foundational:** it is a syntax change. Everything authored after it uses
the `@`-form, and it touches the parser grammar. Doing it early means fewer
documents to migrate later.

**Why it is bounded (not the whole `@` proposal):** `@` becomes significant only
in *tag attribute positions*, NOT in prose. The unbraced-inline form
(`…shows (@fig:priority)…` with no tag) is explicitly **deferred** — that one is
a grammar-wide prose change with `\@` escaping. F1 is the two-thirds of the
proposal that carries no prose-grammar cost.

**Phase 0 questions for this slice (two):**
1. `#`-as-reference: clean break, or deprecated alias for a transition period?
2. Multi-key `<cite>`: the bracketed-list form — does `<cite [smith, jones]>`
   become `<cite [@smith, @jones]>` (each key marked) or `<cite @[smith, jones]>`
   (list marked once)? The proposal predates list-form thinking; decide here.

**Correctness note:** this is a syntax-migration slice. The fixture diff is
**not** empty — fixtures change. It needs output/visual verification, unlike the
R1–R4 output-neutral slices.

**Supersedes inventory item:** DF-7. Note DF-7 in `specified-not-implemented.md`
as "adopted as F1 (attribute-position only); unbraced-inline form deferred."

### F2 — Doc-staleness sweep  *(DS-1, DS-2, DS-3, DS-4, DS-5)*

Not a feature; one cleanup slice. Update `notes/interpreter.md` and
`notes/pipeline.md` to the post-R4 12-step pipeline (they describe the
pre-refactor 9-plugin chain — DS-1, DS-2). Update the `BUILD.md` slice table to
reflect that slices 3–7 are implemented (DS-3). DS-4 (`interpreter-design.md`
diagram) and DS-5 (`hover-previews-deferred.md`) are AUD-tracked (AUD-02, AUD-03)
— reconcile them in the same pass.

**Why early, though nothing depends on it mechanically:** stale architecture
docs mislead whoever reads them to orient — including future slice work. Fixing
them early makes every later slice more reliable. Low effort, high leverage.

---

## Layer 2 — gated items

These are blocked by a decision or a Layer 1 item. They cannot meaningfully
start until the gate clears.

### G1 — Inline TeX shortcuts  *(DF-1, with PG-12)* **[verified]**

`^{…}` → `<sup>`, `_{…}` → `<sub>`. **DF-1 and PG-12 are one slice** — PG-12
(escape behavior of `^ _ { }`) is *part of* the inline-TeX feature, not separate;
the inventory says so directly ("depends on inline-TeX shortcuts feature"). The
spec (`inline-tex-shortcuts-spec.md`) is decision-complete. `<sup>`/`<sub>` vocab
entries already exist with `interpreter_strategy: schema`, so the moment the
parser emits them they render — **the gap is parser-only.** Not blocked by F1;
listed in Layer 2 only because of the internal DF-1/PG-12 coupling. A clean
bounded slice; good "real feature" candidate.

### G2 — Render-mode lowering  *(DF-19, gated by OQ-2)* **[verified]**

Render-mode lowering (`<section-title>` → `<h1>`, etc.) **cannot be built until
OQ-2 is decided** — the `<article-title>` + `<section-title>` heading-level
question. Decision blocks feature. **Action:** settle OQ-2 first (a short design
note), then DF-19 becomes an architecture-tier slice. Per-element lowering maps
already exist in the vocab files.

### G3 — Math / GFM authoring idioms  *(DF-22, DF-20, gated by OQ-1)* **[inferred]**

Whether bare `$x$` and bare `| pipe | tables |` work inside recursive parsing
depends on OQ-1 — the undecided question of installing `remark-math` /
`remark-gfm` and threading them into the inner recursive-content pipeline.
**Action:** decide OQ-1, then DF-22 and DF-20 are bounded. DF-20 is AUD-tracked
(AUD-06). Until OQ-1 is decided these cannot be scoped.

### G4 — Cross-reference registration  *(AUD-09, PG-6, PG-7)* — adjacent to F1, not blocked by it

PG-6 (code-block ids unreferenceable), PG-7 (auto-generated note ids not in the
label index), and the open half of AUD-09 are all about *what gets registered
and is resolvable* — independent of the `@`/`#` sigil. They are in the same
cross-reference subsystem as F1 but are **not blocked by it** and do not block
it. They can ride along with the F1 slice (same subsystem, natural to touch
together) or follow it. Recommended: fold into or immediately after F1, since
F1's Phase 0 is already reading the cross-reference code.

---

## Layer 3 — free leaves (no dependencies, any order)

None of these blocks or is blocked by anything. Pick by appetite.

**`<ref>` attribute handling — PG-3, PG-4, PG-5.** `format`/`type` kwargs
ignored (PG-3); author pipe-text ignored (PG-4); `+link`/`+preview`/`+title`
flags ignored (PG-5). Effectively **one slice** — "make `<ref>` honor its parsed
attributes." **Confirmed safe to do independently:** F1 keeps `<ref>` as the
construct (only its id-marker changes from `#` to `@`), so this work is not
superseded by the `@` redesign.

**Notes — PG-1, PG-2.** Per-section footnote collection (PG-1); margin-positioned
sidenotes (PG-2). Both are placement refinements; notes otherwise work.

**Citation/config small gaps — PG-8, PG-9, PG-10, PG-11.** Multi-key cite
ordering (PG-8); nested `<config>` not read (PG-9); hardcoded bibliography
heading (PG-10 — a config kwarg, very small); trailing-whitespace-before-EOL
treated as inline (PG-11).

**Parser leaves — DF-21, DF-17.** Self-closing `<tag />` for DSL-registry tags
(DF-21, AUD-tracked AUD-08); generalizing the qualifying-tag pattern beyond
`<table>` (DF-17 — note: already works *for* `<table>`).

**Strict mode — DF-2.** Bounded; disables markdown idioms. Independent.

**HTML passthrough — DF-3.** `<html-passthrough>` — note this one needs a *spec*
written first; it is "planned, not yet specified." A design step precedes the
code.

**DSL handlers — DF-8, DF-9, DF-10, DF-11 (grouped).** `<csv>`/`<tsv>` standalone
(DF-8, AUD-05/07); `<mermaid>`/`<abc>` (DF-9); math environments
`<matrix>`/`<cases>`/`<align>`/`<eqnarray>` (DF-10); `<theorem>` handler (DF-11a).
**Treat as one body of work, not individual items** — each is "write a handler,"
all additive, none blocks anything. Best done as a batch when a concrete
document needs them. (DF-11b — the `<proof>`/`<lemma>`/etc. *vocabulary* — needs
a vocab design pass first; see below.)

**Deferred vocabulary elements — DF-13, DF-14, DF-15 (grouped).** Metadata
(`<keywords>`, `<publication-date>`); definition lists (`<dl>`/`<dt>`/`<dd>`);
inline-semantic (`<abbr>`, `<term>`, `<glossary>`, `<glossary-entry>`); plus the
theorem-family vocab (DF-11b). All "to be specified" — each needs a short vocab
spec, then a schema entry. Group them; do as a batch.

**Multi-column display — DF-5.** Deferred-feature doc exists; render-mode
concern. Independent leaf, but low-priority unless a publication target needs it.

---

## Architecture tier — large, each its own arc

Multi-slice projects. Sequence these by *intent* (what acadamark is for next),
not by dependency — they are mutually independent.

- **DF-18 — JATS export** (`rehypeAcadamarkToJats`). The vocabulary is
  JATS-aligned by design (`jats_counterpart` on every entry); this is the
  payoff. A `BUILD.md` Phase-3 piece.
- **DF-19 — render-mode lowering.** Lands here once OQ-2 (its gate) is decided.
- **DF-4 — multi-file authoring.** `acadamark.yml` + `<include>`; project-wide
  registries. A real architectural extension.
- **DF-12 — book / book-part document structuring.** Vocabulary exists;
  `article-structuring.js` currently warns and skips non-article types.

---

## Explicitly deferred — parked

**The unbraced-inline `@` form.** `…as shown (@fig:priority)…` with no `<ref>`
wrapper. This is the half of the `@`-sigil proposal NOT adopted in F1. It is a
grammar-wide change: `@` significant in prose, `\@` escaping, prose-fixture
churn. Parked deliberately. Revisit only if/when the bare-`@key` affordance is
actively wanted. Not on the active roadmap.

---

## Suggested order (a default, not a mandate)

Dependency-respecting; within a layer, order is free:

1. **PG-13 verify** — minutes; removes a phantom item.
2. **F2 doc-staleness sweep** — early, so later slices read true docs.
3. **F1 `@`/`#` sigil semantics** — the foundational syntax change; fold in
   **G4** (cross-ref registration) since F1's Phase 0 is already in that code.
4. **G1 inline TeX** (DF-1+PG-12) — the bounded "real feature."
5. **Decisions: OQ-1 and OQ-2** — short design notes that unblock G2 and G3.
6. **Layer 3 leaves** — any time, by appetite; the `<ref>`-attributes slice
   (PG-3/4/5) and PG-10 are the easy satisfying ones.
7. **Architecture tier** — when you know which output/format direction matters
   most.

The only hard rules in that list are: PG-13 before treating it as real; OQ-1
before G3; OQ-2 before DF-19. Everything else is preference.
