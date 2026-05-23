# AUD-26 Phase 0: `notes/interpreter.md` + `notes/pipeline.md` doc-vs-code audit

**Audit deliverable. Read-only. No corrections applied.** This report walks
the two docs claim-by-claim against the implemented interpreter and records
every divergence. Triage (doc-staleness vs. code-drift-from-intent) is for a
later slice; every divergence is provisionally classified `STALE`, `DRIFT?`,
or `UNCLEAR` based on what the code alone can tell.

Audit scope: `notes/interpreter.md` and `notes/pipeline.md` against the source
at `packages/acadamark-interpreter/src/` and the imported plugin at
`packages/remark-acadamark/src/recursive-content.js`.

---

## 0. Pipeline ground-truth section

The authoritative pipeline as assembled in
[packages/acadamark-interpreter/src/index.js](packages/acadamark-interpreter/src/index.js)
inside `acadamarkInterpreter(options)`. Read top-to-bottom; numbering follows
the order the calls execute.

```
Outer-processor extensions registered first (lines 323-328):
  A. remarkMath                       (this.use)
  B. remarkGfm                        (this.use)

Inner processor constructed (line 339):
  unified()
    .use(remarkParse)
    .use(remarkAcadamark)
    .use(remarkMath)
    .use(remarkGfm)
  — passed into remarkRecursiveContent as { processor }

mdast-transform plugins registered on the outer processor:
  1.  remarkRecursiveContent          (line 342, with { processor: innerProcessor })
  2.  acadamarkNormalizeMarkdown      (line 348)
  3.  acadamarkConfigDiscovery        (line 351)
  4.  acadamarkArticleStructuring     (line 352)
  5.  acadamarkSectionNesting         (line 353)
  6.  acadamarkCitationIndex          (line 359-361, anonymous wrapper around buildCitationIndex; assetsDir closed over)
  7.  acadamarkNotes                  (line 365)
  8.  acadamarkNumbering              (line 369)
  9.  acadamarkApplyNumbers           (line 374-380, anonymous; ensureRegistry → numberRegistry() → fillNumbering(file))
  10. acadamarkRefResolution          (line 384)
  11. acadamarkCiteResolution         (line 389)
  12. acadamarkNotePlacement          (line 395)
  13. acadamarkBibliography           (line 398)

Compiler (this.compiler, lines 404-442):
  toHast(tree, { handlers: { acadamarkTag: tagHandler }, allowDangerousHtml: true })
  unconditionally prepend <style> with getDocumentFontsCss()  (line 413)
  if (cssMode !== 'skip' && hasMathElements(hast)) prepend KaTeX <style>|<link>  (lines 418-424)
  if (hoverMode !== 'skip' && (hasNoteMarkers|hasRefLinks|hasCiteLinks)) prepend hover-preview assets  (lines 428-434)
  rehypeFormat()(hast)
  toHtml(hast, { allowDangerousHtml: true })
```

**Total mdast-transform plugins on the outer processor: 13.** (12 if
`remarkRecursiveContent` is treated as Stage 2 and counted separately from
Stage 3 transforms, as `pipeline.md` does. 11 if `acadamarkNormalizeMarkdown`
is excluded — which is the count both docs use.)

The exported plugin surface of the package
([src/index.js](packages/acadamark-interpreter/src/index.js):80) is:

```js
export {
  acadamarkNormalizeMarkdown,      // NEW; not in either doc
  acadamarkConfigDiscovery,
  acadamarkArticleStructuring,
  acadamarkSectionNesting,
  acadamarkNotes,
  acadamarkLibraryLoad,            // public wrapper for buildCitationIndex
  buildCitationIndex,              // pipeline uses this directly
  acadamarkNumbering,
  acadamarkRefResolution,
  acadamarkCiteResolution,
  acadamarkBibliography,
  acadamarkTagHandler,
  createAcadamarkTagHandler,
};
```

`acadamarkNotePlacement` is imported and used internally (line 70, 395) but is
NOT in the package's named exports — external callers cannot wire the
placement step in isolation. (This is in addition to the doc divergences
below; it is a code-surface observation, not an interpreter.md/pipeline.md
claim.)

---

## Summary counts

### `notes/interpreter.md`
- `STALE`: 7
- `DRIFT?`: 0
- `UNCLEAR`: 1
- **Total: 8 findings**

### `notes/pipeline.md`
- `STALE`: 6
- `DRIFT?`: 0
- `UNCLEAR`: 0
- **Total: 6 findings**

**`DRIFT?` findings (require author triage before correction slice): NONE.**
Every divergence found is doc-staleness against current code; the interpreter
is internally consistent and the code paths described in the docs all exist
where the docs say they do (modulo the missing normalize stage). The two docs
also agree with each other on every claim audited — there are no cross-doc
contradictions where the two say different things about the same code path,
only matching omissions (both miss `acadamarkNormalizeMarkdown`, both miss
`remarkMath`/`remarkGfm` registration on outer/inner processors, etc.).

The `UNCLEAR` finding (I-8) is a counting ambiguity, not a behavior question.

---

## Findings: `notes/interpreter.md`

### I-1 — Twelve vs. thirteen mdast-transform plugins

- **Claim** ([notes/interpreter.md:42-46](notes/interpreter.md:42)):
  > "`acadamarkInterpreter` registers twelve mdast-transform plugins and a
  > custom compiler on the unified processor."
- **Ground truth**: 13 plugins are registered on the outer processor with
  `this.use(...)`. The 12-element list at lines 72-88 omits
  `acadamarkNormalizeMarkdown`, which is registered at
  [src/index.js:348](packages/acadamark-interpreter/src/index.js:348) between
  `remarkRecursiveContent` (step 1) and `acadamarkConfigDiscovery` (step 2).
- **Divergence type**: `STALE`.
- **Cross-doc note**: `pipeline.md` has the same omission (see P-1, P-2).

### I-2 — Plugin-order block at §2 missing `acadamarkNormalizeMarkdown`

- **Claim** ([notes/interpreter.md:72-88](notes/interpreter.md:72)): The
  numbered list "The plugin registration order in `acadamarkInterpreter` is:"
  goes `1. remarkRecursiveContent` → `2. acadamarkConfigDiscovery` → ... and
  has no entry for normalize-markdown.
- **Ground truth**: Real order is
  `remarkRecursiveContent → acadamarkNormalizeMarkdown → acadamarkConfigDiscovery → ...`.
  `acadamarkNormalizeMarkdown`
  ([src/plugins/normalize-markdown.js](packages/acadamark-interpreter/src/plugins/normalize-markdown.js))
  rewrites `inlineMath`, `math`, and `table` nodes produced by the delegated
  parsers (`remark-math`, `remark-gfm`) into canonical `acadamarkTag` nodes
  before any structural plugin sees the tree.
- **Divergence type**: `STALE`.
- **Cross-doc note**: `pipeline.md` has the same omission (P-2).

### I-3 — `remarkMath` and `remarkGfm` registered on outer + inner processors not documented

- **Claim** (entire doc): `notes/interpreter.md` does not mention
  `remark-math` or `remark-gfm`. §1 frames the consumer-side pipeline as
  `remarkParse → remarkAcadamark → acadamarkInterpreter` and implies that
  no further parser-level extensions are wired in.
- **Ground truth**:
  [src/index.js:323-328](packages/acadamark-interpreter/src/index.js:323)
  calls `this.use(remarkMath)` and `this.use(remarkGfm)` on the outer
  processor *inside* `acadamarkInterpreter`, so bare `$x$` and bare GFM pipe
  tables in the top-level source are tokenized. The inner processor passed to
  `remarkRecursiveContent` also gets both extensions
  ([src/index.js:339](packages/acadamark-interpreter/src/index.js:339)). These
  are the reason `acadamarkNormalizeMarkdown` exists.
- **Divergence type**: `STALE`.
- **Cross-doc note**: `pipeline.md` has the same omission (P-3).

### I-4 — §3.1 description of the inner processor omits `remarkMath` and `remarkGfm`

- **Claim** ([notes/interpreter.md:112-115](notes/interpreter.md:112)): The
  inner processor "is an independent `unified` instance with only the parsing
  plugins (no structural or compile steps). It is created by
  `acadamarkInterpreter` and passed to this plugin via the `{ processor }`
  option."
- **Ground truth**: The inner processor is
  `unified().use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm)`
  ([src/index.js:339](packages/acadamark-interpreter/src/index.js:339)). The
  phrase "only the parsing plugins" is true in spirit, but the doc never
  identifies what those plugins are, so a reader cannot infer that math and
  GFM-table tokenization also happens inside the recursive-content pass.
- **Divergence type**: `STALE`.

### I-5 — §3.7 numbering plugin: code-block sigil registration not documented

- **Claim** ([notes/interpreter.md:357-358](notes/interpreter.md:357)):
  > "Register `$$` (display-math), `figure`, and `table` nodes with the
  > registry, and register `section`, `sub-section`, and `sub-sub-section`
  > nodes for cross-reference lookup."
- **Ground truth**:
  [src/plugins/numbering.js:105-107](packages/acadamark-interpreter/src/plugins/numbering.js:105)
  also registers a visitor for the code-block sigil tagname `` '```' ``:
  ```js
  visitors.set('```', (node) => {
    registry.assign('code', node.id || null, { numbered: false, data: {} });
  });
  ```
  This is the G4/PG-6 change recorded in
  [audit-findings.md AUD-09](notes/audit-findings.md:188) ("Code-block half
  resolved (G4, 2026-05-23)") and is paired with `code: 'listing'` being added
  to `DEFAULT_PREFIXES` in `ref-resolution.js` (verified at
  [src/plugins/ref-resolution.js:42](packages/acadamark-interpreter/src/plugins/ref-resolution.js:42)).
  Section 3.7's purpose paragraph and the "Numbered types and registry keys"
  table (lines 370-372) both omit the `code` type.
- **Divergence type**: `STALE`.
- **Cross-doc note**: `pipeline.md` §4.6 has the same omission (P-4).

### I-6 — §3.9 `DEFAULT_PREFIXES` list missing `code → listing`

- **Claim** ([notes/interpreter.md:470-471](notes/interpreter.md:470)):
  > "Built-in prefixes: `eqn` → `equation`, `fig` → `figure`, `note` →
  > `note`, `tab` → `table`, `sec` → `section`, `thm` → `theorem`, `lem` →
  > `lemma`, `def` → `definition`, `ex` → `example`."
- **Ground truth**: The actual `DEFAULT_PREFIXES` dictionary at
  [src/plugins/ref-resolution.js:36-47](packages/acadamark-interpreter/src/plugins/ref-resolution.js:36)
  includes the same nine prefixes **plus `code: 'listing'`** (added in G4 per
  AUD-09 closure).
- **Divergence type**: `STALE`.

### I-7 — §10 asset injection: unconditional document-fonts `<style>` not documented

- **Claim** ([notes/interpreter.md:1000-1005](notes/interpreter.md:1000)):
  > "Three categories of assets are managed: 10.1 KaTeX CSS, 10.2 Hover
  > preview assets, 10.3 Lazy loading."
  §10 enumerates KaTeX CSS and hover-preview assets as the only injected
  asset categories. The §4.2 compile-step description
  ([notes/interpreter.md:622-624](notes/interpreter.md:622)) says only "CSS
  and JS assets are conditionally injected."
- **Ground truth**:
  [src/index.js:413](packages/acadamark-interpreter/src/index.js:413)
  unconditionally prepends a `<style>` element containing
  `getDocumentFontsCss()` (Inter + Source Code Pro base64 `@font-face` rules)
  to every rendered document, before the conditional KaTeX/hover-preview
  injections. This is the AUD-16 fix
  ([audit-findings.md:455-460](notes/audit-findings.md:455)). It is
  unconditional, not gated by detection.
- **Divergence type**: `STALE`.
- **Cross-doc note**: `pipeline.md` §12.3
  ([notes/pipeline.md:744-749](notes/pipeline.md:744)) DOES describe this
  injection. The two docs diverge from each other on this point: pipeline.md
  is correct; interpreter.md omits it.

### I-8 — §14 source file map omits `normalize-markdown.js` and `walk-normalize.js`

- **Claim** ([notes/interpreter.md:1171-1217](notes/interpreter.md:1171)):
  The `plugins/` listing names `config-discovery.js`,
  `article-structuring.js`, `section-nesting.js`, `library-load.js`,
  `notes.js`, `note-placement.js`, `numbering.js`, `ref-resolution.js`,
  `cite-resolution.js`, `bibliography.js`. The `lib/` listing names
  `registry.js`, `ast-helpers.js`, `bool-kwarg.js`, `discover.js`,
  `walk-replace.js`, `errors.js`. The `schema/` listing names only
  `load-vocabulary.js`.
- **Ground truth**: `plugins/normalize-markdown.js` and
  `lib/walk-normalize.js` exist and are used at runtime
  ([src/plugins/normalize-markdown.js](packages/acadamark-interpreter/src/plugins/normalize-markdown.js),
  [src/lib/walk-normalize.js](packages/acadamark-interpreter/src/lib/walk-normalize.js))
  but are missing from the map. Separately, `schema/shape-tokens.js` and
  `schema/validate.js` also exist
  ([src/schema/shape-tokens.js](packages/acadamark-interpreter/src/schema/shape-tokens.js),
  [src/schema/validate.js](packages/acadamark-interpreter/src/schema/validate.js))
  but appear unused by the interpreter runtime (only referenced from tests
  per `grep`). Their omission from the map is defensible if the map is
  "runtime-reachable files only," but the doc does not state that scope.
- **Divergence type**: `UNCLEAR` (for the schema files — depends on whether
  the map is intended to be exhaustive or runtime-reachable-only).
  `STALE` for `normalize-markdown.js` and `walk-normalize.js`, which are
  definitely runtime-reachable.

---

## Findings: `notes/pipeline.md`

### P-1 — Stage-3 plugin count is 12 in prose, 11 in the listing

- **Claim** ([notes/pipeline.md:24](notes/pipeline.md:24)): The overview
  diagram labels Stage 3 "mdast transforms (12 plugins)". The bulleted list
  inside the same Stage-3 box (lines 25-28) enumerates: config discovery,
  article structure, section nesting, citation index, notes, numbering, apply
  numbers, ref resolution, cite resolution, note placement, bibliography —
  that's 11. Section 4 ([line 135](notes/pipeline.md:135)) likewise says
  "Twelve plugins run in sequence" and then numbers them §4.1 through §4.10
  with one intercalated §4.6.5 — 11 actual entries.
- **Ground truth**: 12 mdast transforms run after `remarkRecursiveContent`
  if `acadamarkNormalizeMarkdown` is counted. 11 if it is not. The doc's
  "12" matches no reading of the code list it presents (its own list omits
  normalize-markdown).
- **Divergence type**: `STALE`. The count was likely correct at a prior
  revision and was not updated when one item was inserted or removed.

### P-2 — Stage-3 listing omits `acadamarkNormalizeMarkdown`

- **Claim** ([notes/pipeline.md:25-28](notes/pipeline.md:25), and the
  numbered §4.1–§4.10 entries): The first transform after recursive content
  parsing is `acadamarkConfigDiscovery`.
- **Ground truth**: The first transform after `remarkRecursiveContent` is
  `acadamarkNormalizeMarkdown`
  ([src/index.js:348](packages/acadamark-interpreter/src/index.js:348)). It
  converts `inlineMath`, `math`, and GFM `table` nodes produced by
  `remark-math` and `remark-gfm` into canonical `acadamarkTag` nodes before
  any structural plugin runs. The §8 plugin-ordering table
  ([notes/pipeline.md:456-471](notes/pipeline.md:456)) also has no
  normalize-markdown row.
- **Divergence type**: `STALE`. This is the same omission as I-1/I-2 on the
  interpreter.md side — the two docs are consistently wrong with each other.

### P-3 — `remarkMath` and `remarkGfm` registration on outer + inner processors not documented

- **Claim** ([notes/pipeline.md:42-52](notes/pipeline.md:42)): Stage 1's
  consumer-side wiring is described as
  `remarkParse → remarkAcadamark → acadamarkInterpreter` with no further
  parser extensions. Stage 2's "Inner processor" paragraph
  ([line 113-117](notes/pipeline.md:113)) says the inner processor "runs the
  same parser plugins as the outer processor but does NOT include
  `remarkRecursiveContent` (this plugin) or any structural plugins."
- **Ground truth**: `acadamarkInterpreter` itself calls
  `this.use(remarkMath)` and `this.use(remarkGfm)` on the outer processor
  ([src/index.js:323-328](packages/acadamark-interpreter/src/index.js:323)).
  The inner processor passed to `remarkRecursiveContent` is
  `unified().use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm)`
  ([src/index.js:339](packages/acadamark-interpreter/src/index.js:339)).
  "Same parser plugins as the outer processor" is technically true (both
  surfaces include the same four parser plugins), but the doc never lists
  *what* those plugins are, and the AUD-20 NORM-tables decision that drove
  this wiring is not referenced here.
- **Divergence type**: `STALE`.

### P-4 — §4.6 `acadamarkNumbering` description: code-block sigil registration not documented

- **Claim** ([notes/pipeline.md:261-264](notes/pipeline.md:261)):
  > "Registers `$$` (display-math), `figure`, and `table` nodes with the
  > registry (record-only), and registers `section`, `sub-section`, and
  > `sub-sub-section` nodes for cross-reference lookup."
- **Ground truth**:
  [src/plugins/numbering.js:105-107](packages/acadamark-interpreter/src/plugins/numbering.js:105)
  also registers a visitor for the code-block sigil tagname `` '```' `` with
  registry type `'code'` and `numbered: false`. Per
  [audit-findings.md AUD-09](notes/audit-findings.md:238) (G4, 2026-05-23
  resolution), this makes `<ref @code:snippet>` resolve. The doc paragraph,
  the "Numbering decision priority" paragraph (line 275), and the §13
  internal-node-types table (which separately lists ref/cite/note/bib
  internals — not relevant here, just noting the doc's coverage shape) do not
  mention code-block registration.
- **Divergence type**: `STALE`.
- **Cross-doc note**: same omission appears in interpreter.md §3.7 (I-5).

### P-5 — §8 plugin-ordering table: no normalize-markdown row

- **Claim** ([notes/pipeline.md:456-471](notes/pipeline.md:456)): The "Must
  run after / Produces" table has rows for `remarkRecursiveContent`,
  `acadamarkConfigDiscovery`, `acadamarkArticleStructuring`, ... — no row
  for `acadamarkNormalizeMarkdown`.
- **Ground truth**: `acadamarkNormalizeMarkdown` runs between
  `remarkRecursiveContent` and `acadamarkConfigDiscovery`
  ([src/index.js:348](packages/acadamark-interpreter/src/index.js:348)). Its
  "must run after" is `remarkRecursiveContent` (so both outer and inner
  parses are complete and all delegated-parser nodes are present); its "must
  run before" is `acadamarkConfigDiscovery` (so structural plugins never see
  un-normalized `inlineMath`/`math`/`table` nodes).
- **Divergence type**: `STALE`. Same omission as P-2, in table form.

### P-6 — §10.5 data-flow example: order of "Stage 3 — acadamarkApplyNumbers" vs. `<note>` content

- **Claim** ([notes/pipeline.md:677-684](notes/pipeline.md:677)): The note
  example walks "Stage 3 — acadamarkNotes (register-only)" → "Stage 3 —
  acadamarkApplyNumbers" → "Stage 3 — acadamarkNotePlacement", showing
  `fillNumbering(file)` as a "(no-op for notes; `acadamarkNumberingPending`
  has equations/figures/tables)" step.
- **Ground truth**: This is accurate as far as it goes — `fillNumbering()`
  reads `file.data.acadamarkNumberingPending`, which the notes plugin does
  not populate
  ([src/plugins/notes.js:78](packages/acadamark-interpreter/src/plugins/notes.js:78)
  sets only `acadamarkNotesPending`; the numbering plugin sets
  `acadamarkNumberingPending` at
  [src/plugins/numbering.js:112](packages/acadamark-interpreter/src/plugins/numbering.js:112)).
  But the example's stated ordering (note registration first, then apply
  numbers, then placement) skips over `acadamarkNumbering`, `acadamarkRefResolution`,
  and `acadamarkCiteResolution`, which run between `acadamarkApplyNumbers`
  (step 4.6.5) and `acadamarkNotePlacement` (step 4.9). The example is not
  *wrong*, only abbreviated; a reader new to the code could plausibly read
  "Stage 3 — acadamarkApplyNumbers" immediately followed by "Stage 3 —
  acadamarkNotePlacement" as implying adjacency.
- **Divergence type**: `STALE`. Borderline — this is presentation drift, not
  a behavioral claim. Flagged because it touches the same R3a
  notes-and-numbering refactor that the doc otherwise describes carefully.

---

## What was deliberately not audited

- The `notes/recursive-content-spec.md` file, which both docs cross-reference
  but which the prompt explicitly scoped out of this audit.
- The vocabulary entries in `packages/layer1-vocabulary/elements/` and their
  `related_plugins` sections (filed as
  [AUD-24](notes/audit-findings.md:694)).
- The micromark/Peggy parser layer
  ([packages/remark-acadamark/src/syntax.js](packages/remark-acadamark/src/syntax.js)
  and the grammar) — outside the interpreter scope and covered by
  [AUD-21](notes/audit-findings.md:606)/[AUD-22](notes/audit-findings.md:633)/[AUD-23](notes/audit-findings.md:668).
- The `schema/shape-tokens.js` and `schema/validate.js` files were skimmed
  to confirm they are not runtime-reachable from `index.js`'s call graph;
  no deeper read was done.
- The compile step's `mdast-util-to-hast` dispatch was verified end-to-end
  against `interpret-plugin.js` (INTERNAL_REGISTRY and HANDLER_REGISTRY both
  match the doc tables exactly); handler implementations
  (`handlers/math.js`, `handlers/figure.js`, `handlers/table.js`,
  `handlers/code-block.js`, `handlers/inline-code.js`, `handlers/notes.js`,
  `handlers/ref.js`, `handlers/cite.js`) were read and confirm the §5.2,
  §5.3, §7.1–§7.8 tables in interpreter.md — no findings against those
  sections.

---

## `DRIFT?` listing (none)

There are no `DRIFT?` findings. Triaging the 13 `STALE` findings + 1
`UNCLEAR` finding into doc edits is the scope of the correction slice; no
code change is implied by any item in this report.

The two docs are also internally consistent with each other on every
audited point except I-7 (interpreter.md §10 omits the unconditional
document-fonts `<style>` injection that pipeline.md §12.3 documents
correctly). All other divergences are matching omissions in both docs.
