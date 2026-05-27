/**
 * @import {Code, Effects, State, Tokenizer} from 'micromark-util-types'
 */

import { markdownLineEnding } from 'micromark-util-character'
// Long-form-eligibility consults the union of DSL_REGISTRY (true DSLs +
// historical structural-container tags like <aside>, <note>, <ul>, <data>)
// and STRUCTURED_ELEMENTS (<meta>, <author>). The union is precomputed in
// acadamark-core as LONG_FORM_TAGS and exposed for parser use; the parser
// only needs `.has(tagname)` to decide whether `<tag>…</tag>` can open as
// long-form. See acadamark-core/structured-elements.js for the rationale
// for keeping the two registries separate.
import { LONG_FORM_TAGS } from 'acadamark-core/structured-elements'

const LT = 60         // <
const GT = 62         // >
const PIPE = 124      // |
const SLASH = 47      // /
const SQUOTE = 39     // '
const DQUOTE = 34     // "
const CARET = 94      // ^
const UNDERSCORE = 95 // _
const OPEN_BRACE = 123  // {
const CLOSE_BRACE = 125 // }
const BACKSLASH = 92    // \

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
 *   `dslRegistry` is the historical option name; it now overrides the
 *   long-form-eligibility set (the union of DSL_REGISTRY and
 *   STRUCTURED_ELEMENTS via LONG_FORM_TAGS). The default is the union;
 *   callers that want the historical DSL_REGISTRY-only behavior pass it
 *   explicitly. The option name is preserved for back-compat with internal
 *   consumers; a rename is filed as a follow-up.
 * @returns {import('micromark-util-types').Extension}
 */
export function acadamarkSyntax(options = {}) {
  const registry = options.dslRegistry ?? LONG_FORM_TAGS
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
      [CARET]: [{ tokenize: tokenizeShortcutTag }],
      [UNDERSCORE]: [{ tokenize: tokenizeShortcutTag }],
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
        // Both positions: emit lineEnding sibling and continue.
        // Required by micromark for flow constructs; also the correct pattern
        // for text constructs (same as codeText). Direct consumption of newline
        // codes hangs the text tokenizer. from-markdown.js reconstructs the
        // source from the outer acadamarkTag token span via sliceSerialize,
        // so per-line chunk serialization is not relied upon.
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

    /** @param {Code} code — char immediately after the closing `>` */
    function afterClose(code) {
      // Issue 2 fix: flow-position tokenizer must reject when non-EOL content
      // follows on the same line. If we accept here, the tag becomes a block
      // node and the trailing text becomes a separate paragraph. Rejecting lets
      // the paragraph form and the text-position tokenizer handle the tag inline.
      //
      // PG-11 (2026-05-25): trailing whitespace (space/tab) before the line
      // ending is tolerated — it does not disqualify flow-position recognition.
      // Without this, `<# Heading #> ` (trailing space) is silently reclaimed
      // by the text-position tokenizer as inline, which is rarely what the
      // author meant.
      if (multiLine && code !== null && !markdownLineEnding(code)) {
        if (code === 32 || code === 9) {
          // Skip whitespace and re-check the next char.
          effects.consume(code)
          return afterClose
        }
        return nok(code)
      }
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
 * Text-position sigil-tag tokenizer: crosses soft line breaks in a paragraph.
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
        // Both positions: emit lineEnding sibling and continue.
        // See makeSigilTagTokenizer body() comment for rationale.
        effects.exit('acadamarkTagRaw')
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        effects.enter('acadamarkTagRaw')
        return attrSection
      }
      if (code === GT) {
        effects.consume(code)
        return afterGt
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
        // Both positions: emit lineEnding sibling and continue.
        // See makeSigilTagTokenizer body() comment for rationale.
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
          return afterGt
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

    /** @param {Code} code — char immediately after the closing `>` */
    function afterGt(code) {
      // Issue 2 fix: flow-position tokenizer rejects when non-EOL content
      // follows on the same line, so the paragraph forms and the text-position
      // tokenizer handles the tag inline.
      //
      // PG-11 (2026-05-25): trailing whitespace (space/tab) before the line
      // ending is tolerated — same reasoning as the sigil afterClose above.
      if (multiLine && code !== null && !markdownLineEnding(code)) {
        if (code === 32 || code === 9) {
          effects.consume(code)
          return afterGt
        }
        return nok(code)
      }
      effects.exit('acadamarkTagRaw')
      effects.exit('acadamarkTag')
      return ok(code)
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

// ─── Shortcut tag tokenizer ──────────────────────────────────────────────────

/**
 * Text-position tokenizer for inline TeX shortcuts: ^{...} → sup, _{...} → sub.
 *
 * Triggers only on ^{ or _{. Bare ^ or _ without { calls nok immediately so
 * CommonMark literal-character processing (including _ emphasis) handles them.
 * Tracks { } brace depth for nested shortcuts (x^{y_{1}}). Handles \{ and \}
 * by consuming the character after \ without using it for depth tracking, so
 * \} does not prematurely close a shortcut. Does not span lines — exits with
 * ok on line ending or EOF so from-markdown.js can produce an
 * acadamarkParseError for unterminated shortcuts.
 *
 * Reuses the acadamarkTag token type so the existing enterAcadamarkTag stub
 * push fires. exitAcadamarkTag dispatches on source[0] === '^'/'_' to skip
 * the Peggy parse and build the node directly.
 *
 * @type {Tokenizer}
 */
function tokenizeShortcutTag(effects, ok, nok) {
  let braceDepth = 0

  return start

  /** @param {Code} code */
  function start(code) {
    if (code !== CARET && code !== UNDERSCORE) return nok(code)
    effects.enter('acadamarkTag')
    effects.consume(code)
    return afterTrigger
  }

  /** @param {Code} code */
  function afterTrigger(code) {
    // Bare ^ or _ not followed by { — not a shortcut. nok reverts all effects.
    if (code !== OPEN_BRACE) return nok(code)
    effects.consume(code)
    return braceContent
  }

  /** @param {Code} code */
  function braceContent(code) {
    if (code === null) {
      // EOF — unterminated shortcut (no closing }). Emit what we have and let
      // from-markdown.js produce an acadamarkParseError.
      effects.exit('acadamarkTag')
      return ok(code)
    }
    if (markdownLineEnding(code)) {
      // Shortcuts are single-line only. Exit without consuming the line ending
      // so the paragraph tokenizer handles it normally.
      effects.exit('acadamarkTag')
      return ok(code)
    }
    if (code === BACKSLASH) {
      // Consume the backslash; the next character is consumed unconditionally
      // in afterBackslash (so \} does not prematurely close the shortcut and
      // \{ does not spuriously open one).
      effects.consume(code)
      return afterBackslash
    }
    if (code === OPEN_BRACE) {
      braceDepth++
      effects.consume(code)
      return braceContent
    }
    if (code === CLOSE_BRACE) {
      if (braceDepth === 0) {
        // Closing brace found at depth 0 — this closes the shortcut.
        effects.consume(code)
        return afterClose
      }
      braceDepth--
      effects.consume(code)
      return braceContent
    }
    // All other characters (including < and > from nested <tag> constructs)
    // are captured verbatim. The brace content is extracted as a raw string
    // and passed to remarkRecursiveContent for later parsing — exactly as
    // G1a's BraceContentItem grammar rule does. We do NOT parse nested <...>
    // here; we just capture their text.
    effects.consume(code)
    return braceContent
  }

  /** @param {Code} code */
  function afterBackslash(code) {
    if (code === null || markdownLineEnding(code)) {
      // EOF or newline after backslash — still unterminated.
      effects.exit('acadamarkTag')
      return ok(code)
    }
    // Consume the escaped character unconditionally (including { and }).
    effects.consume(code)
    return braceContent
  }

  /** @param {Code} code — char immediately after the closing } */
  function afterClose(code) {
    effects.exit('acadamarkTag')
    return ok(code)
  }
}

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
    // Tracks whether the most recently consumed non-whitespace attr-section
    // character was a `/`. When `>` arrives with this set, the construct is
    // a self-closing tag (`<tag ... />`) and the long-form tokenizer rejects
    // so the named-tag tokenizer can claim it (which routes the Peggy grammar
    // to its SelfClosingNamedTag rule). Without this rejection, DSL-registered
    // tags like `<csv />` are greedily claimed as long-form openers, their
    // missing `</csv>` close turns them into acadamarkTagError nodes, and the
    // self-closing form silently fails for the entire DSL-registry class.
    let prevWasSlash = false

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
        prevWasSlash = false  // whitespace clears the slash tracking
        return scanOpenAttrs
      }
      if (code === PIPE) return nok(code)
      if (code === GT) {
        // Self-closing form `<tag ... />`: reject so the named-tag tokenizer
        // claims this construct and the grammar's SelfClosingNamedTag rule
        // produces a node with selfClosing: true. Without this rejection,
        // DSL-registered tags lose the self-closing form entirely.
        if (prevWasSlash) return nok(code)
        effects.consume(code)
        return afterOpenGt
      }
      if (code === DQUOTE || code === SQUOTE) {
        const quoteChar = code
        effects.consume(code)
        prevWasSlash = false
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
      // Track whether the most recently consumed non-whitespace char was a
      // slash. Spaces and tabs are non-significant in the attr section, so
      // they preserve the flag; any other char clears it.
      if (code === SLASH) {
        prevWasSlash = true
      } else if (code !== 32 && code !== 9) {  // not space, not tab
        prevWasSlash = false
      }
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
