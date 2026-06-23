// The static website shell (#295) — one frame for every page.
//
// A website is built like a normal site: ONE shell owns the page frame (a universal head +
// the sticky top nav), and each page's CONTENT FRAGMENT is pasted into it. There is no
// body-extraction and no chrome stapled onto a finished page — the bug #295 fixes (the old
// decorateBookPage did `replace(/<body…>/, …topBar…)`, and WEBSITE_NAV_CSS carries the literal
// `<body>` inside a CSS comment, so the top bar was spliced into the stylesheet in <head> as
// dead text and the book top nav never rendered). With the shell wrapping a fragment, the top
// nav is the OUTER frame and is visible by construction.
//
// The two fragments hosted here are uniform:
//   - an ARTICLE fragment — what renderArticleDocument returns (a `<article>` content fragment,
//     carrying its own per-page asset <link>/<style>/<script> inline, as today);
//   - a BOOK fragment — the chapter body (chapter rail + reading column) that composeBookBody
//     builds, exposed by publishBookPageBodies BEFORE pageShell wraps it.
//
// This module is a PURE string builder (no fs), like composeBookBody / pageShell — the caller
// (the CLI static-website build) reads default.css and passes it in.

import { WEBSITE_NAV_CSS } from '../interpreter/assets/website-nav-asset.js';
import {
  BOOK_NAV_NOLEFT_CSS,
  BOOK_NAV_DEPTH_CSS,
  BACK_TO_TOP_CSS,
  BACK_TO_TOP_JS,
} from '../interpreter/assets/book-nav-asset.js';
import { SCROLL_SPY_JS } from '../interpreter/assets/scroll-spy-asset.js';
import { ON_THIS_PAGE_JS } from '../interpreter/assets/on-this-page-asset.js';
import { KATEX_CDN_URL, DOCUMENT_FONTS_CDN_URL } from '../interpreter/assets/font-loader.js';
import { BOOK_HOME_CSS } from './publish-pages.js';
import { escapeHtml } from './book-scaffold.js';

// The static shell's own CSS — the content region below the sticky top nav. The body itself is
// reset to full width by WEBSITE_NAV_CSS's `body:has(.enscribe-site)` rule (every page is wrapped
// in `.enscribe-site`, so that reset still fires — unchanged from slice 1). These rules then:
//   - constrain a bare article fragment to the reading column and centre it (a book / toc fragment
//     carries its OWN `.enscribe-layout--*` width + centring, so it is left untouched: the
//     `.content > article` selector matches ONLY a top-level <article>, which a book/toc layout
//     never has at the top level);
//   - push the book's full-height chapter rail / an article ToC / the right on-this-page rail
//     BELOW the sticky nav (default.css sticks them at `top: space-8` ≈ 2rem, which would slide
//     them UNDER the 3.25rem nav — these overrides clear it). Same `@media` + higher specificity
//     (0,3,0 > 0,1,0) so they win the cascade.
export const WEBSITE_SHELL_CSS = `
/* Static website shell (#295): each page's content fragment sits below the sticky top nav. */
.enscribe-site .content { padding-top: var(--enscribe-space-6); }
.enscribe-site .content > article {
  max-width: var(--enscribe-content-width);
  margin: 0 auto;
  padding: 0 var(--enscribe-content-padding);
}
@media (min-width: 900px) {
  .enscribe-site .content .enscribe-toc,
  .enscribe-site .content .enscribe-onthispage {
    top: calc(var(--enscribe-site-nav-height, 3.25rem) + var(--enscribe-space-4));
    max-height: calc(100vh - var(--enscribe-site-nav-height, 3.25rem) - var(--enscribe-space-8));
  }
  /* Cover↔chapter jump: the book COVER has no right rail (a 2-col grid), the chapters have one (a
     3-col grid), so the centred grid recenters wider on a chapter and the chapter rail + reading
     column shift sideways. Give the cover the chapter's 3-col template + max-width (an empty reserved
     right column) so moving cover↔chapter does not move the layout. Website-only (scoped to
     .enscribe-site .content) — the standalone separate-pages book's own pageShell is untouched. */
  .enscribe-site .content .enscribe-layout--book:not(.enscribe-layout--book-3col) {
    grid-template-columns: 14rem minmax(0, var(--enscribe-content-width)) 13rem;
    max-width: calc(14rem + var(--enscribe-space-12) + var(--enscribe-content-width) + var(--enscribe-space-12) + 13rem);
  }
}`;

/** The ONE universal website head — the union of every page type's current head-assets. Article
 *  heads carry default.css + WEBSITE_NAV_CSS; book heads (pageShell) carry default.css +
 *  BOOK_HOME_CSS (+ conditional book-nav CSS) and the website added WEBSITE_NAV_CSS. This union
 *  folds them all together: default.css, the nav/dropdown CSS (slice 1, unchanged), the book
 *  pageShell CSS (the #206 masthead + the chapter-rail / reading-column rules live in default.css),
 *  and the conditional book-nav CSS — each scoped to a class that only appears when its feature is
 *  active (`--book-noleft`, `.enscribe-rail-sections`, `.enscribe-back-to-top`), so it is INERT on a
 *  page that does not use it and is safe to include on every page. WEBSITE_SHELL_CSS is last so its
 *  content-region overrides win. (The KaTeX + document-fonts CSS are LINKED separately — see
 *  HEAD_ASSET_LINKS — not inlined here.) */
function universalHeadStyle(defaultCss) {
  return [
    defaultCss,
    WEBSITE_NAV_CSS,
    BOOK_HOME_CSS,
    BOOK_NAV_NOLEFT_CSS,
    BOOK_NAV_DEPTH_CSS,
    BACK_TO_TOP_CSS,
    WEBSITE_SHELL_CSS,
  ].join('\n');
}

// The universal head's LINKED assets — the document fonts (Inter body + Source Code Pro code) and
// the KaTeX math CSS, in `'link'` form (the website is multi-page + linked-not-baked). These are the
// SAME assets/versions the full single-page render and the article fragments use — reused via the
// exported constants, never a hardcoded URL. Emitted UNCONDITIONALLY (like the rest of the head) so
// the head stays byte-identical across pages: a page without math just carries an unused KaTeX
// stylesheet, harmless. This is the fix for book pages rendering math, fonts (and so code) UNSTYLED —
// the separate-pages pageShell only inlines default.css + the book CSS and never linked these, so
// book math fell back to bare KaTeX HTML and code to a system mono font. (Article fragments still
// carry their own KaTeX/fonts links too → article pages now link KaTeX twice, head + fragment; the
// browser dedups the fetch. Making the head the single asset source + stripping per-fragment assets
// is the externalisation follow-up, not this slice.) NB: there is no separate syntax-highlight
// stylesheet — enscribe emits plain `<pre><code class="language-X">` (no token spans); code styling
// is default.css's `pre`/`code` rules (already in the head) + the Source Code Pro web font here.
const HEAD_ASSET_LINKS =
  `<link rel="stylesheet" href="${escapeHtml(DOCUMENT_FONTS_CDN_URL)}">\n` +
  `<link rel="stylesheet" href="${escapeHtml(KATEX_CDN_URL)}">`;

// The book reading-interface scripts, appended once at body-end on EVERY page. Each guards on its
// target element (`nav.enscribe-toc` / `nav.enscribe-onthispage` / `[data-enscribe-back-to-top]`)
// and returns immediately when it is absent, so they are pure no-ops on a page without that chrome
// (e.g. a plain article) — uniform shell, no per-page-type branching.
const SHELL_BODY_SCRIPTS =
  `<script>${SCROLL_SPY_JS}</script>\n` +
  `<script>${ON_THIS_PAGE_JS}</script>\n` +
  `<script>${BACK_TO_TOP_JS}</script>`;

/**
 * Compose a full static website page: the universal head, the sticky top nav (the outer frame),
 * and the page's content fragment in `<div class="content">`.
 *
 * @param {object} o
 * @param {string} o.defaultCss - default.css text, inlined into the universal head.
 * @param {string} o.title      - the page `<title>`.
 * @param {string} o.topBar     - the website top bar (buildWebsiteTopBar output).
 * @param {string} o.content    - the page's content fragment (article or book body).
 * @returns {string} a standalone `<html>` document.
 */
export function composeWebsiteShellPage({ defaultCss, title, topBar, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title || 'Enscribe')}</title>
${HEAD_ASSET_LINKS}
<style>
${universalHeadStyle(defaultCss)}
</style>
</head>
<body>
<div class="enscribe-site">
${topBar}
<div class="content">
${content}
</div>
</div>
${SHELL_BODY_SCRIPTS}
</body>
</html>
`;
}
