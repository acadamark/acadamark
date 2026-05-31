# enscribe — roadmap

The roadmap is the project's **linear narrative**. It names the phases the
project moves through, the items inside each phase in build order, and
the dependencies between them. **Alpha is a milestone along the
roadmap, not the only horizon** — the phases continue past it.

The roadmap is deliberately small. Item detail (rationale, history, file
paths, design tensions) lives in `BACKLOG.md`. Each roadmap item
cross-references its backlog entry; each milestone-tagged backlog entry
(`[alpha]`, `[release]`) cross-references its roadmap phase. The two
documents agree on which items a milestone needs and where each item
sits in the sequence.

For the slice-completion rule that keeps the roadmap and the backlog
agreeing, see the coherence check in `CONTRIBUTING.md`.

---

## The alpha milestone — what we are aiming at

The alpha release demonstrably includes five things:

1. The **Layer 1 custom-HTML elements** that render a rich document.
2. **Canonical enscribe shorthand** authoring that form.
3. **Further shorthands (sigils) and markdown idioms** reducing to it.
4. **JATS ⇔ Layer 1** conversion.
5. **Enscribe ⇔ Layer 1** conversion.

Each of the five lines above is a literal acceptance criterion. The
phases that follow are organized so that finishing them satisfies the
five-point definition; the final phase (Alpha integration check) is the
moment that compact is verified end-to-end.

Terminology used here (Layer 1, canonical enscribe, sigils, markdown
idioms, strict mode) is defined in `DESIGN.md` §"Layered model and
terminology."

---

## The v0.1.0 release — what we are aiming at

With the alpha milestone closed (`4633445`, 2026-05-29), the next
organizing milestone is the **v0.1.0 public release**. The version is
SemVer with a patch component, so a `0.1.1` bugfix release can follow
without disturbing the `0.1` minor line.

The release demonstrably includes four things:

1. **Bidirectional JATS conversion.** Layer 1 → JATS XML shipped in
   Phase 5 (alpha line 4); the release adds the reverse direction —
   JATS → Layer 1 import (Phase 13, promoted from post-alpha to
   release-blocking).
2. **Display features for end-readers:** a table-of-contents sidebar,
   single-chapter-at-a-time book navigation, and a wider set of themes
   (the release-blocking subset of Phase 8).
3. **A client-side rendering library:** Layer 1 rendering packaged for
   browser use, carrying no JATS capability (the JATS work stays
   Node-side). An in-browser editor/viewer — CodeMirror source on the
   left, rendered output on the right — falls out of this library as an
   example application; it ships as a library demo documented in the
   library's README, not as a standalone roadmap phase.
4. **A comprehensive demonstrative fixture:** a single high-quality
   demo document, built against the render-quality spec (now written),
   serving as both the project's manual and a render-regression
   fixture. It takes over the demonstrative role the accumulated
   fixture corpus has carried.

The **release-blocking phases** are Phase 8 (the display-features
subset above), Phase 13 (JATS import), and the new Phase 14
(packaging — the client-side library, the render-quality spec, and the
demonstrative fixture). The other post-alpha phases — 7 (lift-and-
lower), 9 (multi-file authoring), 10 (executable code blocks), 11
(hardening), 12 (vocabulary expansion) — are **post-release**.

Like alpha, the release is an **overlay** on the phase sequence, not a
renumbering: phase numbers are identity references across the project's
commits, specs, and backlog, so release-blocking phases keep their
numbers and are marked release-blocking in place.

---

## How the roadmap is organized

Phases are ordered by dependency where dependencies exist, and by
natural sequencing where they do not. Each phase carries:

- A short statement of **what the phase is** and **which milestone it
  serves** — a line of the alpha definition (alpha is now closed), or
  whether it is **release-blocking** for v0.1.0, **post-release**, or a
  **standing** item.
- The **items in the phase**, each a cross-reference to a `BACKLOG.md`
  entry.
- Any **dependencies** on earlier phases or on resolved discussions.

Items inside a phase are listed in build order where one item must
precede another inside the phase; otherwise they are independently
pickable within the phase.

---

## Current position

The **alpha milestone** closed 2026-05-29 (`4633445`); the per-line
acceptance evidence is in `notes/alpha-acceptance-mapping.md` and the
milestone record is in `STATUS.md`. The project is now between
milestones — alpha is closed, and **v0.1.0 release** work is beginning
(see "The v0.1.0 release — what we are aiming at" above).

**Release-blocking work:** Phase 8 display features (table-of-contents
sidebar, single-chapter book navigation, themes), Phase 13 JATS import,
and Phase 14 packaging (client-side library + render-quality spec +
comprehensive demonstrative fixture). Phases 7, 9, 10, 11, and 12 are
**post-release**.

The **render-quality spec** is now written
(`notes/specs/render-quality.md`) — it produces the standard the Phase 8
and Phase 14 work is verified against. The slice that wrote it built
demonstrative fixtures against it (a methods-paper article and an
edited-volume book) and filed the render-quality deviations it surfaced
as bugs (filed, not fixed — the spec slice touched no product code). A
render-quality bug-fix arc is now closing those deviations: slice A (the
additive `default.css` theme rules for the theorem family, book
structure, `.frameable-border`, and the math-environment wrappers) has
landed, and a DSL verification slice confirmed the demonstrative
fixtures' `<mermaid>` blocks render to spec while surfacing an abc
source-fidelity deviation (the abc `<div>` was reformatted by the HTML
serializer). That deviation has since been fixed by **DSL Slice 1** — the
DSL render registry plus live mode (inline or pinned-CDN library) over the
unchanged `skip` default — which switched the abc wrapper to `<pre>`
(`RQ-DSL-M2`). **DSL Slice 2** then added the abc-only static path: with
`abcMode: 'static'` each `<abc>` contract is replaced at build time by inline
SVG (abcjs under a jsdom shim — synchronous, so it runs inside the compiler),
needing no view-time JS (`RQ-DSL-STATIC-*`); mermaid stays live-only, so static
mermaid remains a fail-explicitly build error. That closes the DSL-rendering
arc. **Slice B** then corrected the book-numbering mismatch: a chapter-scoped
book's captions / labels / equation numbers now carry the same chapter prefix
as the cross-references resolving to them (`RQ-BOOK-M4`), derived through a
scoped-number helper shared by the render and resolver paths (HTML-only — the
JATS exporter reads the unchanged bare number, so its output is byte-identical).
A follow-on **JATS slice** then completed that correction on the JATS export
side: the JATS `<label>` emitter derives its number through the same shared
helper (re-exported from `enscribe-interpreter`), so a book's `<label>` and the
`<xref>` resolving to it agree — `RQ-BOOK-M4` now holds across both the HTML and
JATS targets, with the book JATS fixtures gaining the prefix and articles
holding zero-diff. **Slice C** then closed the arc's last deviation — the
pipe-form inline-math parser bug: inline and display math and markdown code
spans inside pipe-form named-tag content are now opaque to the inner parser's
escape processing (a shared `OpaqueSpan` grammar rule), so LaTeX backslash
commands and Windows paths survive where they were previously misread as escape
sequences. The accumulated corpus now renders to spec; the render-quality
bug-fix arc is complete. The
comprehensive demonstrative
fixture and the consolidation of the accumulated fixture corpus remain
open, and carry an unresolved design question — one comprehensive
document, or the small believable set the spec slice started (see
`BACKLOG.md`).

The active release-blocking arc is now **Phase 14 packaging** (the
client-side rendering library). **Slice 1 (library packaging)** and **Slice 2
(in-browser editor demo)** are done — the `src/browser.js`
`render` / `renderInto` / `executeAssets` façade, the tsup `enscribe.browser`
bundle, and a `demo/` page pairing a CodeMirror editor with live in-browser
rendering. Slice 2 also fixed a Slice 1 defect that left the IIFE bundle
unable to load in a browser, and a small interstitial **Slice 1.5** then closed
that defect's whole class (symmetric node-builtin aliasing + a bundle-load smoke
test). **Slice 3a (docs-site framework)** is also done — a `docs-site/` static
build (`npm run docs:build`) that renders `.emd` sources into a multi-page site
with a Quickstart playground, with placeholder content. (It diverges from the
Phase 0 plan per the slice's locked inputs: the site is `docs-site/` at the repo
root rather than `packages/demo-site/`, and the **project rename** was deferred to
a separate later decision rather than forced here.) That **project rename has
since landed as its own slice** — the project is now *enscribe*, the source
extension is `.emd` (`.enscribe` accepted as an alias), with package names, the
CSS theme namespace, and GitHub URLs updated to match (see the `STATUS.md`
milestone). Slice 3b has since landed too — the README and DESIGN are
translated to canonical enscribe and ship as the docs-site Home and Design
articles (the `example-article` placeholder retired). Slices 3c and 3d have since
landed too — the Quickstart guide and the JATS-relationship article, both
authored in canonical enscribe. **The Authoring Guide is now complete** (Slices
3e-i/ii/iii, a fifth docs-site page): all fourteen chapters — document structure,
sections, inline, block, figures, tables, citations, footnotes, cross-references,
theorem family, external DSLs, book structure, arguments-and-the-pipe, and
rendering — authored in canonical enscribe with rendered demonstrations
throughout and cross-references resolving inside the document. The next docs-site
slice is 3f (Layer 1 Reference).
Nothing else is in flight.

---

## Phase 5 — JATS export *(alpha — line 4)*

The first half of the JATS bridge: Layer 1 → JATS XML. This is alpha
line 4, the payoff for vocabulary being JATS-aligned from the start
(`jats_counterpart` on every entry). JATS import is the deliberately
lossy direction and is post-alpha.

This phase has its own **Phase 0** because JATS export is a large arc
and the package boundary (`enscribe-jats-export`, not yet present)
needs siting against the inward-pointing `enscribe-core`.

**Items, in order:**

- **JATS-export Phase 0** *(done `f6bb311`, 2026-05-29)*.
  `notes/phase5-jats-export-findings.md`: package siting (Option A —
  new `enscribe-jats-export` package); attribute-mapper lift
  recommendation (do it in slice 5a — JATS export is the second
  consumer the deferral waited for); JATS section-model decision
  (Option I — map named sections to `<sec>` per JATS convention);
  vocabulary mapping inventory by JATS section; SPLIT-into-4-slices
  recommendation (5a → 5b → 5c → 5d).
- **Build JATS export (`rehypeEnscribeToJats`)** *(formerly DF-18)*.
  Per Phase 0 SPLIT recommendation:
  - **Slice 5a — package + lift + minimal article export**
    *(done 2026-05-29)*. New `enscribe-jats-export` package;
    `mapAttributes` lift to `enscribe-core` (deferred lift from
    `6ae6844` resolved); vocab `maps_to` migrated to target-keyed
    form; article scaffolding + paragraphs + inline text export.
    Existing snapshots zero-diff (HTML behavior preserved).
  - **Slice 5b — body content** *(done 2026-05-29)*. Frameables
    (`<fig>` / `<svg>` / `<frame>` → `<fig>`; `<table>` / `<csv>`
    / `<tsv>` → `<table-wrap>`) with `<label>` + `<caption>` +
    `<title>` children. Lists (`<ul>` / `<ol>` → `<list
    list-type="...">`; `<dl>` / `<glossary>` → `<def-list>`).
    Math (`<inline-math>` → `<inline-formula><tex-math>`;
    display-math + math + envs → `<disp-formula>` with `<label>`
    and CDATA-wrapped TeX source; env tags wrap in
    `\begin{<env>}…\end{<env>}` per the KaTeX wrap-inside
    convention). Theorem family (all eight elements →
    `<statement content-type="...">` with `<label>` + optional
    `<title>` from `name` kwarg + body `<p>`s). Inline-vs-block
    abstract limitation from 5a fixed (synthetic-paragraph
    pre-pass `groupInlineRuns` wraps loose inline runs into
    paragraphs before block dispatch). New fixture doc-40.
    `fillNumbering` added to `enscribe-interpreter`'s exports
    so the JATS test pipeline can replicate numbering.
  - **Slice 5c — cross-references + footnotes + BITS book + table
    rows** *(done 2026-05-28)*. Cross-references → `<xref
    ref-type="..." rid="...">` with per-prefix ref-type
    discrimination (fig/svg/frame → `fig`; table/csv/tsv →
    `table`; eqn → `disp-formula`; sec → `sec`; thm/lem/cor/prop/
    def/ex → `statement`; note → `fn`; cite-keys → `bibr`);
    chapter-prefixed display text preserved from
    `ref-resolution.js`'s `computeRefText`. Footnotes → inline
    `<xref ref-type="fn">` markers + collected `<fn-group>`/`<fn>`
    sets honoring the `<config note-scope>` knob (article default
    'section' → per-section foot-note collection;  book default
    'chapter' → per-`<book-part>` `<back><fn-group>`; 'document'
    → all to back). BITS 2.0 book export path: dispatch on
    `<book>` vs `<article>` at root; `emitBook` produces
    `<book book-type="..." dtd-version="2.0">` with `<book-meta>`
    + `<book-title-group>` (from `<meta>`'s `<book-title>` /
    `<book-subtitle>`), `<front-matter>` (preface/foreword/
    dedication book-parts), `<body>` (chapter/part/intro/
    conclusion), `<book-back>` (appendix/glossary/colophon).
    Per-`<book-part>` `<book-part-meta>` carries lifted
    pipe-content title (`<chapter | Origins>` → `<title>Origins
    </title>`) plus per-chapter `<contrib-group>` for the
    edited-volume case. Table-row emission: `<table-wrap>`'s
    inner `<table>` now carries parsed `<thead>`/`<tbody>`/`<tr>`
    /`<th>`/`<td>` for CSV/TSV (JSON/YAML/MD remain placeholders
    in the JATS path). Two new fixtures: doc-41 (article with
    cross-refs/footnotes/tables) and doc-42 (BITS book with
    edited-volume). `parseCsv` / `parseTsv` and
    `enscribeNotePlacement` added to `enscribe-interpreter`'s
    exports so the JATS test pipeline can reuse the parsers and
    note-placement plugin. Internal-marker inline-shape fix:
    `__ref-marker` / `__cite-marker` / `__note-marker` /
    `__ref-error` / `__cite-error` added to `isInlineShaped` so
    they don't fragment paragraphs at the `groupInlineRuns`
    pre-pass (same shape as slice 5b's `inline-math` fix).
  - **Slice 5d — bibliography + external DSLs + DTD bundling**
    *(done 2026-05-28)*. Bibliography → JATS `<ref-list>` with
    structured `<element-citation>` per entry (per-field
    `<person-group>`/`<article-title>`/`<source>`/`<year>`/
    `<volume>`/`<issue>`/`<fpage>`/`<lpage>`/`<pub-id>`/
    `<publisher-name>`/`<publisher-loc>`/`<ext-link>`). CSL-JSON
    from citation-js is the structured intermediate (already in
    `file.data.enscribeCitations`); slice 5d threads it through
    `__bibliography` markers so the JATS emitter consumes it
    directly without re-parsing. External DSLs (`<mermaid>` /
    `<abc>`) → `<fig specific-use="enscribe-dsl-{type}">` with
    `<alt-text>` + `<preformat content-type="{type}-source">`
    preserving the verbatim DSL source. DTD bundling: JATS 1.3
    Archiving + BITS 2.0 + W3C ISO/MathML dependencies fetched
    via `scripts/fetch-dtds.mjs` and bundled in
    `packages/enscribe-jats-export/dtd/` (~3.6 MB, 129 files);
    test runner validates fixtures with `xmllint --noout
    --valid --nonet` when xmllint is on PATH (skips with log
    message otherwise). BITS doctype URL bug fixed (was
    `BITS-book2-0.dtd`, should be `BITS-book2.dtd`). New fixture
    doc-43 exercises bibliography + mermaid + abc end-to-end.

**Exits:** Phase 5 **CLOSED 2026-05-28**. Full Layer 1 → JATS XML
export pipeline working with DTD-validated output across articles
and books — a Layer 1 document round-trips to JATS XML cleanly
enough for journal submission.

---

## Phase 6 — Alpha integration check *(alpha — verifies all five lines)*

A closing pass that verifies the five-point definition demonstrably
holds. Not new work; a verification that the work to date satisfies
the acceptance criteria.

**Items:**

- **Five-point verification fixtures.** One acceptance fixture per
  line of the alpha definition: Layer 1 elements render; canonical
  enscribe authors them; sigils and markdown idioms reduce to them;
  JATS export round-trips; Layer 2 ⇔ Layer 1 round-trips losslessly
  for canonical-form fixtures.
- **Resolve any gaps surfaced by the five-point verification.** Filed
  on the spot if found.

**Exits:** Phase 6 **CLOSED 2026-05-29**. All five alpha-acceptance
lines verified against existing fixtures; the per-line verification
mapping is recorded in `notes/alpha-acceptance-mapping.md`. A
cross-feature stress fixture (`doc-44`) exercises the surface no
single fixture combined — books, bibliography, external DSLs, the
theorem family, per-chapter footnotes, math in all three forms, and
frameables — in one monograph, in both the interpreter and JATS
corpora. **Alpha milestone reached.**

---

## Phase 7 — Lift-and-lower completeness *(post-alpha)*

The lift gate at `packages/enscribe-interpreter/src/plugins/normalize-to-canonical.js`
is the single home for normalizing all authored forms to canonical.
Alpha covered the authoring direction; this phase fills in the lowering
direction (Layer 1 → canonical-named or canonical-sigil) for
round-trip and authoring tooling that emits enscribe from Layer 1.

**Items:**

- **Lowering pass implementation.** The reverse direction of the
  tagname↔sigil cipher, plus the Layer 1 → canonical-enscribe
  rendering.
- **Strict mode** *(formerly DF-2)*. The configuration switch in
  which the normalization pass has nothing to do; markdown idioms
  produce errors rather than reducing.

---

## Phase 8 — Display targets *(partly release-blocking)*

The display ladder beyond the default Layer 1 + CSS target. Three
display features are **release-blocking** for v0.1.0; the rest of the
phase is post-release.

**Release-blocking display features (v0.1.0):**

- **Table-of-contents sidebar.** A navigable ToC rendered alongside the
  document body, generated from the section / chapter structure.
- **Single-chapter-at-a-time book view.** A book reading mode showing
  one chapter at a time with chapter-to-chapter navigation, rather than
  the whole book as a single scroll.
- **Additional themes.** A wider set of display themes beyond the
  current default.

These three are net-new — not previously on the roadmap — and are
UI-shaped in a way the project has not built before. They are likely to
share machinery with the Phase 14 client-side library (where display /
interaction code naturally lives), so a **Phase 0** will scope where
the UI code sits and how themes are structured before the build.

**Post-release display work:**

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

A real architectural extension: `enscribe.yml` + `<include>`,
project-wide registries.

**Items:**

- **MF-Q1 through MF-Q4 resolution.** Four design questions filed as
  discussion items; must land before the build.
- **Build multi-file authoring** *(formerly DF-4)*. The file-reader /
  path-resolution substrate could land early as a single contained
  slice without committing to any MF-Q decision, if convenient — it
  makes the eventual build cheaper.

---

## Phase 10 — Executable code blocks *(post-alpha)*

In-browser JavaScript execution with Arquero (data) and Vega-Lite
(plots). Ruled post-alpha in the Phase 6 alpha integration check:
the alpha milestone is the five-line acceptance definition, and
executable code is orthogonal to all five — it adds a build-time
runtime, not a markup or conversion capability. The first-target
scope is the browser-resident stack only; other languages,
kernel-based execution, and server-side sandboxing are further out.

**Items:**

- **Executable code blocks Phase 0.** Surface design (the
  `+eval`/`+echo`/`+output`/`+error`/`cache`/`dependencies`
  convention from RMarkdown/Quarto), processor integration (how the
  DSL-processor model in `DESIGN.md` extends), security posture for
  in-browser execution.
- **Build executable code blocks.** The build itself; the
  browser-resident stack per the Phase 0 surface design.

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

## Phase 13 — JATS import *(release-blocking)*

The other direction of the JATS bridge, and a **release-blocking** goal
for v0.1.0: together with the Phase 5 export it makes JATS conversion
bidirectional. Deliberately lossy — JATS's vocabulary is far larger
than Layer 1's, so constructs with no Layer 1 counterpart are reduced
rather than faithfully preserved; it is a useful on-ramp from the
existing scholarly corpus, not a round-trip guarantee.

First-class work now, not a someday-phase. It has substantial design
questions to settle — which JATS features map to Layer 1, where the
lossy boundary sits, how the importer handles JATS content with no
enscribe counterpart — so it will get its own **Phase 0** before the
build begins.

---

## Phase 14 — Packaging and release artifacts *(release-blocking)*

The packaging work that turns the engine into a shippable v0.1.0 — a
coherent arc of its own, sequenced after JATS import (Phase 13) since
both are release-blocking.

**Items:**

- **Client-side rendering library** *(Slices 1–2 done — library packaging +
  in-browser editor demo; see STATUS.md's Phase 14 milestones)*. Layer 1
  rendering packaged for browser use — a document rendered in-browser with no
  Node build step.
  The `enscribe-core` extraction already drew the build/run-time seam
  as a browser-safety boundary for exactly this. The library carries
  **no JATS capability** — JATS export and import stay Node-side. An
  in-browser editor/viewer (CodeMirror source left, rendered output
  right) is an example application of this library, shipped as a demo
  and documented in the library's README; it is deliberately **not** a
  standalone roadmap phase. Slice 1 delivered the packaging spine: the
  `src/browser.js` `render` / `renderInto` façade, the tsup
  `enscribe.browser` bundle (ESM + IIFE), the external-by-default
  `embedResources` flip, and the browser-safety work (lazy-ified `fs`
  reads, the `registry.js` → `node-assets.js` split, node-builtin
  stubbing). Slice 2 added the in-browser editor demo (`demo/` — CodeMirror
  source left, rendered output right, live re-render on edit) and an
  `executeAssets` export on the browser entry: the opt-in
  `render → executeAssets` two-step that runs the live-mode scripts `innerHTML`
  leaves inert (resolving the `renderInto` live-asset-execution discussion). It
  also fixed a Slice 1 defect its byte-level checks missed — the IIFE bundle
  threw `__require("fs")` at load and never ran in a browser. Slice 1.5
  (symmetric node-builtin aliasing) then closed that defect's whole class: the
  esbuild `alias` is now keyed in both the bare and `node:` forms (with
  `removeNodeProtocol: false`), so either import form is safe, and a
  `bundle-load` smoke test loads the IIFE in jsdom on every run as the standing
  guard. Slice 3a then built the **docs-site framework** (`docs-site/` at the
  repo root — a static `npm run docs:build` that renders `.emd` sources into a
  multi-page site, with a Quickstart playground and placeholder content; it
  diverges from the Phase 0 `packages/demo-site/` siting and **defers the
  rename**, both per its locked inputs). The rename and the release-time
  org-split have since landed as their own slices (the project is *enscribe*;
  the packages publish under `@enscribejs/*` at v0.1.0); the remaining slices
  (docs-site content in 3e–3f — 3b–3d having landed the README, DESIGN,
  Quickstart, and JATS articles — and fixture consolidation) per the Phase 0
  slicing
  continue.
- **Render-quality spec** *(done — `notes/specs/render-quality.md`)*. A
  spec defining what "rendered correctly" means for the visible output —
  the standard the display work (Phase 8) and the demonstrative fixture
  are verified against. Written by the render-quality slice as tight,
  mechanically-checkable predicates per feature category — markup
  predicates against the rendered HTML, stylesheet predicates against
  `default.css`. The same slice built demonstrative fixtures against it
  and filed the render-quality deviations the predicates surfaced (see
  `BACKLOG.md` Bugs).
- **Comprehensive demonstrative fixture.** A high-quality demonstration
  surface built against the render-quality spec, serving as both the
  project's manual and a render-regression fixture. The render-quality
  slice made a down-payment — believable demonstrative fixtures (a
  methods-paper article and an edited-volume book) that validate the
  spec's predicates — but left two things open: the consolidation that
  retires or folds in the accumulated fixture corpus, and the design
  question of whether the demonstrative role is one comprehensive
  document or the small believable set the slice started. It is also
  gated on the remaining render-quality deviation bugs — the stylesheet
  gaps that left the theorem family, book structure, `.frameable-border`,
  and math environments unstyled are now closed (the bug-fix arc's
  slice A), as is the abc source-fidelity deviation (`RQ-DSL-M2`, closed by
  DSL Slice 1's `<div>`→`<pre>` wrapper fix) and the book
  caption/cross-reference numbering mismatch (`RQ-BOOK-M4`, closed across
  both output targets — the HTML side by the bug-fix arc's slice B, the
  JATS export side by the follow-on JATS slice). The pipe-form inline-math
  escape deviation is closed too (the bug-fix arc's slice C — inline and
  display math and code spans made opaque to escape processing in pipe-form
  named-tag content), so the render-quality bug-fix arc is complete and no
  longer gates Phase 14. See `BACKLOG.md`.
- **Release housekeeping** *(version-stamping + org-split done — the
  prep-for-publish slice)*. The five packages are scoped under `@enscribejs/*`
  and coordinated at `0.1.0` with an MIT license and publish-ready metadata
  (`files`, `repository`, `engines`, …); `npm pack --dry-run` is clean for each,
  and Ariel runs `npm publish` per package. Remaining housekeeping — repository
  tidying and the doc-hygiene already filed under Standing (e.g. the
  stale-cross-reference reconciliation) — folds in as release prep where it fits.

**Dependencies:** the render-quality spec precedes the display
(Phase 8) and demonstrative-fixture work — it is the standard they are
checked against. With the spec now written, the next work is the
render-quality deviation fixes it surfaced (see `BACKLOG.md` Bugs).

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

Every milestone-tagged backlog item — `[alpha]` while alpha was open,
`[release]` now — names its roadmap phase, and every roadmap item names
its backlog entry. A slice that closes such an item updates this
roadmap (the item moves out of "in flight" if it was there, or the
phase exits if the item was the last in the phase) and removes the
entry from `BACKLOG.md`. A slice that adds one files it in `BACKLOG.md`
and lists it in the appropriate phase here. The contract is enforced by
the coherence check in `CONTRIBUTING.md`.
