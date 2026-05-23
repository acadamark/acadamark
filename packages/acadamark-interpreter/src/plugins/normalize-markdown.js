// Normalization pass — rewrites standard mdast nodes produced by delegated
// parsers (remark-math, etc.) into canonical acadamarkTag nodes, so that
// downstream structural and semantic plugins see one node type.
//
// Settled principle: "delegate the lexer, own the node identity."
// remark-math finds `$x$` and produces an `inlineMath` node; this pass
// converts it to the canonical `{ type: 'acadamarkTag', tagname: '$', ... }`
// node, indistinguishable from an authored `<$ x $>` shorthand node.
//
// Pipeline position: between remarkRecursiveContent (step 1) and
// acadamarkConfigDiscovery (step 2). By this point, both the outer
// remarkParse run and the inner remarkParse run (inside remarkRecursiveContent)
// have completed, so all delegated-parser nodes are present in the tree.
//
// Mapping table structure:
//   Each entry: { predicate(node) => boolean, normalize(node) => acadamarkTag }
//   Adding a construct means adding an entry. The predicate selects nodes by
//   node.type; normalize returns the canonical replacement.
//
//   Constructs with depth-conditional logic (headings) or option-selected
//   paths (GFM tables via Option A serializer) fit as entries with more
//   complex predicate/normalize bodies — no structural change to the pass.
//
// This slice implements math only. GFM table normalization is deferred to
// a later slice after the Option A/B/C design decision. Heading/emphasis/
// link/list normalization are also deferred.

import { getContentHandler } from '../../../remark-acadamark/src/dsl-registry.js';
import { walkNormalize } from '../lib/walk-normalize.js';

// Confirm contentHandler values at module load. These are authoritative in
// dsl-registry.js; if they change, this assertion catches the drift.
const _mathHandler = getContentHandler('$');
const _mathDisplayHandler = getContentHandler('$$');
if (_mathHandler !== 'math') {
  throw new Error(
    `normalize-markdown: expected getContentHandler('$') === 'math', got '${_mathHandler}'`,
  );
}
if (_mathDisplayHandler !== 'math-display') {
  throw new Error(
    `normalize-markdown: expected getContentHandler('$$') === 'math-display', got '${_mathDisplayHandler}'`,
  );
}

// ─── Per-construct mapping ────────────────────────────────────────────────────
//
// Each entry is { predicate, normalize }.
// predicate(node) — true if this entry handles the node.
// normalize(node) — returns the canonical acadamarkTag replacement.
//
// Future entries for headings will use `depth`-conditional logic inside
// normalize(). Future GFM table entry will use the Option A pipe-table
// serializer inside normalize(). Neither requires structural change here.

const NORMALIZATIONS = [
  // ── remark-math: inline math ─────────────────────────────────────────────
  // remark-math produces: { type: 'inlineMath', value: '<LaTeX string>' }
  // Canonical target:     acadamarkTag with tagname '$'
  {
    predicate: (node) => node.type === 'inlineMath',
    normalize: (node) => ({
      type: 'acadamarkTag',
      form: 'short',
      tagname: '$',
      positional: [],
      booleans: {},
      kwargs: {},
      id: null,
      classes: [],
      atRefs: [],
      content: node.value,
      isOpaqueContent: true,
      selfClosing: false,
      contentHandler: _mathHandler,
    }),
  },

  // ── remark-math: display math ────────────────────────────────────────────
  // remark-math produces: { type: 'math', meta: null|string, value: '<LaTeX string>' }
  // Canonical target:     acadamarkTag with tagname '$$'
  // Note: math.meta (present when remark-math sees ```math fenced blocks with
  // info strings) has no canonical analog and is discarded — correct.
  {
    predicate: (node) => node.type === 'math',
    normalize: (node) => ({
      type: 'acadamarkTag',
      form: 'short',
      tagname: '$$',
      positional: [],
      booleans: {},
      kwargs: {},
      id: null,
      classes: [],
      atRefs: [],
      content: node.value,
      isOpaqueContent: true,
      selfClosing: false,
      contentHandler: _mathDisplayHandler,
    }),
  },
];

// Combined predicate: true if any entry handles this node.
function isNormalizable(node) {
  return NORMALIZATIONS.some((entry) => entry.predicate(node));
}

// Dispatch to the matching entry's normalize function.
function normalizeNode(node) {
  const entry = NORMALIZATIONS.find((e) => e.predicate(node));
  return entry.normalize(node);
}

/**
 * Unified mdast-transform plugin.
 *
 * Rewrites delegated-parser nodes to canonical acadamarkTag nodes.
 * No options for this slice.
 *
 * @returns {(tree: object) => void}
 */
export function acadamarkNormalizeMarkdown() {
  return function normalizeMarkdown(tree) {
    walkNormalize(tree.children ?? [], isNormalizable, normalizeNode);
  };
}
