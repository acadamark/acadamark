/**
 * Default DSL tag registry.
 *
 * Tags in this set use long-form content (<tagname>...</tagname>) with opaque
 * (verbatim) content. The micromark finder consults this registry to know
 * whether to scan for a closing `</tagname>` or treat the tag as short-form.
 *
 * Used in Slice 4 (long-form DSL tags). Not yet wired into the finder.
 */
export const DEFAULT_DSL_REGISTRY = new Set([
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
