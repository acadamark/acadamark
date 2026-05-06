/**
 * Integration tests — full remark pipeline.
 *
 * These tests run the complete micromark finder → fromMarkdown → mdast path.
 * They verify that boundary detection in syntax.js and Peggy parsing in
 * from-markdown.js compose correctly into the final acadamarkTag node.
 *
 * The 29 cases here match the pure-micromark archive exactly, confirming
 * parity between the two implementations.
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkAcadamark from '../src/index.js'
import assert from 'node:assert/strict'

function parse(src) {
  return unified().use(remarkParse).use(remarkAcadamark).parse(src)
}

function parseTag(src) {
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'acadamarkTag')
  if (!node) throw new Error(`No acadamarkTag in: ${JSON.stringify(src)}`)
  return node
}

function parseInlineTag(src) {
  const tree = parse(src)
  for (const child of tree.children) {
    if (child.type === 'paragraph' && child.children) {
      const tag = child.children.find((n) => n.type === 'acadamarkTag')
      if (tag) return tag
    }
  }
  throw new Error(`No inline acadamarkTag in: ${JSON.stringify(src)}`)
}

// ─── Slice 1: Sigil tags ───────────────────────────────────────────────────

{
  const node = parseTag('<# Introduction #>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.tagname, '#')
  assert.equal(node.content, ' Introduction ')
  assert.equal(node.isOpaqueContent, false)
  assert.equal(node.id, null)
  assert.deepEqual(node.classes, [])
  console.log('PASS: basic <# ... #> produces acadamarkTag')
}

{
  const node = parseTag('<## Background ##>')
  assert.equal(node.tagname, '##')
  assert.equal(node.content, ' Background ')
  console.log('PASS: double-sigil <## ... ##>')
}

{
  const node = parseTag('<### Methods ###>')
  assert.equal(node.tagname, '###')
  assert.equal(node.content, ' Methods ')
  console.log('PASS: triple-sigil <### ... ###>')
}

{
  const tree = parse('Before.\n\n<# Heading #>\n\nAfter.')
  const types = tree.children.map((n) => n.type)
  assert.deepEqual(types, ['paragraph', 'acadamarkTag', 'paragraph'])
  assert.equal(tree.children[1].tagname, '#')
  console.log('PASS: sigil tag is block-level (not in a paragraph)')
}

{
  const node = parseTag('<# #intro | Introduction #>')
  assert.equal(node.id, 'intro')
  assert.equal(node.content, ' Introduction ')
  console.log('PASS: sigil tag with #id attribute via |')
}

{
  const node = parseTag('<# .numbered | Methods #>')
  assert.deepEqual(node.classes, ['numbered'])
  assert.equal(node.content, ' Methods ')
  console.log('PASS: sigil tag with .class attribute via |')
}

{
  const node = parseTag('<# #intro .numbered .special | Introduction #>')
  assert.equal(node.id, 'intro')
  assert.deepEqual(node.classes, ['numbered', 'special'])
  assert.equal(node.content, ' Introduction ')
  console.log('PASS: sigil tag with multiple attributes')
}

{
  const node = parseTag('<# Heading with #hash inside #>')
  assert.equal(node.content, ' Heading with #hash inside ')
  console.log('PASS: # inside content is not mistaken for closer')
}

{
  const node = parseTag('<# Ends with # #>')
  assert.equal(node.content, ' Ends with # ')
  console.log('PASS: # immediately before closer is not double-counted')
}

{
  const node = parseTag('<## Has # one hash ##>')
  assert.equal(node.tagname, '##')
  assert.equal(node.content, ' Has # one hash ')
  console.log('PASS: single # in double-sigil content is not a closer')
}

{
  const node = parseTag('<# | Just content #>')
  assert.equal(node.id, null)
  assert.deepEqual(node.classes, [])
  assert.equal(node.content, ' Just content ')
  console.log('PASS: empty attribute section (bare |)')
}

{
  const node = parseTag('<# X #>')
  assert.equal(node.content, ' X ')
  console.log('PASS: minimal content sigil tag')
}

console.log('\nAll Slice 1 integration tests passed.')

// ─── Slice 2: Named tags ───────────────────────────────────────────────────

{
  const node = parseTag('<cite jones2001>')
  assert.equal(node.tagname, 'cite')
  assert.deepEqual(node.positional, ['jones2001'])
  assert.equal(node.content, null)
  assert.equal(node.isOpaqueContent, false)
  console.log('PASS: <cite jones2001> → named tag, single positional')
}

{
  const node = parseTag('<a https://example.com | Click here>')
  assert.equal(node.tagname, 'a')
  assert.deepEqual(node.positional, ['https://example.com'])
  assert.equal(node.content, ' Click here')
  assert.equal(node.isOpaqueContent, false)
  console.log('PASS: <a url | content> → positional + content')
}

{
  const node = parseTag('<cite jones2001 smith2022>')
  assert.deepEqual(node.positional, ['jones2001', 'smith2022'])
  console.log('PASS: multiple positionals from space-separated tokens')
}

{
  const node = parseTag('<figure src=elephant.jpg>')
  assert.deepEqual(node.kwargs, { src: 'elephant.jpg' })
  console.log('PASS: keyword attribute src=elephant.jpg')
}

{
  const node = parseTag('<img src=my-photo.jpg>')
  assert.equal(node.kwargs.src, 'my-photo.jpg')
  console.log('PASS: hyphenated value src=my-photo.jpg')
}

{
  const node = parseTag("<figure caption='An elephant, photographed.'>")
  assert.equal(node.kwargs.caption, 'An elephant, photographed.')
  console.log('PASS: quoted value containing comma and space')
}

{
  const node = parseTag('<figure #elephant | Caption text.>')
  assert.equal(node.id, 'elephant')
  assert.equal(node.content, ' Caption text.')
  console.log('PASS: #id attribute on named tag')
}

{
  const node = parseTag('<div .container .dark | hello>')
  assert.deepEqual(node.classes, ['container', 'dark'])
  assert.equal(node.content, ' hello')
  console.log('PASS: multiple .class attributes')
}

{
  const node = parseTag('<figure +wrap -preview>')
  assert.deepEqual(node.booleans, { wrap: true, preview: false })
  console.log('PASS: +flag and -flag boolean attributes')
}

{
  const node = parseTag('<cite [smith2017, jones2023]>')
  assert.deepEqual(node.positional, [['smith2017', 'jones2023']])
  console.log('PASS: bracketed list positional')
}

{
  const node = parseTag('<figure src=elephant.jpg #adult-elephant align=right +wrap | An elephant.>')
  assert.equal(node.id, 'adult-elephant')
  assert.deepEqual(node.kwargs, { src: 'elephant.jpg', align: 'right' })
  assert.deepEqual(node.booleans, { wrap: true })
  assert.equal(node.content, ' An elephant.')
  console.log('PASS: full mixed attributes (id, kwargs, booleans, content)')
}

{
  const node = parseTag('<figure caption="a > b">')
  assert.equal(node.kwargs.caption, 'a > b')
  console.log('PASS: > inside quoted attribute value does not close tag')
}

{
  const node = parseTag('<figure src=x | See <em | bold> text.>')
  assert.equal(node.content, ' See <em | bold> text.')
  console.log('PASS: nested tag-like content does not close outer tag early')
}

{
  const node = parseTag('<figure | a < b or c>')
  assert.equal(node.content, ' a < b or c')
  console.log('PASS: < followed by space is literal (rule B)')
}

{
  const node = parseInlineTag('Text with <cite jones2001> inline.')
  assert.equal(node.tagname, 'cite')
  assert.deepEqual(node.positional, ['jones2001'])
  console.log('PASS: inline named tag inside paragraph')
}

{
  const node = parseTag('<aside | This is a note.>')
  assert.equal(node.tagname, 'aside')
  assert.equal(node.content, ' This is a note.')
  console.log('PASS: <aside | content> with no attributes')
}

{
  const node = parseTag('<div | Hello <em>bold</em> world.>')
  assert.equal(node.content, ' Hello <em>bold</em> world.')
  console.log('PASS: </tag> in content tracked by depth (/ treated as tag-like)')
}

console.log('\nAll Slice 2 integration tests passed.')

// ─── Slice 3: identifier rules ─────────────────────────────────────────────

{
  const node = parseTag('<ref #fig:body-cross-section>')
  assert.equal(node.tagname, 'ref')
  assert.equal(node.id, 'fig:body-cross-section')
  console.log('PASS: colon in id value #fig:body-cross-section')
}

{
  const node = parseTag('<ref #sec:intro-background>')
  assert.equal(node.id, 'sec:intro-background')
  console.log('PASS: colon and hyphen together in id')
}

{
  const node = parseTag('<img src=v1.2.3.jpg>')
  assert.equal(node.kwargs.src, 'v1.2.3.jpg')
  console.log('PASS: dots in keyword value src=v1.2.3.jpg')
}

{
  const node = parseTag('<a https://example.com>')
  assert.deepEqual(node.positional, ['https://example.com'])
  console.log('PASS: URL as positional (colon and slashes)')
}

{
  const node = parseTag('<div +active>')
  assert.deepEqual(node.booleans, { active: true })
  assert.deepEqual(node.positional, [])
  console.log('PASS: + at token start is BoolTrue, not positional')
}

{
  const node = parseTag('<div -hidden>')
  assert.deepEqual(node.booleans, { hidden: false })
  assert.deepEqual(node.positional, [])
  console.log('PASS: - at token start is BoolFalse, not positional')
}

{
  const node = parseTag('<div #myid>')
  assert.equal(node.id, 'myid')
  assert.deepEqual(node.positional, [])
  console.log('PASS: # at token start is Id, not positional')
}

{
  const node = parseTag('<div .container>')
  assert.deepEqual(node.classes, ['container'])
  assert.deepEqual(node.positional, [])
  console.log('PASS: . at token start is Class, not positional')
}

console.log('\nAll Slice 3 integration tests passed.')

// ─── Slice 3.5: dollar and backtick sigil families ─────────────────────────

{
  const node = parseTag('<$ x^2 $>')
  assert.equal(node.tagname, '$')
  assert.equal(node.content, ' x^2 ')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(node.id, null)
  assert.deepEqual(node.classes, [])
  console.log('PASS: basic <$ ... $> no-| form')
}

{
  const node = parseTag('<$$ \\frac{x}{2} $$>')
  assert.equal(node.tagname, '$$')
  assert.equal(node.content, ' \\frac{x}{2} ')
  console.log('PASS: <$$ ... $$> display math')
}

{
  const node = parseTag('<$ #myeq | x^2 $>')
  assert.equal(node.tagname, '$')
  assert.equal(node.id, 'myeq')
  assert.equal(node.content, ' x^2 ')
  console.log('PASS: <$ #id | content $> with attribute')
}

{
  const node = parseTag('<$$ | \\sum_{i=0}^{n} x_i $$>')
  assert.equal(node.tagname, '$$')
  assert.equal(node.content, ' \\sum_{i=0}^{n} x_i ')
  console.log('PASS: <$$ | content $$> bare pipe form')
}

{
  const node = parseTag('<$$ has $ one dollar $$>')
  assert.equal(node.tagname, '$$')
  assert.equal(node.content, ' has $ one dollar ')
  console.log('PASS: single $ inside $$ tag is not a closer')
}

{
  const node = parseTag('<` code `>')
  assert.equal(node.tagname, '`')
  assert.equal(node.content, ' code ')
  assert.equal(node.isOpaqueContent, true)
  console.log('PASS: basic <` ... `> no-| form')
}

{
  const node = parseTag('<``` block ```>')
  assert.equal(node.tagname, '```')
  assert.equal(node.content, ' block ')
  console.log('PASS: <``` ... ```> code block')
}

{
  const node = parseTag('<` #mycode | inline `>')
  assert.equal(node.tagname, '`')
  assert.equal(node.id, 'mycode')
  assert.equal(node.content, ' inline ')
  console.log('PASS: <` #id | content `> with attribute')
}

{
  const node = parseTag('<``` has ` one backtick ```>')
  assert.equal(node.tagname, '```')
  assert.equal(node.content, ' has ` one backtick ')
  console.log('PASS: single ` inside ``` tag is not a closer')
}

{
  const node = parseTag('<figure | nested <$ x $>>')
  assert.equal(node.tagname, 'figure')
  assert.equal(node.content, ' nested <$ x $>')
  console.log('PASS: $ sigil in named-tag content does not close outer tag')
}

{
  const node = parseTag('<div | code: <` foo `> done>')
  assert.equal(node.tagname, 'div')
  assert.equal(node.content, ' code: <` foo `> done')
  console.log('PASS: ` sigil in named-tag content does not close outer tag')
}

console.log('\nAll Slice 3.5 integration tests passed.')

// ─── Inline sigil tags (text-position registration) ───────────────────────

{
  const node = parseInlineTag('The formula <$ E = mc^2 $> is famous.')
  assert.equal(node.tagname, '$')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(node.content, ' E = mc^2 ')
  console.log('PASS: inline <$> math sigil in paragraph')
}

{
  const node = parseInlineTag('Call <` foo() `> to start.')
  assert.equal(node.tagname, '`')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(node.content, ' foo() ')
  console.log('PASS: inline <`> code sigil in paragraph')
}

{
  const node = parseInlineTag('Before <# heading #> after.')
  assert.equal(node.tagname, '#')
  assert.equal(node.isOpaqueContent, false)
  assert.equal(node.content, ' heading ')
  console.log('PASS: inline <#> heading sigil in paragraph')
}

{
  const tree = parse('Inline <$ a^2 $> and <` code `> here.')
  const para = tree.children.find((n) => n.type === 'paragraph')
  const tags = para.children.filter((n) => n.type === 'acadamarkTag')
  assert.equal(tags.length, 2)
  assert.equal(tags[0].tagname, '$')
  assert.equal(tags[0].content, ' a^2 ')
  assert.equal(tags[1].tagname, '`')
  assert.equal(tags[1].content, ' code ')
  console.log('PASS: multiple inline sigil tags in same paragraph')
}

{
  const tree = parse('The *important* formula <$ E = mc^2 $> is *famous*.')
  const para = tree.children.find((n) => n.type === 'paragraph')
  const tag = para.children.find((n) => n.type === 'acadamarkTag')
  assert.ok(tag, 'acadamarkTag exists in paragraph')
  assert.equal(tag.tagname, '$')
  assert.equal(tag.content, ' E = mc^2 ')
  const emphNodes = para.children.filter((n) => n.type === 'emphasis')
  assert.equal(emphNodes.length, 2)
  console.log('PASS: inline sigil mixed with bare markdown emphasis')
}

console.log('\nAll inline sigil text-position tests passed.')

// ─── Multi-line sigil constructs (flow position) ──────────────────────────
// These were formerly expected to error; multi-line is now supported in flow.

{
  // Multi-line backtick sigil: opener, body, and closer on separate lines.
  const src = '<```\nsome code\n```>'
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'acadamarkTag')
  assert.ok(node, 'multi-line backtick sigil parses to acadamarkTag')
  assert.equal(node.tagname, '```')
  assert.equal(node.content, '\nsome code\n')
  console.log('PASS: multi-line backtick sigil parses correctly (flow)')
}

{
  // Multi-line hash sigil: opener, body, and closer on separate lines.
  const src = '<#\nheading content\n#>'
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'acadamarkTag')
  assert.ok(node, 'multi-line hash sigil parses to acadamarkTag')
  assert.equal(node.tagname, '#')
  assert.equal(node.content, '\nheading content\n')
  console.log('PASS: multi-line hash sigil parses correctly (flow)')
}

console.log('\nAll multi-line flow sigil tests passed.')

// ─── acadamarkTagError node shape (spec tripwire) ─────────────────────────
// This test asserts exact property names. If from-markdown.js ever changes
// the property names it emits, this test catches the drift against the spec.

{
  const src = '<# unclosed heading\n'
  const tree = parse(src)
  const errNode = tree.children.find((n) => n.type === 'acadamarkTagError')
  assert.ok(errNode, 'error node present')
  assert.equal(typeof errNode.source, 'string', 'error node has .source (string)')
  assert.equal(typeof errNode.error, 'string', 'error node has .error (string)')
  assert.ok(errNode.source.startsWith('<'), '.source starts with <')
  console.log('PASS: acadamarkTagError node has correct property names (source, error)')
}

console.log('\nAll error-node shape tests passed.')

// ─── IdentifierCont `=` fix — URL query strings ───────────────────────────

{
  const node = parseTag('<a https://example.com?q=value | link>')
  assert.equal(node.tagname, 'a')
  assert.deepEqual(node.positional, ['https://example.com?q=value'])
  assert.equal(node.content, ' link')
  console.log('PASS: URL with single query param as positional')
}

{
  const node = parseTag('<a https://example.com?q=1&page=2 | link>')
  assert.equal(node.tagname, 'a')
  assert.deepEqual(node.positional, ['https://example.com?q=1&page=2'])
  assert.equal(node.content, ' link')
  console.log('PASS: URL with multiple query params as positional')
}

{
  // Keyword value containing `=`: keyword parsing must be unaffected
  const node = parseTag('<cite href=https://example.com?q=value>')
  assert.equal(node.tagname, 'cite')
  assert.equal(node.kwargs.href, 'https://example.com?q=value')
  console.log('PASS: keyword value containing `=` (URL query string)')
}

console.log('\nAll IdentifierCont `=` fix tests passed.')

// ─── Slice 4: Long-form tags ───────────────────────────────────────────────

function parseLongFormTag(src) {
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'acadamarkTag' || n.type === 'acadamarkTagError')
  if (!node) throw new Error(`No acadamarkTag/Error in: ${JSON.stringify(src)}`)
  return node
}

{
  // DSL-registered tag, no attributes
  const node = parseLongFormTag('<csv>\na,b,c\n1,2,3\n</csv>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'csv')
  assert.equal(node.contentHandler, 'csv')
  assert.equal(node.content, '\na,b,c\n1,2,3\n')
  assert.equal(node.isOpaqueContent, true)
  assert.deepEqual(node.positional, [])
  assert.deepEqual(node.booleans, {})
  assert.deepEqual(node.kwargs, {})
  assert.equal(node.id, null)
  assert.deepEqual(node.classes, [])
  console.log('PASS: DSL long-form tag (csv) with no attributes')
}

{
  // DSL tag with attributes
  const node = parseLongFormTag('<math #eq1 .display>\nx = 1\n</math>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'math')
  assert.equal(node.contentHandler, 'math')
  assert.equal(node.id, 'eq1')
  assert.deepEqual(node.classes, ['display'])
  assert.equal(node.content, '\nx = 1\n')
  console.log('PASS: DSL long-form tag (math) with id and class attributes')
}

{
  // Non-DSL long-form tag gets contentHandler "default"
  const node = parseLongFormTag('<theorem>\nAll primes greater than 2 are odd.\n</theorem>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'theorem')
  assert.equal(node.contentHandler, 'theorem')
  assert.equal(node.content, '\nAll primes greater than 2 are odd.\n')
  console.log('PASS: DSL long-form tag (theorem) gets its handler name')
}

{
  // Registered structural tag with default handler (aside → "default")
  const node = parseLongFormTag('<aside>\nSome aside text.\n</aside>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'aside')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.content, '\nSome aside text.\n')
  console.log('PASS: registered structural long-form tag gets contentHandler "default" (aside)')
}

{
  // Unregistered tag at block level falls through to short-form, with
  // following content preserved as a separate paragraph.
  // This is the regression test for the bug where tokenizeLongFormTag
  // greedily consumed the entire document for any block-level named tag
  // followed by a newline, before the registry check was added.
  const src = '<quux>\n\nSome following content.'
  const tree = parse(src)
  const tagNode = tree.children.find((n) => n.type === 'acadamarkTag')
  assert.ok(tagNode, 'unregistered tag parsed as short-form acadamarkTag')
  assert.equal(tagNode.tagname, 'quux')
  assert.equal(tagNode.form, 'short')
  const para = tree.children.find((n) => n.type === 'paragraph')
  assert.ok(para, 'following paragraph preserved, not eaten by long-form tokenizer')
  assert.equal(tree.children.filter((n) => n.type === 'acadamarkTagError').length, 0, 'no error nodes')
  console.log('PASS: unregistered tag at block level falls through to short-form, following content preserved')
}

{
  // Multi-line content
  const node = parseLongFormTag('<csv>\nfirst line\nsecond line\nthird line\n</csv>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.content, '\nfirst line\nsecond line\nthird line\n')
  console.log('PASS: long-form tag with multi-line content')
}

{
  // Content containing `<` not followed by alpha/sigil/slash (rule B: literal `<`)
  const node = parseLongFormTag('<csv>\nx < y\n</csv>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.content, '\nx < y\n')
  console.log('PASS: literal `<` (rule B) inside long-form content preserved')
}

{
  // Content containing `<word>` — looks like a tag but finder re-enters content
  const node = parseLongFormTag('<csv>\n<em>bold</em>\n</csv>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.content, '\n<em>bold</em>\n')
  console.log('PASS: tag-like content inside long-form is preserved verbatim')
}

{
  // Missing close tag — should produce acadamarkTagError
  const node = parseLongFormTag('<csv>\nno closer here\n')
  assert.equal(node.type, 'acadamarkTagError')
  assert.ok(node.error, 'error field set')
  console.log('PASS: missing close tag produces acadamarkTagError')
}

{
  // Long-form followed by short-form in the same document
  const src = '<csv>\na,b\n</csv>\n<cite jones2001>'
  const tree = parse(src)
  const tags = tree.children.filter((n) => n.type === 'acadamarkTag')
  assert.equal(tags.length, 2)
  assert.equal(tags[0].form, 'long')
  assert.equal(tags[0].tagname, 'csv')
  assert.equal(tags[1].form, 'short')
  assert.equal(tags[1].tagname, 'cite')
  console.log('PASS: long-form and short-form tags adjacent in same document')
}

{
  // Keyword attribute on long-form opener
  const node = parseLongFormTag('<csv delimiter=",">\na,b,c\n</csv>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.tagname, 'csv')
  assert.equal(node.kwargs.delimiter, ',')
  assert.equal(node.content, '\na,b,c\n')
  console.log('PASS: long-form tag with keyword attribute on opener')
}

{
  // `|` in opening tag causes long-form finder to reject and fall through to
  // short-form named-tag finder, parsing as a short-form tag.
  const node = parseLongFormTag('<csv header=true | inline content>')
  assert.equal(node.form, 'short')
  assert.equal(node.tagname, 'csv')
  assert.equal(node.content, ' inline content')
  console.log('PASS: `|` in opener rejects long-form, falls through to short-form')
}

{
  // Long-form tag with attributes: boolean flags
  const node = parseLongFormTag('<mermaid +dark>\ngraph TD\n  A --> B\n</mermaid>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.tagname, 'mermaid')
  assert.equal(node.booleans.dark, true)
  assert.equal(node.content, '\ngraph TD\n  A --> B\n')
  console.log('PASS: long-form tag with boolean attribute on opener')
}

console.log('\nAll Slice 4 long-form tag tests passed.')
console.log('\n74/74 tests passed.')

// ─── Escape rules ─────────────────────────────────────────────────────────
// Tests 1-11 of the escape-rules spec (test 8 rewritten per design decision
// that quoted attribute values are stored verbatim by acadamark).

// Test 1: \| in named-tag content → literal |
{
  const node = parseTag('<aside | The pipe \\| is the separator.>')
  assert.equal(typeof node.content, 'string')
  assert.equal(node.content, ' The pipe | is the separator.')
  console.log('PASS escape: \\| in named-tag content → literal |')
}

// Test 2: \< in named-tag content → literal <
{
  const node = parseTag('<aside | a \\< b>')
  assert.equal(typeof node.content, 'string')
  assert.equal(node.content, ' a < b')
  console.log('PASS escape: \\< in named-tag content → literal <')
}

// Test 3: \\ in named-tag content → literal \
{
  const node = parseTag('<aside | escape is \\\\.>')
  assert.equal(typeof node.content, 'string')
  assert.equal(node.content, ' escape is \\.')
  console.log('PASS escape: \\\\ in named-tag content → literal \\')
}

// Test 4: \* in named-tag content → pass-through \* (markdown, not acadamark)
{
  const node = parseTag('<aside | She wrote \\*literally\\*.>')
  assert.equal(typeof node.content, 'string')
  assert.equal(node.content, ' She wrote \\*literally\\*.')
  console.log('PASS escape: \\* in named-tag content → pass-through \\*')
}

// Test 5: \q in named-tag content → acadamarkParseError node
{
  const node = parseTag('<aside | path \\q end.>')
  assert.ok(Array.isArray(node.content), 'content is mixed array')
  const err = node.content.find(item => typeof item !== 'string')
  assert.ok(err, 'error node present')
  assert.equal(err.type, 'acadamarkParseError')
  assert.equal(err.subtype, 'unknown-escape-sequence')
  assert.equal(err.source, '\\q')
  console.log('PASS escape: \\q in named-tag content → acadamarkParseError node')
}

// Test 6: trailing \ in named-tag content → acadamarkParseError node
{
  const node = parseTag('<aside | text \\>')
  assert.ok(Array.isArray(node.content), 'content is mixed array')
  const err = node.content.find(item => typeof item !== 'string')
  assert.ok(err, 'error node present')
  assert.equal(err.type, 'acadamarkParseError')
  assert.equal(err.source, '\\')
  console.log('PASS escape: trailing \\ in named-tag content → acadamarkParseError node')
}

// Test 7: \, in bracketed list → single list item containing comma
{
  const node = parseTag('<cite [smith2024\\, jones2024]>')
  assert.deepEqual(node.positional, [['smith2024, jones2024']])
  console.log('PASS escape: [key1\\, key2] in bracketed list → single item with comma')
}

// Test 8 (rewritten): backslash in quoted attribute value stored verbatim by acadamark.
// \" inside same-quote type closes the grammar's value prematurely (no escape processing).
// The spec says: switch quote types to embed a quote. Here we confirm backslash is stored as-is.
{
  const node = parseTag('<figure caption="path\\value">')
  assert.equal(node.kwargs.caption, 'path\\value')
  console.log('PASS escape: backslash in double-quoted attribute stored verbatim')
}

// Test 9: \frac in math sigil → preserved verbatim (opaque content)
{
  const node = parseTag('<$ \\frac{x}{y} $>')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(node.content, ' \\frac{x}{y} ')
  console.log('PASS escape: \\frac in math sigil preserved verbatim (opaque)')
}

// Test 10: \n in backtick sigil → preserved verbatim (opaque content)
{
  const node = parseTag('<` C:\\new\\folder `>')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(node.content, ' C:\\new\\folder ')
  console.log('PASS escape: backslash sequences in backtick sigil preserved verbatim (opaque)')
}

// Test 11: \< in hash sigil body → literal < (prose content)
{
  const node = parseTag('<# a \\< b #>')
  assert.equal(typeof node.content, 'string')
  assert.equal(node.content, ' a < b ')
  console.log('PASS escape: \\< in hash sigil body → literal <')
}

// Test 12: \q in hash sigil body → acadamarkParseError node
{
  const node = parseTag('<# intro \\q heading #>')
  assert.ok(Array.isArray(node.content), 'hash sigil content is mixed array on unknown escape')
  const err = node.content.find(item => typeof item !== 'string')
  assert.ok(err, 'error node present')
  assert.equal(err.type, 'acadamarkParseError')
  assert.equal(err.source, '\\q')
  console.log('PASS escape: \\q in hash sigil body → acadamarkParseError node')
}

console.log('\nAll escape-rules integration tests passed.')
console.log('\n86/86 tests passed.')

// ─── Multi-line constructs ────────────────────────────────────────────────
// Integration tests for line-ending support across all construct regions.
// All tests use flow position (block-level parsing) where multi-line is allowed.
// For text-position (inline), multi-line is intentionally disallowed.

// Test ML-1: Attributes spanning multiple lines (named tag, flow)
{
  const node = parseTag('<figure\n  #fig1\n  .landscape\n  caption="Elephant">')
  assert.equal(node.tagname, 'figure')
  assert.equal(node.id, 'fig1')
  assert.deepEqual(node.classes, ['landscape'])
  assert.equal(node.kwargs.caption, 'Elephant')
  console.log('PASS multi-line: attributes spanning multiple lines (named tag)')
}

// Test ML-2: Named-tag content spanning multiple lines
{
  const node = parseTag('<aside | line one\nline two\nline three>')
  assert.equal(node.tagname, 'aside')
  assert.ok(node.content.includes('line one'), 'first line in content')
  assert.ok(node.content.includes('line two'), 'second line in content')
  assert.ok(node.content.includes('line three'), 'third line in content')
  console.log('PASS multi-line: named-tag content spanning multiple lines')
}

// Test ML-3: Multi-line hash sigil heading
{
  const node = parseTag('<#\nA Long Heading\n#>')
  assert.equal(node.tagname, '#')
  assert.equal(node.content, '\nA Long Heading\n')
  console.log('PASS multi-line: hash sigil body spanning multiple lines')
}

// Test ML-4: Multi-line dollar sigil (math, opaque)
{
  const node = parseTag('<$\n\\frac{a}{b} + \\frac{c}{d}\n$>')
  assert.equal(node.tagname, '$')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(node.content, '\n\\frac{a}{b} + \\frac{c}{d}\n')
  console.log('PASS multi-line: dollar sigil (math) body spanning multiple lines')
}

// Test ML-5: Multi-line triple-backtick sigil (code, opaque)
{
  const node = parseTag('<```\nfunction hello() {\n  return 42\n}\n```>')
  assert.equal(node.tagname, '```')
  assert.equal(node.isOpaqueContent, true)
  assert.ok(node.content.includes('function hello()'), 'code content preserved')
  assert.ok(node.content.includes('return 42'), 'inner code line preserved')
  console.log('PASS multi-line: triple-backtick sigil body spanning multiple lines')
}

// Test ML-6: Multi-line bracketed list in attribute section
{
  const node = parseTag('<cite\n  [smith2024,\n  jones2024]>')
  assert.equal(node.tagname, 'cite')
  const list = node.positional.find(Array.isArray)
  assert.ok(list, 'bracketed list found in positionals')
  assert.equal(list.length, 2)
  assert.equal(list[0].trim(), 'smith2024')
  assert.equal(list[1].trim(), 'jones2024')
  console.log('PASS multi-line: bracketed list with newlines between items')
}

// Test ML-7: Quoted attribute value with embedded newline → not recognized as acadamark.
// In `attrSection`, `scanQuoted` returns nok() on any line ending regardless of
// multiLine mode. The construct is rejected by the tokenizer and falls through
// to remark's HTML handler — no acadamarkTag or acadamarkTagError is produced.
// (This is a design choice: quoted values are always single-line, matching HTML.)
{
  const tree = parse('<figure caption="line one\nline two">')
  const acadamarkNodes = tree.children.filter(
    (n) => n.type === 'acadamarkTag' || n.type === 'acadamarkTagError',
  )
  assert.equal(acadamarkNodes.length, 0, 'no acadamark nodes — construct not recognized')
  console.log('PASS multi-line: quoted attribute value with embedded newline → not recognized as acadamark (falls through to HTML)')
}

// Test ML-8: Unterminated multi-line construct (EOF before closer) → acadamarkTagError
// The tokenizer emits tokens up to EOF; the grammar then fails to find the closer.
{
  const tree = parse('<$ x + y\n')
  const errNode = tree.children.find((n) => n.type === 'acadamarkTagError')
  assert.ok(errNode, 'acadamarkTagError for unterminated multi-line dollar sigil')
  console.log('PASS multi-line: unterminated multi-line construct (EOF) → acadamarkTagError')
}

// Test ML-9: Escape sequences work correctly inside multi-line content
// A named-tag content region spanning multiple lines still applies escape processing.
{
  const node = parseTag('<aside | line one \\| not-a-separator\nline two>')
  assert.equal(node.tagname, 'aside')
  const contentStr = Array.isArray(node.content)
    ? node.content.map((x) => (typeof x === 'string' ? x : '')).join('')
    : node.content
  assert.ok(contentStr.includes('|'), 'escaped pipe rendered as literal |')
  assert.ok(contentStr.includes('line two'), 'second line present')
  console.log('PASS multi-line: escape sequences work in multi-line content')
}

// Test ML-10: Mixed single-line and multi-line tags in same document
{
  const src = '<cite jones2001>\n\n<figure\n  #fig1\n  caption="Elephant"\n>\n\n<aside | short>'
  const tree = parse(src)
  const tags = tree.children.filter((n) => n.type === 'acadamarkTag')
  assert.ok(tags.length >= 3, `expected ≥ 3 acadamarkTag nodes, got ${tags.length}`)
  const cite = tags.find((n) => n.tagname === 'cite')
  assert.ok(cite, 'cite tag found')
  const fig = tags.find((n) => n.tagname === 'figure')
  assert.ok(fig, 'figure tag found')
  assert.equal(fig.id, 'fig1')
  const aside = tags.find((n) => n.tagname === 'aside')
  assert.ok(aside, 'aside tag found')
  console.log('PASS multi-line: mixed single-line and multi-line tags in same document')
}

// Test ML-11: Multi-line long-form opener (attributes spanning lines on opener)
{
  const node = parseLongFormTag('<csv\n  delimiter=","\n  +header>\na,b,c\n</csv>')
  assert.equal(node.type, 'acadamarkTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'csv')
  assert.equal(node.kwargs.delimiter, ',')
  assert.equal(node.booleans.header, true)
  assert.equal(node.content, '\na,b,c\n')
  console.log('PASS multi-line: long-form opener with attributes spanning multiple lines')
}

console.log('\nAll multi-line integration tests passed.')
console.log('\n97/97 tests passed.')
