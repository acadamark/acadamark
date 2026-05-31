# OQ-1 Phase 0 findings — remark-math / remark-gfm integration investigation

**Date:** 2026-06-XX  
**Purpose:** Design input for the G3 implementation prompt. Read-only investigation of the
inner processor construction, math/table dispatch paths, and version compatibility. No code,
tests, or documents were modified.

**Files read at code level:**
- `notes/recursive-content-spec.md` (spec, re-read for context)
- `packages/remark-enscribe/src/recursive-content.js` (actual implementation)
- `packages/remark-enscribe/src/dsl-registry.js` (contentHandler registry)
- `packages/remark-enscribe/src/from-markdown.js` (isOpaqueContent assignment, line 207)
- `packages/remark-enscribe/src/sigil-mapping.js` ($ → inline-math key translation)
- `packages/enscribe-interpreter/src/index.js` (inner processor construction, outer pipeline)
- `packages/enscribe-interpreter/src/interpret-plugin.js` (toHast handler dispatch)
- `packages/enscribe-interpreter/src/handlers/math.js` (KaTeX rendering path)
- `packages/enscribe-interpreter/src/handlers/table.js` (table dispatch, parseMd)
- `packages/remark-enscribe/package.json` (dependency versions)
- `packages/enscribe-interpreter/package.json` (dependency versions)

---

## 1. Question and scope

The recursive-content spec (`notes/recursive-content-spec.md` lines 53–57) names `remark-math` and
`remark-gfm` as intended inner processor plugins ("The caller constructs innerProcessor with the
appropriate plugins (e.g., remarkParse, remark-enscribe, remark-math, remark-gfm)"). The design
decision to delegate bare `$x$` to `remark-math` and bare pipe tables to `remark-gfm` is settled
(see `notes/idioms.md` and `notes/principles.md`). This investigation answers three questions about
the collision risk:

- **Q1.** Where is the inner processor actually constructed today, and what does it currently include?
- **Q2.** Does adding `remark-math` to the inner processor collide with the `<$...$>` sigil path?
- **Q3.** Does adding `remark-gfm` to the inner processor collide with the `<table md | ...>` path?

And an implicit **Q4** (the two-surface question): do bare `$x$` / pipe tables in *top-level prose*
(outside any `<tag | content>`) also require changes, or is the inner processor alone sufficient?

---

## 2. Q1 — Inner processor: location and current contents

**File:** `packages/enscribe-interpreter/src/index.js`  
**Function:** `enscribeInterpreter` (exported function, line ~313)  
**Construction line:** approximately line 330

```js
const innerProcessor = unified().use(remarkParse).use(remarkEnscribe);
```

This is constructed **inside the function body**, not at module scope, so a fresh processor is
created per pipeline instantiation. The surrounding comment reads: "It runs the same parser plugins
as the outer processor but does NOT include the structural or compile steps."

**Current contents:** `remarkParse` + `remarkEnscribe` only.

Neither `remark-math` nor `remark-gfm` is present. Neither is listed as a dependency in either
`packages/remark-enscribe/package.json` or `packages/enscribe-interpreter/package.json`.

---

## 3. Q2 — remark-math / `<$...$>` sigil collision

**Short answer: no collision with the sigil path. Separate risk: bare `$x$` inside default-handler
tag content would produce unrenderable mdast nodes.**

### 3.1 Why sigil tags are safe

The `$` and `$$` sigils are registered in `dsl-registry.js` with handlers `'math'` and
`'math-display'` (lines ~33–34):

```js
['$',   'math'],
['$$',  'math-display'],
```

`getContentHandler('$')` returns `'math'`, not `'default'`. In `from-markdown.js` line 207:

```js
node.isOpaqueContent = node.contentHandler !== 'default'
```

So math sigil nodes get `isOpaqueContent: true`. In `recursive-content.js` line 63:

```js
if (node.contentHandler !== 'default') return SKIP
```

The recursive-content plugin skips them entirely. Their content string never reaches the inner
processor. **Adding `remark-math` to the inner processor has zero effect on `<$...$>` nodes.**

### 3.2 The actual collision risk: bare `$x$` inside default-handler content

Consider `<aside | here $x$ is math>`. The `aside` contentHandler is `'default'`. Its content
string `"here $x$ is math"` is re-parsed through the inner processor. If `remark-math` is added to
the inner processor, `$x$` would be parsed as an `inlineMath` mdast node (type `'inlineMath'`,
property `value: 'x'`).

The interpreter's `toHast` call in `index.js` line ~383:

```js
const hast = toHast(tree, {
  handlers: { enscribeTag: tagHandler },
  allowDangerousHtml: true,
});
```

Only registers handlers for `enscribeTag`. `inlineMath` and `math` mdast node types (from
`remark-math`) are **not registered**. `mdast-util-to-hast` v13's default unknown handler for
leaf nodes (which have `value` but no `children`) converts them to a text node with the raw value
string, or drops them — either way, math rendering is lost.

The existing `mathHandler` in `handlers/math.js` handles only `enscribeTag` nodes with
`tagname: '$'` or `'$$'`. It has no path for raw `inlineMath`/`math` mdast nodes.

**Required additional work for Q2:**  
Before bare `$x$` inside default-handler content can work, the `toHast` call must register
additional handlers for `inlineMath` and `math` mdast node types. Two candidate approaches:
- (a) Route through the existing KaTeX path by writing thin hast handlers that extract `.value`
  from `inlineMath`/`math` nodes and call `katex.renderToString`. This keeps all math rendering
  in one place.
- (b) Use `mdast-util-math`'s hast handler exports and accept that the output element names
  (`<span class="math math-inline">`) differ from the enscribe vocab names (`<inline-math>`).

The choice between (a) and (b) is a design question, not settled by this investigation.

---

## 4. Q3 — remark-gfm / `<table md | ...>` collision

**Short answer: no collision. The table handler uses a hand-written pipe parser that is completely
independent of remark-gfm. GFM tables inside default-handler content would render correctly.**

### 4.1 Why `<table md | ...>` is safe

The `table` tag is registered in `dsl-registry.js` line ~83:

```js
['table', 'table'],
```

Handler `'table'` is not `'default'`, so the recursive-content plugin skips `table` nodes — their
content is an opaque string. The table handler's `parseMd` function (`table.js` lines 161–194) is a
hand-written parser for GFM pipe syntax. It has no dependency on `remark-gfm`. Adding `remark-gfm`
to the inner processor has **zero effect** on `<table md | ...>` nodes.

### 4.2 GFM tables inside default-handler content

Consider `<aside | ...prose... | col1 | col2 |\n|----|----|...>`. With `remark-gfm` in the inner
processor, the pipe table in the aside content would be parsed as a standard `table` mdast node
(type `'table'`, with `tableRow` and `tableCell` children).

`mdast-util-to-hast` v13 has built-in handlers for `table`, `tableRow`, and `tableCell` — these are
listed as standard mdast node types in its handler map. The table would render correctly to an HTML
`<table>` element **without** any enscribe vocabulary wrapping (no `computedNumber`, no caption,
no id). This is the intended behavior per the delegation principle in `notes/idioms.md`: a bare GFM
table is an unnumbered, uncaptioned shorthand table. Numbered tables require the explicit
`<table csv | ...>` form.

**No additional work needed in the hast-handler layer for GFM tables.**

---

## 5. Q4 — Two-surface structure (parallel to G1)

G1 (the `^`/`_` shortcuts) exposed a "two-surface" architecture:
- Surface A: the grammar / inner processor (handles content inside `<tag | content>`).
- Surface B: the outer pipeline / micromark tokenizer (handles top-level prose).

OQ-1 / G3 has the same structure:

| | Surface A: inner processor | Surface B: outer pipeline |
|---|---|---|
| `remark-math` | re-parses `$x$` in default-handler tag content | needed for `$x$` in top-level prose |
| `remark-gfm` | re-parses pipe tables in default-handler tag content | needed for pipe tables in top-level prose |

**For remark-gfm:** Adding it to the outer pipeline (`this.use(remarkGfm)` in
`enscribeInterpreter`, before or after `remarkEnscribe` depending on micromark extension ordering)
would allow bare pipe tables in top-level prose. `mdast-util-to-hast`'s built-in `table` handler
means no further interpreter work is needed. The `<tag | content>` syntax is not endangered:
`remark-enscribe`'s micromark extension consumes `<...>` constructs before GFM table detection
(GFM tables start with `|` at line start, not `<`). No pipe-character ambiguity.

**For remark-math:** Adding it to the outer pipeline would allow bare `$x$` in top-level prose —
but hits the same hast-handler gap identified in §3.2. The `toHast` call does not handle
`inlineMath`/`math` nodes. The hast-handler fix is required at **both** surfaces.

**Note on micromark extension ordering:** `remark-enscribe` uses micromark's `text` hook for its
tag tokenizer. `remark-math` also uses the `text` hook for `$`-delimiters. These are independent
hooks that stack (each runs on its slice of text). No ordering conflict is anticipated, but this
should be verified with integration tests rather than asserted here.

---

## 6. Version compatibility

Current workspace versions:
- `unified`: v11.0.5 in both packages
- `remark-parse`: v11.0.0 in both packages

Compatibility of the packages to be added:
- `remark-math` v6.0.0: requires `unified >= 11` ✓
- `remark-gfm` v4.0.0: requires `unified >= 11` ✓
- `mdast-util-math` v3.0.0 (peer of `remark-math`): no unified peer dep, pure mdast ✓

Neither `remark-math` nor `remark-gfm` is currently installed in the workspace. Both must be added
as dependencies before any implementation work.

---

## 7. Recommended scope for the G3 implementation slice

The investigation reveals two separable sub-problems:

**G3a — remark-gfm (simpler):**
1. Add `remark-gfm` as a dependency of `enscribe-interpreter`.
2. Add it to the inner processor (`innerProcessor.use(remarkGfm)`).
3. Add it to the outer pipeline (`this.use(remarkGfm)` in `enscribeInterpreter`).
4. Write tests: bare pipe table at top level renders as `<table>`; bare pipe table inside
   `<aside | ...>` renders as `<table>`; `<table md | ...>` still works unchanged.
5. No hast-handler changes needed — `mdast-util-to-hast` already handles GFM tables.

**G3b — remark-math (requires design decision first):**
1. Resolve the hast-handler question from §3.2 (approach a vs b, or a third option).
2. Add `remark-math` as a dependency of `enscribe-interpreter`.
3. Add to inner processor and outer pipeline.
4. Register hast handlers for `inlineMath`/`math` mdast nodes in the `toHast` call.
5. Write tests: bare `$x$` at top level renders via KaTeX; `$x$` inside `<aside | ...>` renders;
   `<$ x $>` sigil form still works unchanged.

**Sequencing recommendation:** G3a first (no design question), G3b after the hast-handler approach
is decided. These can be separate prompts. The spec says they are a single "G3" but the
implementation splits cleanly.

---

## 8. Open sub-questions

1. **Hast handler approach for inlineMath/math (§3.2):** Thin KaTeX wrapper (option a) keeps a
   single rendering path but duplicates the element-wrapping logic from `mathHandler`. Using
   `mdast-util-math`'s hast handlers (option b) gives two output element shapes for math.
   Which is preferable? Requires design input from Ariel.

2. **Micromark extension ordering:** `remark-math` registers in the `text` hook; so does
   `remark-enscribe`. The enscribe `$...$` sigil syntax and `remark-math`'s `$...$` syntax
   occupy the same character space. At the outer level, `remark-enscribe`'s text-hook tokenizer
   only fires inside `<...>` brackets (specifically for the `^{...}` and `_{...}` shortcuts added
   in G1). Raw `$x$` at the outer level is NOT consumed by `remark-enscribe` — it sees `$` as
   plain text and leaves it for `remark-math` to handle. This should be safe, but requires a test
   to confirm no unexpected interaction.

3. **Top-level `$x$` rendering element name:** `remark-math` produces `inlineMath`/`math` nodes
   that, when rendered, produce `<span class="math math-inline">` elements (if using
   `mdast-util-math`'s hast handlers) rather than `<inline-math>` / `<display-math>` (the
   enscribe Layer 1 vocabulary elements). Whether top-level bare math should use the full Layer 1
   element name is a vocabulary question — not strictly required for delegation to work, but it
   affects consistency of the Layer 1 output.

4. **CSS injection for outer-level math:** The `hasMathElements` function in `index.js` walks the
   hast tree looking for `tagName === 'inline-math'` or `tagName === 'display-math'`. If top-level
   bare math renders to `<span class="math math-inline">` (approach b) instead, the KaTeX CSS
   would not be injected. The CSS detection logic would need to be extended.
