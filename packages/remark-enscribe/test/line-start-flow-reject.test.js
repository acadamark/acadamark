/**
 * Tests for Issue 2: flow-position tokenizer must not consume inline tags.
 *
 * A tag of the form `<sigil content>` or `<name | content>` that appears in
 * flow position (start of line, possibly as the entire block) must be parsed as
 * a FLOW (block-level) enscribeTag. When the same sigil or named tag appears
 * mid-line inside a paragraph, it must be parsed as a TEXT (inline) tag.
 *
 * The root bug: before the fix, the flow tokenizer matched `<$ b $>` even when
 * the next character after `>` was non-EOL text (e.g. " is two."). The fix adds
 * an `afterClose`/`afterGt` guard that calls `nok` when trailing non-EOL text
 * follows the `>`. The text tokenizer then picks it up as an inline tag.
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkEnscribe from '../src/index.js'
import assert from 'node:assert/strict'

function parse(src) {
  return unified().use(remarkParse).use(remarkEnscribe).parse(src)
}

// ─── Sigil tag at start of line → flow block ─────────────────────────────────

{
  // A sigil tag alone on its own line is a block-level construct.
  const src = '<$ b $>'
  const tree = parse(src)
  assert.equal(tree.children.length, 1, 'one top-level node')
  const node = tree.children[0]
  assert.equal(node.type, 'enscribeTag', 'top-level node is enscribeTag (flow)')
  assert.equal(node.tagname, '$', 'sigil is $')
  console.log('PASS: sigil tag alone on line → flow block')
}

// ─── Sigil tag mid-line → inline inside paragraph ────────────────────────────

{
  // `<$ b $>` inside a sentence must parse as an inline tag inside a paragraph,
  // NOT as a flow block followed by stray text.
  const src = '<$ a $> is one.'
  const tree = parse(src)
  assert.equal(tree.children.length, 1, 'one top-level node (paragraph)')
  const para = tree.children[0]
  assert.equal(para.type, 'paragraph', 'top-level node is a paragraph')
  const tag = para.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag inside paragraph')
  assert.equal(tag.tagname, '$')
  console.log('PASS: sigil tag with trailing text → inline inside paragraph')
}

{
  // Same test but with two math tags in a single sentence, one per line.
  const src = 'where <$ a $> is one, and\n<$ b $> is two.'
  const tree = parse(src)
  // remark collapses the two lines into a single paragraph (soft line break).
  assert.equal(tree.children.length, 1, 'one paragraph')
  const para = tree.children[0]
  assert.equal(para.type, 'paragraph', 'is a paragraph')
  const tags = para.children.filter((n) => n.type === 'enscribeTag')
  assert.equal(tags.length, 2, 'two inline enscribeTags')
  assert.equal(tags[0].tagname, '$')
  assert.equal(tags[1].tagname, '$')
  // Crucially, <$ b $> is on a "new line" within the paragraph but still inline.
  console.log('PASS: two inline math tags across a soft line break in one paragraph')
}

// ─── Named tag at start of line → flow block ─────────────────────────────────

{
  const src = '<note | content>'
  const tree = parse(src)
  assert.equal(tree.children.length, 1, 'one top-level node')
  assert.equal(tree.children[0].type, 'enscribeTag', 'flow enscribeTag')
  assert.equal(tree.children[0].tagname, 'note')
  console.log('PASS: named tag alone on line → flow block')
}

// ─── Named tag mid-line → inline inside paragraph ────────────────────────────

{
  const src = '<note | content> trailing text.'
  const tree = parse(src)
  assert.equal(tree.children.length, 1, 'one paragraph')
  const para = tree.children[0]
  assert.equal(para.type, 'paragraph', 'is a paragraph')
  const tag = para.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag inside paragraph')
  assert.equal(tag.tagname, 'note')
  console.log('PASS: named tag with trailing text → inline inside paragraph')
}

// ─── No false negatives: flow match must still work at EOL ───────────────────

{
  // Flow tag followed by end-of-line (no trailing text) stays flow.
  const src = 'Some prose.\n\n<$ x $>\n\nMore prose.'
  const tree = parse(src)
  const flowTag = tree.children.find((n) => n.type === 'enscribeTag')
  assert.ok(flowTag, 'flow enscribeTag present')
  assert.equal(flowTag.tagname, '$')
  console.log('PASS: flow tag between blank lines stays flow')
}

console.log('\nAll Issue 2 (line-start flow reject) tests passed.')
