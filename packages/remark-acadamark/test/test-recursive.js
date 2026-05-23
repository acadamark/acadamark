/**
 * test-recursive.js — integration tests for the recursive-content plugin.
 *
 * These tests use the full pipeline: remarkParse + remarkAcadamark +
 * remarkRecursiveContent. They verify that string content on default-handler
 * acadamarkTag nodes is replaced with structured Node[] after the transform.
 *
 * remark-math is not a workspace dependency; tests that would require it
 * (bare $...$ math in content) are deferred until remark-math is added.
 */

import assert from 'node:assert/strict'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkAcadamark from '../src/index.js'
import remarkRecursiveContent from '../src/recursive-content.js'

// ─── Pipeline setup ─────────────────────────────────────────────────────────
//
// The inner processor re-parses content strings. It includes the same parser
// plugins as the outer pipeline but NOT remarkRecursiveContent (recursion is
// handled by the plugin's own tree walk, not by nesting plugin instances).

const innerProcessor = unified().use(remarkParse).use(remarkAcadamark)

function buildProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkAcadamark)
    .use(remarkRecursiveContent, { processor: innerProcessor })
}

const processor = buildProcessor()

function parse(src) {
  return processor.runSync(processor.parse(src))
}

function parseTag(src) {
  const tree = parse(src)
  const node = tree.children.find((n) => n.type === 'acadamarkTag')
  if (!node) throw new Error(`No acadamarkTag in: ${JSON.stringify(src)}`)
  return node
}

// ─── Test RC-1: Markdown emphasis in content ────────────────────────────────
{
  const node = parseTag('<aside | text with *emphasis*.>')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.isOpaqueContent, false)
  assert.ok(Array.isArray(node.content), 'content is Node[]')
  const types = node.content.map((n) => n.type)
  assert.ok(types.includes('text'), 'text nodes present')
  assert.ok(types.includes('emphasis'), 'emphasis node present')
  const emph = node.content.find((n) => n.type === 'emphasis')
  assert.equal(emph.children[0].value, 'emphasis')
  console.log('PASS RC-1: markdown emphasis in named-tag content')
}

// ─── Test RC-2: Nested acadamark tag in content ──────────────────────────────
{
  const node = parseTag('<aside | text with <ref fig:elephant>.>')
  assert.ok(Array.isArray(node.content), 'content is Node[]')
  const types = node.content.map((n) => n.type)
  assert.ok(types.includes('text'), 'surrounding text present')
  const refTag = node.content.find((n) => n.type === 'acadamarkTag')
  assert.ok(refTag, 'nested acadamarkTag present')
  assert.equal(refTag.tagname, 'ref')
  assert.deepEqual(refTag.positional, ['fig:elephant'])
  console.log('PASS RC-2: nested acadamark tag in content')
}

// ─── Test RC-3: Opaque content (math sigil) left untouched ──────────────────
{
  const node = parseTag('<$ x^2 + y^2 $>')
  assert.equal(node.isOpaqueContent, true)
  assert.equal(typeof node.content, 'string', 'math content stays string')
  assert.equal(node.content, ' x^2 + y^2 ')
  console.log('PASS RC-3: math sigil content remains opaque (string)')
}

// ─── Test RC-4: Tagged math sigil inside named-tag content ──────────────────
// The surrounding aside content is recursively parsed; the inner <$...$>
// is opaque (isOpaqueContent: true, string content) within the aside's content.
{
  const node = parseTag('<aside | The formula <$ E = mc^2 $> is famous.>')
  assert.ok(Array.isArray(node.content), 'aside content is Node[]')
  const mathTag = node.content.find(
    (n) => n.type === 'acadamarkTag' && n.tagname === '$',
  )
  assert.ok(mathTag, '<$> tag found in aside content')
  assert.equal(mathTag.isOpaqueContent, true, 'math sigil stays opaque')
  assert.equal(typeof mathTag.content, 'string', 'math sigil content is string')
  assert.equal(mathTag.content, ' E = mc^2 ')
  console.log('PASS RC-4: tagged math sigil inside content stays opaque')
}

// ─── Test RC-5: No-content tag not touched ──────────────────────────────────
// <cite> has no | separator — content is null. Plugin skips it.
{
  const node = parseTag('<cite @jones2001>')
  assert.equal(node.content, null, 'cite content stays null')
  assert.equal(node.isOpaqueContent, false, 'cite has no content, flag false')
  console.log('PASS RC-5: no-content tag (cite) left untouched')
}

// ─── Test RC-6: Multi-paragraph content in named tag ────────────────────────
// A blank line inside content produces two separate paragraph nodes.
{
  const node = parseTag('<aside | First paragraph.\n\nSecond paragraph.>')
  assert.ok(Array.isArray(node.content), 'content is Node[]')
  const paras = node.content.filter((n) => n.type === 'paragraph')
  assert.equal(paras.length, 2, 'two paragraphs')
  assert.equal(paras[0].children[0].value, 'First paragraph.')
  assert.equal(paras[1].children[0].value, 'Second paragraph.')
  console.log('PASS RC-6: blank line in content produces two paragraph nodes')
}

// ─── Test RC-7: Hash sigil is recursively parsed ────────────────────────────
{
  const node = parseTag('<# Introduction with *bold* word #>')
  assert.equal(node.contentHandler, 'default')
  assert.equal(node.isOpaqueContent, false)
  assert.ok(Array.isArray(node.content), 'hash sigil content is Node[]')
  const types = node.content.map((n) => n.type)
  assert.ok(types.includes('emphasis') || types.includes('strong'), 'inline markup parsed')
  console.log('PASS RC-7: hash sigil content is recursively parsed')
}

// ─── Test RC-8: Long-form default-handler tag is recursively parsed ─────────
{
  const tree = parse('<aside>\nText with *emphasis*.\n</aside>')
  const aside = tree.children.find((n) => n.type === 'acadamarkTag')
  assert.ok(aside, 'aside tag found')
  assert.equal(aside.form, 'long')
  assert.equal(aside.contentHandler, 'default')
  assert.equal(aside.isOpaqueContent, false)
  assert.ok(Array.isArray(aside.content), 'long-form aside content is Node[]')
  const types = aside.content.map((n) => n.type)
  assert.ok(types.includes('emphasis') || types.includes('text'), 'prose parsed')
  console.log('PASS RC-8: long-form default-handler tag content is recursively parsed')
}

// ─── Test RC-9: Long-form DSL tag stays opaque ──────────────────────────────
{
  const tree = parse('<csv>\na,b,c\n1,2,3\n</csv>')
  const csv = tree.children.find((n) => n.type === 'acadamarkTag')
  assert.equal(csv.contentHandler, 'csv')
  assert.equal(csv.isOpaqueContent, true)
  assert.equal(typeof csv.content, 'string', 'csv content stays string')
  assert.equal(csv.content, '\na,b,c\n1,2,3\n')
  console.log('PASS RC-9: long-form DSL tag content stays opaque (string)')
}

// ─── Test RC-10: Escape-error array case — prose between errors parsed ───────
// Content is (string | acadamarkParseError)[] from the escape rules slice.
// The recursive-content plugin parses each string segment; error nodes preserved.
{
  const node = parseTag('<aside | She wrote \\q at the start. Then *emphasis*.>')
  assert.ok(Array.isArray(node.content), 'content is Node[]')
  const hasError = node.content.some(
    (n) => n.type === 'acadamarkParseError' && n.subtype === 'unknown-escape-sequence',
  )
  assert.ok(hasError, 'acadamarkParseError node preserved')
  const hasEmphasis = node.content.some((n) => n.type === 'emphasis')
  assert.ok(hasEmphasis, 'emphasis after error is parsed correctly')
  console.log('PASS RC-10: escape-error array — prose between errors parsed, errors preserved')
}

// ─── Test RC-11: Maximum recursion depth ────────────────────────────────────
// Build 11 levels of nested aside tags. At depth 10 the plugin stops and
// emits acadamarkParseError with subtype max-recursion-depth.
{
  // Construct `<aside | <aside | <aside | ... >>>` with 11 levels.
  let src = 'deepest content'
  for (let i = 0; i < 11; i++) {
    src = `<aside | ${src}>`
  }

  const tree = parse(src)

  // Walk down through the chain of aside nodes to find the deepest.
  function findDeepest(node, depth) {
    if (!Array.isArray(node.content)) return { node, depth }
    const child = node.content.find(
      (n) => n.type === 'acadamarkTag' || n.type === 'acadamarkParseError',
    )
    if (!child) return { node, depth }
    return findDeepest(child, depth + 1)
  }

  const outerAside = tree.children[0]
  const { node: deepest, depth } = findDeepest(outerAside, 0)
  assert.equal(deepest.type, 'acadamarkParseError', 'deepest node is error')
  assert.equal(deepest.subtype, 'max-recursion-depth', 'correct error subtype')
  assert.ok(depth >= 10, `error at depth ≥ 10 (was ${depth})`)
  console.log(`PASS RC-11: max recursion depth — acadamarkParseError at depth ${depth}`)
}

// ─── Test RC-12: Finite recursion bottoms out cleanly ───────────────────────
// Three nested asides — well under the limit, should parse completely.
// The inner dots (e.g. <aside | inner>.) are content inside the outer aside;
// only the outermost construct must end at a line boundary for flow-position.
{
  const src = '<aside | outer <aside | middle <aside | inner>.>.>'
  const tree = parse(src)
  const outer = tree.children[0]
  assert.ok(Array.isArray(outer.content), 'outer content parsed')
  const middle = outer.content.find((n) => n.type === 'acadamarkTag')
  assert.ok(middle, 'middle aside in outer content')
  assert.ok(Array.isArray(middle.content), 'middle content parsed')
  const inner = middle.content.find((n) => n.type === 'acadamarkTag')
  assert.ok(inner, 'inner aside in middle content')
  assert.ok(Array.isArray(inner.content), 'inner content parsed')
  const innerText = inner.content.find((n) => n.type === 'text')?.value ?? ''
  assert.ok(innerText.includes('inner'), `inner text contains "inner" (got ${JSON.stringify(innerText)})`)
  console.log('PASS RC-12: finite nesting (3 levels) bottoms out cleanly')
}

// ─── Test RC-13: Prior tests still pass (contentHandler / isOpaqueContent) ──
// Spot-check that the isOpaqueContent changes in from-markdown.js are correct.
{
  const dollar = (() => { const p = unified().use(remarkParse).use(remarkAcadamark); return p.parse('<$ x $>').children[0] })()
  assert.equal(dollar.isOpaqueContent, true, '$ sigil opaque')
  assert.equal(dollar.contentHandler, 'math')

  const hash = (() => { const p = unified().use(remarkParse).use(remarkAcadamark); return p.parse('<# h #>').children[0] })()
  assert.equal(hash.isOpaqueContent, false, '# sigil not opaque (will be recursively parsed)')
  assert.equal(hash.contentHandler, 'default')

  const aside = (() => { const p = unified().use(remarkParse).use(remarkAcadamark); return p.parse('<aside | x>').children[0] })()
  assert.equal(aside.isOpaqueContent, false, 'aside not opaque')
  assert.equal(aside.contentHandler, 'default')
  console.log('PASS RC-13: isOpaqueContent and contentHandler set correctly at parse time')
}

// ─── Test RC-14: PG-13 verification — markdown pass-through escape in content ─
// \* inside named-tag content is stored verbatim as \* by the parser (pass-
// through escape — not acadamark-significant, so not consumed at the grammar
// level). When remarkRecursiveContent re-feeds the content through remark,
// CommonMark processes \* as an escape and emits a literal *.
//
// Per escape-rules-spec.md: \*asterisk\* → literal *asterisk*, not emphasis,
// not the raw string \*asterisk\*.
{
  const node = parseTag('<aside | text with \\*asterisk\\*>')
  assert.ok(Array.isArray(node.content), 'content is Node[]')
  // \* should not produce emphasis — it is an escape, not a delimiter pair.
  const hasEmphasis = node.content.some((n) => n.type === 'emphasis')
  assert.equal(hasEmphasis, false, 'no emphasis node — \\* is a CommonMark escape, not markup')
  // The text node should contain literal asterisks, not backslash-asterisk.
  const textValue = node.content.filter((n) => n.type === 'text').map((n) => n.value).join('')
  assert.ok(textValue.includes('*asterisk*'), `text contains literal asterisks (got ${JSON.stringify(textValue)})`)
  assert.equal(textValue.includes('\\*'), false, `text does not contain literal \\* (got ${JSON.stringify(textValue)})`)
  console.log('PASS RC-14: PG-13 — \\* pass-through escape in named-tag content produces literal * via remark')
}

// ─── G1a: Inline shortcuts — recursive parsing of brace content ──────────────

// ─── Test RC-15: ^{...} inside named-tag content → recursively parsed ─────────
{
  const node = parseTag('<aside | 1^{st} edition.>')
  assert.ok(Array.isArray(node.content), 'aside content is Node[]')
  // Find the sup child node within the aside's content.
  const supNode = node.content.find((n) => n.type === 'acadamarkTag' && n.tagname === 'sup')
  assert.ok(supNode, 'sup acadamarkTag present in aside content')
  assert.equal(supNode.contentHandler, 'default')
  // After recursiveContent, sup.content should be Node[], not a string.
  assert.ok(Array.isArray(supNode.content), 'sup content is Node[] after recursive parse')
  // The text "st" should be in a text node.
  const textNode = supNode.content.find((n) => n.type === 'text')
  assert.ok(textNode, 'text node inside sup')
  assert.equal(textNode.value, 'st')
  console.log('PASS RC-15: ^{st} inside named-tag content → sup with recursively parsed content')
}

// ─── Test RC-16: nested ^{_{...}} — nested shortcuts recursively parsed ────────
{
  const node = parseTag('<aside | x^{y_{1}}>')
  assert.ok(Array.isArray(node.content), 'aside content is Node[]')
  const supNode = node.content.find((n) => n.type === 'acadamarkTag' && n.tagname === 'sup')
  assert.ok(supNode, 'sup node present')
  assert.ok(Array.isArray(supNode.content), 'sup content is Node[] after recursive parse')
  // The sub node should be in the sup's content.
  const subNode = supNode.content.find((n) => n.type === 'acadamarkTag' && n.tagname === 'sub')
  assert.ok(subNode, 'nested sub node inside sup content')
  assert.ok(Array.isArray(subNode.content), 'sub content also recursively parsed')
  const subText = subNode.content.find((n) => n.type === 'text')
  assert.ok(subText, 'text inside sub')
  assert.equal(subText.value, '1')
  console.log('PASS RC-16: nested x^{y_{1}} → sup and sub both recursively parsed')
}

// ─── Test RC-17: \^ in named-tag content → literal ^, no sup ─────────────────
{
  const node = parseTag('<aside | text \\^ more>')
  assert.equal(node.contentHandler, 'default')
  assert.ok(Array.isArray(node.content), 'content is Node[]')
  // Should contain only text nodes (no sup/sub).
  const hasSup = node.content.some((n) => n.type === 'acadamarkTag' && n.tagname === 'sup')
  assert.equal(hasSup, false, 'no sup node — \\^ is escaped to literal ^')
  // The text should contain literal ^.
  const fullText = node.content.filter((n) => n.type === 'text').map((n) => n.value).join('')
  assert.ok(fullText.includes('^'), `text contains literal ^ (got: ${JSON.stringify(fullText)})`)
  console.log('PASS RC-17: \\^ in named-tag content → literal ^, no superscript')
}

// ─── G1b: top-level prose surface — recursive parsing ────────────────────────
//
// These tests verify that shortcut nodes created by the G1b micromark tokenizer
// (^{...} and _{...} in top-level prose) are correctly processed by
// remarkRecursiveContent, just like G1a's in-tag shortcuts.

// Helper: find a sup or sub node inside a paragraph's inline children.
function parseInlineShortcut(src, tagname) {
  const tree = parse(src)
  for (const block of tree.children) {
    if (block.type !== 'paragraph') continue
    const node = block.children.find(
      (n) => n.type === 'acadamarkTag' && n.tagname === tagname,
    )
    if (node) return node
  }
  throw new Error(`No ${tagname} node in prose: ${JSON.stringify(src)}`)
}

// ─── Test RC-18: ^{st} in top-level prose → recursively parsed ───────────────
{
  const supNode = parseInlineShortcut('The 1^{st} edition.', 'sup')
  assert.ok(supNode, 'sup node present in prose')
  assert.equal(supNode.contentHandler, 'default')
  // After remarkRecursiveContent, content should be Node[], not a string.
  assert.ok(Array.isArray(supNode.content), 'sup content is Node[] after recursive parse')
  const textNode = supNode.content.find((n) => n.type === 'text')
  assert.ok(textNode, 'text node inside sup')
  assert.equal(textNode.value, 'st')
  console.log('PASS RC-18: ^{st} in top-level prose → sup with recursively parsed content')
}

// ─── Test RC-19: x^{y_{1}} in prose — nested shortcuts recursively parsed ────
{
  const supNode = parseInlineShortcut('x^{y_{1}}', 'sup')
  assert.ok(supNode, 'sup node present')
  assert.ok(Array.isArray(supNode.content), 'sup content is Node[] after recursive parse')
  // The sub node should be inside the sup content.
  const subNode = supNode.content.find(
    (n) => n.type === 'acadamarkTag' && n.tagname === 'sub',
  )
  assert.ok(subNode, 'nested sub node inside sup content')
  assert.ok(Array.isArray(subNode.content), 'sub content also recursively parsed')
  const subText = subNode.content.find((n) => n.type === 'text')
  assert.ok(subText, 'text inside sub')
  assert.equal(subText.value, '1')
  console.log('PASS RC-19: x^{y_{1}} in prose → sup and sub both recursively parsed')
}

// ─── Test RC-20: nested <cite> in brace content — resolved after recursive-content
// The tokenizer captures ^{see <cite @jones>} as a raw string
// "see <cite @jones>". After remarkRecursiveContent re-parses it through remark,
// the <cite @jones> is resolved into an acadamarkTag cite node inside the sup.
{
  const supNode = parseInlineShortcut('^{see <cite @jones>}', 'sup')
  assert.ok(supNode, 'sup node present')
  assert.ok(Array.isArray(supNode.content), 'sup content is Node[] after recursive parse')
  const citeNode = supNode.content.find(
    (n) => n.type === 'acadamarkTag' && n.tagname === 'cite',
  )
  assert.ok(citeNode, 'cite node inside sup content after recursive parse')
  assert.deepEqual(citeNode.atRefs, ['jones'])
  console.log('PASS RC-20: ^{see <cite @jones>} in prose → cite node inside sup after recursive-content')
}

console.log('\nAll recursive-content tests passed.')
console.log('\n20/20 recursive-content tests passed.')
