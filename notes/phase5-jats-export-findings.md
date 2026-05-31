# Phase 5 — JATS export: Phase 0 findings

**Status:** read-only Phase 0 complete. No implementation; no product
code, no spec, no vocab changes. This file is the artifact Phase 5's
implementation slice(s) will be built from — same role
`notes/phase4-structuring-findings.md` played for Phase 4.

**Date:** 2026-05-29 (post-`0bcd008`, post-Phase-4-close).
**Recommendation at end:** SPLIT into four sub-slices (5a–5d).
Reasoning in the "Bundle vs split" section.

## Phase 5 scope as inherited

Per ROADMAP.md L311-334, Phase 5 is the JATS export arc — Layer 1 →
JATS XML. It's "alpha line 4, the payoff for vocabulary being
JATS-aligned from the start (`jats_counterpart` on every entry)."

Two items in ROADMAP order:
1. **JATS-export Phase 0** (this slice) — package siting, attribute-
   mapper question, JATS section-model deferred-design.
2. **Build JATS export (`rehypeEnscribeToJats`)** *(formerly DF-18)*.

Exit: "a Layer 1 document round-trips to JATS XML cleanly enough for
journal submission."

The Phase 0 finding documents what Phase 5's implementation
specifically needs to decide and build. The biggest unsurprise:
**91 of 109 vocab entries already declare `jats_counterpart`**, with
the remaining 18 being structural wrappers (article-body, book-body,
title elements) that have obvious mappings. The mapping inventory is
mostly mechanical reading rather than fresh design work.

## Q1.1 — what Phase 5 filed

### ROADMAP.md Phase 5 entry (L311-334, verbatim)

```
## Phase 5 — JATS export *(alpha — line 4)*

The first half of the JATS bridge: Layer 1 → JATS XML. This is alpha
line 4, the payoff for vocabulary being JATS-aligned from the start
(`jats_counterpart` on every entry). JATS import is the deliberately
lossy direction and is post-alpha.

This phase has its own **Phase 0** because JATS export is a large arc
and the package boundary (`enscribe-jats-export`, not yet present)
needs siting against the inward-pointing `enscribe-core`.

**Items, in order:**

- **JATS-export Phase 0.** Package siting; the export-stage attribute
  mapper (whether it lifts to core's `mapAttributes(node, vocab,
  emit)` shape now or later); the JATS section-model question recorded
  as deferred in `DESIGN.md`.
- **Build JATS export (`rehypeEnscribeToJats`)** *(formerly DF-18)*.
  The mapping is mostly mechanical because Layer 1 is JATS-shaped; the
  metadata-defaults policy and the few restructuring cases are the
  real design work.

**Exits:** a Layer 1 document round-trips to JATS XML cleanly enough
for journal submission.
```

### BACKLOG.md Phase 5 entries

**Checklist (L143-144):**

```
- [ ] **Build JATS export (`rehypeEnscribeToJats`)** `[interpreter]`
  `[alpha]` *(→ roadmap: Phase 5)* *(formerly DF-18)*
```

**Detailed entry (L521-532):**

```
### Build JATS export (`rehypeEnscribeToJats`)
`[interpreter]` `[alpha]` *(→ roadmap: Phase 5)*

The vocabulary is JATS-aligned by design (`jats_counterpart` on every
entry); this is the payoff. *(formerly DF-18)*

Needs a Phase 0 first to site the `enscribe-jats-export` package
against the inward-pointing `enscribe-core`, decide the
export-stage attribute mapper's shape (whether the iteration shape
lifts to core's `mapAttributes(node, vocab, emit)` callback API now
or stays local), and address the JATS section-model question
recorded as deferred in `DESIGN.md`.
```

### Related items NOT formally in Phase 5

- **JATS import** (`[post-alpha]`, L165-166 + L626-) — explicit
  acknowledged-lossy direction; not in Phase 5's scope.
- **Render-mode lowering** (`[post-alpha]`, → Phase 8) —
  display-target-three; orthogonal to JATS.
- **Build the lowering pass (Layer 1 → canonical enscribe)**
  (`[post-alpha]`, → Phase 7) — different lowering target.

### Phase 6 framing (Phase 5's downstream)

ROADMAP.md L338-354. Phase 6 is the alpha integration check: "Five-
point verification fixtures. One acceptance fixture per line of the
alpha definition: Layer 1 elements render; canonical enscribe
authors them; sigils and markdown idioms reduce to them; JATS export
round-trips; Layer 2 ⇔ Layer 1 round-trips losslessly for canonical-
form fixtures."

**Constraint Phase 5 must satisfy:** at least one fixture must
demonstrate Layer 1 → JATS export round-trip. This means Phase 5's
exit isn't just "exports without errors" — it's "exports content
that JATS validators accept and JATS consumers can ingest." The
five-point verification will exercise this.

### DESIGN.md JATS-relevant sections

- **L25-50 — Layered model** (the diagram with "Layer 1 ──► JATS XML"
  as the export arrow).
- **L92-110 — "JATS as reference and export target"** — JATS is
  both the vocabulary enscribe consults when growing Layer 1 AND
  the format enscribe exports to. "Layer 1 is a small, displayable,
  authorable projection of JATS: where JATS has 200-plus elements
  and no display target, Layer 1 has perhaps 30-some elements" (the
  30-some is an old number; current count is 109 — see Q1.6).
- **L320-322 — "Deferred: section model in JATS export"** — the
  three-named-section-elements design (`section`/`sub-section`/
  `sub-sub-section`) vs. JATS's depth-typed recursive `<sec>`. The
  decision was recorded as "reconsidered in the JATS export arc."
  Phase 5 implementation must address this (see Q1.7).
- **L434-436 — "The JATS export plugin"** — names
  `rehype-enscribe-to-jats` as the planned plugin (note the lower-
  case naming; the ROADMAP uses both `rehypeEnscribeToJats` and
  `enscribe-jats-export` — see Q1.4 on package naming).
- **L438-440 — "Package structure"** — "The project is organized as
  an npm workspace with four packages (a fifth,
  `enscribe-jats-export`, is planned)."

## Q1.2 — existing JATS scaffolding or prior work

**Scaffolding: NONE.**

- No `enscribe-jats-export` package or directory.
- No plugin/module with `jats` in its name in any package's `src/`.
- No git commits with "jats" or "JATS" in the subject.
- The `data.js` file regenerated from vocab references JATS
  counterparts (the inventory in Q1.6), but no consumer code reads
  those `jats_counterpart` fields today.

**What DOES exist (vocab-side):**

- 91 of 109 vocab entries declare `jats_counterpart` (Q1.6 inventory).
- DESIGN.md (L92-110, L320-322, L434-436, L438-440) commits to JATS as
  reference + export target, names the planned package, records the
  deferred section-model decision.
- Per-vocab-entry JATS mapping notes — e.g.
  `display-math.md`'s `jats_counterpart` declares
  `element: disp-formula` + notes that "the JATS exporter generates
  `<tex-math>` with the raw LaTeX source plus optionally `<mml:math>`."
  These notes contain real design that Phase 5 implementation
  consumes (per-element).

**Phase 5 is greenfield within an established codebase** — the
ground was prepared (vocab, design, package-boundary placeholder)
but no code exists.

## Q1.3 — JATS target version and DTD

JATS is a NISO standard (ANSI/NISO Z39-96). Multiple versions and
multiple parallel DTDs exist.

### Versions

- **JATS 1.0** — original NISO standard (2012).
- **JATS 1.1, 1.2, 1.3** — incremental revisions (1.3 approved
  2021-06-10).
- **JATS 1.4** — current version per ANSI/NISO Z39-96-2024.

### Tag sets (per JATS version, three parallel DTDs)

- **Archiving and Interchange Tag Set** — most permissive; designed
  to preserve content as authored. The widest acceptance.
- **Journal Publishing Tag Set** — stricter; designed for the
  publisher's view; some elements required.
- **Journal Authoring Tag Set** — most restrictive; designed for
  authors composing for a specific publisher.

### Book extension: BITS

JATS itself targets journal articles. Books use the parallel
**Book Interchange Tag Suite (BITS)**, built on JATS.

- **BITS 2.2** — current; built on JATS 1.4.
- **BITS 2.0** — earlier; built on JATS 1.3.
- BITS provides `<book>`, `<book-part>`, `<book-meta>`,
  `<book-front>`/`<book-body>`/`<book-back>` — exactly the elements
  Phase 4's vocab already declares.

### Recommendation for Phase 5

- **Target JATS 1.3 + BITS 2.0**, with a plan to upgrade to 1.4 +
  BITS 2.2 in a follow-up slice if reviewers want it. Rationale:
  JATS 1.3 is the version with the widest validator support
  (JATS4R, several open-source validators); JATS 1.4 is current but
  still relatively new. Most journal submission pipelines accept
  1.3.
- **Archiving and Interchange Tag Set** is the right tag set for
  enscribe's use case — most permissive, designed to preserve
  content as authored, no required elements that enscribe can't
  always provide (publisher metadata, etc.).

### DTD constraints worth flagging

The Archiving and Interchange Tag Set has very few required
elements. The ones that DO require attention:

- **`<article>`** requires `xml:lang` (or `lang`) and `dtd-version`
  attributes. Phase 5 supplies defaults (e.g. `en` lang, `1.3`
  dtd-version).
- **`<article-meta>`** is required inside `<front>`. It contains
  the article's descriptive metadata. Enscribe's `<meta>` lifts
  to this naturally per the Phase 4 structuring plugin's article
  shape.
- **`<book>`** in BITS requires `dtd-version` similarly.
- **`<table-wrap>`** requires either `<label>` (the table number)
  or `<caption>`. Enscribe's numbered tables provide both naturally.
- **`<fig>`** requires `<graphic>` OR alternative content. For
  `<svg>`/`<mermaid>`/`<abc>` non-image figures, Phase 5 needs an
  approach (likely emit `<graphic>` with the source preserved in
  the alt path or as a separate file reference).
- **`<contrib-group>`** holds author/editor contributors. The
  enscribe `<author>` element lifts to a JATS `<contrib>` inside
  `<contrib-group>` (per enscribe's existing structured-element
  shape for `<author>`).

**No fundamental conflicts** between JATS Archiving 1.3 / BITS 2.0
and enscribe's current vocabulary.

## Q1.4 — package boundary

### Current packages (`packages/`)

- `enscribe-core` — inward-pointing shared foundation; depends on
  nothing internal; fs-free, browser-safe.
- `layer1-vocabulary` — build-time-generated vocab `data.js`;
  consumers import the static module.
- `remark-enscribe` — the shorthand parser (Peggy + micromark
  hybrid).
- `enscribe-interpreter` — the full mdast→HTML interpreter
  pipeline. Depends on `enscribe-core` + `layer1-vocabulary` +
  `remark-enscribe`.

### Pattern for new packages

Per `notes/specs/enscribe-core.md` and DESIGN.md L438-440:

- **Outward-pointing packages** (parser, interpreter, jats-export
  when it lands) depend on `enscribe-core` and `layer1-vocabulary`
  but not on each other.
- **`enscribe-core` is the only inward dependency** — everything
  depends on it; it depends on nothing internal.
- **Build/run-time seam** doubles as the browser-safety boundary —
  `enscribe-core` and shippable runtime code are fs-free.

The pattern is clean: a new output target (HTML today, JATS
tomorrow, render-mode/print after) goes in its own package, and
the shared bits (vocab, AST utilities, tag construction) stay in
`enscribe-core` (+ `layer1-vocabulary`).

### Candidate fits for JATS export

**A. New package `enscribe-jats-export`.** Matches DESIGN.md's
   stated plan ("a fifth, `enscribe-jats-export`, is planned").
   Parallels `enscribe-interpreter`: depends on core + vocab + the
   structural-plugin output (which comes from the interpreter's
   mdast pipeline). Clean separation; the JATS export has its own
   dependencies (probably an XML serializer, possibly `mathml-tex`
   for math conversion, possibly a JATS validator for testing).
   **The matched precedent.**

**B. New module within `enscribe-interpreter`.** Lower friction
   (no new package boilerplate); but couples JATS export to the
   interpreter's runtime in a way the package separation explicitly
   avoids. Adds JATS-specific dependencies (XML serializer, etc.)
   to the interpreter's package — pollutes the HTML-rendering
   runtime with JATS concerns.

**C. New utility package alongside the interpreter** (e.g.
   `enscribe-export-helpers` shared by future render-mode lowering
   too). Premature: there's no second consumer yet. Per
   `enscribe-core`'s "wait for the second consumer before
   abstracting" rule, this isn't right today.

**D. Other.** Could be a sub-package or `enscribe-interpreter/jats/`
   subdirectory; same coupling concerns as B but more concealed.

### Recommendation

**Option A** — `enscribe-jats-export` as a new package — matches
the explicit DESIGN.md plan and the established outward-package
pattern. The JATS-specific dependencies (XML serializer, math
conversion, optional DTD validator) stay scoped to the new package.
The `enscribe-interpreter` runtime stays HTML-focused.

### Package-naming nuance

DESIGN.md L434 and the ROADMAP entry use slightly different naming:

- DESIGN.md L434: `rehype-enscribe-to-jats` (plugin name)
- DESIGN.md L440 / ROADMAP L319 / BACKLOG L527: `enscribe-jats-export` (package name)

These are consistent: the package is `enscribe-jats-export`; the
unified plugin it exports is `rehypeEnscribeToJats` (or the
`rehype-enscribe-to-jats` kebab-case form). Phase 5 picks the
camelCase JS function name + the kebab-case package name.

### Attribute-mapper question (the ROADMAP-specified Phase 0 item)

Per `notes/specs/enscribe-core.md` L100-117: the HTML attribute
mapper (`enscribe-interpreter/src/lib/build-properties.js`) and the
forthcoming JATS attribute mapper are stage-specific. The deferred
question is whether the *iteration shape* lifts to
`enscribe-core` as a `mapAttributes(node, vocab, emit)` callback
API.

**Decision for Phase 5:** lift the iteration shape to
`enscribe-core` when JATS export is built — JATS export IS the
second consumer the deferred question was waiting for. The lift
becomes a small `enscribe-core` API addition + a refactor of
`build-properties.js` to call into it + the JATS attribute mapper
calls the same API with its own emission callback. **Recommend
including this lift in slice 5a's package setup.**

## Q1.5 — intermediate representation question

### Current pipeline stage outputs

Per `notes/specs/pipeline.md`:

```
Stage 1: source → mdast            (remarkParse + remarkEnscribe)
Stage 2: recursive content parsing (remarkRecursiveContent)
Stage 3: mdast transforms          (normalize-to-canonical, config
                                    discovery, article/book structuring,
                                    section nesting, citation index,
                                    notes, numbering, apply numbers,
                                    ref/cite resolution, note placement,
                                    bibliography)
Stage 4: mdast → hast              (toHast with enscribeTag handler)
Stage 5: asset injection           (CSS/JS prepended to hast)
Stage 6: serialization             (rehypeFormat + toHtml)
```

### Which stage is the right input for JATS export?

**The post-stage-3 mdast tree** (after all mdast transforms but
before hast conversion).

At this point:
- Document structure is JATS-shaped: `<article>` /
  `<article-front>` / `<article-body>` / `<article-back>` (or
  `<book>` / `<book-front>` / etc.) — Phase 4's structural plugins
  produced exactly the JATS shape.
- Citations resolved to `__cite-marker` internal nodes carrying
  the resolved bibliography keys.
- Cross-references resolved to `__ref-marker` carrying the
  resolved labels (including the per-chapter prefix paths from
  slice 4a).
- Notes spliced into the tree as `__note-marker`s, with
  `__note-list` collections placed per scope.
- Bibliography rendered as a `<bibliography>` element with
  child entries.
- Numbering applied (every numbered node carries
  `node.computedNumber`).

The remaining post-stage-3 transformations are HTML-shape-specific:
- Stage 4 converts custom-element mdast enscribeTag nodes to
  hast elements with HTML tag names (via the
  `enscribeTagHandler` consulting vocab `html_output.element`).
- Stage 5 injects HTML/CSS assets.
- Stage 6 serializes to HTML.

**JATS export does the parallel work for the JATS target:**

- Stage 4' (JATS-shape): convert enscribeTag nodes to JATS-XML-
  shaped tree (likely xast — the XML AST cousin of hast).
- Stage 5' (JATS metadata padding): supply required-by-DTD
  metadata defaults (`<article-id>`, `dtd-version`, etc.) per the
  metadata-defaults policy noted in the BACKLOG detail.
- Stage 6': serialize xast → JATS XML string.

### Why post-stage-3, not earlier

- **Stage 1-2 (raw mdast / enscribeTag after parsing):** structure
  is the author's flat list; not yet JATS-shaped. JATS export would
  have to redo the structural work article-structuring already does.
  Wasteful.
- **Stage 3 (post-transforms):** ideal. Document is JATS-shaped;
  resolved references carry their text; numbering is in.
- **Stage 4 (post-hast-conversion):** has lost the per-element
  semantic distinctions — e.g. a numbered `<theorem>` becomes a
  `<theorem>` HTML custom element with `data-name="..."`; the JATS
  exporter would have to read the data-attrs back rather than the
  node's original kwargs. Reverse-engineering. Wrong direction.
- **Stage 5-6 (asset-injected hast, serialized HTML):** further
  removed from the source semantics.

### Implication for package separation

The JATS export package needs the post-stage-3 mdast tree as its
input. The interpreter's pipeline ends with HTML serialization;
the JATS export package taps in at the mdast-post-stage-3 point
via a parallel pipeline or by re-running the structural plugins
from a shared module.

**Cleanest approach:** the structural plugins themselves live in
`enscribe-interpreter` today, but Phase 5 can either:

- **(i)** Re-import them in `enscribe-jats-export` and run them on
  a parallel pipeline. The interpreter exports them already
  (`enscribe-interpreter/src/index.js` exports
  `enscribeConfigDiscovery`, `enscribeArticleStructuring`,
  `enscribeBookStructuring`, `enscribeSectionNesting`,
  `enscribeNotes`, `enscribeNumbering`, `enscribeRefResolution`,
  `enscribeCiteResolution`, `enscribeBibliography`,
  `enscribeNotePlacement`).
- **(ii)** Lift the structural plugins to `enscribe-core` so
  both packages can consume them. Bigger refactor; not needed
  unless render-mode lowering (Phase 8) ALSO wants them.

**Recommendation: option (i).** The interpreter's exports already
allow it. The lift to core (option ii) is a "lift when second
consumer arrives" decision — render-mode is a candidate, but it's
post-alpha; we can defer the lift until then. The current setup
keeps `enscribe-jats-export` depending on `enscribe-interpreter`
for its structural plugins, but its own code only emits JATS XML.

A reader might object that this couples jats-export to interpreter.
True, but the coupling is **structural-plugin code reuse**, not
HTML-rendering coupling — the JATS export never touches stages
4-6. Acceptable.

## Q1.6 — vocabulary mapping inventory

109 vocab entries total; 91 declare `jats_counterpart` explicitly.
The 18 that don't are structural wrappers (article-body, book-body,
etc.) and title elements — their JATS mappings are obvious by name
(article-body → JATS body, section-title → JATS title, etc.).

### Group A — Document containers (5 entries)

| Enscribe | JATS | Mapping shape |
|---|---|---|
| `<article>` | `<article>` | Direct rename; add `xml:lang` + `dtd-version` defaults |
| `<book>` | `<book>` (BITS) | Direct rename; add `dtd-version` default |
| `<book-part>` | `<book-part>` | Direct rename; `book-part-type` attribute preserved |
| `<frame>` | `<boxed-text>` | Rename per frame.md |
| `<aside>` | `<boxed-text>` *(verify)* | Recommend: `<boxed-text content-type="aside">` |

### Group B — Structural regions (8 entries)

| Enscribe | JATS | Mapping shape |
|---|---|---|
| `<article-front>` | `<front>` | Rename; not declared in vocab — obvious |
| `<article-body>` | `<body>` | Rename; not declared — obvious |
| `<article-back>` | `<back>` | Rename; not declared — obvious |
| `<book-front>` | `<book-front>` | Direct (BITS); not declared — obvious |
| `<book-body>` | `<book-body>` | Direct (BITS); not declared — obvious |
| `<book-back>` | `<book-back>` | Direct (BITS); not declared — obvious |
| `<front>` | `<front>` | Direct |
| `<back>` | `<back>` | Direct |

### Group C — Title elements (8 entries)

All eight (article/book/book-part/section/sub-section/sub-sub-section
title + subtitle) lack explicit `jats_counterpart` but have obvious
mappings:

| Enscribe | JATS |
|---|---|
| `<article-title>` | `<article-title>` inside `<title-group>` |
| `<article-subtitle>` | `<subtitle>` inside `<title-group>` |
| `<book-title>` | `<book-title>` inside `<book-meta>` |
| `<book-subtitle>` | `<subtitle>` inside `<book-meta>` |
| `<book-part-title>` | `<title>` inside `<book-part-meta>` (or `<book-part-title>` per BITS) |
| `<section-title>` etc. | `<title>` inside `<sec>` |

**Restructuring case (DESIGN.md L436):** article-title + article-
subtitle combine into JATS's `<title-group>` wrapper. Phase 5 must
synthesize the wrapper.

### Group D — Sections (3 entries)

| Enscribe | JATS |
|---|---|
| `<section>` | `<sec>` |
| `<sub-section>` | `<sec>` nested |
| `<sub-sub-section>` | `<sec>` nested deeper |

**The DESIGN.md L320-322 deferred decision:** Layer 1 has three
named section elements; JATS has one recursive `<sec>` with depth-
typed nesting. Phase 5 must decide whether to:

- **Option I:** Map each named enscribe section to `<sec>` (JATS
  inherits the depth from nesting). Cleanest; matches JATS's
  recursive model. Author's three-level cap is preserved as a JATS
  depth-three nesting.
- **Option II:** Map to depth-typed JATS `<sec sec-type="...">`
  with explicit type values. JATS allows this; some publishers
  use it.

**Recommend Option I.** Matches JATS conventions; the depth-typed
form is optional. The cap-at-three constraint is enscribe's, not
JATS's; the JATS output is just three-deep `<sec>` recursion.

### Group E — Metadata containers (3 entries + structured-element bits)

| Enscribe | JATS |
|---|---|
| `<meta>` (in article) | `<article-meta>` inside `<front>` |
| `<meta>` (in book) | `<book-meta>` inside `<book-front>` |
| `<meta>` (in book-part) | `<book-part-meta>` inside `<book-part>` |
| `<author>` | `<contrib contrib-type="author">` inside `<contrib-group>` |
| `<editor>` | `<contrib contrib-type="editor">` inside `<contrib-group>` |
| `<name>` | `<name>` (JATS name structure: `<surname>` + `<given-names>`) |
| `<affiliation>` | `<aff>` |
| `<orcid>` | `<contrib-id contrib-id-type="orcid">` |
| `<email>` | `<email>` |
| `<doi>` | `<article-id pub-id-type="doi">` |
| `<license>` | `<license>` inside `<permissions>` |
| `<lang>` | `xml:lang` ATTRIBUTE on `<article>` (not an element) |
| `<version>` | `<article-version>` |
| `<keywords>` | `<kwd-group>` of `<kwd>` |
| `<subject>` | `<subj-group>/<subject>` |
| `<publication-date>` | `<pub-date>` |
| `<abstract>` | `<abstract>` |

**Restructuring cases:**
- `<lang>` maps to an attribute, not an element. The export reads
  `<meta><lang>en</lang></meta>` and emits `xml:lang="en"` on
  `<article>`/`<book>`.
- `<name>` needs parsing to split into surname + given-names. JATS
  is strict about this; enscribe currently allows flat name text.
  Phase 5 needs a name-parsing heuristic (or accept the flat text
  in a JATS `<string-name>` element as a fallback).
- `<contrib-group>` wrapper needs synthesizing — enscribe has
  multiple `<author>` siblings; JATS wraps them.

### Group F — Frameables (8 entries — fig, table, csv, tsv, mermaid, abc, svg, frame)

| Enscribe | JATS |
|---|---|
| `<fig>` | `<fig>` |
| `<table>` | `<table-wrap>` containing `<table>` |
| `<csv>` | `<table-wrap>` containing `<table>` |
| `<tsv>` | `<table-wrap>` containing `<table>` |
| `<mermaid>` | `<fig>` containing `<graphic>` (source as alternative) |
| `<abc>` | `<fig>` containing `<graphic>` (source as alternative) |
| `<svg>` | `<fig>` containing `<graphic>` (inline SVG content) |
| `<frame>` | `<boxed-text>` |

**Restructuring cases:**
- `<table>` (enscribe) is an HTML `<table>` element. JATS wraps
  the data table in `<table-wrap>` (which carries id, label,
  caption) containing the HTML-shaped `<table>`. So enscribe's
  `<table id=...>` exports as `<table-wrap id=...>` + inner
  `<table>`. The caption (slice 3c child-tag form) lifts into
  `<table-wrap>`'s `<caption>`.
- `<mermaid>` / `<abc>` are external-DSL elements with opaque source.
  JATS export options: (a) emit `<fig>` with `<graphic>` referencing
  a pre-rendered image file; (b) emit `<fig>` with `<alternatives>`
  containing both `<graphic>` (for human readers) and the source as
  `<preformat>` (for machine processing). **Phase 5 design call;
  recommend (b)** to preserve the source.
- `<svg>` has inline SVG source. JATS accepts inline SVG inside
  `<graphic>` or via separate file reference. Recommend inline for
  fidelity.
- `<frame>` maps to `<boxed-text>` (JATS's generic boxed content).
  Caption / title lift naturally.

### Group G — Inline elements (~25 entries)

Most have direct JATS counterparts:

| Enscribe | JATS |
|---|---|
| `<i>` / `<em>` | `<italic>` |
| `<b>` / `<strong>` | `<bold>` |
| `<u>` | `<underline>` |
| `<s>` / `<del>` | `<strike>` |
| `<sub>` | `<sub>` |
| `<sup>` | `<sup>` |
| `<a>` | `<ext-link>` (for URLs) or `<xref>` (for refs) |
| `<inline-code>` / `<code>` | `<monospace>` or `<code>` |
| `<inline-math>` | `<inline-formula>` containing `<tex-math>` |
| `<abbr>` | `<abbrev>` |
| `<term>` | `<named-content content-type="term">` |
| `<kbd>` | `<monospace>` (or `<named-content content-type="kbd">`) |
| `<var>` | `<named-content content-type="var">` |
| `<samp>` | `<named-content content-type="samp">` |
| `<output>` | `<named-content content-type="output">` |
| `<br>` | `<break>` |
| `<img>` | `<inline-graphic>` |

**Most are direct renames.** A handful (`<kbd>`, `<var>`,
`<samp>`, `<output>`) have no native JATS equivalent — JATS uses
`<named-content content-type="...">` as the catch-all for inline-
semantic distinctions. The vocab entries already record this per
deferred-vocab sub-slice 1 (per `notes/specs/...` and the related
entries).

### Group H — Block-level (theorem family, blockquote, lists, code-block)

| Enscribe | JATS |
|---|---|
| `<theorem>` / `<lemma>` / `<corollary>` / `<proposition>` | `<statement content-type="theorem">` (etc., per type) |
| `<definition>` | `<statement content-type="definition">` |
| `<example>` | `<statement content-type="example">` |
| `<remark>` | `<statement content-type="remark">` |
| `<proof>` | `<statement content-type="proof">` |
| `<blockquote>` | `<disp-quote>` (or `<epigraph>` per type) |
| `<aside>` | `<boxed-text content-type="aside">` |
| `<ul>` | `<list list-type="bullet">` |
| `<ol>` | `<list list-type="order">` |
| `<li>` | `<list-item>` |
| `<dl>` | `<def-list>` |
| `<dt>` | `<term>` inside `<def-item>` |
| `<dd>` | `<def>` inside `<def-item>` |
| `<details>` / `<summary>` | No direct JATS counterpart; recommend `<boxed-text>` + `<caption>` |
| `<p>` | `<p>` |
| `<hr>` | (No JATS element; suppress or `<break>`) |
| `<code-block>` | `<preformat>` or `<code>` |
| `<glossary>` | `<glossary>` |
| `<glossary-entry>` | `<def-list>` entry |
| `<bibliography>` | `<ref-list>` |
| `<bib-entry>` | `<ref>` |

**Restructuring cases:**
- Theorem family — all eight elements use `<statement>` with
  `content-type` discriminating. The `<label>` is the rendered
  "Theorem 1." prefix.
- `<dt>` and `<dd>` — JATS wraps each pair in `<def-item>`. The
  exporter pairs consecutive `<dt>` + `<dd>` into `<def-item>`s.

### Group I — Math (6 entries)

Already covered above plus envs:

| Enscribe | JATS |
|---|---|
| `<inline-math>` | `<inline-formula>` → `<tex-math>` |
| `<display-math>` | `<disp-formula>` → `<tex-math>` |
| `<math>` (long form) | `<disp-formula>` → `<tex-math>` |
| `<matrix>` / `<cases>` / `<align>` / `<eqnarray>` | `<disp-formula>` → `<tex-math>` wrapping `\begin{<env>}…\end{<env>}` |

The vocab entries explicitly call out the `<tex-math>` primary +
optional `<mml:math>` MathML alternative.

**Math approach for Phase 5:**
- **Primary:** emit `<tex-math>` with the raw LaTeX source — same
  source the math handler passed to KaTeX. The source is preserved
  in the post-stage-3 mdast as `node.content` (opaque string).
- **Optional MathML:** convert the LaTeX to MathML via a
  conversion library (e.g. `mathjax-full` or `temml`). Allows
  JATS consumers without TeX rendering to display the math.
  Recommend as a follow-up; Phase 5's first slice can ship
  `<tex-math>` only.

### Group J — Internal / metadata-only

| Enscribe | JATS |
|---|---|
| `<config>` | (Not exported; processing options stay client-side) |
| `<data>` | (Not exported; source bibliography stays client-side) |
| `<library>` | (Not exported; consumed during cite resolution; bibliography goes to `<ref-list>`) |
| `<note>` | `<fn>` inside `<fn-group>` |
| `<note-list>` | `<fn-group>` |
| `<ref>` | `<xref ref-type="...">` |
| `<cite>` | `<xref ref-type="bibr">` |

### Inventory total

- 109 entries / ~91 with explicit `jats_counterpart` + 18 obvious-
  by-name.
- All have at least a candidate JATS mapping.
- **5 entries flagged as needing design calls in Phase 5
  implementation:** `<lang>` (attribute not element); `<name>`
  (requires parsing to surname + given-names); `<mermaid>`/`<abc>`
  (alternatives shape); `<svg>` (inline vs. file ref);
  `<details>`/`<summary>` (no direct counterpart).

## Q1.7 — features the export must handle correctly

### Numbering and cross-references

- Enscribe: `node.computedNumber` set per the slice 3a/4a
  numbering machinery. Cross-references render as text strings
  ("Figure 1.3", "Theorem 2") via `ref-resolution.js`.
- JATS: numbered floats carry `<label>` containing the number; cross-
  references use `<xref ref-type="..." rid="..."/>` with the
  rendered text as the xref's content.
- **Required Phase 5 work:** emit `<label>N</label>` (or
  "Chapter.N") inside each numbered `<fig>`/`<table-wrap>`/
  `<disp-formula>`/`<statement>`. Emit `<xref>` for `__ref-marker`
  internal nodes carrying the rendered text and target id. The
  per-chapter prefix paths from slice 4a (`scope.chapter > 0` →
  "Figure 1.3" text) carry through to the `<xref>` content
  naturally.

### Footnotes

- Enscribe: per-section (article default) or per-chapter (book
  default) `__note-list` injection per slice 4a. Renders as
  `<note-list>` containing `<note-list-item>`s.
- JATS: footnotes live in `<fn-group>` containing `<fn>`s. JATS
  permits `<fn-group>` at multiple positions: inside a `<sec>` (per-
  section footnotes), inside `<back>` (document-level), or inside
  `<book-part>` (per-chapter). Enscribe's existing collection
  scopes map 1:1.
- **Required Phase 5 work:** map `__note-list` → `<fn-group>`;
  `__note-list-item` → `<fn id="..."><label>N</label><p>…</p></fn>`.
  Note markers in body text become `<xref ref-type="fn" rid="..."/>`.

### Bibliography

- Enscribe: `<library>` parses `.bib` (or YAML/JSON) at build
  time; cite-resolution emits `__cite-marker`s; `<bibliography>` is
  rendered with the formatted-citation entries via citation-js.
- JATS: `<ref-list>` containing `<ref id="..."><element-citation>…
  </element-citation></ref>` per entry. The citation data is
  structured (`<person-group>`, `<article-title>`, `<source>`,
  `<year>`, etc.) — significantly more structured than the
  formatted-string-only output enscribe renders today.
- **Required Phase 5 work:** read the citation-js source data
  (which has structured fields per entry) and emit
  `<element-citation>` shapes. This is the JATS export's biggest
  net-new work — the HTML rendering uses formatted strings (per
  CSL style); JATS export needs structured data.
- **Recommend:** slice 5d (bibliography) does this; the first
  slice (5b body) can emit `<ref>` with `<mixed-citation>` (the
  formatted string) as a stopgap.

### Math

- Already covered in Q1.6 Group I. Recommendation: ship `<tex-math>`
  primary; MathML conversion as follow-up.

### Frameables

- Covered in Q1.6 Group F. The slice 3c caption-as-content child-
  tag form lifts naturally into JATS `<caption>` inside `<fig>`/
  `<table-wrap>`.

### External DSLs (mermaid, abc, svg)

- JATS approach (Q1.6 Group F): `<fig><graphic>` for rendered image;
  optionally `<alternatives>` containing source + rendered.
- **Open design call**: whether the JATS export should render the
  source (Mermaid/ABC source → SVG) at export time, or reference
  external pre-rendered images. Recommend deferring rendering;
  emit `<alternatives>` with the source preserved as
  `<preformat>` and a placeholder `<graphic>` element. Authors who
  want pre-rendered output use a build step that pre-renders the
  source files.

### Theorem family

- Covered in Q1.6 Group H. JATS uses `<statement content-type="...">`;
  the vocab entries explicitly record this mapping. Phase 5's
  theorem export is mechanical.

## Q1.8 — testing strategy

### Validation library options

- **`validate-with-xmllint`** — zero-deps wrapper around xmllint.
  Requires xmllint on the system path. Best for CI integration on
  Linux/Mac.
- **`libxml-xsd`** — native libxml binding; XSD validation. Native
  build; some installation friction.
- **`w3c-xml-validator`** — uses the W3C online validator. Network
  dependency; not suitable for offline CI.
- **JATS4R validator** — JATS-specific; supports JATS 1.0/1.1/1.2.
  Hosted UI; programmatic API less clear. Their reference repo:
  https://github.com/JATS4R/validator.
- **elifesciences/dtd-validator** — accepts XML, returns JSON
  validation results; JATS DTDs included.

### Recommendation

**Use `validate-with-xmllint` for CI validation.** Most pragmatic:
xmllint is available everywhere (apt, brew, choco); the wrapper is
zero-deps; the validation is fast (native libxml under the hood).
Bundle the JATS Archiving 1.3 + BITS 2.0 DTDs in the package
(small, static files).

### Test fixture pattern

The existing fixtures (`packages/enscribe-interpreter/test/
fixtures/document-N-*.emd`) each have a `.html` (current rendered)
and a `.json` (snapshot). Phase 5 adds a parallel `.jats.xml` (or
`.xml`) per fixture exercising JATS-export-relevant features.

**Snapshot the JATS XML output** the same way HTML output is
snapshotted: render JATS, compare against committed snapshot,
update with env var.

**Validate the JATS XML against the DTD** as a separate check —
parses the snapshot's content against the JATS Archiving 1.3 DTD
and fails the test if validation fails. This catches "snapshot
matches but content is invalid" cases (e.g. missing required
attributes).

### Which fixtures get JATS snapshots

**Curated subset, not every fixture.** The fixtures exist to
exercise specific features; the JATS test fixtures should mirror
this:

- doc-1, doc-2 — minimal + realistic article structure.
- doc-5 (linear regression) — math + figures + cross-references +
  citations.
- doc-7 (tables) — multiple table formats; JATS `<table-wrap>` /
  `<table>` exercise.
- doc-8 (citations) — bibliography export; `<ref-list>` +
  `<element-citation>` (or `<mixed-citation>` for the stopgap).
- doc-29 (theorem family) — JATS `<statement content-type="...">`.
- doc-38 (book) — BITS book/book-part structure.
- doc-9 (alpha-complete) — full pipeline JATS export; the
  acceptance fixture for Phase 6's five-point verification.

**A new JATS-specific fixture** may be useful for exercising the
JATS-only restructuring cases (e.g. `<title-group>` wrapping,
`<contrib-group>` wrapping). Likely doc-39 or similar.

## Bundle vs split recommendation

**Recommendation: SPLIT into four sub-slices.**

Order: **5a → 5b → 5c → 5d.**

- **Slice 5a — Package + scaffolding + minimal article export.**
  Create `packages/enscribe-jats-export/` per Q1.4 Option A.
  Wire package.json, exports, deps. Set up the JATS attribute
  mapper following the same iteration shape as
  `build-properties.js` (lift the iteration to `enscribe-core`
  per Q1.4 — JATS export IS the second consumer the deferred
  question was waiting for). Implement the article-shape JATS
  export for the simplest fixtures (doc-1, doc-2 — basic article
  with `<meta>`, sections, paragraphs, inline formatting). Validator
  setup with `validate-with-xmllint` + bundled JATS 1.3 DTDs.
  Snapshot-and-validate test pattern established. **Medium slice;
  the foundation Phase 5 builds on.**

- **Slice 5b — Body content: frameables, lists, math.** Add JATS
  export for the body-content elements that don't have heavy
  restructuring: `<fig>`/`<svg>`/`<frame>` (frameable simple
  cases); `<table>`/`<csv>`/`<tsv>` (with `<table-wrap>` wrapping);
  math (`<tex-math>` primary, MathML deferred); lists; blockquote;
  inline formatting. Theorem family (mechanical `<statement
  content-type="...">`). New fixture (doc-39?) exercising body
  content variety. **Medium slice.**

- **Slice 5c — Cross-references, footnotes, BITS book structure.**
  `__ref-marker` → `<xref ref-type="..." rid="..."/>`;
  `__note-list` → `<fn-group>` with proper placement scope;
  `__cite-marker` → `<xref ref-type="bibr" rid="..."/>`. BITS book
  export (book/book-part wrapping; book-meta synthesis; per-chapter
  fn-group placement matching slice 4a's note-scope choices). New
  fixture doc-40 (or repurpose doc-38) for the BITS book exercise.
  **Medium slice.**

- **Slice 5d — Bibliography + external DSLs.** Bibliography is the
  net-new work (Q1.7) — read citation-js source data, emit
  `<element-citation>` shapes. External DSLs
  (`<mermaid>`/`<abc>`/`<svg>`) use `<fig><alternatives>` with
  source preserved. doc-8 fixture gets its JATS snapshot. **Medium
  slice.**

Phase 5 closes when all four sub-slices land. After Phase 5 closes,
Phase 6 (alpha integration check) can run — its five-point
verification fixture exercises end-to-end JATS export per the
acceptance criteria.

**Alternative — BUNDLE:** doable but Phase 5 is large enough that
a single slice would be hard to scope. Four sub-slices each test
a coherent surface (article scaffolding / body / cross-refs+notes+
book / bibliography+DSLs) and each lands an independently-useful
piece. The package-setup work (5a) is the biggest gate; 5b/5c/5d
each touch independent feature surfaces with less risk of
interfering with each other.

### Optional follow-up slices (post-Phase-5 if asked)

- **5e — MathML alternative emission.** Convert LaTeX → MathML via
  `mathjax-full` or `temml`; emit `<alternatives>` containing both
  `<tex-math>` and `<mml:math>`. Conditional; only needed if
  reviewers want it.
- **5f — JATS 1.4 / BITS 2.2 upgrade.** Current standard. Defer
  unless asked.

## What is recorded vs. what is open

Recorded:
- Q1.1 — Phase 5 + Phase 6 entries (verbatim with line numbers);
  Phase 5's DESIGN.md framing
- Q1.2 — no scaffolding exists; 91 vocab entries with
  `jats_counterpart`; greenfield in established codebase
- Q1.3 — JATS 1.3 + BITS 2.0 + Archiving and Interchange Tag Set
  recommended; DTD constraints surveyed; no fundamental conflicts
- Q1.4 — package boundary Option A
  (`packages/enscribe-jats-export/`) recommended; attribute-
  mapper lift to `enscribe-core` recommended in slice 5a
- Q1.5 — post-stage-3 mdast tree is the right input; structural
  plugins re-imported from `enscribe-interpreter` (defer the lift
  to core until render-mode is the second consumer)
- Q1.6 — vocabulary mapping inventory grouped by JATS section
  (A–J: containers, regions, titles, sections, metadata,
  frameables, inline, block, math, internal)
- Q1.7 — features inventory (numbering, footnotes, bibliography,
  math, frameables, DSLs, theorems) with mapping intent
- Q1.8 — testing strategy: `validate-with-xmllint` + snapshot
  pattern; curated subset of fixtures get JATS snapshots

Open (decisions deferred to implementation slices or chat):
- The JATS version final-call: 1.3 + BITS 2.0 (recommended) vs.
  1.4 + BITS 2.2 (current). Defer; can revisit.
- MathML alternative emission (slice 5e, conditional).
- Whether the structural-plugin re-import in 5a (Q1.5 option (i))
  is the long-term shape or whether the lift to `enscribe-core`
  (Q1.5 option (ii)) happens with render-mode (Phase 8). Recorded;
  decided when Phase 8 starts.
- The five design-call vocab entries (`<lang>` attr lift,
  `<name>` parsing, mermaid/abc alternatives, svg inline-vs-ref,
  details/summary fallback) — settled by the implementation slice
  that touches each.
- The `<element-citation>` vs. `<mixed-citation>` decision for
  bibliography — recommended `<element-citation>` (structured) but
  the stopgap (`<mixed-citation>` with formatted string) is a
  valid shortcut for the first slice if structured data isn't
  available without citation-js API changes.

Sources consulted:
- [JATS Archiving and Interchange Tag Set 1.3](https://jats.nlm.nih.gov/archiving/1.3/)
- [BITS 2.0](https://jats.nlm.nih.gov/extensions/bits/2.0/)
- [validate-with-xmllint (npm)](https://www.npmjs.com/package/validate-with-xmllint)
- [JATS4R validator](https://github.com/JATS4R/validator)
- [elifesciences/dtd-validator](https://github.com/elifesciences/dtd-validator)
