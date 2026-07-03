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
import { ENSCRIBE_STRICT_MODE } from '../core/file-data-keys.js'

const MAX_DEPTH = 10

export default function remarkRecursiveContent(options = {}) {
  const { processor, processorSigil, processorCanonical, flowTagnames } = options
  if (!processor) {
    throw new Error(
      'remarkRecursiveContent requires a { processor } option — ' +
      'pass the inner unified pipeline to use for re-parsing content strings.',
    )
  }

  return (tree, file) => {
    // #36 strict mode: in sigil/canonical the sub-parses must run with the same
    // register(s) off, so the markdown (and, in canonical, the sigil) register is
    // off inside tag pipe bodies too. Select the matching inner processor for the
    // mode resolveStrictMode flagged on file.data.
    const mode = file?.data?.[ENSCRIBE_STRICT_MODE]
    const proc =
      mode === 'canonical' && processorCanonical ? processorCanonical :
      mode === 'sigil' && processorSigil ? processorSigil :
      processor
    processNodes(tree, proc, 0, flowTagnames)
  }
}

/**
 * Walk `subtree` and recursively parse string content on default-handler nodes.
 *
 * @param {object} subtree - any unist node with `.children`
 * @param {import('unified').Processor} processor
 * @param {number} depth - current recursion depth (0 = outermost)
 * @param {Set<string>} [flowTagnames] - tagnames whose content model is flow
 *   (a <p> is valid inside): their single-paragraph pipe body KEEPS its <p>
 *   wrapper (#326). Absent/non-member tagnames unwrap, the prior behavior.
 */
function processNodes(subtree, processor, depth, flowTagnames) {
  visit(subtree, 'enscribeTag', (node) => {
    if (node.contentHandler !== 'default') return SKIP
    if (node.content === null) return SKIP

    if (depth >= MAX_DEPTH) {
      // Reduce the offending tag to the canonical sparse `enscribeParseError`
      // shape — { type, subtype, source, position? } — matching the grammar-
      // emitted nodes and the from-markdown shortcut sites. The node arrives
      // here fully populated as an `enscribeTag`, so clear every field first;
      // clearing all keys (rather than a hand-maintained delete-list) keeps the
      // node sparse even if `enscribeTag` later gains a field. Preserve only
      // `position`, which the sibling in-place error sites also carry.
      const source = `<${node.tagname}>`
      const { position } = node
      for (const key of Object.keys(node)) delete node[key]
      node.type = 'enscribeParseError'
      node.subtype = 'max-recursion-depth'
      node.source = source
      if (position) node.position = position
      return SKIP
    }

    // #326 content-model gate: a flow element's single-paragraph pipe body
    // KEEPS its <p> (wrap); phrasing (and everything else) unwraps to inline
    // children. This parse-time central unwrap is the single seam — the
    // per-handler unwrap calls downstream do not re-decide it.
    const keepParagraph = flowTagnames ? flowTagnames.has(node.tagname) : false
    node.content = parseContent(node.content, processor, keepParagraph)
    node.isOpaqueContent = false

    // Recurse into the newly-revealed content nodes to handle any nested
    // enscribeTag nodes that themselves have string content.
    processNodes(
      { type: 'root', children: toChildren(node.content) },
      processor,
      depth + 1,
      flowTagnames,
    )

    return SKIP
  })
}

/**
 * Parse a content value (string or mixed array) through the inner pipeline.
 *
 * @param {string | Array} content
 * @param {import('unified').Processor} processor
 * @param {boolean} keepParagraph - when true (flow content model), a single
 *   paragraph is kept wrapped; when false, it is unwrapped to inline children.
 * @returns {Array} flat array of mdast nodes (and preserved error nodes)
 */
function parseContent(content, processor, keepParagraph) {
  if (typeof content === 'string') {
    return extractFromRoot(processor.parse(content), keepParagraph)
  }
  // content is a (string | node)[] mix: the OUTER parse already tokenized inline
  // constructs inside the pipe body (sigil `^{}`/`_{}` → <sup>/<sub>, and
  // escape-error markers), fragmenting the raw string AROUND already-resolved
  // INLINE nodes. Those nodes are terminal — they must NOT be re-tokenized, and
  // the fragments around them form ONE inline run per paragraph. Parsing each
  // string segment INDEPENDENTLY and (for flow) wrapping each in its own <p>
  // would split one inline run across paragraphs — the #326 bug where
  // `<aside | A^{st}B>` rendered `<aside><p>A</p><sup>st</sup><p>B</p></aside>`.
  // Assemble the fragments + resolved nodes into coherent paragraph(s), merging
  // inline content across the boundaries, then apply the content-model decision
  // ONCE to the whole — so the run stays a single <p> (flow) or bare inline
  // (phrasing), exactly as the all-string case does.
  return applyContentModel(assembleMixedContent(content, processor), keepParagraph)
}

/**
 * Assemble a `(string | node)[]` pipe-content array into block nodes, merging
 * inline content across fragment / resolved-node boundaries. String fragments
 * are parsed through the inner pipeline; already-resolved nodes (sigil-produced
 * `<sup>`/`<sub>`, inline tags, escape-error markers) are spliced into the open
 * inline run AS-IS — terminal, never re-tokenized — so an inline node between
 * two text fragments stays inside one paragraph. A blank-line break inside a
 * fragment (a non-final parsed paragraph) closes the current paragraph and
 * starts the next, so a genuinely multi-paragraph body still yields multiple
 * paragraphs (each correctly carrying its inline nodes).
 *
 * @param {Array} content - the `(string | node)[]` mixed content
 * @param {import('unified').Processor} processor
 * @returns {import('mdast').Content[]} block nodes (paragraphs + any block passthrough)
 */
function assembleMixedContent(content, processor) {
  const blocks = []
  let run = null
  const closeRun = () => {
    if (run) {
      blocks.push({ type: 'paragraph', children: run })
      run = null
    }
  }
  // Place one collapsed seam space onto the open run, merging into a trailing text node
  // when present (else a lone space node) so no adjacent-text-node split is introduced.
  const appendSeamSpace = (r) => {
    const last = r[r.length - 1]
    if (last && last.type === 'text') last.value += ' '
    else r.push({ type: 'text', value: ' ' })
  }
  for (let idx = 0; idx < content.length; idx += 1) {
    const item = content[idx]
    if (typeof item !== 'string') {
      // an already-resolved inline node — append to the open inline run (terminal)
      if (!run) run = []
      run.push(item)
      continue
    }
    // SEAM WHITESPACE — ROOT FIX (#348, retiring the #330 reconstruction). A string
    // fragment abuts resolved inline nodes at a SEAM, and its MEANINGFUL edge whitespace
    // (the space in `x ^{2}` / `1^{st} law`) sits right at that seam. `processor.parse`
    // parses each fragment as a paragraph and correctly trims paragraph-edge whitespace —
    // which is right for a paragraph but would swallow the seam space. So we EXTRACT the
    // fragment's edge whitespace HERE, before the parse, and place it explicitly across the
    // seam: the parser only ever sees the fragment CORE, never a meaningful space to lose,
    // so there is nothing to reconstruct afterwards (no transform-then-reverse). Rules, by
    // construction:
    //   - a BLANK-LINE edge is a paragraph break, not a seam space — it closes the run;
    //   - a lone space / soft break is a SEAM space only when a resolved node abuts that
    //     edge (leading: content already precedes in the run; trailing: a node follows) —
    //     otherwise it is a paragraph / body edge and stays trimmed;
    //   - the core (fragment minus its edge whitespace) is what the parser receives.
    // Keyed on the seam, not the sigil, so any mixed-array node is covered.
    const nextIsNode = idx + 1 < content.length && typeof content[idx + 1] !== 'string'
    const leadWs = /^\s+/.exec(item)?.[0] ?? ''
    const rest = item.slice(leadWs.length)
    const trailWs = /\s+$/.exec(rest)?.[0] ?? ''
    const core = rest.slice(0, rest.length - trailWs.length)
    const leadBreak = /\r?\n[ \t]*\r?\n/.test(leadWs)
    const trailBreak = /\r?\n[ \t]*\r?\n/.test(trailWs)
    // A leading paragraph break ends the preceding node's paragraph.
    if (leadBreak) closeRun()
    // A seam space survives only when a resolved node abuts that edge.
    const leadSeam = !leadBreak && leadWs !== '' && run != null && run.length > 0
    const trailSeam = !trailBreak && trailWs !== '' && nextIsNode

    if (core === '') {
      // A whitespace-only fragment has no content to parse — it is purely the seam between
      // two nodes. A blank line closes the run; otherwise one collapsed seam space rides
      // across to the following node (a body-edge space, with no open run, is dropped).
      if (trailBreak) closeRun()
      else if (nextIsNode && run && run.length && !leadBreak) appendSeamSpace(run)
      continue
    }

    const parsed = processor.parse(core).children
    for (let i = 0; i < parsed.length; i += 1) {
      const block = parsed[i]
      if (block.type === 'paragraph') {
        // continue (or open) the inline run with this paragraph's inline children
        if (!run) run = []
        // place the leading seam space on the FIRST paragraph only (a later paragraph
        // begins after an internal blank line — a real edge). Merge into the first text
        // child so no adjacent-text-node split is introduced.
        if (i === 0 && leadSeam) {
          const first = block.children[0]
          if (first && first.type === 'text') first.value = ` ${first.value}`
          else block.children.unshift({ type: 'text', value: ' ' })
        }
        run.push(...block.children)
        // a paragraph that is not the last parsed block ends at an internal blank line
        if (i < parsed.length - 1) closeRun()
      } else {
        // a non-paragraph block (rare in inline pipe context) — flush + emit as-is
        closeRun()
        blocks.push(block)
      }
    }

    // Place the trailing seam space onto the still-open run (a resolved node follows).
    if (trailBreak) closeRun()
    else if (trailSeam && run && run.length) appendSeamSpace(run)
  }
  closeRun()
  return blocks
}

/**
 * Extract usable content nodes from a parsed mdast root, gated by the
 * element's content model (#326).
 *
 * Single-paragraph root, PHRASING content (`keepParagraph` false) → return the
 * paragraph's inline children directly (unwrap). A <p> is invalid inside a
 * phrasing element (e.g. `<em><p>x</p></em>`), so this is a correctness
 * requirement. Matches constructs like `<em | text>` → `<em>text</em>`.
 *
 * Single-paragraph root, FLOW content (`keepParagraph` true) → return the
 * root's children (the single `paragraph`), keeping the <p> wrapper so a
 * single-paragraph `<abstract | text>` renders `<abstract><p>text</p></abstract>`,
 * consistent with the multi-paragraph case.
 *
 * Multi-child root → return the root's children (block-level structure).
 * This handles multi-paragraph content like `<aside | para1\n\npara2>`.
 *
 * @param {import('mdast').Root} root
 * @param {boolean} keepParagraph - flow content model keeps the single <p>.
 * @returns {import('mdast').Content[]}
 */
function extractFromRoot(root, keepParagraph) {
  return applyContentModel(root.children, keepParagraph)
}

/**
 * Apply the #326 content-model decision to a list of block nodes. PHRASING
 * (`keepParagraph` false) unwraps a lone paragraph to its inline children — a
 * `<p>` is invalid inside a phrasing element, so this is a correctness
 * requirement. FLOW (`keepParagraph` true) keeps the `<p>` wrapper so a
 * single paragraph matches the multi-paragraph case. Multi-block content is
 * returned unchanged. The all-string and mixed-array paths share this single
 * decision, so an inline run wraps (or unwraps) identically however the outer
 * parse fragmented it.
 *
 * @param {import('mdast').Content[]} blocks
 * @param {boolean} keepParagraph - flow keeps the single `<p>`.
 * @returns {import('mdast').Content[]}
 */
function applyContentModel(blocks, keepParagraph) {
  if (!keepParagraph && blocks.length === 1 && blocks[0].type === 'paragraph') {
    return blocks[0].children
  }
  return blocks
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
