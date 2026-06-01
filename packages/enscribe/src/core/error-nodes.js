// Canonical error-node shape + builders.
//
// Per `notes/specs/shorthand-syntax.md` §"Error nodes," enscribe has two
// distinct error node types:
//
//   enscribeParseError — produced by the grammar when an escape sequence is
//     malformed or a shortcut construct is empty/unterminated. Sparse shape:
//       { type: 'enscribeParseError', subtype, source, position? }
//     `subtype` is one of: 'unknown-escape-sequence', 'empty-shortcut',
//     'unterminated-shortcut', 'max-recursion-depth'.
//     `source` is the verbatim fragment.
//     `position` is added automatically by mdast tooling.
//
//   enscribeTagError — two variants per the spec:
//     - Sigil-opener variant: { type, source, error, position }
//       Sparse — the parser never populated tag fields because parsing failed
//       at the opener.
//     - Long-form variant: full enscribeTag fields + `error`, no `source`.
//       The opener parsed successfully, then EOF was reached before the close.
//       Per spec: "the node's type is flipped from enscribeTag to
//       enscribeTagError and an `error` field is added, but the rest of the
//       node's fields are retained."
//     Downstream consumers should branch on the presence of `source`
//     (sigil-opener) vs `form`/`tagname` (long-form) when reading
//     shape-specific fields.
//
// Construction sites today are all in-place mutations of an existing node
// (parser's from-markdown.js stamps the error type onto a node that started
// as an enscribeTag stub). Those in-place mutation sites are not migrated
// to these builders — the builders fit fresh-construction callers (the
// not-yet-built parser-error-node renderer; JATS export's error handling).

/**
 * Construct a fresh enscribeParseError node.
 *
 * @param {string} subtype  - one of 'unknown-escape-sequence',
 *                            'empty-shortcut', 'unterminated-shortcut',
 *                            'max-recursion-depth'
 * @param {string} source   - the verbatim source fragment
 * @returns {object} enscribeParseError node
 */
export function makeParseError(subtype, source) {
  return {
    type: 'enscribeParseError',
    subtype,
    source,
  };
}

/**
 * Construct a fresh enscribeTagError node (sigil-opener variant — sparse).
 *
 * For the long-form variant (in-place mutation that preserves an existing
 * enscribeTag's fields), the canonical pattern is to set `node.type =
 * 'enscribeTagError'` and `node.error = '<message>'` on the already-populated
 * node — see `from-markdown.js`'s `exitEnscribeLongFormTag`. This builder
 * covers the sigil-opener variant where no tag fields were ever populated.
 *
 * @param {object} opts
 * @param {string} opts.source - the verbatim source fragment
 * @param {string} opts.error  - the parse-error message
 * @returns {object} enscribeTagError node (sigil-opener variant)
 */
export function makeTagError({ source, error }) {
  return {
    type: 'enscribeTagError',
    source,
    error,
  };
}
