# Multi-line constructs

Acadamark allows line endings inside many construct regions, so authors can structure their source for readability without affecting the parsed output. The general principle: line endings are allowed wherever they don't introduce ambiguity, and they are preserved verbatim wherever they appear in prose content.

## Where line endings are allowed

| Region | Line endings? | Behavior |
|--------|---------------|----------|
| Tag name | No | Tag names are single-token. |
| Identifier (id, class, kwarg key) | No | Identifiers are single-token. |
| Between attributes (short-form and long-form opener) | Yes | Line endings act as whitespace separator. |
| Inside unquoted attribute value | No | Unquoted values terminate at whitespace, including line endings. |
| Inside quoted attribute value | No | Quoted values are single-line. Literal line ending inside quotes is a parse error. |
| Inside bracketed list | Yes | Line endings allowed between items, treated as whitespace. |
| Named-tag content (after `\|`) | Yes | Preserved verbatim. Prose parser interprets later. |
| Sigil-tag content (`<#...#>`, `<##...##>`, etc.) | Yes | Preserved verbatim. Prose parser interprets later. |
| Math sigil content (`<$...$>`, `<$$...$$>`) | Yes | Preserved verbatim. Embedded language interprets. |
| Code sigil content (`` <`...`> ``, ` <```...```> `) | Yes | Preserved verbatim. Embedded language interprets. |
| DSL-tag content (`<csv>...</csv>`, etc.) | Yes | Preserved verbatim. Already multi-line from Slice 4. |

The principle: quoted attribute values are for short, structured strings (captions, IDs, paths). Long prose belongs in content, where line endings are natural and preserved. Tag names and identifiers are tokens with no internal whitespace.

## Examples

### Multi-attribute tag broken across lines

```
<figure
    src=elephant.jpg
    #adult-elephant
    .photo
    .featured
    align=right |
    An adult elephant.
>
```

Line endings between attributes are allowed for readability. The result is the same as putting all attributes on one line: a `<figure>` with the listed attributes and content `\n    An adult elephant.\n`.

This applies to both short-form tags (`<tag attrs | content>`) and long-form openers (`<csv\n    delimiter=,\n>`). HTML itself allows attributes broken across lines; acadamark follows the same convention.

### Multi-line named-tag content

```
<aside |
    This aside spans
    multiple lines for source readability.
>
```

The content string is preserved verbatim as `\n    This aside spans\n    multiple lines for source readability.\n`. The prose parser eventually processes it; how line endings render in the final output is the prose parser's decision (typically: collapsed to spaces in flowing text).

### Multi-line sigil heading

```
<# An Investigation of
   Elephant Behavior #>
```

The content is preserved verbatim as ` An Investigation of\n   Elephant Behavior `. Prose parsing handles the line break.

### Multi-line math

```
<$$
\frac{x}{y} = \alpha + \beta
$$>
```

Content is opaque (preserved verbatim). The embedded language (KaTeX) interprets it.

### Multi-line long-form opener

```
<csv
    delimiter=","
    header=true
>
first,second,third
</csv>
```

The opener `<csv\n    delimiter=","\n    header=true\n>` is parsed as a named tag (attributes only, no content) by the Peggy grammar. The closing `>` after the attributes must be on a line by itself (or at the end of the last attribute line). This is the same rule as short-form: a `>` on its own at depth 0 closes the opener.

### Disallowed: literal line ending in quoted value

```
<figure caption="An adult
elephant.">
```

This is a parse error. Quoted attribute values are single-line. The author has two options:

1. Keep the value on one line: `<figure caption="An adult elephant.">`.
2. Move the prose to content: `<figure src=elephant.jpg | An adult elephant.>`.

### Unexpected: literal line ending in unquoted value

```
<a href=https://example.com
/path | link>
```

This is **not** a parse error — it parses successfully but with unexpected results. Unquoted values terminate at the first whitespace (including line endings). The line ending acts as an attribute separator (because `_` includes `\n`), so the parser sees `href=https://example.com` as a kwarg and `/path` as a separate positional. The result is probably not what the author intended.

Authors should use a quoted value or keep the URL on one line.

### Disallowed: backslash at end of line (no line continuation)

```
<aside | The paragraph continues \
on the next line.>
```

`\` immediately followed by a line ending is an unknown escape sequence. The parser emits an `acadamarkParseError` node at the backslash position. Line continuation via trailing backslash is **not supported**. Authors who want content that flows across lines should simply write it on multiple lines without a trailing backslash — the prose parser collapses single line breaks to spaces in flowing text.

## Closer detection

The micromark finder scans lines until it finds the appropriate closer:

- Named tag (`<tag attrs | content>`): scans until a `>` at depth 0.
- Sigil tag: scans until the mirrored sigil sequence followed by `>`.
- DSL tag: scans until `</tagname>` matching the opener.

If the closer is not found before end-of-document, the parser emits an `acadamarkTagError` node, following the defensive error pattern from earlier slices.

## Unterminated constructs: known limitation

When a multi-line construct opener is recognized but no closer is found before end-of-document, the construct **consumes everything from the opener to EOF** and produces a single `acadamarkTagError` node. Content after the opener that would otherwise parse correctly is subsumed into the error node.

This is the same behavior as long-form DSL tags from Slice 4 (`<csv>` with no `</csv>` consumes to EOF). It is a known limitation.

The desirable behavior — localized error at the opener's line, with the rest of the document rendering normally — requires resolving the multi-paragraph content model, which is part of the recursive-content design. Any error-recovery heuristic (e.g. blank-line termination, see `recursive-content-spec.md`) interacts with content-model decisions, so the two designs are settled together.

**Practical guidance for authors:** a missing `>` or `#>` produces an error that spans to EOF. If a document renders entirely as an error node, search for an unclosed tag near where the rendered content stops.

## Whitespace inside attribute values

Whitespace handling within unquoted attribute values is unchanged from earlier slices: an unquoted value terminates at the first whitespace character (space, tab, or line ending). Authors who want whitespace in a value use a quoted value.

Quoted values preserve their internal whitespace verbatim, but cannot contain literal line endings (which are forbidden by the single-line rule above).

## Implementation note

Multi-line construct support requires the micromark finder to scan across line endings rather than terminating at them. Because micromark's subtokenize algorithm requires that all line boundaries inside a flow construct be represented by `lineEnding` void-tokens, the finder exits the `acadamarkTagRaw` chunk token before each line ending, emits a `lineEnding` sibling token, and re-enters `acadamarkTagRaw` for the next line. `from-markdown.js` accumulates multiple `acadamarkTagRaw` chunks and concatenates them (inserting `\n` at each boundary) before passing the full source to the Peggy grammar. Single-line constructs produce a single chunk and are handled identically to before.

Multi-line constructs are supported in both flow (block) and text (inline) positions. Text-position tags — those inside a paragraph — may span soft line breaks within that paragraph, matching CommonMark convention for emphasis, link text, and code spans. An inline tag cannot cross a paragraph boundary (blank line), because micromark's block-level processing splits the document at blank lines before the text tokenizer runs. Within a paragraph, the text-position tokenizer emits `lineEnding` sibling tokens at internal `\n` characters, just as the flow tokenizer does; `from-markdown.js` joins the chunks identically. This is valid and expected for content such as `<note | This note spans\nthe line break.>` inside flowing prose.

The grammar's content rules accept line endings as valid characters in prose content (`ContentItem`, `ContentChar`, `HashSigilBodyChar*`). The opaque-body rules (`SigilBodyDollar*`, `SigilBodyBt*`) use `("\n" / "\r" / .)` to match any character including newlines — note that `[\s\S]` in Peggy compiles to `/^[sS]/` (literal `s`/`S`), not "any character," and must not be used. The bracketed-list whitespace separator (`_`) is extended to include line endings.

The single-line restriction on quoted attribute values is enforced by the **tokenizer**, not the grammar. The tokenizer's `scanQuoted` helper returns `nok` on any line ending regardless of whether multi-line mode is active. When the tokenizer rejects, the construct is not recognized as an acadamark tag at all; the `<` falls through to remark's HTML handler. No `acadamarkTagError` is produced for this case.

## What's not changed

- Single-line constructs continue to work as before. Multi-line is a relaxation, not a replacement.
- Escape rules from the previous slice apply uniformly across all regions where they applied before. Multi-line content can contain `\<`, `\|`, `\\` escapes the same as single-line content.
- The opaque-content guarantee is preserved. Multi-line opaque content (math, code, DSL tags) is still opaque.
- Implicit-close behavior (a new peer-level `<section>` ending the previous one) is unaffected by multi-line. The section-nesting plugin handles nesting based on tag identification, not on whether tags span lines.
