// Normalization pass — rewrites standard mdast nodes produced by delegated
// parsers (remark-math, remark-gfm) into canonical acadamarkTag nodes, so that
// downstream structural and semantic plugins see one node type.
//
// Settled principle: "delegate the lexer, own the node identity."
// remark-math finds `$x$` and produces an `inlineMath` node; this pass
// converts it to the canonical `{ type: 'acadamarkTag', tagname: '$', ... }`
// node, indistinguishable from an authored `<$ x $>` shorthand node.
// remark-gfm finds `| a | b |` pipe tables and produces a structured `table`
// node; this pass serializes it back to a GFM pipe-table string and wraps it
// in a canonical `{ type: 'acadamarkTag', tagname: 'table', ... }` node,
// indistinguishable from an authored `<table md | ...>` tag.
//
// Pipeline position: between remarkRecursiveContent (step 1) and
// acadamarkConfigDiscovery (step 2). By this point, both the outer
// remarkParse run and the inner remarkParse run (inside remarkRecursiveContent)
// have completed, so all delegated-parser nodes are present in the tree.
//
// Mapping table structure:
//   Each entry: { predicate(node) => boolean, normalize(node, file) => acadamarkTag }
//   Adding a construct means adding an entry. The predicate selects nodes by
//   node.type; normalize returns the canonical replacement. The `file` argument
//   is unified's VFile; it is passed by the plugin transformer (which receives
//   (tree, file) in the standard unified signature) via closure.
//
//   Constructs with depth-conditional logic (headings) or option-selected
//   paths fit as entries with more complex predicate/normalize bodies — no
//   structural change to the pass.

import { getContentHandler } from '../../../remark-acadamark/src/dsl-registry.js';
import { walkNormalize } from '../lib/walk-normalize.js';

// ─── Drift guards at module load ──────────────────────────────────────────────
// Confirm contentHandler values. These are authoritative in dsl-registry.js;
// if they change, these assertions catch the drift.
const _mathHandler = getContentHandler('$');
const _mathDisplayHandler = getContentHandler('$$');
const _tableHandler = getContentHandler('table');
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
if (_tableHandler !== 'table') {
  throw new Error(
    `normalize-markdown: expected getContentHandler('table') === 'table', got '${_tableHandler}'`,
  );
}

// ─── GFM table → pipe-table string serializer ────────────────────────────────
//
// Option A: serialize the structured remark-gfm `table` node into a GFM
// pipe-table string so the table handler's `parseMd` path can re-parse it.
//
// Loss contract: inline markup (emphasis, links, etc.) in cells is flattened
// to plain text. When this happens, a file.message() warning is emitted.
// Plain-text-only cells are lossless. `|` in cell text is escaped as `\|`
// (parseMd has been updated to handle this escape).
//
// GFM alignment → delimiter string:
//   null     → ---
//   'left'   → :--
//   'right'  → --:
//   'center' → :-:

function alignToDelim(align) {
  if (align === 'center') return ':-:';
  if (align === 'right') return '--:';
  if (align === 'left') return ':--';
  return '---';
}

/**
 * Extract plain text from inline mdast children of a tableCell.
 * Returns { text: string, hasMarkup: boolean }.
 *
 * Handled inline types:
 *   text, inlineCode, inlineMath → .value (plain text)
 *   emphasis, strong, delete, link → recurse into .children
 *   image → .alt
 *   acadamarkTag ($ / $$, normalized before table? No — the walk visits
 *     table first in DFS; cell children may still be inlineMath here) → .value
 *     treated as markup; warn and use .value if available.
 *   Anything else → mark as markup, skip.
 *
 * Note: the normalization walk (walkNormalize) visits nodes in pre-order DFS.
 * A bare `table` at the top level is found before any `inlineMath` nodes that
 * may exist inside it. The entire `table` subtree is replaced at once, so the
 * cell children are raw remark-gfm nodes (inlineMath, not yet acadamarkTag).
 */
function extractCellText(nodes, result) {
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        result.text += node.value ?? '';
        break;
      case 'inlineCode':
        result.text += node.value ?? '';
        result.hasMarkup = true;   // code markup lost (backticks dropped)
        break;
      case 'inlineMath':
        result.text += node.value ?? '';
        result.hasMarkup = true;   // LaTeX markup lost
        break;
      case 'emphasis':
      case 'strong':
      case 'delete':
        result.hasMarkup = true;
        if (node.children) extractCellText(node.children, result);
        break;
      case 'link':
        result.hasMarkup = true;
        if (node.children) extractCellText(node.children, result);
        break;
      case 'image':
        result.text += node.alt ?? '';
        result.hasMarkup = true;
        break;
      default:
        // Unknown inline type — skip content, mark as markup lost.
        result.hasMarkup = true;
        break;
    }
  }
}

/**
 * Serialize a remark-gfm `table` mdast node to a GFM pipe-table string.
 * `file` is the unified VFile; used for warning emission when markup is lost.
 *
 * @param {object} node - remark-gfm table node
 * @param {object} file - unified VFile (may be a plain object with .message)
 * @returns {string} - GFM pipe-table string suitable for parseMd()
 */
export function gfmTableToPipeString(node, file) {
  const rows = node.children ?? [];
  if (rows.length === 0) {
    return '';
  }

  const align = node.align ?? [];
  let anyMarkup = false;

  // Build text rows from all tableRow children.
  const textRows = rows.map(row => {
    const cells = row.children ?? [];
    return cells.map(cell => {
      const result = { text: '', hasMarkup: false };
      extractCellText(cell.children ?? [], result);
      if (result.hasMarkup) anyMarkup = true;
      // Escape literal `|` so parseMd's \| handling round-trips correctly.
      return result.text.replace(/\|/g, '\\|');
    });
  });

  if (anyMarkup && file && typeof file.message === 'function') {
    file.message(
      'GFM table cell contains inline markup (emphasis, links, math, etc.) — ' +
      'markup is lost when normalizing to <table md>. ' +
      'Use an authored <table md | ...> tag to preserve markup.',
      node,
      'acadamark:normalize-markdown:table-markup-loss',
    );
  }

  // Determine column count from the header row.
  const colCount = textRows[0]?.length ?? 0;
  if (colCount === 0) return '';

  // Emit header row.
  const headerRow = '| ' + textRows[0].join(' | ') + ' |';

  // Emit delimiter row.
  const delimCells = [];
  for (let c = 0; c < colCount; c++) {
    delimCells.push(alignToDelim(align[c] ?? null));
  }
  const delimRow = '| ' + delimCells.join(' | ') + ' |';

  // Emit body rows.
  const bodyLines = textRows.slice(1).map(row => '| ' + row.join(' | ') + ' |');

  return [headerRow, delimRow, ...bodyLines].join('\n');
}

// ─── Per-construct mapping ────────────────────────────────────────────────────
//
// Each entry is { predicate, normalize }.
// predicate(node) — true if this entry handles the node.
// normalize(node, file) — returns the canonical acadamarkTag replacement.
//   The `file` argument is optional; math normalizers ignore it.
//
// Future entries for headings will use `depth`-conditional logic inside
// normalize(). Neither requires structural change here.

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

  // ── remark-gfm: pipe table ───────────────────────────────────────────────
  // remark-gfm produces: { type: 'table', align: [...], children: [tableRow...] }
  // Canonical target: acadamarkTag with tagname 'table', format 'md',
  //   content = GFM pipe-table string re-parseable by parseMd().
  //
  // Option A (decided in AUD-20): serialize structured table node to pipe-table
  // string → opaque string content in the canonical node. Lossy for cells
  // containing inline markup (emphasis, links, inline math); lossless for
  // plain-text cells. Loss is visible via file.message() warning.
  //
  // The `normalize` function here takes (node, file) — `file` is the unified
  // VFile, passed from the plugin transformer below via the normalizeNode
  // dispatch. Math normalizers accept but ignore the `file` arg.
  {
    predicate: (node) => node.type === 'table',
    normalize: (node, file) => ({
      type: 'acadamarkTag',
      form: 'short',
      tagname: 'table',
      positional: ['md'],
      booleans: {},
      kwargs: {},
      id: null,
      classes: [],
      atRefs: [],
      content: gfmTableToPipeString(node, file),
      isOpaqueContent: true,
      selfClosing: false,
      contentHandler: _tableHandler,
    }),
  },
];

// Combined predicate: true if any entry handles this node.
function isNormalizable(node) {
  return NORMALIZATIONS.some((entry) => entry.predicate(node));
}

// Dispatch to the matching entry's normalize function.
// `file` is threaded through from the plugin transformer for warning emission.
function normalizeNode(node, file) {
  const entry = NORMALIZATIONS.find((e) => e.predicate(node));
  return entry.normalize(node, file);
}

/**
 * Unified mdast-transform plugin.
 *
 * Rewrites delegated-parser nodes to canonical acadamarkTag nodes.
 * No options for this slice.
 *
 * @returns {(tree: object, file: object) => void}
 */
export function acadamarkNormalizeMarkdown() {
  return function normalizeMarkdown(tree, file) {
    walkNormalize(tree.children ?? [], isNormalizable, (node) => normalizeNode(node, file));
  };
}
