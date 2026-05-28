// Note placement plugin — splice __note-marker nodes, build __note-list(s).
//
// Runs after acadamarkCiteResolution (step 10). At this point:
//   - <note> nodes are still in the tree at their authored positions
//   - Their content arrays contain resolved __ref-marker / __cite-marker nodes
//     (because ref- and cite-resolution ran while notes were in the tree)
//   - file.data.acadamarkNotesPending holds { node, entry } pairs in document order
//   - entry.number is set (numberRegistry() ran at acadamarkApplyNumbers, step 8)
//
// Steps:
//   1. Build a section-membership map BEFORE walkReplace mutates the tree.
//      For each top-level <section> (children of <article-body>), walk its
//      subtree to find which pending-note nodes live inside it. Notes outside
//      every top-level section (e.g. front-matter, between sections) are the
//      "residual" set that goes to <article-back>.
//   2. Build a lookup Map<noteNode, entry> from acadamarkNotesPending.
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

import { makeTag, makeInternalMarker, isAcadamarkTag } from 'acadamark-core/tag';
import { walkReplace } from 'acadamark-core/walkers/walk-replace';
import { ACADAMARK_NOTES_PENDING } from 'acadamark-core/file-data-keys';
import { findTag } from '../lib/ast-helpers.js';
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

// ─── Section-membership helpers ───────────────────────────────────────────────

/**
 * Find the top-level sections in the article body, in authored order.
 *
 * Top-level = direct children of <article-body>. The structural pipeline
 * places sections there after acadamarkArticleStructuring runs (before
 * this plugin). A document without an <article-body> (e.g. one with no
 * sections) returns an empty array — all notes are residual in that case.
 *
 * @param {Array} treeChildren — root.children
 * @returns {Array} top-level <section> nodes (acadamarkTag objects)
 */
function findTopLevelSections(treeChildren) {
  const article = findTag(treeChildren, 'article');
  if (!article) return [];
  const body = findTag(article.content ?? [], 'article-body');
  if (!body) return [];
  return (body.content ?? []).filter(c => isAcadamarkTag(c, 'section'));
}

/**
 * Walk a subtree and return every descendant node in `targetNodes`. Uses
 * reference identity (Set lookup), not structural matching, so a note
 * node found in the tree maps to the same object pending holds.
 *
 * Recurses into both `.children` (mdast nodes) and `.content` arrays
 * (acadamarkTag content). The walk does not stop at any boundary —
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
 * (which happens in acadamarkApplyNumbers, step 8).
 *
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function acadamarkNotePlacement() {
  return (tree, file) => {
    const pending = file?.data?.[ACADAMARK_NOTES_PENDING];
    if (!pending || pending.length === 0) return;

    // ─── Step 1: section-membership map ────────────────────────────────
    //
    // BEFORE walkReplace mutates the tree. For each top-level section,
    // walk its subtree to find which pending-note nodes live inside it.
    // After this step we know, per note, which section (if any) collects
    // it.
    const pendingNoteSet = new Set(pending.map(p => p.node));
    const topLevelSections = findTopLevelSections(tree.children);
    const noteToSection = new Map(); // noteNode → top-level section
    for (const section of topLevelSections) {
      const containedNotes = collectMatchingNodes(section, pendingNoteSet);
      for (const noteNode of containedNotes) {
        noteToSection.set(noteNode, section);
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
    // unregistered note node (which should not occur after acadamarkNotes
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

    // ─── Step 4: per-section foot-note collection (PG-1) ───────────────
    //
    // Split pending into per-section foot buckets + residual. Only
    // placement=foot notes that live inside a top-level section go into
    // a per-section bucket; everything else (end, side, foot-notes
    // outside top-level sections) goes to residual.
    const sectionBuckets = new Map(); // section → pending entries (in document order)
    const residual = [];
    for (const p of pending) {
      const placement = notePlacement(p.node);
      const containingSection = noteToSection.get(p.node) ?? null;
      if (placement === 'foot' && containingSection !== null) {
        if (!sectionBuckets.has(containingSection)) sectionBuckets.set(containingSection, []);
        sectionBuckets.get(containingSection).push(p);
      } else {
        residual.push(p);
      }
    }

    // Inject per-section lists. Iterate sections in authored order
    // (sectionBuckets preserves insertion order; insertion happened in
    // the topLevelSections loop above which is itself in authored order).
    // Each per-section list is class="footnotes" (only foot notes by
    // construction). Append to the end of the section's content so the
    // list sits below the section's body. Empty buckets — sections with
    // no foot-notes — produce no list (we never insert into
    // sectionBuckets for them, so this branch doesn't fire).
    for (const [section, sectionPending] of sectionBuckets) {
      const items = sectionPending.map(makeNoteListItem);
      const list = makeInternalMarker('__note-list', {
        classes: ['footnotes'],
        content: items,
      });
      if (!Array.isArray(section.content)) section.content = [];
      section.content.push(list);
    }

    // ─── Step 5: residual __note-list (article-back) ───────────────────
    //
    // Build only if there are residual notes — don't emit an empty list.
    if (residual.length > 0) {
      const items = residual.map(makeNoteListItem);
      const placements = new Set(residual.map(({ node }) => notePlacement(node)));
      const noteList = makeInternalMarker('__note-list', {
        classes: listClassFor(placements),
        content: items,
      });

      const back = findOrCreateArticleBack(tree.children);
      if (!back) return;
      back.content.unshift(noteList);
    }
  };
}
