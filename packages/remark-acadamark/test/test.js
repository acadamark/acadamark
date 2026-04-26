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
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
