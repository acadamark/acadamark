// Shared XML-escape helpers for the CLI's JATS export and import paths.
//
// `escapeXmlAttr` was previously defined three times — identically in intent —
// in jats-export/index.js, jats-export/lib/jats-emit.js, and jats-import/index.js
// (#91). It now lives here; all three import it.

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
