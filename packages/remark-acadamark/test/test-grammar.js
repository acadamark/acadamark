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
  assert.equal(n.isOpaqueContent, true)
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
  const n = p('<cite jones2001>')
  assert.equal(n.tagname, 'cite')
  assert.deepEqual(n.positional, ['jones2001'])
  assert.equal(n.content, null)
  assert.equal(n.isOpaqueContent, false)
  console.log('PASS grammar: <cite jones2001> named tag, single positional')
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
  // Multiple space-separated positionals
  const n = p('<cite jones2001 smith2022>')
  assert.deepEqual(n.positional, ['jones2001', 'smith2022'])
  console.log('PASS grammar: multiple positionals')
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
  const n = p('<cite [smith2017, jones2023]>')
  assert.deepEqual(n.positional, [['smith2017', 'jones2023']])
  console.log('PASS grammar: bracketed list positional')
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
  // : is allowed mid-identifier (id values, per Example 19 in the spec)
  const n = p('<ref #fig:body-cross-section>')
  assert.equal(n.tagname, 'ref')
  assert.equal(n.id, 'fig:body-cross-section')
  console.log('PASS grammar: colon in id value #fig:body-cross-section')
}

{
  // : and - together in an id
  const n = p('<ref #sec:intro-background>')
  assert.equal(n.id, 'sec:intro-background')
  console.log('PASS grammar: colon and hyphen together in id')
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
  const n = p('<cite [smith2024\\, jones2024]>')
  assert.deepEqual(n.positional, [['smith2024, jones2024']])
  console.log('PASS grammar: [key1\\, key2] → single list item with comma')
}

{
  // Normal bracketed list still works
  const n = p('<cite [smith2024, jones2024]>')
  assert.deepEqual(n.positional, [['smith2024', 'jones2024']])
  console.log('PASS grammar: [key1, key2] → two-item list (unescaped comma)')
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

console.log('\nAll grammar unit tests passed.')
