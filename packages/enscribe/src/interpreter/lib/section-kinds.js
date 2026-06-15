// Single source of truth for the section tagname family.
//
// Layer 1 has exactly three section depths. Every place that asks "is this a
// section?", "what depth is it?", or "which tagname sits at depth N?" derives
// from the one frozen array here — so adding a depth (or wiring the vocab
// `category` field per the later F14 slice) is a single edit, not a hunt across
// numbering.js, toc.js, normalize-to-canonical.js, ast-helpers.js, and
// book-scaffold.js (which each used to hand-write the list in their own shape).
//
// `book-part` is a REGION (a chapter/part), not a section depth — it joins only
// NAV_ITEM_TAGNAMES (for nav listing), never the depth machinery.

// The three section tagnames, in canonical nesting order (outermost first).
export const SECTION_TAGNAMES = Object.freeze(['section', 'sub-section', 'sub-sub-section']);

// tagname → 1-based nesting depth (section=1, sub-section=2, sub-sub-section=3),
// derived from SECTION_TAGNAMES. A Map (not a plain object) so a lookup of any
// non-section string — including 'toString' and other Object.prototype keys —
// is a clean miss. Replaces ast-helpers' sectionDepth if-ladder and the inverse
// of normalize-to-canonical's heading depth→tagname map.
export const SECTION_DEPTH_MAP = new Map(SECTION_TAGNAMES.map((t, i) => [t, i + 1]));

// Nav-listing tagnames: the three section depths PLUS `book-part`. `book-part`
// is a top-level nav entry (a chapter/part) whose nested sections become its
// children — a region, not a section depth, so it is added here and nowhere
// else. Used by toc.js for both nav-entry collection and title-search bounds.
export const NAV_ITEM_TAGNAMES = Object.freeze([...SECTION_TAGNAMES, 'book-part']);

/** Whether a tagname is one of the three section depths (not book-part). */
export function isSectionTagname(tagname) {
  return SECTION_DEPTH_MAP.has(tagname);
}
