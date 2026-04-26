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
sigil           ::= "#"+ | "$"+ | "`"+ | (other registered sigils)

named_tag       ::= short_form | long_form
short_form      ::= "<" tag_name [ws+ attributes] ["|" content] ">"
long_form       ::= "<" tag_name [ws+ attributes] ">" content "</" tag_name ">"

tag_name        ::= [a-zA-Z] [a-zA-Z0-9_-]*

attributes      ::= attribute (ws+ attribute)*
attribute       ::= positional | bracketed_list | flag | id | class | keyword

positional      ::= naked_token
bracketed_list  ::= "[" ws* list_item (ws* "," ws* list_item)* ws* "]"
list_item       ::= naked_token | quoted_string
flag            ::= ("+" | "-") tag_name
id              ::= "#" tag_name
class           ::= "." tag_name
keyword         ::= tag_name "=" value
value           ::= naked_token | quoted_string

naked_token     ::= [^ \t\n<>|+\-#.="'\[\],]+
quoted_string   ::= '"' [^"]* '"' | "'" [^']* "'"

content         ::= (text | construct)*
                    (* content is parsed normally for non-DSL tags *)
                    (* content is opaque text for sigil tags and DSL tags *)

ws              ::= " " | "\t" | "\n"
```

This grammar is intentionally informal in places — the precise behavior of `naked_token`, content scanning, and DSL recognition is described in prose below where the formal grammar would be cumbersome.

## Lexical rules

### Tag names and sigils

A *tag name* starts with an ASCII letter and may contain letters, digits, underscores, and hyphens. Tag names are case-sensitive at the parser level (the interpreter may normalize).

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

### Naked tokens

A naked token is a sequence of characters not in the syntactic set. The syntactic set is: whitespace, `<`, `>`, `|`, `+`, `-`, `#`, `.`, `=`, `"`, `'`, `[`, `]`, `,`.

Naked tokens cover most positional and unquoted-keyword values. URLs, file names, words, numbers — all naked tokens. When a value needs to contain syntactic characters or whitespace, use quotes.

### Quoted strings

Either single (`'`) or double (`"`) quotes. The quote character cannot appear inside its own kind. There is no escape sequence at the parser level; if you need a literal quote inside a quoted value, switch to the other quote type.

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

### Long form

The construct ends at the matching `</tagname>`. The tag name in the closer must match the opener exactly. Long-form content can be:

- **Parsed** for normal tags. The content may contain nested constructs, markdown, prose. The parser recurses.
- **Opaque** for DSL tags (registered as verbatim). Content is a literal string from after the opening `>` to before `</tagname>`.

The DSL registry tells the parser which named tags have opaque content. A tag not in the registry has its content parsed.

## Sigil-tag and DSL-tag verbatim content

Both sigil tags and registered DSL tags treat their content as opaque text. Inside opaque content:

- `<` and `>` are not special.
- `|` is not special.
- The closer is the only escape from opaque mode.
- Whitespace is preserved exactly.

This is what allows acadamark to embed CSV, TSV, LaTeX, code, mermaid, and other DSLs without any escaping mechanism.

## DSL tag registry

The registry is a list of tag names whose content is opaque. The parser consults the registry when entering a tag's content.

Initial registry (subject to extension):

| Tag name    | Content type                |
|-------------|-----------------------------|
| `csv`       | Comma-separated values      |
| `tsv`       | Tab-separated values        |
| `math`      | Math (default: TeX)         |
| `code`      | Source code                 |
| `mermaid`   | Mermaid diagram source      |
| `abc`       | ABC music notation          |
| `theorem`   | Theorem (LaTeX-like)        |
| `matrix`    | Matrix                      |
| `cases`     | Piecewise function          |
| `align`     | Aligned equations           |
| `eqnarray`  | Equation array              |

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
  tagname: "figure",
  positional: ["csv"],         // array of strings or arrays
  booleans: { wrap: true },    // map of name → true/false
  kwargs: { align: "right" },  // map of name → string
  id: "elephant",              // string or null
  classes: ["numbered"],       // array of strings
  content: <child nodes or opaque string>,
  isOpaqueContent: false       // true for sigil and DSL tags
}
```

For sigil tags, `tagname` is the sigil expansion (e.g., `<#` produces `tagname: "section-shorthand"` or similar — exact convention TBD by the parser implementation). The `positional`, `booleans`, etc. fields all behave the same way as for named tags.

For tags with opaque content, `content` is the raw string. For tags with parsed content, `content` is an array of child nodes (which may themselves be `acadamarkTag` nodes, or markdown nodes, or plain text).

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

(Note: in this case there is no `|`. For sigil tags, the convention is to allow the content to follow the sigil directly without `|`, treating the entire body between the opener and the mirrored closer as content. This is a small special case that simplifies the common heading/math/code idiom. See open question below.)

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

## Open questions

These are flagged for resolution as the implementation proceeds.

- **Sigil tags without `|`.** Examples 9 and 10 above use the convention that sigil tags can omit `|` and treat everything between the opener and closer as content (apart from attributes). Confirm this is the intended rule. The alternative (require `|` for content even in sigil tags) is more uniform but more verbose for the common heading/math/code case.

- **Sigil tag attributes.** When a sigil tag has attributes (`<# #intro | Introduction #>`), how are they distinguished from content? The proposed rule is: attributes appear after the sigil and before `|` (if `|` is present) or before whitespace and content begins (if no `|`). This needs clean specification when no `|` is used.

- **Whitespace inside attribute brackets.** Allowed and ignored. Confirmed.

- **Attribute order.** Free, but if conflicting attributes are present (e.g., two `#id` attributes), the parser takes the last and may report a warning.

- **DSL registry persistence.** The registry is a parser configuration. New DSL tags can be registered at parse time. The default registry is listed above; users or downstream packages can extend it.

- **Tag name normalization.** The parser preserves case as written. Whether the interpreter normalizes is a downstream decision.

## What this enables

With this specification settled, the next steps are well-defined:

1. **Implement the micromark extension** that recognizes the syntax above and produces the structured nodes described.
2. **Implement the remark plugin** that wraps the micromark extension and emits mdast nodes.
3. **Implement `acadamarkTagInterpret`**, a rehype plugin that consults a per-tag schema registry to turn generic `acadamarkTag` nodes into specific HTML.

The parser implementation has a clear target. The interpreter has a clear input shape. New tags are added by registering schemas, never by modifying the parser.
