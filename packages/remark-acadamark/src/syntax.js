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

// Registered sigil characters. The finder uses this to distinguish sigil tags
// from named tags. Extend here when new sigils are added (e.g., $ for math).
const SIGIL_CHARS = new Set([35, 36, 96]) // #, $, `

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
 * Micromark syntax extension — boundary finder only.
 *
 * This extension does NOT parse attributes, sigil forms, or content semantics.
 * It identifies where each acadamark construct starts and ends, then emits
 * the full raw source as a single `acadamarkTagRaw` token. The Peggy parser
 * (via from-markdown.js) handles all grammar semantics.
 *
 * Tokens emitted per construct:
 *   acadamarkTag        (outer container)
 *   acadamarkTagRaw     (full source span from `<` to closing `>`)
 *
 * @param {{ dslRegistry?: Set<string> }} [options]
 * @returns {import('micromark-util-types').Extension}
 */
export function acadamarkSyntax(options = {}) {
  return {
    flow: {
      [LT]: [
        { tokenize: tokenizeSigilTag, concrete: true },
        { tokenize: tokenizeNamedTag, concrete: true },
      ],
    },
    text: {
      [LT]: [
        { tokenize: tokenizeSigilTag },
        { tokenize: tokenizeNamedTag },
      ],
    },
  }
}

/**
 * Boundary finder for sigil tags: <#...#>, <##...##>, etc.
 *
 * Scans to the mirrored closer (same sigil char × same count, then `>`).
 * Emits the entire span as `acadamarkTagRaw`. Does not parse attrs or content.
 *
 * When a sigil opener is recognized but the line ends before the mirrored
 * closer, emits `acadamarkTagError` so the author gets a visible diagnostic
 * rather than silent fall-through into remark's tokenizer (which can produce
 * runaway fenced code blocks for backtick sigils). This is a finite-lifespan
 * guard: once multi-line sigil tags are implemented, the EOL check relaxes and
 * these error tokens become unreachable.
 *
 * @type {Tokenizer}
 */
function tokenizeSigilTag(effects, ok, nok) {
  let sigilChar
  let sigilCount = 0

  return start

  /** @param {Code} code */
  function start(code) {
    if (code !== LT) return nok(code)
    effects.enter('acadamarkTag')
    effects.enter('acadamarkTagRaw')
    effects.consume(code)
    return afterLt
  }

  /** @param {Code} code */
  function afterLt(code) {
    if (code !== null && SIGIL_CHARS.has(code)) {
      sigilChar = code
      return countSigils(code)
    }
    return nok(code)
  }

  /** @param {Code} code */
  function countSigils(code) {
    if (code === sigilChar) {
      effects.consume(code)
      sigilCount++
      return countSigils
    }
    // Now scanning body until the mirrored closer
    return body(code)
  }

  /** @param {Code} code */
  function body(code) {
    if (code === null || markdownLineEnding(code)) {
      // Sigil opener recognized but no closer on this line. Emit an error
      // token so from-markdown.js can surface a diagnostic node instead of
      // letting remark silently misinterpret the fragment.
      // See notes/shorthand-syntax.md § "Multi-line constructs (deferred)".
      effects.exit('acadamarkTagRaw')
      effects.exit('acadamarkTag')
      return ok(code)
    }
    if (code === sigilChar) {
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
    effects.consume(code)
    return body
  }

  /** @param {Code} code */
  function afterClose(code) {
    effects.exit('acadamarkTagRaw')
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
        return ok(code)
      }
      return nok(code)
    }
  }
}

/**
 * Boundary finder for named tags: <tagname attrs> or <tagname attrs | content>
 *
 * Scans attr section (skipping quoted strings so `>` inside quotes doesn't
 * terminate early), then scans content with rule B depth tracking. Emits the
 * entire span as `acadamarkTagRaw`. Does not parse attrs or content.
 *
 * Rule B: a `<` in content increments depth only if followed by an ASCII
 * letter, a sigil character, or `/`. A bare `<` (before space, digit, etc.)
 * is literal and does not affect depth.
 *
 * Single-line only in this slice. Multi-line support added later.
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
    effects.enter('acadamarkTagRaw')
    effects.consume(code)
    return afterLt
  }

  /** @param {Code} code */
  function afterLt(code) {
    if (isAsciiAlphaCode(code)) return consumeTagName(code)
    return nok(code)
  }

  /** @param {Code} code */
  function consumeTagName(code) {
    if (isTagNameContinueCode(code)) {
      effects.consume(code)
      return consumeTagName
    }
    return attrSection(code)
  }

  /** @param {Code} code */
  function attrSection(code) {
    if (code === null || markdownLineEnding(code)) return nok(code)
    if (code === GT) {
      effects.consume(code)
      effects.exit('acadamarkTagRaw')
      effects.exit('acadamarkTag')
      return ok(code)
    }
    if (code === PIPE) {
      effects.consume(code)
      return content
    }
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
        effects.consume(code)
        effects.exit('acadamarkTagRaw')
        effects.exit('acadamarkTag')
        return ok(code)
      }
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

  /** @param {Code} code — char immediately after a `<` in content */
  function afterContentLt(code) {
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
