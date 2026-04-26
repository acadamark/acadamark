import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkAcadamark from '../src/index.js'

const input = `\
# Standard Markdown Heading

This is a standard markdown paragraph with *emphasis* and a [link](https://example.com).

<# Introduction #>

Acadamark uses sigil tags for headings. A \`<#\` heading becomes an \`acadamarkTag\`
node in the mdast with \`tagname: "#"\`. The downstream interpreter (not yet built)
converts it to a \`<section>\` + \`<section-title>\` in Layer 1 HTML.

<## Background ##>

Sub-headings use double sigils.

<# #methods | Methods #>

Attributes go between the sigil and the \`|\`. Here, \`#methods\` sets the id.
The content (\`Methods\`) follows the \`|\`.

<## #bg .numbered | Background ##>

Multiple attributes: id and class.

More prose under the numbered sub-heading.
`

const processor = unified().use(remarkParse).use(remarkAcadamark)
const tree = processor.parse(input)

console.log('=== INPUT ===')
console.log(input)

console.log('=== MDAST (acadamarkTag nodes only) ===')
for (const node of tree.children) {
  if (node.type === 'acadamarkTag') {
    console.log(JSON.stringify({
      type: node.type,
      tagname: node.tagname,
      id: node.id,
      classes: node.classes,
      content: node.content,
      isOpaqueContent: node.isOpaqueContent,
    }, null, 2))
    console.log()
  }
}

console.log('=== ALL TOP-LEVEL NODE TYPES ===')
console.log(tree.children.map((n) => n.type).join(', '))
