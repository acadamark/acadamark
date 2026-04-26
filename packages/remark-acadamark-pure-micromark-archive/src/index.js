/**
 * Remark plugin for the acadamark shorthand syntax.
 *
 * Registers the micromark syntax extension and the mdast-util-from-markdown
 * extension with the remark processor. Must be used with remark-parse (which
 * reads these extensions from the processor's data store).
 *
 * Usage:
 *   unified().use(remarkParse).use(remarkAcadamark).parse(source)
 */

import { acadamarkSyntax } from './syntax.js'
import { acadamarkFromMarkdown } from './from-markdown.js'

export { acadamarkSyntax, acadamarkFromMarkdown }

/**
 * @this {import('unified').Processor}
 * @returns {undefined}
 */
export default function remarkAcadamark() {
  const data = this.data()

  if (!data.micromarkExtensions) data.micromarkExtensions = []
  if (!data.fromMarkdownExtensions) data.fromMarkdownExtensions = []

  data.micromarkExtensions.push(acadamarkSyntax())
  data.fromMarkdownExtensions.push(acadamarkFromMarkdown())
}
