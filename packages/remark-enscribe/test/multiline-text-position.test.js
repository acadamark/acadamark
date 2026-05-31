/**
 * Tests for multi-line inline (text-position) tags.
 *
 * Issues 1 and 3: text-position named tags and sigil tags must span soft line
 * breaks inside a paragraph. The micromark text-position tokenizers must emit
 * lineEnding sibling tokens rather than rejecting/producing errors at `\n`.
 *
 * These tests were written BEFORE the fix and document the expected behavior.
 * Tests marked "currently fails" will pass after the syntax.js change.
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkEnscribe from '../src/index.js'
import assert from 'node:assert/strict'

function parse(src) {
  return unified().use(remarkParse).use(remarkEnscribe).parse(src)
}

function findInlineTag(tree) {
  for (const child of tree.children) {
    if (child.type === 'paragraph' && child.children) {
      const tag = child.children.find((n) => n.type === 'enscribeTag')
      if (tag) return tag
    }
  }
  return null
}

// ─── Issue 1: Multi-line named-tag content ─────────────────────────────────

{
  // Basic multi-line named tag inside a paragraph
  const src = 'Text. <note | line one\nline two.> End.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  assert.ok(para, 'paragraph exists')
  const tag = para.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag found inside paragraph')
  assert.equal(tag.tagname, 'note')
  assert.equal(tag.content, ' line one\nline two.')
  console.log('PASS: multi-line named-tag content inside paragraph')
}

{
  // Named tag whose content starts on the line after the pipe.
  // Note: the closing `>` must NOT be at the start of a line, because
  // `> text` at line-start is a CommonMark blockquote marker that interrupts
  // the paragraph before the inline tokenizer ever sees the `>` closer.
  const src = 'Text. <note |\nDeferred note.> End.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  assert.ok(para, 'paragraph exists')
  const tag = para.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag found inside paragraph')
  assert.equal(tag.tagname, 'note')
  assert.equal(tag.content, '\nDeferred note.')
  console.log('PASS: named-tag content beginning after pipe on next line')
}

{
  // Multi-line named tag is not the only child; surrounding text preserved
  const src = 'Before <aside | prose\ncontinued> after.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  assert.ok(para, 'paragraph exists')
  const tagIdx = para.children.findIndex((n) => n.type === 'enscribeTag')
  assert.ok(tagIdx > 0, 'text before tag')
  assert.ok(tagIdx < para.children.length - 1, 'text after tag')
  assert.equal(para.children[tagIdx].content, ' prose\ncontinued')
  console.log('PASS: multi-line named tag with sibling text nodes')
}

{
  // Multi-line named tag in a longer paragraph (three lines)
  const src = 'See <note | line one\nline two\nline three.> here.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  const tag = para?.children?.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag found')
  assert.equal(tag.content, ' line one\nline two\nline three.')
  console.log('PASS: multi-line named-tag content spanning three lines')
}

{
  // Document remains a single paragraph (no blank-line split)
  const src = 'A <note | spans\nlines> B.'
  const tree = parse(src)
  assert.equal(tree.children.length, 1, 'single paragraph, no block split')
  assert.equal(tree.children[0].type, 'paragraph')
  console.log('PASS: multi-line inline tag does not split the paragraph')
}

console.log('\nAll Issue 1 (named-tag multi-line) tests passed.')

// ─── Issue 3: Multi-line sigil-tag content in text position ───────────────

{
  // Multi-line backtick (code) sigil in a paragraph
  const src = 'Call <` foo()\n  .bar() `> to run.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  assert.ok(para, 'paragraph exists')
  const tag = para.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag found')
  assert.equal(tag.tagname, '`')
  assert.equal(tag.content, ' foo()\n  .bar() ')
  console.log('PASS: multi-line backtick sigil in paragraph')
}

{
  // Multi-line triple-backtick (code block) sigil in a paragraph.
  // The closing ```> must not appear at the start of a line, because three
  // backticks at line-start is a CommonMark fenced-code-block fence that
  // interrupts the paragraph before the inline tokenizer runs.
  const src = 'Inline <``` python\nreturn 1 ```> code.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  assert.ok(para, 'paragraph exists')
  const tag = para.children.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag found (not error)')
  assert.equal(tag.type, 'enscribeTag')
  assert.equal(tag.tagname, '```')
  assert.equal(tag.content, ' python\nreturn 1 ')
  console.log('PASS: multi-line triple-backtick sigil in paragraph')
}

{
  // Multi-line dollar sigil in a paragraph
  const src = 'Where <$ \\frac{x}\n{y} $> is defined.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  const tag = para?.children?.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag found')
  assert.equal(tag.tagname, '$')
  assert.equal(tag.content, ' \\frac{x}\n{y} ')
  console.log('PASS: multi-line dollar sigil in paragraph')
}

{
  // Multi-line hash sigil (prose heading used inline — unusual but valid syntax)
  const src = 'Before <# heading\ncontinued #> after.'
  const tree = parse(src)
  const para = tree.children.find((n) => n.type === 'paragraph')
  const tag = para?.children?.find((n) => n.type === 'enscribeTag')
  assert.ok(tag, 'inline enscribeTag found')
  assert.equal(tag.tagname, '#')
  assert.equal(tag.content, ' heading\ncontinued ')
  console.log('PASS: multi-line hash sigil in paragraph')
}

{
  // No enscribeTagError nodes produced for any of the above
  const cases = [
    'A <note | line one\nline two.> B.',
    'A <` foo\nbar `> B.',
    'A <``` code\nblock ```> B.',
    'A <$ x\ny $> B.',
  ]
  for (const src of cases) {
    const tree = parse(src)
    const errNodes = tree.children.flatMap((n) =>
      n.type === 'enscribeTagError' ? [n] :
      (n.children || []).filter((c) => c.type === 'enscribeTagError')
    )
    assert.equal(errNodes.length, 0, `no error nodes for: ${JSON.stringify(src)}`)
  }
  console.log('PASS: no enscribeTagError nodes for multi-line inline tags')
}

console.log('\nAll Issue 3 (sigil multi-line text position) tests passed.')
