# NORM Phase 0 Findings — Normalization Pass Architecture

**Date:** 2026-05-22  
**Branch:** `master`, HEAD `09223ee`  
**Scope:** Read-only investigation. No code changes, no packages installed, no
files edited except this document.

---

## 0. Purpose

The normalization pass is a new pipeline stage that rewrites standard mdast
nodes produced by remark-math, remark-gfm, and other delegated parsers into
canonical `acadamarkTag` nodes, before any structural or semantic plugin runs.
The settled principle is: **delegate the lexer, own the node identity** — the
delegated parser finds the construct; the normalization pass converts it to the
canonical form downstream cannot distinguish from the authored shorthand.

This Phase 0 investigates (a) where the pass sits in the pipeline, (b) what
the rewrite mechanism looks like, (c) the exact target shapes for the
first-slice scope (math + GFM tables), and (d) whether the mechanism
generalizes to constructs not in the first slice without structural hazards.

---

## Q1 — Where does the normalization pass sit in the pipeline?

### Sources read

- `notes/pipeline.md` (full)
- `packages/acadamark-interpreter/src/index.js` (full)

### The pipeline today

Plugin registration order in `acadamarkInterpreter` (`index.js`):

| Step | Plugin |
|------|--------|
| 1 | `remarkRecursiveContent` — parses `acadamarkTag.content` strings into mdast arrays via an **inner processor** |
| 2 | `acadamarkConfigDiscovery` — reads `<config>` kwargs; read-only |
| 3 | `acadamarkArticleStructuring` — wraps root children in `<article>` structure |
| 4 | `acadamarkSectionNesting` — nests section family nodes |
| 5 | `acadamarkCitationIndex` — builds citation index |
| 6 | `acadamarkNotes` — registers note elements, splices markers |
| 7 | `acadamarkNumbering` — registers numberable elements |
| 8 | `acadamarkApplyNumbers` — numbers everything; `fillNumbering` |
| 9 | `acadamarkRefResolution` — replaces `<ref>` nodes |
| 10 | `acadamarkCiteResolution` — replaces `<cite>` nodes |
| 11 | `acadamarkNotePlacement` — moves notes to article-back |
| 12 | `acadamarkBibliography` — renders bibliography |
| 13 | Compiler — mdast → hast → HTML |

The inner processor (`index.js` line ~330):
```js
const innerProcessor = unified().use(remarkParse).use(remarkAcadamark);
```

### Insertion point

**Between steps 1 and 2** — immediately after `remarkRecursiveContent`, before
`acadamarkConfigDiscovery`.

Justification against the three constraints:

**"After markdown-form nodes exist."** By the time step 1 completes, ALL
markdown-form nodes are present in the tree — both those produced by the outer
processor's `remarkParse` run (top-level prose) and those produced by the inner
processor's `remarkParse` run inside `remarkRecursiveContent` (content inside
`acadamarkTag` nodes). Inserting at step 1.5 sees the complete tree.

**"Before structural plugins."** `acadamarkArticleStructuring` (step 3) and
`acadamarkSectionNesting` (step 4) use `isAcadamarkTag` predicates throughout.
A `heading` mdast node reaching step 3 is not recognized as a section; it lands
in article-body as generic content. A `heading` reaching step 4 returns
`sectionDepth === 0` and is never nested. Normalization before step 2 satisfies
this constraint for all constructs.

`acadamarkConfigDiscovery` (step 2) reads only `<config>` node kwargs — it does
not walk for math or heading nodes and is not harmed by un-normalized nodes
being present. Placing normalization before step 2 is conservative and keeps
the rule clean: "no structural pass sees unnormalized nodes."

### One-surface normalization, two-surface tokenization

The normalization pass itself is **one tree-walk** over the complete post-step-1
tree. The reason: by the time step 1 finishes, `inlineMath`/`math` nodes from
both the outer run and the inner run are present in the unified tree. Top-level
instances sit in `root.children`; inner-processor instances sit in
`acadamarkTag.content` arrays. A single walk that descends into both handles
all instances.

However, remark-math and remark-gfm must still be added to **both** processors
(outer and inner), because they are needed at both tokenization points. This
mirrors the G1 two-surface pattern exactly — the split is:

- Two tokenization surfaces (outer `remarkParse` and inner `remarkParse`)
  each run remark-math and remark-gfm, producing `inlineMath`/`math`/`table`
  nodes.
- One normalization walk converts them all after the two runs have merged into
  the outer tree.

The inner processor construction at `index.js` line ~330 must be updated to:
```js
const innerProcessor = unified()
  .use(remarkParse)
  .use(remarkAcadamark)
  .use(remarkMath)       // added for G3
  .use(remarkGfm);       // added for G3
```

---

## Q2 — What does the rewrite mechanism look like?

### Sources read

- `packages/acadamark-interpreter/src/lib/walk-replace.js` (full)
- `packages/acadamark-interpreter/src/lib/discover.js` (full)
- `packages/acadamark-interpreter/src/lib/ast-helpers.js` (full)
- `packages/remark-acadamark/src/generated/parser.js` (lines 1–90, 390–510)
- `packages/remark-acadamark/src/from-markdown.js` (lines 1–170)
- `packages/remark-acadamark/src/sigil-mapping.js` (full)
- `packages/remark-acadamark/src/dsl-registry.js` (full)

### Is `walkReplace` the right vehicle?

**No.** `walkReplace(nodes, tagname, process)` matches nodes via
`isAcadamarkTag(node, tagname)` — it finds `acadamarkTag` nodes by
`node.tagname`. The normalization pass must find nodes by `node.type` (e.g.
`node.type === 'inlineMath'`), which `isAcadamarkTag` never returns true for.

The descent rules are identical to `walkReplace`'s:
- Recurse into `acadamarkTag.content` when `!node.isOpaqueContent` (opaque
  content is a raw string or DSL payload, never a tree).
- Recurse into `node.children` for all mdast block/inline containers.

**Recommendation: a new function `walkNormalize(nodes, predicate, process)`**
in a new file `packages/acadamark-interpreter/src/lib/walk-normalize.js`.
Same descent logic; matches by predicate rather than by acadamarkTag tagname.
`walkReplace` is NOT changed — that avoids touching its three existing callers
(cite-resolution, ref-resolution, note-placement).

### Canonical target node shapes

`makeNode()` in `generated/parser.js` lines 9–23 defines the canonical shape:

```js
// makeNode(tagname, extra) template — all fields that Peggy-emitted nodes carry:
{
  type: 'acadamarkTag',
  form: 'short',
  tagname,
  positional: [],
  booleans: {},
  kwargs: {},
  id: null,
  classes: [],
  atRefs: [],
  content: null,
  isOpaqueContent: false,
  selfClosing: false,
  // ...extra spread
}
```

`exitAcadamarkTag` in `from-markdown.js` lines ~104–113 adds `contentHandler`
after Peggy parsing:
```js
node.contentHandler = getContentHandler(node.tagname);
if (node.contentHandler === 'default' && node.content !== null) {
  node.isOpaqueContent = false;
}
```

**Canonical `$` sigil node** (confirmed from `generated/parser.js` `peg$f26`/`peg$f27` at lines 408–421 and `test_result` lines ~903–915):
```js
{
  type: 'acadamarkTag',
  form: 'short',
  tagname: '$',
  positional: [],
  booleans: {},
  kwargs: {},
  id: null,
  classes: [],
  atRefs: [],
  content: '<LaTeX source string>',   // raw LaTeX, no surrounding whitespace trim
  isOpaqueContent: true,
  selfClosing: false,
  contentHandler: 'math',             // from dsl-registry.js: getContentHandler('$')
}
```

**Canonical `$$` sigil node** (confirmed from `peg$f24`/`peg$f25` at lines 397–407 and `test_result` lines ~818–862):
```js
{
  type: 'acadamarkTag',
  form: 'short',
  tagname: '$$',
  positional: [],
  booleans: {},
  kwargs: {},
  id: null,
  classes: [],
  atRefs: [],
  content: '<LaTeX source string>',
  isOpaqueContent: true,
  selfClosing: false,
  contentHandler: 'math-display',     // from dsl-registry.js: getContentHandler('$$')
}
```

These are verified against `handlers/math.js`, which reads only `node.tagname`
(to determine `isDisplay`), `node.content` (the LaTeX string to render), and
`node.computedNumber` (set by the numbering plugin). A normalized node that
matches these fields is indistinguishable from an authored `<$ ... $>` node for
all downstream purposes.

### Where the canonical shape lives authoritatively

The `contentHandler` values are authoritative in `dsl-registry.js` via
`getContentHandler(tagname)` — importable. The remaining fields (`positional`,
`booleans`, `kwargs`, `id`, `classes`, `atRefs`, `isOpaqueContent`, `form`,
`selfClosing`) come from `makeNode()` in the Peggy grammar, which is internal
to `generated/parser.js` and not exported.

**Recommendation:** The normalization pass module carries its own per-construct
mapping table (a plain object or `Map`) and imports `getContentHandler` from
`dsl-registry.js` for `contentHandler`. It constructs normalized nodes inline
with all required fields explicitly spelled out. The mapping table entries
document the mdast `type` → `tagname` translation; `getContentHandler` handles
the rest.

---

## Q3 — First-slice scope: math and GFM tables

### Math (clean — ready to implement)

**remark-math output** (confirmed from `math-coverage-phase0-findings.md` and
the remark-math BNF grammar):
- `{ type: 'inlineMath', value: '<LaTeX string>' }` — inline position
- `{ type: 'math', meta: null|string, value: '<LaTeX string>' }` — block position

**Normalization rewrite:**

`inlineMath { value }` →
```js
{
  type: 'acadamarkTag',   form: 'short',    tagname: '$',
  positional: [],         booleans: {},     kwargs: {},
  id: null,               classes: [],      atRefs: [],
  content: value,         isOpaqueContent: true,   selfClosing: false,
  contentHandler: 'math',
}
```

`math { value }` →
```js
{
  type: 'acadamarkTag',   form: 'short',    tagname: '$$',
  positional: [],         booleans: {},     kwargs: {},
  id: null,               classes: [],      atRefs: [],
  content: value,         isOpaqueContent: true,   selfClosing: false,
  contentHandler: 'math-display',
}
```

**Assessment:** The rewrite is exact and lossless. `value` on the remark-math
node is the raw LaTeX string; `content` on the canonical sigil node is the same
string. No transformation is needed. The `math.meta` field (present when
remark-math sees ` ```math ` fenced blocks with info strings) has no analog in
the canonical sigil form and is discarded — acceptable because the sigil form
has no equivalent mechanism for meta strings.

The `hasMathElements` CSS detector in `index.js` checks for `<inline-math>` and
`<display-math>` hast elements — it operates on the hast tree, not the mdast
tree, and is downstream of normalization. It remains correct.

### GFM tables (design sub-question — not ready to implement)

**remark-gfm output:**
```js
{
  type: 'table',
  align: [null, 'center', 'right'],     // per-column alignment hint
  children: [
    { type: 'tableRow', children: [
        { type: 'tableCell', children: [...inlineNodes] },
        ...
    ]},
    ...
  ]
}
```

**Canonical acadamark target form (`<table format | data>`):**
```js
{
  type: 'acadamarkTag',
  tagname: 'table',
  positional: ['<format>'],       // 'md', 'csv', 'json', 'yaml', 'tsv'
  content: '<raw data string>',   // opaque string parsed by tableHandler
  contentHandler: 'table',
  isOpaqueContent: true,
  ...
}
```

**The mismatch:** A remark-gfm `table` node has *structured* content —
`tableRow`/`tableCell` children that may contain inline markup (emphasis, links,
inline math). The canonical acadamark `table` node carries an *opaque string*
in a declared format. The table handler (`handlers/table.js`) dispatches on
`node.positional[0]` and parses the string via `parseCsv`, `parseMd`, etc. All
parser functions produce `{ headers: string[]|null, rows: string[][] }` — plain
text cells only — which `makeTd` wraps in `makeTextNode(cell)`. Rich cell
content is structurally discarded by the handler today.

**Three options for resolving the mismatch:**

**Option A — Serialize to md-format string.** Reconstruct a GFM pipe table
string from the mdast `table` node; set it as `content`; set
`positional: ['md']`. The normalized node is identical in shape to
`<table md | ... >`. `parseMd` re-parses it. **Cost:** (i) requires an
mdast-to-pipe-table serializer for cells (non-trivial; cells can contain
emphasis, links, inline math); (ii) lossy for rich inline content because
`parseMd` → `makeTextNode` produces plain text even if the serializer preserves
markup — the round-trip cell → pipe-string → `makeTextNode` discards inline
nodes. Lossless only for plain-text tables (the common case).

**Option B — Pre-structured content path.** Add a new format path in the table
handler (e.g. `positional: ['mdast']`) that accepts the GFM `table.children`
array and renders cells via mdast-to-hast sub-conversion. The normalized node
carries the original `table.children` as its structured content. **Cost:**
(i) `isOpaqueContent` must be `false` for this form, or the content descent
must be explicitly bypassed; (ii) the handler has two content paths;
(iii) the "normalized node indistinguishable from authored shorthand" principle
is violated unless the `<table>` authoring form is also extended to support
structured mdast content.

**Option C — Structured content on a non-standard field.** The normalized node
carries GFM table children on a new field (e.g. `gfmChildren`) that the handler
detects. Avoids the `isOpaqueContent` conflict but adds a non-standard node
field not present in any authored shorthand form — a deviation from the
canonical-form principle.

**Assessment:** All three options have real costs. Option A is compatible with
the existing node shape and adequate for the plain-text table use case, which is
the common case in academic writing. Options B/C preserve rich inline content
at the cost of extending the handler and deviating from the canonical-form
principle.

> **Open design question for a chat session (do not resolve in the
> implementation prompt).** Choose Option A, B, or C before implementing GFM
> table normalization. The math path has no such ambiguity and can proceed
> independently. It is recommended to scope the first NORM implementation slice
> to math only, and treat GFM table normalization as a separate subsequent
> slice after the design question is resolved.

---

## Q4 — Designing for the constructs not in the first slice

### Headings (design hazard — non-trivial gap)

Markdown headings produce `{ type: 'heading', depth: 1..6, children: [...] }`.

The acadamark section vocabulary uses named forms `section`, `sub-section`,
`sub-sub-section` — **not** the sigil forms `#`, `##`, `###`. This distinction
matters for the normalization target:

- `acadamarkSectionNesting` (`section-nesting.js` lines 62, 114) calls
  `sectionDepth(node)` from `ast-helpers.js` lines 53–60. `sectionDepth`
  checks `node.tagname === 'section'` (depth 1), `'sub-section'` (depth 2),
  `'sub-sub-section'` (depth 3). Sigil tagnames `'#'`, `'##'`, `'###'` return
  0 — they are NOT recognized. A heading normalized to `{ tagname: '#' }` would
  bypass section-nesting silently.
- `PARSER_TO_VOCAB` in `sigil-mapping.js` maps `$`, `$$`, `` ` ``, ` ``` ` to
  their vocabulary keys, but does NOT map `#`, `##`, `###`. A `#` sigil node
  reaching `tagHandler` gets an unknown-tag warning today.
- Fixture documents use `<section #id | Title>` named form exclusively; no test
  exercises `<# Title>` through the full interpreter pipeline.
- `FLAGGED-1` in `acadamark-session-handoff.md` line 386 explicitly marks
  reconciling `##` vs `<#>` as an unresolved design question.

**Implication for NORM heading normalization:** the normalization pass must
produce `{ tagname: 'section' }` / `{ tagname: 'sub-section' }` /
`{ tagname: 'sub-sub-section' }` to be recognized by existing plugins — not
`{ tagname: '#' }`. The content is `heading.children` (inline mdast nodes,
directly usable as the `content` array of the canonical section node, since
`acadamarkSectionNesting` extracts the title content from `node.content`).

**Depth 4–6 gap:** `depth: 4`, `5`, `6` have no canonical acadamark form. A
normalization strategy must decide: pass through as `heading` (unnormalized),
produce a `sub-sub-section` fallback, or generate an error node. This is a
design decision deferred to the heading normalization slice.

**Key implication for the pass design:** the heading mapping is not a pure
`type → tagname` lookup. It requires `heading.depth → tagname` with a depth cap
at 3. The mapping table in the normalization pass module must handle this
depth-conditional case.

Before implementing heading normalization, two preconditions should be verified:
1. `sectionDepth` recognizes the target tagnames (it does for `section`,
   `sub-section`, `sub-sub-section` — no change needed).
2. `PARSER_TO_VOCAB` and the vocabulary SPEC cover `section`/`sub-section` — 
   they do (these are named forms in the vocabulary already).

### Emphasis, strong, link (straightforward)

- `emphasis { children }` → `acadamarkTag { tagname: 'em', content: children, contentHandler: 'default', isOpaqueContent: false }`
- `strong { children }` → `acadamarkTag { tagname: 'strong', ... }`
- `link { url, title, children }` → `acadamarkTag { tagname: 'a', kwargs: { href: url }, content: children, ... }`

No structural mismatch. The content is inline mdast that the existing
`contentHandler === 'default'` path handles. The normalization sets
`isOpaqueContent: false`, so `walkNormalize` (and later `walkReplace`) will
descend into these nodes' content for further normalization if needed.

### Lists (straightforward structure, one disambiguation needed)

- `list { ordered: false, children: [listItem...] }` → `acadamarkTag { tagname: 'ul', content: children, ... }`
- `list { ordered: true, children: [listItem...] }` → `acadamarkTag { tagname: 'ol', ... }`
- `listItem { children }` → `acadamarkTag { tagname: 'li', content: children, ... }`

The `list.ordered` boolean determines `ul` vs `ol`. Manageable in the mapping
table: the predicate matches `node.type === 'list'`, and the process function
reads `node.ordered` to select the tagname.

### Generalization assessment

The `walkNormalize` function with the same descent rules as `walkReplace`
handles all constructs without structural change to the walker. Each construct
is a new entry in the mapping table. What does NOT generalize uniformly is the
per-construct node reconstruction — headings need depth-to-tagname logic, lists
need ordered disambiguation, tables need the mismatch decision. These are
**mapping-table concerns**, not walker concerns. The walker is not painted into
a corner by designing for math+tables first. Adding headings, emphasis, lists,
and links later requires only new mapping entries and no change to the walk
infrastructure.

---

## Also note

### Existing tests

No existing test asserts that an `inlineMath` remark-math mdast node survives in
the tree:

- `numbering.test.js` line 196 constructs an `acadamarkTag { tagname: '$' }`
  directly — not a raw remark-math `inlineMath` node. Unaffected by normalization.
- `integration.test.js` line 222 counts `<inline-math` elements in HTML output —
  tests rendered output, not mdast shape. Compatible with normalization (the
  HTML output path is unchanged: normalized node → `mathHandler` → `<inline-math>`).
- `katex-css.test.js` line 94 uses `<$ x^2 $>` authored shorthand — exercises
  the sigil path, not remark-math. Unaffected.

**Finding:** No existing test would break from adding the normalization pass
(assuming the normalized node shapes are correct and remark-math is not yet
installed, so no `inlineMath` nodes currently exist in the tree at all).

### `acadamarkArticleStructuring` and `acadamarkSectionNesting`

Both plugins use `isAcadamarkTag` predicates exclusively and do not walk for
`heading` nodes. Consequence:

- A `heading` node reaching `acadamarkArticleStructuring` is classified as
  body content (not front-matter, not back-matter) and placed in
  `article-body`. No crash; silent misclassification.
- A `heading` node reaching `acadamarkSectionNesting` returns
  `sectionDepth === 0` and is placed as regular body content. No crash; silent
  non-nesting.

Once headings normalize to `section`/`sub-section`/`sub-sub-section` nodes,
**both plugins handle them correctly without code changes**. `sectionDepth`
already recognizes those tagnames; `BACK_MATTER_TAGS` does not include them,
so they land in body.

### SPEC.md drift (previously filed)

`packages/layer1-vocabulary/SPEC.md` lines 203–208 still read:
> Inline math becomes mdast `inlineMath` (from `remark-math`), rendered by
> `rehype-katex`. [...] These don't need new Layer 1 elements.

Both claims are false as of HEAD:
- `inline-math.md` and `display-math.md` vocabulary entries exist.
- Rendering is via KaTeX directly in `mathHandler`, not `rehype-katex`.

The normalization pass will add a third outdated claim: `inlineMath` nodes will
not survive in the tree at all; they will be rewritten to `acadamarkTag`
immediately after parsing. Fix deferred to a documentation pass after NORM/G3
land, as filed in `math-coverage-phase0-findings.md`.

---

## Recommended scope

### Pipeline insertion point

**Between steps 1 and 2** in `acadamarkInterpreter` (`index.js`): after
`this.use(remarkRecursiveContent, ...)` and before `this.use(acadamarkConfigDiscovery)`.

### Rewrite mechanism

**New function `walkNormalize(nodes, predicate, process)` in a new file
`packages/acadamark-interpreter/src/lib/walk-normalize.js`.** Same descent
rules as `walkReplace` (recurse into non-opaque `acadamarkTag.content`; recurse
into `node.children`). Matches by a predicate on `node.type`, not by
`acadamarkTag.tagname`. `walkReplace` is not modified.

**Per-construct mapping** lives in the normalization pass module itself
(e.g. `plugins/normalize-markdown.js`). Imports `getContentHandler` from
`dsl-registry.js` to populate `contentHandler`. Constructs normalized nodes
inline with all `makeNode` fields spelled out explicitly.

### Two-surface or one-surface?

**Two-surface tokenization, one-surface normalization.** remark-math and
remark-gfm must be added to both the outer processor and the inner processor at
`index.js` line ~330. The normalization pass itself is a single tree-walk run
once, after `remarkRecursiveContent`.

### First-slice scope

**Math only. GFM table normalization is deferred.**

Math exact target shapes:

| remark-math node | `tagname` | `contentHandler` | `isOpaqueContent` | `content` |
|---|---|---|---|---|
| `inlineMath { value }` | `'$'` | `'math'` | `true` | `value` |
| `math { value }` | `'$$'` | `'math-display'` | `true` | `value` |

All other canonical fields: `form: 'short'`, `positional: []`, `booleans: {}`,
`kwargs: {}`, `id: null`, `classes: []`, `atRefs: []`, `selfClosing: false`.

The normalized node is indistinguishable from `<$ ... $>` for all downstream
consumers (`mathHandler` reads only `tagname`, `content`, `computedNumber`).

**Open design question (must be resolved before GFM table normalization):**
Choose among Option A (serialize to pipe-table string; lossless for plain-text
cells, lossy for rich inline content), Option B (structured content path in the
table handler), or Option C (non-standard field). This decision belongs in a
chat session before the table normalization implementation prompt is written.
The math half of G3 can proceed without it.
