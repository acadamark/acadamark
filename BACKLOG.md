# acadamark — backlog

The backlog is the project's **unordered pool of open work** — every
open item, queryable by tag, with full detail. Sequence and milestones
live in `ROADMAP.md`; this document does not order items, it holds
them.

The flat checklist and the detailed entries are two views of the same
set. The flat list is the scannable index; the detailed entries below
it are the authoritative descriptions. Every checkbox corresponds to
one detailed entry; deleting a checkbox without resolving the entry —
or vice versa — is drift, caught by the coherence check in
`CONTRIBUTING.md`.

For the sequencing of milestone work, see `ROADMAP.md`. Each
milestone-tagged entry here — `[alpha]` while alpha was open,
`[release]` now — names the roadmap phase it belongs to.

---

## How items are organized

**Items are grouped by work-kind:**

- **Bugs** — something is broken, behaves wrongly, or silently fails.
  The system is degraded *now*.
- **Enhancements** — the system works; an item would make it better,
  cleaner, or more capable. Small-to-medium additive improvements.
- **Planned work** — larger, intentional feature work.
- **Architecture-tier** — multi-slice projects, each its own arc.
- **Discussions** — open questions and design decisions. Nothing is
  built until the discussion resolves. (Per the discussion-is-work
  rule in `CONTRIBUTING.md`.)
- **Verifications** — items that may already be done and need a
  code-check to confirm.
- **Standing** — items present in every cadence of the documentation
  system, not tied to a specific arc.
- **Deferred** — explicitly parked items, not on the active roadmap.

**Every item carries a subsystem tag** — `[parser]`, `[interpreter]`,
`[vocab]`, `[specs/docs]`, `[tests/build]`, or `[cross-cutting]` — at
the start of its detailed entry. The tag travels *with the item*, so a
reader can still scan for "all the parser work" without subsystem
defining the section structure.

**Every item carries a milestone tag** — `[alpha]`, `[post-alpha]`, or
`[release]` — recording which milestone the item belongs to. `[alpha]`
items were required to ship the now-closed alpha release. With alpha
closed, the live milestone is the **v0.1.0 release**: `[release]` marks
an item required to ship it — every `[release]` item is post-alpha (it
was not part of alpha) and release-blocking. A `[post-alpha]` item that
has *not* been promoted to `[release]` is **post-release**. This mirrors
the roadmap, where the release is an overlay on the phase sequence and a
phase is annotated `*(release-blocking)*` or `*(post-alpha)*` rather
than renumbered; the backlog tag and the roadmap annotation say the
same thing. Every `[alpha]` and `[release]` item additionally carries a
`→ roadmap: Phase N` cross-reference naming where it sits in
`ROADMAP.md`'s build sequence.

## Item identifiers

Every item leads with a **descriptive name** — a short phrase saying
what the work is. Historical provenance codes (`AUD-N`, `DF-N`, `PG-N`,
`OQ-N`, `GAP-N`) are preserved as `(formerly X)` annotations at the end
of each entry so any `STATUS.md` line, commit message, or external
reference still resolves — but they no longer define identity.

Spec design-question codes (`MF-Q1–4`, `MC-Q1–4`) are preserved as
`(spec: X)` annotations because the same codes appear in the
corresponding spec files.

**New backlog items are not given codes.** A new item gets a descriptive
heading; if it genuinely needs a stable handle, it gets a plain neutral
identifier.

---

## Open items — checklist

A flat scannable index of every open item. Detailed entries below.

### Bugs

- [ ] **`buildProperties` does not iterate `node.booleans`**
  `[interpreter]` `[post-alpha]` *(filed by sub-slice 2 of deferred-vocab)*

### Enhancements

- [ ] **Generalize the qualifying-tag pattern beyond `<table>`**
  `[parser]` `[post-alpha]` *(formerly DF-17)*
- [ ] **Implement margin sidenotes** `[interpreter]` `[post-alpha]` —
  coupled to multi-column display rendering *(formerly PG-2)*
- [ ] **Make the bibliography heading a config kwarg instead of
  hardcoded** `[interpreter]` `[post-alpha]` *(formerly PG-10)*
- [ ] **Migrate `<data>` onto the structured-element infrastructure**
  `[interpreter]` `[post-alpha]` *(filed by `beb2fb3`)*

### Planned work

- [ ] **Implement strict mode (disable markdown idioms)** `[parser]`
  `[post-alpha]` *(→ roadmap: Phase 7)* *(formerly DF-2)*
- [ ] **Specify and implement `<html-passthrough>`** — needs a spec
  written first `[parser]` `[post-alpha]` *(formerly DF-3)*
- [ ] **Implement multi-column display rendering** `[interpreter]`
  `[post-alpha]` *(→ roadmap: Phase 8)* *(formerly DF-5)*
- [ ] **Build the lowering pass (Layer 1 → canonical acadamark)**
  `[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 7)*
- [ ] **Table-of-contents sidebar** `[interpreter]` `[release]`
  *(→ roadmap: Phase 8)*
- [ ] **Single-chapter-at-a-time book navigation** `[interpreter]`
  `[release]` *(→ roadmap: Phase 8)*
- [ ] **Additional display themes** `[interpreter]` `[release]`
  *(→ roadmap: Phase 8)*
- [ ] **Build the comprehensive demonstrative fixture**
  `[cross-cutting]` `[release]` *(→ roadmap: Phase 14)*

### Architecture tier

- [x] **Build JATS export (`rehypeAcadamarkToJats`)** `[interpreter]`
  `[alpha]` *(→ roadmap: Phase 5 — CLOSED)* *(formerly DF-18)* —
  **Phase 5 CLOSED 2026-05-28.** Slices 5a (`98f2d7f`) package
  + `mapAttributes` lift + minimal article export; 5b (`0ea915e`)
  body content (frameables/lists/math/theorem family + abstract
  fix); 5c (`2f96715`) cross-refs + footnotes + BITS book +
  table rows; 5d structured bibliography `<element-citation>` +
  mermaid/abc as `<fig>` with `<preformat>` source + DTD bundling
  for offline xmllint validation (JATS 1.3 + BITS 2.0).
  Full Layer 1 → JATS XML export across articles and books;
  DTD-validated output when xmllint is on PATH.
- [ ] **Build render-mode lowering** `[cross-cutting]` `[post-alpha]`
  *(→ roadmap: Phase 8)* *(formerly DF-19)*
- [ ] **Build multi-file authoring** (`acadamark.yml` + `<include>`)
  `[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 9)* *(formerly
  DF-4)*
- [ ] **Build pagination and print formatting** `[cross-cutting]`
  `[post-alpha]` *(→ roadmap: Phase 8)*
- [ ] **Build executable code blocks (JS / Arquero / Vega-Lite)**
  `[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 10)*
- [ ] **Build JATS import** `[interpreter]` `[release]`
  *(→ roadmap: Phase 13)*
- [ ] **Build the client-side rendering library** `[cross-cutting]`
  `[release]` *(→ roadmap: Phase 14)*

### Discussions

- [ ] **Decide section-title heading level when an article-title is
  present** `[cross-cutting]` `[post-alpha]` — gates render-mode
  lowering *(formerly OQ-2)*
- [ ] **Decide whether `<data>` / `<library>` nodes need a cleanup
  pass after `buildCitationIndex` reads them** `[interpreter]`
  `[post-alpha]` *(formerly AUD-18)*
- [ ] **Decide whether books should support per-chapter (scoped)
  bibliographies** `[interpreter]` `[post-alpha]`
- [ ] **Discuss whether the cross-reference resolver should warn on
  type-prefix mismatch** `[interpreter]` `[post-alpha]`
- [ ] **Discuss compact external-reference syntax** (`wiki:`, `doi:`,
  `arxiv:`, `github:`) `[parser]` `[post-alpha]`
- [ ] **Discuss external-link rich previews** (build-time metadata
  fetching) `[interpreter]` `[post-alpha]`
- [ ] **Discuss just-in-time math symbol definitions** `[cross-cutting]`
  `[post-alpha]`
- [ ] **Discuss `<presentation>` / `<slide>` / `<slide-notes>` Layer 1
  vocabulary** `[vocab]` `[post-alpha]` *(formerly DF-6)*
- [ ] **Discuss four open design questions prerequisite to multi-file
  authoring** `[cross-cutting]` `[post-alpha]` *(spec: MF-Q1, MF-Q2,
  MF-Q3, MF-Q4)*
- [ ] **Discuss four open design questions prerequisite to
  multi-column display** `[cross-cutting]` `[post-alpha]` *(spec:
  MC-Q1, MC-Q2, MC-Q3, MC-Q4)*
- [ ] **Discuss smart-typography conversions** (`--` → en-dash, `---`
  → em-dash) `[parser]` `[post-alpha]`
- [ ] **Discuss bare-idiom shortcuts for underline and strikethrough**
  `[parser]` `[post-alpha]`
- [ ] **Discuss hardening the colon-id convention into an explicit
  spec rule** `[cross-cutting]` `[post-alpha]`
- [ ] **Discuss the sigil as a first-class category** `[cross-cutting]`
  `[post-alpha]`
- [ ] **Discuss auditing documented language features against
  test-fixture coverage** `[tests/build]` `[post-alpha]`

### Standing

- [ ] **Run a spec-completeness audit against the rebuild-from-docs
  standard** `[specs/docs]` `[post-alpha]` — one-time large; future
  passes will be ordinary per-slice coherence checks
- [ ] **Write a print-requirements spec** `[specs/docs]`
  `[post-alpha]` — companion to the pagination work in Phase 8
- [ ] **Write the render-quality spec** `[specs/docs]` `[release]`
  *(→ roadmap: Phase 14)* — companion to the Phase 8 display features
  and the Phase 14 demonstrative fixture
- [ ] **Reconcile stale doc cross-references** (`BACKLOG-ROADMAP.md`
  → `BACKLOG.md` / `ROADMAP.md`; `rehypeAcadamarkToJats` →
  `acadamarkToJats`) `[specs/docs]` `[post-alpha]`

### Deferred — explicitly parked

- **The unbraced-inline `@` form** `[parser]` `[post-alpha]` —
  parked; revisit only if/when the bare `@key` affordance is wanted

---

## Detailed entries — Bugs

### `buildProperties` does not iterate `node.booleans`
`[interpreter]` `[post-alpha]`

`packages/acadamark-interpreter/src/lib/build-properties.js` iterates
`node.kwargs` and maps each through the vocabulary's
`acadamark_attributes.kwargs` definitions, but it does not iterate
`node.booleans`. A tag's `+flag` boolean attributes therefore silently
drop on render for any tag that does not lift them to kwargs at the
gate. The `<author>` reconciliation (`beb2fb3`) worked around this for
`+corresponding` via `liftStructuredKwargs`'s boolean-promotion step;
other tags hitting the same case would face the same silent surprise.

A root-cause fix would have `buildProperties` also walk
`node.booleans` and apply any vocabulary-declared boolean mapping (a
`booleans:` section on the vocabulary entry, parallel to the existing
`kwargs:`). Once that exists, the `liftStructuredKwargs` workaround
can be reverted.

Filed by sub-slice 2 of the deferred-vocab work.

---

## Detailed entries — Enhancements

### Generalize the qualifying-tag pattern beyond `<table>`
`[parser]` `[post-alpha]`

Generalizing the qualifying-tag pattern beyond `<table>` (note: the
pattern already works *for* `<table>`). *(formerly DF-17)*

### Implement margin sidenotes
`[interpreter]` `[post-alpha]`

Today `placement=side` produces a fallback
`<li class="sidenote-fallback">` collected in article-back; the
plugin comment notes "Future themes provide margin positioning." This
item: actual margin-positioned sidenotes — a sidenote renders in the
page margin near its in-text anchor. **Should be implemented as part
of, or on top of, multi-column display rendering** — a margin
sidenote is structurally another column, and the multi-column layout
engine is the machinery a margin needs. Implementing sidenotes
standalone would build a one-off margin-positioning system that the
multi-column work would duplicate or obsolete. Cross-reference: the
multi-column display rendering item (also `[post-alpha]`).
*(formerly PG-2)*

### Make the bibliography heading a config kwarg instead of hardcoded
`[interpreter]` `[post-alpha]`

Hardcoded bibliography heading — a config kwarg, very small.
*(formerly PG-10)*

### Migrate `<data>` onto the structured-element infrastructure
`[interpreter]` `[post-alpha]`

The structured-element infrastructure
(`packages/acadamark-core/src/structured-elements.js`, landed in
`beb2fb3`) currently carries `<meta>` and `<author>`. `<data>` was
considered for migration in the same slice and deferred: its content
is a list-of-resources, not a field-record, so the kwarg ↔ child-tag
equivalence the infrastructure provides for `<meta>` and `<author>`
does not map cleanly. Revisit when a real second list-shaped use
case surfaces, or when the difference between field-record and
resource-list containers becomes worth abstracting. *(filed by
`beb2fb3`)*

---

## Detailed entries — Planned work

### Implement strict mode (disable markdown idioms)
`[parser]` `[post-alpha]` *(→ roadmap: Phase 7)*

Bounded; disables markdown idioms. Under the normalization model,
strict mode is the mode in which the normalization pass has nothing
to do (no markdown-form nodes are produced). *(formerly DF-2)*

### Specify and implement `<html-passthrough>`
`[parser]` `[post-alpha]`

`<html-passthrough>` — needs a *spec* written first; it is "planned,
not yet specified." A design step precedes the code. *(formerly DF-3)*

### Implement multi-column display rendering
`[interpreter]` `[post-alpha]` *(→ roadmap: Phase 8)*

Spec is `notes/specs/multi-column-display.md`; render-mode concern.
Independent leaf, low-priority unless a publication target needs it.
Gated by MC-Q1 through MC-Q4 (in the Discussions group).
*(formerly DF-5)* — Margin sidenotes (see that item) are coupled to
this work: the margin is another column, and the multi-column layout
engine is the machinery a margin needs.

### Build the lowering pass (Layer 1 → canonical acadamark)
`[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 7)*

The reverse direction of the bidirectional tagname↔sigil cipher,
plus the Layer 1 → canonical-acadamark serialization for authoring
tooling that emits acadamark from Layer 1. The `TAGNAME_TO_SIGIL`
lookup direction is already present in
`packages/acadamark-core/src/tagname-sigil-map.js` (reserved for
this work); the lowering pass itself is the missing piece.

### Table-of-contents sidebar
`[interpreter]` `[release]` *(→ roadmap: Phase 8)*

A navigation sidebar listing the document's sections — and, for books,
its chapters — letting a reader jump to any heading. Net-new render
output: no current fixture produces a sidebar. UI-shaped — a rendered
reading affordance, not a markup or conversion capability — and likely
shares machinery with the Phase 14 client-side rendering library (the
DOM the library renders is the DOM a sidebar navigates). Release-
blocking for v0.1.0; gets a Phase 0 to site it against the render
pipeline and the client-side library before any code.

### Single-chapter-at-a-time book navigation
`[interpreter]` `[release]` *(→ roadmap: Phase 8)*

For book-structured documents, a reading mode that shows one chapter at
a time with next/previous navigation, instead of rendering the whole
book as one long scroll. Net-new render output and UI-shaped, like the
table-of-contents sidebar; the two are companion navigation features
and likely share the Phase 14 client-side-library machinery.
Release-blocking for v0.1.0; gets a Phase 0.

### Additional display themes
`[interpreter]` `[release]` *(→ roadmap: Phase 8)*

A wider set of visual themes for rendered output, beyond the current
default — the release should ship more than one look. Lower-risk than
the navigation features (themes are CSS, not interactive machinery) but
still net-new; gets a Phase 0 to decide the theme mechanism: how a theme
is selected, what a theme may vary, and how theme CSS relates to the
structural CSS the interpreter emits. Release-blocking for v0.1.0.

### Build the comprehensive demonstrative fixture
`[cross-cutting]` `[release]` *(→ roadmap: Phase 14)*

A single high-quality demonstration document exercising the full Layer 1
vocabulary and authoring surface, serving two roles at once: the
project's worked-example manual, and a render-regression fixture that
the Phase 8 display work and Phase 14 packaging are verified against. It
takes over the demonstrative role the accumulated fixture corpus has
carried — instead of many small fixtures each probing one feature, one
comprehensive document shows the system whole. Built against the
render-quality spec (see Standing), which is written first and defines
what "renders correctly" means. Release-blocking for v0.1.0.

---

## Detailed entries — Architecture tier

### Build JATS export (`rehypeAcadamarkToJats`)
`[interpreter]` `[alpha]` *(→ roadmap: Phase 5)*

The vocabulary is JATS-aligned by design (`jats_counterpart` on every
entry); this is the payoff. *(formerly DF-18)*

Needs a Phase 0 first to site the `acadamark-jats-export` package
against the inward-pointing `acadamark-core`, decide the
export-stage attribute mapper's shape (whether the iteration shape
lifts to core's `mapAttributes(node, vocab, emit)` callback API now
or stays local), and address the JATS section-model question
recorded as deferred in `DESIGN.md`.

### Build render-mode lowering
`[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 8)*

Display-target-three on the display ladder. Gated by the
section-title-heading-level discussion (in Discussions) — the
heading-level question must be decided when render mode is scoped.
*(formerly DF-19)*

### Build multi-file authoring
`[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 9)*

`acadamark.yml` + `<include>`; project-wide registries. A real
architectural extension. Spec at
`notes/specs/multi-file-authoring.md`. *(formerly DF-4)* —
Effort-scoping (2026-05-25) found this is a multi-slice arc with
four open design questions (MF-Q1–4) that are themselves
prerequisites; the user ruled it post-alpha. **The file-reader /
path-resolution substrate** — a single contained slice introducing a
"current file" concept and path resolution to the otherwise
path-agnostic interpreter — could be done early if convenient. It
makes future multi-file work cheaper without committing to any of
the four MF-Q design questions. The multi-file feature itself is
post-alpha.

### Build pagination and print formatting
`[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 8)*

Page-break control, page geometry, print headers/footers, and
related print-targeting machinery. Split from the formerly-combined
book-and-pagination item: book-structuring is about authoring units
(book / book-part / chapter); pagination is about display-target
machinery shared across articles and books. Gated on the
print-requirements spec being written (see Standing).

### Build executable code blocks (JS / Arquero / Vega-Lite)
`[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 10)*

Authors annotate a code block to mark it for execution; the build
runs the code and embeds the result. Ruled post-alpha in the Phase 6
alpha integration check: the alpha milestone is the five-line
acceptance definition (rich-document rendering, canonical authoring,
idiom reduction, JATS export, acadamark ⇄ Layer 1), and executable
code is orthogonal to all five — it adds a build-time runtime, not a
markup or conversion capability. The first-target scope is in-browser
JavaScript execution, with Arquero as the dataframe library and
Vega-Lite as the plotting library — a concrete stack chosen because
it runs entirely in the browser substrate and sidesteps the kernel /
sandboxing / Python install dependencies that a Jupyter-style design
would entail. Established convention via RMarkdown / Quarto / Jupyter, the
DSL-processor model in `DESIGN.md`, and the execution-control
attribute convention (`+eval`, `+echo`, `+output`, `+error`,
`cache`, `dependencies`) are technique-mining sources — relevant
for how the surface looks and how the processor integrates, even
though the runtime is not Jupyter. Post-alpha extensions (other
languages, kernel-based execution, server-side sandboxing) are not
in scope here. Source archived at
`notes/archive/authoring-features-survey-2026-05.md`.

### Build JATS import
`[interpreter]` `[release]` *(→ roadmap: Phase 13)*

The reverse direction of the JATS bridge, and the second half of the
bidirectional JATS conversion the v0.1.0 release demonstrably includes
(export shipped in Phase 5). Deliberately lossy: JATS's vocabulary is
far larger than Layer 1's; constructs with no Layer 1 equivalent are
reduced rather than faithfully preserved. A useful on-ramp from the
existing scholarly corpus, not a round-trip guarantee. Promoted from
post-alpha to release-blocking — first-class now rather than deferred.
Gets its own Phase 0 to scope the mapping and the lossy-reduction
policy before any code.

### Build the client-side rendering library
`[cross-cutting]` `[release]` *(→ roadmap: Phase 14)*

Layer 1 rendering packaged for browser use — `.acm` and Layer 1 HTML
rendered in-browser with no build step. **Carries no JATS capability:**
the JATS bridge (export in Phase 5, import in Phase 13) stays Node-side;
the browser library renders only. The acadamark-core build/run-time seam
was drawn as a browser-safety boundary specifically to enable this build
— core carries no Node-only dependencies, so it can ship to the browser.
An **in-browser editor/viewer** — CodeMirror source on the left,
rendered output on the right — falls out of this library as an example
application: it ships as a library demo documented in the library's
README, **not as a standalone roadmap phase**. A multi-slice arc
(packaging, the browser entry point, the demo app); gets a Phase 0.

---

## Detailed entries — Discussions

### Decide section-title heading level when an article-title is present
`[cross-cutting]` `[post-alpha]`

Where: `notes/specs/layer1-naming.md` open decisions. When both an
`<article-title>` and `<section-title>` are present, do section
titles become `<h2>` (because the article title takes `<h1>`)? Or do
they stay `<h1>` and rely on document structure?

A decision needed before render-mode lowering (architecture tier)
can be meaningfully scoped. Recommended: make the call *when render
mode is scoped*, not before — decisions made far ahead of their
implementation tend to be re-litigated when implementation starts.
This entry exists so the dependency is visible. *(formerly OQ-2)*

### Decide whether `<data>` / `<library>` nodes need a cleanup pass after `buildCitationIndex` reads them
`[interpreter]` `[post-alpha]`

`buildCitationIndex` reads `<data>` and `<library>` nodes at root
level but never removes or modifies them. Rendered output is
unaffected — no visible `<data>` content appears in any fixture, the
`INTERNAL_REGISTRY` returns `null` for them — but a cleanup pass
that removes them after their content is consumed has not been
decided. Low priority; observation, not malfunction. Potential
candidate for a follow-on `indexInputs` consolidation slice.
*(formerly AUD-18)*

### Decide whether books should support per-chapter (scoped) bibliographies
`[interpreter]` `[post-alpha]`

The Phase 6 book-bibliography work settled on **one document-wide
reference list placed in `book-back`** (`bibliography.js`
`findOrCreateBackMatter`, book branch). That is the right alpha
default and the only placement a book needs to be valid. But a long
edited volume might prefer each chapter to carry its own reference
list, scoped the way footnotes already are under
`note-scope=chapter`. This entry exists so that option is visible
and not mistaken for an oversight: the document-wide list is a
decision, not a limitation of the citation machinery. Deferred —
revisit only if a real document wants it. The header comment in
`bibliography.js` points here.

### Discuss whether the cross-reference resolver should warn on type-prefix mismatch
`[interpreter]` `[post-alpha]`

A discussion item, not a build item. When `@fig:priority` resolves
to an equation (or `@sec:foo` to a figure, etc.), the registry knows
the target's actual type and the reference's stated prefix disagrees
with it. This is a detectable mismatch that could be a warning
("ref `@fig:priority` targets an `equation`, not a `figure` — did
you mean `@eqn:priority`?"). The decision settles whether to add
the warning, and at what severity (`file.message()` vs visible
error marker in the rendered output).

**Note:** this is about *catching* a mismatch, not *inferring* the
prefix. Prefix inference was considered earlier and rejected because
it makes the id's meaning implicit and breaks down once elements
are wrapped in `<figure>` downstream — that rejection is context
for the discussion, not a separate item. Filed under the
discussion-is-work rule. Original framing in
`notes/archive/at-sigil-reference-proposal-2026-05.md`.

### Discuss compact external-reference syntax
`[parser]` `[post-alpha]`

A discussion item, not a build item. MyST supports `wiki:Book` to
link to Wikipedia's "Book" article, `doi:10.5281/zenodo.6476040` to
link to a DOI, `arxiv:1234.5678` to link to an arXiv paper,
`github:user/repo` for GitHub. Compact authoring without typing full
URLs. Mechanism: parser-level shortcuts that expand `wiki:foo` to
`<a href="https://en.wikipedia.org/wiki/foo">`. The decision settles
whether to add this, which prefixes to support, and how the parser
recognizes them (a registry of prefix → URL-template pairs, with
`\wiki:foo` as the literal-text escape). This is a parser feature,
not a vocabulary feature. Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under
the discussion-is-work rule.

### Discuss external-link rich previews
`[interpreter]` `[post-alpha]`

A discussion item, not a build item. The hover-preview rendering
substrate exists (currently used for notes, refs, citations — see
`notes/specs/interpreter.md` §10.2). External link metadata-fetching
is the open gap: would require fetching target metadata (Wikipedia
summary, DOI title + abstract, GitHub repo description) at build
time and embedding it for the hover preview to display. The
decision settles whether to add this, which sources to support, and
how to handle build-time network access (caching, offline mode,
fallback when fetch fails). Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under
the discussion-is-work rule.

### Discuss just-in-time math symbol definitions
`[cross-cutting]` `[post-alpha]`

A discussion item, not a build item. A reference system for
mathematical symbols, similar to citations: define `\alpha` once
with a meaning ("the coefficient of foo"), and wherever it appears
its definition pops up on hover. Substantial design — what counts
as a symbol, how definitions are authored (`<symbol-def>` element?
a `<def>` form inside math content?), how the resolver matches
symbol references to definitions across the document, how it
interacts with KaTeX's rendering. The decision settles whether to
add the feature and what its surface looks like. Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under
the discussion-is-work rule.

### Discuss `<presentation>` / `<slide>` / `<slide-notes>` Layer 1 vocabulary
`[vocab]` `[post-alpha]`

A discussion item, not a build item: the design pass that would
decide the vocabulary has not happened. Use cases: slide-decks
rendered for screen presentation (parallel to revealjs / beamer);
reusing content between papers and slides; generating both
presentation HTML and printed handouts from one source; consistent
citation/figure/equation handling between papers and presentations.
Discussion agenda — six open questions identified at the
placeholder's filing:

1. Slide-level attributes — transitions, layouts, themes.
2. How `<presentation>` differs structurally from `<article>` and
   `<book>`.
3. Whether slides have explicit type kwargs (title-slide,
   content-slide, section-divider, etc.).
4. Speaker-notes mechanism (separate `<slide-notes>` elements vs.
   attribute on the slide).
5. How body content relates between paper-mode and presentation-
   mode (the same `<section>` rendering as a section in paper
   output but a slide in presentation output?).
6. How math, figures, citations carry over from paper-authoring
   conventions.

The first concrete step is a chat-side vocabulary design pass
parallel to the article and book design passes; the result is
either a new spec (`presentation.md`, `slide.md`, `slide-notes.md`
in the vocabulary directory) or a recorded decision not to pursue.
Filed under the discussion-is-work rule. The source placeholder
file is archived at
`notes/archive/slide-element-deferred-2026-05.md`.
*(formerly DF-6)*

### Discuss four open design questions prerequisite to multi-file authoring
`[cross-cutting]` `[post-alpha]`

Surfaced by the Front C extensions-cluster spec audit. These are
forks the `notes/specs/multi-file-authoring.md` blueprint previously
presented as settled; the audit and fix-slice disclosed them as
open and filed them here. They are decisions owed before the
multi-file authoring arc is built; they are not independent free
leaves. Filed under the discussion-is-work rule. The spec's §"Open
design questions" section catalogs the same four with the same
identifiers.

- **MF-Q1 — project-config / `<include>` interaction.** When the
  project configuration lists a file and another file also
  `<include>`s it: is the inclusion de-duplicated (project config
  canonical, redundant `<include>` silently skipped) or does the
  file appear at every referenced position (both mechanisms run
  independently)? And on ordering disagreement between the project
  config and an `<include>` position, which wins? Both directions
  are defensible; the choice is a design decision.

- **MF-Q2 — standalone-chapter mode invocation, bibliography scope,
  and stub-marker family.** Three undecided sub-points:
  (a) *invocation* — CLI flag, `<config>` option,
  automatic-on-missing-project-config, or some combination;
  (b) *bibliography scope* — whether standalone mode loads the
  project-config-declared shared bibliography (so cross-file
  `<cite>` still resolves) or treats cross-file cites as unresolved
  stubs; (c) *stub-marker family* — the spec illustrates `[?ref]`
  for the cross-reference case; the corresponding marker shapes for
  cites, notes, and any other cross-file reference are not
  enumerated.

- **MF-Q3 — project-metadata placement in the assembled AST.** The
  spec states project metadata is *sourced* from the project config
  file but does not say where it *lands* in the assembled
  multi-file AST. Two shapes the spec does not choose between: a
  synthesized top-level front-matter block (e.g. a `<book-front>`
  containing a `<meta>` populated from the project config,
  prepended to the assembled book AST) versus distribution as
  inherited defaults available to each chapter's per-chapter
  `<meta>` lookups without appearing as a separate AST node.
  Different shapes affect downstream cross-reference resolution,
  JATS export, and rendering.

- **MF-Q4 — `<include>` pipeline placement and discovery timing.**
  Two undecided sub-points: (a) *pipeline placement* — is
  `<include>` expansion a structural plugin walking the parsed AST
  and splicing included file content, or a parser-level extension
  that re-parses the referenced file inline during the initial
  parse; (b) *discovery timing* — Phase 1 (Discovery) is
  project-wide, but `<include>` directives are inside file content
  and only visible once parsing has happened; does a pre-Phase-1
  discovery sweep collect all transitive include targets, or are
  include-referenced files not listed in the project config
  invisible to Phase 1's project-wide registries?

*(spec: MF-Q1, MF-Q2, MF-Q3, MF-Q4)*

### Discuss four open design questions prerequisite to multi-column display
`[cross-cutting]` `[post-alpha]`

Surfaced by the Front C extensions-cluster spec audit. These are
forks the `notes/specs/multi-column-display.md` blueprint previously
presented as settled; the audit and fix-slice disclosed them as
open and filed them here. They are decisions owed before the
multi-column display feature is built; they are not independent
free leaves. Filed under the discussion-is-work rule. The spec's
§"Open design questions" section catalogs the same four with the
same identifiers.

- **MC-Q1 — `<config>` syntax for column settings.** The
  multi-column-display spec previously illustrated a nested-element
  form (`<config><columns count=2></config>`) which is not
  supported by `<config>` as it currently works —
  `acadamarkConfigDiscovery` (`notes/specs/interpreter.md` §3.2)
  reads kwargs and does not walk nested children (the gap is also
  tracked as the formerly-PG-9 "nested `<config>` not read" item;
  that bug landed in alpha Phase 2 slice 2). The fork: adopt the
  kwarg form `<config columns=2>` (no new machinery), or adopt the
  nested-element form (requires extending `<config>`'s reading
  rules and/or registering a `<columns>` vocabulary element).
  Either is workable as a design.

- **MC-Q2 — render-mode container for `column-count`.** Which
  container carries the CSS `column-count` (and the analogous
  typeset directives): the whole-body container (`<article-body>`
  / `<book-body>`), so the entire body flows in columns; or each
  `<section>` independently, so per-section override is the
  natural unit? Affects cascade semantics and figures that cross
  section boundaries.

- **MC-Q3 — `span` kwarg value space and cascade interaction.** The
  spec illustrates `span=full`. Which other values are accepted
  (e.g. `span=2` for a fractional span in a three-column layout,
  `span=column-set`, `span=none`)? And what does `span=full` mean
  inside a section that is already `columns=1` (no-op, or widens
  the figure beyond the single-column section's width)?

- **MC-Q4 — responsive-vs-fixed signaling mechanism.** How does the
  render-mode lowering know whether the target is responsive (web,
  column count adapts to viewport width) or fixed (print, columns
  constant)? Two candidates: a build / CLI target option (e.g.
  `--target=web` vs `--target=print`), or a `<config>` setting in
  source. Affects authoring conventions — authors mark intent in
  source vs. the build target drives the lowering.

*(spec: MC-Q1, MC-Q2, MC-Q3, MC-Q4)*

### Discuss smart-typography conversions
`[parser]` `[post-alpha]`

Markdown extensions convert `--` to en-dash and `---` to em-dash.
Whether acadamark's pipeline accepts such a plugin — and what the
escape conventions for those sequences look like if it does — is
open. Filed from the spent "what is not yet decided" section of
`escape-rules-spec.md` (Reconciliation 2). If adopted, the escape
rules for `--` / `---` follow whatever plugin acadamark accepts;
acadamark does not own these escapes natively.

### Discuss bare-idiom shortcuts for underline and strikethrough
`[parser]` `[post-alpha]`

Markdown lacks clean conventions for underline and strikethrough.
Acadamark currently uses `<u | text>` and `<s | text>` tagged forms.
Whether to add bare-idiom shortcuts (and what they would be) is
open. Filed from the spent "what is not yet decided" section of
`escape-rules-spec.md` (Reconciliation 2). If shortcuts are added,
the special-character list and escape rules grow to match.

### Discuss hardening the colon-id convention into an explicit spec rule
`[cross-cutting]` `[post-alpha]`

Today the colon-id convention is defined by example: DESIGN.md L254
describes cross-references as `type:name` form with examples
(`fig:scatter`, `eqn:model`, `sec:methods`), and interpreter.md
§3.9 describes "the id prefix" being used for reference text — but
the spec never names the exact rule (`prefix:tail` with non-empty
prefix). Slice 3 of the acadamark-core extraction arc surfaced this
gap when consolidating two pre-existing ad-hoc inline checks that
disagreed (`registry.js` used `id.includes(':')` — would have
indexed a leading-colon `:foo`; `ref-resolution.js` used
`indexOf(':') > 0` — correctly rejected `:foo`). The consolidation
adopted the spec-correct semantics (a flagged spec-conformance fix
at the registry site) and pinned them with unit tests, but the spec
itself still defines the rule only by example. This discussion
item: add an explicit colon-id rule to a spec (DESIGN.md or
`interpreter.md` §3.9), and audit every site that applies the
convention for consistency against the explicit rule. Filed under
the discussion-is-work rule.

### Discuss the sigil as a first-class category
`[cross-cutting]` `[post-alpha]`

Acadamark uses a small set of sigils — `#`/`##`/`###` for sections,
`$`/`$$` for math, `` ` ``/` ``` ` for code — as non-alphabetic
shorthands for Layer 1 constructs. The bidirectional tagname↔sigil
map (`packages/acadamark-core/src/tagname-sigil-map.js`) is the
operational substrate for them, but the *category* itself is not
explicitly defined: there is no canonical sigil registry recording,
per sigil, its parser tagname, its content handler, its vocabulary
key, its opacity expectation, and how author-requested new sigils
are added. This discussion item: define the sigil as an explicit
first-class concept and reconcile any remaining ad-hoc handling
with the explicit model. Filed under the discussion-is-work rule.

### Discuss auditing documented language features against test-fixture coverage
`[tests/build]` `[post-alpha]`

The hash-sigil heading is documented in the spec
(`shorthand-syntax.md` Example 9), described as a fully working
form — but zero test fixtures exercise `<#>`/`<##>`/`<###>`. That
coverage gap is why the hash-sigil dispatch bug stayed latent
through the acadamark-core extraction arc and was only discovered
through static reading during the Slice 4 Phase 0's Q7
investigation. This discussion item: decide whether and how to
systematically audit spec-documented language features against the
test-fixture set, and close gaps. Options include — a one-time
audit slice; a standing rule that every spec example must come
with a fixture; a periodic coverage-against-spec sweep. Filed under
the discussion-is-work rule.

---

## Detailed entries — Standing

### Run a spec-completeness audit against the rebuild-from-docs standard
`[specs/docs]` `[post-alpha]`

*One-time large; future passes will be ordinary.*

Audit every spec in the repo (`DESIGN.md`, `notes/specs/*.md`,
`packages/layer1-vocabulary/SPEC.md`, the per-element vocabulary
entries) against the **rebuild-from-docs standard** stated in the
documentation system design: *with all code deleted, the remaining
documentation must be sufficient to rebuild the project.*

**This is not the previous audit framing.** Drift checks ("does the
spec match the code") have been the standing audit pattern. This
new standard is stricter: it is not "does the spec match" but "is
the spec *sufficient* to recreate the design without the code as a
reference." A spec that describes *what is implemented* may still
be insufficient under this standard if it skips the *why*, the
constraints that bound the design, or the unbuilt parts of the
blueprint.

**Why now.** The documentation system installs the coherence check
as the end of every implementation slice. Future spec drift is
caught at the slice that introduces it. But existing specs were
written under the old framing and have never been held to the
rebuild standard, so they need a one-time pass to bring them up to
it before the per-slice check is meaningful.

**Scope and shape.** Each spec assessed individually; gaps filed as
new backlog items. The audit itself produces no fixes — fixes are
follow-on slices. Likely to be split into several Phase 0
investigations (per spec or per spec-cluster) plus targeted fix
slices.

### Write a print-requirements spec
`[specs/docs]` `[post-alpha]`

A companion spec to the pagination work in Phase 8: what print
output needs to support — page geometry, running heads/feet,
page-break behaviour around floats and sections, footnote placement
on the printed page, front-matter pagination conventions
(roman-numeral pagination for the front matter, arabic for the
body), how cross-references render when target page numbers are
knowable. The spec is the authoring-requirements companion to the
pagination implementation; the implementation arc is gated on this
spec being written.

### Write the render-quality spec
`[specs/docs]` `[release]` *(→ roadmap: Phase 14)*

A spec defining what high-quality rendered output is — the standard the
Phase 8 display features and the Phase 14 comprehensive demonstrative
fixture are verified against. Parallel in shape to the print-
requirements spec above (also Standing): an output-requirements
companion written before the implementation it governs. Its own
document and its own slice — `ROADMAP.md`'s Current position names it
the next active slice — and the slice that writes it also produces the
comprehensive demonstrative fixture built against it. Release-blocking
for v0.1.0.

### Reconcile stale doc cross-references
`[specs/docs]` `[post-alpha]`

Two cross-reference drifts run through the live doc surface, both
artifacts of a rename that did not sweep its references:

- **`BACKLOG-ROADMAP.md` → `BACKLOG.md` / `ROADMAP.md`.** The
  combined backlog/roadmap file was split into two. The split
  milestone fixed the STATUS.md body references but left the STATUS
  header pointer (since corrected in the Phase 6 slice) and a number
  of other live docs still naming the old combined file —
  `CLAUDE.md`, `DESIGN.md`, several `notes/specs/*.md`,
  `packages/acadamark-interpreter/README.md`,
  `packages/layer1-vocabulary/SPEC.md` and some of its
  `elements/*.md`, and the root `ghc-prompt-file-and-push.md`.
- **`rehypeAcadamarkToJats` → `acadamarkToJats`.** JATS export was
  planned as a rehype plugin named `rehypeAcadamarkToJats` but
  implemented in Phase 5 as a tree function `acadamarkToJats`
  (`packages/acadamark-jats-export/src/index.js`). The planned name
  survives in `ROADMAP.md`, this file's closed JATS-export entry, and
  `packages/layer1-vocabulary/SPEC.md`. The Phase 5 Phase 0 findings
  noted the inconsistency but did not reconcile it.

A mechanical sweep, not a design question. `notes/archive/` is frozen
and excluded — its references correctly record what was true on their
date. Could be folded into the spec-completeness audit Standing item
rather than run on its own.

---

## Detailed entries — Deferred (parked)

### The unbraced-inline `@` form
`[parser]` `[post-alpha]`

`…as shown (@fig:priority)…` with no `<ref>` wrapper. The half of
the `@`-sigil proposal NOT adopted in F1. A grammar-wide change:
`@` significant in prose, `\@` escaping, prose-fixture churn.
Parked deliberately. Not on the active roadmap. Revisit only if/when
the bare `@key` affordance is wanted.
