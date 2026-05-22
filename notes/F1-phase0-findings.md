# F1 Phase 0 findings: `@`/`#` sigil-semantics investigation

**Date:** 2026-05-22
**Scope:** Read-only investigation. No code changed.

---

## TL;DR — The two open questions, answered up front

**Q1 — `#`-as-reference: clean break or deprecated alias?**

**Clean break.** Migration surface is 23 occurrences in code/fixture files, all
mechanical `#` → `@` substitutions. The system has no external consumer. The
alias adds permanent grammar complexity (two valid forms, two resolver code paths)
for a dataset that can be migrated in minutes. Evidence in §4.

**Q2 — Multi-key `<cite>`: `[@smith, @jones]` or `@[smith, jones]`?**

**`<cite [@smith2017, @jones2023]>` — each key marked.**

Reasons: (1) `@` marks the individual reference key, consistent with `<ref
@fig:priority>` where `@` marks the key, not the construct. (2) No new grammar
rule needed — `@` is already a valid `IdentifierCont` character inside bracketed
list items (`EscapedListItemChar = [^,\[\]]` allows `@`). (3) The `@[...]` form
would parse today as a stand-alone `@` Positional followed by a BracketedList,
requiring a new `AtBracketedList` rule and a new traversal path; `[@key, @key]`
requires nothing new at the grammar level. Evidence in §2.

---

## 1. Current `#`/reference grammar

### 1.1 `#` in assignment position

```
Id = "#" v:Identifier { return { t: 'id', v } }
```

`Id` is one of the seven `Attribute` alternatives
(`Id / Class / BoolTrue / BoolFalse / Keyword / BracketedList / Positional`).
`applyAttributes` dispatches `attr.t === 'id'` → `result.id = attr.v`.

So `<figure #fig:priority src=...>` produces `node.id = 'fig:priority'`.

### 1.2 `#` in reference position

`<ref #fig:priority>` — the `#` is the **same `Id` rule**. The grammar does not
distinguish "assignment" from "reference" by context; both produce `node.id`. The
semantic distinction is made entirely by the interpreter: `ref-resolution.js`
reads `node.id` and looks it up in the label registry; `figure` nodes have
`node.id` set to register themselves.

No separate "reference `#`" rule exists. `#` is always `Id`.

### 1.3 `<cite>` key parsing

Three paths exist in the grammar. All go through `Attribute` rules:

**Positional (canonical):** `<cite Smith2020, Jones2019>`

`Positional = !("/" [ \t]* ">") v:Identifier { return { t: 'pos', v } }`

Each naked token becomes a separate `positional` entry.
Result: `node.positional = ['Smith2020', 'Jones2019']`.

**Bracketed-list:** `<cite [smith2017, jones2023]>`

```
BracketedList = "[" _ items:ListItems _ "]" { return { t: 'pos', v: items } }
ListItem = QuotedStringValue / EscapedListItem
EscapedListItemChar = "\\" c:[,] { return c } / [^,\[\]] { return text() }
```

`applyAttributes` does `result.positional.push(attr.v)` where `attr.v` is
**the entire items array**. Result:
`node.positional = [['smith2017', 'jones2023']]` — a nested array.

**Pipe form:** `<cite | Smith2020>` — content as string (not an Attribute at all;
reaches cite-resolution via `node.content`).

### 1.4 `@` in the grammar today

`@` is **not assigned any special meaning** in the current grammar. It is a valid
`IdentifierStart` character:

```
IdentifierStart = [^ \t\n<>|+\-#.="'\[\],]
```

The excluded set does not include `@` (U+0040). So `@smith2023` already parses
today as a Positional with value `'@smith2023'`. The cite resolver then tries to
look up key `'@smith2023'` in the citation library, finds nothing, and emits
`__cite-error`. `@` in attribute position is currently a silent mistake.

`@` is also in the `ContentItem` pass-through set (`?@` = chars 63–64 in the
range `[!-/:-=?@\[\\\]^_`{-~]`), so `\@` inside named-tag content passes
through to remark unchanged, where CommonMark processes it as a literal `@`. This
is already correct for F1; no change needed.

---

## 2. What F1 changes in the grammar

### 2.1 The grammar change: `AtRef` attribute rule

F1 adds one grammar rule and updates three housekeeping places.

**New rule:**
```
AtRef = "@" v:Identifier { return { t: 'atref', v } }
```

**Updated `Attribute` alternatives** — `AtRef` added before `Positional`:
```
Attribute
  = Id / Class / BoolTrue / BoolFalse / Keyword / BracketedList / AtRef / Positional
```

Ordering matters: `@key` currently matches `Positional` (since `@` is valid
IdentifierStart). Adding `AtRef` before `Positional` makes the PEG parser
intercept `@key` there first. `#key` continues to match `Id` (unchanged).

**Updated `emptyAttrs()`:**
```javascript
function emptyAttrs() {
  return { positional: [], booleans: {}, kwargs: {}, id: null, classes: [], atRefs: [] }
}
```

**Updated `applyAttributes()`:**
```javascript
if (attr.t === 'atref') result.atRefs.push(attr.v)
```

**Updated `makeNode()`:**
```javascript
atRefs: [],
```

Result: `<ref @fig:priority>` → `node.atRefs = ['fig:priority']`, `node.id = null`.
`<cite @smith2023, @jones2019>` → `node.atRefs = ['smith2023', 'jones2019']`.

### 2.2 Ripple: none

The `AtRef` addition is local to the `Attribute` rule and its three support
functions. No sigil body rules change. `HashSigilBodyChar*`, `ContentItem`,
`SigilBodyDollar*`, `SigilBodyBt*` — all untouched.

The change is exactly 4 additions: one rule definition, one Attribute alternative,
one case in `applyAttributes`, one field in `emptyAttrs`/`makeNode`. After a
grammar rebuild, no other source files change as part of the grammar change.

### 2.3 Prose parsing: unaffected

F1 makes `@` significant only inside the `Attribute` rule, which is only reachable
from `SigilTag*` and `NamedTag` rules' attribute section (between `<tagname` and
`|` or `>`). Prose (text nodes handled by remark/CommonMark) is not processed by
the Peggy grammar at all; `@` in prose remains a plain character. The
unbraced-inline form is explicitly deferred.

### 2.4 Escape rules: no new mechanism needed

In content positions (inside `|...|` or sigil bodies), `@` is not acadamark-
significant after F1 (the inline form is deferred). The `ContentItem` pass-through
rule already handles `\@` correctly (passes `\@` to remark → literal `@`). No
addition to `escape-rules-spec.md`'s acadamark-significant set.

In attribute positions, `@` becomes a grammar prefix. A literal `@` in an
unquoted attribute value cannot occur in practice (no realistic attribute value
starts with `@` except citation/reference keys). For any case needing it, use a
quoted value: `attr="@handle"`. This is the existing quoted-value mechanism; no
new escape syntax needed. `escape-rules-spec.md` needs a note added to the
"Escapes in attributes" section, but no grammar change.

### 2.5 Colon-ids: orthogonal

`@fig:priority` → `AtRef` consumes `@`, `Identifier` matches `fig:priority`.
Colon is a valid `IdentifierCont` character (not in
`[^ \t\n<>|"'\[\],]`'s excluded set). The `fig:` prefix type convention is
preserved identically. `@eqn:newton`, `@sec:intro`, `@tab:results` all parse
correctly.

### 2.6 Bracketed-list `@` syntax (Q2 in detail)

`<cite [@smith2017, @jones2023]>`:
- `BracketedList` rule is unchanged: `"[" _ items:ListItems _ "]"`
- `EscapedListItemChar = [^,\[\]]` — `@` (U+0040) is not in the excluded set, so
  `@smith2017` is a valid list item string
- Items array: `['@smith2017', '@jones2023']`
- `applyAttributes`: `result.positional.push(['@smith2017', '@jones2023'])`
- `node.positional = [['@smith2017', '@jones2023']]`

The cite resolver needs to handle this: flatten the nested array, strip `@`
prefix from each item. This is a resolver change only (§3.2).

`<cite @[smith2017, jones2023]>` (the alternative):
- `@[` — `@` matches `AtRef`'s `"@"` prefix, then `Identifier` tries to match
  `[smith2017...` but `[` is excluded from `IdentifierStart`. Parse fails for
  `AtRef`. Falls back to `Positional`: tries `!("/")` guard (passes), then
  `Identifier` on `@[...` — but `@` alone is IdentifierStart, then IdentifierCont
  tries `[` which is excluded, so Identifier = `'@'`. Positional consumes `@`.
  Then the `[smith2017, jones2023]` part is a separate BracketedList attribute.
- Result: `node.atRefs = []`, `node.positional = [['smith2017', 'jones2023']]`
  (plus a stand-alone `@` in... actually the `Positional` with `v='@'` would push
  `'@'` to positional... but wait, after `AtRef` fails, `Positional` picks up
  `@` as identifier, giving `node.positional = ['@', ['smith2017','jones2023']]`).
- This is the wrong shape. Making `@[...]` work cleanly would require a new
  `AtBracketedList` rule. That rule is unnecessary given `[@key, @key]` works
  without it.

**Recommendation confirmed: `[@smith2017, @jones2023]`.**

---

## 3. Interpreter side: `<ref>` and `<cite>` resolution

### 3.1 `ref-resolution.js` change

Current key extraction (line 98):
```javascript
const targetId = node.id ?? node.kwargs?.target ?? null;
```

After F1:
```javascript
const targetId = node.atRefs?.[0] ?? node.kwargs?.target ?? null;
```

That is the only line that changes in `ref-resolution.js`. The rest of the
function — `computeRefText`, `makeRefMarker`, `makeRefError`, the `walkReplace`
call — is untouched. The targetId string is the same (`'fig:priority'` regardless
of whether it came from `node.id` or `node.atRefs[0]`), so all downstream
computation is identical.

The `node.kwargs?.target` fallback can be retained as a legacy path for
`<ref target=fig:priority>` (already documented as legacy in the plugin). No
change needed there.

`node.id` — if clean-break is taken, stop reading `node.id` from `<ref>` nodes.
There is no other reader of `<ref>`'s `node.id` in the pipeline. The `makeRef()`
helper in ref-resolution tests directly constructs the `id` field on test nodes —
those test helpers need to be updated to use `atRefs` instead.

### 3.2 `cite-resolution.js` change

`extractCiteKeys` is the only function that changes. Current code:

```javascript
function extractCiteKeys(node) {
  if (Array.isArray(node.positional) && node.positional.length > 0) {
    return node.positional.map(k => k.trim()).filter(Boolean);
  }
  if (typeof node.content === 'string') { ... }
  ...
}
```

After F1, with the formal `AtRef` route for single and comma-separated keys
(`<cite @smith2023, @jones2019>` → `node.atRefs = ['smith2023', 'jones2019']`):

```javascript
function extractCiteKeys(node) {
  // Primary F1 path: @-prefixed keys via AtRef grammar rule.
  if (Array.isArray(node.atRefs) && node.atRefs.length > 0) {
    return node.atRefs;  // Grammar already stripped @
  }
  // Bracketed-list path: <cite [@smith2017, @jones2023]>
  //   node.positional = [['@smith2017', '@jones2023']] — nested array from BracketedList
  if (Array.isArray(node.positional) && node.positional.length > 0) {
    const flat = [];
    for (const k of node.positional) {
      if (Array.isArray(k)) flat.push(...k);
      else flat.push(k);
    }
    return flat.map(k => k.startsWith('@') ? k.slice(1) : k).filter(Boolean);
  }
  // Pipe-form content string (unchanged fallback).
  if (typeof node.content === 'string') { ... }
  ...
}
```

The `processCite` function and everything downstream (key partition, cite.format,
__cite-marker/__cite-error factories, citation order tracking) are untouched.

### 3.3 Code unification: syntax only, not code

F1 does **not** merge `ref-resolution.js` and `cite-resolution.js`. They remain
separate plugins in the pipeline (steps 9 and 10), with separate `walkReplace`
calls and separate internal node types (`__ref-marker` vs `__cite-marker`). The
unification is at the *syntax level*: both now use `@key` in the source. Code
sharing is plausible eventually (e.g., a shared `extractAtKey(node)` helper), but
that is a future refactor, not part of F1's scope.

The `__ref-marker` and `__cite-marker` **handlers** (in `handlers/ref.js`,
`handlers/cite.js`) are completely untouched — they render from `node.kwargs`,
which are produced by the resolver unchanged.

---

## 4. Migration surface

### 4.1 `<ref #...>` occurrences

| Location | Count | Notes |
|----------|-------|-------|
| `packages/acadamark-interpreter/test/fixtures/document-5-linear-regression.acm` | 4 | |
| `packages/acadamark-interpreter/test/fixtures/document-6-cross-references.acm` | 8 | |
| `packages/acadamark-interpreter/test/fixtures/document-7-tables.acm` | 4 | |
| `packages/acadamark-interpreter/test/fixtures/document-9-demo.acm` | 3 | no snapshot test |
| `packages/remark-acadamark/test/test.js` | 2 | parser tests |
| `packages/remark-acadamark/test/test-grammar.js` | 2 | grammar tests |
| `notes/test.amd` | 3 | informal test doc |
| `notes/pipeline.md` | 1 | example in data-flow section |
| `notes/interpreter.md` | ~3 | examples and descriptions |
| `notes/shorthand-syntax.md` | 1 | Identifier rule discussion |
| `notes/audit-2026-Q2/R2-phase0-findings.md` | 2 | historical examples |
| **Mechanically-testable total (code+fixtures)** | **23** | |

All occurrences are mechanical: `<ref #X>` → `<ref @X>`. No case-by-case
judgement needed.

### 4.2 `<cite ...>` occurrences

| Location | Count | Form |
|----------|-------|------|
| `packages/acadamark-interpreter/test/fixtures/document-8-citations.acm` | 7 | positional single-key |
| `packages/acadamark-interpreter/test/fixtures/document-8-citations.acm` | 1 | positional multi-key (`Mantzalas2022, Pellicano2014`) |
| `packages/acadamark-interpreter/test/fixtures/document-9-demo.acm` | 6 | positional (various) |
| `packages/remark-acadamark/test/test.js` | ~20 | positional + bracketed |
| `packages/remark-acadamark/test/test-grammar.js` | ~10 | positional + bracketed |
| `packages/remark-acadamark/test/test-recursive.js` | 1 | positional |
| `packages/remark-acadamark/test/demo.js` | 3 | positional |
| `notes/test.amd` | ~15 | positional + bracketed + pipe |
| `notes/shorthand-syntax.md` | ~5 | examples |
| `notes/escape-rules-spec.md` | 1 | bracketed-list escape example |
| `notes/interpreter.md` | ~4 | descriptions |
| `notes/pipeline.md` | ~3 | descriptions/examples |
| **Bracketed-list form in code/fixtures** | **3** | parser tests only (0 in .acm) |

Migration for positional keys: `<cite Smith2020>` → `<cite @Smith2020>`.
Migration for multi-key: `<cite Smith2020, Jones2019>` → `<cite @Smith2020, @Jones2019>`.
Migration for bracketed-list: `<cite [smith2017, jones2023]>` → `<cite [@smith2017, @jones2023]>`.

All mechanical.

### 4.3 Non-fixture consumers

None. This is pre-release software with no published package consumer. The only
users of `<ref #...>` and `<cite ...>` are the fixture files, test strings
embedded in test files, and spec doc examples.

---

## 5. Correctness proof and risk

### 5.1 Intended correctness model

The fixture `.acm` sources change. The rendered HTML output — the HAST snapshots
and the HTML assertions in `integration.test.js` — should be **unchanged**.

Evidence that this holds:

- `ref-resolution.js`: `node.atRefs[0]` returns the same id string as `node.id`
  did. `computeRefText` receives the same `id`, `entry`, and `config`. Output:
  same `__ref-marker.kwargs.text` and `targetId`. Handler renders the same HTML.
- `cite-resolution.js`: extracted keys are the same strings (with `@` stripped).
  `cite.format()` receives the same keys and style. Output: same
  `__cite-marker.kwargs.html`. Handler renders the same HTML.
- Citation order: `citations.order` populated with the same keys in the same
  sequence. Bibliography output unchanged.

**Correctness proof procedure:**

1. Migrate all `.acm` files and resolver code.
2. Run `node packages/acadamark-interpreter/test/run.js`.
3. The 8 existing snapshot files (`document-N-expected.json`) should still pass
   — no `ACADAMARK_UPDATE_SNAPSHOTS=1` run needed.
4. Run `node packages/remark-acadamark/test/test.js` (grammar tests have
   updated input strings but same expected AST shape — `node.atRefs` instead of
   `node.id` or `node.positional`, so expected values must be updated).

Step 4 qualification: parser tests assert on AST node properties. `<ref #fig:...>
` tests assert `node.id === 'fig:...'`. After F1, they assert `node.atRefs[0]
=== 'fig:...'`. So parser test assertions change even though rendered output is
the same. These are test **input + assertion** updates, not correctness failures.

### 5.2 What tests need updating

**Tests that must change (input strings change):**
- `test.js`: ~24 `<cite ...>` test inputs → add `@`; 2 `<ref #...>` → `@`
- `test-grammar.js`: ~12 `<cite ...>` + 2 `<ref #...>` test inputs
- `test-recursive.js`: 1 `<cite ...>` input
- `ref-resolution.test.js`: `makeRef()` helper constructs `id` field directly —
  the helper must be updated to set `atRefs` instead

**Test assertions that change:**
- Parser tests currently assert `node.id === 'fig:...'` for `<ref #...>` →
  assert `node.atRefs === ['fig:...']`
- Parser tests assert `node.positional === ['Smith2020']` for `<cite Smith2020>`
  — after F1 with `AtRef` grammar, assert `node.atRefs === ['Smith2020']`
- Bracketed-list parser tests assert
  `node.positional === [['smith2017', 'jones2023']]` — after F1 they assert
  `node.positional === [['@smith2017', '@jones2023']]` (items have `@` prefix,
  resolver strips it)

**Integration tests (assertions on HTML output) do NOT change** — they pass
unchanged, which is the correctness signal.

### 5.3 A latent bug F1 must fix

**Bug:** `extractCiteKeys` in `cite-resolution.js` crashes with
`TypeError: k.trim is not a function` when `node.positional = [['smith2017',
'jones2023']]` (the bracketed-list form). The bracketed path `<cite [...]>` has
never been tested end-to-end through the interpreter; all `.acm` fixture files use
positional-only form for `<cite>`.

F1 must fix this as part of the `extractCiteKeys` rewrite (the nested-array
flattening above). The bug is incidental to F1 — it affects the old key-extraction
path, which F1 replaces — but it must be the F1 work that fixes it, since no other
slice is in scope.

Record as bug but do not fix separately; F1's rewrite supersedes the broken path.

### 5.4 Risk profile

| Risk | Level | Notes |
|------|-------|-------|
| Grammar change | Low-medium | `AtRef` before `Positional` in Attribute rule — PEG ordering must be correct; simple to verify with parser tests |
| Resolver changes | Low | Both are 1–5 line changes in well-tested code |
| Fixture migration | Low | Mechanical substitution, 33 occurrences |
| Test assertion updates | Low | Straightforward `id` → `atRefs[0]` changes |
| Bracketed-list `@` stripping in resolver | Low-medium | Nested array logic is simple but untested currently; write tests |
| Snapshot stability | Low | HTML output is resolver-output-neutral; snapshots should hold |

**Riskiest single step:** the grammar ordering change. In Peggy (PEG), the
`Attribute` rule tries alternatives left to right and takes the first match. If
`AtRef` is placed after `Positional`, `@key` is consumed by `Positional` first
and `AtRef` is never reached. The rule must order `AtRef` before `Positional`. A
parser test immediately catches a wrong ordering (test `<ref @fig:elephant>` →
should produce `node.atRefs = ['fig:elephant']`, `node.positional = []`).

---

## 6. Slice shape

### 6.1 One slice or split?

**One slice.**

The grammar change and resolver changes are tightly coupled. You cannot test the
grammar change without a resolver that understands `node.atRefs`. You cannot
migrate fixtures without both. The fixture migration and test updates are
mechanical enough to be done in one pass.

The only case for splitting is if the grammar rebuild takes significant iteration
(unexpected Peggy quirks). But the grammar change is 4–5 lines in a 403-line
file, with immediate test feedback.

### 6.2 `<ref>` and `<cite>` together or sequenced?

Together. The decision is that `@key` is the universal reference syntax — doing
only `<ref>` first while `<cite>` still uses bare positionals contradicts the
principle and leaves the codebase in a half-migrated state that still needs its
own slice. The grammar rule `AtRef` serves both equally. The resolver changes are
independent; they can be developed in sequence within the same slice without
blocking each other.

### 6.3 Recommended F1 scope — concrete

**Files changed:**

1. `packages/remark-acadamark/grammar/acadamark.peggy` — add `AtRef` rule,
   update `Attribute`, `emptyAttrs`, `applyAttributes`, `makeNode`
2. Rebuild: `npm run build:grammar` (in `remark-acadamark`)
3. `packages/acadamark-interpreter/src/plugins/ref-resolution.js` — 1 line:
   `node.atRefs?.[0]` instead of `node.id`
4. `packages/acadamark-interpreter/src/plugins/cite-resolution.js` —
   rewrite `extractCiteKeys` (~10 lines)
5. `packages/acadamark-interpreter/test/fixtures/document-{5,6,7,9}.acm` —
   `<ref #X>` → `<ref @X>` (19 occurrences)
6. `packages/acadamark-interpreter/test/fixtures/document-{8,9}.acm` —
   `<cite key>` → `<cite @key>` (14 occurrences)
7. `packages/acadamark-interpreter/test/plugins/ref-resolution.test.js` —
   update `makeRef()` helper, update `node.id` → `node.atRefs` assertions
8. `packages/acadamark-interpreter/test/plugins/cite-resolution.test.js` —
   update `makeCiteNode()` + test inputs
9. `packages/remark-acadamark/test/test.js` — update input strings + assertions
   (~24 cite + 2 ref occurrences)
10. `packages/remark-acadamark/test/test-grammar.js` — same (~12 cite + 2 ref)
11. `packages/remark-acadamark/test/test-recursive.js` — 1 cite input
12. `notes/shorthand-syntax.md`, `notes/interpreter.md`, `notes/pipeline.md`,
    `notes/escape-rules-spec.md` — update examples and descriptions (editorial)

**Order of operations:**

1. Grammar change + rebuild
2. Run parser tests (catch ordering issues immediately)
3. Resolver changes (`ref-resolution.js`, `cite-resolution.js`)
4. Run interpreter unit tests (ref-resolution.test.js, cite-resolution.test.js)
5. Fixture migration
6. Run integration tests (snapshots should hold)
7. Test file updates (input strings + assertion field names)
8. Full test run (`npm test` in both packages)
9. Spec doc updates

**Correctness proof:**

After step 6, the 8 existing `document-N-expected.json` snapshot files must pass
without regeneration. This is the primary correctness signal. If any snapshot
fails, the resolver change introduced a difference in the rendered HAST that must
be traced and corrected before proceeding to test-file updates.

### 6.4 Answers to the two open questions, for the F1 implementation prompt

**Q1 — Clean break.** Drop `node.id` from `ref-resolution.js`'s key extraction.
`<ref #...>` becomes a parse-time malformed form (the `#` attribute becomes
`node.id`, which the resolver no longer reads, producing `__ref-error`). No
deprecation period, no alias. Document the migration in the commit message and
spec update. Cost: 19 occurrences in `.acm` fixtures + ~4 in parser tests +
editorial examples. All mechanical.

**Q2 — `[@smith2017, @jones2023]`.** The bracketed-list form marks each key with
`@`. The grammar requires no new rule — `@` passes through `EscapedListItemChar`.
The resolver flattens the nested array and strips the `@` prefix from each item.
The spec update in `shorthand-syntax.md` documents this form.

---

## Appendix: bugs noticed in passing (not fixed)

**B-1 (cite-resolution latent crash):** `extractCiteKeys` calls
`.trim()` on `node.positional` entries, but the bracketed-list form stores a
nested array, not strings. `['smith2017'].trim()` is undefined → TypeError. Not
triggered today because no `.acm` fixture uses `<cite [...]>`. F1's
`extractCiteKeys` rewrite supersedes this code path, effectively fixing it as a
side effect.

**B-2 (doc-9 snapshot missing):** `document-9-demo.acm` has refs and cites but
is not in the integration test suite (tests stop at doc8). It has no
`document-9-expected.json`. Not a correctness issue since it tests features
already covered by docs 5–8, but the fixture is untested as an integration whole.
Out of F1 scope.
