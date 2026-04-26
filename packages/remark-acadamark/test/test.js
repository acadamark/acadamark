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
  assert.equal(node.isOpaqueContent, true)
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
  assert.equal(node.isOpaqueContent, true)
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
console.log('\n29/29 tests passed.')
