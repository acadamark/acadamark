// Paragraph-unwrap helper — the mechanic, not the gate.
//
// Per `notes/specs/interpreter.md` §3.1 and `pipeline.md` §3, pipe content
// that resolves to a single `paragraph` mdast node is unwrapped to that
// paragraph's `children` array (the prose-bearing inline content), so e.g.
// `<em | text>` renders as `<em>text</em>` and not `<em><p>text</p></em>`.
//
// The *gate* — WHEN to unwrap — is decided UPSTREAM, not here and NOT by any
// `content.type` label (that field was dissolved — the real authority is the
// content model). The parse-time central unwrap (`parser/recursive-content.js`
// `extractFromRoot`) KEEPS a single paragraph for a flow tagname (`FLOW_TAGNAMES`,
// derived from `content.shape.contains`) and unwraps everything else (#326). By
// the time `interpret-plugin.js#convertContent` runs, phrasing elements already
// arrive unwrapped and flow elements already wrapped, so it does NOT re-decide
// (re-unwrapping would undo the flow wrap). This helper is the unwrap *operation*
// only — its remaining direct caller is `interpreter/lib/parse-inline.js`, which
// unwraps a freshly parsed inline fragment destined for a known phrasing slot.

/**
 * Unwrap a single-paragraph content array.
 *
 * If `content` is `[{ type: 'paragraph', children: [...] }]`, returns those
 * children. Otherwise returns `content` unchanged. The caller decides
 * whether and when to call this.
 *
 * @param {Array} content - mdast/enscribeTag node array
 * @returns {Array} unwrapped inline-content array, or the original content
 */
export function unwrapSingleParagraph(content) {
  if (
    Array.isArray(content) &&
    content.length === 1 &&
    content[0]?.type === 'paragraph'
  ) {
    return content[0].children ?? [];
  }
  return content;
}
