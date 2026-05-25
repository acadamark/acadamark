// Note placement plugin — splice __note-marker nodes, build __note-list.
//
// Runs after acadamarkCiteResolution (step 10). At this point:
//   - <note> nodes are still in the tree at their authored positions
//   - Their content arrays contain resolved __ref-marker / __cite-marker nodes
//     (because ref- and cite-resolution ran while notes were in the tree)
//   - file.data.acadamarkNotesPending holds { node, entry } pairs in document order
//   - entry.number is set (numberRegistry() ran at acadamarkApplyNumbers, step 8)
//
// Three steps:
//   1. Build a lookup Map<noteNode, entry> from acadamarkNotesPending.
//   2. Walk the tree with walkReplace; for each <note> node found in the map,
//      build a __note-marker (number now known) and splice it in place.
//   3. Build __note-list-item nodes from pending in order (document order),
//      using the live node.content (which contains resolved refs/cites). Build
//      a single __note-list and inject it into article-back prepended before
//      any existing back-matter (bibliography, etc.).
//
// The internal nodes produced — __note-marker, __note-list-item, __note-list —
// are structurally identical to what fillNotes produced previously. The handlers
// in handlers/notes.js are unchanged.

import { makeTag, makeInternalMarker } from 'acadamark-core/tag';
import { findTag } from '../lib/ast-helpers.js';
import { walkReplace } from '../lib/walk-replace.js';
import { notePlacement } from './notes.js';

// ─── Article-back helper ──────────────────────────────────────────────────────

/**
 * Find the article-back region inside the article node, creating it if absent.
 *
 * Both lookups use findTag (top-level search), which suffices because:
 *   - article is a direct child of root.children after acadamarkArticleStructuring
 *   - article-back is a direct child of article.content
 *
 * @param {Array} treeChildren — root.children (should contain the article)
 * @returns {object|null} the article-back acadamarkTag, or null if no article
 */
function findOrCreateArticleBack(treeChildren) {
  const article = findTag(treeChildren, 'article');
  if (!article) return null;

  let back = findTag(article.content ?? [], 'article-back');
  if (!back) {
    back = makeTag('article-back');
    article.content.push(back);
  }
  return back;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

/**
 * Unified plugin. Runs after cite-resolution. Splices __note-marker nodes into
 * the tree at authored positions, builds __note-list-item nodes from the
 * now-resolved live note content, and injects a single __note-list into
 * article-back (prepended before existing back-matter).
 *
 * Must be called after registry.numberRegistry() has assigned entry.number
 * (which happens in acadamarkApplyNumbers, step 8).
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkNotePlacement() {
  return (tree, file) => {
    const pending = file?.data?.acadamarkNotesPending;
    if (!pending || pending.length === 0) return;

    // Build a lookup map: note node object → registry entry.
    // pending.node references are the same objects as in the tree (no deep copy
    // was made during registration), so Map lookup by reference equality works.
    const noteMap = new Map(pending.map(p => [p.node, p.entry]));

    // Walk the tree, replacing each pending <note> node with its __note-marker.
    // entry.number is now set; noteref-N IDs are computed here.
    // noteMap captures the registered note→entry pairs; the defensive check
    // (entry guard) handles the pathological case of an unregistered note node
    // (which should not occur after acadamarkNotes has run).
    walkReplace(tree.children, 'note', (noteNode) => {
      const entry = noteMap.get(noteNode);
      if (!entry) return [noteNode]; // defensive: unregistered note stays in place
      const { id: noteId } = entry;
      const number = entry.number;
      const refId = `noteref-${number}`;
      return [makeInternalMarker('__note-marker', {
        kwargs: { noteId, number, refId },
        content: [],
      })];
    });

    // Build __note-list-item nodes from pending in document order.
    // Use the live node.content — at this point it contains resolved
    // __ref-marker / __cite-marker nodes (the point of running late).
    const listItems = pending.map(({ node: noteNode, entry }) => {
      const { id: noteId } = entry;
      const number = entry.number;
      const refId = `noteref-${number}`;
      const placement = notePlacement(noteNode);
      const sidenote = placement === 'side';
      return makeInternalMarker('__note-list-item', {
        id: noteId,
        kwargs: { number, refId, sidenote },
        content: Array.isArray(noteNode.content) ? noteNode.content : [],
      });
    });

    // Compute CSS class for the __note-list.
    //   'endnotes'  — only end notes
    //   'footnotes' — only foot notes
    //   'notes'     — mixed (includes side, or mix of end+foot)
    const placements = new Set(pending.map(({ node }) => notePlacement(node)));
    const listClass =
      placements.size === 1 && placements.has('foot')
        ? ['footnotes']
        : placements.size === 1 && placements.has('end')
          ? ['endnotes']
          : ['notes'];

    // Build the __note-list node.
    const noteList = makeInternalMarker('__note-list', {
      classes: listClass,
      content: listItems,
    });

    // Inject into article-back, prepending before existing content (bibliography, etc.).
    const back = findOrCreateArticleBack(tree.children);
    if (!back) return;
    back.content.unshift(noteList);
  };
}
