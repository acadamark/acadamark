/**
 * mdast-util-from-markdown extension for acadamark tags.
 *
 * Thin delegator: the micromark finder emits `acadamarkTagRaw` containing the
 * full raw source of each construct. This extension serializes that token and
 * passes it to the Peggy parser, which handles all grammar semantics.
 *
 * For single-line constructs the finder emits one `acadamarkTagRaw` chunk.
 * For multi-line flow constructs the finder emits multiple `acadamarkTagRaw`
 * chunks (one per line segment) with `lineEnding` sibling tokens between them.
 * `exitAcadamarkTagRaw` accumulates each chunk's text; `exitAcadamarkTag`
 * joins them (inserting `\n` at each boundary) and passes the full source to
 * the Peggy grammar. Single-line constructs produce a single chunk and behave
 * identically to before.
 *
 * For long-form tags the finder emits four token types instead of one raw span:
 *   acadamarkLongFormTag        (outer container)
 *   acadamarkLongFormOpen       (the opening `<tagname attrs>`, may span lines)
 *   acadamarkLongFormContent    (verbatim content; may appear multiple times,
 *                                concatenated — see syntax.js for why)
 *   acadamarkLongFormClose      (the `</tagname>` closer; absent on EOF)
 *
 * Missing close detection: if no `acadamarkLongFormClose` exit fires before
 * `acadamarkLongFormTag` exits, the node is converted to `acadamarkTagError`.
 */

import { parse as peggyParse } from './generated/parser.js'
import { getContentHandler } from './dsl-registry.js'

/**
 * @returns {import('mdast-util-from-markdown').Extension}
 */
export function acadamarkFromMarkdown() {
  return {
    enter: {
      acadamarkTag: enterAcadamarkTag,
      acadamarkLongFormTag: enterAcadamarkLongFormTag,
    },
    exit: {
      acadamarkTagRaw: exitAcadamarkTagRaw,
      acadamarkTag: exitAcadamarkTag,
      acadamarkLongFormOpen: exitAcadamarkLongFormOpen,
      acadamarkLongFormContent: exitAcadamarkLongFormContent,
      acadamarkLongFormClose: exitAcadamarkLongFormClose,
      acadamarkLongFormTag: exitAcadamarkLongFormTag,
      // Capture line endings inside long-form tags. The syntax.js tokenizer emits
      // explicit lineEnding void-tokens (required by micromark's subtokenize
      // algorithm for multi-line flow constructs). We recapture them here so that
      // node.content includes the newlines, not just the line text.
      lineEnding: exitLineEnding,
    },
  }
}

// ─── Short-form (sigil + named) ────────────────────────────────────────────

function enterAcadamarkTag(token) {
  // Push a minimal stub; exitAcadamarkTag fills in the real fields.
  // _rawChunks accumulates one entry per acadamarkTagRaw chunk (one per line
  // for multi-line constructs, one total for single-line).
  this.enter({ type: 'acadamarkTag', _rawChunks: [] }, token)
}

function exitAcadamarkTagRaw(token) {
  // Accumulate this line's raw text. Parsing is deferred to exitAcadamarkTag
  // so that multi-line constructs (multiple chunks) are joined first.
  // Guard: a zero-length token at EOF has a null chunk — sliceSerialize crashes.
  // This occurs when a lineEnding is consumed immediately before EOF, producing
  // an empty trailing acadamarkTagRaw. Skip it; the join('\n') in exitAcadamarkTag
  // already inserts the newline between chunks.
  if (token.start.offset >= token.end.offset) return
  const node = this.stack[this.stack.length - 1]
  node._rawChunks.push(this.sliceSerialize(token))
}

function exitAcadamarkTag(token) {
  const node = this.stack[this.stack.length - 1]
  // Join chunks: single-line → one chunk, no change; multi-line → join with \n.
  const source = node._rawChunks.join('\n')
  delete node._rawChunks
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
  this.exit(token)
}

// ─── Long-form ─────────────────────────────────────────────────────────────

function enterAcadamarkLongFormTag(token) {
  this.enter(
    {
      type: 'acadamarkTag',
      form: 'long',
      tagname: null,
      positional: [],
      booleans: {},
      kwargs: {},
      id: null,
      classes: [],
      content: '',
      isOpaqueContent: true,
      contentHandler: 'default',
      _hasClose: false,
      _inOpener: true,
    },
    token,
  )
}

function exitAcadamarkLongFormOpen(token) {
  const node = this.stack[this.stack.length - 1]
  node._inOpener = false
  const openSource = this.sliceSerialize(token)
  try {
    // The opening tag `<tagname attrs>` is a valid short-form named tag.
    // Parse it with Peggy to extract tagname and all attribute fields.
    const parsed = peggyParse(openSource)
    node.tagname = parsed.tagname
    node.positional = parsed.positional
    node.booleans = parsed.booleans
    node.kwargs = parsed.kwargs
    node.id = parsed.id
    node.classes = parsed.classes
    node.contentHandler = getContentHandler(parsed.tagname)
  } catch (err) {
    node.type = 'acadamarkTagError'
    node.source = openSource
    node.error = err.message
  }
}

function exitAcadamarkLongFormContent(token) {
  const node = this.stack[this.stack.length - 1]
  // Guard against zero-length tokens at EOF (start === end offset). These are
  // produced when content(null) exits an acadamarkLongFormContent that was
  // entered by notClose() just before EOF — sliceSerialize would crash on the
  // null chunk at that position.
  if (node.type === 'acadamarkTag' && token.start.offset < token.end.offset) {
    node.content += this.sliceSerialize(token)
  }
}

function exitLineEnding(token) {
  // Append newlines that were emitted as standalone lineEnding void-tokens.
  // Fires for both long-form content newlines and short-form multi-line
  // construct newlines (between acadamarkTagRaw chunks). For short-form,
  // the lineEnding appears between two acadamarkTagRaw chunks as a sibling;
  // the node on the stack is still an acadamarkTag (not yet exited).
  //
  // Gate: only append to long-form tags that haven't closed yet. Short-form
  // raw chunks handle their own newlines via the join('\n') in exitAcadamarkTag.
  const node = this.stack[this.stack.length - 1]
  if (node && node.type === 'acadamarkTag' && node.form === 'long' && !node._hasClose && !node._inOpener) {
    node.content += this.sliceSerialize(token)
  }
}

function exitAcadamarkLongFormClose(token) {
  const node = this.stack[this.stack.length - 1]
  node._hasClose = true
}

function exitAcadamarkLongFormTag(token) {
  const node = this.stack[this.stack.length - 1]
  if (!node._hasClose && node.type !== 'acadamarkTagError') {
    // EOF reached before `</tagname>` — the finder emitted no close token.
    node.type = 'acadamarkTagError'
    node.error = 'long-form tag has no closing tag'
  }
  delete node._hasClose
  delete node._inOpener
  this.exit(token)
}
