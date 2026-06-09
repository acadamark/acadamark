/**
 * @import {Code, Effects, State, Tokenizer} from 'micromark-util-types'
 */

import { markdownLineEnding } from 'micromark-util-character'

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
// NOTE: `-` / `*` are deliberately NOT here. The list item-marker sigils
// (`<- … ->` / `<* … *>`, #137) are recognized ONLY at flow (block) position by
// their own tokenizer below — never inline like `<# … #>` / `<$ … $>`. That
// block-scoping is exactly what keeps prose `<-`/`->` (R `x <- y`, arrows) safe.
// See notes/specs/lists.md §"Item sigils are block-scoped".
const SIGIL_CHARS = new Set([35, 36, 96]) // #, $, `

// List item-marker chars for the flow-only `<- … ->` / `<* … *>` tokenizer.
const DASH = 45 // -
const STAR = 42 // *
const ITEM_MARKER_CHARS = new Set([DASH, STAR]) // -, *

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
 * It identifies where each enscribe construct starts and ends, then emits
 * the full raw source as a single `enscribeTagRaw` token. The Peggy parser
 * (via from-markdown.js) handles all grammar semantics.
 *
 * Tokens emitted per construct:
 *   enscribeTag        (outer container)
 *   enscribeTagRaw     (full source span from `<` to closing `>`)
 *
 * For multi-line flow constructs, `enscribeTagRaw` is split into one chunk
 * per line, with `lineEnding` sibling tokens between chunks. from-markdown.js
 * concatenates the chunks (inserting `\n`) to reconstruct the full source.
 * Single-line constructs produce a single chunk; no behaviour change.
 *
 * Takes no options — the historical `dslRegistry` option was removed by
 * the DSL/long-form parser bug fix. Every named tag is now long-form-
 * eligible at the parser level; the three forms (pipe / slash / long)
 * are disambiguated by local grammar, not by registry membership.
 *
 * @returns {import('micromark-util-types').Extension}
 */
export function enscribeSyntax() {
  return {
    flow: {
      [LT]: [
        { tokenize: makeLongFormTokenizer({ multiLine: true }), concrete: true },
        { tokenize: tokenizeSigilTagFlow, concrete: true },
        // List item markers `<- … ->` / `<* … *>` — flow position ONLY (a marker
        // is its own line inside `<list>`). Registered only here, never in `text`,
        // so prose `<-`/`->` (inline) is never claimed. `-`/`*` after `<` are
        // rejected by the three tokenizers around it (non-alpha, non-sigil), so
        // this is purely additive.
        { tokenize: tokenizeItemMarkerFlow, concrete: true },
        { tokenize: tokenizeNamedTagFlow, concrete: true },
      ],
    },
    text: {
      [LT]: [
        // Same-line long-form (`<b>bold</b>` on one line) must be tried before
        // the named-tag tokenizer, which would otherwise claim `<b>` as an empty
        // short-form and leave `bold</b>` as literal text. The text-position
        // long-form tokenizer rejects (nok) when no same-line `</tag>` follows,
        // so the empty-short-form fallback is preserved for bare `<b>`.
        { tokenize: makeLongFormTokenizer({ multiLine: false }) },
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
 *              if false, a line ending produces an enscribeTagError (text position).
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
      effects.enter('enscribeTag')
      effects.enter('enscribeTagRaw')
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
        // converts to enscribeTagError.
        effects.exit('enscribeTagRaw')
        effects.exit('enscribeTag')
        return ok(code)
      }
      if (markdownLineEnding(code)) {
        // Both positions: emit lineEnding sibling and continue.
        // Required by micromark for flow constructs; also the correct pattern
        // for text constructs (same as codeText). Direct consumption of newline
        // codes hangs the text tokenizer. from-markdown.js reconstructs the
        // source from the outer enscribeTag token span via sliceSerialize,
        // so per-line chunk serialization is not relied upon.
        effects.exit('enscribeTagRaw')
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        effects.enter('enscribeTagRaw')
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
      effects.exit('enscribeTagRaw')
      effects.exit('enscribeTag')
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
      effects.enter('enscribeTag')
      effects.enter('enscribeTagRaw')
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
        effects.exit('enscribeTagRaw')
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        effects.enter('enscribeTagRaw')
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
        effects.exit('enscribeTagRaw')
        effects.exit('enscribeTag')
        return ok(code)
      }
      if (markdownLineEnding(code)) {
        // Both positions: emit lineEnding sibling and continue.
        // See makeSigilTagTokenizer body() comment for rationale.
        effects.exit('enscribeTagRaw')
        effects.enter('lineEnding')
        effects.consume(code)
        effects.exit('lineEnding')
        effects.enter('enscribeTagRaw')
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
      effects.exit('enscribeTagRaw')
      effects.exit('enscribeTag')
      return ok(code)
    }
  }
}

// ─── List item-marker tokenizer (flow only) ───────────────────────────────────

/**
 * Flow-position tokenizer for list item markers: `<- content ->` / `<* content *>`.
 *
 * Block-scoped by design — registered ONLY in `flow`, never `text` — so an
 * inline `<-`/`->` in prose (R `x <- y`, an arrow) is left untouched. The open
 * is `<` + one marker char (`-` or `*`); the close is the **line-final**
 * `marker>` (greedy to the last `->`/`*>` on the line, allowing trailing
 * whitespace). Greedy-to-line-end means an inline arrow inside the item
 * (`<- f maps A -> B ->`) does NOT close early — the inner `->` stays content,
 * only the line-final `->` closes. A line with no line-final `marker>` rejects,
 * so the line falls back to ordinary text.
 *
 * Emits the same `enscribeTag` / `enscribeTagRaw` token pair as the other
 * tokenizers; from-markdown's `exitEnscribeTag` recognizes the `<-`/`<*` source
 * prefix and builds the item node directly (bypassing Peggy — the `^{}`/`_{}`
 * shortcut model), so no grammar rule is involved. See notes/specs/lists.md.
 *
 * @type {Tokenizer}
 */
function tokenizeItemMarkerFlow(effects, ok, nok) {
  let marker // the marker char (`-` or `*`), fixed at afterLt

  return start

  /** @param {Code} code */
  function start(code) {
    if (code !== LT) return nok(code)
    effects.enter('enscribeTag')
    effects.enter('enscribeTagRaw')
    effects.consume(code) // <
    return afterLt
  }

  /** @param {Code} code */
  function afterLt(code) {
    if (code !== null && ITEM_MARKER_CHARS.has(code)) {
      marker = code
      effects.consume(code) // - or *
      return body
    }
    return nok(code)
  }

  /** @param {Code} code */
  function body(code) {
    if (code === null || markdownLineEnding(code)) {
      // EOL/EOF with no line-final `marker>` — not an item; fall back to text.
      return nok(code)
    }
    if (code === marker) {
      // Possible close. Greedy: only the line-final `marker>` (followed by ws*
      // then EOL/EOF) closes; an inline `marker>` mid-line is content.
      return effects.attempt(
        { tokenize: tokenizeMarkerClose, partial: true },
        afterClose,
        notClose,
      )(code)
    }
    effects.consume(code)
    return body
  }

  /** @param {Code} code — the marker char that did not begin the line-final close */
  function notClose(code) {
    effects.consume(code) // an inline arrow / literal marker — keep as content
    return body
  }

  /** @param {Code} code — first char after the line-final `marker>` (+ ws) */
  function afterClose(code) {
    effects.exit('enscribeTagRaw')
    effects.exit('enscribeTag')
    return ok(code)
  }

  /**
   * Partial: match `marker` + `>` + trailing whitespace, then REQUIRE a line
   * ending or EOF. Succeeds only for the line-final `marker>`; fails (so body
   * resumes) for an inline `marker>` with more content after it.
   * @type {Tokenizer}
   */
  function tokenizeMarkerClose(closeEffects, closeOk, closeNok) {
    return startClose

    /** @param {Code} code */
    function startClose(code) {
      if (code !== marker) return closeNok(code)
      closeEffects.consume(code) // marker
      return expectGt
    }

    /** @param {Code} code */
    function expectGt(code) {
      if (code !== GT) return closeNok(code)
      closeEffects.consume(code) // >
      return trailing
    }

    /** @param {Code} code */
    function trailing(code) {
      if (code === 32 || code === 9) {
        closeEffects.consume(code)
        return trailing
      }
      // Line-final → this is the close. Otherwise the `marker>` was inline.
      if (code === null || markdownLineEnding(code)) return closeOk(code)
      return closeNok(code)
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
 * enscribeParseError for unterminated shortcuts.
 *
 * Reuses the enscribeTag token type so the existing enterEnscribeTag stub
 * push fires. exitEnscribeTag dispatches on source[0] === '^'/'_' to skip
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
    effects.enter('enscribeTag')
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
      // from-markdown.js produce an enscribeParseError.
      effects.exit('enscribeTag')
      return ok(code)
    }
    if (markdownLineEnding(code)) {
      // Shortcuts are single-line only. Exit without consuming the line ending
      // so the paragraph tokenizer handles it normally.
      effects.exit('enscribeTag')
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
      effects.exit('enscribeTag')
      return ok(code)
    }
    // Consume the escaped character unconditionally (including { and }).
    effects.consume(code)
    return braceContent
  }

  /** @param {Code} code — char immediately after the closing } */
  function afterClose(code) {
    effects.exit('enscribeTag')
    return ok(code)
  }
}

// ─── Long-form tag tokenizer ─────────────────────────────────────────────────

/**
 * Factory for the long-form tag boundary finder.
 *
 * Returns a tokenizer for: <tagname attrs>\ncontent\n</tagname>
 *
 * Every named tag is long-form-eligible — no registry consultation. The
 * three syntactic forms (`<tag attrs | content>` pipe, `<tag attrs />`
 * slash, `<tag attrs>...</tag>` long-form) are disambiguated locally by
 * `|` and `/` placement; a tag with neither is a long-form opener. See
 * the comment in `consumeOpenTagName` below for the full disambiguation
 * walk and `DESIGN.md` §"Tag forms" for the spec.
 *
 * The opener `<tagname attrs>` supports multi-line attribute sections
 * (line endings between attributes are allowed). The closing `>` must
 * appear on the same line as or immediately after the last attribute.
 *
 * Emitted token structure:
 *   enscribeLongFormTag        (outer container)
 *     enscribeLongFormOpen     (the opening `<tagname attrs>`, may span lines)
 *     enscribeLongFormContent  (verbatim content, may span multiple lines)
 *     enscribeLongFormClose    (the `</tagname>` closing tag)
 *
 * Missing closer: if no `</tagname>` is found before EOF, the tokenizer
 * calls ok and from-markdown.js converts the node to enscribeTagError.
 *
 * Same-line long-form (`<tagname attrs>content</tagname>` on one line) is
 * handled additively. When the opener's `>` is followed by non-line-ending
 * content, the tokenizer scans the remainder of the line for a matching
 * `</tagname>`; if found it emits the same Open/Content/Close token structure
 * as the multi-line form, so from-markdown.js handles both identically. If no
 * same-line close is found before the line ending or EOF, the tokenizer
 * rejects (nok) and the named-tag tokenizer claims the opener as an empty
 * short-form. The multi-line path (opener `>` immediately followed by a line
 * ending) is untouched and byte-identical.
 *
 * Same-name nesting is NOT depth-counted: in `<b>a<b>b</b>c</b>` the first
 * `</b>` closes the outer tag. Different-name nesting (`<b>x<i>i</i>y</b>`) is
 * free — the inner `<i>…</i>` is captured verbatim as content and re-parsed
 * downstream by remarkRecursiveContent. See DESIGN.md §"Tag forms".
 *
 * @param {{ multiLine: boolean }} opts
 *   multiLine: flow position (true) rejects a same-line tag with trailing
 *              non-whitespace content after the close, so the paragraph forms
 *              and the text-position tokenizer (false) claims it inline.
 * @returns {Tokenizer}
 */
function makeLongFormTokenizer({ multiLine }) {
  return function tokenizeLongFormTag(effects, ok, nok) {
    /** @type {number[]} */
    const tagNameCodes = []
    // Tracks whether the most recently consumed non-whitespace attr-section
    // character was a `/`. When `>` arrives with this set, the construct is
    // a self-closing tag (`<tag ... />`) and the long-form tokenizer rejects
    // so the named-tag tokenizer can claim it (which routes the Peggy grammar
    // to its SelfClosingNamedTag rule). This is the slash-form branch of the
    // three-form grammar (`<tag attrs />`); without it, every short-form-no-
    // content authoring (`<csv />`, `<hr />`, `<cite @ref />`, etc.) would
    // be greedily claimed as a long-form opener with no matching close.
    let prevWasSlash = false

    return start

    /** @param {Code} code */
    function start(code) {
      if (code !== LT) return nok(code)
      effects.enter('enscribeLongFormTag')
      effects.enter('enscribeLongFormOpen')
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
      // Tag name complete. Long-form is eligible for every named tag; no
      // registry is consulted. Previously this point checked
      // `registry.has(tagName)` and rejected unregistered tags, which
      // conflated long-form-authoring eligibility with handler-dispatch
      // membership — `<aside>…</aside>` had to be listed in DSL_REGISTRY for
      // the parser to admit it even though <aside> is not a DSL. That gate
      // was removed.
      //
      // The grammar disambiguates the three syntactic forms locally,
      // without lookahead or registry consultation, by the presence of
      // `|` or `/` before `>`:
      //
      //   <tag attrs | content>  — short-form with body content (pipe form;
      //                            rejected at the PIPE check in scanOpenAttrs)
      //   <tag attrs />          — short-form, no body content (slash form;
      //                            rejected at scanOpenAttrs's GT-with-
      //                            prevWasSlash check)
      //   <tag attrs>...</tag>   — long-form (opener + close)
      //
      // A tag with neither `|` nor `/` before `>` is unambiguously a
      // long-form opener. See DESIGN.md for the durable spec.
      return scanOpenAttrs(code)
    }

    /** @param {Code} code */
    function scanOpenAttrs(code) {
      if (code === null) return nok(code)
      if (markdownLineEnding(code)) {
        // Multi-line opener: line endings between attributes are allowed.
        // Emit a lineEnding token inside enscribeLongFormOpen so micromark's
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
      if (markdownLineEnding(code)) {
        // Multi-line long-form is a block construct — flow position only. In
        // text (inline) position, `>` followed by a line ending is a short-form
        // opener (e.g. `<ref @tab:x>` ending a line); reject so the named-tag
        // tokenizer claims it. Without this guard the inline long-form would
        // scan across line endings and swallow the rest of the document.
        if (!multiLine) return nok(code)
        // Multi-line path (unchanged): opener `>` immediately followed by a
        // line ending. Close detection happens at each subsequent line start.
        effects.exit('enscribeLongFormOpen')
        return effects.attempt(
          { tokenize: tokenizeClose, partial: true },
          afterClose,
          notClose,
        )(code)
      }
      if (code === null) return nok(code)
      // Same-line path: content begins on the opener's line. Scan it for a
      // matching `</tagname>` (see sameLineContent). If none is found before
      // the line ending/EOF, sameLineContent rejects and the named-tag
      // tokenizer claims `<tagname attrs>` as an empty short-form.
      effects.exit('enscribeLongFormOpen')
      effects.enter('enscribeLongFormContent')
      return sameLineContent(code)
    }

    /** @param {Code} code — a char of same-line content */
    function sameLineContent(code) {
      if (code === null || markdownLineEnding(code)) {
        // No matching `</tagname>` on this line — not same-line long-form.
        // Reject so the named-tag tokenizer can claim the opener. (nok rewinds
        // the entered-but-unbalanced LongFormContent; micromark discards it.)
        return nok(code)
      }
      if (code === LT) {
        // Potential close. Exit content and attempt the same-line closer; on
        // failure sameLineNotClose re-enters content and consumes the `<`.
        effects.exit('enscribeLongFormContent')
        return effects.attempt(
          { tokenize: tokenizeSameLineClose, partial: true },
          afterSameLineClose,
          sameLineNotClose,
        )(code)
      }
      effects.consume(code)
      return sameLineContent
    }

    /** @param {Code} code — the char AFTER the same-line `</tagname>` */
    function afterSameLineClose(code) {
      // Flow position (multiLine): reject a same-line tag with trailing
      // non-whitespace content after the close, so the paragraph forms and the
      // text-position tokenizer claims `<b>bold</b> rest` as a single inline
      // run. Trailing whitespace before the line ending is tolerated. Mirrors
      // the named-tag tokenizer's afterGt (Issue 2 fix).
      if (multiLine && code !== null && !markdownLineEnding(code)) {
        if (code === 32 || code === 9) {
          effects.consume(code)
          return afterSameLineClose
        }
        return nok(code)
      }
      effects.exit('enscribeLongFormTag')
      return ok(code)
    }

    /** @param {Code} code — the `<` that did not begin a matching close */
    function sameLineNotClose(code) {
      // The `<` did not open `</tagname>`. Resume content, consuming the `<`
      // verbatim. Different-name nested tags (`<i>…</i>`) are part of content
      // and re-parsed downstream; same-name nesting is not depth-counted.
      effects.enter('enscribeLongFormContent')
      effects.consume(code)
      return sameLineContent
    }

    /**
     * Same-line closer partial: like tokenizeClose but expects `<` directly
     * (no leading line ending). Matches `</tagname>` by name char-for-char.
     * @type {Tokenizer}
     */
    function tokenizeSameLineClose(closeEffects, closeOk, closeNok) {
      let nameIndex = 0

      return startClose

      /** @param {Code} code */
      function startClose(code) {
        if (code !== LT) return closeNok(code)
        closeEffects.enter('enscribeLongFormClose')
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
        closeEffects.exit('enscribeLongFormClose')
        return closeOk(code)
      }
    }

    /** @param {Code} code */
    function content(code) {
      if (code === null) {
        effects.exit('enscribeLongFormContent')
        effects.exit('enscribeLongFormTag')
        return ok(code)
      }
      if (markdownLineEnding(code)) {
        effects.exit('enscribeLongFormContent')
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
      effects.exit('enscribeLongFormTag')
      return ok(code)
    }

    /** @param {Code} code */
    function notClose(code) {
      effects.enter('lineEnding')
      effects.consume(code)
      effects.exit('lineEnding')
      effects.enter('enscribeLongFormContent')
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
        closeEffects.enter('enscribeLongFormClose')
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
        closeEffects.exit('enscribeLongFormClose')
        return closeOk(code)
      }
    }
  } // end returned tokenizeLongFormTag function
} // end makeLongFormTokenizer
