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
// The book reading-MODEL scaffolding (which nodes are chapters, their numbers/titles/
// sub-sections, slug stems, mdast id assignment) is shared with the live app-shell
// render (L2, #208) and lives in book-scaffold.js. This module owns only the STATIC
// projection: the stem → page URL (`.html`) mapping, the cross-page href rewrite, and
// the standalone HTML shell.
//
// Flow (the caller assembles + runSyncs with a VFile so file.data.enscribeRegistry is
// reachable): collect book-part metadata from the numbered mdast → compute a slug/URL
// per chapter → assign mdast ids (book-part + sub-section) so renderChapter emits them
// and the harvest reads owning chapters → harvest the registry (extended with
// `chapter`) → per chapter: renderChapter + cross-page rewrite + the chrome (C's
// builders with page-URL hrefs) + the HTML shell. Returns Map(filename → html).

import { toHtml } from 'hast-util-to-html';
import {
  buildChapterRail,
  buildOnThisPage,
  chapterNavBar,
} from '../interpreter/lib/toc.js';
import { harvestCrossRefRegistry } from '../interpreter/lib/cross-ref-registry.js';
import { renderChapter } from './render-chapter.js';
import {
  collectBookParts,
  assignSlugStems,
  assignIds,
  findBook,
  bookTitleOf,
  escapeHtml,
  coverBodyHtml,
} from './book-scaffold.js';
import { SCROLL_SPY_JS } from '../interpreter/assets/scroll-spy-asset.js';
import { ON_THIS_PAGE_JS } from '../interpreter/assets/on-this-page-asset.js';

/** P1 projection: each chapter's PAGE URL is the shared neutral stem + `.html`
 *  (`1-counting-elephants.html`, `a-field-data-sheets.html`; front-matter without a
 *  roster number is unprefixed, `about-this-book.html`). The stem is the byte-stable,
 *  collision-deduped slug computed in book-scaffold; the `.html` suffix is this static
 *  target's own concern (the live path prepends `#` instead). */
function computeSlugs(parts) {
  assignSlugStems(parts);
  for (const p of parts) p.slug = `${p.stem}.html`;
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

// The return-to-cover masthead's CSS (#206). It lives HERE, not in default.css,
// because the masthead is separate-pages-only chrome: default.css is inlined verbatim
// into every single-page golden's <style>, so adding this rule there would change all
// of them with a rule they never use (breaking the single-page byte-stability
// contract). Confined to the separate-pages shell, it touches only these pages. Styled
// off default.css's own design tokens so it matches the rail visually. The selector is
// scoped `.enscribe-layout--book .enscribe-toc a.enscribe-book-home` (specificity 0,3,1)
// SO IT WINS the cascade against the general rail-anchor rules it would otherwise inherit:
// `.enscribe-toc a` (0,1,1 — muted color + vertical padding) and
// `.enscribe-layout--book .enscribe-toc a` (0,2,1 — chapter-link left indent + transparent
// left border). A bare `.enscribe-book-home` (0,1,0) loses to both, leaving the masthead
// muted and indented like a rail link; the explicit padding/border-left resets neutralise
// the inherited indent so it reads as a full-width home title.
// Exported (#214) so the shell-layer asset (src/shell/enscribe-shell.css, which the LIVE shell
// links) can be guarded character-identical to this masthead CSS — the STATIC pages inline it
// here, the live shell links it there, and test/shell-assets.test.js asserts they never drift.
export const BOOK_HOME_CSS = `.enscribe-layout--book .enscribe-toc a.enscribe-book-home { display: block; font-family: var(--enscribe-font-sans); font-weight: 700; font-size: 1rem; line-height: var(--enscribe-line-height-tight); color: var(--enscribe-text-primary); text-decoration: none; padding: 0 0 var(--enscribe-space-3); margin-bottom: var(--enscribe-space-3); border-left: 0; border-radius: 0; border-bottom: 1px solid var(--enscribe-border); }
.enscribe-layout--book .enscribe-toc a.enscribe-book-home:hover { color: var(--enscribe-link); }`;

/** Wrap a body in a standalone HTML document with default.css (+ the separate-pages
 *  masthead CSS) inlined and the two C reading-interface scripts (scroll-spy drives the
 *  left rail — a no-op when its links are page URLs; on-this-page drives the right
 *  rail's in-page highlight). */
function pageShell(body, title, defaultCss) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${defaultCss}
${BOOK_HOME_CSS}
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

// The cover/landing page's filename — the single source for both the index map key and
// the return-to-cover masthead href (#206), so they can never drift apart.
const INDEX_PAGE = 'index.html';

/** Render one chapter page: renderChapter content (cross-page refs rewritten) inside
 *  the three-column chrome (chapter rail → page URLs with the current chapter marked
 *  active; on-this-page → this chapter's sub-sections in-page; prev/next → page URLs). */
function renderPage(part, parts, idx, registry, idToUrl, opts) {
  const { proc, file, defaultCss, bookTitle } = opts;
  const chapterHref = (p) => p.slug;

  let content = renderChapter(part.node, registry, { proc, file });
  content = rewriteCrossPageRefs(content, part.id, registry, idToUrl);

  const home = { href: INDEX_PAGE, title: bookTitle };
  const rail = toHtml(buildChapterRail(parts, chapterHref, part.id, home));
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
 *  PAGE (a stable index.html entry point that does not privilege one chapter). The rail
 *  carries the same return-to-cover masthead as the chapter pages (here a self-link to
 *  the cover) so the chrome is uniform across every page. */
function renderIndex(parts, idToUrl, opts) {
  const { defaultCss, bookTitle } = opts;
  // `current: true` — on the cover the masthead is a self-link (index.html → itself), so
  // mark it aria-current="page" rather than presenting a 'home' link to the page you are
  // already on. Chapter pages omit it (their masthead points elsewhere).
  const home = { href: INDEX_PAGE, title: bookTitle, current: true };
  const rail = toHtml(buildChapterRail(parts, (p) => p.slug, null, home));
  const body = `<div class="enscribe-layout enscribe-layout--toc enscribe-layout--book">${rail}<main class="enscribe-body">${coverBodyHtml(bookTitle)}</main></div>`;
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
  pages.set(INDEX_PAGE, renderIndex(parts, idToUrl, opts));
  return pages;
}
