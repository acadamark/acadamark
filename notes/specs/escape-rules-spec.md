# Escape rules

Acadamark uses `\` as the escape character for syntactically-significant characters. The user-facing rule is uniform: in prose content, `\X` produces literal `X` if `X` is a syntactically-significant character. The implementation cooperates with downstream parsers (remark, etc.) so authors do not have to think about which layer owns which character.

## The user-facing rule

In prose content, write `\X` to produce a literal `X` for any character `X` that has syntactic meaning. Significant characters include:

- **Acadamark constructs in content positions:** `<`, `|`, `\`
- **Markdown idioms acadamark accepts:** `*`, `_` (emphasis), `` ` `` (code spans), `#` (heading at start of line), `$` (math when bounded by `$...$`)

The escape character itself is escaped as `\\`.

**Sigil characters (`#`, `$`, `` ` ``) are syntactically meaningful only at sigil-tag opening positions (`<#`, `<$`, `` <` ``), not in prose content.** In prose, `\#`, `\$`, `` \` `` are markdown pass-through sequences, not acadamark escapes — they pass through to remark, which processes them as CommonMark escapes.

**`>` is not escapable inside named-tag content.** The micromark boundary finder closes named-tag content at any unbalanced `>`, before escape processing can apply. Use `&gt;` for a literal `>` inside named-tag content. `\>` works in prose (where remark handles it via CommonMark), but is not reliable inside named-tag content.

The principle: any character that has syntactic meaning in some position can be escaped to produce its literal value. Authors who know acadamark's syntactic surface automatically know what to escape. There are no per-character special rules.

## Where escape rules apply

Acadamark content is one of two types:

- **Prose** is parsed as acadamark source with markdown idioms. Escape rules apply.
- **Opaque** is preserved verbatim with no parser interpretation; embedded languages handle their own conventions. Escape rules do not apply.

The construct determines which type applies:

| Region | Type | Escape behavior |
|--------|------|-----------------|
| Prose outside any construct | Prose | Escape rules apply (via remark/CommonMark) |
| Named-tag content (after `\|`) | Prose | Escape rules apply |
| Hash sigil-tag content (`<#...#>`) | Prose | Escape rules apply |
| Math sigil content (`<$...$>`, `<$$...$$>`) | Opaque | No escape processing |
| Code sigil content (`` <`...`> ``, `` <```...```> ``) | Opaque | No escape processing |
| DSL-tag content (`<csv>...</csv>`, `<math>...</math>`, etc.) | Opaque | No escape processing |
| Attribute section of named tag (before `\|`) | Prose-like | Escape rules apply (see "Escapes in attributes" below) |

The rule is: if a region is parsed as prose by acadamark, escape rules apply. If a region is preserved verbatim for an embedded language, escape rules do not apply — the embedded language has its own conventions.

**Prose outside named-tag constructs** is handled entirely by remark (CommonMark). Acadamark adds no special escape processing there — remark already handles `\<`, `\>`, `\|`, `\*`, `\\`, and all other CommonMark escapes. The escape rules described in this document apply to regions that the Peggy grammar processes: named-tag content and hash sigil-tag content.

## Strict mode

`\X` where `X` is not a recognized special character is an error. The parser produces an `acadamarkParseError` node and continues. The error renders as visible warning text in the output document, making the mistake unmissable.

This is deliberate. Silent dropping of `\` would mask author mistakes; permissive interpretation (`\x` → `x`) would forgive errors but also confuse users who expect their escapes to mean something. Strict mode catches both intentional escapes (correct usage) and accidents (visible feedback).

A trailing `\` at the end of content (before `>`) is the same error: `unknown escape sequence: \`.

The precise rule: `\X` is processed as follows, in order:
1. If `X` is an acadamark-significant character in content positions (`<`, `|`, `\`), acadamark consumes the escape and emits literal `X`.
2. If `X` is any other ASCII punctuation character (CommonMark's escapable set), acadamark passes `\X` through unchanged for remark to consume.
3. Otherwise, acadamark emits an `acadamarkParseError` node.

"ASCII punctuation" here is the CommonMark definition: characters in the ranges `!`–`/`, `:`–`@`, `[`–`` ` ``, `{`–`~`.

## How acadamark and remark cooperate

The user-facing rule says "escape any syntactically-significant character." The implementation respects the layer boundary between acadamark and remark.

**In prose outside any construct:** Remark (CommonMark) handles all escapes. Any `\X` where `X` is ASCII punctuation produces literal `X`. Acadamark adds no processing here.

**Inside named-tag content and hash sigil-tag content** (the regions the Peggy grammar processes), when the parser encounters `\X`:

- If `X` is an acadamark-significant character in content positions (`<`, `|`, `\`), acadamark consumes the escape and emits literal `X` in the AST.
- If `X` is any other ASCII punctuation, acadamark passes the escape sequence `\X` through unchanged. Remark consumes the escape when recursive content parsing is implemented.
- If `X` is neither, acadamark emits an `acadamarkParseError` node.

The user does not need to know which layer owns which character. They escape; the right layer consumes the escape; the right thing happens.

Markdown pass-through escapes (`\*`, `\_`, etc.) inside named-tag content and hash sigil-tag content are stored verbatim by acadamark and consumed by remark during the recursive-content pass. After that pass runs, `\*` in the source produces a literal `*` in the rendered output via remark's standard CommonMark escape handling, the same as `\*` in prose outside any construct.

## Escapes in attributes

**Quoted attribute values** are stored verbatim by acadamark. Escape processing is deferred to the recursive-content stage. The grammar rule for quoted values is `[^"\n]*` (or `[^'\n]*` for single-quoted), so the value closes at the first matching quote character regardless of any preceding backslash. A `\"` inside a double-quoted value closes the value prematurely and causes the tag to fail to parse. Authors who need a literal double-quote inside a double-quoted value must switch quote types:

```
<figure caption='An adult "elephant"'>
```

**Bracketed list items** support one grammar-level escape: `\,` produces a literal `,` that does not act as a list item separator. This allows a single list item to contain a comma:

```
<cite [@smith2024\, jones2024]>
```

Produces one citation key `@smith2024, jones2024` (a single item with a comma in the middle). With `@` stripped by the cite resolver, the effective key is `smith2024, jones2024`.

**The `@` prefix in attribute positions** is a grammar-level sigil (F1: `@key` is an AtRef attribute). To write a literal `@` in an attribute value (e.g., a Twitter handle), use a quoted value:

```
<a href=https://twitter.com/user caption="@user">
```

A bare `@user` in attribute position is always parsed as an AtRef, not a positional argument.

All other characters in attribute values are stored as-is. The interpreter and downstream processors see the stored strings.

## Examples

### Literal angle brackets in prose

```
The condition a \< b implies a \> 0.
```

Produces prose: `The condition a < b implies a > 0.`

### Literal pipe in named-tag content

```
<aside | The pipe character \| is the content separator.>
```

Produces an `<aside>` with content: `The pipe character | is the content separator.`

### Literal backslash

```
The escape character is \\.
```

Produces: `The escape character is \.`

### Markdown emphasis preservation (prose)

```
She wrote \*emphasis\* literally, not as italics.
```

In prose, remark (CommonMark) handles `\*` and produces literal `*` in the output.

Result: `She wrote *emphasis* literally, not as italics.`

### Markdown emphasis preservation (in named-tag content)

```
<aside | She wrote \*emphasis\* literally, not as italics.>
```

Acadamark passes `\*` through unchanged in the stored content string. Until recursive content parsing is implemented, the content contains the literal `\*`. After recursive parsing, remark will process `\*` → `*`.

### Mixing acadamark and markdown escapes (prose)

```
The tag \<aside\> contains \*emphasized\* text.
```

In prose, remark handles all of these. `\<`, `\>`, and `\*` all produce their literal characters via CommonMark escape processing.

Result: `The tag <aside> contains *emphasized* text.`

### Mixing acadamark and markdown escapes (in named-tag content)

```
<aside | The tag \<aside\> text.>
```

Wait — `\>` inside named-tag content is not supported. The micromark boundary finder closes at `>` before escape processing can apply. This construct would close at the `\>` (finder sees an unbalanced `>` at depth 0). Authors must use `&gt;` for a literal `>` inside named-tag content:

```
<aside | The tag \<aside&gt; text.>
```

Here acadamark converts `\<` → `<`; the `&gt;` is passed through to the HTML renderer as `>`. Result: the aside contains `The tag <aside> text.`

### Unknown escape (in named-tag content)

```
<aside | The path is C:\new\folder.>
```

`\n` and `\f` are not recognized special characters (neither acadamark-significant nor ASCII punctuation). The parser emits two `acadamarkParseError` nodes for `\n` and `\f`. The output renders the errors visibly.

**Unknown escapes only produce error nodes inside named-tag content and hash sigil-tag content** — the regions the Peggy grammar processes. In prose outside constructs, remark applies CommonMark rules: `\n` → `\n` (backslash preserved, `n` literal), no error node.

For paths inside named-tag content, use a code span (opaque — no escape processing):

```
<aside | The path is `C:\new\folder`.>
```

### Opaque content unaffected

```
<math>
\frac{x}{y} = \alpha
</math>
```

Inside `<math>...</math>`, the content is opaque. `\frac` and `\alpha` are LaTeX commands, not acadamark escapes. The parser preserves them verbatim for KaTeX to process.

```
<csv>
name,price
"item with \"quotes\"",10
</csv>
```

Same here. Inside `<csv>`, the content is CSV source. The CSV parser handles its own quote-escaping conventions; acadamark does not interpret `\"`.

## Implementation note

The escape rules are implemented in the grammar (Peggy) by extending the relevant content rules to recognize `\X` sequences. The grammar consumes `\X` and emits `X` for acadamark-significant `X` in content positions (`<`, `|`, `\`), passes `\X` through unchanged for other ASCII punctuation, and emits `acadamarkParseError` for unrecognized `X`.

**The micromark finder is unaffected.** The finder does not know about backslash escaping. For `\<tagname>` in named-tag content, the finder sees `\` as a regular char, then `<tagname>` increments depth — so the depth tracking works correctly even with an escaped `<`. The grammar then processes `\<` as an escape unit (the escape alternative is tried before the nested-construct alternative), consuming `\<` as literal `<` and leaving `tagname>` as regular text.

**`\>` is not a grammar-level escape in named-tag content.** The finder closes on any `>` at depth 0, before the grammar runs. Authors should use `&gt;` for literal `>` inside named-tag content.

**Content model change.** Named-tag content and hash sigil-tag content have changed from a single opaque string to a `(string | acadamarkParseError)[]` array. When there are no escape errors, `processContentItems()` collapses the array to a plain string (backward-compatible with existing code). When errors exist, the content is a mixed array with error nodes interleaved at the positions where the unknown escapes occurred.

The `isOpaqueContent` field retains its meaning: "content has not been recursively re-parsed through remark." Before recursive parsing, content may be a plain string, a mixed array, or (after recursive parsing) a full structured mdast `Node[]`. The field describes the pipeline stage, not the data shape.

Escape rules apply to:
- Named-tag content rules in `acadamark.peggy`: `ContentItem` (replaces `$ContentChar*`)
- Hash sigil-tag body rules: `HashSigilBodyItem1/2/3` (replaces `$SigilBody1/2/3`)
- Bracketed list items: `EscapedListItem` (replaces `Identifier` inside `ListItem`)

Escape rules do not apply to:
- Dollar sigil bodies (`SigilBodyDollar1/2`): opaque, unchanged
- Backtick sigil bodies (`SigilBodyBt1/3`): opaque, unchanged
- DSL tag content: opaque, unchanged
- `QuotedStringValue`: attribute values are stored verbatim; escape processing deferred
