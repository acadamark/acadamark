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
// Attribute parsing currently delegates to the JS parseAttributes() helper
// (in the global initializer below). Slice 3 replaces that helper with full
// Peggy attribute rules.

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

  // ─── Attribute parsing (JS helper — replaced by Peggy rules in Slice 3) ──

  function parseAttributes(node, str) {
    if (!str) return
    let i = 0
    const len = str.length

    while (i < len) {
      while (i < len && isWS(str[i])) i++
      if (i >= len) break
      const ch = str[i]

      if (ch === '#') {
        i++
        const start = i
        while (i < len && isAttrNameChar(str[i])) i++
        node.id = str.slice(start, i)
      } else if (ch === '.') {
        i++
        const start = i
        while (i < len && isAttrNameChar(str[i])) i++
        node.classes.push(str.slice(start, i))
      } else if (ch === '+' || ch === '-') {
        const isTrue = ch === '+'
        i++
        const start = i
        while (i < len && isAttrNameChar(str[i])) i++
        const name = str.slice(start, i)
        if (name) node.booleans[name] = isTrue
      } else if (ch === '[') {
        i++
        const items = []
        while (i < len && str[i] !== ']') {
          while (i < len && isWS(str[i])) i++
          if (str[i] === ']') break
          items.push(readValue(str, i, len, true))
          i += itemLen(str, i, len, true)
          while (i < len && isWS(str[i])) i++
          if (i < len && str[i] === ',') i++
        }
        if (i < len && str[i] === ']') i++
        node.positional.push(items)
      } else if (!isPosDelim(ch)) {
        const nameStart = i
        while (i < len && isAttrNameChar(str[i])) i++
        if (i < len && str[i] === '=') {
          const name = str.slice(nameStart, i)
          i++
          const value = readValue(str, i, len, false)
          i += valLen(str, i, len)
          if (name) node.kwargs[name] = value
        } else {
          while (i < len && !isPosDelim(str[i])) i++
          const token = str.slice(nameStart, i)
          if (token) node.positional.push(token)
        }
      } else {
        i++
      }
    }
  }

  function isWS(ch)         { return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' }
  function isAttrNameChar(ch) { return /[a-zA-Z0-9_-]/.test(ch) }
  function isPosDelim(ch)   {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' ||
           ch === '|' || ch === '>' || ch === '<' ||
           ch === '[' || ch === ']' || ch === ',' || ch === '"' || ch === "'"
  }

  function readValue(str, i, len, inBracket) {
    if (i >= len) return ''
    const ch = str[i]
    if (ch === '"' || ch === "'") {
      const q = ch; i++; let r = ''
      while (i < len && str[i] !== q) r += str[i++]
      return r
    }
    let r = ''
    while (i < len && !isValDelim(str[i], inBracket)) r += str[i++]
    return r
  }

  function valLen(str, i, len) {
    if (i >= len) return 0
    const ch = str[i]
    if (ch === '"' || ch === "'") {
      const q = ch; let j = i + 1
      while (j < len && str[j] !== q) j++
      return j - i + (j < len ? 1 : 0)
    }
    let j = i
    while (j < len && !isValDelim(str[j], false)) j++
    return j - i
  }

  function itemLen(str, i, len, inBracket) {
    if (i >= len) return 0
    const ch = str[i]
    if (ch === '"' || ch === "'") {
      const q = ch; let j = i + 1
      while (j < len && str[j] !== q) j++
      return j - i + (j < len ? 1 : 0)
    }
    let j = i
    while (j < len && !isValDelim(str[j], true)) j++
    return j - i
  }

  function isValDelim(ch, inBracket) {
    if (isWS(ch)) return true
    if (ch === '<' || ch === '>' || ch === '|' || ch === '=' || ch === '"' || ch === "'") return true
    if (inBracket && (ch === ']' || ch === ',')) return true
    return false
  }
}}

// ─── Top-level rule ────────────────────────────────────────────────────────

AcadamarkConstruct
  = SigilTag3 / SigilTag2 / SigilTag1 / NamedTag

// ─── Sigil tags ────────────────────────────────────────────────────────────
//
// Each sigil level is a separate rule (longest first, so ### is tried before
// ## and ##  before #). The body scanner stops before the exact mirrored
// closer using a negative lookahead. Attr section stops before `|` or closer.
//
// Sigil tags with attributes: <# #id | content #>
// Sigil tags without `|`:     <# opaque content #>  (whole body is content)

SigilTag3
  = "<" "###" attrs:SigilAttrs3 content:$SigilBody3 "###>" {
      const node = makeNode("###", { isOpaqueContent: true })
      parseAttributes(node, attrs)
      node.content = content
      return node
    }

SigilTag2
  = "<" "##" attrs:SigilAttrs2 content:$SigilBody2 "##>" {
      const node = makeNode("##", { isOpaqueContent: true })
      parseAttributes(node, attrs)
      node.content = content
      return node
    }

SigilTag1
  = "<" "#" attrs:SigilAttrs1 content:$SigilBody1 "#>" {
      const node = makeNode("#", { isOpaqueContent: true })
      parseAttributes(node, attrs)
      node.content = content
      return node
    }

// Attr section for sigil tags: everything before `|` (if present).
// Stops at the level-appropriate mirrored closer to avoid consuming it.

SigilAttrs3
  = attrs:$(SigilAttrsChar3*) "|" { return attrs } / "" { return null }
SigilAttrsChar3
  = QuotedString / !("###>" / "|") .

SigilAttrs2
  = attrs:$(SigilAttrsChar2*) "|" { return attrs } / "" { return null }
SigilAttrsChar2
  = QuotedString / !("##>" / "|") .

SigilAttrs1
  = attrs:$(SigilAttrsChar1*) "|" { return attrs } / "" { return null }
SigilAttrsChar1
  = QuotedString / !("#>" / "|") .

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
  = "<" name:TagName attrs:$AttrChar* "|" content:$ContentChar* ">" {
      const node = makeNode(name, { isOpaqueContent: true })
      parseAttributes(node, attrs)
      node.content = content
      return node
    }
  / "<" name:TagName attrs:$AttrChar* ">" {
      const node = makeNode(name)
      parseAttributes(node, attrs)
      return node
    }

TagName = $([a-zA-Z][a-zA-Z0-9_-]*)

// Attr section: everything between tag name end and `|` or `>`.
// Quoted strings are consumed wholesale so `>` or `|` inside them don't terminate.

AttrChar
  = QuotedString
  / [^|><\n]

// Content section: rule B depth tracking via ordered alternatives.
// First alternative: a tag-like `<` (followed by alpha, `#`, or `/`) — recurse.
// Second alternative: any character except `>` and newline — consume as literal.
// A bare `<` (not followed by tag-start chars) matches the second alt as literal.

ContentChar
  = "<" [a-zA-Z#/] ContentChar* ">"
  / [^>\n]

// ─── Shared terminals ──────────────────────────────────────────────────────

QuotedString
  = '"' [^"\n]* '"'
  / "'" [^'\n]* "'"
