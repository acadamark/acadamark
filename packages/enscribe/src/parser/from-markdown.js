/**
 * mdast-util-from-markdown extension for enscribe tags.
 *
 * Thin delegator: the micromark finder emits `enscribeTagRaw` containing the
 * full raw source of each construct. This extension serializes that token and
 * passes it to the Peggy parser, which handles all grammar semantics.
 *
 * For single-line constructs the finder emits one `enscribeTagRaw` chunk.
 * For multi-line flow constructs the finder emits multiple `enscribeTagRaw`
 * chunks (one per line segment) with `lineEnding` sibling tokens between them.
 * `exitEnscribeTagRaw` accumulates each chunk's text; `exitEnscribeTag`
 * joins them (inserting `\n` at each boundary) and passes the full source to
 * the Peggy grammar. Single-line constructs produce a single chunk and behave
 * identically to before.
 *
 * For long-form tags the finder emits four token types instead of one raw span:
 *   enscribeLongFormTag        (outer container)
 *   enscribeLongFormOpen       (the opening `<tagname attrs>`, may span lines)
 *   enscribeLongFormContent    (verbatim content; may appear multiple times,
 *                                concatenated — see syntax.js for why)
 *   enscribeLongFormClose      (the `</tagname>` closer; absent on EOF)
 *
 * Missing close detection: if no `enscribeLongFormClose` exit fires before
 * `enscribeLongFormTag` exits, the node is converted to `enscribeTagError`.
 */

import { parse as peggyParse } from './generated/parser.js'
import { getContentHandler } from '../core/dsl-registry.js'

// Node types that the built-in onexitlineending treats as containers for
// end-of-line characters. This list mirrors mdast-util-from-markdown's
// canContainEols default: ['emphasis', 'fragment', 'heading', 'paragraph',
// 'strong']. The 'fragment' type is what matters most: mdast-util-from-markdown
// pushes a `fragment` node via buffer() when entering fenced code block content,
// and newlines between codeFlowValue tokens must land in that fragment.
const MDAST_CAN_CONTAIN_EOLS = new Set([
  'emphasis',
  'fragment',
  'heading',
  'paragraph',
  'strong',
])

/**
 * @returns {import('mdast-util-from-markdown').Extension}
 */
export function enscribeFromMarkdown() {
  return {
    enter: {
      enscribeTag: enterEnscribeTag,
      enscribeLongFormTag: enterEnscribeLongFormTag,
    },
    exit: {
      enscribeTag: exitEnscribeTag,
      enscribeLongFormOpen: exitEnscribeLongFormOpen,
      enscribeLongFormContent: exitEnscribeLongFormContent,
      enscribeLongFormClose: exitEnscribeLongFormClose,
      enscribeLongFormTag: exitEnscribeLongFormTag,
      // Capture line endings inside long-form tags. The syntax.js tokenizer emits
      // explicit lineEnding void-tokens (required by micromark's subtokenize
      // algorithm for multi-line flow constructs). We recapture them here so that
      // node.content includes the newlines, not just the line text.
      lineEnding: exitLineEnding,
    },
  }
}

// ─── Short-form (sigil + named + shortcut) ─────────────────────────────────

function enterEnscribeTag(token) {
  // Push a minimal stub; exitEnscribeTag fills in the real fields.
  this.enter({ type: 'enscribeTag' }, token)
}

function exitEnscribeTag(token) {
  const node = this.stack[this.stack.length - 1]
  // Serialize the entire span of the enscribeTag outer token. This span runs
  // from `<` to just after `>` and includes embedded newlines regardless of
  // whether the tag was parsed in flow or text position. Per-line chunk
  // serialization (the former _rawChunks approach) does not work for text-
  // position multi-line tags because sliceSerialize on cross-line text chunks
  // returns "" for lines after the first. The outer token span is always
  // correct: micromark tracks start/end offsets as absolute positions in the
  // input buffer, and sliceSerialize reads directly from that buffer.
  const source = this.sliceSerialize(token)

  // Inline TeX shortcut: ^{...} → sup, _{...} → sub.
  // Source starts with ^ or _ (not <). Handled directly without Peggy — no
  // grammar step needed. buildShortcutNode matches the node shape emitted by
  // G1a's SuperscriptShortcut / SubscriptShortcut grammar rules field-for-field.
  if (source[0] === '^' || source[0] === '_') {
    buildShortcutNode(node, source)
    this.exit(token)
    return
  }

  // List item marker: the block-scoped paired sigil `<- content ->` /
  // `<* content *>`. The flow-only tokenizeItemMarkerFlow (syntax.js) found the
  // boundaries; source starts with `<-` or `<*`. Handled directly without Peggy
  // — no grammar rule — mirroring the shortcut path above. buildItemMarkerNode
  // produces a default-content enscribeTag the recursive-content pass re-parses
  // and enscribeListStructuring lowers to a markdown list item. See
  // notes/specs/lists.md §"Items".
  if (source[0] === '<' && (source[1] === '-' || source[1] === '*')) {
    buildItemMarkerNode(node, source)
    this.exit(token)
    return
  }

  try {
    const parsed = peggyParse(source)
    Object.assign(node, parsed)
    // Set contentHandler for all short-form tags (named and sigil). The grammar
    // doesn't call getContentHandler; we do it here, mirroring the long-form path.
    if (node.tagname) {
      node.contentHandler = getContentHandler(node.tagname)
      // isOpaqueContent: false for default-handler tags (prose, will be recursively
      // parsed). True for DSL/math/code tags (intentionally opaque). This is set
      // at parse time — the flag reflects the node's relationship to its content,
      // not the processing stage.
      if (node.contentHandler === 'default' && node.content !== null) {
        node.isOpaqueContent = false
      }
    }
  } catch (err) {
    // Malformed construct: the micromark finder accepted the boundaries but
    // the grammar rejected the interior. Preserve source for diagnostics.
    node.type = 'enscribeTagError'
    node.source = source
    node.error = err.message
  }
  this.exit(token)
}

/**
 * Build a shortcut enscribeTag node in-place from the serialized token source.
 *
 * Matches the node shape emitted by G1a's SuperscriptShortcut / SubscriptShortcut
 * grammar rules exactly — field for field — so top-level prose shortcuts and
 * in-tag shortcuts produce identical nodes downstream.
 *
 * @param {object} node  - The enscribeTag stub to modify in-place.
 * @param {string} source - Serialized token text, e.g. "^{st}" or "_{2}".
 */
function buildShortcutNode(node, source) {
  const tagname = source[0] === '^' ? 'sup' : 'sub'

  if (source[source.length - 1] !== '}') {
    // No closing } — tokenizer exited on EOF or line ending. Unterminated shortcut.
    Object.assign(node, { type: 'enscribeParseError', subtype: 'unterminated-shortcut', source })
    return
  }

  const content = source.slice(2, -1) // strip trigger+{ and closing }

  if (content === '') {
    // ^{} or _{} — empty braces.
    Object.assign(node, { type: 'enscribeParseError', subtype: 'empty-shortcut', source })
    return
  }

  Object.assign(node, {
    type: 'enscribeTag',
    form: 'shortcut',
    tagname,
    contentHandler: 'default',
    content,
    isOpaqueContent: false,
    positional: [],
    booleans: {},
    kwargs: {},
    id: null,
    classes: [],
    atRefs: [],
    selfClosing: false,
  })
}

/**
 * Build a list item-marker enscribeTag node in-place from the serialized source.
 *
 * The marker is the paired sigil `<- content ->` or `<* content *>`; `content`
 * is everything between the opening `<` + marker run and the closing marker run
 * + `>`. The node is a default-content tag — its `content` string is re-parsed
 * by remarkRecursiveContent into inline mdast (so inline tags like `<cite>`
 * inside an item work) — and is later lowered to a markdown `listItem` by
 * enscribeListStructuring. The transient `tagname` (`list-item`) never reaches a
 * renderer; it is consumed by that lowering pass.
 *
 * @param {object} node   - The enscribeTag stub to modify in-place.
 * @param {string} source - Serialized token text, e.g. "<- first item ->".
 */
function buildItemMarkerNode(node, source) {
  const marker = source[1] // '-' or '*'

  if (source[source.length - 1] !== '>') {
    // Defensive: the sigil finder only emits this construct on a closing `>`, so
    // this should be unreachable. Treat a malformed span as a parse error rather
    // than silently dropping it.
    Object.assign(node, { type: 'enscribeParseError', subtype: 'unterminated-item-marker', source })
    return
  }

  // Strip the opening `<` + run of marker chars, and the trailing run of marker
  // chars + `>` (the paired sigil close), leaving the item content.
  let i = 1;
  while (i < source.length && source[i] === marker) i++;
  let j = source.length - 2; // index just before the closing `>`
  while (j >= i && source[j] === marker) j--;
  const content = source.slice(i, j + 1);

  Object.assign(node, {
    type: 'enscribeTag',
    form: 'item-marker',
    tagname: 'list-item',
    marker,
    content,
    isOpaqueContent: false,
    contentHandler: 'default',
    positional: [],
    booleans: {},
    kwargs: {},
    id: null,
    classes: [],
    atRefs: [],
    selfClosing: false,
  })
}

// ─── Long-form ─────────────────────────────────────────────────────────────

function enterEnscribeLongFormTag(token) {
  this.enter(
    {
      type: 'enscribeTag',
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

function exitEnscribeLongFormOpen(token) {
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
    // isOpaqueContent: false for default-handler long-form tags (aside,
    // blockquote, note, table — prose content, will be recursively parsed).
    // True for DSL tags (csv, math, etc. — intentionally opaque source).
    node.isOpaqueContent = node.contentHandler !== 'default'
  } catch (err) {
    node.type = 'enscribeTagError'
    node.source = openSource
    node.error = err.message
  }
}

function exitEnscribeLongFormContent(token) {
  const node = this.stack[this.stack.length - 1]
  // Guard against zero-length tokens at EOF (start === end offset). These are
  // produced when content(null) exits an enscribeLongFormContent that was
  // entered by notClose() just before EOF — sliceSerialize would crash on the
  // null chunk at that position.
  if (node.type === 'enscribeTag' && token.start.offset < token.end.offset) {
    node.content += this.sliceSerialize(token)
  }
}

function exitLineEnding(token) {
  // Fires for every lineEnding exit event in the document because the enscribe
  // from-markdown extension registers this handler via Object.assign, which
  // REPLACES (not extends) the built-in onexitlineending in mdast-util-from-
  // markdown. We must therefore replicate the built-in behaviour here in
  // addition to our own enscribe-specific handling.
  const node = this.stack[this.stack.length - 1]

  // Case 1: inside a long-form enscribe tag — append \n to node.content.
  if (node?.type === 'enscribeTag' && node.form === 'long' && !node._hasClose && !node._inOpener) {
    node.content += this.sliceSerialize(token)
    return
  }

  // Case 2: replicate built-in onexitlineending for all other node types.
  //
  // The built-in handler: if canContainEols includes the context type (and we're
  // not slurping a setext heading), call onenterdata + onexitdata to append the
  // newline to the current text accumulation. The 'fragment' case is critical:
  // mdast-util-from-markdown pushes a fragment via buffer() before fenced code
  // block content, so lineEnding tokens between codeFlowValue tokens must land
  // in that fragment — otherwise code.value loses its \n characters.
  if (this.data.setextHeadingSlurpLineEnding) return
  if (!node?.children || !MDAST_CAN_CONTAIN_EOLS.has(node.type)) return

  const eol = this.sliceSerialize(token)
  const siblings = node.children
  const tail = siblings[siblings.length - 1]
  if (tail?.type === 'text') {
    tail.value += eol
    tail.position.end = token.end
  } else {
    siblings.push({
      type: 'text',
      value: eol,
      position: { start: token.start, end: token.end },
    })
  }
}

function exitEnscribeLongFormClose(token) {
  const node = this.stack[this.stack.length - 1]
  node._hasClose = true
}

function exitEnscribeLongFormTag(token) {
  const node = this.stack[this.stack.length - 1]
  if (!node._hasClose && node.type !== 'enscribeTagError') {
    // EOF reached before `</tagname>` — the finder emitted no close token.
    node.type = 'enscribeTagError'
    node.error = 'long-form tag has no closing tag'
  }
  delete node._hasClose
  delete node._inOpener
  this.exit(token)
}
