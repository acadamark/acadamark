# acadamark — backlog

The backlog is the project's **unordered pool of open work** — every
open item, queryable by tag, with full detail. Sequence and the alpha
milestone live in `ROADMAP.md`; this document does not order items, it
holds them.

The flat checklist and the detailed entries are two views of the same
set. The flat list is the scannable index; the detailed entries below
it are the authoritative descriptions. Every checkbox corresponds to
one detailed entry; deleting a checkbox without resolving the entry —
or vice versa — is drift, caught by the coherence check in
`CONTRIBUTING.md`.

For the sequencing of `[alpha]` items, see `ROADMAP.md`. Each
`[alpha]` entry in this document names the roadmap phase it belongs to.

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

**Every item carries an alpha-line tag** — `[alpha]` or `[post-alpha]`
— answering "is this required to ship the alpha release?" `[alpha]`
items additionally carry a `→ roadmap: Phase N` cross-reference
naming where they sit in `ROADMAP.md`'s build sequence.

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

- [ ] **Add blank-line termination error recovery in the micromark
  finder** `[parser]` `[alpha]` *(→ roadmap: Phase 11)* *(formerly
  DF-16)*
- [ ] **Multi-key citation key ordering preserved over CSL's
  alphabetical sort** `[interpreter]` `[alpha]` *(→ roadmap: Phase 11)*
  *(formerly PG-8)*
- [ ] **`buildProperties` does not iterate `node.booleans`**
  `[interpreter]` `[post-alpha]` *(filed by sub-slice 2 of deferred-vocab)*
- [ ] **Replace `integration.test.js`'s hand-mirrored pipeline with a
  shared assembly imported from `index.js`** `[tests/build]`
  `[post-alpha]` *(formerly AUD-17)*

### Enhancements

- [ ] **Generalize the qualifying-tag pattern beyond `<table>`**
  `[parser]` `[post-alpha]` *(formerly DF-17)*
- [ ] **Implement per-section footnote collection** `[interpreter]`
  `[alpha]` *(→ roadmap: Phase 2)* *(formerly PG-1)*
- [ ] **Implement margin sidenotes** `[interpreter]` `[post-alpha]` —
  coupled to multi-column display rendering *(formerly PG-2)*
- [ ] **Make the bibliography heading a config kwarg instead of
  hardcoded** `[interpreter]` `[post-alpha]` *(formerly PG-10)*
- [ ] **Implement DSL handlers** (`<csv>`/`<tsv>`, `<mermaid>`/`<abc>`,
  math environments, `<theorem>`) `[interpreter — DSL surface]`
  `[alpha]` *(→ roadmap: Phase 2)* *(formerly DF-8, DF-9, DF-10,
  DF-11a)*
- [ ] **Add deferred vocabulary elements — theorem family**
  `[vocab]` `[alpha]` *(→ roadmap: Phase 1)* *(formerly DF-11b
  remainder)*
- [ ] **Document the tag-form × tag matrix and reconcile
  inconsistencies** `[specs/docs]` `[post-alpha]` *(formerly AUD-15)*
- [ ] **Add forward-pointers from governed specs to design directions
  DD-1..DD-5** `[specs/docs]` `[post-alpha]` *(formerly AUD-25)*
- [ ] **Add integration test and snapshot for `document-9-demo`**
  `[tests/build]` `[alpha]` *(→ roadmap: Phase 4)* *(formerly GAP-9)*
- [ ] **Migrate `<data>` onto the structured-element infrastructure**
  `[interpreter]` `[post-alpha]` *(filed by `beb2fb3`)*
- [ ] **Rename the `dslRegistry` parser option** `[parser]`
  `[post-alpha]` *(filed by `beb2fb3`)*

### Planned work

- [ ] **Implement strict mode (disable markdown idioms)** `[parser]`
  `[post-alpha]` *(→ roadmap: Phase 7)* *(formerly DF-2)*
- [ ] **Specify and implement `<html-passthrough>`** — needs a spec
  written first `[parser]` `[post-alpha]` *(formerly DF-3)*
- [ ] **Implement multi-column display rendering** `[interpreter]`
  `[post-alpha]` *(→ roadmap: Phase 8)* *(formerly DF-5)*
- [ ] **Support caption-as-content for `<table>`, `<figure>`, similar
  (DD-1 / DD-2 implementation)** `[cross-cutting]` `[alpha]`
  *(→ roadmap: Phase 3)* *(formerly AUD-14)*
- [ ] **Build the frameable-class capability** `[cross-cutting]`
  `[alpha]` *(→ roadmap: Phase 3)* *(filed by `1d100eb`)*
- [ ] **Build the lowering pass (Layer 1 → canonical acadamark)**
  `[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 7)*

### Architecture tier

- [ ] **Build JATS export (`rehypeAcadamarkToJats`)** `[interpreter]`
  `[alpha]` *(→ roadmap: Phase 5)* *(formerly DF-18)*
- [ ] **Build render-mode lowering** `[cross-cutting]` `[post-alpha]`
  *(→ roadmap: Phase 8)* *(formerly DF-19)*
- [ ] **Build multi-file authoring** (`acadamark.yml` + `<include>`)
  `[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 9)* *(formerly
  DF-4)*
- [ ] **Build book / book-part document structuring**
  `[cross-cutting]` `[alpha]` *(→ roadmap: Phase 4)* *(formerly DF-12)*
- [ ] **Build pagination and print formatting** `[cross-cutting]`
  `[post-alpha]` *(→ roadmap: Phase 8)*
- [ ] **Build executable code blocks (JS / Arquero / Vega-Lite)**
  `[cross-cutting]` `[alpha]` *(→ roadmap: Phase 10)*
- [ ] **Build JATS import** `[interpreter]` `[post-alpha]`
  *(→ roadmap: Phase 13)*

### Discussions

- [ ] **Decide section-title heading level when an article-title is
  present** `[cross-cutting]` `[post-alpha]` — gates render-mode
  lowering *(formerly OQ-2)*
- [ ] **Decide whether `<data>` / `<library>` nodes need a cleanup
  pass after `buildCitationIndex` reads them** `[interpreter]`
  `[post-alpha]` *(formerly AUD-18)*
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

### Verifications

- [ ] **Verify the remaining `(formerly AUD-N)` items against current
  code** `[cross-cutting]` `[post-alpha]` — pre-flight before any AUD
  item is picked up for implementation work

### Standing

- [ ] **Run a spec-completeness audit against the rebuild-from-docs
  standard** `[specs/docs]` `[post-alpha]` — one-time large; future
  passes will be ordinary per-slice coherence checks
- [ ] **Write a print-requirements spec** `[specs/docs]`
  `[post-alpha]` — companion to the pagination work in Phase 8

### Deferred — explicitly parked

- **The unbraced-inline `@` form** `[parser]` `[post-alpha]` —
  parked; revisit only if/when the bare `@key` affordance is wanted

---

## Detailed entries — Bugs

### Add blank-line termination error recovery in the micromark finder
`[parser]` `[alpha]` *(→ roadmap: Phase 11)*

The micromark finder needs to check each line ending and terminate
open constructs at blank lines for localized error recovery. Currently
a tag opened before a blank line will consume across the blank line or
to EOF. Explicit `Status: Deferred` in
`notes/specs/recursive-content-spec.md`. Under the always-renders
guarantee in `notes/specs/principles.md`, this is a known shortfall —
the "errors stay bounded so the rest of the document is seen" half is
currently violated when EOF-consumption occurs. The route is partly a
design question (where does the construct end? what shape does the
recovery output take?) and partly an implementation question (how does
the streaming tokenizer notice the blank line in time?); the item
stays open until both are settled. **Pulled from alpha Phase 2 slice 1
(2026-05-25) per the escape hatch**: the design question requires a
ruling before implementation. The sibling parser-error-node-renderer
half landed in the same slice (`acadamarkParseError` /
`acadamarkTagError` now render visibly via the new handlers at
`packages/acadamark-interpreter/src/handlers/parser-errors.js`), so
this is now the sole open gap in the always-renders guarantee per
`principles.md` §"Current known gaps". *(formerly DF-16)*

### Multi-key citation key ordering preserved over CSL's alphabetical sort
`[interpreter]` `[alpha]` *(→ roadmap: Phase 11)*

`<cite [@smith2020, @jones2019]>` is passed to citation-js's
`cite.format('citation', {...})` in author order, but citation-js's
CSL processor sorts cluster items by author name (CSL convention)
before formatting. The fix would require one of: (a) modifying the
CSL style XML to disable the per-style sort (not a runtime option);
(b) calling `cite.format` for each key individually and joining the
results (loses cluster-level features like merging shared authors);
(c) patching citation-js's internal sort. Each option has a design
tradeoff — most academic readers expect CSL-conformant alphabetical-
author ordering, so this item is also asking whether acadamark should
diverge from a strong citation convention. **Pulled from alpha Phase
2 slice 2 (2026-05-25) per the escape hatch**: needs both a design
ruling and a non-trivial implementation choice. Sibling sub-bugs
PG-9 (nested `<config>`) and PG-11 (trailing whitespace) landed in
the same slice. *(formerly PG-8)*

The citation-delegation principle recorded in `DESIGN.md` is relevant
here: "lean on citation-js for all such citation questions" — the
discussion that resolves this bug will have to weigh divergence from
CSL convention against that principle.

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

### Replace `integration.test.js`'s hand-mirrored pipeline with a shared assembly imported from `index.js`
`[tests/build]` `[post-alpha]`

The test maintains a separate hand-written copy of the plugin pipeline
assembled in `src/index.js`. The original concern was that the two
would drift — documented recurrence record (paid four times:
R3a/R3b/R4/G1b). The mechanical-batch verification (2026-Q2)
confirmed: **the hand-mirror is currently identical to the real
pipeline — no drift today.** The fix is therefore not "stop the drift"
but "stop allowing it." Making the rewire is **not mechanical**: the
test maintains a manual mirror specifically so it can capture the
intermediate hast tree for snapshot inspection (the `runIntegration`
helper returns `{ html, hast }`), which the real-pipeline assembly
does not expose through unified's standard API. Replacing the mirror
requires a design choice from one of:

(a) extend `acadamarkInterpreter` to expose the intermediate hast via
`file.data`;
(b) refactor the interpreter's compile step into a separately-
importable function the test can call directly;
(c) drop hast-snapshot inspection and assert only on HTML.

Each has different consequences for the test's diagnostic power. The
fix waits for that ruling. Severity: medium — maintenance hazard
(zero drift today but the pattern remains the structural risk).
*(formerly AUD-17)*

---

## Detailed entries — Enhancements

### Generalize the qualifying-tag pattern beyond `<table>`
`[parser]` `[post-alpha]`

Generalizing the qualifying-tag pattern beyond `<table>` (note: the
pattern already works *for* `<table>`). *(formerly DF-17)*

### Implement per-section footnote collection
`[interpreter]` `[alpha]` *(→ roadmap: Phase 2)*

Currently all `<note placement=foot>` notes are collected into a
single `<note-list class="footnotes">` injected at the start of
`<article-back>` (the "foot" classification is nominal — `notes.js`
L11 records "simplified: per-section footnote collection is
deferred"). This item: walk each section's subtree (sections are
already nested by the time `acadamarkNotePlacement` runs), inject a
per-section `<note-list>` for that section's `placement=foot` notes,
leave numbering global (one sequential count across the document).
Effort-scoping (2026-05-25) found this is one contained slice — the
walk-each-section approach uses the existing nested-section tree and
needs no walker change. A small design call: collect at the deepest
containing section, the outermost, or a fixed level? *(formerly PG-1)*

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

### Implement DSL handlers
`[interpreter — DSL surface]` `[alpha]` *(→ roadmap: Phase 2)*

`<csv>`/`<tsv>` standalone (DF-8, AUD-07); `<mermaid>`/`<abc>` (DF-9);
math environments `<matrix>`/`<cases>`/`<align>`/`<eqnarray>` (DF-10);
`<theorem>` handler (DF-11a). **Treat as one body of work, not
individual items** — each is "write a handler," all additive, none
blocks anything. Note DF-10 (the math environments) is the "acadamark
covers ground remark never covered" case from the lexer-supersession
discussion in `notes/specs/idioms.md` — it is independent of the
math-coverage investigation, which concerns delimiter-shaped math
only. The `<theorem>` handler couples with the theorem-family
vocabulary (the open vocab sub-slice 3) — these are likely to land
together in a combined slice or as a paired sequence. *(formerly DF-8,
DF-9, DF-10, DF-11a)*

### Add deferred vocabulary elements — theorem family
`[vocab]` `[alpha]` *(→ roadmap: Phase 1)*

Sub-slice 3 of the deferred-vocab work, remaining after sub-slice 1
(scalar/inline, `13cac93`) and sub-slice 2 (structural blocks, in
flight). The theorem family: `<theorem>`, `<proof>`, `<lemma>`,
`<corollary>`, `<definition>`, `<example>`, and any internal parts
that follow the container-role rule (e.g. `<theorem-statement>`,
`<theorem-proof>`). Each needs a short vocab spec, then a schema
entry. The sub-slice's open design call is whether to combine the
vocab entries and the matching `<theorem>` handler in one slice
(since they couple) or in two — to be decided in the sub-slice's
Phase 0. *(formerly DF-11b remainder)*

### Document the tag-form × tag matrix and reconcile inconsistencies
`[specs/docs]` `[post-alpha]`

The grammar supports short-form (`<tag attrs>`), pipe-content (`<tag
attrs | inline content>`), multi-line pipe-content, long-form (`<tag
attrs>content</tag>` — only for DSL_REGISTRY tags), and self-closing
(`<tag attrs />` — now works uniformly across all tag classes
including DSL_REGISTRY tags as of the alpha Phase 2 slice 1,
2026-05-25; was broken for DSL_REGISTRY per AUD-08 before that fix).
Different tags support different combinations and the mapping is
undocumented and inconsistent. Authors have no clear guide. Fix path:
audit every vocabulary entry; create a unified
`notes/specs/tag-forms-reference.md` showing the full matrix; identify
and fix inconsistencies; establish a principle ("all tags should
support all forms that semantically make sense, with the same
output"). Severity: medium — not a runtime bug, but a real
documentation and design-discoverability issue. *(formerly AUD-15)*

### Add forward-pointers from governed specs to design directions DD-1..DD-5
`[specs/docs]` `[post-alpha]`

`DESIGN.md`'s "Design directions (discovered through implementation)"
section defines five cross-cutting directions (DD-1: content gets
parsed, arguments don't; DD-2: caption-like content supports two
equivalent forms; DD-3: `<meta>` vs `<config>` boundary; DD-4: all
tag forms work for all tags where semantically meaningful; DD-5:
standalone HTML is the build target, client-side is the future). The
directions govern specific vocabulary entries and spec docs, but no
forward-pointer from the governed spec to the relevant direction
exists (`config.md` / `meta.md` do not reference DD-3 — which AUD-13
violates; `figure.md` / `table.md` do not reference DD-1 — directly
relevant to AUD-14 below). Fix path: add "See also: DD-N in DESIGN.md
§Design directions" forward-pointer lines to the governed entries. A
propagation slice; `DESIGN.md` remains the canonical owner.
*(formerly AUD-25)*

### Add integration test and snapshot for `document-9-demo`
`[tests/build]` `[alpha]` *(→ roadmap: Phase 4)*

`test/fixtures/document-9-demo.acm` and `document-9-demo.html` exist
and are re-rendered by `render-fixtures.js`, but unlike documents 1–8
there is no corresponding `document-9-expected.json` snapshot and no
test case in `test/integration.test.js`. document-9 is the most
complex fixture: multi-note forward-reference numbering, external
`.bib` library, inline + display math with equation numbers,
cross-refs — exactly the stages added or restructured in the R1 / R2
/ R3 slices. Without a snapshot, regressions in combined-pipeline
paths can go undetected. Fix path: run `render-fixtures.js`, generate
`document-9-expected.json` from current output, add a test case in
`integration.test.js` mirroring the existing doc6/doc7/doc8 pattern.
Severity: medium — the dark surface area covers the full pipeline in
combination. *(formerly GAP-9)*

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

### Rename the `dslRegistry` parser option
`[parser]` `[post-alpha]`

The parser option historically named `dslRegistry` now carries the
broader `LONG_FORM_TAGS` set (the union of `DSL_REGISTRY` and
`STRUCTURED_ELEMENTS`) as its default. The option name has not
followed the broadening. Rename to something accurate (e.g.
`longFormRegistry` or `recognizedTags`); update the parser, the
interpreter wiring, and the documentation. *(filed by `beb2fb3`)*

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

### Support caption-as-content for `<table>`, `<figure>`, similar (DD-1 / DD-2 implementation)
`[cross-cutting]` `[alpha]` *(→ roadmap: Phase 3)*

Citations inside the `caption=` kwarg of `<table>`, `<figure>`, and
similar elements are not parsed — the kwarg value is a string, cite
tags inside it remain literal text in the rendered output. Affects
any kwarg where rich content might be desirable (figure captions,
alt text, etc.). Two architectural options identified at filing:

- **Option A (recommended at filing):** captions become first-class
  child tags rather than attribute values: `<table #tab:burnout csv |
  ...> <caption | Risk and protective factors, adapted from
  <cite Mantzalas2022>>`. Recursive content parsing handles citations
  naturally. Matches Pandoc/Quarto conventions where captions are
  markdown blocks.
- **Option B:** attribute values get recursive parsing —
  `caption="text <cite key>"` would parse the value as acadamark
  content. More invasive parser change; affects all attribute
  values, not just captions.

Tied to design directions DD-1 ("content gets parsed; arguments
don't") and DD-2 ("tags with caption-like content support two
equivalent forms"). When scoped, follow the design-directions
framing. Severity: medium-high — affects real authoring need
(captions with citations). *(formerly AUD-14)*

### Build the frameable-class capability
`[cross-cutting]` `[alpha]` *(→ roadmap: Phase 3)*

A capability shared by `<fig>`, `<table>`, `<code>`, `<svg>`,
`<mermaid>`, other DSL-registry block elements, plus the generic
`<frame>`. Settled design (recorded in `DESIGN.md` via `1d100eb`):
optional outline box, optional title (top), optional caption
(bottom); numbering folded into caption/title rendering, not a
separate field. `<figure>` is an accepted authoring alias for the
canonical `<fig>`, normalized at the lift gate. The build needs a
Phase 0 first to confirm exact frameable membership and per-member
shape divergences. *(filed by `1d100eb`)*

### Build the lowering pass (Layer 1 → canonical acadamark)
`[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 7)*

The reverse direction of the bidirectional tagname↔sigil cipher,
plus the Layer 1 → canonical-acadamark serialization for authoring
tooling that emits acadamark from Layer 1. The `TAGNAME_TO_SIGIL`
lookup direction is already present in
`packages/acadamark-core/src/tagname-sigil-map.js` (reserved for
this work); the lowering pass itself is the missing piece.

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

### Build book / book-part document structuring
`[cross-cutting]` `[alpha]` *(→ roadmap: Phase 4)*

Vocabulary exists; `article-structuring.js` currently warns and
skips non-article types. *(formerly DF-12)*

### Build pagination and print formatting
`[cross-cutting]` `[post-alpha]` *(→ roadmap: Phase 8)*

Page-break control, page geometry, print headers/footers, and
related print-targeting machinery. Split from the formerly-combined
book-and-pagination item: book-structuring is about authoring units
(book / book-part / chapter); pagination is about display-target
machinery shared across articles and books. Gated on the
print-requirements spec being written (see Standing).

### Build executable code blocks (JS / Arquero / Vega-Lite)
`[cross-cutting]` `[alpha]` *(→ roadmap: Phase 10)*

Authors annotate a code block to mark it for execution; the build
runs the code and embeds the result. Promoted from a Discussions
item once the user ruled it alpha. The alpha scope is in-browser
JavaScript execution, with Arquero as the dataframe library and
Vega-Lite as the plotting library — a concrete first-target stack
chosen because it runs entirely in the browser substrate, sidesteps
the kernel / sandboxing / Python install dependencies that a
Jupyter-style design would entail, and is small enough to fit the
alpha. Established convention via RMarkdown / Quarto / Jupyter, the
DSL-processor model in `DESIGN.md`, and the execution-control
attribute convention (`+eval`, `+echo`, `+output`, `+error`,
`cache`, `dependencies`) are technique-mining sources — relevant
for how the surface looks and how the processor integrates, even
though the runtime is not Jupyter. Post-alpha extensions (other
languages, kernel-based execution, server-side sandboxing) are not
in scope here. Source archived at
`notes/archive/authoring-features-survey-2026-05.md`.

### Build JATS import
`[interpreter]` `[post-alpha]` *(→ roadmap: Phase 13)*

The reverse direction of the JATS bridge. Deliberately lossy: JATS's
vocabulary is far larger than Layer 1's; constructs with no Layer 1
equivalent are reduced rather than faithfully preserved. A useful
on-ramp from the existing scholarly corpus, not a round-trip
guarantee. Not yet scoped; waits.

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

## Detailed entries — Verifications

### Verify the remaining `(formerly AUD-N)` items against current code
`[cross-cutting]` `[post-alpha]`

Five items still carry an AUD-N origin marker: AUD-14, AUD-15,
AUD-17, AUD-18, AUD-25. (AUD-13, the `<config>` silent-accept bug,
was closed by alpha Phase 2 slice 2 — fixed, not verify-and-close.)
The Layer 0 verification slice and the mechanical-fix batch each
found a high already-resolved rate in their cohorts (4/4 Layer 0;
2/2 of the two AUD items in the mechanical batch — AUD-19 and
AUD-24), so the base rate suggests several of the remaining six
are likely already resolved by code that landed without closing the
backlog entry. This item: read each of the six remaining AUD items
against the current code and either close-as-verified-resolved or
leave open with a fresh "still applicable" finding. Should be done
**before** any of those six is picked up as implementation work, to
avoid wasted scoping work on an already-fixed item.

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

---

## Detailed entries — Deferred (parked)

### The unbraced-inline `@` form
`[parser]` `[post-alpha]`

`…as shown (@fig:priority)…` with no `<ref>` wrapper. The half of
the `@`-sigil proposal NOT adopted in F1. A grammar-wide change:
`@` significant in prose, `\@` escaping, prose-fixture churn.
Parked deliberately. Not on the active roadmap. Revisit only if/when
the bare `@key` affordance is wanted.
