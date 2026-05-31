/**
 * remarkRecursiveContent — remark transform plugin.
 *
 * Walks the mdast tree and re-parses string content for any `enscribeTag`
 * node whose `contentHandler` is `"default"`. After this transform, those
 * nodes' `content` field is `Node[]` (structured mdast children) rather than
 * a raw string. Nodes with DSL or opaque handlers are left untouched.
 *
 * Usage:
 *   import remarkRecursiveContent from './recursive-content.js'
 *   const inner = unified().use(remarkParse).use(remarkEnscribe) // ... etc.
 *   unified()
 *     .use(remarkParse)
 *     .use(remarkEnscribe)
 *     .use(remarkRecursiveContent, { processor: inner })
 *     .process(source)
 *
 * The `processor` option is the inner unified pipeline used for re-parsing
 * content strings. It should include the same parser plugins as the outer
 * pipeline but NOT include remarkRecursiveContent itself (recursion is handled
 * by this plugin's own tree walk, not by nesting plugin instances).
 *
 * Content-as-array handling: when escape rules have produced a
 * `(string | enscribeParseError)[]` value, each string segment is parsed
 * independently and the error nodes are preserved in-place. Prose between
 * errors renders correctly; errors don't cascade.
 *
 * Maximum recursion depth: 10. Beyond that, the node is converted to
 * `enscribeParseError` with subtype `max-recursion-depth`. In practice,
 * documents never approach this limit; it guards against malformed input.
 *
 * @param {{ processor: import('unified').Processor }} options
 * @returns {(tree: import('mdast').Root) => void}
 */

import { visit, SKIP } from 'unist-util-visit'

const MAX_DEPTH = 10

export default function remarkRecursiveContent(options = {}) {
  const { processor } = options
  if (!processor) {
    throw new Error(
      'remarkRecursiveContent requires a { processor } option — ' +
      'pass the inner unified pipeline to use for re-parsing content strings.',
    )
  }

  return (tree) => {
    processNodes(tree, processor, 0)
  }
}

/**
 * Walk `subtree` and recursively parse string content on default-handler nodes.
 *
 * @param {object} subtree - any unist node with `.children`
 * @param {import('unified').Processor} processor
 * @param {number} depth - current recursion depth (0 = outermost)
 */
function processNodes(subtree, processor, depth) {
  visit(subtree, 'enscribeTag', (node) => {
    if (node.contentHandler !== 'default') return SKIP
    if (node.content === null) return SKIP

    if (depth >= MAX_DEPTH) {
      node.type = 'enscribeParseError'
      node.subtype = 'max-recursion-depth'
      node.source = `<${node.tagname}>`
      delete node.content
      delete node.contentHandler
      delete node.isOpaqueContent
      return SKIP
    }

    node.content = parseContent(node.content, processor)
    node.isOpaqueContent = false

    // Recurse into the newly-revealed content nodes to handle any nested
    // enscribeTag nodes that themselves have string content.
    processNodes(
      { type: 'root', children: toChildren(node.content) },
      processor,
      depth + 1,
    )

    return SKIP
  })
}

/**
 * Parse a content value (string or mixed array) through the inner pipeline.
 *
 * @param {string | Array} content
 * @param {import('unified').Processor} processor
 * @returns {Array} flat array of mdast nodes (and preserved error nodes)
 */
function parseContent(content, processor) {
  if (typeof content === 'string') {
    return extractFromRoot(processor.parse(content))
  }
  // content is (string | enscribeParseError)[] from escape processing.
  // Parse each string segment; preserve error nodes in-place.
  return content.flatMap((item) =>
    typeof item === 'string'
      ? extractFromRoot(processor.parse(item))
      : [item],
  )
}

/**
 * Extract usable content nodes from a parsed mdast root.
 *
 * Single-paragraph root → return the paragraph's inline children directly.
 * This matches the expected content shape for constructs like `<aside | text>`.
 *
 * Multi-child root → return the root's children (block-level structure).
 * This handles multi-paragraph content like `<aside | para1\n\npara2>`.
 *
 * @param {import('mdast').Root} root
 * @returns {import('mdast').Content[]}
 */
function extractFromRoot(root) {
  if (root.children.length === 1 && root.children[0].type === 'paragraph') {
    return root.children[0].children
  }
  return root.children
}

/**
 * Return the content array as a children-compatible array for `visit`.
 * Handles both inline arrays (from single-paragraph unwrap) and block arrays.
 *
 * @param {Array|null} content
 * @returns {Array}
 */
function toChildren(content) {
  return Array.isArray(content) ? content : []
}
