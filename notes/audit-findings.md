# Audit findings

Findings collected during drift checks and implementation work. Each is filed for
a future prompt; none are silently fixed here.

---

## AUD-01: Equation number not right-aligned (cosmetic)

**Found during:** Slice 4 doc6 review and hover-preview slice.

**Description:**
Display-math equation numbers (e.g. `(1)`) are currently rendered as a `<span class="equation-number">` appended after the KaTeX `<span class="katex-display">` block. The `<display-math>` element uses `text-align: center`, which centers the number alongside the equation rather than pushing it to the far right margin. The conventional typographic placement for AMS-style equation numbers is right-aligned, with the equation centered in the remaining space.

**Current HTML output:**
```html
<display-math id="eqn:newton">
  <span class="katex-display">...(math)...</span>
  <span class="equation-number">(1)</span>
</display-math>
```

**Current CSS:**
```css
display-math { display: block; margin: 1rem 0; text-align: center; }
```

This centers both the KaTeX block and the number span on a single line.

**Expected:** equation centered in column, `(N)` pinned to the right margin (standard AMS layout).

**Fix approach:** Use `position: relative` on `display-math`, `position: absolute; right: 0` on `.equation-number`. Or use a flex/grid layout on `display-math`. Either requires a themes/CSS slice.

**Deferred to:** themes / CSS polish slice.

**Status: Fixed (slice 7 CSS work, confirmed 2026-05-21).** `default.css` was
updated during slice 7 to use `display: flex; align-items: center` on
`display-math`, with `.katex-display { flex: 1 }` (fills available width,
equation centered within) and `.equation-number { flex: 0 0 auto; text-align:
right }` (sits flush right). Visual verification confirmed via browser screenshot:
numbered equations centered, equation number at far right margin; unnumbered
equations centered across full width. No code change was needed for this finding
— it was already fixed in slice 7 but never closed.

---

## AUD-02: Pipeline diagram drift in `notes/interpreter-design.md`

**Found during:** Drift check after Slice 4.

**Description:**
`notes/interpreter-design.md` contains a pipeline diagram that shows the interpreter as a rehype plugin operating after `remarkRehype`. The actual implementation uses mdast-level transforms (`configDiscovery`, `articleStructuring`, `sectionNesting`, `notes`, `numbering`, `refResolution`) applied before `toHast`, with element-specific rendering delegated to hast `handlers` passed into `toHast`. There is no rehype plugin step in the live pipeline.

The diagram also does not show `configDiscovery` or `refResolution` as distinct pipeline stages.

**Fix approach:** Redraw the pipeline diagram in `interpreter-design.md` to match the actual plugin order:
```
configDiscovery → articleStructuring → sectionNesting → notes → numbering → refResolution → toHast(handlers) → rehype-stringify
```

**Deferred to:** documentation audit slice.

**Status: Resolved (F2 doc-staleness sweep, 2026-06).** `notes/interpreter-design.md` was
archived as `archive/interpreter-design-2026-05.md` during Q2 2026 with an archive
notice that correctly identifies the actual implementation (mdast-level transforms
before `toHast`, not a rehype plugin). `notes/interpreter.md` (written in the same
audit) is the live architecture reference. No separate diagram correction was needed.
AUD-02 closed.

--- `notes/hover-previews-deferred.md` no longer accurate

**Found during:** Hover-preview slice.

**Description:**
`notes/hover-previews-deferred.md` was written when hover previews were deferred. The feature has now been implemented (Slice 3 for notes, current slice for ref links). The file title and content describe it as future work.

**Fix approach:** Either update the file to describe the implemented state, rename it, or archive it.

**Deferred to:** documentation audit slice.

**Status: Resolved (F2 doc-staleness sweep, 2026-06).** `notes/hover-previews-deferred.md`
was archived as `archive/hover-previews-deferred-2026-05.md` during Q2 2026 with an
archive notice correctly stating the feature is implemented. Hover preview architecture
is documented in `notes/interpreter.md` section 10.2 and `notes/pipeline.md` section 6.
No live doc correction was required. AUD-03 closed.

--- No-pipe/no-content short form not supported for table (or any tag)

**Found during:** Slice 5 tables.

**Description:**
A table with only kwargs and no inline data was written as:
```
<table #id csv src=file.csv caption="...">
```
This is parsed by the micromark extension as a **long-form tag** opening (looking for `</table>`) rather than a short-form no-content tag. The parser has no distinct form for a zero-content short tag without a pipe.

**Workaround in use:** `<table #id csv src=file.csv caption="..." | >` — the pipe with a trailing space serves as an explicit empty-content short form.

**Spec impact:** `notes/shorthand-syntax.md` should document the `| >` empty-content idiom for zero-content short-form tags, and `notes/escape-rules-spec.md` should confirm it's unambiguous.

**Deferred to:** parser specification clarification slice.

---

## AUD-05: Shortcut tags `<csv>` and `<tsv>` registered but unimplemented

**Found during:** Slice 5 tables.

**Description:**
`packages/remark-acadamark/src/dsl-registry.js` already has entries `['csv', 'csv']` and `['tsv', 'tsv']` as registered DSL contentHandlers. However, no vocabulary entries exist for `csv` or `tsv` as standalone tagnames, and no handlers are registered. Using `<csv | ...>` would fall through to a `warnUnknownTag` and produce an unknown-element output.

**Fix approach:** Either implement them as aliases for `<table csv | ...>` in a dedicated shortcut-alias slice, or document them as deferred.

**Deferred to:** shortcut-tags slice.

---

## AUD-06: Plain markdown table syntax not supported (remark-gfm not installed)

**Found during:** Slice 5 tables.

**Description:**
GFM pipe tables (` | h1 | h2 |\n|---|---| `) are a natural authoring form and are mentioned in `table.md` shorthand examples. However, `remark-gfm` is not installed in the workspace. Without it, remark parses pipe-table lines as paragraph text.

The `<table md | ...>` form provides equivalent capability via the hand-written pipe-table parser in `table.js`, but the plain (untagged) form doesn't work.

**Fix approach:** `npm install remark-gfm` in `remark-acadamark` package and wire it into the default parser; confirm it doesn't break existing tests.

**Deferred to:** GFM compatibility slice.

---

## AUD-07: `table.md` shorthand_examples reference `<csv | ...>` shortcut form

**Found during:** Slice 5 tables.

**Description:**
`packages/layer1-vocabulary/elements/table.md` includes a shorthand example using `<csv | name,price\n...>`. This form relies on the `<csv>` shortcut tag which is registered in DSL_REGISTRY but not yet implemented (AUD-05). The example will mislead authors.

**Fix approach:** Remove or mark the `<csv>` example as "planned" until AUD-05 is resolved.

**Deferred to:** shortcut-tags slice (coordinate with AUD-05).

---

## AUD-08: Self-closing tag form (`<tag />`) is broken when tag is in DSL_REGISTRY

**Found during:** Slice 6 Phase 0 investigation.

**Description:**
When a tag is registered in DSL_REGISTRY for long-form nesting, the micromark
long-form tokenizer in `syntax.js` takes precedence over the Peggy
`SelfClosingNamedTag` rule. The tokenizer consumes the `/` before `>` as a
regular attribute character (not a self-closing signal), commits to long-form
mode looking for `</tagname>`, and fails to find a closer — producing
`acadamarkTagError` instead of a self-closing node.

Currently affects `library` (the only DSL_REGISTRY tag where authors would
plausibly use self-closing).

Example:

```
<library src="refs.bib" />     ← produces acadamarkTagError, not a parsed tag
```

**Workaround:** Use empty-body long-form syntax:

```
<library src="refs.bib">
</library>
```

This form works correctly: `library` is parsed with `kwargs.src = "refs.bib"` and
`content = "\n"` (whitespace only), which the library-load plugin ignores in favour
of reading the file.

**Fix path:** `syntax.js` long-form tokenizer needs `/>` awareness for early-exit
before committing to long-form mode. Specifically, `makeNamedTagTokenizer` in the
token-scanning path must check whether the `>` it has found is immediately preceded
by `/` (optionally with spaces: `/ *>`). If so, it should not emit the long-form
opening token. This affects the micromark tokenizer layer (not just Peggy), so
investigation is needed before implementation.

**Deferred to:** parser-polish slice after Slice 6 lands.

## AUD-09: Section and code-block ids not referenceable via `<ref>`

**Found during:** Slice 7 demo document authoring.

**Description:**
The ref-resolution plugin (`src/plugins/ref-resolution.js`) has `sec:` in its
`DEFAULT_PREFIXES` dictionary, suggesting sections should be referenceable.
But the numbering plugin (`src/plugins/numbering.js`) only registers `$$`
(equations), `figure`, and `table` nodes in the registry — sections and code
blocks are never assigned entries, so any `<ref #sec:...>` or `<ref #code:...>`
will always produce a ref-error.

A secondary issue: markdown headings (`## Title {#id}`) do not create ids in the
hast output. The GFM/remark pipeline does not support the `{#id}` attribute
syntax natively. Section ids must be authored via the shorthand sigil form
(`<## #sec:myid | Title>`) — but even that would not create a registry entry.

**Examples that fail:**
```
<## #sec:intro | Introduction>
...
See <ref #sec:intro>.        ← always ref-error; sections not registered
```

**Fix path:** The numbering plugin should be extended to walk `<#>`, `<##>`, and
`<###>` nodes and register them with type `"section"` (and sub-section, etc.),
using the node's `id` if it contains `:`. This would populate the registry so
ref-resolution can find them. Code blocks are a separate question — `code:` is
not in DEFAULT_PREFIXES — but adding it and registering labelled code blocks
would follow the same pattern.

**Partial fix in R2 (2026-05-22):** Section registration is now done by the
discovery walk in `numbering.js`. The `section`/`sub-section`/`sub-sub-section`
visitors call `registry.assign('section', node.id || null, { numbered: false })`,
so colon-label ids land in the registry's label index and `<ref #sec:intro>`
resolves. `ref-resolution.js` is unchanged — it already queries the label index,
so it finds sections automatically.

**Code-block registration: deferred.** Code blocks have a representation
question — a code block is only an `acadamarkTag` (reachable by `.content`
descent) when written in the shorthand-wrapped form `<code #code:snippet | ...>`.
Plain fenced code blocks are mdast `code` nodes with no shorthand wrapper and
no `id` field accessible to the discovery walk. Registering code blocks requires
either (a) deciding that only shorthand-wrapped code blocks are referenceable
and adding a `code` visitor in a later slice, or (b) a design pass on whether
plain fenced `code` nodes should also support colon-ids. Neither is done in R2;
this is left for a future investigation.

**Code-block half resolved (G4, 2026-05-23).** Decided option (a): only
shorthand-wrapped code-block sigil nodes with colon-ids are referenceable. A
`'```'`-tagname visitor added to `numbering.js` registers these nodes with
`numbered: false`. `code: 'listing'` added to `DEFAULT_PREFIXES` in
`ref-resolution.js`. `<ref @code:snippet>` now resolves; plain fenced code
blocks remain non-referenceable by design. 25/25 tests pass including 4 unit
tests, 2 ref-resolution tests, and a document-13 integration test.

**Status: Fully resolved.** Section half fixed in R2; code-block half fixed in G4.

---

## AUD-10: KaTeX CSS relative font URLs fail when CSS is inlined

**Found during:** Slice 7 follow-up (Finding 3), visual verification.

**Description:**
`katex.min.css` references fonts as `url(fonts/KaTeX_*.woff2)` — relative URLs
that resolve relative to the CSS file location on a web server. When the CSS is
inlined in a `<style>` block in an HTML document, these URLs resolve relative to
the HTML document's location instead. Since KaTeX font files are only present in
`node_modules/katex/dist/fonts/` and are not copied alongside rendered HTML
output, all KaTeX glyphs rendered as fallback characters.

**Fix applied:** `src/assets/font-loader.js` exports `patchKatexFontUrls(rawCss)`
which replaces each `url(fonts/KaTeX_*.woff2)` reference with a base64 data URI.
`getKatexCss()` in `src/index.js` now calls this patcher before caching. KaTeX
CSS served inline is now fully self-contained. See `notes/font-investigation.md`.

**Status: Fixed.**

---

## AUD-11: System font stack unreliable in WSL/Linux — body text falls back to serif

**Found during:** Slice 7 follow-up (Finding 3), visual verification.

**Description:**
`default.css` specified `--acm-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`.
None of those fonts are installed in the WSL/Linux environment used for development,
so the browser fell back to its default serif font (Times New Roman or equivalent),
making body text of rendered fixtures look like LaTeX output rather than a modern
journal.

**Fix applied:** Inter (body/headings) and Source Code Pro (monospace) woff2 files
are now subsetted to Latin ranges, stored in `src/assets/fonts/`, and base64-encoded
at render time by `src/assets/font-loader.js`. `render-fixtures.js` prepends the
`@font-face` rules to the shell `<style>` block. `default.css` font tokens updated
to name `'Inter'` and `'Source Code Pro'` first, with system-stack fallbacks for
consumers that don't use the font loader. See `notes/font-investigation.md`.

**Status: Fixed.**

## AUD-12: `<quote>` / `<blockquote>` vocabulary gap and ambiguous status

**Found during:** Slice 7 follow-up, Document 9 review.

**Status: Fixed (2026-05-21)**

Design decision: `<blockquote>` is the canonical Layer 1 element per naming rule 2 ("defer to HTML where HTML is sufficient"; `blockquote` is explicitly listed in the "stays HTML" group). `<quote>` is registered as a shorthand alias. This is consistent with the existing `blockquote.md` vocabulary entry (which already declared `shorthand_expansions: [{shorthand: quote, expands_to: blockquote}]`) and with the naming rules.

Changes applied:
- `src/schema/load-vocabulary.js`: After the main vocabulary load loop, a second pass registers simple-name shorthand aliases from `shorthand_expansions` entries. Complex expansions (where `expands_to` contains a space, indicating additional attribute clauses) are skipped — those require attribute-injection at dispatch time and are deferred.
- `test/schema/load-vocabulary.test.js`: `v.size` updated 66 → 67; `'quote'` added to spot-check list; identity assertion `v.get('quote') === v.get('blockquote')` added.
- `test/interpret-plugin.test.js`: Two new tests: `<blockquote>` prose-unwrapping; `<quote>` shorthand producing `<blockquote>`.

The CSS for blockquote (left border, italic, padding) was already in place from slice 7 work. Both `<blockquote | ...>` and `<quote | ...>` now dispatch to the same vocabulary entry and produce identical output.

Note on concern 2 (HTML passthrough ambiguity): This is the scope of AUD-15. `<blockquote>` is now unambiguously a first-class vocabulary element — not passthrough.

**Description:**
No vocabulary entry exists for block quotations. Author tried `<quote>` (assumed it existed); did not work. Settled on `<blockquote>` which renders acceptably — but likely via raw HTML passthrough plus theme CSS (which styles `blockquote` directly), not via a first-class acadamark element with handler and plugin support.

**Two related concerns:**

1. Block quotations are common in academic writing and should be a first-class vocabulary item with vocabulary entry, handler, tests, and documentation.

2. The ambiguity between "first-class acadamark element" and "raw HTML passthrough that renders because the browser knows the element and CSS happens to style it" is broader than just this case. Other HTML-like tags (e.g. `<em>`, `<strong>`, `<table>` raw form, `<div>`, `<span>`) may work via passthrough without proper acadamark support. Authors have no way to know which is which.

---

## AUD-13: `<config>` silently accepts metadata kwargs that belong in `<meta>`

**Found during:** Slice 7 follow-up, Document 9 review.

**Description:**
Copilot's generated Document 9 placed document metadata (title, subtitle, author, date) as kwargs on `<config>`:

```
<config title="Participatory Methods in Autism Research"
        subtitle="Quantitative Approaches to Community-Centred Study Design"
        author="A. Balter"
        date="2025">
</config>
```

This is wrong. Title, subtitle, author, date are document metadata and belong in `<meta>`, not `<config>`. `<config>` is for document-level configuration options (citation-style, number-equations, theme settings, etc.).

The bug is doubly bad because:
1. `<config>` silently accepts the kwargs without error or warning.
2. The kwargs produce no visible output — Document 9 has no rendered title block.
3. Copilot defaulted to this because `<config>` with kwargs is syntactically simpler than `<meta>` with nested tags.

**Fix path:**
- `<config>` should validate its accepted kwargs and warn/error on unknown ones (or at least metadata-shaped ones).
- Spec docs should clearly distinguish `<meta>` (document metadata) from `<config>` (document options).
- Consider whether the syntactic friction of `<meta>` is itself the problem: if authors find `<config>`-with-kwargs easier than `<meta>`-with-nested-tags, the design has a discoverability/ergonomics issue.

**Severity:** Medium — silent failure mode that produces no visible output.

**Deferred to:** post-audit clarification slice.

---

## AUD-14: Citations in table captions (and other attribute values) not processed

**Found during:** Slice 7 follow-up, Document 9 review.

**Description:**
Table caption is provided via the `caption=` kwarg. The kwarg value is a string. Citation tags inside that string (or other rich content like emphasis, inline math) are NOT parsed as acadamark tags — they remain as literal text:

```
<table #tab:burnout csv caption="Risk and protective factors, adapted from <cite Mantzalas2022>" |
```

The cite-resolution plugin walks the AST looking for `<cite>` nodes. Cite tags written inside attribute string values aren't parsed into AST nodes — they're string content. So the citation is silently passed through as literal text in the rendered caption.

This affects more than just table captions: any kwarg value where rich content might be desirable (figure captions, alt text, etc.) has the same issue.

**Two architectural options for fix:**

**Option A: Captions become first-class child tags, not attribute values.**
```
<table #tab:burnout csv |
Domain,Risk,Protect
...
>
<caption | Risk and protective factors, adapted from <cite Mantzalas2022>>
```
Captions become parsed content. Recursive content parsing handles citations naturally. Matches Pandoc/Quarto conventions where captions are markdown blocks.

**Option B: Attribute values get recursive parsing.**
`caption="text <cite key>"` would parse the value as acadamark content, find the cite tag, render it. More invasive parser change. Affects all attribute values, not just captions.

**Recommended: Option A.** Cleaner architecturally. Treats rich content as content (parsed) rather than attribute strings (raw). Matches conventional document tooling.

This is potentially a meaningful architectural change for tables, figures, and any other element with caption-like attributes.

**Severity:** Medium-high — affects real authoring need (captions with citations).

**Deferred to:** post-audit caption-as-content slice.

---

## AUD-15: No documented inventory of which tag forms work for which tags

**Found during:** Slice 7 follow-up, Document 9 review (meta-architectural question).

**Description:**
The acadamark grammar supports several tag forms:
- Short form: `<tag attrs>`
- Pipe-content: `<tag attrs | inline content>`
- Pipe-content multi-line: `<tag attrs |\n multi-line content\n>`
- Long-form: `<tag attrs>content with possible nesting</tag>` (only for DSL_REGISTRY tags)
- Self-closing: `<tag attrs />` (broken for DSL_REGISTRY tags, per AUD-08)

Different tags support different combinations. The mapping is undocumented and inconsistent:

- `<table>`: pipe-content with CSV/TSV/etc. content; long-form also accepted but handler may not handle it correctly
- `<library>`: long-form with BibTeX content; pipe-content also accepted; self-closing broken (AUD-08)
- `<cite>`: short-form with positional keys; HTML long-form with comma-separated keys in content
- `<meta>`: long-form container with nested metadata tags; pipe-content unclear
- `<config>`: short-form with kwargs; long-form with empty body required by parser quirk; nested content unclear
- `<aside>`, `<note>`: long-form with recursive markdown content

Authors have no clear guide. The author-paramount principle requires that authors know what forms are available for what tags.

**Concrete gaps to inventory:**
1. Which vocabulary tags are in DSL_REGISTRY (support long-form nesting)?
2. For each tag, which forms work syntactically AND semantically (handler does the right thing)?
3. Which forms are documented in vocabulary entries vs. which are accidents of the parser?
4. Which forms produce equivalent output vs. which differ in subtle ways?

**Fix path:**
- Audit all vocabulary entries, document which forms each supports.
- Create a unified `notes/tag-forms-reference.md` showing the full matrix.
- Identify and fix inconsistencies (e.g. tags that work in long-form syntax but break in the handler).
- Establish a principle: probably "all tags should support all forms that semantically make sense, with the same output."

**Severity:** Medium — not a runtime bug, but a real documentation and design discoverability issue.

**Deferred to:** the audit itself, then a follow-up consistency slice.

---

## GAP-8 (or AUD-16): Body font bundling not wired into the main pipeline

`src/assets/font-loader.js` exports `getDocumentFontsCss()` which produces 
@font-face declarations with base64-encoded Inter and Source Code Pro fonts. 
`render-fixtures.js` (test infrastructure) wires this in via 
`getDocumentFontsCss()` prepended to the SHELL_CSS block.

`src/index.js` (the main interpreter pipeline) does NOT import or call 
`getDocumentFontsCss()`. Documents rendered through the standard 
`acadamarkInterpreter` plugin will not receive the bundled fonts and will 
fall back to the system font stack — which fails on environments where 
those system fonts aren't installed (e.g., WSL through Windows).

This means: fixture rendering produces visually-correct output. External 
consumers of the package will see degraded typography unless they happen 
to have the system fonts available.

**Fix path:** Import `getDocumentFontsCss` in `src/index.js` and inject 
its output alongside the KaTeX CSS injection (which is already wired). 
Small change.

**Severity:** Medium — affects the actual deliverable for any non-fixture 
use of the package.

**Status: Fixed (2026-05-21).** `getDocumentFontsCss()` is now imported in
`src/index.js` and injected unconditionally as a `<style>` element, prepended
before the article content. `render-fixtures.js` shell no longer injects it
separately. Document fonts are injected exactly once, by the interpreter. Test
assertions in `integration.test.js` and `katex-css.test.js` updated to reflect
that a `<style>` block is always present.
---

## GAP-9: document-9 has no integration test or snapshot

`test/fixtures/document-9-demo.acm` and `test/fixtures/document-9-demo.html`
exist and are re-rendered by `render-fixtures.js` alongside documents 1–8.
Unlike documents 1–8, document-9 has no corresponding `document-9-expected.json`
snapshot and is not covered by any test case in `test/integration.test.js`.

This matters because document-9 is the most complex fixture: it exercises
`<note>` (multiple footnotes with forward-reference numbering), `<cite>`
(bibliography entries loaded from an external `.bib` library), inline math,
display math with equation numbers, and `<cross-ref>`. These are exactly the
stages added or restructured in the R1 slice (notes, numbering, ref-resolution).

Without a snapshot test, regressions in any of these combined-pipeline paths
can go undetected. Documents 1–8 test these features in isolation or in
simpler combinations; the integration test for document-9 would be the only
test that exercises all of them together in a realistic academic document.

**Fix path:** Run `render-fixtures.js`, capture `document-9-demo.html` output,
generate `document-9-expected.json` from the current interpreter output, and add
a test case in `integration.test.js` mirroring the existing doc6/doc7/doc8
pattern. Snapshot can be generated once and committed; future runs will detect
any drift.

**Severity:** Medium — the untested surface area covers the full complexity
of the pipeline in combination. Individual stages have unit tests, but combined
behavior (notes + cite + math + numbering + cross-ref in one document) is dark.

## AUD-17: integration.test.js hand-mirrors the index.js pipeline

`test/integration.test.js` contains a manually-maintained copy of the
plugin pipeline assembled in `src/index.js`. The two are not linked —
any change to the pipeline in `index.js` must be duplicated by hand in
the test, and nothing enforces this. Surfaced during R3a: the test
independently imported `fillNotes` and broke when `index.js` was
updated. If the mirror drifts, the integration test silently exercises
a different pipeline than ships.

Fix path: have the integration test import and use the real pipeline
assembly from `index.js` rather than rebuilding it. Deferred — not in
R3a scope.

**Recurrence record:** The manual mirror has been paid four times:
- R3a (2026-05) — `fillNotes` import, first surfacing.
- R3b (2026-05) — pipeline reordering update.
- R4 (2026-05) — `buildCitationIndex` stage change.
- G1b (2026-05) — `document-10-shortcuts.acm` integration block added by hand.

Each occurrence strengthens the case for the recommended fix.

Severity: Medium — a maintenance hazard, not a current bug.

---

## AUD-18: `<data>` nodes remain in tree after `buildCitationIndex`

**Found during:** R4 Phase 0 investigation (2026-05).

**Description:**
`buildCitationIndex` (formerly the closure in `acadamarkLibraryLoad`) reads
`<data>` and `<library>` nodes at `tree.children` level but does not remove or
modify them. After the citation-index step runs, `<data>` nodes remain in
`tree.children` through cite-resolution, note-placement, bibliography, and
compilation. The compile step's `toHast` dispatch handles them, or silently
ignores them if `'data'` has no vocabulary entry producing visible output.

This is current behavior, not introduced by R4. The rendered output is
unaffected — no visible `<data>` content appears in any fixture. Whether
`<data>` should be explicitly removed after its content is consumed (as a
cleanup step) has not been decided.

**Deferred to:** Future cleanup slice or a follow-on indexInputs consolidation.

**Status: Open.**

---

## AUD-19: Double KaTeX CSS injection in math documents

**Found during:** Post-G1 review of rendered documents (2026-05).

**Description:**
Documents containing math (e.g. `document-5`, `document-6`) carry the KaTeX
stylesheet **twice** — a small block (~12 KB) and the full block (~370 KB),
as two separate `<style>` elements. Math-free documents (`document-7`,
`document-8`) have the stylesheet once. Effect: ~370 KB wasted per math
document; `document-5`/`document-6` render at ~710–737 KB vs ~336 KB for
math-free equivalents.

The bug does not affect appearance (the same CSS twice renders identically)
but is a real asset-injection defect, the same class as the old AUD-16
font-wiring gap.

**Fix path:** In the asset-injection path in `src/index.js`, identify where
KaTeX CSS is injected and guard against double-injection (e.g. check whether
a KaTeX `<style>` block is already present before appending another).

**Severity:** Medium — wasted ~370 KB per math document; no rendering impact.

**Status: Open.**

---

## AUD-20: GFM table normalization design decision — Option A chosen

**Filed during:** G3 (NORM math implementation slice), 2026-05-22.

**Description:**
GFM table normalization was investigated in NORM Phase 0 (see
`notes/audit-2026-Q2/NORM-phase0-findings.md` Q3 for the Option A/B/C
analysis). Three options were identified for converting a `remark-gfm` `table`
node (structured mdast with `tableRow`/`tableCell` children that may contain
inline markup) to a canonical `acadamarkTag` table node (opaque string payload).

**Decision (chat session, 2026-05-22):** Use **Option A** — the normalization
pass serializes a `remark-gfm` `table` node to a GFM pipe-table string and
produces a canonical `<table md | ...>` node. This keeps the normalized node
indistinguishable from authored `<table md>` shorthand (the normalization
principle) at the cost of being lossy for cells containing rich inline content
(emphasis, links, inline math), which flatten to plain text. Rich-celled tables
should be authored in the acadamark `<table>` form directly.

**Implementation (NORM-tables slice, 2026-05-22):**
1. `remark-gfm@4.0.1` installed in `acadamark-interpreter`.
2. `remarkGfm` threaded into both outer and inner processors in `index.js`.
3. `gfmTableToPipeString(node, file)` serializer in `normalize-markdown.js`.
4. GFM table entry added to `NORMALIZATIONS` in `normalize-markdown.js`.
5. `parseMd` in `table.js` updated to handle `\|` escape (required for
   Option A round-trip correctness; GFM spec escape sequence).
6. Tests: serializer unit tests (alignment, pipe-escape, markup-loss warnings),
   field-for-field identity with authored `<table md>`, footnote harmlessness,
   integration fixture `document-12-bare-table.acm`.

**remark-gfm footnote note:** `remark-gfm` bundles GFM footnotes (`[^1]`);
there is no option to disable footnotes alone. Footnote nodes are NOT matched
by any `NORMALIZATIONS` predicate and pass through the normalization walk
unchanged, reaching `mdast-util-to-hast`'s built-in handler. No collision with
the acadamark `<note>` system. No existing fixtures use `[^...]` syntax.

**Status: Implemented. Commit: `ec0d071` (NORM-tables slice, 2026-05-22).**

---

## AUD-21: Multi-line content in text-position named tags silently lost

**Found during:** Audit 1A gap analysis / `notes/parser-newline-investigation.md` (2026-05).

**Description:**
In the acadamark parser (`packages/remark-acadamark/src/syntax.js`), the
text-position named-tag tokenizer (`makeNamedTagTokenizer({ multiLine: false })`)
calls `nok(code)` when it encounters a line ending in its `attrSection` or
`content` state. This causes micromark to backtrack entirely — the `<` is treated
as literal text and no `acadamarkTag` node is produced.

**Empirical result:** `Text.<note | line one\nline two.> end.` → one `text` node
with the literal string `"Text.<note | line oneline two.> end."` (newline
collapsed). The tag is never parsed.

**Root cause:** The `if (!multiLine) return nok(code)` branch in the named-tag
tokenizer's `attrSection` and `content` states. Full root-cause analysis and
proposed fix (remove the branch; emit `lineEnding` tokens the same way the flow
tokenizer already does) are documented in `notes/parser-newline-investigation.md`
Q1 and Q5.

**Issues 1 and 3 share the same root cause and the same fix.**

**Status: Open.** Filed; not fixed. Fix is a future parser slice.

---

## AUD-22: Inline tag at line-start captured as flow construct — paragraph splitting

**Found during:** Audit 1A gap analysis / `notes/parser-newline-investigation.md` (2026-05).

**Note: This is the highest-impact of the three parser-newline bugs.** It causes
unexpected paragraph splitting in normal authored documents — not an edge case.

**Description:**
When an acadamark tag appears at the start of a line (even within prose), the
flow-position tokenizer claims it before the text-position tokenizer can. The
flow tokenizer calls `ok` in its `afterClose` state unconditionally, regardless
of what character follows the closing `>`. Any text that follows `>` on the same
line is left over and becomes the beginning of a new paragraph.

**Empirical result (sigil):** `<$ b $> is two.` at line-start → the `<$ b $>`
becomes a standalone flow element; `is two.` becomes a separate paragraph.

**Empirical result (named tag):** `<note | content> trailing text.` at line-start
→ 3 children: paragraph (preceding), `acadamarkTag`, paragraph (`trailing text.`).

**Root cause:** `afterClose` in both the sigil and named-tag flow tokenizers:
```js
function afterClose(code) {
  // ...
  return ok(code)   // ← unconditional; `code` is the char after `>`
}
```
The tokenizer ignores the character following `>` and locks in the flow match.
The proposed fix — add an `afterGt` check that calls `nok` if the character after
`>` is not a line ending or EOF — is documented in
`notes/parser-newline-investigation.md` Q2 and Q5.

**Status: Open.** Filed; not fixed. Fix is a future parser slice.

---

## AUD-23: Code sigil with multi-line content in text position produces `acadamarkTagError`

**Found during:** Audit 1A gap analysis / `notes/parser-newline-investigation.md` (2026-05).

**Description:**
In text position, a code-sigil tag spanning a line break (e.g. `` <``` python\ncode here ```> ``)
triggers the text-position sigil tokenizer's `!multiLine` branch. Unlike the
named-tag tokenizer (which calls `nok`), the sigil tokenizer calls `ok` on the
partial token (everything up to but not including the `\n`). `from-markdown.js`
then passes the incomplete source (no closing sigil) to Peggy, which fails and
produces an `acadamarkTagError` node.

**Empirical result:** `` Text <``` python\ncode here ```> more. `` → `acadamarkTagError`
node inside paragraph; `code here ```> more.` is raw text in the output.

**Root cause:** Same as AUD-21 (`!multiLine` early path in text-position tokenizer);
the difference is `ok` vs `nok`. Full analysis in
`notes/parser-newline-investigation.md` Q3 and Q5.

**AUD-21 and AUD-23 share the same root cause and the same fix.**

**Status: Open.** Filed; not fixed. Fix is a future parser slice.

---

## AUD-24: Vocabulary `related_plugins` plugin names are stale

**Found during:** Audit 1A reading pass — DRIFT-7, DRIFT-8, DRIFT-9 (2026-05).

**Description:**
Three vocabulary entries in `packages/layer1-vocabulary/elements/` have
`related_plugins` sections that name plugins that no longer match the implemented
plugin names. Three sub-cases:

1. **`cite.md`** — says `acadamarkCitationResolution`; actual name: `acadamarkCiteResolution`.
2. **`ref.md`** — says `acadamarkCrossReferenceResolution`; actual name: `acadamarkRefResolution`.
   Also calls it a "rehype plugin" when it runs as an mdast plugin.
3. **`note.md`** — says `acadamarkNoteNumbering`; actual name: `acadamarkNotes`
   (numbering and placement were merged into one plugin).

**Fix path:** In each vocabulary entry, correct the `name` field in
`related_plugins` to match the actual plugin name in
`packages/acadamark-interpreter/src/plugins/`. Small live-file fix; no code change.

**Status: Open.** Filed; not fixed. Fix is a future vocabulary-doc slice.

---

## AUD-25: Design directions DD-1..DD-5 not referenced from specs they govern

**Found during:** Audit 1A gap analysis — GAP-3 (2026-05).

**Description:**
`DESIGN.md`'s "Design directions (discovered through implementation)" section
defines five cross-cutting design directions:
- DD-1: Content gets parsed; arguments don't.
- DD-2: Tags with caption-like content support two equivalent forms.
- DD-3: `<meta>` is for document metadata; `<config>` is for document options.
- DD-4: All tag forms work for all tags where semantically meaningful.
- DD-5: Standalone HTML is the build target; client-side rendering is the future.

These directions govern specific vocabulary entries and spec docs, but no
forward-pointer from the governed spec to the relevant direction exists:

- `config.md` and `meta.md` do not reference DD-3 (the meta-vs-config boundary
  that AUD-13 found being violated).
- `<figure>` and `<table>` vocabulary entries do not reference DD-1 (parsed
  content vs. argument strings — directly relevant to AUD-14).
- `known-limitations.md`'s self-closing form entry does not reference DD-4.

A reader of `config.md` has no pointer to the meta-vs-config design direction; a
reader of the figure/table entries has no pointer to the content-parsing direction.

**Fix path:** Add "See also: DD-N in DESIGN.md §Design directions" forward-pointer
lines to the governed vocabulary entries and spec docs. A separate
`archive/design-directions-2026-05.md` exists with fuller implementation details.
The fix is a propagation slice; `DESIGN.md` remains the canonical owner.

**Status: Open.** Filed; not fixed. Fix is a future doc-propagation slice.

---

## AUD-26: `notes/interpreter.md` accuracy unverified against current interpreter code

**Found during:** Audit 1A design questions — DQ-1 (2026-05).

**Description:**
`notes/interpreter.md` is substantial and reads as a current architecture spec —
the authoritative description of how the interpreter works (mdast plugin chain,
`toHast` handlers, schema vs. handler interpreter_strategy). However, it has not
been audited against the implemented interpreter in
`packages/acadamark-interpreter/`. Its accuracy is therefore an open unknown.

This supersedes the old `notes/interpreter-design.md` (which described an
architecture that was never built and is already archived as
`archive/interpreter-design-2026-05.md`). `interpreter.md` is the live
architecture reference; its accuracy matters.

**The audit is a future task.** The uncertainty is tracked here rather than
hidden inside a confident-looking document. A future slice will read
`interpreter.md` section-by-section against the source code and correct any
drift.

**Status: Resolved (2026-05-23).** Phase 0 audit walked `notes/interpreter.md`
and `notes/pipeline.md` claim-by-claim against the implemented interpreter and
found 14 stale divergences (8 in interpreter.md, 6 in pipeline.md) and **zero
`DRIFT?` findings** — the interpreter is internally consistent; the docs simply
lagged the G3 math/table-normalization arc and the G4 code-block-registration
slice. Recurring omissions: `acadamarkNormalizeMarkdown` (step 1.5), the
`remarkMath`/`remarkGfm` registration on both outer and inner processors, the
code-block sigil visitor in `numbering.js`, and `code → listing` in
`DEFAULT_PREFIXES`. One cross-doc contradiction (interpreter.md §10 omitted
the unconditional `getDocumentFontsCss()` `<style>` injection that
pipeline.md §12.3 documented correctly) was resolved in favour of pipeline.md
(which matched the code). Both docs corrected in a single doc-only slice; no
code changed. Phase 0 audit report archived at
`archive/audit-2026-Q2/AUD-26-interpreter-pipeline-audit.md`. AUD-26 closed.