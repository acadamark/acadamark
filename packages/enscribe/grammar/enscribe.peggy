// Enscribe shorthand grammar
//
// Input: the full raw source of one enscribe construct, e.g. `<cite jones2001>`
// or `<# Introduction #>`. Produced by the micromark boundary finder.
//
// Output: an enscribeTag node object (type, tagname, positional, booleans,
// kwargs, id, classes, content, isOpaqueContent).
//
// This grammar handles all attribute forms and both sigil and named tags.
// Long-form DSL tags (<csv>...</csv>) are added in Slice 4.
//
// Slice 3: all attribute parsing is handled by Peggy rules (Attributes,
// Attribute, Id, Class, BoolTrue, BoolFalse, Keyword, BracketedList,
// Positional). The JS parseAttributes() helper has been removed.
//
// Slice 3.5: dollar ($, $$) and backtick (`, ```) sigil families added.
// ContentChar updated to include $ and ` so that nested sigil tags inside
// named-tag content are depth-tracked correctly (rule B).
//
// Multi-line: ContentItem and ContentChar allow \n (prose content spans lines).
// SigilBody* rules use ("\n" / "\r" / .) to match newlines in opaque content.
// Note: [\s\S] in Peggy compiles to /^[sS]/ (literal s/S only), not any-char.
// EscapedListItemChar allows \n between list items. _ whitespace rule includes \n.
//
// Escape rules: ContentItem replaces $ContentChar* for named-tag content;
// HashSigilBodyItem1/2/3 replace $SigilBody1/2/3 for hash sigil bodies.
// Dollar and backtick sigil bodies remain opaque (no escape processing).
// Inline math/code spans inside named-tag content are also opaque: ContentItem
// recognises $…$, $$…$$, `…`, ``…`` via OpaqueSpan and returns them verbatim,
// so LaTeX commands and Windows paths survive escape processing (see OpaqueSpan
// below).
// Escape rules per notes/escape-rules-spec.md:
//   - \< \| \\ → literal char (enscribe-significant in content positions)
//   - \X for other ASCII punct → pass-through (remark handles downstream)
//   - \X otherwise → enscribeParseError node
//   - \> inside named-tag content → trailing-backslash error (> terminates the
//     construct before escape processing; use &gt; for literal >)

{{
  // ─── Global initializer — runs once when the module is loaded ───────────

  function makeNode(tagname, extra) {
    return {
      type: 'enscribeTag',
      form: 'short',
      tagname,
      positional: [],
      booleans: {},
      kwargs: {},
      id: null,
      classes: [],
      atRefs: [],
      content: null,
      isOpaqueContent: false,
      selfClosing: false,
      ...extra,
    }
  }

  function emptyAttrs() {
    return { positional: [], booleans: {}, kwargs: {}, id: null, classes: [], atRefs: [] }
  }

  function applyAttributes(attrList) {
    const result = emptyAttrs()
    for (const attr of attrList) {
      if (attr.t === 'id')    result.id = attr.v
      if (attr.t === 'class') result.classes.push(attr.v)
      if (attr.t === 'bool')  result.booleans[attr.k] = attr.v
      if (attr.t === 'kwarg') result.kwargs[attr.k] = attr.v
      if (attr.t === 'pos')   result.positional.push(attr.v)
      if (attr.t === 'atref') result.atRefs.push(attr.v)
    }
    return result
  }

  // Collapse an array of content items (strings | enscribeParseError objects)
  // into the canonical content value:
  //   - No errors → join all strings into one string (backward-compatible)
  //   - Has errors → array with consecutive strings merged, errors in position
  function processContentItems(items) {
    const hasErrors = items.some(item => typeof item !== 'string')
    if (!hasErrors) return items.join('')
    const result = []
    let text = ''
    for (const item of items) {
      if (typeof item === 'string') {
        text += item
      } else {
        if (text) { result.push(text); text = '' }
        result.push(item)
      }
    }
    if (text) result.push(text)
    return result
  }
}}

// ─── Top-level rule ────────────────────────────────────────────────────────

EnscribeConstruct
  = SigilTag3 / SigilTag2 / SigilTag1
  / SigilTagDollar2 / SigilTagDollar1
  / SigilTagBt3 / SigilTagBt1
  / SelfClosingNamedTag / NamedTag

// ─── Sigil tags ────────────────────────────────────────────────────────────
//
// Each sigil level is a separate rule (longest first, so ### is tried before
// ## and ## before #). Two alternatives per level:
//   1. With `|` — Attributes rule parses attrs, then content follows
//   2. Without `|` — entire body is prose content, no attribute parsing
//
// Hash sigil bodies are prose (escape rules apply): HashSigilBodyItem1/2/3.
// Dollar and backtick sigil bodies are opaque (no escape processing).

// Hash sigils carry heading prose — recursively parsed, not opaque
// (contentHandler: 'default', isOpaqueContent: false). makeNode's default
// for isOpaqueContent is false; the rules below let that default stand
// rather than overriding it to true.

SigilTag3
  = "<" "###" attrs:Attributes "|" content:HashSigilBodyItem3* "###>" {
      const node = makeNode("###")
      Object.assign(node, attrs)
      node.content = processContentItems(content)
      return node
    }
  / "<" "###" content:HashSigilBodyItem3* "###>" {
      return makeNode("###", { content: processContentItems(content) })
    }

SigilTag2
  = "<" "##" attrs:Attributes "|" content:HashSigilBodyItem2* "##>" {
      const node = makeNode("##")
      Object.assign(node, attrs)
      node.content = processContentItems(content)
      return node
    }
  / "<" "##" content:HashSigilBodyItem2* "##>" {
      return makeNode("##", { content: processContentItems(content) })
    }

SigilTag1
  = "<" "#" attrs:Attributes "|" content:HashSigilBodyItem1* "#>" {
      const node = makeNode("#")
      Object.assign(node, attrs)
      node.content = processContentItems(content)
      return node
    }
  / "<" "#" content:HashSigilBodyItem1* "#>" {
      return makeNode("#", { content: processContentItems(content) })
    }

// ─── Hash sigil body items: prose with escape processing ──────────────────
//
// These replace the old $SigilBody1/2/3 verbatim rules.
//
// Structure: outer !("X>") fires before any character consumption, stopping
// the * loop at the mirrored closer. HashSigilBodyChar* rules apply escape
// processing. The pass-through rule uses !("X>") after \\ to prevent consuming
// the sigil character when it immediately precedes the closer (e.g., \#> in a
// <# ... #> tag would otherwise consume # as pass-through, breaking the closer).
//
// Enscribe-significant escapes: \< \| \\
// Pass-through: \X for other ASCII punctuation (CommonMark range), except when
//   X starts the mirrored closer (e.g., \#> in SigilBodyChar1)
// Error: \X for non-ASCII-punctuation characters
// Trailing \: error (\ before the closer, consumed alone)
//
// ASCII punctuation (incl. >) = [!-/:-@\[\\\]^_`{-~]
// (> = 62 is in the :-@ range = 58-64 and is allowed in sigil bodies since
//  > alone does not close a hash sigil tag — only #>, ##>, ###> does)

HashSigilBodyItem1
  = !("#>") item:HashSigilBodyChar1  { return item }

HashSigilBodyChar1
  = "\\" c:[<|\\^_{}]                       { return c }
  / "\\" !("#>") c:[!-/:-@\[\\\]`|~]       { return "\\" + c }
  / "\\" !("#>") c:[^\n]                    { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" + c } }
  / "\\"                                    { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" } }
  / [^\\]                                   { return text() }

HashSigilBodyItem2
  = !("##>") item:HashSigilBodyChar2  { return item }

HashSigilBodyChar2
  = "\\" c:[<|\\^_{}]                        { return c }
  / "\\" !("##>") c:[!-/:-@\[\\\]`|~]       { return "\\" + c }
  / "\\" !("##>") c:[^\n]                    { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" + c } }
  / "\\"                                     { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" } }
  / [^\\]                                    { return text() }

HashSigilBodyItem3
  = !("###>") item:HashSigilBodyChar3  { return item }

HashSigilBodyChar3
  = "\\" c:[<|\\^_{}]                         { return c }
  / "\\" !("###>") c:[!-/:-@\[\\\]`|~]       { return "\\" + c }
  / "\\" !("###>") c:[^\n]                    { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" + c } }
  / "\\"                                      { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" } }
  / [^\\]                                     { return text() }

// ─── Dollar sigil tags ─────────────────────────────────────────────────────
// Opaque content — no escape processing.

SigilTagDollar2
  = "<" "$$" attrs:Attributes "|" content:$SigilBodyDollar2 "$$>" {
      const node = makeNode("$$", { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" "$$" content:$SigilBodyDollar2 "$$>" {
      return makeNode("$$", { isOpaqueContent: true, content })
    }

SigilTagDollar1
  = "<" "$" attrs:Attributes "|" content:$SigilBodyDollar1 "$>" {
      const node = makeNode("$", { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" "$" content:$SigilBodyDollar1 "$>" {
      return makeNode("$", { isOpaqueContent: true, content })
    }

// . matches any char except newlines; "\n"/"\r" covers line endings.
SigilBodyDollar2 = (!("$$>") ("\n" / "\r" / .))*
SigilBodyDollar1 = (!("$>") ("\n" / "\r" / .))*

// ─── Backtick sigil tags ────────────────────────────────────────────────────
// Opaque content — no escape processing.

SigilTagBt3
  = "<" "```" attrs:Attributes "|" content:$SigilBodyBt3 "```>" {
      const node = makeNode("```", { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" "```" content:$SigilBodyBt3 "```>" {
      return makeNode("```", { isOpaqueContent: true, content })
    }

SigilTagBt1
  = "<" "`" attrs:Attributes "|" content:$SigilBodyBt1 "`>" {
      const node = makeNode("`", { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" "`" content:$SigilBodyBt1 "`>" {
      return makeNode("`", { isOpaqueContent: true, content })
    }

SigilBodyBt3 = (!("```>") ("\n" / "\r" / .))*
SigilBodyBt1 = (!"`>" ("\n" / "\r" / .))*

// ─── Named tags ────────────────────────────────────────────────────────────
//
// Short form only (long-form DSL tags added in Slice 4).
// Two variants: with content (after `|`) and without.
// Rule B depth tracking is implemented via recursive ContentChar (for the
// nested-construct alternative in ContentItem).

SelfClosingNamedTag
  = "<" name:TagName attrs:Attributes "/" ">" {
      const node = makeNode(name, { selfClosing: true })
      Object.assign(node, attrs)
      return node
    }

NamedTag
  = "<" name:TagName attrs:Attributes "|" content:ContentItem* ">" {
      const node = makeNode(name, { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = processContentItems(content)
      return node
    }
  / "<" name:TagName attrs:Attributes ">" {
      const node = makeNode(name)
      Object.assign(node, attrs)
      return node
    }

TagName = $([a-zA-Z][a-zA-Z0-9_-]*)

// ─── Content items: prose with escape processing ───────────────────────────
//
// ContentItem replaces $ContentChar* for named-tag content.
//
// Enscribe-significant escapes (consumed, emit literal char): \< \| \\
// Pass-through (emit \X for remark to process): \X for ASCII punct except >
//   > is excluded because the finder closes named-tag content at any > at
//   depth 0; > can never be safely escaped inside named-tag content.
//   Use &gt; for a literal > inside named-tag content.
// Error: \X for non-ASCII-punctuation, or trailing \ before >
//
// ASCII punct excluding > = [!-/:-=?@\[\\\]^_`{-~]
//   !-/  = 33-47  (includes < = 60... wait, < is 60 which is NOT in 33-47)
//   Actually: !-/ = 33-47, :-= = 58-61, ?@ = 63-64, [\] = 91-93, ^_` = 94-96, {-~ = 123-126
//   This excludes > (62) which falls between = (61) and ? (63).
//
// Nested construct alternative: raw text of <tagname...> for depth tracking.
// Regular char: any char except >, \, newline.

ContentItem
  = "\\" c:[<|\\^_{}]                  { return c }
  / "\\" c:[!-/:-=?@\[\\\]`|~]        { return "\\" + c }
  / "\\" c:[^\n>]                      { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" + c } }
  / "\\"                               { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" } }
  / SuperscriptShortcut
  / SubscriptShortcut
  / $("<" [a-zA-Z#$`/] ContentChar* ">")
  / OpaqueSpan
  / $[^>\\]

// ContentChar: depth tracking for nested constructs (unchanged from Slice 3.5).
// Used only by ContentItem's nested-construct alternative; not escape-aware
// since nested content is opaque at this stage.

ContentChar
  = "<" [a-zA-Z#$`/] ContentChar* ">"
  / [^>]

// ─── Opaque inline spans: math and code spans in named-tag content ─────────
//
// Inline/display math ($…$, $$…$$) and code spans (`…`, ``…``) embed notation
// that carries its own backslash conventions: LaTeX commands (\in, \mathbb{R},
// \sqrt) and filesystem paths (C:\new\folder). Inside named-tag prose content
// these spans are OPAQUE — their interior is returned verbatim via text(), so
// the grammar's escape processing is skipped and backslash sequences survive.
// remark-math / CommonMark make the final rendering decision downstream on the
// intact string. This mirrors the always-opaque sigil forms (<$…$>, <`…`>) and
// the block form, and fulfils escape-rules-spec's promise (see "Unknown escape
// (in named-tag content)") that `C:\new\folder` inside a code span is opaque.
//
// Correctness invariant: OpaqueSpan returns the matched span EXACTLY. For a
// span containing no backslash, the emitted string is byte-identical to what
// the old per-character rules produced — existing output is unchanged. The only
// behavioural change is for spans that DO contain a backslash: those are now
// preserved verbatim instead of producing enscribeParseError nodes. The
// backslash escape alternatives sit FIRST in ContentItem, so an escaped
// delimiter (\$ or \`) is consumed as a markdown pass-through before any span
// can open — a literal dollar or backtick is still authorable.
//
// Longest delimiter first ($$ before $, `` before `). Content class [^>] allows
// { } (needed for \mathbb{Y}) and newlines, but stops at > so a span can never
// swallow the named-tag closer (consistent with ContentItem's $[^>\\] rule). A
// delimiter with no matching closer before > fails this rule and the opening
// character falls through to the regular-character rule (e.g. a lone currency $
// stays literal). NOT applied to BraceContentItem (^{…}/_{…}): its } closer is
// ambiguous with math braces (\mathbb{Y}); super/subscript math is a deliberate,
// documented exclusion. NOT applied to hash sigil bodies (HashSigilBodyChar*):
// headings share the same latent gap but need a different content class (> is
// legal content there) — deferred, see GitHub Issues.

OpaqueSpan
  = $("$$" (!"$$" [^>])* "$$")     // display math  $$…$$
  / $("$"  (!"$"  [^>])* "$")      // inline math   $…$
  / $("``" (!"``" [^>])* "``")     // code span     ``…``
  / $("`"  (!"`"  [^>])* "`")      // code span     `…`

// ─── Inline shortcut rules: ^{...} → <sup>, _{...} → <sub> ───────────────
//
// Braced form only. Bare ^ and _ (without following {) fall through to the
// regular-character rule in ContentItem and are treated as literal text.
//
// contentHandler: 'default' is set explicitly because makeNode() does not set
// it, and remarkRecursiveContent skips nodes where contentHandler !== 'default'.
//
// BraceContentItem stops at } (the brace closer) and > (the named-tag closer).
// Recursion inside BraceContentItem handles nested ^{}/_{} constructs.
//
// Error cases:
//   ^{} / _{} (empty braces)       → enscribeParseError (empty-shortcut)
//   ^{abc / _{abc (unterminated)   → enscribeParseError (unterminated-shortcut)

SuperscriptShortcut
  = "^" "{" content:BraceContentItem+ "}" {
      return {
        type: 'enscribeTag', form: 'shortcut', tagname: 'sup',
        contentHandler: 'default',
        content: processContentItems(content),
        isOpaqueContent: false,
        positional: [], booleans: {}, kwargs: {}, id: null, classes: [], atRefs: [],
        selfClosing: false,
      }
    }
  / "^" "{" "}" { return { type: 'enscribeParseError', subtype: 'empty-shortcut', source: text() } }
  / "^" "{" BraceContentItem* { return { type: 'enscribeParseError', subtype: 'unterminated-shortcut', source: text() } }

SubscriptShortcut
  = "_" "{" content:BraceContentItem+ "}" {
      return {
        type: 'enscribeTag', form: 'shortcut', tagname: 'sub',
        contentHandler: 'default',
        content: processContentItems(content),
        isOpaqueContent: false,
        positional: [], booleans: {}, kwargs: {}, id: null, classes: [], atRefs: [],
        selfClosing: false,
      }
    }
  / "_" "{" "}" { return { type: 'enscribeParseError', subtype: 'empty-shortcut', source: text() } }
  / "_" "{" BraceContentItem* { return { type: 'enscribeParseError', subtype: 'unterminated-shortcut', source: text() } }

// BraceContentItem: content rule for the interior of ^{...} and _{...}.
//
// Mirrors ContentItem's escape structure but stops at } (brace closer) and
// > (named-tag closer) rather than at > alone. Recursive: calls
// SuperscriptShortcut / SubscriptShortcut for nested shortcuts.

BraceContentItem
  = "\\" c:[<|\\^_{}]                  { return c }
  / "\\" c:[!-/:-=?@\[\\\]`|~]        { return "\\" + c }
  / "\\" c:[^\n>}]                     { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" + c } }
  / "\\"                               { return { type: 'enscribeParseError', subtype: 'unknown-escape-sequence', source: "\\" } }
  / SuperscriptShortcut
  / SubscriptShortcut
  / $("<" [a-zA-Z#$`/] ContentChar* ">")
  / $[^>}\\]

// ─── Attribute rules ────────────────────────────────────────────────────────
//
// Attributes returns an object with positional, booleans, kwargs, id, classes
// ready for Object.assign() into the node. The empty alternative (whitespace
// only, or no attrs at all) returns the same shape with default values.
//
// Attributes stops naturally at `|` or `>` because those characters are
// excluded from all identifier and tag-name character classes.

Attributes
  = _ head:Attribute tail:(_ ","? _ Attribute)* _ {
      return applyAttributes([head, ...tail.map(([, , , a]) => a)])
    }
  / _ { return emptyAttrs() }

Attribute
  = Id
  / Class
  / BoolTrue
  / BoolFalse
  / Keyword
  / BracketedList
  / AtRef
  / Positional

Id        = "#" v:Identifier      { return { t: 'id', v } }
AtRef     = "@" v:Identifier      { return { t: 'atref', v } }
Class     = "." v:TagName         { return { t: 'class', v } }
BoolTrue  = "+" k:TagName         { return { t: 'bool', k, v: true } }
BoolFalse = "-" k:TagName         { return { t: 'bool', k, v: false } }
Keyword   = k:TagName "=" v:Value { return { t: 'kwarg', k, v } }

BracketedList
  = "[" _ items:ListItems _ "]"   { return { t: 'pos', v: items } }

Positional
  = !("/" [ \t]* ">") v:Identifier { return { t: 'pos', v } }

ListItems
  = head:ListItem tail:(_ "," _ ListItem)* {
      return [head, ...tail.map(([, , , item]) => item)]
    }

// ListItem uses EscapedListItem instead of bare Identifier so that \, inside
// a bracketed list produces a literal comma rather than acting as a separator.
// Example: [smith2024\, jones2024] → one item "smith2024, jones2024".
// EscapedListItem is more permissive than Identifier (allows spaces mid-value
// after an escaped comma) but is confined to the bracketed-list context.

ListItem = QuotedStringValue / EscapedListItem

// EscapedListItem: any chars except unescaped , ] [ and newline.
// \, → literal comma (prevents acting as list separator).
// All other chars (including spaces) are taken literally.

EscapedListItem = chars:EscapedListItemChar+  { return chars.join('') }

EscapedListItemChar
  = "\\" c:[,]  { return c }
  / [^,\[\]]    { return text() }

Value = QuotedStringValue / Identifier

// ─── Shared terminals ──────────────────────────────────────────────────────

QuotedStringValue
  = '"' v:$([^"\n]*) '"' { return v }
  / "'" v:$([^'\n]*) "'" { return v }

// ─── Identifier ────────────────────────────────────────────────────────────
//
// Two-rule split mirrors the spec EBNF exactly.
// IdentifierStart excludes structural delimiters AND syntactic prefixes
//   (+, -, #, ., =) so those characters cannot begin an identifier.
// IdentifierCont excludes structural delimiters but NOT `=`, which allows
//   URLs with query strings (e.g. "https://example.com?q=value") to appear
//   as bare positionals or keyword values without quoting. Keyword parsing is
//   unaffected: the Attribute rule tries Keyword (k:TagName "=" v:Value) before
//   Positional, and TagName uses its own strict char class that stops at `=`.

Identifier = $(IdentifierStart IdentifierCont*)

IdentifierStart
  = [^ \t\n<>|+\-#.="'\[\],]

IdentifierCont
  = [^ \t\n<>|"'\[\],]

// ─── Whitespace ────────────────────────────────────────────────────────────

_ = [ \t\n\r]*
