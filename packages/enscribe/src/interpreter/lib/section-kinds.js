// Single source of truth for the section tagname family.
//
// eHTML has exactly three section depths. Every place that asks "is this a
// section?", "what depth is it?", or "which tagname sits at depth N?" derives
// from the one frozen array here — so adding a depth (or wiring the vocab
// `category` field per the later F14 slice) is a single edit, not a hunt across
// numbering.js, toc.js, normalize-to-canonical.js, ast-helpers.js, and
// book-scaffold.js (which each used to hand-write the list in their own shape).
//
// `book-part` is a REGION (a chapter/part), not a section depth — it joins only
// NAV_ITEM_TAGNAMES (for nav listing), never the depth machinery.
//
// F14 link to the vocab: the `sections` category is now EXACTLY these three depth tagnames.
// (The section title/subtitle children — section-title, sub-section-subtitle, … — that used to
// share the `sections` category were moved to `metadata` with every other title, #233.) So the
// set IS the category — but the ORDER (depth) is interpreter knowledge a category cannot hold,
// so the ordered array stays the source and a load-time EQUALITY assertion ties it to the vocab.

import { tagnamesInCategory } from './vocab-categories.js';

// The three section tagnames, in canonical nesting order (outermost first).
export const SECTION_TAGNAMES = Object.freeze(['section', 'sub-section', 'sub-sub-section']);

// F14 guard (#233): SECTION_TAGNAMES is EXACTLY the vocab `sections` category — equality in both
// directions. Throws at load if a section element is de-categorized OR a non-depth element is
// added to `sections` (the regression #233 fixed). Order is enforced by SECTION_DEPTH_MAP below.
{
  const sectionsCategory = tagnamesInCategory('sections');
  const equal = sectionsCategory.size === SECTION_TAGNAMES.length
    && SECTION_TAGNAMES.every((t) => sectionsCategory.has(t));
  if (!equal) {
    throw new Error(
      `section-kinds (F14): SECTION_TAGNAMES {${SECTION_TAGNAMES.join(', ')}} != vocab 'sections' ` +
      `category {${[...sectionsCategory].sort().join(', ')}} — drift.`,
    );
  }
}

// tagname → 1-based nesting depth (section=1, sub-section=2, sub-sub-section=3),
// derived from SECTION_TAGNAMES. A Map (not a plain object) so a lookup of any
// non-section string — including 'toString' and other Object.prototype keys —
// is a clean miss. Replaces ast-helpers' sectionDepth if-ladder and the inverse
// of normalize-to-canonical's heading depth→tagname map.
export const SECTION_DEPTH_MAP = new Map(SECTION_TAGNAMES.map((t, i) => [t, i + 1]));

// tagname → its title element name (section → section-title, …), derived from
// SECTION_TAGNAMES so the section→title pairing has one origin (#251). A Map so a
// lookup of any non-section string is a clean miss. Replaces section-nesting.js's
// hand-written TITLE_TAG object.
export const SECTION_TITLE_MAP = new Map(SECTION_TAGNAMES.map((t) => [t, `${t}-title`]));

// Nav-listing tagnames: the three section depths PLUS `book-part`. `book-part`
// is a top-level nav entry (a chapter/part) whose nested sections become its
// children — a region, not a section depth, so it is added here and nowhere
// else. Used by toc.js for both nav-entry collection and title-search bounds.
export const NAV_ITEM_TAGNAMES = Object.freeze([...SECTION_TAGNAMES, 'book-part']);

/** Whether a tagname is one of the three section depths (not book-part). */
export function isSectionTagname(tagname) {
  return SECTION_DEPTH_MAP.has(tagname);
}
