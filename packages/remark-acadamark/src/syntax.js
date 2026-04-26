/**
 * @import {Code, Effects, State, Tokenizer} from 'micromark-util-types'
 */

import { markdownLineEnding } from 'micromark-util-character'

const LT = 60   // <
const GT = 62   // >

// Registered sigil characters. Each maps to itself for now; in future,
// other sigils ($, `) can be added here.
const SIGIL_CHARS = new Set([
  35,  // #  → section headings
  // 36,  // $  → math (future slice)
  // 96,  // `  → code (future slice)
])

/**
 * Micromark syntax extension for acadamark sigil tags: <#...#>, <##...##>, etc.
 *
 * Registered as a flow construct (block-level). Inline constructs (text
 * position) and named tags (<tagname ...>) are added in later slices.
 *
 * @returns {import('micromark-util-types').Extension}
 */
export function acadamarkSyntax() {
  return {
    flow: {
      [LT]: { tokenize: tokenizeSigilTag, concrete: true },
    },
  }
}

/**
 * Tokenizer for <sigil ... sigil> constructs.
 *
 * State machine:
 *   start → afterLt → sigil (count chars) → body scanning:
 *     - At sigil char: attempt closing sequence (sigilCount chars + >)
 *       - Success: close body, emit close marker, done
 *       - Failure: re-open body, consume the sigil char, continue
 *     - EOF: fail (unterminated)
 *     - Anything else: consume into body
 *
 * Body may contain multiple acadamarkTagBody segments (one per failed-close
 * attempt). fromMarkdown concatenates them all.
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
    // Begin the body. Everything up to the matching closer is body content.
    effects.enter('acadamarkTagBody')
    return body(code)
  }

  /** @param {Code} code */
  function body(code) {
    if (code === null || markdownLineEnding(code)) {
      // EOF or line ending — sigil tags are single-line in this slice.
      // Multi-line support (for attributes spanning lines) is deferred.
      return nok(code)
    }
    if (code === sigilChar) {
      // Potential closing sequence. Exit the current body segment so the
      // closing marker tokens are cleanly separated. If the attempt fails,
      // effects.attempt rolls back the attempt's events, but the body exit
      // (committed here, before the attempt) stays — so failedClose re-enters
      // a fresh body segment and consumes the character.
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
    // The closing attempt failed; the char that looked like a closer is body.
    effects.enter('acadamarkTagBody')
    effects.consume(code)
    return body
  }

  /** @param {Code} code */
  function afterClose(code) {
    effects.exit('acadamarkTag')
    return ok(code)
  }

  // Partial tokenizer for the closing sigil sequence (sigilCount chars + >).
  // Captures sigilChar and sigilCount from the outer closure.

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
