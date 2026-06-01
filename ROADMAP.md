# enscribe — roadmap

The roadmap is the project's **linear narrative**. It names the phases the
project moves through, the items inside each phase in build order, and
the dependencies between them. **Alpha is a milestone along the
roadmap, not the only horizon** — the phases continue past it.

The roadmap is deliberately small. Item detail (rationale, history, file
paths, design tensions) lives in `BACKLOG.md`. Each open roadmap item
cross-references its backlog entry; each milestone-tagged backlog entry
(`[alpha]`, `[release]`) cross-references its roadmap phase. Completed
phases are stated briefly — the slice-by-slice history is in the commit
log, not here.

For the slice-completion rule that keeps the roadmap and the backlog
agreeing, see the coherence check in `CONTRIBUTING.md`.

---

## The alpha milestone — what we aimed at *(closed)*

The alpha release demonstrably included five things:

1. The **Layer 1 custom-HTML elements** that render a rich document.
2. **Canonical enscribe shorthand** authoring that form.
3. **Further shorthands (sigils) and markdown idioms** reducing to it.
4. **JATS ⇔ Layer 1** conversion.
5. **Enscribe ⇔ Layer 1** conversion.

Alpha **closed 2026-05-29** (`4633445`); each line was verified against
the fixture corpus, with the per-line acceptance evidence in
`notes/alpha-acceptance-mapping.md`. Terminology (Layer 1, canonical
enscribe, sigils, markdown idioms, strict mode) is defined in `DESIGN.md`
§"Layered model and terminology."

---

## The v0.1.0 release — what we are aiming at

With alpha closed, the live milestone is the **v0.1.0 public release**.
The version is SemVer with a patch component, so a `0.1.1` bugfix release
can follow without disturbing the `0.1` minor line.

The release demonstrably includes five things:

1. **Bidirectional JATS conversion.** Layer 1 → JATS XML shipped in
   Phase 5; the release adds the reverse direction — JATS → Layer 1
   import (Phase 13).
2. **Display features for end-readers:** a table-of-contents sidebar,
   single-chapter-at-a-time book navigation, and a wider set of themes
   (the release-blocking subset of Phase 8).
3. **A client-side rendering library:** Layer 1 rendering packaged for
   browser use, carrying no JATS capability (the JATS work stays
   Node-side). An in-browser editor/viewer falls out of this library as
   an example application, shipped as a documented demo, not a standalone
   phase.
4. **A comprehensive demonstrative fixture:** a high-quality demo built
   against the render-quality spec, serving as both the project's manual
   and a render-regression fixture.
5. **A command-line tool.** The `@enscribejs/cli` package ships the
   `enscribe` command — `render`, `export-jats`, `import-jats`, `lift`,
   and `lower`. (`enscribe import`, the pandoc bridge, is post-release.)

The **release-blocking phases** are Phase 8 (the display-features subset
above), Phase 13 (JATS import — now closed), and Phase 14 (packaging). The
other post-alpha phases — 7 (lift-and-lower), 9 (multi-file authoring), 10
(executable code blocks), 11 (hardening), 12 (vocabulary expansion) —
are **post-release**.

Like alpha, the release is an **overlay** on the phase sequence, not a
renumbering: phase numbers are stable identity references across the
project's commits, specs, and backlog, so release-blocking phases keep
their numbers and are marked release-blocking in place.

---

## How the roadmap is organized

Phases are ordered by dependency where dependencies exist, and by natural
sequencing where they do not. Each phase carries a short statement of
**what it is** and **which milestone it serves**, the **items** inside it
(each cross-referencing a `BACKLOG.md` entry), and any **dependencies**.
Items inside a phase are listed in build order where one must precede
another; otherwise they are independently pickable.

---

## Current position

Alpha is closed; the **v0.1.0 release** is the live milestone.
**Phase 13 (JATS import) is now closed** — the bidirectional JATS bridge
works end to end, demonstrated by a real published article imported onto the
docs site. The release-blocking work that remains is:

- **Phase 8 — display features** (table-of-contents sidebar,
  single-chapter book navigation, more themes). Not started; gets a
  Phase 0 to scope where the UI code sits.
- **Phase 14 — packaging.** The client-side library, the in-browser
  editor demo, the docs-site content arc (now seven pages, including the
  imported-article demo), the render-quality spec, and the render-quality
  bug-fix arc have all landed. The CLI shipped here too. Remaining:
  fixture-corpus consolidation + the comprehensive demonstrative fixture,
  generated `.d.ts` types, and `npm publish`.

Phases 7, 9, 10, 11, and 12 are **post-release**.

---

## Phase 5 — JATS export *(alpha — line 4) · CLOSED 2026-05-28*

Complete. The Layer 1 → JATS XML bridge: full export of articles
(JATS 1.3 Archiving) and books (BITS 2.0), with structured bibliographies,
cross-references, footnotes, math, the theorem family, and external DSLs,
and DTD-validated output when `xmllint` is on PATH. Lives in
`@enscribejs/jats-export` (`enscribeToJats`). Built in four slices
(5a–5d) behind its own Phase 0 (`notes/phase5-jats-export-findings.md`).

---

## Phase 6 — Alpha integration check *(alpha) · CLOSED 2026-05-29*

Complete. A closing verification pass — not new work — that the
five-point alpha definition demonstrably holds. Each line was checked
against existing fixtures (mapping in `notes/alpha-acceptance-mapping.md`),
and a cross-feature stress fixture (`doc-44`) exercises books,
bibliography, external DSLs, the theorem family, per-chapter footnotes,
math in all three forms, and frameables in one monograph. **Alpha
milestone reached.**

---

## Phase 7 — Lift-and-lower completeness *(post-release)*

The lift gate at `packages/enscribe-interpreter/src/plugins/normalize-to-canonical.js`
is the single home for normalizing all authored forms to canonical. Alpha
covered the authoring direction; this phase fills in the lowering
direction (Layer 1 → canonical-named or canonical-sigil).

The **lowering tooling already exists** — `enscribe lift` and `enscribe
lower` (in `@enscribejs/cli`) deliver Layer 1 → canonical and canonical →
sigils/markdown. What remains for this phase is the formal round-trip
**spec** (which deviations are sanctioned, what "lossless" means per
register) and **strict mode** *(formerly DF-2)* — the configuration in
which markdown idioms produce errors rather than reducing.

---

## Phase 8 — Display targets *(partly release-blocking)*

The display ladder beyond the default Layer 1 + CSS target. Three display
features are **release-blocking** for v0.1.0; the rest is post-release.

**Release-blocking display features (v0.1.0):**

- **Table-of-contents sidebar** *(Slice 1 — done)*. A build-time, opt-in
  navigable ToC generated from the section / chapter structure, with a
  responsive layout (sticky sidebar on desktop, a no-JS `<details>` collapse on
  narrow), shipped on the docs-site Authoring Guide. Non-ToC documents stay
  byte-identical.
- **Single-chapter-at-a-time book view.** A book reading mode showing one
  chapter at a time with chapter-to-chapter navigation.
- **Additional themes.** A wider set of display themes beyond the default.

These three are net-new and UI-shaped in a way the project has not built
before. **Phase 0 is done** (`notes/phase8-display-features-findings.md`):
verdict *proceed* (neither stop-condition fires — the ToC is an opt-in layout
that leaves non-ToC documents byte-identical, and book chapters already render
as clean `<book-part>` siblings). The findings scope ToC generation
(build-time, with section-id assignment for anchorless sections), chapter
navigation (JS over `book-part-type="chapter"` siblings), and themes
(custom-property overrides — with a small output-neutral `--enscribe-font-body`
/ `--enscribe-font-heading` addition first, since the body font is currently
hardcoded). Recommended slicing: **1) ToC sidebar** (the foundation) → **2)
themes** (CSS-only) → **3) chapter navigation** (reuses the ToC as the chapter
selector).

**Post-release display work:**

- **Render-mode lowering** *(formerly DF-19)*. Lossy lowering of Layer 1
  to plain HTML headings. Gated by **the section-title heading-level
  decision** *(formerly OQ-2)*.
- **Multi-column display rendering** *(formerly DF-5)*. Gated by **MC-Q1
  through MC-Q4** (filed as discussion items).
- **Margin sidenotes** *(formerly PG-2)*. Coupled to multi-column.
- **Pagination and print-targeted output.** Gated by the
  **print-requirements spec** being written.

---

## Phase 9 — Multi-file authoring *(post-release)*

A real architectural extension: `enscribe.yml` + `<include>`,
project-wide registries.

**Items:**

- **MF-Q1 through MF-Q4 resolution.** Four design questions filed as
  discussion items; must land before the build.
- **Build multi-file authoring** *(formerly DF-4)*. The file-reader /
  path-resolution substrate could land early as a single contained slice
  without committing to any MF-Q decision.

---

## Phase 10 — Executable code blocks *(post-release)*

In-browser JavaScript execution with Arquero (data) and Vega-Lite (plots).
Orthogonal to all five alpha lines — it adds a build-time runtime, not a
markup or conversion capability. First-target scope is the
browser-resident stack only.

**Items:**

- **Executable code blocks Phase 0.** Surface design (the
  `+eval`/`+echo`/`+output`/`+error`/`cache`/`dependencies` convention),
  processor integration, and the security posture for in-browser
  execution.
- **Build executable code blocks.** The build itself, per the Phase 0
  surface design.

---

## Phase 11 — Hardening and quality *(post-release; partly standing)*

Bug fixes, the apparatus tags' silent-drop fix, the spec-completeness
audit, test rewires.

**Items:**

- **`buildProperties` doesn't iterate `node.booleans`.** The root-cause
  fix that `<author>` worked around for `+corresponding`.
- **`<data>` migration onto structured-element infrastructure.**
- **Run a spec-completeness audit against the rebuild-from-docs
  standard.** One-time large pass; future passes are ordinary per-slice
  coherence checks.

---

## Phase 12 — Vocabulary expansion *(post-release)*

Discussion items that, when resolved, become new vocabulary or new parser
surface. Each is gated by its discussion resolution (see `BACKLOG.md`):
`<presentation>`/`<slide>`/`<slide-notes>` vocabulary; compact
external-reference syntax (`wiki:`, `doi:`, `arxiv:`, `github:`);
external-link rich previews; just-in-time math symbol definitions;
smart-typography conversions; bare-idiom shortcuts for underline and
strikethrough; the sigil as a first-class category; hardening the colon-id
convention into a spec rule; auditing documented features against
test-fixture coverage; the cross-reference type-prefix mismatch warning;
the `<data>`/`<library>` cleanup-pass discussion; the qualifying-tag
pattern generalized beyond `<table>`; the bibliography heading as a config
kwarg; and `<html-passthrough>`.

---

## Phase 13 — JATS import *(release-blocking) · CLOSED 2026-05-31*

Complete. The other direction of the JATS bridge — JATS XML → Layer 1 —
making JATS conversion bidirectional (with the Phase 5 export). Deliberately
lossy: JATS's vocabulary is far larger than Layer 1's, so it is a useful
on-ramp from the scholarly corpus, not a round-trip guarantee. Built over a
Phase 0 (`notes/phase13-jats-import-findings.md`) and seven slices as the
`@enscribejs/jats-import` package + the `enscribe import-jats` command:
structure and inline formatting, citations and bibliography, math
(`<tex-math>` and MathML), figures, tables, cross-references, footnotes, the
theorem family, DSL blocks, and a reduction policy that preserves
reader-facing apparatus and drops publishing metadata (warning on anything
unrecognized). Demonstrated by a real published article (an NLM JATS sample)
imported onto the docs site (`docs-site/sources/demo-paper.emd`). One related
item stays open in `BACKLOG.md`: the JATS *export* doesn't yet map `<a>` →
`<ext-link>`.

---

## Phase 14 — Packaging and release artifacts *(release-blocking · in progress)*

The packaging work that turns the engine into a shippable v0.1.0.

**Done:**

- **Client-side rendering library + in-browser editor demo.** The
  `src/browser.js` `render` / `renderInto` / `executeAssets` façade, the
  tsup `enscribe.browser` bundle (ESM + IIFE), the external-by-default
  `embedResources` flip, the browser-safety work, and a `demo/` page
  pairing a CodeMirror editor with live in-browser rendering. The library
  carries **no JATS capability** — export and import stay Node-side.
- **Docs-site content arc.** A `docs-site/` static build
  (`npm run docs:build`) with Home, Design, Quickstart (playground),
  the fourteen-chapter Authoring Guide, the Layer 1 Vocabulary Reference,
  and the JATS article.
- **Render-quality spec** (`notes/specs/render-quality.md`) and the
  **render-quality bug-fix arc** that closed every deviation it surfaced
  (stylesheet gaps, the abc source-fidelity and book-numbering mismatches,
  and the pipe-form inline-math escape bug).
- **The CLI** (`@enscribejs/cli`) and the **release housekeeping**
  (the `@enscribejs/*` org-split, coordinated `0.1.0` versioning, MIT
  license, publish-ready metadata).

**Remaining:**

- **Comprehensive demonstrative fixture + corpus consolidation.** The
  render-quality slice built believable demonstrative fixtures (a
  methods-paper article and an edited-volume book); what remains is
  consolidating the accumulated corpus and resolving the design question
  of one comprehensive document vs the small believable set.
- **Generated `.d.ts` types** for the browser library.
- **`npm publish`** per package (Ariel, out of band).

---

## Standing items (not phased)

- **Spec-completeness audit follow-on slices.** The audit (Phase 11) is
  one-time; its findings become individual fix slices filed against
  whatever phase they belong to. The audit is a process; its only output
  is backlog items.
- **The unbraced-inline `@` form** *(parked; not on the active roadmap)*.
  Revisit only if/when the bare `@key` affordance is wanted.

---

## Cross-document agreement

Every open milestone-tagged backlog item — `[release]` now — names its
roadmap phase, and every open roadmap item names its backlog entry. A
slice that closes such an item updates this roadmap (the item moves out of
"in flight", or the phase exits if it was the last in the phase) and
removes the entry from `BACKLOG.md`. A slice that adds one files it in
`BACKLOG.md` and lists it in the appropriate phase here. The contract is
enforced by the coherence check in `CONTRIBUTING.md`.
