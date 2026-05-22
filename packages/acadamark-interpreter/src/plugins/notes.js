// Notes plugin — register note nodes, splice markers into the tree, defer fill.
//
// Runs after acadamarkSectionNesting. By this point the tree has the structure:
//   root → article → [article-front, article-body, article-back]
// and all note content has been recursively parsed into mdast arrays by
// remarkRecursiveContent.
//
// === Placement modes ===
//   'end'  (default) — collect in <note-list class="endnotes"> in article-back
//   'foot'           — collect in <note-list class="footnotes"> in article-back
//                      (simplified: per-section footnote collection is deferred)
//   'side'           — collect in <note-list class="notes"> in article-back,
//                      with <li class="sidenote-fallback">. The marker stays
//                      inline. Theme JS/CSS can extract and reposition these.
//                      DEPRECATED: inline <span class="sidenote"> rendering
//                      removed. Future themes provide margin positioning.
//
// All placements produce an inline marker and a collected list item. No
// placement produces inline side-content (`__note-side` is removed).
//
// This plugin (acadamarkNotes) is record-only:
//   - Registers each note via registry.assign()
//   - Splices a __note-marker (with number: undefined) into the tree
//   - Stores { markerNode, entry, placement, sidenote, content } in
//     file.data.acadamarkNotesPending for the fill step.
//
// fillNotes(tree, file) (exported) is the fill step:
//   - Reads file.data.acadamarkNotesPending
//   - Sets markerNode.kwargs.number and markerNode.kwargs.refId from entry.number
//   - Builds the __note-list-item nodes and injects the __note-list into article-back
//
// fillNotes() must be called after registry.numberRegistry() has run.

import { makeTag, isAcadamarkTag } from '../lib/ast-helpers.js';
import { ensureRegistry } from '../lib/registry.js';

/**
 * Read the placement kwarg from a note node.
 * Checks both 'placement' (current) and 'position' (legacy alias).
 *
 * @param {object} node - acadamarkTag with tagname 'note'
 * @returns {'end'|'foot'|'side'}
 */
function notePlacement(node) {
  const p = node.kwargs?.placement ?? node.kwargs?.position ?? 'end';
  if (p === 'side' || p === 'foot') return p;
  return 'end';
}

/**
 * Walk a node array in-place, replacing <note> acadamarkTag nodes with
 * marker (and optional side-content) nodes.
 *
 * Recurses into:
 *   - acadamarkTag .content arrays
 *   - mdast .children arrays (paragraphs, blockquotes, list items, etc.)
 *
 * Mutates `nodes` in place. Returns nothing.
 *
 * @param {Array} nodes - sibling array to walk
 * @param {Function} processNote - called for each note node, returns Array of replacement nodes
 */
function walkAndReplace(nodes, processNote) {
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (isAcadamarkTag(node, 'note')) {
      const replacements = processNote(node);
      nodes.splice(i, 1, ...replacements);
      i += replacements.length;
    } else {
      // Recurse into acadamarkTag content
      if (isAcadamarkTag(node) && Array.isArray(node.content)) {
        walkAndReplace(node.content, processNote);
      }
      // Recurse into mdast children (paragraphs, blockquotes, lists, etc.)
      if (node.children && Array.isArray(node.children)) {
        walkAndReplace(node.children, processNote);
      }
      i++;
    }
  }
}

/**
 * Deep-search for an acadamarkTag with the given tagname within a node array.
 * Searches .content (acadamarkTag) and .children (mdast) recursively.
 *
 * @param {Array} nodes
 * @param {string} tagname
 * @returns {object|null}
 */
function findDeep(nodes, tagname) {
  for (const node of nodes) {
    if (isAcadamarkTag(node, tagname)) return node;
    if (isAcadamarkTag(node) && Array.isArray(node.content)) {
      const found = findDeep(node.content, tagname);
      if (found) return found;
    }
    if (node.children && Array.isArray(node.children)) {
      const found = findDeep(node.children, tagname);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the article-back region inside the article node, creating it if absent.
 *
 * @param {Array} treeChildren - root.children (should contain the article)
 * @returns {object|null} the article-back acadamarkTag, or null if no article
 */
function findOrCreateArticleBack(treeChildren) {
  const article = findDeep(treeChildren, 'article');
  if (!article) return null;

  let back = findDeep(article.content ?? [], 'article-back');
  if (!back) {
    back = makeTag('article-back');
    article.content.push(back);
  }
  return back;
}

/**
 * Unified plugin. Walk the tree, register note nodes, replace inline note
 * nodes with markers (number:undefined), and store pending data for fillNotes.
 *
 * Does NOT assign display numbers or inject the note-list. Those happen in
 * fillNotes() after registry.numberRegistry() has run.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkNotes() {
  return (tree, file) => {
    const registry = ensureRegistry(file);

    // Pending notes for the fill step (fillNotes). Number and refId are
    // undefined until registry.numberRegistry() + fillNotes() run.
    const pendingNotes = []; // { markerNode, entry, placement, sidenote, content }

    function processNote(node) {
      const placement = notePlacement(node);
      const entry = registry.assign('note', node.id || null, { numbered: true, data: { placement } });
      const { id: noteId } = entry;

      // Marker replaces the note inline. number and refId are filled later.
      const markerNode = {
        type: 'acadamarkTag',
        tagname: '__note-marker',
        id: null,
        classes: [],
        kwargs: { noteId, number: undefined, refId: undefined },
        content: [],
        contentHandler: 'default',
        isOpaqueContent: false,
        positional: [],
        booleans: {},
      };

      // All placements collect to back-matter via fillNotes.
      // sidenote flag distinguishes side from end/foot for CSS targeting.
      pendingNotes.push({
        markerNode,
        entry,
        placement,
        sidenote: placement === 'side',
        content: Array.isArray(node.content) ? [...node.content] : [],
      });
      return [markerNode];
    }

    // Walk the full tree replacing <note> nodes.
    walkAndReplace(tree.children, processNote);

    // Store pending for fillNotes (called from acadamarkApplyNumbers stage).
    if (file?.data) {
      file.data.acadamarkNotesPending = pendingNotes;
    }
  };
}

/**
 * Fill step for notes. Sets number and refId on each pending marker node,
 * builds __note-list-item nodes, and injects the __note-list into article-back.
 *
 * Must be called after registry.numberRegistry() has assigned entry.number.
 *
 * @param {import('mdast').Root} tree
 * @param {import('vfile').VFile} file
 */
export function fillNotes(tree, file) {
  const pending = file?.data?.acadamarkNotesPending;
  if (!pending || pending.length === 0) return;

  // Set number and refId on each marker node (entry.number now populated).
  for (const { markerNode, entry } of pending) {
    const number = entry.number;
    const refId = `noteref-${number}`;
    markerNode.kwargs.number = number;
    markerNode.kwargs.refId = refId;
  }

  // Build and inject the note-list into article-back.
  const back = findOrCreateArticleBack(tree.children);
  if (!back) return;

  const listItems = pending.map(({ entry, markerNode, sidenote, content }) => {
    const { id: noteId } = entry;
    const { number, refId } = markerNode.kwargs;
    return {
      type: 'acadamarkTag',
      tagname: '__note-list-item',
      id: noteId,
      classes: [],
      kwargs: { number, refId, sidenote },
      content,
      contentHandler: 'default',
      isOpaqueContent: false,
      positional: [],
      booleans: {},
    };
  });

  // Class identifies the mix:
  //   'endnotes'  — only end notes
  //   'footnotes' — only foot notes
  //   'notes'     — mixed (includes side, or mix of end+foot)
  const placements = new Set(pending.map(n => n.placement));
  const listClass =
    placements.size === 1 && placements.has('foot')
      ? ['footnotes']
      : placements.size === 1 && placements.has('end')
        ? ['endnotes']
        : ['notes'];

  // Use __note-list (internal) so the handler can wrap items in <ol>.
  const noteList = {
    type: 'acadamarkTag',
    tagname: '__note-list',
    id: null,
    classes: listClass,
    kwargs: {},
    content: listItems,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };

  // Prepend before any existing back-matter content (bibliography, etc.)
  back.content.unshift(noteList);
}
