# Parser Newline Investigation — Phase 0

Date: current session  
Scope: three parser bugs related to newline handling  
Status: **Phase 0 complete — awaiting approach confirmation before Phase 1**

---

## The three issues

1. Multi-line content in text-position (inline) named tags — content silently becomes plain text.
2. Inline tags at line-start captured as flow constructs — trailing text on the same line becomes a separate paragraph.
3. Code sigil with multi-line content in text position — produces `acadamarkTagError` instead of parsing correctly.

---

## Q1: How does the parser tokenize tags?

### Architecture recap

The tokenizer has two layers:

- **`syntax.js`** — micromark boundary finder. Two factories: `makeSigilTagTokenizer({ multiLine })` and `makeNamedTagTokenizer({ multiLine })`. Each produces two tokenizers: a flow-position one (`multiLine: true`, registered in `flow`) and a text-position one (`multiLine: false`, registered in `text`).

- **`from-markdown.js`** — mdast builder. Collects `acadamarkTagRaw` chunks (one per line for multi-line constructs), joins them with `\n`, passes to Peggy grammar.

### Named tags in text position: silent failure

`makeNamedTagTokenizer({ multiLine: false })`:

In the `attrSection` and `content` states, line endings trigger:
```js
if (markdownLineEnding(code)) {
  if (!multiLine) return nok(code)   // ← text position: reject the whole tokenizer
```

When `nok` is called, micromark backtracks and the `<` is treated as literal text. Remark then handles the two lines as a paragraph with a soft line break, collapsing them. The tag is never parsed.

**Empirical result:** `Text.<note | line one\nline two.> end.` → one `text` node with value `"Text.<note | line oneline two.> end."` (newline collapsed, no `acadamarkTag`).

### Sigil tags in text position: error node

`makeSigilTagTokenizer({ multiLine: false })`:

In the `body` state, line endings trigger:
```js
if (markdownLineEnding(code)) {
  if (!multiLine) {
    effects.exit('acadamarkTagRaw')
    effects.exit('acadamarkTag')
    return ok(code)   // ← text position: accept partial token!
  }
```

Unlike named tags, the sigil tokenizer calls `ok` (not `nok`) on the partial token. From-markdown.js then passes the incomplete source (no closing sigil) to Peggy, which fails, producing `acadamarkTagError`.

**Empirical result:** `Text <``` python\ncode here ```> more.` → `acadamarkTagError` node inside paragraph; `code here ```> more.` is raw text.

### Multi-line in flow position: works correctly

Both factories, when `multiLine: true`, emit `lineEnding` sibling tokens and continue scanning:
```js
effects.exit('acadamarkTagRaw')
effects.enter('lineEnding')
effects.consume(code)
effects.exit('lineEnding')
effects.enter('acadamarkTagRaw')
return body  // or content
```

From-markdown.js joins the chunks with `\n`. Works correctly for flow-position multi-line tags.

---

## Q2: Why does an inline tag at line-start become a sibling element?

`<$ b $> is two.` appears at the start of a line. Micromark processes flow constructs first. The flow sigil tokenizer (`tokenizeSigilTagFlow`, `concrete: true`) tries at the `<` and succeeds: it consumes `<$ b $>` and calls `ok`. The remaining ` is two.` is left over and becomes the start of a new block (paragraph).

The root cause is in `afterClose` of the sigil tokenizer:
```js
function afterClose(code) {
  effects.exit('acadamarkTagRaw')
  effects.exit('acadamarkTag')
  return ok(code)   // ← unconditional ok; code = char AFTER `>`
}
```

`code` here is the character immediately after the closing `>` — empirically confirmed: in the test `<$ b $> is two.`, `afterClose` receives the space ` ` that follows `>`. The tokenizer ignores it and calls `ok`, locking in the flow match.

The same applies to named tags. `<note | content> trailing text.` at line-start: the flow named-tag tokenizer succeeds on `<note | content>`, leaving `trailing text.` as a new paragraph.

**Empirical result for named tag:** `Line 1\n<note | content> trailing text.` → 3 children: paragraph, acadamarkTag, paragraph.

---

## Q3: Why do code sigils "swallow" newlines in text position?

The code sigil family (`` ` `` and ` ``` `) uses `makeSigilTagTokenizer({ multiLine: false })` in text position. When an inline code tag spans a line break:

```
Text <``` python
code here ```> more.
```

The text-position tokenizer hits the `\n` after `python`, calls `ok` on the partial token (everything up to but not including the `\n`), and from-markdown.js passes `<``` python` (no closer) to Peggy, which fails → `acadamarkTagError`.

The content is not truly "swallowed" — it produces an error node — but the intended structured node is lost. This is the same root cause as Issue 1 (the `!multiLine` early-return in the `body` state), but the behavior differs: named tags produce no node (full `nok`), sigil tags produce an error node (partial `ok`).

---

## Q4: Are the three issues independent or related?

**Issues 1 and 3 are the same root cause, same fix:** text-position tokenizers call `nok` or `ok` on partial tokens when they encounter a line ending. The fix is identical for both: remove the `!multiLine` early-return branch and always emit `lineEnding` sibling tokens, exactly as the flow tokenizer already does.

**Issue 2 is a separate root cause:** flow-position tokenizers succeed unconditionally regardless of what follows `>`. The fix is independent.

After Issues 1 and 3 are fixed, text-position tokenizers can cross soft line breaks. Issue 2 remains independently necessary: even with the text-position fix, `<$ b $>` at the absolute start of a line (with no preceding paragraph on that same "continuation") would still be grabbed by the flow tokenizer first.

---

## Q5: Fix for each issue

### Fix for Issues 1 and 3 (text-position multi-line)

**File:** `packages/remark-acadamark/src/syntax.js`

**Change in `makeSigilTagTokenizer`:** In the `body` state, remove the `!multiLine` branch entirely. The line-ending handling becomes unconditional:

```js
if (markdownLineEnding(code)) {
  // Both flow and text positions: emit lineEnding sibling and continue.
  effects.exit('acadamarkTagRaw')
  effects.enter('lineEnding')
  effects.consume(code)
  effects.exit('lineEnding')
  effects.enter('acadamarkTagRaw')
  return body
}
```

**Change in `makeNamedTagTokenizer`:** In both `attrSection` and `content` states, remove the `if (!multiLine) return nok(code)` branch. The line-ending handling becomes unconditional (same pattern as above).

**Why this works:** Within a paragraph, micromark's text tokenizer sees all lines of the paragraph as a single stream (including internal `\n` characters). The text tokenizer can emit `lineEnding` tokens for those `\n` values — this is the same mechanism other multi-line inline constructs use (emphasis spans, etc.). From-markdown.js already handles the multi-chunk joining correctly via `node._rawChunks.join('\n')`.

**Risk:** Low. The `multiLine` parameter continues to control flow-vs-text position for the attr section's multi-line handling (though for inline tags, multi-line attrs are unlikely in practice). The Peggy grammar already accepts `\n` in all content and body rules. No grammar changes needed.

**Boundary safety:** A text-position tokenizer cannot cross a paragraph boundary (blank line) because micromark's block-level processing has already split the document at blank lines before the text tokenizer runs. The text tokenizer's stream for a paragraph ends at the paragraph boundary.

**After the fix:** `makeNamedTagTokenizer` and `makeSigilTagTokenizer` no longer need a `multiLine` parameter for their text-position variants — the behavior is the same. The parameter can be retained for documentation clarity but has no behavioral effect after the `content`/`body` states are unified. Note: `attrSection` in named tags still uses `multiLine` to gate multi-line attribute scanning; this behavior can be kept as-is (multi-line attrs work in flow position but not text position, which is an acceptable constraint).

### Fix for Issue 2 (flow tokenizer trailing-text check)

**File:** `packages/remark-acadamark/src/syntax.js`

**Change in `makeSigilTagTokenizer`:** In `afterClose`, check whether the next character is EOL or null before accepting the flow match:

```js
function afterClose(code) {
  // Flow position: reject if non-EOL content follows on the same line.
  if (multiLine && code !== null && !markdownLineEnding(code)) {
    return nok(code)
  }
  effects.exit('acadamarkTagRaw')
  effects.exit('acadamarkTag')
  return ok(code)
}
```

(The `multiLine` check ensures text-position tokenizers are unaffected.)

**Change in `makeNamedTagTokenizer`:** The named-tag closing `>` is consumed directly in `attrSection` and `content` states. After consuming `>`, the tokenizer immediately calls `ok(code)` with `code = >`. To check the character AFTER `>`, we need a new intermediate state. Add `afterGt`:

```js
function afterGt(code) {
  // code = char AFTER `>` (the just-consumed closer)
  if (multiLine && code !== null && !markdownLineEnding(code)) {
    return nok(code)
  }
  effects.exit('acadamarkTagRaw')
  effects.exit('acadamarkTag')
  return ok(code)
}
```

And modify both GT branches to use it:
```js
// in attrSection and content, at code === GT, depth === 0:
effects.consume(code)      // consume `>`
if (multiLine) return afterGt   // check for trailing text (flow position)
effects.exit('acadamarkTagRaw')
effects.exit('acadamarkTag')
return ok(code)            // text position: no check needed
```

**Why this works:** `afterClose` (sigil) receives the char after `>` because the partial `tokenizeClose` sub-tokenizer consumed `>` — confirmed empirically (the patched version correctly separated `<$ b $> is two.` into one paragraph with inline math). `afterGt` (named) is a direct new state after consuming `>`, so micromark calls it with the char after `>`. Both check whether that char is EOL/null; if not, `nok` causes full backtracking.

**Risk:** Low for the common case. One edge case: trailing whitespace before EOL (e.g., `<$ math $>   ` — three trailing spaces). Currently, `<$ math $>   ` is a block element; after this fix, the flow tokenizer rejects it (` ` is not EOL), and it becomes an inline element in a paragraph. This is a minor behavior change for an unusual input pattern. It can be refined with whitespace-skipping in `afterClose`/`afterGt` if it proves to be a problem in practice, but it is not addressed in this fix.

**After the fix:** `<$ b $> is two.` → one paragraph with inline `acadamarkTag $` followed by ` is two.` text ✓. `<$ b $>` alone on a line → block `acadamarkTag $` ✓. `<note | content> trailing` → inline `acadamarkTag note` in paragraph ✓. `<cite jones2001>` alone on a line → block ✓.

---

## Spec contradiction found

`notes/multiline-spec.md`, Implementation note section, says:

> "Multi-line is flow-position-only. Text-position (inline) named and sigil tags remain single-line. An inline tag spanning lines would cross paragraph boundaries, which is not meaningful in markdown's content model."

This contradicts:
- The table in the same file: "Named-tag content (after `|`): Yes — Preserved verbatim." (no position qualifier)
- CommonMark semantics: emphasis, link text, code spans all cross soft line breaks within a paragraph; there is no principled reason to forbid inline acadamark tags from doing the same
- The stated design intent of Issues 1 and 3 (they are bugs to be fixed, not intentional limits)

**Resolution:** The spec restriction was a placeholder at the time it was written. The correct behavior is: inline (text-position) tags may cross soft line breaks within a single paragraph. They cannot cross paragraph boundaries (blank lines). The implementation note should be updated before Phase 1 implementation.

---

## Files to change in Phase 1

| File | Change |
|------|--------|
| `packages/remark-acadamark/src/syntax.js` | Issues 1, 2, 3: remove `!multiLine` early-returns in body/content; add trailing-text check in afterClose/afterGt |
| `notes/multiline-spec.md` | Update implementation note: text-position tags may cross soft line breaks |
| `notes/known-limitations.md` | Remove "Multi-line inline tag content is not supported" entry |

New test files:
- `packages/remark-acadamark/test/multiline-text-position.test.js` — Issues 1 and 3
- `packages/remark-acadamark/test/line-start-flow-reject.test.js` — Issue 2

---

## Phase 0 conclusion

The three issues are well-understood. The fixes are all in `syntax.js`; no grammar changes needed. The fixes are independent (can be done in any order). Recommend implementing Issues 1 and 3 together (same change), then Issue 2 separately.

**Proceed to Phase 1 after Ariel confirms the approach.**
