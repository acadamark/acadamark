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

import { loadVocabulary } from './schema/load-vocabulary.js';
import { warnUnknownTag, warnHandlerError } from './lib/errors.js';
import { figureHandler } from './handlers/figure.js';

// Load vocabulary once at module import time. The Map is shared across all
// pipeline invocations in the same process; that's safe because loadVocabulary
// is idempotent and the vocabulary is read-only at runtime.
const vocabulary = loadVocabulary();

// Maps handler_module values (as declared in vocabulary entries) to the
// actual handler functions. Slice 1 has only one handler-strategy element.
const HANDLER_REGISTRY = new Map([
  ['./handlers/figure.js', figureHandler],
]);

/**
 * Custom handler registered with toHast for the 'acadamarkTag' node type.
 *
 * @param {object} state - mdast-util-to-hast state object
 * @param {object} node  - the acadamarkTag mdast node
 * @returns {object|null} hast element
 */
export function acadamarkTagHandler(state, node) {
  const vocab = vocabulary.get(node.tagname);

  if (!vocab) {
    warnUnknownTag(node.tagname);
    return makeUnknownElement(state, node);
  }

  if (vocab.interpreter_strategy === 'handler') {
    const handlerFn = HANDLER_REGISTRY.get(vocab.handler_module);
    if (handlerFn) {
      try {
        return handlerFn(state, node, vocab);
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
}

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
  const content = node.content ?? [];
  let nodes;

  if (
    vocab?.content?.type === 'prose' &&
    content.length === 1 &&
    content[0]?.type === 'paragraph'
  ) {
    // Unwrap: use the paragraph's children directly.
    nodes = content[0].children ?? [];
  } else {
    nodes = content;
  }

  return nodes.flatMap(child => {
    const h = state.one(child, node);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
}

// ─── Attribute mapping ────────────────────────────────────────────────────────

/**
 * Build an HTML properties object from the node's id, classes, and kwargs,
 * using the vocabulary's acadamark_attributes mappings.
 */
function buildProperties(node, vocab) {
  const props = {};

  if (node.id) props.id = node.id;
  if (node.classes?.length) props.className = node.classes;

  const kwargDefs = vocab.acadamark_attributes?.kwargs ?? {};
  for (const [key, value] of Object.entries(node.kwargs ?? {})) {
    const def = kwargDefs[key];
    if (def?.maps_to && def.handled_by !== 'handler') {
      props[def.maps_to] = value;
    }
  }

  return props;
}

// ─── Unknown-tag fallback ─────────────────────────────────────────────────────

function makeUnknownElement(state, node) {
  const children = (node.content ?? []).flatMap(child => {
    const h = state.one(child, node);
    if (h == null) return [];
    return Array.isArray(h) ? h : [h];
  });
  return {
    type: 'element',
    tagName: 'span',
    properties: { 'data-acadamark-unknown': node.tagname },
    children,
  };
}
