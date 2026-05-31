# Phase 6 — Alpha integration check: Phase 0 findings

**Status:** read-only Phase 0 complete. No implementation; no product
code, no spec, no vocab changes. This file is the artifact Phase 6's
implementation slice(s) will be built from — same role
`notes/phase5-jats-export-findings.md` played for Phase 5.

**Date:** 2026-05-28 (post-`b6fede2`, post-Phase-5-close).

**Recommendation at end:** **SINGLE SLICE** — Phase 6 implementation
work fits comfortably in one bundled slice (annotation + possibly
one small new fixture + gap resolution). Rationale in the "Bundle
vs split" section.

**Line-5 reading:** **Reading B** confirmed (canonical-form internal-
consistency + the doc-16 convergence proof). The Layer 1 → enscribe
lowering direction that Reading A would require is Phase 7 — explicitly
post-alpha. **No stop-and-report.**

## Phase 6 scope as inherited

ROADMAP.md L182-198 frames Phase 6 as two items:

1. **Five-point verification fixtures.** "One acceptance fixture per
   line of the alpha definition: Layer 1 elements render; canonical
   enscribe authors them; sigils and markdown idioms reduce to them;
   JATS export round-trips; Layer 2 ⇔ Layer 1 round-trips losslessly
   for canonical-form fixtures."
2. **Resolve any gaps surfaced by the five-point verification.**
   "Filed on the spot if found."

**Exits:** "alpha milestone reached."

The framing is verification, not new feature work. Phases 1-5 produced
the substrate; Phase 6 checks the five-line acceptance criteria
demonstrably hold. The biggest unsurprise of this Phase 0: **most
alpha lines already have natural existing-fixture coverage**, often
multiple fixtures' worth. The implementation slice is primarily
annotation and gap-resolution, not new fixture construction.

## Q1.1 — what Phase 6 filed

### ROADMAP.md Phase 6 entry (L182-198, verbatim)

```
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

**Exits:** alpha milestone reached.
```

### Cross-references

Phase 6 doesn't carry an explicit cross-reference into BACKLOG (no
detailed entry mirrors the ROADMAP framing). The two sub-items are
inline in ROADMAP only. This is consistent with prior verification-
phase items in earlier roadmap iterations — verification work tends
to be roadmap-only, with backlog entries appearing only if gaps are
filed.

### Alpha definition (ROADMAP.md L20-26, verbatim)

```
The alpha release demonstrably includes five things:

1. The **Layer 1 custom-HTML elements** that render a rich document.
2. **Canonical enscribe shorthand** authoring that form.
3. **Further shorthands (sigils) and markdown idioms** reducing to it.
4. **JATS ⇔ Layer 1** conversion.
5. **Enscribe ⇔ Layer 1** conversion.

Each of the five lines above is a literal acceptance criterion.
```

## Q1.2 — fixture corpus inventory

Two fixture corpora exist:

**`packages/enscribe-interpreter/test/fixtures/` (38 fixtures, doc-1
through doc-38).** Each `.emd` source paired with `.html` (rendered
output) and `.json` (snapshot hast tree). Assertions in
`test/integration.test.js` exercise specific surface features.

**`packages/enscribe-jats-export/test/fixtures/` (5 fixtures, doc-39
through doc-43).** Each `.emd` source paired with `.xml` (JATS XML
snapshot). Assertions in `test/run.js` plus optional `xmllint`
DTD-validation.

All sources are `.emd` (no Layer 1 HTML-authored fixtures; not
relevant for alpha line 5 per Reading B — see Q1.3).

### Per-fixture summary (one line each)

The names below are the test-suite labels from `console.log('PASS:
integration ...')` lines. The `[F/M/B]` tag is **F**ull,
**M**inimal, or **B**oilerplate complexity. The kind column
distinguishes article (a), book (b), and DSL-stress (d) fixtures.

| Doc | Kind | Lines | What it exercises |
|---|---|---|---|
| doc-1 | a/M | 13 | Minimal article — `<meta>` + 2 sections + `<em>` only |
| doc-2 | a/M | 46 | Realistic short paper — sub-sections + figure + blockquote + aside + markdown emphasis + bare list |
| doc-3 | a/M | — | Edge cases — sub-sub-section + figure + aside + hr |
| doc-4 | a/M | — | Math minimal — `<inline-math>`, `<display-math>`, KaTeX-error marker |
| doc-5 | a/F | 84 | Linear regression — math + figures + cross-references + citations |
| doc-6 | a/F | 78 | Cross-references — section/figure/equation refs comprehensively |
| doc-7 | a/F | 68 | Tables — CSV/TSV/JSON/YAML/MD formats |
| doc-8 | a/F | — | Citations — `<library>` + `<cite>` + bibliography |
| doc-9 | a/**F** | **168** | **Alpha-complete pipeline** (formerly GAP-9). Full demo: meta + library + math + sigils + tables + code blocks + cross-refs + footnotes + bibliography + figures + blockquote. The "rich document" demonstrator |
| doc-10 | a/M | — | Inline TeX shortcuts — `H_{2}O`, `x^{56}` etc. (G1b) |
| doc-11 | a/M | 26 | **Bare math both surfaces** — `$x$` and `$$..$$` lift to canonical |
| doc-12 | a/M | 37 | **Bare pipe table** — GFM tables lift to canonical `<table>` |
| doc-13 | a/M | — | Code-block cross-references (PG-6) |
| doc-14 | a/M | 27 | **Hash-sigil headings** — `<# .. #>` / `<## .. ##>` / `<### .. ###>` lift to sections |
| doc-15 | a/M | 52 | **Bare markdown headings** — `#` / `##` / `###` lift to sections; `####`+ pass through as `<hN>` |
| doc-16 | a/**M** | 23 | **Section-form ladder convergence proof** — three section authoring forms produce structurally identical Layer 1 |
| doc-17 | a/M | — | Parser edge cases |
| doc-18 | a/M | — | Config edge cases (PG-9 / PG-11 / DD-3) |
| doc-19 | a/M | — | Config unknown kwargs (AUD-13) |
| doc-20 | a/M | — | Apparatus-tag reconciliation: `<ref>` + misuse hints |
| doc-21 | a/M | — | `<meta>` kwarg form lifts to canonical child-tag form |
| doc-22 | a/M | — | Apparatus-tag mid-body positioning warning |
| doc-23 | a/M | — | Multi-paragraph tag content (Option A allow-half) |
| doc-24 | a/M | — | Unclosed tag at EOF (Option A EOF-only terminator) |
| doc-25 | a/M | — | `<meta>` allowlist members render as real elements |
| doc-26 | a/M | — | Deferred-vocab sub-slice 1 elements render |
| doc-27 | a/M | — | `<author>` structured-interface reconciliation |
| doc-28 | a/M | 63 | Deferred-vocab sub-slice 2 structural blocks render |
| doc-29 | a/F | 69 | Deferred-vocab sub-slice 3 theorem-family render |
| doc-30 | a/F | — | Phase 2 slice 2a — CSV/TSV handlers + `<code>` long-form fix |
| doc-31 | a/F | 61 | Phase 2 slice 2b — math envs (matrix/cases/align) + `<math>` long-form |
| doc-32 | d/M | — | Phase 2 slice 2c — external DSL handlers `<mermaid>` and `<abc>` |
| doc-33 | a/M | — | Per-section footnote collection; outermost-section + global numbering |
| doc-34 | a/M | — | Mixed footnote placement; article-back fallback for residual notes |
| doc-35 | a/F | 60 | Numbering-registry extension: theorem-family + math-envs |
| doc-36 | a/F | 86 | Frameable build: fig/svg/frame vocab, figure alias, DSL counters, theorem labels |
| doc-37 | a/F | 62 | Caption-as-content + unified helper: child-tag captions, kwarg lift, title wiring, frame opt-in numbering |
| doc-38 | b/F | 44 | **Book structuring** — book/front/body/back wrapping, chapter/preface/appendix, per-chapter counter resets, chapter-prefix cross-refs, per-chapter footnotes, per-book-part authorship |
| doc-39 | a/M (JATS) | — | JATS minimal article — meta + sections + paragraphs + inline formatting |
| doc-40 | a/F (JATS) | 64 | JATS body content — frameables/lists/math/theorem family + caption + table-wrap |
| doc-41 | a/F (JATS) | — | JATS cross-refs + footnotes + table rows |
| doc-42 | b/F (JATS) | — | JATS BITS book — preface + chapters + edited-volume + appendix |
| doc-43 | a/**F** (JATS) | 69 | **JATS bibliography + external DSLs** — `<element-citation>` per-field + mermaid/abc as `<fig>+<preformat>` + cross-refs to bibliography and DSL figures |

Italics on **doc-9** and **doc-16** mark them as already-explicit
acceptance fixtures (one each for line 1 and the convergence proof
that line 3 leans on).

### Sources of complexity ranking

The corpus' **rich-document** demonstrators (sorted by surface
breadth):
1. **doc-9** (168 lines; everything; pinned as alpha-complete)
2. **doc-43** (JATS-side equivalent for bibliography + DSLs)
3. **doc-36** (frameables breadth)
4. **doc-5** (linear regression — math + figures + cross-refs + cites)
5. **doc-38** (book structuring with figures + math + footnotes)

### Sources of canonical-form (line 2) candidates

Fully canonical authoring (no markdown idioms, no sigils):
- **doc-1** (13 lines, fully canonical, minimal)
- **doc-3** (canonical edge cases)

Mixed-form documents (use sigils + markdown + canonical):
- **doc-9** (all three)
- **doc-2** (canonical tags + markdown emphasis + markdown list)
- **doc-5** (canonical tags + sigil math + sigil code blocks)

A purely-canonical demonstrator larger than doc-1 doesn't exist
today; doc-1 may suffice for line 2's verification.

### Sources of sigil/markdown-idiom-reduction (line 3) candidates

- **doc-16** (sigil + markdown + named all converge to same section
  node — the explicit convergence proof)
- **doc-11** (bare math `$x$` + sigil `<$ x $>` produce the same
  Layer 1 `<inline-math>`)
- **doc-12** (bare GFM pipe table + canonical `<table md | ...>`
  produce the same Layer 1 `<table>`)
- **doc-14** (sigil heading dispatch — `<#>`/`<##>`/`<###>` → sections)
- **doc-15** (bare markdown heading lift — `#`/`##`/`###` → sections;
  `####`+ pass through as `<hN>`)

These together cover **sections**, **inline math**, **display math**,
**tables**, and the **headings** — the major reducible idiom
categories.

## Q1.3 — alpha definition decomposition

### Line 1 — Layer 1 custom-HTML elements rendering a rich document

"Rich document" per DESIGN.md L72: "text documents that additionally
carry the apparatus of scholarly writing — figures, captioned and
numbered, citations, notes, cross-references, theorems, embedded
math and diagrams." Layer 1 is "a vocabulary for rich documents."

Verification demonstrates that the Layer 1 vocabulary, rendered via
the interpreter's HTML compile path, produces a structurally coherent
rich document. A line-1 fixture must exercise a substantial cross-
section of the vocabulary (109 entries) — at minimum: meta + multi-
level sections + frameables (figure + table) + math + inline
formatting + cross-refs + footnotes + bibliography + at least one
theorem-family element.

**Candidate: doc-9** ("alpha-complete pipeline"; formerly GAP-9).
Already explicitly framed as the comprehensive demonstrator at the
end of Phase 4. Pinned by snapshot.

### Line 2 — Canonical enscribe shorthand authoring

"Canonical enscribe" per DESIGN.md L264: "The lossless shorthand
register — the tag form `<tag #id .class attr=value | content>` and
the small set of sigil shorthands defined as canonical (`<#>` /
`<##>` / `<###>` for sections; `<$>` / `<$$>` for math; the
code-fence sigils). Every canonical-enscribe construct round-trips
to and from Layer 1 without loss."

The line-2 verification: a document authored entirely in canonical
enscribe (named-tag form or canonical sigils — both count as
canonical per DESIGN.md L262-264) produces a valid rich Layer 1
document. Distinct from line 3 — line 2 establishes that the
canonical surface ALONE is sufficient for authoring.

**Candidate: doc-1.** Fully canonical-named (no sigils, no markdown
idioms). Minimal but covers the essential canonical-enscribe shapes:
`<meta>`, `<title>`, `<author>`, `<section>` with pipe-content
title, paragraphs, inline `<em>`.

**Alternative candidate: a new fixture (doc-44?) covering canonical
sigils as well.** The current canonical-form fixtures don't have one
that exercises sigil-form canonicals (`<#>`/`<$>`/`<$$>`/code-fence)
end-to-end in a substantial document. A line-2 fixture that mixes
canonical-named + canonical-sigil forms but avoids markdown idioms
would tighten the demonstration. Smaller than doc-9 (~30-50 lines),
explicitly authored in canonical forms only.

### Line 3 — Sigils and markdown idioms reducing to canonical

The verification: documents that USE the convenience surfaces
(markdown idioms beyond canonical sigils; specifically bare markdown
headings, bare math, bare pipe tables, markdown emphasis/strong/
strikethrough/code-fence, markdown lists, GFM-table syntax) produce
the same Layer 1 output as the equivalent canonical-form document.
The lift gate (`normalize-to-canonical.js`) is the mechanism; line
3 verifies it works.

**Candidate: doc-16** as the explicit convergence proof for sections.
Three section-authoring forms (canonical-named, canonical-sigil,
bare-markdown) all produce structurally identical Layer 1 `<section>`
nodes (modulo id presence — bare markdown has no id surface).

**Supporting fixtures**: doc-11 (math), doc-12 (tables), doc-14
(sigil headings), doc-15 (bare markdown headings + diagnostic for
depth-4+).

### Line 4 — JATS ⇔ Layer 1 conversion

Per ROADMAP Phase 5 (CLOSED) + Phase 13 (post-alpha): the alpha
scope is the **export** direction (Layer 1 → JATS XML). Import is
explicitly post-alpha.

The verification: a Layer 1 document exports to JATS XML that DTD-
validates against the JATS 1.3 Archiving and Interchange Tag Set
(for articles) or BITS 2.0 (for books). The export covers the
features Phase 5 built: scaffolding, body content (frameables /
lists / math / theorems), cross-refs, footnotes, bibliography as
structured `<element-citation>`, external DSL preservation.

**Candidate: doc-43** for articles (the broadest fixture: bibliography
+ external DSLs + cross-refs + standard body content). **doc-42**
for books (BITS book with edited-volume + chapter-scope footnotes).

A combined line-4 demonstrator that exercises both DTDs in one
"acceptance pass" isn't natural — the two doctypes are mutually
exclusive at the root level. Two fixtures (one per doctype) is the
cleaner shape; the acceptance criterion is satisfied by both
validating against their respective DTDs.

### Line 5 — Enscribe ⇔ Layer 1 conversion

**Reading settled: Reading B.** Per the slice prompt:

> *Reading B:* Enscribe source parses to Layer 1 mdast; that mdast
> renders to Layer 1 HTML; the Layer 1 HTML, when authored directly,
> parses back to the same mdast. The verification is that the parse
> → render pipeline is internally consistent at the Layer 1 mdast
> level. No new code required; existing fixtures' enscribe source
> + rendered Layer 1 HTML is the evidence.

The ROADMAP Phase 7 framing makes this unambiguous:

```
## Phase 7 — Lift-and-lower completeness *(post-alpha)*

The lift gate at `packages/enscribe-interpreter/src/plugins/
normalize-to-canonical.js` is the single home for normalizing all
authored forms to canonical. Alpha covers what is authored; this
phase fills in the lowering direction (Layer 1 → canonical-named
or canonical-sigil) for round-trip and authoring tooling that emits
enscribe from Layer 1.
```

> "Alpha covers what is authored; this phase fills in the lowering
> direction." Phase 7 is post-alpha. Therefore the Layer 1 → enscribe
> lowering that Reading A's full bidirectional round-trip would
> require is not in alpha scope.

And ROADMAP Phase 6's own wording — "Layer 2 ⇔ Layer 1 round-trips
losslessly for **canonical-form fixtures**" — narrows the alpha line
5 to the canonical-form subset where the parse-direction is itself
the round-trip (canonical enscribe and Layer 1 are structurally
identical modulo the named-tag↔sigil cipher; the parse direction
IS the cipher).

**Candidate: doc-16** doubles as line 5's natural demonstrator. The
convergence proof shows three authoring forms (canonical-named,
canonical-sigil, bare-markdown) all converging to the same Layer 1
node. For the two canonical forms (named + sigil), this IS the
round-trip — they're each a notation for the same Layer 1.

**Supporting fixtures**: every existing fixture's snapshot-pinned
Layer 1 mdast → Layer 1 HTML rendering is per-fixture evidence that
the parse → render pipeline is deterministic. The 38 interpreter
fixtures + 5 JATS fixtures collectively pin this property by
construction.

**Not in alpha scope (Phase 7):**
- A round-tripping demo that lowers Layer 1 → canonical enscribe
  and shows the source recovers. The lowering pass doesn't exist
  yet.
- A "strict mode" demo where markdown idioms produce errors (the
  configuration switch is post-alpha per DESIGN.md L268).

## Q1.4 — coverage map

Rows: alpha lines. Columns: candidate fixtures + verdict.

| Line | Best fixture | Coverage | Supplement |
|---|---|---|---|
| **1** Rich document | doc-9 | **FULL** — already explicit alpha-complete; 168 lines exercising all major rich-document features | None — doc-9 is the canonical demonstrator |
| **2** Canonical authoring | doc-1 | **PARTIAL** — minimal but fully canonical-named. Doesn't exercise canonical sigils (`<#>`, `<$>`, `<$$>`, code-fence) | Consider new doc-44 covering canonical sigils end-to-end, OR annotate doc-1 + doc-14 jointly as the line-2 evidence |
| **3** Idioms → canonical | doc-16 | **FULL** for sections — three-way convergence proof | doc-11 (math), doc-12 (tables), doc-14 (sigil headings), doc-15 (bare-md headings) jointly cover the other reducible idiom categories |
| **4** JATS export | doc-43 (article) + doc-42 (book) | **FULL** — slice 5d exercises the broadest article surface; doc-42 exercises BITS book + edited-volume. Both DTD-valid when xmllint available | None — slice 5d closed Phase 5 |
| **5** Enscribe ⇔ Layer 1 | doc-16 | **FULL** for the alpha scope (Reading B + canonical-form constraint) — convergence + per-fixture snapshot pinning of every parse → render | None — Phase 7 (post-alpha) addresses the lowering direction |

**No line lacks at least one strong existing fixture.** The work
Phase 6 implementation needs is: (a) annotate existing fixtures so
their alpha-acceptance role is documented, and (b) optionally add
one small new fixture (doc-44, canonical-sigil-only) to tighten
line 2.

## Q1.5 — verification fixture design

### Line 1 — doc-9 (existing-as-is + annotate)

doc-9 already serves as the alpha-complete demonstrator (so labeled
in `integration.test.js`'s PASS log). Phase 6's annotation: a brief
`.expected.md` companion or a top-of-file comment in the `.emd`
source explicitly stating "this fixture serves as alpha line 1
verification: Layer 1 elements rendering a rich document." No code
change.

### Line 2 — doc-1 (existing-as-is + annotate) OR doc-44 (new, small)

**Option A: use doc-1 as-is + annotate.** doc-1 is fully canonical-
named. Combined with a brief callout in the annotation that
canonical sigils also exist (per DESIGN.md) and are verified
separately by doc-14, this suffices for line 2. **Smaller commit;
no new fixture.**

**Option B: build a new doc-44 ("canonical enscribe — named +
sigils").** A single fixture that uses canonical-named tags
(`<meta>`, `<section>`, `<author>`) AND canonical sigils
(`<# .. #>`, `<$ .. $>`, `<$$ .. $$>`, code-fence) but no markdown
idioms. Demonstrates that both canonical surfaces produce valid
Layer 1 alone. **Better evidentiary clarity; one more fixture.**

**Recommend Option A** unless the implementation slice surfaces
that a single-fixture sigil-only demonstration is wanted.
Option B is small enough to be deferred to a follow-up if line 2
clarity surfaces as wanting.

### Line 3 — doc-16 (existing-as-is + annotate)

doc-16's source comments already frame it as the convergence proof.
Phase 6's annotation: confirm the framing covers line 3 explicitly
(sigils + markdown idioms reducing to canonical), and cross-link
the supporting fixtures (doc-11, doc-12, doc-14, doc-15) as the
extended evidence.

### Line 4 — doc-43 + doc-42 (existing-as-is + annotate)

Two fixtures cover the two DTDs (article + book). Each annotation
states what line 4 evidence the fixture provides. The JATS test
runner's `validateWithXmllint` call already enforces validation
(skipped only when xmllint isn't on PATH). Annotation may include
a CI note: when alpha closure runs in an env with xmllint, the
hard requirement enforces line 4 demonstrably.

### Line 5 — doc-16 (existing-as-is + annotate; reuse from line 3)

doc-16 is the natural line-5 demonstrator too. Its annotation
explains the dual role: line 3 (the lift direction reducing
idioms to canonical) AND line 5 (within the canonical-form subset,
the parse direction IS the round-trip because canonical enscribe
and Layer 1 are structurally equivalent).

### Annotation form recommendation

Three options:

**Option X: `*.expected.md` companion file per acceptance fixture.**
A new file alongside each acceptance fixture (e.g.
`document-9-demo.expected.md`) describing its alpha-acceptance
role. Discoverable; doesn't pollute the .emd source. Mirrors the
existing `.expected.json` / `.html` snapshot pattern. **Recommended.**

**Option Y: top-of-file comment block in the `.emd` source.** Less
discoverable; pollutes the source. The .emd format doesn't have
a standard comment syntax that survives parsing — would need to
be a leading prose paragraph that the parser tolerates. **Not
recommended.**

**Option Z: A central `notes/alpha-acceptance-mapping.md` table.**
One file listing the five lines, the demonstrator fixture per line,
and the evidence statement. Discoverable; doesn't touch any
fixture. **Recommended as a complement to Option X.**

**Combined recommendation**: produce a central
`notes/alpha-acceptance-mapping.md` (Option Z) listing the per-line
demonstrators with evidence statements; optionally add concise
`.expected.md` companion files (Option X) per acceptance fixture
referencing back to the central mapping. The central mapping is the
primary artifact; the companions are convenience.

## Q1.6 — gap-resolution prediction

The verification exercise might surface these gaps:

### Phase-10 alpha-line vs Phase 6 closure tension

**Real ROADMAP/BACKLOG drift.** Phase 6's exit says "alpha milestone
reached," but Phase 10 (Executable code blocks) is also `[alpha]`
and unbuilt. Per BACKLOG L122-123:

```
- [ ] **Build executable code blocks (JS / Arquero / Vega-Lite)**
  `[cross-cutting]` `[alpha]` *(→ roadmap: Phase 10)*
```

Two possible resolutions:
- **Resolution A**: Phase 6 closes the FIVE-LINE definition;
  Phase 10 closes the additional `[alpha]` work that's outside
  the five lines. ROADMAP Phase 6's "alpha milestone reached"
  becomes accurate only after BOTH Phase 6 and Phase 10 land.
  Phase 6 exits as "five-line definition demonstrably satisfied"
  and Phase 10's later landing is what closes the alpha
  milestone overall.
- **Resolution B**: Re-tag Phase 10 to post-alpha. The executable
  code blocks would then sit outside alpha scope.

**Prediction**: Resolution A is consistent with the alpha-line ruling
that promoted Phase 10 from Discussions to an explicit `[alpha]`
phase. ROADMAP Phase 6's exit prose may need a small wording
adjustment ("five-line verification complete; Phase 10 remains the
last alpha piece" or similar). The implementation slice should
clarify this and update the ROADMAP exit wording.

### Cross-feature stress test gaps

The fixture corpus has good per-feature coverage but limited
cross-feature stress tests. Specifically:

- **Book + bibliography + external DSLs + theorem family +
  per-chapter footnotes** in one document — no fixture exercises
  all of these together. doc-9 covers most for articles; doc-38/42
  cover books but with limited bibliography + DSL.
- **Render-time correctness under deep mixing**. Whether unusual
  combinations break (e.g. a theorem containing a table containing
  a footnote with a cite to an entry that's in a library inside a
  book-part).

**Prediction**: gap-resolution might add ONE cross-feature stress
fixture, sized between doc-9 and doc-38, that exercises books +
bibliography + external DSLs + theorem family + per-chapter
footnotes together. Optional; may not be needed if the existing
per-feature pinning is sufficient evidence.

### AUD-17 stale integration-test mirror

Filed in the recent book-side bugfix slice's STATUS as a separate
drift: `integration.test.js`'s `runPipeline` hand-mirror omits
`enscribeBookStructuring` from its hast-capture path. The
JSON-snapshot path therefore doesn't reflect book-side fixes;
only the HTML-rendering path does. doc-38's `expected.json`
snapshot shows the wrong shape (flat book-parts instead of
wrapped book/book-front/book-body) as a result.

**Prediction**: Phase 6 may be the natural moment to resolve
AUD-17. The fix: replace `runPipeline`'s 25-line hand-mirror
with a shared assembly that mirrors `enscribe-interpreter`'s
real plugin sequence. The book-related hast snapshots would
then reflect reality.

### AUD-18 `<data>` / `<library>` cleanup-pass discussion

Filed `[post-alpha]`. Won't surface as a gap; mentioned only for
completeness.

### Other backlog items unaffected

The remaining `[alpha]`-tagged BACKLOG item (Phase 10 executable
code blocks) is its own arc; doesn't surface as a Phase 6 gap
beyond the drift noted above.

## Q1.7 — execution shape

**Recommend: SINGLE SLICE.**

Phase 6's work is largely:

1. **Annotation** of existing fixtures (low risk; one or two
   markdown files; one central mapping document).
2. **Optional one new fixture** (doc-44 canonical-sigil-only;
   Option B in Q1.5 line 2).
3. **Phase-10 alpha-line drift resolution** in ROADMAP (small
   wording change to Phase 6's exit prose).
4. **Optional AUD-17 resolution** (replace the hand-mirror in
   `integration.test.js`; ~25 lines; clearly scoped). Could be
   bundled if it's small; could split if it surfaces complexity.
5. **Optional cross-feature stress fixture** if Q1.6's prediction
   bears out.

Items 1, 3 are essentially documentation. Items 2, 4, 5 are
optional implementation additions, each small. The total work
likely fits comfortably in one slice with a clear commit message
listing the per-piece deliverables.

**Alternative — SPLIT into 6a (annotation) + 6b (gap resolution).**
Defensible only if the gap resolution surfaces something larger
than expected during the slice. The default plan is single slice
with bundle-vs-split re-evaluation at the start of the
implementation slice based on what AUD-17 (if attempted) costs.

## Q1.8 — backlog and roadmap drift check

**ROADMAP Phase 6 entry**: consistent with itself. Two items + exit;
prose matches the alpha definition (L20-26).

**ROADMAP Phase 7 entry**: consistent. Lowering pass + strict mode
both `[post-alpha]`.

**Cross-document agreement**:
- The alpha definition (ROADMAP L20-26) and Phase 6's framing
  (L182-198) agree on the five lines.
- DESIGN.md L256-270 (layered model and terminology) provides the
  canonical-form definition Phase 6's line 2 / line 5 verification
  rests on. No drift.
- BACKLOG has no Phase 6 detailed entry — verification phases
  conventionally don't carry detailed-entry backlog items. Not
  drift.

**One real drift surfaced** (per Q1.6): Phase 6's "alpha milestone
reached" exit prose doesn't account for Phase 10 also being `[alpha]`
and unbuilt. The implementation slice should adjust the wording or
re-tag Phase 10.

**No drift requiring blocking decision**; the Phase-10 question is
small and fits naturally into the implementation slice's scope.

## Bundle vs split recommendation

**Recommendation: SINGLE SLICE.**

Phase 6 implementation is primarily annotation work plus small
documentation-correctness adjustments. Bundling them captures the
five-line acceptance in one coherent commit with all five mappings
present together. Splitting fragments the verification artifact
across commits with no real risk-isolation benefit.

If during implementation the AUD-17 resolution or a cross-feature
stress fixture turns out to be larger than expected, the
implementation slice can split itself at that point — the
verification mapping + ROADMAP drift fix would land first
(annotation slice 6a), with the larger gap-resolution work landing
as 6b. Default is single.

## Conditional follow-ups (out of slice 6)

- **Phase 10 (Executable code blocks)** — alpha-tagged but not in
  Phase 6 scope. The actual remaining `[alpha]` work; closing the
  alpha milestone requires it. The ROADMAP framing already gives
  it its own phase.
- **Phase 7 (Lift-and-lower completeness)** — post-alpha; the
  Layer 1 → enscribe lowering direction. Out of Phase 6 scope by
  definition; reading B for line 5 explicitly defers this.
- **Phase 13 (JATS import)** — post-alpha; the JATS → Layer 1
  import direction. Out of Phase 6 scope by Phase 5's framing.

## Summary

- Q1.1: Phase 6 frames as verification (no new feature work); two
  items + "alpha milestone reached" exit.
- Q1.2: 43 fixtures across two corpora (38 interpreter + 5 JATS);
  comprehensive per-feature coverage.
- Q1.3: alpha lines decomposed per the slice prompt's framework;
  line 5 settled as Reading B (no stop-and-report).
- Q1.4: coverage map shows every line has at least one strong
  existing fixture; no major holes.
- Q1.5: annotation strategy via `notes/alpha-acceptance-mapping.md`
  (central) + optional per-fixture `.expected.md` companions.
- Q1.6: predicted gaps: ROADMAP Phase 6 / Phase 10 alpha-line
  tension (resolvable via wording fix); cross-feature stress
  fixture (optional); AUD-17 stale integration-test mirror
  (optionally bundled).
- Q1.7: SINGLE SLICE recommended; SPLIT only if AUD-17 / stress
  fixture surface complexity.
- Q1.8: no blocking drift; one small drift (Phase 10 vs Phase 6
  exit wording) handled inside the implementation slice.

After Phase 6 lands, the alpha milestone is reached for the
five-line definition; Phase 10 (executable code blocks) remains the
last alpha-tagged item; everything else is post-alpha.
