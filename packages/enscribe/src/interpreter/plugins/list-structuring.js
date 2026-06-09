// List structuring plugin (#140 — open-marker model).
//
// Lowers the `<list>` authoring construct + its open item markers to a
// markdown-equivalent list node (`type: 'list'` with `listItem` children) — the
// SAME shape a bare `-` list produces — so it inherits the existing HTML render
// (`<ul>` / `<ol>` + `<li>`) and JATS mapping with no second emitter. `<list>` is
// the canonical element; `<ul>` / `<ol>` / `<li>` are render output, not authoring
// vocabulary.
//
// Open-marker / peer-close model (notes/specs/lists.md). Inside a `<list>` an item
// is introduced by a marker — `<li>` (named) or the `<->` / `<*>` sigils, built by
// from-markdown's buildItemMarkerNode as a `list-item` enscribeTag whose `content`
// is the marker's same-line text. The item's full content is that same-line text
// PLUS the flow that follows the marker: any further paragraphs and any nested
// `<list>`, up to the next marker or `</list>`. Items therefore close on the next
// peer marker, not on a closer — which is what lets an item hold several paragraphs
// and a nested list with no indentation rules. The `-` / `*` markdown idiom is also
// accepted (non-strict): remark parses it to a `list` node whose items splice in as
// peers.
//
// `<list>` args:
//   - `ordered` (positional) → ordered list (`<ol>`); default unordered (`<ul>`).
//   - `marker=` → CSS `list-style-type` (pass-through; a value outside the known
//     set is flagged and falls back to the browser default).
//   - `start=N` (ordered) → `<ol start>`;  `reversed` (positional, ordered) → `<ol reversed>`.
// Display args ride to hast via `node.data.hProperties` (the mdast-util-to-hast
// convention), so the default list render carries them with no custom handler.

import { isEnscribeTag } from '../../core/tag.js';

// Known CSS `list-style-type` keywords — the marker= pass-through allow-set. A
// value outside this set is flagged and falls back to the browser default rather
// than emitting an arbitrary style string.
const LIST_STYLE_TYPES = new Set([
  'none', 'disc', 'circle', 'square',
  'decimal', 'decimal-leading-zero',
  'lower-alpha', 'lower-latin', 'upper-alpha', 'upper-latin',
  'lower-roman', 'upper-roman', 'lower-greek',
]);

/**
 * Group a `<list>`'s (recursively-parsed) content array into mdast `listItem`s by
 * peer-close: a marker opens an item; following non-marker blocks (further
 * paragraphs, a nested `<list>`) extend it until the next marker.
 *
 * @param {Array} content
 * @param {import('vfile').VFile} [file]
 * @returns {Array} mdast listItem nodes, in document order
 */
function collectItems(content, file) {
  const items = [];
  let current = null; // the open item that following blocks attach to

  for (const child of content) {
    if (isEnscribeTag(child, 'list-item')) {
      // A marker opens a new item. Its same-line inline content becomes the first
      // paragraph; an empty marker opens an item that following blocks fill.
      const inline = Array.isArray(child.content) ? child.content : [];
      const itemChildren = inline.length
        ? [{ type: 'paragraph', children: inline }]
        : [];
      current = { type: 'listItem', spread: false, checked: null, children: itemChildren };
      if (child.position) current.position = child.position;
      items.push(current);
    } else if (isEnscribeTag(child, 'list')) {
      // A nested `<list>` belongs to the current item. It is still an enscribeTag
      // here (collectItems runs before the outer walk reaches it), so lower it now
      // and attach it to the item rather than leaving it for the outer walk.
      const lowered = lowerList(child, file);
      if (current) current.children.push(lowered);
      else items.push(...(lowered.children ?? [])); // orphan: surface its items
    } else if (child && child.type === 'list') {
      // `-` / `*` markdown idiom: splice the remark list's items in as peers.
      for (const li of child.children ?? []) {
        if (li && li.type === 'listItem') { items.push(li); current = li; }
      }
    } else if (child && current) {
      // Any other following block (a further paragraph, a thematic break, …)
      // extends the current item.
      current.children.push(child);
    }
    // A non-marker block before the first marker has no item to attach to; a
    // `<list>` whose content does not open with a marker is malformed, and such
    // stray leading content is left out rather than silently reshaped.
  }

  // An item holding more than one block renders loose (its paragraphs keep their
  // `<p>` wrappers). Mark each item; the list is loose iff any item is.
  for (const li of items) li.spread = (li.children?.length ?? 0) > 1;

  return items;
}

/**
 * Parse a `start=` kwarg to a positive integer, or null if absent / non-numeric.
 *
 * @param {string|undefined} v
 * @returns {number|null}
 */
function parseStart(v) {
  if (v == null) return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lower a `<list>` enscribeTag to a markdown `list` node.
 *
 * @param {object} node - a `<list>` enscribeTag (long-form)
 * @param {import('vfile').VFile} [file]
 * @returns {object} mdast list node
 */
function lowerList(node, file) {
  const positional = node.positional ?? [];
  const kwargs = node.kwargs ?? {};
  const ordered = positional.includes('ordered');
  const content = Array.isArray(node.content) ? node.content : [];
  const children = collectItems(content, file);

  const listNode = {
    type: 'list',
    ordered,
    // CommonMark looseness: loose iff any item holds more than one block, so tight
    // and loose items never mix in one rendered list.
    spread: children.some((li) => li.spread),
    children,
  };

  // start applies only to ordered lists; default 1 (mdast-util-to-hast omits the
  // default `start` attribute, so an unmodified ordered list is byte-identical).
  listNode.start = ordered ? (parseStart(kwargs.start) ?? 1) : null;

  // Display args ride to hast via data.hProperties (mdast-util-to-hast convention).
  const hProperties = {};
  if (kwargs.marker != null) {
    const m = String(kwargs.marker);
    if (LIST_STYLE_TYPES.has(m)) {
      hProperties.style = `list-style-type: ${m}`;
    } else if (file && typeof file.message === 'function') {
      file.message(
        `<list>: unknown marker "${m}" — using the default list style`,
        node.position,
        'enscribe:list-marker',
      );
    }
  }
  if (ordered && positional.includes('reversed')) {
    hProperties.reversed = true;
  }
  if (Object.keys(hProperties).length) {
    listNode.data = { ...(listNode.data ?? {}), hProperties };
  }

  if (node.position) listNode.position = node.position;
  return listNode;
}

/**
 * Walk an array of sibling nodes, lowering every top-level `<list>` in place and
 * recursing into other nodes' `.content` (enscribeTag) / `.children` (mdast)
 * arrays. A lowered list is not recursed into — its items (and any nested lists,
 * lowered by collectItems) are already final.
 *
 * @param {Array} nodes
 * @param {import('vfile').VFile} [file]
 */
function walk(nodes, file) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n || typeof n !== 'object') continue;
    if (isEnscribeTag(n, 'list')) {
      nodes[i] = lowerList(n, file);
      continue;
    }
    if (Array.isArray(n.content)) walk(n.content, file);
    if (Array.isArray(n.children)) walk(n.children, file);
  }
}

/**
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeListStructuring() {
  return (tree, file) => {
    walk(tree.children ?? [], file);
  };
}
