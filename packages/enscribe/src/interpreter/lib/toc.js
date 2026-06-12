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

// Section-like elements that become ToC entries. `book-part` (a chapter/part) is
// a top-level entry whose nested `section`s become its children.
const NAV_SECTIONS = new Set(['section', 'sub-section', 'sub-sub-section', 'book-part']);

// The three book regions, in reading order, mapped to a short region key the rail
// markup carries (so the theme can style front/body/back differently).
const BOOK_REGIONS = { 'book-front': 'front', 'book-body': 'body', 'book-back': 'back' };

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
 * authored id or null (assigned later). Non-section elements are descended into.
 */
function collectEntries(container) {
  const out = [];
  for (const child of container.children ?? []) {
    if (child.type !== 'element') continue;
    if (NAV_SECTIONS.has(child.tagName)) {
      const { glued, number, clean: cleanTitle } = titleParts(child);
      out.push({ el: child, glued, number, clean: cleanTitle, id: child.properties?.id ?? null, children: collectEntries(child) });
    } else {
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

/** A slug not already in `used`, suffixed `-2`, `-3`, … on collision. */
function uniqueId(candidate, used) {
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

/** Build a nested `<ul>` of links from an entry tree, using `content` for each link. */
export function buildList(entries, content) {
  return el('ul', {}, entries.map((e) => el('li', {}, [
    el('a', { href: `#${e.id}` }, content(e)),
    ...(e.children.length ? [buildList(e.children, content)] : []),
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

/** The LEFT chapter rail: chapters only (no section nesting — that lives in the
 *  right rail), region-grouped, roster-numbered. It is `nav.enscribe-toc` so the
 *  unchanged scroll-spy script highlights the active chapter, and the existing ToC
 *  CSS applies.
 *
 *  `chapterHref(part)` builds each chapter link's href; the default `#${id}` is the
 *  single-page in-page anchor (the byte-stability contract — single-page output must
 *  not move). The separate-pages publisher (P1) passes a page-URL builder so the rail
 *  links to chapter PAGES instead. `activeId` (separate-pages) statically marks the
 *  current chapter's link (scroll-spy can't, since page-URL links aren't #anchors). */
export function buildChapterRail(parts, chapterHref = (p) => `#${p.id}`, activeId = null) {
  const items = parts.map((p) => {
    const linkProps = { href: chapterHref(p) };
    if (activeId != null && p.id === activeId) {
      linkProps.className = ['enscribe-toc-active'];
      linkProps['aria-current'] = 'location';
    }
    return el('li', {
      className: ['enscribe-rail-item', `enscribe-rail-item--${p.region}`],
    }, [
      el('a', linkProps, bookLink(p)),
    ]);
  });
  return el('nav', { className: ['enscribe-toc', 'enscribe-chapter-rail'], ariaLabel: 'Chapters' }, [
    el('details', { className: ['enscribe-toc-details'], open: true }, [
      el('summary', { className: ['enscribe-toc-summary'] }, [text('Chapters')]),
      el('ul', {}, items),
    ]),
  ]);
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
function applyBookToc(hast, docIdx, bookEl, toc) {
  const parts = collectBookParts(bookEl);
  if (parts.length === 0) return null;
  if (toc === 'auto' && parts.length <= 3) return null;

  assignBookIds(parts, collectIds(bookEl, new Set()));

  const chapterRail = buildChapterRail(parts);
  const onThisPage = buildOnThisPage(parts);
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
 * @returns {'article'|'book'|null} the document type when a ToC was applied (so the
 *   caller can gate book-only render assets — the on-this-page script — on it), or
 *   null when nothing was done.
 */
export function applyToc(hast, toc) {
  if (toc !== true && toc !== 'auto') return null;

  const docIdx = (hast.children ?? []).findIndex(
    (c) => c.type === 'element' && (c.tagName === 'article' || c.tagName === 'book'),
  );
  if (docIdx === -1) return null;
  const docEl = hast.children[docIdx];

  // Book: the three-column reading interface (Slice C).
  if (docEl.tagName === 'book') return applyBookToc(hast, docIdx, docEl, toc);

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
