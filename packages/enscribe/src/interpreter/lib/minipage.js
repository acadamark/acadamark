// Minipage sealed sub-interpret helpers (#115).
//
// The deferred phase (an inline pass in index.js, between apply-numbers and
// ref-resolution) runs each minipage's held body through its OWN pipeline run
// with its OWN VFile — hence its own registry, the seal — and stamps the
// resolved eHTML mdast onto `node.minipageResolved` for the handler to splice.
// These are the pure helpers it uses; the sub-run itself lives in index.js
// because it needs that module's buildEnscribePipeline (passed in to avoid a
// circular import).

import { isEnscribeTag } from './ast-helpers.js';

// Nesting bound for a minipage-in-a-minipage chain. recursive-content's
// MAX_DEPTH does NOT bound this — each sealed sub-run starts a fresh parse with
// its own depth-0 counter — so the deferred phase carries its own depth on
// file.data and stops here. A real document never approaches this; it guards
// against pathologically deep authored nesting.
export const MAX_MINIPAGE_DEPTH = 10;

const ARTICLE_REGIONS = new Set(['article-front', 'article-body', 'article-back']);

/**
 * Project a sealed sub-run's resolved mdast down to the body content to splice
 * into the <figure> shell. The sub-run produces a full `<article>` (so
 * note-placement has an `<article-back>` boundary for LaTeX-local footnotes);
 * we flatten its region children in document order — `<article-body>` content
 * first, then `<article-back>` (the `__note-list`) — dropping the article /
 * region wrapper elements. The result reads as: body content, then the
 * box-bottom footnote list, exactly the LaTeX minipage layout.
 *
 * @param {import('mdast').Root} resolvedRoot - the sub-run's runSync output
 * @returns {Array} body-level mdast nodes
 */
export function projectMinipageBody(resolvedRoot) {
  const children = resolvedRoot?.children ?? [];
  const docRoot = children.find((c) => isEnscribeTag(c, 'article'));
  if (!docRoot) {
    // No article wrapper (an empty body, or a non-article-typed body — out of
    // scope). Splice the resolved top-level nodes as-is rather than dropping them.
    return children;
  }
  const regionKids = Array.isArray(docRoot.content) ? docRoot.content : (docRoot.children ?? []);
  const out = [];
  for (const child of regionKids) {
    if (isEnscribeTag(child) && ARTICLE_REGIONS.has(child.tagname)) {
      const inner = Array.isArray(child.content) ? child.content : (child.children ?? []);
      out.push(...inner);
    } else {
      // A non-region direct child of <article> (unusual) — keep it in place.
      out.push(child);
    }
  }
  return out;
}

/**
 * Visit every `<minipage>` node in a tree, in document order, WITHOUT descending
 * into a minipage's own body. A minipage body is opaque (raw source held on
 * node.content), so there is nothing to descend at the top level — and its
 * nested minipages are resolved by that minipage's OWN sealed sub-run, not by
 * this walk. The walk descends ordinary structural content (skipping any opaque
 * content) and mdast children.
 *
 * @param {object} node - a tree root or any node
 * @param {(minipage: object) => void} fn
 */
export function walkMinipageNodes(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (isEnscribeTag(node, 'minipage')) {
    fn(node);
    return; // do not descend the sealed body
  }
  if (isEnscribeTag(node) && Array.isArray(node.content) && !node.isOpaqueContent) {
    for (const c of node.content) walkMinipageNodes(c, fn);
  }
  if (Array.isArray(node.children)) {
    for (const c of node.children) walkMinipageNodes(c, fn);
  }
}

/**
 * The document-unique scope slug for a minipage box (#267). A minipage is a SEALED
 * sub-run with its own private registry, so its members' ids (auto note-N / noteref-N
 * and author colon-ids) restart per box and collide across boxes in the assembled
 * document. The box's own id is globally unique (an authored colon-id is a registry
 * label; the books' generated boxes carry `#mp:…`), so it is the natural qualifier.
 * A bare (id-less) box falls back to its source position — unique within a document.
 * Non-alphanumerics (the `:` of a `mp:…` id) fold to a hyphen so the slug is selector-safe.
 *
 * Known narrow boundary (see notes/specs/minipage.md): the fold is not injective, so two
 * boxes whose ids differ ONLY by colon-vs-hyphen at the same spot (`#mp:x` vs `#mp-x`) fold
 * to one slug and their members would collide. This is pathological — colon-form is the
 * steered convention — so it is documented rather than guarded. The `'mp'` last-resort
 * (both id AND position absent) is unreachable on a parsed document — the parser always
 * stamps a position — and only a hand-built positionless node would reach it.
 *
 * @param {object} node - the minipage mdast node
 * @returns {string} a slug safe to prefix onto child ids
 */
export function minipageScopeSlug(node) {
  const raw = node.id
    || (node.position?.start ? `mp-l${node.position.start.line}c${node.position.start.column}` : 'mp');
  return String(raw).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'mp';
}

// Internal-marker tagnames whose kwargs carry an id-valued REFERENCE to another in-box id.
//   __note-marker     kwargs.noteId  → the note list-item it links to (href + data-note-id)
//   __note-list-item  kwargs.refId   → the note marker it back-links to (href)
//   __ref-marker /    kwargs.targetId → the element a resolved <ref> points to (href)
//   __ref-error
// A reference is qualified only when its target is DEFINED in this box (the localIds gate),
// so an OUTBOUND ref to a document label is left bare — the one-way seal.
const REF_KWARG_BY_TAG = {
  '__note-marker': 'noteId',
  '__note-list-item': 'refId',
  '__ref-marker': 'targetId',
  '__ref-error': 'targetId',
};

/**
 * Scope-qualify the ids emitted INSIDE a minipage's RESOLVED BODY MDAST (#267), before it is
 * converted to hast. This is the single-pass replacement for the older post-hoc hast rewrite
 * (qualifyMinipageIds): a minipage is a SEALED sub-run with its own private registry, so its
 * members' ids (auto note-N / noteref-N, author colon-ids) restart per box and collide across
 * boxes in the assembled document. Acting on the structured mdast — not the serialized HTML —
 * means a `<table>`/`<csv>` colon-id is qualified on `node.id` (so the handler bakes the
 * qualified id straight into its raw-HTML output, with no regex over the literal string) and
 * the marker↔list↔ref links are rewritten by named field, not by attribute scraping.
 *
 * Prefix every id DEFINED in the box with the box's unique `slug` and rewrite every in-box
 * reference to one in lockstep:
 *   - DEFINITIONS: `node.id` (colon-id'd elements and the `__note-list-item`'s own id),
 *     and the `__note-marker`'s own id `kwargs.refId`.
 *   - REFERENCES: the id-valued kwarg named in REF_KWARG_BY_TAG, qualified only if its target
 *     is a box-local id (so outbound refs to document labels — the seal's read-through — stay bare).
 *
 * NESTING composes: the walk descends a nested minipage's `node.minipageResolved` (already
 * qualified with the INNER slug by that box's own sub-run), so the inner ids also pick up the
 * OUTER prefix — `outer-inner-fig:x` — keeping a repeated nested example unique. (The old hast
 * pass got this for free because the inner box's hast was spliced in before the outer rewrite.)
 *
 * String content (an `<svg>` body, opaque DSL) is NOT descended, so an SVG-internal id stays
 * intact (it is referenced by `url(#id)` this does not track — a documented boundary; see
 * notes/specs/minipage.md). Mutates the nodes in place.
 *
 * @param {Array} bodyMdast - the minipage's resolved body mdast nodes (node.minipageResolved)
 * @param {string} slug     - the box's document-unique scope slug (minipageScopeSlug)
 */
export function qualifyScopeIds(bodyMdast, slug) {
  const visit = (n, fn) => {
    if (!n || typeof n !== 'object') return;
    fn(n);
    // Descend ordinary children, array-form tag content, and a nested box's resolved body
    // (for the nesting compose). A string `content` (svg/opaque) is intentionally not entered.
    for (const arr of [n.children, Array.isArray(n.content) ? n.content : null, n.minipageResolved]) {
      if (Array.isArray(arr)) for (const c of arr) visit(c, fn);
    }
  };

  // Pass 1 — collect every id DEFINED in the box (and its nested boxes).
  const localIds = new Set();
  for (const n of bodyMdast) visit(n, (e) => {
    if (e.id != null) localIds.add(String(e.id));                                   // elements + __note-list-item
    if (e.tagname === '__note-marker' && e.kwargs?.refId != null) localIds.add(String(e.kwargs.refId)); // the <sup> id
  });
  if (localIds.size === 0) return;

  const q = (id) => `${slug}-${id}`;
  // Pass 2 — prefix each definition; rewrite each in-box reference in lockstep.
  for (const n of bodyMdast) visit(n, (e) => {
    // Definitions: node.id (always box-local), and the note marker's own refId.
    if (e.id != null && localIds.has(String(e.id))) e.id = q(e.id);
    if (e.tagname === '__note-marker' && e.kwargs?.refId != null) e.kwargs.refId = q(e.kwargs.refId);
    // References: the one id-valued kwarg for this marker kind, gated on box-locality (the seal).
    const refKw = REF_KWARG_BY_TAG[e.tagname];
    if (refKw && e.kwargs && e.kwargs[refKw] != null && localIds.has(String(e.kwargs[refKw]))) {
      e.kwargs[refKw] = q(e.kwargs[refKw]);
    }
  });
}

/**
 * A visible mdast error node stamped as a minipage body when the nesting bound
 * is exceeded (a backstop; see MAX_MINIPAGE_DEPTH).
 *
 * @returns {object} an mdast paragraph
 */
export function minipageDepthErrorNode() {
  return {
    type: 'paragraph',
    children: [{
      type: 'text',
      value: `⚠ minipage nesting exceeds the maximum depth (${MAX_MINIPAGE_DEPTH}); body not rendered`,
    }],
  };
}
