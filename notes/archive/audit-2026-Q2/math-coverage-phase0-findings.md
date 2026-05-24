# Math-coverage Phase 0 findings

**Date:** 2026-05-22  
**Purpose:** Design input for the G3 implementation prompt (math half). Read-only investigation of
the existing math authoring surface, `remark-math`'s tokenizer coverage, and the gap/overlap
between them. No code, tests, or documents were modified.

**Files read at code level:**
- `notes/idioms.md` (delegation principle, the claim under investigation)
- `notes/dsl-engines.md` (DSL engine table, `<math>`/environment tags)
- `packages/remark-acadamark/src/dsl-registry.js` (math DSL registry entries)
- `packages/remark-acadamark/src/generated/parser.js` (sigil `isOpaqueContent` assignments)
- `packages/remark-acadamark/src/from-markdown.js` (short/long-form contentHandler assignment)
- `packages/acadamark-interpreter/src/interpret-plugin.js` (HANDLER_REGISTRY)
- `packages/acadamark-interpreter/src/handlers/math.js` (mathHandler)
- `packages/layer1-vocabulary/elements/inline-math.md` (vocabulary entry)
- `packages/layer1-vocabulary/elements/display-math.md` (vocabulary entry)
- `packages/layer1-vocabulary/SPEC.md` (lines 199–208, math section)
- `packages/acadamark-interpreter/src/index.js` (`hasMathElements` detector)

**Documentation read (not code-verified — marked as such in findings):**
- `remark-math` v6 README (GitHub: `remarkjs/remark-math`)
- `micromark-extension-math` v3 README and BNF grammar (GitHub: `micromark/micromark-extension-math`)
- `mdast-util-math` v3 README and node-type specification (GitHub: `syntax-tree/mdast-util-math`)

---

## 1. Question and scope

`notes/idioms.md` ("When acadamark supersedes the lexer") states:

> remark-math's tokenizer recognizes delimiter-shaped math: `$...$` and `$$...$$`. It does not
> recognize environment-shaped math — `\begin{matrix}...\end{matrix}` and similar. Acadamark
> intends to support a wider LaTeX math surface than the delimiter forms. For the environment
> forms, there is no remark wheel to reuse, so acadamark provides its own: the DSL long-form tags
> (`<matrix>`, `<cases>`, `<align>`, `<eqnarray>`) reserved in the DSL registry.

This Phase 0 verifies that claim, inventories the full math authoring surface, and produces the
coverage table that decides whether `remark-math` is an adequate wheel for the delimiter cases.

The design decisions — that bare `$x$` normalizes to the acadamark `$` sigil node, that acadamark
delegates the lexer but owns the node identity — are settled in `idioms.md` and `DESIGN.md` and
are **not reopened here**. This investigation is a coverage-and-adequacy check, not a design debate.

---

## 2. Question 1 — Acadamark's existing math authoring surface

### 2.1 Sigil tags (implemented: parser + interpreter)

**`<$ ... $>` — inline math**

- Parser: Peggy grammar produces `{ tagname: '$', isOpaqueContent: true, content: <string> }`.
  `generated/parser.js` lines 406–412: `makeNode("$", { isOpaqueContent: true, content })`.
  `from-markdown.js` `exitAcadamarkTag` sets `contentHandler = getContentHandler('$')` → `'math'`
  (from `dsl-registry.js` line 33: `['$', 'math']`). `isOpaqueContent` is already `true` from the
  grammar; the `from-markdown.js` condition `if (node.contentHandler === 'default' ...)` does not
  fire, leaving it unchanged.
- Vocabulary: `packages/layer1-vocabulary/elements/inline-math.md` —
  `interpreter_strategy: handler`, `handler_module: ./handlers/math.js`.
- Interpreter: `HANDLER_REGISTRY` in `interpret-plugin.js` line 63 maps `'./handlers/math.js'` to
  `mathHandler`. `mathHandler` calls `katex.renderToString(latex, { displayMode: false })` and
  wraps the result in `<inline-math>`.
- Status: **fully implemented**.

**`<$$ ... $$>` — display math**

- Parser: `generated/parser.js` lines 397–403: `makeNode("$$", { isOpaqueContent: true, content })`.
  `dsl-registry.js` line 34: `['$$', 'math-display']`.
- Vocabulary: `packages/layer1-vocabulary/elements/display-math.md` — same handler module.
- Interpreter: `mathHandler` calls `katex.renderToString(latex, { displayMode: true })`, wraps in
  `<display-math>`. Equation-numbering hook: `node.computedNumber` (set by the numbering plugin)
  appends `<span class="equation-number">(N)</span>` after the KaTeX output. Supports `+numbered` /
  `-numbered` attribute.
- Status: **fully implemented**.

### 2.2 DSL long-form math tags (registered in parser, not implemented in interpreter)

All of the following are in `dsl-registry.js`, giving them a content handler at parse time. None
have a vocabulary entry in `packages/layer1-vocabulary/elements/` and none appear in
`interpret-plugin.js`'s `HANDLER_REGISTRY`. The interpreter would hit `warnUnknownTag` and emit
a `<span data-acadamark-unknown="tagname">` fallback.

| Tag | Registry entry (`dsl-registry.js`) | Intended math form | Vocab entry | Handler |
|-----|-----------------------------------|--------------------|-------------|---------|
| `<math \| ...>` | `['math', 'math']` | Display math (generic) | None | None |
| `<matrix>...</matrix>` | `['matrix', 'matrix']` | `\begin{matrix}...\end{matrix}` | None | None |
| `<cases>...</cases>` | `['cases', 'cases']` | `\begin{cases}...\end{cases}` | None | None |
| `<align>...</align>` | `['align', 'align']` | `\begin{align}...\end{align}` | None | None |
| `<eqnarray>...</eqnarray>` | `['eqnarray', 'eqnarray']` | `\begin{eqnarray}...\end{eqnarray}` | None | None |

`dsl-engines.md` lists `<math>`, `<$>`, `<$$>` as having default display "KaTeX-rendered HTML"
(line ~113). The `<math>` entry is aspirational — no vocabulary specification, no implementation.

### 2.3 Other math routes

No other route to math exists in the codebase. There is no raw HTML passthrough for math, no
`rehype-katex` integration, and no `\begin{...}` at-parse-time detection. The only working
math paths are the two sigil forms (`$` and `$$`).

---

## 3. Question 2 — What remark-math's tokenizer actually recognizes

**Source:** `micromark-extension-math` v3 README BNF grammar and `remark-math` v6 README — fetched
from GitHub, documented facts, not code-verified locally (package not installed in workspace).

The BNF grammar in `micromark-extension-math`:

```bnf
mathText ::= sequenceText 1*byte sequenceText
mathFlow ::= fenceOpen *( eol *line ) [ eol fenceClose ]

; Restriction: not preceded or followed by the marker.
sequenceText ::= 1*"$"

fenceOpen  ::= sequenceFlow meta
fenceClose ::= sequenceFlow *spaceOrTab
sequenceFlow ::= 2*"$"
```

**What remark-math recognizes (documented fact):**

1. **`$...$`** — inline ("text") math. The `sequenceText ::= 1*"$"` rule means any number of `$`
   markers, but in practice `$x$` is the single-dollar form. Controlled by the option
   `singleDollarTextMath` (default: `true`). When disabled, single-dollar inline math is not
   recognized; `$$x$$` in text context is then the minimum.

2. **`$$...$$`** (at flow level, i.e. as a block construct) — display ("flow") math. The
   `sequenceFlow ::= 2*"$"` rule requires two or more `$` markers at the start of a line. This is
   block-level: the entire `$$\n...\n$$` block becomes a `math` node.

3. **Fenced code with info string `math`** — mentioned in authoring docs as an alternative
   notation. This is NOT part of remark-math's tokenizer; it is a GFM fenced code block
   (```` ```math ````). Downstream tools that inspect the `lang` attribute can render it as math.
   remark-math itself does not produce math nodes from this form.

**What remark-math does NOT recognize (documented by absence — no grammar rule exists):**

- `\(...\)` — LaTeX inline math delimiters. Not in the grammar.
- `\[...\]` — LaTeX display math delimiters. Not in the grammar.
- `\begin{...}...\end{...}` — LaTeX environments. Not in the grammar. These pass through as
  plain text in remark-math's model; if they appear as the *content* of a `$...$` or `$$...$$`
  math node, KaTeX will render them correctly inside the math node, but remark-math's tokenizer
  does not recognize the `\begin` boundaries as math delimiters in their own right.

**Node types produced (documented fact):**

```typescript
interface InlineMath extends Literal {
  type: 'inlineMath'
  data?: InlineMathData
}

interface Math extends Literal {
  type: 'math'
  meta?: string | null
  data?: MathData
}
```

Both nodes have a `value` field (the LaTeX content string). `meta` on `math` (flow) nodes holds
optional metadata from the fence opening line (e.g., `$$ my-label $$`); it is preserved but
ignored by remark-math's rendering path.

**HTML output (documented fact):** Via `remark-rehype` (without `rehype-katex`): `inlineMath` →
`<code class="language-math math-inline">`, `math` → `<pre><code class="language-math math-display">`.
Via `rehype-katex`: KaTeX-rendered HTML in `<span class="math math-inline">` /
`<div class="math math-display">`. Acadamark does not use either of these paths; it rewrites
remark-math's nodes into `acadamarkTag` nodes and renders through its own `mathHandler`.

---

## 4. Question 3 — Acadamark's coverage of forms remark-math does not tokenize

For each form remark-math does not recognize:

| Form | remark-math covers | Acadamark DSL coverage |
|------|-------------------|------------------------|
| `\begin{matrix}...\end{matrix}` | No | `<matrix>...</matrix>` — DSL registry entry, not yet implemented in interpreter |
| `\begin{cases}...\end{cases}` | No | `<cases>...</cases>` — DSL registry entry, not yet implemented |
| `\begin{align}...\end{align}` | No | `<align>...</align>` — DSL registry entry, not yet implemented |
| `\begin{eqnarray}...\end{eqnarray}` | No | `<eqnarray>...</eqnarray>` — DSL registry entry, not yet implemented |
| `\begin{...}` (arbitrary) | No | Partial: the four above are reserved. Unknown environments must be wrapped in `<$$>` or `<math>`. |
| `\(...\)` (LaTeX inline delimiters) | No | **Not covered.** No DSL tag, no sigil, no registration. |
| `\[...\]` (LaTeX display delimiters) | No | **Not covered.** No DSL tag, no sigil, no registration. |

**The point of this column:** remark-math's tokenizer gaps for environment-shaped math are not
acadamark gaps, because acadamark fills them by a different route (DSL long-form tags). An author
who writes `\begin{align}...\end{align}` in bare text is currently not supported, but the intended
route is `<align>\begin{align}...\end{align}</align>` (or a future shorthand that compiles to it).

The `\(...\)` / `\[...\]` gap is different: it is not covered by any existing acadamark mechanism.
See §5 open sub-question.

---

## 5. Question 4 — The adequacy verdict

### 5.1 Is remark-math an adequate wheel for the `$...$` / `$$...$$` delimiter cases?

**Yes.** For the forms `$x$` (inline) and `$$\n...\n$$` (display block), remark-math's tokenizer
does exactly what is needed: it finds the delimiter boundaries in a stream of text, extracts the
LaTeX content, and produces `inlineMath` / `math` mdast nodes. The normalization pass (planned in
the G3 slice) rewrites those nodes into `acadamarkTag { tagname: '$' }` and
`acadamarkTag { tagname: '$$' }` respectively — the same nodes the sigil parser produces for
`<$ x $>` and `<$$ x $$>`. Downstream of normalization, `mathHandler` renders both forms via
KaTeX, and the canonical `<inline-math>` / `<display-math>` element names are produced in both
cases. The two paths converge fully.

remark-math does not touch the `<$ ... $>` and `<$$ ... $$>` sigil forms at all: those are
consumed by the acadamark micromark extension before remark-math's tokenizer runs.

### 5.2 Is the `notes/idioms.md` claim accurate?

**Yes, with one gap not mentioned.** The claim reads:

> remark-math's tokenizer recognizes delimiter-shaped math: `$...$` and `$$...$$`. It does not
> recognize environment-shaped math — `\begin{matrix}...\end{matrix}` and similar.

This is accurate as stated. The BNF grammar confirms: only `$` delimiters, no `\begin` rules.

The one thing the claim does not mention: `\(...\)` and `\[...\]` (LaTeX alternative delimiters)
are also not recognized by remark-math, and are also not covered by any existing acadamark
mechanism. The spec does not need to be *corrected* — it says nothing false — but it does not
acknowledge this gap either. See §5.3.

### 5.3 Open sub-question: `\(...\)` and `\[...\]`

Neither remark-math nor the current acadamark DSL tags cover the LaTeX alternative delimiters
`\(...\)` (inline) and `\[...\]` (display). KaTeX supports them at render time (they are valid
LaTeX math mode), but the acadamark tokenizer would have to encounter the `\(` boundary explicitly
in source to recognize the math span.

Options, stated but not resolved here:
- (a) **Accept the gap.** Authors who prefer `\(...\)` syntax use `<$ ... $>` instead. No new
  machinery. Academic writing communities that standardize on `$...$` (most) are unaffected.
- (b) **Cover via a dedicated acadamark tokenizer.** Add a micromark extension that finds `\(...\)`
  and `\[...\]` and emits `acadamarkTag { tagname: '$' / '$$' }` directly. This is "superseding
  the lexer" in the sense of `idioms.md`, but for a form remark never covered.
- (c) **Document as a known limitation.** Update `notes/known-limitations.md` with an entry
  stating `\(...\)` and `\[...\]` are not recognized as math delimiters; authors should use the
  acadamark sigil forms or bare `$...$`.

This is a design sub-question for the chat, not for the G3 implementation prompt. G3 can proceed
with the `$...$` path and leave this gap explicitly documented.

---

## 6. Three-column coverage table

| Math form | remark-math tokenizer | Acadamark existing / intended coverage |
|---|---|---|
| `$x$` (inline, bare) | ✅ `inlineMath` node (via `singleDollarTextMath: true`) | Normalization pass rewrites to `acadamarkTag { tagname: '$' }` — same as `<$ x $>` sigil |
| `$$...$$` (display block, bare) | ✅ `math` node | Normalization pass rewrites to `acadamarkTag { tagname: '$$' }` — same as `<$$ ... $$>` sigil |
| `<$ ... $>` (sigil, in-tag) | ✅ not consumed (sigil parser claims `<...>`) | Fully implemented: `mathHandler` → `<inline-math>` |
| `<$$ ... $$>` (sigil, in-tag) | ✅ not consumed | Fully implemented: `mathHandler` + equation numbering → `<display-math>` |
| `\(...\)` (LaTeX inline delimiters) | ❌ not recognized | ❌ not covered (no DSL tag, no tokenizer) |
| `\[...\]` (LaTeX display delimiters) | ❌ not recognized | ❌ not covered (no DSL tag, no tokenizer) |
| `\begin{matrix}...\end{matrix}` | ❌ not recognized | 🔧 `<matrix>` — DSL registry entry, no interpreter handler yet |
| `\begin{cases}...\end{cases}` | ❌ not recognized | 🔧 `<cases>` — DSL registry entry, no interpreter handler yet |
| `\begin{align}...\end{align}` | ❌ not recognized | 🔧 `<align>` — DSL registry entry, no interpreter handler yet |
| `\begin{eqnarray}...\end{eqnarray}` | ❌ not recognized | 🔧 `<eqnarray>` — DSL registry entry, no interpreter handler yet |
| `\begin{...}` (other environments) | ❌ not recognized | ⚠️ No specific tag; must be wrapped in `<$$>` or `<align>` as LaTeX source |
| `<math \| ...>` (generic named tag) | ❌ not consumed | 🔧 DSL registry entry, no vocabulary entry, no interpreter handler |

Legend: ✅ covered, ❌ gap, 🔧 registered/planned but not implemented, ⚠️ partial workaround.

---

## 7. Also note

### 7.1 `hasMathElements` detector is safe on the canonical path

The `hasMathElements` function in `packages/acadamark-interpreter/src/index.js` (line ~191) checks
for `tagName === 'inline-math'` or `tagName === 'display-math'` in the hast tree to decide whether
to inject KaTeX CSS. On the canonical normalization path:

1. `remark-math` tokenizes `$x$` → `inlineMath` mdast node.
2. Normalization pass rewrites it → `acadamarkTag { tagname: '$' }`.
3. `mathHandler` renders it → `<inline-math>` hast element.

The element name `inline-math` matches the detector. KaTeX CSS is injected correctly. **This is a
non-issue** as long as normalization runs before the compile step — which is the defined order.

If normalization were accidentally skipped, `inlineMath` mdast nodes would reach `toHast` without
a handler, and the CSS would not be injected. This is not a risk in the current design but is worth
noting as a test to write: a document that uses bare `$x$` should produce KaTeX-styled output.

### 7.2 Version compatibility

- `remark-math` v6: requires `unified >= 11` ✓ (workspace has `unified@11.0.5` in both packages)
- `remark-math` v6: works with `remark >= 14` ✓ (`remark-parse@11` bundles remark 14)
- `micromark-extension-math` v3: `remark-math` v6 bundles it as a peer dependency; no separate
  install needed
- `mdast-util-math` v3: also bundled by `remark-math` v6
- Neither `remark-math` nor `mdast-util-math` is currently installed in the workspace

### 7.3 KaTeX options — no conflict with existing mathHandler

`remark-math` v6 is a tokenizer only. It does not call KaTeX. It does not set KaTeX options. The
normalization pass's job is to rewrite `inlineMath`/`math` nodes → `acadamarkTag` nodes; after
that, `mathHandler` drives KaTeX with its existing options (`throwOnError: false`,
`displayMode: <true|false>`, `output: 'html'`). Nothing in remark-math touches or conflicts
with these. **The rendering path is unchanged by adding remark-math.**

The one option to decide when wiring remark-math in: `singleDollarTextMath` (default: `true`).
Keeping the default means bare `$x$` in prose is tokenized as math. Turning it off would mean
single-dollar math requires `$$x$$` inline. The `idioms.md` table lists `$x$` as a valid
shorthand; leaving `singleDollarTextMath: true` is consistent with the spec.

### 7.4 Drift finding — `layer1-vocabulary/SPEC.md` math section is outdated

`packages/layer1-vocabulary/SPEC.md` lines 203–208:

> - Inline math becomes mdast `inlineMath` (from `remark-math`), rendered by `rehype-katex`.
> - Display math becomes mdast `math`, rendered by `rehype-katex`.
> …
> These don't need new Layer 1 elements.

This describes the pre-normalization design where `inlineMath` / `math` mdast nodes were passed
directly to `rehype-katex`. The current design and implementation are different on three points:

1. Inline and display math *do* have Layer 1 elements: `inline-math.md` and `display-math.md`
   both exist in `elements/`. The "don't need new Layer 1 elements" claim is false.
2. Rendering is via KaTeX directly in `mathHandler`, not via `rehype-katex`.
3. On the normalization model, `inlineMath` mdast nodes are transient — they exist only between
   the remark-math tokenizer and the normalization pass, which rewrites them to `acadamarkTag`
   before any downstream plugin sees them.

**This section needs updating.** The correct description of the current design:

> Inline math (`$x$`) and display math (`$$...$$`) are represented as `acadamarkTag` nodes with
> `tagname: '$'` and `tagname: '$$'` respectively. The vocabulary entries are `inline-math` and
> `display-math`. The interpreter renders them via KaTeX through `mathHandler`. When the
> normalization pass is active, bare `$x$` in prose (tokenized by `remark-math` as `inlineMath`)
> is rewritten to the same `acadamarkTag` form before any structural plugin runs.

Fixing this is outside the scope of this Phase 0 (read-only pass). Recording it here as a finding
for a future docs-reconciliation commit.

### 7.5 Implicit normalization pass not yet built

No normalization pass exists in the codebase today. The `idioms.md` table implies one — it says
bare `$x$` "is" the same node as `<$ x $>`. That is the *intended* state, not the current state.
Currently, a bare `$x$` in source would reach `remark-math` only if `remark-math` is added to the
pipeline, and even then it would produce an `inlineMath` mdast node that reaches `toHast` unhandled
(the interpreter's `toHast` call registers handlers only for `acadamarkTag`).

G3's math half requires building this normalization pass as part of the implementation — it cannot
be skipped. The pass is a single `unist-util-visit` walk (analogous to `remarkRecursiveContent`)
that rewrites `inlineMath` → `acadamarkTag { tagname: '$', ... }` and `math` → `acadamarkTag
{ tagname: '$$', ... }`. This is straightforward, but it is a deliverable of G3, not a pre-existing
piece.
