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

/**
 * Handler for the `<code>` long-form / short-form-with-pipe tag.
 *
 * Reads the opaque content string and emits a `<code>` element with the
 * text as a text child. Honors the `language` kwarg (added as a
 * `language-X` class for downstream highlighter pickup) and the standard
 * id / classes attributes.
 *
 * @param {object} _state  - mdast-util-to-hast state (unused — opaque content)
 * @param {object} node    - acadamarkTag with tagname "code"
 * @returns {import('hast').Element} <code> element
 */
export function codeHandler(_state, node) {
  const code = typeof node.content === 'string' ? node.content : '';
  const language = node.kwargs?.language ?? null;
  const id = node.id ?? null;

  // Build class list: language class first, then any author-supplied classes.
  // Mirrors handlers/inline-code.js's class-building so the two handlers
  // produce consistent shapes.
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
