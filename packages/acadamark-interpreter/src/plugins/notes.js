// Notes plugin — register note nodes for deferred placement.
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
// This plugin (acadamarkNotes) is register-only:
//   - Uses discover() to walk the tree and register each <note> via registry.assign()
//   - Stores { node, entry } in file.data.acadamarkNotesPending
//   - <note> nodes stay in the tree at their authored positions through
//     ref-resolution and cite-resolution
//
// acadamarkNotePlacement (in note-placement.js) is the placement step:
//   - Runs after cite-resolution
//   - Walks the tree and splices __note-marker nodes in place of <note> nodes
//   - Builds the __note-list-item nodes from the live (now-resolved) note content
//   - Injects the __note-list into article-back
//
// acadamarkNotePlacement must be called after registry.numberRegistry() has run.

import { ensureRegistry } from 'acadamark-core/registry';
import { discover } from 'acadamark-core/walkers/discover';
import { ACADAMARK_NOTES_PENDING } from 'acadamark-core/file-data-keys';

/**
 * Read the placement kwarg from a note node.
 * Checks both 'placement' (current) and 'position' (legacy alias).
 *
 * Exported so acadamarkNotePlacement (note-placement.js) can use it too.
 *
 * @param {object} node - acadamarkTag with tagname 'note'
 * @returns {'end'|'foot'|'side'}
 */
export function notePlacement(node) {
  const p = node.kwargs?.placement ?? node.kwargs?.position ?? 'end';
  if (p === 'side' || p === 'foot') return p;
  return 'end';
}

/**
 * Unified plugin. Register note nodes via a discover() walk and store
 * { node, entry } pairs for acadamarkNotePlacement. <note> nodes stay in the
 * tree at their authored positions through ref- and cite-resolution.
 *
 * Does NOT splice markers, assign display numbers, or inject the note-list.
 * Those happen in acadamarkNotePlacement (note-placement.js) after
 * registry.numberRegistry() and ref/cite resolution have run.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkNotes() {
  return (tree, file) => {
    const registry = ensureRegistry(file);
    const pending = []; // { node, entry } — node stays in tree

    discover(tree, new Map([
      ['note', (node) => {
        const placement = notePlacement(node);
        const entry = registry.assign('note', node.id || null, { numbered: true, data: { placement } });
        pending.push({ node, entry });
      }],
    ]));

    if (file?.data) {
      file.data[ACADAMARK_NOTES_PENDING] = pending;
    }
  };
}
