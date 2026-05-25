/**
 * Parser-to-vocabulary mapping.
 *
 * The parser produces acadamarkTag nodes with tag names that match what
 * appears in the source syntax. For named tags (<section>, <figure>, etc.)
 * the tag name is the same as the Layer 1 element name and the vocabulary
 * entry key. For sigil-form tags (<$...$>, <$$...$$>, future sigils) the
 * parser-emitted tag name is the sigil character itself; this map translates
 * it to the semantic Layer 1 element name used as the vocabulary key.
 *
 * Tag names not in this map dispatch directly by their tag name.
 */
export const PARSER_TO_VOCAB = {
  '$': 'inline-math',
  '$$': 'display-math',
  '```': 'code-block',
  '`': 'inline-code',
};

/**
 * Resolve a parser tag name to its vocabulary key.
 * Returns the mapped value if present; otherwise returns the input unchanged.
 *
 * @param {string} parserTagName - tag name as emitted by the parser
 * @returns {string} vocabulary key
 */
export function resolveVocabKey(parserTagName) {
  return PARSER_TO_VOCAB[parserTagName] ?? parserTagName;
}
