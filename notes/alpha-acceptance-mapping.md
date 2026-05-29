# Alpha acceptance — verification mapping

This is the **acceptance record** for the alpha milestone. The alpha
definition (`ROADMAP.md`, "The alpha milestone — what we are aiming at")
is five literal acceptance criteria. For each line, this document names
the fixture that demonstrates it and states what that fixture shows. It
is the evidence that each line holds — the durable counterpart to the
`STATUS.md` milestone line, which records only that alpha was reached.

The Phase 0 analysis that produced this mapping is
`notes/phase6-alpha-integration-findings.md`. The fixtures live in two
corpora: `packages/acadamark-interpreter/test/fixtures/` (`.acm` source
+ `.html` render + `.json` snapshot, exercised by
`test/integration.test.js`) and `packages/acadamark-jats-export/test/
fixtures/` (`.acm` + `.xml` JATS snapshot, exercised by `test/run.js`).
No fixture counts or test counts appear here — run `npm run verify`.

## The five lines (verbatim from `ROADMAP.md`)

> 1. The **Layer 1 custom-HTML elements** that render a rich document.
> 2. **Canonical acadamark shorthand** authoring that form.
> 3. **Further shorthands (sigils) and markdown idioms** reducing to it.
> 4. **JATS ⇔ Layer 1** conversion.
> 5. **Acadamark ⇔ Layer 1** conversion.

## Coverage at a glance

| Line | Demonstrator | Companion / supporting |
|---|---|---|
| 1 — Rich document | `doc-9` (`document-9-demo`) | `doc-44` (book-form rich document) |
| 2 — Canonical authoring | `doc-1` (`document-1-minimal`) | `doc-14` (canonical sigils) |
| 3 — Idioms → canonical | `doc-16` (`document-16-section-form-convergence`) | `doc-11`, `doc-12`, `doc-14`, `doc-15` |
| 4 — JATS export | `doc-43` (article) + `doc-42` (book) | `doc-44` (book, cross-feature) |
| 5 — Acadamark ⇔ Layer 1 | `doc-16` | every fixture's snapshot pinning |

## Line 1 — Layer 1 elements render a rich document

**Demonstrator: `doc-9` (`document-9-demo.acm`).** Pinned at the end of
Phase 4 as the alpha-complete demonstrator. "Rich document" is
`DESIGN.md`'s phrase for scholarly text carrying the full apparatus, and
doc-9 exercises a broad cross-section of the Layer 1 vocabulary in one
article: `<config>` metadata, a `<library>` with several `<cite>`
references resolving to a bibliography, multi-level sections, inline and
display math (the `<$>` / `<$$>` sigils), two CSV `<table>`s with
captions, a Python code block, footnotes (`<note>`), a `<blockquote>`, a
`<figure>` with a source asset, and cross-references (`<ref>`) to a table
and a figure. The rendered `document-9-demo.html` is the visual evidence;
the snapshot pins the structure.

**Cross-feature companion: `doc-44`** extends the line-1 evidence to the
*book* form — the same rich-document apparatus assembled inside a
`<book>` rather than an `<article>` (see the cross-feature section
below).

## Line 2 — Canonical acadamark shorthand authoring

**Demonstrator: `doc-1` (`document-1-minimal.acm`).** Authored entirely
in the canonical-named tag form — `<meta type=article>`, `<title>`,
`<author>`, `<section>` with pipe-content titles, and inline `<em>` — with
no sigils and no markdown idioms. It establishes that the canonical
surface *alone* is sufficient to author a valid Layer 1 document. It is
minimal by design: line 2 is about sufficiency of the canonical register,
not breadth (breadth is line 1).

**Canonical-sigil supplement: `doc-14`.** "Canonical acadamark" includes
the canonical sigils (`<#>` / `<##>` / `<###>` for sections; `<$>` /
`<$$>` for math; the code-fence sigils) per `DESIGN.md`. doc-1 covers the
named form; doc-14 covers the section sigils end-to-end. Together they
demonstrate both canonical surfaces. (A single fixture mixing
canonical-named and canonical-sigil forms without any markdown idiom was
considered in Phase 0 and judged unnecessary — the two existing fixtures
cover the criterion.)

## Line 3 — Sigils and markdown idioms reduce to canonical

**Demonstrator: `doc-16` (`document-16-section-form-convergence.acm`).**
The explicit convergence proof: the same section is authored three ways —
canonical-named (`<section>`), canonical sigil (`<#>`), and bare markdown
(`#`) — and all three produce the structurally identical Layer 1
`<section>` node (same tagname, same section-title shape, same title
text), modulo the absence of an id on the bare-markdown form (which has no
id surface). This is the lift gate (`normalize-to-canonical.js`) doing its
single job: reducing every authored form to the canonical one.

**Supporting fixtures** extend the proof to the other reducible idiom
categories: `doc-11` (bare `$x$` and `$$…$$` math lift to canonical
`<inline-math>` / `<display-math>`), `doc-12` (bare GFM pipe tables lift to
canonical `<table>`), `doc-14` (sigil heading dispatch), and `doc-15`
(bare markdown headings lift to sections; `####`+ pass through as plain
`<hN>`). Together they cover sections, inline math, display math, tables,
and headings — the major reducible idioms.

## Line 4 — JATS ⇔ Layer 1 conversion

The alpha scope is the **export** direction (Layer 1 → JATS XML). Import
is deliberately lossy and post-alpha (`ROADMAP.md` Phase 13). Two
demonstrators cover the two doctypes, which are mutually exclusive at the
root and so cannot share one fixture:

**`doc-43` (article → JATS 1.3 Archiving).** The broadest article surface:
a bibliography emitted as structured `<element-citation>` (per-field
`<person-group>` / `<article-title>` / `<source>` / `<year>` / `<volume>`
/ `<pub-id>` / …), external DSLs (`<mermaid>` / `<abc>`) preserved as
`<fig specific-use="acadamark-dsl-…">` with verbatim `<preformat>` source,
and cross-references to both bibliography entries (`ref-type="bibr"`) and
DSL figures.

**`doc-42` (book → BITS 2.0).** A BITS book with preface / chapters /
appendix routed to `<front-matter>` / `<body>` / `<book-back>`, an
edited-volume per-chapter `<contrib-group>`, and chapter-scope footnotes
collected per `<book-part>`.

Both DTD-validate when `xmllint` is on PATH; the JATS test runner enforces
validation there and logs a skip otherwise. **Cross-feature companion:
`doc-44`** is a second BITS-book artifact that additionally exercises a
book-wide bibliography in `<book-back>` (see below).

## Line 5 — Acadamark ⇔ Layer 1 conversion

**Reading settled: Reading B.** The alpha scope is the *parse → render*
direction being internally consistent at the Layer 1 level — acadamark
source parses to Layer 1 mdast, which renders to Layer 1 HTML — and, for
the canonical-form subset, the parse direction *is* the round-trip:
canonical acadamark and Layer 1 are structurally the same document modulo
the named-tag ⇄ sigil cipher, so parsing canonical acadamark already
yields the Layer 1 structure. The lowering direction (Layer 1 →
canonical acadamark source) that a full bidirectional round-trip would
require is **post-alpha** (`ROADMAP.md` Phase 7, lift-and-lower
completeness).

**Demonstrator: `doc-16`**, doing double duty. Its two canonical forms
(named + sigil) each converge to the same Layer 1 `<section>`; for those
forms the convergence *is* the round-trip. **Supporting:** every fixture
in both corpora pins its parsed-and-rendered Layer 1 by snapshot, so the
corpus collectively demonstrates that parse → render is deterministic and
stable across the whole vocabulary.

## Cross-feature stress fixture — `doc-44`

`doc-44` (`document-44-cross-feature-monograph.acm`) is the single
artifact that combines, in one believable short monograph, the surface no
other fixture exercises *together*. It lives in both corpora (interpreter
HTML render + JATS BITS export). It exercises:

- **Book structure** — preface (`<book-front>`), chapters (`<book-body>`),
  appendix (`<book-back>`), with one chapter carrying its own `<author>`
  (the edited-volume case).
- **Bibliography inside a book** — a `<library>` with `<cite>` references
  that resolve, and a document-wide reference list placed in
  `<book-back>`. This path was broken before Phase 6: the citation index
  was built only from root-level `<data>`, which a book nests inside its
  body, and the bibliography had no book placement. Phase 6 fixed both
  (`buildCitationIndex` now finds `<data>` wherever it lands;
  `bibliography.js` places the reference list into `book-back`). doc-44 is
  the regression artifact for that fix. The placement choice — **one
  document-wide reference list in `book-back`** — is recorded as a design
  decision; per-chapter scoped bibliographies are a deferred post-alpha
  option (filed in `BACKLOG.md`).
- **External DSLs** — `<mermaid>` and `<abc>`, preserved verbatim.
- **Theorem family** — `<theorem>` + `<proof>` (shared/unnumbered) and a
  `<definition>` (own counter).
- **Math in all three forms** — inline `$…$`, the display sigil `<$$>`,
  and an `align` environment.
- **Frameables** — a `<figure>` and a CSV `<table>`.
- **Per-chapter footnotes** — honoring the book default
  `note-scope=chapter`, so each book-part collects its own notes.

doc-44 is not a line-2 or line-3 demonstrator (it mixes canonical and
idiom forms freely); it strengthens lines 1 and 4 and, by snapshot
pinning, line 5.

## What is not in alpha scope

These directions are real and planned, but outside the five-line alpha
definition. They are named here so the mapping is not mistaken for a
claim of full bidirectionality:

- **Layer 1 → acadamark lowering** and **strict mode** — `ROADMAP.md`
  Phase 7 (post-alpha).
- **JATS → Layer 1 import** — `ROADMAP.md` Phase 13 (post-alpha).
- **Executable code blocks** (JS / Arquero / Vega-Lite) — `ROADMAP.md`
  Phase 10 (post-alpha).
