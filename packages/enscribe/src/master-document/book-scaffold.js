// Book reading-model scaffolding (shared book-structure layer).
//
// The neutral, target-agnostic half of building a book's reading model off a
// numbered mdast tree (proc.runSync output): which nodes are the book / the
// chapters, each chapter's roster number, title, sub-sections, a deterministic
// slug STEM, and the mdast id assignment that makes a chapter self-contained.
//
// It is book STRUCTURE, not a publishing concern, so both consumers depend on it
// rather than one owning it: the static separate-pages publisher (P1, #205,
// publish-pages.js) and the live app-shell book render (L2, #208, live-book.js).
// The dependency points INTO here from each consumer — the publisher does not own
// the scaffolding the live path borrows. (L3 cross-chapter preview will reach for
// the same model.)
//
// TARGET PROJECTION stays in the consumer. The shared output is the neutral STEM
// (`1-counting-elephants`) plus the ids both paths MUST share for content parity
// (renderChapter emits a chapter's book-part + sub-section ids into its fragment,
// so divergent ids = divergent content). P1 projects the stem to a page URL
// (`1-counting-elephants.html`); the live path projects it to a hash route
// (`#1-counting-elephants`). The `.html`-vs-`#` difference is legitimate
// per-target formatting, not drift — so it lives in each consumer, never here.
//
// It also holds the one shared piece of COVER content (#209): the book-title hero + lede.
// The static cover (P1 `pages/index.html`) and the live cover view render the SAME body —
// so the previewed cover IS the published cover — each wrapping it in its own rail + layout
// (page-URL hrefs vs hash routes). The `.html`-vs-`#` discipline again: shared body here,
// the wrapper in each consumer.

import { isEnscribeTag } from '../interpreter/lib/ast-helpers.js';
import { slugify } from '../interpreter/lib/toc.js';
import { isSectionTagname } from '../interpreter/lib/section-kinds.js';
import { BOOK_REGIONS } from '../interpreter/lib/book-regions.js';
import { readConfigBool } from '../interpreter/lib/config-helpers.js';
import { ENSCRIBE_CONFIG } from '../core/file-data-keys.js';

const cleanText = (s) => s.replace(/\s+/g, ' ').trim();

/** Concatenated text of an enscribe/mdast node's content. */
function nodeText(node) {
  if (node == null) return '';
  if (node.type === 'text') return node.value ?? '';
  if (typeof node.content === 'string') return node.content;
  const kids = Array.isArray(node.content) ? node.content : (node.children ?? []);
  return kids.map(nodeText).join('');
}

/** The `*-title` text of a book-part / section node (mdast: title is a direct child,
 *  or inside a synthesized `<meta>`). Number-free (the number is a hast-render span). */
export function titleTextOf(node) {
  const kids = Array.isArray(node.content) ? node.content : [];
  for (const c of kids) {
    if (isEnscribeTag(c) && /-title$/.test(c.tagname)) return cleanText(nodeText(c));
  }
  for (const c of kids) {
    if (isEnscribeTag(c, 'meta')) {
      for (const g of (Array.isArray(c.content) ? c.content : [])) {
        if (isEnscribeTag(g) && /-title$/.test(g.tagname)) return cleanText(nodeText(g));
      }
    }
  }
  return cleanText(nodeText(node));
}

/** Sub-sections (and deeper) directly under a book-part, for the on-this-page rail. */
function collectSections(node) {
  const out = [];
  for (const c of (Array.isArray(node.content) ? node.content : [])) {
    if (isEnscribeTag(c) && isSectionTagname(c.tagname)) {
      out.push({ node: c, number: c.computedSectionNumber ?? '', clean: titleTextOf(c), id: null, children: collectSections(c) });
    }
  }
  return out;
}

/** Find the `<book>` element in a numbered tree. */
export function findBook(tree) {
  for (const c of (tree?.children ?? [])) if (isEnscribeTag(c, 'book')) return c;
  return null;
}

/** The book's title (from `<meta><book-title>`), for page <title>s and the index. */
export function bookTitleOf(bookEl) {
  for (const region of (bookEl.content ?? [])) {
    for (const c of (Array.isArray(region.content) ? region.content : [])) {
      if (isEnscribeTag(c, 'meta')) {
        for (const g of (Array.isArray(c.content) ? c.content : [])) {
          if (isEnscribeTag(g, 'book-title')) return cleanText(nodeText(g));
        }
      }
    }
  }
  return 'Book';
}

/** Collect book-parts in reading order (front → body → back) with their region,
 *  roster number, title, and sub-sections. Read off the numbered mdast — no recompile.
 *  `stem` / `id` start null: assignSlugStems and assignIds fill them. */
export function collectBookParts(bookEl) {
  const parts = [];
  for (const region of (bookEl.content ?? [])) {
    if (!isEnscribeTag(region) || !(region.tagname in BOOK_REGIONS)) continue;
    const regionKey = BOOK_REGIONS[region.tagname];
    for (const child of (Array.isArray(region.content) ? region.content : [])) {
      if (!isEnscribeTag(child, 'book-part')) continue;
      parts.push({
        node: child,
        region: regionKey,
        number: child.computedSectionNumber ?? '',
        clean: titleTextOf(child),
        id: null,
        stem: null,
        sections: collectSections(child),
      });
    }
  }
  return parts;
}

/** A slug not already in `used`, suffixed `-2`, `-3`, … on collision. */
function uniqueSlug(candidate, used) {
  let s = candidate;
  let n = 2;
  while (used.has(s)) s = `${candidate}-${n++}`;
  used.add(s);
  return s;
}

/** Assign each chapter a deterministic, collision-deduped slug STEM — number/letter
 *  + title-slug (`1-counting-elephants`, `a-field-data-sheets`); front-matter without a
 *  roster number gets no prefix (`about-this-book`). The NEUTRAL stem: P1 appends
 *  `.html` for a page URL, the live path prepends `#` for a hash route. */
export function assignSlugStems(parts) {
  const used = new Set();
  for (const p of parts) {
    const titleSlug = slugify(p.clean).replace(/^sec:/, '');
    const prefix = p.number ? `${p.number.toLowerCase()}-` : '';
    p.stem = uniqueSlug(prefix + titleSlug, used);
  }
}

/** Collect every colon-id already present in a tree, so generated slugs never
 *  collide with an authored anchor (mirrors C's collectIds seeding). */
function collectExistingIds(node, set) {
  if (isEnscribeTag(node) && typeof node.id === 'string' && node.id.includes(':')) set.add(node.id);
  for (const c of (Array.isArray(node?.content) ? node.content : [])) collectExistingIds(c, set);
  for (const c of (node?.children ?? [])) collectExistingIds(c, set);
  return set;
}

/** Assign mdast ids (mutating): each book-part its `sec:`-slug id (so the harvest
 *  records it as the owning chapter), and each (anchorless) sub-section a `sec:`-slug
 *  id (so renderChapter emits it and the on-this-page rail links to it in-page). The
 *  ids mirror C's single-page toc assignment, so a chapter's CONTENT matches the
 *  single-page slice apart from the cross-page href rewrite. The `used` set is seeded
 *  with every existing colon-id so a generated slug never collides with an authored
 *  anchor (e.g. `<## #sec:intro>`) — the same safety the single-page path has.
 *
 *  Both consumers MUST run this before harvesting / rendering, in this order, so the
 *  ids in the harvested registry, the rendered fragment, and the rail all agree. */
export function assignIds(parts, bookEl) {
  const used = collectExistingIds(bookEl, new Set());
  const assignSections = (sections) => {
    for (const s of sections) {
      if (!s.node.id) s.node.id = uniqueSlug(slugify(s.clean), used);
      s.id = s.node.id;
      assignSections(s.children);
    }
  };
  for (const p of parts) {
    if (!p.node.id) p.node.id = uniqueSlug(slugify(p.clean), used);
    p.id = p.node.id;
  }
  for (const p of parts) assignSections(p.sections);
}

// ─── Shared cover content (#209) ──────────────────────────────────────────────
// The one presentation fragment both render targets share. Kept as a raw string (not a
// hast builder) so P1's committed cover golden stays byte-identical to the existing form.

/** Minimal HTML escape for interpolated text (e.g. the book title). */
export const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The book cover's `<main>` body: the book-title hero + the "select a chapter" lede.
 *  Rendered verbatim by P1's static cover (`pages/index.html`) and the live cover view, so
 *  the published cover and the previewed cover are the same artifact. Each consumer wraps
 *  this in its own `<main class="enscribe-body">` + rail + layout. */
export function coverBodyHtml(bookTitle) {
  return `<book-title>${escapeHtml(bookTitle)}</book-title><p class="enscribe-book-index-lede">Select a chapter to begin reading.</p>`;
}

// ─── Book navigation config (#221) ────────────────────────────────────────────
// The shared read of the book-navigation <config> settings, resolved ONCE off the
// numbered VFile's config map so BOTH render targets — the static separate-pages
// build (publish-pages.js) and the live render (live-book.js) — gate their chrome
// identically (the #218/#207 static≡live discipline). Book-only: these helpers are
// called only from the book paths. Defaults are ON for books (declaring <meta
// type=book> opts into book conventions) EXCEPT back-to-top.
// Authority: notes/specs/book-navigation.md.

const SPLIT_BY_VALUES = new Set(['chapter', 'section', 'none']);

/**
 * Resolve the book-navigation settings from a numbered book's VFile (the config
 * map populated by config-discovery in the shared pipeline). Returns the plain
 * object both the static and live book renderers gate their chrome on. Only
 * split-by=chapter is built; section|none are accepted but deferred (a note is
 * emitted and chapter pagination is used), per notes/specs/book-navigation.md.
 *
 * @param {object} file - the VFile carrying file.data[ENSCRIBE_CONFIG]
 * @returns {{chapterNav:boolean, chapterNavDepth:number, pageNavigation:boolean,
 *           cover:boolean, backToTop:boolean, splitBy:string}}
 */
export function resolveBookNavConfig(file) {
  const configMap = file?.data?.[ENSCRIBE_CONFIG] ?? null;

  const depthRaw = parseInt(configMap?.get('chapter-nav-depth'), 10);
  const chapterNavDepth = Number.isFinite(depthRaw) && depthRaw >= 1 ? depthRaw : 1;

  let splitBy = configMap?.get('split-by') ?? 'chapter';
  if (!SPLIT_BY_VALUES.has(splitBy)) splitBy = 'chapter';
  if (splitBy !== 'chapter' && typeof file?.message === 'function') {
    file.message(
      `split-by=${splitBy} is named in notes/specs/book-navigation.md but not yet built; ` +
      `rendering split-by=chapter (the implemented pagination unit).`,
      undefined,
      'book-navigation:split-by-deferred',
    );
  }

  return {
    chapterNav:     readConfigBool(configMap, 'chapter-nav', true),
    chapterNavDepth,
    pageNavigation: readConfigBool(configMap, 'page-navigation', true),
    cover:          readConfigBool(configMap, 'cover', true),
    backToTop:      readConfigBool(configMap, 'back-to-top', false),
    splitBy,
  };
}
