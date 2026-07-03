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
 * type system. Each identifier (a DSL tag name or sigil token) maps to its
 * content **handler** (the processor its content is delegated to).
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
 * `getContentHandler` is this module's live accessor.
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
 * The language / type axis: identifier → content-handler name.
 *
 * (Until #175 each record was `{ handler, opaque }`, with a derived
 * `DSL_REGISTRY` export and an `isOpaqueLanguage` accessor. The `opaque` layer
 * was removed as inert: opacity is derived by the parser as
 * `contentHandler !== 'default'` — its only reader — so the stored flag and the
 * two accessors had no production consumer. This is now the flat handler map.)
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
import { deriveDslLanguageEntries } from './dsl-registrations.js';

export const LANGUAGES = new Map([
  // ── Math and code sigils (opaque, embedded language) ─────────────────────
  ['$',   'math'],
  ['$$',  'math-display'],
  ['`',   'code'],
  ['```', 'code-block'],

  // ── DSL languages and host entries ───────────────────────────────────────
  ['csv',      'csv'],
  ['tsv',      'tsv'],
  ['math',     'math'],
  ['code',     'code'],
  // mermaid, abc — the external-library DSLs. Their parse-time entries are DERIVED
  // from the registration seeds (core/dsl-registrations.js), not hand-written: a
  // seed held `opaqueAtParse` yields `[name, name]` here (#341). A new external DSL
  // is a new seed, not a new row. The 18 entries around them are enscribe-native /
  // storage / opaque markers — NOT registerDsl clients — and stay literal.
  ...deriveDslLanguageEntries(),
  // `diagram` host (#22 slice 3): a directly-authored `<diagram mermaid | …>`
  // keeps its content opaque at parse time (getContentHandler('diagram') is
  // non-default). The engine (mermaid/abc) is the format-word positional,
  // resolved by the diagram handler.
  ['diagram',  'diagram'],
  ['matrix',   'matrix'],
  ['cases',    'cases'],
  ['align',    'align'],
  ['eqnarray', 'eqnarray'],
  ['table',    'table'],
  ['library',  'library'],
  // #313 slice 1: the `<dataset>` storage host. Like `<library>`, its body is an
  // OPAQUE payload (CSV/TSV/JSON/…) held under an id for an `@id` consumer to pull
  // and interpret later (slice 2+) — `<dataset>` is pure storage, never a renderer.
  // A non-`default` handler is all that is needed: it makes the parser set
  // `isOpaqueContent: true` (from-markdown), so recursive-content's
  // `contentHandler !== 'default'` guard skips it and the bytes are never re-parsed
  // as markdown. The value is the opaque MARKER only — nothing dispatches a render
  // off it (the declaration is harvested + stripped in <data>, like an embedded
  // asset; the `format` hint is a kwarg read at harvest, not a handler). See
  // notes/specs/data-store.md Piece 1.
  ['dataset',  'dataset'],
  ['svg',      'svg'],
  // #115: the minipage host. Its pipe content is a SEALED sub-document —
  // held opaque (raw source string) at parse time so the main pipeline never
  // descends into it (recursive-content skips it; the discover/walk-replace
  // walks skip it via the `!isOpaqueContent` guard). The body is processed in
  // its own pipeline run (the deferred phase, plugins/minipage-deferred.js),
  // NOT by a content-dispatch handler keyed off this value — like every other
  // frameable, the minipage renders through its vocab `handler_module`
  // (handlers/minipage.js), dispatched by interpret-plugin.js, not by this map.
  ['minipage', 'minipage'],
]);

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
  return LANGUAGES.get(tagName) ?? 'default';
}
