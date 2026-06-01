# Issue 1 Phase 0 — same-line long-form: findings

Read-only investigation. Why `<b>hello</b>` on one line produces an empty `<b>`,
and how to make same-line long-form work. No code changed. Ends in a recommended
scope (bottom).

All line references are to the working tree at the time of writing; re-verify
before implementing.

## The parser shape (context for everything below)

Enscribe's parser is hybrid. A **micromark extension**
(`packages/remark-enscribe/src/syntax.js`) finds tag *boundaries* in the source
stream — it decides where a tag starts and ends. A **Peggy grammar**
(`packages/remark-enscribe/grammar/enscribe.peggy`) parses the *internals* of a
short-form tag (its name, attributes, and pipe content). A tag's body content is
captured as a **verbatim string** and re-parsed later by `remarkRecursiveContent`
(`src/recursive-content.js`) through an inner remark pipeline.

The split matters for this issue: **same-line long-form is a micromark-tokenizer
change, not a Peggy-grammar change.** Long-form tags (`<tag>…</tag>`) are found
entirely by the tokenizer (`makeLongFormTokenizer`); Peggy never sees the content
or the closing tag.

## Q1 — why same-line long-form does not work

`<b>hello</b>` on one line renders as an empty `<b></b>` followed by the stray
text `hello</b>`. Two cooperating facts in the tokenizer cause this, and both are
**deliberate**, not accidental:

1. **The long-form opener requires a line ending after `>`.**
   `syntax.js` `afterOpenGt` (≈L646):
   ```js
   function afterOpenGt(code) {
     // Must be followed by a line ending; same-line `>` means short-form.
     if (!markdownLineEnding(code)) return nok(code)
     ...
   }
   ```
   For `<b>hello`, the char after `>` is `h`, not a line ending → `nok` → the
   long-form tokenizer rejects the opener.

2. **The long-form tokenizer is registered in FLOW position only.**
   `syntax.js` (≈L65):
   ```js
   flow: { [LT]: [ { tokenize: makeLongFormTokenizer(), concrete: true }, ... ] },
   text: { [LT]: [ tokenizeSigilTagText, tokenizeNamedTagText ], ... },
   ```
   Inline `<b>…` in a paragraph is handled in **text** position, where the
   long-form tokenizer is not even offered.

3. **The close also must sit at a line start.** `tokenizeClose.startClose`
   (≈L698) begins with `if (!markdownLineEnding(code)) return closeNok(code)` —
   the `</tag>` is only matched immediately after a line ending.

So `<b>hello</b>` falls through to `tokenizeNamedTagText`, which claims `<b>` as a
**short-form** tag with no body (the legitimate empty-tag case, e.g. `<br>`,
`<hr>`). The trailing `hello</b>` is left as text + a raw `</b>` html node.

The design intent (per the L646 comment and `DESIGN.md`) was: a `<tag>`
immediately followed by same-line content is a *short-form* (empty) tag; long-form
is the deliberately multi-line shape. Same-line `<tag>content</tag>` simply was
never a recognized construct. This is the gap to close.

**Verdict on Q1:** the constraint lives entirely in the micromark tokenizer (three
line-ending gates + flow-only registration). It is a bounded tokenizer change, not
a Peggy-grammar change and not a parser-architecture change.

## Q2 — pipe / long-form disambiguation, and how same-line fits

Today the forms are disambiguated locally, with no registry lookup:

| Source | Form | Found by |
|---|---|---|
| `<tag attrs \| content>` | pipe (short) | tokenizer routes the `\|`; Peggy parses |
| `<tag attrs />` | self-closing (short) | the `/` before `>` |
| `<tag attrs>` then same-line content | **short-form, empty** (today) | `tokenizeNamedTagText` |
| `<tag attrs>` ⏎ content ⏎ `</tag>` | multi-line long-form | `makeLongFormTokenizer` |

Adding same-line long-form means the tokenizer, on seeing `<tag attrs>` with
same-line content (not `\|`, not `/`, not a line ending), must look ahead for a
matching `</tag>` **on the same line**. Three approaches:

- **A — greedy same-line scan, fall back to existing behavior (recommended).**
  When `afterOpenGt` sees same-line content, attempt a *same-line* close scan
  (a variant of `tokenizeClose` that does not require a leading line ending and
  scans for `</tag>` before the next line ending). If `</tag>` is found → same-line
  long-form (content = the span between, fed to `remarkRecursiveContent` exactly
  like multi-line content). If a line ending arrives first, or no `</tag>` is found
  → `nok`, and the short-form tokenizer claims the empty tag (today's behavior).
  Also register the (now same-line-capable) long-form tokenizer in **text**
  position, before `tokenizeNamedTagText`, so inline `<b>hello</b>` is offered the
  long-form path first. **This preserves the existing multi-line behavior exactly
  and the empty-tag fallback exactly**; it only adds the new same-line case.

- **B — unified long form.** Drop the "opener must be followed by a line ending"
  and "close must be at a line start" constraints entirely; scan for `</tag>`
  anywhere (same line or later). Simpler conceptually (one mechanism), but it
  **changes multi-line matching**: a `</tag>` appearing mid-line inside existing
  multi-line content would now close the tag where today it does not. That risks
  re-parsing existing multi-line long-form fixtures (Q6). Higher risk.

- **C — context-sensitive (inline vs block).** Over-engineered; the local
  `</tag>`-lookahead in A already gives the needed behavior without a position
  oracle. Not recommended.

**Recommended: A.** It is additive — same-line is new, multi-line and the
empty-tag fallback are untouched — which keeps the fixture blast radius minimal.

One edge to settle in the implementation slice: `<b>hello\nworld</b>` (content
*starts* same-line but the close is on a later line). Under A's strict same-line
scan this is **not** captured (it falls back to today's short-form-empty result);
under B it would be. The motivating tags (`<b>`, `<i>`, `<s>`, `<u>`, `<q>`) are
single-line, so A covers them. Recommend documenting this as an explicit,
accepted limitation of A rather than reaching for B.

## Q3 — content parsing inside same-line long-form

The slice asked whether same-line content uses pipe-form (`ContentItem`) parsing
or block parsing. **Neither, exactly:** long-form content (multi-line *and*,
under approach A, same-line) is captured as a **verbatim string** and re-parsed by
`remarkRecursiveContent` through the inner remark pipeline (`remarkParse` +
`remarkEnscribe` + `remarkMath` + `remarkGfm`). Peggy's `ContentItem`/`OpaqueSpan`
rules apply only to **pipe** content, which Peggy parses directly.

The practical effect is exactly the inline parsing the slice wanted, delivered by
a different mechanism: the captured string is re-parsed, so emphasis, inline code,
math, and nested tags inside same-line content all render. **Empirically confirmed
on multi-line long-form** (which already uses this path), and same-line will reuse
it verbatim:

- `<b>` ⏎ `$x^2$` ⏎ `</b>` → `<b><inline-math>…KaTeX…</inline-math></b>` ✓
- `<aside>` ⏎ `text <b | bold> more` ⏎ `</aside>` → the inner `<b>` renders ✓
- `<aside>` ⏎ `a > b and c` ⏎ `</aside>` → content **may contain `>`** ✓
  (long-form content is delimited by `</tag>`, not by `>` — so same-line long-form
  is strictly more capable than pipe form, whose content cannot contain a bare `>`).

**Verdict on Q3:** reuse the existing long-form content path (verbatim string →
`remarkRecursiveContent`). No new content rule is needed; inline constructs and
the `>`-tolerance come free.

## Q4 — OpaqueSpan and nesting

**Math / code (the "OpaqueSpan" question).** `OpaqueSpan` (grammar ≈L361) is a
*pipe-content* rule; it is not the mechanism for long-form content. Math and code
inside same-line long-form are handled by `remarkRecursiveContent` (remark-math /
the code handlers), as the `$x^2$` probe above shows. So `<b>$x^2$</b>` will work
once same-line lands — via recursive re-parsing, not via `OpaqueSpan`. No
`OpaqueSpan` change is required.

**Nesting.** This splits into two cases, and the split is the crux of whether the
Discipline's "nesting is inseparable" stop-trigger applies — it does not:

- **Different-tag nesting works for free.** `<b>text <i>nested</i> tags</b>`: the
  close scan matches by **name** (the existing `tokenizeClose.matchName` compares
  the closing tag name char-by-char), so it skips `</i>` and stops at `</b>`.
  Content `text <i>nested</i> tags` is then re-parsed, and the inner `<i>…</i>` is
  itself same-line long-form → renders recursively. Basic same-line support
  therefore already handles the common nesting case **without** any extra work.

- **Same-name nesting needs depth counting and should be deferred.**
  `<b>x <b>y</b> z</b>`: a first-`</b>`-found scan closes at the inner `</b>`,
  leaving `x <b>y` as content (the inner opener unclosed). Correct handling needs a
  depth counter (match the *N*th `</b>` to the *N*th `<b>`), which the current
  `tokenizeClose` does not do. Same-name inline nesting is rare (you would write
  `<b>x **y** z</b>` or use the pipe form), so the recommendation is to **ship
  same-line long-form with a first-matching-close-by-name scan and document
  same-name nesting as an unsupported edge**, revisited only if needed.

**Verdict on Q4:** OpaqueSpan needs no change; different-tag nesting is free;
same-name nesting is a separable, deferrable enhancement. Nesting is *not*
inseparable from basic support.

## Q5 — the `""…""` sigil for `<q>`

Today `""hello""` in prose renders literally as `""hello""` (no construct claims
the doubled quote); single `"hello"` is unaffected. So the sigil is a clean
addition with no current behavior to displace.

Design assessment:

- **Mechanism.** A new micromark **text-position** construct keyed on `"` (code
  34): on `"` followed by `"`, open a `""` region and scan for a closing `""`
  (mirroring how `$$…$$` is found). The body becomes a `<q>` tag's content. This is
  *separate machinery* from the same-line long-form change (a sigil tokenizer vs.
  the long-form tag tokenizer).
- **Disambiguation.** `""` opens the sigil only if a closing `""` is found before
  the region's end; an unmatched `""` stays literal. A single `"` never triggers
  it. This is the same shape as the `$` vs `$$` disambiguation and is clean.
- **Kwarg quotes don't conflict.** `"` is significant only inside attribute values
  (`<tag attr="value">`, grammar `QuotedStringValue` ≈L491), which is *inside* a
  tag and parsed by Peggy. The `""` sigil lives in **content** (text position), a
  different parse context. No collision.
- **Nesting.** `""she said ""hi"" loudly""` — do **not** support nested `""`.
  HTML `<q>` relies on CSS (`quotes`) for nested quotation marks, not nested
  elements; a first-`""`-close scan is correct and simplest.
- **Priority.** Independent construct on `"`; it does not compete with `<` (tags),
  `$`/`` ` `` (math/code), or `^`/`_` (shortcuts).

**Verdict on Q5:** feasible and clean, but **independent of and lower-priority
than** same-line long-form. `<q>quoted</q>` (same-line) and `<q | quoted>` (pipe)
already cover quotation once same-line lands; `""…""` is an ergonomic shorthand.

## Q6 — affected fixtures and tests

**Multi-line long-form fixtures are unaffected by approach A** (it only adds the
same-line case). ~19 fixtures use multi-line long-form openers / closers
(`</csv>`, `</data>`, `</aside>`, `</meta>`, …); none should change.

Real items to audit in the implementation slice (same-line `<tag>…</tag>`
occurrences that approach A would newly recognize):

- **`document-45-calibration.emd:176` — `<blockquote>…long text…</blockquote>` on
  one line. This is the most important interaction.** `<blockquote>` is both a
  vocabulary tag *and* a block-level HTML element, so today remark claims it as a
  raw **HTML block** and it passes through (per the vocab-correction slice). With
  same-line long-form, enscribe's tokenizer could claim
  `<blockquote>content</blockquote>` as a long-form *enscribe tag* first, changing
  the render path (raw-HTML-block passthrough → enscribe schema dispatch). Both
  produce `<blockquote>`, but attribute and content handling differ. **The
  implementation slice must decide the priority (enscribe same-line long-form vs
  remark HTML-block) and audit the resulting diff** for `<blockquote>` and any
  other vocab tag that is also an HTML block element.
- `document-27-author-structured-interface.emd:25` — a same-line `<author>…</author>`
  (a structured-data container). Audit that same-line capture produces the same
  child-tag-lifted result as the multi-line / kwarg forms.
- `document-30-csv-tsv-code-handlers.emd:37` — `<code></code>` (empty, same line).
  Confirm an empty same-line long-form is a no-op equal to today's output.
- The `docs-site/*.emd` matches (design.emd L156/209/233-238/278) are **inside
  code fences** — literal examples, not parsed — and are unaffected.

**Tests to update when same-line lands (negative → positive):**

- `packages/enscribe-interpreter/test/raw-html-comments.test.js:85` — the comment
  "same-line long form not yet supported" and the pipe-only assertions; add
  positive `<b>bold</b>` assertions.
- `packages/remark-enscribe/test/test.js:692` — asserts `<table attrs>` (no pipe /
  slash / close) is **short** form. Still valid (no `</table>` follows), but
  re-confirm after the change; it documents the empty-tag fallback that approach A
  must preserve.

## Q7 — slicing recommendation

**Recommend B (two slices), front-loading same-line long-form.**

- **Slice 1 — same-line long-form (the broadly-needed change).** Approach A in the
  micromark tokenizer: relax the line-ending gates for the same-line case, register
  the long-form path in text position, add a same-line `</tag>`-by-name close scan,
  reuse the verbatim-string → `remarkRecursiveContent` content path. Includes
  different-tag nesting (free); explicitly documents same-name nesting and the
  `<b>same-line\nmulti-line>` edge as accepted limitations. Resolves the
  `<blockquote>` HTML-block priority question (Q6) and audits fixtures. Updates the
  negative tests to positive.

- **Slice 2 (optional, later) — the `""…""` sigil for `<q>`.** Separate construct,
  separate machinery, lower priority. `<q>quoted</q>` works after Slice 1, so this
  is purely ergonomic. Could also be dropped entirely (slice-prompt option C)
  without losing `<q>` support.

Not recommended: one combined slice (mixes two unrelated tokenizer changes) or
deferring the sigil "indefinitely" without recording the design (recorded here).

## Recommended scope

**Same-line long-form is feasible as a single, bounded micromark-tokenizer slice
(approach A), and should be the next implementation slice.** It is not a
parser-architecture change and not a Peggy-grammar change; it reuses the existing
long-form token types and the verbatim-string → `remarkRecursiveContent` content
path, so inline constructs, math, and different-tag nesting come free. Two edges
are deferred-and-documented rather than blocking: **same-name inline nesting**
(needs depth counting) and **content that starts same-line but closes on a later
line** (approach A leaves it short-form). One genuine interaction must be resolved
inside that slice: **the priority of same-line long-form vs remark's HTML-block
passthrough for vocab tags that are also HTML block elements** (`<blockquote>`,
exercised by `document-45`). The **`""…""` sigil** is a separate, optional,
lower-priority follow-up; its design is recorded above.

## Chat-decisions surfaced

1. **Approach A vs B for the close scan** (additive same-line vs unified
   long-form). A is recommended for lower fixture risk; B is simpler but re-parses
   multi-line matching. Confirm A.
2. **`<blockquote>`-style priority:** when a vocab tag is also an HTML block
   element written same-line, does enscribe's long-form claim it (schema dispatch)
   or does remark's HTML block keep it (passthrough)? This changes `document-45`'s
   render path and wants a deliberate decision.
3. **Same-name inline nesting:** accept as an unsupported edge for v0.1.0 (use
   markdown or pipe form), or fund depth-counting now? Recommend accept-and-defer.
4. **The `""…""` sigil:** ship as a small Slice 2, or drop indefinitely (`<q>` is
   covered by same-line long-form)? Recommend a separate optional slice, not bundled.
