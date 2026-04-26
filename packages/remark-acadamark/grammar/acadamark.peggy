// Acadamark shorthand grammar
//
// Input: the full raw source of one acadamark construct, e.g. `<cite jones2001>`
// or `<# Introduction #>`. Produced by the micromark boundary finder.
//
// Output: an acadamarkTag node object (type, tagname, positional, booleans,
// kwargs, id, classes, content, isOpaqueContent).
//
// This grammar handles all attribute forms and both sigil and named tags.
// Long-form DSL tags (<csv>...</csv>) are added in Slice 4.
//
// Slice 3: all attribute parsing is handled by Peggy rules (Attributes,
// Attribute, Id, Class, BoolTrue, BoolFalse, Keyword, BracketedList,
// Positional). The JS parseAttributes() helper has been removed.

{{
  // ─── Global initializer — runs once when the module is loaded ───────────

  function makeNode(tagname, extra) {
    return {
      type: 'acadamarkTag',
      tagname,
      positional: [],
      booleans: {},
      kwargs: {},
      id: null,
      classes: [],
      content: null,
      isOpaqueContent: false,
      ...extra,
    }
  }

  function emptyAttrs() {
    return { positional: [], booleans: {}, kwargs: {}, id: null, classes: [] }
  }

  function applyAttributes(attrList) {
    const result = emptyAttrs()
    for (const attr of attrList) {
      if (attr.t === 'id')    result.id = attr.v
      if (attr.t === 'class') result.classes.push(attr.v)
      if (attr.t === 'bool')  result.booleans[attr.k] = attr.v
      if (attr.t === 'kwarg') result.kwargs[attr.k] = attr.v
      if (attr.t === 'pos')   result.positional.push(attr.v)
    }
    return result
  }
}}

// ─── Top-level rule ────────────────────────────────────────────────────────

AcadamarkConstruct
  = SigilTag3 / SigilTag2 / SigilTag1 / NamedTag

// ─── Sigil tags ────────────────────────────────────────────────────────────
//
// Each sigil level is a separate rule (longest first, so ### is tried before
// ## and ## before #). Two alternatives per level:
//   1. With `|` — Attributes rule parses attrs, then content follows
//   2. Without `|` — entire body is opaque content, no attribute parsing
//
// Attributes stops naturally before `|` or the mirrored closer because `|`
// and `#` (start of closer) are excluded from all identifier character classes.

SigilTag3
  = "<" "###" attrs:Attributes "|" content:$SigilBody3 "###>" {
      const node = makeNode("###", { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" "###" content:$SigilBody3 "###>" {
      return makeNode("###", { isOpaqueContent: true, content })
    }

SigilTag2
  = "<" "##" attrs:Attributes "|" content:$SigilBody2 "##>" {
      const node = makeNode("##", { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" "##" content:$SigilBody2 "##>" {
      return makeNode("##", { isOpaqueContent: true, content })
    }

SigilTag1
  = "<" "#" attrs:Attributes "|" content:$SigilBody1 "#>" {
      const node = makeNode("#", { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" "#" content:$SigilBody1 "#>" {
      return makeNode("#", { isOpaqueContent: true, content })
    }

// Body content for sigil tags: everything up to (but not including) the closer.
// The negative lookahead is the exact mirrored closer so single-# content is
// allowed inside a ##-tag, and ## content is allowed inside a ###-tag.

SigilBody3 = (!("###>") .)*
SigilBody2 = (!("##>") .)*
SigilBody1 = (!("#>") .)*

// ─── Named tags ────────────────────────────────────────────────────────────
//
// Short form only (long-form DSL tags added in Slice 4).
// Two variants: with content (after `|`) and without.
// Rule B depth tracking is implemented via recursive ContentChar.

NamedTag
  = "<" name:TagName attrs:Attributes "|" content:$ContentChar* ">" {
      const node = makeNode(name, { isOpaqueContent: true })
      Object.assign(node, attrs)
      node.content = content
      return node
    }
  / "<" name:TagName attrs:Attributes ">" {
      const node = makeNode(name)
      Object.assign(node, attrs)
      return node
    }

TagName = $([a-zA-Z][a-zA-Z0-9_-]*)

// Content section: rule B depth tracking via ordered alternatives.
// First alternative: a tag-like `<` (followed by alpha, `#`, or `/`) — recurse.
// Second alternative: any character except `>` and newline — consume as literal.
// A bare `<` (not followed by tag-start chars) matches the second alt as literal.

ContentChar
  = "<" [a-zA-Z#/] ContentChar* ">"
  / [^>\n]

// ─── Attribute rules ────────────────────────────────────────────────────────
//
// Attributes returns an object with positional, booleans, kwargs, id, classes
// ready for Object.assign() into the node. The empty alternative (whitespace
// only, or no attrs at all) returns the same shape with default values.
//
// Attributes stops naturally at `|` or `>` because those characters are
// excluded from all identifier and tag-name character classes.

Attributes
  = _ head:Attribute tail:(_ Attribute)* _ {
      return applyAttributes([head, ...tail.map(([, a]) => a)])
    }
  / _ { return emptyAttrs() }

Attribute
  = Id
  / Class
  / BoolTrue
  / BoolFalse
  / Keyword
  / BracketedList
  / Positional

Id        = "#" v:Identifier      { return { t: 'id', v } }
Class     = "." v:TagName         { return { t: 'class', v } }
BoolTrue  = "+" k:TagName         { return { t: 'bool', k, v: true } }
BoolFalse = "-" k:TagName         { return { t: 'bool', k, v: false } }
Keyword   = k:TagName "=" v:Value { return { t: 'kwarg', k, v } }

BracketedList
  = "[" _ items:ListItems _ "]"   { return { t: 'pos', v: items } }

Positional
  = v:Identifier                  { return { t: 'pos', v } }

ListItems
  = head:ListItem tail:(_ "," _ ListItem)* {
      return [head, ...tail.map(([, , , item]) => item)]
    }

ListItem = QuotedStringValue / Identifier

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
// IdentifierCont excludes only structural delimiters, allowing prefix chars
//   as literal data mid-identifier (e.g. "fig:body-cross-section", "v1.2.3").

Identifier = $(IdentifierStart IdentifierCont*)

IdentifierStart
  = [^ \t\n<>|+\-#.="'\[\],]

IdentifierCont
  = [^ \t\n<>|="'\[\],]

// ─── Whitespace ────────────────────────────────────────────────────────────

_ = [ \t]*
