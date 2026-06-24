// Shared XML-escape helpers for the CLI's JATS export and import paths.
//
// `escapeXmlAttr` was previously defined three times — identically in intent —
// in jats-export/index.js, jats-export/lib/jats-emit.js, and jats-import/index.js
// (#91). It now lives here; all three import it.
//
// `escapeXmlText` (XML text content: `&`, `<`, `>`) was likewise duplicated — as
// `escapeXml` in jats-export/index.js and `escapeXmlText` in jats-import/index.js
// (#99); it now lives here too, and both import it. The two copies were not quite
// identical: the import copy used `String(s)` where the export copy used the
// null-safe `String(s ?? '')`. This consolidated form keeps the null-safe guard
// (matching `escapeXmlAttr`); that is a no-op for the string inputs both call
// paths actually pass, and avoids ever emitting the literal `"null"` / `"undefined"`.

/**
 * Escape the characters that are illegal in an XML double-quoted attribute
 * value: `&`, `<`, `"`. (Apostrophes are legal inside double-quoted values.)
 * Non-string input is coerced; `null` / `undefined` become the empty string.
 *
 * @param {*} s
 * @returns {string}
 */
export function escapeXmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escape the characters that are illegal in XML text content (between tags):
 * `&`, `<`, `>`. Non-string input is coerced; `null` / `undefined` become the
 * empty string.
 *
 * @param {*} s
 * @returns {string}
 */
export function escapeXmlText(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
