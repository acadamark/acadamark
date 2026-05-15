// Notes plugin — Phase 3: number notes, replace inline <note> nodes with
// markers, collect content into <note-list> at the appropriate location.
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
 * Unified plugin. Walk the tree, number notes, replace inline note nodes
 * with markers, and collect note content into a <note-list> in article-back.
 *
 * @returns {(tree: import('mdast').Root) => void}
 */
export function acadamarkNotes() {
  return (tree, file) => {
    const registry = ensureRegistry(file);

    // Collected notes for back-matter injection.
    // All placement modes (end, foot, side) collect here.
    // Per-section foot collection is deferred; see notes/known-limitations.md.
    const collectedNotes = []; // { entry, refId, placement }

    function processNote(node) {
      const placement = notePlacement(node);
      const entry = registry.assign('note', node.id || null, { numbered: true, data: { placement } });
      const { id: noteId, number } = entry;
      const refId = `noteref-${number}`;

      // Marker replaces the note inline.
      const marker = {
        type: 'acadamarkTag',
        tagname: '__note-marker',
        id: null,
        classes: [],
        kwargs: { noteId, number, refId },
        content: [],
        contentHandler: 'default',
        isOpaqueContent: false,
        positional: [],
        booleans: {},
      };

      // All placements collect to back-matter.
      // sidenote flag distinguishes side from end/foot for CSS targeting.
      collectedNotes.push({
        entry,
        refId,
        placement,
        sidenote: placement === 'side',
        content: Array.isArray(node.content) ? [...node.content] : [],
      });
      return [marker];
    }

    // Walk the full tree replacing <note> nodes.
    walkAndReplace(tree.children, processNote);

    // Inject collected note-list into article-back.
    if (collectedNotes.length > 0) {
      const back = findOrCreateArticleBack(tree.children);
      if (back) {
        // Build list-item nodes, passing sidenote flag through kwargs.
        const listItems = collectedNotes.map(({ entry, refId, sidenote, content }) => {
          const { id: noteId, number } = entry;
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
        const placements = new Set(collectedNotes.map(n => n.placement));
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
    }
  };
}
