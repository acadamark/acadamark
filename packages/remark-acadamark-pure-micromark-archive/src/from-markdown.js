/**
 * mdast-util-from-markdown extension for acadamark tags.
 *
 * Sigil tags (<#...#>) accumulate body text that is split at `|` on exit.
 * Named tags (<tagname ...>) emit separate attrString and content tokens.
 * Both produce the same acadamarkTag node shape.
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
      acadamarkTagName: exitAcadamarkTagName,
      acadamarkTagAttrString: exitAcadamarkTagAttrString,
      acadamarkTagContent: exitAcadamarkTagContent,
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
      _isSigil: false,
    },
    token,
  )
}

function exitAcadamarkTagSigil(token) {
  const node = this.stack[this.stack.length - 1]
  node.tagname = this.sliceSerialize(token)
  node._isSigil = true
}

function exitAcadamarkTagBody(token) {
  // May be called multiple times (one segment per failed-close attempt).
  const node = this.stack[this.stack.length - 1]
  if (node._rawBody === undefined) node._rawBody = ''
  node._rawBody += this.sliceSerialize(token)
}

function exitAcadamarkTagName(token) {
  const node = this.stack[this.stack.length - 1]
  node.tagname = this.sliceSerialize(token)
}

function exitAcadamarkTagAttrString(token) {
  const node = this.stack[this.stack.length - 1]
  node._rawAttrs = this.sliceSerialize(token)
}

function exitAcadamarkTagContent(token) {
  const node = this.stack[this.stack.length - 1]
  node._rawContent = this.sliceSerialize(token)
}

function exitAcadamarkTag(token) {
  const node = this.stack[this.stack.length - 1]

  if (node._isSigil) {
    const raw = node._rawBody || ''
    delete node._rawBody
    delete node._isSigil
    const pipeIdx = raw.indexOf('|')
    if (pipeIdx !== -1) {
      parseAttributes(node, raw.slice(0, pipeIdx))
      node.content = raw.slice(pipeIdx + 1)
    } else {
      node.content = raw
    }
    node.isOpaqueContent = true
  } else {
    const rawAttrs = node._rawAttrs || ''
    const rawContent = node._rawContent
    delete node._rawAttrs
    delete node._rawContent
    delete node._isSigil
    parseAttributes(node, rawAttrs)
    if (rawContent !== undefined) {
      node.content = rawContent
      // Slice 2: named-tag content is an opaque string. Recursive parsing of
      // content into child nodes is added in a later slice.
      node.isOpaqueContent = true
    }
  }

  this.exit(token)
}

/**
 * Parse an attribute string into the node's id, classes, booleans, kwargs,
 * and positional fields.
 *
 * Attribute forms (whitespace-separated, any order):
 *   #name          → id
 *   .name          → class (append)
 *   +name          → booleans.name = true
 *   -name          → booleans.name = false
 *   name=value     → kwargs.name = value (value may be quoted)
 *   name="value"   → kwargs.name = value
 *   name           → positional (append)
 *   [a, b, c]      → positional as array (append)
 *
 * Multiple space-separated naked tokens each become separate positionals:
 *   `<cite jones2001 smith2022>` → positional: ["jones2001", "smith2022"]
 *
 * Positionals use a permissive naked-token rule: after the first character,
 * any non-delimiter character continues the token. This allows file paths
 * (`puppy.jpg`), URLs (`https://example.com`), and hyphenated values
 * (`my-file.jpg`) without quoting. Keyword disambiguation: if a token starts
 * with an ASCII letter or digit and is immediately followed by `=`, it's a
 * keyword; otherwise it's a positional and permissive reading applies.
 *
 * @param {object} node
 * @param {string} str
 */
function parseAttributes(node, str) {
  let i = 0
  const len = str.length

  while (i < len) {
    while (i < len && isWhitespace(str[i])) i++
    if (i >= len) break

    const ch = str[i]

    if (ch === '#') {
      i++
      const start = i
      while (i < len && isAttrNameChar(str[i])) i++
      node.id = str.slice(start, i)
    } else if (ch === '.') {
      i++
      const start = i
      while (i < len && isAttrNameChar(str[i])) i++
      node.classes.push(str.slice(start, i))
    } else if (ch === '+' || ch === '-') {
      const isTrue = ch === '+'
      i++
      const start = i
      while (i < len && isAttrNameChar(str[i])) i++
      const name = str.slice(start, i)
      if (name) node.booleans[name] = isTrue
    } else if (ch === '[') {
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
    } else if (!isPositionalDelim(ch)) {
      // Positional or keyword. Read with restrictive tag_name rule first to
      // detect `name=value`. If no `=` follows, switch to permissive reading.
      const nameStart = i
      while (i < len && isAttrNameChar(str[i])) i++

      if (i < len && str[i] === '=') {
        // Keyword: name must be a valid tag_name
        const name = str.slice(nameStart, i)
        i++ // consume '='
        const value = readValue(str, i, len, false)
        i += valueLength(str, i, len)
        if (name) node.kwargs[name] = value
      } else {
        // Positional — continue with permissive reading to capture the rest
        // (e.g., the `://example.com` part of a URL, `.jpg` of a file path)
        while (i < len && !isPositionalDelim(str[i])) i++
        const token = str.slice(nameStart, i)
        if (token) node.positional.push(token)
      }
    } else {
      i++ // skip unknown syntactic characters
    }
  }
}

// --- helpers ---

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
}

function isAttrNameChar(ch) {
  return /[a-zA-Z0-9_-]/.test(ch)
}

/**
 * Characters that terminate a positional token.
 * Permissive: allows `.`, `-`, `:`, `/`, `?`, `&`, `%`, `+`, `#` inside tokens.
 * Only structural chars stop a positional.
 */
function isPositionalDelim(ch) {
  return (
    ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' ||
    ch === '|' || ch === '>' || ch === '<' ||
    ch === '[' || ch === ']' || ch === ',' ||
    ch === '"' || ch === "'"
  )
}

/**
 * Read a quoted or unquoted value starting at position i.
 * @param {boolean} inBracket  When true, treat `]` and `,` as delimiters
 */
function readValue(str, i, len, inBracket) {
  if (i >= len) return ''
  const ch = str[i]
  if (ch === '"' || ch === "'") {
    const quote = ch
    i++
    let result = ''
    while (i < len && str[i] !== quote) result += str[i++]
    return result
  }
  let result = ''
  while (i < len && !isValueDelim(str[i], inBracket)) result += str[i++]
  return result
}

function valueLength(str, i, len) {
  if (i >= len) return 0
  const ch = str[i]
  if (ch === '"' || ch === "'") {
    const quote = ch
    let j = i + 1
    while (j < len && str[j] !== quote) j++
    return j - i + (j < len ? 1 : 0)
  }
  let j = i
  while (j < len && !isValueDelim(str[j], false)) j++
  return j - i
}

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

/**
 * Characters that terminate an unquoted keyword value.
 * More permissive than positional: allows `.`, `-`, `:`, `/`, `+`, `#` etc.
 * Only hard structural chars stop a value.
 */
function isValueDelim(ch, inBracket) {
  if (isWhitespace(ch)) return true
  if (ch === '<' || ch === '>' || ch === '|' || ch === '=' || ch === '"' || ch === "'") return true
  if (inBracket && (ch === ']' || ch === ',')) return true
  return false
}
