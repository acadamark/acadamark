/**
 * mdast-util-from-markdown extension for acadamark tags.
 *
 * Thin delegator: the micromark finder emits `acadamarkTagRaw` containing the
 * full raw source of each construct. This extension serializes that token and
 * passes it to the Peggy parser, which handles all grammar semantics.
 */

import { parse as peggyParse } from './generated/parser.js'

/**
 * @returns {import('mdast-util-from-markdown').Extension}
 */
export function acadamarkFromMarkdown() {
  return {
    enter: {
      acadamarkTag: enterAcadamarkTag,
    },
    exit: {
      acadamarkTagRaw: exitAcadamarkTagRaw,
      acadamarkTag: exitAcadamarkTag,
    },
  }
}

function enterAcadamarkTag(token) {
  // Push a minimal stub; exitAcadamarkTagRaw fills in the real fields.
  this.enter({ type: 'acadamarkTag' }, token)
}

function exitAcadamarkTagRaw(token) {
  const node = this.stack[this.stack.length - 1]
  const source = this.sliceSerialize(token)
  try {
    const parsed = peggyParse(source)
    Object.assign(node, parsed)
  } catch (err) {
    // Malformed construct: the micromark finder accepted the boundaries but
    // the grammar rejected the interior. Preserve source for diagnostics.
    node.type = 'acadamarkTagError'
    node.source = source
    node.error = err.message
  }
}

function exitAcadamarkTag(token) {
  this.exit(token)
}
