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
above), Phase 13 (JATS import), and Phase 14 (packaging). The other
post-alpha phases — 7 (lift-and-lower), 9 (multi-file authoring), 10
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

Alpha is closed; the **v0.1.0 release** is the live milestone. The
release-blocking work that remains is:

- **Phase 8 — display features** (table-of-contents sidebar,
  single-chapter book navigation, more themes). Not started; gets a
  Phase 0 to scope where the UI code sits.
- **Phase 13 — JATS import.** Phase 0 and Slices 1–3 have landed
  (structure + inline, citations + bibliography, math). Slices 4–7 remain
  (figures/tables/cross-references, theorem family + DSL blocks, the
  non-representable reduction policy, a real-article demo).
- **Phase 14 — packaging.** The client-side library, the in-browser
  editor demo, the docs-site content arc, the render-quality spec, and
  the render-quality bug-fix arc have all landed. The CLI shipped here
  too. Remaining: fixture-corpus consolidation + the comprehensive
  demonstrative fixture, generated `.d.ts` types, and `npm publish`.

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

- **Table-of-contents sidebar.** A navigable ToC generated from the
  section / chapter structure.
- **Single-chapter-at-a-time book view.** A book reading mode showing one
  chapter at a time with chapter-to-chapter navigation.
- **Additional themes.** A wider set of display themes beyond the default.

These three are net-new and UI-shaped in a way the project has not built
before. They likely share machinery with the Phase 14 client-side library,
so a **Phase 0** will scope where the UI code sits and how themes are
structured before the build.

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

## Phase 13 — JATS import *(release-blocking · in progress)*

The other direction of the JATS bridge: together with the Phase 5 export
it makes JATS conversion bidirectional. Deliberately lossy — JATS's
vocabulary is far larger than Layer 1's, so constructs with no Layer 1
counterpart are reduced rather than faithfully preserved; it is a useful
on-ramp from the existing scholarly corpus, not a round-trip guarantee. It
got its own **Phase 0** (`notes/phase13-jats-import-findings.md`) before
the build began.

**Phase 0 done; Slices 1–5 landed.** Slice 1 built `@enscribejs/jats-import` —
the XML parser, the structural skeleton (article/front/body/sec/p), and
inline formatting (bold/italic/code/links/sup/sub) — surfaced as `enscribe
import-jats`. Slice 2 added citations & bibliography (`<xref
ref-type="bibr">` → `<cite>`, `<ref-list>` → a BibTeX `<library>` +
`<bibliography>`). Slice 3 added math (`<inline-formula>`/`<disp-formula>`
→ `<inline-math>`/`<display-math>`, from `<tex-math>` or MathML via
`mathml-to-latex`). Slice 4 added figures (`<fig>`), tables (`<table-wrap>`
→ CSV), cross-references (`<xref>` → `<ref @prefix:id>`), and inlined
footnotes (`<fn>` → `<note>`). Slice 5 added the theorem family
(`<statement content-type="X">` → `<theorem>`/`<definition>`/`<proof>`/…),
DSL blocks (a DSL `<fig><preformat>` → `<mermaid>`/`<abc>`), and bare
`<preformat>` → code block.

**Remaining slices:** the non-representable-element reduction policy
(Slice 6); and a real CC-BY PubMed Central article as the demonstration
(Slice 7). A related open item: the JATS *export* still drops `<a>` (it
predates `<a>` in the vocabulary) — mapping it to `<ext-link>` is filed in
`BACKLOG.md`.

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
