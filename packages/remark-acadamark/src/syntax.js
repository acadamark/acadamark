/**
 * @import {Code, Effects, State, Tokenizer} from 'micromark-util-types'
 */

import { markdownLineEnding } from 'micromark-util-character'

const LT = 60    // <
const GT = 62    // >
const PIPE = 124 // |
const SLASH = 47 // /
const SQUOTE = 39 // '
const DQUOTE = 34 // "

// Registered sigil characters. Each maps to itself; extend here for $, `, etc.
const SIGIL_CHARS = new Set([
  35,  // #  → section headings
  // 36,  // $  → math (future slice)
  // 96,  // `  → code (future slice)
])

/** @param {Code} code */
function isAsciiAlphaCode(code) {
  return code !== null && ((code >= 65 && code <= 90) || (code >= 97 && code <= 122))
}

/** @param {Code} code */
function isTagNameContinueCode(code) {
  return (
    code !== null &&
    (isAsciiAlphaCode(code) ||
      (code >= 48 && code <= 57) || // 0-9
      code === 95 || // _
      code === 45)   // -
  )
}

/**
 * Micromark syntax extension for acadamark tags.
 *
 * Flow (block-level): sigil tags (<#...#>) and named tags (<tag ...>)
 * Text (inline): named tags only
 *
 * @returns {import('micromark-util-types').Extension}
 */
export function acadamarkSyntax() {
  return {
    flow: {
      [LT]: [
        { tokenize: tokenizeSigilTag, concrete: true },
        { tokenize: tokenizeNamedTag, concrete: true },
      ],
    },
    text: {
      [LT]: { tokenize: tokenizeNamedTag },
    },
  }
}

/**
 * Tokenizer for sigil tags: <#...#>, <##...##>, etc.
 *
 * Body segments accumulate across failed-close attempts; fromMarkdown
 * concatenates them all.
 *
 * @type {Tokenizer}
 */
function tokenizeSigilTag(effects, ok, nok) {
  /** @type {number} */
  let sigilChar
  let sigilCount = 0

  return start

  /** @param {Code} code */
  function start(code) {
    if (code !== LT) return nok(code)
    effects.enter('acadamarkTag')
    effects.enter('acadamarkTagMarkerOpen')
    effects.consume(code)
    effects.exit('acadamarkTagMarkerOpen')
    return afterLt
  }

  /** @param {Code} code */
  function afterLt(code) {
    if (code !== null && SIGIL_CHARS.has(code)) {
      sigilChar = code
      effects.enter('acadamarkTagSigil')
      return consumeSigil(code)
    }
    return nok(code)
  }

  /** @param {Code} code */
  function consumeSigil(code) {
    if (code === sigilChar) {
      effects.consume(code)
      sigilCount++
      return consumeSigil
    }
    effects.exit('acadamarkTagSigil')
    effects.enter('acadamarkTagBody')
    return body(code)
  }

  /** @param {Code} code */
  function body(code) {
    if (code === null || markdownLineEnding(code)) return nok(code)
    if (code === sigilChar) {
      effects.exit('acadamarkTagBody')
      return effects.attempt(
        { tokenize: tokenizeClose, partial: true },
        afterClose,
        failedClose,
      )(code)
    }
    effects.consume(code)
    return body
  }

  /** @param {Code} code */
  function failedClose(code) {
    effects.enter('acadamarkTagBody')
    effects.consume(code)
    return body
  }

  /** @param {Code} code */
  function afterClose(code) {
    effects.exit('acadamarkTag')
    return ok(code)
  }

  /** @type {Tokenizer} */
  function tokenizeClose(effects, ok, nok) {
    let closeCount = 0

    return startClose

    /** @param {Code} code */
    function startClose(code) {
      if (code !== sigilChar) return nok(code)
      effects.enter('acadamarkTagMarkerClose')
      return consumeCloseSigil(code)
    }

    /** @param {Code} code */
    function consumeCloseSigil(code) {
      if (code === sigilChar && closeCount < sigilCount) {
        effects.consume(code)
        closeCount++
        return closeCount === sigilCount ? checkGt : consumeCloseSigil
      }
      return nok(code)
    }

    /** @param {Code} code */
    function checkGt(code) {
      if (code === GT) {
        effects.consume(code)
        effects.exit('acadamarkTagMarkerClose')
        return ok(code)
      }
      return nok(code)
    }
  }
}

/**
 * Tokenizer for named tags: <tagname attrs> or <tagname attrs | content>
 *
 * Single-line only in Slice 2 (line endings fail the construct; multi-line
 * support is added in a later slice).
 *
 * Content scanning uses rule B: a `<` only opens a depth level when followed
 * by an ASCII letter, a sigil character, or `/`. A `<` followed by anything
 * else (space, digit, punctuation) is literal — its paired `>` does NOT close
 * a depth level. This means bare `>` in content (comparison operators, arrows)
 * still closes the construct early; use `&gt;` for literal `>` in prose.
 *
 * @type {Tokenizer}
 */
function tokenizeNamedTag(effects, ok, nok) {
  let depth = 0

  return start

  /** @param {Code} code */
  function start(code) {
    if (code !== LT) return nok(code)
    effects.enter('acadamarkTag')
    effects.enter('acadamarkTagMarkerOpen')
    effects.consume(code)
    effects.exit('acadamarkTagMarkerOpen')
    return afterLt
  }

  /** @param {Code} code */
  function afterLt(code) {
    if (isAsciiAlphaCode(code)) {
      effects.enter('acadamarkTagName')
      return consumeTagName(code)
    }
    return nok(code)
  }

  /** @param {Code} code */
  function consumeTagName(code) {
    if (isTagNameContinueCode(code)) {
      effects.consume(code)
      return consumeTagName
    }
    effects.exit('acadamarkTagName')
    effects.enter('acadamarkTagAttrString')
    return attrSection(code)
  }

  /** @param {Code} code */
  function attrSection(code) {
    if (code === null || markdownLineEnding(code)) return nok(code)
    if (code === GT) {
      effects.exit('acadamarkTagAttrString')
      effects.enter('acadamarkTagMarkerClose')
      effects.consume(code)
      effects.exit('acadamarkTagMarkerClose')
      effects.exit('acadamarkTag')
      return ok(code)
    }
    if (code === PIPE) {
      effects.exit('acadamarkTagAttrString')
      effects.enter('acadamarkTagPipe')
      effects.consume(code)
      effects.exit('acadamarkTagPipe')
      effects.enter('acadamarkTagContent')
      return content
    }
    // Skip past quoted strings so `>` and `|` inside them don't terminate early
    if (code === DQUOTE || code === SQUOTE) {
      const quoteChar = code
      effects.consume(code)
      return function scanQuoted(qCode) {
        if (qCode === null || markdownLineEnding(qCode)) return nok(qCode)
        if (qCode === quoteChar) {
          effects.consume(qCode)
          return attrSection
        }
        effects.consume(qCode)
        return scanQuoted
      }
    }
    effects.consume(code)
    return attrSection
  }

  /** @param {Code} code */
  function content(code) {
    if (code === null || markdownLineEnding(code)) return nok(code)
    if (code === GT) {
      if (depth === 0) {
        effects.exit('acadamarkTagContent')
        effects.enter('acadamarkTagMarkerClose')
        effects.consume(code)
        effects.exit('acadamarkTagMarkerClose')
        effects.exit('acadamarkTag')
        return ok(code)
      }
      // Closes a nested construct opened by a tag-like `<`
      effects.consume(code)
      depth--
      return content
    }
    if (code === LT) {
      effects.consume(code)
      return afterContentLt
    }
    effects.consume(code)
    return content
  }

  /** @param {Code} code — the character immediately after a `<` in content */
  function afterContentLt(code) {
    // Rule B: only increment depth for tag-looking openers
    if (
      isAsciiAlphaCode(code) ||
      (code !== null && SIGIL_CHARS.has(code)) ||
      code === SLASH
    ) {
      depth++
    }
    return content(code)
  }
}
