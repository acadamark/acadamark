// Code handler — renders long-form `<code>` tags.
//
// Sibling of handlers/inline-code.js. The two handlers share the same
// rendering shape (a single `<code>` element with the code text as a text
// child); they exist as separate modules because they're registered under
// different vocab entries (`code` long-form vs `inline-code` sigil) and
// dispatched from different DSL_REGISTRY entries.
//
// Phase 2 slice 2a (2026-05-27) added this handler to close the
// long-form `<code>` content-drop bug:
//   - DSL_REGISTRY entry `['code', 'code']` marks `<code>` content opaque
//     (parser sets isOpaqueContent: true; recursive-content plugin skips).
//   - Pre-fix: code.md declared `interpreter_strategy: schema`, which
//     routed through schemaDispatch. convertContent (interpret-plugin.js)
//     returns [] for opaque-content nodes — so `<code | print("hi")>`
//     rendered as `<code></code>` with no body content. The pipe text
//     was captured by the parser and silently dropped.
//   - Fix: code.md now declares `interpreter_strategy: handler` +
//     `handler_module: ./handlers/code.js`. This handler pulls the raw
//     text from node.content (same shape inline-code.js consumes) and
//     emits a `<code>` element with the text as a child.

import { buildCodeProperties } from '../lib/code-props.js';

/**
 * Handler for the `<code>` long-form / short-form-with-pipe tag.
 *
 * Reads the opaque content string and emits a `<code>` element with the
 * text as a text child. Honors the `language` kwarg (added as a
 * `language-X` class for downstream highlighter pickup) and the standard
 * id / classes attributes.
 *
 * @param {object} _state  - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node    - enscribeTag with tagname "code"
 * @returns {import('hast').Element} <code> element
 */
export function codeHandler(_state, node) {
  const code = typeof node.content === 'string' ? node.content : '';
  const language = node.kwargs?.language ?? null;
  // Shared <code> property building (language class + classes + id) — #170.
  const properties = buildCodeProperties(node, language);

  return {
    type: 'element',
    tagName: 'code',
    properties,
    children: [{ type: 'text', value: code }],
  };
}
