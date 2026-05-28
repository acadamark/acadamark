# Phase 2 handler bundle — Phase 0 findings

**Status:** read-only Phase 0 complete. No implementation; no product code,
no spec, no vocab changes. This file is the artifact the implementation
slice(s) will be built from — same role
`notes/dsl-purge-phase0-findings.md` played for the DSL purge.

**Date:** 2026-05-27 (post-`dfdb4f0`).
**Recommendation at end:** SPLIT (one slice per family). Rationale in the
"Bundle vs split" section.

## Phase 2 scope as inherited

Three families of DSL handlers per `BACKLOG.md` L289-310 (the
"Implement DSL handlers" item, scope corrected by `dfdb4f0`):

1. **CSV/TSV** — `<csv>`, `<tsv>`. Comma/tab-separated text → Layer 1
   table structure.
2. **Mermaid/ABC** — `<mermaid>`, `<abc>`. Mermaid diagram DSL or ABC
   music notation → SVG.
3. **Math environments** — `<math>` plus environment tags `<matrix>`,
   `<cases>`, `<align>`, `<eqnarray>`. LaTeX math → MathML/HTML via
   KaTeX.

`<code>`, `<table>`, `<library>`, and the math/code sigils are also in
`DSL_REGISTRY` but inherited from earlier work. Q1.5 settles their scope.

## Q1.1 — `DSL_REGISTRY` contents (post-purge re-verified)

16 entries, all genuine DSLs per `dfdb4f0`. Grouped by family:

**Math/code sigils** (consumed by `getContentHandler` lookup; opacity
markers for the sigil tokenizer):

| Entry | Handler module status |
|---|---|
| `['$', 'math']` | live — `handlers/math.js` |
| `['$$', 'math-display']` | live — `handlers/math.js` |
| `` ['`', 'code'] `` | live — `handlers/inline-code.js` (via the canonical `inline-code` vocab name) |
| `` ['```', 'code-block'] `` | live — `handlers/code-block.js` (via `code-block` vocab name) |

**Family 1 — CSV/TSV:**

| Entry | Handler module status |
|---|---|
| `['csv', 'csv']` | **no `handlers/csv.js`** — placeholder |
| `['tsv', 'tsv']` | **no `handlers/tsv.js`** — placeholder |

**Family 2 — Mermaid/ABC:**

| Entry | Handler module status |
|---|---|
| `['mermaid', 'mermaid']` | **no `handlers/mermaid.js`** — placeholder |
| `['abc', 'abc']` | **no `handlers/abc.js`** — placeholder |

**Family 3 — Math environments:**

| Entry | Handler module status |
|---|---|
| `['math', 'math']` | `handlers/math.js` exists; covers `inline-math`/`display-math` only, not `<math>` long-form (see Q1.3) |
| `['matrix', 'matrix']` | **no `handlers/matrix.js`** — placeholder |
| `['cases', 'cases']` | **no `handlers/cases.js`** — placeholder |
| `['align', 'align']` | **no `handlers/align.js`** — placeholder |
| `['eqnarray', 'eqnarray']` | **no `handlers/eqnarray.js`** — placeholder |

**Other DSLs (inherited; Q1.5 settles scope):**

| Entry | Handler module status |
|---|---|
| `['code', 'code']` | DSL_REGISTRY entry exists; `<code>` long-form vocab uses `interpreter_strategy: schema` (see Q1.5) |
| `['table', 'table']` | live — `handlers/table.js` |
| `['library', 'library']` | **vocab claims `handlers/library.js`; file does not exist** (see Q1.5) |

Of the 16, **9 entries have no handler module** today: csv, tsv, mermaid,
abc, matrix, cases, align, eqnarray, library (the last is a vocab/code
mismatch — see Q1.5).

## Q1.2 — handler dispatch path

Two-stage dispatch model, separately decided per registry:

**Stage 1 — Parser-time `contentHandler` assignment** (sets opacity).
Driven by `DSL_REGISTRY` via `getContentHandler(tagname)`. Consumed in
`packages/remark-acadamark/src/from-markdown.js` at L103 (short-form) and
L203 (long-form):

```js
node.contentHandler = getContentHandler(node.tagname)
node.isOpaqueContent = node.contentHandler !== 'default'
```

For a DSL tag like `<mermaid>`, the parser sets
`contentHandler='mermaid'` and `isOpaqueContent=true`. The
recursive-content plugin (in remark-acadamark) skips opaque-content
nodes, so `node.content` stays as a raw string.

**Stage 2 — Interpreter-time handler dispatch** (produces hast/HTML).
Driven by the vocabulary entry's `interpreter_strategy` and
`handler_module` fields, consumed in
`packages/acadamark-interpreter/src/interpret-plugin.js`:

```js
// L64
const vocabulary = new Map(Object.entries(VOCABULARY));

// L68-74  (the handler registry)
const HANDLER_REGISTRY = new Map([
  ['./handlers/figure.js', figureHandler],
  ['./handlers/math.js', mathHandler],
  ['./handlers/code-block.js', codeBlockHandler],
  ['./handlers/inline-code.js', inlineCodeHandler],
  ['./handlers/table.js', tableHandler],
]);

// L84-114  (the dispatch path inside acadamarkTagHandler)
const vocab = vocabulary.get(node.tagname);
if (!vocab) { warnUnknownTag(...); return makeUnknownElement(state, node); }
if (vocab.interpreter_strategy === 'handler') {
  const handlerFn = HANDLER_REGISTRY.get(vocab.handler_module);
  if (handlerFn) {
    try { return handlerFn(state, node, vocab, opts); }
    catch (err) { warnHandlerError(...); /* fall through to schema */ }
  } else {
    warnUnknownTag(`handler for ${node.tagname} (module ${vocab.handler_module})`);
    /* fall through to schema */
  }
}
return schemaDispatch(state, node, vocab);
```

**Handler signature**: `handlerFn(state, node, vocab, opts) → hast element`.
The `state` is the mdast-util-to-hast state; `node` is the parsed
acadamarkTag (with `node.content` either an opaque string or a parsed
child array depending on `contentHandler`); `vocab` is the vocabulary
entry; `opts` are interpreter options (e.g. `{ assetsDir }`).

**Handler fall-throughs**: if the handler throws or the module isn't
registered, the dispatcher logs a warning and falls through to
`schemaDispatch`. For opaque-content nodes the schema dispatcher's
`convertContent` returns `[]` (interpret-plugin.js:151 — `if
(node.isOpaqueContent) return [];`), so a missing handler for an
opaque-content tag renders as an empty element with attributes only.

**To add a new handler the implementation slice must:**
1. Create `packages/acadamark-interpreter/src/handlers/<name>.js`
   exporting a handler function with the signature above.
2. Add the import + `HANDLER_REGISTRY` entry in `interpret-plugin.js`.
3. The vocabulary entry must declare
   `interpreter_strategy: handler` and
   `handler_module: ./handlers/<name>.js`. **If the vocab entry doesn't
   exist yet, it must be created first** (see Q1.4).
4. The handler reads `node.content` (opaque string when
   `contentHandler !== 'default'`, parsed child array otherwise) and
   produces a hast element.

## Q1.3 — current handler state per family

### Family 1 — CSV/TSV

- **No `handlers/csv.js` or `handlers/tsv.js`.**
- `handlers/table.js` exists and handles the `<table>` element — including
  the qualifying form `<table csv | data...>` and `<table tsv | data...>`
  (table.js's existing dispatch picks the parser based on the first
  positional). This is *not* the same as a standalone `<csv>` / `<tsv>`
  handler — `<csv>` and `<tsv>` are independent tags that should render to
  Layer 1 table structure on their own.
- **No `<csv>` or `<tsv>` test fixture** in `packages/acadamark-interpreter/test/fixtures/`
  (the existing `document-7-tables.acm` uses `<table csv | …>` qualifying
  form, exercising `table.js`'s csv path — not the standalone `<csv>` tag).
- **No `<csv>` or `<tsv>` vocab entry.** Without a vocab entry,
  `<csv>...</csv>` renders as `<span data-acadamark-unknown="csv">`.

**Possible implementation simplification:** since `table.js` already
contains the CSV/TSV parsers, the standalone `<csv>` / `<tsv>` handlers
could be thin wrappers that delegate to the same parsing functions, then
wrap the result in the same Layer 1 table structure `table.js` produces.
Whether to share code or duplicate is an implementation-slice decision;
flagging here so it's not re-derived.

### Family 2 — Mermaid/ABC

- **No `handlers/mermaid.js` or `handlers/abc.js`.**
- **No npm dependency** for mermaid or abcjs (per Q1.6).
- **No vocab entry** for `<mermaid>` or `<abc>`.
- **No test fixture** using either tag.

This family is **greenfield** — handler, vocab, dependency, and fixture
all need creating. Largest implementation footprint of the three families.

**Output target question (not settled by any current artifact):** SVG
inline in the document body? SVG file emitted separately and referenced?
The vocab entry will need to declare the rendered output shape; the
implementation must match. No existing artifact specifies it — this is a
small design decision the implementation slice has to make (or surface for
chat-side resolution before implementation).

### Family 3 — Math environments

- `handlers/math.js` exists and handles canonical `inline-math` and
  `display-math` tagnames (the post-gate-normalization names for the `$`
  and `$$` sigils). At L97 it gates on
  `node.tagname === 'display-math'` for display mode; otherwise inline.
- The **long-form `<math>` tag** is in `DSL_REGISTRY` (`['math', 'math']`)
  but has **no vocab entry**. Currently would render as
  `<span data-acadamark-unknown="math">` if authored.
- The **environment tags** `<matrix>`, `<cases>`, `<align>`, `<eqnarray>`
  are in `DSL_REGISTRY` but have **no vocab entries** and **no handler
  coverage** in `math.js` (the handler only dispatches on
  `inline-math`/`display-math` tagnames).
- KaTeX is **already installed** (used by the existing math handler).
- **No test fixture** for `<math>` long-form or any environment tag.

The environment tags conceptually wrap the inner LaTeX with
`\begin{env}…\end{env}`. The existing `math.js` could be extended to
handle them via tagname dispatch — same handler, same KaTeX call,
different LaTeX wrapping per tagname. Implementation could either share
`math.js` (single handler, per-tagname dispatch) or split into
`handlers/math-env.js` (separate handler delegating to KaTeX). Same
implementation decision as CSV/TSV — flag for the slice.

## Q1.4 — Layer 1 vocab specs for each handler's output

| Tag | Vocab entry | Handler-strategy declaration | Rendered output spec |
|---|---|---|---|
| `<csv>` | **MISSING** | — | — |
| `<tsv>` | **MISSING** | — | — |
| `<mermaid>` | **MISSING** | — | — |
| `<abc>` | **MISSING** | — | — |
| `<math>` (long-form) | **MISSING** | — | — |
| `<matrix>` | **MISSING** | — | — |
| `<cases>` | **MISSING** | — | — |
| `<align>` | **MISSING** | — | — |
| `<eqnarray>` | **MISSING** | — | — |
| `<inline-math>` | `elements/inline-math.md` | handler + `./handlers/math.js` | inline KaTeX HTML inside `<inline-math>` |
| `<display-math>` | `elements/display-math.md` | handler + `./handlers/math.js` | block KaTeX HTML inside `<display-math>` |
| `<code>` (long-form) | `elements/code.md` | **schema** (no handler) | renders schema-style; opacity issue flagged in Q1.5 |
| `<inline-code>` | `elements/inline-code.md` | handler + `./handlers/inline-code.js` | inline highlighted code |
| `<code-block>` | `elements/code-block.md` | handler + `./handlers/code-block.js` | block highlighted code |
| `<table>` | `elements/table.md` | handler + `./handlers/table.js` | parsed data → real `<table>`/`<tr>`/`<td>` |
| `<library>` | `elements/library.md` | handler + `./handlers/library.js` (**file missing — Q1.5**) | invisible (handler fall-through → opaque-empty render) |

**Vocab gap is the dominant Phase 2 finding.** Nine of the family tags
have no vocab entry — meaning a Phase 2 handler implementation alone is
insufficient; vocab entries must be created first or alongside, or the
interpreter's vocab lookup misses and the handler dispatch never fires.

The 9 missing vocab entries are: `csv`, `tsv`, `mermaid`, `abc`, `math`
(long-form), `matrix`, `cases`, `align`, `eqnarray`.

For each, the vocab entry would declare:
- `html_output.element` — what custom element the tag becomes (likely the
  tag name itself for the math envs; `<csv>` and `<tsv>` may render as
  `<table>` after handler processing).
- `interpreter_strategy: handler` + `handler_module` — pointing at the
  Phase-2 handler module to be created.
- `jats_counterpart` — JATS export target; per the JATS-as-reference rule
  the values should be `<table-wrap>` for csv/tsv, `<graphic>` or
  `<inline-graphic>` for mermaid/abc, `<disp-formula>` or `<inline-formula>`
  for math envs.

## Q1.5 — `<code>`, `<table>`, `<library>`, math/code sigils

### `<code>` (long-form)

- `<code>` vocab entry exists; `interpreter_strategy: schema` (not
  `handler`).
- `DSL_REGISTRY` entry `['code', 'code']` makes `<code>`'s content
  `isOpaqueContent: true`.
- **Latent bug:** schema dispatch's `convertContent` returns `[]` for
  opaque-content nodes (`interpret-plugin.js:151`). So `<code | print("hi")>`
  long-form renders as `<code></code>` with **no content**. The pipe
  content is captured by the parser but dropped by the schema dispatcher.

This is a real existing bug uncovered by the Phase 0 reading; not
introduced by Phase 2. **Flagged for the implementation slice.** Fix
options: (a) change `code.md` to `interpreter_strategy: handler` with a
new `handlers/code.js` (similar to `code-block.js`); (b) change the
DSL_REGISTRY entry from `['code', 'code']` to `['code', 'default']` so
content is recursively parsed (loses opacity — content with markdown
metacharacters would be lifted, probably not what authors want for
code); (c) extend schema dispatch to handle opaque-content tags by
emitting the raw string as text. Option (a) is the cleanest and aligns
with how `<inline-code>` / `<code-block>` are handled.

**Scope question:** is this in scope for Phase 2 or filed for follow-up?
Recommendation: file as a sibling Phase 2 item, since the existing
`<inline-code>` and `<code-block>` handlers are precedent and a `<code>`
handler is a small natural addition.

### `<table>`

- `handlers/table.js` exists; live; handles CSV/TSV/JSON/YAML/MD data
  parsing.
- Vocab entry: handler + `./handlers/table.js`. Done.
- `<table>` is **not** the "table" of Q1.3's CSV/TSV family — `<table>` is
  the existing data-format-dispatching tag; CSV/TSV are the standalone
  tags that would render directly to Layer 1 table structure (potentially
  reusing table.js's parsers).

### `<library>`

- Vocab entry: `interpreter_strategy: handler` + `handler_module:
  ./handlers/library.js`.
- **`handlers/library.js` does not exist** in `packages/acadamark-interpreter/src/handlers/`.
- Library content (BibTeX, CSL-JSON) is consumed by `library-load.js`
  PLUGIN at index-build time — not by an interpreter-time handler. The
  vocab's handler_module declaration is **stale / aspirational**; the
  current rendering path is the handler-not-found fall-through (warning
  logged) → schema dispatch → opaque-content → `[]` children. Render
  result: `<library></library>` empty element. Functionally invisible —
  which is what we want for `<library>` (its content is metadata, not
  body content), but the warning is noise.

**Two fix options:** (a) create a stub `handlers/library.js` that
returns `null` (suppress the element entirely so `<library></library>`
doesn't appear in output); (b) change the vocab to
`interpreter_strategy: schema` (acknowledging the schema path is the
intended renderer, which produces the same empty element). Either is a
small drift-fix; not Phase-2-handler work per se, but worth bundling
into Phase 2 if convenient.

### Math/code sigils

- `<$ … $>` / `<$$ … $$>` → normalized to canonical `inline-math` /
  `display-math` tagnames at the gate (`normalize-to-canonical.js`).
- `<` ` … ` `>` / `<``` … ```>` → normalized to `inline-code` /
  `code-block`.
- The interpreter dispatches on the canonical tagname; handler is the
  same as for the long-form named tag.
- **All four sigils have working handlers**: `math.js`, `inline-code.js`,
  `code-block.js`. Done; not in scope of Phase 2.

The DSL_REGISTRY entries for the sigils (`['$', 'math']`, `['$$', 'math-display']`,
` ['`', 'code'] `, ` ['```', 'code-block'] `) are consumed by the
parser at content-handler-assignment time to mark sigil content opaque.
The handlers don't read DSL_REGISTRY directly.

## Q1.6 — dependencies and environment

`grep -hE 'katex|mermaid|abcjs|papaparse|csv-|shiki|prism|highlight'` across
all `package.json` files in the monorepo:

| Dependency | Present? | Used for |
|---|---|---|
| `katex` (^0.16.45) | **installed** | Family 3 math envs (extend existing math handler) |
| `mermaid` | **not installed** | Family 2 mermaid handler |
| `abcjs` (or alternative) | **not installed** | Family 2 abc handler |
| `papaparse` (or csv-parse) | **not installed** | Family 1 csv/tsv handlers — though `table.js` already has CSV parsing (need to verify whether it uses an external library or hand-rolls the parse) |
| `shiki` / `prism` / `highlight.js` | **not installed** | Already-handled `inline-code` / `code-block` (the current handlers use a minimal approach without a heavy highlighter library — verify) |

Per-family npm install cost:
- Family 1 — possibly zero (if `table.js`'s CSV/TSV parser is reusable);
  otherwise ~1 small package.
- Family 2 — `mermaid` is a heavyweight package (~MB of bundled code); `abcjs`
  similar. Real dependency-footprint expansion.
- Family 3 — zero, KaTeX already installed.

## Q1.7 — Phase 2 backlog/roadmap scope correction

`BACKLOG.md` L289-310 (the "Implement DSL handlers" detailed entry) and
L90-93 (checklist line) correctly state three families post-purge.
`BACKLOG.md` is clean.

`ROADMAP.md` Phase 2 detailed section L121-126 correctly states three
families post-purge.

**Two stale references in ROADMAP.md** carrying the old four-family
framing:

- **`ROADMAP.md:64`** — "The roadmap moves to Phase 2 next — output
  handlers and DSL surface, **including the theorem-family handler** that
  now has its Layer 1 vocabulary to operate on." (The "Current position"
  paragraph in Phase 1's CLOSED section.) The "including the theorem-
  family handler" clause is now wrong — there is no theorem-family handler
  (theorem is regular vocab per `dfdb4f0`).

- **`ROADMAP.md:90-94`** — inside the Phase 1 sub-slice-3 description:
  "The matching `<theorem>` handler — numbering, label rendering, QED,
  optional-name display — is Phase 2 work, decoupled from the vocab
  entries by ruling." This statement also describes a Phase-2 theorem-
  family handler that no longer exists in Phase 2 scope. The numbering /
  label / QED rendering is now regular-vocabulary work (scheduled
  separately if and when taken up, per the BACKLOG.md handler-bundle
  detailed entry's note).

**Both are stale.** They were written in the sub-slice-3 STATUS milestone
and the post-sub-slice-3 ROADMAP "Phase 1 closed" rewrite, before
`dfdb4f0` retired the theorem-family handler from Phase 2 scope. Flagged
here per the Phase 0 read-only constraint; not fixed in this slice.

**Recommendation:** rewrite both as part of the implementation slice's
backlog/roadmap reconciliation step, or as a tiny separate hygiene
commit if the implementation slice will be split into multiple slices
(see "Bundle vs split" below). Either way, an explicit edit.

## Bundle vs split recommendation

**Recommendation: SPLIT — three slices, one per family.**

Reasoning:

1. **Three families have materially different complexity profiles.**
   Family 1 (CSV/TSV) is small: existing `table.js` parsers are reusable;
   only handler wiring + vocab entry per tag. Family 3 (math envs) is
   medium: extend existing `math.js` for env tags; new vocab entries; one
   tagname-dispatch path. Family 2 (Mermaid/ABC) is large: greenfield
   handler + vocab + dependency-install (heavyweight packages) + output-
   target design decision + fixture creation from scratch.

2. **Family 2 has an unresolved design question** (SVG inline vs
   referenced; vocab entry shape). That belongs in a focused slice that
   surfaces it as Step 1 work — not bundled with families that don't have
   it.

3. **Vocab-entry creation is the dominant cost** (9 missing entries per
   Q1.4). Spreading the vocab-write work over three slices reduces each
   slice's "many new files" character.

4. **Test-fixture overlap is zero** — no existing fixture exercises any
   of the family tags. Each family's fixture is a fresh creation; no
   shared fixture infrastructure is at stake.

5. **Dependency footprint** — Family 2's `mermaid` + `abcjs` is a real
   bundle-size expansion. Landing it in a focused slice makes the cost
   visible in one commit, rather than mixed with other families' diffs.

6. **Per-slice scope follows naturally:**
   - **Slice 2a — CSV/TSV.** Two vocab entries (`csv.md`, `tsv.md`); two
     handler modules (possibly thin wrappers around `table.js` parsers);
     one fixture; backlog tick. Smallest slice.
   - **Slice 2b — Math environments.** Five vocab entries (`math.md`
     long-form plus four envs); one handler-extension to `math.js` with
     per-tagname dispatch; fixture. Medium.
   - **Slice 2c — Mermaid/ABC.** Two vocab entries; two handler modules;
     two npm-install commits (or one combined); output-target design
     decision settled or surfaced as Phase 0 of the slice; fixture.
     Largest.

7. **Order suggestion:** 2a → 2b → 2c. 2a is cheapest and gets one
   family closed; 2b extends an existing handler (lowest-risk medium
   slice); 2c is the heaviest but lands by itself.

**Two sibling cleanup items** worth bundling into 2a or filing
separately:

- `<code>` long-form opaque-content bug (Q1.5) — small, ~50 LOC handler
  parallel to `inline-code.js`. Could ride with 2a (since CSV/TSV's
  delivery would similarly be "small handler + vocab"). Or filed as a
  separate `[post-alpha]` item.
- `<library>` stale handler_module declaration (Q1.5) — drift fix
  (3 lines of vocab edit). Could ride with any slice or with a
  separate hygiene commit.
- ROADMAP.md L64 + L90-94 stale theorem-family-handler references
  (Q1.7) — single drift fix in one commit, separate from any
  implementation slice.

## What is recorded vs. what is open

Recorded above:
- Q1.1 catalog of all 16 DSL_REGISTRY entries with handler-module status.
- Q1.2 the two-stage dispatch path with file/line references.
- Q1.3 current handler state per family (no handlers exist for any of
  the 9 family DSL tags; existing `math.js` covers only sigil-normalized
  names).
- Q1.4 the vocab-entry gap (9 missing entries — the dominant Phase 2
  finding).
- Q1.5 scope settlement for `<code>`, `<table>`, `<library>`, and the
  sigils. Two latent bugs surfaced: `<code>` long-form drops content;
  `<library>` claims a non-existent handler module.
- Q1.6 dependency presence (katex installed; mermaid/abcjs/papaparse
  not installed).
- Q1.7 backlog/roadmap scope confirmation. Two stale references in
  ROADMAP.md flagged.

Open (deferred to the implementation slice(s) per the strict Step 1
read-only constraint):
- Implementation of any handler.
- Creation of any vocab entry.
- Edit of the two stale ROADMAP.md references.
- The `<code>` long-form opaque-content fix.
- The `<library>` vocab/code reconciliation.
- The Mermaid/ABC output-target design decision.
