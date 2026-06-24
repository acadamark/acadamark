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
// RENDER MODEL (#278): each page is rendered INDEPENDENTLY, through the SHARED per-document render
// path (render-document.js) that the CLI single-document build also uses — renderArticleDocument for
// an article, assembleAndNumber + publishBookPageBodies for a book — so there is one render path, not
// a website-private reconstruction of the pipeline. Both page types are then framed by the ONE static
// website shell (composeWebsiteShellPage, #295): a universal head + the sticky top nav + the page's
// content fragment. (This is NOT the live website's one synthetic-book
// global pass; that model can't emit a book-page's chapters as nested pages. A consequence: a
// cross-page `<ref>` BETWEEN top-level pages does not resolve across the independent renders —
// flagged in the slice report, not silently handled.) A website page passes only assetsDir, keeping
// its embed/dsl at the library defaults (a multi-page site does not inline KaTeX CSS into every page).

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { VFile } from 'vfile';
import {
  publishBookPageBodies,
  flattenNavPages,
  extractDocumentTitle,
  buildWebsiteTopBar,
  composeWebsiteShellPage,
  collectDslNames,
  buildWebsiteDslHead,
  slugifyPage,
  resolvePageSlug,
  allocatePageSlug,
} from '@enscribejs/enscribe';
import { ENSCRIBE_NAV_MODEL } from '@enscribejs/enscribe/core/file-data-keys';
import { buildDocumentPipeline, renderArticleDocument, assembleAndNumber } from './render-document.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]);

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

/** Co-located, non-source files in a page-directory (images, data) that travel with the page. */
function pageDirAssets(pageDir, masterDir, destPrefix) {
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
  const META_TYPE_RE = /<meta\s+type\s*=\s*["']?([A-Za-z-]+)/; // the page's OWN type (first meta, not an example)
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
    pageData.push({ page, resolved, source, slug, isBook: (source.match(META_TYPE_RE) || [])[1]?.toLowerCase() === 'book' });
  }
  if (pageData.length === 0) throw new Error('website master <nav> has no resolvable pages');

  // 3. Output location mirrors the nav TREE (slice 1): group segments (slugified group titles) + the
  //    page's slug; home (the first nav page) → the dist root. Now keyed on meta-slugs (remapped above).
  const homeSlug = pages[0].slug;
  const masterTitle = extractDocumentTitle(masterSource) || 'Enscribe';
  const navPathOf = buildNavPaths(entries, homeSlug);

  // Links are PRETTY trailing-slash path URLs, RELATIVE to the current page's depth. Two link sources:
  //   - the chrome's `?page=slug` (live-SPA router form) → the target's `<navPath>/`;
  //   - an authored `<a {slug}>` internal link, recorded by the <a> handler as `<a data-page-slug="X">`
  //     → the target's `<navPath>/`, auto-labelled with the target's TITLE when the link has no text.
  // A slug with no page is a broken internal link (collected → the build errors); a link to a DERIVED
  // (un-pinned) slug warns. No `<navPath>/index.html`, no absolute `/…`, no `?page=` survive.
  const linkErrors = [];
  const staticize = (html, outPath, currentSlug) => {
    const up = '../'.repeat((outPath.match(/\//g) || []).length); // from this page's dir up to the dist root
    const relTo = (slug) => { const np = navPathOf.get(slug); return np === '' ? (up || './') : `${up}${np}/`; };
    let out = String(html).replace(/\?page=([^"#&]+)/g, (_m, slug) =>
      navPathOf.has(slug) ? relTo(slug) : _m);
    out = out.replace(/<a\b([^>]*?)\sdata-page-slug="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (whole, pre, slug, post, label) => {
      if (!navPathOf.has(slug)) {
        linkErrors.push(`"${currentSlug}": <a ${slug}> → no page has slug "${slug}"`);
        return whole;                  // leave the marker visible; the build errors after listing all
      }
      const info = pageInfo.get(slug);
      if (info?.isDerived) {
        warnings.push(
          `"${currentSlug}": <a ${slug}> resolves to a DERIVED slug (from "${info.src}"'s title) — pin ` +
          `<meta slug="${slug}"> there so a title rename does not silently break the link`,
        );
      }
      const text = label.trim() ? label : escapeHtml(info?.title ?? slug);
      return `<a${pre} href="${relTo(slug)}"${post}>${text}</a>`;
    });
    return out;
  };

  // 4. The top bar (cross-site nav) is built once; its `?page=` links are relativized PER PAGE below.
  //    No left site sidebar is built: on a website the left nav belongs to BOOK pages (their chapter
  //    rail, carried inside the book body fragment — untouched). Articles get the top bar + their own
  //    right section nav. (buildWebsiteSidebar still serves the LIVE website's opt-in <config sidebar>
  //    via browser.js; it is simply no longer used by the static article composition.)
  const topBar = buildWebsiteTopBar({ title: masterTitle, icon: null, firstSlug: homeSlug }, entries);

  const pageMap = new Map();
  const assets = [];

  // PASS 1 — render every page's content fragment, accumulating the site-wide set of external-DSL
  // markers (data-enscribe-dsl) as we go. The live diagram runtime is delivered ONCE through the
  // universal head (#298), the same single-source location as the KaTeX/fonts links — NOT per fragment:
  // a BOOK chapter's body-injected runtime is sliced off by extractBookPart, and an ARTICLE fragment's
  // would duplicate within the page. The runtime therefore can't be composed until the whole site's DSL
  // set is known, so we collect now and compose in pass 2. (Per-page render options stay at the library
  // default dslMode 'skip': the <pre data-enscribe-dsl> contract markup the runtime scans is mode-
  // independent, so the bodies already carry the renderable diagrams; only the runtime needs adding.)
  const rendered = [];                 // [{ outPath, slug, title, content } | { outPath, slug, page }]
  const siteDslNames = new Set();

  for (const { page, resolved, source, slug, isBook } of pageData) {
    const navPath = navPathOf.get(slug) ?? slug;          // group segments + meta-slug; home → ''
    const destPrefix = navPath === '' ? '' : `${navPath}/`;
    try {
      if (isBook) {
        // Per-chapter pages, nested under the book's nav-path dir — assemble + number (the shared
        // render path), then publish each chapter's BODY FRAGMENT and host it in the universal shell.
        // The page passes only assetsDir; embed/dsl stay at the library defaults, exactly as before
        // (a site does not self-inline ~260 KB of CSS into every page).
        const { numbered, file, proc } = assembleAndNumber({
          source,
          sourcePath: resolved.sourcePath,
          masterDir: resolved.pageDir,
          warn: (m) => warnings.push(`page "${slug}": ${m}`),
          pipeOpts: { assetsDir: resolved.pageDir },
        });
        const bookBodies = publishBookPageBodies({ numbered, file, proc });
        for (const [fname, entry] of bookBodies) {
          const outPath = `${destPrefix}${fname}`;
          // A cover-OFF book's index is a full standalone redirect (a meta-refresh has no fragment) —
          // host it as-is; every other page is a body fragment wrapped in the universal shell (pass 2).
          if (entry.page != null) {
            rendered.push({ outPath, slug, page: entry.page });
          } else {
            collectDslNames(entry.body, siteDslNames);
            rendered.push({ outPath, slug, title: entry.title, content: entry.body });
          }
        }
      } else {
        // Article page — the shared article render (same processSync the CLI `render` uses); the
        // `<article>` fragment is hosted in the universal shell's content region.
        const content = renderArticleDocument(source, { assetsDir: resolved.pageDir });
        collectDslNames(content, siteDslNames);
        rendered.push({ outPath: `${destPrefix}index.html`, slug, title: page.title, content });
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

  // PASS 2 — frame each rendered fragment in the universal shell (now carrying the site's diagram
  // runtime in its head), then staticize its cross-page links for the page's depth.
  for (const { outPath, slug, title, content, page } of rendered) {
    const html = page != null
      ? page
      : composeWebsiteShellPage({ defaultCss, title, topBar, content, dslHead });
    pageMap.set(outPath, staticize(html, outPath, slug));
  }

  // A broken `<a {slug}>` is a real authoring error — fail the build (after listing every one).
  if (linkErrors.length) {
    throw new Error(`#289: ${linkErrors.length} broken internal link(s):\n  ${linkErrors.join('\n  ')}`);
  }

  return { pages: pageMap, assets, warnings };
}
