// Note placement plugin — splice __note-marker nodes, build __note-list(s).
//
// Runs after enscribeCiteResolution (step 10). At this point:
//   - <note> nodes are still in the tree at their authored positions
//   - Their content arrays contain resolved __ref-marker / __cite-marker nodes
//     (because ref- and cite-resolution ran while notes were in the tree)
//   - file.data.enscribeNotesPending holds { node, entry } pairs in document order
//   - entry.number is set (numberRegistry() ran at enscribeApplyNumbers, step 8)
//
// Steps:
//   1. Build a section-membership map BEFORE walkReplace mutates the tree.
//      For each top-level <section> (children of <article-body>), walk its
//      subtree to find which pending-note nodes live inside it. Notes outside
//      every top-level section (e.g. front-matter, between sections) are the
//      "residual" set that goes to <article-back>.
//   2. Build a lookup Map<noteNode, entry> from enscribeNotesPending.
//   3. Walk the tree with walkReplace; for each <note> node found in the map,
//      build a __note-marker (number now known) and splice it in place. After
//      this pass, the original <note> nodes are removed from the tree (but
//      pending still holds references to them; the section-membership map
//      built in step 1 stays valid).
//   4. Build the per-section foot-note collections (Phase 2 slice — per-
//      section footnote collection, formerly PG-1): for each top-level
//      section that contains foot-placed notes, build a __note-list
//      (class "footnotes") and inject it at the end of that section's
//      content. Section-collected foot-notes are removed from the residual
//      set so they don't also appear in <article-back>.
//   5. Build the residual __note-list (end + side + any foot-notes outside
//      top-level sections) and inject it into <article-back>, prepended
//      before any existing back-matter. If the residual set is empty, no
//      article-back list is emitted (don't emit empty lists).
//
// Numbering is global across the document — registry.numberRegistry()
// assigned numbers in document-order at step 8, before this plugin runs.
// Per-section grouping doesn't disturb the numbering; a section's list
// contains items numbered by their authored position in the document, which
// is the conventional behavior for sequential footnote numbering across
// sectioned documents.
//
// Outermost collection: notes inside a nested sub-section are collected
// into their outermost ancestor section's list (not into a nested
// sub-section list). The walk in step 1 captures every note descended from
// a top-level section, regardless of nesting depth.
//
// The internal nodes produced — __note-marker, __note-list-item, __note-list —
// are structurally identical to what fillNotes produced previously. The handlers
// in handlers/notes.js are unchanged.

import { makeTag, makeInternalMarker, isEnscribeTag } from 'enscribe-core/tag';
import { walkReplace } from 'enscribe-core/walkers/walk-replace';
import { ENSCRIBE_NOTES_PENDING, ENSCRIBE_CONFIG } from 'enscribe-core/file-data-keys';
import { findTag } from '../lib/ast-helpers.js';
import { notePlacement } from './notes.js';

// ─── Back-matter container helpers ────────────────────────────────────────────

/**
 * Find or create the document's back-matter container (article-back for
 * articles; book-back for books). Returns null if no document root exists.
 *
 * Phase 4 slice 4a (2026-05-29): generalized from article-only to handle
 * both article and book trees uniformly. The book branch is the new path;
 * the article branch preserves slice 7001aaa behavior.
 *
 * @param {Array} treeChildren — root.children
 * @returns {object|null} the back-matter container, or null
 */
function findOrCreateBackMatter(treeChildren) {
  const book = findTag(treeChildren, 'book');
  if (book) {
    let back = findTag(book.content ?? [], 'book-back');
    if (!back) {
      back = makeTag('book-back');
      book.content.push(back);
    }
    return back;
  }
  const article = findTag(treeChildren, 'article');
  if (!article) return null;
  let back = findTag(article.content ?? [], 'article-back');
  if (!back) {
    back = makeTag('article-back');
    article.content.push(back);
  }
  return back;
}

// ─── Top-level collection-unit helpers ────────────────────────────────────────

/**
 * Find the top-level structural collection units, in authored order. The unit
 * is what per-scope footnote collection groups by. Two scopes today:
 *
 *   'section' (article default; slice 7001aaa behavior):
 *      top-level units = sections (direct children of <article-body>).
 *      Books in this scope: top-level units = sections inside each book-part's
 *      content, flattened in document order.
 *
 *   'chapter' (book default; matches book.md's note-position: chapter-end):
 *      top-level units = book-parts (direct children of <book-body> plus
 *      those routed to book-front / book-back). Articles in this scope:
 *      effectively no top-level units (no book-parts exist) — falls through
 *      to the 'document' behavior.
 *
 *   'document':
 *      top-level units = [] (everything is residual).
 *
 * Phase 4 slice 4a (2026-05-29): generalized from the article-only
 * findTopLevelSections. The 'section' path preserves the slice-7001aaa
 * behavior for articles (zero-diff).
 *
 * @param {Array} treeChildren — root.children
 * @param {string} scope — 'document' | 'chapter' | 'section'
 * @returns {Array} top-level structural-unit nodes (enscribeTag objects)
 */
function findCollectionUnits(treeChildren, scope) {
  if (scope === 'document') return [];

  const book = findTag(treeChildren, 'book');
  if (book) {
    if (scope === 'chapter') {
      // Per-book-part collection. Gather book-parts from front/body/back
      // in document order. Nested book-parts (parts containing chapters)
      // are NOT individually collected — the outermost book-part absorbs
      // their notes (matches the "outermost-section" rule's parallel for
      // books).
      const units = [];
      for (const region of book.content ?? []) {
        if (!isEnscribeTag(region)) continue;
        if (region.tagname !== 'book-front' && region.tagname !== 'book-body' &&
            region.tagname !== 'book-back') continue;
        for (const child of region.content ?? []) {
          if (isEnscribeTag(child) && child.tagname === 'book-part') {
            units.push(child);
          }
        }
      }
      return units;
    }
    // scope === 'section': sections inside each book-part's content,
    // flattened. Recurse through nested book-parts.
    const units = [];
    function collectSectionsFromBookPart(bookPart) {
      for (const child of bookPart.content ?? []) {
        if (!isEnscribeTag(child)) continue;
        if (child.tagname === 'section') units.push(child);
        else if (child.tagname === 'book-part') collectSectionsFromBookPart(child);
      }
    }
    for (const region of book.content ?? []) {
      if (!isEnscribeTag(region)) continue;
      if (region.tagname !== 'book-front' && region.tagname !== 'book-body' &&
          region.tagname !== 'book-back') continue;
      for (const child of region.content ?? []) {
        if (isEnscribeTag(child) && child.tagname === 'book-part') {
          collectSectionsFromBookPart(child);
        }
      }
    }
    return units;
  }

  // Article tree. 'chapter' scope is meaningless for articles (no book-parts);
  // fall through to no-units (everything becomes residual → article-back).
  if (scope === 'chapter') return [];
  // scope === 'section' — original behavior.
  const article = findTag(treeChildren, 'article');
  if (!article) return [];
  const body = findTag(article.content ?? [], 'article-body');
  if (!body) return [];
  return (body.content ?? []).filter(c => isEnscribeTag(c, 'section'));
}

/**
 * Determine the effective note-scope for a document, per Phase 4 slice 4a
 * note-scope config knob.
 *
 * Defaults:
 *   - article documents: 'section' (preserves slice 7001aaa behavior)
 *   - book documents:    'chapter' (matches book.md's note-position: chapter-end)
 *
 * Overrides via <config note-scope="...">. Valid values:
 * 'document' | 'chapter' | 'section'.
 *
 * @param {Array} treeChildren — root.children
 * @param {Map|null} config
 * @returns {string} 'document' | 'chapter' | 'section'
 */
function resolveNoteScope(treeChildren, config) {
  const configValue = config?.get?.('note-scope');
  if (configValue === 'document' || configValue === 'chapter' || configValue === 'section') {
    return configValue;
  }
  const book = findTag(treeChildren, 'book');
  return book ? 'chapter' : 'section';
}

/**
 * Walk a subtree and return every descendant node in `targetNodes`. Uses
 * reference identity (Set lookup), not structural matching, so a note
 * node found in the tree maps to the same object pending holds.
 *
 * Recurses into both `.children` (mdast nodes) and `.content` arrays
 * (enscribeTag content). The walk does not stop at any boundary —
 * notes inside any depth of nesting under the given root are collected.
 *
 * @param {object} root — subtree root (any node with children/content)
 * @param {Set<object>} targetNodes — set of node references to collect
 * @returns {Array<object>} matched nodes in DFS pre-order
 */
function collectMatchingNodes(root, targetNodes) {
  const found = [];
  const visit = (node) => {
    if (node == null) return;
    if (targetNodes.has(node)) found.push(node);
    if (Array.isArray(node.children)) {
      for (const child of node.children) visit(child);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) visit(child);
    }
  };
  visit(root);
  return found;
}

// ─── List-item builder (shared by per-section + residual passes) ──────────────

/**
 * Build a __note-list-item internal marker from a pending entry.
 * Same shape as the pre-PG-1 implementation; factored out so the per-
 * section and residual passes share the construction.
 *
 * @param {{ node: object, entry: object }} pendingEntry
 * @returns {object} __note-list-item internal-marker tag
 */
function makeNoteListItem({ node: noteNode, entry }) {
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
}

/**
 * Compute the CSS class for a __note-list given the set of placements
 * its items carry.
 *
 *   'endnotes'  — only end notes
 *   'footnotes' — only foot notes
 *   'notes'     — mixed (includes side, or mix of end+foot)
 *
 * @param {Set<'end'|'foot'|'side'>} placements
 * @returns {string[]}
 */
function listClassFor(placements) {
  if (placements.size === 1 && placements.has('foot')) return ['footnotes'];
  if (placements.size === 1 && placements.has('end')) return ['endnotes'];
  return ['notes'];
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

/**
 * Unified plugin. Runs after cite-resolution. Splices __note-marker nodes
 * into the tree at authored positions; collects foot-placed notes into
 * per-top-level-section __note-lists at the end of each containing section;
 * collects residual notes (end + side + foot-notes outside any top-level
 * section) into a single article-back __note-list.
 *
 * Must be called after registry.numberRegistry() has assigned entry.number
 * (which happens in enscribeApplyNumbers, step 8).
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeNotePlacement() {
  return (tree, file) => {
    const pending = file?.data?.[ENSCRIBE_NOTES_PENDING];
    if (!pending || pending.length === 0) return;

    // ─── Step 1: collection-unit-membership map ────────────────────────
    //
    // BEFORE walkReplace mutates the tree. For each top-level collection
    // unit (sections for the 'section' scope; book-parts for the
    // 'chapter' scope; none for 'document' scope), walk its subtree to
    // find which pending-note nodes live inside it. After this step we
    // know, per note, which unit (if any) collects it.
    //
    // Phase 4 slice 4a (2026-05-29): generalized from article-only
    // top-level <section> to support book documents with a
    // <config note-scope> knob (defaulting to 'chapter' for books and
    // 'section' for articles).
    const config = file?.data?.[ENSCRIBE_CONFIG] ?? null;
    const scope = resolveNoteScope(tree.children, config);
    const pendingNoteSet = new Set(pending.map(p => p.node));
    const collectionUnits = findCollectionUnits(tree.children, scope);
    const noteToUnit = new Map(); // noteNode → top-level collection unit
    for (const unit of collectionUnits) {
      const containedNotes = collectMatchingNodes(unit, pendingNoteSet);
      for (const noteNode of containedNotes) {
        noteToUnit.set(noteNode, unit);
      }
    }

    // ─── Step 2: lookup map for the splice walk ────────────────────────
    //
    // pending.node references are the same objects as in the tree (no deep
    // copy was made during registration), so Map lookup by reference
    // equality works.
    const noteMap = new Map(pending.map(p => [p.node, p.entry]));

    // ─── Step 3: walkReplace splices __note-marker nodes in place ──────
    //
    // entry.number is now set; noteref-N IDs are computed here. The
    // defensive check (entry guard) handles the pathological case of an
    // unregistered note node (which should not occur after enscribeNotes
    // has run). After this pass, the original <note> nodes are removed
    // from the tree; the section-membership map from Step 1 stays valid
    // because it keys off note-node references.
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

    // ─── Step 4: per-unit collection by scope ──────────────────────────
    //
    // Split pending into per-unit buckets + residual. Which placements
    // collect per-unit depends on scope:
    //   - 'section' scope (article default): only placement=foot collects
    //     per-section; everything else (end / side / foot outside any
    //     section) goes to residual. Preserves slice 7001aaa behavior.
    //   - 'chapter' scope (book default): both placement=foot AND
    //     placement=end collect per-book-part (the chapter-end convention
    //     book.md L17-20 anticipated; per `note-position: chapter-end`).
    //     placement=side still stays inline (it's a margin note, not a
    //     list entry).
    //   - 'document' scope: no per-unit collection — all collect to
    //     back-matter as residual.
    const unitBuckets = new Map(); // unit → pending entries (in document order)
    const residual = [];
    for (const p of pending) {
      const placement = notePlacement(p.node);
      const containingUnit = noteToUnit.get(p.node) ?? null;
      const collectsPerUnit =
        containingUnit !== null && (
          (scope === 'section' && placement === 'foot') ||
          (scope === 'chapter' && (placement === 'foot' || placement === 'end'))
        );
      if (collectsPerUnit) {
        if (!unitBuckets.has(containingUnit)) unitBuckets.set(containingUnit, []);
        unitBuckets.get(containingUnit).push(p);
      } else {
        residual.push(p);
      }
    }

    // Inject per-unit lists. Iterate units in authored order
    // (unitBuckets preserves insertion order from the collectionUnits
    // loop above, which itself is in authored order). Each per-unit
    // list is class="footnotes" (only foot notes by construction).
    // Append to the end of the unit's content so the list sits below
    // the unit's body. Empty buckets — units with no foot-notes —
    // produce no list (we never insert into unitBuckets for them, so
    // this branch doesn't fire).
    for (const [unit, unitPending] of unitBuckets) {
      const items = unitPending.map(makeNoteListItem);
      // Class derived from the placements actually present in the
      // bucket: 'footnotes' for foot-only, 'endnotes' for end-only,
      // 'notes' for mixed. Phase 4 slice 4a (2026-05-29): chapter-scope
      // buckets can contain both foot AND end notes (per the chapter-
      // end convention book.md anticipates); listClassFor handles the
      // mix.
      const placements = new Set(unitPending.map(({ node }) => notePlacement(node)));
      const list = makeInternalMarker('__note-list', {
        classes: listClassFor(placements),
        content: items,
      });
      if (!Array.isArray(unit.content)) unit.content = [];
      unit.content.push(list);
    }

    // ─── Step 5: residual __note-list (article-back or book-back) ──────
    //
    // Build only if there are residual notes — don't emit an empty list.
    if (residual.length > 0) {
      const items = residual.map(makeNoteListItem);
      const placements = new Set(residual.map(({ node }) => notePlacement(node)));
      const noteList = makeInternalMarker('__note-list', {
        classes: listClassFor(placements),
        content: items,
      });

      const back = findOrCreateBackMatter(tree.children);
      if (!back) return;
      back.content.unshift(noteList);
    }
  };
}
