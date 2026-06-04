/**
 * DSL handler-dispatch registry — the language/type axis.
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
 * **The two-axis model (DESIGN.md §"The two axes: host and language").**
 * This module is the **language / type axis** — the registry understood as a
 * type system. Each identifier (a DSL tag name or sigil token) maps to a
 * language record carrying its content **handler** and its content **opacity**.
 * The host / role axis (which format words a host admits) lives with the hosts,
 * not here — see `interpreter/lib/host-accept-sets.js`, which #85 wired as the
 * accept-set validation in the normalize-to-canonical gate.
 *
 * **Removed (#85): the `(purpose, host)` bindings.** Each language record once
 * also carried a `bindings` array (language → the hosts it is legal in), read
 * via a `getLanguageBindings` accessor. Those were built (slice 2) as a
 * declarative substrate that a planned member-migration (slice 3) was meant to
 * consume — but slice 3 shipped via *explicit* gate registrations
 * (`interpreter/plugins/normalize-to-canonical.js`) instead, and nothing ever
 * read the bindings. #85 removed them as confirmed-inert data: the only
 * directional need that has a real consumer (host → languages, for validation)
 * is served by the `host-accept-sets.js` map, which the gate now consults.
 * `getContentHandler` and `isOpaqueLanguage` are this module's live accessors.
 *
 * `getContentHandler(tagName)` is consumed by the parser (`from-markdown.js`),
 * which sets `node.contentHandler` and the
 * `isOpaqueContent = contentHandler !== 'default'` derivation, so non-DSL tags
 * get `'default'` handler + `isOpaqueContent: false` (recursive parse) via the
 * fallback.
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

/**
 * The language / type axis: identifier → `{ handler, opaque }`.
 *
 * Insertion order is preserved from the pre-reshape flat map so the derived
 * `DSL_REGISTRY` below iterates byte-identically.
 *
 * Notes on individual entries:
 *   - Sigils (`$`, `$$`, `` ` ``, `` ``` ``) are shorthand forms; drift guards
 *     in `normalize-to-canonical.js` assert their handler values, so the
 *     handlers here are load-bearing.
 *   - Host-named entries (`math`, `code`, `table`, `library`, `diagram`) are
 *     present because the host tag's own content is opaque and dispatches to
 *     the host handler.
 *   - `svg` is its own host (a first-class frameable element, not a format word
 *     on another host); its handler is a passthrough — the browser renders SVG
 *     natively. The `<fig svg>` framed-via-figure-host form was considered and
 *     RETIRED (#81): `<svg>`-as-frameable (frameable.md) already owns framed
 *     inline SVG, so a second route would be redundant and would need
 *     positional-conditional opacity that was never built.
 */
export const LANGUAGES = new Map([
  // ── Math and code sigils (opaque, embedded language) ─────────────────────
  ['$',   { handler: 'math',         opaque: true }],
  ['$$',  { handler: 'math-display', opaque: true }],
  ['`',   { handler: 'code',         opaque: true }],
  ['```', { handler: 'code-block',   opaque: true }],

  // ── DSL languages and host entries ───────────────────────────────────────
  ['csv',      { handler: 'csv',      opaque: true }],
  ['tsv',      { handler: 'tsv',      opaque: true }],
  ['math',     { handler: 'math',     opaque: true }],
  ['code',     { handler: 'code',     opaque: true }],
  ['mermaid',  { handler: 'mermaid',  opaque: true }],
  ['abc',      { handler: 'abc',      opaque: true }],
  // `diagram` host (#22 slice 3): a directly-authored `<diagram mermaid | …>`
  // must keep its content opaque at parse time (getContentHandler('diagram')).
  // The engine (mermaid/abc) is the format-word positional, resolved by the
  // diagram handler; this entry only governs opacity.
  ['diagram',  { handler: 'diagram',  opaque: true }],
  ['matrix',   { handler: 'matrix',   opaque: true }],
  ['cases',    { handler: 'cases',    opaque: true }],
  ['align',    { handler: 'align',    opaque: true }],
  ['eqnarray', { handler: 'eqnarray', opaque: true }],
  ['table',    { handler: 'table',    opaque: true }],
  ['library',  { handler: 'library',  opaque: true }],
  ['svg',      { handler: 'svg',      opaque: true }],
]);

/**
 * Derived flat content-handler map (identifier → handler). Retained as the
 * historical `DSL_REGISTRY` export for back-compat; byte-identical to the
 * pre-reshape map (same entries, same insertion order). `LANGUAGES` above is
 * the source of truth.
 */
export const DSL_REGISTRY = new Map(
  [...LANGUAGES].map(([id, lang]) => [id, lang.handler]),
);

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
  return LANGUAGES.get(tagName)?.handler ?? 'default';
}

/**
 * Whether a language keeps its content opaque (verbatim source). Unregistered
 * identifiers are not opaque (`'default'` handler → recursive parse). This is
 * the same fact the parser derives as `contentHandler !== 'default'`; the
 * stored `opaque` field is the canonical declaration of it.
 *
 * @param {string} identifier
 * @returns {boolean}
 */
export function isOpaqueLanguage(identifier) {
  return LANGUAGES.get(identifier)?.opaque ?? false;
}
