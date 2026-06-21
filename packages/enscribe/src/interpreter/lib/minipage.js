// Minipage sealed sub-interpret helpers (#115).
//
// The deferred phase (an inline pass in index.js, between apply-numbers and
// ref-resolution) runs each minipage's held body through its OWN pipeline run
// with its OWN VFile — hence its own registry, the seal — and stamps the
// resolved Layer 1 mdast onto `node.minipageResolved` for the handler to splice.
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

/**
 * Scope-qualify the DOM ids emitted INSIDE a minipage's rendered body (#267).
 *
 * Prefix every id DEFINED in the box with the box's unique `slug`, and rewrite every
 * in-box reference to one of those ids — an `href="#id"`, the note marker's
 * `data-note-id`, etc. — to match, so the marker↔list and any in-box `<ref>` still
 * resolve. A reference whose target is NOT defined in the box (an OUTBOUND `<ref>` to a
 * document label, which the one-way seal resolves through to the parent) is left
 * untouched — its `#target` is not in the box's local-id set.
 *
 * Covers ids on hast ELEMENTS and ids baked into `type:'raw'` nodes — the `<table>`/`<csv>`
 * raw-HTML escape hatch emits `id="…"` inside a literal string, which an element-only walk
 * would miss. `<svg>` subtrees are skipped whole: their internal ids are referenced by
 * `url(#id)` in attributes/styles this does not track, and SVG-internal collisions are out
 * of scope here (a known boundary; see notes/specs/minipage.md).
 *
 * Mutates `bodyHast` in place.
 *
 * @param {Array} bodyHast - the minipage body's hast nodes
 * @param {string} slug    - the box's document-unique scope slug (minipageScopeSlug)
 */
export function qualifyMinipageIds(bodyHast, slug) {
  const ID_ATTR = /\bid="([^"]+)"/g;
  const visit = (n, fn) => {
    if (!n || typeof n !== 'object') return;
    fn(n);
    if (n.tagName === 'svg') return; // leave SVG internals (and their url(#…) refs) intact
    if (Array.isArray(n.children)) for (const c of n.children) visit(c, fn);
  };
  // Pass 1 — collect every id DEFINED in the box (element properties + raw-string `id="…"`).
  const localIds = new Set();
  for (const n of bodyHast) visit(n, (e) => {
    if (e.type === 'element' && e.properties?.id != null) localIds.add(String(e.properties.id));
    else if (e.type === 'raw' && typeof e.value === 'string') for (const m of e.value.matchAll(ID_ATTR)) localIds.add(m[1]);
  });
  if (localIds.size === 0) return;
  const q = (id) => `${slug}-${id}`;
  // Pass 2 — prefix each id and rewrite each in-box reference (href="#id", data-note-id, …).
  for (const n of bodyHast) visit(n, (e) => {
    if (e.type === 'element' && e.properties) {
      for (const [k, v] of Object.entries(e.properties)) {
        if (typeof v !== 'string') continue;
        // id definitions + id-valued references (data-note-id → properties.dataNoteId, …)
        if ((k === 'id' || k.endsWith('Id')) && localIds.has(v)) e.properties[k] = q(v);
        // fragment references (href="#id")
        else if (k === 'href' && v[0] === '#' && localIds.has(v.slice(1))) e.properties[k] = `#${q(v.slice(1))}`;
      }
    } else if (e.type === 'raw' && typeof e.value === 'string') {
      e.value = e.value
        .replace(/\bid="([^"]+)"/g, (m, id) => (localIds.has(id) ? `id="${q(id)}"` : m))
        .replace(/\bhref="#([^"]+)"/g, (m, id) => (localIds.has(id) ? `href="#${q(id)}"` : m));
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
