// List structuring plugin (#137).
//
// Lowers the `<list>` authoring construct to a markdown-equivalent list node
// (`type: 'list'` with `listItem` children) — the SAME shape a bare `-` list
// produces — so it inherits the existing render (HTML `<ul>`/`<ol>` + `<li>`)
// and JATS mapping with no second emitter. `<list>` is the canonical element;
// `<ul>`/`<ol>`/`<li>` are render output, not authoring vocabulary.
//
// Item sources inside a `<list>` (after remarkRecursiveContent has parsed its
// content) are unified into peers:
//   - sigil markers `<- …>` / `<* …>`  → `list-item` enscribeTags (built by
//     from-markdown's buildItemMarkerNode); each becomes one `listItem`.
//   - the `-` / `*` markdown idiom      → remark `list` nodes; their `listItem`
//     children are spliced in as peers.
//
// `<list ordered>` (the `ordered` positional flag) lowers to an ordered list;
// `<list>` is unordered.
//
// Scope (this slice): single-paragraph items. Multi-paragraph / peer-close,
// the bare `<li>` marker, nesting, and the ordered numbering scheme + `start`
// are deferred — see notes/specs/lists.md §"Deferred".

import { isEnscribeTag } from '../../core/tag.js';

/**
 * Convert a `list-item` marker enscribeTag into a markdown `listItem`.
 *
 * The marker's content is inline mdast (remarkRecursiveContent unwrapped the
 * single paragraph to its inline children); wrap it back in a paragraph so the
 * item is a tight markdown list item (`listItem > paragraph > inline`), exactly
 * what `- text` produces.
 *
 * @param {object} marker - an `item-marker`-form enscribeTag (tagname list-item)
 * @returns {object} mdast listItem node
 */
function markerToListItem(marker) {
  const inline = Array.isArray(marker.content) ? marker.content : [];
  const paragraph = { type: 'paragraph', children: inline };
  const item = { type: 'listItem', spread: false, checked: null, children: [paragraph] };
  if (marker.position) item.position = marker.position;
  return item;
}

/**
 * Collect the list items from a `<list>`'s (recursively-parsed) content array,
 * unifying sigil markers and `-`/`*` idiom lists into one peer sequence.
 *
 * @param {Array} content
 * @returns {Array} mdast listItem nodes, in document order
 */
function collectItems(content) {
  const items = [];
  for (const child of content) {
    if (isEnscribeTag(child, 'list-item')) {
      items.push(markerToListItem(child));
    } else if (child && child.type === 'list') {
      // `-` / `*` idiom: splice the remark list's items in as peers.
      for (const li of child.children ?? []) {
        if (li && li.type === 'listItem') items.push(li);
      }
    }
    // Any other content (e.g. a stray paragraph) implies multi-paragraph items,
    // which this slice defers; such content is left out of the list rather than
    // silently reshaped. See §"Deferred".
  }
  return items;
}

/**
 * Lower a `<list>` enscribeTag to a markdown `list` node.
 *
 * @param {object} node - a `<list>` enscribeTag (long-form)
 * @returns {object} mdast list node
 */
function lowerList(node) {
  const ordered = (node.positional ?? []).includes('ordered');
  const content = Array.isArray(node.content) ? node.content : [];
  const listNode = {
    type: 'list',
    ordered,
    start: ordered ? 1 : null,
    spread: false,
    children: collectItems(content),
  };
  if (node.position) listNode.position = node.position;
  return listNode;
}

/**
 * Walk an array of sibling nodes, lowering every `<list>` in place and recursing
 * into other nodes' `.content` (enscribeTag) / `.children` (mdast) arrays. A
 * lowered list is not recursed into — its items are already final.
 *
 * @param {Array} nodes
 */
function walk(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n || typeof n !== 'object') continue;
    if (isEnscribeTag(n, 'list')) {
      nodes[i] = lowerList(n);
      continue;
    }
    if (Array.isArray(n.content)) walk(n.content);
    if (Array.isArray(n.children)) walk(n.children);
  }
}

/**
 * @returns {(tree: import('mdast').Root) => void}
 */
export function enscribeListStructuring() {
  return (tree) => {
    walk(tree.children ?? []);
  };
}
