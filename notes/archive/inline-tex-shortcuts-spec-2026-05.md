# Inline TeX-style shortcuts

**Status: Implemented** (G1a: grammar surface; G1b: top-level prose tokenizer). Both phases are complete and merged. See the [Status section](#status) at the bottom for details.

This note captures the design for inline `^{...}` and `_{...}` shortcuts that produce HTML's `<sup>` and `<sub>` elements in prose. The feature is implemented in two phases: G1a added the grammar surface (inside named-tag content); G1b added the micromark tokenizer surface (top-level prose).

## Motivation

Authors writing prose frequently want short superscript or subscript content without dropping into a math sigil:

- Ordinals: `1^{st}`, `2^{nd}`, `3^{rd}`.
- Chemistry: `H_{2}O`, `CO_{2}`, `H_{2}SO_{4}`.
- Isotopes and ions: `^{12}_{24}\text{Mg}^{+2}`.
- Footnote-style markers when superscripted text is appropriate.
- Mathematical notation in flowing prose where a full math sigil would be visually heavy.

The math sigil path (`<$ x^2 $>`) handles all of these correctly via KaTeX, but the syntactic delimiters add visual noise for short inline cases. The inline shortcut imports LaTeX's familiar superscript and subscript notation directly into prose.

## User-facing rule

In prose content, `^{...}` produces a superscript and `_{...}` produces a subscript. The `...` is the content; it is parsed recursively as prose, supporting nested enscribe constructs, markdown idioms, and other inline elements.

```
The 1^{st} edition of the work...

Water is H_{2}O.

The isotope ^{12}\text{C}.
```

## Significant characters

Adding the shortcut introduces three new syntactically-significant characters in prose: `^`, `_`, and `{`/`}` (the latter functioning as a paired delimiter).

Per the escape rules principle (any character with syntactic meaning can be escaped with `\`):

- Literal `^` in prose: `\^`.
- Literal `_` in prose: `\_`.
- Literal `{` or `}` in prose: `\{` or `\}`.

The escape rules are extended; the principle is unchanged.

The `^` and `_` characters are significant only when followed by `{`. A bare
`^` or `_` in prose without a following `{` is **ordinary literal text** — not
a parse error, not a shortcut trigger. Only the two-character sequences `^{`
and `_{` activate a shortcut. `snake_case`, `a^b`, and URLs with underscores
are all untouched. (This revises an earlier draft that specified bare `^`/`_`
as a parse error — that was a mistake, especially for `_` which is common in
prose.)

## Recursive content

The content between `{` and `}` is parsed recursively as prose. The full prose vocabulary is available inside:

- Plain text: `^{abc}`.
- Markdown idioms: `^{*emphasis*}`.
- Enscribe constructs: `^{<cite jones2026>}`.
- Nested super/sub: `x^{y_{1}}`.
- Multiple constructs combined: `x^{see <cite | jones2026> <note | qualification>}`.

The grammar doesn't need special cases for what can appear inside; it delegates to the standard prose parsing pipeline (the same recursive-content path used for other prose regions).

## Layer 1 output

Each shortcut produces a single Layer 1 element:

| Shorthand | Layer 1 |
|-----------|---------|
| `^{...}` | `<sup>...</sup>` |
| `_{...}` | `<sub>...</sub>` |

The content of the brace pair becomes the children of the `<sup>` or `<sub>` element, after recursive parsing.

## Relationship to math sigils

The inline shortcut and the math sigil are complementary:

- **Inline shortcut** (`^{...}`, `_{...}`) is for short inline super/subscript in prose, where the content is text-ish (ordinal markers, chemical formulas, isotopes).
- **Math sigil** (`<$ ... $>`) is for full math expressions where LaTeX's complete grammar is needed (fractions, integrals, summations, complex equations).

Authors choose based on the content's complexity. Short markers and chemistry stay in prose with the shortcut. Mathematical expressions go in math sigils.

The two are visually similar at a glance but produce different output:

- `1^{st}` produces `1<sup>st</sup>` in HTML — accessible to screen readers as ordinal markup, selectable as text, copyable as "1st".
- `<$ 1^{st} $>` produces a KaTeX-rendered mathematical expression — visually similar but treated as math by accessibility and copy-paste tooling.

For ordinals, chemistry, and isotopes, the inline shortcut is the right path. For equations, math sigils.

## Single-character forms not supported

LaTeX supports both `x^2` (single character without braces) and `x^{2}` (braced). Enscribe deliberately supports only the braced form.

Reasons:

- Braces make the construct visually unambiguous. A reader sees `^{...}` and immediately knows the scope of the superscript.
- Single-character forms are subtle and error-prone in flowing prose. `1^st` would render `1` with superscript `s` and a literal `t`, which is rarely the author's intent.
- The braced form is the unambiguous LaTeX form anyway. Authors writing more than one character in superscript already use braces in LaTeX.

## Edge cases

**Empty braces.** `^{}` is a parse error: empty superscript is rarely intentional, and the error is visible in the rendered output.

**Unmatched braces.** `^{abc` (missing closing brace) follows the existing pattern for unterminated constructs: the parser produces `enscribeParseError` and continues. Same defensive-error pattern as other unterminated multi-character constructs.

**Adjacent shortcuts.** `^{12}_{24}` should produce `<sup>12</sup><sub>24</sub>` — two separate elements adjacent in the output. No special handling needed; each shortcut parses independently.

**Whitespace inside braces.** `^{ st }` produces `<sup> st </sup>` (whitespace preserved). The recursive parser handles this; no special whitespace handling needed at the shortcut level.

**Nesting depth.** `x^{y^{z}}` produces nested `<sup>` elements. The recursive parser handles arbitrary depth, with the same recursion-depth limit as other recursive-parsing contexts (currently 10 levels).

## Interaction with opaque regions

The shortcut applies only in prose regions. Inside opaque content (math sigils `<$...$>`, code sigils `` <`...`> ``, DSL tags), the `^` and `_` characters retain their language-specific meaning and are not interpreted by enscribe.

This matches the existing escape-rules behavior: prose has enscribe conventions; opaque regions defer to embedded languages.

## Implementation surfaces

The implementation has two surfaces, because the Peggy grammar only runs on
`<...>` constructs found by the micromark boundary finder:

- **Grammar `ContentItem` rules (G1a)** — handles `^{...}` and `_{...}`
  inside named-tag content (`<aside | 1^{st} edition>`). The
  `SuperscriptShortcut` / `SubscriptShortcut` / `BraceContentItem` rules live
  in `grammar/enscribe.peggy`.
- **Micromark tokenizer (G1b)** — handles `^{...}` and `_{...}` in top-level
  prose (`The 1^{st} edition...`, outside any `<...>` tag). A new tokenizer in
  `syntax.js` registers for character codes 94 (`^`) and 95 (`_`) and emits
  `enscribeTag` nodes with `tagname: 'sup'`/`'sub'`.

Both surfaces produce identical `enscribeTag` nodes and are processed by the
same `remarkRecursiveContent` and interpreter pipeline.

## Implementation considerations

**Grammar.** Two new rules added to the prose content grammar — `SuperscriptShortcut` and `SubscriptShortcut`. Each captures `^` or `_` followed by a brace pair, with the brace content fed through the recursive parsing pipeline.

**Escape rules update.** The escape rules spec needs `^`, `_`, `{`, `}` added to the significant-characters list for prose regions. The implementation extends the existing escape handling.

**Recursive parsing.** No changes needed to the recursive-content plugin. The shortcut produces a node whose content is parsed by the normal mechanism. The same async pipeline that handles `<aside | text>` content handles `^{text}` content.

**Test coverage.** Tests covering each variation: simple cases (ordinals, chemistry), nested cases, escape interactions (`\^`, `\{`), error cases (empty braces, unterminated braces), opaque-region preservation.

## Status

Implemented. G1a (commit b6304a3) added `SuperscriptShortcut` / `SubscriptShortcut` rules to the Peggy grammar, covering shortcuts inside named-tag content. G1b added a micromark tokenizer (`tokenizeShortcutTag` in `syntax.js` + `buildShortcutNode` in `from-markdown.js`) covering top-level prose.

Both surfaces emit identical `enscribeTag` nodes (form `shortcut`, tagname `sup` or `sub`, contentHandler `default`). Those nodes are processed by `remarkRecursiveContent` and rendered via the existing `<sup>` / `<sub>` schema dispatch in the interpreter.

The vocabulary entries for `<sup>` and `<sub>` reference this shortcut as the expected authoring affordance, which is now active.

## See also

- [`<sup>`](../packages/layer1-vocabulary/elements/sup.md) — the Layer 1 superscript element.
- [`<sub>`](../packages/layer1-vocabulary/elements/sub.md) — the Layer 1 subscript element.
- [`escape-rules-spec.md`](escape-rules-spec.md) — the escape rules that would extend to support `^`, `_`, `{`, `}`.
- [`idioms.md`](idioms.md) — the broader principle of when enscribe adopts shortcuts vs. delegates to other parsers.
