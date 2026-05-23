# acadamark — backlog roadmap

**Written:** 2026-05-22. Updated 2026-05-23 during the documentation-system
reconciliation: previously the project tracked open work across three
documents (`audit-findings.md`, `specified-not-implemented.md`,
`known-limitations.md`); the first two have been archived and their open
items migrated here. This document is now the single home for all open
work in the project. Suggested repo home: `notes/`.

This document organizes the open backlog into a **dependency-ordered
roadmap**. It is ordered by *what depends on what* and by *how
fundamental* an item is — not by difficulty. (GHC executes slices
quickly; staging by difficulty is not useful. Staging by dependency
is.) The flat backlog (every open item, unordered) and the roadmap (the
same set arranged into Layers 0–3 + Architecture tier + Standing items)
are two views of the same set — both live in this file.

Items migrated from the archived sources carry "formerly AUD-N",
"formerly DF-N", "formerly PG-N", or "formerly OQ-N" markers so the
historical id and the original filing can still be cross-referenced.
Item identity is now its place in this document.

Per the new `doc-ownership.md` (installed in reconciliation slice 2),
this roadmap is the only home for open work. Resolved items appear as
append-only milestone lines in `STATUS.md`, not as struck-through
entries here (existing struck-through entries are historical anchors
predating the new system).

---

## How to read this

The backlog is shallow, not deep. Most inventory items are **independent
leaves** — no dependency, do in any order, anytime. Only a few real dependency
chains exist. The roadmap is therefore four layers:

- **Layer 0 — verify first.** One item that may already be done.
- **Layer 1 — foundational.** Items that change the core model or the authoring
  syntax. Things authored or built afterward depend on these being settled, so
  they come first — not because they are hard, but because they are *upstream*.
- **Layer 2 — gated.** Items blocked by a specific decision, by a Layer 1 item,
  or by a piece of architecture that must be built first. They cannot start
  until their gate clears.
- **Layer 3 — free leaves.** No dependencies. Do any of these at any time, in
  any order. This is most of the backlog.

Separately: **doc-staleness (DS-1…DS-5)** is not a feature backlog — it is one
cleanup slice, and it should be done early because every later slice is read
against those docs.

---

## The dependency graph

```
LAYER 0   ✔ PG-13 (closed — test RC-14, commit 411c6b0)

LAYER 1   ✔ @/# SIGIL SEMANTICS (F1, commit c86da33)
(found-     # always-assigns · @ always-refers
 ational)   unifies <ref> and <cite> key syntax

          ✔ DOC-STALENESS SWEEP (F2, commit f00c877)
            interpreter.md, pipeline.md, BUILD.md, interpreter-design.md,
            hover-previews-deferred.md all brought current

LAYER 2   ✔ G1 — INLINE TEX SHORTCUTS (G1a b6304a3 + G1b 99aaa0b)

          NORM — THE NORMALIZATION PASS  ◄─── new architectural piece
            a pipeline stage that rewrites standard markdown-form nodes
            (inlineMath, table, heading, ...) into their canonical
            acadamarkTag form. Principle settled (DESIGN.md design
            direction; notes/idioms.md). Pass itself NOT YET BUILT.
            Needs its own Phase 0. Gates G3.

          G3 — MARKDOWN-FORM MATH / GFM  (DF-22, DF-20)
            ├── gated by NORM (math and tables ride on the
            │   normalization pass; they are not standalone
            │   plugin installs anymore)
            └── math half also gated by the math-coverage
                investigation (formerly "OQ-1"): is remark-math's
                tokenizer an adequate wheel, or must acadamark
                supersede the lexer for some math forms?

          G2 — RENDER-MODE LOWERING (DF-19)   ◄─── OUT OF CURRENT SCOPE
            display-target-three on the display ladder (see DESIGN.md).
            Downstream; nothing depends on it. Still gated by OQ-2 when
            it is eventually picked up. Not part of the current
            "finish Layer 2" arc.

          G4 — CROSS-REFERENCE REGISTRATION  (AUD-09, PG-6, PG-7)
            adjacent to F1 — same subsystem, NOT blocked by it.
            section-id half done (R2). code-block half needs its own
            Phase 0 (a representation question — see G4 below).

LAYER 3   independent leaves — no dependencies, any order:
(free)    PG-3, PG-4, PG-5   (<ref> attribute handling)
          PG-1, PG-2          (per-section / margin notes)
          PG-8, PG-9, PG-10, PG-11
          DF-2 (strict mode), DF-3 (html-passthrough — needs spec first)
          DF-8/9/10/11 (DSL handlers — grouped, see below)
          DF-13/14/15 (deferred vocab elements — grouped)
          DF-21 (self-closing), DF-17 (qualifying-tag generalization)
          DF-5 (multi-column)
          pipeline.md note-numbering underexplanation (doc-clarity, see Layer 3)

ARCH      DF-18 (JATS export), DF-4 (multi-file), DF-12 (book types)
(its own  — each a multi-slice project; DF-19 also lands here once
 arc)       OQ-2 is decided. Sequence by intent, not dependency.

DEFERRED  the unbraced-inline @ form (prose-grammar change) — explicitly
          parked; revisit only if/when the bare @key affordance is wanted.
```

---

## Layer 0 — verify first

### ~~PG-13 — markdown pass-through escapes inside named-tag content~~ **[CLOSED]**

**Closed (commit `411c6b0`).** Verified resolved by test RC-14 in
`test-recursive.js`. Not a backlog item. See `STATUS.md` Milestones.

### SUSPECTED CLOSED — items overtaken by NORM / math normalization

These items, migrated here from the now-archived `audit-findings.md` and
`specified-not-implemented.md`, describe problems that the NORM-tables
slice (commit `ec0d071`, 2026-05-22) and the math-normalization arc
appear to have resolved — but the source entries were never updated as
the arcs landed. Each becomes a small **verification item**, not feature
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
  parsing.** Originally filed in `notes/idioms.md` as an open question:
  whether bare `$x$` inside `<aside | ...>` should be treated as inline
  math. The Layer 2 G3 entry below already retires this framing: "the
  design half is settled by the normalization principle (yes; it
  normalizes to the `$` node)." Functionally, bare math now works on
  both surfaces. **SUSPECTED CLOSED — verify the integration produces
  the intended behavior; close if confirmed. A separate math-coverage
  Phase 0 (per the G3 entry below) may still be worth scoping if the
  explicit adequacy table is wanted, but OQ-1 as an open *question* is
  no longer open.**

---

## Layer 1 — foundational

These come first because they are *upstream* of other work — a syntax change or
a model change that later work is authored against. Both Layer 1 items are now
complete.

### ~~F1 — The `@`/`#` sigil-semantics slice~~  **[IMPLEMENTED]**

**Status:** Complete (commit `c86da33`). `#` always assigns an id; `@` always
refers to one. `<ref>` and `<cite>` share `@key` syntax. Closure recorded
in `STATUS.md` Milestones (formerly DF-7, adopted as F1).

**Still deferred:** the unbraced-inline `@` form. See "Explicitly deferred."

### ~~F2 — Doc-staleness sweep~~  **[IMPLEMENTED]**

**Status:** Complete (commit `f00c877`). DS-1…DS-5 resolved.

---

## Layer 2 — gated items

These are blocked by a decision, a Layer 1 item, or a piece of architecture that
must be built first. They cannot meaningfully start until the gate clears.

### ~~G1 — Inline TeX shortcuts  *(DF-1, with PG-12)*~~ **[IMPLEMENTED]**

**Status:** Complete. G1a (`b6304a3`) grammar surface; G1b (`99aaa0b`)
top-level-prose surface. DF-1 and PG-12 resolved. The two-surface structure
(Peggy grammar surface + micromark top-level-prose surface) is on record as a
recurring shape for parser slices.

### NORM — The normalization pass  **[IMPLEMENTED for math and tables; ongoing for further constructs]**

**What it is.** A pipeline stage that rewrites standard markdown-form mdast
nodes — `inlineMath`, `table`, `heading`, and so on — into their canonical
`acadamarkTag` equivalents, before any structural or semantic plugin runs.
After the pass, every downstream plugin sees one node type per construct.

**Status.** The pass is built and lives at
`packages/acadamark-interpreter/src/plugins/normalize-markdown.js`. It
normalizes `inlineMath`, `math`, and GFM `table` nodes today (NORM-tables
slice, commit `ec0d071`, 2026-05-22; closure recorded in `STATUS.md`
Milestones). The 4 SUSPECTED CLOSED items in Layer 0 confirm bare GFM
tables, bare math, and the recursive-content integration via code check.

**Why it exists.** The "Markdown forms are shorthand for the canonical
acadamark form" design direction (`DESIGN.md`, reconciled in detail in
`notes/idioms.md`) settled the principle: delegate the lexer to remark, but
own the node identity. The normalization pass is the implementation of that
principle.

**Scope of the principle vs. scope of the pass.** The principle is universal
in intent — it governs every markdown/acadamark overlap. The pass is
implemented incrementally — it grows one construct at a time. The current
scope is math + GFM tables; headings, emphasis, links, lists follow as the
pass grows. A construct not yet normalized is a not-yet-done item, never a
decision that it was meant to stay a separate path.

**Action:** add a normalization rule whenever a further markdown/acadamark
overlap is reached (e.g. headings if/when the `<#>` sigil semantics warrant
it). Each new construct is a small slice; no further architectural Phase 0
is needed since the pass itself is established.

### ~~G3 — Markdown-form math / GFM authoring  *(DF-22, DF-20)*~~  **[IMPLEMENTED via NORM-tables and the math-normalization arc; verify-and-close via Layer 0]**

**What it was.** Bare `$x$` / `$$x$$` and bare GFM pipe tables, working as
shorthand for `<$ ... $>` / `<$$ ... $$>` and `<table>` — i.e. authored in
markdown form, normalized to the canonical acadamark node, rendered by the
one existing path for that construct.

**Status.** Implemented as part of the NORM-tables slice (commit
`ec0d071`). `remark-math` and `remark-gfm` provide the lexer; the
normalization pass rewrites their output into canonical acadamark nodes
(`$`, `$$`, `<table md>`). Formal closure is via the 4 SUSPECTED CLOSED
verification items in Layer 0 — once those check, the G3 framing has
nothing left to track.

**Remaining open question — math coverage investigation.** Whether
`remark-math`'s tokenizer is an adequate wheel for every math surface
acadamark wants (or whether acadamark must supersede the lexer for some
forms) is a separate code-and-coverage Phase 0 that produces a three-column
table — acadamark's intended math surface, `remark-math`'s tokenizer
coverage, and acadamark's existing DSL-math coverage (`<matrix>`,
`<cases>`, `<align>`, `<eqnarray>`). Worth scoping if the adequacy table
is wanted, but not blocking; the current normalization works for the
delimiter-shaped math forms in scope today.

### G2 — Render-mode lowering  *(DF-19, gated by OQ-2)*  **[OUT OF CURRENT SCOPE]**

Render-mode lowering (`<section-title>` → `<h1>`, etc.) is **display-target-three**
on the display ladder (see `DESIGN.md`, "Layer 1 is canonical; display is a
downstream ladder"). It is a downstream display concern: nothing else depends
on it, and it has been explicitly set aside for the current "finish Layer 2"
arc.

When it is eventually picked up it remains gated by **OQ-2** (the
`<article-title>` + `<section-title>` heading-level question — see
`notes/layer1-naming.md` open decisions). OQ-2 is a short design note, to be
made *when render mode is scoped*, not before — a decision made far ahead of
its implementation tends to be re-litigated when implementation starts.

DF-19 therefore lands in the Architecture tier, not the current Layer 2 arc.

### ~~G4 — Cross-reference registration  *(AUD-09, PG-6, PG-7)*~~  **[IMPLEMENTED both halves; closure recorded in STATUS.md Milestones, 2026-05-23]**

**Status.** Both halves closed. Section registration done in R2; code-block
sigil registration done in G4 (decision: only shorthand-wrapped code blocks
with colon-ids are referenceable; plain fenced `code` nodes intentionally
non-referenceable). PG-6 implemented; PG-7 closed as by-design (auto-generated
note ids are internal placement mechanics, not author-facing handles —
notes that need cross-referencing use explicit colon-ids).

The full reasoning for the by-design closures is in DESIGN.md's
"Design tensions and accepted tradeoffs" section and in the G4 Phase 0
findings (`archive/audit-2026-Q2/G4-phase0-findings.md`).

### OQ-2 — Render-mode heading-level assignment for `<article-title>` + `<section-title>` coexistence

Where: `notes/layer1-naming.md` open decisions. When both an
`<article-title>` and `<section-title>` are present, do section titles become
`<h2>` (because the article title takes `<h1>`)? Or do they stay `<h1>` and
rely on document structure?

A decision needed before DF-19 (render-mode lowering, Architecture tier) can
be meaningfully scoped. Filed in Layer 2 because it explicitly gates DF-19.

The G2 entry above recommends making this call *when render mode is scoped*,
not before — a decision made far ahead of its implementation tends to be
re-litigated when implementation starts. This entry exists so the
dependency is visible from the roadmap rather than buried inside the
render-mode discussion.

**Action:** decide when DF-19 is scoped.

---

## Layer 3 — free leaves (no dependencies, any order)

None of these blocks or is blocked by anything. Pick by appetite.

**`<ref>` attribute handling — PG-3, PG-4, PG-5.** `format`/`type` kwargs
ignored (PG-3); author pipe-text ignored (PG-4); `+link`/`+preview`/`+title`
flags ignored (PG-5). Effectively **one slice** — "make `<ref>` honor its parsed
attributes." Safe to do independently of F1 and of NORM.

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
has nothing to do (no markdown-form nodes are produced). Independent leaf, but
naturally touched after NORM exists.

**HTML passthrough — DF-3.** `<html-passthrough>` — needs a *spec* written
first; it is "planned, not yet specified." A design step precedes the code.

**DSL handlers — DF-8, DF-9, DF-10, DF-11 (grouped).** `<csv>`/`<tsv>` standalone
(DF-8, AUD-05/07); `<mermaid>`/`<abc>` (DF-9); math environments
`<matrix>`/`<cases>`/`<align>`/`<eqnarray>` (DF-10); `<theorem>` handler (DF-11a).
**Treat as one body of work, not individual items** — each is "write a handler,"
all additive, none blocks anything. Note DF-10 (the math environments) is the
"acadamark covers ground remark never covered" case from the lexer-supersession
discussion in `notes/idioms.md` — it is independent of NORM and of G3's math
half, which concern delimiter-shaped math only. (DF-11b — the
`<proof>`/`<lemma>`/etc. *vocabulary* — needs a vocab design pass first.)

**Deferred vocabulary elements — DF-13, DF-14, DF-15 (grouped).** Metadata
(`<keywords>`, `<publication-date>`); definition lists (`<dl>`/`<dt>`/`<dd>`);
inline-semantic (`<abbr>`, `<term>`, `<glossary>`, `<glossary-entry>`); plus the
theorem-family vocab (DF-11b). All "to be specified" — each needs a short vocab
spec, then a schema entry. Group them; do as a batch.

**Multi-column display — DF-5.** Deferred-feature doc exists; render-mode
concern. Independent leaf, low-priority unless a publication target needs it.

**pipeline.md note-numbering explanation — doc-clarity leaf.** In `pipeline.md`
§10.5, the explanation of how a note gets its number is incomplete: it implies
`fillNumbering` assigns note numbers, but `fillNumbering` is a no-op for notes —
notes are numbered by `numberRegistry()` at the start of the apply-numbers step.
A one-paragraph clarification, no code change.

**Slide elements — DF-6 (formerly).** Pre-spec placeholder for
`<presentation>` + `<slide>` + `<slide-notes>`. `notes/slide-element-deferred.md`
says "Needs design pass before implementation." Names reserved only;
nothing implemented or specified beyond the placeholder. Low priority
unless presentation output becomes a target.

**Parser bugs — AUD-04 (formerly), AUD-21–23 (formerly), DF-16 (formerly).**
Five distinct parser-level bugs surfaced through audits but not yet fixed.

- **No-pipe/no-content short form misread as long-form opener
  (formerly AUD-04).** A table with only kwargs and no inline data,
  written as `<table #id csv src=file.csv caption="...">`, is parsed by
  the micromark extension as a long-form tag opening (looking for
  `</table>`) rather than a short-form no-content tag. The parser has no
  distinct form for a zero-content short tag without a pipe. **Workaround
  in use:** `<table #id csv src=file.csv caption="..." | >` — the pipe
  with a trailing space serves as an explicit empty-content short form.
  **Spec impact:** `notes/shorthand-syntax.md` should document the `| >`
  empty-content idiom for zero-content short-form tags;
  `notes/escape-rules-spec.md` should confirm it is unambiguous.

- **Multi-line content in text-position named tags silently lost
  (formerly AUD-21).** In the text-position named-tag tokenizer
  (`makeNamedTagTokenizer({ multiLine: false })` in
  `packages/remark-acadamark/src/syntax.js`), encountering a line ending
  in the `attrSection` or `content` state calls `nok(code)`. Micromark
  backtracks entirely — the `<` is treated as literal text and no
  `acadamarkTag` node is produced. Empirical:
  `Text.<note | line one\nline two.> end.` produces one text node with
  the literal string `"Text.<note | line oneline two.> end."` (newline
  collapsed); the tag is never parsed. **Shares root cause and fix with
  AUD-23 (below).** Proposed fix: remove the `if (!multiLine) return
  nok(code)` branch in the `attrSection` / `content` states; emit
  `lineEnding` tokens the same way the flow tokenizer already does. Full
  root-cause analysis in
  `archive/investigations-2026-05/parser-newline-investigation.md`
  Q1 + Q5.

- **Inline tag at line-start captured as flow construct — paragraph
  splitting (formerly AUD-22; highest-impact of the three parser-newline
  bugs).** Causes unexpected paragraph splitting in normal authored
  documents, not edge cases. When an acadamark tag appears at the start
  of a line (even within prose), the flow-position tokenizer claims it
  before the text-position tokenizer can; `afterClose` in both the sigil
  and named-tag flow tokenizers calls `ok(code)` unconditionally,
  regardless of what character follows the closing `>`. Any text after
  `>` on the same line becomes the beginning of a new paragraph.
  Empirical (sigil): `<$ b $> is two.` at line-start → the `<$ b $>`
  becomes a standalone flow element; `is two.` becomes a separate
  paragraph. Empirical (named tag):
  `<note | content> trailing text.` at line-start → three children:
  paragraph (preceding), `acadamarkTag`, paragraph (`trailing text.`).
  Proposed fix: add an `afterGt` check that calls `nok` if the character
  after `>` is not a line ending or EOF. Documented in
  `parser-newline-investigation.md` Q2 + Q5.

- **Code sigil with multi-line content in text position produces
  `acadamarkTagError` (formerly AUD-23).** Same root cause as AUD-21
  (the `!multiLine` early path in the text-position tokenizer); the
  difference is that the sigil tokenizer calls `ok` on the partial
  token where the named-tag tokenizer calls `nok`.
  `from-markdown.js` then passes incomplete source (no closing sigil)
  to Peggy, which fails and produces an `acadamarkTagError` node.
  Empirical: `` Text <``` python\ncode here ```> more. ``
  produces an `acadamarkTagError` node inside the paragraph;
  `` code here ```> more. `` is raw text in the output. **Same fix as
  AUD-21.** Documented in `parser-newline-investigation.md` Q3 + Q5.

- **Blank-line termination error recovery (formerly DF-16).** The
  micromark finder needs to check each line ending and terminate open
  constructs at blank lines for localized error recovery. Currently a
  tag opened before a blank line will consume across the blank line or
  to EOF. Explicit `Status: Deferred` in
  `notes/recursive-content-spec.md`. Live behavior listed in
  `notes/known-limitations.md`.

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
  `notes/tag-forms-reference.md` showing the full matrix; identify and
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
  reference DD-1 — directly relevant to AUD-14 below;
  `known-limitations.md`'s self-closing entry does not reference DD-4).
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
  documents have it once. Effect: ~370 KB wasted per math document;
  `document-5`/`document-6` render at ~710–737 KB versus ~336 KB for
  math-free equivalents. No appearance impact. Fix path: in the
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
not by dependency — they are mutually independent.

- **DF-18 — JATS export** (`rehypeAcadamarkToJats`). The vocabulary is
  JATS-aligned by design (`jats_counterpart` on every entry); this is the
  payoff. A `BUILD.md` Phase-3 piece.
- **DF-19 — render-mode lowering.** Display-target-three on the display ladder.
  Lands here once OQ-2 (its gate) is decided. Set aside for the current arc.
- **DF-4 — multi-file authoring.** `acadamark.yml` + `<include>`; project-wide
  registries. A real architectural extension.
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

Audit every spec in the repo (`DESIGN.md`, `notes/*.md`,
`packages/layer1-vocabulary/SPEC.md`, the per-element vocabulary
entries) against the **rebuild-from-docs standard** stated in the new
documentation system design: *with all code deleted, the remaining
documentation must be sufficient to rebuild the project.*

**This is not the previous audit framing.** Drift checks ("does the
spec match the code") have been the standing audit pattern. This new
standard is stricter: it is not "does the spec match" but "is the spec
*sufficient* to recreate the design without the code as a reference."
A spec that describes *what is implemented* may still be insufficient
under this standard if it skips the *why*, the constraints that bound
the design, or the unbuilt parts of the blueprint.

**Why now.** The new documentation system installs the coherence check
as the end of every implementation slice. Future spec drift is caught
at the slice that introduces it. But existing specs were written under
the old framing and have never been held to the rebuild standard, so
they need a one-time pass to bring them up to it before the per-slice
check is meaningful.

**Scope and shape.** Each spec assessed individually; gaps filed as new
backlog items in their appropriate Layer. The audit itself produces no
fixes — fixes are follow-on slices. Likely to be split into several
Phase 0 investigations (per spec or per spec-cluster) plus targeted
fix slices. Not for the current arc.

**Status: filed. Not started.**

---

## Suggested order (a default, not a mandate)

Dependency-respecting; within a layer, order is free:

**Done:** ~~PG-13 verify~~ ✔ · ~~F2 doc-staleness sweep~~ ✔ · ~~F1 `@`/`#` sigil
semantics~~ ✔ · ~~G1 inline TeX shortcuts~~ ✔ · ~~normalization principle into
the spec~~ ✔ (DESIGN.md design direction + `notes/idioms.md`)

**Next:**

1. **Math-coverage Phase 0** — the read-only investigation that was formerly
   "OQ-1." Produces the three-column adequacy table and confirms-or-corrects
   the lexer-supersession claim in `notes/idioms.md`. Can run in parallel with
   step 2.
2. **NORM Phase 0** — architecture and initial scope of the normalization pass.
3. **NORM implementation slice** — build the pass; cover the constructs G3
   needs (math, tables).
4. **G3** — markdown-form math and GFM tables, riding on NORM. May split into a
   tables slice and a math slice; both sit behind NORM.
5. **G4** — cross-reference registration. The code-block half needs its own
   Phase 0 first (representation question); the section/note-id parts may be
   direct.
6. **Layer 3 leaves** — any time, by appetite. The `<ref>`-attributes slice
   (PG-3/4/5) and PG-10 are the easy satisfying ones.
7. **Architecture tier** — when the output/format direction is known. DF-19
   (render mode) lands here once OQ-2 is decided.

The hard rules: NORM before G3; the math-coverage Phase 0 before G3's math
half; OQ-2 before DF-19. Everything else is preference.
