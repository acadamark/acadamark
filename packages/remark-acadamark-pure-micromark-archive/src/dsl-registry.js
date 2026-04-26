/**
 * Tag names whose content is opaque (verbatim text, not parsed markdown).
 * A tag in this set uses long-form `<name>...</name>` with opaque content.
 * Extendable by downstream packages.
 *
 * @type {Set<string>}
 */
export const DSL_TAGS = new Set([
  'csv',
  'tsv',
  'math',
  'code',
  'mermaid',
  'abc',
  'theorem',
  'matrix',
  'cases',
  'align',
  'eqnarray',
])
