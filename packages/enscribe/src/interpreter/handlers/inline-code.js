// Inline code handler — renders <` lang #id.class | content `> sigil tags.
//
// The parser produces enscribeTag nodes with:
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

import { buildCodeProperties } from '../lib/code-props.js';

/**
 * Inline code handler. Called by the interpret-plugin dispatcher when
 * the vocabulary entry for "inline-code" specifies
 * interpreter_strategy: handler with handler_module: ./handlers/inline-code.js.
 *
 * @param {object} _state  - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node    - enscribeTag with tagname "`"
 * @returns {import('hast').Element} <code> element
 */
export function inlineCodeHandler(_state, node) {
  const code = typeof node.content === 'string' ? node.content : '';
  const language = node.positional?.[0] ?? null;
  // Shared <code> property building (language class + classes + id) — #170.
  const properties = buildCodeProperties(node, language);

  return {
    type: 'element',
    tagName: 'code',
    properties,
    children: [{ type: 'text', value: code }],
  };
}
