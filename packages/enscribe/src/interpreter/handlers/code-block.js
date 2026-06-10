// Code block handler — renders <``` lang #id.class | content ```> sigil tags.
//
// The parser produces enscribeTag nodes with:
//   tagname: "```"
//   positional: [language]  (first token before pipe, or [] if none)
//   id: string | null
//   classes: string[]
//   content: string (opaque code source), isOpaqueContent: true
//
// Output matches markdown fenced code blocks:
//   <pre><code class="language-X" id="Y">...</code></pre>
//
// Id and classes go on <code>, not <pre>. The language class ("language-X")
// is prepended to any sigil-provided classes. When no language is given,
// no language class is added.
//
// No-pipe form: entire body is opaque content; no language extraction occurs.

import { buildCodeProperties } from '../lib/code-props.js';

/**
 * Code block handler. Called by the interpret-plugin dispatcher when
 * the vocabulary entry for "code-block" specifies
 * interpreter_strategy: handler with handler_module: ./handlers/code-block.js.
 *
 * @param {object} _state  - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node    - enscribeTag with tagname "```"
 * @returns {import('hast').Element} <pre> element containing <code>
 */
export function codeBlockHandler(_state, node) {
  const code = typeof node.content === 'string' ? node.content : '';
  const language = node.positional?.[0] ?? null;
  // Shared <code> property building (language class + classes + id) — #170.
  const codeProperties = buildCodeProperties(node, language);

  return {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: codeProperties,
        children: [{ type: 'text', value: code }],
      },
    ],
  };
}
