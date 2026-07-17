// The ONE book-navigation config reader (relocated here in #454 so the COMPILER can share it).
//
// resolveBookNavConfig reads the book-nav `<config>` family (chapter-nav, chapter-nav-depth,
// page-navigation, cover, back-to-top, on-this-page, split-by) into the plain object all three book
// renderers gate their chrome on: the separate-pages publisher (publish-pages.js), the live app-shell
// (live-book.js), AND the compiler's single-scroll interface (index.js injectToc → lib/toc.js
// applyBookToc). It used to live in master-document/book-scaffold.js, but book-scaffold imports from
// interpreter/lib/toc.js — so the compiler importing it from there would be a cycle. It lives at the
// interpreter/lib layer (its only deps — readConfigBool, ENSCRIBE_CONFIG — already live here), and
// book-scaffold RE-EXPORTS it so publish-pages/live-book keep their existing imports unchanged.
//
// One reader, three surfaces: a book-nav key added here (or its default) reaches every book shape at
// once — the #454 fix that ended the compiler's single-page path silently ignoring chapter-nav /
// chapter-nav-depth / page-navigation while the other two shapes honored them.
//
// Authority: notes/specs/book-navigation.md.

import { readConfigBool } from './config-helpers.js';
import { ENSCRIBE_CONFIG } from '../../core/file-data-keys.js';

const SPLIT_BY_VALUES = new Set(['chapter', 'section', 'none']);
// #459 part 1: the two nav-placement enums. A bad value falls back to the default side (the
// validateConfigValue warning at config-discovery already told the author); the default sides
// (rail left, on-this-page right) reproduce today's layout, so a book that sets neither is byte-stable.
const NAV_SIDE_VALUES = new Set(['left', 'right']);
const readNavSide = (configMap, key, dflt) => {
  const v = configMap?.get(key) ?? dflt;
  return NAV_SIDE_VALUES.has(v) ? v : dflt;
};

/**
 * Resolve the book-navigation settings from a numbered book's VFile (the config map populated by
 * config-discovery in the shared pipeline). Returns the plain object both the static and live book
 * renderers gate their chrome on. Only split-by=chapter is built; section is accepted but deferred.
 *
 * @param {object} file - the VFile carrying file.data[ENSCRIBE_CONFIG]
 * @param {object} [o]
 * @param {boolean} [o.paginated=true] - whether the CONSUMING surface paginates the book into pages/
 *   routes. The separate-pages and live surfaces do (default), so a deferred split-by=section|none
 *   warns. The single-scroll surface (--single-page) does NOT paginate — it IS split-by=none (the whole
 *   book on one scroll) — so it passes `paginated:false` to suppress a warning that would be false there
 *   (#454; reconciles book-navigation.md's "split-by=none deferred" note with the single-page render).
 * @returns {{chapterNav:boolean, chapterNavDepth:number, chapterNavSide:string,
 *           pageNavigation:boolean, cover:boolean, backToTop:boolean, onThisPage:boolean,
 *           onThisPageSide:string, combined:boolean, splitBy:string}}
 */
export function resolveBookNavConfig(file, { paginated = true } = {}) {
  const configMap = file?.data?.[ENSCRIBE_CONFIG] ?? null;

  const depthRaw = parseInt(configMap?.get('chapter-nav-depth'), 10);
  const chapterNavDepth = Number.isFinite(depthRaw) && depthRaw >= 1 ? depthRaw : 1;

  let splitBy = configMap?.get('split-by') ?? 'chapter';
  if (!SPLIT_BY_VALUES.has(splitBy)) splitBy = 'chapter';
  if (paginated && splitBy !== 'chapter' && typeof file?.message === 'function') {
    // #454: split-by=none IS built — it is exactly what `build --single-page` renders (the whole book
    // on one scroll) — so on a PAGINATED surface it isn't "not built", it's the wrong surface: point
    // the author at --single-page rather than claiming the feature is missing. split-by=section is the
    // one still genuinely deferred. Both fall back to the implemented chapter unit on this surface; one
    // message id ('split-by-deferred') keys the whole "split-by not honored here → using chapter" family.
    const detail = splitBy === 'none'
      ? 'split-by=none renders the whole book on one scroll — build it with `enscribe build --single-page`; ' +
        'this paginated build renders split-by=chapter (the implemented pagination unit).'
      : `split-by=${splitBy} is named in notes/specs/book-navigation.md but not yet built; ` +
        'rendering split-by=chapter (the implemented pagination unit).';
    file.message(detail, undefined, 'book-navigation:split-by-deferred');
  }

  return {
    chapterNav:     readConfigBool(configMap, 'chapter-nav', true),
    chapterNavDepth,
    chapterNavSide: readNavSide(configMap, 'chapter-nav-side', 'left'),   // #459 part 1
    pageNavigation: readConfigBool(configMap, 'page-navigation', true),
    cover:          readConfigBool(configMap, 'cover', true),
    backToTop:      readConfigBool(configMap, 'back-to-top', false),
    onThisPage:     readConfigBool(configMap, 'on-this-page', true),
    onThisPageSide: readNavSide(configMap, 'on-this-page-side', 'right'),   // #459 part 1
    combined:       readConfigBool(configMap, 'combined-nav', false),   // #459 part 2
    splitBy,
  };
}
