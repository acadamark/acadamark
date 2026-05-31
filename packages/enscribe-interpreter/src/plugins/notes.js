// Notes plugin — register note nodes for deferred placement.
//
// Runs after enscribeSectionNesting. By this point the tree has the structure:
//   root → article → [article-front, article-body, article-back]
// and all note content has been recursively parsed into mdast arrays by
// remarkRecursiveContent.
//
// === Placement modes ===
//   'end'  (default) — collect in <note-list class="endnotes"> in article-back
//   'foot'           — collect in a per-top-level-section
//                      <note-list class="footnotes"> at the end of each
//                      containing section. Foot-notes outside any top-level
//                      section fall through to article-back (mixed with
//                      end / side notes there). Implemented by Phase 2
//                      slice (formerly PG-1, 2026-05-27); see
//                      note-placement.js for the per-section collection.
//   'side'           — collect in <note-list class="notes"> in article-back,
//                      with <li class="sidenote-fallback">. The marker stays
//                      inline. Theme JS/CSS can extract and reposition these.
//                      DEPRECATED: inline <span class="sidenote"> rendering
//                      removed. Future themes provide margin positioning.
//
// All placements produce an inline marker and a collected list item. No
// placement produces inline side-content (`__note-side` is removed).
//
// This plugin (enscribeNotes) is register-only:
//   - Uses discover() to walk the tree and register each <note> via registry.assign()
//   - Stores { node, entry } in file.data.enscribeNotesPending
//   - <note> nodes stay in the tree at their authored positions through
//     ref-resolution and cite-resolution
//
// enscribeNotePlacement (in note-placement.js) is the placement step:
//   - Runs after cite-resolution
//   - Walks the tree and splices __note-marker nodes in place of <note> nodes
//   - Builds the __note-list-item nodes from the live (now-resolved) note content
//   - Injects the __note-list into article-back
//
// enscribeNotePlacement must be called after registry.numberRegistry() has run.

import { ensureRegistry } from 'enscribe-core/registry';
import { discover } from 'enscribe-core/walkers/discover';
import { ENSCRIBE_NOTES_PENDING } from 'enscribe-core/file-data-keys';

/**
 * Read the placement kwarg from a note node.
 * Checks both 'placement' (current) and 'position' (legacy alias).
 *
 * Exported so enscribeNotePlacement (note-placement.js) can use it too.
 *
 * @param {object} node - enscribeTag with tagname 'note'
 * @returns {'end'|'foot'|'side'}
 */
export function notePlacement(node) {
  const p = node.kwargs?.placement ?? node.kwargs?.position ?? 'end';
  if (p === 'side' || p === 'foot') return p;
  return 'end';
}

/**
 * Unified plugin. Register note nodes via a discover() walk and store
 * { node, entry } pairs for enscribeNotePlacement. <note> nodes stay in the
 * tree at their authored positions through ref- and cite-resolution.
 *
 * Does NOT splice markers, assign display numbers, or inject the note-list.
 * Those happen in enscribeNotePlacement (note-placement.js) after
 * registry.numberRegistry() and ref/cite resolution have run.
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeNotes() {
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
      file.data[ENSCRIBE_NOTES_PENDING] = pending;
    }
  };
}
