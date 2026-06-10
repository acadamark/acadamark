// Shared `<code>`-element property building for the three code handlers (#170):
// code.js, inline-code.js, code-block.js. They differ only in where the language
// comes from (`kwargs.language` for `<code>`, the sigil positional for the two
// sigil forms) and in their wrapper element — the hast property object is
// identical, so it is built here once.

/**
 * Build the hast `properties` for a `<code>` element: the language class
 * (`language-<lang>`) first, then any author / sigil classes, plus `id`.
 *
 * @param {object} node - the enscribeTag node (read for `classes` and `id`)
 * @param {string|null} language - the resolved language, or null
 * @returns {{className?: string[], id?: string}}
 */
export function buildCodeProperties(node, language) {
  const classes = [];
  if (language) classes.push(`language-${language}`);
  if (node.classes?.length) classes.push(...node.classes);

  const properties = {};
  if (classes.length > 0) properties.className = classes;
  if (node.id) properties.id = node.id;
  return properties;
}
