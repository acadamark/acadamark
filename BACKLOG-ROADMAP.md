# acadamark — backlog roadmap

**Reconciled 2026-05-25 to open-work-only.** Per `CONTRIBUTING.md`,
this document is the single home for open work in the project. Resolved
items live as append-only milestone lines in `STATUS.md` and are not
recorded here.

The flat backlog (every open item, unordered) and the roadmap (the same
set arranged into Layer 0 / Layer 2 / Layer 3 / Architecture tier /
Standing / Deferred) are two views of the same set — both live in this
file. The flat checklist is the scannable index; the detailed entries
below it are the authoritative descriptions.

## How items are organized

**Within the free-pickable space (Layer 3), items are grouped by
work-kind:**

- **Bugs** — something is broken, behaves wrongly, or silently fails.
  The system is degraded *now*.
- **Enhancements** — the system works; an item would make it better,
  cleaner, or more capable. Small-to-medium additive improvements.
- **Planned work** — larger, intentional feature work. (The
  Architecture tier is the clearest concentration; some Layer 3 items
  are also planned-work-sized.)
- **Discussions** — open questions and design decisions. Nothing is
  built until the discussion resolves. (Per the discussion-is-work rule
  in `CONTRIBUTING.md`.)
- **Verifications** — items that may already be done and need a
  code-check to confirm.

**Layer 0, Layer 2, Architecture tier, Standing, and Deferred keep
their top-level identity** — they are about *dependency / readiness*,
which work-kind does not replace. Layer 3 — the large free-leaves body
— is the part that gets re-cut by work-kind.

The Layer scaffold itself (the `Layer 0 / 1 / 2 / 3 / Architecture /
Standing` nomenclature) is kept as-is in this reorganization; renaming
it is filed as a separate discussion item in the Discussions group
below.

**Every item carries a subsystem tag** — `[parser]`, `[interpreter]`,
`[vocab]`, `[specs/docs]`, `[tests/build]`, or `[cross-cutting]` — at
the start of its detailed entry. The tag travels *with the item*, so a
reader can still scan for "all the parser work" without subsystem
defining the section structure.

## Item identifiers

Every item leads with a **descriptive name** — a short phrase saying
what the work is. Historical provenance codes (`AUD-N`, `DF-N`, `PG-N`,
`OQ-N`, `GAP-N`) are preserved as `(formerly X)` annotations at the end
of each entry so any `STATUS.md` line, commit message, or external
reference still resolves — but they no longer define identity.

Spec design-question codes (`MF-Q1–4`, `MC-Q1–4`) are preserved as
`(spec: X)` annotations because the same codes appear in the
corresponding spec files (`notes/specs/multi-file-authoring.md`,
`notes/specs/multi-column-display.md`).

**New backlog items are not given codes.** A new item gets a descriptive
heading; if it genuinely needs a stable handle, it gets a plain neutral
identifier.

---

## Alpha scope

Every open backlog item carries an **alpha-line tag** alongside its
subsystem tag — one of `[alpha]`, `[post-alpha]`, or `[undecided]`.
The tag is the answer to "is this required to ship the alpha
release?"

### What the alpha release is — the five-point definition

The alpha release demonstrably includes:

1. The Layer 1 custom-HTML elements that render a rich document.
2. Canonical acadamark shorthand authoring that form.
3. Further shorthands (sigils) and markdown idioms reducing to it.
4. JATS ⇔ Layer 1 conversion.
5. Acadamark ⇔ Layer 1 conversion.

### What the tags mean

- **`[alpha]`** — release-blocking; must exist for the alpha release.
- **`[post-alpha]`** — real wanted work, not release-blocking. Future
  milestone or wish-list.
- **`[undecided]`** — genuinely not yet decided; awaits a ruling.

(A transitional **`[alpha-if-cheap]`** tag was used during the
initial alpha-scoping pass for items the user wanted in alpha
conditionally on cost; all such items were resolved by a follow-up
effort-scoping pass on 2026-05-25 — see `STATUS.md` — and the
category is now empty. If a future item needs the same conditional
treatment, the tag can be re-introduced.)

### The alpha set is open

The user is adding to the alpha set beyond what is currently in this
backlog. New items the user names as alpha will be filed with the
`[alpha]` tag directly. Terminology used in the alpha definition
(Layer 1, canonical acadamark, sigils, markdown idioms, strict mode)
is defined in `DESIGN.md` §"Layered model and terminology."

---

## Open items — checklist

A flat scannable index of every open item. Detailed entries below.
Every checkbox here corresponds to one detailed entry; deleting a
checkbox without resolving the entry — or vice versa — is drift.

### Layer 0 — verify first

*Currently clear.* The four "SUSPECTED CLOSED" verification items
(`formerly AUD-06`, `DF-20`, `DF-22`, `OQ-1`) were verified against
the current code and all confirmed closed (see the STATUS milestone).

### Layer 2 — gated

- [ ] **Decide section-title heading level when an article-title is
  present** `[cross-cutting]` `[post-alpha]` *(`formerly OQ-2`)*
  — induced: was only alpha-relevant as a gate on render-mode
  lowering, which is itself `[post-alpha]`

### Layer 3 — by work-kind

#### Bugs

- [ ] **Replace `integration.test.js`'s hand-mirrored pipeline with a
  shared assembly imported from `index.js`** `[tests/build]`
  `[post-alpha]` — pipeline is currently identical to the real
  assembly (no drift), but the rewire needs a design decision on how
  the test captures intermediate hast for snapshot inspection (today
  via manual mirror) *(`formerly AUD-17`)*

#### Enhancements

- [ ] **Generalize the qualifying-tag pattern beyond `<table>`**
  `[parser]` `[post-alpha]` *(`formerly DF-17`)*
- [ ] **Implement per-section footnote collection** `[interpreter]`
  `[alpha]` *(`formerly PG-1`)*
- [ ] **Implement margin sidenotes** `[interpreter]` `[post-alpha]`
  — coupled to multi-column display rendering (the margin is another
  column) *(`formerly PG-2`)*
- [ ] **Make the bibliography heading a config kwarg instead of
  hardcoded** `[interpreter]` `[post-alpha]` *(`formerly PG-10`)*
- [ ] **Implement DSL handlers** (`<csv>`/`<tsv>`, `<mermaid>`/`<abc>`,
  math environments, `<theorem>`) `[interpreter — DSL surface]`
  `[alpha]` *(`formerly DF-8, DF-9, DF-10, DF-11a`)*
- [ ] **Add deferred vocabulary elements** (metadata, definition
  lists, inline-semantic, theorem family, survey absorbs) `[vocab]`
  `[alpha]` — split into three sub-slices by the scoping pass
  (2026-05-26). **Sub-slice 1 done (2026-05-26):** schema-clear
  scalars / inline elements — eleven entries: `publication-date`,
  `affiliation`, `orcid`, `email`, `subject` (metadata / author
  sub-elements); `abbr`, `term` (inline-semantic); `kbd`, `var`,
  `samp`, `output` (HTML-native inline, no JATS counterpart).
  **Sub-slice 2 remaining:** structural blocks — `dl`/`dt`/`dd`,
  `glossary`/`glossary-entry`, `details`/`summary`. **Sub-slice 3
  remaining:** theorem family — `theorem`, `proof`, `lemma`,
  `corollary`, `definition`, `example` (coupled with the
  DF-11a handlers item). The inline-semantic denotation gap
  flagged by the original footnote was resolved by the scoping
  pass (the detail was never lost; the DF-15 archive entry has
  the same list as the detailed entry below).
  *(`formerly DF-13, DF-14, DF-15, DF-11b`)*
- [ ] **Document the tag-form × tag matrix and reconcile inconsistencies**
  `[specs/docs]` `[post-alpha]` *(`formerly AUD-15`)*
- [ ] **Add forward-pointers from governed specs to design directions
  DD-1..DD-5** `[specs/docs]` `[post-alpha]` *(`formerly AUD-25`)*
- [ ] **Add integration test and snapshot for `document-9-demo`**
  `[tests/build]` `[alpha]` *(`formerly GAP-9`)*
- [ ] **Add `short=` kwarg on `<title>`** `[vocab]` `[alpha]`
  — small kwarg addition (ruled out of the deferred-vocabulary item as
  a kwarg, not an element)

#### Planned work

- [ ] **Implement strict mode (disable markdown idioms)** `[parser]`
  `[post-alpha]` *(`formerly DF-2`)*
- [ ] **Specify and implement `<html-passthrough>`** — needs a spec
  written first `[parser]` `[post-alpha]` *(`formerly DF-3`)*
- [ ] **Implement multi-column display rendering** `[interpreter]`
  `[post-alpha]` *(`formerly DF-5`)*
- [ ] **Support caption-as-content for `<table>`, `<figure>`, similar
  (DD-1 / DD-2 implementation)** `[cross-cutting]` `[alpha]`
  — coupled to the frameable-class Phase 0 below, which audits every
  caption / cross-reference / numbering site against the umbrella
  assumption *(`formerly AUD-14`)*
- [ ] **Frameable-class Phase 0** `[cross-cutting]` `[alpha]`
  — read-only investigation mapping every site in the code that
  assumes the `<figure>`-umbrella model (caption handling,
  cross-referencing, numbering, the DD-1/DD-2 caption-as-content
  item). Prerequisite to the frameable-class implementation slice.
  Design baseline: `DESIGN.md` §"Frameable elements: a shared
  capability."
- [ ] **Migrate `<data>` onto the structured-element infrastructure**
  `[cross-cutting]` `[post-alpha]` — `<data>` is a structural container
  whose content is a list of resources (`<library>`, `<bib-entry>`),
  not a record of named fields. The 2026-05-27 structured-element-
  infrastructure slice ruled it does not fit the structured-data-container
  category as currently defined (no kwarg surface, no field record),
  and left it in `DSL_REGISTRY` as-is. Revisit: extend the infrastructure
  to also cover list-of-resources containers, or define a sibling
  registry for them.
- [ ] **Rename the `dslRegistry` option on `acadamarkSyntax`**
  `[parser]` `[post-alpha]` — the option's default became `LONG_FORM_TAGS`
  (DSL_REGISTRY ∪ STRUCTURED_ELEMENTS) in the 2026-05-27
  structured-element-infrastructure slice; the name is now misleading.
  Rename to `longFormRegistry` (or similar) and update the JSDoc / index.js
  surface. Bounded: this is a one-package public-API change with a small
  internal consumer set.

#### Discussions

- [ ] **Decide whether `<data>` / `<library>` nodes need a cleanup
  pass after `buildCitationIndex` reads them** `[interpreter]`
  `[post-alpha]` *(`formerly AUD-18`)*
- [ ] **Discuss whether the cross-reference resolver should warn on
  type-prefix mismatch** `[interpreter]` `[post-alpha]`
- [ ] **Discuss compact external-reference syntax** (`wiki:`, `doi:`,
  `arxiv:`, `github:`) `[parser]` `[post-alpha]`
- [ ] **Discuss external-link rich previews** (build-time metadata
  fetching) `[interpreter]` `[post-alpha]`
- [ ] **Discuss just-in-time math symbol definitions** (reference
  system for math) `[cross-cutting]` `[post-alpha]`
- [ ] **Discuss `<presentation>` / `<slide>` / `<slide-notes>`
  Layer 1 vocabulary** `[vocab]` `[post-alpha]` *(`formerly DF-6`)*
- [ ] **Discuss four open design questions prerequisite to multi-file
  authoring** (project-config / `<include>` interaction;
  standalone-chapter mode; project-metadata placement; pipeline
  placement + discovery timing) `[cross-cutting]` `[post-alpha]`
  — tracks with multi-file authoring itself
  *(`spec: MF-Q1, MF-Q2, MF-Q3, MF-Q4`)*
- [ ] **Discuss four open design questions prerequisite to
  multi-column display** (`<config>` syntax; render-mode container;
  `span` value space; responsive-vs-fixed signaling) `[cross-cutting]`
  `[post-alpha]` *(`spec: MC-Q1, MC-Q2, MC-Q3, MC-Q4`)*
- [ ] **Discuss smart-typography conversions** (`--` → en-dash,
  `---` → em-dash) `[parser]` `[post-alpha]`
- [ ] **Discuss bare-idiom shortcuts for underline and strikethrough**
  `[parser]` `[post-alpha]`
- [ ] **Discuss the backlog's item-counting convention** (when grouped
  checklist lines count as one item vs N) `[specs/docs — backlog
  organization]` `[post-alpha]`
- [ ] **Discuss hardening the colon-id convention from
  example-by-implication into an explicit spec rule** —
  define `prefix:tail` precisely (non-empty prefix) and audit every
  site that applies the convention for consistency `[cross-cutting]`
  `[post-alpha]`
- [ ] **Discuss the sigil as a first-class category** — a canonical
  sigil registry recording what each sigil is shorthand for and how
  author-requested sigils are added, reconciled with the DSL registry
  and `tagname-sigil-map` (formerly `sigil-mapping`). The hash-sigil
  dispatch and opacity bugs (closed in alpha Phase 1, `61fdf5f`) were
  the concrete instances that surfaced the case for this discussion.
  `[cross-cutting]` `[post-alpha]`
- [ ] **Discuss auditing documented language features against
  test-fixture coverage** — a documented spec example (the
  hash-sigil heading in `shorthand-syntax.md` Example 9) had zero
  fixture coverage, which is how the `#`-sigil bug stayed latent;
  decide whether and how to systematically close such gaps
  `[tests/build]` `[post-alpha]`

### Architecture tier

- [ ] **Build JATS export (`rehypeAcadamarkToJats`)** `[interpreter]`
  `[alpha]` *(`formerly DF-18`)*
- [ ] **Build render-mode lowering** `[cross-cutting]` `[post-alpha]`
  — gated by the Layer 2 heading-level discussion *(`formerly DF-19`)*
- [ ] **Build multi-file authoring** (`acadamark.yml` + `<include>`)
  `[cross-cutting]` `[post-alpha]` *(`formerly DF-4`)*
- [ ] **Build book / book-part document structuring** — multi-chapter
  document structure; `article-structuring.js` currently warns and
  skips non-article types `[cross-cutting]` `[alpha]`
  *(`formerly DF-12`)*
- [ ] **Build pagination and print formatting** — page breaks,
  running heads, print-oriented layout `[cross-cutting]`
  `[post-alpha]` — split off from the book/book-part item
- [ ] **Build executable code blocks** — JavaScript execution + Arquero
  + Vega-Lite (alpha scope may be that subset only) `[cross-cutting]`
  `[alpha]` — promoted from a Discussion item once the user ruled it
  alpha

### Standing items

- [ ] **Run a spec-completeness audit against the rebuild-from-docs
  standard** — one-time large; future passes will be ordinary
  `[specs/docs]` `[post-alpha]`

### Other open work

- [ ] **Write a print-requirements spec** — pagination, running heads,
  print formatting; companion to the pagination item in the
  Architecture tier `[specs/docs]` `[post-alpha]`
- [ ] **Verify the remaining `(formerly AUD-N)` items against current
  code** — five items remain: AUD-14, AUD-15, AUD-17, AUD-18,
  AUD-25 (AUD-13 closed by alpha Phase 2 slice 2, 2026-05-25). Recent
  slices found a 6/6 already-resolved rate in this
  cohort (the four Layer 0 items, AUD-19, AUD-24); the base rate says
  several of the remaining six are likely already resolved too.
  Should be done **before** any of those six AUD items is picked up as
  implementation work, to avoid wasted scoping. `[cross-cutting]`
  `[post-alpha]`
### Explicitly deferred — parked

- **The unbraced-inline `@` form** `[parser]` `[post-alpha]` *(parked;
  revisit only if/when the bare `@key` affordance is wanted)*

---

## Start here — what to work on next

### Open dependency chains

After the reconciliation, the active backlog has **one** hard
dependency chain:

- **The section-title heading-level discussion (Layer 2) → render-mode
  lowering (Architecture).** The heading-level question
  (`<article-title>` + `<section-title>` coexistence) must be decided
  before render-mode lowering can be meaningfully scoped.

Everything else in Layers 0, 2, and 3 (and the Architecture tier other
than render-mode lowering) is independently pickable. The math-coverage
investigation mentioned in the Layer 0 verification group is opt-in
scoping work, not a blocker.

### Unblocked, high-value picks (start-here shortlist)

Equally good next picks; no designated top pick. The shortlist is
fluid — refresh as priorities shift without disturbing the structure
above.

- **Replace `integration.test.js`'s hand-mirrored pipeline with a
  shared assembly** *(`formerly AUD-17`)*. The hand-mirror is
  currently identical to the real pipeline (no drift), but the rewire
  needs a design ruling on how the test captures intermediate hast for
  snapshot inspection without manually rebuilding the pipeline. See the
  detailed entry below for the three options.

---

## Layer 0 — verify first (detailed)

*Currently clear.* The four items that lived here (`formerly AUD-06`,
`DF-20`, `DF-22`, `OQ-1`) were verified against the current code and
all confirmed closed — see the STATUS milestone for the verification
evidence (`remark-gfm` and `remark-math` installed and wired into both
processors; `acadamarkNormalizeMarkdown` rewrites `inlineMath` / `math`
/ `table` nodes to canonical acadamarkTag nodes; `document-11-bare-math.acm`
and `document-12-bare-table.acm` integration fixtures exercise both the
outer and inner-via-recursive-content surfaces and pass with snapshots
stable).

---

## Layer 2 — gated items (detailed)

### Decide section-title heading level when an article-title is present
`[cross-cutting — specs/docs + interpreter]` `[post-alpha]`
*(induced: render-mode lowering is `[post-alpha]`, so the gate is too)*

Where: `notes/specs/layer1-naming.md` open decisions. When both an
`<article-title>` and `<section-title>` are present, do section titles
become `<h2>` (because the article title takes `<h1>`)? Or do they stay
`<h1>` and rely on document structure?

A decision needed before DF-19 (render-mode lowering, Architecture
tier) can be meaningfully scoped. Filed in Layer 2 because it
explicitly gates DF-19.

Recommended: make the call *when render mode is scoped*, not before —
decisions made far ahead of their implementation tend to be
re-litigated when implementation starts. This entry exists so the
dependency is visible from the roadmap rather than buried inside the
render-mode discussion.

**Action:** decide when DF-19 is scoped.

*(`formerly OQ-2`)*

---

## Layer 3 — free leaves, by work-kind (detailed)

None of these blocks or is blocked by anything (except where a sibling
pointer notes an internal pairing). Pick by appetite. The work-kind
order here matches the flat checklist's Layer 3 order, so the two views
scan in parallel.

### Bugs

**Replace `integration.test.js`'s hand-mirrored pipeline with a shared
assembly imported from `index.js`** `[tests/build]` `[post-alpha]`. The test maintains
a separate hand-written copy of the plugin pipeline assembled in
`src/index.js`. The original concern was that the two would drift —
documented recurrence record (paid four times: R3a/R3b/R4/G1b). The
mechanical-batch verification (2026-Q2) confirmed: **the hand-mirror
is currently identical to the real pipeline — no drift today.** The
fix is therefore not "stop the drift" but "stop allowing it." Making
the rewire is **not mechanical**: the test maintains a manual mirror
specifically so it can capture the intermediate hast tree for snapshot
inspection (the `runIntegration` helper returns `{ html, hast }`),
which the real-pipeline assembly does not expose through unified's
standard API. Replacing the mirror requires a design choice from one
of: (a) extend `acadamarkInterpreter` to expose the intermediate hast
via `file.data`; (b) refactor the interpreter's compile step into a
separately-importable function the test can call directly; (c) drop
hast-snapshot inspection and assert only on HTML. Each has different
consequences for the test's diagnostic power. The fix waits for that
ruling. Severity: medium — maintenance hazard (zero drift today but
the pattern remains the structural risk).
*(`formerly AUD-17`)*

### Enhancements

**Generalize the qualifying-tag pattern beyond `<table>`** `[parser]` `[post-alpha]`.
Generalizing the qualifying-tag pattern beyond `<table>` (DF-17 —
note: already works *for* `<table>`). *(`formerly DF-17`)*

**Implement per-section footnote collection** `[interpreter]`
`[alpha]`. Currently all `<note placement=foot>` notes are collected
into a single `<note-list class="footnotes">` injected at the start
of `<article-back>` (the "foot" classification is nominal —
`notes.js` L11 records "simplified: per-section footnote collection
is deferred"). This item: walk each section's subtree (sections are
already nested by the time `acadamarkNotePlacement` runs), inject a
per-section `<note-list>` for that section's `placement=foot` notes,
leave numbering global (one sequential count across the document).
Effort-scoping (2026-05-25) found this is one contained slice — the
walk-each-section approach uses the existing nested-section tree
and needs no walker change. A small design call: collect at the
deepest containing section, the outermost, or a fixed level?
*(`formerly PG-1`)*

**Implement margin sidenotes** `[interpreter]` `[post-alpha]`. Today
`placement=side` produces a fallback `<li class="sidenote-fallback">`
collected in article-back; the plugin comment notes "Future themes
provide margin positioning." This item: actual margin-positioned
sidenotes — a sidenote renders in the page margin near its in-text
anchor. **Should be implemented as part of, or on top of,
multi-column display rendering** — a margin sidenote is structurally
another column, and the multi-column layout engine is the machinery
a margin needs. Implementing sidenotes standalone would build a
one-off margin-positioning system that the multi-column work would
duplicate or obsolete. Cross-reference: the multi-column display
rendering item (also `[post-alpha]`). *(`formerly PG-2`)*

**Make the bibliography heading a config kwarg instead of hardcoded**
`[interpreter]` `[post-alpha]`. Hardcoded bibliography heading (PG-10 — a config
kwarg, very small). *(`formerly PG-10`)*

**Implement DSL handlers** `[interpreter — DSL surface]` `[alpha]`. `<csv>`/`<tsv>`
standalone (DF-8, AUD-07); `<mermaid>`/`<abc>` (DF-9); math
environments `<matrix>`/`<cases>`/`<align>`/`<eqnarray>` (DF-10);
`<theorem>` handler (DF-11a). **Treat as one body of work, not
individual items** — each is "write a handler," all additive, none
blocks anything. Note DF-10 (the math environments) is the "acadamark
covers ground remark never covered" case from the lexer-supersession
discussion in `notes/specs/idioms.md` — it is independent of the
math-coverage investigation, which concerns delimiter-shaped math
only. (DF-11b — the `<proof>`/`<lemma>`/etc. *vocabulary* — needs a
vocab design pass first; it lives in the Vocabulary entry below as
the sibling of DF-11a.) *(`formerly DF-8, DF-9, DF-10, DF-11a`)*

**Add deferred vocabulary elements** `[vocab]` `[alpha]`.

**Split into three sub-slices (scoping pass 2026-05-26).** The inline-semantic denotation question the original footnote flagged was resolved by the scoping pass — the DF-15 archive entry (`notes/archive/specified-not-implemented-2026-05.md`) preserves the exact element list (`<abbr>`, `<term>`, `<glossary>`, `<glossary-entry>`), matching the enumeration below; the detail was never lost.

**Sub-slice 1 done (2026-05-26):** the schema-clear scalars and inline elements — eleven entries shipped:
- Metadata / author sub-elements: `publication-date`, `affiliation`, `orcid`, `email`, `subject`.
- Inline-semantic (the inline two of DF-15's four): `abbr`, `term`.
- HTML-native inline (no JATS counterpart, recorded per the `<lang>` precedent): `kbd`, `var`, `samp`, `output`.

**Sub-slice 2 remaining:** structural blocks — definition lists (`<dl>`/`<dt>`/`<dd>`, formerly DF-14); glossary structure (`<glossary>`/`<glossary-entry>` — the structural two of DF-15's four); collapsibles (`<details>`/`<summary>`).

**Sub-slice 3 remaining:** theorem family — `<theorem>`, `<proof>`, `<lemma>`, `<corollary>`, `<definition>`, `<example>` (DF-11b — vocabulary half of the theorem cluster; couples with the DF-11a handlers item, so vocab lands first, handlers follow).

The original `<keywords>` and the rich-author-metadata kwargs (`<doi>`, `<license>`, `<lang>`, `<version>`, `<keywords>`) shipped earlier (2026-05-25 apparatus-tag reconciliation follow-on). Three survey-absorbed elements were **ruled out as elements**: `<corresponding>` is a kwarg (`+corresponding` boolean on `<author>`), folded into the **`<author>` structured-interface reconciliation** item filed under Planned work below; `<short-title>` is a kwarg (`short=` on `<title>`), filed as the small **`<title> short=` kwarg** item under Enhancements below; `<thumbnail>` is dropped entirely per `DESIGN.md` §"The vocabulary-boundary principle" (a thumbnail is a web-presentation artifact for one delivery channel, not a property of the document).

The remaining sub-slices (2 + 3) keep this item open until sub-slice 3 completes.

Additional small-vocab candidates surfaced in the authoring-features
survey (archived 2026-05-23) and absorbed into this cluster — same
shape, same batch:

- **Programming-related inline elements**: `<kbd>` (keyboard input),
  `<var>`, `<samp>`, `<output>` (HTML-native; small schema entries).
- **Collapsible sections**: `<details>` / `<summary>` (HTML-native;
  pipe-content of `<details>` becomes `<summary>`, body becomes the
  expandable content).
- **Rich author metadata**: sub-elements within `<author>` —
  `<name>`, `<affiliation>`, `<orcid>`, `<email>` (structured author
  info for journal venues and JATS export). **All shipped** — the
  three of `<affiliation>`/`<orcid>`/`<email>` in deferred-vocab
  sub-slice 1 (`13cac93`); `<name>` plus the structured-author
  interface (kwargs-or-child-tags lift parallel to `<meta>`) in the
  2026-Q2 structured-element-infrastructure slice. `<corresponding>`
  was originally listed here as an element and was **ruled a kwarg,
  not an element** — `+corresponding` boolean on `<author>`, also
  shipped with the structured-element infrastructure.
- **Document-level metadata elements**: `<license>` (SPDX code),
  `<doi>`, `<subject>` (document classifier). Each is a small addition
  to `<meta>`'s allowed children. Two originally-listed members are
  **ruled out**: `<short-title>` is a kwarg, not an element —
  `short=` kwarg on `<title>`, filed as a small `[alpha]` item
  (the `<title> short=` kwarg) under Enhancements below; `<thumbnail>`
  is dropped entirely under the vocabulary-boundary principle
  (`DESIGN.md` §"The vocabulary-boundary principle") — a thumbnail is
  a web-presentation artifact for one delivery channel, not a property
  of the document.

*(`formerly DF-13, DF-14, DF-15, DF-11b`)*

**Document the tag-form × tag matrix and reconcile inconsistencies**
`[specs/docs]` `[post-alpha]`. The grammar supports short-form (`<tag attrs>`),
pipe-content (`<tag attrs | inline content>`), multi-line
pipe-content, long-form (`<tag attrs>content</tag>` — only for
DSL_REGISTRY tags), and self-closing (`<tag attrs />` — now works
uniformly across all tag classes including DSL_REGISTRY tags as of
the alpha Phase 2 slice 1, 2026-05-25; was broken for DSL_REGISTRY
per AUD-08 before that fix). Different tags support different
combinations and the mapping is undocumented and inconsistent.
Authors have no clear guide. Fix path: audit every vocabulary entry;
create a unified `notes/specs/tag-forms-reference.md` showing the
full matrix; identify and fix inconsistencies; establish a principle
("all tags should support all forms that semantically make sense,
with the same output"). Severity: medium — not a runtime bug, but a
real documentation and design-discoverability issue.
*(`formerly AUD-15`)*

**Add forward-pointers from governed specs to design directions
DD-1..DD-5** `[specs/docs]` `[post-alpha]`. `DESIGN.md`'s "Design directions
(discovered through implementation)" section defines five
cross-cutting directions (DD-1: content gets parsed, arguments don't;
DD-2: caption-like content supports two equivalent forms; DD-3:
`<meta>` vs `<config>` boundary; DD-4: all tag forms work for all tags
where semantically meaningful; DD-5: standalone HTML is the build
target, client-side is the future). The directions govern specific
vocabulary entries and spec docs, but no forward-pointer from the
governed spec to the relevant direction exists (`config.md` /
`meta.md` do not reference DD-3 — which AUD-13 violates; `figure.md` /
`table.md` do not reference DD-1 — directly relevant to AUD-14
below). Fix path: add "See also: DD-N in DESIGN.md §Design directions"
forward-pointer lines to the governed entries. A propagation slice;
`DESIGN.md` remains the canonical owner. *(`formerly AUD-25`)*

**Add integration test and snapshot for `document-9-demo`**
`[tests/build]` `[alpha]`. `test/fixtures/document-9-demo.acm` and
`document-9-demo.html` exist and are re-rendered by
`render-fixtures.js`, but unlike documents 1–8 there is no
corresponding `document-9-expected.json` snapshot and no test case in
`test/integration.test.js`. document-9 is the most complex fixture:
multi-note forward-reference numbering, external `.bib` library,
inline + display math with equation numbers, cross-refs — exactly the
stages added or restructured in the R1 / R2 / R3 slices. Without a
snapshot, regressions in combined-pipeline paths can go undetected.
Fix path: run `render-fixtures.js`, generate
`document-9-expected.json` from current output, add a test case in
`integration.test.js` mirroring the existing doc6/doc7/doc8 pattern.
Severity: medium — the dark surface area covers the full pipeline in
combination. *(`formerly GAP-9`)*

**Add `short=` kwarg on `<title>`** `[vocab]` `[alpha]`. Small kwarg
addition. `<short-title>` was originally enumerated as an element in
the deferred-vocabulary cluster; ruled a kwarg, not an element, in the
2026-05-26 design-recording slice. The work: extend `<title>`'s vocab
entry with a `short=` kwarg that maps to `data-short-title` (or
equivalent JATS-shaped attribute on Layer 1 `<title>`), with the JATS
counterpart `<alt-title alt-title-type="short">`. One vocab entry edit,
one regenerated `data.js`, fixture coverage. Filed at small-`[alpha]`
size because it ships in a single contained slice and is part of the
alpha-required Layer 1 vocabulary obligation.

### Planned work

**Implement strict mode (disable markdown idioms)** `[parser]` `[post-alpha]`.
Bounded; disables markdown idioms. Under the normalization model,
strict mode is the mode in which the normalization pass has nothing
to do (no markdown-form nodes are produced). *(`formerly DF-2`)*

**Specify and implement `<html-passthrough>`** `[parser]` `[post-alpha]`.
`<html-passthrough>` — needs a *spec* written first; it is "planned,
not yet specified." A design step precedes the code.
*(`formerly DF-3`)*

**Implement multi-column display rendering** `[interpreter]` `[post-alpha]`. Spec is
`notes/specs/multi-column-display.md`; render-mode concern.
Independent leaf, low-priority unless a publication target needs it.
*(`formerly DF-5`)* — Margin sidenotes (see that item) are coupled
to this work: the margin is another column, and the multi-column
layout engine is the machinery a margin needs.

**Support caption-as-content for `<table>`, `<figure>`, similar (DD-1
/ DD-2 implementation)** `[cross-cutting]` `[alpha]`. Citations inside the
`caption=` kwarg of `<table>`, `<figure>`, and similar elements are
not parsed — the kwarg value is a string, cite tags inside it remain
literal text in the rendered output. Affects any kwarg where rich
content might be desirable (figure captions, alt text, etc.). Two
architectural options identified at filing:

- **Option A (recommended at filing):** captions become first-class
  child tags rather than attribute values: `<table #tab:burnout csv | ...> <caption | Risk and protective factors, adapted from <cite Mantzalas2022>>`.
  Recursive content parsing handles citations naturally. Matches
  Pandoc/Quarto conventions where captions are markdown blocks.
- **Option B:** attribute values get recursive parsing —
  `caption="text <cite key>"` would parse the value as acadamark
  content. More invasive parser change; affects all attribute values,
  not just captions.

Tied to design directions DD-1 ("content gets parsed; arguments
don't") and DD-2 ("tags with caption-like content support two
equivalent forms"). When scoped, follow the design-directions
framing. **Coupled to the frameable-class Phase 0 below** — the
Phase 0 audits caption / cross-reference / numbering sites against
the prior `<figure>`-umbrella assumption, which is the same surface
this item touches. The two will likely be scoped together when work
begins. Severity: medium-high — affects real authoring need
(captions with citations). *(`formerly AUD-14`)*

**Frameable-class Phase 0** `[cross-cutting]` `[alpha]`. Read-only
investigation. Maps every site in the code that today assumes the
`<figure>`-as-umbrella model — the model in which `<figure>` was a
single wrapping element that contained an inner content element
(`<img>` from a `src` kwarg, or an author-placed `<table>`/`<code>`/
`<equation>`) plus a `<figcaption>`. The new design (recorded in
`DESIGN.md` §"Frameable elements: a shared capability") supersedes
the umbrella: frameable is a uniform capability shared across `<fig>`,
`<table>`, `<code>`, `<svg>`, `<mermaid>`, the other DSL-registry
block elements, and a generic `<frame>`; `<fig>` is the sole
graphical element (no separate `<img>`/`<picture>`); `<figure>` is
the authoring alias for canonical `<fig>`.

The Phase 0 catalogs: every reference to `<figure>` in product code
and vocabulary entries; every caption-handling site (the figure
handler at `packages/acadamark-interpreter/src/handlers/figure.js`;
the table handler; any inline-code caption surface); every
cross-reference site that knows about figure ids vs other ids; the
numbering pipeline's handling of "figures" as a category vs the
per-frameable-tag numbering domains; the gate's bare-markdown-image
lift (today emits `<img>`, must emit `<fig>` in the new design); the
existing `figure.md` / `img.md` / `table.md` / `code.md` vocab entries
and the rewrites each needs; the DD-1 / DD-2 caption-as-content
backlog item (AUD-14 above) which overlaps this surface and is
explicitly coupled. Output: a recommended-scope verdict naming the
implementation slices that follow.

Prerequisite to the frameable-class implementation slice. **Do not
implement during Phase 0 — read-only, per the standard Phase 0
contract.** One open sub-question recorded inside the design (the
exact membership list of the frameable class) is one of the items the
Phase 0 confirms by enumerating current DSL-registry members.

**Migrate `<data>` onto the structured-element infrastructure**
`[cross-cutting]` `[post-alpha]`. The 2026-05-27 structured-element-
infrastructure slice (which built the registry, migrated `<meta>` onto
it, and added `<author>`) assessed `<data>` and ruled it does not fit
the structured-data-container category as currently defined: `<data>`'s
content is a *list of resources* (`<library>`, `<bib-entry>`, etc.) —
one-of-same-kind, plural — not a *record of named fields* with
distinct scalar values. It also has no kwarg surface today. Leaving
`<data>` in `DSL_REGISTRY` was the no-force outcome of the slice's
Step 5 assessment.

This item: revisit `<data>` after observing how the structured-element
infrastructure ages with `<meta>` and `<author>`. Two paths to choose
between when scoping: (a) extend the structured-element registry to
also cover list-of-resources containers (the spec gains a
`childrenAreList: true` flag or similar); (b) define a sibling
registry for that pattern and keep `STRUCTURED_ELEMENTS` strictly
about field-record containers. Either way, the goal is to remove
`<data>` from `DSL_REGISTRY`'s long-form-eligibility role (since
`<data>` is not a DSL) and place it in a category that matches what
it is.

**Rename the `dslRegistry` option on `acadamarkSyntax`** `[parser]`
`[post-alpha]`. The plugin option's default became `LONG_FORM_TAGS`
(the union of `DSL_REGISTRY` and `STRUCTURED_ELEMENTS`) in the
2026-05-27 structured-element-infrastructure slice; the historical
option name is now misleading. The 2026-05-27 slice left the name
unchanged to avoid a public-API churn inside an already-large slice
(see the JSDoc comment in `packages/remark-acadamark/src/syntax.js`
for the explanation). This item: rename to `longFormRegistry` (or
similar), update the JSDoc in `syntax.js` and the plugin entry in
`packages/remark-acadamark/src/index.js`, audit any internal callers
that pass the option (the codebase grep at slice-end found no such
callers; the option is exposed but unused by default consumers).

### Discussions

**Decide whether `<data>` / `<library>` nodes need a cleanup pass
after `buildCitationIndex` reads them** `[interpreter]` `[post-alpha]`.
`buildCitationIndex` reads `<data>` and `<library>` nodes at root
level but never removes or modifies them. Rendered output is
unaffected — no visible `<data>` content appears in any fixture, the
`INTERNAL_REGISTRY` returns `null` for them — but a cleanup pass
that removes them after their content is consumed has not been
decided. Low priority; observation, not malfunction. Potential
candidate for a follow-on `indexInputs` consolidation slice.
*(`formerly AUD-18`)*

**Discuss whether the cross-reference resolver should warn on
type-prefix mismatch** `[interpreter]` `[post-alpha]`. A discussion item, not a
build item. When `@fig:priority` resolves to an equation (or
`@sec:foo` to a figure, etc.), the registry knows the target's actual
type and the reference's stated prefix disagrees with it. This is a
detectable mismatch that could be a warning ("ref `@fig:priority`
targets an `equation`, not a `figure` — did you mean
`@eqn:priority`?"). The decision settles whether to add the warning,
and at what severity (`file.message()` vs visible error marker in the
rendered output).

**Note:** this is about *catching* a mismatch, not *inferring* the
prefix. Prefix inference was considered earlier and rejected because
it makes the id's meaning implicit and breaks down once elements are
wrapped in `<figure>` downstream — that rejection is context for the
discussion, not a separate item. Filed under the discussion-is-work
rule. Original framing in
`notes/archive/at-sigil-reference-proposal-2026-05.md`.

**Discuss compact external-reference syntax** `[parser]` `[post-alpha]`. A
discussion item, not a build item. MyST supports `wiki:Book` to link
to Wikipedia's "Book" article, `doi:10.5281/zenodo.6476040` to link
to a DOI, `arxiv:1234.5678` to link to an arXiv paper, `github:user/repo`
for GitHub. Compact authoring without typing full URLs. Mechanism:
parser-level shortcuts that expand `wiki:foo` to
`<a href="https://en.wikipedia.org/wiki/foo">`. The decision settles
whether to add this, which prefixes to support, and how the parser
recognizes them (a registry of prefix → URL-template pairs, with
`\wiki:foo` as the literal-text escape). This is a parser feature,
not a vocabulary feature. Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under the
discussion-is-work rule.

**Discuss external-link rich previews** `[interpreter]` `[post-alpha]`. A discussion
item, not a build item. The hover-preview rendering substrate exists
(currently used for notes, refs, citations — see
`notes/specs/interpreter.md` §10.2). External link metadata-fetching
is the open gap: would require fetching target metadata (Wikipedia
summary, DOI title + abstract, GitHub repo description) at build time
and embedding it for the hover preview to display. The decision
settles whether to add this, which sources to support, and how to
handle build-time network access (caching, offline mode, fallback
when fetch fails). Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under the
discussion-is-work rule.

**Discuss just-in-time math symbol definitions** `[cross-cutting]` `[post-alpha]`.
A discussion item, not a build item. A reference system for
mathematical symbols, similar to citations: define `\alpha` once
with a meaning ("the coefficient of foo"), and wherever it appears
its definition pops up on hover. Substantial design — what counts as
a symbol, how definitions are authored (`<symbol-def>` element? a
`<def>` form inside math content?), how the resolver matches symbol
references to definitions across the document, how it interacts with
KaTeX's rendering. The decision settles whether to add the feature
and what its surface looks like. Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under the
discussion-is-work rule.

**Discuss `<presentation>` / `<slide>` / `<slide-notes>` Layer 1
vocabulary** `[vocab]` `[post-alpha]`. A discussion item, not a build item: the
design pass that would decide the vocabulary has not happened. Use
cases: slide-decks rendered for screen presentation (parallel to
revealjs / beamer); reusing content between papers and slides;
generating both presentation HTML and printed handouts from one
source; consistent citation/figure/equation handling between papers
and presentations. Discussion agenda — six open questions identified
at the placeholder's filing:

1. Slide-level attributes — transitions, layouts, themes.
2. How `<presentation>` differs structurally from `<article>` and
   `<book>`.
3. Whether slides have explicit type kwargs (title-slide,
   content-slide, section-divider, etc.).
4. Speaker-notes mechanism (separate `<slide-notes>` elements vs.
   attribute on the slide).
5. How body content relates between paper-mode and presentation-mode
   (the same `<section>` rendering as a section in paper output but a
   slide in presentation output?).
6. How math, figures, citations carry over from paper-authoring
   conventions.

The first concrete step is a chat-side vocabulary design pass
parallel to the article and book design passes; the result is either
a new spec (`presentation.md`, `slide.md`, `slide-notes.md` in the
vocabulary directory) or a recorded decision not to pursue. Filed
under the discussion-is-work rule (`CONTRIBUTING.md`); the source
placeholder file is archived at
`notes/archive/slide-element-deferred-2026-05.md`. *(`formerly DF-6`)*

**Discuss four open design questions prerequisite to multi-file
authoring** `[cross-cutting]` `[post-alpha]`. Surfaced by the Front C
extensions-cluster spec audit. These are forks the
`notes/specs/multi-file-authoring.md` blueprint previously presented
as settled; the audit and fix-slice disclosed them as open and filed
them here. They are decisions owed before DF-4 (the
Architecture-tier multi-file authoring arc) is built; they are not
independent free leaves. Filed under the discussion-is-work rule
(`CONTRIBUTING.md`). The spec's §"Open design questions" section
catalogs the same four with the same identifiers.

- **MF-Q1 — project-config / `<include>` interaction.** When the
  project configuration lists a file and another file also
  `<include>`s it: is the inclusion de-duplicated (project config
  canonical, redundant `<include>` silently skipped) or does the file
  appear at every referenced position (both mechanisms run
  independently)? And on ordering disagreement between the project
  config and an `<include>` position, which wins? Both directions are
  defensible; the choice is a design decision.

- **MF-Q2 — standalone-chapter mode invocation, bibliography scope,
  and stub-marker family.** Three undecided sub-points:
  (a) *invocation* — CLI flag, `<config>` option,
  automatic-on-missing-project-config, or some combination;
  (b) *bibliography scope* — whether standalone mode loads the
  project-config-declared shared bibliography (so cross-file `<cite>`
  still resolves) or treats cross-file cites as unresolved stubs;
  (c) *stub-marker family* — the spec illustrates `[?ref]` for the
  cross-reference case; the corresponding marker shapes for cites,
  notes, and any other cross-file reference are not enumerated.

- **MF-Q3 — project-metadata placement in the assembled AST.** The
  spec states project metadata is *sourced* from the project config
  file but does not say where it *lands* in the assembled multi-file
  AST. Two shapes the spec does not choose between: a synthesized
  top-level front-matter block (e.g. a `<book-front>` containing a
  `<meta>` populated from the project config, prepended to the
  assembled book AST) versus distribution as inherited defaults
  available to each chapter's per-chapter `<meta>` lookups without
  appearing as a separate AST node. Different shapes affect
  downstream cross-reference resolution, JATS export, and rendering.

- **MF-Q4 — `<include>` pipeline placement and discovery timing.**
  Two undecided sub-points: (a) *pipeline placement* — is `<include>`
  expansion a structural plugin walking the parsed AST and splicing
  included file content, or a parser-level extension that re-parses
  the referenced file inline during the initial parse; (b) *discovery
  timing* — Phase 1 (Discovery) is project-wide, but `<include>`
  directives are inside file content and only visible once parsing
  has happened; does a pre-Phase-1 discovery sweep collect all
  transitive include targets, or are include-referenced files not
  listed in the project config invisible to Phase 1's project-wide
  registries?

*(`spec: MF-Q1, MF-Q2, MF-Q3, MF-Q4`)*

**Discuss four open design questions prerequisite to multi-column
display** `[cross-cutting]` `[post-alpha]`. Surfaced by the Front C
extensions-cluster spec audit. These are forks the
`notes/specs/multi-column-display.md` blueprint previously presented
as settled; the audit and fix-slice disclosed them as open and filed
them here. They are decisions owed before the multi-column display
feature is built (DF-5 in this document); they are not independent
free leaves. Filed under the discussion-is-work rule
(`CONTRIBUTING.md`). The spec's §"Open design questions" section
catalogs the same four with the same identifiers.

- **MC-Q1 — `<config>` syntax for column settings.** The
  multi-column-display spec previously illustrated a nested-element
  form (`<config><columns count=2></config>`) which is not supported
  by `<config>` as it currently works — `acadamarkConfigDiscovery`
  (`notes/specs/interpreter.md` §3.2) reads kwargs and does not walk
  nested children (the gap is also tracked as the formerly-PG-9
  "nested `<config>` not read" item elsewhere in this document). The
  fork: adopt the kwarg form `<config columns=2>` (no new machinery),
  or adopt the nested-element form (requires extending `<config>`'s
  reading rules and/or registering a `<columns>` vocabulary element).
  Either is workable as a design.

- **MC-Q2 — render-mode container for `column-count`.** Which
  container carries the CSS `column-count` (and the analogous typeset
  directives): the whole-body container (`<article-body>` /
  `<book-body>`), so the entire body flows in columns; or each
  `<section>` independently, so per-section override is the natural
  unit? Affects cascade semantics and figures that cross section
  boundaries.

- **MC-Q3 — `span` kwarg value space and cascade interaction.** The
  spec illustrates `span=full`. Which other values are accepted (e.g.
  `span=2` for a fractional span in a three-column layout,
  `span=column-set`, `span=none`)? And what does `span=full` mean
  inside a section that is already `columns=1` (no-op, or widens the
  figure beyond the single-column section's width)?

- **MC-Q4 — responsive-vs-fixed signaling mechanism.** How does the
  render-mode lowering know whether the target is responsive (web,
  column count adapts to viewport width) or fixed (print, columns
  constant)? Two candidates: a build / CLI target option (e.g.
  `--target=web` vs `--target=print`), or a `<config>` setting in
  source. Affects authoring conventions — authors mark intent in
  source vs. the build target drives the lowering.

*(`spec: MC-Q1, MC-Q2, MC-Q3, MC-Q4`)*

**Discuss smart-typography conversions** `[parser]` `[post-alpha]`. Markdown
extensions convert `--` to en-dash and `---` to em-dash. Whether
acadamark's pipeline accepts such a plugin — and what the escape
conventions for those sequences look like if it does — is open.
Filed from the spent "what is not yet decided" section of
`escape-rules-spec.md` (Reconciliation 2). If adopted, the escape
rules for `--` / `---` follow whatever plugin acadamark accepts;
acadamark does not own these escapes natively.

**Discuss bare-idiom shortcuts for underline and strikethrough**
`[parser]` `[post-alpha]`. Markdown lacks clean conventions for underline and
strikethrough. Acadamark currently uses `<u | text>` and `<s | text>`
tagged forms. Whether to add bare-idiom shortcuts (and what they
would be) is open. Filed from the spent "what is not yet decided"
section of `escape-rules-spec.md` (Reconciliation 2). If shortcuts
are added, the special-character list and escape rules grow to match.

**Discuss the backlog's item-counting convention** `[specs/docs —
backlog organization]` `[post-alpha]`. A discussion item, not a build item. The
backlog has no documented rule for whether a grouped checklist line
counts as one item or as N items (its constituents). The current
convention is inconsistent: the Layer 0 grouped checklist line
expands to 4 in the official count (because each historical
sub-bullet inside is treated as a separate item), but the other
grouped lines (the implement-DSL-handlers item bundling four
handlers; the add-deferred-vocabulary item bundling four families;
the make-`<ref>`-honor-attributes item bundling three behaviours;
the close-small-cite/config-bugs item bundling three bugs) each
count as 1. Without a documented rule, every restructuring slice
re-derives the count by hand, and the act of splitting or merging
items has an ambiguous effect on the headline count (this very
slice's 42 → 44 → 46 progression is an instance). The decision
settles a rule: every checklist line counts as one item regardless of
how many constituents it has, *or* every grouped line expands to its
constituents in the count, *or* some other rule. Filed under the
discussion-is-work rule (`CONTRIBUTING.md`).

**Discuss hardening the colon-id convention into an explicit spec
rule** `[cross-cutting]` `[post-alpha]`. Today the colon-id convention is defined by
example: DESIGN.md L254 describes cross-references as `type:name` form
with examples (`fig:scatter`, `eqn:model`, `sec:methods`), and
interpreter.md §3.9 describes "the id prefix" being used for reference
text — but the spec never names the exact rule (`prefix:tail` with
non-empty prefix). Slice 3 of the acadamark-core extraction arc
surfaced this gap when consolidating two pre-existing ad-hoc inline
checks that disagreed (`registry.js` used `id.includes(':')` — would
have indexed a leading-colon `:foo`; `ref-resolution.js` used
`indexOf(':') > 0` — correctly rejected `:foo`). The consolidation
adopted the spec-correct semantics (a flagged spec-conformance fix at
the registry site) and pinned them with unit tests, but the spec
itself still defines the rule only by example. This discussion item:
add an explicit colon-id rule to a spec (DESIGN.md or `interpreter.md`
§3.9), and audit every site that applies the convention for
consistency against the explicit rule. Filed under the
discussion-is-work rule.

**Discuss the sigil as a first-class category** `[cross-cutting]` `[post-alpha]`.
Acadamark uses a small set of sigils — `#`/`##`/`###` for sections,
`$`/`$$` for math, `` ` ``/` ``` ` for code — as non-alphabetic
shorthands for Layer 1 constructs. The DSL registry
(`acadamark-core/dsl-registry`) records what content handler each
sigil dispatches to; `acadamark-core/tagname-sigil-map` (formerly
`sigil-mapping`, renamed in `cf8ed69`) records the
bidirectional name↔sigil cipher. These two registries live side by
side without a documented relationship; the hash-sigil bugs closed
in alpha Phase 1 (`61fdf5f`) were concrete failures at exactly the
seam between them — fixed point-wise, but the underlying lack of a
unified sigil concept remains. This discussion item: define the
sigil as an explicit first-class concept — a canonical registry
recording, per sigil, its parser tagname, its content handler, its
vocabulary key, its opacity expectation, and how author-requested
new sigils are added — and reconcile the existing `dsl-registry` and
`tagname-sigil-map` under that explicit model. Filed under the
discussion-is-work rule.

**Discuss auditing documented language features against test-fixture
coverage** `[tests/build]` `[post-alpha]`. The hash-sigil heading is documented in
the spec (`shorthand-syntax.md` Example 9), described as a fully
working form — but zero test fixtures exercise `<#>`/`<##>`/`<###>`.
That coverage gap is why the hash-sigil dispatch bug stayed latent
through the acadamark-core extraction arc and was only discovered
through static reading during the Slice 4 Phase 0's Q7 investigation.
This discussion item: decide whether and how to systematically audit
spec-documented language features against the test-fixture set, and
close gaps. Options include — a one-time audit slice; a standing rule
that every spec example must come with a fixture; a periodic
coverage-against-spec sweep. Filed under the discussion-is-work rule.

---

## Architecture tier — large, each its own arc

Multi-slice projects. Sequence these by *intent* (what acadamark is for
next), not by dependency — they are mutually independent (other than
DF-19's gate on OQ-2).

- **Build JATS export (`rehypeAcadamarkToJats`)** `[interpreter]` `[alpha]`. The
  vocabulary is JATS-aligned by design (`jats_counterpart` on every
  entry); this is the payoff. *(`formerly DF-18`)*
- **Build render-mode lowering** `[cross-cutting]` `[post-alpha]`. Display-target-three
  on the display ladder. Gated by OQ-2 (Layer 2 above) — the
  heading-level question must be decided when render mode is scoped.
  *(`formerly DF-19`)*
- **Build multi-file authoring** `[cross-cutting]` `[post-alpha]`. `acadamark.yml` +
  `<include>`; project-wide registries. A real architectural
  extension. Spec at `notes/specs/multi-file-authoring.md`.
  *(`formerly DF-4`)* — Effort-scoping (2026-05-25) found this is a
  multi-slice arc with four open design questions (MF-Q1–4) that are
  themselves prerequisites; the user ruled it post-alpha. **The
  file-reader / path-resolution substrate** — a single contained
  slice introducing a "current file" concept and path resolution to
  the otherwise path-agnostic interpreter — could be done early if
  convenient. It makes future multi-file work cheaper without
  committing to any of the four MF-Q design questions. The multi-file
  feature itself is post-alpha.
- **Build book / book-part document structuring** `[cross-cutting]` `[alpha]`.
  Vocabulary exists; `article-structuring.js` currently warns and
  skips non-article types. *(`formerly DF-12`)*
- **Build pagination / print-targeted output** `[cross-cutting]` `[post-alpha]`.
  Page-break control, page geometry, print headers/footers, and
  related print-targeting machinery. Split from the
  formerly-combined book-and-pagination item: book-structuring is
  about authoring units (book / book-part / chapter); pagination is
  about display-target machinery shared across articles and books.
  Print-mode authoring requirements are scoped in the separate
  print-requirements spec item under Other open work.
- **Build executable code blocks (JS / Arquero / Vega-Lite)**
  `[cross-cutting]` `[alpha]`. Authors annotate a code block to mark
  it for execution; the build runs the code and embeds the result.
  Promoted from the Discussions group (formerly an open
  yes/no-whether-to-commit question) into Architecture-tier as a
  scoped implementation item, with the user's alpha-line ruling: the
  alpha scope is in-browser JavaScript execution, with Arquero as
  the dataframe library and Vega-Lite as the plotting library — a
  concrete first-target stack chosen because it runs entirely in the
  browser substrate, sidesteps the kernel / sandboxing / Python
  install dependencies that a Jupyter-style design would entail, and
  is small enough to fit the alpha. Established convention via
  RMarkdown / Quarto / Jupyter, the DSL-processor model in
  DESIGN.md, and the execution-control attribute convention
  (`+eval`, `+echo`, `+output`, `+error`, `cache`, `dependencies`)
  are technique-mining sources — relevant for how the surface looks
  and how the processor integrates, even though the runtime is not
  Jupyter. Post-alpha extensions (other languages, kernel-based
  execution, server-side sandboxing) are not in scope here. Source
  archived at `notes/archive/authoring-features-survey-2026-05.md`.

---

## Explicitly deferred — parked

**The unbraced-inline `@` form** `[parser]` `[post-alpha]`. `…as shown (@fig:priority)…`
with no `<ref>` wrapper. The half of the `@`-sigil proposal NOT
adopted in F1. A grammar-wide change: `@` significant in prose, `\@`
escaping, prose-fixture churn. Parked deliberately. Not on the active
roadmap.

---

## Standing items

Items present in every cadence of the documentation system, not tied to
a specific arc. Under a working system this kind of item is normally
small; the spec-completeness audit below is large *this once* because
of the accumulated debt — it is the bootstrap for the new documentation
system rather than ordinary maintenance.

### Run a spec-completeness audit against the rebuild-from-docs standard
`[specs/docs]` `[post-alpha]` *(one-time large; future passes will be ordinary)*

Audit every spec in the repo (`DESIGN.md`, `notes/specs/*.md`,
`packages/layer1-vocabulary/SPEC.md`, the per-element vocabulary
entries) against the **rebuild-from-docs standard** stated in the
documentation system design: *with all code deleted, the remaining
documentation must be sufficient to rebuild the project.*

**This is not the previous audit framing.** Drift checks ("does the
spec match the code") have been the standing audit pattern. This new
standard is stricter: it is not "does the spec match" but "is the spec
*sufficient* to recreate the design without the code as a reference."
A spec that describes *what is implemented* may still be insufficient
under this standard if it skips the *why*, the constraints that bound
the design, or the unbuilt parts of the blueprint.

**Why now.** The documentation system installs the coherence check
as the end of every implementation slice. Future spec drift is caught
at the slice that introduces it. But existing specs were written under
the old framing and have never been held to the rebuild standard, so
they need a one-time pass to bring them up to it before the per-slice
check is meaningful.

**Scope and shape.** Each spec assessed individually; gaps filed as new
backlog items in their appropriate Layer. The audit itself produces no
fixes — fixes are follow-on slices. Likely to be split into several
Phase 0 investigations (per spec or per spec-cluster) plus targeted
fix slices.

---

## Other open work

Items that do not fit cleanly under a specific Layer or arc — small
verification / spec / hygiene items filed against the active backlog.

**Write a print-requirements spec** `[specs/docs]` `[post-alpha]`. A
companion spec to the Architecture-tier pagination item: what print
output needs to support — page geometry, running heads/feet,
page-break behaviour around floats and sections, footnote placement
on the printed page, front-matter pagination conventions
(roman-numeral pagination for the front matter, arabic for the body),
how cross-references render when target page numbers are knowable.
The spec is the authoring-requirements companion to the
Architecture-tier pagination implementation; the implementation arc
is gated on this spec being written. Split out from the
formerly-combined book-and-pagination item.

**Verify the remaining `(formerly AUD-N)` items against current
code** `[cross-cutting]` `[post-alpha]`. Five items still carry an
AUD-N origin marker: AUD-14, AUD-15, AUD-17, AUD-18, AUD-25.
(AUD-13, the `<config>` silent-accept bug, was closed by alpha
Phase 2 slice 2 — fixed, not verify-and-close.)
The Layer 0 verification slice and the mechanical-fix batch each
found a high already-resolved rate in their cohorts (4/4 Layer 0;
2/2 of the two AUD items in the mechanical batch — AUD-19 and
AUD-24), so the base rate suggests several of the remaining six are
likely already resolved by code that landed without closing the
backlog entry. This item: read each of the six remaining AUD items
against the current code and either close-as-verified-resolved or
leave open with a fresh "still applicable" finding. Should be done
**before** any of those six is picked up as implementation work, to
avoid wasted scoping work on an already-fixed item.

