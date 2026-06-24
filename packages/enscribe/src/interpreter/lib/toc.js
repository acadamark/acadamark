// Table-of-contents generation (Phase 8 Slice 1; book reading interface Slice C).
//
// Build-time ToC: walk the compiled hast for the document's section structure,
// assign stable ids to any anchorless section, and wrap the document element in
// an opt-in layout container holding a <nav> of links beside the body.
//
// Two shapes, chosen by document class (applyToc branches on docEl.tagName):
//   - ARTICLE: a single nested <nav class="enscribe-toc"> sidebar (unchanged since
//     Slice 1) — chapters/sections to full depth, byte-identical to before. Its
//     link text is the title's WHOLE text (the GLUED form, including any leading
//     section-number span), and ids slugify from that same glued text — so article
//     ToC markup and ids are exactly as pre-Slice-C.
//   - BOOK (Slice C): a three-column reading interface — a LEFT chapter rail
//     (chapters only, region-grouped front/body/back, roster-numbered), the reading
//     column in the middle with per-chapter prev/next links at each chapter foot,
//     and a RIGHT "on this page" rail of the current chapter's sections. Book entries
//     UN-GLUE the leading section-number into its own span ("1 Introduction", not
//     "1Introduction"). The book renders as ONE scrolling document; scroll-spy (left)
//     and the on-this-page script (right) are the post-render highlighters.
//
// The un-glue is BOOK-ONLY by design: the article path keeps its glued link text and
// glued-derived ids, so an article ToC (numbered or not) is byte-identical to before.
//
// OUTPUT-NEUTRAL GUARANTEE (articles): applyToc is a strict no-op unless the ToC is
// enabled AND (in 'auto') the threshold is met. The layout/ToC CSS lives in
// default.css, scoped to `.enscribe-layout--toc` (and `.enscribe-layout--book` for
// the book chrome), so it cannot affect non-ToC documents.

import { NAV_ITEM_TAGNAMES } from './section-kinds.js';
import { BOOK_REGIONS } from './book-regions.js';
import { readConfigBool } from './config-helpers.js';

// Section-like elements that become ToC entries. `book-part` (a chapter/part) is
// a top-level entry whose nested `section`s become its children — NAV_ITEM_TAGNAMES
// is the three section depths plus `book-part`, from the single source of truth.
const NAV_SECTIONS = new Set(NAV_ITEM_TAGNAMES);

// #223/#246: hast tagnames whose nested `<section>`s are BOX content, not host-page
// structure — collectEntries must NOT descend into them. Two correct-to-skip cases:
//   • DEMO boxes — a `<frame>`/`<aside>` showing a live-rendered `<section>` (e.g. a
//     Documentation catalog's live-render box): the heading is illustration, not structure.
//   • SEALED sub-documents — a `<minipage>` (#115), whose internal sections are private to
//     the box by design (inbound refs forbidden, own registry) and must not enter the host ToC.
// `'figure'` is the COMPILED wrapper for `<frame>`, `<fig>`, `<svg>`, AND `<minipage>` (they
// all emit `<figure …>`), so skipping it covers every one; `'aside'` covers `<aside>`. Without
// this, those headings leak into every ToC the collector feeds — the book ToC, the article ToC,
// and the `<config toc>` rail. Mirrors 4ece570's client-side buildOnThisPage skip-set exactly
// (`!el.closest('figure, aside')`), the same {figure, aside} principle now reaching the
// build-time collector it never touched. (frame/aside legally ACCEPT section content per their
// vocab content model, so a nested section is not "impossible" — it is simply box content.
// Whether an author could ever want such a section LISTED is an open spec question, surfaced as
// a drift finding for toc-and-numbering.md, not decided here.)
const DEMO_BOX_TAGNAMES = new Set(['figure', 'aside']);

const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const clean = (s) => s.replace(/\s+/g, ' ').trim();

/** Concatenated text of a hast node's descendants. */
function textContent(node) {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

/** The `*-title` element of a nav section. Articles keep `<section><section-title>`
 *  as a direct child; books wrap it: `<book-part><meta><book-part-title>`. So check
 *  direct `*-title` children, then one level deeper through a non-section wrapper
 *  (never descending into a nested section, whose title is its own). Returns the
 *  element (or null), so the caller can read its glued text or split out the number. */
function findTitleEl(node) {
  for (const c of node.children ?? []) {
    if (c.type === 'element' && /-title$/.test(c.tagName)) return c;
  }
  for (const c of node.children ?? []) {
    if (c.type !== 'element' || NAV_SECTIONS.has(c.tagName)) continue;
    for (const g of c.children ?? []) {
      if (g.type === 'element' && /-title$/.test(g.tagName)) return g;
    }
  }
  return null;
}

/** Extract a nav entry's title in both forms:
 *   - `glued`  — the title element's whole text ("1Introduction"); the pre-Slice-C
 *     form, used by the ARTICLE path for link text AND id slugs (byte-stable).
 *   - `number` / `clean` — the leading `<span class="section-number">` separated from
 *     the rest ("1" + "Introduction"); used by the BOOK path to render "1 Introduction".
 *  `number` is '' when the title carries no number span (front-matter, unnumbered docs). */
export function titleParts(node) {
  const titleEl = findTitleEl(node);
  if (!titleEl) return { glued: '', number: '', clean: '' };
  let number = '';
  const rest = [];
  for (const c of titleEl.children ?? []) {
    if (c.type === 'element' && (c.properties?.className ?? []).includes('section-number')) {
      number = clean(textContent(c));
    } else {
      rest.push(c);
    }
  }
  return { glued: clean(textContent(titleEl)), number, clean: clean(rest.map(textContent).join('')) };
}

/**
 * Collect the ToC tree from a container, preserving nesting. Each entry is
 * `{ el, glued, number, clean, id, children }`: `el` is the hast section element,
 * `glued`/`number`/`clean` are the title forms (see titleParts), and `id` is its
 * authored id or null (assigned later). Non-section elements are descended into,
 * EXCEPT `<figure>`/`<aside>` box containers (DEMO_BOX_TAGNAMES) — their inner sections
 * are box content, not page structure, and must not leak into the ToC (#223/#246).
 */
function collectEntries(container) {
  const out = [];
  for (const child of container.children ?? []) {
    if (child.type !== 'element') continue;
    if (NAV_SECTIONS.has(child.tagName)) {
      const { glued, number, clean: cleanTitle } = titleParts(child);
      out.push({ el: child, glued, number, clean: cleanTitle, id: child.properties?.id ?? null, children: collectEntries(child) });
    } else if (!DEMO_BOX_TAGNAMES.has(child.tagName)) {
      // Descend into ordinary non-section wrappers; a top-down walk means the demo-box
      // skip is simply NOT recursing into a `<figure>`/`<aside>` (no `closest` needed —
      // that idiom was for 4ece570's flat client-side heading list). See DEMO_BOX_TAGNAMES.
      out.push(...collectEntries(child));
    }
  }
  return out;
}

/** Every existing `id` in the tree, so generated slugs never collide with one. */
function collectIds(node, set) {
  if (node.properties?.id) set.add(node.properties.id);
  for (const c of node.children ?? []) if (c && c.type === 'element') collectIds(c, set);
  return set;
}

/** Slugify a title to a `sec:`-prefixed id fragment (matching the cross-ref convention). */
export function slugify(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
  return `sec:${base}`;
}

/** A slug not already in `used`, suffixed `-2`, `-3`, … on collision. Exported so
 *  book-scaffold.js shares this one collision-dedup helper (#253), not a copy. */
export function uniqueId(candidate, used) {
  let id = candidate;
  let n = 2;
  while (used.has(id)) id = `${candidate}-${n++}`;
  used.add(id);
  return id;
}

/** Assign a stable id to every anchorless entry (mutating its hast element). `slugOf`
 *  picks the slug source: the ARTICLE path slugs from the GLUED title (byte-stable
 *  ids, exactly as pre-Slice-C); the BOOK path slugs from the number-less title. */
function assignIds(entries, used, slugOf) {
  for (const e of entries) {
    if (!e.id) {
      e.id = uniqueId(slugify(slugOf(e)), used);
      e.el.properties = e.el.properties ?? {};
      e.el.properties.id = e.id;
    }
    assignIds(e.children, used, slugOf);
  }
}

// Link-text builders. The ARTICLE form is the pre-Slice-C bare glued text; the BOOK
// form un-glues the number into its own span (and reserves a fallback label so a
// title-less entry never renders an empty, unnavigable anchor).
const articleLink = (e) => [text(e.glued)];
export const bookLink = (e) => {
  const title = e.clean || 'Untitled';
  if (e.number) {
    return [
      el('span', { className: ['enscribe-toc-num'] }, [text(e.number)]),
      el('span', { className: ['enscribe-toc-title'] }, [text(title)]),
    ];
  }
  return [text(title)];
};

/** Build a nested `<ul>` of links from an entry tree, using `content` for each link and
 *  `hrefFor` for each `href`. `hrefFor` defaults to an in-page anchor (`#id`) — today's
 *  behavior for every existing caller — and is the seam #226/#246 use to emit cross-page /
 *  page-tree links (a tree + a resolver, no document-class assumptions baked in).
 *
 *  An entry with NO id is a non-navigable LABEL (#246 S2b: a website `<nav-group>` has no page
 *  of its own) — it renders a `<span class="enscribe-nav-label">`, never an `<a>` (no href).
 *  Every existing caller's entries carry an id, so this branch is never taken for them — the
 *  article/book ToC and #226 contents listing stay byte-identical. */
export function buildList(entries, content, hrefFor = (e) => `#${e.id}`) {
  return el('ul', {}, entries.map((e) => el('li', {}, [
    e.id == null
      ? el('span', { className: ['enscribe-nav-label'] }, content(e))
      : el('a', { href: hrefFor(e) }, content(e)),
    ...(e.children.length ? [buildList(e.children, content, hrefFor)] : []),
  ])));
}

/**
 * Build the article ToC `<nav>`. The links work with no JavaScript; a `<details>`
 * (open by default) gives a native, JS-free collapse on narrow viewports, while
 * the desktop CSS hides the `<summary>` and shows it as an always-open sidebar.
 */
function buildNav(entries) {
  return el('nav', { className: ['enscribe-toc'], ariaLabel: 'Table of contents' }, [
    el('details', { className: ['enscribe-toc-details'], open: true }, [
      el('summary', { className: ['enscribe-toc-summary'] }, [text('Contents')]),
      buildList(entries, articleLink),
    ]),
  ]);
}

// ─── Book reading interface (Slice C) ───────────────────────────────────────────

/**
 * Collect the book's parts in reading order (front → body → back), each with its
 * region, title forms, id, and its own nested section entries (for the right "on
 * this page" rail). Regions and the roster numbering (front unnumbered, body arabic,
 * back lettered) are already in the hast — read, never recompute.
 */
function collectBookParts(bookEl) {
  const parts = [];
  for (const region of bookEl.children ?? []) {
    if (region.type !== 'element' || !(region.tagName in BOOK_REGIONS)) continue;
    const regionKey = BOOK_REGIONS[region.tagName];
    for (const child of region.children ?? []) {
      if (child.type !== 'element' || child.tagName !== 'book-part') continue;
      const { glued, number, clean: cleanTitle } = titleParts(child);
      parts.push({
        el: child,
        region: regionKey,
        glued,
        number,
        clean: cleanTitle,
        id: child.properties?.id ?? null,
        sections: collectEntries(child),
      });
    }
  }
  return parts;
}

/** Assign ids to every book-part (anchorless ones slugify from the number-less
 *  title) and to the nested sections, mutating the hast so getElementById (scroll-spy
 *  / the on-this-page script / prev-next links) resolves them. */
function assignBookIds(parts, used) {
  const slugOf = (e) => e.clean;
  for (const p of parts) {
    if (!p.id) {
      p.id = uniqueId(slugify(p.clean), used);
      p.el.properties = p.el.properties ?? {};
      p.el.properties.id = p.id;
    }
    assignIds(p.sections, used, slugOf);
  }
}

/** A nested rail list of a chapter's sections, pruned to `levels` depth (chapter-nav-
 *  depth minus one). Used only when chapter-nav-depth >= 2 (#221); reuses bookLink so the
 *  section links match the on-this-page rail. Returns null when there are no sections or
 *  no depth budget left. Section entries share the `{ clean, number, id, children }` shape
 *  across both part shapes (toc.js collectEntries and book-scaffold collectSections). */
function railSectionList(part, sections, sectionHref, levels) {
  if (levels <= 0 || !sections || sections.length === 0) return null;
  return el('ul', { className: ['enscribe-rail-sections'] }, sections.map((s) => {
    const kids = [el('a', { href: sectionHref(part, s) }, bookLink(s))];
    if (levels > 1) {
      const sub = railSectionList(part, s.children, sectionHref, levels - 1);
      if (sub) kids.push(sub);
    }
    return el('li', { className: ['enscribe-rail-section'] }, kids);
  }));
}

/** The LEFT chapter rail: chapters at depth 1 (default; no section nesting — that lives
 *  in the right rail), or chapters + their sections at chapter-nav-depth >= 2 (#221),
 *  region-grouped, roster-numbered. It is `nav.enscribe-toc` so the
 *  unchanged scroll-spy script highlights the active chapter, and the existing ToC
 *  CSS applies.
 *
 *  `chapterHref(part)` builds each chapter link's href; the default `#${id}` is the
 *  single-page in-page anchor (the byte-stability contract — single-page output must
 *  not move). The separate-pages publisher (P1) passes a page-URL builder so the rail
 *  links to chapter PAGES instead. `activeId` (separate-pages) statically marks the
 *  current chapter's link (scroll-spy can't, since page-URL links aren't #anchors).
 *
 *  `home` (separate-pages, #206) is the return-to-cover masthead: `{ href, title,
 *  current? }` renders a clickable book-title link at the top of the rail, pointing at
 *  the cover (index.html), so every page can get back to it; `current: true` (the cover
 *  page itself) marks the self-link `aria-current="page"`. When a masthead is present
 *  the nav is labelled "Book" — it holds the home link AND the chapter list, so a bare
 *  "Chapters" landmark name would mis-describe the home link as a chapter. Default null
 *  → no masthead and the "Chapters" label, so the single-page C rail is byte-identical
 *  (the masthead is a separate-pages-only affordance; a single-scroll book has no
 *  separate cover to return to). The `home` shape is checked (href + title), not just
 *  truthiness, so a partial object never emits a broken masthead. */
export function buildChapterRail(parts, chapterHref = (p) => `#${p.id}`, activeId = null, home = null, opts = {}) {
  // chapter-nav-depth (#221): depth 1 (default) lists chapters only — byte-identical to
  // before; depth >= 2 nests each chapter's sections beneath it, pruned to depth-1 levels.
  // `sectionHref(part, section)` projects a section link to its target (in-page anchor for
  // the single-page / live rail; `page#id` for the separate-pages build).
  const { navDepth = 1, sectionHref = (p, s) => `#${s.id}` } = opts;
  const items = parts.map((p) => {
    const linkProps = { href: chapterHref(p) };
    if (activeId != null && p.id === activeId) {
      linkProps.className = ['enscribe-toc-active'];
      linkProps['aria-current'] = 'location';
    }
    const liChildren = [el('a', linkProps, bookLink(p))];
    if (navDepth >= 2) {
      const sub = railSectionList(p, p.sections, sectionHref, navDepth - 1);
      if (sub) liChildren.push(sub);
    }
    return el('li', {
      className: ['enscribe-rail-item', `enscribe-rail-item--${p.region}`],
    }, liChildren);
  });
  const details = el('details', { className: ['enscribe-toc-details'], open: true }, [
    el('summary', { className: ['enscribe-toc-summary'] }, [text('Chapters')]),
    el('ul', {}, items),
  ]);
  const hasMasthead = !!(home && home.href && home.title);
  let navChildren;
  if (hasMasthead) {
    const mastheadProps = { className: ['enscribe-book-home'], href: home.href };
    if (home.current) mastheadProps['aria-current'] = 'page';
    navChildren = [
      el('a', mastheadProps, [
        el('span', { className: ['enscribe-book-home-title'] }, [text(home.title)]),
      ]),
      details,
    ];
  } else {
    navChildren = [details];
  }
  return el('nav', {
    className: ['enscribe-toc', 'enscribe-chapter-rail'],
    ariaLabel: hasMasthead ? 'Book' : 'Chapters',
  }, navChildren);
}

/** The RIGHT "on this page" rail: one section group per chapter (those with
 *  sections), each tagged `data-chapter` with the chapter's id. The on-this-page
 *  script reveals the active chapter's group and highlights the in-view section;
 *  with JS off the first group shows (progressive enhancement). Omitted entirely
 *  when no chapter has sections. */
export function buildOnThisPage(parts) {
  const groups = parts
    .filter((p) => p.sections.length > 0)
    .map((p) => el('div', {
      className: ['enscribe-onthispage-chapter'],
      'data-chapter': p.id,
    }, [buildList(p.sections, bookLink)]));
  if (groups.length === 0) return null;
  return el('nav', { className: ['enscribe-onthispage'], ariaLabel: 'On this page' }, [
    el('details', { className: ['enscribe-toc-details'], open: true }, [
      el('summary', { className: ['enscribe-toc-summary'] }, [text('On this page')]),
      ...groups,
    ]),
  ]);
}

/** A prev/next chapter link (e.g. "← 1 Introduction" / "3 Results →"). The arrow is
 *  a separate decorative span; number and title reuse the rail spans so the theme
 *  styles them consistently. */
function chapterLink(dir, part, chapterHref = (p) => `#${p.id}`) {
  const arrow = dir === 'prev' ? '←' : '→';
  const title = part.clean || 'Untitled';
  const label = [];
  if (part.number) label.push(el('span', { className: ['enscribe-toc-num'] }, [text(part.number)]));
  label.push(el('span', { className: ['enscribe-toc-title'] }, [text(title)]));
  const arrowSpan = el('span', { className: ['enscribe-chapter-arrow'] }, [text(arrow)]);
  return el('a', {
    className: [`enscribe-chapter-${dir}`],
    href: chapterHref(part),
    rel: dir === 'prev' ? 'prev' : 'next',
  }, dir === 'prev' ? [arrowSpan, ...label] : [...label, arrowSpan]);
}

/** A standalone prev/next chapter bar for the parts at index `i` (prev = i-1, next =
 *  i+1), or null if neither exists. Used by the separate-pages publisher to emit the
 *  bar with page-URL hrefs; appendChapterNav uses it for the in-page single-page form. */
export function chapterNavBar(parts, i, chapterHref = (p) => `#${p.id}`) {
  const links = [];
  if (i > 0) links.push(chapterLink('prev', parts[i - 1], chapterHref));
  if (i < parts.length - 1) links.push(chapterLink('next', parts[i + 1], chapterHref));
  if (links.length === 0) return null;
  return el('nav', { className: ['enscribe-chapter-nav'], ariaLabel: 'Chapter navigation' }, links);
}

/** Append a static prev/next chapter bar to the foot of each book-part, computed
 *  from chapter order (the one-scroll reading aid that replaces the old paging
 *  nav's runtime bar). Static markup → byte-identical static≡live. */
function appendChapterNav(parts) {
  parts.forEach((p, i) => {
    const bar = chapterNavBar(parts, i);
    if (!bar) return;
    p.el.children = [...(p.el.children ?? []), bar];
  });
}

/** Build the book's three-column reading interface in place. */
function applyBookToc(hast, docIdx, bookEl, toc, onThisPageEnabled = true) {
  const parts = collectBookParts(bookEl);
  if (parts.length === 0) return null;
  if (toc === 'auto' && parts.length <= 3) return null;

  assignBookIds(parts, collectIds(bookEl, new Set()));

  const chapterRail = buildChapterRail(parts);
  // #248: the on-this-page rail (3rd column) is config-gated, default on. When off,
  // `onThisPage` is null → the layout below drops to the existing 2-col `--book` (no
  // `--book-3col`), reusing the section-less-chapter path; no new layout or CSS.
  const onThisPage = onThisPageEnabled ? buildOnThisPage(parts) : null;
  appendChapterNav(parts);

  const main = el('main', { className: ['enscribe-body'] }, [bookEl]);
  const layoutChildren = onThisPage ? [chapterRail, main, onThisPage] : [chapterRail, main];
  const layoutClasses = ['enscribe-layout', 'enscribe-layout--toc', 'enscribe-layout--book'];
  if (onThisPage) layoutClasses.push('enscribe-layout--book-3col');
  hast.children[docIdx] = el('div', { className: layoutClasses }, layoutChildren);
  return 'book';
}

/**
 * Apply the table-of-contents to a compiled hast tree, in place. No-op unless
 * `toc` is `true` or (`'auto'` with more than three top-level sections).
 *
 * @param {import('hast').Root} hast  the compiled document hast (children hold the
 *   `<article>` / `<book>` element; assets are injected by the caller afterwards).
 * @param {boolean|'auto'} toc
 * @param {boolean} [onThisPage=true] #248 — gate the book interface's on-this-page rail
 *   (the 3rd column). Off collapses the single-scroll book to 2-col. Ignored for articles.
 * @returns {'article'|'book'|null} the document type when a ToC was applied (so the
 *   caller can gate book-only render assets — the on-this-page script — on it), or
 *   null when nothing was done.
 */
export function applyToc(hast, toc, onThisPage = true) {
  if (toc !== true && toc !== 'auto') return null;

  const docIdx = (hast.children ?? []).findIndex(
    (c) => c.type === 'element' && (c.tagName === 'article' || c.tagName === 'book'),
  );
  if (docIdx === -1) return null;
  const docEl = hast.children[docIdx];

  // Book: the three-column reading interface (Slice C).
  if (docEl.tagName === 'book') return applyBookToc(hast, docIdx, docEl, toc, onThisPage);

  // Article: the single nested sidebar (unchanged since Slice 1 — glued title text
  // and glued-derived ids, so numbered or not it is byte-identical to before).
  const entries = collectEntries(docEl);
  if (entries.length === 0) return null;
  // 'auto': only worth a sidebar past a few top-level sections.
  if (toc === 'auto' && entries.length <= 3) return null;

  assignIds(entries, collectIds(docEl, new Set()), (e) => e.glued);

  const nav = buildNav(entries);
  const main = el('main', { className: ['enscribe-body'] }, [docEl]);
  hast.children[docIdx] = el('div', { className: ['enscribe-layout', 'enscribe-layout--toc'] }, [nav, main]);
  return docEl.tagName;
}

// ─── Config-driven contents listing (#218; notes/specs/toc-and-numbering.md) ──────
//
// The NEW, config-driven table of contents — read from `<config toc …>` in the SHARED
// compiler, so the static build and the live render honor it identically (the property
// the docs-site live-ToC parity fix depends on, #207). It is a contents LISTING (book
// navigation — chapter rail, prev/next — is the legacy applyToc above and a sibling
// spec); for a book the listing reflects the assembled whole-book structure (book-parts
// + their sections). Default OFF: with no `<config toc>` this is never invoked, so a
// non-ToC document is byte-identical.
//
// Three placements (toc-location): `body` (default) inserts a full listing at the top of
// the document body, after the title block; `left` / `right` render a sticky sidebar — a
// collapsible listing whose initial expansion is `toc-expand`. `toc-depth` bounds the
// listed levels; a `+unlisted` heading is dropped from the listing (with its subtree).

/** Coerce `toc-depth` to a positive integer (default 3). Accepts a number or a string. */
function tocDepth(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 ? n : 3;
}

/** Coerce `toc-expand` to the count of initially-expanded sidebar levels: `all` →
 *  Infinity, `none` → 0, an integer → itself, anything else → the default 1. */
function tocExpand(v) {
  if (v == null) return 1;
  const s = String(v).toLowerCase();
  if (s === 'all') return Infinity;
  if (s === 'none') return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

/**
 * Resolve the ToC settings from the document's `<config>` map (file.data.enscribeConfig).
 * Returns null when `toc` is off (the default) — the signal to skip the config ToC entirely.
 *
 * @param {Map<string,*>|undefined} configMap
 * @returns {{ depth:number, title:string, location:'body'|'left'|'right', expand:number }|null}
 */
export function readTocConfig(configMap) {
  if (!readConfigBool(configMap, 'toc', false)) return null;  // F12: config-only boolean reader (default off)
  const locationRaw = String(configMap.get('toc-location') ?? 'body').toLowerCase();
  const location = locationRaw === 'left' || locationRaw === 'right' ? locationRaw : 'body';
  return {
    depth: tocDepth(configMap.get('toc-depth')),
    title: configMap.get('toc-title') ?? 'Contents',
    location,
    expand: tocExpand(configMap.get('toc-expand')),
  };
}

/** Prune a collected entry tree for the listing: drop `+unlisted` headings (with their
 *  subtree — prefatory/appendix material opts out wholesale) and any level past `depth`. */
function pruneForToc(entries, depth, level = 1) {
  if (level > depth) return [];
  const out = [];
  for (const e of entries) {
    if (e.el.properties?.unlisted) continue;
    out.push({ ...e, children: pruneForToc(e.children, depth, level + 1) });
  }
  return out;
}

/** The shared `<nav class="enscribe-contents">` builder: a heading (title) + the full nested
 *  list shown in full (no collapse), each link's href from `hrefFor` (default the in-page `#id`
 *  anchor — the article body listing). A distinct class — not `enscribe-toc` — so the sidebar
 *  layout/CSS never applies; this is an in-flow block, not a sticky rail. The ONE nav shape both
 *  the article body listing (applyConfigToc, in-page anchors) and the book/website contents
 *  overview (buildContentsListing, cross-page / page-tree hrefs) render through — #266 folded the
 *  article path's former buildContentsBlock onto this builder. */
function contentsNav(entries, title, hrefFor = (e) => `#${e.id}`) {
  return el('nav', { className: ['enscribe-contents'], ariaLabel: title }, [
    el('p', { className: ['enscribe-contents-heading'] }, [text(title)]),
    buildList(entries, bookLink, hrefFor),
  ]);
}

/**
 * Build a whole-book contents OVERVIEW `<nav class="enscribe-contents">` from a book's
 * `parts` (the scaffold-level chapter/section tree from collectBookParts). Emits through the
 * shared `contentsNav` builder (the same `<nav class="enscribe-contents">` the article body
 * listing renders), so the existing `enscribe-contents` CSS applies — no new CSS. Chapters are
 * the top level; their sections nest beneath, included while their depth ≤ `depth` (chapters are
 * level 1, sections 2+).
 *
 * Generic over the link resolvers, so each book render shape passes its own hrefs — static
 * `slug#id`, live `#stem`/`#id` — and #226's two shapes (and #246's page tree, later) reuse
 * one builder. #226. (#266: the article body listing now shares `contentsNav` too — its former
 * buildContentsBlock is gone, so there is one nav-shape builder, not two.)
 *
 * @param {object[]} parts  collectBookParts output: { id, clean, number, sections }
 * @param {{chapterHref:(p:object)=>string, sectionHref:(p:object,s:object)=>string,
 *          title?:string, depth?:number}} opts
 */
export function buildContentsListing(parts, { chapterHref, sectionHref, title = 'Contents', depth = Infinity }) {
  // A section's href depends on its OWNING chapter, which a per-entry resolver can't see —
  // so resolve hrefs here (with chapter context) into a flat id→href map and hand buildList a
  // by-id lookup. Chapters are level 1; sections start at level 2 (kept while level ≤ depth).
  const hrefById = new Map();
  const sectionEntries = (part, secs, level) => {
    if (level > depth) return [];
    return (secs ?? []).map((s) => {
      hrefById.set(s.id, sectionHref(part, s));
      return { id: s.id, clean: s.clean, number: s.number, children: sectionEntries(part, s.children, level + 1) };
    });
  };
  const entries = parts.map((p) => {
    hrefById.set(p.id, chapterHref(p));
    return { id: p.id, clean: p.clean, number: p.number, children: sectionEntries(p, p.sections, 2) };
  });
  return contentsNav(entries, title, (e) => hrefById.get(e.id) ?? `#${e.id}`);
}

/** A collapsible nested list for a SIDEBAR listing: a parent entry wraps its children in
 *  a `<details>` whose initial open state follows `expand` (a level-D details is open iff
 *  D < expand, so its level-(D+1) children are visible iff D+1 ≤ expand). The link sits in
 *  the `<summary>` (click the marker to toggle, the text to navigate). Leaves are bare links. */
function buildCollapsibleList(entries, expand, level = 1) {
  return el('ul', {}, entries.map((e) => {
    const link = el('a', { href: `#${e.id}` }, bookLink(e));
    if (e.children.length === 0) return el('li', {}, [link]);
    const detailsProps = { className: ['enscribe-toc-sub'] };
    if (level < expand) detailsProps.open = true;
    return el('li', {}, [
      el('details', detailsProps, [
        el('summary', { className: ['enscribe-toc-sub-summary'] }, [link]),
        buildCollapsibleList(e.children, expand, level + 1),
      ]),
    ]);
  }));
}

/** The SIDEBAR listing: a `nav.enscribe-toc` (so the existing sticky-sidebar CSS + the
 *  scroll-spy highlighter apply) carrying the collapsible list, titled by toc-title. */
function buildSidebarToc(entries, title, expand) {
  return el('nav', { className: ['enscribe-toc', 'enscribe-toc--collapsible'], ariaLabel: title }, [
    el('details', { className: ['enscribe-toc-details'], open: true }, [
      el('summary', { className: ['enscribe-toc-summary'] }, [text(title)]),
      buildCollapsibleList(entries, expand),
    ]),
  ]);
}

/** Insert a body listing at the top of the document body, after the title block — the
 *  first child of `<article-body>` (article) / `<book-body>` (book). Falls back to the
 *  doc element's front if no body region is present. */
function insertBodyListing(docEl, nav) {
  const bodyTag = docEl.tagName === 'book' ? 'book-body' : 'article-body';
  const body = (docEl.children ?? []).find((c) => c.type === 'element' && c.tagName === bodyTag);
  const host = body ?? docEl;
  host.children = [nav, ...(host.children ?? [])];
}

/**
 * Apply the config-driven contents listing to a compiled hast tree, in place. Called by
 * the compiler ONLY when `readTocConfig` returned settings (i.e. `<config toc>` is on);
 * mutually exclusive with the legacy `applyToc` (the build-passed option), so output is
 * byte-identical when no `<config toc>` is present.
 *
 * @param {import('hast').Root} hast - the compiled document hast.
 * @param {{ depth:number, title:string, location:'body'|'left'|'right', expand:number }} cfg
 * @returns {'body'|'sidebar'|null} the listing shape (so the caller can gate the scroll-spy
 *   on a sidebar), or null when there was nothing to list / no doc element.
 */
export function applyConfigToc(hast, cfg) {
  const docIdx = (hast.children ?? []).findIndex(
    (c) => c.type === 'element' && (c.tagName === 'article' || c.tagName === 'book'),
  );
  if (docIdx === -1) return null;
  const docEl = hast.children[docIdx];

  const entries = pruneForToc(collectEntries(docEl), cfg.depth);
  if (entries.length === 0) return null;

  // Stable ids on anchorless headings so every entry links to its heading. Slug from the
  // number-LESS title (e.clean), so a numbered heading gets a clean `sec:introduction` id,
  // not `sec:1introduction` (matching the book path; identical to glued when unnumbered).
  assignIds(entries, collectIds(docEl, new Set()), (e) => e.clean);

  if (cfg.location === 'body') {
    insertBodyListing(docEl, contentsNav(entries, cfg.title));
    return 'body';
  }

  const nav = buildSidebarToc(entries, cfg.title, cfg.expand);
  const main = el('main', { className: ['enscribe-body'] }, [docEl]);
  const layoutClasses = ['enscribe-layout', 'enscribe-layout--toc',
    cfg.location === 'right' ? 'enscribe-layout--toc-right' : 'enscribe-layout--toc-left'];
  const children = cfg.location === 'right' ? [main, nav] : [nav, main];
  hast.children[docIdx] = el('div', { className: layoutClasses }, children);
  return 'sidebar';
}
