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
- [x] **Theorem-family elements render unstyled (inline, body size)**
  `[interpreter]` `[release]` *(→ roadmap: Phase 14; render-quality
  RQ-THM-S1/S2; filed by the render-quality slice)* — **CLOSED
  2026-05-29** by the render-quality bug-fix arc, slice A (stylesheet
  gaps): `default.css` now renders the theorem family as blocks with
  vertical margin and the `.{kind}-label` spans at `font-weight: 700`.
- [x] **Book structural elements render unstyled (inline, body size)**
  `[interpreter]` `[release]` *(→ roadmap: Phase 14; render-quality
  RQ-BOOK-S1; filed by the render-quality slice)* — **CLOSED
  2026-05-29** by the render-quality bug-fix arc, slice A: `default.css`
  now renders the book regions as blocks with a prominent `book-title`
  and a chapter-level `book-part-title`.
- [x] **`.frameable-border` draws no border box** `[interpreter]`
  `[release]` *(→ roadmap: Phase 14; render-quality RQ-FRM-S4; filed by
  the render-quality slice)* — **CLOSED 2026-05-29** by the
  render-quality bug-fix arc, slice A: `default.css` now draws a 1px
  solid border (with padding) on `.frameable-border`.
- [x] **Math-environment wrappers unstyled; equation number not
  flush-right outside `display-math`** `[interpreter]` `[release]`
  *(→ roadmap: Phase 14; render-quality RQ-MATH-S3; filed by the
  render-quality slice)* — **CLOSED 2026-05-29** by the render-quality
  bug-fix arc, slice A: the `display-math` flex layout (block + flush-right
  `.equation-number`) now also covers `math`, `align`, `cases`,
  `matrix`, and `eqnarray`.
- [x] **Book caption/label numbers are bare per-chapter while
  cross-references are chapter-prefixed (they disagree)** `[interpreter]`
  `[release]` *(→ roadmap: Phase 14; render-quality RQ-BOOK-M4; filed by
  the render-quality slice)* — **CLOSED 2026-05-29** by the render-quality
  bug-fix arc, slice B: the caption / label / equation-number render path
  now derives its display number through the shared `formatScopedNumber`
  helper that the cross-reference resolver also uses, so a chapter-scoped
  book's labels carry the same chapter prefix as the references resolving
  to them (`Figure 2.1.` matches `figure 2.1`).
- [x] **Same caption/cross-reference numbering mismatch on the JATS export
  side — `<label>`s bare while `<xref>`s are chapter-prefixed**
  `[interpreter]` `[release]` *(→ roadmap: Phase 14; render-quality
  RQ-BOOK-M4; surfaced by slice B)* — **CLOSED 2026-05-29** by the
  render-quality bug-fix arc, JATS slice (analog of slice B): the JATS
  `<label>` emitter now derives its display number through the same
  `formatScopedNumber` helper the `<xref>` text uses, so a chapter-scoped
  book's `<label>`s carry the chapter prefix matching the references
  resolving to them (`<label>3.1</label>` matches `figure 3.1`).
- [x] **Inline math in pipe-form named-tag content is not protected from
  escape processing** `[parser]` `[post-alpha]` *(filed by the
  render-quality slice)* — **CLOSED 2026-05-29** by the render-quality
  bug-fix arc, slice C: inline and display math and markdown code spans in
  pipe-form named-tag content are now opaque to the inner parser's escape
  processing via a shared `OpaqueSpan` grammar rule; the scope was widened
  from math-only to math + code spans (`escape-rules-spec.md` §"Opaque
  inline spans within prose content").
- [x] **ABC `<div>` source is not preserved verbatim; the HTML
  serializer adds indentation** `[interpreter]` `[release]`
  *(→ roadmap: Phase 14; render-quality RQ-DSL-M2; filed by the
  render-quality bug-fix arc, DSL verification slice)* — **CLOSED
  2026-05-29** by DSL Slice 1 (registry + live mode): the `<abc>` handler
  now emits `<pre class="abc" data-acadamark-dsl="abc">` (matching
  `<mermaid>`) instead of `<div>`; `<pre>` is whitespace-preserving, so the
  HTML formatter leaves the line-oriented ABC source verbatim. The
  canonical vocab entry (`abc.md` → generated `data.js`) was synced in the
  same slice.

### Enhancements

- [ ] **Generalize the qualifying-tag pattern beyond `<table>`**
  `[parser]` `[post-alpha]` *(formerly DF-17)*
- [ ] **Implement margin sidenotes** `[interpreter]` `[post-alpha]` —
  coupled to multi-column display rendering *(formerly PG-2)*
- [ ] **Make the bibliography heading a config kwarg instead of
  hardcoded** `[interpreter]` `[post-alpha]` *(formerly PG-10)*
- [ ] **Migrate `<data>` onto the structured-element infrastructure**
  `[interpreter]` `[post-alpha]` *(filed by `beb2fb3`)*
- [ ] **Ship generated `.d.ts` types for the browser library**
  `[tests/build]` `[release]` *(→ roadmap: Phase 14)* *(filed by Phase 14
  Slice 1)*
- [ ] **Trim the browser bundle's citation-js weight** `[interpreter]`
  `[post-alpha]` *(filed by Phase 14 Slice 1)*
- [ ] **Reconcile and de-duplicate the interpreter options
  documentation** `[specs/docs]` `[post-alpha]` *(filed by Phase 14
  Slice 1)*

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
  `[cross-cutting]` `[release]` *(→ roadmap: Phase 14)* — spec written
  and demonstrative fixtures (`document-45`/`document-46`) built against
  it; corpus consolidation, the render-quality deviation fixes, and the
  one-document-vs-small-set ruling remain open

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
- [ ] **Decide how live-mode assets (hover-preview / DSL scripts) execute
  under `renderInto`** `[interpreter]` `[release]` *(→ roadmap: Phase 14)*
  *(filed by Phase 14 Slice 1)*

### Standing

- [ ] **Run a spec-completeness audit against the rebuild-from-docs
  standard** `[specs/docs]` `[post-alpha]` — one-time large; future
  passes will be ordinary per-slice coherence checks
- [ ] **Write a print-requirements spec** `[specs/docs]`
  `[post-alpha]` — companion to the pagination work in Phase 8
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

### Theorem-family elements render unstyled (inline, body size)
`[interpreter]` `[release]` *(→ roadmap: Phase 14)*

**CLOSED 2026-05-29 — render-quality bug-fix arc, slice A (stylesheet
gaps).** `default.css` now renders the theorem-family elements as
`display: block` with vertical margin (`RQ-THM-S1`) and the
`.{kind}-label` spans at `font-weight: 700` (`RQ-THM-S2`).

The interpreter emits the theorem family as custom elements —
`<theorem>`, `<lemma>`, `<corollary>`, `<proposition>`, `<definition>`,
`<example>`, `<remark>`, `<proof>` — each opening with a label span
(`<span class="theorem-label">`, `<span class="definition-label">`,
`<span class="proof-label">`, and so on). The markup is correct: the
demonstrative article renders `<span class="theorem-label">Theorem 1
(Propriety of the Brier score).</span>` and `<span
class="proof-label">Proof.</span>` exactly as the render-quality spec's
`RQ-THM` markup predicates require. But `default.css` has **no rule for
any of these elements or their label spans**. A custom element with no
CSS rule defaults to `display: inline` at body size, so a theorem reads
as an unbroken inline run with a non-bold label — violating the
stylesheet predicates `RQ-THM-S1` (the block sets off from body text
with vertical margin) and `RQ-THM-S2` (label prominence,
`font-weight: 700`).

The fix is purely additive theme work: add `default.css` rules for the
theorem-family elements (`display: block`, vertical margin) and the
`.{kind}-label` spans (`font-weight: 700`). No interpreter change is
needed — the markup already carries the hooks.

Filed by the render-quality slice; see `notes/specs/render-quality.md`
§11 (`RQ-THM`).

### Book structural elements render unstyled (inline, body size)
`[interpreter]` `[release]` *(→ roadmap: Phase 14)*

**CLOSED 2026-05-29 — render-quality bug-fix arc, slice A (stylesheet
gaps).** `default.css` now renders `book` / `book-front` / `book-body` /
`book-back` / `book-part` as block regions, `book-title` as the most
prominent heading on the page, and `book-part-title` as a chapter-level
heading clearly above section-title scale (`RQ-BOOK-S1`).

Book structuring emits `<book>`, `<book-front>`, `<book-body>`,
`<book-back>`, `<book-part>`, `<book-title>`, `<book-subtitle>`, and
`<book-part-title>` — the demonstrative book renders all of them, and
the markup satisfies the render-quality spec's `RQ-BOOK` markup
predicates. But `default.css` has **no rule for any book element**. As
with the theorem family, an unstyled custom element renders inline at
body size: the book title renders as inline body text rather than the
most prominent text on the page, and the front / body / back regions are
not set off from one another. This violates `RQ-BOOK-S1`.

The fix is additive theme work in `default.css`, parallel to the
existing `article-title` / `article-front` rules: `book-title` block at
the largest heading size with `font-weight: 700`, `book-part-title` as a
chapter heading, and region-separation rules on `book-front` /
`book-back`. No interpreter change is needed.

Filed by the render-quality slice; see `notes/specs/render-quality.md`
§15 (`RQ-BOOK`).

### `.frameable-border` draws no border box
`[interpreter]` `[release]` *(→ roadmap: Phase 14)*

**CLOSED 2026-05-29 — render-quality bug-fix arc, slice A (stylesheet
gaps).** `default.css` now draws a 1px solid border (with a 4px radius
and padding) on `.frameable-border` (`RQ-FRM-S4`).

The `+border` flag (and `<frame>`, whose border defaults on) adds the
`frameable-border` class to the frameable's wrapping element — the
demonstrative article's `<frame>` renders `<figure
class="frameable-border">`. But `default.css` has **no
`.frameable-border` rule**, so the class is inert and no outline is
drawn; the callout is indistinguishable from an ordinary figure. This
violates `RQ-FRM-S4` (the class draws a visible border that sets the
callout off from body text).

The fix is a one-rule addition to `default.css`: a `border` (and likely
padding) on `.frameable-border`. No interpreter change is needed — the
class is already emitted.

Filed by the render-quality slice; see `notes/specs/render-quality.md`
§8 (`RQ-FRM-S4`).

### Math-environment wrappers unstyled; equation number not flush-right outside `display-math`
`[interpreter]` `[release]` *(→ roadmap: Phase 14)*

**CLOSED 2026-05-29 — render-quality bug-fix arc, slice A (stylesheet
gaps).** `default.css` now applies the `display-math` flex layout —
block display with vertical margin and a flush-right `.equation-number`
— to `math`, `align`, `cases`, `matrix`, and `eqnarray` as well
(`RQ-MATH-S3`).

Display math written with the `<$$ … $$>` sigil renders inside
`<display-math>`, which `default.css` styles as a flex row with the
equation centered and the `.equation-number` flush right (the
`display-math > .equation-number` rule). But the multi-line math
environments — `<align>`, `<cases>`, `<matrix>`, `<eqnarray>`, and the
generic `<math>` — render to their own custom-element wrappers, for
which `default.css` has **no rule**. Two consequences, both observed in
the demonstrative article's numbered `<align>`: the environment renders
inline at body size rather than as a centered display block, and its
`.equation-number` is not flush-right, because the only positioning rule
is scoped to a direct child of `display-math`. This violates
`RQ-MATH-S3`.

The fix is additive theme work in `default.css`: give the
math-environment wrappers display-block / centering treatment comparable
to `display-math`, and broaden (or duplicate) the `.equation-number`
flush-right rule so it applies inside the environment wrappers too. No
interpreter change is needed.

Filed by the render-quality slice; see `notes/specs/render-quality.md`
§10 (`RQ-MATH`).

### Book caption/label numbers are bare per-chapter while cross-references are chapter-prefixed
`[interpreter]` `[release]` *(→ roadmap: Phase 14)*

**CLOSED 2026-05-29 — render-quality bug-fix arc, slice B.** The caption /
label / equation-number render path now formats its display number through
a shared helper, `formatScopedNumber` (`src/lib/scoped-number.js`), which
the cross-reference resolver (`computeRefText`) was refactored to share.
Because the target's label and every reference to it now derive the number
from one definition, a chapter-scoped book renders matching pairs —
`Figure 2.1.` / `figure 2.1`, `Definition 3.1.` / `definition 3.1`,
`Table 3.1.` / `table 3.1`, `(2.1)` / `equation 2.1`. The fix is HTML-only:
`node.computedNumber` stays the bare per-scope integer (the JATS exporter
reads it for `<label>` text and is unaffected — its `.xml` output is
byte-identical), and the chapter prefix is applied only at HTML render
time. Articles never carry scope, so their labels are unchanged.

**JATS analog CLOSED 2026-05-29 — render-quality bug-fix arc, JATS slice.**
The JATS export carried the same mismatch on its own output: its `<label>`s
rendered the bare per-chapter ordinal (`<label>1</label>` on a `<fig>`,
`<label>(1)</label>` on a `<disp-formula>`, `<label>Theorem 1.</label>` on a
`<statement>`) while its `<xref>`s were chapter-prefixed (`figure 3.1`,
`theorem 1.1`), because the `<label>` emitters read the bare
`node.computedNumber` directly. The JATS slice routes them through the same
`formatScopedNumber` helper (re-exported from `acadamark-interpreter`), so a
chapter-scoped book's `<label>` and the `<xref>` resolving to it now agree by
construction (`<label>3.1</label>` / `<xref … >figure 3.1</xref>`). This
intentionally changes the book JATS fixtures — slice B's "the JATS `.xml` is
byte-identical" held only for that HTML-only slice; this slice is the
JATS-side completion. Article fixtures carry no `_scope`, so their `<label>`s
stay bare and held zero-diff. The `RQ-BOOK-M4` predicate is now
output-target-agnostic (see `notes/specs/render-quality.md` §15).

In a book with the default `counter-reset-scope=chapter`,
cross-references resolve to chapter-prefixed numbers — the demonstrative
book renders `<a … class="ref">figure 2.1</a>`, `definition 3.1`,
`table 3.1`, `equation 2.1`. But the **caption / label on the target
carries only the bare per-chapter ordinal**: every chapter's figure
caption reads `<span class="figure-label">Figure 1.</span>`, the
chapter-3 definition reads `Definition 1.`, the chapter-3 table reads
`Table 1.`, and the chapter-2 numbered equation reads `(1)`. So a figure
whose caption says "Figure 1." is referred to in prose as "figure 2.1" —
the caption and every reference to it **disagree**. This violates
`RQ-BOOK-M4`, which requires the target's label to carry the same
chapter-prefixed number as the references resolving to it.

The cross-reference resolver already computes the chapter prefix; the
label formatter that renders the caption / equation number does not
apply it. The fix is in the label-rendering / numbering path (not the
resolver, and not CSS): the displayed number on a numbered target in a
chapter-scoped book must include the chapter prefix, matching what the
resolver emits. Unlike the four theme-gap bugs above, this is a
markup-level (`M`) correctness bug, not a stylesheet gap.

Filed by the render-quality slice; see `notes/specs/render-quality.md`
§15 (`RQ-BOOK-M4`).

### Inline math in pipe-form named-tag content is not protected from escape processing
`[parser]` `[post-alpha]`

When a named tag carries its content in pipe form — `<definition | … $p
\in [0,1]$ …>`, `<proof | … $\mathbb{E}[…]$ …>` — the content is
recursively parsed, and the inner parser processes backslash escape
sequences (per `notes/specs/recursive-content-spec.md`). Inline math
spans are **not** carved out as opaque during this pass, so a LaTeX
backslash command inside `$…$` is read as an escape: `\in` becomes
unknown-escape `\i`, `\mathbb` becomes `\m`, and the parser emits
`??parse: unknown-escape-sequence`. Worse, the broken escape misaligns
the `$…$` delimiters, so prose following the math is swallowed into a
KaTeX span and rendered as run-together math — a cascading mis-render,
not just a dropped command.

The same math in **block form** (`<theorem>…$Y \sim
\mathrm{Bernoulli}(q)$…</theorem>`) renders correctly, because
block-form content flows through the markdown math extension, which
makes `$…$` opaque before escape processing. The asymmetry is the bug:
inline math should be opaque to escape processing in pipe-form content
too, as it already is in block-form and top-level content.

Surfaced while authoring the demonstrative article — the fixture was
rewritten to use block form for the affected proof and backslash-free
inline math in the pipe-form definition, so it renders cleanly. Filed,
not fixed, per the render-quality slice's scope. Author workaround: use
block form, or keep backslash LaTeX out of pipe-form inline math.

**CLOSED 2026-05-29 — render-quality bug-fix arc, slice C.** A shared
`OpaqueSpan` grammar rule in `packages/remark-acadamark/grammar/acadamark.peggy`
now recognises inline math (`$…$`), display math (`$$…$$`), and markdown code
spans (`` `…` ``, `` ``…`` ``) inside the `ContentItem` rule and returns them
verbatim, so the inner parser's escape processing never sees the LaTeX backslash
commands (or Windows-path backslashes) inside them; the math then flows to
`remark-math` intact. Correctness invariant: for a backslash-free span the
emitted string is byte-identical (zero regression) — only backslash-inside-span
behaviour changes. Backslash escape rules stay *first* in `ContentItem`, so
`\$` / `` \` `` still pass through as markdown literals and never open a span.
The scope was widened from math-only to **math + code spans**, bringing the
parser in line with `escape-rules-spec.md` §"Opaque inline spans within prose
content." New regression fixture `document-48-pipe-form-inline-math.acm`
exercises inline, display-fence, and single/double-backtick code-span backslash
content in pipe form. The fix also corrected latent parse-errors an existing
fixture — `document-35-numbering-extension.acm` (lines 21 `\sum`/`\le`, 25
`\mathbb`) — had silently carried in its snapshot: its propositions and example
now render their math instead of `??parse: unknown-escape-sequence` markers,
real-world proof the bug existed in the corpus and the fix resolves it.
**Two findings:** (i) the fixture used `<lemma>` rather than the
prompt-suggested `<theorem>`, because `<theorem>` is `isOpaqueContent: true`
and its body is dropped (a separate pre-existing bug; see the doc-29 note) —
`<lemma>` is a recursively-parsed sibling that renders its body; (ii) the same
opacity is **deferred** for hash sigil-tag headings (`<# … #>`), because `>` is
legal content there and the heading content class needs a different rule — out
of scope for this named-tag-content fix (noted in the grammar comment and the
escape-rules spec).

### ABC `<div>` source is not preserved verbatim — the HTML serializer adds indentation
`[interpreter]` `[release]` *(→ roadmap: Phase 14)*

**CLOSED 2026-05-29 — DSL Slice 1 (registry + live mode).** Fixed via
candidate three below: the `<abc>` handler now emits `<pre class="abc"
data-acadamark-dsl="abc">` instead of `<div>`. `<pre>` is one of the
serializer's whitespace-sensitive elements (like `<mermaid>`'s wrapper), so
the line-oriented ABC source survives verbatim — no per-line indentation,
no inserted leading/trailing newline (`RQ-DSL-M2`). abcjs replaces the
element's content on render regardless of tag, so the change affects source
fidelity, not rendered output. The canonical vocab entry was synced in the
same slice (`abc.md` now documents the `<pre>` wrapper and its rationale;
`data.js` regenerated from it), and the abc-bearing fixtures' hast
snapshots (doc-32, doc-44) were regenerated for the `<div>`→`<pre>`
change (doc-36 is mermaid-only — its snapshot was unchanged, as noted
below).

`RQ-DSL-M2` requires an `<abc>` block to render `<div class="abc"
data-acadamark-dsl="abc">` with the ABC source **preserved verbatim**, so
a consumer-side renderer (abcjs, reading `element.textContent`) sees the
source the author wrote. The class, the `data-acadamark-dsl` marker, and
the `id` are all correct, but the source is **not** verbatim in the
rendered HTML: the hast→HTML serializer pretty-prints the `<div>`'s text
child, prefixing every line with the element's indentation — the abc block
in doc-32 renders with ~10 leading spaces on each of `X:1`, `T:…`, `K:C`,
and the tune body — plus a leading and trailing newline. This matters
because ABC information fields (`X:`, `T:`, `M:`, `L:`, `K:`)
conventionally begin at column 0; leading whitespace can cause abcjs to
misparse them, so the fidelity break can defeat the very consumer-side
rendering the markup contract exists to enable.

The defect is **serialization-only**: the hast text node holds the source
verbatim — the snapshot records `"X:1\nT:Twinkle…"` with no indentation —
so nothing upstream of stringify is wrong. The asymmetry with `<mermaid>`
is the tell: Mermaid's wrapper is `<pre>`, which the serializer treats as
whitespace-sensitive and never reformats (so `RQ-DSL-M1` passes
byte-for-byte), whereas `<abc>`'s `<div>` is not whitespace-sensitive and
gets reformatted. The fix is a design call, not decided here — candidates:
mark the abc text node so rehype-stringify preserves its whitespace; wrap
the source in a whitespace-preserving inner element; or switch the abc
wrapper to `<pre>` (abcjs replaces the element's content on render
regardless of tag, so the `<div>`-vs-`<pre>` choice changes source
fidelity, not rendered output).

Surfaced by the render-quality bug-fix arc's DSL verification slice while
verifying `RQ-DSL` against the existing corpus — `<abc>` is exercised
in doc-32 and doc-44 (doc-36 names `<abc>` only in prose; its single DSL
block is `<mermaid>`, confirmed when the `<div>`→`<pre>` fix left doc-36's
snapshot unchanged); the demonstrative fixtures (doc-45,
doc-46) exercise `<mermaid>` only. Filed, not fixed, per the
slice's scope. See `notes/specs/render-quality.md` §9 (`RQ-DSL-M2`).

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

### Ship generated `.d.ts` types for the browser library
`[tests/build]` `[release]`

The Phase 14 Slice 1 tsup config builds the `acadamark.browser` bundle
(ESM + IIFE) but defers type declarations (`dts` is off, commented
"deferred until the bundle itself is verified"). A consumer importing
`render` / `renderInto` therefore gets no editor types. This item: turn on
tsup's `dts` — or run a separate `tsc --emitDeclarationOnly` pass over the
`.js` + JSDoc entry — and wire the emitted `.d.ts` into `package.json`'s
`exports` / `types` for the `./browser` entry. Part of the Phase 14
packaging deliverable (the Phase 0 named "pure JS + generated `.d.ts`");
deferred *within* Slice 1 so the runtime bundle could be verified first.
*(filed by Phase 14 Slice 1)*

### Trim the browser bundle's citation-js weight
`[interpreter]` `[post-alpha]`

citation-js is by a wide margin the dominant contributor to the IIFE
browser bundle's size (measurable from the `build:lib` output). The ratified
Decision 1 keeps citation-js *in* the bundle because client-side
`<library>` / `<cite>` parsing needs it — so this is not "remove it" but
"make it lighter": investigate a lighter CSL/BibTeX path, lazy-loading
citation-js only when a document actually has citations, or a citation-js
plugin subset, without losing client-side citation support. Not
release-blocking (the bundle works); an optimization lead surfaced while
measuring the Slice 1 bundle. *(filed by Phase 14 Slice 1)*

### Reconcile and de-duplicate the interpreter options documentation
`[specs/docs]` `[post-alpha]`

`pipeline.md` §9.1 and `interpreter.md` §12 each restate the interpreter's
options table with default values (`embedResources`, `documentFontsCss`,
`katexCss`, `hoverPreviewMode`, …). The two tables duplicate the same
defaults, so an option-default change must be made in both places or one
goes stale — a "one job per document" tension (the option-default facts
have two homes). The same tables also omit the DSL options (`dslMode`,
`mermaidMode`, `abcMode`) entirely, though both reference `dslMode` in their
prose. This item: decide which document canonically owns the options table
(`pipeline.md` §9.1 is the likely home — `interpreter.md` §12 already
cross-references it for the migration note), have the other point to it
rather than restating it, and add the missing DSL-option rows to the
canonical table. Pre-existing (the duplication predates Phase 14 Slice 1,
which extended both tables in lockstep with the new `embedResources` /
`documentFontsCss` rows); surfaced by the Slice 1 coherence check. A
cross-file spec restructuring — the canonical-owner choice is flagged for a
chat decision rather than resolved unilaterally. *(filed by Phase 14
Slice 1)*

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

A high-quality demonstration surface exercising the full Layer 1
vocabulary and authoring surface, serving two roles at once: the
project's worked-example manual, and a render-regression fixture that
the Phase 8 display work and Phase 14 packaging are verified against.

The render-quality spec this is built against is now written
(`notes/specs/render-quality.md`), and the render-quality slice made a
down-payment on the demonstrative role: believable demonstrative
fixtures built against the spec — a methods-paper article
(`document-45`) exercising the article-side spec'd features, and an
edited-volume book (`document-46`) exercising the book-side ones. They
validate the spec's predicates against documents a reader would believe,
not feature-catalog stress tests.

What remains open, and is release-blocking:

- **The demonstrative role's final shape is an open design question.**
  The roadmap's original vision was a *single* comprehensive document
  taking over from the accumulated fixture corpus; the render-quality
  slice instead built a small set of believable, role-specific
  demonstrative fixtures and left the corpus in place. Whether the
  demonstrative role is ultimately served by one comprehensive document,
  by the small believable set the slice started, or by both alongside
  the corpus is a ruling for the chat, not a Claude Code decision.
- **Corpus consolidation is deferred.** Retiring or folding the
  accumulated fixture corpus into the demonstrative surface was
  explicitly out of the render-quality slice's scope; the corpus stays
  as-is pending that ruling.
- **The render-quality deviation bugs gate "well-rendered."** The slice
  filed the render-quality deviations as bugs — `default.css` theme gaps
  (theorem family, book elements, `.frameable-border`, math-environment
  wrappers) plus a book caption/reference numbering disagreement (see
  the Bugs section). Until they are fixed, the demonstrative fixtures
  render their affected features unstyled, so a demonstrative surface
  cannot yet show the system rendering *correctly*.

Release-blocking for v0.1.0.

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
(packaging, the browser entry point, the demo app). **Phase 0 is done**
(`aaa7e5c` — API surface, bundle toolchain, six-slice plan) and **Slice 1
(library packaging) is done**: the `src/browser.js` `render` / `renderInto`
façade, the tsup `acadamark.browser` bundle (ESM + IIFE), the
external-by-default `embedResources` flip (breaking for the Node entry;
`embedResources: true` restores self-contained output), and the
browser-safety work (lazy-ified `fs` reads, the `registry.js` →
`node-assets.js` split, node-builtin stubbing). Remaining slices — the
in-browser editor demo, the demo-site framework (which lands the rename),
demo-site content, fixture consolidation, and the release-time org-split —
stay open (this checkbox tracks the whole arc). Follow-up findings from
Slice 1 are filed as their own entries: the `.d.ts` types item, the
citation-js bundle-weight item, and the `renderInto` live-asset-execution
discussion.

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

### Decide how live-mode assets (hover-preview / DSL scripts) execute under `renderInto`
`[interpreter]` `[release]`

`renderInto(target, source)` (Phase 14 Slice 1, `src/browser.js`) assigns
the rendered HTML via `el.innerHTML`. The HTML spec deliberately prevents
`innerHTML`-injected `<script>` elements from executing, so the
hover-preview init script and any live-mode DSL (mermaid / abc) activation
scripts emitted into the fragment do **not** run when a consumer uses
`renderInto`. (A full-page `render()` the browser parses normally is
unaffected — only the `innerHTML` path is.) Auto-executing injected scripts
was left out of Slice 1 on purpose: doing it would mean `eval`-ing
markup-derived JS. This discussion: decide whether the library should offer
an opt-in activation helper (re-inject / execute the emitted scripts after
`renderInto`), document the limitation as the consumer's responsibility, or
something else. Gates the in-browser editor demo slice, which needs live
hover previews and DSL rendering inside a mounted element. *(filed by
Phase 14 Slice 1)*

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
