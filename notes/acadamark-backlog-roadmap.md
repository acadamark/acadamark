# acadamark — backlog roadmap

**Written:** 2026-05-22. Updated 2026-05-22 to reflect completed work and the
normalization-principle design decision. Companion to
`notes/specified-not-implemented.md` (the full inventory) and the session
handoff. Suggested repo home: `notes/`.

This document organizes the specified-but-not-implemented inventory into a
**dependency-ordered roadmap**. It is ordered by *what depends on what* and by
*how fundamental* an item is — not by difficulty. (GHC executes slices quickly;
staging by difficulty is not useful. Staging by dependency is.)

Every item keeps its inventory id (DF / PG / DS / OQ) so it cross-references
`specified-not-implemented.md`. Dependencies are marked **[verified]** (GHC
code-checked the relationship) or **[inferred]** (the specs imply it; confirm in
the slice's Phase 0).

Per `notes/doc-ownership.md`, this roadmap owns the backlog: what to build, in
what order, and why. Authoritative *status* of an individual DF/PG/DS/OQ item
lives in `notes/specified-not-implemented.md`; AUD item status lives in
`notes/audit-findings.md`. This document points at those for status and does
not re-describe what was done.

---

## How to read this

The backlog is shallow, not deep. Most inventory items are **independent
leaves** — no dependency, do in any order, anytime. Only a few real dependency
chains exist. The roadmap is therefore four layers:

- **Layer 0 — verify first.** One item that may already be done.
- **Layer 1 — foundational.** Items that change the core model or the authoring
  syntax. Things authored or built afterward depend on these being settled, so
  they come first — not because they are hard, but because they are *upstream*.
- **Layer 2 — gated.** Items blocked by a specific decision, by a Layer 1 item,
  or by a piece of architecture that must be built first. They cannot start
  until their gate clears.
- **Layer 3 — free leaves.** No dependencies. Do any of these at any time, in
  any order. This is most of the backlog.

Separately: **doc-staleness (DS-1…DS-5)** is not a feature backlog — it is one
cleanup slice, and it should be done early because every later slice is read
against those docs.

---

## The dependency graph

```
LAYER 0   ✔ PG-13 (closed — test RC-14, commit 411c6b0)

LAYER 1   ✔ @/# SIGIL SEMANTICS (F1, commit c86da33)
(found-     # always-assigns · @ always-refers
 ational)   unifies <ref> and <cite> key syntax

          ✔ DOC-STALENESS SWEEP (F2, commit f00c877)
            interpreter.md, pipeline.md, BUILD.md, interpreter-design.md,
            hover-previews-deferred.md all brought current

LAYER 2   ✔ G1 — INLINE TEX SHORTCUTS (G1a b6304a3 + G1b 99aaa0b)

          NORM — THE NORMALIZATION PASS  ◄─── new architectural piece
            a pipeline stage that rewrites standard markdown-form nodes
            (inlineMath, table, heading, ...) into their canonical
            acadamarkTag form. Principle settled (DESIGN.md design
            direction; notes/idioms.md). Pass itself NOT YET BUILT.
            Needs its own Phase 0. Gates G3.

          G3 — MARKDOWN-FORM MATH / GFM  (DF-22, DF-20)
            ├── gated by NORM (math and tables ride on the
            │   normalization pass; they are not standalone
            │   plugin installs anymore)
            └── math half also gated by the math-coverage
                investigation (formerly "OQ-1"): is remark-math's
                tokenizer an adequate wheel, or must acadamark
                supersede the lexer for some math forms?

          G2 — RENDER-MODE LOWERING (DF-19)   ◄─── OUT OF CURRENT SCOPE
            display-target-three on the display ladder (see DESIGN.md).
            Downstream; nothing depends on it. Still gated by OQ-2 when
            it is eventually picked up. Not part of the current
            "finish Layer 2" arc.

          G4 — CROSS-REFERENCE REGISTRATION  (AUD-09, PG-6, PG-7)
            adjacent to F1 — same subsystem, NOT blocked by it.
            section-id half done (R2). code-block half needs its own
            Phase 0 (a representation question — see G4 below).

LAYER 3   independent leaves — no dependencies, any order:
(free)    PG-3, PG-4, PG-5   (<ref> attribute handling)
          PG-1, PG-2          (per-section / margin notes)
          PG-8, PG-9, PG-10, PG-11
          DF-2 (strict mode), DF-3 (html-passthrough — needs spec first)
          DF-8/9/10/11 (DSL handlers — grouped, see below)
          DF-13/14/15 (deferred vocab elements — grouped)
          DF-21 (self-closing), DF-17 (qualifying-tag generalization)
          DF-5 (multi-column)
          pipeline.md note-numbering underexplanation (doc-clarity, see Layer 3)

ARCH      DF-18 (JATS export), DF-4 (multi-file), DF-12 (book types)
(its own  — each a multi-slice project; DF-19 also lands here once
 arc)       OQ-2 is decided. Sequence by intent, not dependency.

DEFERRED  the unbraced-inline @ form (prose-grammar change) — explicitly
          parked; revisit only if/when the bare @key affordance is wanted.
```

---

## Layer 0 — verify first

### ~~PG-13 — markdown pass-through escapes inside named-tag content~~ **[CLOSED]**

**Closed (commit `411c6b0`).** Verified resolved by test RC-14 in
`test-recursive.js`. Not a backlog item. See `specified-not-implemented.md`.

---

## Layer 1 — foundational

These come first because they are *upstream* of other work — a syntax change or
a model change that later work is authored against. Both Layer 1 items are now
complete.

### ~~F1 — The `@`/`#` sigil-semantics slice~~  **[IMPLEMENTED]**

**Status:** Complete (commit `c86da33`). `#` always assigns an id; `@` always
refers to one. `<ref>` and `<cite>` share `@key` syntax. Detail in
`specified-not-implemented.md` (DF-7, adopted-as-F1).

**Still deferred:** the unbraced-inline `@` form. See "Explicitly deferred."

### ~~F2 — Doc-staleness sweep~~  **[IMPLEMENTED]**

**Status:** Complete (commit `f00c877`). DS-1…DS-5 resolved.

---

## Layer 2 — gated items

These are blocked by a decision, a Layer 1 item, or a piece of architecture that
must be built first. They cannot meaningfully start until the gate clears.

### ~~G1 — Inline TeX shortcuts  *(DF-1, with PG-12)*~~ **[IMPLEMENTED]**

**Status:** Complete. G1a (`b6304a3`) grammar surface; G1b (`99aaa0b`)
top-level-prose surface. DF-1 and PG-12 resolved. The two-surface structure
(Peggy grammar surface + micromark top-level-prose surface) is on record as a
recurring shape for parser slices.

### NORM — The normalization pass  **[new — architectural prerequisite for G3]**

**What it is.** A pipeline stage that rewrites standard markdown-form mdast
nodes — `inlineMath`, `table`, `heading`, and so on — into their canonical
`acadamarkTag` equivalents, before any structural or semantic plugin runs.
After the pass, every downstream plugin sees one node type per construct.

**Why it exists.** The "Markdown forms are shorthand for the canonical
acadamark form" design direction (`DESIGN.md`, reconciled in detail in
`notes/idioms.md`) settled the principle: delegate the lexer to remark, but
own the node identity. The normalization pass is the implementation of that
principle. The principle is settled; the pass is **not yet built** — nothing
like it exists in the pipeline today.

**Why it is its own item, and a gate.** It is a new architectural object, not
a feature. Math (DF-22) and GFM tables (DF-20) are no longer "install a plugin
and thread it in" — they are constructs that *ride on* the normalization pass.
The pass must exist first. Per the project's slice rhythm, a new architectural
piece earns its own Phase 0: where it sits in the pipeline, what it walks, how
it rewrites nodes, what node types are in its initial scope.

**Placement note.** NORM is foundational *for G3*, not foundational *for the
project* — it does not change the authoring syntax or the core model, it
realizes a principle the syntax already implies. It therefore sits in Layer 2
as an explicit gate, rather than reopening the (completed) Layer 1 tier.

**Scope of the principle vs. scope of the pass.** The principle is universal in
intent — it governs every markdown/acadamark overlap. The pass is implemented
incrementally — it grows one construct at a time. The initial NORM slice need
not cover every overlap at once; it must establish the stage and cover the
constructs G3 needs (math, tables). Headings, emphasis, links, lists follow as
the pass grows. A construct not yet normalized is a not-yet-done item, never a
decision that it was meant to stay a separate path.

**Action:** Phase 0 for the normalization pass — architecture and initial
scope. Then a NORM implementation slice. Then G3.

### G3 — Markdown-form math / GFM authoring  *(DF-22, DF-20)*  **[verified gate: NORM]**

**What it is.** Bare `$x$` / `$$x$$` and bare GFM pipe tables, working as
shorthand for `<$ ... $>` / `<$$ ... $$>` and `<table>` — i.e. authored in
markdown form, normalized to the canonical acadamark node, rendered by the one
existing path for that construct.

**Gates.**

1. **NORM must exist.** Under the normalization principle, G3 is not a
   standalone plugin install. `remark-math` and `remark-gfm` provide the
   *lexer* (they find `$x$` and pipe tables); the normalization pass then
   rewrites their output into canonical acadamark nodes. Without NORM there is
   no canonical-node target to normalize into. **[verified — design]**

2. **The math-coverage investigation (formerly "OQ-1").** OQ-1 was previously
   filed as "an hour of thought and a design note." That framing is **retired.**
   The design half of OQ-1 — whether bare `$x$` should be acadamark-canonical —
   is settled by the normalization principle (yes; it normalizes to the `$`
   node). What remains is a *code-and-coverage* question, answered by a Phase 0,
   not a chat decision: is `remark-math`'s tokenizer an adequate wheel for the
   math forms acadamark wants, or must acadamark supersede the lexer for some
   forms? The Phase 0 deliverable is a three-column table — acadamark's intended
   math surface, `remark-math`'s tokenizer coverage, and acadamark's *existing*
   DSL-math coverage (`<matrix>`, `<cases>`, `<align>`, `<eqnarray>`) — ending
   in an adequacy verdict. It also confirms-or-corrects the lexer-supersession
   claim `notes/idioms.md` currently makes about `remark-math` being
   delimiter-only.

**Sub-structure.** GFM tables (DF-20, AUD-tracked AUD-06) carry no open
question once NORM exists — `remark-gfm` is a clean lexer for them. Math
(DF-22) carries the math-coverage investigation. The two may still be split
into separate slices, but both now sit behind NORM; the earlier "G3a clean /
G3b decision" framing is superseded.

**Action:** math-coverage Phase 0 (can run in parallel with the NORM Phase 0 —
it informs G3's math half, not NORM itself). Then NORM. Then G3.

### G2 — Render-mode lowering  *(DF-19, gated by OQ-2)*  **[OUT OF CURRENT SCOPE]**

Render-mode lowering (`<section-title>` → `<h1>`, etc.) is **display-target-three**
on the display ladder (see `DESIGN.md`, "Layer 1 is canonical; display is a
downstream ladder"). It is a downstream display concern: nothing else depends
on it, and it has been explicitly set aside for the current "finish Layer 2"
arc.

When it is eventually picked up it remains gated by **OQ-2** (the
`<article-title>` + `<section-title>` heading-level question — see
`notes/layer1-naming.md` open decisions). OQ-2 is a short design note, to be
made *when render mode is scoped*, not before — a decision made far ahead of
its implementation tends to be re-litigated when implementation starts.

DF-19 therefore lands in the Architecture tier, not the current Layer 2 arc.

### G4 — Cross-reference registration  *(AUD-09, PG-6, PG-7)* — adjacent to F1, not blocked by it

PG-6 (code-block ids unreferenceable), PG-7 (auto-generated note ids not in the
label index), and the open half of AUD-09 are all about *what gets registered
and is resolvable* — independent of the `@`/`#` sigil and independent of NORM.

Section registration is done (R2). The **code-block half needs its own Phase 0**:
a plain fenced code block is a native mdast `code` node with no id field the
discovery walk can see, so registering code blocks for cross-reference depends
on a representation question (is only the shorthand-wrapped `<code #code:… | …>`
form referenceable, or should plain fenced `code` nodes also carry colon-ids?).
See AUD-09 in `notes/audit-findings.md`.

**Action:** the section/note-id parts (PG-6 partial, PG-7) may be buildable
directly; the code-block part needs a Phase 0 first.

---

## Layer 3 — free leaves (no dependencies, any order)

None of these blocks or is blocked by anything. Pick by appetite.

**`<ref>` attribute handling — PG-3, PG-4, PG-5.** `format`/`type` kwargs
ignored (PG-3); author pipe-text ignored (PG-4); `+link`/`+preview`/`+title`
flags ignored (PG-5). Effectively **one slice** — "make `<ref>` honor its parsed
attributes." Safe to do independently of F1 and of NORM.

**Notes — PG-1, PG-2.** Per-section footnote collection (PG-1); margin-positioned
sidenotes (PG-2). Both are placement refinements; notes otherwise work.

**Citation/config small gaps — PG-8, PG-9, PG-10, PG-11.** Multi-key cite
ordering (PG-8); nested `<config>` not read (PG-9); hardcoded bibliography
heading (PG-10 — a config kwarg, very small); trailing-whitespace-before-EOL
treated as inline (PG-11).

**Parser leaves — DF-21, DF-17.** Self-closing `<tag />` for DSL-registry tags
(DF-21, AUD-tracked AUD-08); generalizing the qualifying-tag pattern beyond
`<table>` (DF-17 — note: already works *for* `<table>`).

**Strict mode — DF-2.** Bounded; disables markdown idioms. Under the
normalization model, strict mode is the mode in which the normalization pass
has nothing to do (no markdown-form nodes are produced). Independent leaf, but
naturally touched after NORM exists.

**HTML passthrough — DF-3.** `<html-passthrough>` — needs a *spec* written
first; it is "planned, not yet specified." A design step precedes the code.

**DSL handlers — DF-8, DF-9, DF-10, DF-11 (grouped).** `<csv>`/`<tsv>` standalone
(DF-8, AUD-05/07); `<mermaid>`/`<abc>` (DF-9); math environments
`<matrix>`/`<cases>`/`<align>`/`<eqnarray>` (DF-10); `<theorem>` handler (DF-11a).
**Treat as one body of work, not individual items** — each is "write a handler,"
all additive, none blocks anything. Note DF-10 (the math environments) is the
"acadamark covers ground remark never covered" case from the lexer-supersession
discussion in `notes/idioms.md` — it is independent of NORM and of G3's math
half, which concern delimiter-shaped math only. (DF-11b — the
`<proof>`/`<lemma>`/etc. *vocabulary* — needs a vocab design pass first.)

**Deferred vocabulary elements — DF-13, DF-14, DF-15 (grouped).** Metadata
(`<keywords>`, `<publication-date>`); definition lists (`<dl>`/`<dt>`/`<dd>`);
inline-semantic (`<abbr>`, `<term>`, `<glossary>`, `<glossary-entry>`); plus the
theorem-family vocab (DF-11b). All "to be specified" — each needs a short vocab
spec, then a schema entry. Group them; do as a batch.

**Multi-column display — DF-5.** Deferred-feature doc exists; render-mode
concern. Independent leaf, low-priority unless a publication target needs it.

**pipeline.md note-numbering explanation — doc-clarity leaf.** In `pipeline.md`
§10.5, the explanation of how a note gets its number is incomplete: it implies
`fillNumbering` assigns note numbers, but `fillNumbering` is a no-op for notes —
notes are numbered by `numberRegistry()` at the start of the apply-numbers step.
A one-paragraph clarification, no code change.

---

## Architecture tier — large, each its own arc

Multi-slice projects. Sequence these by *intent* (what acadamark is for next),
not by dependency — they are mutually independent.

- **DF-18 — JATS export** (`rehypeAcadamarkToJats`). The vocabulary is
  JATS-aligned by design (`jats_counterpart` on every entry); this is the
  payoff. A `BUILD.md` Phase-3 piece.
- **DF-19 — render-mode lowering.** Display-target-three on the display ladder.
  Lands here once OQ-2 (its gate) is decided. Set aside for the current arc.
- **DF-4 — multi-file authoring.** `acadamark.yml` + `<include>`; project-wide
  registries. A real architectural extension.
- **DF-12 — book / book-part document structuring.** Vocabulary exists;
  `article-structuring.js` currently warns and skips non-article types.

---

## Explicitly deferred — parked

**The unbraced-inline `@` form.** `…as shown (@fig:priority)…` with no `<ref>`
wrapper. The half of the `@`-sigil proposal NOT adopted in F1. A grammar-wide
change: `@` significant in prose, `\@` escaping, prose-fixture churn. Parked
deliberately. Not on the active roadmap.

---

## Suggested order (a default, not a mandate)

Dependency-respecting; within a layer, order is free:

**Done:** ~~PG-13 verify~~ ✔ · ~~F2 doc-staleness sweep~~ ✔ · ~~F1 `@`/`#` sigil
semantics~~ ✔ · ~~G1 inline TeX shortcuts~~ ✔ · ~~normalization principle into
the spec~~ ✔ (DESIGN.md design direction + `notes/idioms.md`)

**Next:**

1. **Math-coverage Phase 0** — the read-only investigation that was formerly
   "OQ-1." Produces the three-column adequacy table and confirms-or-corrects
   the lexer-supersession claim in `notes/idioms.md`. Can run in parallel with
   step 2.
2. **NORM Phase 0** — architecture and initial scope of the normalization pass.
3. **NORM implementation slice** — build the pass; cover the constructs G3
   needs (math, tables).
4. **G3** — markdown-form math and GFM tables, riding on NORM. May split into a
   tables slice and a math slice; both sit behind NORM.
5. **G4** — cross-reference registration. The code-block half needs its own
   Phase 0 first (representation question); the section/note-id parts may be
   direct.
6. **Layer 3 leaves** — any time, by appetite. The `<ref>`-attributes slice
   (PG-3/4/5) and PG-10 are the easy satisfying ones.
7. **Architecture tier** — when the output/format direction is known. DF-19
   (render mode) lands here once OQ-2 is decided.

The hard rules: NORM before G3; the math-coverage Phase 0 before G3's math
half; OQ-2 before DF-19. Everything else is preference.
