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
import { HEAD_ASSET_LINKS } from '../interpreter/assets/font-loader.js';
import { getRegisteredDsls } from '../interpreter/dsl/registry.js';
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
/* The per-page "open in playground" CTA (#static-live-link): every static page (view-only by design —
   no engine) carries a link to its LIVE counterpart (live/?page=<slug>), where the document renders
   live and a self-contained page (e.g. try-it) edits via ?edit. It rides at the top of the content
   region, right-aligned, below the sticky nav — uniform across every page. */
.enscribe-site .content .enscribe-playground-cta {
  max-width: var(--enscribe-content-width);
  margin: 0 auto var(--enscribe-space-4);
  padding: 0 var(--enscribe-content-padding);
  text-align: right;
  font-family: var(--enscribe-font-sans);
  font-size: 0.875rem;
}
.enscribe-site .content .enscribe-playground-cta a {
  color: var(--enscribe-link);
  text-decoration: none;
  font-weight: 600;
}
.enscribe-site .content .enscribe-playground-cta a:hover { text-decoration: underline; }
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

// The universal head's LINKED assets (document fonts + KaTeX math CSS, in `'link'` form) come from the
// single source HEAD_ASSET_LINKS in font-loader.js — the SAME set the separate-pages page shell links and
// the consolidated injector emits as hast for the full single-page render. Emitted UNCONDITIONALLY (like
// the rest of the head) so the head stays byte-identical across pages: a page without math just carries an
// unused KaTeX stylesheet, harmless. This head is now the SOLE linker of these assets on a website page:
// #296 stripped the article fragment's own KaTeX/fonts links (the static builder renders article fragments
// with documentFontsCss/katexCss:'skip'), so each asset is linked exactly once, here.

// The book reading-interface scripts, appended once at body-end on EVERY page. Each guards on its
// target element (`nav.enscribe-toc` / `nav.enscribe-onthispage` / `[data-enscribe-back-to-top]`)
// and returns immediately when it is absent, so they are pure no-ops on a page without that chrome
// (e.g. a plain article) — uniform shell, no per-page-type branching.
const SHELL_BODY_SCRIPTS =
  `<script>${SCROLL_SPY_JS}</script>\n` +
  `<script>${ON_THIS_PAGE_JS}</script>\n` +
  `<script>${BACK_TO_TOP_JS}</script>`;

// The external-DSL contract marker the diagram handler emits on every diagram's `<pre>` container,
// regardless of render mode (the value is the DSL's registry name). collectDslNames reads it back
// from rendered fragments to learn which DSLs a site uses; the value space is the lowercase
// [a-z0-9-] of a registry name.
const DSL_MARKER_RE = /data-enscribe-dsl="([a-z0-9-]+)"/gi;

/**
 * Collect the `data-enscribe-dsl` marker names present in a rendered content fragment into `into`,
 * the accumulator the static-website build grows across every page to learn the site-wide DSL set
 * (#298). The marker is mode-independent contract markup — it is present whether or not the live
 * runtime is loaded — so scanning the rendered body is the canonical "does this page use mermaid/abc"
 * signal, independent of which delivery the runtime takes.
 *
 * @param {string} contentHtml - a page's rendered content fragment.
 * @param {Set<string>} into   - the site-wide accumulator (returned for convenience).
 * @returns {Set<string>}
 */
export function collectDslNames(contentHtml, into = new Set()) {
  for (const m of String(contentHtml ?? '').matchAll(DSL_MARKER_RE)) into.add(m[1].toLowerCase());
  return into;
}

/**
 * Build the universal head's live-diagram runtime block (#298): for each REGISTERED external DSL the
 * site uses, the DSL's pinned-CDN `<script src>` (the library — browser-cached across pages, NEVER
 * inlined) followed by its init `<script>`, in registry order. Returns '' when the site uses no DSL,
 * so a diagram-free site's head is byte-unchanged.
 *
 * This is the live-link delivery (CDN `<script src>`), relocated from the per-document body — where
 * `injectDslAssets` prepends it — to the ONE universal head: a book chapter's body-injected runtime is
 * sliced off by extractBookPart, and an article fragment's would duplicate within the page, so for a
 * website the runtime belongs in the shared head (the same single-source location as the KaTeX/fonts
 * links). The CDN URL + init script are REUSED from each DSL's `liveAssets` (the same pinned versions
 * the standalone live-link render emits — cdn-versions.test.js guards them), never hardcoded here. The
 * inits are head-safe: mermaid uses `startOnLoad` (its own DOMContentLoaded scan) and abc's init guards
 * on `document.readyState`, so both defer to after the body parses even though they run in the head.
 *
 * Passed UNCHANGED to every page so the universal head stays byte-identical across pages: each page
 * runs its own diagrams, and a DSL's init is a no-op on a page whose body has none of its markers.
 *
 * @param {Iterable<string>} dslNames - the site-wide `data-enscribe-dsl` names (collectDslNames output).
 * @returns {string} the head's diagram-runtime HTML, or '' if the site uses no registered DSL.
 */
export function buildWebsiteDslHead(dslNames) {
  const present = new Set(dslNames);
  const blocks = [];
  for (const dsl of getRegisteredDsls()) {
    if (!present.has(dsl.name)) continue;
    const { cdnUrl, initScript } = dsl.liveAssets;
    blocks.push(
      `<script src="${escapeHtml(cdnUrl)}"></script>\n<script>${initScript}</script>`,
    );
  }
  return blocks.join('\n');
}

/**
 * Compose a full static website page: the universal head, the sticky top nav (the outer frame),
 * and the page's content fragment in `<div class="content">`.
 *
 * @param {object} o
 * @param {string} o.defaultCss - default.css text, inlined into the universal head.
 * @param {string} o.title      - the page `<title>`.
 * @param {string} o.topBar     - the website top bar (buildWebsiteTopBar output).
 * @param {string} o.content    - the page's content fragment (article or book body).
 * @param {string} [o.dslHead]  - the live-diagram runtime block for the universal head
 *        (buildWebsiteDslHead output); '' (the default) leaves the head byte-unchanged. #298.
 * @param {string} [o.playgroundHref] - the page's LIVE counterpart URL (e.g. `live/?page=<slug>`,
 *        depth-relative). When set, a uniform "open in playground" link is emitted at the top of the
 *        content region — the static site's (view-only) path to its live, editable twin. Omitted ⇒ no
 *        link (head byte-unchanged), so a non-website caller is unaffected.
 * @returns {string} a standalone `<html>` document.
 */
export function composeWebsiteShellPage({ defaultCss, title, topBar, content, dslHead = '', playgroundHref }) {
  const cta = playgroundHref
    ? `<div class="enscribe-playground-cta"><a href="${escapeHtml(playgroundHref)}">Open in playground ↗</a></div>\n`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title || 'Enscribe')}</title>
${HEAD_ASSET_LINKS}
<style>
${universalHeadStyle(defaultCss)}
</style>${dslHead ? `\n${dslHead}` : ''}
</head>
<body>
<div class="enscribe-site">
${topBar}
<div class="content">
${cta}${content}
</div>
</div>
${SHELL_BODY_SCRIPTS}
</body>
</html>
`;
}
