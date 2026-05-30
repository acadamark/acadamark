// acadamark docs-site static build (Phase 14 Slice 3a).
//
// Reads the canonical `.acm` sources in docs-site/sources/, renders each through
// the acadamark Node entry, wraps the result in the shared site template
// (template.html — header/nav + body + footer), and writes self-contained HTML
// into docs-site/dist/ ready to serve or deploy to github.io.
//
// Two page kinds:
//   • page       — a read-only article: rendered acadamark + a "view source on
//                  GitHub" footer link. Ships no JavaScript.
//   • playground — the Quickstart: a CodeMirror editor + the acadamark browser
//                  bundle, seeded with the article's own source for live editing.
//                  Only this page loads the editor/library.
//
// dist/ is gitignored build output (the `dist/` rule in .gitignore matches it at
// any depth); deployment copies dist/ to wherever github.io serves from. See
// docs-site/README.md for the workflow and the (manual, for now) deploy path.

import { buildAcadamarkPipeline } from 'acadamark-interpreter';
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const SOURCES_DIR = join(here, 'sources');
const DIST_DIR = join(here, 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');
const TEMPLATE_PATH = join(here, 'template.html');
const SITE_CSS = join(here, 'site.css');
const QUICKSTART_JS = join(here, 'quickstart.js');

const INTERPRETER = join(repoRoot, 'packages', 'acadamark-interpreter');
const DEFAULT_CSS = join(INTERPRETER, 'src', 'assets', 'default.css');
const BROWSER_BUNDLE = join(INTERPRETER, 'dist', 'acadamark.browser.global.js');

// Where the read-only pages point their "view source" link. blob view (not raw)
// renders the file with line numbers — better for reading. Repo + branch are
// build-time constants; the rename, if it happens, updates the repo segment.
const GITHUB_BLOB_BASE =
  'https://github.com/acadamark/acadamark/blob/master/docs-site/sources';

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

// The site's pages, in nav order. Hardcoded for v0.1.0 (three placeholder
// pages); when real content lands in later slices this list grows. A manifest
// file would be overkill at this size.
const PAGES = [
  { slug: 'index',           source: 'index.acm',           title: 'acadamark',                    nav: 'Home',            kind: 'page' },
  { slug: 'quickstart',      source: 'quickstart.acm',      title: 'Quickstart — acadamark',       nav: 'Quickstart',      kind: 'playground' },
  { slug: 'example-article', source: 'example-article.acm', title: 'Example article — acadamark',  nav: 'Example article', kind: 'page' },
];

/** Render an acadamark source string to an HTML fragment. */
function renderAcm(source) {
  return String(buildAcadamarkPipeline(RENDER_OPTIONS).processSync(source));
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
// closing </script> (or any tag) inside the literal, so arbitrary .acm content is
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

function buildPageBody(page, rendered) {
  const githubUrl = `${GITHUB_BLOB_BASE}/${page.source}`;
  return (
    `<main class="article">\n${rendered}\n    </main>\n` +
    `    <footer class="site-footer">\n` +
    `      Source: <a href="${githubUrl}">view this page's acadamark source on GitHub</a>\n` +
    `    </footer>`
  );
}

function buildPlaygroundBody(source) {
  return (
    `<main class="panes">\n` +
    `      <section class="pane" id="editor-pane" aria-label="Source editor"><div id="editor"></div></section>\n` +
    `      <section class="pane" id="output-pane" aria-label="Rendered output"><article id="output"></article></section>\n` +
    `    </main>\n` +
    `    <script>window.__QUICKSTART_SOURCE__ = ${inlineSource(source)};</script>\n` +
    `    <script type="module" src="assets/quickstart.js"></script>`
  );
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
  if (existsSync(BROWSER_BUNDLE)) {
    copyFileSync(BROWSER_BUNDLE, join(ASSETS_DIR, 'acadamark.browser.global.js'));
  } else {
    console.warn(
      '[docs:build] browser bundle not found — the Quickstart playground will\n' +
        '             show a "build the bundle" notice until you run:\n' +
        '               cd packages/acadamark-interpreter && npm run build:lib\n' +
        '             then rebuild the site.',
    );
  }

  for (const page of PAGES) {
    const source = readFileSync(join(SOURCES_DIR, page.source), 'utf8');
    let body;
    let headExtra = '';
    if (page.kind === 'playground') {
      body = buildPlaygroundBody(source);
      headExtra = '<script src="assets/acadamark.browser.global.js"></script>';
    } else {
      body = buildPageBody(page, renderAcm(source));
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

  console.log(`[docs:build] done — ${PAGES.length} pages in ${DIST_DIR}`);
}

main();
