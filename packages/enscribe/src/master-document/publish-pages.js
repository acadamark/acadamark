// Static separate-pages book publisher (publishing, P1 — #205).
//
// Builds a book as ONE standalone HTML page per chapter at per-chapter URLs — the
// shareable "send your friend a link" artifact. Each page carries the C-slice chrome
// (left chapter rail, prev/next, right on-this-page) + that chapter's content (L1's
// renderChapter), with cross-chapter references resolving to cross-PAGE links.
//
// First real consumer of L1 (#204, renderChapter + the harvested cross-ref registry)
// and C (#202, the chrome in interpreter/lib/toc.js). The ENGINE is untouched: it
// renders in-page anchors as always; the PUBLISHER rewrites cross-chapter ref hrefs
// to cross-page links (a post-render string rewrite on the deterministic ref output),
// so single-page mode stays byte-identical.
//
// Flow (the caller assembles + runSyncs with a VFile so file.data.enscribeRegistry is
// reachable): collect book-part metadata from the numbered mdast → compute a slug/URL
// per chapter → assign mdast ids (book-part + sub-section) so renderChapter emits them
// and the harvest reads owning chapters → harvest the registry (extended with
// `chapter`) → per chapter: renderChapter + cross-page rewrite + the chrome (C's
// builders with page-URL hrefs) + the HTML shell. Returns Map(filename → html).

import { toHtml } from 'hast-util-to-html';
import { isEnscribeTag } from '../interpreter/lib/ast-helpers.js';
import {
  slugify,
  buildChapterRail,
  buildOnThisPage,
  chapterNavBar,
} from '../interpreter/lib/toc.js';
import { harvestCrossRefRegistry } from '../interpreter/lib/cross-ref-registry.js';
import { renderChapter } from './render-chapter.js';
import { SCROLL_SPY_JS } from '../interpreter/assets/scroll-spy-asset.js';
import { ON_THIS_PAGE_JS } from '../interpreter/assets/on-this-page-asset.js';

const BOOK_REGIONS = { 'book-front': 'front', 'book-body': 'body', 'book-back': 'back' };
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
function titleTextOf(node) {
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
    if (isEnscribeTag(c) && /^(sub-section|sub-sub-section|section)$/.test(c.tagname)) {
      out.push({ node: c, number: c.computedSectionNumber ?? '', clean: titleTextOf(c), id: null, children: collectSections(c) });
    }
  }
  return out;
}

/** Find the `<book>` element in a numbered tree. */
function findBook(tree) {
  for (const c of (tree?.children ?? [])) if (isEnscribeTag(c, 'book')) return c;
  return null;
}

/** The book's title (from `<meta><book-title>`), for page <title>s and the index. */
function bookTitleOf(bookEl) {
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
 *  roster number, title, and sub-sections. Read off the numbered mdast — no recompile. */
function collectBookParts(bookEl) {
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
        slug: null,
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

/** Compute a deterministic page URL per chapter — number/letter + title-slug
 *  (`1-counting-elephants.html`, `a-field-data-sheets.html`); front-matter without a
 *  roster number gets no prefix (`about-this-book.html`). Collision-deduped. */
function computeSlugs(parts) {
  const used = new Set();
  for (const p of parts) {
    const titleSlug = slugify(p.clean).replace(/^sec:/, '');
    const prefix = p.number ? `${p.number.toLowerCase()}-` : '';
    p.slug = `${uniqueSlug(prefix + titleSlug, used)}.html`;
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
 *  anchor (e.g. `<## #sec:intro>`) — the same safety the single-page path has. */
function assignIds(parts, bookEl) {
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

/** Rewrite cross-CHAPTER ref hrefs in a rendered chapter fragment to cross-PAGE links.
 *  `<a href="#X" class="ref"` becomes `<a href="ownerUrl#X" class="ref"` when anchor X
 *  is owned by a DIFFERENT chapter; in-chapter refs and `class="ref-error"` are left
 *  alone (the `class="ref"` + closing-quote anchor never matches `ref-error`). */
function rewriteCrossPageRefs(html, currentChapterId, registry, idToUrl) {
  return html.replace(/<a href="#([^"]+)" class="ref"/g, (whole, anchor) => {
    const entry = registry.get(anchor);
    if (!entry || entry.chapter == null || entry.chapter === currentChapterId) return whole;
    const url = idToUrl.get(entry.chapter);
    return url ? `<a href="${url}#${anchor}" class="ref"` : whole;
  });
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Wrap a body in a standalone HTML document with default.css inlined and the two
 *  C reading-interface scripts (scroll-spy drives the left rail — a no-op when its
 *  links are page URLs; on-this-page drives the right rail's in-page highlight). */
function pageShell(body, title, defaultCss) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${defaultCss}
</style>
</head>
<body>
${body}
<script>${SCROLL_SPY_JS}</script>
<script>${ON_THIS_PAGE_JS}</script>
</body>
</html>
`;
}

// The book layout class list; the third column (`--book-3col`) is added only when a
// right rail is present, mirroring C's single-page applyBookToc.
const BOOK_LAYOUT = 'enscribe-layout enscribe-layout--toc enscribe-layout--book';

/** Render one chapter page: renderChapter content (cross-page refs rewritten) inside
 *  the three-column chrome (chapter rail → page URLs with the current chapter marked
 *  active; on-this-page → this chapter's sub-sections in-page; prev/next → page URLs). */
function renderPage(part, parts, idx, registry, idToUrl, opts) {
  const { proc, file, defaultCss, bookTitle } = opts;
  const chapterHref = (p) => p.slug;

  let content = renderChapter(part.node, registry, { proc, file });
  content = rewriteCrossPageRefs(content, part.id, registry, idToUrl);

  const rail = toHtml(buildChapterRail(parts, chapterHref, part.id));
  const onThisPageNav = buildOnThisPage([part]);
  const onThisPage = onThisPageNav ? toHtml(onThisPageNav) : '';
  const navBar = chapterNavBar(parts, idx, chapterHref);
  const prevNext = navBar ? toHtml(navBar) : '';

  const layout = onThisPage ? `${BOOK_LAYOUT} enscribe-layout--book-3col` : BOOK_LAYOUT;
  const body = `<div class="${layout}">${rail}<main class="enscribe-body">${content}${prevNext}</main>${onThisPage}</div>`;
  const pageTitle = part.number ? `${part.number} · ${part.clean} — ${bookTitle}` : `${part.clean} — ${bookTitle}`;
  return pageShell(body, pageTitle, defaultCss);
}

/** The landing/index page: the book title + the chapter rail linking to every chapter
 *  PAGE (a stable index.html entry point that does not privilege one chapter). */
function renderIndex(parts, idToUrl, opts) {
  const { defaultCss, bookTitle } = opts;
  const rail = toHtml(buildChapterRail(parts, (p) => p.slug));
  const body = `<div class="enscribe-layout enscribe-layout--toc enscribe-layout--book">${rail}<main class="enscribe-body"><book-title>${escapeHtml(bookTitle)}</book-title><p class="enscribe-book-index-lede">Select a chapter to begin reading.</p></main></div>`;
  return pageShell(body, bookTitle, defaultCss);
}

/**
 * Publish a numbered book tree as separate per-chapter HTML pages.
 *
 * @param {object} opts
 * @param {object} opts.numbered - the numbered mdast tree (proc.runSync output)
 * @param {object} opts.file - the VFile carrying file.data.enscribeRegistry
 * @param {object} opts.proc - a configured pipeline (its stringify renders chapter content)
 * @param {string} opts.defaultCss - default.css text, inlined into each page's shell
 * @returns {Map<string, string>} filename ('1-counting-elephants.html', 'index.html', …) → HTML
 */
export function publishBookPages({ numbered, file, proc, defaultCss }) {
  const bookEl = findBook(numbered);
  if (!bookEl) throw new Error('publishBookPages: no <book> element — separate-pages is a book-only build');

  const bookTitle = bookTitleOf(bookEl);
  const parts = collectBookParts(bookEl);
  if (parts.length === 0) throw new Error('publishBookPages: the book has no chapters');

  computeSlugs(parts);
  assignIds(parts, bookEl);                  // before harvest (owner ids) + renderChapter (emitted ids)
  const registry = harvestCrossRefRegistry(numbered, file);
  const idToUrl = new Map(parts.map((p) => [p.id, p.slug]));

  const opts = { proc, file, defaultCss, bookTitle };
  const pages = new Map();
  parts.forEach((part, idx) => {
    pages.set(part.slug, renderPage(part, parts, idx, registry, idToUrl, opts));
  });
  pages.set('index.html', renderIndex(parts, idToUrl, opts));
  return pages;
}
