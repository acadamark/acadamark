/**
 * Remark plugin for the enscribe shorthand syntax.
 *
 * Wires the micromark boundary finder (syntax.js) and the fromMarkdown
 * delegator (from-markdown.js) into the remark processor.
 *
 * Usage:
 *   unified().use(remarkParse).use(remarkEnscribe).parse(source)
 *
 * Options: `{ sigils = true }`. Forwarded to `enscribeSyntax`. With `sigils:
 * false` the SIGIL register is dropped from the finder (the `<# #>` / `<$ $>` /
 * `` <` `> `` sigil tags and the `<->` / `<*>` item markers pass through as
 * literal text; canonical named tags, `<li>`, long-form, and `^{}`/`_{}`
 * shortcuts are unaffected). This is how the #36 `canonical` strict-mode rung
 * builds its sigil-less re-parse. The default is the full finder, byte-identical.
 *
 * (`<tag>…</tag>` long-form parses for every named tag — the DSL/long-form parser
 * bug fix removed the registry gate. The historical `dslRegistry` option was
 * removed in that fix; no caller passed it.)
 *
 * @param {{ sigils?: boolean }} [options]
 */

import { enscribeSyntax } from './syntax.js'
import { enscribeFromMarkdown } from './from-markdown.js'

/**
 * @this {import('unified').Processor}
 * @param {{ sigils?: boolean }} [options]
 * @returns {undefined}
 */
export default function remarkEnscribe(options = {}) {
  const data = this.data()

  if (!data.micromarkExtensions) data.micromarkExtensions = []
  if (!data.fromMarkdownExtensions) data.fromMarkdownExtensions = []

  data.micromarkExtensions.push(enscribeSyntax({ sigils: options.sigils !== false }))
  data.fromMarkdownExtensions.push(enscribeFromMarkdown())
}
