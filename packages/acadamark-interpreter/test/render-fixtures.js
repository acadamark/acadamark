/**
 * Render all .acm fixture documents to .html files.
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
 * Reads:  test/fixtures/*.acm
 * Writes: test/fixtures/*.html  (one per .acm)
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import { acadamarkInterpreter } from '../src/index.js';
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
 * Process a single .acm file and write the wrapped HTML.
 *
 * @param {string} acmPath - Absolute path to the .acm file.
 */
function renderFixture(acmPath) {
  const src = readFileSync(acmPath, 'utf8');
  const name = basename(acmPath, '.acm');

  const processor = unified()
    .use(remarkParse)
    .use(remarkAcadamark)
    .use(acadamarkInterpreter, { assetsDir: join(FIXTURES_DIR, 'assets') });

  const fragment = String(processor.processSync(src));
  const html = wrapInHtmlShell(fragment, name);

  const outPath = join(FIXTURES_DIR, `${name}.html`);
  writeFileSync(outPath, html, 'utf8');
  console.log(`  wrote ${basename(outPath)}`);
}

// Find all .acm files in the fixtures directory and render them.
const acmFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith('.acm'))
  .sort()
  .map(f => join(FIXTURES_DIR, f));

console.log(`Rendering ${acmFiles.length} fixture(s)...`);
for (const acmPath of acmFiles) {
  renderFixture(acmPath);
}
console.log('Done.');
