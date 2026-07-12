// Static website build (#246 / #278). The static sibling of build-live.js: given a
// `<meta type=website>` master, walk its nav and emit a DIR-PER-PAGE static HTML site —
// a page → `<slug>/index.html`; the HOME page → the dist-root `index.html`; a page that is
// itself a `<meta type=book>` master → its per-chapter pages nested under the page's dir.
//
// PLACEMENT (a verify-first call): this lives beside build-live.js — a Node/fs, build-time
// module — NOT in master-document/, whose siblings (live-website.js, publish-pages.js) are
// browser-PURE (live-website.js is mounted in the browser). It FOLLOWS live-website.js's
// shape (the static counterpart of the live website) but, like build-live.js, owns the fs +
// asset side of a build, so the enscribe package stays browser-safe.
//
// RENDER MODEL (#300 slice 2 — COMPOSITION, replacing the #278 per-page-isolated model): the site is built
// by COMPOSITION over a merged site cross-ref registry — NOT by flattening every page to one page-scope
// assembly (the synthetic-`<book>` flatten the live SPA once used; removed in #320 — both surfaces now
// compose), and NOT by the per-page-ISOLATED render that bypassed the site registry (the #300 regression:
// a cross-page `<ref>` could not resolve, since each page was a separate pass). Two numbering/render phases,
// then a framing pass.
// PHASE 1 numbers each page in its OWN native
// scope — an article as an article, a book as a book (assembleAndNumber/prepareBook) — and harvests its
// cross-ref registry, MERGING every anchor into ONE site registry (anchor → its NATIVE number + the
// page/chapter-page that owns it). PHASE 2 renders each page NATIVELY through the SAME shared per-document
// path the CLI single-document build uses (renderArticleDocument for an article, assembleAndNumber +
// publishBookPageBodies for a book), with the page's numbering registry pre-seeded to a read-through over the
// site registry — so a cross-page `<ref>` resolves to its target's native number — then rewrites the outbound
// ref href to the owning page's file. Each page is framed by the ONE static website shell
// (composeWebsiteShellPage, #295). Nothing is flattened: books keep book numbering, articles keep article
// numbering, and cross-page refs resolve in every direction. A website page passes only assetsDir, keeping
// its embed/dsl at the library defaults (a multi-page site does not inline KaTeX CSS into every page).

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { VFile } from 'vfile';
import {
  publishBookPageBodies,
  composeSiteRegistry,
  flattenNavPages,
  extractDocumentTitle,
  buildWebsiteTopBar,
  composeWebsiteShellPage,
  collectDslNames,
  buildWebsiteDslHead,
  slugifyPage,
  resolvePageSlug,
  allocatePageSlug,
  rewriteCrossPageHrefs,
  notFoundViewHtml,
  pageErrorViewHtml,
  NOT_FOUND_SLUG,
} from '@enscribejs/enscribe';
import { ENSCRIBE_NAV_MODEL, ENSCRIBE_REGISTRY, ENSCRIBE_PAGE_LINK_RESOLVER } from '@enscribejs/enscribe/core/file-data-keys';
import { classifyDocTypeFromSource } from '@enscribejs/enscribe/interpreter/lib/classify-doc-type';
import { buildDocumentPipeline, renderArticleFile, renderArticleTreeFile, assembleAndNumber } from './render-document.js';
import { diagnosticsScript } from './diagnostics.js';

/**
 * Walk the nav tree and map each page slug → its OUTPUT nav-path: the slugified titles of the groups
 * it sits under, then the page's own slug (`references/eHTML/export`). The home page (the first nav
 * page) maps to `''` (the dist root). The group nesting is NOT in flattenNavPages's flat list, so this
 * walks the tree directly. Group segments use slugifyPage — the same slugifier website-structuring uses
 * for page slugs (one implementation, no drift).
 *
 * @param {Array} entries - ENSCRIBE_NAV_MODEL.entries (the page / group tree)
 * @param {string} homeSlug - the first nav page's slug (it maps to the root)
 * @returns {Map<string,string>} slug → navPath ('' for home)
 */
function buildNavPaths(entries, homeSlug) {
  const map = new Map();
  const walk = (nodes, prefix) => {
    for (const e of nodes ?? []) {
      if (e?.kind === 'group') walk(e.children, [...prefix, slugifyPage(e.title)]);
      else if (e?.kind === 'page') map.set(e.slug, e.slug === homeSlug ? '' : [...prefix, e.slug].join('/'));
    }
  };
  walk(entries, []);
  return map;
}

/**
 * Resolve a nav `<item src>` to a renderable source file — the #278 page-body model. NO
 * resolver existed before (verify-first): a bare `src="home"` pointing at the page-directory
 * `home/` (whose body is `home/index.emd`) is what makes the live copy-path throw EISDIR.
 *
 *   <src> is a directory      → <src>/index.emd   (the page-directory body)
 *   <src>.emd exists          → <src>.emd         (a flat page)
 *   <src> is itself a file    → <src>             (src already carried its extension)
 *
 * @returns {{ sourcePath: string, pageDir: string }|null} null if unresolved.
 */
export function resolvePageSource(masterDir, src) {
  const direct = join(masterDir, src);
  if (existsSync(direct) && statSync(direct).isDirectory()) {
    const idx = join(direct, 'index.emd');
    if (existsSync(idx)) return { sourcePath: idx, pageDir: direct };
    // A directory without index.emd is not itself a page body — fall through to a sibling
    // `<src>.emd` rather than failing here (so a `mybook/` chapter dir does not shadow a `mybook.emd`).
  }
  if (existsSync(`${direct}.emd`)) return { sourcePath: `${direct}.emd`, pageDir: masterDir };
  if (existsSync(direct) && statSync(direct).isFile()) return { sourcePath: direct, pageDir: dirname(direct) };
  return null;
}

/**
 * Co-located, non-source files in a page-directory (images, data) that travel with the page — e.g. a
 * `<fig src=elephant.jpg>` example image sitting beside the chapter that references it. The figure
 * handler emits `<img src="elephant.jpg">` verbatim, so the asset must ship at the page's own depth or
 * it 404s (#fig-404). Returns `{from, to}` pairs (`to` = `destPrefix` + filename). The `pageDir ===
 * masterDir` guard is deliberate: a flat page shares the master directory, and scanning that would copy
 * unrelated top-level files (built site chrome, READMEs) — only a page with its OWN subdirectory has a
 * private asset set. SINGLE AUTHORITY for "what co-located files travel with a page": the live build
 * (build-live.js) calls this with `destPrefix=`${src}/`` to copy the SAME set PER-FOLDER under the page's
 * dir (#352 — the live SPA resolves a page's `<img src>` against `<src>/`, matching the static tree).
 */
export function pageDirAssets(pageDir, masterDir, destPrefix) {
  if (pageDir === masterDir) return []; // a flat page has no private dir of its own
  const out = [];
  for (const name of readdirSync(pageDir)) {
    const full = join(pageDir, name);
    if (!statSync(full).isFile()) continue;
    if (extname(name) === '.emd') continue; // sources are rendered, not copied
    out.push({ from: full, to: `${destPrefix}${name}` });
  }
  return out;
}

// #408: the referenced-vs-shipped audit (+ referenced-subdirectory shipping). pageDirAssets
// ships a page dir's TOP-LEVEL files; nothing verified that what a page's markup actually
// REFERENCES exists and ships — a renamed image broke silently, and a child-subdirectory
// asset (now correctly rebased by the universal src rebase) could never ship at its
// referenced path. This scan closes both: every relative src attribute in a page's content
// region either ships at its referenced dest path (so the URL-depth resolution is correct
// by construction — the file lands exactly where the reference points) or produces a
// visible build warning. <pre>/<code>/<script> regions are stripped first (docs pages
// demonstrate src= syntax in escaped examples; the recap script carries JSON).
const STRIPPABLE_RE = /<(pre|code|script)\b[\s\S]*?<\/\1>/gi;
function auditReferencedAssets(html, baseDir, destPrefix, shipped, warnings, label) {
  const out = [];
  const scannable = html.replace(STRIPPABLE_RE, '');
  for (const m of scannable.matchAll(/\bsrc="([^"]+)"/g)) {
    const src = m[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|@|#)/i.test(src)) continue; // URLs, absolute, store refs, fragments
    const to = `${destPrefix}${src}`;
    if (shipped.has(to)) continue;
    shipped.add(to);
    const from = join(baseDir, src);
    let ok = false;
    try { ok = statSync(from).isFile(); } catch { /* missing */ }
    if (ok) out.push({ from, to });
    else warnings.push(`page "${label}": referenced asset "${src}" not found under ${baseDir} — the emitted page will 404 it (#408)`);
  }
  return out;
}

// #295: the per-page-type composition (composeArticlePage / decorateBookPage) is retired. ONE
// shell (composeWebsiteShellPage) now frames every page — the universal head + the sticky top
// nav (the outer frame) + the page's content fragment in `.content`. The book top nav is visible
// by construction (no `replace(/<body…>/, …)` to mis-splice the bar into a CSS comment in <head>).

/**
 * Build the whole static site from a website master.
 *
 * @param {object} opts
 * @param {string} opts.masterSource - the `<meta type=website>` master .emd source
 * @param {string} opts.masterDir    - the master's directory (page srcs resolve relative to it)
 * @param {string} opts.defaultCss   - default.css text, inlined into each page
 * @returns {{ pages: Map<string,string>, assets: Array<{from,to}>, warnings: string[] }}
 *   pages: outputPath → HTML; assets: co-located files to copy; warnings: non-fatal diagnostics.
 */
// #393/W12 — per-page head metadata (favicon links, meta description, OpenGraph/Twitter cards). The
// site's absolute base URL is needed for the ONE head field that cannot be depth-relative: og:image,
// which a crawler fetches out of page context. Defaults to the production domain the deploy declares
// (.github/workflows/static.yml commits CNAME=enscribe.org → served at the domain root); a caller may
// override via the buildStaticWebsite option if the deploy target changes. A trailing slash is assumed.
const DEFAULT_SITE_BASE_URL = 'https://enscribe.org/';

/** Escape a string for use inside an HTML double-quoted attribute value. */
function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A meta-description derived from a rendered page's first prose paragraph: the first `<p>…</p>`'s
 *  text with inline tags stripped, the handful of entities the renderer emits decoded, whitespace
 *  collapsed, and truncated at a word boundary to ~155 chars. '' when the page has no paragraph — the
 *  caller then omits the description tags rather than emitting a weak one. */
function firstParagraphText(contentHtml) {
  const m = String(contentHtml).match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return '';
  let text = m[1]
    .replace(/<[^>]+>/g, '')                                   // strip inline tags (ref/cite anchors, emphasis, …)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (text.length > 155) text = text.slice(0, 155).replace(/\s+\S*$/, '') + '…';
  return text;
}

/** Compose the extra `<head>` tags for one page: favicon links (depth-relative via `up`), a meta
 *  description (omitted when empty), and OpenGraph/Twitter cards. og:image is the ONE absolute URL
 *  (siteBaseUrl + the deployed 512px mark) — a share crawler has no page context to resolve a relative
 *  one. Every attribute value is escaped. */
function buildHeadMeta({ up, description, ogTitle, siteName, siteBaseUrl }) {
  const ogImage = escAttr(`${siteBaseUrl}assets/icon-512.png`);
  const desc = escAttr(description);
  const lines = [
    `<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="${up}assets/favicon.ico" sizes="any">`,
    `<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escAttr(siteName)}">`,
    `<meta property="og:title" content="${escAttr(ogTitle)}">`,
    `<meta property="og:image" content="${ogImage}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escAttr(ogTitle)}">`,
    `<meta name="twitter:image" content="${ogImage}">`,
  ];
  if (description) {
    lines.push(
      `<meta name="description" content="${desc}">`,
      `<meta property="og:description" content="${desc}">`,
      `<meta name="twitter:description" content="${desc}">`,
    );
  }
  return lines.join('\n');
}

export function buildStaticWebsite({ masterSource, masterDir, defaultCss, siteBaseUrl = DEFAULT_SITE_BASE_URL, diagnostics = null }) {
  const warnings = [];

  // 1. Parse the master → the S1 nav model on file.data. (Nav-model extraction, not a page render —
  //    it just needs the structuring pass; it shares the one pipeline constructor all the same.)
  const navProc = buildDocumentPipeline({ assetsDir: masterDir });
  const navFile = new VFile({ path: 'index.emd', value: masterSource });
  navProc.runSync(navProc.parse(masterSource), navFile);
  // Surface the nav-parse diagnostics — website-structuring raises real ones (a duplicate page slug,
  // a pipe-label nav-group, a zero-entry nav). They live on navFile.messages. Through the
  // diagnostics seam when the caller passed one (#402 — this loop was the seam's one pre-existing
  // ancestor, the audit's "one exception"); the legacy warnings[] account otherwise (callers and
  // tests without a collector).
  if (diagnostics) {
    diagnostics.report(navFile);
  } else {
    for (const m of navFile.messages ?? []) {
      warnings.push(m.ruleId ? `nav: ${m.ruleId}: ${m.reason}` : `nav: ${m.reason ?? m}`);
    }
  }
  const navModel = navFile.data?.[ENSCRIBE_NAV_MODEL] ?? { entries: [] };
  const entries = navModel.entries ?? [];
  const pages = flattenNavPages(entries);
  if (pages.length === 0) throw new Error('website master has a <meta type=website> but no nav pages');

  // 2. PRE-PASS (#300/#299 slice 1): a page's SLUG is its stable identity, via the ONE three-tier
  //    resolver (resolvePageSlug — the single home in website-structuring.js, retiring this file's
  //    private META_SLUG_RE + inline title fallback): (1) `<meta slug>`, else (2) `<meta title>`,
  //    else (3) the nav menu title, through the one slugifyPage. We harvest every page up front (so
  //    an `<a {slug}>` can target ANY page), REMAP the nav model's page.slug to it (so buildNavPaths
  //    + the chrome + every link key use it uniformly), and build slug → {title, isDerived, src}.
  //    Collisions are ALWAYS-RENDER (allocatePageSlug; never a build error): a derived (tier 2/3)
  //    duplicate uniquifies + warns; a pinned `<meta slug>` duplicate is NOT renamed — it warns and
  //    its links are ambiguous (the per-link non-resolution is #299 slice 3), but the build completes.
  const pageData = [];                 // [{ page, resolved, source, slug, isBook }] in nav order
  const failedPages = [];              // #405: [{ slug, title, reason }] — each ships an error page at its address
  const pageInfo = new Map();          // slug → { title, isDerived, src }
  // #404: `not-found` is RESERVED — the lazy not-found page emits at `not-found/index.html`, so no author
  // page may take that slug (else the framing pass would clobber the user's page with the not-found view).
  // Seed it into usedSlugs so allocatePageSlug uniquifies a page titled "Not Found" to `not-found-2` etc.
  const usedSlugs = new Set([NOT_FOUND_SLUG]);   // site-wide slug allocation (the resolver + always-render dedup)
  // The page's OWN document class — the shared classifier (1-C from #316) over a PARSED tree, so a
  // `<meta>` inside a code EXAMPLE is correctly skipped (it is a code node, not an enscribeTag). This
  // replaces a raw-source regex that matched the first literal `type=` and could mis-read an example.
  // One parse-only proc, reused across pages (parse ignores assetsDir).
  const classifyProc = buildDocumentPipeline({});
  for (const page of pages) {
    // #417: an inline `<item | Title>` page has NO `src` child file — it is the zero-length-splice
    // case of §Transclusion: its page content is the body authored in the master (captured by the
    // website structurer as `page.body`). Build it into an article tree that renders as a standalone
    // page; its assets resolve against the master dir. (Do NOT call resolvePageSource with an
    // undefined src — that is the #417 TypeError; the inline form is legal by construction.)
    let resolved, source, tree;
    let isBook = false;
    if (page.src == null) {
      tree = { type: 'root', children: page.body ?? [] };
      source = '';                                   // no child file; the slug derives from the nav title
      resolved = { sourcePath: join(masterDir, `${page.slug || 'index'}.emd`), pageDir: masterDir };
    } else {
      resolved = resolvePageSource(masterDir, page.src);
      if (!resolved) {
        // #405: the page cannot be read — it degrades to an ERROR PAGE AT ITS OWN ADDRESS
        // (the decision: never a silent skip, never a chrome link into a 404). The nav
        // entry keeps its structurer slug; the stub emits after the render loop.
        warnings.push(`nav item src "${page.src}" did not resolve to a .emd or page-directory — its address ships the failed-page view (#405)`);
        failedPages.push({ slug: page.slug, title: page.title || page.slug, reason: `source "${page.src}" could not be read` });
        continue;
      }
      source = readFileSync(resolved.sourcePath, 'utf8');
      isBook = classifyDocTypeFromSource(source, classifyProc).type === 'book';
      // #404 marker 7: interstitial master content authored after this `<item src>` (captured as
      // `page.body` by the website structurer) JOINS this page. For an ARTICLE page, splice it as
      // trailing content of ONE tree — so a figure in the interstitial numbers within this page and
      // its ids are owned by this page (the routing invariant needs the ids on a real page) — and
      // render via the tree seam. No interstitial → tree stays unset → source render, byte-identical.
      if (!isBook && page.body && page.body.length > 0) {
        tree = classifyProc.parse(source);
        tree.children.push(...page.body);
      } else if (isBook && page.body && page.body.length > 0) {
        // A book page's insertion point for trailing article-level content is not yet defined
        // (the book renders per-chapter); flag rather than silently drop — a rare authoring edge,
        // scoped as a follow-on to marker 7 (which covers article pages).
        warnings.push(
          `page "${page.src}": interstitial content after a book <item src> is captured but not yet ` +
          `rendered — the book-page insertion point is a follow-on (#404 marker 7 covers article pages)`,
        );
      }
    }
    const { slug: baseSlug, pinned, title, rawMetaSlug } = resolvePageSlug({
      source, navTitle: page.title || page.slug, src: page.src,
    });
    const pageTitle = title || page.slug;  // display title for <a> auto-labels (resolver's title else slug)
    if (pinned && rawMetaSlug && baseSlug !== rawMetaSlug) {
      warnings.push(
        `page "${page.src}": <meta slug="${rawMetaSlug}"> was normalized to "${baseSlug}" — ` +
        `author internal links to it as <a ${baseSlug}> (slugs are lowercase letters, digits, hyphens).`,
      );
    }
    const slug = allocatePageSlug(baseSlug, pinned, usedSlugs, (kind, s) => {
      warnings.push(
        kind === 'pinned'
          ? `#300: duplicate pinned slug "${s}" (<meta slug>) on "${page.src}" — not renamed; links to it are ` +
            `ambiguous and won't resolve, but the build completes`
          : `#300: duplicate page slug "${s}" — "${page.src}" disambiguated; give it a distinct ` +
            `<meta slug=…> or title so the public URL is stable`,
      );
    });
    pageInfo.set(slug, { title: pageTitle, isDerived: !pinned, src: page.src });
    page.slug = slug;                  // remap the nav model → the unified slug is the page's identity
    pageData.push({ page, resolved, source, tree, slug, isBook });
  }
  // #405: an all-pages-failed site still BUILDS — shell + a failed-page stub per nav entry +
  // the loud summary (never a crash, never empty silence). Only a genuinely empty nav —
  // nothing resolvable AND nothing that failed — is a hard authoring error.
  if (pageData.length === 0 && failedPages.length === 0) throw new Error('website master <nav> has no resolvable pages');

  // 3. Output location mirrors the nav TREE (slice 1): group segments (slugified group titles) + the
  //    page's slug; home (the first nav page) → the dist root. Now keyed on meta-slugs (remapped above).
  const homeSlug = pages[0].slug;
  const masterTitle = extractDocumentTitle(masterSource) || 'Enscribe';
  const navPathOf = buildNavPaths(entries, homeSlug);

  // Links are PRETTY trailing-slash path URLs, RELATIVE to the current page's depth. Two link layers:
  //   - the chrome's `?page=slug` (live-SPA router form) → the target's `<navPath>/` (staticize, PASS 2);
  //   - an authored `<a {slug}>` internal link, the <a> handler's `<a data-page-slug="X">` marker
  //     → the target's `<navPath>/`, auto-labelled with the target's TITLE when the link has no text
  //     (makePageLinkResolver, injected on file.data per page in PHASE 2 — the engine resolves the marker
  //     IN-TREE at render time via resolvePageSlugLinksInTree, so a nested-element/link label is walked
  //     structurally, never regex-captured, and no HTML is re-parsed: 1-G / #318).
  // ALWAYS-RENDERS (1-G / 2-C, the always-render decision): a `<a {slug}>` to a missing page DEGRADES —
  // the label text stays, the live href is dropped, and the `ref-error` marker class flags it — and the
  // build COMPLETES with a warning, never a thrown build. A link to a DERIVED (un-pinned) slug warns.

  // The depth-relative path from a page at `outPath` up to a target slug's pretty URL. Shared by the
  // `?page=` chrome rewrite (staticize) and the `<a {slug}>` resolver, so the dist-root walk has one home.
  const relToFor = (outPath) => {
    const up = '../'.repeat((outPath.match(/\//g) || []).length);
    return (slug) => { const np = navPathOf.get(slug); return np === '' ? (up || './') : `${up}${np}/`; };
  };

  // The page's LIVE counterpart URL (#static-live-link): the static site (view-only — no engine) at
  // `<up>/` links to the live SPA at `<up>live/`, routed to this page via `?page=<slug>` (the SAME slug
  // the live SPA routes on — resolvePageSlug is shared). For a BOOK CHAPTER page the static URL is
  // `<book-dir>/<stem>.html`; its live twin is `?page=<slug>&chapter=<stem>` (chapter-as-page) — so the
  // static chapter page links to its EXACT live chapter, not just the book cover (static↔live parity).
  // Depth-relative (static at root, live at `/live/`). The `?page=` here is the LIVE route, NOT a chrome
  // link, so the (tightened) `staticize` — which rewrites only `href="?page=…"` chrome links — leaves it intact.
  const liveHrefFor = (outPath, slug, chapterStem = null) =>
    `${'../'.repeat((outPath.match(/\//g) || []).length)}live/?page=${slug}${chapterStem ? `&chapter=${chapterStem}` : ''}`;

  // Build the authored `<a {slug}>` internal-link resolver for a page rendered at `outPath` (#318). It is
  // INJECTED on the page's file.data (ENSCRIBE_PAGE_LINK_RESOLVER) and the engine runs it over the in-memory
  // hast `<a data-page-slug>` markers at render time — no post-serialize re-parse. A resolvable slug → its
  // depth-relative URL (+ the target's title when the authored label is empty); a missing slug → DEGRADE
  // (the engine drops the href + flags `ref-error`, the label stays); a derived (un-pinned) slug → warn.
  const makePageLinkResolver = (outPath, currentSlug) => {
    const relTo = relToFor(outPath);
    return (slug, { empty }) => {
      if (!navPathOf.has(slug)) {
        warnings.push(`"${currentSlug}": <a ${slug}> → no page has slug "${slug}" — link rendered inert (always-renders)`);
        return { broken: true, label: empty ? slug : undefined };
      }
      const info = pageInfo.get(slug);
      if (info?.isDerived) {
        warnings.push(
          `"${currentSlug}": <a ${slug}> resolves to a DERIVED slug (from "${info.src}"'s title) — pin ` +
          `<meta slug="${slug}"> there so a title rename does not silently break the link`,
        );
      }
      return { href: relTo(slug), label: empty ? (info?.title ?? slug) : undefined };
    };
  };

  // The chrome's `?page=slug` router links → depth-relative pretty URLs (PASS 2, on the composed page).
  // Anchored to `href="?page=…` (the chrome/nav form buildWebsiteTopBar emits) so it rewrites ONLY the
  // nav links — never a `?page=` that appears MID-href, e.g. the per-page live link `…live/?page=<slug>`
  // (#static-live-link), whose `?page=` is the LIVE route and must reach the live SPA verbatim.
  const staticize = (html, outPath) => {
    const relTo = relToFor(outPath);
    return String(html).replace(/href="\?page=([^"#&]+)/g, (m, slug) =>
      navPathOf.has(slug) ? `href="${relTo(slug)}` : m);
  };

  // 4. The top bar (cross-site nav) is built once; its `?page=` links are relativized PER PAGE below.
  //    No left site sidebar is built: on a website the left nav belongs to BOOK pages (their chapter
  //    rail, carried inside the book body fragment — untouched). Articles get the top bar + their own
  //    right section nav. (buildWebsiteSidebar still serves the LIVE website's opt-in <config sidebar>
  //    via browser.js; it is simply no longer used by the static article composition.)
  const pageMap = new Map();
  const assets = [];
  const shippedAssetDests = new Set(); // #408: dedupe referenced-asset shipping across pages

  // #405 (surface parity): the live top bar renders `<meta icon>`; the static build discarded
  //   it. Read it from the parsed nav master, ship the file, and render it PER PAGE with the
  //   same depth-relative `up` treatment the favicon links get (the topBar's `?page=` hrefs are
  //   already relativized per page by staticize — the icon src needs the same, so the once-built
  //   bar becomes a per-page build; buildWebsiteTopBar is a cheap string join).
  const brandIconRel = (() => {
    const metaNode = (navProc.parse(masterSource).children ?? []).find((n) => n?.type === 'enscribeTag' && n.tagname === 'meta');
    const icon = metaNode?.kwargs?.icon ?? null;
    if (!icon || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(icon)) return icon; // URL/absolute: use verbatim, ship nothing
    try {
      if (statSync(join(masterDir, icon)).isFile()) { assets.push({ from: join(masterDir, icon), to: icon }); return icon; }
    } catch { /* missing */ }
    warnings.push(`<meta icon="${icon}"> not found under ${masterDir} — the top bar renders without it (#405)`);
    return null;
  })();
  const topBarFor = (up) => buildWebsiteTopBar(
    { title: masterTitle, icon: brandIconRel ? (/^(?:[a-z][a-z0-9+.-]*:)/i.test(brandIconRel) ? brandIconRel : `${up}${brandIconRel}`) : null, firstSlug: homeSlug }, entries);


  // ── #300 slice 2: COMPOSITION model. Number each page in its OWN native scope, harvest its cross-ref
  //    registry, MERGE into one SITE registry, then render each page natively and resolve cross-page refs
  //    against the merge. NOTHING is flattened: a book keeps book numbering (a figure is "3.2"), an article
  //    keeps article numbering; an <ref @id> across pages reads the target's NATIVE number + links to the
  //    page (or book chapter-page) it renders on. (Replaces the per-page-ISOLATED render that bypassed the
  //    site registry — the #300 regression. The live SPA's old page-scope flatten is gone too — #320 — so
  //    both surfaces share this one composition core.)
  const destPrefixOf = (slug) => { const np = navPathOf.get(slug) ?? slug; return np === '' ? '' : `${np}/`; };

  // PHASE 1 (website.md) — number every page natively, harvest, MERGE into one site cross-ref registry, and
  // build the read-through SEED Phase 2 consumes. The composition is the BROWSER-PURE core
  // (master-document/compose-site.js, the live #300 step 1, #324) — this static build is now just one caller
  // of it; a later live caller is the other. The static side injects its readFileSync-based assembleAndNumber
  // + document pipeline (the live side will inject fetch-based ones) and keeps the static URL scheme via
  // destPrefixOf. Returned maps: idToOwner + ownerToUrl resolve a cross-page href; bookFnameOwner is the
  // per-chapter-page "current owner" in Phase 2; seedRegistry() seeds each render's read-through over the merge.
  const { idToOwner, ownerToUrl, bookFnameOwner, seedRegistry } = composeSiteRegistry({
    pages: pageData,
    destPrefixOf,
    buildPipeline: buildDocumentPipeline,
    assembleAndNumber,
    warn: (m) => warnings.push(m),
  });

  // #404 routing invariant: a cross-page ref whose owner page is not among the emitted pages routes to
  // the graceful NOT-FOUND view — never the old silent bare `#anchor` (point 3). `needsNotFound` triggers
  // the lazy emission of one `not-found/` page after the render loop (so a healthy site — every owner
  // emitted — is byte-identical, no not-found page written). The URL is a pure function of ownership +
  // slug (point 2), so it is computed here without consulting the emitted output.
  let needsNotFound = false;
  const upFrom = (outPath) => '../'.repeat((outPath.match(/\//g) || []).length);
  // Static cross-page href resolver: ownerKey → its file, RELATIVE to the page being rendered. (LIVE keeps
  // `?page=owner#anchor` via rewriteCrossPageHrefs's default — the scheme differs by design; see hrefFor.)
  const crossPageHref = (currentOutPath) => (owner, anchor) => {
    const target = ownerToUrl.get(owner);
    if (target == null) {
      // The owner's page is not in the emitted set (a page that failed to number/render, or an internal
      // owner-map inconsistency). Route to the not-found view + warn — never a silent dead `#anchor`.
      needsNotFound = true;
      warnings.push(
        `cross-page reference to "#${anchor}" — its owning page was not emitted; the link routes to the ` +
        `not-found page (#404 routing invariant). This usually means that page failed to build (see its warning).`,
      );
      return `${upFrom(currentOutPath)}${NOT_FOUND_SLUG}/`;
    }
    return `${upFrom(currentOutPath)}${target}#${anchor}`;
  };

  // PHASE 2 — render each page NATIVELY (book/article scope intact) with the read-through pre-seeded, then
  // rewrite OUTBOUND cross-page ref hrefs to the owning page's file. Collect the site-wide DSL set as we go.
  // (Per-page render options stay at the library default dslMode 'skip'; the universal head delivers the
  // diagram runtime once — #298 — so it can't be composed until the whole site's DSL set is known.)
  const rendered = [];                 // [{ outPath, slug, title, content } | { outPath, slug, page }]
  const siteDslNames = new Set();
  for (const { page, resolved, source, tree, slug, isBook } of pageData) {
    const destPrefix = destPrefixOf(slug);
    const colocatedAssets = pageDirAssets(resolved.pageDir, masterDir, destPrefix);
    for (const a of colocatedAssets) shippedAssetDests.add(a.to); // seed BEFORE the audit (no dup ships)
    try {
      if (isBook) {
        // Re-number with the read-through seeded so the book's OUTBOUND cross-page refs resolve to native
        // numbers (the assembler warnings were already collected in Phase 1, so suppress them here). The
        // authored `<a {slug}>` resolver (#318) rides the SAME file.data: the engine resolves the markers
        // in-tree as publishBookPageBodies stringifies each chapter. Every chapter page sits at the book's
        // `${destPrefix}…` depth (a flat filename, no sub-dir), so ONE resolver — built at that depth —
        // serves them all; the within-book scheme + warnings match the per-page form this replaced.
        const { numbered, file, proc } = assembleAndNumber({
          source, sourcePath: resolved.sourcePath, masterDir: resolved.pageDir,
          // #405: the dead sink dies — Phase-2 assembler warnings ride the book's own vfile
          // like every other producer (#402). Phase 1 collected the site-scoped copies; these
          // carry the per-book provenance the seam's summary and recap group by.
          pipeOpts: { assetsDir: resolved.pageDir },
          fileData: { ...seedRegistry(), [ENSCRIBE_PAGE_LINK_RESOLVER]: makePageLinkResolver(`${destPrefix}index.html`, slug) },
        });
        // #405 (#403's unowned-anchor row for website books): routing diagnostics reach the stream.
        const bookBodies = publishBookPageBodies({ numbered, file, proc,
          onUnowned: (anchor, owner) => file.message(`anchor "${anchor}" has no owning chapter — routed to ${owner}`, undefined, 'routing:unowned-anchor') });
        // #405: the book's message stream reaches BOTH seam channels (it was dropped whole
        // before): the terminal per-document report, and the embedded recap on every chapter
        // page — any chapter is an entry point, mirroring the standalone separate-pages build.
        diagnostics?.report(file);
        const bookRecap = diagnosticsScript(file.messages);
        for (const [fname, entry] of bookBodies) {
          const outPath = `${destPrefix}${fname}`;
          if (entry.page != null) {
            rendered.push({ outPath, slug, page: entry.page });   // cover-OFF redirect — hosted as-is
          } else {
            // WITHIN-book cross-chapter hrefs are already `chapter.html#id` (publishBookPageBodies), so only
            // OUTBOUND cross-page refs (still bare `#anchor`) rewrite; pass this chapter-page's own owner key
            // so its OWN anchors stay intra-page. (Authored `<a {slug}>` links were already resolved in-tree
            // during the stringify above — #318.)
            const body = rewriteCrossPageHrefs(entry.body, bookFnameOwner.get(outPath), {
              ownerOf: (anchor) => idToOwner.get(anchor), hrefFor: crossPageHref(outPath),
            });
            collectDslNames(body, siteDslNames);
            // A book chapter's static file is `<stem>.html` (its cover is `index.html`); carry the stem so
            // the framing pass links this chapter page to its exact live twin `?page=<slug>&chapter=<stem>`.
            const chapterStem = fname === 'index.html' ? null : fname.replace(/\.html$/, '');
            rendered.push({ outPath, slug, title: entry.title, content: body + bookRecap, chapterStem });
            assets.push(...auditReferencedAssets(body, resolved.pageDir, destPrefix, shippedAssetDests, warnings, slug));
          }
        }
      } else {
        const outPath = `${destPrefix}index.html`;
        // Pass the read-through via the {value,data} VFile-like source (#133 form) so article numbering +
        // ref-resolution see the merged site registry for cross-page targets.
        // #296: this fragment is hosted in the universal shell, whose head already links the document
        // fonts + KaTeX (HEAD_ASSET_LINKS via composeWebsiteShellPage, PASS 2 below — the single source).
        // Skip the fragment's own font/KaTeX injection so each asset is linked ONCE, in the head. (The
        // STANDALONE single-article build is a separate call site (cli.js) and is unaffected — it keeps
        // embed:true → inline self-contained assets.)
        // Authored `<a {slug}>` links resolve in-tree during this render — the resolver rides file.data
        // alongside the read-through seed (#318); the bare-`#anchor` cross-page refs rewrite after (a
        // disjoint href set — slug links carry a path URL, never `href="#…"` — so the order is immaterial).
        // #402: each page renders on its own vfile (path = the page's source file), reported
        // through the seam as it completes — channel 1's per-document granularity. #415: the
        // page's own diagnostics ride the page as its recap script ('' when clean).
        // #417: an inline `<item | Title>` page renders its pre-parsed body TREE (no source file)
        // via renderArticleTreeFile — also a vfile, so it reaches the SAME seam (reported + recapped)
        // exactly like an external page; an external page renders its source.
        const pageData2 = { ...seedRegistry(), [ENSCRIBE_PAGE_LINK_RESOLVER]: makePageLinkResolver(outPath, slug) };
        const renderOpts = { assetsDir: resolved.pageDir, documentFontsCss: 'skip', katexCss: 'skip' };
        const pageFile = tree
          ? renderArticleTreeFile(tree, renderOpts, pageData2)
          : renderArticleFile({ value: source, path: resolved.sourcePath, data: pageData2 }, renderOpts);
        diagnostics?.report(pageFile);
        const raw = String(pageFile) + diagnosticsScript(pageFile.messages);
        const content = rewriteCrossPageHrefs(raw, slug, {
          ownerOf: (anchor) => idToOwner.get(anchor), hrefFor: crossPageHref(outPath),
        });
        collectDslNames(content, siteDslNames);
        rendered.push({ outPath, slug, title: page.title, content });
        assets.push(...auditReferencedAssets(content, resolved.pageDir, destPrefix, shippedAssetDests, warnings, slug));
      }
    } catch (err) {
      // #405: a page that fails to parse/render degrades the same way — error page at its address.
      warnings.push(`page "${slug}" failed to render: ${err.message} — its address ships the failed-page view (#405)`);
      failedPages.push({ slug, title: page.title || slug, reason: err.message });
      continue;
    }
    assets.push(...colocatedAssets);
  }

  // #404 routing invariant, point 3 (lazy emission): if any cross-page ref routed to the not-found view,
  // emit ONE `not-found/` page so that route resolves to a real, explicable landing — the same view the
  // live `?page=` router already renders (notFoundViewHtml, single-sourced). Added to `rendered` BEFORE
  // the framing pass, so it is framed in the universal shell like any other page. A healthy site (every
  // owner emitted) never sets the flag → no not-found page → byte-identical output.
  if (needsNotFound) {
    const outPath = `${NOT_FOUND_SLUG}/index.html`;
    rendered.push({
      outPath, slug: NOT_FOUND_SLUG, title: 'Page not found',
      content: notFoundViewHtml('this page', upFrom(outPath)),   // homeHref → the site root (serves home)
    });
  }

  // #405: every failed page ships the failed-page view AT ITS OWN ADDRESS (pageErrorViewHtml,
  // single-sourced with the live SPA's view) — the chrome's link to it lands on a real,
  // explicable page, so the routing invariant holds THROUGH the failure. Emitted before the
  // framing pass: the stub wears the universal shell like any page. A site whose every page
  // failed still emits its shell + stubs + a loud summary — never a crash, never empty silence.
  for (const f of failedPages) {
    const outPath = `${destPrefixOf(f.slug)}index.html`;
    rendered.push({
      outPath, slug: f.slug, title: f.title,
      content: pageErrorViewHtml(f.slug, f.reason, upFrom(outPath)),
    });
  }
  if (failedPages.length > 0) {
    warnings.push(`${failedPages.length} of ${pageData.length + failedPages.length} pages failed — each ships the failed-page view at its address (#405)`);
  }

  // The live-diagram runtime block for the universal head — the pinned-CDN <script src> + init for each
  // external DSL the site uses (empty for a diagram-free site, so its head is unchanged). Built ONCE and
  // passed to every page, so the universal head stays byte-identical across pages (each page renders its
  // own diagrams; a DSL's init is a no-op where its markers are absent). #298.
  const dslHead = buildWebsiteDslHead(siteDslNames);

  // FRAMING PASS — frame each rendered fragment in the universal shell (now carrying the site's diagram
  // runtime in its head), then staticize its `?page=` chrome links for the page's depth. (The authored
  // `<a {slug}>` content links were already resolved per fragment in PHASE 2.)
  for (const { outPath, slug, title, content, page, chapterStem } of rendered) {
    // A redirect stub (cover-OFF book root) is hosted as-is — no shell, no head, no CTA.
    if (page != null) { pageMap.set(outPath, staticize(page, outPath)); continue; }
    // #393/W12 — the per-page head: the `<title>` suffixed with the site name (the home page stays the
    // bare site name, not "Home — Enscribe"), a meta description from the page's first paragraph, favicon
    // links (depth-relative to site/assets/), and OpenGraph/Twitter cards for a rich link unfurl. Every
    // framed page (article + book chapter) gets the uniform "open in playground" link to its live twin.
    const up = '../'.repeat((outPath.match(/\//g) || []).length);
    const pageTitle = slug === homeSlug || title === masterTitle ? masterTitle : `${title} — ${masterTitle}`;
    const headMeta = buildHeadMeta({
      up, description: firstParagraphText(content), ogTitle: pageTitle, siteName: masterTitle, siteBaseUrl,
    });
    const html = composeWebsiteShellPage({
      defaultCss, title: pageTitle, topBar: topBarFor(up), content, dslHead, headMeta,
      playgroundHref: liveHrefFor(outPath, slug, chapterStem),
    });
    pageMap.set(outPath, staticize(html, outPath));
  }

  // A broken `<a {slug}>` does NOT fail the build (always-renders, #289 → the always-render decision):
  // PHASE 2's resolveSlugLinks already degraded each one to an inert `ref-error` marker and pushed a
  // warning. The build completes; the warnings surface on the CLI (cli.js prints the returned `warnings`).
  return { pages: pageMap, assets, warnings };
}
