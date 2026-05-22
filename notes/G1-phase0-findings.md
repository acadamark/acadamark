# G1 Phase 0 findings — inline TeX shortcuts scope-check

**Date:** 2026-05-22  
**Scope:** DF-1 + PG-12. Read-only investigation. No code changed.  
**Refs:** `notes/inline-tex-shortcuts-spec.md`, grammar `grammar/acadamark.peggy`,
`src/recursive-content.js`, `src/syntax.js`, `src/from-markdown.js`,
`packages/layer1-vocabulary/elements/sup.md` and `sub.md`,
`packages/acadamark-interpreter/src/interpret-plugin.js`.

---

## TL;DR

Both spec claims are **conditionally true**. Recursive-content needs no changes
**if the shortcut nodes carry `contentHandler: 'default'`** — either from a
micromark path (guaranteed) or from explicit grammar code (required if using the
ContentItem path). The interpreter needs no changes at all. The escape extension
is a small, non-rippling grammar edit that doesn't interact with F1's changes.

The significant finding the spec doesn't address: **`^{...}` in top-level prose
requires a new micromark tokenizer.** The Peggy grammar is only called on `<...>`
constructs; it cannot handle shortcuts in text outside any `<...>` tag. G1 has
two implementation surfaces, not one.

---

## A1 — "Recursive-content needs no changes"

**Verdict: Conditionally true. Evidence below.**

### How remarkRecursiveContent dispatches

`src/recursive-content.js` line 62–65:

```javascript
visit(subtree, 'acadamarkTag', (node) => {
  if (node.contentHandler !== 'default') return SKIP
  if (node.content === null) return SKIP
```

Dispatch is on **both** `type === 'acadamarkTag'` AND `contentHandler ===
'default'`. A node that is the right type but lacks `contentHandler` (or has it
`undefined`) is skipped.

### Path 1: micromark tokenizer (top-level prose)

When `^{st}` appears in top-level prose, a new micromark tokenizer (see
Architectural Gap below) emits an `acadamarkTag` token. `from-markdown.js`
handles the token via the existing `exitAcadamarkTag` path, which calls
`getContentHandler(node.tagname)`. For `'sup'`, `getContentHandler` returns
`'default'` (it is not in `DSL_REGISTRY`, so the fallback applies —
`dsl-registry.js` line 117). The node enters the mdast tree with
`contentHandler: 'default'` and is found by the top-level `visit` call in
`processNodes`. **No changes to recursive-content needed.**

### Path 2: ContentItem grammar rule (inside named-tag content)

When `^{st}` appears inside named-tag content (`<aside | 1^{st} edition>`), the
grammar's `ContentItem*` loop processes it. A new `SuperscriptShortcut` rule in
`ContentItem` would return an `acadamarkTag` node object (not a string). That
node is placed into the content array by `processContentItems`, which already
handles non-string items (`processContentItems` in the grammar's global section
— it checks `typeof item !== 'string'` and routes non-strings into the result
array by identity).

`remarkRecursiveContent`'s `parseContent` function (line 95–101) passes
non-string items through unchanged:

```javascript
return content.flatMap((item) =>
  typeof item === 'string'
    ? extractFromRoot(processor.parse(item))
    : [item],
)
```

So the `sup` node survives into the post-parse content array. Then `processNodes`
is called on `{ type: 'root', children: toChildren(node.content) }`, and `visit`
finds the `sup` node there.

**The hidden dependency:** `makeNode` (the grammar helper) does NOT set
`contentHandler`. The node that the grammar creates inline in `ContentItem` will
have `contentHandler: undefined`. `remarkRecursiveContent` checks
`node.contentHandler !== 'default'` — undefined is not `'default'`, so it
returns `SKIP`. The `sup` node's brace content would never be recursively parsed.

**Fix:** The `SuperscriptShortcut`/`SubscriptShortcut` grammar rules must
explicitly set `contentHandler: 'default'` in the returned node object. This is
a one-line addition to each rule's action. Once set, recursive-content processes
the node automatically without any change to the plugin itself.

**Conclusion:** The spec's claim "no changes needed to the recursive-content
plugin" is **correct** — but only when the shortcut nodes carry
`contentHandler: 'default'`. For the micromark path this is guaranteed by
`from-markdown.js`. For the ContentItem path it requires explicit grammar code.
The plugin itself is unchanged either way.

---

## A2 — The escape-rules extension, reconciled with F1 (PG-12)

**Verdict: F1 and G1 touch entirely different grammar regions. The extension is
a one-line change with no ripple.**

### Where the escape-significant-character set lives

`ContentItem` in the grammar (around line 295) is the prose-content rule for
named-tag content. Its first alternative consumes acadamark-significant escapes:

```peggy
ContentItem
  = "\\" c:[<|\\]                      { return c }
  / "\\" c:[!-/:-=?@\[\\\]^_`{-~]    { return "\\" + c }
  ...
```

Rule 1: acadamark-consumed (`<`, `|`, `\`).  
Rule 2: pass-through to remark (all other ASCII punctuation, including `^`, `_`,
`{`, `}`, `@`, etc.).

### F1's changes and overlap

F1 added `@` handling to the **`Attribute` rule section** of the grammar — a new
`AtRef` production in `Attribute` and plumbing through `emptyAttrs` and
`applyAttributes`. That is in the attribute-parsing half of the grammar
(before `|`). F1 touched nothing in `ContentItem` or the
`HashSigilBodyChar1/2/3` rules. There is zero overlap with G1's escape changes.

### The actual G1 escape change (PG-12)

`^`, `_`, `{`, `}` are currently in the **pass-through** class (rule 2 above).
They produce `\^`, `\_`, `\{`, `\}` which remark then processes as CommonMark
escapes, yielding literal chars. The observable output is identical to
acadamark-consuming them. The spec says to upgrade them to acadamark-consumed
(rule 1), consistent with the principle that any acadamark-significant character
is acadamark-consumed.

The change: extend rule 1's character class from `[<|\\]` to `[<|\\^_{}]`.
Remove `^_{}` from rule 2's character class to keep the rules non-overlapping.

Same two-line change applies to `HashSigilBodyChar1`, `HashSigilBodyChar2`, and
`HashSigilBodyChar3` (which have the same rule 1 / rule 2 structure for hash
sigil body content).

### Does the escape-lookahead concern arise?

The spec asks whether `\^` needs to know that `^` is significant "only when
followed by `{`". It does not. Escape processing is independent of what the
unescaped char would do. `\^` → literal `^` regardless. The shortcut rule
(`"^" "{"`) never sees `\^` because the escape rule fires first in PEG ordered
choice. This is correct behavior by construction.

### `{`/`}` as paired delimiters — interaction concern

`{` and `}` are not currently used as delimiters anywhere else in the grammar.
Making them acadamark-consumed escapes (`\{` → `{`, `\}` → `}`) does not
interact with anything. The braces are new syntax with no prior grammar meaning.

---

## Architectural gap: top-level prose requires a new micromark tokenizer

**This is the most important finding. The spec is silent on it.**

The Peggy grammar is invoked by `from-markdown.js`'s `exitAcadamarkTag` handler,
which is triggered by the micromark extension (`syntax.js`) finding `<...>`
boundary tokens. The micromark extension in `syntax.js` only registers
character-code handlers for `<` (code 60):

```javascript
return {
  flow: { [LT]: [...] },
  text: { [LT]: [...] },
}
```

`^{...}` and `_{...}` in **top-level prose** (outside any `<...>` construct)
are never seen by the Peggy grammar. Remark treats `^{st}` as literal text.

**What the spec calls "the prose content grammar" is actually two surfaces:**

1. **Named-tag content** (after `|`) — the Peggy grammar's `ContentItem` rule
   handles this. A `SuperscriptShortcut` rule in `ContentItem` covers `^{...}`
   here.

2. **Top-level prose** — remark (CommonMark) processes this. The only way to
   intercept `^{...}` here is a new micromark tokenizer registered for character
   codes 94 (`^`) and 95 (`_`) in the `text` hook, parallel to how the existing
   `[LT]` tokenizers work.

The spec's examples show `The 1^{st} edition of the work...` as standalone prose
— this unambiguously means top-level prose. Both surfaces are needed.

**Impact on A1:** Once both surfaces emit `acadamarkTag` nodes, the A1 analysis
holds. `remarkRecursiveContent` handles both automatically. But the micromark
path requires a new tokenizer and corresponding `from-markdown.js` handler, which
is the riskiest implementation piece (see Slice Shape below).

---

## Q1 — Grammar change

### Where the new rules slot in

The shortcut rules go in `ContentItem` (and a new `BraceContentItem` companion).
They must be added **before** the fallthrough regular-char rule (`$[^>\\]`) and
**after** the backslash rules. Proposed order within `ContentItem`:

```
ContentItem
  = "\\" c:[<|\\^_{}]                    { return c }       // EXTENDED from F1 state
  / "\\" c:[!-/-:<=?@\[\\\]`{-~]        { return "\\" + c } // pass-through (^_{}  removed)
  / "\\" c:[^\n>]                        { return errorNode("\\" + c) }
  / "\\"                                 { return errorNode("\\") }
  / SuperscriptShortcut
  / SubscriptShortcut
  / $("<" [a-zA-Z#$`/] ContentChar* ">") // depth-tracking nested construct
  / $[^>\\]                              // regular char (unchanged)
```

Backslash rules fire first (rules 1–4), so `\^` and `\_` are consumed before the
shortcut rules see `^` or `_`. PEG ordered choice handles this correctly.

No existing rule claims `^` or `_` as a standalone non-backslash trigger in
`ContentItem`. No ordering conflict.

### The new `BraceContentItem` rule

Inside braces, content stops at `}` rather than `>`. A new companion rule is
needed:

```
SuperscriptShortcut
  = "^" !("{") { return errorNode("^") }       // bare ^ is an error (see bare-^ note)
  / "^" "{" content:BraceContentItem* "}" {
      return { type: 'acadamarkTag', tagname: 'sup', form: 'shortcut',
               contentHandler: 'default', content: processContentItems(content),
               isOpaqueContent: false, ... }
    }

SubscriptShortcut
  = "_" !("{") { return errorNode("_") }       // bare _ (see bare-_ note below)
  / "_" "{" content:BraceContentItem* "}" {
      return { type: 'acadamarkTag', tagname: 'sub', form: 'shortcut',
               contentHandler: 'default', content: processContentItems(content),
               isOpaqueContent: false, ... }
    }

BraceContentItem
  = "\\" c:[<|\\^_{}]                     { return c }
  / "\\" c:[!-/-:<=?@\[\\\]`{-~]         { return "\\" + c }
  / "\\" c:[^\n}]                         { return errorNode("\\" + c) }
  / "\\"                                  { return errorNode("\\") }
  / SuperscriptShortcut
  / SubscriptShortcut
  / $("<" [a-zA-Z#$`/] ContentChar* ">") // nested acadamark construct
  / $[^}\\]                              // regular char: stops at }, not >
```

`BraceContentItem` is recursive (handles nested `^{...}` and `_{...}`) and
handles nested `<...>` constructs the same way `ContentItem` does.

Depth tracking for nested `{...}`: the recursion structure handles it. When
`SuperscriptShortcut` fires inside `BraceContentItem*`, it starts a new
`BraceContentItem*` loop for the inner braces. The closing `}` for each pair is
consumed by the rule. `x^{y_{1}}` — the outer loop sees `^{y_{1}}` and enters
`BraceContentItem*`. Inside, `y` is regular, then `_{1}` fires `SubscriptShortcut`,
which consumes `{1}`. Back at the outer loop, `}` closes the outer brace. Correct.

### Bare `^`/`_` parse error — design note

The spec says bare `^` and `_` without `{` produce `acadamarkParseError`. For
`^` this is unambiguous — `^` has no meaning in CommonMark prose. For `_` this
is **problematic**: `_` is extremely common in prose as `snake_case` identifiers,
URLs (`https://example.com/path_to_page`), and other text. Making bare `_` an
error inside named-tag content would break existing content that uses underscores.

**Finding (not a resolution):** The spec's "bare `_` is a parse error" claim
needs explicit confirmation before implementation. Candidate alternatives:
(a) bare `_` is an error (strict, per spec), (b) bare `_` is a literal
character (consistent with how `_` works today), (c) bare `_` is a warning
(academic middle ground). This decision must be made before coding begins.
For `^` the spec's claim seems unambiguous; for `_` it needs review.

### Flow vs. text position

`^{...}` is an inline element — it belongs in text (inline) position only.
Like all existing inline constructs, it is not valid at block level. The
`ContentItem` rule is only invoked in text (pipe-content) positions. The new
micromark tokenizer should register under `text`, not `flow`. No flow handling
needed.

### Node shape emitted

Both shortcut rules emit:
```javascript
{
  type: 'acadamarkTag',
  form: 'shortcut',       // distinguishes from 'short' (named) and 'long'
  tagname: 'sup',         // or 'sub'
  contentHandler: 'default',
  content: processContentItems(inner),   // string or mixed array
  isOpaqueContent: false,
  positional: [], booleans: {}, kwargs: {}, id: null, classes: [], atRefs: [],
  selfClosing: false,
}
```

`form: 'shortcut'` is a diagnostic marker; the interpreter doesn't use `form`.

---

## Q2 — Escape extension (PG-12)

Already covered in A2. Summary:

- Move `^_{}` from the pass-through class (rule 2 of `ContentItem`) to the
  acadamark-consumed class (rule 1).
- Apply the same change to `HashSigilBodyChar1`, `HashSigilBodyChar2`,
  `HashSigilBodyChar3`.
- The `BraceContentItem` rule (new) inherits the same escape structure from
  the start.
- No change to escape handling in any other part of the grammar.
- Total: 4 one-line edits across the grammar file + the new `BraceContentItem`
  already has it built in.

---

## Q3 — Interpreter / vocabulary

**Verdict: Spec's "parser-only, no interpreter change" claim is CORRECT.**

Verification:

1. `sup.md` and `sub.md` have `interpreter_strategy: schema` and
   `content_handler: default` (confirmed by reading the YAML frontmatter).

2. `schemaDispatch` in `interpret-plugin.js` (line 119–128):
   ```javascript
   const tagName = vocab.html_output?.element ?? node.tagname
   const properties = buildProperties(node, vocab)
   const children = convertContent(state, node, vocab)
   return { type: 'element', tagName, properties, children }
   ```
   For `tagname: 'sup'`, `vocab.html_output.element` is `'sup'` → `<sup>`.

3. `convertContent` (line 138–163) with `vocab.content.type === 'prose'`:
   unwraps single-paragraph content, then calls `state.one` on each child.
   This is identical to how `<sup | st>` (the existing named form) is handled.

4. A shortcut `sup` node with `contentHandler: 'default'` and post-recursive
   `content: [paragraph(text('st'))]` goes through `schemaDispatch` and
   `convertContent` identically to `<sup | st>`. Output: `<sup>st</sup>`.

5. No handler module is registered for `sup`/`sub`; they fall through to
   `schemaDispatch` directly.

The interpreter sees no difference between the explicit form `<sup | st>` and
the shortcut form `^{st}` — after `remarkRecursiveContent`, both produce the
same `acadamarkTag` node shape. The interpreter does not need to change.

---

## Q4 — Test and fixture surface

### Where new tests belong

**Grammar-level (unit):** `test/test.js` already has an escape-rules section
(around line 679) and tests for `ContentItem` behavior. New tests should go
there or in a new `test/test-shortcuts.js` if the section grows large. Cover:

- Simple superscript and subscript: `<aside | 1^{st}>` → sup node with content `'st'`
- Nested: `<aside | x^{y_{1}}>` → nested sup and sub nodes
- Escape inside braces: `<aside | ^{\^}>` → sup node with content `\^` (pass-through)
- Escape outside braces: `<aside | text \^ more>` → literal `^` via escape
- Nested acadamark inside braces: `<aside | ^{see <cite @jones>}>` → sup with
  cite node in content
- Error: empty braces `<aside | ^{}>` → parse error (per spec: empty braces error)
- Error: unmatched brace `<aside | ^{abc>` → parse error (unterminated construct)
- Opaque regions: `<$ x^2 $>` → `^` not interpreted (already opaque; verify
  the shortcut tokenizer doesn't claim `^` inside opaque regions)

**Integration-level:** `test/test-recursive.js` already has RC-10 (escape-error
array) and RC-14 (pass-through escapes). Add:

- RC-15: `^{...}` inside named-tag content → recursively parsed, produces `<sup>`
- RC-16: Nested `^{_{...}}` → nested recursive parsing
- RC-17: `\^` inside named-tag content → literal `^`, no superscript

**Fixture:** No existing fixtures exercise `<sup>` or `<sub>`. Options:

- Add `^{st}`, `H_{2}O`, `x^{n}` to an existing fixture (e.g., `document-3-edge-cases.acm`), or
- Add a new `document-10-shortcuts.acm` fixture.

**Correctness model for G1 (not output-neutral):** This slice ADDS new rendered
output where there was none. The fixture snapshots (`document-X-expected.json`
and `document-X.html`) WILL change intentionally. The correctness proof is:
"The HTML diff shows exactly the new `<sup>`/`<sub>` elements and nothing else."
This is explicitly different from F1 (where HTML content was meant to be stable
and snapshot regeneration was a surprise). Here, snapshot changes are expected
and reviewed, not a red flag.

---

## Q5 — Slice shape

### One slice or split?

**One slice.** DF-1 (the shortcut feature) and PG-12 (the escape extension)
are inseparable: `^` becomes a syntactic trigger character; `\^` needs to escape
it; you cannot add the trigger without the escape. Adding the micromark tokenizer
and the `ContentItem` rules are mechanically distinct but belong in one commit
since the feature is only testable with both.

### Files to change

| File | Change |
|------|--------|
| `grammar/acadamark.peggy` | (1) Extend rule 1 escape class to `[<\|\\^_{}]`; (2) update rule 2 to exclude `^_{}` (×4: ContentItem, HashSigilBodyChar1/2/3); (3) add `SuperscriptShortcut`, `SubscriptShortcut`, `BraceContentItem` rules |
| `src/syntax.js` | New tokenizer(s) for character codes 94 (`^`) and 95 (`_`) in `text` position |
| `src/from-markdown.js` | Handler for new token types; create `acadamarkTag` nodes with `tagname: 'sup'`/`'sub'` and `contentHandler: 'default'` (mirrors `exitAcadamarkTag` but without Peggy parse step) |
| `src/generated/parser.js` | Rebuilt from grammar (automated: `npm run build:grammar`) |
| `test/test.js` or `test/test-shortcuts.js` | Grammar-level unit tests |
| `test/test-recursive.js` | RC-15 / RC-16 / RC-17 integration tests |
| One fixture (existing or new) | End-to-end exercise of `^{...}` / `_{...}` |

**No changes needed** (confirmed):

| File | Why not |
|------|---------|
| `src/recursive-content.js` | Dispatches generically on `contentHandler: 'default'` — unchanged |
| `packages/acadamark-interpreter/` | Parser-only gap confirmed; schema dispatch handles `sup`/`sub` |
| `packages/layer1-vocabulary/elements/sup.md` | Vocabulary spec already correct |
| `packages/layer1-vocabulary/elements/sub.md` | Vocabulary spec already correct |
| `notes/escape-rules-spec.md` | Spec already describes `^_{}` as future additions |
| `notes/inline-tex-shortcuts-spec.md` | Decision-complete; no spec changes needed |

### Order of operations

1. Grammar changes first (build grammar, run `test/test.js` for unit coverage).
2. Micromark tokenizer + from-markdown handler second (run `test/test.js` and
   `test/test-recursive.js` for integration coverage).
3. Fixture update last (regenerate, inspect diff, confirm only `<sup>`/`<sub>`
   appears, commit).
4. Run both full test suites clean: `node packages/acadamark-interpreter/test/run.js`
   (23 suites) + all five parser test files (118+ tests). Both must be green.

### Correctness proof

- **Unit tests pass** for grammar rules (all shortcut/escape cases).
- **Integration tests pass** for recursive-content pipeline with shortcuts.
- **Fixture HTML diff** shows exactly the new `<sup>`/`<sub>` elements and
  nothing else — expected and reviewed.
- **Both package test suites green** from a clean rebuild of the generated parser.

### The riskiest part

**The micromark tokenizer for top-level prose.** Micromark tokenizers are
stateful machines that interact with the rest of the character-stream processor.
The `^` tokenizer must:

1. Trigger only when `^` is followed by `{` (nok otherwise — for `^` not
   followed by `{`, fall through to CommonMark literal-char processing).
2. Correctly depth-track nested `{...}` braces to find the matching `}`.
3. Handle nested `<...>` acadamark constructs inside the braces (depth-track
   those too, to avoid mistaking `>` inside `<cite jones>` for a shortcut
   terminator).
4. Not interfere with the existing `<...>` tokenizer or CommonMark escape
   processing.

The existing `syntax.js` tokenizers are the model for this. The depth-tracking
pattern (`depth++` on `<`, `depth--` on `>`) is already used in
`makeNamedTagTokenizer`. A brace-depth equivalent needs to be built for `{`/`}`.

The second-riskiest part is the `BraceContentItem` grammar rule's correctness
for the nested-shortcut case (`x^{y_{1}}`), but that is well-precedented by the
existing `ContentChar` depth-tracking pattern.

---

## Recommended G1 scope

**One slice.** DF-1 and PG-12 together, as the spec intended.

**The spec's two claims:**

1. **"No recursive-content change"** — **TRUE**, subject to grammar rules
   explicitly setting `contentHandler: 'default'` and the micromark path
   letting `from-markdown.js` set it automatically.

2. **"Parser-only gap, no interpreter change"** — **TRUE**, confirmed against
   current vocab entries and `schemaDispatch`.

**Spec gap found:** The spec describes the implementation as "grammar rules" but
the Peggy grammar only runs on `<...>` constructs. `^{...}` in top-level prose
requires a new micromark tokenizer — the same kind of work as adding any new
syntax trigger to `syntax.js`. The spec should be updated to name both
implementation surfaces (grammar ContentItem rules AND micromark tokenizer).
This is not a design change; the feature behaves exactly as specified. It is
purely an implementation-surface clarification.

**Bare `_` decision required before implementation:** The spec says bare `_`
without `{` is a parse error, but `_` is extremely common in prose text. This
needs an explicit design decision (see Q1 "bare `^`/`_` parse error" note).

**Riskiest part:** the micromark tokenizer for `^`/`_` with brace depth-tracking
in top-level prose — new territory not covered by existing tokenizer patterns,
requiring careful `{`/`}` tracking analogous to `<`/`>` tracking in the named-tag
tokenizer.

**Everything else is straightforward:** the grammar changes are mechanical, the
escape extension is four one-line edits, and the interpreter is untouched.
