# DSL conceptual purge — Phase 0 findings

**Status:** read-only Phase 0 complete; stop-and-report fired on Q1.3; the
implementation phase did not run. The slice prompt that triggered this Phase 0
needs to be rewritten with these findings as input, then re-run.

**Date:** 2026-05-27.
**No commits made by Phase 0.** No writes to product code or specs. This file is
the only product of the Phase 0 run; it lives in `notes/` (not `notes/archive/`)
because the work it informs is upcoming, not closed.

## What the original slice was

"DSL conceptual purge (repository-wide)" — separate **DSLs** from **everything
else currently sitting in `DSL_REGISTRY`**, with the goal of making
`DSL_REGISTRY` contain only what its name claims. The slice's rubric defined
two categories — DSLs (foreign-language interpretation with delegated
processor) and structured-data-containers (field record) — and treated
everything else as "regular vocabulary," asserted to reach the parser through
"the regular long-form-vocabulary mechanism." Phase 0 was supposed to confirm
the regular mechanism exists; the implementation phase was supposed to remove
the misfiled entries from `DSL_REGISTRY` and let them reach the parser via
that regular mechanism.

## The stop-and-report finding (Q1.3)

**There is no separate regular-vocabulary long-form mechanism. `DSL_REGISTRY`
is the only mechanism for long-form-tag eligibility, alongside
`STRUCTURED_ELEMENTS` (which carries `<meta>` and `<author>` only).** The
parser's `acadamarkSyntax` builds `LONG_FORM_TAGS = DSL_REGISTRY ∪
STRUCTURED_ELEMENTS` at module load and rejects long-form admission for any
tag not in the union (`makeLongFormTokenizer`'s
`if (!registry.has(tagName)) return nok(code)` at `syntax.js:583`).

Evidence:

- `<section>` is not in `DSL_REGISTRY` and not in `STRUCTURED_ELEMENTS`. Every
  fixture authors `<section | Title>` short-form-with-pipe-content. No fixture
  authors `<section>…</section>` long-form. A `<section>…</section>` long-form
  would not parse today.
- The 21 regular-vocab entries currently in `DSL_REGISTRY` are there *because*
  they need long-form-eligibility for their natural authoring (e.g.
  `<dl><dt><dd>…</dl>` needs `<dl>` admitted as long-form). They are not
  misfiled in the structural sense — they are correctly using the only
  mechanism that exists, but that mechanism is misnamed.

Per the slice prompt's literal stop-and-report criterion:

> *Via `DSL_REGISTRY`.* If every long-form tag has to be in `DSL_REGISTRY` to
> be parsed long-form, then there is no separate regular-vocabulary long-form
> mechanism, and the registry is doing double duty by necessity. This would
> mean the purge cannot simply *remove* entries — it would need to first build
> (or surface) a separate `LONG_FORM_VOCAB` registry for the displaced entries.
> **Report this as a major scope finding if true.**

It is true. The slice's "purge and rely on regular mechanism" plan is not
viable as written.

## Q1.1 — `DSL_REGISTRY` contents, categorized

37 entries total. Categorized per the slice's two-category rubric (DSL vs
regular vocab — `STRUCTURED_ELEMENTS` already covers structured-data-containers
separately).

**16 genuine DSLs** (foreign-language interpretation with delegated processor):

| Entry | Handler status |
|---|---|
| `['$', 'math']` | live (KaTeX) |
| `['$$', 'math-display']` | live (KaTeX) |
| `` ['`', 'code'] `` | live (highlighter) |
| `` ['```', 'code-block'] `` | live (highlighter) |
| `['csv', 'csv']` | live (table.js) |
| `['tsv', 'tsv']` | live (table.js) |
| `['math', 'math']` | live (KaTeX) |
| `['code', 'code']` | live (highlighter) |
| `['mermaid', 'mermaid']` | placeholder (no handler yet) |
| `['abc', 'abc']` | placeholder |
| `['matrix', 'matrix']` | placeholder (math env) |
| `['cases', 'cases']` | placeholder (math env) |
| `['align', 'align']` | placeholder (math env) |
| `['eqnarray', 'eqnarray']` | placeholder (math env) |
| `['table', 'table']` | live (data parser) |
| `['library', 'library']` | live (citation-js) |

The math/code sigils (`$`, `$$`, `` ` ``, ` ``` `) and their long-form siblings
(`math`, `code`) are the same DSL family in two forms.

**21 regular-vocab entries** (currently in `DSL_REGISTRY` for long-form-
eligibility only):

| Entry | Origin |
|---|---|
| `['#', 'default']` | section sigil shorthand |
| `['##', 'default']` | sub-section sigil shorthand |
| `['###', 'default']` | sub-sub-section sigil shorthand |
| `['theorem', 'theorem']` | **misfile — handler does not exist** (line-45 placeholder from sub-slice 3 finding) |
| `['aside', 'default']` | structural long-form container |
| `['blockquote', 'default']` | structural long-form container |
| `['note', 'default']` | structural long-form container |
| `['ul', 'default']` | list element |
| `['ol', 'default']` | list element |
| `['li', 'default']` | list element |
| `['dl', 'default']` | definition list (sub-slice 2) |
| `['glossary', 'default']` | glossary container (sub-slice 2) |
| `['details', 'default']` | disclosure container (sub-slice 2) |
| `['lemma', 'default']` | theorem family (sub-slice 3) |
| `['corollary', 'default']` | theorem family (sub-slice 3) |
| `['proposition', 'default']` | theorem family (sub-slice 3) |
| `['definition', 'default']` | theorem family (sub-slice 3) |
| `['example', 'default']` | theorem family (sub-slice 3) |
| `['remark', 'default']` | theorem family (sub-slice 3) |
| `['proof', 'default']` | theorem family (sub-slice 3) |
| `['data', 'default']` | structural container for resources |

`['theorem', 'theorem']` is the only entry pointing at a *non-existent* handler.
The other "not implemented" DSL entries (`mermaid`, `abc`, `matrix`, `cases`,
`align`, `eqnarray`) are placeholders intended to be DSLs.

## Q1.2 — what `DSL_REGISTRY` actually drives

Three consumers in live product code:

1. **`packages/remark-acadamark/src/syntax.js`** (parser). `acadamarkSyntax`'s
   `options.dslRegistry` defaults to `LONG_FORM_TAGS` (the union, exposed by
   `acadamark-core/structured-elements.js`). Passed to
   `makeLongFormTokenizer`, whose only registry call is
   `if (!registry.has(tagName)) return nok(code)` at L583. Registry membership
   confers long-form parsing eligibility — nothing more, nothing less.

2. **`packages/remark-acadamark/src/from-markdown.js`** (parser). Calls
   `getContentHandler(tagname)` to set `node.contentHandler` on both short-form
   (L103) and long-form (L203) nodes. Drives `isOpaqueContent`
   (`contentHandler !== 'default'` → opaque). For a tag not in the registry,
   `getContentHandler` returns `'default'` (via the `?? 'default'` fallback) —
   so a tag's *absence* from the registry is well-defined: it is short-form-
   only and gets the default handler.

3. **`packages/acadamark-interpreter/src/plugins/normalize-to-canonical.js`**
   (interpreter). Three load-time drift guards assert specific handler values:
   `getContentHandler('$') === 'math'`, `getContentHandler('$$') === 'math-
   display'`, `getContentHandler('table') === 'table'`. Plus `liftInlineCode`
   reads `getContentHandler('inline-code')`. If `$` / `$$` / `table` were
   removed from `DSL_REGISTRY`, the drift guards would fail
   (`getContentHandler` would return `'default'` instead of the asserted
   handler name).

Comments in `cite-resolution.js` and `handlers/table.js` reference the registry
but don't call it.

## Q1.4–Q1.6 — not investigated

Per the stop-and-report criterion ("before any writes") I did not proceed to
Q1.4 (`dslRegistry` option call-site surface), Q1.5 (spec/comment carriers
catalog), or Q1.6 (backlog scope rewording). Those remain to do, conditional
on the slice prompt being rewritten with Q1.3's finding as input.

## Assessment of the three options the rewritten prompt should consider

The original slice prompt assumed one of these existed; Q1.3 found none does.
The rewritten slice prompt has to pick among them or pick a fourth.

**A1 — Build a separate `LONG_FORM_VOCAB` registry.** A new Map (or Set) in
`acadamark-core` parallel to `DSL_REGISTRY` and `STRUCTURED_ELEMENTS`. The 21
displaced regular-vocab entries move from `DSL_REGISTRY` to `LONG_FORM_VOCAB`.
`LONG_FORM_TAGS` becomes the three-way union. Medium-sized refactor; preserves
snapshot zero-diff because the parser still picks the tags up via the union.
The conceptual split (DSL / structured-data / regular-long-form-vocab) maps
1:1 onto the three registries. This is the natural target if the goal is
making the data structures match the rubric.

**A2 — Derive long-form-eligibility from `layer1-vocabulary` entries.** Make
`acadamark-core` read the generated `layer1-vocabulary/src/data.js` and derive
the long-form-eligible set from per-entry schema fields (any entry with
`content.type: structured`, `content.shape: …`, or similar opts in). Vocab
entries become the single source of truth for long-form-eligibility. Larger
refactor: changes `layer1-vocabulary`'s role in the parser dependency graph;
parser-time becomes dependent on the vocab build output. More principled but
bigger blast radius.

**A3 — Rename `DSL_REGISTRY` to `LONG_FORM_REGISTRY` (or similar) and
update comments / specs.** Keep the data structure as-is; the registry
acknowledges it carries multiple categories (DSLs, regular long-form vocab,
sigils, etc.). The conceptual purge becomes a *naming* purge. Smallest commit;
preserves the conflation in the data structure but removes it from the surface
text. Lowest risk; least benefit. The line-45 `<theorem>` placeholder gets
removed (or kept) as a separate call.

The original slice prompt was implicitly asking for *A1 or A2 already built*
+ the purge. The rewritten prompt should pick one of A1 / A2 / A3 explicitly
and shape the work around that pick.

## What is recorded vs. what is open

Recorded above:
- The Q1.1 catalog (full ground truth of `DSL_REGISTRY` membership).
- The Q1.2 consumer map (three live product-code consumers).
- The Q1.3 finding (no separate regular-vocab long-form mechanism exists).
- The three options for the rewritten prompt.

Open (to address in the rewrite or in a follow-on Phase 0 if needed):
- Q1.4 — the `dslRegistry` option call-site surface (relevant if the rewrite
  includes the rename).
- Q1.5 — the spec / comment / doc carriers of the conflation (needed for
  Step 3 of the rewritten slice).
- Q1.6 — backlog and roadmap items that name DSL handlers and need scope
  rewording (the Phase 2 handler bundle's theorem-family scope correction;
  the `dslRegistry`-rename `[post-alpha]` item filed by `beb2fb3`; the
  line-45 reconciliation tracked since sub-slice 3).

These remain to do after the slice prompt is rewritten with Q1.3's finding as
input.
