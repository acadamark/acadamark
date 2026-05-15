/**
 * DSL content-handler registry.
 *
 * Maps long-form tag names to the content handler the interpreter dispatches
 * to. Tags not in this map get the handler "default", which causes the
 * recursive-content plugin to re-parse the content through the regular
 * remark pipeline.
 *
 * Handler names currently use identity (tag name === handler name). The map
 * shape allows future divergence — e.g., an <equation> tag mapping to
 * "math" without touching the math handler itself.
 *
 * This registry lives parser-side. A future migration to
 * packages/layer1-vocabulary/ is planned: each long-form element's vocabulary
 * entry would declare its contentHandler there, and the parser would import
 * the map from that package. See notes/shorthand-syntax.md § "DSL tag
 * registry".
 */
export const DSL_REGISTRY = new Map([
  // ── Sigil tags (prose-bearing, recursively parsed) ───────────────────────
  // Hash sigils carry heading prose. "default" handler means content is
  // recursively parsed through the inner remark pipeline.
  ['#',   'default'],
  ['##',  'default'],
  ['###', 'default'],

  // ── Sigil tags (opaque, embedded language) ───────────────────────────────
  // Math and code sigils carry source for an embedded language. Non-"default"
  // handlers mean isOpaqueContent stays true; the interpreter dispatches to
  // the named handler (KaTeX, syntax highlighter, etc.).
  ['$',   'math'],
  ['$$',  'math-display'],
  ['`',   'code'],
  ['```', 'code-block'],

  // ── DSL content handlers ────────────────────────────────────────────────
  // Tag name maps to a named content handler. The interpreter dispatches to
  // that handler for content processing (CSV parsing, math rendering, etc.).
  ['csv',      'csv'],
  ['tsv',      'tsv'],
  ['math',     'math'],
  ['code',     'code'],
  ['mermaid',  'mermaid'],
  ['abc',      'abc'],
  ['theorem',  'theorem'],
  ['matrix',   'matrix'],
  ['cases',    'cases'],
  ['align',    'align'],
  ['eqnarray', 'eqnarray'],

  // ── Structural long-form tags (default handler) ─────────────────────────
  // These tags use long-form syntax for multi-line prose content. The
  // "default" handler means content is re-parsed through remark by the
  // recursive-content plugin.
  //
  // Tags NOT listed here are short-form only. Adding a tag here makes it
  // long-form eligible — any block-level occurrence without a matching
  // </tagname> will produce acadamarkTagError rather than a short-form node.
  //
  // NOTE: `figure` intentionally omitted — it has common short-form block-
  // level uses (e.g. <figure src=x.jpg>) that would produce errors as long-form
  // openers. Add figure here once the design for long-form figure is settled.
  //
  // NOTE: theorem-family elements (proof, lemma, corollary, definition,
  // example) omitted pending Layer 1 vocabulary specification for them
  // (see SPEC.md "Theorem-family"). Add them once their element specs are
  // written.
  //
  // Future migration to packages/layer1-vocabulary/ is planned. See
  // notes/shorthand-syntax.md § "DSL tag registry".
  ['aside',      'default'],
  ['blockquote', 'default'],
  ['note',       'default'],
  // 'table' uses a dedicated non-default handler so the recursive-content
  // plugin does not re-parse data strings (CSV, JSON, etc.) as markdown.
  ['table',      'table'],

  // ── List elements ────────────────────────────────────────────────────────
  // <ul>, <ol>, and <li> are in-scope vocabulary elements. Adding them here
  // makes long-form syntax (<ul>\n<li | item>\n</ul>) parse correctly, so
  // authored long-form lists behave the same as authored long-form sections
  // and asides. The markdown idiom `- item` continues to work as the
  // idiomatic shorthand via idioms.md's delegation principle.
  ['ul',         'default'],
  ['ol',         'default'],
  ['li',         'default'],

  // ── Metadata container ───────────────────────────────────────────────────
  // <meta> is the document metadata container. It always has children
  // (title, author, abstract, etc.) and therefore always uses long-form
  // syntax: <meta type=article>...</meta>. Without this registration the
  // parser would treat <meta> as a void short-form tag and its children
  // would become top-level siblings rather than nested content.
  ['meta',       'default'],

  // ── Citation support (slice 6) ───────────────────────────────────────────
  // <data> is a structural container whose content is recursively parsed
  // as markdown/acadamark (default handler). Used to wrap citation data
  // blocks that may contain nested long-form tags like <library>.
  //
  // <library> holds raw BibTeX/CSL-JSON source (opaque handler). Content is
  // NOT recursively parsed as markdown — citation-js will parse it directly
  // in the citation-resolution plugin. Because the handler name ('library')
  // is not 'default', isOpaqueContent is automatically set to true in
  // from-markdown.js (line: node.isOpaqueContent = node.contentHandler !== 'default').
  ['data',       'default'],
  ['library',    'library'],
])

/**
 * Look up the content handler for a long-form tag name.
 * Returns the registered handler name, or "default" for unregistered tags.
 *
 * @param {string} tagName
 * @returns {string}
 */
export function getContentHandler(tagName) {
  return DSL_REGISTRY.get(tagName) ?? 'default'
}
