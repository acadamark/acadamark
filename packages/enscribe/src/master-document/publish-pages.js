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
  buildContentsListing,
  chapterNavBar,
  chapterNavArrows,
} from '../interpreter/lib/toc.js';
import { harvestCrossRefRegistry } from '../interpreter/lib/cross-ref-registry.js';
import { rewriteCrossPageHrefs } from './cross-page-links.js';
import { renderChapter } from './render-chapter.js';
import { isEnscribeTag } from '../interpreter/lib/ast-helpers.js';
import { makeTag } from '../core/tag.js';
import {
  collectBookParts,
  assignSlugStems,
  assignIds,
  findBook,
  bookTitleOf,
  escapeHtml,
  coverBodyHtml,
  resolveBookNavConfig,
  resolveBookContentsConfig,
  resolveBookThemeVariant,
  resolveBookTheme,
} from './book-scaffold.js';
import { getThemeCss } from '../interpreter/assets/theme-css.js';
import { SCROLL_SPY_JS } from '../interpreter/assets/scroll-spy-asset.js';
import { ON_THIS_PAGE_JS } from '../interpreter/assets/on-this-page-asset.js';
import { HEAD_ASSET_LINKS } from '../interpreter/assets/font-loader.js';
import {
  composeBookBody,
  BOOK_NAV_NOLEFT_CSS,
  BOOK_NAV_DEPTH_CSS,
  BACK_TO_TOP_CSS,
  BACK_TO_TOP_HTML,
  BACK_TO_TOP_JS,
  CHAPTER_ARROWS_CSS,
} from '../interpreter/assets/book-nav-asset.js';

/** P1 projection: each chapter's PAGE URL is the shared neutral stem + `.html`
 *  (`counting-elephants.html`, `field-data-sheets.html`, `about-this-book.html` — the title slug,
 *  number-free, so the URL is stable whether or not numbering is on). The stem is the byte-stable,
 *  collision-deduped slug computed in book-scaffold; the `.html` suffix is this static
 *  target's own concern (the live path prepends `#` instead). */
function computeSlugs(parts) {
  assignSlugStems(parts);
  for (const p of parts) p.slug = `${p.stem}.html`;
}

/** Rewrite cross-CHAPTER ref hrefs in a rendered chapter fragment to cross-PAGE links — the
 *  separate-pages book case of the ONE shared cross-page resolver (cross-page-links.js). Only a
 *  `<ref>` anchor (`… class="ref"`, via `refsOnly`) is a candidate, so a chapter's footnote/section
 *  anchors stay in-page; the owning chapter comes from the cross-ref registry and maps to its
 *  `<stem>.html` (null when it has no page URL → left in-page). The website composition + the live
 *  SPA call the SAME resolver with their own owner/href injection — no second rewriter. */
function rewriteCrossPageRefs(html, currentChapterId, registry, idToUrl, onUnowned) {
  return rewriteCrossPageHrefs(html, currentChapterId, {
    refsOnly: true,
    // #404 total ownership. A registered ref target's owning page is a TOTAL function of assembled
    // tree position: the nearest <book-part> (its chapter page), else the COVER (index.html) — which
    // is where the assembly slice renders front-region loose content, so the anchor is really there.
    // `chapter: null` no longer means "give up" (the old bare-#anchor dead link at cross-page-links.js
    // line 69); it means "owned by the cover." A NON-registered anchor (a footnote/section local id,
    // absent from the cross-ref registry) is not a cross-page target → null → left in-page, correctly.
    ownerOf: (anchor) => {
      const e = registry.get(anchor);
      if (!e) return null;
      return e.chapter ?? INDEX_PAGE;
    },
    // The URL is a pure function of (owner page, anchor) — never consults emitted output. Every
    // collected book-part is in idToUrl and front-region content maps to the cover, so this is total
    // for a well-formed book. The residual (a book-part id the projection did not emit as a page — a
    // structural anomaly, effectively unreachable) records a diagnostic via onUnowned rather than
    // going silent, then degrades in-page per always-renders (the machine gate is the real backstop).
    hrefFor: (owner, anchor) => {
      if (owner === INDEX_PAGE) return `${INDEX_PAGE}#${anchor}`;
      const url = idToUrl.get(owner);
      if (url) return `${url}#${anchor}`;
      onUnowned?.(anchor, owner);
      return null;
    },
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

/** Wrap a body in a standalone HTML document: default.css (+ the separate-pages masthead
 *  CSS) inlined, the LINKED document assets (fonts + KaTeX, via the shared HEAD_ASSET_LINKS
 *  — #297, so book math/code render styled like the website + single-article shells), and
 *  the two C reading-interface scripts (scroll-spy drives the left rail — a no-op when its
 *  links are page URLs; on-this-page drives the right rail's in-page highlight).
 *
 *  #431: `themeVariant` ('light'/'dark') stamps data-theme-variant on <html> — the hook the
 *  baked dark CSS keys on — so an authored `<config theme-variant=…>` pins the book's default
 *  appearance on every chapter page (mirrors emitDocumentShell / composeWebsiteShellPage). Any
 *  other value (undefined/auto/invalid) stamps nothing, so a book with no pin is byte-identical
 *  to its pre-#431 golden. The reader-tier switch overrides locally on top, unchanged. */
function pageShell(body, title, defaultCss, bookNav, themeVariant, themeCss = '') {
  // Conditional book-nav assets (#221), appended AFTER default.css so a DEFAULT book
  // (chapter-nav on, depth 1, back-to-top off) appends nothing and stays byte-identical.
  const extraCss = [];
  if (!bookNav.chapterNav) extraCss.push(BOOK_NAV_NOLEFT_CSS);
  if (bookNav.chapterNavDepth >= 2) extraCss.push(BOOK_NAV_DEPTH_CSS);
  if (bookNav.backToTop) extraCss.push(BACK_TO_TOP_CSS);
  if (bookNav.pageNavigation) extraCss.push(CHAPTER_ARROWS_CSS);   // #293 — same gate as the bottom prev/next bar
  const css = extraCss.length ? `\n${extraCss.join('\n')}` : '';
  const extraJs = bookNav.backToTop ? `\n<script>${BACK_TO_TOP_JS}</script>` : '';
  const variantAttr = themeVariant === 'light' || themeVariant === 'dark'
    ? ` data-theme-variant="${themeVariant}"` : '';
  // #452: the book's `<config theme>` tokens — a separate <style> AFTER default.css so its `:root`
  // overrides win the cascade, mirroring the compiler's injectTheme. The compiler injected this at the
  // document root, but renderChapter's extractBookPart discarded it (it kept only the <book-part>), so a
  // default-book byte-stays identical (themeCss '') while a themed book now carries its tokens on every page.
  const themeStyle = themeCss ? `\n<style>\n${themeCss}\n</style>` : '';
  return `<!DOCTYPE html>
<html lang="en"${variantAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${HEAD_ASSET_LINKS}
<style>
${defaultCss}
${BOOK_HOME_CSS}${css}
</style>${themeStyle}
</head>
<body>
${body}
<script>${SCROLL_SPY_JS}</script>
<script>${ON_THIS_PAGE_JS}</script>${extraJs}
</body>
</html>
`;
}

/** cover off (#221): the book lands on the first chapter, so index.html is a minimal
 *  redirect to it. The masthead 'home' on every page also points straight at the
 *  chapter, so the redirect only catches a visit to the book root. */
function redirectPage(targetUrl, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=${targetUrl}">
<title>${escapeHtml(title)}</title>
</head>
<body><p><a href="${targetUrl}">${escapeHtml(title)}</a></p></body>
</html>
`;
}

/** Compose a chapter/cover body from the chrome pieces present — delegates to the shared
 *  composeBookBody (single-sourced with the live render) with the back-to-top control. */
function bookBodyHtml(rail, content, prevNext, onThisPage, bookNav, arrows = '') {
  return composeBookBody({
    rail, content, prevNext, onThisPage, arrows,
    backToTop: bookNav.backToTop ? BACK_TO_TOP_HTML : '',
  });
}

// The cover/landing page's filename — the single source for both the index map key and
// the return-to-cover masthead href (#206), so they can never drift apart.
const INDEX_PAGE = 'index.html';

/** Render one chapter page's BODY FRAGMENT: renderChapter content (cross-page refs
 *  rewritten) inside the three-column chrome (chapter rail → page URLs with the current
 *  chapter marked active; on-this-page → this chapter's sub-sections in-page; prev/next →
 *  page URLs). Returned WITHOUT the page shell — the static-website build (#295) hosts this
 *  fragment inside its own universal shell, while publishBookPages wraps it with pageShell
 *  for the standalone artifact. Returns `{ body, title }` (the `<title>` a host shell needs). */
function renderPageBody(part, parts, idx, registry, idToUrl, opts) {
  const { proc, file, bookTitle, bookNav, homeHref } = opts;
  const chapterHref = (p) => p.slug;

  let content = renderChapter(part.node, registry, { proc, file });
  content = rewriteCrossPageRefs(content, part.id, registry, idToUrl, opts.onUnowned);

  const home = { href: homeHref, title: bookTitle };
  // separate-pages section links are cross-page (`page#id`); only built at depth >= 2.
  const railOpts = bookNav.chapterNavDepth >= 2
    ? { navDepth: bookNav.chapterNavDepth, sectionHref: (p, s) => `${p.slug}#${s.id}` }
    : {};
  const rail = bookNav.chapterNav ? toHtml(buildChapterRail(parts, chapterHref, part.id, home, railOpts)) : '';
  const onThisPageNav = bookNav.onThisPage ? buildOnThisPage([part]) : null; // #248
  const onThisPage = onThisPageNav ? toHtml(onThisPageNav) : '';
  const navBar = chapterNavBar(parts, idx, chapterHref);
  const prevNext = (bookNav.pageNavigation && navBar) ? toHtml(navBar) : '';
  // #293 — the persistent edge arrows read the SAME prevNext targets (chapterNavArrows → prevNextParts)
  // and share the page-navigation gate, so they cannot point to a different chapter than the bottom bar.
  const arrowsNav = chapterNavArrows(parts, idx, chapterHref);
  const arrows = (bookNav.pageNavigation && arrowsNav) ? toHtml(arrowsNav) : '';

  const body = bookBodyHtml(rail, content, prevNext, onThisPage, bookNav, arrows);
  const title = part.number ? `${part.number} · ${part.clean} — ${bookTitle}` : `${part.clean} — ${bookTitle}`;
  return { body, title };
}

/** Render one chapter page: its body fragment wrapped in the standalone page shell
 *  (the byte-stable separate-pages artifact). */
function renderPage(part, parts, idx, registry, idToUrl, opts) {
  const { body, title } = renderPageBody(part, parts, idx, registry, idToUrl, opts);
  return pageShell(body, title, opts.defaultCss, opts.bookNav, opts.themeVariant, opts.themeCss);
}

// #404/#406: content authored BEFORE the first book-part is front-region content (book-structuring
// routes it into <book-front>). The separate-pages build renders only book-parts + a synthesized
// cover, so — for it to render at all (projection equivalence) — this front loose content renders on
// the COVER page (its front region's landing page). Extract the <book-front> children that are neither
// the <meta> nor a <book-part> — those are the pre-first-part loose nodes.
export function collectFrontLoose(bookEl) {
  const front = (bookEl.content ?? []).find((r) => isEnscribeTag(r, 'book-front'));
  if (!front || !Array.isArray(front.content)) return [];
  return front.content.filter((n) => !isEnscribeTag(n, 'meta') && !isEnscribeTag(n, 'book-part'));
}

// Render the front loose nodes to an HTML fragment for the cover, mirroring renderChapter's
// wrap-and-stringify (so the fragment is byte-identical to the in-context full render) but extracting
// the <book-body> inner content (the nodes are loose content, not a single <book-part>). '' when empty
// → the cover stays byte-identical for a book with no pre-first-part content.
function renderFrontLoose(nodes, proc, file, registry, idToUrl, onUnowned) {
  if (!nodes || nodes.length === 0) return '';
  const wrapped = { type: 'root', children: [makeTag('book', [makeTag('book-body', nodes)])] };
  const html = String(proc.stringify(wrapped, file));
  const m = html.match(/<book-body[^>]*>([\s\S]*)<\/book-body>/);
  const inner = m ? m[1].trim() : '';
  // #404: the cover's own front-region content can carry cross-page refs (front → a chapter). Rewrite
  // them with the COVER as the current owner, so front→chapter resolves to the chapter page while
  // front→front stays in-page — total ownership leaves no bare dead #anchor on the cover either. When
  // registry/idToUrl aren't threaded (older callers), the fragment is returned unrewritten (unchanged).
  return registry && idToUrl ? rewriteCrossPageRefs(inner, INDEX_PAGE, registry, idToUrl, onUnowned) : inner;
}

/** The landing/index page: the book title + the chapter rail linking to every chapter
 *  PAGE (a stable index.html entry point that does not privilege one chapter). The rail
 *  carries the same return-to-cover masthead as the chapter pages (here a self-link to
 *  the cover) so the chrome is uniform across every page. */
function renderIndexBody(parts, opts) {
  const { bookTitle, bookNav, file, frontHtml = '' } = opts;
  // `current: true` — on the cover the masthead is a self-link (index.html → itself), so
  // mark it aria-current="page" rather than presenting a 'home' link to the page you are
  // already on. Chapter pages omit it (their masthead points elsewhere).
  const home = { href: INDEX_PAGE, title: bookTitle, current: true };
  const railOpts = bookNav.chapterNavDepth >= 2
    ? { navDepth: bookNav.chapterNavDepth, sectionHref: (p, s) => `${p.slug}#${s.id}` }
    : {};
  const rail = bookNav.chapterNav ? toHtml(buildChapterRail(parts, (p) => p.slug, null, home, railOpts)) : '';
  // #226: a `<config toc>` book gets a whole-book contents overview on the cover (the chapter
  // rail is the book's sidebar ToC; this is the landing-page index, the Quarto book pattern).
  // Built from `parts` with the rail's cross-page resolvers. No `<config toc>` → '' → the
  // cover is byte-identical. A `toc-location=left|right` emits a located diagnostic (handled
  // in resolveBookContentsConfig) and still renders here on the cover.
  const contentsCfg = resolveBookContentsConfig(file);
  const contentsHtml = contentsCfg
    ? toHtml(buildContentsListing(parts, {
        chapterHref: (p) => p.slug,
        sectionHref: (p, s) => `${p.slug}#${s.id}`,
        title: contentsCfg.title,
        depth: contentsCfg.depth,
      }))
    : '';
  const body = bookBodyHtml(rail, coverBodyHtml(bookTitle, contentsHtml, frontHtml), '', '', bookNav);
  return { body, title: bookTitle };
}

/** The landing/index page wrapped in the standalone page shell. */
function renderIndex(parts, opts) {
  const { body, title } = renderIndexBody(parts, opts);
  return pageShell(body, title, opts.defaultCss, opts.bookNav, opts.themeVariant, opts.themeCss);
}

/**
 * Publish a numbered book tree as separate per-chapter HTML pages.
 *
 * @param {object} opts
 * @param {object} opts.numbered - the numbered mdast tree (proc.runSync output)
 * @param {object} opts.file - the VFile carrying file.data.enscribeRegistry
 * @param {object} opts.proc - a configured pipeline (its stringify renders chapter content)
 * @param {string} opts.defaultCss - default.css text, inlined into each page's shell
 * @returns {Map<string, string>} filename ('counting-elephants.html', 'index.html', …) → HTML
 */
// Exported (#300 slice 2): the static website composition builder calls this in its Phase-1 site-registry
// pass to get a book-page's `idToUrl` (chapter `<book-part>` id → `<stem>.html`) + cross-ref `registry`
// WITHOUT rendering, so it can tag each book anchor with the CHAPTER-PAGE it renders on. PURE (tree-only).
export function prepareBook(numbered, file) {
  const bookEl = findBook(numbered);
  if (!bookEl) throw new Error('publishBookPages: no <book> element — separate-pages is a book-only build');

  const bookNav = resolveBookNavConfig(file);
  const bookTitle = bookTitleOf(bookEl);
  const parts = collectBookParts(bookEl);
  if (parts.length === 0) throw new Error('publishBookPages: the book has no chapters');

  computeSlugs(parts);
  assignIds(parts, bookEl);                  // before harvest (owner ids) + renderChapter (emitted ids)
  const registry = harvestCrossRefRegistry(numbered, file);
  const idToUrl = new Map(parts.map((p) => [p.id, p.slug]));

  // cover on → the masthead 'home' is the cover (index.html); cover off → the book lands
  // on the first chapter, so 'home' points there and index.html redirects to it (#221).
  const homeHref = bookNav.cover ? INDEX_PAGE : parts[0].slug;
  return { parts, bookNav, bookTitle, registry, idToUrl, homeHref, frontLoose: collectFrontLoose(bookEl) };
}

export function publishBookPages({ numbered, file, proc, defaultCss, onUnowned }) {
  const { parts, bookNav, bookTitle, registry, idToUrl, homeHref, frontLoose } = prepareBook(numbered, file);
  const frontHtml = renderFrontLoose(frontLoose, proc, file, registry, idToUrl, onUnowned);
  // #431: the book's authored default variant (`<config theme-variant=…>`) pins the appearance of
  // every standalone chapter page. Read here (not in prepareBook) so publishBookPageBodies — the
  // website-embedded path, whose fragments carry NO <html> and take the SITE's variant instead — is
  // untouched. pageShell guards the value (light/dark only), so a book with no pin stays byte-identical.
  const themeVariant = resolveBookThemeVariant(file);
  // #452: the book's <config theme> tokens ride the standalone shell too — the compiler injected them at
  // the document root, but extractBookPart discarded them per chapter. A default/unknown theme → '' → the
  // shell stays byte-identical. (publishBookPageBodies, the website-embedded path, is untouched: its book
  // pages take the SITE master's theme via the website shell, like the variant.)
  const bookTheme = resolveBookTheme(file);
  const themeCss = bookTheme ? getThemeCss(bookTheme) : '';
  const opts = { proc, file, defaultCss, bookTitle, bookNav, homeHref, frontHtml, onUnowned, themeVariant, themeCss };
  const pages = new Map();
  parts.forEach((part, idx) => {
    pages.set(part.slug, renderPage(part, parts, idx, registry, idToUrl, opts));
  });
  pages.set(INDEX_PAGE, bookNav.cover
    ? renderIndex(parts, opts)
    : redirectPage(parts[0].slug, bookTitle));
  return pages;
}

/**
 * Publish a numbered book tree as per-chapter BODY FRAGMENTS — the content half of each
 * separate page, WITHOUT the standalone HTML shell. The static-website build (#295) hosts
 * each fragment inside its OWN universal website shell (top nav + universal head), so it
 * does not staple chrome onto a finished book page. The standalone full-page artifact stays
 * with publishBookPages (above) — this is purely additive; neither path changes the other.
 *
 * @param {object} opts - { numbered, file, proc } (no defaultCss — fragments carry no shell).
 * @returns {Map<string, object>} filename → a chapter/cover entry `{ body, title }` (the
 *   composeBookBody fragment + the page `<title>`), or, for a cover-OFF book's index, a
 *   `{ page }` entry carrying the full standalone redirect document (hosted as-is; a
 *   meta-refresh has no body fragment to wrap).
 */
export function publishBookPageBodies({ numbered, file, proc, onUnowned }) {
  const { parts, bookNav, bookTitle, registry, idToUrl, homeHref, frontLoose } = prepareBook(numbered, file);
  const frontHtml = renderFrontLoose(frontLoose, proc, file, registry, idToUrl, onUnowned);
  const opts = { proc, file, bookTitle, bookNav, homeHref, frontHtml, onUnowned };
  const pages = new Map();
  parts.forEach((part, idx) => {
    pages.set(part.slug, renderPageBody(part, parts, idx, registry, idToUrl, opts));
  });
  pages.set(INDEX_PAGE, bookNav.cover
    ? renderIndexBody(parts, opts)
    : { page: redirectPage(parts[0].slug, bookTitle) });
  return pages;
}
