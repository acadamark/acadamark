// Shape token membership per notes/specs/shape-tokens.md.
//
// Three tokens — inline, block, section — classify Layer 1 elements by where
// they appear in source and how they render. Vocabulary entries reference these
// tokens in their `content.shape...contains` arrays; the interpreter expands
// them at validation time against the lists below.
//
// The lists here are the canonical runtime version of the membership tables in
// notes/specs/shape-tokens.md. Out-of-scope-for-slice-1 elements are included so that
// validation is permissive across the full vocabulary; dispatch logic for
// out-of-scope elements is handled separately by the interpreter.

export const INLINE_ELEMENTS = new Set([
  'em', 'strong',
  'code',
  'i', 'b', 'u', 's',
  'a',
  'img',
  'span',
  'q',
  'sub', 'sup',
  'cite',
  'ref',
  'note',
]);

export const BLOCK_ELEMENTS = new Set([
  'p',
  'aside', 'blockquote',
  'figure',
  'hr',
  'ul', 'ol',
  'table',
  'note-list',
  'bibliography',
]);

export const SECTION_ELEMENTS = new Set([
  'section', 'sub-section', 'sub-sub-section',
  'book-part',
]);

const TOKEN_MAP = {
  inline: INLINE_ELEMENTS,
  block: BLOCK_ELEMENTS,
  section: SECTION_ELEMENTS,
};

// Expand a list of tokens (e.g. ['inline', 'block']) to a flat Set of element
// names. Unknown tokens are skipped — the caller decides whether that's an
// error or just a no-op.
export function expandTokens(tokens) {
  const out = new Set();
  if (!tokens) return out;
  for (const t of tokens) {
    const set = TOKEN_MAP[t];
    if (!set) continue;
    for (const e of set) out.add(e);
  }
  return out;
}

// Classify an element name into one of the tokens, or null if it doesn't belong
// to any of the three. Useful for sanity checks and warnings during dispatch.
export function classifyElement(tagName) {
  if (INLINE_ELEMENTS.has(tagName)) return 'inline';
  if (BLOCK_ELEMENTS.has(tagName)) return 'block';
  if (SECTION_ELEMENTS.has(tagName)) return 'section';
  return null;
}
