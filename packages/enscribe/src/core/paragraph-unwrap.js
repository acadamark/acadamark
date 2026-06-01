// Paragraph-unwrap helper — the mechanic, not the gate.
//
// Per `notes/specs/interpreter.md` §3.1 and `pipeline.md` §3, pipe content
// that resolves to a single `paragraph` mdast node is unwrapped to that
// paragraph's `children` array (the prose-bearing inline content), so e.g.
// `<em | text>` renders as `<em>text</em>` and not `<em><p>text</p></em>`.
//
// The *gate* — when to apply this unwrapping — is per-caller:
// `interpret-plugin.js#convertContent` gates by `vocab.content.type === 'prose'`
// (vocab-driven); `figure.js#buildCaptionHastNodes` applies it unconditionally
// for figcaption content. The DRY audit (G13 / Bin C.2) noted that the
// different gates are legitimate and a shared "default gate" would fit
// neither caller — so this helper is the unwrap *operation* only.

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
