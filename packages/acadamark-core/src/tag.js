// Canonical `acadamarkTag` node-shape builders.
//
// The shape is defined by the parser's grammar `makeNode` factory (in
// `packages/remark-acadamark/grammar/acadamark.peggy`) — the ground-truth
// origin of acadamarkTag nodes — plus the spec passage in
// `notes/specs/shorthand-syntax.md` §"What the parser produces."
//
// Three named builders cover the three legitimate construction patterns:
//
//   makeTag(tagname, content, opts)
//     General-purpose short-form builder. content is an array of child nodes
//     (default []), the tag is parsed-content (`isOpaqueContent: false`,
//     `contentHandler: 'default'`). Used for synthetic structural wrappers
//     (article, article-body, article-back, section-title, meta, etc.) and
//     for any parsed-content tag whose content is an array.
//
//   makeOpaqueTag(tagname, contentString, opts)
//     Opaque-content short-form builder. content is a raw string (the source
//     verbatim, to be handled later by the named contentHandler). Used by
//     normalize-markdown to wrap delegated-parser nodes (math, math-display,
//     table) as canonical acadamarkTag nodes. The caller must supply
//     `contentHandler` in opts; `isOpaqueContent` is set to `true`.
//
//   makeInternalMarker(tagname, opts)
//     Internal-marker short-form builder. content defaults to null. Used by
//     the resolution plugins (cite-resolution, ref-resolution, bibliography)
//     and the note placement plugin to inject `__cite-marker`,
//     `__ref-marker`, `__note-marker`, `__bibliography`, `__note-list`,
//     `__note-list-item`, etc. into the tree. These are `acadamarkTag` nodes
//     by type, but their rendering goes through the interpreter's
//     INTERNAL_REGISTRY rather than vocabulary dispatch. content can be
//     overridden via opts when a marker carries content (notes-list,
//     note-list-item).
//
// Every builder produces the full 12-field short-form canonical shape:
//   { type, form, tagname, positional, booleans, kwargs, id, classes,
//     atRefs, content, isOpaqueContent, contentHandler, selfClosing }
//
// Defaults follow the parser's grammar `makeNode` factory:
//   form: 'short', positional: [], booleans: {}, kwargs: {}, id: null,
//   classes: [], atRefs: [], isOpaqueContent: false, selfClosing: false,
//   contentHandler: 'default'  (varies for makeOpaqueTag — caller-supplied).

/**
 * General-purpose short-form acadamarkTag builder. Parsed content (array of
 * child nodes); default contentHandler.
 *
 * @param {string} tagname
 * @param {Array} [content] - child nodes (mdast / acadamarkTag); default []
 * @param {object} [opts]
 * @param {string|null} [opts.id]
 * @param {string[]}    [opts.classes]
 * @param {object}      [opts.kwargs]
 * @param {Array}       [opts.positional]
 * @param {object}      [opts.booleans]
 * @returns {object} acadamarkTag node
 */
export function makeTag(
  tagname,
  content = [],
  { id = null, classes = [], kwargs = {}, positional = [], booleans = {} } = {},
) {
  return {
    type: 'acadamarkTag',
    form: 'short',
    tagname,
    positional,
    booleans,
    kwargs,
    id,
    classes,
    atRefs: [],
    content,
    isOpaqueContent: false,
    contentHandler: 'default',
    selfClosing: false,
  };
}

/**
 * Opaque-content short-form acadamarkTag builder. Used when the content is a
 * raw string that a named handler ('math', 'math-display', 'table', etc.)
 * will process later. `contentHandler` is required in opts.
 *
 * @param {string} tagname
 * @param {string} contentString - raw verbatim content
 * @param {object} opts
 * @param {string}        opts.contentHandler - REQUIRED ('math', 'table', ...)
 * @param {string|null}   [opts.id]
 * @param {string[]}      [opts.classes]
 * @param {object}        [opts.kwargs]
 * @param {Array}         [opts.positional]
 * @param {object}        [opts.booleans]
 * @returns {object} acadamarkTag node
 */
export function makeOpaqueTag(
  tagname,
  contentString,
  { contentHandler, id = null, classes = [], kwargs = {}, positional = [], booleans = {} } = {},
) {
  if (!contentHandler) {
    throw new Error(
      `makeOpaqueTag(${JSON.stringify(tagname)}): contentHandler is required for opaque-content tags`,
    );
  }
  return {
    type: 'acadamarkTag',
    form: 'short',
    tagname,
    positional,
    booleans,
    kwargs,
    id,
    classes,
    atRefs: [],
    content: contentString,
    isOpaqueContent: true,
    contentHandler,
    selfClosing: false,
  };
}

/**
 * Internal-marker short-form acadamarkTag builder. Used for interpreter-
 * internal node types (`__cite-marker`, `__ref-marker`, `__note-marker`,
 * `__bibliography`, `__note-list`, `__note-list-item`, etc.) dispatched
 * through the interpreter's INTERNAL_REGISTRY. content defaults to null;
 * callers with content (note-list, note-list-item) supply it via opts.
 *
 * @param {string} tagname
 * @param {object} [opts]
 * @param {string|null}   [opts.id]
 * @param {string[]}      [opts.classes]
 * @param {object}        [opts.kwargs]
 * @param {Array|null}    [opts.content]
 * @returns {object} acadamarkTag node
 */
export function makeInternalMarker(
  tagname,
  { id = null, classes = [], kwargs = {}, content = null } = {},
) {
  return {
    type: 'acadamarkTag',
    form: 'short',
    tagname,
    positional: [],
    booleans: {},
    kwargs,
    id,
    classes,
    atRefs: [],
    content,
    isOpaqueContent: false,
    contentHandler: 'default',
    selfClosing: false,
  };
}
