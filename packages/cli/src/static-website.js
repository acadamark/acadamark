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
// RENDER MODEL (#278): each page is rendered INDEPENDENTLY — processSync for an article,
// assembleMasterDocument + publishBookPages for a book. (This is NOT the live website's one
// synthetic-book global pass; that model can't emit a book-page's chapters as nested pages.
// A consequence: a cross-page `<ref>` BETWEEN top-level pages does not resolve across the
// independent renders — flagged in the slice report, not silently handled.)

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  publishBookPages,
  flattenNavPages,
  extractDocumentTitle,
  buildWebsiteTopBar,
  buildWebsiteSidebar,
  WEBSITE_NAV_CSS,
} from '@enscribejs/enscribe';
import { ENSCRIBE_NAV_MODEL } from '@enscribejs/enscribe/core/file-data-keys';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]);

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
    return existsSync(idx) ? { sourcePath: idx, pageDir: direct } : null;
  }
  if (existsSync(`${direct}.emd`)) return { sourcePath: `${direct}.emd`, pageDir: masterDir };
  if (existsSync(direct)) return { sourcePath: direct, pageDir: dirname(direct) };
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

/** Wrap a rendered article fragment in the website chrome — a full standalone document with
 *  default.css + the nav chrome CSS inlined (self-contained, like publish-pages' pageShell).
 *  The article body (processSync's `<link …>` head assets + `<article>`) sits in the content slot. */
function composeArticlePage({ body, title, topBar, sidebar, defaultCss }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title || 'Enscribe')}</title>
<style>
${defaultCss}
${WEBSITE_NAV_CSS}
</style>
</head>
<body>
<div class="enscribe-site">
${topBar}
<div class="enscribe-site-layout">
${sidebar}
<main class="enscribe-site-main" data-enscribe-content>
${body}
</main>
<aside class="enscribe-site-onthispage"></aside>
</div>
</div>
</body>
</html>
`;
}

/** Add the website top bar (cross-site nav) + the nav chrome CSS to a publish-pages book page
 *  (already a full standalone document with its own chapter chrome). The book's intra-book nav
 *  (chapter rail, prev/next) is untouched; the top bar rides above it for site-level navigation. */
function decorateBookPage(html, topBar) {
  let out = String(html).replace('</head>', `<style>${WEBSITE_NAV_CSS}</style>\n</head>`);
  out = out.replace(/<body([^>]*)>/, `<body$1>\n${topBar}`);
  return out;
}

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

  // 1. Parse the master → the S1 nav model on file.data.
  const navProc = buildEnscribePipeline({ assetsDir: masterDir });
  const navFile = new VFile({ path: 'index.emd', value: masterSource });
  navProc.runSync(navProc.parse(masterSource), navFile);
  const navModel = navFile.data?.[ENSCRIBE_NAV_MODEL] ?? { entries: [] };
  const entries = navModel.entries ?? [];
  const pages = flattenNavPages(entries);
  if (pages.length === 0) throw new Error('website master has a <meta type=website> but no nav pages');

  // 2. Home = the first page in nav order (the `+homepage` page authored first). It maps to the
  //    dist ROOT (index.html); every other page lives at `<slug>/index.html`.
  const homeSlug = pages[0].slug;
  const title = extractDocumentTitle(masterSource) || 'Enscribe';
  // The chrome's hrefs come out of the live machinery as `?page=slug` (the SPA router form). A STATIC
  // site uses plain RELATIVE file links, so it works opened directly (file://), served from a domain
  // root, OR served from a subpath — NOT absolute `/slug/` (which breaks on file:// and under a base
  // path) and NOT `?page=` (that is the live SPA's routing query). Each page resolves links relative to
  // ITS OWN depth below the dist root: home is `index.html` (depth 0); every other page is at
  // `<slug>/…` (depth 1). A page slug links to that page's entry document `<slug>/index.html` (home →
  // `index.html`) — an explicit `index.html`, so a `file://` open resolves it (no dir-index server needed).
  const staticize = (html, outPath) => {
    const up = '../'.repeat((outPath.match(/\//g) || []).length); // from this page's dir up to the dist root
    return String(html).replace(/\?page=([^"#&]+)/g, (_m, slug) =>
      slug === homeSlug ? `${up}index.html` : `${up}${slug}/index.html`);
  };

  // 3. Chrome built once (top bar + sidebar); its `?page=` links are relativized PER PAGE below.
  const topBar = buildWebsiteTopBar({ title, icon: null, firstSlug: homeSlug }, entries);
  const sidebar = buildWebsiteSidebar(entries);

  const pageMap = new Map();
  const assets = [];

  for (const page of pages) {
    const resolved = resolvePageSource(masterDir, page.src);
    if (!resolved) {
      warnings.push(`page "${page.slug}": src "${page.src}" did not resolve to a .emd or page-directory — skipped`);
      continue;
    }
    const source = readFileSync(resolved.sourcePath, 'utf8');
    // Detect the page's OWN doc type from its FIRST `<meta type=…>` (the document meta is always
    // first). A naive "does the source contain <meta type=book>" test is wrong: a doc page can SHOW
    // `<meta type=book>` inside an example/code block — that must not flip the page to the book path.
    const metaType = (source.match(/<meta\s+type\s*=\s*["']?([A-Za-z-]+)/) || [])[1]?.toLowerCase();
    const isBook = metaType === 'book';
    const destPrefix = page.slug === homeSlug ? '' : `${page.slug}/`;

    try {
      if (isBook) {
        // Per-chapter pages, nested under <slug>/ — assemble the book master, number once, publish.
        const proc = buildEnscribePipeline({ assetsDir: resolved.pageDir });
        const file = new VFile({ path: resolved.sourcePath });
        const tree = assembleMasterDocument({
          source,
          readFile: (p) => readFileSync(p, 'utf8'),
          resolve: (rel) => join(resolved.pageDir, rel),
          parse: (s) => proc.parse(s),
          warn: (m) => warnings.push(`page "${page.slug}": ${m}`),
        });
        const numbered = proc.runSync(tree, file);
        const bookPages = publishBookPages({ numbered, file, proc, defaultCss });
        for (const [fname, html] of bookPages) {
          const outPath = `${destPrefix}${fname}`;
          pageMap.set(outPath, staticize(decorateBookPage(html, topBar), outPath));
        }
      } else {
        // A single article page.
        const proc = buildEnscribePipeline({ assetsDir: resolved.pageDir });
        const body = String(proc.processSync(source));
        const full = composeArticlePage({ body, title: page.title, topBar, sidebar, defaultCss });
        const outPath = `${destPrefix}index.html`;
        pageMap.set(outPath, staticize(full, outPath));
      }
    } catch (err) {
      // A page that errors is reported (a bug-inventory candidate); the rest of the site still builds.
      warnings.push(`page "${page.slug}" failed to render: ${err.message}`);
      continue;
    }

    assets.push(...pageDirAssets(resolved.pageDir, masterDir, destPrefix));
  }

  return { pages: pageMap, assets, warnings };
}
