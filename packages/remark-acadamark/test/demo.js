/**
 * demo.js — acadamark parser output inspector
 *
 * Usage: node test/demo.js [path/to/file]
 *        npm run demo -- [path/to/file]
 *
 * Output has three sections:
 *   1. Full mdast tree   — complete unified/remark parse result, no truncation.
 *   2. All acadamark tags — flat listing of every acadamarkTag node found at
 *      any depth (block-level and inline), with key fields and source position.
 *   3. Tag counts        — totals by tagname; quick sanity-check against
 *      expected counts when reading a test document.
 */

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkAcadamark from '../src/index.js'
import { inspect } from 'node:util'
import { readFileSync } from 'node:fs'
import { visit } from 'unist-util-visit'

const source = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : `
# Regular markdown heading

<# Introduction #intro>

Some text with an <cite jones2001 smith2022> inline citation and
a <a https://example.com | link>.

<figure src=elephant.jpg #elephant align=right +wrap |
  An adult African elephant photographed in Tanzania.>

<## Methods ##methods>

We used the protocol from <cite jones2024>.
`.trim()

const tree = unified().use(remarkParse).use(remarkAcadamark).parse(source)

const HR = '─'.repeat(72)

// ─── Section 1: Full mdast tree ────────────────────────────────────────────

console.log(HR)
console.log('Section 1: Full mdast tree')
console.log(HR)
console.log(inspect(tree, {
  depth: null,
  maxArrayLength: null,
  maxStringLength: null,
  colors: true,
}))

// ─── Section 2: All acadamark tags (flat, every depth) ─────────────────────

const allTags = []
visit(tree, 'acadamarkTag', (node) => { allTags.push(node) })

console.log('\n' + HR)
console.log(`Section 2: All acadamark tags — ${allTags.length} found (block-level and inline)`)
console.log(HR)

for (const tag of allTags) {
  const pos = tag.position
    ? `${tag.position.start.line}:${tag.position.start.column}–` +
      `${tag.position.end.line}:${tag.position.end.column}`
    : 'no position'

  let contentPreview
  if (tag.content == null) {
    contentPreview = 'null'
  } else if (typeof tag.content === 'string') {
    const s = tag.content.replace(/\n/g, '↵')
    contentPreview = JSON.stringify(s.length > 60 ? s.slice(0, 57) + '…' : s)
  } else {
    contentPreview = '[child nodes]'
  }

  const parts = [`<${tag.tagname}>`]
  if (tag.id)                                    parts.push(`#${tag.id}`)
  if (tag.classes?.length)                       parts.push(tag.classes.map(c => `.${c}`).join(' '))
  if (tag.positional?.length)                    parts.push(`pos=${JSON.stringify(tag.positional)}`)
  if (Object.keys(tag.booleans ?? {}).length)    parts.push(`bool=${JSON.stringify(tag.booleans)}`)
  if (Object.keys(tag.kwargs ?? {}).length)      parts.push(`kw=${JSON.stringify(tag.kwargs)}`)
  if (tag.isOpaqueContent)                       parts.push('opaque')
  parts.push(`content=${contentPreview}`)
  parts.push(`@${pos}`)

  console.log(' ', parts.join('  '))
}

// ─── Section 3: Tag counts ─────────────────────────────────────────────────

const counts = {}
for (const tag of allTags) {
  counts[tag.tagname] = (counts[tag.tagname] ?? 0) + 1
}

const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

console.log('\n' + HR)
console.log(`Section 3: Tag counts — ${allTags.length} total`)
console.log(HR)
for (const [name, n] of sorted) {
  console.log(`  <${name}>`.padEnd(20) + n)
}
console.log()
