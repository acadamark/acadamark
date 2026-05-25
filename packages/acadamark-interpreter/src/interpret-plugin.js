// mdast-to-hast bridge: custom handler for acadamarkTag nodes.
//
// When toHast() (from mdast-util-to-hast) encounters an acadamarkTag node, it
// calls this handler. The handler dispatches based on the vocabulary entry's
// interpreter_strategy:
//
//   schema  → schemaDispatch: builds a hast element from html_output.element
//             and attribute mappings; children come from node.content.
//   handler → handlerDispatch: calls a dedicated handler module.
//
// Unknown tags produce a <span data-acadamark-unknown="tagname"> with a
// warning; content is passed through best-effort.
//
// PARAGRAPH UNWRAPPING
// After remarkRecursiveContent, an element's pipe text has been parsed through
// remark and often produces a single-paragraph wrapper around its actual inline
// content. For elements with content.type === 'prose', we unwrap that wrapper
// so <em | text> becomes <em>text</em>, not <em><p>text</p></em>.
// Multi-paragraph content (content.length > 1) is never unwrapped.

import { unwrapSingleParagraph } from 'acadamark-core/paragraph-unwrap';
import { VOCABULARY } from 'layer1-vocabulary';
import { buildProperties } from './lib/build-properties.js';
import { warnUnknownTag, warnHandlerError } from './lib/errors.js';
import { figureHandler } from './handlers/figure.js';
import { mathHandler } from './handlers/math.js';
import { codeBlockHandler } from './handlers/code-block.js';
import { inlineCodeHandler } from './handlers/inline-code.js';
import { tableHandler } from './handlers/table.js';
import {
  noteMarkerHandler,
  noteListHandler,
  noteListItemHandler,
} from './handlers/notes.js';
import { refMarkerHandler, refErrorHandler } from './handlers/ref.js';
import { citeMarkerHandler, citeErrorHandler, bibliographyHandler } from './handlers/cite.js';
import { resolveVocabKey } from 'acadamark-core/sigil-mapping';

// Internal node types created by the notes plugin — they have no vocabulary
// entries, so they are dispatched here before the vocabulary lookup.
const INTERNAL_REGISTRY = new Map([
  // Data-layer nodes: render no visible output in HTML.
  // <data> and <library> are processed by library-load.js at build time.
  ['data',             () => null],
  ['library',          () => null],
  ['__note-marker',    noteMarkerHandler],
  ['__note-list',      noteListHandler],
  ['__note-list-item', noteListItemHandler],
  ['__ref-marker',     refMarkerHandler],
  ['__ref-error',      refErrorHandler],
  ['__cite-marker',    citeMarkerHandler],
  ['__cite-error',     citeErrorHandler],
  ['__bibliography',   bibliographyHandler],
]);

// Wrap the build-time-generated VOCABULARY object as a Map at module load,
// preserving the read-pattern (`vocabulary.get(key)`) the downstream
// dispatch sites use. The Map is shared across all pipeline invocations
// in the same process; safe because VOCABULARY is frozen and read-only.
const vocabulary = new Map(Object.entries(VOCABULARY));

// Maps handler_module values (as declared in vocabulary entries) to the
// actual handler functions. Slice 1 has only one handler-strategy element.
const HANDLER_REGISTRY = new Map([
  ['./handlers/figure.js', figureHandler],
  ['./handlers/math.js', mathHandler],
  ['./handlers/code-block.js', codeBlockHandler],
  ['./handlers/inline-code.js', inlineCodeHandler],
  ['./handlers/table.js', tableHandler],
]);

/**
 * Factory that produces a custom handler for the 'acadamarkTag' node type.
 * Returns a function suitable for passing to toHast's `handlers` option.
 *
 * @param {object} [opts] - interpreter options (e.g. { assetsDir })
 * @returns {(state: object, node: object) => object|null}
 */
export function createAcadamarkTagHandler(opts = {}) {
  return function acadamarkTagHandler(state, node) {
    // Pre-dispatch: internal nodes created by structural plugins (no vocab entry).
    const internalFn = INTERNAL_REGISTRY.get(node.tagname);
    if (internalFn) return internalFn(state, node);

    // resolveVocabKey translates parser-emitted sigil names ("$", "$$") to their
    // vocabulary keys ("inline-math", "display-math"). Named tags are unchanged.
    const vocab = vocabulary.get(resolveVocabKey(node.tagname));

    if (!vocab) {
      warnUnknownTag(node.tagname);
      return makeUnknownElement(state, node);
    }

    if (vocab.interpreter_strategy === 'handler') {
      const handlerFn = HANDLER_REGISTRY.get(vocab.handler_module);
      if (handlerFn) {
        try {
          return handlerFn(state, node, vocab, opts);
        } catch (err) {
          warnHandlerError(node.tagname, err);
          // Fall through to schema dispatch as best-effort recovery.
        }
      } else {
        warnUnknownTag(`handler for ${node.tagname} (module ${vocab.handler_module})`);
        // Fall through to schema dispatch.
      }
    }

    return schemaDispatch(state, node, vocab);
  };
}

/**
 * Default acadamarkTagHandler for consumers that don't need to pass options.
 * Equivalent to createAcadamarkTagHandler().
 */
export const acadamarkTagHandler = createAcadamarkTagHandler();

// ─── Schema dispatch ─────────────────────────────────────────────────────────

function schemaDispatch(state, node, vocab) {
  const tagName = vocab.html_output?.element ?? node.tagname;
  const properties = buildProperties(node, vocab);
  const children = convertContent(state, node, vocab);

  return {
    type: 'element',
    tagName,
    properties,
    children,
  };
}

// ─── Content conversion ───────────────────────────────────────────────────────

/**
 * Convert node.content to hast child nodes.
 *
 * For prose elements (em, strong, code, p, aside, section-title, etc.),
 * unwrap a single-paragraph wrapper produced by remark when the pipe text
 * was re-parsed. Multi-paragraph content is kept as-is.
 */
function convertContent(state, node, vocab) {
  // Opaque-content nodes (e.g. <library>, <csv>) have string content that is
  // handled by a dedicated plugin, not by the hast converter. Return empty.
  if (node.isOpaqueContent) return [];

  const content = node.content ?? [];
  // Guard: content must be an array. String content means the node was not
  // re-parsed by remarkRecursiveContent (e.g. raw DSL content). Treat as empty.
  if (!Array.isArray(content)) return [];

  // Prose-bearing tags get the single-paragraph unwrap (per spec); other
  // tags pass content through as-is.
  const nodes =
    vocab?.content?.type === 'prose'
      ? unwrapSingleParagraph(content)
      : content;

  return nodes.flatMap(child => {
    const h = state.one(child, node);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
}

// ─── Attribute mapping ────────────────────────────────────────────────────────
// The shared `buildProperties` helper lives in `lib/build-properties.js` and
// is imported above; both the schema dispatcher here and the figure handler
// call it. See that file for the deferred-lift-to-acadamark-core note.

// ─── Unknown-tag fallback ─────────────────────────────────────────────────────

function makeUnknownElement(state, node) {
  let children;
  if (typeof node.content === 'string') {
    // Opaque content — wrap as a text node. Empty string → no children.
    children = node.content.length > 0 ? [{ type: 'text', value: node.content }] : [];
  } else {
    children = (node.content ?? []).flatMap(child => {
      const h = state.one(child, node);
      if (h == null) return [];
      return Array.isArray(h) ? h : [h];
    });
  }
  return {
    type: 'element',
    tagName: 'span',
    properties: { 'data-acadamark-unknown': node.tagname },
    children,
  };
}
