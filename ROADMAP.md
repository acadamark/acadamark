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

**Phases 1 and 2 are closed** as of 2026-05-27. Phase 1 (vocabulary
completeness) closed with deferred-vocabulary sub-slice 3; Phase 2
(output handlers and DSL surface) closed with the per-section
footnote slice (Phase 2 had two sub-arcs: the DSL handler bundle
across slices 2a/2b/2c, and per-section footnote collection — both
done). The alpha-tagged vocabulary set has no remaining `[alpha]`
gaps; every alpha-tagged DSL handler dispatches; per-section
footnotes work for the doc33 + doc34 fixtures.

The flat-line of completed work to date is recorded in `STATUS.md`.

The roadmap moves to **Phase 3 next** — frameable elements (the
shared capability across `<fig>`, `<table>`, `<code>`, etc.). The
roadmap's near-term sequence is Phase 3 → Phase 4 → Phase 5, with
Phase 6 (the alpha integration check) closing the milestone. Phase 7
onwards is post-alpha.

---

## Phase 1 — Vocabulary completeness *(alpha — supports line 1)* *(CLOSED)*

Layer 1's vocabulary set must be present and rendering before any
output-producing arc on top of it (handlers, JATS export, render-mode
lowering) can be meaningfully built. The deferred-vocabulary item was
the last gap.

**Items (all done):**

- **Add deferred vocabulary elements** *(formerly DF-13, DF-14, DF-15,
  DF-11b)*. Three sub-slices, all shipped:
  - Sub-slice 1 (scalar/inline) — `13cac93`.
  - Sub-slice 2 (structural blocks: `<dl>`/`<dt>`/`<dd>`,
    `<glossary>`/`<glossary-entry>`, `<details>`/`<summary>`) —
    `c1adfb7`.
  - Sub-slice 3 (theorem family: `<theorem>`, `<lemma>`, `<corollary>`,
    `<proposition>`, `<definition>`, `<example>`, `<remark>`, `<proof>`)
    — 2026-05-27. The theorem family is regular Layer 1 vocabulary; no
    handler dispatch is needed (confirmed by the DSL/long-form parser
    bug fix the same day). Any future enhancement to theorem-family
    rendering (numbering, label rendering, QED, optional-name display)
    is regular-vocabulary work scheduled separately if and when taken
    up — it is not part of Phase 2's handler bundle.
- **Add vocabulary entries for `<meta>` allowlist members and
  `<abstract>`** — done, `b3c8a2c`. Listed here for the roadmap
  reader; not an open item.

**Exit satisfied:** all three deferred-vocabulary sub-slices are in;
`data.js` regenerated and committed at each sub-slice; the
alpha-tagged vocabulary set has no remaining `[alpha]` gaps. The
phase exits.

---

## Phase 2 — Output handlers and DSL surface *(alpha — supports line 1)* *(CLOSED)*

**Closed 2026-05-27.** The Layer 1 vocabulary in Phase 1 fixed *what*
renders; this phase fixed *how* each piece renders. DSL-surface
handlers consumed the deferred vocabulary's entries; per-section
footnote collection completed the notes-placement story.

**Items (all done):**

- **Implement DSL handlers** *(formerly DF-8, DF-9, DF-10)* —
  **done across three sub-slices (2026-05-27):**
  - **Slice 2a** (`091d7c6`) — `<csv>` / `<tsv>` standalone handlers
    (sharing parsers + `renderParsedTable` with `<table>`), plus the
    `<code>` long-form bug fix and `<library>` vocab reconciliation.
  - **Slice 2b** (`297e543`) — `<math>` long-form plus the four
    math-environment tags (`<matrix>`, `<cases>`, `<align>`,
    `<eqnarray>`) via the extended `math.js` handler.
  - **Slice 2c** (this slice) — `<mermaid>` and `<abc>` external DSL
    handlers; emit pass-through markup with a `data-acadamark-dsl`
    marker; rendering is external (CDN at view time or build-time
    pre-render pass). DESIGN.md gained §"DSL handlers: included vs
    external" recording the architectural distinction.

  The original DF-11a `<theorem>` handler was previously bundled here;
  retired by the 2026-05-27 DSL/long-form parser bug fix when theorem
  family was confirmed as regular Layer 1 vocabulary.
- **Implement per-section footnote collection** *(formerly PG-1)* —
  **done 2026-05-27**. Outermost-section collection: for each top-level
  `<section>` in `<article-body>`, foot-placed descendant notes
  (regardless of nesting depth) collect into a `<note-list
  class="footnotes">` at the section's end. Residual notes (end /
  side / foot-notes outside top-level sections) fall through to the
  article-back list. Global numbering preserved.

**Exit satisfied:** every alpha-tagged DSL handler dispatches;
per-section footnotes work for the doc33 + doc34 fixtures. Phase 2
exits.

---

## Phase 3 — Frameable elements *(alpha — supports lines 1 and 2)*

A capability shared by `<fig>`, `<table>`, `<code>`, `<svg>`,
`<mermaid>`, other DSL-registry block elements, plus the generic
`<frame>`. Settled design: optional outline box, optional title (top),
optional caption (bottom); numbering folded into the caption/title
rendering, not a separate field. `<figure>` is an accepted authoring
alias for the canonical `<fig>`, normalized at the lift gate.

The phase runs a **Phase 0 first** to confirm the exact frameable
membership list and any per-member shape divergences before building.
Phase 0 (`cec620c`) recommended a **SPLIT into three sub-slices**
(3a → 3b → 3c) over a single bundled slice; that recommendation
shapes this phase.

**Items, in order:**

- **Frameable-class Phase 0** *(filed by `1d100eb`; closed by
  `cec620c`, 2026-05-27)*. Findings recorded in
  `notes/phase3-frameable-findings.md`: three missing vocab entries
  (`<fig>`, `<svg>`, `<frame>`); proposed shared frameable surface
  (`id`, `title`, `caption`, `border`, `numbered`); recommendation
  for caption-as-content Option A (child-tag with kwarg-form lift);
  bundle-vs-split: SPLIT.
- **Slice 3a — Numbering-registry extension** *(done 2026-05-28)*.
  Extended `NUMBERED_TAGNAMES` to cover the theorem family
  (`<theorem>`/`<lemma>`/`<corollary>`/`<proposition>` on the shared
  `theorem` counter per amsthm "plain" style; `<definition>` and
  `<example>` on their own counters; `<remark>`/`<proof>` stay
  unnumbered) and math envs (long-form `<math>`, `<matrix>`,
  `<cases>`, `<align>`, `<eqnarray>` all join the existing
  `equation` counter). Added the matching `CONFIG_KEY` entries
  (`number-theorems`, `number-definitions`, `number-examples`) to
  the `<config>` allowlist. `DEFAULT_PREFIXES` extended with `cor`
  / `prop`. The math handler's equation-number branch generalized
  to any node with `computedNumber != null`. Code-listing numbering
  was pulled from scope at slice-prompt Q2: `<code-block>` is
  deliberately unnumbered per a G4 ruling (`numbering.js:106-110`)
  and reversing that decision requires its own chat-level ruling.
  Cross-references resolve to "Theorem N" / "Lemma N" / "Eq. N"
  etc.; visible label rendering on theorem-family elements
  themselves ("Theorem 1.") is deferred to slice 3b (the frameable
  build's title rendering naturally absorbs it).
- **Slice 3b — Frameable-class build** *(done 2026-05-28)*. Three
  new vocab entries shipped: `<fig>`, `<svg>`, `<frame>`. `<figure>`
  reconciled as an authoring alias rewriting to `<fig>` at the
  normalize-to-canonical gate (cleanest path; the same gate that
  rewrites sigil tagnames). Shared frameable rendering is implemented
  as a small label-formatting primitive (`lib/frameable.js`'s
  `formatLabel(prefix, number, name?)`) rather than a wrapper
  helper — Q1's investigation found three structurally divergent
  caption-rendering idioms across the existing handlers (inside-table
  `<caption>`, inside-figure `<figcaption>`, sibling-figcaption); a
  uniform wrapper helper would have been the wrong abstraction at
  this granularity. Per-element handlers (figure, table, csv, tsv)
  call the primitive at their existing label-construction sites.
  DSL counter assignments wired into `NUMBERED_TAGNAMES`: csv/tsv
  → table counter; mermaid/abc → figure counter; svg → figure
  counter. `<frame>` deliberately omitted from NUMBERED_TAGNAMES
  this slice (its vocab default is `numbered: false`; opt-in via
  `+numbered` needs handler-level support — bundle into 3c or a
  sibling slice). Theorem-family label rendering bundled into this
  slice per Q3's recommendation: new `handlers/theorem.js` handles
  all 8 family elements; uses the same `formatLabel` primitive to
  prepend "Theorem N (Name)." / "Lemma N." / etc. to the body;
  remark/proof get the unnumbered amsthm-convention "Remark." /
  "Proof." form. New fixture doc36 exercises the build end-to-end.
- **Slice 3c — Caption-as-content (DD-1 / DD-2 implementation,
  formerly AUD-14)**. `<caption>` becomes a child-tag position on
  every frameable element. The `caption=` kwarg form lifts to
  `<caption>` child at the normalize-to-canonical gate. Each
  frameable handler reads the child rather than the kwarg.
  Recursive content parsing handles citations inside captions
  naturally.

**Exits:** every alpha-tagged frameable element renders with the
shared capability; captions accept rich content; deferred numbering
work (theorem family, math envs) is registered and cross-
referenceable.

---

## Phase 4 — Document structuring *(alpha — supports line 1)*

Layer 1's structural reach must include both articles (current) and
books (deferred). `article-structuring.js` currently warns and skips
non-article document types; closing this is the last structural-tier
alpha gap.

**Items, in order:**

- **Build book / book-part document structuring** *(formerly DF-12)*.
  Multi-chapter document structure; book / book-part vocabulary is in
  place, structural plugin needs to handle it.
- **Add integration test and snapshot for `document-9-demo`**
  *(formerly GAP-9)*. The most complex fixture; the dark surface area
  this snapshot covers is high.

**Exits:** book documents render structurally; the doc-9 dark surface
is pinned by snapshot.

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

- **JATS-export Phase 0.** Package siting; the export-stage attribute
  mapper (whether it lifts to core's `mapAttributes(node, vocab,
  emit)` shape now or later); the JATS section-model question recorded
  as deferred in `DESIGN.md`.
- **Build JATS export (`rehypeAcadamarkToJats`)** *(formerly DF-18)*.
  The mapping is mostly mechanical because Layer 1 is JATS-shaped; the
  metadata-defaults policy and the few restructuring cases are the
  real design work.

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
- The tag-form × tag matrix documentation *(formerly AUD-15)*.
- Forward-pointers from governed specs to design directions DD-1..DD-5
  *(formerly AUD-25)*.
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
