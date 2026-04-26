import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkAcadamark from '../src/index.js'
import { inspect } from 'node:util'

const source = `
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

console.log('mdast tree:\n')
console.log(inspect(tree, { depth: 6, colors: true }))

// Show just the acadamarkTag nodes
const tags = tree.children.filter((n) => n.type === 'acadamarkTag')
console.log('\nAcadamark tags at block level:')
for (const tag of tags) {
  const { type: _type, ...fields } = tag
  console.log(`  <${tag.tagname}>`, JSON.stringify(fields))
}
