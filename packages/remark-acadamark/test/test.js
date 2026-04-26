import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkAcadamark from '../src/index.js'
import assert from 'node:assert/strict'

/**
 * Parse markdown source with the acadamark plugin and return the mdast root.
 * @param {string} src
 */
function parse(src) {
  return unified().use(remarkParse).use(remarkAcadamark).parse(src)
}

/**
 * Return the first direct child of the mdast root that is an acadamarkTag.
 * Throws if none is found.
 * @param {string} src
 */
function parseTag(src) {
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'acadamarkTag')
  if (!node) throw new Error(`No acadamarkTag found in: ${JSON.stringify(src)}`)
  return node
}

async function run() {
  // --- Slice 1: sigil tags (<# ... #>, <## ... ##>, etc.) ---

  // Case 1: Basic single-# sigil tag
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

  // Case 2: Double-# sigil tag
  {
    const node = parseTag('<## Background ##>')
    assert.equal(node.tagname, '##')
    assert.equal(node.content, ' Background ')
    console.log('PASS: double-sigil <## ... ##>')
  }

  // Case 3: Triple-# sigil tag
  {
    const node = parseTag('<### Methods ###>')
    assert.equal(node.tagname, '###')
    assert.equal(node.content, ' Methods ')
    console.log('PASS: triple-sigil <### ... ###>')
  }

  // Case 4: Mixed document — the sigil tag is a top-level mdast node, not
  // wrapped in a paragraph, and paragraphs before/after are preserved.
  {
    const tree = parse('Before.\n\n<# Heading #>\n\nAfter.')
    const types = tree.children.map((n) => n.type)
    assert.deepEqual(types, ['paragraph', 'acadamarkTag', 'paragraph'])
    assert.equal(tree.children[1].tagname, '#')
    console.log('PASS: sigil tag is block-level (not in a paragraph)')
  }

  // Case 5: Sigil tag with id attribute — requires `|`
  {
    const node = parseTag('<# #intro | Introduction #>')
    assert.equal(node.tagname, '#')
    assert.equal(node.id, 'intro')
    assert.equal(node.content, ' Introduction ')
    console.log('PASS: sigil tag with #id attribute via |')
  }

  // Case 6: Sigil tag with class attribute
  {
    const node = parseTag('<# .numbered | Methods #>')
    assert.equal(node.tagname, '#')
    assert.deepEqual(node.classes, ['numbered'])
    assert.equal(node.content, ' Methods ')
    console.log('PASS: sigil tag with .class attribute via |')
  }

  // Case 7: Sigil tag with multiple attributes
  {
    const node = parseTag('<# #intro .numbered .special | Introduction #>')
    assert.equal(node.id, 'intro')
    assert.deepEqual(node.classes, ['numbered', 'special'])
    assert.equal(node.content, ' Introduction ')
    console.log('PASS: sigil tag with multiple attributes')
  }

  // Case 8: Content containing a # character (not the closer)
  {
    const node = parseTag('<# Heading with #hash inside #>')
    assert.equal(node.tagname, '#')
    // No | means no attribute parsing; whole body is content
    assert.equal(node.content, ' Heading with #hash inside ')
    console.log('PASS: # inside content is not mistaken for closer')
  }

  // Case 9: Content ending with a # before the actual closer
  {
    const node = parseTag('<# Ends with # #>')
    assert.equal(node.content, ' Ends with # ')
    console.log('PASS: # immediately before closer is not double-counted')
  }

  // Case 10: Double sigil tag with single # in content
  {
    const node = parseTag('<## Has # one hash ##>')
    assert.equal(node.tagname, '##')
    assert.equal(node.content, ' Has # one hash ')
    console.log('PASS: single # in double-sigil content is not a closer')
  }

  // Case 11: Empty attribute section (only | with no attrs)
  {
    const node = parseTag('<# | Just content #>')
    assert.equal(node.id, null)
    assert.deepEqual(node.classes, [])
    assert.equal(node.content, ' Just content ')
    console.log('PASS: empty attribute section (bare |)')
  }

  // Case 12: No content, just a heading tag (no pipe, body is minimal)
  {
    const node = parseTag('<# X #>')
    assert.equal(node.content, ' X ')
    console.log('PASS: minimal content sigil tag')
  }

  console.log('\nAll Slice 1 tests passed.')

  // --- Slice 2: named tags ---

  // Find an acadamarkTag inside a paragraph (inline / text-position tags).
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

  // Case 13: Named tag with single positional, no content
  {
    const node = parseTag('<cite jones2001>')
    assert.equal(node.tagname, 'cite')
    assert.deepEqual(node.positional, ['jones2001'])
    assert.equal(node.content, null)
    assert.equal(node.isOpaqueContent, false)
    console.log('PASS: <cite jones2001> → named tag, single positional')
  }

  // Case 14: Named tag with content (pipe separator)
  {
    const node = parseTag('<a https://example.com | Click here>')
    assert.equal(node.tagname, 'a')
    assert.deepEqual(node.positional, ['https://example.com'])
    assert.equal(node.content, ' Click here')
    assert.equal(node.isOpaqueContent, true)
    console.log('PASS: <a url | content> → positional + content')
  }

  // Case 15: Multiple space-separated positionals
  {
    const node = parseTag('<cite jones2001 smith2022>')
    assert.equal(node.tagname, 'cite')
    assert.deepEqual(node.positional, ['jones2001', 'smith2022'])
    console.log('PASS: multiple positionals from space-separated tokens')
  }

  // Case 16: Keyword attribute (unquoted value)
  {
    const node = parseTag('<figure src=elephant.jpg>')
    assert.equal(node.tagname, 'figure')
    assert.deepEqual(node.kwargs, { src: 'elephant.jpg' })
    console.log('PASS: keyword attribute src=elephant.jpg')
  }

  // Case 17: Hyphenated value (- allowed in values per spec)
  {
    const node = parseTag('<img src=my-photo.jpg>')
    assert.equal(node.kwargs.src, 'my-photo.jpg')
    console.log('PASS: hyphenated value src=my-photo.jpg')
  }

  // Case 18: Quoted keyword value containing comma and space
  {
    const node = parseTag("<figure caption='An elephant, photographed.'>")
    assert.equal(node.kwargs.caption, 'An elephant, photographed.')
    console.log('PASS: quoted value containing comma and space')
  }

  // Case 19: Id attribute
  {
    const node = parseTag('<figure #elephant | Caption text.>')
    assert.equal(node.tagname, 'figure')
    assert.equal(node.id, 'elephant')
    assert.equal(node.content, ' Caption text.')
    console.log('PASS: #id attribute on named tag')
  }

  // Case 20: Class attributes (multiple)
  {
    const node = parseTag('<div .container .dark | hello>')
    assert.deepEqual(node.classes, ['container', 'dark'])
    assert.equal(node.content, ' hello')
    console.log('PASS: multiple .class attributes')
  }

  // Case 21: Boolean flag attributes
  {
    const node = parseTag('<figure +wrap -preview>')
    assert.deepEqual(node.booleans, { wrap: true, preview: false })
    console.log('PASS: +flag and -flag boolean attributes')
  }

  // Case 22: Bracketed list as positional
  {
    const node = parseTag('<cite [smith2017, jones2023]>')
    assert.deepEqual(node.positional, [['smith2017', 'jones2023']])
    console.log('PASS: bracketed list positional')
  }

  // Case 23: Full mixed attributes
  {
    const node = parseTag('<figure src=elephant.jpg #adult-elephant align=right +wrap | An elephant.>')
    assert.equal(node.tagname, 'figure')
    assert.equal(node.id, 'adult-elephant')
    assert.deepEqual(node.kwargs, { src: 'elephant.jpg', align: 'right' })
    assert.deepEqual(node.booleans, { wrap: true })
    assert.equal(node.content, ' An elephant.')
    console.log('PASS: full mixed attributes (id, kwargs, booleans, content)')
  }

  // Case 24: Quoted value containing `>` — must not close the tag early
  {
    const node = parseTag('<figure caption="a > b">')
    assert.equal(node.kwargs.caption, 'a > b')
    console.log('PASS: > inside quoted attribute value does not close tag')
  }

  // Case 25: Nested tag-like construct in content (depth tracking)
  // The inner <em ...> increments depth; its > decrements; outer > closes.
  {
    const node = parseTag('<figure src=x | See <em | bold> text.>')
    assert.equal(node.tagname, 'figure')
    assert.equal(node.kwargs.src, 'x')
    assert.equal(node.content, ' See <em | bold> text.')
    console.log('PASS: nested tag-like content does not close outer tag early')
  }

  // Case 26: Rule B — `<` followed by non-tag char does not increment depth,
  // so `<` followed by space in content is treated as literal.
  {
    const node = parseTag('<figure | a < b or c>')
    assert.equal(node.content, ' a < b or c')
    console.log('PASS: < followed by space is literal (rule B)')
  }

  // Case 27: Inline (text-position) named tag inside a paragraph
  {
    const node = parseInlineTag('Text with <cite jones2001> inline.')
    assert.equal(node.tagname, 'cite')
    assert.deepEqual(node.positional, ['jones2001'])
    console.log('PASS: inline named tag inside paragraph')
  }

  // Case 28: Named tag with no attrs, just tag name and content
  {
    const node = parseTag('<aside | This is a note.>')
    assert.equal(node.tagname, 'aside')
    assert.equal(node.content, ' This is a note.')
    assert.deepEqual(node.positional, [])
    console.log('PASS: <aside | content> with no attributes')
  }

  // Case 29: Named tag with closing slash in content (e.g. </em> inside)
  // </em> starts with </ which increments depth (/ is SLASH), then > decrements.
  {
    const node = parseTag('<div | Hello <em>bold</em> world.>')
    assert.equal(node.content, ' Hello <em>bold</em> world.')
    console.log('PASS: </tag> in content tracked by depth (/ treated as tag-like)')
  }

  console.log('\nAll Slice 2 tests passed.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
