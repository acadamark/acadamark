// enscribe docs-site static build (Phase 14 Slice 3a).
//
// Reads the canonical `.emd` sources in docs-site/sources/, renders each through
// the enscribe Node entry, wraps the result in the shared site template
// (template.html — header/nav + body + footer), and writes self-contained HTML
// into docs-site/dist/ ready to serve or deploy to github.io.
//
// Two page kinds:
//   • page       — a read-only article: rendered enscribe + a "view source on
//                  GitHub" footer link. Ships no JavaScript.
//   • playground — the Quickstart: a CodeMirror editor + the enscribe browser
//                  bundle, seeded with the article's own source for live editing.
//                  Only this page loads the editor/library.
//
// dist/ is gitignored build output (the `dist/` rule in .gitignore matches it at
// any depth); deployment copies dist/ to wherever github.io serves from. See
// docs-site/README.md for the workflow and the (manual, for now) deploy path.

import { buildEnscribePipeline, emitLiveShell } from '@enscribejs/enscribe';
import { importJats } from '@enscribejs/cli/jats-import';
import { copyShellAssets, discoverMasterSrcChildren } from '@enscribejs/cli/build-live';
import { buildGallery } from './gen-gallery.js';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const SOURCES_DIR = join(here, 'sources');
const DIST_DIR = join(here, 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');
// The live companion site (#207 slice 1): a per-page client-side-rendering shell under dist/live/,
// purely additive to the static site above. The four shell assets (~3 MB, mostly the engine bundle)
// are copied ONCE into dist/live/assets/ and every page's shell points its assetBase there; each
// page's `.emd` source is copied beside the shells (which fetch it at runtime).
const LIVE_DIR = join(DIST_DIR, 'live');
const LIVE_ASSETS_DIR = join(LIVE_DIR, 'assets');
const TEMPLATE_PATH = join(here, 'template.html');
const SITE_CSS = join(here, 'site.css');
const QUICKSTART_JS = join(here, 'quickstart.js');

const ENSCRIBE_PKG = join(repoRoot, 'packages', 'enscribe');
const DEFAULT_CSS = join(ENSCRIBE_PKG, 'src', 'interpreter', 'assets', 'default.css');
const BROWSER_BUNDLE = join(ENSCRIBE_PKG, 'dist', 'enscribe.browser.global.js');

// Where the read-only pages point their "view source" link. blob view (not raw)
// renders the file with line numbers — better for reading. Repo + branch are
// build-time constants; the rename, if it happens, updates the repo segment.
const GITHUB_BLOB_BASE =
  'https://github.com/enscribejs/enscribe/blob/main/docs-site/sources';
// The demo papers: real published JATS articles, imported live by `importJats`
// and rendered to self-contained standalone pages (the plain `import-jats` HTML
// output — no intro banner, no site chrome). The set spans publishers and
// features: MathML (eLife), clean native tables (PLOS Genetics 1000741), the
// literal floor / multi-level tables (PLOS Genetics 1007858), Nature
// Communications, Scientific Reports, and a bioRxiv preprint. The source XMLs are
// open-licensed samples committed under docs-site/demo-papers/.
const DEMO_PAPERS_DIR = join(here, 'demo-papers');
// `assets` is the committed figure-image dir under demo-papers/ (copied into
// dist/demo/<assets>/ at build, so a fig src of `<assets>/<file>` resolves from
// the page). Papers without `assets` render figures caption-only. `hrefMap`
// handles publishers whose <graphic> href differs from the OA package filename
// (eLife: versioned `.tif` href → de-versioned `.jpg` file).
const DEMO_PAPERS = [
  { slug: 'elife-81952',           file: 'elife-81952.xml',           journal: 'eLife',                   assets: 'PMC9683788',  hrefMap: 'elife' },
  { slug: 'pgen-1000741',          file: 'pgen-1000741.xml',          journal: 'PLOS Genetics' },
  { slug: 'pgen-1007858',          file: 'pgen-1007858.xml',          journal: 'PLOS Genetics' },
  { slug: 'nature-comms-12910011', file: 'nature-comms-12910011.xml', journal: 'Nature Communications',   assets: 'PMC12910011' },
  { slug: 'sci-reports-5428240',   file: 'sci-reports-5428240.xml',   journal: 'Scientific Reports',      assets: 'PMC5428240' },
  { slug: 'biorxiv-13060793',      file: 'biorxiv-13060793.xml',      journal: 'bioRxiv',                 assets: 'PMC13060793' },
];

// Render options mirror the browser façade's defaults: lean output that links
// fonts / KaTeX CSS to CDNs (fine for a static deploy) and renders any live-link
// DSL client-side. A full HTML page the browser parses normally runs those
// injected scripts during parse, so read-only pages need no executeAssets step.
const RENDER_OPTIONS = {
  embedResources: false,
  hoverPreviewMode: 'link',
  dslMode: 'live-link',
  assetsDir: SOURCES_DIR,
};

// The site's pages, in nav order. Hardcoded for v0.1.0; when more content lands
// in later slices this list grows. A manifest file would be overkill at this
// size. All carry real content; only Quickstart is a playground (editable). The
// docs-site content arc (Slices 3b–3f) is complete: Home, Design, Quickstart, the
// full Authoring Guide, the Layer 1 Vocabulary Reference, and the JATS article.
//
// The on-this-page ToC is **config-driven** (#207 adoption): the content pages declare
// `<config toc toc-location=right>` in their `.emd` source, which the shared compiler
// reads — so the static build AND the /live render get the floating ToC from the same
// source (closing the #207 live-pages-have-no-ToC gap). No `renderOptions.toc` here: the
// build no longer passes the ToC as a build-only option; the document is the source of truth.
const PAGES = [
  { slug: 'index',           source: 'index.emd',           title: 'enscribe',                       nav: 'Home',            kind: 'page' },
  { slug: 'design',          source: 'design.emd',          title: 'Design — enscribe',              nav: 'Design',          kind: 'page' },
  { slug: 'quickstart',      source: 'quickstart.emd',      title: 'Quickstart — enscribe',          nav: 'Quickstart',      kind: 'playground' },
  { slug: 'authoring-guide', source: 'authoring-guide.emd', title: 'Authoring Guide — enscribe',      nav: 'Authoring Guide', kind: 'page' },
  { slug: 'layer1-reference',source: 'layer1-reference.emd',title: 'Layer 1 Reference — enscribe',    nav: 'Layer 1 Reference', kind: 'page' },
  { slug: 'book-build',      source: 'book-build.emd',      title: 'Building a Book — enscribe',      nav: 'Book Build',      kind: 'page' },
  { slug: 'gallery',         source: null,                  title: 'Gallery — enscribe',             nav: 'Gallery',         kind: 'gallery' },
  { slug: 'jats',            source: 'jats.emd',            title: 'JATS — enscribe',                nav: 'JATS',            kind: 'page' },
  { slug: 'demos',           source: null,                  title: 'Demos — enscribe',               nav: 'Demos',           kind: 'demo-index' },
];

/** Render an enscribe source string to an HTML fragment. Per-page `extra`
 *  options (e.g. `{ toc: true }`) merge over the shared RENDER_OPTIONS. */
function renderAcm(source, extra = {}) {
  return String(buildEnscribePipeline({ ...RENDER_OPTIONS, ...extra }).processSync(source));
}

// Demo papers render self-contained (the plain `import-jats` default embeds
// KaTeX/fonts), so each page stands alone with no asset paths or CDN.
const DEMO_RENDER_OPTIONS = { ...RENDER_OPTIONS, embedResources: true, dslMode: 'live-inline' };

/**
 * Import a JATS XML file and render it to a self-contained HTML fragment (the
 * embedded `<style>` + `<article>` the interpreter emits), rendering from the
 * imported tree directly (not a serialized `.emd`, which is lossy for documents
 * this complex). Figures are caption-only — the publishers' image assets aren't
 * distributed with the article XML, so the `src` kwarg is dropped from every
 * imported `<fig>` rather than emitting a broken `<img>`. Returns the fragment and
 * the article title (for the index listing).
 */
function renderDemoPaper(paper) {
  const tree = importJats(readFileSync(join(DEMO_PAPERS_DIR, paper.file), 'utf8'));
  wireFigures(tree, paper);
  // Extract the title BEFORE rendering — runSync mutates the tree in place
  // (article-structuring lifts the <meta>'s <title>, so it's gone afterwards).
  const title = extractTitle(tree);
  const proc = buildEnscribePipeline(DEMO_RENDER_OPTIONS);
  const fragment = String(proc.stringify(proc.runSync(tree)));
  return { fragment, title };
}

/**
 * Point each imported <fig>'s src at a committed demo asset, or strip it
 * (caption-only) when the article ships no images. Each image is committed under
 * docs-site/demo-papers/<assets>/<file> and copied into dist/demo/<assets>/ at
 * build, so a src of `<assets>/<file>` resolves from dist/demo/<slug>.html. A fig
 * whose mapped asset isn't committed (e.g. an excluded eLife sub-article figure)
 * is left caption-only rather than emitting a broken <img>.
 */
function wireFigures(tree, paper) {
  if (!paper.assets) { stripFigureSrc(tree); return; }
  const committedDir = join(DEMO_PAPERS_DIR, paper.assets);
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'enscribeTag' && n.tagname === 'fig' && n.kwargs && 'src' in n.kwargs) {
      const file = mapAssetHref(n.kwargs.src, paper);
      if (file && existsSync(join(committedDir, file))) {
        n.kwargs.src = `${paper.assets}/${file}`;
      } else {
        const { src, ...rest } = n.kwargs;
        n.kwargs = rest;
      }
    }
    for (const k of ['children', 'content']) if (Array.isArray(n[k])) n[k].forEach(walk);
  };
  walk(tree);
}

/** Map a JATS <graphic> href to the OA-package filename on disk. */
function mapAssetHref(href, paper) {
  // eLife: versioned `.tif` href (elife-…-fig1-v2.tif) → de-versioned `.jpg` file.
  if (paper.hrefMap === 'elife') return href.replace(/-v\d+\.\w+$/i, '.jpg');
  return href; // other publishers: href == filename.
}

/** The article title: the first `<title>` tag in the imported tree (the <meta>'s). */
function extractTitle(tree) {
  let title = null;
  const walk = (n) => {
    if (title != null || !n || typeof n !== 'object') return;
    if (n.type === 'enscribeTag' && n.tagname === 'title') { title = inlineText(n.content); return; }
    for (const k of ['children', 'content']) if (Array.isArray(n[k])) n[k].forEach(walk);
  };
  walk(tree);
  return title || 'Untitled';
}

/** Plain text of an inline mdast node list. */
function inlineText(nodes) {
  return (nodes ?? [])
    .map((n) => (typeof n.value === 'string' ? n.value : inlineText(n.children)))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A standalone demo-paper page: a minimal HTML shell with the article theme
 * inlined (the fragment already embeds KaTeX/fonts). Just the rendered article —
 * no site header/nav, no intro banner, no "what was simplified" block.
 */
function demoPaperPage(title, journal, fragment, defaultCss) {
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    `<title>${escapeHtml(title)} — ${escapeHtml(journal)}</title>\n` +
    `<style>\n${defaultCss}\nbody{margin:0}main.article{max-width:48rem;margin:0 auto;padding:2.5rem 1.25rem}</style>\n` +
    '</head>\n<body class="jats-import">\n' +
    `<main class="article">\n${fragment}\n</main>\n</body>\n</html>\n`
  );
}

/** The demos index body: one header note + a list of title/journal links, each
 *  opening its paper render in a new tab. */
function buildDemoIndexBody(papers) {
  const items = papers.map((p) =>
    '        <li class="demo-item">' +
    `<a href="demo/${p.slug}.html" target="_blank" rel="noopener">${escapeHtml(p.title)}</a> ` +
    `<span class="demo-journal">${escapeHtml(p.journal)}</span></li>`,
  ).join('\n');
  return (
    '<main class="article">\n' +
    '      <h1>Demo papers</h1>\n' +
    "      <p>Real published articles imported from JATS XML by <code>enscribe import-jats</code>, " +
    "rendered with no manual editing. Figures are caption-only where the publisher's image assets " +
    'aren’t distributed with the article XML. Each link opens in a new tab.</p>\n' +
    `      <ul class="demo-list">\n${items}\n      </ul>\n` +
    '    </main>'
  );
}

function stripFigureSrc(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'enscribeTag' && node.tagname === 'fig' && node.kwargs && 'src' in node.kwargs) {
    const { src, ...rest } = node.kwargs;
    node.kwargs = rest;
  }
  for (const key of ['children', 'content']) {
    if (Array.isArray(node[key])) node[key].forEach(stripFigureSrc);
  }
}

/** Nav links for the header; the active page is marked aria-current. */
function buildNav(activeSlug) {
  return PAGES.map((p) => {
    const current = p.slug === activeSlug ? ' aria-current="page"' : '';
    return `<a href="${p.slug}.html"${current}>${p.nav}</a>`;
  }).join('\n        ');
}

// Inline a source string into a <script> as a JS literal. JSON.stringify handles
// quotes/newlines; escaping every "<" to < makes it impossible to form a
// closing </script> (or any tag) inside the literal, so arbitrary .emd content is
// safe to embed.
function inlineSource(source) {
  return JSON.stringify(source).replace(/</g, '\\u003c');
}

/** Single-pass token fill so inserted values are never re-scanned for tokens. */
function fillTemplate(template, tokens) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in tokens ? tokens[key] : '',
  );
}

// The static→live link (#207): a per-page deep link to this page's live (client-side-rendered)
// version, plus a one-click `?edit` into the in-browser editor. Empty when /live wasn't emitted (no
// engine bundle) or the page has no live counterpart — so the static page is unchanged in that case.
function liveLinksHtml(slug, liveSlugs) {
  if (!liveSlugs.has(slug)) return '';
  return (
    `<a href="live/${slug}.html">open this page live →</a> ` +
    `<a class="live-edit-link" href="live/${slug}.html?edit">(edit)</a>`
  );
}

function buildPageBody(page, rendered, liveLinks = '') {
  const githubUrl = page.sourceUrl ?? `${GITHUB_BLOB_BASE}/${page.source}`;
  const liveSpan = liveLinks ? `\n      <span class="live-link"> · ${liveLinks}</span>` : '';
  return (
    `<main class="article">\n${rendered}\n    </main>\n` +
    `    <footer class="site-footer">\n` +
    `      Source: <a href="${githubUrl}">view this page's enscribe source on GitHub</a>${liveSpan}\n` +
    `    </footer>`
  );
}

function buildPlaygroundBody(source, liveLinks = '') {
  const footer = liveLinks ? `\n    <footer class="site-footer">${liveLinks}</footer>` : '';
  return (
    `<main class="panes">\n` +
    `      <section class="pane" id="editor-pane" aria-label="Source editor"><div id="editor"></div></section>\n` +
    `      <section class="pane" id="output-pane" aria-label="Rendered output"><article id="output"></article></section>\n` +
    `    </main>\n` +
    `    <script>window.__QUICKSTART_SOURCE__ = ${inlineSource(source)};</script>\n` +
    `    <script type="module" src="assets/quickstart.js"></script>${footer}`
  );
}

/**
 * Emit the live companion site (#207 slice 1) under dist/live/: one client-side-rendering shell per
 * source-bearing page, the four shell assets copied ONCE into dist/live/assets/ (the engine bundle is
 * ~3 MB — never per page), and each page's `.emd` source(s) copied beside the shells. Purely additive
 * to the static site. The shell is type-agnostic (emitLiveShell → mountLiveShell, #215/#216): it
 * auto-detects article vs. book at runtime, so every page gets the SAME uniform shell — today every
 * page is an article; a future book page (the guide-as-book, #207 slice 2) renders through it unchanged.
 *
 * `assetBase` is `./assets/` (leading `./` REQUIRED — the shell's `import … from '<assetBase>editor-
 * codemirror.js'` is an ES-module specifier, and a bare `assets/…` would be an invalid bare import).
 * Shells are emitted in READ mode; `?edit` flips to the editor at runtime (always present, #216).
 *
 * The live render uses the engine's browser defaults — it does NOT carry the per-page `renderOptions`
 * (notably `toc`) the static build passes, so a live page lacks the static page's on-this-page toc
 * sidebar (content is otherwise identical). Injecting those options would touch the shell emitter —
 * a later enhancement, out of this build-orchestration slice. See docs-site/README.md.
 *
 * @param {Array} pages - the source-bearing pages to emit live (each with `slug`, `source`, `title`).
 * @returns {string[]} the slugs emitted live.
 */
function buildLiveSite(pages) {
  mkdirSync(LIVE_DIR, { recursive: true });
  const assets = copyShellAssets(LIVE_ASSETS_DIR);   // the four shell assets, ONCE
  const emitted = [];
  for (const page of pages) {
    const masterSource = readFileSync(join(SOURCES_DIR, page.source), 'utf8');
    // The master + any `<… src>` children (none today — the docs pages are single-file articles; this
    // future-proofs the guide-as-book and any later multi-file page). The shell fetches them at runtime.
    copyFileSync(join(SOURCES_DIR, page.source), join(LIVE_DIR, page.source));
    for (const child of discoverMasterSrcChildren(masterSource)) {
      copyFileSync(join(SOURCES_DIR, child), join(LIVE_DIR, child));
    }
    writeFileSync(
      join(LIVE_DIR, `${page.slug}.html`),
      emitLiveShell({ master: page.source, title: page.title, edit: false, assetBase: './assets/' }),
    );
    emitted.push(page.slug);
    console.log(`[docs:build] wrote dist/live/${page.slug}.html (live shell → ${page.source})`);
  }
  console.log(`[docs:build] /live — ${emitted.length} live pages + ${assets.length} shared assets in ${LIVE_DIR}`);
  return emitted;
}

function main() {
  const template = readFileSync(TEMPLATE_PATH, 'utf8');

  // Fresh dist/.
  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(ASSETS_DIR, { recursive: true });

  // Static assets the pages link. default.css is the interpreter's theme (it does
  // not emit it); site.css is the site chrome; quickstart.js is the playground.
  copyFileSync(DEFAULT_CSS, join(ASSETS_DIR, 'default.css'));
  copyFileSync(SITE_CSS, join(ASSETS_DIR, 'site.css'));
  copyFileSync(QUICKSTART_JS, join(ASSETS_DIR, 'quickstart.js'));

  // The browser bundle is built separately (`npm run build:lib`) and gitignored.
  // Copy it in if present so the playground works; if absent, the read-only pages
  // still build and the playground shows an actionable "build the bundle" notice.
  // The same bundle gates the /live companion (it can't render client-side without it).
  const bundlePresent = existsSync(BROWSER_BUNDLE);
  if (bundlePresent) {
    copyFileSync(BROWSER_BUNDLE, join(ASSETS_DIR, 'enscribe.browser.global.js'));
  } else {
    console.warn(
      '[docs:build] browser bundle not found — the Quickstart playground will\n' +
        '             show a "build the bundle" notice (and /live is skipped) until you run:\n' +
        '               cd packages/enscribe && npm run build:lib\n' +
        '             then rebuild the site.',
    );
  }

  // The source-bearing pages get a live companion under dist/live/ (and a static→live link). The
  // generated pages (gallery, demos) have no single `.emd` source, so they have no live counterpart.
  // When the engine bundle is absent, /live is skipped and no links are emitted → the static site is
  // byte-for-byte what it was before this slice.
  const livePages = PAGES.filter((p) => p.source);
  const liveSlugs = new Set(bundlePresent ? livePages.map((p) => p.slug) : []);

  // Demo papers → self-contained standalone pages under dist/demo/. Render first
  // so the index can list their (extracted) titles. The article theme is inlined
  // into each page (the interpreter doesn't emit default.css itself).
  const demoDir = join(DIST_DIR, 'demo');
  mkdirSync(demoDir, { recursive: true });
  const defaultCss = readFileSync(DEFAULT_CSS, 'utf8');
  const demoIndex = [];
  for (const paper of DEMO_PAPERS) {
    const { fragment, title } = renderDemoPaper(paper);
    writeFileSync(join(demoDir, `${paper.slug}.html`), demoPaperPage(title, paper.journal, fragment, defaultCss));
    // Copy the paper's committed figure assets next to its page so the rewritten
    // `<assets>/<file>` srcs resolve.
    if (paper.assets) {
      const fromDir = join(DEMO_PAPERS_DIR, paper.assets);
      const toDir = join(demoDir, paper.assets);
      mkdirSync(toDir, { recursive: true });
      for (const f of readdirSync(fromDir)) copyFileSync(join(fromDir, f), join(toDir, f));
    }
    demoIndex.push({ slug: paper.slug, title, journal: paper.journal });
    console.log(`[docs:build] wrote dist/demo/${paper.slug}.html (${paper.journal}${paper.assets ? ', +figures' : ''})`);
  }

  for (const page of PAGES) {
    let body;
    let headExtra = '';
    if (page.kind === 'playground') {
      const source = readFileSync(join(SOURCES_DIR, page.source), 'utf8');
      body = buildPlaygroundBody(source, liveLinksHtml(page.slug, liveSlugs));
      headExtra = '<script src="assets/enscribe.browser.global.js"></script>';
    } else if (page.kind === 'demo-index') {
      body = buildDemoIndexBody(demoIndex);
    } else if (page.kind === 'gallery') {
      // The vocabulary coverage gallery: generated by walking the Layer 1 vocab
      // data and rendering each element's examples through the same pipeline as
      // the read-only pages. Its deduped asset tags (KaTeX/fonts/DSL scripts)
      // go into the page <head> via headExtra.
      const gallery = buildGallery({ render: (src) => renderAcm(src) });
      body = gallery.body;
      headExtra = gallery.headExtra;
    } else {
      const source = readFileSync(join(SOURCES_DIR, page.source), 'utf8');
      body = buildPageBody(page, renderAcm(source, page.renderOptions ?? {}), liveLinksHtml(page.slug, liveSlugs));
    }
    const html = fillTemplate(template, {
      title: page.title,
      bodyClass: page.kind,
      headExtra,
      nav: buildNav(page.slug),
      body,
    });
    writeFileSync(join(DIST_DIR, `${page.slug}.html`), html);
    console.log(`[docs:build] wrote dist/${page.slug}.html (${page.kind})`);
  }

  // The live companion site (#207 slice 1), additive — emitted only when the engine bundle is present.
  const liveSlugsEmitted = bundlePresent ? buildLiveSite(livePages) : [];

  console.log(
    `[docs:build] done — ${PAGES.length} site pages + ${DEMO_PAPERS.length} demo papers` +
      `${liveSlugsEmitted.length ? ` + ${liveSlugsEmitted.length} live pages` : ''} in ${DIST_DIR}`,
  );
}

main();
