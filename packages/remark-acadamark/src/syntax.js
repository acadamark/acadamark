/**
 * @import {Code, Effects, State, Tokenizer} from 'micromark-util-types'
 */

import { markdownLineEnding } from 'micromark-util-character'
import { DSL_REGISTRY } from './dsl-registry.js'

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
 * For multi-line flow constructs, `acadamarkTagRaw` is split into one chunk
 * per line, with `lineEnding` sibling tokens between chunks. from-markdown.js
 * concatenates the chunks (inserting `\n`) to reconstruct the full source.
 * Single-line constructs produce a single chunk; no behaviour change.
 *
 * @param {{ dslRegistry?: Set<string> }} [options]
 * @returns {import('micromark-util-types').Extension}
 */
export function acadamarkSyntax(options = {}) {
  const registry = options.dslRegistry ?? DSL_REGISTRY
  return {
    flow: {
      [LT]: [
        { tokenize: makeLongFormTokenizer(registry), concrete: true },
        { tokenize: tokenizeSigilTagFlow, concrete: true },
        { tokenize: tokenizeNamedTagFlow, concrete: true },
      ],
    },
    text: {
      [LT]: [
        { tokenize: tokenizeSigilTagText },
        { tokenize: tokenizeNamedTagText },
      ],
    },
  }
}

// ─── Shared sigil-tag helpers ─────────────────────────────────────────────────

/**
 * Builds a sigil-tag tokenizer.
 *
 * @param {{ multiLine: boolean }} opts
 *   multiLine: if true, line endings extend the scan (flow position).
 *              if false, a line ending produces an acadamarkTagError (text position).
 * @returns {Tokenizer}
 */
function makeSigilTagTokenizer({ multiLine }) {
  return function tokenizeSigilTag(effects, ok, nok) {
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
      return body(code)
    }

    /** @param {Code} code */
    function body(code) {
      if (code === null) {
        // EOF without closer: emit error. Grammar will fail; from-markdown.js
        // converts to acadamarkTagError.
        effects.exit('acadamarkTagRaw')
        effects.exit('acadamarkTag')
        return ok(code)
      }
      if (markdownLineEnding(code)) {
        if (!multiLine) {
          // Text position: single-line only. Emit whatever was consumed as a
          // (malformed) token; from-markdown.js sees the grammar fail.
          // This is a finite-lifespan guard per notes/shorthand-syntax.md.
          effects.exit('acadamarkTagRaw')
          effects.exit('acadamarkTag')
          return ok(code)
        }
        // Flow position: emit lineEnding sibling and continue on next line.
        effects.exit('acadamarkTagRaw')
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        effects.enter('acadamarkTagRaw')
        return body
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
}

/**
 * Flow-position sigil-tag tokenizer: scans across line endings.
 * @type {Tokenizer}
 */
const tokenizeSigilTagFlow = makeSigilTagTokenizer({ multiLine: true })

/**
 * Text-position sigil-tag tokenizer: single-line with error on EOL.
 * @type {Tokenizer}
 */
const tokenizeSigilTagText = makeSigilTagTokenizer({ multiLine: false })

// ─── Shared named-tag helpers ─────────────────────────────────────────────────

/**
 * Builds a named-tag tokenizer.
 *
 * @param {{ multiLine: boolean }} opts
 *   multiLine: if true, line endings in attr section and content are scanned
 *              across (flow position). If false, a line ending rejects (nok).
 * @returns {Tokenizer}
 */
function makeNamedTagTokenizer({ multiLine }) {
  return function tokenizeNamedTag(effects, ok, nok) {
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
      if (code === null) return nok(code)
      if (markdownLineEnding(code)) {
        if (!multiLine) return nok(code)
        // Flow: emit lineEnding sibling and continue attr scanning on next line.
        effects.exit('acadamarkTagRaw')
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        effects.enter('acadamarkTagRaw')
        return attrSection
      }
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
      if (code === null) {
        // EOF without closer: emit what we have; grammar fails; error node set.
        effects.exit('acadamarkTagRaw')
        effects.exit('acadamarkTag')
        return ok(code)
      }
      if (markdownLineEnding(code)) {
        if (!multiLine) return nok(code)
        // Flow: emit lineEnding sibling and continue content scan on next line.
        effects.exit('acadamarkTagRaw')
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        effects.enter('acadamarkTagRaw')
        return content
      }
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
}

/**
 * Flow-position named-tag tokenizer: scans across line endings.
 * @type {Tokenizer}
 */
const tokenizeNamedTagFlow = makeNamedTagTokenizer({ multiLine: true })

/**
 * Text-position named-tag tokenizer: single-line only.
 * @type {Tokenizer}
 */
const tokenizeNamedTagText = makeNamedTagTokenizer({ multiLine: false })

// ─── Long-form tag tokenizer ─────────────────────────────────────────────────

/**
 * Factory for the long-form tag boundary finder.
 *
 * Returns a tokenizer for: <tagname attrs>\ncontent\n</tagname>
 *
 * Registry check: the tag name is read from the stream and checked against the
 * DSL registry. Only registered tags proceed as long-form; unregistered tags
 * call nok immediately so the flow hook falls through to tokenizeNamedTagFlow.
 *
 * The opener `<tagname attrs>` now supports multi-line attribute sections
 * (line endings between attributes are allowed). The closing `>` must appear
 * on the same line as or immediately after the last attribute.
 *
 * Emitted token structure (for registered tags):
 *   acadamarkLongFormTag        (outer container)
 *     acadamarkLongFormOpen     (the opening `<tagname attrs>`, may span lines)
 *     acadamarkLongFormContent  (verbatim content, may span multiple lines)
 *     acadamarkLongFormClose    (the `</tagname>` closing tag)
 *
 * Missing closer: if no `</tagname>` is found before EOF, the tokenizer calls
 * ok and from-markdown.js converts the node to acadamarkTagError.
 *
 * @param {Map<string, string>} registry
 * @returns {Tokenizer}
 */
function makeLongFormTokenizer(registry) {
  return function tokenizeLongFormTag(effects, ok, nok) {
    /** @type {number[]} */
    const tagNameCodes = []

    return start

    /** @param {Code} code */
    function start(code) {
      if (code !== LT) return nok(code)
      effects.enter('acadamarkLongFormTag')
      effects.enter('acadamarkLongFormOpen')
      effects.consume(code)
      return afterLt
    }

    /** @param {Code} code */
    function afterLt(code) {
      if (isAsciiAlphaCode(code)) {
        tagNameCodes.length = 0
        return consumeOpenTagName(code)
      }
      return nok(code)
    }

    /** @param {Code} code */
    function consumeOpenTagName(code) {
      if (isTagNameContinueCode(code)) {
        tagNameCodes.push(code)
        effects.consume(code)
        return consumeOpenTagName
      }
      // Tag name complete — only registered tags are long-form eligible.
      const tagName = String.fromCharCode(...tagNameCodes)
      if (!registry.has(tagName)) return nok(code)
      return scanOpenAttrs(code)
    }

    /** @param {Code} code */
    function scanOpenAttrs(code) {
      if (code === null) return nok(code)
      if (markdownLineEnding(code)) {
        // Multi-line opener: line endings between attributes are allowed.
        // Emit a lineEnding token inside acadamarkLongFormOpen so micromark's
        // subtokenize algorithm accounts for the boundary.
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        return scanOpenAttrs
      }
      if (code === PIPE) return nok(code)
      if (code === GT) {
        effects.consume(code)
        return afterOpenGt
      }
      if (code === DQUOTE || code === SQUOTE) {
        const quoteChar = code
        effects.consume(code)
        return function scanQuoted(qCode) {
          if (qCode === null || markdownLineEnding(qCode)) return nok(qCode)
          if (qCode === quoteChar) {
            effects.consume(qCode)
            return scanOpenAttrs
          }
          effects.consume(qCode)
          return scanQuoted
        }
      }
      effects.consume(code)
      return scanOpenAttrs
    }

    /** @param {Code} code — the char AFTER the opening `>` */
    function afterOpenGt(code) {
      // Must be followed by a line ending; same-line `>` means short-form.
      if (!markdownLineEnding(code)) return nok(code)
      effects.exit('acadamarkLongFormOpen')
      return effects.attempt(
        { tokenize: tokenizeClose, partial: true },
        afterClose,
        notClose,
      )(code)
    }

    /** @param {Code} code */
    function content(code) {
      if (code === null) {
        effects.exit('acadamarkLongFormContent')
        effects.exit('acadamarkLongFormTag')
        return ok(code)
      }
      if (markdownLineEnding(code)) {
        effects.exit('acadamarkLongFormContent')
        return effects.attempt(
          { tokenize: tokenizeClose, partial: true },
          afterClose,
          notClose,
        )(code)
      }
      effects.consume(code)
      return content
    }

    /** @param {Code} code */
    function afterClose(code) {
      effects.exit('acadamarkLongFormTag')
      return ok(code)
    }

    /** @param {Code} code */
    function notClose(code) {
      effects.enter('lineEnding')
      effects.consume(code)
      effects.exit('lineEnding')
      effects.enter('acadamarkLongFormContent')
      return content
    }

    /** @type {Tokenizer} */
    function tokenizeClose(closeEffects, closeOk, closeNok) {
      let nameIndex = 0

      return startClose

      /** @param {Code} code */
      function startClose(code) {
        if (!markdownLineEnding(code)) return closeNok(code)
        closeEffects.enter('lineEnding')
        closeEffects.consume(code)
        closeEffects.exit('lineEnding')
        return expectLt
      }

      /** @param {Code} code */
      function expectLt(code) {
        if (code !== LT) return closeNok(code)
        closeEffects.enter('acadamarkLongFormClose')
        closeEffects.consume(code)
        return expectSlash
      }

      /** @param {Code} code */
      function expectSlash(code) {
        if (code !== SLASH) return closeNok(code)
        closeEffects.consume(code)
        nameIndex = 0
        return matchName
      }

      /** @param {Code} code */
      function matchName(code) {
        if (nameIndex < tagNameCodes.length) {
          if (code !== tagNameCodes[nameIndex]) return closeNok(code)
          closeEffects.consume(code)
          nameIndex++
          return matchName
        }
        return expectCloseGt(code)
      }

      /** @param {Code} code */
      function expectCloseGt(code) {
        if (code !== GT) return closeNok(code)
        closeEffects.consume(code)
        closeEffects.exit('acadamarkLongFormClose')
        return closeOk(code)
      }
    }
  } // end returned tokenizeLongFormTag function
} // end makeLongFormTokenizer
