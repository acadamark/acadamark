// Heading-level stamping (#397) — the structural half of the heading-semantics rule
// (notes/specs/render-quality.md RQ-DOC-M4; packages/ehtml/SPEC.md convention 10).
//
// A title element's outline level is a STRUCTURAL fact: one plus the number of outline
// containers (the section ladder + <book-part>, i.e. NAV_ITEM_TAGNAMES) enclosing it.
// <article-title> and <book-title> sit outside every outline container, so the same
// rule yields their anchor level 1 with no special case. Subtitles are deliberately
// NOT stamped — they render with their title's heading group and carry no level.
//
// This plugin stamps `computedHeadingLevel` on outline TITLE nodes at mdast time
// (the same derived-display pattern as numbering's `computedSectionNumber`); the
// render stage (interpret-plugin.js schemaDispatch) materializes the native heading
// wrap from the stamp. The `heading-tags` config gate (DEFAULT ON) is applied HERE,
// not at render: when the kwarg is off, nothing is stamped, so the rendered output
// is byte-identical to the pre-#397 bare-element form by construction.
//
// Runs after the structuring plugins (book/article structuring + section nesting),
// so nesting is physical; independent of numbering (levels stamp whether or not
// sections are numbered).

import { NAV_ITEM_TAGNAMES, SECTION_TITLE_MAP } from '../lib/section-kinds.js';
import { ENSCRIBE_CONFIG } from '../../core/file-data-keys.js';
import { readConfigBool } from '../lib/config-helpers.js';

// The outline containers that deepen the level, single-sourced from section-kinds.
const OUTLINE_CONTAINERS = new Set(NAV_ITEM_TAGNAMES);

// The outline TITLE set (RQ-DOC-M4): the anchors + the per-container titles.
// Derived from SECTION_TITLE_MAP so a section-ladder change cannot fork this set.
export const OUTLINE_TITLE_TAGNAMES = Object.freeze([
  'article-title',
  'book-title',
  'book-part-title',
  ...SECTION_TITLE_MAP.values(),
]);
const OUTLINE_TITLES = new Set(OUTLINE_TITLE_TAGNAMES);

function stamp(nodes, outlineDepth) {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const tag = node.tagname;
    if (tag && OUTLINE_TITLES.has(tag)) {
      node.computedHeadingLevel = 1 + outlineDepth;
    }
    const deeper = tag && OUTLINE_CONTAINERS.has(tag) ? outlineDepth + 1 : outlineDepth;
    stamp(node.content, deeper);
    stamp(node.children, deeper);
  }
}

/**
 * @returns {(tree: import('mdast').Root, file: import('vfile').VFile) => void}
 */
export function enscribeHeadingLevels() {
  return (tree, file) => {
    const config = file?.data?.[ENSCRIBE_CONFIG];
    if (!readConfigBool(config, 'heading-tags', true)) return; // host-level opt-out: no stamps, no wraps
    stamp(tree.children ?? [], 0);
  };
}
