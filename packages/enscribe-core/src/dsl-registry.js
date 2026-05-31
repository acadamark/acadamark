/**
 * DSL handler-dispatch registry.
 *
 * A **DSL** in enscribe is a tag whose content is a foreign language
 * interpreted by an external processor into output. The processor is not
 * enscribe's own parser/renderer; it is a different language with its own
 * grammar that enscribe delegates to. Examples:
 *
 *   - `<math>` / `<$ … $>` / `<$$ … $$>` — LaTeX math → KaTeX
 *   - `<code>` / `` <` … `> `` / ` <``` … ```> ` — source code → highlighter
 *   - `<csv>` / `<tsv>` — comma/tab-separated values → table parser
 *   - `<mermaid>` / `<abc>` — Mermaid / ABC notation → renderer
 *   - `<table>` — carries CSV/TSV/JSON/YAML data → table.js handler
 *   - `<library>` — raw BibTeX / CSL-JSON → citation-js
 *   - `<matrix>` / `<cases>` / `<align>` / `<eqnarray>` — LaTeX math envs
 *
 * This registry maps the DSL tag's name (or sigil token) to its handler
 * module name. `getContentHandler(tagName)` consumed by the parser
 * (`from-markdown.js`) sets `node.contentHandler` and the
 * `isOpaqueContent = contentHandler !== 'default'` derivation, so non-DSL
 * tags get `'default'` handler + `isOpaqueContent: false` (recursive parse)
 * via the fallback in `getContentHandler`.
 *
 * **History:** this registry previously also held regular-vocabulary tags
 * (sections, `<aside>`, lists, definition lists, theorem family, …) as a
 * workaround for the parser's pre-2026-05-27 long-form gate, which required
 * registry membership for `<tag>…</tag>` to parse. That conflation was
 * removed in the DSL/long-form parser bug fix (2026-05-27): the parser now
 * admits long-form for every tag (the three-form grammar disambiguates by
 * `|` / `/` locally; see `DESIGN.md` §"Tag forms"). With the gate gone,
 * regular-vocabulary tags don't need any registry — they reach the renderer
 * via the default vocabulary path. The registry shrank to genuine DSLs only.
 *
 * Structured-data-container tags (`<meta>`, `<author>`) live in their own
 * `STRUCTURED_ELEMENTS` registry (`./structured-elements.js`) for the
 * kwarg/child-tag lift infrastructure built in `beb2fb3`.
 */
export const DSL_REGISTRY = new Map([
  // ── Math and code sigils (opaque, embedded language) ─────────────────────
  // Math and code sigils carry source for an embedded language. Non-"default"
  // handlers mean isOpaqueContent stays true; the interpreter dispatches to
  // the named handler (KaTeX, syntax highlighter, etc.).
  //
  // These sigils don't go through the long-form tokenizer; the entries here
  // exist for the `getContentHandler(sigil)` lookup. Drift guards in
  // `normalize-to-canonical.js` assert the handler values
  // (`$` → 'math', `$$` → 'math-display', `` ` `` → 'code', etc.); removing
  // these would break those guards.
  //
  // Section sigils (#, ##, ###) were previously listed alongside these with
  // the 'default' handler. They were regular vocabulary in sigil form (no
  // foreign-language interpretation; the body is just heading prose); they
  // were removed by the DSL/long-form parser bug fix because the default
  // handler is the unregistered-tag fallback in `getContentHandler` — the
  // explicit entry was redundant. They are not DSLs.
  ['$',   'math'],
  ['$$',  'math-display'],
  ['`',   'code'],
  ['```', 'code-block'],

  // ── DSL handlers ─────────────────────────────────────────────────────────
  // Each entry maps a tag to its handler module. The interpreter dispatches
  // to that handler for content processing. `'default'` (the unregistered-
  // tag fallback) means "recursively parse as enscribe"; non-default
  // handlers receive the verbatim content string and interpret it via the
  // named processor.
  ['csv',      'csv'],
  ['tsv',      'tsv'],
  ['math',     'math'],
  ['code',     'code'],
  ['mermaid',  'mermaid'],
  ['abc',      'abc'],
  ['matrix',   'matrix'],
  ['cases',    'cases'],
  ['align',    'align'],
  ['eqnarray', 'eqnarray'],
  // `<table>` is a DSL — its content is data in a foreign format (CSV, TSV,
  // JSON, YAML, or markdown-table source) parsed by handlers/table.js. The
  // 'table' handler value makes isOpaqueContent: true, which is what keeps
  // the recursive-content plugin from re-parsing the data string as markdown.
  ['table',      'table'],
  // `<library>` holds raw BibTeX/CSL-JSON source, parsed by citation-js in
  // the citation-resolution plugin. The 'library' handler value makes
  // isOpaqueContent: true; the data string passes through unchanged.
  ['library',    'library'],
])

/**
 * Look up the content handler for a tag name.
 * Returns the registered handler name for a DSL tag, or `'default'` for
 * any other tag (regular vocabulary, structured-data-containers, or
 * anything unregistered). The `'default'` fallback is what makes the
 * non-DSL tags' content recursively parse through the regular pipeline.
 *
 * @param {string} tagName
 * @returns {string}
 */
export function getContentHandler(tagName) {
  return DSL_REGISTRY.get(tagName) ?? 'default'
}
