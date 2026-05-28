# Phase 4 — document structuring: Phase 0 findings

**Status:** read-only Phase 0 complete. No implementation; no product
code, no spec, no vocab changes. This file is the artifact Phase 4's
implementation slice(s) will be built from — same role
`notes/phase3-frameable-findings.md` played for Phase 3.

**Date:** 2026-05-29 (post-`a90a0d2`, post-Phase-3-close).
**Recommendation at end:** SPLIT (book-structuring plugin first,
doc-9 snapshot + integration second). Rationale in the "Bundle vs
split" section.

## Phase 4 scope as inherited

ROADMAP.md L266-283 frames Phase 4 as two items:

1. **Build book / book-part document structuring** *(formerly DF-12)*.
   "Multi-chapter document structure; book / book-part vocabulary is
   in place, structural plugin needs to handle it."
2. **Add integration test and snapshot for `document-9-demo`**
   *(formerly GAP-9)*. "The most complex fixture; the dark surface
   area this snapshot covers is high."

**Exits**: "book documents render structurally; the doc-9 dark
surface is pinned by snapshot."

The ROADMAP framing is more compressed than the actual implementation
scope. Q1.1–Q1.8 below unpack it. The biggest unsurprise of this
Phase 0: **book/book-part vocabulary is already in place**, with
mature vocab entries describing both the authoring surface and the
intended structural-plugin behavior. The implementation slice is
primarily the structural plugin (`acadamarkBookStructuring`), not
new vocab.

## Q1.1 — what `Phase 4` filed

### ROADMAP.md Phase 4 entry (L266-283, verbatim)

```
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
```

### BACKLOG.md Phase 4 entries

**Checklist (L144-145):**

```
- [ ] **Build book / book-part document structuring**
  `[cross-cutting]` `[alpha]` *(→ roadmap: Phase 4)* *(formerly DF-12)*
```

**Detailed entry (L545-549):**

```
### Build book / book-part document structuring
`[cross-cutting]` `[alpha]` *(→ roadmap: Phase 4)*

Vocabulary exists; `article-structuring.js` currently warns and
skips non-article types. *(formerly DF-12)*
```

**Checklist (L106-107):**

```
- [ ] **Add integration test and snapshot for `document-9-demo`**
  `[tests/build]` `[alpha]` *(→ roadmap: Phase 4)* *(formerly GAP-9)*
```

**Detailed entry (L379-394):**

```
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
```

### Adjacent / related work parked elsewhere

**`<bibliography>` heading is hardcoded** (`[post-alpha]`, formerly
PG-10) — adjacent to book structuring (a book typically gets one
bibliography in `<book-back>`) but parked post-alpha because the fix
is a config kwarg, not structural work.

**Multi-file authoring** (`[post-alpha]`, → Phase 9, formerly DF-4)
— `notes/specs/multi-file-authoring.md` is a substantial existing
spec. Books may eventually span multiple source files; that's not in
Phase 4's scope per the ROADMAP and the spec's own framing. **But
the spec ALREADY references book vocabulary** at L12, L121, L140-150
— the multi-file design assumes the single-file book-structuring
plugin lands first. Phase 4 unblocks Phase 9.

**Pagination** (`[post-alpha]`, → Phase 8) — split from the
formerly-combined book-and-pagination item per a 2026-Q2 decision
(STATUS.md L365). Pagination is display-target machinery, separate
from book authoring units.

### Phase 5 (JATS export) — Phase 4's downstream

ROADMAP.md L287-310, verbatim summary: Phase 5 builds
`rehypeAcadamarkToJats`; "this is alpha line 4, the payoff for
vocabulary being JATS-aligned from the start". Phase 5 has its own
Phase 0 because "JATS export is a large arc and the package boundary
(`acadamark-jats-export`, not yet present) needs siting". Two items:
(i) JATS-export Phase 0 (package siting, attribute-mapper question,
the JATS section-model deferred-design); (ii) Build JATS export
proper.

**Constraint on Phase 4:** the book vocab declares JATS counterparts
explicitly (book.md L33-40, book-part.md L43-47). The Phase 4
structural plugin must produce a tree shape that the Phase 5
exporter can mechanically translate to JATS book DTD. This is mostly
already aligned (the vocab was designed JATS-shaped from the start),
but per-counter-scope and per-chapter-front-matter decisions in
Phase 4 propagate to JATS export choices.

## Q1.2 — doc-9 snapshot

**Status:** the fixture exists (168 lines, `document-9-demo.acm`)
plus its rendered `document-9-demo.html`, but:

- No `document-9-expected.json` snapshot file
- No `doc9` test block in `test/integration.test.js`
- `render-fixtures.js` re-renders it (so the `.html` stays current)
- No reference to "doc-9" or "document-9" anywhere else in the
  codebase (only BACKLOG.md L106-107, L379-394 + ROADMAP.md L278-280)

### Current doc-9 content

The file is "Participatory Methods in Autism Research" — an
article-shape document (not a book). Top of file:

```
<config title="Participatory Methods in Autism Research" subtitle="..." author="A. Balter" date="2025">
</config>

<data>
<library src="references.bib">
</library>
</data>

## Introduction
...
```

Structurally: bare markdown headings (lifted to canonical sections
by the gate), `<cite>` references, `<table csv>`, `<$$>` display
math with `#eqn:` ids, `<note>` inline-footnotes, `<figure>` with
src, `<blockquote>`, `<ref>` cross-references, `<\``` code blocks
with `#code:` ids, an external `references.bib` library.

The fixture exercises essentially every interpreter stage that
landed in R1/R2/R3 (the four-stage pipeline refactor) plus per-
section footnotes (slice 7001aaa) plus theorem/math numbering
(slices 14b95b7, 8982409) plus the frameable rendering (slice
a90a0d2). It's the de facto integration test for the full
single-article pipeline.

**It is NOT a book.** The roadmap framing "book / book-part + doc-9
snapshot" pairs two separate concerns: (1) extend the structural
plugin to support books; (2) close the doc-9 gap. Both are alpha;
neither is technically blocked on the other.

### Implication for Phase 4

Two separable work streams:
- **Stream A** — `acadamarkBookStructuring` plugin + a new book-
  shaped integration fixture (probably doc38 or doc39) exercising
  the new structural shape.
- **Stream B** — doc-9 snapshot generation + integration test block.
  Mechanical; mirrors the existing doc6/doc7/doc8 pattern per the
  BACKLOG entry's fix path.

Stream B does NOT depend on Stream A (doc-9 is an article, not a
book). They can land in either order or together.

## Q1.3 — current article structure

### Vocab entries

`packages/layer1-vocabulary/elements/`:

- `article.md`, `article-body.md`, `article-meta.md`, `article-back.md`,
  `article-title.md`, `article-subtitle.md` — the article-shape
  structural family.
- `front.md`, `back.md` — generic regions (used by article).
- `meta.md` — the structured-element container; declares
  `type: [article, book, book-part]` as accepted values.

### Article pipeline

The `acadamarkArticleStructuring` plugin
(`packages/acadamark-interpreter/src/plugins/article-structuring.js`)
does the work. From `notes/specs/interpreter.md` §3.3 (L300-336):

1. Reads `<meta type=...>` from root children.
2. If `type` ∈ {article, undefined} → article-structuring proceeds:
   - Promotes `<title>` / `<subtitle>` inside `<meta>` to
     `<article-title>` / `<article-subtitle>` (rename in place).
   - Partitions root children into front (`<meta>`), back
     (`<config>`, `<bibliography>`, `<note-list>`), root-siblings
     (`<data>` — stays at root, outside `<article>`), body
     (everything else).
   - Wraps in `<article>` containing `<article-front>`,
     `<article-body>`, `<article-back>`. Empty regions suppressed.
3. If `type` ∈ {book, book-part} → emits a warning
   (`warnSkippedDocType`) and returns without wrapping
   (`article-structuring.js` L170-173).

So today, a `<meta type=book>` document gets warned-and-ignored —
the rest of the pipeline runs, but no book structure is built. The
authored content sits at root level, schema-dispatched
ad-hoc.

### Section nesting

`acadamarkSectionNesting` (`section-nesting.js`) converts the flat
body content into a nested section tree (per
`notes/specs/interpreter.md` §3.4, L287-298). Section titles (pipe
content) promote to `<section-title>`. Three-deep section ladder:
`section`/`sub-section`/`sub-sub-section`.

Section nesting runs ON `article-body` today. For books, it would
need to run on each book-part's content (book-parts hold sections;
the section ladder is per-book-part).

### Per-section footnote collection

`acadamarkNotes` + `note-placement.js`'s
`findTopLevelSections(treeChildren)` (L92-98):

```js
function findTopLevelSections(treeChildren) {
  const article = findTag(treeChildren, 'article');
  if (!article) return [];
  const body = findTag(article.content ?? [], 'article-body');
  if (!body) return [];
  return (body.content ?? []).filter(c => isAcadamarkTag(c, 'section'));
}
```

**Intersection finding for Q1.6:** this hardcoded `<article>` →
`<article-body>` lookup means per-section footnote collection
DOESN'T fire on book documents. A book document would have
`<book>` → `<book-body>` → `<book-part>` → sections. The
function returns `[]` (no article found), and all notes fall
through to residual — which would end up in `<article-back>` (also
absent) → effectively dropped. This needs explicit handling in
Phase 4.

The slice 7001aaa STATUS milestone wrote: "Per-section footnote
collection — outermost-section collection: for each top-level
`<section>` in `<article-body>`, foot-placed descendant notes
(regardless of nesting depth) collect into a `<note-list>` at the
section's end." The "outermost-section" framing was article-only by
construction. For books, the parallel rule needs decision: does
the outermost collection happen per book-part, per chapter (i.e.
per book-part-type=chapter), or some other scope? See Q1.5 footnote-
scope question.

## Q1.4 — JATS book elements (target shape)

Acadamark vocab entries already describe the JATS mapping
explicitly. Survey from `book.md` and `book-part.md` JATS-mapping
sections:

### JATS book DTD top-level structure

```
<book>
  <book-meta>            ← book-level descriptive metadata
  <book-front>           ← front matter region
    <book-part book-part-type="preface">
    <book-part book-part-type="foreword">
    ...
  <book-body>            ← main content
    <book-part book-part-type="chapter">
    <book-part book-part-type="part">  ← can nest book-part>chapter
    ...
  <book-back>            ← back matter
    <book-part book-part-type="appendix">
    <book-part book-part-type="glossary">
    ...
    <ref-list> (bibliography), <index>, etc.
```

### Acadamark Layer 1 mapping (from book.md L244-252, book-part.md L244-249)

| Acadamark Layer 1 | JATS |
|---|---|
| `<book>` | `<book>` |
| `<book-front>` | `<book-front>` |
| `<book-body>` | `<book-body>` |
| `<book-back>` | `<book-back>` |
| `<book-part>` | `<book-part>` (`book-part-type` preserved) |
| `<book-title>` | `<book-title>` inside `<book-meta>` |
| `<book-part-title>` | `<title>` inside `<meta>`, or `<book-part-title>` directly |
| `<meta>` (inside book) | `<book-meta>` (the role differs from inside article) |
| `<meta>` (inside book-part) | `<book-part-meta>` |

**JATS section model.** Sections (`<sec>`) nest inside `<book-part>`s.
`<book-body>` does NOT directly contain sections; it contains book-
parts which contain sections. `book-body.md` L26-28 confirms this is
acadamark's intended shape too: "Body-level prose (paragraphs,
sections) is **not** typically a direct child of `<book-body>` —
prose belongs inside book-parts. The schema accepts only `<book-part>`
children at this level."

**book-part-type values** (book-part.md L15, line):
`[chapter, part, appendix, preface, foreword, introduction,
conclusion, glossary, dedication, other]`

This matches JATS's book-part-type enumeration plus an `other`
escape hatch. The acadamark vocab declares `book-part-type:
required: true` — every Layer 1 `<book-part>` carries an explicit
type. The shorthand layer (`<chapter>`, `<part>`, `<appendix>`,
etc.) sets it automatically via `shorthand_expansions` (book-part.md
L48-69).

**Region placement by type** (book-part.md L188-200):

| book-part-type | Placement |
|---|---|
| chapter, part, introduction, conclusion, other | book-body |
| preface, foreword, dedication | book-front |
| appendix, glossary, colophon | book-back |

The structural plugin places book-parts automatically based on
type. This is a settled design call already.

**book-type sub-classification** (monograph / edited-volume /
textbook / etc.) is NOT currently exposed as an attribute. book.md
L37-40, L240: "Sub-classification within the book category is not
currently exposed... The kwarg will be added back at that point
[when JATS-export needs it]." Phase 4 can keep this deferred.

**No fundamental conflict.** JATS book DTD maps cleanly onto the
existing vocab. The structural plugin work is straightforward
mapping; no schema refactoring needed.

## Q1.5 — design questions surfaced

Six explicit design decisions need calls before implementation. Per
slice prompt, this Phase 0 surfaces them, doesn't decide them.

### DD-Q1: Replace or augment

**Question.** Does `<book>` *replace* `<article>` as the top-level
container (a document is either an article or a book), or do
book-parts sit *inside* an `<article>`-like outer container?

**Status: SETTLED in vocab.** book.md L33-40 declares `<book>` as a
peer top-level container parallel to `<article>`, with its own
`<book-front>`/`<book-body>`/`<book-back>`. `<meta type=book>` is
the discriminator. The structural plugin generates one of the two
top-level shapes.

**Decision recorded; nothing to surface.**

### DD-Q2: Book-part types — one element or many

**Question.** Does acadamark expose one `<book-part>` tag with a
`type=` kwarg, or separate tags (`<chapter>`, `<part>`, etc.)?

**Status: SETTLED in vocab.** book-part.md L323-332 ("Why one
element instead of separate `<chapter>`, `<part>`, etc."):
"The single `<book-part>` element with type discriminator was
chosen because: matches JATS exactly; captures the structural
truth; recursive nesting works naturally; adding new types is a
vocab update, not a new Layer 1 element. The shorthand layer
preserves authoring ergonomics — authors write `<chapter | Title>`,
not `<book-part book-part-type="chapter">`."

**Decision recorded; nothing to surface.**

### DD-Q3: Section nesting

**Question.** Are top-level `<section>`s allowed only inside
book-parts, or also directly inside `<book-body>`?

**Status: SETTLED in vocab.** book-body.md L26-28: "Body-level prose
(paragraphs, sections) is **not** typically a direct child of
`<book-body>` — prose belongs inside book-parts. The schema accepts
only `<book-part>` children at this level."

**Decision recorded; nothing to surface.**

### DD-Q4: Counter scope (OPEN)

**Question.** Equation, figure, table, theorem counters — reset
per book-part (or per chapter specifically), or global across the
book?

**Status: OPEN.** No vocab declaration; no spec text. LaTeX defaults
to per-chapter resets for book documents (`\theequation` becomes
`<chapter>.<eqn-in-chapter>`, e.g. "3.7" for equation 7 in
chapter 3); JATS doesn't prescribe (the `<book>` schema is
display-agnostic).

**Tradeoffs.**
- **Per-book-part reset, with chapter-prefix labels** (LaTeX
  convention): authors get "Figure 3.7" cross-references inside
  the book. Familiar to academic readers. Requires the
  numbering registry to support per-section resets (or a per-
  section context the registry threads through). Cross-reference
  rendering needs to know about the chapter-prefix.
- **Global counters across the book**: simpler — same registry
  shape as articles; numbers continue increasing across chapters
  ("Figure 47"). Less convention-conforming for long-form
  academic books, but defensible for shorter monographs.
- **Per-chapter only, not per-book-part-of-other-types**: nuance
  — appendices typically restart counters (A.1, A.2, ...).
  Prefaces don't have numbered figures. So "per-chapter" is
  really "per-book-part-of-most-types", with an alphabetic
  prefix for appendices.

**Phase 4 design call needed.** Recommendation surface: per-
chapter resets with chapter-prefix labels match the academic
convention but require registry extension. Defer the registry
extension to a follow-up sub-slice if Phase 4 wants to ship the
structural plugin first; pick global counters initially with a
config-level switch when the LaTeX-convention rendering is needed.

### DD-Q5: Footnote scope (OPEN)

**Question.** Per-section footnote collection currently collects
at the outermost containing `<section>` inside `<article-body>`.
In a book, does that mean per-chapter footnotes naturally? Or do
book-parts need their own collection level?

**Status: OPEN.** Current implementation (`note-placement.js` L92-98,
quoted in Q1.3) hardcodes `<article>` → `<article-body>` and is
incompatible with the book tree shape. Per the slice 7001aaa STATUS
("outermost-section collection"), the design intent was
chapter-scoped collection in a book context — but the implementation
predates book support.

**Tradeoffs.**
- **Per-book-part collection** (the natural extension of per-
  section to books): each chapter / appendix / preface gets its
  own footnote list at the chapter's end. Matches LaTeX
  `\footnote` per-chapter behavior with default amsbook class.
- **Per-section collection still, just inside book-parts**: more
  granular than per-chapter. Could produce multiple footnote
  lists per chapter (one per top-level section). Probably wrong
  visually for typical books.
- **Per-book-back collection**: all footnotes pool to `<book-
  back>` as endnotes. Defensible for some book styles
  (especially scholarly editions) but loses the per-chapter
  locality.
- **Configurable via `<config note-position=...>`**: book.md
  L17-20 already declares `note-position: values [foot, end,
  side, chapter-end]`. The `chapter-end` value is book-specific
  and recorded in the vocab — implying chapter-end is the
  intended default. **This is a half-settled design**: the
  vocab anticipates it; the implementation hasn't landed.

**Recommendation:** for the structural plugin slice, the simplest
correct behavior is per-book-part collection (matches the
chapter-end value), with the existing `note-position` kwarg
controlling deviations. The footnote-collection-depth author
override (`[post-alpha]` item filed in slice 7001aaa) would extend
this in future.

### DD-Q6: Front matter / back matter scope (OPEN)

**Question.** Book-level front matter (title page, copyright,
preface) vs. book-part-level front matter (chapter epigraph,
chapter-author). Does acadamark need both?

**Status: PARTIALLY SETTLED.** book.md L222-228: "A book has three
structural regions, mirroring JATS/BITS: `<book-front>`,
`<book-body>`, `<book-back>` — all three are generated by the
structural plugin." So book-level front/back is in scope.

book-part.md L213: "Unlike books, book-parts do **not** have nested
`<book-part-front>` / `<book-part-body>` / `<book-part-back>`
wrappers — `<meta>` and body content sit directly inside
`<book-part>`. This keeps the recursive book-part structure simple."
So per-book-part front/back regions are explicitly OUT of scope.

**Decision largely recorded; minor open subquestion:** does the
chapter-author convention (an `<author>` element inside a chapter
in an edited volume) need any special handling? book.md's edited-
volume authoring pattern (L287-302) shows `<author>` inside
`<chapter>` and produces it inside the chapter's `<meta>`. The
plugin needs to handle this case but the shape is settled.

## Q1.6 — intersections with prior work

### Per-section footnotes (slice 7001aaa)

**Intersection: REAL, needs design call.** As surfaced in Q1.3 +
Q1.5 DD-Q5, the per-section footnote plugin hardcodes
`<article>`/`<article-body>` and produces no output for book
documents today. Phase 4 must extend `findTopLevelSections` to
either:
- Detect document type and dispatch (article path / book path)
- Generalize the "body container" lookup to handle both
- Add a parallel `findTopLevelBookParts` and a per-book-part
  collection rule

The chosen path depends on DD-Q5 (footnote scope). The
recommended per-book-part scope is the simplest extension.

### Numbering registry (slice 14b95b7)

**Intersection: REAL, conditional on DD-Q4.** If counter scope is
global across the book, the existing per-type registry shape
(`packages/acadamark-core/src/registry.js`) works unchanged — same
shape as articles. If per-book-part resets are chosen, the
registry needs extension to support per-section resets (or
per-book-part contexts). That extension is non-trivial: the
`registry.assign()` API doesn't currently know about containing
sections, and `numberRegistry()` walks every entry per-type with a
single counter.

Conditional on DD-Q4. Defer the registry extension by picking
global counters initially.

### Frameable elements (slice 8982409)

**Intersection: REAL but smaller.** Cross-reference rendering
(`ref-resolution.js`'s `DEFAULT_PREFIXES`) produces "figure 3",
"table 1", etc. In a book with per-chapter resets, the convention
would be "figure 1.3" (chapter 1, figure 3 of chapter 1). The
rendering needs the chapter context; today `computeRefText` only
knows the entry's number.

Conditional on DD-Q4. If global counters are chosen, no
intersection — "figure 47" is the cross-ref text and that's fine.
If per-chapter resets, frameable cross-ref rendering needs to
prepend the chapter prefix.

### Section nesting

**Intersection: PROBABLY SMALL.** `acadamarkSectionNesting` operates
on a content array (currently `article-body`'s children). For books
it would need to operate on each book-part's content. The plugin
shape is general (it nests sections, regardless of containing
parent), so refactoring is mostly call-site changes — find
book-parts, run section-nesting inside each one.

### Article-structuring `warnSkippedDocType`

**Intersection: SETTLED disposition.** The current warning at
`article-structuring.js` L170-173 will be replaced. The book path
either becomes a sibling branch in the same plugin or a separate
`acadamarkBookStructuring` plugin. Vocab declares the latter
(book.md L146 "acadamarkBookStructuring" related_plugins entry), so
separate plugin is the precedent.

## Q1.7 — existing book-related vocabulary or scaffolding

### Vocab entries (9 entries, mature)

`packages/layer1-vocabulary/elements/`:

- `book.md` — top-level container, 357 lines including
  `acadamarkBookStructuring` related_plugin documentation, full
  JATS mapping, render-mode lowering, multi-file deferral note.
- `book-part.md` — the recursive divisor, 340 lines including the
  full type table, shorthand expansions (chapter, part, appendix,
  preface, foreword, introduction, conclusion, glossary), JATS
  mapping, region-placement logic, edited-volume patterns.
- `book-front.md`, `book-body.md`, `book-back.md` — region
  wrappers, terse (each ~30 lines).
- `book-title.md`, `book-subtitle.md` — title elements promoted
  from `<title>` / `<subtitle>` inside `<meta type=book>`.
- `book-part-title.md`, `book-part-subtitle.md` — parallel for
  book-parts.

**The vocab is essentially complete and JATS-aligned.** Phase 4's
work is implementing the structural plugin (`acadamarkBookStructuring`)
that the vocab already describes. No new vocab entries should be
needed unless DD-Q4/DD-Q5/DD-Q6 surface fields not currently
declared.

### Plugins / handlers

**No `acadamarkBookStructuring` plugin exists.** The vocab references
it (book.md L146-154, book-part.md L141-150) as the intended
plugin, but the file isn't on disk. No book-related handlers either.
`article-structuring.js` L170-173 is the only book-aware code: the
warn-and-skip placeholder.

### Specs

- `notes/specs/interpreter.md` §3.3 (L300-336) documents
  `acadamarkArticleStructuring`'s current behavior including the
  book/book-part skip.
- `notes/specs/pipeline.md` L284-285 records the same limitation.
- `notes/specs/multi-file-authoring.md` (L12, L121, L140-150)
  references book structure as the foundation multi-file authoring
  builds on.
- `notes/specs/multi-column-display.md` L94, L189 mentions
  `<article-body>` / `<book-body>` as parallel layout targets.
- `notes/specs/shape-tokens.md` L55, L123 includes book-part in the
  Layer 1 vocabulary survey.
- `notes/specs/layer1-naming.md` — no book mentions found.
- `DESIGN.md` — no book mentions found.

**Spec gaps for Phase 4 to fill:**
- `interpreter.md` needs a new §3.X for `acadamarkBookStructuring`
  paralleling §3.3's article-structuring documentation.
- `pipeline.md` L284-285 needs updating (the "limitation" becomes
  "handled by acadamarkBookStructuring").
- `DESIGN.md` may want a short §"Document structure: articles vs.
  books" — currently DESIGN.md has structural-pattern sections for
  several other concerns (frameable, structured-element, the
  single gate) but nothing on the article/book duality.

## Q1.8 — backlog and roadmap state for Phase 4

**Consistent across views.**

- ROADMAP.md L266-283 lists two items (book structuring + doc-9
  snapshot) in order, exits clearly stated.
- BACKLOG.md L144-145 (book structuring checklist) + L545-549
  (detailed) and L106-107 (doc-9 checklist) + L379-394 (detailed)
  match the ROADMAP framing.
- Both items reference their retired AUD-N / GAP-N / DF-N
  identifiers correctly (formerly DF-12 for book structuring;
  formerly GAP-9 for doc-9).
- No stale references to obsolete identifier systems.

**No drift surfaced.** Phase 4's positioning is consistent. The
biggest gap between ROADMAP and reality is the compressed framing
("book / book-part vocabulary is in place, structural plugin needs
to handle it") which understates the open DD-Q4/Q5/Q6 design calls
the plugin work surfaces. But that's fair-and-typical roadmap
compression; the Phase 0 finding documents the unpacking.

## Bundle vs split recommendation

**Recommendation: SPLIT into two slices.**

Order: **4a → 4b**.

- **Slice 4a — `acadamarkBookStructuring` plugin + book-shaped
  fixture.** Implements the structural plugin per the vocab's
  declared behavior (book.md L146-154, book-part.md L141-150).
  Handles `<meta type=book>` and `<meta type=book-part>`. Generates
  `<book>`/`<book-front>`/`<book-body>`/`<book-back>` from author
  input. Expands shorthand book-part tags (`<chapter>`, `<part>`,
  etc.) — though as noted in Q1.7 the shorthand_expansions are
  vocab-level (build-time), so the plugin work is the placement +
  region wrapping, not the expansion itself. Routes book-parts by
  type into the correct region. Promotes `<title>`/`<subtitle>` to
  `<book-title>`/`<book-subtitle>` (book-level) or `<book-part-
  title>`/`<book-part-subtitle>` (book-part level). Adapts
  `findTopLevelSections` in `note-placement.js` to work for books
  (per DD-Q5 footnote scope decision — recommended per-book-part).
  Adapts `acadamarkSectionNesting` to run on book-part bodies.
  New book-shaped fixture (likely doc38) exercising
  chapter/part/appendix authoring + cross-references + footnotes.
  Defers DD-Q4 counter scope: ship with global counters
  initially; per-chapter resets become a follow-up slice if needed.
  Spec updates: `interpreter.md` §3.X for the new plugin;
  `pipeline.md` L284-285 update. **Medium slice; the bulk of
  Phase 4's work.**

- **Slice 4b — doc-9 snapshot + integration test.** Mechanical
  per the BACKLOG entry's fix path: run `render-fixtures.js`,
  generate `document-9-expected.json` from current output, add
  `doc9` test block to `integration.test.js` mirroring
  doc6/doc7/doc8. Small slice. **Independent of 4a** — doc-9 is
  an article, not a book. Could ship before, during, or after 4a.
  Recommendation: ship after 4a so the doc-9 snapshot captures the
  full alpha-complete pipeline (frameable / theorem labels / notes
  / book-aware structural plugin / etc.) all in one pinning.

Phase 4 closes when both sub-slices land.

**Alternative — BUNDLE:** doable but combines very different shapes
(structural plugin engineering with snapshot generation). Splitting
keeps each slice's test surface coherent: 4a's snapshot diffs are
about new structural-tree shapes; 4b's snapshot diff is one new
expected.json. Splitting also lets 4b ship quickly if 4a runs long.

### Conditional follow-up slices (post-Phase-4 if needed)

- **4c — per-chapter counter resets + chapter-prefix cross-references**
  (resolves DD-Q4). If reviewers ask for LaTeX-convention "Figure
  3.7" numbering, this slice extends the registry + ref-
  resolution. Conditional; defer unless asked.

## Three sibling cleanup items worth filing or bundling

- **`acadamarkBookStructuring` doesn't exist.** The vocab references
  it (book.md L146, book-part.md L142). Plugin file creation is in
  scope for 4a, but worth flagging that the related_plugin
  declaration in the vocab is currently a forward-reference.
- **`note-placement.js`'s article-only assumption.** The hardcoded
  `<article>`/`<article-body>` lookup needs generalizing for books.
  In scope for 4a per DD-Q5; recording as a sibling cleanup so it's
  not overlooked.
- **`pipeline.md` L284-285 stale-after-4a.** The "Limitation: book
  and book-part document types are not handled" line gets stale
  when 4a lands. Spec update is in scope for 4a.

## What is recorded vs. what is open

Recorded (this Phase 0 surfaces):
- Q1.1 — BACKLOG/ROADMAP entries (verbatim with line numbers)
- Q1.2 — doc-9 fixture state (.acm + .html exist; no snapshot, no
  test); 168-line fixture content + structure surveyed
- Q1.3 — current `<article>` structure + pipeline + the warn-and-
  skip placeholder in `article-structuring.js`
- Q1.4 — JATS book DTD top-level shape + vocab's declared mapping;
  no fundamental conflict
- Q1.5 — six design questions; three already settled in vocab,
  three (DD-Q4 counter scope, DD-Q5 footnote scope, DD-Q6 minor
  front-matter subquestion) open for Phase 4's implementation
  slice to decide
- Q1.6 — three real intersections (notes, numbering, frameable
  cross-refs), one conditional (section-nesting), one settled
  (article-structuring disposition)
- Q1.7 — 9 mature vocab entries; no plugin scaffolding; specs
  reference book-structure forward
- Q1.8 — backlog/roadmap consistent; no drift

Open (decisions deferred to implementation slices or chat):
- DD-Q4: counter scope (per-chapter resets vs. global across book)
- DD-Q5: footnote scope (per-book-part / per-section / book-back)
- DD-Q6: chapter-author edge case in edited volumes (vocab has
  authoring pattern; plugin needs to handle)
- The path-vs-detection question for the per-section footnote
  rewrite (detect doc-type and dispatch vs. generalize container
  lookup vs. parallel function)
- Whether to ship slice 4c (per-chapter resets) at all
