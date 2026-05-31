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
 * Custom-element display CSS is loaded from src/assets/default.css and inlined
 * in the shell. It is for browser viewing only; it is not emitted by the
 * interpreter. Editing default.css changes all rendered fixtures on next run.
 *
 * Usage:
 *   node test/render-fixtures.js
 *
 * Reads:  test/fixtures/*.emd
 * Writes: test/fixtures/*.html  (one per .emd)
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from 'remark-enscribe';
import { enscribeInterpreter } from '../src/index.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

/**
 * Default theme CSS for Layer 1 custom elements.
 * Read from src/assets/default.css so there is a single source of truth.
 *
 * NOTE: This CSS is shell-only. It is not emitted by the interpreter.
 * Document fonts (Inter, Source Code Pro) are now injected by the interpreter
 * itself (index.js), not by this shell. Removing them here avoids double injection.
 */
const DEFAULT_CSS_PATH = resolve(__dirname, '..', 'src', 'assets', 'default.css');
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
  'document-45-calibration',
  'document-46-reproducible-research',
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
 * Process a single .emd file and write the wrapped HTML.
 *
 * @param {string} emdPath - Absolute path to the .emd file.
 */
function renderFixture(emdPath) {
  const src = readFileSync(emdPath, 'utf8');
  const name = basename(emdPath, '.emd');

  const interpreterOptions = { assetsDir: join(FIXTURES_DIR, 'assets') };
  if (LIVE_INLINE_FIXTURES.has(name)) {
    interpreterOptions.dslMode = 'live-inline';
  }
  if (ABC_STATIC_FIXTURES.has(name)) {
    interpreterOptions.abcMode = 'static';
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkEnscribe)
    .use(enscribeInterpreter, interpreterOptions);

  const fragment = String(processor.processSync(src));
  const html = wrapInHtmlShell(fragment, name);

  const outPath = join(FIXTURES_DIR, `${name}.html`);
  writeFileSync(outPath, html, 'utf8');
  console.log(`  wrote ${basename(outPath)}`);
}

// Find all source fixtures in the fixtures directory and render them.
// `.emd` is the canonical extension; `.enscribe` is accepted as an alias.
const emdFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith('.emd') || f.endsWith('.enscribe'))
  .sort()
  .map(f => join(FIXTURES_DIR, f));

console.log(`Rendering ${emdFiles.length} fixture(s)...`);
for (const emdPath of emdFiles) {
  renderFixture(emdPath);
}
console.log('Done.');
