/**
 * Remark plugin for the acadamark shorthand syntax.
 *
 * Wires the micromark boundary finder (syntax.js) and the fromMarkdown
 * delegator (from-markdown.js) into the remark processor.
 *
 * Usage:
 *   unified().use(remarkParse).use(remarkAcadamark).parse(source)
 *
 * The plugin takes no options — `<tag>…</tag>` long-form parses for every
 * named tag (the DSL/long-form parser bug fix removed the registry gate
 * that previously required tag-list configuration). The historical
 * `dslRegistry` option was removed in that fix; no caller passed it.
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
