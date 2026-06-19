// mdast-to-hast bridge: custom handler for enscribeTag nodes.
//
// When toHast() (from mdast-util-to-hast) encounters an enscribeTag node, it
// calls this handler. The handler dispatches based on the vocabulary entry's
// interpreter_strategy:
//
//   schema  → schemaDispatch: builds a hast element from html_output.element
//             and attribute mappings; children come from node.content.
//   handler → handlerDispatch: calls a dedicated handler module.
//
// Unknown tags (tagname not in the vocabulary) are not errors and are not
// passed through as HTML — they render as the literal text the author typed
// (angle brackets escaped), with a dev-time console warning. Author-written raw
// HTML is handled by htmlNodeHandler: vocabulary tags pass through, non-vocab
// tags are escaped literally, and HTML comments are stripped.
//
// PARAGRAPH UNWRAPPING
// After remarkRecursiveContent, an element's pipe text has been parsed through
// remark and often produces a single-paragraph wrapper around its actual inline
// content. For elements with content.type === 'prose', we unwrap that wrapper
// so <em | text> becomes <em>text</em>, not <em><p>text</p></em>.
// Multi-paragraph content (content.length > 1) is never unwrapped.

import { unwrapSingleParagraph } from '../core/paragraph-unwrap.js';
import { mapAttributes } from '../core/map-attributes.js';
import { VOCABULARY } from '@enscribejs/layer1-vocabulary';
import { htmlEmit, aggregateHtmlProps } from './lib/html-emit.js';
import { warnUnknownTag, warnHandlerError } from './lib/errors.js';
// Suppressed apparatus — derived from the apparatus set (the single source — F13).
import { SUPPRESSED_APPARATUS } from './lib/apparatus-allowlists.js';
import { figureHandler } from './handlers/figure.js';
import { mathHandler } from './handlers/math.js';
import { codeHandler } from './handlers/code.js';
import { codeBlockHandler } from './handlers/code-block.js';
import { inlineCodeHandler } from './handlers/inline-code.js';
import { tableHandler } from './handlers/table.js';
// `<csv>` / `<tsv>` retired to gate shorthands → `<table csv>` / `<table tsv>`
// (#22 slice 3); the table handler parses both via its format positional, so no
// standalone csv/tsv handler is dispatched.
// `<diagram>` host (#22 slice 3): the diagram handler delegates to the
// per-engine mermaid/abc render handlers by the format-word positional. The
// legacy <mermaid>/<abc> tags are now gate shorthands → <diagram mermaid|abc>,
// so no mermaid/abc tagname reaches this dispatcher — only `diagram`.
import { diagramHandler } from './handlers/diagram.js';
import { svgHandler } from './handlers/svg.js';
import { frameHandler } from './handlers/frame.js';
import { asideHandler } from './handlers/aside.js';
import { minipageHandler } from './handlers/minipage.js';
import { theoremFamilyHandler } from './handlers/theorem.js';
import {
  noteMarkerHandler,
  noteListHandler,
  noteListItemHandler,
} from './handlers/notes.js';
import { refMarkerHandler, refErrorHandler } from './handlers/ref.js';
import { citeMarkerHandler, citeErrorHandler, bibliographyHandler, libraryErrorHandler } from './handlers/cite.js';
import { assetErrorHandler } from './handlers/asset.js';
import { convertChildren } from './lib/ast-helpers.js';
// resolveVocabKey is no longer needed at runtime: the normalize-to-canonical
// gate (interpreter/plugins/normalize-to-canonical.js) rewrites
// every sigil tagname (sections AND math/code) to its canonical vocabulary
// name early in the pipeline. By the time a node reaches this handler, its
// tagname is already the canonical key — see DESIGN.md §"The single gate".

// Suppressed apparatus (#89): REAL vocabulary tags (`<data>`, `<library>` — see
// data.md / library.md) whose rendered body output is suppressed. Their content
// is consumed at build time (library-load.js parses them into the citation
// registry) and contributes nothing to the rendered body. Kept separate from
// INTERNAL_REGISTRY below — which is only for plugin-created nodes that have no
// vocabulary entry — so each registry's name matches its contract. Behaviour is
// unchanged: these tags still render to null; only the home is now correct.
// SUPPRESSED_APPARATUS is imported from lib/apparatus-allowlists.js, derived as the
// apparatus tags that don't render (F13) — so it can't drift from the apparatus set.

// Internal node types created by the structural plugins (notes / refs / cites) —
// they have NO vocabulary entry, so they are dispatched here before the
// vocabulary lookup.
const INTERNAL_REGISTRY = new Map([
  ['__note-marker',    noteMarkerHandler],
  ['__note-list',      noteListHandler],
  ['__note-list-item', noteListItemHandler],
  ['__ref-marker',     refMarkerHandler],
  ['__ref-error',      refErrorHandler],
  ['__cite-marker',    citeMarkerHandler],
  ['__cite-error',     citeErrorHandler],
  ['__bibliography',   bibliographyHandler],
  ['__library-error',  libraryErrorHandler],
  ['__asset-error',    assetErrorHandler],
]);

// Wrap the build-time-generated VOCABULARY object as a Map at module load,
// preserving the read-pattern (`vocabulary.get(key)`) the downstream
// dispatch sites use. The Map is shared across all pipeline invocations
// in the same process; safe because VOCABULARY is frozen and read-only.
const vocabulary = new Map(Object.entries(VOCABULARY));

// Maps handler_module values (as declared in vocabulary entries) to the
// actual handler functions. Each entry has a matching `handler_module`
// declaration in `layer1-vocabulary/elements/<tag>.md`.
const HANDLER_REGISTRY = new Map([
  ['./handlers/figure.js', figureHandler],
  ['./handlers/math.js', mathHandler],
  ['./handlers/code.js', codeHandler],
  ['./handlers/code-block.js', codeBlockHandler],
  ['./handlers/inline-code.js', inlineCodeHandler],
  ['./handlers/table.js', tableHandler],
  ['./handlers/diagram.js', diagramHandler],
  ['./handlers/svg.js', svgHandler],
  ['./handlers/frame.js', frameHandler],
  ['./handlers/aside.js', asideHandler],
  ['./handlers/minipage.js', minipageHandler],
  ['./handlers/theorem.js', theoremFamilyHandler],
]);

/**
 * Factory that produces a custom handler for the 'enscribeTag' node type.
 * Returns a function suitable for passing to toHast's `handlers` option.
 *
 * @param {object} [opts] - interpreter options (e.g. { assetsDir })
 * @returns {(state: object, node: object) => object|null}
 */
export function createEnscribeTagHandler(opts = {}) {
  return function enscribeTagHandler(state, node) {
    // Pre-dispatch: internal nodes created by structural plugins (no vocab entry).
    const internalFn = INTERNAL_REGISTRY.get(node.tagname);
    if (internalFn) return internalFn(state, node);

    // Direct vocabulary lookup: by this point in the pipeline, the
    // normalize-to-canonical gate has rewritten every sigil tagname to its
    // canonical vocabulary key, so node.tagname IS the lookup key.
    const vocab = vocabulary.get(node.tagname);

    if (!vocab) {
      warnUnknownTag(node.tagname);
      return makeUnknownElement(state, node);
    }

    // Suppressed apparatus (#89): a real vocabulary tag whose body renders to
    // nothing (<data> / <library>, consumed at build time). Confirmed a known
    // vocab tag above, so this is deliberate suppression, not an unknown-tag
    // fallthrough.
    if (SUPPRESSED_APPARATUS.has(node.tagname)) return null;

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
 * Default enscribeTagHandler for consumers that don't need to pass options.
 * Equivalent to createEnscribeTagHandler().
 */
export const enscribeTagHandler = createEnscribeTagHandler();

// ─── Schema dispatch ─────────────────────────────────────────────────────────

function schemaDispatch(state, node, vocab) {
  const tagName = vocab.html_output?.element ?? node.tagname;
  const properties = aggregateHtmlProps(mapAttributes(node, vocab, 'html', htmlEmit));
  // #33 part 2: apply the vocab entry's fixed default attributes. Only `class`
  // is used today (a <marginnote>'s `enscribe-marginnote` class), merged onto any
  // author-supplied classes. Every existing element declares
  // `default_attributes: {}`, so this is inert for them — output byte-identical.
  const defaultAttrs = vocab.html_output?.default_attributes;
  if (defaultAttrs && defaultAttrs.class) {
    const fixed = String(defaultAttrs.class).split(/\s+/).filter(Boolean);
    properties.className = [...(properties.className ?? []), ...fixed];
  }
  const children = convertContent(state, node, vocab);

  // #57: section numbering. When the section-numbering pass stamped a computed
  // number on this node (a section/sub-section/...-title, or a numbered
  // book-part-title for an appendix), prepend it as real DOM content — a
  // <span class="section-number"> — so the number is copy/paste-able, archival,
  // and visible with no JS; the theme styles the spacing/separator. Guarded by
  // the stamp, so titles in unnumbered documents are byte-identical.
  if (node.computedSectionNumber != null) {
    children.unshift({
      type: 'element',
      tagName: 'span',
      properties: { className: ['section-number'] },
      children: [{ type: 'text', value: String(node.computedSectionNumber) }],
    });
  }

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

  return convertChildren(state, node, nodes);
}

// ─── Attribute mapping ────────────────────────────────────────────────────────
// Phase 5 slice 5a (2026-05-29): the attribute mapping is now done via the
// `mapAttributes` lift in `@enscribejs/enscribe/core` (the deferred lift from `6ae6844`
// landed; JATS export is the second consumer the deferral waited for). The
// HTML side calls `mapAttributes(node, vocab, 'html', htmlEmit)` and
// aggregates emit's results via `aggregateHtmlProps`. The pre-lift
// `buildProperties` wrapper is gone; the five consumer sites (this dispatcher
// + the figure/svg/frame/theorem handlers) each do the
// `aggregateHtmlProps(mapAttributes(...))` pair directly.

// ─── Unknown-tag fallback: escape to literal text ─────────────────────────────
// A tag whose name is not in the vocabulary is not an error and is not passed
// through as HTML — it renders as the literal text the author typed, angle
// brackets and all (the HTML serializer escapes `<`/`>` to `&#x3C;`/bare). See
// notes/specs/interpreter.md §"Unknown tags and raw HTML". The literal is
// reconstructed in the SAME authoring form the author used (long / pipe /
// slash / bare) — see makeUnknownElement — so `<glurp>hi</glurp>` displays as
// `<glurp>hi</glurp>` and `<glurp | hi>` displays as `<glurp | hi>`, rather
// than both canonicalizing to one form.

/**
 * Reconstruct the opening-tag source of an enscribeTag node from its parsed
 * parts (everything up to but not including the closing `>`). The caller adds
 * the form-specific tail (`>`, ` />`, ` | content>`, or `>content</tag>`).
 * Attribute order and quoting are canonicalized — not byte-exact with the
 * original — but faithful enough that the reader sees the tag they wrote.
 */
function reconstructOpener(node) {
  let s = '<' + node.tagname;
  if (node.id) s += ' #' + node.id;
  for (const c of node.classes ?? []) s += ' .' + c;
  for (const [k, v] of Object.entries(node.kwargs ?? {})) s += ` ${k}="${v}"`;
  for (const [k, v] of Object.entries(node.booleans ?? {})) s += ' ' + (v === false ? '-' : '+') + k;
  for (const p of node.positional ?? []) s += ' ' + p;
  return s;
}

// A literal-source text node: escaped raw HTML / echoed unknown-tag syntax shown
// verbatim to the reader. `data.verbatim` (ignored by the HTML serializer → no
// output change) marks it exempt from the #54 smart-typography pass, so the
// displayed source keeps its straight quotes / dashes byte-identical.
const lit = (value) => ({ type: 'text', value, data: { verbatim: true } });

function makeUnknownElement(state, node) {
  const opener = reconstructOpener(node);

  // Slash / self-closing form: echo `<tag ... />`.
  if (node.selfClosing) {
    return lit(opener + ' />');
  }

  const content = node.content;

  // Render re-parsed array content (so a recognized tag nested inside an
  // unrecognized one keeps rendering — the spec's mixed-nesting edge case),
  // wrapped by literal open/close strings whose `<`/`>` the serializer escapes
  // to `&#x3C;`/bare. Used by both the long and pipe forms.
  const renderArrayBetween = (openStr, closeStr) => {
    const kids = convertChildren(state, node, content);
    return [lit(openStr), ...kids, lit(closeStr)];
  };

  // Reconstruct in the SAME form the author used, so the displayed literal
  // echoes the original syntax rather than canonicalizing to pipe form.
  if (node.form === 'long') {
    // Long form: `<tag ...>content</tag>`.
    const close = '</' + node.tagname + '>';
    if (content == null || content === '' || (Array.isArray(content) && content.length === 0)) {
      return lit(opener + '>' + close);
    }
    if (typeof content === 'string') {
      // Opaque / not-yet-reparsed long-form content: show it verbatim.
      return lit(opener + '>' + content + close);
    }
    return renderArrayBetween(opener + '>', close);
  }

  // Short form.
  if (content == null) {
    // Bare opener: the author wrote `<tag ...>` with no content and no slash.
    return lit(opener + '>');
  }
  if (typeof content === 'string') {
    // Pipe form, opaque / not-yet-reparsed content: `<tag ... | content>`.
    return lit(opener + ' |' + content + '>');
  }
  // Pipe form, re-parsed array content: `<tag ... | content>`.
  return renderArrayBetween(opener + ' | ', '>');
}

// ─── Author raw-HTML handler: escape non-vocab tags, strip comments ───────────
// Registered as the `html` handler in the toHast call (index.js). It only ever
// sees AUTHOR-written raw HTML (mdast `html` nodes from parsing the source) —
// interpreter-injected HTML (KaTeX, citations, assets) is added as hast `raw`
// nodes after toHast, so it never passes through here.
//
//   • HTML comment (`<!-- … -->`)      → stripped (no output)
//   • a tag IN the vocabulary          → raw passthrough (unchanged behavior)
//   • anything else (`<div>`, `</glurp>`) → escaped to literal text
const HTML_COMMENT = /^[ \t\r\n]*<!--[\s\S]*-->[ \t\r\n]*$/;
const LEADING_TAG = /^[ \t\r\n]*<\/?([a-zA-Z][a-zA-Z0-9-]*)/;

export function htmlNodeHandler(state, node) {
  const value = node.value ?? '';
  if (HTML_COMMENT.test(value)) return undefined; // Issue 3: strip comments
  const m = LEADING_TAG.exec(value);
  const tag = m ? m[1].toLowerCase() : null;
  if (tag && vocabulary.has(tag)) {
    // Vocabulary element authored as raw HTML — keep its current passthrough.
    return { type: 'raw', value };
  }
  // Non-vocabulary tag (or unparseable): no HTML passthrough — escape literally.
  return lit(value);
}
