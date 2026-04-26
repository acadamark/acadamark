/**
 * mdast-util-from-markdown extension for acadamark tags.
 *
 * Converts token events into acadamarkTag mdast nodes. For sigil tags, the
 * body is accumulated as raw text, then split at the first `|` to separate
 * the attribute section from the content.
 */

/**
 * @returns {import('mdast-util-from-markdown').Extension}
 */
export function acadamarkFromMarkdown() {
  return {
    enter: {
      acadamarkTag: enterAcadamarkTag,
    },
    exit: {
      acadamarkTagSigil: exitAcadamarkTagSigil,
      acadamarkTagBody: exitAcadamarkTagBody,
      acadamarkTag: exitAcadamarkTag,
    },
  }
}

function enterAcadamarkTag(token) {
  this.enter(
    {
      type: 'acadamarkTag',
      tagname: null,
      positional: [],
      booleans: {},
      kwargs: {},
      id: null,
      classes: [],
      content: null,
      isOpaqueContent: false,
      _rawBody: '',
    },
    token,
  )
}

function exitAcadamarkTagSigil(token) {
  const node = this.stack[this.stack.length - 1]
  node.tagname = this.sliceSerialize(token)
}

function exitAcadamarkTagBody(token) {
  // May be called multiple times (one per body segment from failed-close
  // attempts). Accumulate all segments.
  const node = this.stack[this.stack.length - 1]
  node._rawBody += this.sliceSerialize(token)
}

function exitAcadamarkTag(token) {
  const node = this.stack[this.stack.length - 1]
  const raw = node._rawBody
  delete node._rawBody

  // Sigil tags: if `|` is present, everything before is the attribute section
  // and everything after is content. If absent, the whole body is content
  // (no attribute parsing, per spec decision).
  const pipeIdx = raw.indexOf('|')
  if (pipeIdx !== -1) {
    const attrStr = raw.slice(0, pipeIdx)
    const contentStr = raw.slice(pipeIdx + 1)
    parseAttributes(node, attrStr)
    node.content = contentStr
  } else {
    node.content = raw
  }

  node.isOpaqueContent = true  // sigil tags always have opaque content

  this.exit(token)
}

/**
 * Parse an attribute string into the node's id, classes, booleans, kwargs,
 * and positional fields.
 *
 * Attribute forms (space-separated, any order):
 *   #name          → id
 *   .name          → class (append)
 *   +name          → booleans.name = true
 *   -name          → booleans.name = false
 *   name=value     → kwargs.name = value (value may be quoted)
 *   name="value"   → kwargs.name = value
 *   name           → positional (append)
 *   [a, b, c]      → positional as array (append)
 *
 * @param {object} node
 * @param {string} str
 */
function parseAttributes(node, str) {
  let i = 0
  const len = str.length

  while (i < len) {
    // Skip whitespace
    while (i < len && isWhitespace(str[i])) i++
    if (i >= len) break

    const ch = str[i]

    if (ch === '#') {
      // id: #name
      i++
      const start = i
      while (i < len && isAttrNameChar(str[i])) i++
      node.id = str.slice(start, i)
    } else if (ch === '.') {
      // class: .name
      i++
      const start = i
      while (i < len && isAttrNameChar(str[i])) i++
      node.classes.push(str.slice(start, i))
    } else if (ch === '+' || ch === '-') {
      // flag: +name (true) or -name (false)
      const isTrue = ch === '+'
      i++
      const start = i
      while (i < len && isAttrNameChar(str[i])) i++
      const name = str.slice(start, i)
      if (name) node.booleans[name] = isTrue
    } else if (ch === '[') {
      // bracketed list: [item1, item2, ...]
      i++ // consume '['
      const items = []
      while (i < len && str[i] !== ']') {
        while (i < len && isWhitespace(str[i])) i++
        if (str[i] === ']') break
        items.push(readValue(str, i, len, true))
        i += itemLength(str, i, len, true)
        while (i < len && isWhitespace(str[i])) i++
        if (i < len && str[i] === ',') i++
      }
      if (i < len && str[i] === ']') i++
      node.positional.push(items)
    } else if (isAttrStartChar(ch)) {
      // positional or keyword (name=value)
      const nameStart = i
      while (i < len && isAttrNameChar(str[i])) i++
      const name = str.slice(nameStart, i)

      if (i < len && str[i] === '=') {
        // keyword
        i++
        const value = readValue(str, i, len, false)
        i += valueLength(str, i, len)
        node.kwargs[name] = value
      } else {
        node.positional.push(name)
      }
    } else {
      i++ // skip unknown characters
    }
  }
}

// --- helpers ---

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
}

// Characters valid in attribute names and keyword names.
// Matches tag_name rule: starts with letter, continues with letter/digit/_/-
function isAttrStartChar(ch) {
  return /[a-zA-Z0-9_]/.test(ch)
}

function isAttrNameChar(ch) {
  return /[a-zA-Z0-9_-]/.test(ch)
}

/**
 * Read a quoted or unquoted value starting at position i.
 * @param {string} str
 * @param {number} i
 * @param {number} len
 * @param {boolean} inBracket  When true, treat ']' and ',' as delimiters
 * @returns {string}
 */
function readValue(str, i, len, inBracket) {
  if (i >= len) return ''
  const ch = str[i]
  if (ch === '"' || ch === "'") {
    // quoted string
    const quote = ch
    i++
    let result = ''
    while (i < len && str[i] !== quote) result += str[i++]
    return result
  }
  // unquoted value: stop at whitespace or syntactic delimiters
  // '-' is allowed in values (per spec decision)
  let result = ''
  while (i < len && !isValueDelim(str[i], inBracket)) result += str[i++]
  return result
}

/**
 * Compute how many characters a value occupies starting at position i.
 */
function valueLength(str, i, len) {
  if (i >= len) return 0
  const ch = str[i]
  if (ch === '"' || ch === "'") {
    const quote = ch
    let j = i + 1
    while (j < len && str[j] !== quote) j++
    return j - i + (j < len ? 1 : 0) // include closing quote if found
  }
  let j = i
  while (j < len && !isValueDelim(str[j], false)) j++
  return j - i
}

/**
 * Compute how many characters a bracketed-list item occupies at position i.
 */
function itemLength(str, i, len, inBracket) {
  if (i >= len) return 0
  const ch = str[i]
  if (ch === '"' || ch === "'") {
    const quote = ch
    let j = i + 1
    while (j < len && str[j] !== quote) j++
    return j - i + (j < len ? 1 : 0)
  }
  let j = i
  while (j < len && !isValueDelim(str[j], true)) j++
  return j - i
}

function isValueDelim(ch, inBracket) {
  if (isWhitespace(ch)) return true
  if (ch === '<' || ch === '>' || ch === '+' || ch === '#' || ch === '.' ||
      ch === '=' || ch === '"' || ch === "'") return true
  if (inBracket && (ch === ']' || ch === ',')) return true
  return false
}
