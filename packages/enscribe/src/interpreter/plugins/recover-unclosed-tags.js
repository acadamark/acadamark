// Always-render recovery for an unclosed long-form tag.
//
// THE BUG (always-render invariant violation): a long-form opener with no matching close —
// `<code-block>` with no `</code-block>`, or any `<tag>…` that never closes — makes the finder
// (parser/syntax.js `content`) consume everything after the opener to EOF as the tag's content, and
// from-markdown flags the whole span as one `enscribeTagError`. Its handler (handlers/parser-errors.js
// `tagErrorHandler`) renders only the inline `<tag-error>` marker and ignores `node.content`, so the
// swallowed rest of the document — the code, and EVERY block after the malformed opener — vanishes.
// The always-render invariant (notes/specs/principles.md) requires the opposite: malformed input flags
// inline AND the rest of the document still renders.
//
// THE RECOVERY: for each unclosed long-form error node, split it into
//     [ error-marker (the flagged opener) , ...reparse(swallowed content) ]
// The marker keeps the inline `<tag-error>` flag (unchanged rendering — the handler is a content-
// ignoring leaf). The trapped content is re-parsed as ordinary document flow and spliced in as
// SIBLINGS, so everything after the malformed opener renders. General to ALL long-form tags (the node
// carries `form: 'long'`); recurses so a second unclosed tag inside the recovered content is recovered
// too. Runs after strict-mode resolution and before recursive-content, so the recovered flow is
// processed for its own tag content by the rest of the pipeline exactly as top-level flow would be.

import { ENSCRIBE_STRICT_MODE } from '../../core/file-data-keys.js';

/**
 * @param {object} opts
 * @param {import('unified').Processor} opts.processor - the default (mode `off`) parse-only processor,
 *   matching the top-level document parse (remarkParse + remarkEnscribe + remarkMath + remarkGfm), used
 *   to re-parse the swallowed content back into document flow.
 * @param {import('unified').Processor} [opts.processorSigil] - the `sigil`-mode processor.
 * @param {import('unified').Processor} [opts.processorCanonical] - the `canonical`-mode processor.
 *   In a strict mode the recovered flow must parse with the SAME register(s) off as the top-level
 *   document (resolveStrictMode uses these), so the recovery mirrors recursive-content's selection.
 */
export default function remarkRecoverUnclosedTags({ processor, processorSigil, processorCanonical } = {}) {
  if (!processor) {
    throw new Error('remarkRecoverUnclosedTags: a `processor` is required to re-parse recovered content.');
  }
  return function transform(tree, file) {
    const mode = file?.data?.[ENSCRIBE_STRICT_MODE];
    const active =
      mode === 'canonical' && processorCanonical ? processorCanonical :
      mode === 'sigil' && processorSigil ? processorSigil :
      processor;
    recover(tree, active);
  };
}

/** An unclosed long-form tag: the error node that captured content it should not have. */
function isUnclosedLongForm(node) {
  return !!node
    && node.type === 'enscribeTagError'
    && node.form === 'long'
    && typeof node.content === 'string'
    && node.content.length > 0;
}

/** Walk `tree.children` in place, splitting each unclosed long-form error into marker + recovered flow. */
function recover(tree, processor) {
  if (!tree || !Array.isArray(tree.children)) return;
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];
    if (isUnclosedLongForm(child)) {
      // Re-parse the swallowed content as document flow, recovering any nested unclosed tag within it,
      // then splice: the flagged opener marker (content stripped — the handler ignores it, and it must
      // no longer look like it holds the rest of the document) followed by the recovered blocks.
      const reparsed = processor.parse(child.content);
      recover(reparsed, processor);
      const marker = { ...child, content: '' };
      const flow = Array.isArray(reparsed.children) ? reparsed.children : [];
      tree.children.splice(i, 1, marker, ...flow);
      i += flow.length; // skip the just-spliced (already-recovered) flow
    } else {
      recover(child, processor); // descend into normal containers
    }
  }
}
