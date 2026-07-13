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
//   'margin'         — a margin note (#333). Numbered and collected like any
//                      note into <note-list class="notes"> in article-back, with
//                      <li class="sidenote-fallback"> as the below-breakpoint
//                      fallback; its content is ALSO projected into the margin
//                      column beside its marker (applySidenotes), per-note and
//                      independent of the document note-position default. `side`
//                      is a legacy alias for `margin` (a sidenote is a numbered
//                      margin note); the former <marginnote> element is now just
//                      <note position=margin>.
//
// All placements produce an inline marker and a collected list item. Numbering is
// independent of position: every note is numbered here regardless of placement.
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

import { ensureRegistry } from '../../core/registry.js';
import { discover } from '../../core/walkers/discover.js';
import { ENSCRIBE_NOTES_PENDING } from '../../core/file-data-keys.js';

/**
 * Read the placement kwarg from a note node.
 * Checks both 'placement' (current) and 'position' (legacy alias).
 *
 * Exported so enscribeNotePlacement (note-placement.js) can use it too.
 *
 * @param {object} node - enscribeTag with tagname 'note'
 * @returns {'end'|'foot'|'margin'}
 */
export function notePlacement(node) {
  const p = node.kwargs?.placement ?? node.kwargs?.position ?? 'end';
  // #333: one note type, three positions — foot, end, margin. `side` is a legacy
  // alias for `margin` (a sidenote is a numbered margin note).
  if (p === 'side' || p === 'margin') return 'margin';
  if (p === 'foot') return 'foot';
  return 'end';
}

// The accepted per-note placement VALUES (the validity set; `side` is the legacy alias
// for `margin` — notePlacement maps it). The diagnostic names only the canonical three.
const NOTE_PLACEMENTS = new Set(['end', 'foot', 'margin', 'side']);
const NOTE_PLACEMENT_WORDS = 'end, foot, margin';

/**
 * The raw per-note placement kwarg exactly as authored, or null if none was given.
 * `placement` (current) then `position` (legacy alias) — the same precedence notePlacement reads.
 * Returned unresolved so the caller can validate the VALUE before notePlacement coerces it.
 *
 * @param {object} node - enscribeTag with tagname 'note'
 * @returns {string|null}
 */
function rawNotePlacement(node) {
  return node.kwargs?.placement ?? node.kwargs?.position ?? null;
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
        // B1 (#401 residual): an explicitly-authored per-note placement VALUE that isn't
        // recognized (a typo like `<note position=margn>`) silently fell back to `end`. #401
        // validated the <config> KEY half (validateConfigValue) but not per-note VALUES. Mirror
        // doc-type.js's explicit-unknown diagnostic: name the kwarg, the value, and the accepted
        // set, then keep the warned `end` default (notePlacement coerces it). Absent placement →
        // silent `end`, no warning (the normal case), exactly as an absent `<meta type>` is silent.
        const raw = rawNotePlacement(node);
        if (raw != null && !NOTE_PLACEMENTS.has(raw)) {
          file?.message?.(
            `<note ${node.kwargs?.placement != null ? 'placement' : 'position'}="${raw}">: unknown note placement — ` +
              `expected one of: ${NOTE_PLACEMENT_WORDS}. Placing at end.`,
            node,
            'note:invalid-placement',
          );
        }
        const placement = notePlacement(node);
        const entry = registry.assign('note', node.id || null, { numbered: true, data: { placement }, position: node.position ?? null });
        pending.push({ node, entry });
      }],
    ]));

    if (file?.data) {
      file.data[ENSCRIBE_NOTES_PENDING] = pending;
    }
  };
}
