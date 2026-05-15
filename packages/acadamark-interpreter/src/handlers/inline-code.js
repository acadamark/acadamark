// Inline code handler — renders <` lang #id.class | content `> sigil tags.
//
// The parser produces acadamarkTag nodes with:
//   tagname: "`"
//   positional: [language]  (first token before pipe, or [] if none)
//   id: string | null
//   classes: string[]
//   content: string (opaque code source), isOpaqueContent: true
//
// Output matches markdown inline code spans:
//   <code class="language-X" id="Y">...</code>
//
// Id and classes go directly on <code>. The language class ("language-X") is
// prepended to any sigil-provided classes. When no language is given, no
// language class is added.
//
// No-pipe form: entire body is opaque content; no language extraction occurs.

/**
 * Inline code handler. Called by the interpret-plugin dispatcher when
 * the vocabulary entry for "inline-code" specifies
 * interpreter_strategy: handler with handler_module: ./handlers/inline-code.js.
 *
 * @param {object} _state  - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node    - acadamarkTag with tagname "`"
 * @returns {import('hast').Element} <code> element
 */
export function inlineCodeHandler(_state, node) {
  const code = typeof node.content === 'string' ? node.content : '';
  const language = node.positional?.[0] ?? null;
  const id = node.id ?? null;

  // Build class list: language class first, then any sigil-provided classes.
  const classes = [];
  if (language) classes.push(`language-${language}`);
  if (node.classes?.length) classes.push(...node.classes);

  const properties = {};
  if (classes.length > 0) properties.className = classes;
  if (id) properties.id = id;

  return {
    type: 'element',
    tagName: 'code',
    properties,
    children: [{ type: 'text', value: code }],
  };
}
