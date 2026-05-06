/**
 * DSL content-handler registry.
 *
 * Maps long-form tag names to the content handler the interpreter should
 * dispatch to. Tags not in this map get the handler "default", which means
 * "re-parse through the regular remark pipeline" (deferred to the
 * recursive-content slice; at Slice 4, content is preserved as a string).
 *
 * Handler names currently use identity (tag name === handler name). The map
 * shape allows future divergence — e.g., an <equation> tag mapping to
 * "math" without touching the math handler itself.
 *
 * Interim hard-coded list (Slice 4). Migrates to packages/layer1-vocabulary/
 * when that package is set up: each long-form element spec will declare its
 * contentHandler there, and the parser will import the map from that package.
 * See notes/shorthand-syntax.md § "DSL tag registry".
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
  // "default" handler means content is re-parsed through remark when
  // recursive content parsing lands (deferred; currently preserved as string).
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
  // example) omitted pending Layer 1 vocabulary specification (see STATUS.md
  // "Open design questions"). Add them once their element specs are written.
  //
  // This interim list migrates to packages/layer1-vocabulary/ when that
  // package is set up. See notes/shorthand-syntax.md § "DSL tag registry".
  ['aside',      'default'],
  ['blockquote', 'default'],
  ['note',       'default'],
  ['table',      'default'],
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
