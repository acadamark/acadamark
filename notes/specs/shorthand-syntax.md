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

**The parser knows nothing about meaning.** It recognizes the syntax of tags and produces uniform structured nodes. Whether `<cite @jones2001>` means "lookup citation" or "format a reference" is the interpreter's call, not the parser's. Adding a new tag never requires modifying the parser.

**Every `<` matches a `>`.** The matching `>` ends the construct. Block-level vs. inline tags differ only in whether their content spans multiple lines — there is one closing rule.

**Attributes and content are separated by `|`.** No `|` means no content. This makes the boundary explicit and removes any need for the parser to guess.

**Sigil tags use mirrored closers.** `<$...$>`, `<#...#>`, `` <`...`> `` etc. The mirroring resolves verbatim-content ambiguity for math, code, and headings.

**Named DSL tags use HTML long form.** `<csv>...</csv>`, `<theorem>...</theorem>`, `<matrix>...</matrix>`. This is just standard HTML, and it aligns with LaTeX's environment model.

## Parser architecture

The parser is implemented as a hybrid: a small **micromark extension** locates tag boundaries in the source stream, and a **Peggy grammar** parses the attribute string inside each tag.

The split is chosen for what we call the *freeze property*. micromark's tokenizer is a hand-written state machine — fast, but expensive to extend, and easy to break in subtle ways when modified. Peggy, by contrast, is a declarative PEG grammar where each rule is local and readable, and incremental additions are bounded in scope. By restricting micromark to the narrow job of "find where a tag starts and ends" — and pushing everything *inside* the tag (attribute strings, identifiers, ids, classes, keywords, positionals, flags) into the Peggy grammar — the part of the parser that is hard to change is also the part that should rarely need to change. Future grammar evolution lives in Peggy, where it is visible and bounded.

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
identifier_start ::= [^ \t\n<>|+\-#.@="'\[\],]
                     (* excludes structural delimiters AND syntactic prefixes
                        (+, -, #, ., @, =); these may appear mid-identifier only *)
identifier_cont  ::= [^ \t\n<>|"'\[\],]
                     (* excludes structural delimiters; `=` is allowed so that
                        URLs with query strings work as bare identifiers *)

attributes      ::= attribute (ws+ attribute)*
attribute       ::= positional | bracketed_list | flag | id | class | keyword | atref

positional      ::= identifier
bracketed_list  ::= "[" ws* list_item (ws* "," ws* list_item)* ws* "]"
list_item       ::= identifier | quoted_string
flag            ::= ("+" | "-") tag_name
id              ::= "#" identifier
atref           ::= "@" identifier
                    (* F1: @ in attribute position is a reference; grammar strips @,
                       stores the key in node.atRefs. Multiple atref attrs are
                       accumulated: <cite @a @b> → atRefs: ['a', 'b'] *)
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

An *identifier* uses a start-and-continue split: the first character must not be a syntactic prefix (`+`, `-`, `#`, `.`, `@`, `=`) or structural delimiter; subsequent characters may include those prefix characters as literal data, including `=`. This is encoded in two sub-rules (`identifier_start`, `identifier_cont`) that mirror the EBNF directly. Examples: `fig:body-cross-section` (starts with `f`; `:` and `-` are valid `identifier_cont` chars), `my-cool-id`, `v1.2.3`, `https://example.com`, `https://example.com?q=value` (`:`, `/`, `?`, `=` all valid `identifier_cont`). Whitespace and the structural delimiters (`<`, `>`, `|`, `"`, `'`, `[`, `]`, `,`) are never allowed in identifiers.

The asymmetric treatment of `=` is intentional: `=` excluded from `identifier_start` keeps keyword syntax (`key=value`) unambiguous — a `=` can never begin an identifier, so the first `=` after a tag-name token always signals a keyword. `=` allowed in `identifier_cont` lets URLs with query strings (`https://example.com?q=value`) appear as bare positionals or keyword values without quoting. Keyword parsing is unaffected because the attribute rule tries `Keyword` (`tag_name "=" value`) before `Positional`, and `tag_name` uses its own strict character class that stops at `=`.

The distinction matters for cross-references and ids: `<ref @fig:body-cross-section>` must produce `atRefs: ["fig:body-cross-section"]` with the `:` intact. Using `tag_name` for ref-key values would reject this. The start-and-continue split also makes disambiguation self-contained: `#elephant` is unambiguously an id form, `@fig:priority` is unambiguously an atref form (the `#` and `@` are syntactic prefixes, not identifier characters), while `section-one` is unambiguously a valid positional identifier.

### Sigils

A *sigil* is one or more occurrences of a registered sigil character. The current registered sigils are `#`, `$`, and `` ` ``. The set is extensible; new sigils are registered alongside their tag-name expansion.

Sigil tags and named tags are distinguished by their first non-`<` character: if it's a sigil character, it's a sigil tag; otherwise, it's a named tag.

### Attribute forms

| Form              | Example                       | Parsed as                                                  |
|-------------------|-------------------------------|------------------------------------------------------------|
| Positional        | `jones2001`                   | Append to `positional` array                               |
| Bracketed list    | `[@smith2017, @jones2023]`    | Append to `positional` array as a single list (@ preserved)|
| Boolean flag (true)  | `+wrap`                    | `booleans.wrap = true`                                     |
| Boolean flag (false) | `-preview`                 | `booleans.preview = false`                                 |
| Id                | `#elephant`                   | `id = "elephant"`                                          |
| AtRef             | `@fig:priority`               | Append `"fig:priority"` to `atRefs` array (@ stripped)     |
| Class             | `.numbered`                   | Append `"numbered"` to `classes` array                     |
| Keyword (unquoted)| `align=right`                 | `kwargs.align = "right"`                                   |
| Keyword (quoted)  | `caption="An elephant"`       | `kwargs.caption = "An elephant"`                           |

Attributes can appear in any order. Multiple positional, multiple flags, multiple classes are all allowed. Multiple `id` attributes or multiple of the same keyword is an error (parser may report or take last value, implementation choice).

### Identifiers

Identifiers are the values of `#id` attributes, `@ref` attributes, `key=value` keyword values (when unquoted), positional arguments, and bracketed list items. An identifier is a sequence of non-delimiter characters where the first character is not a syntactic prefix (`+`, `-`, `#`, `.`, `@`, `=`). Mid-identifier, prefix characters including `=` are allowed as literal data — so `fig:body-cross-section`, `my-cool-id`, `v1.2.3`, and `https://example.com?q=value` are all valid identifiers. Whitespace and the structural delimiters (`<`, `>`, `|`, `"`, `'`, `[`, `]`, `,`) are never allowed in identifiers; values containing those characters must be quoted.

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

- No `|` and no closing tag: the tag has no content. Example: `<cite @jones2001>`.
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

**Defensive error.** If the finder encounters a long-form opener but reaches end-of-document without finding a matching `</tagname>`, it emits `acadamarkTagError` rather than producing a partial node. The long-form error node retains the `acadamarkTag` fields populated from the opener (`tagname`, `form`, `content`, `kwargs`, etc.) and adds an `error` field — see the **Long-form error node** shape under "What the parser produces". This is a distinct shape from the sigil-opener error node (which is sparse, with `source` instead of `tagname`/`content`); the two error paths reach their failure points at different stages and carry different information.

## Sigil-tag and DSL-tag verbatim content

Two groups of sigil tags and the registered DSL tags treat their content as opaque text:

- The **math sigils** `<$ … $>` and `<$$ … $$>`.
- The **code sigils** `` <` … `> `` and `` <``` … ``` > ``.
- **Registered DSL tags** whose `contentHandler` is not `"default"` (e.g. `<csv>`, `<math>`, `<mermaid>`, `<library>`).

Inside opaque content:

- `<` and `>` are not special.
- `|` is not special.
- The closer is the only escape from opaque mode.
- Whitespace is preserved exactly.

This is what allows acadamark to embed CSV, TSV, LaTeX, code, mermaid, and other DSLs without any escaping mechanism.

**Hash sigils are not opaque.** The `<#`, `<##`, `<###` heading sigils carry prose-bearing content (`contentHandler: "default"`, `isOpaqueContent: false`). Their content is recursively parsed via the same path as named-tag default content, so markdown idioms and nested acadamark constructs inside a heading body are processed normally. `<# *bold* heading #>` has its emphasis parsed; the result is the same as if the body appeared in any other prose-bearing context. The mirrored closer (`#>` / `##>` / `###>`) ends the sigil at the source level; opacity is a separate property and hash sigils do not have it.

## DSL tag registry

The registry assigns a **content handler** to every named or sigil tag the parser knows about, and (for named tags only) declares **long-form eligibility**. The two roles cover different tag groups but share the same map.

- **Content handler (all entries).** The `contentHandler` field on the resulting node names which handler the interpreter should dispatch to. DSL-handler entries (like `csv → "csv"`, `math → "math"`) name a specific embedded-language handler. Structural entries (like `aside → "default"`, `blockquote → "default"`) use the `"default"` handler, meaning content is re-parsed through the regular remark pipeline by the recursive-content plugin. Sigil entries set the per-sigil handler — `$ → "math"`, `# → "default"`, `` ` `` → `"code"`, etc. — and from-markdown.js derives `isOpaqueContent` from the same value (`isOpaqueContent = contentHandler !== "default"`), so the registry is the single source of truth for sigil opacity as well.
- **Long-form eligibility (named-tag entries only).** Only named tags listed in the registry are recognized in long-form. The micromark boundary finder reads the tag name and calls `nok` immediately if the name is absent. This means the registry is the parser's mechanism for deciding which named tags can have multi-line block content. Sigil tags use mirrored closers, not `</tagname>` closers, and the long-form eligibility test does not apply to them.

Named tags not in the registry cannot appear in long-form. Short-form named tags not in the registry still receive a `contentHandler` value — `getContentHandler()` returns `"default"` as the fallback for unregistered tag names. Only long-form eligibility requires a registry entry.

Every long-form node carries a `contentHandler` string. There is no null/absent case.

Initial registry (interim hard-coded list; migrates to `packages/layer1-vocabulary/` when that package is set up). Sigil entries and long-form-tag entries live in the same map — sigils so their `contentHandler` (and hence `isOpaqueContent`) can be looked up by the same `getContentHandler()` path as named tags; long-form tags so long-form eligibility and content handling are decided together:

| Tag name    | `contentHandler` value | Content type                |
|-------------|------------------------|-----------------------------|
| `#`         | `"default"`            | Section heading (prose, recursively parsed) |
| `##`        | `"default"`            | Sub-section heading (prose, recursively parsed) |
| `###`       | `"default"`            | Sub-sub-section heading (prose, recursively parsed) |
| `$`         | `"math"`               | Inline math (opaque)        |
| `$$`        | `"math-display"`       | Display math (opaque)       |
| `` ` ``     | `"code"`               | Inline code (opaque)        |
| `` ``` ``   | `"code-block"`         | Code block (opaque)         |
| `csv`       | `"csv"`                | Comma-separated values      |
| `tsv`       | `"tsv"`                | Tab-separated values        |
| `math`      | `"math"`               | Math (default: TeX/KaTeX)   |
| `code`      | `"code"`               | Source code                 |
| `mermaid`   | `"mermaid"`            | Mermaid diagram source      |
| `abc`       | `"abc"`                | ABC music notation          |
| `theorem`   | `"theorem"`            | Theorem (LaTeX-like)        |
| `matrix`    | `"matrix"`             | Matrix                      |
| `cases`     | `"cases"`              | Piecewise function          |
| `align`     | `"align"`               | Aligned equations          |
| `eqnarray`  | `"eqnarray"`           | Equation array              |
| `aside`     | `"default"`           | Aside (prose, recursively parsed) |
| `blockquote`| `"default"`           | Blockquote                  |
| `note`      | `"default"`           | Note/footnote               |
| `table`     | `"table"`             | Table (dedicated handler)   |
| `ul`        | `"default"`           | Unordered list              |
| `ol`        | `"default"`           | Ordered list                |
| `li`        | `"default"`           | List item                   |
| `meta`      | `"default"`           | Document metadata container |
| `data`      | `"default"`           | Citation data container (prose, recursively parsed) |
| `library`   | `"library"`           | BibTeX/CSL-JSON source (opaque; citation-js parses) |

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
  isOpaqueContent: false       // false for prose-bearing tags; true for DSL/math/code
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
  isOpaqueContent: true,      // true for DSL/math/code; false for prose-bearing (default handler)
  content: "...",             // verbatim multi-line string until recursive-content plugin runs
  positional: [],
  booleans: {},
  kwargs: {},
  id: null,
  classes: [],
}
```

`contentHandler` names which handler the interpreter should dispatch to for this node's content. `"default"` is a real registry entry — it applies to registered structural long-form tags (like `aside` and `blockquote`) whose content is prose that should be re-parsed through the regular remark pipeline when recursive content parsing is implemented. DSL-handler entries like `"math"` or `"csv"` name a specific embedded-language handler. Tags not in the registry cannot appear in long-form at all — the long-form tokenizer rejects them at the tag-name level. The field is never absent on long-form nodes.

`isOpaqueContent` is set at parse time by `from-markdown.js`. Prose-bearing nodes (`contentHandler: "default"`) get `false`; their `content` starts as a string and becomes `Node[]` after the recursive-content plugin runs. DSL-handler nodes remain `isOpaqueContent: true` permanently.

**Error nodes.** Two distinct error-node shapes are produced, depending on which finder caught the malformed construct.

**Sigil-opener error node.** When the micromark finder recognizes a sigil opener (`<#`, `<$`, `` <` `` etc.) but reaches end-of-document without finding the mirrored closer, it commits the span (from the opener through to EOF) as a token and the Peggy parser fails on it. The result is an `acadamarkTagError` node rather than a silent fall-through to remark's tokenizer (which can produce runaway fenced-code-block parsing for backtick sigils). Parsing failed before any `acadamarkTag` fields were populated, so the shape is sparse:

```
{
  type: "acadamarkTagError",
  source: "<```",         // the raw fragment as extracted by the micromark finder
  error: "...",           // the Peggy parse-error message
  position: { ... }       // standard mdast position (added automatically)
}
```

Multi-line sigil tags themselves parse cleanly: a sigil opener with a matching closer is handled across line endings in both flow and text positions (`<# heading\n   spans lines #>`, `<$$\n...\n$$>`, etc.). The error token arises only when no closer is found at all — the sigil-side of the EOF-consumption behavior the long-form error below also exhibits. Localizing the error footprint so it covers only the unterminated opener (rather than swallowing everything from the opener to EOF) is a tracked gap against the core always-renders guarantee, filed in `BACKLOG-ROADMAP.md` as the blank-line-termination / EOF-consumption item (formerly DF-16, in the parser-bug cluster).

**Long-form error node.** When the micromark finder recognizes a long-form opener but reaches end-of-document without finding the matching `</tagname>` closer, the long-form node has already had its opener parsed (so its `acadamarkTag` fields are populated) before the missing closer is detected. The node's `type` is flipped from `acadamarkTag` to `acadamarkTagError` and an `error` field is added, but the rest of the node's fields are retained:

```
{
  type: "acadamarkTagError",
  form: "long",
  tagname: "csv",
  positional: [],
  booleans: {},
  kwargs: {},
  id: null,
  classes: [],
  content: "...",          // the verbatim content captured before EOF
  isOpaqueContent: true,   // or false, per the tag's content handler
  contentHandler: "csv",   // the resolved handler for the opener's tag name
  error: "long-form tag has no closing tag",
  position: { ... }
}
```

There is no `source` field on the long-form error node — the long-form path does not go through the catch block that sets it. Downstream consumers of either error type should branch on the presence of `form`/`tagname` (long-form) versus `source` (sigil-opener) when they need to read shape-specific fields.

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
<cite @jones2001>
```

```
{
  tagname: "cite",
  atRefs: ["jones2001"],
  positional: []
}
```

### Example 3: Bracketed list as atref keys

```
<cite [@smith2017, @jones2023]>
```

```
{
  tagname: "cite",
  atRefs: [],
  positional: [["@smith2017", "@jones2023"]]
}
```

Note: `@` is preserved in bracketed-list items — the grammar parses `[@smith2017, @jones2023]`
as a bracketed list (each item is a string including the `@`). It is stripped from
free-standing atref attributes only (`<cite @smith2017>` → `atRefs: ["smith2017"]`).
The cite resolver handles both forms.

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
  isOpaqueContent: false,
  contentHandler: "default",
  content: " Introduction "
}
```

(Note: hash sigils are prose-bearing — `contentHandler: "default"`, `isOpaqueContent: false`. Their content is recursively parsed. Math and code sigils are opaque — `contentHandler: "math"` / `"code"`, `isOpaqueContent: true`. The body between opener and mirrored closer is the raw content string; no `|` separator is used for sigil tags. See the Resolved Decisions section for the settled rule.)

### Example 10: Sigil tag with id

```
<# #intro | Introduction #>
```

```
{
  tagname: "#",
  id: "intro",
  isOpaqueContent: false,
  contentHandler: "default",
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
<cite [@perez1975, @Noori1992] +link +preview>
```

```
{
  tagname: "cite",
  atRefs: [],
  positional: [["@perez1975", "@Noori1992"]],
  booleans: { link: true, preview: true }
}
```

### Example 19: Reference with flags

```
<ref @fig:body-cross-section +link +preview +title>
```

```
{
  tagname: "ref",
  id: null,
  atRefs: ["fig:body-cross-section"],
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

- **Sigil tags without `|`: no attribute parsing; body type follows the sigil family.** When no `|` is present, the entire body between the opening sigil and the mirrored closer becomes the node's `content` and no attribute parsing occurs. Attributes on sigil tags always require `|`. Whether that body is opaque depends on the sigil family — math (`$`, `$$`) and code (`` ` ``, `` ``` ``) sigils carry opaque content (`isOpaqueContent: true`); hash sigils (`#`, `##`, `###`) carry prose-bearing content that is recursively parsed (`isOpaqueContent: false`). Examples: `<# Introduction #>` → `content: " Introduction "`, `isOpaqueContent: false`, content recursively parsed (no attributes). `<# #intro | Introduction #>` → `id: "intro"`, `content: " Introduction "`, same opacity rule. `<$ x + y $>` → `content: " x + y "`, `isOpaqueContent: true` (no attributes).

- **`-` allowed in keyword values (after `=`).** The naked token in keyword value position allows `-`. In positional or attribute-name position, `-` remains excluded (it disambiguates `-flag`). This permits `src=my-file.jpg` without quoting. There are effectively two naked-token rules: one for names/positionals, one for values.

- **Long-form restricted to DSL-registry tags.** Long-form (`<name>...</name>`) is only valid for tags listed in the DSL registry. Non-registry named tags are always short-form: `<tag>` (no content) or `<tag | content>`. The parser checks the registry immediately after reading the tag name — if the name is not in the registry the long-form tokenizer calls `nok` and the flow hook falls through to the short-form named-tag tokenizer. This check is LL(1) at the tag-name level and has no rollback cost. Registered tags with `contentHandler: "default"` are long-form eligible; the "default" handler is a real registry entry, not a fallback for unregistered tags.

- **Multi-word positionals: comma or space separated.** Multiple naked tokens in the attribute section each become separate entries in the `positional` array. Both spaces and commas (with optional surrounding whitespace) are valid separators. `<cite jones2001 smith2022>`, `<cite jones2001,smith2022>`, and `<cite jones2001, smith2022>` all produce `positional: ["jones2001", "smith2022"]`. Commas are never part of identifier values; they act purely as separators. The comma separator applies universally between all attribute types, not just positionals — `<fig #id, caption="...">` also works.

- **Positional tokens and id/keyword values use the permissive `identifier` rule.** Once a positional is detected (i.e., the token does not start with `#`, `.`, `+`, `-`, or `[`, and is not followed by `=`), reading continues until a structural delimiter (whitespace, `|`, `>`, `<`, `[`, `]`, `,`, `"`, `'`). The same character class applies to id values (after `#`) and unquoted keyword values (after `=`). This allows file paths (`puppy.jpg`), URLs with query strings (`https://example.com?q=value`), hyphenated identifiers (`my-file.jpg`), colon-prefixed ids (`fig:body-cross-section`), and numbers without quoting. The asymmetric `=` rule — excluded from `identifier_start`, allowed in `identifier_cont` — keeps keyword syntax (`key=value`) unambiguous while letting `=` appear freely inside identifier tokens. `src=my-photo.jpg` correctly parses as keyword `src` with value `my-photo.jpg`; `https://example.com?q=value` correctly parses as a single positional identifier.

- **`>` in content: rule B (tag-looking openers only).** The content scanner increments depth when it encounters `<` only if the immediately following character is an ASCII letter, a registered sigil character, or `/` (for `</closing>` tags). A `<` followed by anything else — space, digit, punctuation — is treated as literal and does **not** affect depth. This means `<figure | a < b>` works correctly (the `< ` does not increment depth, so the `>` closes the figure with content `a < b`). Bare `>` without a preceding tag-like `<` still closes the construct early — `<figure | 1 > 0>` gives content `1 ` — authors must use `&gt;` for literal `>` in prose.

- **Whitespace inside attribute brackets.** Allowed and ignored. Confirmed.

- **Attribute order.** Free, but if conflicting attributes are present (e.g., two `#id` attributes), the parser takes the last and may report a warning.

- **DSL registry persistence.** The registry is a parser configuration. New DSL tags can be registered at parse time. The default registry is listed above; users or downstream packages can extend it.

- **Tag name normalization.** The parser preserves case as written. Whether the interpreter normalizes is a downstream decision.

- **Content shape: homogeneous `Node[]` with text as a node type.** Named-tag content is always an array of child nodes after the recursive-content pass, never a bare string. Plain text in content becomes `{ type: 'text', value: '...' }`. This matches mdast and hast conventions and means downstream consumers (interpreter, JATS exporter, any future plugin) treat content uniformly without type-checking. (At the remark-acadamark parser layer, `content` is still a raw string; the homogeneous array shape is produced by the recursive-content plugin, which runs in the interpreter pipeline.)

- **`|` in short-form content: subsequent `|` characters are literal.** The "exactly one `|` per construct" rule means only the first `|` separates attributes from content. Any further `|` characters in the content section are stored as literal content; no escaping is needed. Example: `<aside | first | second>` produces `content: " first | second"`.

## Open questions

Remaining open questions flagged for resolution as implementation proceeds.

- **Registered sigil characters in `identifier_start` position.** `$` and `` ` `` are registered sigil characters but are not currently excluded from `identifier_start` (the exclusion list covers `#` and `.` and `+`/`-` but not all registered sigils). This means `<figure $weird>` parses `$weird` as a positional. The behavior is consistent between spec and grammar; the design intent is unsettled. Revisit when identifier rules are next touched or when another sigil family is added.

- **No-`|` examples for `$` and `` ` `` sigils.** Examples 11–13 show only the `|` form for dollar and backtick sigils. The no-`|` form is supported and documented in prose; worked examples for it should be added to the Examples section when it is next touched.

(The earlier open question about `|` in short-form content — *"after the first `|` separator, subsequent `|` characters in content are treated as literal content"* — is settled and now appears as a Resolved Decision above.)

## Inline TeX shortcuts: `^{...}` and `_{...}`

Two short-form constructs sit alongside the tag shorthand, both for the common case of superscript and subscript in academic prose:

- `^{X}` is a superscript: `1^{st}`, `x^{2}`, `^{12}C`. The parser produces a `<sup>` element containing the brace contents (recursively parsed).
- `_{X}` is a subscript: `H_{2}O`, `x_{i}`. The parser produces a `<sub>` element containing the brace contents (recursively parsed).

**Braced form only.** Bare `^` or `_` not immediately followed by `{` is **ordinary literal text** — not a parse error. `snake_case`, `a^b`, URLs containing `^` or `_`, and similar everyday cases pass through untouched. Only `^{` and `_{` trigger a shortcut. This rule is the difference between a useful shortcut and an authoring hazard.

**Edge cases.** `^{}` (empty braces) and `^{abc` (unmatched opener with no closer) are parse errors — the syntax is well-defined only when the braces are matched and non-empty.

**Escapes.** `\^` and `\_` produce literal `^` and `_` (suppressing the shortcut even before a `{`); `\{` and `\}` produce literal braces. The four characters are in the acadamark-consumed escape class (see `escape-rules-spec.md`).

**Two surfaces.** The shortcuts work both inside named-tag content (the Peggy grammar handles them as `SuperscriptShortcut` / `SubscriptShortcut`) and in top-level prose (a dedicated micromark tokenizer recognizes them). The two-surface design is the reason the same shortcut works whether the author writes `<aside | H_{2}O>` or `H_{2}O` in a bare paragraph.

## Coexistence with raw HTML

Acadamark's text-position (inline) tokenizers — for both named tags and sigil tags — run before remark-parse's built-in HTML inline tokenizer. This means `<tagname ...>` and `<$...$>`, `` <`...`> ``, `<#...#>` constructs appearing inside paragraphs are consumed by acadamark, not treated as raw HTML.

**What works:** Most common HTML inline tags happen to round-trip correctly. `<em | text>`, `<strong | text>`, `<a href="url" | link>` all parse correctly with acadamark syntax. For HTML-style `<a href="url">link</a>`, acadamark parses `<a href="url">` as an acadamark tag with no content (kwarg `href`, no `|`), and `link</a>` becomes trailing text including a raw closing tag. This is imperfect but usually harmless if authors use acadamark idioms.

**What doesn't work:**

- **Bare HTML boolean attributes.** `<input type="checkbox" disabled>` — acadamark parses `disabled` as a positional, not as a boolean attribute flag. Use `+disabled` for acadamark boolean flags instead.
- **Self-closing syntax.** `<br />`, `<img src="x" />` — the trailing `/>` is recognized as a self-closing marker. The parser emits a `selfClosing: true` flag on the AST node. The content field is `null`; no pipe content is allowed in self-closing form. Self-closing is valid for any named tag. Example: `<library src="refs.bib" />` → `{ tagname: 'library', selfClosing: true, kwargs: { src: 'refs.bib' } }`. The slash must be the last character before `>` with no pipe. Technically, `<br/>` (no space before `/`) is also valid. The lookahead that recognizes self-closing is precise: a bare `/` positional is still accepted when it is not in the `/ >` position — e.g., `<tag /path>` parses `positional: ['/path']` without `selfClosing: true`.
- **Closing tags as standalone constructs.** `</em>` starts with `</`. The acadamark tokenizer rejects this (requires an alpha char after `<`, not `/`), so the built-in HTML tokenizer handles it. This means closing tags are passed through as raw HTML, which can produce mismatched structure.

**Guidance for authors:** Use acadamark shorthand for semantic markup. A
verbatim-passthrough mechanism (`<html-passthrough>...</html-passthrough>`)
for the rare case where authors need to drop into raw HTML that acadamark
cannot express is open design work in the backlog.

## What this enables

The parser has a clear target: a micromark extension recognizes the syntax above and produces the structured nodes described; a remark plugin wraps it and emits mdast nodes. The interpreter consumes those nodes against a per-tag vocabulary schema, turning generic `acadamarkTag` nodes into specific HTML. New tags are added by registering vocabulary entries, never by modifying the parser.
