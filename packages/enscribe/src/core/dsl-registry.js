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
 * language record carrying its content **handler**, its content **opacity**,
 * and the **`(purpose, host)` bindings** that say which hosts the language is
 * legal in. The host / role axis (the accept-set a host owns) lives with the
 * hosts, not here — see `interpreter/lib/host-accept-sets.js`.
 *
 * **Output-neutral scope (slice 2).** The `(purpose, host)` bindings and the
 * opacity field are net-new *data*; the only behavioral consumer is still
 * `getContentHandler()` (used by the parser to set `node.contentHandler` and
 * derive `isOpaqueContent = contentHandler !== 'default'`). The bindings are
 * not yet read by dispatch — member migration (the `<diagram>` host, the
 * csv/tsv/mermaid/abc shorthands) is slice 3, which turns them on. Hosts named
 * in a binding that do not yet exist as tags (e.g. `diagram`, `fig` for `svg`)
 * are forward-looking declarations, harmless until slice 3 reads them.
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
 * The purpose trichotomy (DESIGN.md §"The two axes"). A language's purpose is
 * **derived from the host** — display for renderables, storage for payloads the
 * document machinery consumes, evaluation for content that is run — so authors
 * never type it. (No `evaluation` language is registered yet; executable code
 * is future work.)
 */
export const PURPOSE = Object.freeze({
  DISPLAY: 'display',
  STORAGE: 'storage',
  EVALUATION: 'evaluation',
});

const D = PURPOSE.DISPLAY;
const S = PURPOSE.STORAGE;

/**
 * The language / type axis: identifier → `{ handler, opaque, bindings }`.
 *
 * Insertion order is preserved from the pre-reshape flat map so the derived
 * `DSL_REGISTRY` below iterates byte-identically.
 *
 * Notes on individual entries:
 *   - Sigils (`$`, `$$`, `` ` ``, `` ``` ``) are shorthand forms; drift guards
 *     in `normalize-to-canonical.js` assert their handler values, so the
 *     handlers here are load-bearing.
 *   - Host-named entries (`math`, `code`, `table`, `library`) are present
 *     because the host tag's own content is opaque and dispatches to the host
 *     handler; their binding names the host itself.
 *   - The math environments (`matrix`/`cases`/`align`/`eqnarray`) bind to the
 *     `math` host as display languages because they render math — this names
 *     the render target, not a commitment on whether the standalone tags retire
 *     into `<math …>` (the open #79 question).
 *   - `svg` binds to the `fig` host (the inline-SVG frameable case); its handler
 *     is a passthrough (the browser renders SVG natively).
 */
export const LANGUAGES = new Map([
  // ── Math and code sigils (opaque, embedded language) ─────────────────────
  ['$',   { handler: 'math',         opaque: true, bindings: [{ purpose: D, host: 'math' }] }],
  ['$$',  { handler: 'math-display', opaque: true, bindings: [{ purpose: D, host: 'math' }] }],
  ['`',   { handler: 'code',         opaque: true, bindings: [{ purpose: D, host: 'code' }] }],
  ['```', { handler: 'code-block',   opaque: true, bindings: [{ purpose: D, host: 'code' }] }],

  // ── DSL languages and host entries ───────────────────────────────────────
  ['csv',      { handler: 'csv',      opaque: true, bindings: [{ purpose: D, host: 'table' }] }],
  ['tsv',      { handler: 'tsv',      opaque: true, bindings: [{ purpose: D, host: 'table' }] }],
  ['math',     { handler: 'math',     opaque: true, bindings: [{ purpose: D, host: 'math' }] }],
  ['code',     { handler: 'code',     opaque: true, bindings: [{ purpose: D, host: 'code' }] }],
  ['mermaid',  { handler: 'mermaid',  opaque: true, bindings: [{ purpose: D, host: 'diagram' }] }],
  ['abc',      { handler: 'abc',      opaque: true, bindings: [{ purpose: D, host: 'diagram' }] }],
  // `diagram` host (#22 slice 3): a directly-authored `<diagram mermaid | …>`
  // must keep its content opaque at parse time (getContentHandler('diagram')).
  // The engine (mermaid/abc) is the format-word positional, resolved by the
  // diagram handler; this entry only governs opacity + the host's own binding.
  ['diagram',  { handler: 'diagram',  opaque: true, bindings: [{ purpose: D, host: 'diagram' }] }],
  ['matrix',   { handler: 'matrix',   opaque: true, bindings: [{ purpose: D, host: 'math' }] }],
  ['cases',    { handler: 'cases',    opaque: true, bindings: [{ purpose: D, host: 'math' }] }],
  ['align',    { handler: 'align',    opaque: true, bindings: [{ purpose: D, host: 'math' }] }],
  ['eqnarray', { handler: 'eqnarray', opaque: true, bindings: [{ purpose: D, host: 'math' }] }],
  ['table',    { handler: 'table',    opaque: true, bindings: [{ purpose: D, host: 'table' }] }],
  ['library',  { handler: 'library',  opaque: true, bindings: [{ purpose: S, host: 'library' }] }],
  ['svg',      { handler: 'svg',      opaque: true, bindings: [{ purpose: D, host: 'fig' }] }],
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

/**
 * The `(purpose, host)` bindings a language declares, or `[]` if the
 * identifier is unregistered. Not yet read by dispatch (slice 2 is
 * output-neutral); slice 3 consumes these for member migration.
 *
 * @param {string} identifier
 * @returns {Array<{ purpose: string, host: string }>}
 */
export function getLanguageBindings(identifier) {
  return LANGUAGES.get(identifier)?.bindings ?? [];
}
