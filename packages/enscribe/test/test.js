/**
 * Integration tests — full remark pipeline.
 *
 * These tests run the complete micromark finder → fromMarkdown → mdast path.
 * They verify that boundary detection in syntax.js and Peggy parsing in
 * from-markdown.js compose correctly into the final enscribeTag node.
 *
 * The 29 cases here match the pure-micromark archive exactly, confirming
 * parity between the two implementations.
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkEnscribe from '../src/parser/index.js'
import assert from 'node:assert/strict'

function parse(src) {
  return unified().use(remarkParse).use(remarkEnscribe).parse(src)
}

function parseTag(src) {
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'enscribeTag')
  if (!node) throw new Error(`No enscribeTag in: ${JSON.stringify(src)}`)
  return node
}

function parseInlineTag(src) {
  const tree = parse(src)
  for (const child of tree.children) {
    if (child.type === 'paragraph' && child.children) {
      const tag = child.children.find((n) => n.type === 'enscribeTag')
      if (tag) return tag
    }
  }
  throw new Error(`No inline enscribeTag in: ${JSON.stringify(src)}`)
}

// ─── Slice 1: Sigil tags ───────────────────────────────────────────────────

{
  const node = parseTag('<# Introduction #>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.tagname, '#')
  assert.equal(node.content, ' Introduction ')
  assert.equal(node.isOpaqueContent, false)
  assert.equal(node.id, null)
  assert.deepEqual(node.classes, [])
  console.log('PASS: basic <# ... #> produces enscribeTag')
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
  assert.deepEqual(types, ['paragraph', 'enscribeTag', 'paragraph'])
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
  const node = parseTag('<cite @jones2001>')
  assert.equal(node.tagname, 'cite')
  assert.deepEqual(node.atRefs, ['jones2001'])
  assert.deepEqual(node.positional, [])
  assert.equal(node.content, null)
  assert.equal(node.isOpaqueContent, false)
  console.log('PASS: <cite @jones2001> → named tag, single atRef')
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
  const node = parseTag('<cite @jones2001 @smith2022>')
  assert.deepEqual(node.atRefs, ['jones2001', 'smith2022'])
  assert.deepEqual(node.positional, [])
  console.log('PASS: multiple atRefs from space-separated @-tokens')
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
  const node = parseTag('<cite [@smith2017, @jones2023]>')
  assert.deepEqual(node.positional, [['@smith2017', '@jones2023']])
  assert.deepEqual(node.atRefs, [])
  console.log('PASS: bracketed list with @ keys')
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
  const node = parseInlineTag('Text with <cite @jones2001> inline.')
  assert.equal(node.tagname, 'cite')
  assert.deepEqual(node.atRefs, ['jones2001'])
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
  const node = parseTag('<ref @fig:body-cross-section>')
  assert.equal(node.tagname, 'ref')
  assert.deepEqual(node.atRefs, ['fig:body-cross-section'])
  assert.equal(node.id, null)
  console.log('PASS: colon in atRef value @fig:body-cross-section')
}

{
  const node = parseTag('<ref @sec:intro-background>')
  assert.deepEqual(node.atRefs, ['sec:intro-background'])
  console.log('PASS: colon and hyphen together in atRef')
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
  const tags = para.children.filter((n) => n.type === 'enscribeTag')
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
  const tag = para.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'enscribeTag exists in paragraph')
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
  const node = tree.children.find((n) => n.type === 'enscribeTag')
  assert.ok(node, 'multi-line backtick sigil parses to enscribeTag')
  assert.equal(node.tagname, '```')
  assert.equal(node.content, '\nsome code\n')
  console.log('PASS: multi-line backtick sigil parses correctly (flow)')
}

{
  // Multi-line hash sigil: opener, body, and closer on separate lines.
  const src = '<#\nheading content\n#>'
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'enscribeTag')
  assert.ok(node, 'multi-line hash sigil parses to enscribeTag')
  assert.equal(node.tagname, '#')
  assert.equal(node.content, '\nheading content\n')
  console.log('PASS: multi-line hash sigil parses correctly (flow)')
}

console.log('\nAll multi-line flow sigil tests passed.')

// ─── enscribeTagError node shape (spec tripwire) ─────────────────────────
// This test asserts exact property names. If from-markdown.js ever changes
// the property names it emits, this test catches the drift against the spec.

{
  const src = '<# unclosed heading\n'
  const tree = parse(src)
  const errNode = tree.children.find((n) => n.type === 'enscribeTagError')
  assert.ok(errNode, 'error node present')
  assert.equal(typeof errNode.source, 'string', 'error node has .source (string)')
  assert.equal(typeof errNode.error, 'string', 'error node has .error (string)')
  assert.ok(errNode.source.startsWith('<'), '.source starts with <')
  console.log('PASS: enscribeTagError node has correct property names (source, error)')
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
  const node = tree.children.find((n) => n.type === 'enscribeTag' || n.type === 'enscribeTagError')
  if (!node) throw new Error(`No enscribeTag/Error in: ${JSON.stringify(src)}`)
  return node
}

{
  // DSL-registered tag, no attributes
  const node = parseLongFormTag('<csv>\na,b,c\n1,2,3\n</csv>')
  assert.equal(node.type, 'enscribeTag')
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
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'math')
  assert.equal(node.contentHandler, 'math')
  assert.equal(node.id, 'eq1')
  assert.deepEqual(node.classes, ['display'])
  assert.equal(node.content, '\nx = 1\n')
  console.log('PASS: DSL long-form tag (math) with id and class attributes')
}

{
  // <theorem> is regular vocabulary — not a DSL. Its body content is prose
  // (theorem statement), recursively parsed via the default handler.
  // Updated 2026-05-27 by the DSL/long-form parser bug fix: the line-45
  // placeholder ['theorem', 'theorem'] in DSL_REGISTRY (pointing at a
  // non-existent dedicated handler) was removed. <theorem> now follows
  // the unregistered-tag default-handler path like every other regular-
  // vocabulary tag. The Phase-2 theorem-family handler (numbering, label
  // rendering, QED, optional-name display) operates on the parsed tree;
  // it does not own the content-handler dispatch.
  const node = parseLongFormTag('<theorem>\nAll primes greater than 2 are odd.\n</theorem>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'theorem')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.content, '\nAll primes greater than 2 are odd.\n')
  console.log('PASS: <theorem> long-form gets default handler (regular vocab; post-DSL-purge)')
}

{
  // Registered structural tag with default handler (aside → "default")
  const node = parseLongFormTag('<aside>\nSome aside text.\n</aside>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'aside')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.content, '\nSome aside text.\n')
  console.log('PASS: registered structural long-form tag gets contentHandler "default" (aside)')
}

{
  // DSL/long-form parser bug fix (2026-05-27): the long-form tokenizer no
  // longer gates on registry membership. Every named tag is long-form-
  // eligible. The grammar disambiguates the three forms locally:
  //
  //   <tag attrs | content>  — short-form with body content (pipe form)
  //   <tag attrs />          — short-form with no body content (slash form)
  //   <tag attrs>...</tag>   — long-form (opener + close)
  //
  // For an unregistered tag like <quux> at line-start with no pipe and no
  // slash, the parser commits to long-form and scans for </quux>. If no
  // close exists, the EOF-reached tokenizer marks the node as
  // enscribeTagError (the always-renders pattern).
  const src = '<quux>\n\nSome following content.'
  const tree = parse(src)
  const errNode = tree.children.find((n) => n.type === 'enscribeTagError')
  assert.ok(errNode, 'bare <quux> with no </quux> produces enscribeTagError (post-D1; empty short-form requires /)')
  console.log('PASS: unregistered tag with no closing tag produces enscribeTagError (post-D1 grammar)')
}

{
  // Companion: the short-form-no-content path for the same tag is `<quux />`
  // (slash form). The author who wants the old behavior — a bare `<quux>`
  // with following content as a separate paragraph — writes `<quux />`
  // instead. Demonstrates the D1 authoring shape.
  const src = '<quux />\n\nSome following content.'
  const tree = parse(src)
  const tagNode = tree.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tagNode, 'short-form-no-content <quux /> parses as enscribeTag')
  assert.equal(tagNode.tagname, 'quux')
  assert.equal(tagNode.form, 'short')
  assert.equal(tagNode.selfClosing, true)
  const para = tree.children.find((n) => n.type === 'paragraph')
  assert.ok(para, 'following paragraph preserved')
  console.log('PASS: short-form-no-content <quux /> parses correctly; following paragraph preserved (post-D1)')
}

{
  // Multi-line content
  const node = parseLongFormTag('<csv>\nfirst line\nsecond line\nthird line\n</csv>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.content, '\nfirst line\nsecond line\nthird line\n')
  console.log('PASS: long-form tag with multi-line content')
}

{
  // Content containing `<` not followed by alpha/sigil/slash (rule B: literal `<`)
  const node = parseLongFormTag('<csv>\nx < y\n</csv>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.content, '\nx < y\n')
  console.log('PASS: literal `<` (rule B) inside long-form content preserved')
}

{
  // Content containing `<word>` — looks like a tag but finder re-enters content
  const node = parseLongFormTag('<csv>\n<em>bold</em>\n</csv>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.content, '\n<em>bold</em>\n')
  console.log('PASS: tag-like content inside long-form is preserved verbatim')
}

{
  // Missing close tag — should produce enscribeTagError
  const node = parseLongFormTag('<csv>\nno closer here\n')
  assert.equal(node.type, 'enscribeTagError')
  assert.ok(node.error, 'error field set')
  console.log('PASS: missing close tag produces enscribeTagError')
}

{
  // Long-form followed by short-form in the same document
  const src = '<csv>\na,b\n</csv>\n<cite @jones2001>'
  const tree = parse(src)
  const tags = tree.children.filter((n) => n.type === 'enscribeTag')
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
  assert.equal(node.type, 'enscribeTag')
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
  // Registered DSL tag with kwargs but no pipe and no body content — must
  // parse as a SHORT-FORM enscribeTag with content: null, not as a long-form
  // opener that searches for </table>. Regression guard for the closure of
  // AUD-04 (formerly filed in audit-findings.md), fixed by commit d882586:
  // the `afterOpenGt` discriminator routes same-line `>` to the short-form
  // named-tag tokenizer; only `>` followed by a line ending commits the
  // long-form opener.
  const src = '<table #tab:demo csv src=file.csv caption="Demo table">'
  const tree = parse(src)
  const tag = tree.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'short-form enscribeTag produced (not eaten by long-form tokenizer)')
  assert.equal(tag.form, 'short', 'form is short, not long')
  assert.equal(tag.tagname, 'table')
  assert.equal(tag.content, null, 'content is null (no pipe, no body)')
  assert.equal(tag.id, 'tab:demo')
  assert.deepEqual(tag.positional, ['csv'])
  assert.equal(tag.kwargs.src, 'file.csv')
  assert.equal(tag.kwargs.caption, 'Demo table')
  assert.equal(
    tree.children.filter((n) => n.type === 'enscribeTagError').length,
    0,
    'no enscribeTagError nodes (no missing </table> error)'
  )
  console.log('PASS: registered DSL tag with kwargs, no pipe, no content → short-form with content: null (AUD-04 regression guard)')
}

{
  // Long-form tag with attributes: boolean flags
  const node = parseLongFormTag('<mermaid +dark>\ngraph TD\n  A --> B\n</mermaid>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.tagname, 'mermaid')
  assert.equal(node.booleans.dark, true)
  assert.equal(node.content, '\ngraph TD\n  A --> B\n')
  console.log('PASS: long-form tag with boolean attribute on opener')
}

console.log('\nAll Slice 4 long-form tag tests passed.')
console.log('\n74/74 tests passed.')

// ─── Escape rules ─────────────────────────────────────────────────────────
// Tests 1-11 of the escape-rules spec (test 8 rewritten per design decision
// that quoted attribute values are stored verbatim by enscribe).

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

// Test 4: \* in named-tag content → pass-through \* (markdown, not enscribe)
{
  const node = parseTag('<aside | She wrote \\*literally\\*.>')
  assert.equal(typeof node.content, 'string')
  assert.equal(node.content, ' She wrote \\*literally\\*.')
  console.log('PASS escape: \\* in named-tag content → pass-through \\*')
}

// Test 5: \q in named-tag content → enscribeParseError node
{
  const node = parseTag('<aside | path \\q end.>')
  assert.ok(Array.isArray(node.content), 'content is mixed array')
  const err = node.content.find(item => typeof item !== 'string')
  assert.ok(err, 'error node present')
  assert.equal(err.type, 'enscribeParseError')
  assert.equal(err.subtype, 'unknown-escape-sequence')
  assert.equal(err.source, '\\q')
  console.log('PASS escape: \\q in named-tag content → enscribeParseError node')
}

// Test 6: trailing \ in named-tag content → enscribeParseError node
{
  const node = parseTag('<aside | text \\>')
  assert.ok(Array.isArray(node.content), 'content is mixed array')
  const err = node.content.find(item => typeof item !== 'string')
  assert.ok(err, 'error node present')
  assert.equal(err.type, 'enscribeParseError')
  assert.equal(err.source, '\\')
  console.log('PASS escape: trailing \\ in named-tag content → enscribeParseError node')
}

// Test 7: \, in bracketed list → single list item containing comma
{
  const node = parseTag('<cite [@smith2024\\, @jones2024]>')
  assert.deepEqual(node.positional, [['@smith2024, @jones2024']])
  console.log('PASS escape: [@key1\\, @key2] in bracketed list → single item with comma')
}

// Test 8 (rewritten): backslash in quoted attribute value stored verbatim by enscribe.
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

// Test 12: \q in hash sigil body → enscribeParseError node
{
  const node = parseTag('<# intro \\q heading #>')
  assert.ok(Array.isArray(node.content), 'hash sigil content is mixed array on unknown escape')
  const err = node.content.find(item => typeof item !== 'string')
  assert.ok(err, 'error node present')
  assert.equal(err.type, 'enscribeParseError')
  assert.equal(err.source, '\\q')
  console.log('PASS escape: \\q in hash sigil body → enscribeParseError node')
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
  const node = parseTag('<cite\n  [@smith2024,\n  @jones2024]>')
  assert.equal(node.tagname, 'cite')
  const list = node.positional.find(Array.isArray)
  assert.ok(list, 'bracketed list found in positionals')
  assert.equal(list.length, 2)
  assert.ok(list[0].includes('smith2024'), 'first item contains smith2024')
  assert.ok(list[1].includes('jones2024'), 'second item contains jones2024')
  console.log('PASS multi-line: bracketed list with @ keys and newlines between items')
}

// Test ML-7: Quoted attribute value with embedded newline → not recognized as enscribe.
// In `attrSection`, `scanQuoted` returns nok() on any line ending regardless of
// multiLine mode. The construct is rejected by the tokenizer and falls through
// to remark's HTML handler — no enscribeTag or enscribeTagError is produced.
// (This is a design choice: quoted values are always single-line, matching HTML.)
{
  const tree = parse('<figure caption="line one\nline two">')
  const enscribeNodes = tree.children.filter(
    (n) => n.type === 'enscribeTag' || n.type === 'enscribeTagError',
  )
  assert.equal(enscribeNodes.length, 0, 'no enscribe nodes — construct not recognized')
  console.log('PASS multi-line: quoted attribute value with embedded newline → not recognized as enscribe (falls through to HTML)')
}

// Test ML-8: Unterminated multi-line construct (EOF before closer) → enscribeTagError
// The tokenizer emits tokens up to EOF; the grammar then fails to find the closer.
{
  const tree = parse('<$ x + y\n')
  const errNode = tree.children.find((n) => n.type === 'enscribeTagError')
  assert.ok(errNode, 'enscribeTagError for unterminated multi-line dollar sigil')
  console.log('PASS multi-line: unterminated multi-line construct (EOF) → enscribeTagError')
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

// Test ML-10: Mixed single-line and multi-line tags in same document.
// Updated 2026-05-27 for the DSL/long-form parser bug fix (D1): short-form
// without body content requires `/>` so the long-form tokenizer doesn't
// claim the construct as an opener. `<cite @ref />` and the multi-line
// `<figure ... />` use slash form; `<aside | short>` is pipe form
// (unchanged).
{
  const src = '<cite @jones2001 />\n\n<figure\n  #fig1\n  caption="Elephant"\n/>\n\n<aside | short>'
  const tree = parse(src)
  const tags = tree.children.filter((n) => n.type === 'enscribeTag')
  assert.ok(tags.length >= 3, `expected ≥ 3 enscribeTag nodes, got ${tags.length}`)
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
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'csv')
  assert.equal(node.kwargs.delimiter, ',')
  assert.equal(node.booleans.header, true)
  assert.equal(node.content, '\na,b,c\n')
  console.log('PASS multi-line: long-form opener with attributes spanning multiple lines')
}

console.log('\nAll multi-line integration tests passed.')
console.log('\n97/97 tests passed.')

// ─── Parser Maturity: comma-separated positionals ─────────────────────────

console.log('\n--- Parser Maturity: comma-separated positionals ---')

// PM-1: Comma-only separator (<cite @a,@b>)
{
  const node = parseTag('<cite @Smith2020,@Jones2019>')
  assert.equal(node.tagname, 'cite')
  assert.deepEqual(node.atRefs, ['Smith2020', 'Jones2019'])
  assert.deepEqual(node.positional, [])
  console.log('PASS PM-1: comma-only separator produces two atRefs')
}

// PM-2: Comma-space separator (<cite @a, @b>)
{
  const node = parseTag('<cite @Smith2020, @Jones2019>')
  assert.deepEqual(node.atRefs, ['Smith2020', 'Jones2019'])
  console.log('PASS PM-2: comma-space separator produces two atRefs')
}

// PM-3: Space-comma-space separator (<cite @a , @b>)
{
  const node = parseTag('<cite @Smith2020 , @Jones2019>')
  assert.deepEqual(node.atRefs, ['Smith2020', 'Jones2019'])
  console.log('PASS PM-3: space-comma-space separator produces two atRefs')
}

// PM-4: Three atRefs with mixed separators (<tag @a,@b @c>)
{
  const node = parseTag('<tag @a,@b @c>')
  assert.deepEqual(node.atRefs, ['a', 'b', 'c'])
  console.log('PASS PM-4: three atRefs with mixed comma and space separators')
}

// PM-5: Comma separator between positionals and kwargs is independent
// The comma fix only affects the separator between attribute tokens;
// keyword syntax (k=v) still requires = for the assignment.
{
  const node = parseTag('<figure #fig1, caption="The caption">')
  assert.equal(node.id, 'fig1')
  assert.equal(node.kwargs.caption, 'The caption')
  console.log('PASS PM-5: comma between id attribute and kwarg parses correctly')
}

// ─── Parser Maturity: DSL_REGISTRY entries (data + library) ──────────────

console.log('\n--- Parser Maturity: DSL_REGISTRY entries ---')

// PM-6: <data> long-form — default content handler, not opaque
{
  const node = parseLongFormTag('<data>\nsome content here\n</data>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'data')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.isOpaqueContent, false)
  assert.equal(node.content, '\nsome content here\n')
  console.log('PASS PM-6: <data> long-form has contentHandler=default, isOpaqueContent=false')
}

// PM-7: <library> long-form — opaque content handler, content verbatim
{
  const node = parseLongFormTag('<library>\n@article{Smith2020, title={A Paper}}\n</library>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.form, 'long')
  assert.equal(node.tagname, 'library')
  assert.equal(node.contentHandler, 'library')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(node.content, '\n@article{Smith2020, title={A Paper}}\n')
  console.log('PASS PM-7: <library> long-form has contentHandler=library, isOpaqueContent=true, content verbatim')
}

// PM-8: <library> pipe form (short-form, opaque)
{
  const node = parseTag('<library | @article{Smith2020}>')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.tagname, 'library')
  assert.equal(node.contentHandler, 'library')
  assert.equal(node.isOpaqueContent, true)
  assert.ok(node.content.includes('@article{Smith2020}'))
  console.log('PASS PM-8: <library | bibtex> pipe form has contentHandler=library, isOpaqueContent=true')
}

// PM-9: <data> with nested long-form <library> — data content is verbatim string
// (recursive parsing is interpreter-level; at parse time, content is the raw string)
{
  const node = parseLongFormTag('<data>\n<library>\n@article{Smith2020}\n</library>\n</data>')
  assert.equal(node.tagname, 'data')
  assert.equal(node.form, 'long')
  assert.equal(node.contentHandler, 'default')
  assert.ok(node.content.includes('<library>'), 'nested library tag preserved in data content string')
  assert.ok(node.content.includes('@article{Smith2020}'))
  console.log('PASS PM-9: <data> content string preserves nested <library> for interpreter re-parsing')
}

// ─── Parser Maturity: self-closing form ──────────────────────────────────

console.log('\n--- Parser Maturity: self-closing form ---')

// PM-10: Basic <tag /> with no attributes
{
  const node = parseTag('<tag />')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.tagname, 'tag')
  assert.equal(node.selfClosing, true)
  assert.deepEqual(node.positional, [])
  assert.equal(node.content, null)
  console.log('PASS PM-10: <tag /> is selfClosing=true, no positional slash')
}

// PM-11: Self-closing with kwarg
{
  const node = parseTag('<library src="refs.bib" />')
  assert.equal(node.tagname, 'library')
  assert.equal(node.selfClosing, true)
  assert.equal(node.kwargs.src, 'refs.bib')
  assert.deepEqual(node.positional, [])
  console.log('PASS PM-11: <library src="refs.bib" /> is selfClosing=true with kwarg')
}

// PM-12: Self-closing with id and class
{
  const node = parseTag('<br #sep .divider />')
  assert.equal(node.tagname, 'br')
  assert.equal(node.selfClosing, true)
  assert.equal(node.id, 'sep')
  assert.deepEqual(node.classes, ['divider'])
  console.log('PASS PM-12: <br #sep .divider /> is selfClosing=true with id and class')
}

// PM-13: Self-closing with atRef
{
  const node = parseTag('<cite @Smith2020 />')
  assert.equal(node.tagname, 'cite')
  assert.equal(node.selfClosing, true)
  assert.deepEqual(node.atRefs, ['Smith2020'])
  console.log('PASS PM-13: <cite @Smith2020 /> is selfClosing=true with atRef')
}

// PM-14: Self-closing combined with comma-separated atRefs
{
  const node = parseTag('<cite @Smith2020, @Jones2019 />')
  assert.equal(node.tagname, 'cite')
  assert.equal(node.selfClosing, true)
  assert.deepEqual(node.atRefs, ['Smith2020', 'Jones2019'])
  console.log('PASS PM-14: <cite @Smith2020, @Jones2019 /> combines comma atRefs and self-closing')
}

// PM-15: Non-self-closing tag has selfClosing: false
{
  const node = parseTag('<cite @Smith2020>')
  assert.equal(node.selfClosing, false)
  console.log('PASS PM-15: non-self-closing tag has selfClosing=false')
}

// PM-16: Pipe-form tag has selfClosing: false
{
  const node = parseTag('<aside | some prose>')
  assert.equal(node.selfClosing, false)
  console.log('PASS PM-16: pipe-form tag has selfClosing=false')
}

// PM-17: Slash positional /path is still valid (lookahead is precise)
// The self-closing lookahead !("/" [ \t]* ">") only fires when "/" is
// immediately followed by optional whitespace and ">". "/path" does not
// trigger it, so <tag /path> still produces positional=['/path'].
{
  const node = parseTag('<tag /path>')
  assert.equal(node.tagname, 'tag')
  assert.equal(node.selfClosing, false)
  assert.deepEqual(node.positional, ['/path'])
  console.log('PASS PM-17: /path positional (lookahead precise: "/path" ≠ self-closing position)')
}

// PM-18: Self-closing with src kwarg — no trailing slash in kwarg value
{
  const node = parseTag('<img src="photo.jpg" />')
  assert.equal(node.tagname, 'img')
  assert.equal(node.selfClosing, true)
  assert.equal(node.kwargs.src, 'photo.jpg')
  assert.deepEqual(node.positional, [])
  console.log('PASS PM-18: <img src="photo.jpg" /> self-closing with quoted kwarg')
}

console.log('\nAll parser maturity tests passed.')

// ─── F1 ordering pin: AtRef before Positional ─────────────────────────────
// This test pins the AtRef-before-Positional ordering in the Attribute rule.
// If a future grammar edit accidentally reorders the alternatives, @key would
// be consumed by Positional first (since @ is a valid IdentifierStart) and
// this test would immediately catch the regression.

console.log('\n--- F1 ordering pin ---')

// @-prefixed attr must produce atRefs, not positional
{
  const node = parseTag('<ref @fig:priority>')
  assert.equal(node.tagname, 'ref')
  assert.deepEqual(node.atRefs, ['fig:priority'], '@fig:priority must land in atRefs')
  assert.deepEqual(node.positional, [], 'positional must be empty when @ is used')
  assert.equal(node.id, null, 'id must be null')
  console.log('PASS F1-ORDER: <ref @fig:priority> → atRefs=[\'fig:priority\'], positional=[]')
}

// Multi-key @-prefixed attrs
{
  const node = parseTag('<cite @smith2023, @jones2019>')
  assert.deepEqual(node.atRefs, ['smith2023', 'jones2019'])
  assert.deepEqual(node.positional, [])
  console.log("PASS F1-ORDER: multi-key @-prefixed cite → atRefs=['smith2023','jones2019']")
}

// # still assigns id (unchanged from pre-F1)
{
  const node = parseTag('<figure #fig:elephant>')
  assert.equal(node.id, 'fig:elephant', '# still assigns id')
  assert.deepEqual(node.atRefs, [], 'atRefs empty when # is used')
  console.log('PASS F1-ORDER: # still assigns id, atRefs=[]')
}

console.log('\nAll F1 ordering pin tests passed.')

// ─── G1b: inline TeX shortcuts — top-level prose tokenizer ───────────────────
//
// These tests exercise the micromark tokenizer for ^{...} and _{...} in top-
// level prose (outside any <...> tag). The tokenizer emits the same enscribeTag
// node shape as G1a's grammar rules, so both surfaces converge on identical
// nodes downstream.

console.log('\n--- G1b: top-level prose shortcut tokenizer ---')

function parseShortcutInProse(src) {
  const tree = parse(src)
  for (const block of tree.children) {
    if (block.type !== 'paragraph') continue
    const node = block.children.find(
      (n) => n.type === 'enscribeTag' && (n.tagname === 'sup' || n.tagname === 'sub'),
    )
    if (node) return node
  }
  throw new Error(`No shortcut (sup/sub) node in prose: ${JSON.stringify(src)}`)
}

// G1b-1: ^{st} in top-level prose → full node shape verification
{
  const node = parseShortcutInProse('The 1^{st} edition.')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.tagname, 'sup')
  assert.equal(node.form, 'shortcut')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.content, 'st')
  assert.equal(node.isOpaqueContent, false)
  assert.deepEqual(node.positional, [])
  assert.deepEqual(node.booleans, {})
  assert.deepEqual(node.kwargs, {})
  assert.equal(node.id, null)
  assert.deepEqual(node.classes, [])
  assert.deepEqual(node.atRefs, [])
  assert.equal(node.selfClosing, false)
  console.log('PASS G1b-1: 1^{st} in prose → sup node, all fields verified')
}

// G1b-2: _{2} in prose → sub node
{
  const node = parseShortcutInProse('H_{2}O')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.tagname, 'sub')
  assert.equal(node.form, 'shortcut')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.content, '2')
  console.log('PASS G1b-2: H_{2}O in prose → sub node')
}

// G1b-3: x^{y_{1}} — nested shortcut, content captured as raw string at tokenizer level
{
  const supNode = parseShortcutInProse('x^{y_{1}}')
  assert.equal(supNode.tagname, 'sup')
  // At tokenizer level, content is the raw brace interior string.
  // remarkRecursiveContent resolves _{1} into a sub node in a later pass.
  assert.equal(supNode.content, 'y_{1}')
  console.log('PASS G1b-3: x^{y_{1}} in prose → sup, content="y_{1}" (sub resolved by recursive-content)')
}

// G1b-4: bare ^ is literal text — NOT a shortcut
{
  const tree = parse('a^b in prose')
  const para = tree.children.find((n) => n.type === 'paragraph')
  const shortcuts = para.children.filter((n) => n.type === 'enscribeTag')
  assert.equal(shortcuts.length, 0, 'no shortcut node for bare ^')
  const text = para.children.map((n) => n.value ?? '').join('')
  assert.ok(text.includes('^'), 'bare ^ preserved in text')
  console.log('PASS G1b-4: bare ^ in prose is literal text, no shortcut')
}

// G1b-5: bare _ is literal text — NOT a shortcut (snake_case untouched)
{
  const tree = parse('snake_case in prose')
  const para = tree.children.find((n) => n.type === 'paragraph')
  const shortcuts = para.children.filter((n) => n.type === 'enscribeTag')
  assert.equal(shortcuts.length, 0, 'no shortcut node for bare _')
  console.log('PASS G1b-5: snake_case in prose is literal text, no shortcut')
}

// G1b-6: \^ in top-level prose → literal ^, no superscript
{
  const tree = parse('\\^{literal}')
  const para = tree.children.find((n) => n.type === 'paragraph')
  const shortcuts = para.children.filter((n) => n.type === 'enscribeTag')
  assert.equal(shortcuts.length, 0, 'no shortcut node after \\^')
  console.log('PASS G1b-6: \\^ in prose → literal ^, no superscript')
}

// G1b-7: ^ inside opaque math sigil <$ x^2 $> — not claimed by shortcut tokenizer
{
  const tree = parse('<$ x^2 $>')
  const mathNode = tree.children.find((n) => n.type === 'enscribeTag')
  assert.ok(mathNode, 'math sigil node exists')
  assert.equal(mathNode.tagname, '$')
  assert.ok(mathNode.content.includes('^'), '^ preserved inside math sigil')
  console.log('PASS G1b-7: ^ inside <$ ... $> not claimed by shortcut tokenizer')
}

// G1b-8: ^{} → enscribeParseError (empty braces)
{
  const tree = parse('^{} in prose')
  const para = tree.children.find((n) => n.type === 'paragraph')
  const err = para.children.find((n) => n.type === 'enscribeParseError')
  assert.ok(err, 'parse error node present')
  assert.equal(err.subtype, 'empty-shortcut')
  console.log('PASS G1b-8: ^{} → enscribeParseError (empty-shortcut)')
}

// G1b-9: ^{abc (unterminated) → enscribeParseError
{
  const tree = parse('^{abc')
  const para = tree.children.find((n) => n.type === 'paragraph')
  const err = para.children.find((n) => n.type === 'enscribeParseError')
  assert.ok(err, 'parse error node present for unterminated')
  assert.equal(err.subtype, 'unterminated-shortcut')
  console.log('PASS G1b-9: ^{abc (unterminated) → enscribeParseError')
}

// G1b-10: _{n} sub path — full field verification (mirrors G1b-1 for sub tagname)
{
  const node = parseShortcutInProse('_{n} terms')
  assert.equal(node.type, 'enscribeTag')
  assert.equal(node.form, 'shortcut')
  assert.equal(node.tagname, 'sub')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.content, 'n')
  assert.equal(node.isOpaqueContent, false)
  assert.deepEqual(node.positional, [])
  assert.deepEqual(node.booleans, {})
  assert.deepEqual(node.kwargs, {})
  assert.equal(node.id, null)
  assert.deepEqual(node.classes, [])
  assert.deepEqual(node.atRefs, [])
  assert.equal(node.selfClosing, false)
  console.log('PASS G1b-10: _{n} in prose → sub node, all fields verified')
}

console.log('\nAll G1b inline TeX shortcut tokenizer tests passed.')
console.log('\n128/128 tests passed.')
