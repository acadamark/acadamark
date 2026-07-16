/**
 * Render all .emd fixture documents to .html files.
 *
 * The interpreter produces HTML fragments (no DOCTYPE, no html/head/body).
 * This script wraps each fragment in a minimal standards-mode HTML shell so
 * that the fixture files open correctly in browsers:
 *   - DOCTYPE triggers standards mode (no Quirks Mode layout issues)
 *   - <head> includes charset and viewport meta
 *   - <body> wraps the fragment
 *
 * Custom-element display CSS is loaded from src/interpreter/assets/default.css and inlined
 * in the shell. It is for browser viewing only; it is not emitted by the
 * interpreter. Editing default.css changes all rendered fixtures on next run.
 *
 * Usage:
 *   node test/render-fixtures.js
 *
 * Reads:  test/fixtures/*.emd
 * Writes: test/fixtures/*.html  (one per .emd)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename, resolve, relative } from 'node:path';
import { VFile } from 'vfile';
import { buildEnscribePipeline, assembleMasterDocument, isMasterSrcEntry, hasMasterSrcEntries, publishBookPages, emitLiveShell } from '../src/interpreter/index.js';
import { MASTER_BOOK_SHELL_PARAMS } from './fixtures/master-book/shell-params.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

/**
 * Default theme CSS for eHTML custom elements.
 * Read from src/interpreter/assets/default.css so there is a single source of truth.
 *
 * NOTE: This CSS is shell-only. It is not emitted by the interpreter.
 * Document fonts (Inter, Source Code Pro) are now injected by the interpreter
 * itself (index.js), not by this shell. Removing them here avoids double injection.
 */
const DEFAULT_CSS_PATH = resolve(__dirname, '..', 'src', 'interpreter', 'assets', 'default.css');
const SHELL_CSS = readFileSync(DEFAULT_CSS_PATH, 'utf8');

/**
 * DSL render mode per fixture (DSL Slice 1).
 *
 * The interpreter's default DSL mode is `skip`: external-DSL blocks (`<mermaid>`,
 * `<abc>`) emit only their markup contract, with no rendering library. These two
 * demonstrative fixtures are rendered `live-inline` instead, so that opening
 * their `.html` in a browser shows the Mermaid diagram actually rendered — the
 * library bundle is inlined (~3.3MB each) and runs at view time. This exercises
 * live mode end-to-end for the demonstrative documents.
 *
 * The mode is set here, per fixture, in the renderer — NOT by changing the
 * interpreter default (which stays `skip`). Every other fixture renders `skip`.
 */
const LIVE_INLINE_FIXTURES = new Set([
  // document-45/46 (the two live-inline demonstratives) were archived in the #5
  // migration — subsumed by the context + sweep fixtures. No fixture currently
  // overrides to the self-contained inline bundle; add one here if needed.
]);

/**
 * abc static-mode fixtures (DSL Slice 2).
 *
 * Static mode is abc-only: the abc contract markup is replaced at compile time
 * by inline SVG (abcjs + jsdom), so opening the `.html` shows the notation with
 * no abcjs bundle and no init script at view time. Set per fixture here (via
 * `abcMode: 'static'`, the abc-only override) rather than by changing the
 * interpreter default, which stays `skip`.
 */
const ABC_STATIC_FIXTURES = new Set([
  'document-47-abc-static',
]);

/**
 * ToC-sidebar fixtures (#20). Rendered with `toc: true` so the table-of-contents
 * sidebar is emitted and the scroll-spy script is injected alongside it. Set per
 * fixture here rather than changing the interpreter default (`toc: false`), which
 * keeps every other fixture byte-identical.
 */
const TOC_FIXTURES = new Set([
  'document-54-toc-scrollspy',
  'master-book',
]);

/**
 * Multi-file master documents (#190 / #194). A fixture that names `src` structure
 * children (`<section src>` for an article, `<chapter src>` / `<preface src>` / … for
 * a book) is a master entry point: it is assembled — its children resolved and
 * stitched against the master's own directory, the same handoff `enscribe build`
 * and the browser `renderMasterAsync` perform — into one document, then rendered
 * to a single golden. The child `.emd` files are fragments consumed by the
 * assembly, so they get no standalone golden. Detection reuses the assembler's own
 * shared `hasMasterSrcEntries` gate + `isMasterSrcEntry` predicate (no drift, #426:
 * structural), and the children are read off the parsed master, so this is general —
 * not hardcoded to the master/, master-xref/, … dirs or to one document class.
 */
function isMaster(src, proc) {
  return hasMasterSrcEntries(proc.parse(src));
}

// The set of child source paths consumed by every master fixture — skipped in
// the render loop so they get no standalone golden. Each child `src` is resolved
// against its own master's directory, exactly as the assembler resolves it.
function collectConsumedChildren(emdPaths) {
  const consumed = new Set();
  const proc = buildEnscribePipeline({});
  for (const p of emdPaths) {
    const src = readFileSync(p, 'utf8');
    if (!isMaster(src, proc)) continue;
    for (const node of proc.parse(src).children ?? []) {
      if (isMasterSrcEntry(node)) {
        consumed.add(join(dirname(p), node.kwargs.src));
      }
    }
  }
  return consumed;
}

/**
 * Wrap an interpreter fragment in a full HTML document shell.
 *
 * @param {string} fragment - Raw HTML fragment from the interpreter.
 * @param {string} title    - Document title (derived from fixture filename).
 * @returns {string} Complete HTML document.
 */
function wrapInHtmlShell(fragment, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
${SHELL_CSS}
</style>
</head>
<body>
${fragment}
</body>
</html>
`;
}

/**
 * Process a single .emd file and RETURN the wrapped HTML (no write). Exported so the
 * HTML-validity gate (validity-html.test.js) renders the exact bytes this writer commits,
 * generate-and-check — no staleness gap, one render path, no drift.
 *
 * @param {string} emdPath - Absolute path to the .emd file.
 * @returns {string} the full wrapped HTML document.
 */
export function renderFixtureHtml(emdPath) {
  const src = readFileSync(emdPath, 'utf8');
  const name = basename(emdPath, '.emd');

  // DSL runtime: render fixtures in a live mode so the generated .html matches
  // what users get (a diagram that renders), not the library's bare 'skip'
  // default. live-link is the representative, lean choice — a <script src> to the
  // pinned CDN (small, deterministic), mirroring the CDN-default posture; the
  // demonstrative LIVE_INLINE_FIXTURES below override to the self-contained
  // bundle. Non-DSL fixtures are unaffected (assets are gated on DSL presence).
  const interpreterOptions = { assetsDir: join(FIXTURES_DIR, 'assets'), dslMode: 'live-link' };
  if (LIVE_INLINE_FIXTURES.has(name)) {
    interpreterOptions.dslMode = 'live-inline';
  }
  if (ABC_STATIC_FIXTURES.has(name)) {
    interpreterOptions.abcMode = 'static';
  }
  if (TOC_FIXTURES.has(name)) {
    interpreterOptions.toc = true;
  }

  const processor = buildEnscribePipeline(interpreterOptions);

  // A master document is assembled before rendering: its `src` structure children
  // (`<section src>` / `<chapter src>` / …) are resolved against the master's own
  // directory and stitched into one tree, then run through the same pipeline (the
  // handoff `enscribe build` and the browser `renderMasterAsync` also perform). A
  // plain document renders straight through.
  let fragment;
  if (isMaster(src, processor)) {
    const masterDir = dirname(emdPath);
    const tree = assembleMasterDocument({
      source: src,
      readFile: (p) => readFileSync(p, 'utf8'),
      resolve: (rel) => join(masterDir, rel),
      parse: (s) => processor.parse(s),
    });
    fragment = String(processor.stringify(processor.runSync(tree)));
  } else {
    fragment = String(processor.processSync(src));
  }
  return wrapInHtmlShell(fragment, name);
}

// Find all source fixtures, recursing into subdirectories (#5 organises the
// systematic fixtures under context/, sweep/, register/, …). The `archive/`
// directory holds migrated-out redundant fixtures and is skipped. `.emd` is the
// canonical extension; `.enscribe` is accepted as an alias.
function findEmd(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (f === 'archive') continue;
    // master-website is a LIVE-ONLY fixture (#246 S2a): a website has no static build yet, so it
    // gets no static golden — the jsdom live test (master-website-live.test.js) is its proof.
    if (f === 'master-website') continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...findEmd(p));
    else if (f.endsWith('.emd') || f.endsWith('.enscribe')) out.push(p);
  }
  return out;
}
/**
 * Render EVERY rendered-document fixture and RETURN the results (no writes). One list,
 * shared by the on-disk writer below (the `verify` path) and the HTML-validity gate (the
 * `test` path), so both validate the exact same bytes. Covers the standalone `.emd`
 * fixtures + the master-book separate pages; excludes the live shell (a mount template,
 * not rendered document content).
 *
 * @returns {Array<{ relPath: string, html: string }>} relPath is relative to FIXTURES_DIR.
 */
export function renderAllFixtures() {
  const emdFiles = findEmd(FIXTURES_DIR).sort();
  // A master's `src` structure children are consumed by assembly and get no standalone
  // golden; compute that skip set from the masters themselves.
  const consumed = collectConsumedChildren(emdFiles);
  const out = [];
  for (const emdPath of emdFiles.filter((p) => !consumed.has(p))) {
    out.push({ relPath: relative(FIXTURES_DIR, join(dirname(emdPath), `${basename(emdPath, '.emd')}.html`)), html: renderFixtureHtml(emdPath) });
  }
  // P1 (#205): the static separate-pages book — the same publishBookPages the CLI `build`
  // (book default) uses. Each page is a standalone rendered document.
  const bookDir = join(FIXTURES_DIR, 'master-book');
  const proc = buildEnscribePipeline({ assetsDir: join(FIXTURES_DIR, 'assets') });
  const file = new VFile({ path: 'master-book.emd' });
  const tree = assembleMasterDocument({
    source: readFileSync(join(bookDir, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(bookDir, rel),
    parse: (s) => proc.parse(s),
  });
  const numbered = proc.runSync(tree, file);
  for (const [name, html] of publishBookPages({ numbered, file, proc, defaultCss: SHELL_CSS })) {
    out.push({ relPath: join('master-book', 'pages', name), html });
  }
  return out;
}

// ── The on-disk writer (the `verify` path): only when run as a script, not on import. ──
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const results = renderAllFixtures();
  const pagesDir = join(FIXTURES_DIR, 'master-book', 'pages');
  mkdirSync(pagesDir, { recursive: true });
  for (const { relPath, html } of results) {
    writeFileSync(join(FIXTURES_DIR, relPath), html, 'utf8');
  }
  console.log(`Rendered + wrote ${results.length} fixture HTML file(s).`);

  // #215: the master-book LIVE shell (index.html) is generated by the emitter, not hand-written.
  // Regenerate it here (dev `assets` = the scattered source-tree paths) so a change to the emitter
  // flows through `node test/render-fixtures.js`; emit-shell.test.js guards the committed file matches.
  writeFileSync(join(FIXTURES_DIR, 'master-book', 'index.html'), emitLiveShell(MASTER_BOOK_SHELL_PARAMS), 'utf8');
  console.log('  wrote master-book/index.html (emitLiveShell, dev assets)');

  console.log('Done.');
}
