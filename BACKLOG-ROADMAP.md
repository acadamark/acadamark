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

## Open items — checklist

A flat scannable index of every open item. Detailed entries below.
Every checkbox here corresponds to one detailed entry; deleting a
checkbox without resolving the entry — or vice versa — is drift.

### Layer 0 — verify first

- [ ] **Verify the NORM-tables / math-normalization closures** — four
  near-identical code-checks that each probably close their respective
  item; handled as one grouped slice `[parser+interpreter]` *(verifies
  the items `formerly AUD-06`, `formerly DF-20`, `formerly DF-22`, and
  `formerly OQ-1`)*

### Layer 2 — gated

- [ ] **Decide section-title heading level when an article-title is
  present** `[cross-cutting]` *(`formerly OQ-2`)*

### Layer 3 — by work-kind

#### Bugs

- [ ] **Fix self-closing `<tag />` for DSL-registry tags** `[parser]`
  *(`formerly DF-21, AUD-08`)*
- [ ] **Add blank-line termination error recovery in the micromark
  finder** `[parser]` *(`formerly DF-16`)*
- [ ] **Render parser-error nodes visibly at their source location**
  `[interpreter]` — always-renders guarantee work, sibling of the
  blank-line item above
- [ ] **Make `<ref>` honor its parsed attributes** (`format`/`type`
  kwargs, pipe content, `+link`/`+preview`/`+title` flags)
  `[interpreter]` *(`formerly PG-3, PG-4, PG-5`)*
- [ ] **Close small citation/config bugs** — multi-key cite order,
  nested `<config>` not read, trailing-whitespace EOL `[interpreter]`
  *(`formerly PG-8, PG-9, PG-11`)*
- [ ] **Stop `<config>` silently accepting metadata kwargs that belong
  in `<meta>`** `[interpreter]` *(`formerly AUD-13`)*
- [ ] **Fix double KaTeX CSS injection in math documents**
  `[interpreter]` *(`formerly AUD-19`)*
- [ ] **Fix stale `related_plugins` plugin names in three vocabulary
  entries** `[vocab]` *(`formerly AUD-24`)*
- [ ] **Update `table.md`'s `<csv | …>` example to mark it planned
  until the DSL handlers land** `[specs/docs]` *(`formerly AUD-07`)*
- [ ] **Have `integration.test.js` import the real pipeline from
  `index.js` instead of hand-mirroring it** `[tests/build]`
  *(`formerly AUD-17`)*
- [ ] **Fix the `#`/`##`/`###` hash-sigil dispatch — they currently
  fall through to the unknown-element span** `[interpreter]` —
  spec-documented hash-sigil heading form is silently unsupported
  (couple with the opacity-discrepancy bug)
- [ ] **Fix hash-sigil `isOpaqueContent` discrepancy — spec says
  `false`, grammar emits `true`** `[parser]` — couple with the
  hash-sigil dispatch bug above
- [ ] **Update `shorthand-syntax.md` §"What the parser produces" to
  list the full 12-field shape (`atRefs` and `selfClosing` are
  spec-omitted today)** `[specs/docs]`

#### Enhancements

- [ ] **Generalize the qualifying-tag pattern beyond `<table>`**
  `[parser]` *(`formerly DF-17`)*
- [ ] **Refine note placement — per-section footnote collection and
  margin sidenotes** `[interpreter]` *(`formerly PG-1, PG-2`)*
- [ ] **Make the bibliography heading a config kwarg instead of
  hardcoded** `[interpreter]` *(`formerly PG-10`)*
- [ ] **Implement DSL handlers** (`<csv>`/`<tsv>`, `<mermaid>`/`<abc>`,
  math environments, `<theorem>`) `[interpreter — DSL surface]`
  *(`formerly DF-8, DF-9, DF-10, DF-11a`)*
- [ ] **Add deferred vocabulary elements** (metadata, definition
  lists, inline-semantic, theorem family, survey absorbs) `[vocab]`
  *(`formerly DF-13, DF-14, DF-15, DF-11b`)*
- [ ] **Document the tag-form × tag matrix and reconcile inconsistencies**
  `[specs/docs]` *(`formerly AUD-15`)*
- [ ] **Add forward-pointers from governed specs to design directions
  DD-1..DD-5** `[specs/docs]` *(`formerly AUD-25`)*
- [ ] **Add integration test and snapshot for `document-9-demo`**
  `[tests/build]` *(`formerly GAP-9`)*

#### Planned work

- [ ] **Implement strict mode (disable markdown idioms)** `[parser]`
  *(`formerly DF-2`)*
- [ ] **Specify and implement `<html-passthrough>`** — needs a spec
  written first `[parser]` *(`formerly DF-3`)*
- [ ] **Implement multi-column display rendering** `[interpreter]`
  *(`formerly DF-5`)*
- [ ] **Support caption-as-content for `<table>`, `<figure>`, similar
  (DD-1 / DD-2 implementation)** `[cross-cutting]`
  *(`formerly AUD-14`)*

#### Discussions

- [ ] **Decide whether `<data>` / `<library>` nodes need a cleanup
  pass after `buildCitationIndex` reads them** `[interpreter]`
  *(`formerly AUD-18`)*
- [ ] **Discuss the canonical section form — markdown `##` heading
  vs `<#>` sigil tag** `[cross-cutting]`
- [ ] **Discuss whether the cross-reference resolver should warn on
  type-prefix mismatch** `[interpreter]`
- [ ] **Discuss compact external-reference syntax** (`wiki:`, `doi:`,
  `arxiv:`, `github:`) `[parser]`
- [ ] **Discuss external-link rich previews** (build-time metadata
  fetching) `[interpreter]`
- [ ] **Discuss just-in-time math symbol definitions** (reference
  system for math) `[cross-cutting]`
- [ ] **Discuss executable code blocks** (Jupyter-style;
  Architecture-tier-sized if adopted) `[cross-cutting]`
- [ ] **Discuss `<presentation>` / `<slide>` / `<slide-notes>`
  Layer 1 vocabulary** `[vocab]` *(`formerly DF-6`)*
- [ ] **Discuss four open design questions prerequisite to multi-file
  authoring** (project-config / `<include>` interaction;
  standalone-chapter mode; project-metadata placement; pipeline
  placement + discovery timing) `[cross-cutting]`
  *(`spec: MF-Q1, MF-Q2, MF-Q3, MF-Q4`)*
- [ ] **Discuss four open design questions prerequisite to
  multi-column display** (`<config>` syntax; render-mode container;
  `span` value space; responsive-vs-fixed signaling) `[cross-cutting]`
  *(`spec: MC-Q1, MC-Q2, MC-Q3, MC-Q4`)*
- [ ] **Discuss smart-typography conversions** (`--` → en-dash,
  `---` → em-dash) `[parser]`
- [ ] **Discuss bare-idiom shortcuts for underline and strikethrough**
  `[parser]`
- [ ] **Discuss meaningful names for the `Layer 0/1/2/3 /
  Architecture / Standing` structure** `[specs/docs — backlog
  organization]`
- [ ] **Discuss the backlog's item-counting convention** (when grouped
  checklist lines count as one item vs N) `[specs/docs — backlog
  organization]`
- [ ] **Discuss hardening the colon-id convention from
  example-by-implication into an explicit spec rule** —
  define `prefix:tail` precisely (non-empty prefix) and audit every
  site that applies the convention for consistency `[cross-cutting]`
- [ ] **Discuss the sigil as a first-class category** — a canonical
  sigil registry recording what each sigil is shorthand for and how
  author-requested sigils are added, reconciled with the DSL registry
  and `sigil-mapping`. Cross-references the hash-sigil dispatch and
  opacity bugs above (which are concrete instances in the same area)
  `[cross-cutting]`
- [ ] **Discuss auditing documented language features against
  test-fixture coverage** — a documented spec example (the
  hash-sigil heading in `shorthand-syntax.md` Example 9) had zero
  fixture coverage, which is how the `#`-sigil bug stayed latent;
  decide whether and how to systematically close such gaps
  `[tests/build]`

### Architecture tier

- [ ] **Build JATS export (`rehypeAcadamarkToJats`)** `[interpreter]`
  *(`formerly DF-18`)*
- [ ] **Build render-mode lowering** `[cross-cutting]` — gated by the
  Layer 2 heading-level discussion *(`formerly DF-19`)*
- [ ] **Build multi-file authoring** (`acadamark.yml` + `<include>`)
  `[cross-cutting]` *(`formerly DF-4`)*
- [ ] **Build book / book-part document structuring**
  `[cross-cutting]` *(`formerly DF-12`)*

### Standing items

- [ ] **Run a spec-completeness audit against the rebuild-from-docs
  standard** — one-time large; future passes will be ordinary
  `[specs/docs]`

### Explicitly deferred — parked

- **The unbraced-inline `@` form** `[parser]` *(parked; revisit only
  if/when the bare `@key` affordance is wanted)*

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

- **The Layer 0 verification group** — four small code-checks that
  each probably close their respective item; a single grouped slice
  can run all four. Closing them visibly tightens the open-work
  surface.

- **Have `integration.test.js` import the real pipeline from
  `index.js`** *(`formerly AUD-17`)*. A safety check that can silently
  certify a broken pipeline as correct — a hole in a verification
  mechanism, demonstrated by four recurrences (R3a / R3b / R4 / G1b).
  Small, well-bounded; high priority.

- **Fix double KaTeX CSS injection in math documents**
  *(`formerly AUD-19`)*. Concentrated change in the asset-injection
  path in `packages/acadamark-interpreter/src/index.js`. ~370 KB
  wasted per math document; no rendering impact.

- **Fix stale `related_plugins` plugin names in three vocabulary
  entries** *(`formerly AUD-24`)*. Small live-file fix in three
  vocabulary entries; no code change.

- **Make `<ref>` honor its parsed attributes**
  *(`formerly PG-3, PG-4, PG-5`)*. One slice scope — make `<ref>`
  honor its parsed `format` / `type` kwargs, pipe content, and
  `+link`/`+preview`/`+title` flags.

---

## Layer 0 — verify first (detailed)

The four items below describe problems that the NORM-tables slice
(commit `ec0d071`, 2026-05-22) and the math-normalization arc appear to
have resolved — but the source entries were never updated as the arcs
landed. Each is a small **verification item**, not feature work: read
the relevant code in
`packages/acadamark-interpreter/src/plugins/normalize-markdown.js` and
`packages/acadamark-interpreter/src/index.js`, confirm the construct
behaves as the closure would imply, close the item with a milestone
line in `STATUS.md`. The four are near-identical in shape and can be
handled as one grouped slice.

- **Verify GFM table support via `remark-gfm`** `[parser+interpreter]`.
  Originally filed when `remark-gfm` was absent and
  `| h1 | h2 |\n|---|---|` parsed as paragraph text. The
  `<table md | ...>` form was the documented workaround. `remark-gfm`
  is now installed in `acadamark-interpreter` and threaded into both
  the outer and inner processors; bare GFM pipe tables normalize to
  canonical `<table md | ...>` nodes via `acadamarkNormalizeMarkdown`.
  **SUSPECTED CLOSED — verify against NORM-tables (commit `ec0d071`) /
  the math-normalization arc; close if confirmed.**
  *(`formerly AUD-06`)*

- **Verify GFM pipe-table normalization to canonical `<table md>`**
  `[parser+interpreter]`. Same root as the previous item — `BUILD.md`'s
  initial dependency list named `remark-gfm` but the package was never
  installed at filing time. Now installed and the lexer-to-canonical
  bridge exists via the normalization pass. **SUSPECTED CLOSED —
  verify against NORM-tables (commit `ec0d071`); close if confirmed.**
  *(`formerly DF-20`)*

- **Verify bare `$…$` math normalization to canonical `<$>`**
  `[parser+interpreter]`. Originally filed when `remark-math` was not
  installed and the open question OQ-1 (below) was undecided. The
  `<$ | x $>` sigil form worked but bare `$x$` produced paragraph
  text. `remark-math` is now installed on both surfaces; `inlineMath`
  and `math` nodes are rewritten to canonical `acadamarkTag` `$` /
  `$$` nodes by `acadamarkNormalizeMarkdown`. **SUSPECTED CLOSED —
  verify against the math-normalization arc / commit `ec0d071`; close
  if confirmed.** *(`formerly DF-22`)*

- **Verify bare math inside recursive content (e.g. inside `<aside>`)**
  `[parser+interpreter]`. Originally filed in `notes/specs/idioms.md`
  as an open question: whether bare `$x$` inside `<aside | ...>`
  should be treated as inline math. The design half is settled by the
  normalization principle (yes; it normalizes to the `$` node);
  functionally, bare math now works on both surfaces. **SUSPECTED
  CLOSED — verify the integration produces the intended behavior;
  close if confirmed. A separate math-coverage Phase 0 may still be
  worth scoping if the explicit adequacy table is wanted — its purpose
  would be a three-column table of acadamark's intended math surface,
  `remark-math`'s tokenizer coverage, and acadamark's existing
  DSL-math coverage (`<matrix>`, `<cases>`, `<align>`, `<eqnarray>`)
  — but OQ-1 as an open *question* is no longer open.**
  *(`formerly OQ-1`)*

---

## Layer 2 — gated items (detailed)

### Decide section-title heading level when an article-title is present
`[cross-cutting — specs/docs + interpreter]`

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

**Fix self-closing `<tag />` for DSL-registry tags** `[parser]`.
Self-closing `<tag />` for DSL-registry tags (DF-21, formerly also
tracked as AUD-08). *(`formerly DF-21, AUD-08`)*

**Add blank-line termination error recovery in the micromark finder**
`[parser]`. The micromark finder needs to check each line ending and
terminate open constructs at blank lines for localized error recovery.
Currently a tag opened before a blank line will consume across the
blank line or to EOF. Explicit `Status: Deferred` in
`notes/specs/recursive-content-spec.md`. Under the re-tiered
always-renders guarantee in `notes/specs/principles.md`, this is a
known shortfall against the guarantee, not a permitted exception: the
"errors stay bounded so the rest of the document is seen" half is
currently violated when EOF-consumption occurs. The route to closing
it is partly a design question and partly an implementation question;
the item stays open until both are settled. Sibling of the
parser-error-node-renderer item below; both must close for the
always-renders guarantee to hold in full. *(`formerly DF-16`)*

**Render parser-error nodes visibly at their source location**
`[interpreter]` — `acadamarkTagError` / `acadamarkParseError` visible
at source location (always-renders core-guarantee work). The parser
produces `acadamarkTagError` and `acadamarkParseError` nodes for
grammar and parse failures, but the interpreter has no compile-step
handler registered for these node types, so they currently fall
through silently in the rendered output. The always-renders guarantee
(`notes/specs/principles.md`) requires them to render visibly at their
source location — in the same house style the interpreter already uses
for other "the author wrote a reference the system couldn't resolve"
cases: `??ref: id??` for an unresolved cross-reference, `??cite: key??`
for an unresolved citation, an inline table-parse-error marker for a
malformed table body. The parser-error markers should follow the same
pattern. Sibling of the blank-line termination item above; both must
close for the always-renders guarantee to hold in full. The more
impactful of the two, since until it closes even bounded parser errors
are invisible in the rendered output. Fix path: register a compile-step
handler in `packages/acadamark-interpreter/src/index.js` for the
`acadamarkTagError` and `acadamarkParseError` mdast node types that
emits a hast element with the house-style marker text and a
distinguishing class for styling, mirroring how the unresolved-ref and
unresolved-cite markers are emitted today.

**Make `<ref>` honor its parsed attributes** `[interpreter]`.
`format`/`type` kwargs ignored (PG-3); author pipe-text ignored
(PG-4); `+link`/`+preview`/`+title` flags ignored (PG-5). Effectively
**one slice** — "make `<ref>` honor its parsed attributes."
*(`formerly PG-3, PG-4, PG-5`)*

**Close small citation/config bugs** `[interpreter]`. Multi-key cite
ordering (PG-8); nested `<config>` not read (PG-9);
trailing-whitespace-before-EOL treated as inline (PG-11).
*(`formerly PG-8, PG-9, PG-11`)*

**Stop `<config>` silently accepting metadata kwargs that belong in
`<meta>`** `[interpreter]`. `<config>` silently accepts metadata
kwargs that belong in `<meta>` (`title=`, `subtitle=`, `author=`,
`date=`). The kwargs produce no warning and no visible output. The
bug is doubly bad because the syntactic ease of `<config>` (kwargs on
one tag) is more attractive than `<meta>` (nested tags), so authors
default to it. Fix path: `<config>` should validate its accepted
kwargs and warn on unknown ones (especially metadata-shaped ones);
specs should clearly distinguish `<meta>` (document metadata) from
`<config>` (document options). Severity: medium — silent failure mode
that produces no visible output. Touches DD-3 in `DESIGN.md` (the
`<meta>` vs `<config>` boundary). *(`formerly AUD-13`)*

**Fix double KaTeX CSS injection in math documents** `[interpreter]`.
Documents containing math (e.g. `document-5`, `document-6`) carry the
KaTeX stylesheet **twice** — a small block (~12 KB) and the full
block (~370 KB), as two separate `<style>` elements. Math-free
documents have it once. No appearance impact. Fix path: in the
asset-injection path in
`packages/acadamark-interpreter/src/index.js`, identify where KaTeX
CSS is injected and guard against double-injection (e.g. check
whether a KaTeX `<style>` block is already present before appending
another). Severity: medium — wasted bytes, no rendering impact.
*(`formerly AUD-19`)*

**Fix stale `related_plugins` plugin names in three vocabulary
entries** `[vocab]`. Three vocabulary entries in
`packages/layer1-vocabulary/elements/` have `related_plugins` sections
naming plugins that no longer match the implemented names. `cite.md`
says `acadamarkCitationResolution` (actual: `acadamarkCiteResolution`).
`ref.md` says `acadamarkCrossReferenceResolution` (actual:
`acadamarkRefResolution`) and calls it a "rehype plugin" when it runs
as an mdast plugin. `note.md` says `acadamarkNoteNumbering` (actual:
`acadamarkNotes`; numbering and placement were merged into one
plugin). Small live-file fix; no code change. *(`formerly AUD-24`)*

**Update `table.md`'s `<csv | …>` example to mark it planned until the
DSL handlers land** `[specs/docs]`.
`packages/layer1-vocabulary/elements/table.md` includes a shorthand
example using `<csv | name,price\n...>`. This form relies on the
`<csv>` shortcut tag, which is registered in DSL_REGISTRY but not yet
implemented (DF-8). The example will mislead authors. Fix: remove or
mark the `<csv>` example as "planned" until the shortcut tag lands.
*(`formerly AUD-07`)*

**Have `integration.test.js` import the real pipeline from `index.js`
instead of hand-mirroring it** `[tests/build]`. The test maintains a
separate manual copy of the plugin pipeline assembled in
`src/index.js`. The two are not linked — every pipeline change must be
duplicated by hand, with nothing enforcing it. **Recurrence record:
paid four times** — R3a (2026-05, `fillNotes` import drift, first
surfacing); R3b (2026-05, pipeline reordering); R4 (2026-05,
`buildCitationIndex` stage change); G1b (2026-05,
`document-10-shortcuts.acm` integration block added by hand). Fix
path: have the integration test import and use the real pipeline
assembly from `index.js` rather than rebuilding it. Small,
well-bounded cleanup; a good early candidate. Severity: medium —
maintenance hazard, not a current bug. *(`formerly AUD-17`)*

**Fix the `#`/`##`/`###` hash-sigil dispatch** `[interpreter]`. The
parser's `SigilTag1`/`SigilTag2`/`SigilTag3` rules emit literal `"#"`,
`"##"`, `"###"` as the `acadamarkTag` node's tagname — matching the
established sigil pattern (`$`/`$$`/`` ` ``/` ``` ` likewise emit
literal sigils as tagname). But `acadamark-core/src/sigil-mapping.js`'s
`PARSER_TO_VOCAB` only maps the dollar and backtick sigils to vocabulary
keys; the hash sigils have no entry. `resolveVocabKey('#')` therefore
returns `'#'` unchanged, `vocabulary.get('#')` finds nothing, and the
interpreter produces a `<span data-acadamark-unknown="#">…</span>`
fallback for any `<# heading #>`. Spec-documented hash-sigil heading
form (`shorthand-syntax.md` Example 9) is silently unsupported. The bug
is **latent today** — no test fixture exercises `<#>`/`<##>`/`<###>`,
which is how it stayed undetected (see also the coverage-audit
Discussion item below). Confirmed by Slice 4 Phase 0's Q7 investigation,
verdict (c). Likely fix: add entries to `PARSER_TO_VOCAB` (`'#' →
'section'`, `'##' → 'sub-section'`, `'###' → 'sub-sub-section'`); but
**couple this fix to the opacity-discrepancy item below** — both belong
to the hash-sigil family and should be done as one coherent piece.

**Fix hash-sigil `isOpaqueContent` discrepancy** `[parser]`.
`shorthand-syntax.md` L563 says hash sigils are
prose-bearing with `contentHandler: 'default'` and
`isOpaqueContent: false`; the grammar at
`packages/remark-acadamark/grammar/acadamark.peggy` lines 113–144
explicitly emits `isOpaqueContent: true` for all three hash-sigil
rules. One side is wrong. Surfaced as the adjacent finding alongside
Slice 4 Phase 0's Q7. Couple this fix to the hash-sigil dispatch
item above — same family, same coherent piece of work, likely the
same slice.

**Update `shorthand-syntax.md` §"What the parser produces" to list
the full 12-field tag shape** `[specs/docs]`. The spec passage at
§"What the parser produces" enumerates 10 short-form fields on the
`acadamarkTag` node (`type`, `form`, `tagname`, `positional`,
`booleans`, `kwargs`, `id`, `classes`, `content`, `isOpaqueContent`),
but the parser's grammar `makeNode` factory at
`packages/remark-acadamark/grammar/acadamark.peggy` produces 12 — the
spec is silent on `atRefs` and `selfClosing`. Surfaced as a
pre-existing spec gap during Slice 2 (the spec was the named authority
for the `acadamarkTag` builders, and the slice had to fall back on the
grammar's ground-truth output for the missing fields). Small fix:
add the two fields to the spec passage with their defaults
(`atRefs: []`, `selfClosing: false`) and a one-line note on what each
encodes. Not a code change.

### Enhancements

**Generalize the qualifying-tag pattern beyond `<table>`** `[parser]`.
Generalizing the qualifying-tag pattern beyond `<table>` (DF-17 —
note: already works *for* `<table>`). *(`formerly DF-17`)*

**Refine note placement — per-section footnote collection and margin
sidenotes** `[interpreter]`. Per-section footnote collection (PG-1);
margin-positioned sidenotes (PG-2). Both are placement refinements;
notes otherwise work. *(`formerly PG-1, PG-2`)*

**Make the bibliography heading a config kwarg instead of hardcoded**
`[interpreter]`. Hardcoded bibliography heading (PG-10 — a config
kwarg, very small). *(`formerly PG-10`)*

**Implement DSL handlers** `[interpreter — DSL surface]`. `<csv>`/`<tsv>`
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

**Add deferred vocabulary elements** `[vocab]`. Metadata
(`<keywords>`, `<publication-date>`); definition lists
(`<dl>`/`<dt>`/`<dd>`); inline-semantic (`<abbr>`, `<term>`,
`<glossary>`, `<glossary-entry>`); plus the theorem-family vocab
(DF-11b — sibling of DF-11a in the DSL handlers entry above). All
"to be specified" — each needs a short vocab spec, then a schema
entry. Group them; do as a batch.

Additional small-vocab candidates surfaced in the authoring-features
survey (archived 2026-05-23) and absorbed into this cluster — same
shape, same batch:

- **Programming-related inline elements**: `<kbd>` (keyboard input),
  `<var>`, `<samp>`, `<output>` (HTML-native; small schema entries).
- **Collapsible sections**: `<details>` / `<summary>` (HTML-native;
  pipe-content of `<details>` becomes `<summary>`, body becomes the
  expandable content).
- **Rich author metadata**: sub-elements within `<author>` —
  `<affiliation>`, `<orcid>`, `<email>`, `<corresponding>`
  (structured author info for journal venues and JATS export).
  Structurally similar to `<bib-entry>`.
- **Document-level metadata elements**: `<license>` (SPDX code),
  `<doi>`, `<short-title>` (or `short` kwarg on `<title>`),
  `<subject>` (document classifier), `<thumbnail>` (image for social
  sharing). Each is a small addition to `<meta>`'s allowed children.

*(`formerly DF-13, DF-14, DF-15, DF-11b`)*

**Document the tag-form × tag matrix and reconcile inconsistencies**
`[specs/docs]`. The grammar supports short-form (`<tag attrs>`),
pipe-content (`<tag attrs | inline content>`), multi-line
pipe-content, long-form (`<tag attrs>content</tag>` — only for
DSL_REGISTRY tags), and self-closing (`<tag attrs />` — broken for
DSL_REGISTRY per AUD-08). Different tags support different
combinations and the mapping is undocumented and inconsistent.
Authors have no clear guide. Fix path: audit every vocabulary entry;
create a unified `notes/specs/tag-forms-reference.md` showing the
full matrix; identify and fix inconsistencies; establish a principle
("all tags should support all forms that semantically make sense,
with the same output"). Severity: medium — not a runtime bug, but a
real documentation and design-discoverability issue.
*(`formerly AUD-15`)*

**Add forward-pointers from governed specs to design directions
DD-1..DD-5** `[specs/docs]`. `DESIGN.md`'s "Design directions
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
`[tests/build]`. `test/fixtures/document-9-demo.acm` and
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

### Planned work

**Implement strict mode (disable markdown idioms)** `[parser]`.
Bounded; disables markdown idioms. Under the normalization model,
strict mode is the mode in which the normalization pass has nothing
to do (no markdown-form nodes are produced). *(`formerly DF-2`)*

**Specify and implement `<html-passthrough>`** `[parser]`.
`<html-passthrough>` — needs a *spec* written first; it is "planned,
not yet specified." A design step precedes the code.
*(`formerly DF-3`)*

**Implement multi-column display rendering** `[interpreter]`. Spec is
`notes/specs/multi-column-display.md`; render-mode concern.
Independent leaf, low-priority unless a publication target needs it.
*(`formerly DF-5`)*

**Support caption-as-content for `<table>`, `<figure>`, similar (DD-1
/ DD-2 implementation)** `[cross-cutting]`. Citations inside the
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
framing. Severity: medium-high — affects real authoring need
(captions with citations). *(`formerly AUD-14`)*

### Discussions

**Decide whether `<data>` / `<library>` nodes need a cleanup pass
after `buildCitationIndex` reads them** `[interpreter]`.
`buildCitationIndex` reads `<data>` and `<library>` nodes at root
level but never removes or modifies them. Rendered output is
unaffected — no visible `<data>` content appears in any fixture, the
`INTERNAL_REGISTRY` returns `null` for them — but a cleanup pass
that removes them after their content is consumed has not been
decided. Low priority; observation, not malfunction. Potential
candidate for a follow-on `indexInputs` consolidation slice.
*(`formerly AUD-18`)*

**Discuss the canonical section form — markdown `##` heading vs
`<#>` sigil tag** `[cross-cutting]`. A discussion item, not a build
item. The shorthand spec (`notes/specs/shorthand-syntax.md`) and
DESIGN.md's implicit-closing section work are built around the `<#>`
sigil; markdown `##` headings also produce sections via remark's
built-in heading tokenizer. Two forms for the identical operation,
with no rule for which to use, violates the "explicit, consistent"
principle. The decision settles which form is canonical and how the
other relates to it (probably: as the markdown-form shorthand the
normalization principle would expect). Once decided, the result is
reconciled into DESIGN.md and `notes/specs/shorthand-syntax.md`.

**Starting position for the discussion (not a settled answer):**
markdown headings are likely the convenience form and `<#>` is
canonical when an id or attributes are needed — because `<#>` is the
form that carries an id, and any cross-referenced section needs an
id. The discussion may settle differently; this is a starting framing
harvested from the now-archived
audit-cleanup-stopping-point's FLAGGED-1, not a prescribed answer.

Filed under the discussion-is-work rule (`CONTRIBUTING.md`).

**Discuss whether the cross-reference resolver should warn on
type-prefix mismatch** `[interpreter]`. A discussion item, not a
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

**Discuss compact external-reference syntax** `[parser]`. A
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

**Discuss external-link rich previews** `[interpreter]`. A discussion
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

**Discuss just-in-time math symbol definitions** `[cross-cutting]`.
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

**Discuss executable code blocks (Jupyter-style)** `[cross-cutting]`.
A discussion item, not a build item. Authors annotate a code block to
mark it for execution; the build runs the code in a kernel, captures
stdout/stderr/return value/plot output, and embeds the result.
Established convention via RMarkdown / Quarto / Jupyter. The
DSL-processor model in DESIGN.md provides the substrate: an
executable-code processor is one more processor extending the
registry. The execution-control attribute convention (`+eval`,
`+echo`, `+output`, `+error`, `cache`, `dependencies`) matches
existing tooling. The decision settles whether acadamark commits to
this direction.

**If adopted, this is an Architecture-tier-sized effort, not a
Layer 3 slice.** It brings in a kernel, sandboxing (untrusted code
execution is a security boundary), output capture, caching,
dependency management. If the discussion concludes "yes," the item
graduates from this discussion item to an Architecture-tier arc
(parallel to JATS export, multi-file authoring, book types) — that
is the discussion-is-work rule's defined exit when a discussion
commits to substantial work. Filing here at Layer 3 honestly reflects
that the commitment to do it does not yet exist; what exists is the
question of whether to commit. Harvested from
`notes/archive/authoring-features-survey-2026-05.md`. Filed under the
discussion-is-work rule.

**Discuss `<presentation>` / `<slide>` / `<slide-notes>` Layer 1
vocabulary** `[vocab]`. A discussion item, not a build item: the
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
authoring** `[cross-cutting]`. Surfaced by the Front C
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
display** `[cross-cutting]`. Surfaced by the Front C
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

**Discuss smart-typography conversions** `[parser]`. Markdown
extensions convert `--` to en-dash and `---` to em-dash. Whether
acadamark's pipeline accepts such a plugin — and what the escape
conventions for those sequences look like if it does — is open.
Filed from the spent "what is not yet decided" section of
`escape-rules-spec.md` (Reconciliation 2). If adopted, the escape
rules for `--` / `---` follow whatever plugin acadamark accepts;
acadamark does not own these escapes natively.

**Discuss bare-idiom shortcuts for underline and strikethrough**
`[parser]`. Markdown lacks clean conventions for underline and
strikethrough. Acadamark currently uses `<u | text>` and `<s | text>`
tagged forms. Whether to add bare-idiom shortcuts (and what they
would be) is open. Filed from the spent "what is not yet decided"
section of `escape-rules-spec.md` (Reconciliation 2). If shortcuts
are added, the special-character list and escape rules grow to match.

**Discuss meaningful names for the `Layer 0/1/2/3 / Architecture /
Standing` structure** `[specs/docs — backlog organization]`. A
discussion item, not a build item. The current names encode
dependency/readiness (verify-first; foundational; gated; free leaves;
multi-slice arcs; cadence work) and are mechanically clear, but the
labels read as opaque codes rather than as their intended meanings.
"Layer 3" reads as a code, not as "free leaves you can pick anytime";
"Layer 1" is empty and the framing for what would go there is
implicit; the "Architecture tier" and "Standing items" labels each
describe themselves better than "Layer N" does. The decision settles
whether to rename (and to what — plain-language headings like
"Verify first" / "Foundational" / "Gated" / "Free leaves" /
"Architecture" / "Standing" are one direction; some other framing
entirely is another) or to keep the current names with a clearer
explanation. Filed under the discussion-is-work rule
(`CONTRIBUTING.md`).

**Discuss the backlog's item-counting convention** `[specs/docs —
backlog organization]`. A discussion item, not a build item. The
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
rule** `[cross-cutting]`. Today the colon-id convention is defined by
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

**Discuss the sigil as a first-class category** `[cross-cutting]`.
Acadamark uses a small set of sigils — `#`/`##`/`###` for sections,
`$`/`$$` for math, `` ` ``/` ``` ` for code — as non-alphabetic
shorthands for Layer 1 constructs. The DSL registry
(`acadamark-core/dsl-registry`) records what content handler each
sigil dispatches to; `acadamark-core/sigil-mapping` records what
vocabulary key each sigil resolves to. These two registries live
side by side without a documented relationship, and the hash-sigil
bugs filed above are concrete failures at exactly the seam between
them (the parser emits a sigil tagname; the registries don't fully
agree on what to do next). This discussion item: define the sigil as
an explicit first-class concept — a canonical registry recording, per
sigil, its parser tagname, its content handler, its vocabulary key,
its opacity expectation, and how author-requested new sigils are
added — and reconcile the existing `dsl-registry` and `sigil-mapping`
under that explicit model. Cross-references the two hash-sigil Bug
items above (concrete instances in the same area). Filed under the
discussion-is-work rule.

**Discuss auditing documented language features against test-fixture
coverage** `[tests/build]`. The hash-sigil heading is documented in
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

- **Build JATS export (`rehypeAcadamarkToJats`)** `[interpreter]`. The
  vocabulary is JATS-aligned by design (`jats_counterpart` on every
  entry); this is the payoff. *(`formerly DF-18`)*
- **Build render-mode lowering** `[cross-cutting]`. Display-target-three
  on the display ladder. Gated by OQ-2 (Layer 2 above) — the
  heading-level question must be decided when render mode is scoped.
  *(`formerly DF-19`)*
- **Build multi-file authoring** `[cross-cutting]`. `acadamark.yml` +
  `<include>`; project-wide registries. A real architectural
  extension. Spec at `notes/specs/multi-file-authoring.md`.
  *(`formerly DF-4`)*
- **Build book / book-part document structuring** `[cross-cutting]`.
  Vocabulary exists; `article-structuring.js` currently warns and
  skips non-article types. *(`formerly DF-12`)*

---

## Explicitly deferred — parked

**The unbraced-inline `@` form** `[parser]`. `…as shown (@fig:priority)…`
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
`[specs/docs]` *(one-time large; future passes will be ordinary)*

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
