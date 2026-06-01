# Phase 13 Phase 0 — JATS import findings

Read-only investigation scoping JATS XML → Enscribe import, the reverse of
Phase 5's lossless export. No code changes. Ends with a recommended scope and
slicing. The implementation slices are written from this document.

## Framing (and the one thing to internalize first)

The v0.1.0 goal is narrow and concrete: **import a real, published JATS article
(from PubMed Central) and render it through Enscribe's pipeline to HTML**, then
put it on the docs site as "here is a published paper rendered by Enscribe."
Import is **deliberately lossy** (JATS's vocabulary is far larger than Layer 1's),
**Node-side** (the browser library carries no JATS capability), and produces a
**rendered-HTML** result for v0.1.0 — not editable `.emd` source (that lowering is
Phase 7).

**The load-bearing realization: import is NOT "run the export backwards."** The
export (`packages/enscribe-jats-export/src/index.js`, 1631 lines) is a pure
**string emitter** — it walks an Enscribe mdast tree and concatenates JATS XML
text. It contains *no XML parser* (the repo has none at all). Import is therefore a
genuinely new capability with three parts the export does not provide:

1. **An XML parser** (a new dependency — see Q6/Q7).
2. **A tree transform** JATS-XML-tree → Enscribe-mdast (the reverse of the
   emitter's element dispatch).
3. **A lossy-reduction policy** for the long tail of JATS elements the export
   never emits but real PMC articles are full of (Q2).

What import *does* inherit from the export is the **mapping tables** (which JATS
element corresponds to which Enscribe element; the citation-field correspondences).
Those are reusable; the machinery is not.

There are effectively **two import regimes**, and they have very different
difficulty:

- **Enscribe-exported JATS** (the export fixtures; the round-trip case). Uses only
  the ~25 JATS elements the export emits, with `<tex-math>` for math. The reverse
  mapping is near-mechanical and high-fidelity. This is the correctness backbone
  (round-trip test, Q5/Q8).
- **Real PubMed Central JATS.** The core (sections, paragraphs, inline formatting,
  math, citations, figures, tables, footnotes, cross-refs) maps cleanly, but a
  *long tail* of front-matter and apparatus elements (journal-meta, funding,
  keywords, permissions, structured abstracts, multiple pub-dates, MathML, link
  variants, …) has no Layer 1 equivalent and runs through the reduction policy. The
  reduction policy — not the core mapping — is where most of the real work and all
  of the judgement live.

This is the honest scope: a high-fidelity reverse of the export, plus a
graceful-degradation layer that is the bulk of "import a real article."

## Q1 — The element mapping (JATS → Enscribe)

Reversed from the export's emitter and verified against it. The "Enscribe element"
column is the Layer 1 / mdast `enscribeTag` the import should produce.

| JATS element (the export emits) | Enscribe element | Notes |
|---|---|---|
| `<article article-type=…>` | `<meta type=article>` + `<article>` | type from `article-type` |
| `<book>` + BITS wrappers | `<meta type=book>` + `<book>` | BITS 2.0 on the export side |
| `<front>` / `<article-meta>` | front matter (meta) | title/authors/date/abstract |
| `<title-group><article-title>` | `<title>` | `<subtitle>` → `<subtitle>` |
| `<contrib-group><contrib><string-name>` | `<author>` | structured names → name parts |
| `<abstract>` | `<abstract>` | Enscribe has an abstract element |
| `<body>` | document body | |
| `<back>` | `<bibliography>` + `<fn-group>` | ref-list + footnotes |
| `<sec>` (nested) | `<section>`/`<sub-section>`/`<sub-sub-section>` | JATS recurses `<sec>`; Enscribe uses named depth — map by nesting depth (depth 4+ has no Layer 1 home → reduce) |
| `<title>` (in sec) | `<section-title>` (by depth) | |
| `<p>` | paragraph | |
| `<bold>` | `<b>` | INLINE_MAP reverse |
| `<italic>` | `<i>` | |
| `<underline>` | `<u>` | |
| `<strike>` | `<s>` | |
| `<monospace>` | `<code>` (inline) | |
| `<sup>` / `<sub>` | `<sup>` / `<sub>` | |
| `<ext-link xlink:href=…>` | `<a href=…>` | |
| `<inline-formula><tex-math>` | `<inline-math>` | **TeX read directly from CDATA** |
| `<disp-formula><tex-math>` | `<display-math>` | id ← `<disp-formula id>` |
| `<inline-formula><mml:math>` | `<inline-math>` | **MathML → LaTeX (Q3)** |
| `<fig><graphic xlink:href=…>` | `<fig src=…>` | caption ← `<caption><p>`; id ← `<fig id>` |
| `<table-wrap><table>` | `<table>` | HTML table → Enscribe table; caption/label |
| `<list list-type=bullet|order>` | `<ul>` / `<ol>` | `<list-item><p>` → `<li>` |
| `<def-list><def-item><term>/<def>` | `<dl>`/`<dt>`/`<dd>` | |
| `<disp-quote>` | `<blockquote>` | |
| `<statement content-type=…>` | theorem family | `content-type` selects theorem/lemma/…/proof |
| `<fn-group><fn id>` | `<note>` (collected) | body of the footnote |
| `<xref ref-type="fn" rid>` | inline note marker | reconnect marker ↔ `<fn>` |
| `<xref ref-type="bibr" rid="ref-KEY">` | `<cite @KEY>` | |
| `<xref ref-type="fig|table|…" rid>` | `<ref @id>` | ref-type → typed-id prefix |
| `<ref-list><ref><element-citation>` | `<library>` entries | structured → BibTeX/CSL (Q4) |
| `<preformat content-type="…-source">` | DSL block (`<mermaid>`/`<abc>`) | export marks DSLs as `<preformat>` with a `specific-use="enscribe-dsl-*"` marker |
| `<label>` | (drop) | numbering is recomputed by Enscribe, not imported |

**Export elements with a clean reverse:** all of the above. **Elements the export
emits that need care on reverse:** `<sec>` depth >3 (no Layer 1 element — reduce to
`<h4>`+ or flatten), `<label>` (drop — Enscribe renumbers), and the DSL `<preformat>`
(only reversible to a live DSL when the `enscribe-dsl-*` marker is present;
otherwise it is a generic preformatted block).

## Q2 — JATS elements Enscribe can't represent (the reduction policy)

Real PMC articles carry many elements with no Layer 1 equivalent. Each gets one of
four dispositions. This table is a **design decision the implementation slices
follow**; "deliberately lossy" means *graceful*, never *silent*.

Dispositions: **A** map to an Enscribe element · **B** preserve as an HTML comment ·
**C** drop (renderer-irrelevant metadata) · **D** preserve as a marked raw-XML block.

| JATS element / group | Disposition | Rationale |
|---|---|---|
| `<sup>` `<sub>` `<ext-link>` `<uri>` | **A** → `<sup>`/`<sub>`/`<a>` | direct equivalents exist |
| `<email>` | **A** → `<a href="mailto:…">` | |
| `<inline-graphic>` | **A** → inline `<fig>`/`<img>` | |
| `<disp-quote>` `<list>` `<def-list>` | **A** → blockquote / lists | already in Q1 |
| `<abstract>` (incl. structured, with `<sec>`) | **A** → `<abstract>` | flatten structured-abstract sec/title into the abstract body |
| `<ack>` (acknowledgments) | **A** → `<section>` "Acknowledgments" | it is prose; a section is the honest home |
| `<app>` / `<app-group>` (appendices) | **A** → `<appendix>` (book) or `<section>` | |
| `<glossary>` | **A** → `<dl>`/`<glossary>` | Enscribe has a glossary element |
| `<contrib>` affiliation / `<aff>` / ORCID / role | **A (partial)** → `<author>` kwargs (`affiliation`, `orcid`); role → drop | author element has these kwargs; roles have no slot |
| `<kwd-group>` (keywords) | **B** comment | worth keeping, no structural home |
| `<funding-group>` / `<award-group>` | **B** comment | provenance worth preserving as a note |
| `<permissions>` / `<license>` | **B** comment | license text matters; preserve verbatim as a comment |
| `<journal-meta>` (journal, ISSN, publisher) | **C** drop | belongs to the deposit, not the rendered doc |
| `<article-id>` (pmid, pmc, doi) | **B** comment | useful provenance; one comment line |
| multiple `<pub-date>` variants | **A (one)** → `<date>` (pick published/epub) + **C** others | Enscribe has one date |
| `<history>` (received/accepted dates) | **C** drop | editorial metadata |
| `<supplementary-material>` | **D** raw block | content the reader may want to recover |
| `<media>` (video/audio) | **D** raw block | no Layer 1 media element |
| `<boxed-text>` | **A** → `<frame>` | the generic frameable callout fits |
| `<chem-struct>` / `<inline-formula>` non-math | **D** raw block | chemistry markup is out of scope |
| anything unrecognized | **D** raw block + console warning | the catch-all — never drop silently |

**The reduction policy is the import's center of gravity.** It should be one
dispatcher (`unknownElement(node) → disposition`) driven by a table like this, so
adding a disposition is a data change, not new control flow — mirroring how the
export's `INLINE_MAP` / registry tables work.

## Q3 — MathML → LaTeX

**The problem is much smaller than it looks, because of how math actually appears
in JATS.** A `<inline-formula>`/`<disp-formula>` can carry its math as `<tex-math>`
(LaTeX, verbatim), as `<mml:math>` (presentation MathML), or as **both** (one a
fallback alternative for the other). Findings:

- **Enscribe's own export emits `<tex-math>` exclusively** — verified: all 12 math
  instances across the six export fixtures are `<tex-math><![CDATA[…]]></tex-math>`,
  zero MathML. So the **round-trip case needs no MathML handling at all** — read the
  CDATA, done.
- **Many real publishers also include a `<tex-math>` alternative** alongside MathML
  (common in PMC). When present, import prefers `<tex-math>` — trivial and exact.
- The **residual case** is real-PMC formulas that carry **MathML only**. For these,
  a converter is needed. `mathml-to-latex` (npm, MIT, v1.5.0, ~74k downloads,
  actively published) converts **presentation** MathML → LaTeX, which is exactly the
  flavor JATS uses (presentation MathML maps to LaTeX's visual-layout model). The
  XSLT route (`transpect/mml2tex`) is the mature alternative but needs an XSLT
  processor. A from-scratch converter is **not** required, so the discipline's
  "no workable library" stop-condition does not trigger.

**Recommended math policy (in priority order):** (1) if `<tex-math>` present, use it;
(2) else if `<mml:math>` present, convert with `mathml-to-latex`; (3) on conversion
failure, preserve the MathML as a **D** raw block and warn. Math is the import's
single largest *fidelity* risk, but it is bounded and degrades gracefully.

## Q4 — Structured citations (JATS → Enscribe library)

This reverses the export's `emitRefJats` (`<element-citation>` field emitter). The
field correspondences are clean and well-understood (CSL-JSON ↔ JATS, both
structured). Import reads `<element-citation>` → builds a CSL-JSON entry (or BibTeX)
→ Enscribe `<library>`.

| JATS (`<element-citation>`) | CSL-JSON / BibTeX |
|---|---|
| `<person-group person-group-type="author"><name>/<string-name>` | `author` |
| `<person-group person-group-type="editor">` | `editor` |
| `<article-title>` | `title` |
| `<chapter-title>` | `title` (type=chapter) |
| `<source>` | `container-title` (journal) / `title` for books |
| `<year>`/`<month>`/`<day>` | `issued.date-parts` |
| `<volume>` / `<issue>` | `volume` / `issue` |
| `<fpage>`/`<lpage>` | `page` ("fpage-lpage") |
| `<pub-id pub-id-type="doi">` | `DOI` |
| `<publisher-name>`/`<publisher-loc>` | `publisher` / `publisher-place` |
| `<ext-link ext-link-type="uri">` | `URL` |
| `publication-type` attr | CSL `type` (reverse of `CSL_TYPE_TO_JATS_PUB_TYPE`) |

**Edge cases:** (1) the cite **key** — the export uses `id="ref-KEY"`; import strips
the `ref-` prefix to recover the key (real PMC `<ref>` ids are arbitrary, so the
import must mint stable keys, e.g. from first-author-year, when the id is opaque).
(2) JATS allows **`<mixed-citation>`** (free-text references) instead of
`<element-citation>` — common in older PMC articles; these have no structured fields
and must be imported as a single unparsed reference string (disposition **D**/**B**
within the library, or a `note`-style entry). (3) `<name><surname>/<given-names>`
(real PMC) vs the export's `<string-name>` — import must handle both name shapes.
Producing CSL-JSON directly (the interpreter's internal citation form) is cleaner
than synthesizing BibTeX text and re-parsing it.

## Q5 — Real PubMed Central test data

Two complementary sources:

- **The export's own fixtures** (`enscribe-jats-export/test/fixtures/*.xml`, six
  documents). These are known-good Enscribe-shaped JATS and are the **round-trip
  correctness backbone**: import each, re-export, and compare to the original XML
  (modulo normalization). High-signal, zero licensing concern, available today.
- **PMC Open Access Subset** for the real-article demonstration. PMC provides
  full-text JATS XML (NISO Z39.96) via the OA Web Service API, FTP, and OAI-PMH.
  **Licenses are per-article** and machine-encoded; filter for **CC-BY or CC0** so
  the fixture and the rendered page are redistributable. Check each article's
  `<license>` before vendoring it.

**Recommended demonstration articles (acquire during the demo slice, Q8 step 6):**
1. a **short** CC-BY research article (~3–6 pp.) with sections, a figure, inline +
   display math, and a handful of citations — exercises the core mapping;
2. a **citation-heavy** CC-BY article (structured `<element-citation>`s, several
   `<xref ref-type="bibr">`) — exercises Q4 and cross-references;
3. (optional) an article whose math is **MathML-only** — exercises the Q3 fallback.

Pick the actual articles at implementation time (license + content must be verified
by hand); do not over-commit here. One well-chosen short CC-BY article is enough for
the docs-site demonstration.

## Q6 — Output shape

For v0.1.0 the import produces an **Enscribe-internal mdast tree** that the existing
rendering pipeline turns into HTML. Proposed API:

```
importJats(jatsXml: string, options?) → mdast tree (Root with enscribeTag nodes)
```

The consumer feeds that tree to the existing interpreter pipeline
(`buildEnscribePipeline` / `enscribeInterpreter`) to get HTML — exactly as the
`.emd` parse path does, just entering after the parse stage.

**Where it slots in.** The `.emd` pipeline is: micromark+Peggy parse → mdast with
`enscribeTag` nodes → normalize-to-canonical gate → structuring/numbering/handlers →
HTML. The import should produce the mdast tree **at the same shape the parser
produces** (or the post-gate canonical tree), so it re-uses everything downstream
(numbering, cross-reference resolution, the handlers, the HTML emit). That re-use is
the whole point — the import owns only "JATS XML → canonical mdast," not rendering.
Recommendation: a **standalone converter** (not a remark/micromark extension —
micromark tokenizes line-oriented text, not XML trees) that emits the canonical
mdast, plus a thin convenience that runs it through `buildEnscribePipeline`.

**The round-trip test is the strongest correctness signal:** for Enscribe-exported
JATS, `import → re-export ≈ original XML`. Build it as a first-class test harness
(Q8 step 7), seeded by the export fixtures.

## Q7 — Package structure

Two options:

- **A. New package `@enscribejs/jats-import`**, parallel to the published
  `@enscribejs/jats-export`. Independent versioning; clean separation; matches the
  one-package-per-direction precedent the export set.
- **B. Rename `@enscribejs/jats-export` → `@enscribejs/jats`** holding both
  directions. Cohesive; shared tables are internal. But it **renames a package
  already coordinated at 0.1.0 in the org-split**, orphaning the published name and
  breaking consumer imports.

**Recommendation: A.** Lower-risk, and it keeps the export package stable. Handle the
**shared bidirectional mapping tables** (the inline element map, the CSL↔JATS
`publication-type` map, the citation-field correspondences) by extracting them into a
small shared module that both packages import — either a new internal
`@enscribejs/jats-shared` or (lighter) `@enscribejs/jats-import` depending on
`@enscribejs/jats-export` for the re-exported constants. Do not duplicate the tables;
a divergence between the export and import maps is exactly the bug that breaks
round-trips. The shared-table extraction is small and can be its own opening step of
slice 1.

## Q8 — Slicing recommendation

Phase 13 is substantial; slice it simple-to-complex, each slice independently
testable, with the strongest demonstration (real article) landing only after element
coverage is broad enough to carry it.

1. **Foundation.** Add the XML parser dependency; extract the shared mapping tables
   (Q7); build the converter skeleton + the **reduction-policy dispatcher** (Q2);
   map the structural + inline core (article/book front/body/back → meta/sections/
   paragraphs; the INLINE_MAP reverse; `<ext-link>`/`<sup>`/`<sub>`). Test against
   the simplest export fixture, both regimes. *This slice is the load-bearing one —
   it establishes the parse→mdast machinery and the lossy-reduction policy the rest
   hang off.*
2. **Citations and bibliography** (Q4): `<element-citation>` → library; `<xref
   ref-type="bibr">` → `<cite>`; `<mixed-citation>` fallback.
3. **Math** (Q3): `<tex-math>` direct (trivial); `<mml:math>` → `mathml-to-latex`;
   raw-block fallback.
4. **Figures, tables, cross-references**: `<fig>`/`<graphic>`, `<table-wrap>`,
   `<xref>` (non-bibr) → `<ref>`, footnotes (`<fn-group>` + `<xref ref-type="fn">`).
5. **Specialized + apparatus**: `<statement>` → theorem family; DSL `<preformat>`
   markers; lists/def-lists; structured `<abstract>`, `<ack>`, `<app>`; and the bulk
   of the Q2 reduction table.
6. **Real-article import**: import a chosen CC-BY PMC article end-to-end, render it,
   add it to the docs site; update `jats.emd`'s round-trip section ("export works;
   import is coming" → "both directions ship").
7. **Round-trip test harness**: export → import → re-export, compared against the
   export fixtures; wire into CI.

A natural split if the phase needs sub-slices: **13a** = steps 1–2 (skeleton +
citations), **13b** = steps 3–5 (math, frameables, specialized), **13c** = steps 6–7
(real article + round-trip).

## Recommended scope (verdict)

- **Proceed.** JATS import is tractable and high-value. Neither discipline
  stop-condition fires: the MathML problem has a workable library
  (`mathml-to-latex`), and while real-PMC import genuinely *is* more than "reverse
  the export," the excess is absorbed by the lossy-reduction policy (Q2), not by new
  fundamental difficulty.
- **Two realities the slices must hold onto.** (1) Import is a **new capability**, not
  a reversed emitter — it needs an XML parser (a new dependency) and a tree
  transform; only the *mapping tables* are shared with the export. (2) The
  **reduction policy (Q2) is the center of gravity** for real-article import; the core
  element reverse-mapping (Q1) is the easy half.
- **Package:** new `@enscribejs/jats-import` (option A), with shared bidirectional
  tables extracted so export and import cannot diverge.
- **Math:** prefer `<tex-math>`, fall back to `mathml-to-latex`, last-resort raw
  block. Bounded risk.
- **Test data:** export fixtures for the round-trip backbone (today, free); one or
  two CC-BY PMC articles for the demonstration (chosen at slice 6).
- **Output:** `importJats(xml) → canonical mdast → existing pipeline → HTML`; the
  round-trip (`import → re-export ≈ original`) is the headline correctness test.
- **Slicing:** steps 1–7 above, optionally grouped 13a/13b/13c.
- **Biggest unknown:** the variety of *real* PMC JATS in the wild. Mitigate by
  building against the export fixtures first (controlled), then introducing exactly
  one carefully-chosen, license-clean, structurally-simple real article before
  widening. Do not start element coverage from a messy real article.

No code was written. The implementation slices are written from this document.
