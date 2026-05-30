/**
 * Grammar unit tests — exercise the Peggy parser directly.
 *
 * These tests bypass micromark entirely. Input is the raw source string of a
 * single acadamark construct (as the micromark finder would extract it).
 * Output is an acadamarkTag node object.
 *
 * Benefits: fast, isolated, directly readable. Failures point at the grammar
 * file, not at the micromark/remark integration stack.
 */

import { parse } from '../src/generated/parser.js'
import assert from 'node:assert/strict'

// Convenience: parse and return, throwing on error with context.
function p(src) {
  try {
    return parse(src)
  } catch (e) {
    throw new Error(`Grammar failed on ${JSON.stringify(src)}: ${e.message}`)
  }
}

// ─── Slice 1: Sigil tags ───────────────────────────────────────────────────

{
  const n = p('<# Introduction #>')
  assert.equal(n.tagname, '#')
  assert.equal(n.content, ' Introduction ')
  // Hash sigils are prose-bearing per shorthand-syntax.md L569 and
  // dsl-registry.js (contentHandler: 'default'). The grammar emits the
  // makeNode default isOpaqueContent: false; from-markdown.js's
  // contentHandler-based assignment confirms it. Pre-2026-05-25 the
  // grammar emitted true (a runtime-masked bug fixed in the alpha
  // Phase 1 slice).
  assert.equal(n.isOpaqueContent, false)
  assert.equal(n.id, null)
  assert.deepEqual(n.classes, [])
  console.log('PASS grammar: basic <# ... #>')
}

{
  const n = p('<## Background ##>')
  assert.equal(n.tagname, '##')
  assert.equal(n.content, ' Background ')
  console.log('PASS grammar: <## ... ##>')
}

{
  const n = p('<### Methods ###>')
  assert.equal(n.tagname, '###')
  assert.equal(n.content, ' Methods ')
  console.log('PASS grammar: <### ... ###>')
}

{
  // Sigil tag with id attribute via |
  const n = p('<# #intro | Introduction #>')
  assert.equal(n.tagname, '#')
  assert.equal(n.id, 'intro')
  assert.equal(n.content, ' Introduction ')
  console.log('PASS grammar: sigil tag with #id via |')
}

{
  // Sigil tag with class
  const n = p('<# .numbered | Methods #>')
  assert.deepEqual(n.classes, ['numbered'])
  assert.equal(n.content, ' Methods ')
  console.log('PASS grammar: sigil tag with .class via |')
}

{
  // Sigil tag with multiple attributes
  const n = p('<# #intro .numbered .special | Introduction #>')
  assert.equal(n.id, 'intro')
  assert.deepEqual(n.classes, ['numbered', 'special'])
  assert.equal(n.content, ' Introduction ')
  console.log('PASS grammar: sigil tag with multiple attributes')
}

{
  // # inside content (not the closer) — single-# tag has `#` mid-content
  const n = p('<# Heading with #hash inside #>')
  assert.equal(n.tagname, '#')
  assert.equal(n.content, ' Heading with #hash inside ')
  console.log('PASS grammar: # inside content is not mistaken for closer')
}

{
  // # immediately before the actual closer
  const n = p('<# Ends with # #>')
  assert.equal(n.content, ' Ends with # ')
  console.log('PASS grammar: # before closer not double-counted')
}

{
  // Single # inside a ## tag (must not close it)
  const n = p('<## Has # one hash ##>')
  assert.equal(n.tagname, '##')
  assert.equal(n.content, ' Has # one hash ')
  console.log('PASS grammar: single # in ## tag is not a closer')
}

{
  // ## inside a ### tag
  const n = p('<### Has ## two hashes ###>')
  assert.equal(n.tagname, '###')
  assert.equal(n.content, ' Has ## two hashes ')
  console.log('PASS grammar: ## inside ### tag is not a closer')
}

{
  // Empty attr section (bare |)
  const n = p('<# | Just content #>')
  assert.equal(n.id, null)
  assert.deepEqual(n.classes, [])
  assert.equal(n.content, ' Just content ')
  console.log('PASS grammar: empty attribute section (bare |)')
}

{
  // Minimal content
  const n = p('<# X #>')
  assert.equal(n.content, ' X ')
  console.log('PASS grammar: minimal content sigil tag')
}

// ─── Slice 2: Named tags ───────────────────────────────────────────────────

{
  const n = p('<cite @jones2001>')
  assert.equal(n.tagname, 'cite')
  assert.deepEqual(n.atRefs, ['jones2001'])
  assert.deepEqual(n.positional, [])
  assert.equal(n.content, null)
  assert.equal(n.isOpaqueContent, false)
  console.log('PASS grammar: <cite @jones2001> named tag, single atRef')
}

{
  const n = p('<a https://example.com | Click here>')
  assert.equal(n.tagname, 'a')
  assert.deepEqual(n.positional, ['https://example.com'])
  assert.equal(n.content, ' Click here')
  assert.equal(n.isOpaqueContent, true)
  console.log('PASS grammar: <a url | content>')
}

{
  // Multiple space-separated @-prefixed atRefs
  const n = p('<cite @jones2001 @smith2022>')
  assert.deepEqual(n.atRefs, ['jones2001', 'smith2022'])
  assert.deepEqual(n.positional, [])
  console.log('PASS grammar: multiple atRefs')
}

{
  const n = p('<figure src=elephant.jpg>')
  assert.deepEqual(n.kwargs, { src: 'elephant.jpg' })
  console.log('PASS grammar: keyword attribute src=elephant.jpg')
}

{
  // Hyphenated value
  const n = p('<img src=my-photo.jpg>')
  assert.equal(n.kwargs.src, 'my-photo.jpg')
  console.log('PASS grammar: hyphenated value src=my-photo.jpg')
}

{
  const n = p("<figure caption='An elephant, photographed.'>")
  assert.equal(n.kwargs.caption, 'An elephant, photographed.')
  console.log('PASS grammar: quoted value containing comma and space')
}

{
  const n = p('<figure #elephant | Caption text.>')
  assert.equal(n.id, 'elephant')
  assert.equal(n.content, ' Caption text.')
  console.log('PASS grammar: #id attribute on named tag')
}

{
  const n = p('<div .container .dark | hello>')
  assert.deepEqual(n.classes, ['container', 'dark'])
  assert.equal(n.content, ' hello')
  console.log('PASS grammar: multiple .class attributes')
}

{
  const n = p('<figure +wrap -preview>')
  assert.deepEqual(n.booleans, { wrap: true, preview: false })
  console.log('PASS grammar: +flag and -flag boolean attributes')
}

{
  const n = p('<cite [@smith2017, @jones2023]>')
  assert.deepEqual(n.positional, [['@smith2017', '@jones2023']])
  assert.deepEqual(n.atRefs, [])
  console.log('PASS grammar: bracketed list with @ keys')
}

{
  const n = p('<figure src=elephant.jpg #adult-elephant align=right +wrap | An elephant.>')
  assert.equal(n.id, 'adult-elephant')
  assert.deepEqual(n.kwargs, { src: 'elephant.jpg', align: 'right' })
  assert.deepEqual(n.booleans, { wrap: true })
  assert.equal(n.content, ' An elephant.')
  console.log('PASS grammar: full mixed attributes')
}

{
  // > inside a quoted attribute value must not close the tag
  const n = p('<figure caption="a > b">')
  assert.equal(n.kwargs.caption, 'a > b')
  console.log('PASS grammar: > inside quoted attr value does not close tag')
}

{
  // Nested tag-like content — rule B depth tracking via recursive ContentChar
  const n = p('<figure src=x | See <em | bold> text.>')
  assert.equal(n.content, ' See <em | bold> text.')
  console.log('PASS grammar: nested tag-like content does not close outer tag')
}

{
  // Rule B: < followed by space is literal (no depth increment)
  const n = p('<figure | a < b or c>')
  assert.equal(n.content, ' a < b or c')
  console.log('PASS grammar: < followed by space is literal (rule B)')
}

{
  // </em> in content: / increments depth, > decrements, outer > closes
  const n = p('<div | Hello <em>bold</em> world.>')
  assert.equal(n.content, ' Hello <em>bold</em> world.')
  console.log('PASS grammar: </tag> in content tracked by depth')
}

{
  const n = p('<aside | This is a note.>')
  assert.equal(n.tagname, 'aside')
  assert.equal(n.content, ' This is a note.')
  console.log('PASS grammar: <aside | content> no attributes')
}

// ─── Slice 3: identifier rules ─────────────────────────────────────────────

{
  // : is allowed mid-identifier (atRef values, per spec)
  const n = p('<ref @fig:body-cross-section>')
  assert.equal(n.tagname, 'ref')
  assert.deepEqual(n.atRefs, ['fig:body-cross-section'])
  assert.equal(n.id, null)
  console.log('PASS grammar: colon in atRef value @fig:body-cross-section')
}

{
  // : and - together in an atRef
  const n = p('<ref @sec:intro-background>')
  assert.deepEqual(n.atRefs, ['sec:intro-background'])
  console.log('PASS grammar: colon and hyphen together in atRef')
}

{
  // . allowed mid-identifier in keyword value (file path)
  const n = p('<img src=v1.2.3.jpg>')
  assert.equal(n.kwargs.src, 'v1.2.3.jpg')
  console.log('PASS grammar: dots in keyword value src=v1.2.3.jpg')
}

{
  // : and / allowed in positional (URL without pipe)
  const n = p('<a https://example.com>')
  assert.deepEqual(n.positional, ['https://example.com'])
  console.log('PASS grammar: URL as positional (colon and slashes)')
}

{
  // + cannot start an identifier — it starts a BoolTrue, so +flag is a bool attr
  const n = p('<div +active>')
  assert.deepEqual(n.booleans, { active: true })
  assert.deepEqual(n.positional, [])
  console.log('PASS grammar: + at token start is BoolTrue, not positional')
}

{
  // - cannot start an identifier — it starts a BoolFalse
  const n = p('<div -hidden>')
  assert.deepEqual(n.booleans, { hidden: false })
  assert.deepEqual(n.positional, [])
  console.log('PASS grammar: - at token start is BoolFalse, not positional')
}

{
  // # cannot start an identifier — it starts an Id form
  // (bare # with no valid IdentifierStart after it should fail to parse as Id,
  // leaving the whole construct to fail gracefully or parse as no-attr)
  const n = p('<div #myid>')
  assert.equal(n.id, 'myid')
  assert.deepEqual(n.positional, [])
  console.log('PASS grammar: # at token start is Id, not positional')
}

{
  // . cannot start an identifier — it starts a Class form
  const n = p('<div .container>')
  assert.deepEqual(n.classes, ['container'])
  assert.deepEqual(n.positional, [])
  console.log('PASS grammar: . at token start is Class, not positional')
}

// ─── Slice 3.5: dollar and backtick sigil families ─────────────────────────

{
  const n = p('<$ x^2 $>')
  assert.equal(n.tagname, '$')
  assert.equal(n.content, ' x^2 ')
  assert.equal(n.isOpaqueContent, true)
  assert.equal(n.id, null)
  assert.deepEqual(n.classes, [])
  console.log('PASS grammar: basic <$ ... $> no-| form')
}

{
  const n = p('<$$ \\frac{x}{2} $$>')
  assert.equal(n.tagname, '$$')
  assert.equal(n.content, ' \\frac{x}{2} ')
  console.log('PASS grammar: <$$ ... $$> display math')
}

{
  const n = p('<$ #myeq | x^2 $>')
  assert.equal(n.tagname, '$')
  assert.equal(n.id, 'myeq')
  assert.equal(n.content, ' x^2 ')
  console.log('PASS grammar: <$ #id | content $> with attribute')
}

{
  const n = p('<$ .highlighted | x^2 $>')
  assert.equal(n.tagname, '$')
  assert.deepEqual(n.classes, ['highlighted'])
  assert.equal(n.id, null)
  assert.equal(n.content, ' x^2 ')
  console.log('PASS grammar: <$ .class | content $> class-only attribute')
}

{
  const n = p('<$$ #eqn:newton .important | F = ma $$>')
  assert.equal(n.tagname, '$$')
  assert.equal(n.id, 'eqn:newton')
  assert.deepEqual(n.classes, ['important'])
  assert.equal(n.content, ' F = ma ')
  console.log('PASS grammar: <$$ #id .class | content $$> id and class together')
}

{
  const n = p('<$$ | \\sum_{i=0}^{n} x_i $$>')
  assert.equal(n.tagname, '$$')
  assert.equal(n.content, ' \\sum_{i=0}^{n} x_i ')
  console.log('PASS grammar: <$$ | content $$> bare pipe form')
}

{
  const n = p('<$$ has $ one dollar $$>')
  assert.equal(n.tagname, '$$')
  assert.equal(n.content, ' has $ one dollar ')
  console.log('PASS grammar: single $ inside $$ tag is not a closer')
}

{
  const n = p('<` code `>')
  assert.equal(n.tagname, '`')
  assert.equal(n.content, ' code ')
  assert.equal(n.isOpaqueContent, true)
  assert.equal(n.id, null)
  assert.deepEqual(n.classes, [])
  console.log('PASS grammar: basic <` ... `> no-| form')
}

{
  const n = p('<``` block ```>')
  assert.equal(n.tagname, '```')
  assert.equal(n.content, ' block ')
  console.log('PASS grammar: <``` ... ```> code block')
}

{
  const n = p('<` #mycode | inline `>')
  assert.equal(n.tagname, '`')
  assert.equal(n.id, 'mycode')
  assert.equal(n.content, ' inline ')
  console.log('PASS grammar: <` #id | content `> with attribute')
}

{
  const n = p('<``` has ` one backtick ```>')
  assert.equal(n.tagname, '```')
  assert.equal(n.content, ' has ` one backtick ')
  console.log('PASS grammar: single ` inside ``` tag is not a closer')
}

{
  // ContentChar fix: $ in SIGIL_CHARS must also be in the [a-zA-Z#$`/] class
  const n = p('<figure | nested <$ x $>>')
  assert.equal(n.tagname, 'figure')
  assert.equal(n.content, ' nested <$ x $>')
  console.log('PASS grammar: $ sigil in named-tag content does not close outer tag')
}

{
  // ContentChar fix: ` in SIGIL_CHARS must also be in the [a-zA-Z#$`/] class
  const n = p('<div | code: <` foo `> done>')
  assert.equal(n.tagname, 'div')
  assert.equal(n.content, ' code: <` foo `> done')
  console.log('PASS grammar: ` sigil in named-tag content does not close outer tag')
}

console.log('\nAll Slice 3.5 grammar tests passed.')

// ─── IdentifierCont `=` fix — URL query strings ────────────────────────────

{
  const n = p('<a https://example.com?q=value | link>')
  assert.equal(n.tagname, 'a')
  assert.deepEqual(n.positional, ['https://example.com?q=value'])
  assert.equal(n.content, ' link')
  console.log('PASS grammar: URL with single query param as positional')
}

{
  const n = p('<a https://example.com?q=1&page=2 | link>')
  assert.equal(n.tagname, 'a')
  assert.deepEqual(n.positional, ['https://example.com?q=1&page=2'])
  assert.equal(n.content, ' link')
  console.log('PASS grammar: URL with multiple query params as positional')
}

{
  // Keyword with URL containing `=` in value — keyword parsing unaffected
  const n = p('<cite href=https://example.com?q=value>')
  assert.equal(n.tagname, 'cite')
  assert.equal(n.kwargs.href, 'https://example.com?q=value')
  console.log('PASS grammar: keyword value containing `=` (URL query string)')
}

console.log('\nAll IdentifierCont `=` fix tests passed.')

// ─── Escape rules: named-tag content ──────────────────────────────────────

{
  // Content starts with the space after |; \< → literal <
  const n = p('<aside | a \\< b>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' a < b')
  console.log('PASS grammar: \\< in named-tag content → literal <')
}

{
  const n = p('<aside | a \\| b>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' a | b')
  console.log('PASS grammar: \\| in named-tag content → literal |')
}

{
  const n = p('<aside | a \\\\ b>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' a \\ b')
  console.log('PASS grammar: \\\\ in named-tag content → literal \\')
}

{
  // Markdown pass-through: \* is not an acadamark escape — passed unchanged
  const n = p('<aside | a \\* b>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' a \\* b')
  console.log('PASS grammar: \\* in named-tag content → pass-through \\*')
}

{
  // Unknown escape \q → acadamarkParseError node in content array
  const n = p('<aside | text \\q more>')
  assert.ok(Array.isArray(n.content), 'content should be array when errors present')
  assert.equal(n.content.length, 3)
  assert.equal(n.content[0], ' text ')
  assert.equal(n.content[1].type, 'acadamarkParseError')
  assert.equal(n.content[1].subtype, 'unknown-escape-sequence')
  assert.equal(n.content[1].source, '\\q')
  assert.equal(n.content[2], ' more')
  console.log('PASS grammar: \\q in named-tag content → acadamarkParseError node')
}

{
  // Trailing \ before > → error node (\ is "trailing backslash" error)
  const n = p('<aside | text\\>')
  assert.ok(Array.isArray(n.content))
  const err = n.content.find(item => typeof item !== 'string')
  assert.ok(err, 'should contain an error node')
  assert.equal(err.type, 'acadamarkParseError')
  assert.equal(err.source, '\\')
  console.log('PASS grammar: trailing \\ in named-tag content → acadamarkParseError node')
}

{
  // Multiple escapes: \< and \\ and \q
  const n = p('<aside | a \\< b \\\\ c \\q d>')
  assert.ok(Array.isArray(n.content))
  const errIdx = n.content.findIndex(item => typeof item !== 'string')
  assert.ok(errIdx >= 0)
  assert.equal(n.content[errIdx].source, '\\q')
  const textBefore = n.content.slice(0, errIdx).join('')
  assert.equal(textBefore, ' a < b \\ c ')
  console.log('PASS grammar: multiple escapes including unknown in named-tag content')
}

console.log('\nAll escape-rules named-tag grammar tests passed.')

// ─── Escape rules: hash sigil bodies ──────────────────────────────────────

{
  const n = p('<# a \\< b #>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' a < b ')
  console.log('PASS grammar: \\< in hash sigil body → literal <')
}

{
  // \| in content is an escaped pipe; use explicit separator so \| lands in content, not attrs
  const n = p('<# | a \\| b #>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' a | b ')
  console.log('PASS grammar: \\| in hash sigil body content → literal |')
}

{
  // Markdown pass-through in hash sigil body
  const n = p('<# \\* bold \\* #>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' \\* bold \\* ')
  console.log('PASS grammar: \\* in hash sigil body → pass-through \\*')
}

{
  // Unknown escape in hash sigil body → error node
  const n = p('<# intro \\q heading #>')
  assert.ok(Array.isArray(n.content))
  const err = n.content.find(item => typeof item !== 'string')
  assert.ok(err)
  assert.equal(err.type, 'acadamarkParseError')
  assert.equal(err.source, '\\q')
  console.log('PASS grammar: \\q in hash sigil body → acadamarkParseError node')
}

{
  // \\ in hash sigil body → literal \
  const n = p('<# a \\\\ b #>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' a \\ b ')
  console.log('PASS grammar: \\\\ in hash sigil body → literal \\')
}

console.log('\nAll escape-rules hash-sigil grammar tests passed.')

// ─── Escape rules: bracketed list ─────────────────────────────────────────

{
  // \, in bracketed list → single item containing a comma
  const n = p('<cite [@smith2024\\, @jones2024]>')
  assert.deepEqual(n.positional, [['@smith2024, @jones2024']])
  console.log('PASS grammar: [@key1\\, @key2] → single list item with comma')
}

{
  // Normal bracketed list with @ keys still works
  const n = p('<cite [@smith2024, @jones2024]>')
  assert.deepEqual(n.positional, [['@smith2024', '@jones2024']])
  console.log('PASS grammar: [@key1, @key2] → two-item list (unescaped comma)')
}

console.log('\nAll escape-rules bracketed-list grammar tests passed.')

// ─── Escape rules: opaque regions unaffected ─────────────────────────────

{
  // Math sigil: \frac is NOT processed as an escape (opaque content)
  const n = p('<$ \\frac{x}{y} $>')
  assert.equal(n.isOpaqueContent, true)
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' \\frac{x}{y} ')
  console.log('PASS grammar: \\frac in math sigil preserved verbatim (opaque)')
}

{
  // Backtick sigil: \n is NOT processed (opaque content)
  const n = p('<` const x = "\\n"; `>')
  assert.equal(n.isOpaqueContent, true)
  assert.equal(typeof n.content, 'string')
  assert.ok(n.content.includes('\\n'), 'content should contain literal \\n')
  console.log('PASS grammar: \\n in backtick sigil preserved verbatim (opaque)')
}

{
  // Quoted attribute value: backslash NOT processed (verbatim storage)
  const n = p('<figure caption="value with backslash \\\\">')
  assert.equal(n.kwargs.caption, 'value with backslash \\\\')
  console.log('PASS grammar: backslash in quoted attribute value stored verbatim')
}

console.log('\nAll escape-rules opaque-region grammar tests passed.')

// ─── Opaque inline spans in named-tag content (bug-fix arc Slice C) ─────────
//
// Inline/display math ($…$, $$…$$) and code spans (`…`, ``…``) inside pipe-form
// named-tag content are opaque: the grammar returns them verbatim instead of
// escape-processing their interior, so LaTeX backslash commands and Windows
// paths survive. Before the OpaqueSpan rule, the inner \in / \mathbb / \sqrt /
// path backslashes produced acadamarkParseError nodes that split the content
// array and broke downstream math/code rendering.

{
  // Inline math with \in and \mathbb{…}: clean opaque string, verbatim.
  const n = p('<definition | $X \\in \\mathbb{Y}$ is the set.>')
  assert.equal(typeof n.content, 'string', 'inline math content is a clean string (no error nodes)')
  assert.equal(n.content, ' $X \\in \\mathbb{Y}$ is the set.')
  console.log('PASS grammar: $…$ with \\in \\mathbb{} in named-tag content is opaque')
}

{
  // Inline math with \sqrt{…}.
  const n = p('<lemma | If $f(x) = \\sqrt{x}$ then it is defined for $x \\geq 0$.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' If $f(x) = \\sqrt{x}$ then it is defined for $x \\geq 0$.')
  console.log('PASS grammar: two $…$ spans with \\sqrt and \\geq are both opaque')
}

{
  // \mathcal and \log inside inline math.
  const n = p('<remark | We use $\\mathcal{O}(n \\log n)$ notation throughout.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' We use $\\mathcal{O}(n \\log n)$ notation throughout.')
  console.log('PASS grammar: $…$ with \\mathcal \\log in named-tag content is opaque')
}

{
  // Display math $$…$$ in named-tag content (Q3: same delimiter family).
  const n = p('<aside | The identity $$e^{i\\pi} + 1 = 0$$ is the Euler identity.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' The identity $$e^{i\\pi} + 1 = 0$$ is the Euler identity.')
  console.log('PASS grammar: $$…$$ display math in named-tag content is opaque')
}

{
  // Single-backtick code span with backslashes — the exact escape-rules-spec
  // "Unknown escape (in named-tag content)" promise: `C:\new\folder` is opaque.
  const n = p('<aside | The path `C:\\new\\folder` is opaque.>')
  assert.equal(typeof n.content, 'string', 'code span content is a clean string (no error nodes)')
  assert.equal(n.content, ' The path `C:\\new\\folder` is opaque.')
  console.log('PASS grammar: `…` code span with \\n \\f backslashes is opaque')
}

{
  // Double-backtick code span (for code containing a backtick) with a backslash.
  const n = p('<aside | Regex ``\\d+(\\.\\d+)?`` matches decimals.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' Regex ``\\d+(\\.\\d+)?`` matches decimals.')
  console.log('PASS grammar: ``…`` double-backtick code span with backslashes is opaque')
}

{
  // Invariant: backslash-free math is byte-identical to the pre-fix output
  // (verbatim return), so existing snapshots cannot change.
  const n = p('<aside | Einstein wrote $E = mc^2$ in 1905.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' Einstein wrote $E = mc^2$ in 1905.')
  console.log('PASS grammar: backslash-free $…$ unchanged (zero-regression invariant)')
}

{
  // Invariant: two currency dollars (no LaTeX) round-trip identically. The
  // span machinery may pair them, but verbatim return reconstructs the source.
  const n = p('<aside | The price rose from $5 to $10 overnight.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' The price rose from $5 to $10 overnight.')
  console.log('PASS grammar: currency $5 … $10 round-trips identically (no error nodes)')
}

{
  // Invariant: a lone unmatched $ (no closer before >) stays a literal char.
  const n = p('<aside | A discount of $5 applies.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' A discount of $5 applies.')
  console.log('PASS grammar: lone unmatched $ falls through to literal char')
}

{
  // Guard: an escaped delimiter (\$) is consumed as a markdown pass-through
  // BEFORE a span can open — the escape alternatives sit first in ContentItem.
  const n = p('<aside | A literal cost of \\$5 here.>')
  assert.equal(typeof n.content, 'string')
  assert.equal(n.content, ' A literal cost of \\$5 here.')
  console.log('PASS grammar: \\$ pass-through prevents span opening (literal dollar authorable)')
}

{
  // Guard: a bare unknown escape OUTSIDE any span still errors (strict mode is
  // unchanged — OpaqueSpan only suppresses errors inside a recognised span).
  const n = p('<aside | A bare path C:\\new errors here.>')
  assert.ok(Array.isArray(n.content), 'bare backslash outside a span still produces an error array')
  const err = n.content.find(item => typeof item !== 'string')
  assert.ok(err && err.type === 'acadamarkParseError', 'bare \\n outside a span is still an unknown-escape error')
  console.log('PASS grammar: bare \\n outside a span still errors (strict mode preserved)')
}

console.log('\nAll opaque-inline-span (Slice C) grammar tests passed.')

// ─── Multi-line: grammar unit tests ─────────────────────────────────────────
// The grammar receives joined source strings (chunks joined with '\n').
// These tests verify that the Peggy grammar accepts newlines in all regions
// where the spec allows them.

{
  // Newline between attributes (short-form named tag)
  // `_` = [ \t\n\r]* accepts newlines as whitespace between attributes.
  const n = p('<figure\n  #fig1\n  .landscape>')
  assert.equal(n.tagname, 'figure')
  assert.equal(n.id, 'fig1')
  assert.deepEqual(n.classes, ['landscape'])
  console.log('PASS grammar: newline between attributes (short-form)')
}

{
  // Newline between kwargs (short-form named tag)
  const n = p('<figure\n  caption="Elephant"\n  credit="Jane">')
  assert.equal(n.kwargs.caption, 'Elephant')
  assert.equal(n.kwargs.credit, 'Jane')
  console.log('PASS grammar: newline between kwargs (short-form)')
}

{
  // Newline inside named-tag content (content spans multiple lines)
  const n = p('<aside | line one\nline two\nline three>')
  assert.equal(typeof n.content, 'string')
  assert.ok(n.content.includes('line one'))
  assert.ok(n.content.includes('line two'))
  assert.ok(n.content.includes('line three'))
  console.log('PASS grammar: newlines in named-tag content region')
}

{
  // Multi-line hash sigil: body spans multiple lines
  const n = p('<#\nheading text\n#>')
  assert.equal(n.tagname, '#')
  assert.equal(n.content, '\nheading text\n')
  console.log('PASS grammar: multi-line hash sigil body')
}

{
  // Multi-line dollar sigil (math, opaque): newlines preserved verbatim
  const n = p('<$\n\\frac{x}{y}\n$>')
  assert.equal(n.tagname, '$')
  assert.equal(n.isOpaqueContent, true)
  assert.equal(n.content, '\n\\frac{x}{y}\n')
  console.log('PASS grammar: multi-line dollar sigil (opaque body, newlines preserved)')
}

{
  // Multi-line triple-backtick sigil (opaque): newlines preserved verbatim
  const n = p('<```\nsome code\nmore code\n```>')
  assert.equal(n.tagname, '```')
  assert.equal(n.isOpaqueContent, true)
  assert.equal(n.content, '\nsome code\nmore code\n')
  console.log('PASS grammar: multi-line triple-backtick sigil (opaque body)')
}

{
  // Quoted attribute value with embedded newline → grammar rejects it.
  // QuotedStringValue = [^"\n]* — newline is explicitly excluded.
  assert.throws(
    () => parse('<figure caption="line one\nline two">'),
    /Expected/,
    'grammar rejects newline inside quoted attribute value',
  )
  console.log('PASS grammar: newline inside quoted attribute value → parse error')
}

console.log('\nAll multi-line grammar tests passed.')

// ─── G1a: Inline shortcut rules — ^{...} → sup, _{...} → sub ────────────────

{
  // Simple superscript inside named-tag content.
  const n = p('<aside | 1^{st}>')
  // The outer aside node's content is a mixed array (text + sup node).
  assert.ok(Array.isArray(n.content), 'content is array (mixed)')
  const items = n.content
  const supNode = items.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sup')
  assert.ok(supNode, 'sup node present')
  assert.equal(supNode.form, 'shortcut', 'form is shortcut')
  assert.equal(supNode.contentHandler, 'default', 'contentHandler: default')
  assert.equal(supNode.isOpaqueContent, false, 'isOpaqueContent: false')
  assert.equal(supNode.content, 'st', 'sup content is "st"')
  assert.deepEqual(supNode.positional, [])
  assert.deepEqual(supNode.atRefs, [])
  console.log('PASS grammar G1a-1: simple ^{st} → sup node')
}

{
  // Simple subscript inside named-tag content.
  const n = p('<aside | H_{2}O>')
  assert.ok(Array.isArray(n.content), 'content is array')
  const subNode = n.content.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sub')
  assert.ok(subNode, 'sub node present')
  assert.equal(subNode.form, 'shortcut')
  assert.equal(subNode.contentHandler, 'default', 'contentHandler: default')
  assert.equal(subNode.content, '2', 'sub content is "2"')
  console.log('PASS grammar G1a-2: simple _{2} → sub node')
}

{
  // Bare ^ (no {) is literal text — NOT an error, NOT a sup.
  const n = p('<aside | a^b>')
  assert.equal(typeof n.content, 'string', 'content is plain string — no mixed items')
  assert.ok(n.content.includes('^'), 'content contains ^')
  assert.ok(!n.content.includes('{'), 'content has no { brace')
  console.log('PASS grammar G1a-3: bare ^ is literal text (owner\'s decision)')
}

{
  // Bare _ (no {) is literal text — snake_case passes through.
  const n = p('<aside | snake_case>')
  assert.equal(typeof n.content, 'string', 'content is plain string')
  assert.ok(n.content.includes('snake_case'), 'content contains snake_case')
  console.log('PASS grammar G1a-4: bare _ is literal text — snake_case untouched')
}

{
  // Nested: superscript containing subscript — x^{y_{1}}.
  const n = p('<aside | x^{y_{1}}>')
  assert.ok(Array.isArray(n.content), 'content is array')
  const supNode = n.content.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sup')
  assert.ok(supNode, 'outer sup node present')
  assert.equal(supNode.contentHandler, 'default')
  // sup content is mixed array: ["y", subNode]
  const supContent = supNode.content
  assert.ok(Array.isArray(supContent), 'sup content is mixed array')
  const subNode = supContent.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sub')
  assert.ok(subNode, 'nested sub node present')
  assert.equal(subNode.contentHandler, 'default', 'nested sub has contentHandler: default')
  assert.equal(subNode.content, '1', 'nested sub content is "1"')
  console.log('PASS grammar G1a-5: nested x^{y_{1}} → sup containing sub')
}

{
  // Nested acadamark construct inside braces: ^{see <cite @jones>}.
  // At grammar level, <cite @jones> is collected as raw text via the depth-
  // tracking alternative (same as in ContentItem). remarkRecursiveContent
  // later parses the cite node from the sup's string content.
  const n = p('<aside | ^{see <cite @jones>}>')
  assert.ok(Array.isArray(n.content), 'content is array')
  const supNode = n.content.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sup')
  assert.ok(supNode, 'sup node present')
  // At grammar level, content is the raw source string including the nested construct.
  assert.equal(typeof supNode.content, 'string', 'sup content is string at grammar level')
  assert.ok(supNode.content.includes('<cite @jones>'), 'raw nested construct text present in sup content')
  console.log('PASS grammar G1a-6: nested acadamark construct in brace content (raw text at grammar level)')
}

{
  // Escape inside braces: \^ → literal ^.
  const n = p('<aside | ^{\\^}>')
  assert.ok(Array.isArray(n.content), 'content is array')
  const supNode = n.content.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sup')
  assert.ok(supNode, 'sup node present')
  assert.equal(supNode.content, '^', 'escaped \\^ inside braces → literal ^')
  console.log('PASS grammar G1a-7: \\^ inside brace content → literal ^')
}

{
  // Escape outside braces: \^ in named-tag content → literal ^.
  const n = p('<aside | text \\^ more>')
  assert.equal(typeof n.content, 'string', 'content is plain string')
  assert.ok(n.content.includes('^'), 'content contains literal ^')
  assert.ok(!n.content.includes('\\'), 'content has no backslash')
  console.log('PASS grammar G1a-8: \\^ outside braces in content → literal ^')
}

{
  // Error: empty braces ^{} → acadamarkParseError.
  const n = p('<aside | ^{}>')
  assert.ok(Array.isArray(n.content), 'content is array')
  const errNode = n.content.find((it) => it?.type === 'acadamarkParseError')
  assert.ok(errNode, 'acadamarkParseError present for empty ^{}')
  assert.equal(errNode.subtype, 'empty-shortcut')
  assert.equal(errNode.source, '^{}')
  console.log('PASS grammar G1a-9: ^{} → acadamarkParseError (empty-shortcut)')
}

{
  // Error: unterminated ^{abc → acadamarkParseError.
  const n = p('<aside | ^{abc>')
  assert.ok(Array.isArray(n.content), 'content is array (has error)')
  const errNode = n.content.find((it) => it?.type === 'acadamarkParseError')
  assert.ok(errNode, 'acadamarkParseError present for unterminated ^{abc')
  assert.equal(errNode.subtype, 'unterminated-shortcut')
  console.log('PASS grammar G1a-10: ^{abc (unterminated) → acadamarkParseError')
}

{
  // Ordinal 1^{st} edition — text + sup + text in content.
  const n = p('<aside | The 1^{st} edition.>')
  assert.ok(Array.isArray(n.content), 'content is mixed array')
  const supNode = n.content.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sup')
  assert.ok(supNode, 'sup node in ordinal phrase')
  assert.equal(supNode.content, 'st')
  console.log('PASS grammar G1a-11: ordinal phrase with ^{st}')
}

{
  // Chemistry H_{2}O — text + sub + text.
  const n = p('<aside | H_{2}O>')
  assert.ok(Array.isArray(n.content), 'content is mixed array')
  const subNode = n.content.find((it) => it?.type === 'acadamarkTag' && it.tagname === 'sub')
  assert.ok(subNode, 'sub node in chemical formula')
  assert.equal(subNode.content, '2')
  // Surrounding text segments contain H and O.
  const textParts = n.content.filter((it) => typeof it === 'string').join('')
  assert.ok(textParts.includes('H'), 'H present in text parts')
  assert.ok(textParts.includes('O'), 'O present in text parts')
  console.log('PASS grammar G1a-12: H_{2}O — chemistry subscript')
}

console.log('\nAll grammar unit tests passed.')
