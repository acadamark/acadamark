# Acadamark Shorthand Syntax Specification

This document specifies the acadamark shorthand syntax precisely enough for a parser implementation. It defines what valid source looks like, how the parser tokenizes and structures it, and what the parser does *not* do (which is the interpreter's job).

This is the syntactic ground truth. Other notes in this directory (`shorthand-tag-processing.md`, `figures.md`, `tables.md`, etc.) are illustrative — they show *what* tags are useful and *how* they should be interpreted, but this document defines the underlying syntax those tags are written in.

## Scope

This document specifies:

- The lexical structure of the shorthand (what characters mean what).
- How tags, attributes, and content are recognized.
- How sigil tags and DSL tags are closed.
- The shape of the structured nodes the parser produces.

This document does *not* specify:

- What individual tag names mean (that's the interpreter's job).
- How positional arguments map to attributes for specific tags.
- How tags become HTML.
- Render-mode lowering, citation resolution, numbering, cross-references.

These belong to downstream plugins.

## Design principles

**The parser knows nothing about meaning.** It recognizes the syntax of tags and produces uniform structured nodes. Whether `<cite jones2001>` means "lookup citation" or "format a reference" is the interpreter's call, not the parser's. Adding a new tag never requires modifying the parser.

**Every `<` matches a `>`.** The matching `>` ends the construct. Block-level vs. inline tags differ only in whether their content spans multiple lines — there is one closing rule.

**Attributes and content are separated by `|`.** No `|` means no content. This makes the boundary explicit and removes any need for the parser to guess.

**Sigil tags use mirrored closers.** `<$...$>`, `<#...#>`, `` <`...`> `` etc. The mirroring resolves verbatim-content ambiguity for math, code, and headings.

**Named DSL tags use HTML long form.** `<csv>...</csv>`, `<theorem>...</theorem>`, `<matrix>...</matrix>`. This is just standard HTML, and it aligns with LaTeX's environment model.

## Grammar (EBNF)

```ebnf
construct       ::= sigil_tag | named_tag

sigil_tag       ::= "<" sigil [ws+ attributes] ["|" content] sigil ">"
sigil           ::= "#" | "##" | "###" | "$" | "$$" | "`" | "```"
                    (* currently registered levels; extensible, but only these
                       lengths are accepted — the `+` form is not open-ended *)

named_tag       ::= short_form | long_form
short_form      ::= "<" tag_name [ws+ attributes] ["|" content] ">"
long_form       ::= "<" tag_name [ws+ attributes] ">" line_ending content "</" tag_name ">"
                    (* opener must end at a line boundary; content may span
                       multiple lines; line endings inside content are preserved *)

tag_name         ::= [a-zA-Z] [a-zA-Z0-9_-]*
                     (* strict: for the word immediately after `<` and keyword keys *)
identifier       ::= identifier_start identifier_cont*
identifier_start ::= [^ \t\n<>|+\-#.="'\[\],]
                     (* excludes structural delimiters AND syntactic prefixes
                        (+, -, #, ., =); these may appear mid-identifier only *)
identifier_cont  ::= [^ \t\n<>|"'\[\],]
                     (* excludes structural delimiters; `=` is allowed so that
                        URLs with query strings work as bare identifiers *)

attributes      ::= attribute (ws+ attribute)*
attribute       ::= positional | bracketed_list | flag | id | class | keyword

positional      ::= identifier
bracketed_list  ::= "[" ws* list_item (ws* "," ws* list_item)* ws* "]"
list_item       ::= identifier | quoted_string
flag            ::= ("+" | "-") tag_name
id              ::= "#" identifier
class           ::= "." tag_name
keyword         ::= tag_name "=" value
value           ::= identifier | quoted_string

quoted_string   ::= '"' [^"]* '"' | "'" [^']* "'"

content         ::= (text | construct)*
                    (* content is parsed normally for non-DSL tags *)
                    (* content is opaque text for sigil tags and DSL tags *)

ws              ::= " " | "\t" | "\n"
```

This grammar is intentionally informal in places — the precise behavior of `identifier`, content scanning, and DSL recognition is described in prose below where the formal grammar would be cumbersome.

## Lexical rules

### Tag names and identifiers

The grammar uses two distinct character-class rules for names:

A *tag name* (`tag_name`) is strict: starts with an ASCII letter, continues with letters, digits, underscores, or hyphens (`[a-zA-Z][a-zA-Z0-9_-]*`). Tag names appear as the word immediately after `<` and as the key in `key=value` attributes. Tag names are case-sensitive at the parser level (the interpreter may normalize).

An *identifier* uses a start-and-continue split: the first character must not be a syntactic prefix (`+`, `-`, `#`, `.`, `=`) or structural delimiter; subsequent characters may include those prefix characters as literal data, including `=`. This is encoded in two sub-rules (`identifier_start`, `identifier_cont`) that mirror the EBNF directly. Examples: `fig:body-cross-section` (starts with `f`; `:` and `-` are valid `identifier_cont` chars), `my-cool-id`, `v1.2.3`, `https://example.com`, `https://example.com?q=value` (`:`, `/`, `?`, `=` all valid `identifier_cont`). Whitespace and the structural delimiters (`<`, `>`, `|`, `"`, `'`, `[`, `]`, `,`) are never allowed in identifiers.

The asymmetric treatment of `=` is intentional: `=` excluded from `identifier_start` keeps keyword syntax (`key=value`) unambiguous — a `=` can never begin an identifier, so the first `=` after a tag-name token always signals a keyword. `=` allowed in `identifier_cont` lets URLs with query strings (`https://example.com?q=value`) appear as bare positionals or keyword values without quoting. Keyword parsing is unaffected because the attribute rule tries `Keyword` (`tag_name "=" value`) before `Positional`, and `tag_name` uses its own strict character class that stops at `=`.

The distinction matters for cross-references and ids: `<ref #fig:body-cross-section>` must produce `id: "fig:body-cross-section"` with the `:` intact. Using `tag_name` for id values would reject this. The start-and-continue split also makes disambiguation self-contained: `#elephant` is unambiguously an id form (the `#` is a syntactic prefix, not an identifier character), while `section-one` is unambiguously a valid positional identifier.

### Sigils

A *sigil* is one or more occurrences of a registered sigil character. The current registered sigils are `#`, `$`, and `` ` ``. The set is extensible; new sigils are registered alongside their tag-name expansion.

Sigil tags and named tags are distinguished by their first non-`<` character: if it's a sigil character, it's a sigil tag; otherwise, it's a named tag.

### Attribute forms

| Form              | Example                  | Parsed as                                       |
|-------------------|--------------------------|-------------------------------------------------|
| Positional        | `jones2001`              | Append to `positional` array                    |
| Bracketed list    | `[smith2017, jones2023]` | Append to `positional` array as a single list   |
| Boolean flag (true)  | `+wrap`               | `booleans.wrap = true`                          |
| Boolean flag (false) | `-preview`            | `booleans.preview = false`                      |
| Id                | `#elephant`              | `id = "elephant"`                               |
| Class             | `.numbered`              | Append `"numbered"` to `classes` array          |
| Keyword (unquoted)| `align=right`            | `kwargs.align = "right"`                        |
| Keyword (quoted)  | `caption="An elephant"`  | `kwargs.caption = "An elephant"`                |

Attributes can appear in any order. Multiple positional, multiple flags, multiple classes are all allowed. Multiple `id` attributes or multiple of the same keyword is an error (parser may report or take last value, implementation choice).

### Identifiers

Identifiers are the values of `#id` attributes, `key=value` keyword values (when unquoted), positional arguments, and bracketed list items. An identifier is a sequence of non-delimiter characters where the first character is not a syntactic prefix (`+`, `-`, `#`, `.`, `=`). Mid-identifier, prefix characters including `=` are allowed as literal data — so `fig:body-cross-section`, `my-cool-id`, `v1.2.3`, and `https://example.com?q=value` are all valid identifiers. Whitespace and the structural delimiters (`<`, `>`, `|`, `"`, `'`, `[`, `]`, `,`) are never allowed in identifiers; values containing those characters must be quoted.

### Quoted strings

Either single (`'`) or double (`"`) quotes. The quote character cannot appear inside its own kind. Acadamark stores attribute values verbatim — no escape processing at the parser level. Escape sequences inside quoted values (e.g., `\"`) are preserved literally in the stored string; they are processed by remark when recursive content parsing is implemented. Until then, switch quote types to include the other delimiter:

```
<figure caption='An adult "elephant"'>
```

Note: this is a temporary state. When recursive content parsing lands, `\"` inside a double-quoted value will be processed normally.

### Whitespace

Whitespace separates attributes from each other. Between attributes, any amount of whitespace (including newlines) is equivalent to a single space. This means attributes can be laid out across multiple lines for readability:

```
<figure
    src=elephant.jpg
    #adult-elephant
    align=right
    +wrap
    | An adult African elephant.>
```

### The `|` separator

`|` separates the attribute section from the content section. Exactly zero or one `|` per construct.

- No `|` and no closing tag: the tag has no content. Example: `<cite jones2001>`.
- `|` followed by content, then `>`: short-form content. Example: `<a https://example.com | Click here>`.
- No `|` but a closing tag (`</tagname>`): long-form content. Example: `<csv>1,2,3\n4,5,6</csv>`.

A `|` cannot appear in long form. A construct uses one form or the other, not both.

## Closing rules

### Short form

The construct ends at the first `>` that is not inside a nested `<...>` pair. The parser tracks balanced `<...>` pairs while scanning content.

```
<figure src=elephant.jpg | An <em>adult</em> elephant.>
                                                       ↑ this > closes figure
```

### Sigil tags (mirrored closers)

Sigil tags close with the sigil sequence repeated immediately before `>`.

| Open       | Close      | Notes                            |
|------------|------------|----------------------------------|
| `<#`       | `#>`       | Section heading or similar       |
| `<##`      | `##>`      | Sub-section heading              |
| `<###`     | `###>`     | Sub-sub-section heading          |
| `<$`       | `$>`       | Inline math                      |
| `<$$`      | `$$>`      | Display math                     |
| `` <` ``   | `` `> ``   | Inline code                      |
| `` <``` `` | `` ```> `` | Code block                       |

The closing sigil must match the opening sigil exactly (same character, same count). Inside the content, the sigil character may appear freely except as a contiguous run matching the opener immediately before `>`.

Sigil tag content is **opaque** — no nested-tag parsing happens inside. The whole content from after `|` to before the closing sigil is a literal string. This is what makes sigil tags suitable for math (which contains `<`, `>`, `\`, etc.) and code (which contains anything).

The `|` separator is optional. Without it, the tag has no attributes and the entire body is opaque content. `<$ \frac{x}{2} $>` produces `content: " \\frac{x}{2} "` with `isOpaqueContent: true`. The `|` form exists only to attach attributes: `<$ #myeq | \frac{x}{2} $>`.

When a sigil tag appears nested inside the content of a named tag, the parser's depth-tracking logic (rule B) must recognize the sigil character as a tag-opening signal. `<` followed immediately by a registered sigil character increments the nesting depth during content scanning, preventing the sigil's closer from prematurely ending the outer construct. For example, in `<figure | nested <$ x $>>`, the inner `$>` does not close `figure` because `<$` was recognized as a depth-incrementing opener.

### Long-form tags

Long-form tags use HTML-shaped syntax for multi-line content:

```
<tagname attrs>
content line 1
content line 2
</tagname>
```

The opening tag follows the same attribute syntax as short-form named tags (positionals, ids, classes, kwargs, flags all permitted). The closing tag is `</tagname>` with the tag name matching the opener exactly; no whitespace is permitted inside the angle brackets of the closer. Content between the opening and closing tags is preserved verbatim, including newlines, indentation, and any characters that look like acadamark constructs. At Slice 4, all long-form content is an opaque string regardless of `contentHandler`. When recursive content parsing is implemented (a future slice), nodes with `contentHandler: "default"` will have their content re-fed through remark; DSL-handler nodes remain permanently opaque.

**Long-form tags are recognized in flow (block) position only.** They are not recognized inside paragraphs.

**Disambiguation with short-form empty tags.** An opening tag `<tagname attrs>` at the end of a line is syntactically identical to a long-form opener. The finder resolves the ambiguity using the DSL registry, not lookahead: it reads the tag name, checks the registry, and proceeds as long-form only if the name is registered. If the name is not registered, the long-form tokenizer immediately calls `nok` so the flow hook falls through to `tokenizeNamedTag` (short-form). This means `<section #intro>` at block level is always short-form (section is not in the registry), while `<csv>` at block level is always long-form (csv is registered).

For registered tags, the finder consumes content until it encounters a matching `</tagname>`. If end-of-document is reached without a closer, the node is emitted as `acadamarkTagError` — there is no fallback to short-form. This is deliberate: true lookahead (scanning forward before committing) would be expensive in micromark's streaming model, and the error gives authors clearer feedback than a silent short-form fallback would. A `<csv>` with no `</csv>` is almost certainly an authoring mistake.

Authors who want a short-form empty tag for a registered name (unusual) should use the `|` form: `<csv | >` is unambiguously short-form because the `|` character causes the long-form tokenizer to call `nok` before reaching `afterOpenGt`. Short-form named tags with attributes but no `|` and no content (`<aside .note>`) are also short-form when the tag is not registered; if the tag is registered, they become long-form openers and require a matching closer.

**Nested same-name tags.** The finder uses first-closer-wins: the first `</tagname>` encountered closes the outermost `<tagname>`. Depth is not tracked inside long-form content at Slice 4 since content is opaque. For example, `<aside>outer<aside>inner</aside>more</aside>` produces one `<aside>` with content `outer<aside>inner`; the trailing `more</aside>` is not consumed and falls through to remark. When recursive content parsing lands, nodes with `contentHandler: "default"` will re-parse their content, at which point nested same-name tags are handled correctly by the inner pipeline.

**Defensive error.** If the finder encounters a long-form opener but reaches end-of-document without finding a matching `</tagname>`, it emits `acadamarkTagError` rather than producing a partial node. The node shape is the same as the sigil-opener error case (see "What the parser produces").

## Sigil-tag and DSL-tag verbatim content

Both sigil tags and registered DSL tags treat their content as opaque text. Inside opaque content:

- `<` and `>` are not special.
- `|` is not special.
- The closer is the only escape from opaque mode.
- Whitespace is preserved exactly.

This is what allows acadamark to embed CSV, TSV, LaTeX, code, mermaid, and other DSLs without any escaping mechanism.

## DSL tag registry

The registry serves two related but distinct functions: it declares **long-form eligibility** and assigns a **content handler**. Both are properties of being in the registry.

- **Long-form eligibility.** Only tags listed in the registry are recognized in long-form. The micromark boundary finder reads the tag name and calls `nok` immediately if the name is absent. This means the registry is the parser's mechanism for deciding which tags can have multi-line block content — not just a handler-classification list.
- **Content handler.** The `contentHandler` field on the resulting node names which handler the interpreter should dispatch to. DSL-handler entries (like `csv → "csv"`, `math → "math"`) name a specific embedded-language handler. Structural entries (like `aside → "default"`, `blockquote → "default"`) use the `"default"` handler, meaning content is re-parsed through the regular remark pipeline when recursive content parsing is implemented.

Tags not in the registry have neither property: they cannot appear in long-form and carry no `contentHandler`. The `"default"` handler name is a real entry in the registry, not a fallback for unregistered tags.

Every long-form node carries a `contentHandler` string. There is no null/absent case.

Initial registry (interim hard-coded list; migrates to `packages/layer1-vocabulary/` when that package is set up):

| Tag name    | `contentHandler` value | Content type                |
|-------------|------------------------|-----------------------------|
| `csv`       | `"csv"`                | Comma-separated values      |
| `tsv`       | `"tsv"`                | Tab-separated values        |
| `math`      | `"math"`               | Math (default: TeX/KaTeX)   |
| `code`      | `"code"`               | Source code                 |
| `mermaid`   | `"mermaid"`            | Mermaid diagram source      |
| `abc`       | `"abc"`                | ABC music notation          |
| `theorem`   | `"theorem"`            | Theorem (LaTeX-like)        |
| `matrix`    | `"matrix"`             | Matrix                      |
| `cases`     | `"cases"`              | Piecewise function          |
| `align`     | `"align"`              | Aligned equations           |
| `eqnarray`  | `"eqnarray"`           | Equation array              |

The map currently uses identity keys (tag name = handler name). A future `<equation>` tag could map to `"math"` without changing the handler implementation.

**Implementation note.** The registry is a `Map<string, string>` exported from `src/dsl-registry.js`. The tokenizer uses `.has()` to gate long-form eligibility; `getContentHandler()` returns the mapped handler name, or `"default"` for unregistered tags (the fallback is never reached in practice since unregistered tags are rejected at the tokenizer level). When `packages/layer1-vocabulary/` is set up (Slice 5+), the map migrates there as a declared property of each long-form element spec; the parser imports it. Comments in `src/dsl-registry.js` note the intended migration.

The qualifying-tag pattern (`<category language | content>`) means a generic category tag can declare its content's language as the first positional. `<table csv | ...>` and `<table tsv | ...>` are valid, even though `table` itself is not necessarily a DSL tag.

## Qualifying-tag pattern

The general form `<category language | content>` lets a structural tag declare its content's input format. Examples:

```
<table csv | A,B,C
1,2,3>

<code python | print("hello")>

<math tex | E = mc^2 >

<diagram mermaid | graph TD; A-->B >
```

Whether the tag is a DSL tag is determined by the registry consulting either the tag name (`code`, `math`) or — for category tags like `table` and `diagram` — the first positional argument. Implementation detail: when entering a category tag's content, the parser checks if the first positional matches a registered DSL identifier. If so, content is opaque.

## Nested tags inside content

For non-DSL, non-sigil tags, content can contain nested constructs:

```
<figure src=elephant.jpg | An adult elephant. <figure-caption | Photographed in Tanzania.> >
```

The parser tracks balanced `<...>` so that the inner `>` doesn't false-close the outer figure. It then recurses into the nested tag.

Markdown can also appear in content:

```
<aside | This is a *footnote* with **emphasis** and a [link](url).>
```

Markdown parsing is not the shorthand parser's job — it's done by remark, which the shorthand parser is built as an extension to. The shorthand parser produces nodes that remark then continues to process.

## What the parser produces

For each parsed construct, the parser produces a structured node with the following shape:

```
{
  type: "acadamarkTag",
  form: "short",               // "short" | "long" — distinguishes short-form from long-form
  tagname: "figure",
  positional: ["csv"],         // array of strings or arrays
  booleans: { wrap: true },    // map of name → true/false
  kwargs: { align: "right" },  // map of name → string
  id: "elephant",              // string or null
  classes: ["numbered"],       // array of strings
  content: <child nodes or opaque string>,
  isOpaqueContent: false       // true for sigil tags and all long-form at Slice 4
}
```

For sigil tags, `tagname` is the literal sigil string: `<#` → `"#"`, `<##` → `"##"`, `<###` → `"###"`, `<$` → `"$"`, `<$$` → `"$$"`, `` <` `` → `` "`" ``, etc. The `positional`, `booleans`, etc. fields all behave the same way as for named tags. Sigil tags have `form: "short"`.

For tags with opaque content, `content` is the raw string. For tags with parsed content, `content` is an array of child nodes (which may themselves be `acadamarkTag` nodes, or markdown nodes, or plain text).

**Long-form nodes** have `form: "long"` and one additional field:

```
{
  type: "acadamarkTag",
  form: "long",
  tagname: "theorem",
  contentHandler: "theorem",  // names the content handler; "default" for regular long-form
  isOpaqueContent: true,      // true for all long-form at Slice 4
  content: "...",             // verbatim multi-line string at Slice 4
  positional: [],
  booleans: {},
  kwargs: {},
  id: null,
  classes: [],
}
```

`contentHandler` names which handler the interpreter should dispatch to for this node's content. `"default"` is a real registry entry — it applies to registered structural long-form tags (like `aside` and `blockquote`) whose content is prose that should be re-parsed through the regular remark pipeline when recursive content parsing is implemented. DSL-handler entries like `"math"` or `"csv"` name a specific embedded-language handler. Tags not in the registry cannot appear in long-form at all — the long-form tokenizer rejects them at the tag-name level. The field is never absent on long-form nodes.

`isOpaqueContent: true` on long-form nodes is a transient state at Slice 4. When recursive content parsing lands, nodes with `contentHandler: "default"` will have `isOpaqueContent` set to false and `content` will become `Node[]`. DSL-handler nodes remain `isOpaqueContent: true` permanently.

**Error node.** When the micromark finder recognizes a sigil opener (`<#`, `<$`, `` <` `` etc.) but reaches end-of-line without finding the mirrored closer, it commits the truncated span as a token and the Peggy parser fails on it. The result is an `acadamarkTagError` node rather than a silent fall-through to remark's tokenizer (which can produce runaway fenced-code-block parsing for backtick sigils). Shape:

```
{
  type: "acadamarkTagError",
  source: "<```",         // the raw fragment as extracted by the micromark finder
  error: "...",           // the Peggy parse-error message
  position: { ... }       // standard mdast position (added automatically)
}
```

This behavior is a finite-lifespan guard: when multi-line sigil tags are implemented, the end-of-line check in the micromark finder will be relaxed and these error tokens will become unreachable.

## Worked examples

The examples below are paired with their parsed structure. The structure is shown as the relevant fields of the produced node. Fields not shown are at their default (empty array, empty object, or null).

### Example 1: Simple inline tag with positional and content

```
<a https://google.com | Google>
```

```
{
  tagname: "a",
  positional: ["https://google.com"],
  content: ["Google"]
}
```

### Example 2: Tag with no content

```
<cite jones2001>
```

```
{
  tagname: "cite",
  positional: ["jones2001"]
}
```

### Example 3: Bracketed list as positional

```
<cite [smith2017, jones2023]>
```

```
{
  tagname: "cite",
  positional: [["smith2017", "jones2023"]]
}
```

### Example 4: Mixed attributes

```
<figure src=elephant.jpg #adult-elephant align=right +wrap | An elephant.>
```

```
{
  tagname: "figure",
  id: "adult-elephant",
  kwargs: { src: "elephant.jpg", align: "right" },
  booleans: { wrap: true },
  content: ["An elephant."]
}
```

### Example 5: Multiple classes

```
<div .container .featured .dark-mode | Hello>
```

```
{
  tagname: "div",
  classes: ["container", "featured", "dark-mode"],
  content: ["Hello"]
}
```

### Example 6: Quoted keyword value

```
<figure caption="An adult African elephant, photographed in Tanzania.">
```

```
{
  tagname: "figure",
  kwargs: { caption: "An adult African elephant, photographed in Tanzania." }
}
```

### Example 7: Multi-line attributes

```
<figure
    src=elephant.jpg
    #adult-elephant
    align=right
    +wrap
    | An adult elephant.>
```

```
{
  tagname: "figure",
  id: "adult-elephant",
  kwargs: { src: "elephant.jpg", align: "right" },
  booleans: { wrap: true },
  content: ["An adult elephant."]
}
```

### Example 8: Nested tag in content

```
<figure src=elephant.jpg | An <em | adult> elephant.>
```

```
{
  tagname: "figure",
  kwargs: { src: "elephant.jpg" },
  content: [
    "An ",
    { tagname: "em", content: ["adult"] },
    " elephant."
  ]
}
```

### Example 9: Sigil tag (heading)

```
<# Introduction #>
```

```
{
  tagname: "#",
  isOpaqueContent: true,
  content: " Introduction "
}
```

(Note: in this case there is no `|`. For sigil tags, the body between the opener and the mirrored closer is always treated as opaque content when no `|` is present — no attribute parsing occurs. This applies to all sigil families. See the Resolved Decisions section for the settled rule.)

### Example 10: Sigil tag with id

```
<# #intro | Introduction #>
```

```
{
  tagname: "#",
  id: "intro",
  isOpaqueContent: true,
  content: " Introduction "
}
```

### Example 11: Inline math

```
<$ | \frac{1}{\sqrt{2}} $>
```

```
{
  tagname: "$",
  isOpaqueContent: true,
  content: " \\frac{1}{\\sqrt{2}} "
}
```

### Example 12: Display math

```
<$$ | \int_0^1 x^2 \, dx $$>
```

```
{
  tagname: "$$",
  isOpaqueContent: true,
  content: " \\int_0^1 x^2 \\, dx "
}
```

### Example 13: Inline code

```
<` | const x = 1 `>
```

```
{
  tagname: "`",
  isOpaqueContent: true,
  content: " const x = 1 "
}
```

### Example 14: Long-form DSL tag (CSV)

```
<csv>
A, B, C
1, 2, 3
4, 5, 6
</csv>
```

```
{
  tagname: "csv",
  isOpaqueContent: true,
  content: "\nA, B, C\n1, 2, 3\n4, 5, 6\n"
}
```

### Example 15: Qualifying-tag pattern (table with CSV)

```
<table csv>
A, B, C
1, 2, 3
</table>
```

```
{
  tagname: "table",
  positional: ["csv"],
  isOpaqueContent: true,
  content: "\nA, B, C\n1, 2, 3\n"
}
```

(The parser knows `table` with `csv` as first positional is opaque-content. The DSL registry handles this dispatch.)

### Example 16: Long-form theorem environment

```
<theorem>
For every prime $p$, there are infinitely many primes congruent to $1 \pmod{p}$.
</theorem>
```

```
{
  tagname: "theorem",
  isOpaqueContent: true,
  content: "\nFor every prime $p$, there are infinitely many primes congruent to $1 \\pmod{p}$.\n"
}
```

### Example 17: Long-form matrix

```
<matrix>
1 & 0 \\
0 & 1
</matrix>
```

```
{
  tagname: "matrix",
  isOpaqueContent: true,
  content: "\n1 & 0 \\\\\n0 & 1\n"
}
```

### Example 18: Cite with flags

```
<cite [perez1975, Noori1992] +link +preview>
```

```
{
  tagname: "cite",
  positional: [["perez1975", "Noori1992"]],
  booleans: { link: true, preview: true }
}
```

### Example 19: Reference with flags and id

```
<ref #fig:body-cross-section +link +preview +title>
```

```
{
  tagname: "ref",
  id: "fig:body-cross-section",
  booleans: { link: true, preview: true, title: true }
}
```

### Example 20: List with flags and content

```
<list +ordered |
- First item
- Second item
- Third item
>
```

```
{
  tagname: "list",
  booleans: { ordered: true },
  content: ["\n- First item\n- Second item\n- Third item\n"]
}
```

(List content is markdown-parsed downstream — the parser just produces the content as text. The list interpreter handles `- ` items.)

### Example 21: Anchor with positional URL and class

```
<a https://example.com .normal-link | Example>
```

```
{
  tagname: "a",
  positional: ["https://example.com"],
  classes: ["normal-link"],
  content: ["Example"]
}
```

### Example 22: Image with positional and dimensions

```
<img puppy.jpg width=240 height=240>
```

```
{
  tagname: "img",
  positional: ["puppy.jpg"],
  kwargs: { width: "240", height: "240" }
}
```

### Example 23: Note with positional placement and content

```
<note margin +preview .footnote | text of the note>
```

```
{
  tagname: "note",
  positional: ["margin"],
  booleans: { preview: true },
  classes: ["footnote"],
  content: ["text of the note"]
}
```

### Example 24: Empty tag with id and classes only

```
<div #spacer .clear .tall>
```

```
{
  tagname: "div",
  id: "spacer",
  classes: ["clear", "tall"]
}
```

### Example 25: Nested figure with caption

```
<figure src=elephant.jpg #elephant |
    An adult African elephant.
    <figure-caption | Photographed in Tanzania, 2019.>
>
```

```
{
  tagname: "figure",
  id: "elephant",
  kwargs: { src: "elephant.jpg" },
  content: [
    "\n    An adult African elephant.\n    ",
    {
      tagname: "figure-caption",
      content: ["Photographed in Tanzania, 2019."]
    },
    "\n"
  ]
}
```

## Resolved decisions

These were open questions that were settled during implementation.

- **Sigil tags without `|`: body is opaque content, no attribute parsing.** When no `|` is present, the entire body between the opening sigil and the mirrored closer is treated as opaque content — no attribute parsing occurs. Attributes on sigil tags always require `|`. Example: `<# Introduction #>` → `content: " Introduction "` (no attributes parsed). `<# #intro | Introduction #>` → `id: "intro"`, `content: " Introduction "`.

- **`-` allowed in keyword values (after `=`).** The naked token in keyword value position allows `-`. In positional or attribute-name position, `-` remains excluded (it disambiguates `-flag`). This permits `src=my-file.jpg` without quoting. There are effectively two naked-token rules: one for names/positionals, one for values.

- **Long-form restricted to DSL-registry tags.** Long-form (`<name>...</name>`) is only valid for tags listed in the DSL registry. Non-registry named tags are always short-form: `<tag>` (no content) or `<tag | content>`. The parser checks the registry immediately after reading the tag name — if the name is not in the registry the long-form tokenizer calls `nok` and the flow hook falls through to the short-form named-tag tokenizer. This check is LL(1) at the tag-name level and has no rollback cost. Registered tags with `contentHandler: "default"` are long-form eligible; the "default" handler is a real registry entry, not a fallback for unregistered tags.

- **Multi-word positionals: space-separated.** Multiple naked tokens in the attribute section each become separate entries in the `positional` array. `<cite jones2001 smith2022>` → `positional: ["jones2001", "smith2022"]`. This is consistent with how positional arguments work in shell commands and LaTeX. It also makes the qualifying-tag pattern natural: `<table csv | ...>` has `csv` as the second positional.

- **Positional tokens and id/keyword values use the permissive `identifier` rule.** Once a positional is detected (i.e., the token does not start with `#`, `.`, `+`, `-`, or `[`, and is not followed by `=`), reading continues until a structural delimiter (whitespace, `|`, `>`, `<`, `[`, `]`, `,`, `"`, `'`). The same character class applies to id values (after `#`) and unquoted keyword values (after `=`). This allows file paths (`puppy.jpg`), URLs with query strings (`https://example.com?q=value`), hyphenated identifiers (`my-file.jpg`), colon-prefixed ids (`fig:body-cross-section`), and numbers without quoting. The asymmetric `=` rule — excluded from `identifier_start`, allowed in `identifier_cont` — keeps keyword syntax (`key=value`) unambiguous while letting `=` appear freely inside identifier tokens. `src=my-photo.jpg` correctly parses as keyword `src` with value `my-photo.jpg`; `https://example.com?q=value` correctly parses as a single positional identifier.

- **`>` in content: rule B (tag-looking openers only).** The content scanner increments depth when it encounters `<` only if the immediately following character is an ASCII letter, a registered sigil character, or `/` (for `</closing>` tags). A `<` followed by anything else — space, digit, punctuation — is treated as literal and does **not** affect depth. This means `<figure | a < b>` works correctly (the `< ` does not increment depth, so the `>` closes the figure with content `a < b`). Bare `>` without a preceding tag-like `<` still closes the construct early — `<figure | 1 > 0>` gives content `1 ` — authors must use `&gt;` for literal `>` in prose.

- **Whitespace inside attribute brackets.** Allowed and ignored. Confirmed.

- **Attribute order.** Free, but if conflicting attributes are present (e.g., two `#id` attributes), the parser takes the last and may report a warning.

- **DSL registry persistence.** The registry is a parser configuration. New DSL tags can be registered at parse time. The default registry is listed above; users or downstream packages can extend it.

- **Tag name normalization.** The parser preserves case as written. Whether the interpreter normalizes is a downstream decision.

- **Content shape: homogeneous `Node[]` with text as a node type.** Named-tag content is always an array of child nodes, never a bare string. Plain text in content becomes `{ type: 'text', value: '...' }`. This matches mdast and hast conventions and means downstream consumers (interpreter, JATS exporter, any future plugin) treat content uniformly without type-checking. Through Slice 2 content is still an opaque string because no recursive parsing has happened yet; the homogeneous shape kicks in when recursive content parsing is implemented.

## Open questions

Remaining open questions flagged for resolution as implementation proceeds.

- **`|` in short-form content.** After the first `|` separator, subsequent `|` characters in content are treated as literal content (the "exactly one `|` per construct" rule). No escaping needed.

- **Named tag content: recursive parsing.** In Slice 2, named-tag content is an opaque string. Recursive parsing of content into child nodes (so `<figure | text with <em | emphasis>>` produces a nested AST) is deferred to a later slice.

- **Multi-line constructs.** Both named tags and sigil tags are currently single-line only (through Slice 4). Line endings fail the construct. Multi-line named tags are described in the spec (Example 7) but not yet implemented. Multi-line sigil tags are not yet in the spec. Both are deferred to a later slice. Until then, an unclosed sigil opener emits an `acadamarkTagError` node rather than falling through silently (see "What the parser produces" above).

- **Registered sigil characters in `identifier_start` position.** `$` and `` ` `` are registered sigil characters but are not currently excluded from `identifier_start` (the exclusion list covers `#` and `.` and `+`/`-` but not all registered sigils). This means `<figure $weird>` parses `$weird` as a positional. The behavior is consistent between spec and grammar; the design intent is unsettled. Revisit when identifier rules are next touched or when another sigil family is added.

- **No-`|` examples for `$` and `` ` `` sigils.** Examples 11–13 show only the `|` form for dollar and backtick sigils. The no-`|` form is supported and documented in prose; worked examples for it should be added to the Examples section when it is next touched.

## Coexistence with raw HTML

Acadamark's text-position (inline) tokenizers — for both named tags and sigil tags — run before remark-parse's built-in HTML inline tokenizer. This means `<tagname ...>` and `<$...$>`, `` <`...`> ``, `<#...#>` constructs appearing inside paragraphs are consumed by acadamark, not treated as raw HTML.

**What works:** Most common HTML inline tags happen to round-trip correctly. `<em | text>`, `<strong | text>`, `<a href="url" | link>` all parse correctly with acadamark syntax. For HTML-style `<a href="url">link</a>`, acadamark parses `<a href="url">` as an acadamark tag with no content (kwarg `href`, no `|`), and `link</a>` becomes trailing text including a raw closing tag. This is imperfect but usually harmless if authors use acadamark idioms.

**What doesn't work:**

- **Bare HTML boolean attributes.** `<input type="checkbox" disabled>` — acadamark parses `disabled` as a positional, not as a boolean attribute flag. Use `+disabled` for acadamark boolean flags instead.
- **Self-closing syntax.** `<br/>`, `<img src="x" />` — the trailing `/` is treated as part of the attr string, not as a self-closing marker. Self-closing tags have no equivalent in acadamark (use `<br>` or `<img src=x>`).
- **Closing tags as standalone constructs.** `</em>` starts with `</`. The acadamark tokenizer rejects this (requires an alpha char after `<`, not `/`), so the built-in HTML tokenizer handles it. This means closing tags are passed through as raw HTML, which can produce mismatched structure.

**Guidance for authors:** Use acadamark shorthand for semantic markup. For the rare case where you need to drop into raw HTML that acadamark can't express, a verbatim-passthrough escape mechanism (e.g., `<html-passthrough>...</html-passthrough>`) is planned but not yet specified. Deferred to a later phase.

## What this enables

With this specification settled, the next steps are well-defined:

1. **Implement the micromark extension** that recognizes the syntax above and produces the structured nodes described.
2. **Implement the remark plugin** that wraps the micromark extension and emits mdast nodes.
3. **Implement `acadamarkTagInterpret`**, a rehype plugin that consults a per-tag schema registry to turn generic `acadamarkTag` nodes into specific HTML.

The parser implementation has a clear target. The interpreter has a clear input shape. New tags are added by registering schemas, never by modifying the parser.
