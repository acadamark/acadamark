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
} from '@enscribejs/enscribe';
import { ENSCRIBE_NAV_MODEL, ENSCRIBE_REGISTRY, ENSCRIBE_PAGE_LINK_RESOLVER } from '@enscribejs/enscribe/core/file-data-keys';
import { classifyDocTypeFromSource } from '@enscribejs/enscribe/interpreter/lib/classify-doc-type';
import { buildDocumentPipeline, renderArticleDocument, assembleAndNumber } from './render-document.js';

/**
 * Walk the nav tree and map each page slug → its OUTPUT nav-path: the slugified titles of the groups
 * it sits under, then the page's own slug (`references/layer-1/export`). The home page (the first nav
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
 * (build-live.js) calls this with `destPrefix=''` to copy the SAME set FLAT into its folder.
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
export function buildStaticWebsite({ masterSource, masterDir, defaultCss }) {
  const warnings = [];

  // 1. Parse the master → the S1 nav model on file.data. (Nav-model extraction, not a page render —
  //    it just needs the structuring pass; it shares the one pipeline constructor all the same.)
  const navProc = buildDocumentPipeline({ assetsDir: masterDir });
  const navFile = new VFile({ path: 'index.emd', value: masterSource });
  navProc.runSync(navProc.parse(masterSource), navFile);
  // Surface the nav-parse diagnostics — website-structuring raises real ones (a duplicate page slug,
  // a pipe-label nav-group, a zero-entry nav). They live on navFile.messages; without this the static
  // build silently dropped them (e.g. a slug collision quietly disambiguated to `…-2`).
  for (const m of navFile.messages ?? []) {
    warnings.push(m.ruleId ? `nav: ${m.ruleId}: ${m.reason}` : `nav: ${m.reason ?? m}`);
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
  const pageInfo = new Map();          // slug → { title, isDerived, src }
  const usedSlugs = new Set();         // site-wide slug allocation (the resolver + always-render dedup)
  // The page's OWN document class — the shared classifier (1-C from #316) over a PARSED tree, so a
  // `<meta>` inside a code EXAMPLE is correctly skipped (it is a code node, not an enscribeTag). This
  // replaces a raw-source regex that matched the first literal `type=` and could mis-read an example.
  // One parse-only proc, reused across pages (parse ignores assetsDir).
  const classifyProc = buildDocumentPipeline({});
  for (const page of pages) {
    const resolved = resolvePageSource(masterDir, page.src);
    if (!resolved) {
      warnings.push(`nav item src "${page.src}" did not resolve to a .emd or page-directory — skipped`);
      continue;
    }
    const source = readFileSync(resolved.sourcePath, 'utf8');
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
    pageData.push({ page, resolved, source, slug, isBook: classifyDocTypeFromSource(source, classifyProc).type === 'book' });
  }
  if (pageData.length === 0) throw new Error('website master <nav> has no resolvable pages');

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
  const topBar = buildWebsiteTopBar({ title: masterTitle, icon: null, firstSlug: homeSlug }, entries);

  const pageMap = new Map();
  const assets = [];

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

  // Static cross-page href resolver: ownerKey → its file, RELATIVE to the page being rendered. (LIVE keeps
  // `?page=owner#anchor` via rewriteCrossPageHrefs's default — the scheme differs by design; see hrefFor.)
  const crossPageHref = (currentOutPath) => (owner, anchor) => {
    const target = ownerToUrl.get(owner);
    if (target == null) return `#${anchor}`;                       // unknown owner → leave intra-page (defensive)
    const up = '../'.repeat((currentOutPath.match(/\//g) || []).length);
    return `${up}${target}#${anchor}`;
  };

  // PHASE 2 — render each page NATIVELY (book/article scope intact) with the read-through pre-seeded, then
  // rewrite OUTBOUND cross-page ref hrefs to the owning page's file. Collect the site-wide DSL set as we go.
  // (Per-page render options stay at the library default dslMode 'skip'; the universal head delivers the
  // diagram runtime once — #298 — so it can't be composed until the whole site's DSL set is known.)
  const rendered = [];                 // [{ outPath, slug, title, content } | { outPath, slug, page }]
  const siteDslNames = new Set();
  for (const { page, resolved, source, slug, isBook } of pageData) {
    const destPrefix = destPrefixOf(slug);
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
          warn: () => {}, pipeOpts: { assetsDir: resolved.pageDir },
          fileData: { ...seedRegistry(), [ENSCRIBE_PAGE_LINK_RESOLVER]: makePageLinkResolver(`${destPrefix}index.html`, slug) },
        });
        const bookBodies = publishBookPageBodies({ numbered, file, proc });
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
            rendered.push({ outPath, slug, title: entry.title, content: body, chapterStem });
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
        const raw = renderArticleDocument(
          { value: source, data: { ...seedRegistry(), [ENSCRIBE_PAGE_LINK_RESOLVER]: makePageLinkResolver(outPath, slug) } },
          { assetsDir: resolved.pageDir, documentFontsCss: 'skip', katexCss: 'skip' },
        );
        const content = rewriteCrossPageHrefs(raw, slug, {
          ownerOf: (anchor) => idToOwner.get(anchor), hrefFor: crossPageHref(outPath),
        });
        collectDslNames(content, siteDslNames);
        rendered.push({ outPath, slug, title: page.title, content });
      }
    } catch (err) {
      warnings.push(`page "${slug}" failed to render: ${err.message}`);
      continue;
    }
    assets.push(...pageDirAssets(resolved.pageDir, masterDir, destPrefix));
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
    // A redirect stub (cover-OFF book root) is hosted as-is — no shell, no CTA. Every framed page
    // (article + book chapter) gets the uniform "open in playground" link to its live counterpart
    // (a book chapter → its exact `?page=<slug>&chapter=<stem>` live twin).
    const html = page != null
      ? page
      : composeWebsiteShellPage({ defaultCss, title, topBar, content, dslHead, playgroundHref: liveHrefFor(outPath, slug, chapterStem) });
    pageMap.set(outPath, staticize(html, outPath));
  }

  // A broken `<a {slug}>` does NOT fail the build (always-renders, #289 → the always-render decision):
  // PHASE 2's resolveSlugLinks already degraded each one to an inert `ref-error` marker and pushed a
  // warning. The build completes; the warnings surface on the CLI (cli.js prints the returned `warnings`).
  return { pages: pageMap, assets, warnings };
}
