# acadamark — backlog roadmap

**Reconciled 2026-05-23 to open-work-only.** Per `CONTRIBUTING.md`,
this document is the single home for open work in the project. Resolved
items live as append-only milestone lines in `STATUS.md` and are not
recorded here.

This document organizes the open backlog into a **dependency-ordered
roadmap**. It is ordered by *what depends on what* and by *how
fundamental* an item is — not by difficulty. (Slices execute quickly;
staging by difficulty is not useful. Staging by dependency is.) The
flat backlog (every open item, unordered) and the roadmap (the same set
arranged into Layers 0–3 + Architecture tier + Standing items) are two
views of the same set — both live in this file. The flat checklist is
the scannable index; the detailed entries below it are the authoritative
descriptions.

Items migrated from previously-tracked sources (`audit-findings.md`,
`specified-not-implemented.md`, `known-limitations.md`, all archived)
carry "formerly AUD-N", "formerly DF-N", "formerly PG-N", or "formerly
OQ-N" markers so the historical id and the original filing can still be
cross-referenced. Item identity is now its place in this document.

---

## How to read this

The backlog is shallow, not deep. Most items are **independent leaves** —
no dependency, do in any order, anytime. Only a few real dependency
chains remain. The roadmap is therefore four layers:

- **Layer 0 — verify first.** Items that may already be done — small
  code-checks that probably close the item.
- **Layer 1 — foundational.** Items that change the core model or the
  authoring syntax. Things authored or built afterward depend on these
  being settled, so they come first — not because they are hard, but
  because they are *upstream*. **Currently empty.**
- **Layer 2 — gated.** Items blocked by a specific decision, by a
  Layer 1 item, or by a piece of architecture that must be built first.
- **Layer 3 — free leaves.** No dependencies. Do any of these at any
  time, in any order. This is most of the backlog.

Plus an **Architecture tier** (large multi-slice projects, sequenced by
intent), **Standing items** (always-present cadence work), and an
**Explicitly deferred** bucket.

---

## Open items — checklist

A flat scannable index of every open item. Detailed entries below.
Every checkbox here corresponds to one detailed entry; deleting a
checkbox without resolving the entry — or vice versa — is drift.

### Layer 0 — verify first

- [ ] Verify formerly AUD-06 — bare GFM pipe tables (NORM-tables / `ec0d071`)
- [ ] Verify formerly DF-20 — `remark-gfm` lexer-to-canonical bridge
- [ ] Verify formerly DF-22 — bare `$x$` / `$$x$$` via `remark-math` + normalization
- [ ] Verify formerly OQ-1 — `remark-math` integration with recursive content
- [ ] Verify formerly AUD-04 — no-pipe/no-content short form misread as long-form opener (suspected closed per parser-cluster Phase 0)
- [ ] Verify formerly AUD-21 — multi-line content in text-position named tags silently lost (suspected closed per parser-cluster Phase 0)
- [ ] Verify formerly AUD-22 — inline tag at line-start splits paragraphs (suspected closed per parser-cluster Phase 0)

### Layer 2 — gated

- [ ] OQ-2 — render-mode heading-level assignment (`<article-title>` + `<section-title>` coexistence; gates DF-19 in the Architecture tier)

### Layer 3 — free leaves

- [ ] PG-3/4/5 — make `<ref>` honor its parsed attributes (`format`/`type` kwargs, pipe content, `+link`/`+preview`/`+title` flags)
- [ ] PG-1, PG-2 — per-section footnote collection; margin-positioned sidenotes
- [ ] PG-8, PG-9, PG-10, PG-11 — citation/config small gaps (multi-key cite order, nested `<config>`, bib heading hardcoded, trailing-whitespace EOL)
- [ ] DF-21 (= AUD-08), DF-17 — parser leaves: self-closing `<tag />` for DSL-registry tags; qualifying-tag generalization beyond `<table>`
- [ ] DF-2 — strict mode
- [ ] DF-3 — `<html-passthrough>` (needs spec written first)
- [ ] DF-8, DF-9, DF-10, DF-11 — DSL handlers (`<csv>`/`<tsv>` standalone; `<mermaid>`/`<abc>`; math env handlers; `<theorem>` handler + vocab)
- [ ] DF-13, DF-14, DF-15 — deferred vocab elements (grouped; absorbs additional candidates from the authoring-features survey)
- [ ] DF-5 — multi-column display
- [ ] `pipeline.md` note-numbering explanation — doc-clarity leaf
- [ ] AUD-23 — code sigil multi-line in text position produces `acadamarkTagError`
- [ ] DF-16 — blank-line termination error recovery
- [ ] Parser-error-node renderer — `acadamarkTagError` / `acadamarkParseError` visible at source location (always-renders core-guarantee work; sibling of DF-16)
- [ ] AUD-13 — `<config>` silently accepts metadata kwargs that belong in `<meta>`
- [ ] AUD-15 — no documented inventory of tag forms × tags
- [ ] AUD-24 — vocabulary `related_plugins` plugin names are stale
- [ ] AUD-25 — design directions DD-1..DD-5 not referenced from governed specs
- [ ] AUD-14 — caption-as-content for `<table>`, `<figure>`, similar (DD-1/DD-2 implementation)
- [ ] AUD-18 — `<data>` nodes remain in tree after `buildCitationIndex`
- [ ] AUD-19 — double KaTeX CSS injection in math documents
- [ ] GAP-9 — `document-9-demo` has no integration test or snapshot
- [ ] AUD-17 — `integration.test.js` hand-mirrors the `index.js` pipeline (paid four times)
- [ ] AUD-07 — `table.md` `<csv | ...>` example coordination with DF-8
- [ ] Discuss canonical form for sections — markdown `##` heading vs `<#>` sigil tag
- [ ] Discuss type-prefix mismatch warning in cross-reference resolver
- [ ] Discuss compact external-reference syntax (`wiki:`, `doi:`, `arxiv:`)
- [ ] Discuss external-link rich previews
- [ ] Discuss just-in-time math symbol definitions
- [ ] Discuss executable code blocks (Jupyter-style; Architecture-tier-sized if adopted)
- [ ] Discuss `<presentation>` / `<slide>` / `<slide-notes>` vocabulary (formerly DF-6)
- [ ] Discuss four open design questions prerequisite to multi-file authoring (DF-4): MF-Q1 project-config / `<include>` interaction; MF-Q2 standalone-chapter mode invocation, bibliography scope, and stub-marker family; MF-Q3 project-metadata placement in the assembled AST; MF-Q4 `<include>` pipeline placement and discovery timing
- [ ] Discuss four open design questions prerequisite to multi-column display (DF-5): MC-Q1 `<config>` syntax for column settings (kwarg vs nested-element form); MC-Q2 render-mode container for `column-count`; MC-Q3 `span` kwarg value space and cascade interaction; MC-Q4 responsive-vs-fixed signaling mechanism
- [ ] Smart-typography conversions — open design question
- [ ] Underline and strikethrough shortcuts — open design question

### Architecture tier

- [ ] DF-18 — JATS export (`rehypeAcadamarkToJats`)
- [ ] DF-19 — render-mode lowering (gated by OQ-2 above)
- [ ] DF-4 — multi-file authoring
- [ ] DF-12 — book / book-part document structuring

### Standing items

- [ ] Spec-completeness audit (one-time large; not started)

### Explicitly deferred — parked

- The unbraced-inline `@` form (parked; revisit only if/when the bare `@key` affordance is wanted)

---

## Start here — what to work on next

### Open dependency chains

After the reconciliation, the active backlog has **one** hard dependency
chain:

- **OQ-2 → DF-19.** The heading-level question
  (`<article-title>` + `<section-title>` coexistence) must be decided
  before render-mode lowering can be meaningfully scoped.

Everything else in Layers 0, 2, and 3 (and the Architecture tier other
than DF-19) is independently pickable. The math-coverage investigation
mentioned in the Layer 0 formerly-OQ-1 entry is opt-in scoping work, not
a blocker.

### Unblocked, high-value picks (start-here shortlist)

- **AUD-17** — *`integration.test.js` hand-mirrors the `index.js`
  pipeline.* Small, well-bounded; retires a recurring tax paid four
  times in R3a/R3b/R4/G1b. Good early cleanup.

- **AUD-19** — *double KaTeX CSS injection in math documents.*
  Concentrated change in the asset-injection path in
  `packages/acadamark-interpreter/src/index.js`. ~370 KB wasted per math
  document; no rendering impact.

- **PG-3/4/5** — *`<ref>` attribute handling.* One slice scope — make
  `<ref>` honor its parsed `format` / `type` kwargs, pipe content, and
  `+link`/`+preview`/`+title` flags.

- **The Layer 0 verifications.** Each is a small code-check that
  probably closes the item; the total verification time is short.
  Closing them tightens the open-work surface.

---

## Layer 0 — verify first

These items, migrated here from the now-archived `audit-findings.md` and
`specified-not-implemented.md`, describe problems that the NORM-tables
slice (commit `ec0d071`, 2026-05-22) and the math-normalization arc
appear to have resolved — but the source entries were never updated as
the arcs landed. Each is a small **verification item**, not feature
work: read the relevant code in
`packages/acadamark-interpreter/src/plugins/normalize-markdown.js` and
`packages/acadamark-interpreter/src/index.js`, confirm the construct
behaves as the closure would imply, close the item with a milestone
line in `STATUS.md`.

- **(formerly AUD-06) Plain markdown table syntax not supported
  (`remark-gfm` not installed).** Originally filed when `remark-gfm` was
  absent and `| h1 | h2 |\n|---|---|` parsed as paragraph text. The
  `<table md | ...>` form was the documented workaround. `remark-gfm`
  is now installed in `acadamark-interpreter` and threaded into both the
  outer and inner processors; bare GFM pipe tables normalize to
  canonical `<table md | ...>` nodes via `acadamarkNormalizeMarkdown`.
  **SUSPECTED CLOSED — verify against NORM-tables (commit `ec0d071`) /
  the math-normalization arc; close if confirmed.**

- **(formerly DF-20) GFM pipe-table syntax (`remark-gfm`).** Same root
  as AUD-06 — `BUILD.md`'s initial dependency list named `remark-gfm`
  but the package was never installed at filing time. Now installed and
  the lexer-to-canonical bridge exists via the normalization pass.
  **SUSPECTED CLOSED — verify against NORM-tables (commit `ec0d071`);
  close if confirmed.**

- **(formerly DF-22) `remark-math` / bare `$...$` math shorthand inside
  recursive parsing.** Originally filed when `remark-math` was not
  installed and the open question OQ-1 (below) was undecided. The
  `<$ | x $>` sigil form worked but bare `$x$` produced paragraph text.
  `remark-math` is now installed on both surfaces; `inlineMath` and
  `math` nodes are rewritten to canonical `acadamarkTag` `$` / `$$`
  nodes by `acadamarkNormalizeMarkdown`. **SUSPECTED CLOSED — verify
  against the math-normalization arc / commit `ec0d071`; close if
  confirmed.**

- **(formerly OQ-1) `remark-math` integration with recursive content
  parsing.** Originally filed in `notes/specs/idioms.md` as an open question:
  whether bare `$x$` inside `<aside | ...>` should be treated as inline
  math. The design half is settled by the normalization principle (yes;
  it normalizes to the `$` node); functionally, bare math now works on
  both surfaces. **SUSPECTED CLOSED — verify the integration produces
  the intended behavior; close if confirmed. A separate math-coverage
  Phase 0 may still be worth scoping if the explicit adequacy table is
  wanted — its purpose would be a three-column table of acadamark's
  intended math surface, `remark-math`'s tokenizer coverage, and
  acadamark's existing DSL-math coverage (`<matrix>`, `<cases>`,
  `<align>`, `<eqnarray>`) — but OQ-1 as an open *question* is no
  longer open.**

The next three entries are parser-bug items that the packages/ reconciliation
parser-cluster Phase 0 (probes against the current parser) showed do not
reproduce against current code — but were filed without a verifiable closure
story (which commit closed them, or whether the original report was a
misdiagnosis). Each is a small **verification item**: re-run the probe-shaped
test, confirm the bug does not reproduce, locate the closing change (or
confirm no fix was needed) so a `STATUS.md` milestone line can record the
closure, then close.

- **(formerly AUD-04) No-pipe/no-content short form misread as long-form
  opener.** Originally filed as: a table with only kwargs and no inline
  data, written as `<table #id csv src=file.csv caption="...">`, was parsed
  as a long-form tag opening (looking for `</table>`) rather than a
  short-form no-content tag. Probe of exactly that source and of
  `<csv src=foo.csv>` against the current parser produces clean short-form
  `acadamarkTag` nodes with `content: null`. The `| >` workaround the
  original entry recommended is no longer necessary. **SUSPECTED CLOSED —
  verify against the parser-cluster Phase 0 probes; close if confirmed.
  The previously-noted spec-impact follow-ups (documenting the `| >`
  idiom in `notes/specs/shorthand-syntax.md` and confirming its
  unambiguity in `notes/specs/escape-rules-spec.md`) are not needed once
  the closure is confirmed.**

- **(formerly AUD-21) Multi-line content in text-position named tags
  silently lost.** Originally filed as: in the text-position named-tag
  tokenizer (`makeNamedTagTokenizer({ multiLine: false })` in
  `packages/remark-acadamark/src/syntax.js`), encountering a line ending
  in the `attrSection` or `content` state called `nok(code)`; micromark
  backtracked entirely and the `<` was treated as literal text with no
  `acadamarkTag` produced. Empirical claim:
  `Text.<note | line one\nline two.> end.` produced one text node with
  the literal string. Probe of exactly that source against the current
  parser produces the correct structured paragraph: text "Text.", a
  properly-formed `note` `acadamarkTag` with `content` carrying the
  embedded newline verbatim, and trailing text " end.". Probes of
  text-position `<aside>` and `<em>` in the same shape produce the same
  correct behavior. **SUSPECTED CLOSED — verify against the parser-cluster
  Phase 0 probes; close if confirmed. The closure may also resolve the
  shared-fix story for AUD-23 (see the parser-bug cluster below), which
  will then need its own re-analysis.**

- **(formerly AUD-22) Inline tag at line-start splits paragraphs.**
  Originally filed as the highest-impact of the three parser-newline bugs:
  when an acadamark tag appeared at the start of a line in prose, the
  flow-position tokenizer claimed it before the text-position tokenizer
  could, and any text after the closing `>` on the same line became a new
  paragraph. Empirical (sigil): `<$ b $> is two.` at line-start →
  `<$ b $>` became a standalone flow element, `is two.` became a separate
  paragraph. Probe of exactly that source against the current parser
  produces a single paragraph containing the `$` `acadamarkTag` and
  trailing text " is two." in the same paragraph. Probes of
  `<note | content> trailing text.` and the same case wrapped in
  surrounding paragraphs all produce single-paragraph-with-trailing-text
  behavior. **SUSPECTED CLOSED — verify against the parser-cluster Phase 0
  probes; close if confirmed. The start-here-shortlist recommendation that
  named this the next highest-impact pick has been removed.**

---

## Layer 2 — gated items

### OQ-2 — Render-mode heading-level assignment for `<article-title>` + `<section-title>` coexistence

Where: `notes/specs/layer1-naming.md` open decisions. When both an
`<article-title>` and `<section-title>` are present, do section titles
become `<h2>` (because the article title takes `<h1>`)? Or do they stay
`<h1>` and rely on document structure?

A decision needed before DF-19 (render-mode lowering, Architecture tier)
can be meaningfully scoped. Filed in Layer 2 because it explicitly
gates DF-19.

Recommended: make the call *when render mode is scoped*, not before —
decisions made far ahead of their implementation tend to be re-litigated
when implementation starts. This entry exists so the dependency is
visible from the roadmap rather than buried inside the render-mode
discussion.

**Action:** decide when DF-19 is scoped.

---

## Layer 3 — free leaves (no dependencies, any order)

None of these blocks or is blocked by anything. Pick by appetite.

**`<ref>` attribute handling — PG-3, PG-4, PG-5.** `format`/`type` kwargs
ignored (PG-3); author pipe-text ignored (PG-4); `+link`/`+preview`/`+title`
flags ignored (PG-5). Effectively **one slice** — "make `<ref>` honor its parsed
attributes."

**Notes — PG-1, PG-2.** Per-section footnote collection (PG-1); margin-positioned
sidenotes (PG-2). Both are placement refinements; notes otherwise work.

**Citation/config small gaps — PG-8, PG-9, PG-10, PG-11.** Multi-key cite
ordering (PG-8); nested `<config>` not read (PG-9); hardcoded bibliography
heading (PG-10 — a config kwarg, very small); trailing-whitespace-before-EOL
treated as inline (PG-11).

**Parser leaves — DF-21, DF-17.** Self-closing `<tag />` for DSL-registry tags
(DF-21, AUD-tracked AUD-08); generalizing the qualifying-tag pattern beyond
`<table>` (DF-17 — note: already works *for* `<table>`).

**Strict mode — DF-2.** Bounded; disables markdown idioms. Under the
normalization model, strict mode is the mode in which the normalization pass
has nothing to do (no markdown-form nodes are produced).

**HTML passthrough — DF-3.** `<html-passthrough>` — needs a *spec* written
first; it is "planned, not yet specified." A design step precedes the code.

**DSL handlers — DF-8, DF-9, DF-10, DF-11 (grouped).** `<csv>`/`<tsv>` standalone
(DF-8, AUD-05/07); `<mermaid>`/`<abc>` (DF-9); math environments
`<matrix>`/`<cases>`/`<align>`/`<eqnarray>` (DF-10); `<theorem>` handler (DF-11a).
**Treat as one body of work, not individual items** — each is "write a handler,"
all additive, none blocks anything. Note DF-10 (the math environments) is the
"acadamark covers ground remark never covered" case from the lexer-supersession
discussion in `notes/specs/idioms.md` — it is independent of the math-coverage
investigation, which concerns delimiter-shaped math only. (DF-11b — the
`<proof>`/`<lemma>`/etc. *vocabulary* — needs a vocab design pass first.)

**Deferred vocabulary elements — DF-13, DF-14, DF-15 (grouped).** Metadata
(`<keywords>`, `<publication-date>`); definition lists (`<dl>`/`<dt>`/`<dd>`);
inline-semantic (`<abbr>`, `<term>`, `<glossary>`, `<glossary-entry>`); plus the
theorem-family vocab (DF-11b). All "to be specified" — each needs a short vocab
spec, then a schema entry. Group them; do as a batch.

Additional small-vocab candidates surfaced in the authoring-features survey
(archived 2026-05-23) and absorbed into this cluster — same shape, same batch:

- **Programming-related inline elements**: `<kbd>` (keyboard input),
  `<var>`, `<samp>`, `<output>` (HTML-native; small schema entries).
- **Collapsible sections**: `<details>` / `<summary>` (HTML-native;
  pipe-content of `<details>` becomes `<summary>`, body becomes the
  expandable content).
- **Rich author metadata**: sub-elements within `<author>` — `<affiliation>`,
  `<orcid>`, `<email>`, `<corresponding>` (structured author info for journal
  venues and JATS export). Structurally similar to `<bib-entry>`.
- **Document-level metadata elements**: `<license>` (SPDX code), `<doi>`,
  `<short-title>` (or `short` kwarg on `<title>`), `<subject>` (document
  classifier), `<thumbnail>` (image for social sharing). Each is a small
  addition to `<meta>`'s allowed children.

**Multi-column display — DF-5.** Spec is `notes/specs/multi-column-display.md`;
render-mode concern. Independent leaf, low-priority unless a publication
target needs it.

**pipeline.md note-numbering explanation — doc-clarity leaf.** In `notes/specs/pipeline.md`
§10.5, the explanation of how a note gets its number is incomplete: it implies
`fillNumbering` assigns note numbers, but `fillNumbering` is a no-op for notes —
notes are numbered by `numberRegistry()` at the start of the apply-numbers step.
A one-paragraph clarification, no code change.

**Discuss the canonical form for sections — markdown `##` heading vs
`<#>` sigil tag.** A discussion item, not a build item. The shorthand
spec (`notes/specs/shorthand-syntax.md`) and DESIGN.md's implicit-closing
section work are built around the `<#>` sigil; markdown `##` headings also
produce sections via remark's built-in heading tokenizer. Two forms for
the identical operation, with no rule for which to use, violates the
"explicit, consistent" principle. The decision settles which form is
canonical and how the other relates to it (probably: as the markdown-form
shorthand the normalization principle would expect). Once decided, the
result is reconciled into DESIGN.md and `notes/specs/shorthand-syntax.md`.

**Starting position for the discussion (not a settled answer):**
markdown headings are likely the convenience form and `<#>` is canonical
when an id or attributes are needed — because `<#>` is the form that
carries an id, and any cross-referenced section needs an id. The
discussion may settle differently; this is a starting framing harvested
from the now-archived audit-cleanup-stopping-point's FLAGGED-1, not a
prescribed answer.

Filed under the discussion-is-work rule (`CONTRIBUTING.md`).

**Discuss whether the cross-reference resolver should warn on
type-prefix mismatch.** A discussion item, not a build item. When
`@fig:priority` resolves to an equation (or `@sec:foo` to a figure,
etc.), the registry knows the target's actual type and the reference's
stated prefix disagrees with it. This is a detectable mismatch that
could be a warning ("ref `@fig:priority` targets an `equation`, not a
`figure` — did you mean `@eqn:priority`?"). The decision settles whether
to add the warning, and at what severity (`file.message()` vs visible
error marker in the rendered output).

**Note:** this is about *catching* a mismatch, not *inferring* the
prefix. Prefix inference was considered earlier and rejected because it
makes the id's meaning implicit and breaks down once elements are wrapped
in `<figure>` downstream — that rejection is context for the discussion,
not a separate item. Filed under the discussion-is-work rule. Original
framing in `notes/archive/at-sigil-reference-proposal-2026-05.md`.

**Discuss whether to add compact external-reference syntax.** A
discussion item, not a build item. MyST supports `wiki:Book` to link to
Wikipedia's "Book" article, `doi:10.5281/zenodo.6476040` to link to a
DOI, `arxiv:1234.5678` to link to an arXiv paper, `github:user/repo`
for GitHub. Compact authoring without typing full URLs. Mechanism:
parser-level shortcuts that expand `wiki:foo` to
`<a href="https://en.wikipedia.org/wiki/foo">`. The decision settles
whether to add this, which prefixes to support, and how the parser
recognizes them (a registry of prefix → URL-template pairs, with
`\wiki:foo` as the literal-text escape). This is a parser feature, not
a vocabulary feature. Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under the
discussion-is-work rule.

**Discuss whether to add external-link rich previews.** A discussion
item, not a build item. The hover-preview rendering substrate exists
(currently used for notes, refs, citations — see `notes/specs/interpreter.md`
§10.2). External link metadata-fetching is the open gap: would require
fetching target metadata (Wikipedia summary, DOI title + abstract,
GitHub repo description) at build time and embedding it for the hover
preview to display. The decision settles whether to add this, which
sources to support, and how to handle build-time network access (caching,
offline mode, fallback when fetch fails). Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under the
discussion-is-work rule.

**Discuss whether to add just-in-time math symbol definitions.** A
discussion item, not a build item. A reference system for mathematical
symbols, similar to citations: define `\alpha` once with a meaning ("the
coefficient of foo"), and wherever it appears its definition pops up on
hover. Substantial design — what counts as a symbol, how definitions are
authored (`<symbol-def>` element? a `<def>` form inside math content?),
how the resolver matches symbol references to definitions across the
document, how it interacts with KaTeX's rendering. The decision settles
whether to add the feature and what its surface looks like. Harvested
from `notes/archive/authoring-features-survey-2026-05.md`. Filed under the
discussion-is-work rule.

**Discuss whether to add executable code blocks (Jupyter-style).** A
discussion item, not a build item. Authors annotate a code block to mark
it for execution; the build runs the code in a kernel, captures stdout/
stderr/return value/plot output, and embeds the result. Established
convention via RMarkdown / Quarto / Jupyter. The DSL-processor model
in DESIGN.md provides the substrate: an executable-code processor is one
more processor extending the registry. The execution-control attribute
convention (`+eval`, `+echo`, `+output`, `+error`, `cache`,
`dependencies`) matches existing tooling. The decision settles whether
acadamark commits to this direction.

**If adopted, this is an Architecture-tier-sized effort, not a Layer 3
slice.** It brings in a kernel, sandboxing (untrusted code execution is
a security boundary), output capture, caching, dependency management.
If the discussion concludes "yes," the item graduates from this
discussion item to an Architecture-tier arc (parallel to JATS export,
multi-file authoring, book types) — that is the discussion-is-work
rule's defined exit when a discussion commits to substantial work.
Filing here at Layer 3 honestly reflects that the commitment to do it
does not yet exist; what exists is the question of whether to commit.
Harvested from `notes/archive/authoring-features-survey-2026-05.md`. Filed
under the discussion-is-work rule.

**Discuss whether to add `<presentation>` / `<slide>` / `<slide-notes>`
Layer 1 vocabulary for presentations — DF-6 (formerly).** A discussion
item, not a build item: the design pass that would decide the vocabulary
has not happened. Use cases: slide-decks rendered for screen presentation
(parallel to revealjs / beamer); reusing content between papers and
slides; generating both presentation HTML and printed handouts from one
source; consistent citation/figure/equation handling between papers and
presentations. Discussion agenda — six open questions identified at the
placeholder's filing:

1. Slide-level attributes — transitions, layouts, themes.
2. How `<presentation>` differs structurally from `<article>` and `<book>`.
3. Whether slides have explicit type kwargs (title-slide, content-slide,
   section-divider, etc.).
4. Speaker-notes mechanism (separate `<slide-notes>` elements vs.
   attribute on the slide).
5. How body content relates between paper-mode and presentation-mode (the
   same `<section>` rendering as a section in paper output but a slide in
   presentation output?).
6. How math, figures, citations carry over from paper-authoring
   conventions.

The first concrete step is a chat-side vocabulary design pass parallel to
the article and book design passes; the result is either a new spec
(`presentation.md`, `slide.md`, `slide-notes.md` in the vocabulary
directory) or a recorded decision not to pursue. Filed under the
discussion-is-work rule (`CONTRIBUTING.md`); the source placeholder file
is archived at `notes/archive/slide-element-deferred-2026-05.md`.

**Discuss four open design questions prerequisite to multi-file authoring
(DF-4).** Surfaced by the Front C extensions-cluster spec audit. These
are forks the `notes/specs/multi-file-authoring.md` blueprint previously
presented as settled; the audit and fix-slice disclosed them as open and
filed them here. They are decisions owed before DF-4 (the
Architecture-tier multi-file authoring arc) is built; they are not
independent free leaves. Filed under the discussion-is-work rule
(`CONTRIBUTING.md`). The spec's §"Open design questions" section catalogs
the same four with the same identifiers.

- **MF-Q1 — project-config / `<include>` interaction.** When the project
  configuration lists a file and another file also `<include>`s it: is
  the inclusion de-duplicated (project config canonical, redundant
  `<include>` silently skipped) or does the file appear at every
  referenced position (both mechanisms run independently)? And on
  ordering disagreement between the project config and an `<include>`
  position, which wins? Both directions are defensible; the choice is a
  design decision.

- **MF-Q2 — standalone-chapter mode invocation, bibliography scope, and
  stub-marker family.** Three undecided sub-points: (a) *invocation* —
  CLI flag, `<config>` option, automatic-on-missing-project-config, or
  some combination; (b) *bibliography scope* — whether standalone mode
  loads the project-config-declared shared bibliography (so cross-file
  `<cite>` still resolves) or treats cross-file cites as unresolved
  stubs; (c) *stub-marker family* — the spec illustrates `[?ref]` for
  the cross-reference case; the corresponding marker shapes for cites,
  notes, and any other cross-file reference are not enumerated.

- **MF-Q3 — project-metadata placement in the assembled AST.** The spec
  states project metadata is *sourced* from the project config file but
  does not say where it *lands* in the assembled multi-file AST. Two
  shapes the spec does not choose between: a synthesized top-level
  front-matter block (e.g. a `<book-front>` containing a `<meta>`
  populated from the project config, prepended to the assembled book
  AST) versus distribution as inherited defaults available to each
  chapter's per-chapter `<meta>` lookups without appearing as a separate
  AST node. Different shapes affect downstream cross-reference
  resolution, JATS export, and rendering.

- **MF-Q4 — `<include>` pipeline placement and discovery timing.** Two
  undecided sub-points: (a) *pipeline placement* — is `<include>`
  expansion a structural plugin walking the parsed AST and splicing
  included file content, or a parser-level extension that re-parses the
  referenced file inline during the initial parse; (b) *discovery
  timing* — Phase 1 (Discovery) is project-wide, but `<include>`
  directives are inside file content and only visible once parsing has
  happened; does a pre-Phase-1 discovery sweep collect all transitive
  include targets, or are include-referenced files not listed in the
  project config invisible to Phase 1's project-wide registries?

**Discuss four open design questions prerequisite to multi-column display
(DF-5).** Surfaced by the Front C extensions-cluster spec audit. These
are forks the `notes/specs/multi-column-display.md` blueprint previously
presented as settled; the audit and fix-slice disclosed them as open and
filed them here. They are decisions owed before the multi-column display
feature is built (DF-5 in this document); they are not independent free
leaves. Filed under the discussion-is-work rule (`CONTRIBUTING.md`). The
spec's §"Open design questions" section catalogs the same four with the
same identifiers.

- **MC-Q1 — `<config>` syntax for column settings.** The
  multi-column-display spec previously illustrated a nested-element
  form (`<config><columns count=2></config>`) which is not supported by
  `<config>` as it currently works — `acadamarkConfigDiscovery`
  (`notes/specs/interpreter.md` §3.2) reads kwargs and does not walk
  nested children (the gap is also tracked as the formerly-PG-9
  "nested `<config>` not read" item elsewhere in this document). The
  fork: adopt the kwarg form `<config columns=2>` (no new machinery),
  or adopt the nested-element form (requires extending `<config>`'s
  reading rules and/or registering a `<columns>` vocabulary element).
  Either is workable as a design.

- **MC-Q2 — render-mode container for `column-count`.** Which container
  carries the CSS `column-count` (and the analogous typeset
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
  source. Affects authoring conventions — authors mark intent in source
  vs. the build target drives the lowering.

**Parser bugs — AUD-23 (formerly), DF-16 (formerly),
parser-error-node renderer.** Three distinct parser-level shortfalls
surfaced through audits but not yet fixed. The last two are siblings under
the always-renders guarantee (`notes/specs/principles.md`): DF-16 is the
"errors stay bounded so the rest of the document is seen" half;
the parser-error-node renderer is the "produced error nodes are visible
in the output at their location" half. (Three formerly-listed entries —
AUD-04, AUD-21, AUD-22 — have been reclassified to Layer 0 verify-first:
parser-cluster Phase 0 probes show none of them reproduces against the
current parser. They are awaiting verify-and-close.)

- **Code sigil with multi-line content in text position produces
  `acadamarkTagError` (formerly AUD-23).** The text-position sigil
  tokenizer commits a partial token when it encounters a line ending
  inside the sigil body, and `from-markdown.js` then passes incomplete
  source (no closing sigil) to Peggy, which fails and produces an
  `acadamarkTagError` node. Empirical:
  `` Text <``` python\ncode here ```> more. `` produces an
  `acadamarkTagError` node inside the paragraph; `` code here ```> more. ``
  is raw text in the output. Originally filed as "same root cause as
  AUD-21" (the `!multiLine` early path) with a shared-fix proposal — but
  AUD-21 has since been reclassified to Layer 0 as not reproducing, which
  invalidates the shared-fix story. Re-analysis of the root cause is part
  of the work to close this item; the original investigation in
  `notes/archive/investigations-2026-05/parser-newline-investigation.md`
  Q3 + Q5 is still the starting point.

- **Blank-line termination error recovery (formerly DF-16).** The
  micromark finder needs to check each line ending and terminate open
  constructs at blank lines for localized error recovery. Currently a
  tag opened before a blank line will consume across the blank line or
  to EOF. Explicit `Status: Deferred` in
  `notes/specs/recursive-content-spec.md`. Under the re-tiered
  always-renders guarantee in `notes/specs/principles.md`, this is a
  known shortfall against the guarantee, not a permitted exception:
  the "errors stay bounded so the rest of the document is seen" half
  is currently violated when EOF-consumption occurs. The route to
  closing it is partly a design question and partly an implementation
  question; the item stays open until both are settled.

- **Parser-error-node renderer — `acadamarkTagError` /
  `acadamarkParseError` visible at source location (always-renders
  core-guarantee work).** The parser produces `acadamarkTagError` and
  `acadamarkParseError` nodes for grammar and parse failures, but the
  interpreter has no compile-step handler registered for these node
  types, so they currently fall through silently in the rendered
  output. The always-renders guarantee
  (`notes/specs/principles.md`) requires them to render visibly at
  their source location — in the same house style the interpreter
  already uses for other "the author wrote a reference the system
  couldn't resolve" cases: `??ref: id??` for an unresolved
  cross-reference, `??cite: key??` for an unresolved citation, an
  inline table-parse-error marker for a malformed table body. The
  parser-error markers should follow the same pattern. Sibling of
  DF-16 above; both must close for the always-renders guarantee to
  hold in full. The more impactful of the two, since until it closes
  even bounded parser errors are invisible in the rendered output.
  Fix path: register a compile-step handler in
  `packages/acadamark-interpreter/src/index.js` for the
  `acadamarkTagError` and `acadamarkParseError` mdast node types that
  emits a hast element with the house-style marker text and a
  distinguishing class for styling, mirroring how the unresolved-ref
  and unresolved-cite markers are emitted today.

**Silent-failure / authoring traps — AUD-13 (formerly).** `<config>`
silently accepts metadata kwargs that belong in `<meta>` (`title=`,
`subtitle=`, `author=`, `date=`). The kwargs produce no warning and no
visible output. The bug is doubly bad because the syntactic ease of
`<config>` (kwargs on one tag) is more attractive than `<meta>` (nested
tags), so authors default to it. Fix path: `<config>` should validate
its accepted kwargs and warn on unknown ones (especially
metadata-shaped ones); specs should clearly distinguish `<meta>` (document
metadata) from `<config>` (document options). Severity: medium — silent
failure mode that produces no visible output. Touches DD-3 in
`DESIGN.md` (the `<meta>` vs `<config>` boundary).

**Documentation drift — AUD-15, AUD-24, AUD-25 (formerly).** Three
documentation findings that need separate slices.

- **No documented inventory of which tag forms work for which tags
  (formerly AUD-15).** The grammar supports short-form
  (`<tag attrs>`), pipe-content (`<tag attrs | inline content>`),
  multi-line pipe-content, long-form (`<tag attrs>content</tag>` — only
  for DSL_REGISTRY tags), and self-closing (`<tag attrs />` — broken for
  DSL_REGISTRY per AUD-08). Different tags support different combinations
  and the mapping is undocumented and inconsistent. Authors have no clear
  guide. Fix path: audit every vocabulary entry; create a unified
  `notes/specs/tag-forms-reference.md` showing the full matrix; identify and
  fix inconsistencies; establish a principle ("all tags should support
  all forms that semantically make sense, with the same output").
  Severity: medium — not a runtime bug, but a real documentation and
  design-discoverability issue.

- **Vocabulary `related_plugins` plugin names are stale (formerly
  AUD-24).** Three vocabulary entries in
  `packages/layer1-vocabulary/elements/` have `related_plugins` sections
  naming plugins that no longer match the implemented names. `cite.md`
  says `acadamarkCitationResolution` (actual: `acadamarkCiteResolution`).
  `ref.md` says `acadamarkCrossReferenceResolution` (actual:
  `acadamarkRefResolution`) and calls it a "rehype plugin" when it runs
  as an mdast plugin. `note.md` says `acadamarkNoteNumbering` (actual:
  `acadamarkNotes`; numbering and placement were merged into one plugin).
  Small live-file fix; no code change.

- **Design directions DD-1..DD-5 not referenced from specs they govern
  (formerly AUD-25).** `DESIGN.md`'s "Design directions (discovered
  through implementation)" section defines five cross-cutting directions
  (DD-1: content gets parsed, arguments don't; DD-2: caption-like
  content supports two equivalent forms; DD-3: `<meta>` vs `<config>`
  boundary; DD-4: all tag forms work for all tags where semantically
  meaningful; DD-5: standalone HTML is the build target, client-side is
  the future). The directions govern specific vocabulary entries and
  spec docs, but no forward-pointer from the governed spec to the
  relevant direction exists (`config.md` / `meta.md` do not reference
  DD-3 — which AUD-13 violates; `figure.md` / `table.md` do not
  reference DD-1 — directly relevant to AUD-14 below).
  Fix path: add "See also: DD-N in DESIGN.md §Design directions"
  forward-pointer lines to the governed entries. A propagation slice;
  `DESIGN.md` remains the canonical owner.

**Caption-as-content (substantive design + slice) — AUD-14 (formerly).**
Citations inside the `caption=` kwarg of `<table>`, `<figure>`, and
similar elements are not parsed — the kwarg value is a string, cite
tags inside it remain literal text in the rendered output. Affects any
kwarg where rich content might be desirable (figure captions, alt text,
etc.). Two architectural options identified at filing:

- **Option A (recommended at filing):** captions become first-class
  child tags rather than attribute values: `<table #tab:burnout csv | ...> <caption | Risk and protective factors, adapted from <cite Mantzalas2022>>`.
  Recursive content parsing handles citations naturally. Matches
  Pandoc/Quarto conventions where captions are markdown blocks.
- **Option B:** attribute values get recursive parsing —
  `caption="text <cite key>"` would parse the value as acadamark
  content. More invasive parser change; affects all attribute values,
  not just captions.

Tied to design directions DD-1 ("content gets parsed; arguments don't")
and DD-2 ("tags with caption-like content support two equivalent
forms"). When scoped, follow the design-directions framing. Severity:
medium-high — affects real authoring need (captions with citations).

**Asset / build-pipeline bugs — AUD-18, AUD-19 (formerly).** Two filed
asset-pipeline findings, both low-priority.

- **`<data>` nodes remain in tree after `buildCitationIndex` (formerly
  AUD-18).** `buildCitationIndex` reads `<data>` and `<library>` nodes
  at root level but never removes or modifies them. Rendered output is
  unaffected — no visible `<data>` content appears in any fixture, the
  `INTERNAL_REGISTRY` returns `null` for them — but a cleanup pass that
  removes them after their content is consumed has not been decided.
  Low priority; observation, not malfunction. Potential candidate for a
  follow-on `indexInputs` consolidation slice.

- **Double KaTeX CSS injection in math documents (formerly AUD-19).**
  Documents containing math (e.g. `document-5`, `document-6`) carry the
  KaTeX stylesheet **twice** — a small block (~12 KB) and the full
  block (~370 KB), as two separate `<style>` elements. Math-free
  documents have it once. No appearance impact. Fix path: in the
  asset-injection path in
  `packages/acadamark-interpreter/src/index.js`, identify where KaTeX
  CSS is injected and guard against double-injection (e.g. check
  whether a KaTeX `<style>` block is already present before appending
  another). Severity: medium — wasted bytes, no rendering impact.

**Testing / maintenance — GAP-9, AUD-17 (formerly).**

- **`document-9-demo` has no integration test or snapshot (formerly
  GAP-9).** `test/fixtures/document-9-demo.acm` and
  `document-9-demo.html` exist and are re-rendered by
  `render-fixtures.js`, but unlike documents 1–8 there is no
  corresponding `document-9-expected.json` snapshot and no test case in
  `test/integration.test.js`. document-9 is the most complex fixture:
  multi-note forward-reference numbering, external `.bib` library,
  inline + display math with equation numbers, cross-refs — exactly
  the stages added or restructured in the R1 / R2 / R3 slices.
  Without a snapshot, regressions in combined-pipeline paths can go
  undetected. Fix path: run `render-fixtures.js`, generate
  `document-9-expected.json` from current output, add a test case in
  `integration.test.js` mirroring the existing doc6/doc7/doc8 pattern.
  Severity: medium — the dark surface area covers the full pipeline in
  combination.

- **`integration.test.js` hand-mirrors the `index.js` pipeline
  (formerly AUD-17).** The test maintains a separate manual copy of
  the plugin pipeline assembled in `src/index.js`. The two are not
  linked — every pipeline change must be duplicated by hand, with
  nothing enforcing it. **Recurrence record: paid four times** —
  R3a (2026-05, `fillNotes` import drift, first surfacing); R3b
  (2026-05, pipeline reordering); R4 (2026-05, `buildCitationIndex`
  stage change); G1b (2026-05, `document-10-shortcuts.acm`
  integration block added by hand). Fix path: have the integration
  test import and use the real pipeline assembly from `index.js`
  rather than rebuilding it. Small, well-bounded cleanup; a good
  early candidate. Severity: medium — maintenance hazard, not a
  current bug.

**Coordinate with AUD-05 / DF-8 — AUD-07 (formerly).**
`packages/layer1-vocabulary/elements/table.md` includes a shorthand
example using `<csv | name,price\n...>`. This form relies on the
`<csv>` shortcut tag, which is registered in DSL_REGISTRY but not yet
implemented (AUD-05 / DF-8). The example will mislead authors. Fix:
remove or mark the `<csv>` example as "planned" until the shortcut tag
lands.

**Smart-typography conversions — open design question.** Markdown
extensions convert `--` to en-dash and `---` to em-dash. Whether
acadamark's pipeline accepts such a plugin — and what the escape
conventions for those sequences look like if it does — is open. Filed
from the spent "what is not yet decided" section of
`escape-rules-spec.md` (Reconciliation 2). If adopted, the escape rules
for `--` / `---` follow whatever plugin acadamark accepts; acadamark
does not own these escapes natively.

**Underline and strikethrough shortcuts — open design question.**
Markdown lacks clean conventions for underline and strikethrough.
Acadamark currently uses `<u | text>` and `<s | text>` tagged forms.
Whether to add bare-idiom shortcuts (and what they would be) is open.
Filed from the spent "what is not yet decided" section of
`escape-rules-spec.md` (Reconciliation 2). If shortcuts are added,
the special-character list and escape rules grow to match.

---

## Architecture tier — large, each its own arc

Multi-slice projects. Sequence these by *intent* (what acadamark is for next),
not by dependency — they are mutually independent (other than DF-19's
gate on OQ-2).

- **DF-18 — JATS export** (`rehypeAcadamarkToJats`). The vocabulary is
  JATS-aligned by design (`jats_counterpart` on every entry); this is the
  payoff.
- **DF-19 — render-mode lowering.** Display-target-three on the display
  ladder. Gated by OQ-2 (Layer 2 above) — the heading-level question
  must be decided when render mode is scoped.
- **DF-4 — multi-file authoring.** `acadamark.yml` + `<include>`;
  project-wide registries. A real architectural extension. Spec at
  `notes/specs/multi-file-authoring.md`.
- **DF-12 — book / book-part document structuring.** Vocabulary exists;
  `article-structuring.js` currently warns and skips non-article types.

---

## Explicitly deferred — parked

**The unbraced-inline `@` form.** `…as shown (@fig:priority)…` with no `<ref>`
wrapper. The half of the `@`-sigil proposal NOT adopted in F1. A grammar-wide
change: `@` significant in prose, `\@` escaping, prose-fixture churn. Parked
deliberately. Not on the active roadmap.

---

## Standing items

Items present in every cadence of the documentation system, not tied to a
specific arc. Under a working system this kind of item is normally small;
the spec-completeness audit below is large *this once* because of the
accumulated debt — it is the bootstrap for the new documentation system
rather than ordinary maintenance.

### Spec-completeness audit (one-time large; future passes will be ordinary)

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
