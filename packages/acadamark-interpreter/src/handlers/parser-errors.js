// Compile-step handlers for parser-error mdast node types.
//
// The parser produces two error-node shapes when it cannot parse a construct
// (see `notes/specs/shorthand-syntax.md` §"Error nodes" and
// `packages/acadamark-core/src/error-nodes.js`):
//
//   acadamarkParseError — produced by the grammar for malformed escape
//     sequences or empty/unterminated shortcut constructs. Shape:
//       { type: 'acadamarkParseError', subtype, source, position? }
//     subtype ∈ { 'unknown-escape-sequence', 'empty-shortcut',
//                 'unterminated-shortcut', 'max-recursion-depth' }
//
//   acadamarkTagError — produced when a tag opener parses but the closer is
//     missing (sigil opener that reaches EOF; long-form opener that reaches
//     EOF). Two variants:
//       Sigil-opener: { type, source, error, position? }
//       Long-form:    full acadamarkTag fields + `error` (no `source`)
//
// Before this slice, neither node type had a compile-step handler — they fell
// through silently in the rendered output. The always-renders guarantee
// (`notes/specs/principles.md`) requires the opposite: every error renders
// visibly at its source location, in the same house style the interpreter
// already uses for unresolved refs (`??ref: id??`) and unresolved cites
// (`??cite: key??`). These handlers register that visible rendering.
//
// Rendered output, by node type:
//   acadamarkParseError → <span class="parse-error">??parse: SUBTYPE "SOURCE"??</span>
//   acadamarkTagError   → <span class="tag-error">??tag: NAME — ERROR??</span>
//                         (NAME is `tagname` for the long-form variant,
//                          or the source-fragment opener for the sigil-opener
//                          variant where no tagname was ever populated)
//
// Both handlers preserve mdast `position` on the emitted hast element so the
// rendered output carries the source location and the error message.

/**
 * Handler for acadamarkParseError mdast nodes.
 *
 * @param {object} _state - mdast-util-to-hast state (unused — leaf node)
 * @param {object} node   - acadamarkParseError node
 * @returns {import('hast').Element}
 */
export function parseErrorHandler(_state, node) {
  const subtype = node.subtype ?? 'unknown';
  const source = typeof node.source === 'string' ? node.source : '';
  const text = source
    ? `??parse: ${subtype} ${JSON.stringify(source)}??`
    : `??parse: ${subtype}??`;
  const el = {
    type: 'element',
    tagName: 'span',
    properties: { className: ['parse-error'] },
    children: [{ type: 'text', value: text }],
  };
  if (node.position) el.position = node.position;
  return el;
}

/**
 * Handler for acadamarkTagError mdast nodes. Branches on the two variants per
 * the error-node spec: sigil-opener (sparse, has `source`) vs long-form
 * (full tag fields + `error`).
 *
 * @param {object} _state - mdast-util-to-hast state (unused — leaf node)
 * @param {object} node   - acadamarkTagError node (either variant)
 * @returns {import('hast').Element}
 */
export function tagErrorHandler(_state, node) {
  const error = node.error ?? 'parse error';
  // Long-form variant carries `tagname`; sigil-opener variant carries
  // `source` (the raw opener fragment).
  const name = node.tagname
    ? node.tagname
    : (typeof node.source === 'string' ? node.source : 'unknown');
  const text = `??tag: ${name} — ${error}??`;
  const el = {
    type: 'element',
    tagName: 'span',
    properties: { className: ['tag-error'] },
    children: [{ type: 'text', value: text }],
  };
  if (node.position) el.position = node.position;
  return el;
}
