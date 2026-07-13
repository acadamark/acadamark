// #431 — the static WEBSITE + separate-pages BOOK honor an authored `<config theme-variant>`.
//
// The single-file render path (document-shell.js) and the live path (#430) already stamp
// data-theme-variant on <html>; the two MULTI-PAGE static shells did not, so an author could
// not pin the default appearance of a published site or book. This proves the two shells the
// static builds compose with — composeWebsiteShellPage and the separate-pages pageShell (via its
// public entry publishBookPages) — now carry the pin, with the same light/dark-only gate and the
// same "auto/absent stamps nothing" behavior emitDocumentShell established. The full CLI wiring
// (config read → shell) is proven in packages/cli/test/dark-variant.test.js.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  publishBookPages,
  composeWebsiteShellPage,
} from '../src/interpreter/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOK_DIR = join(__dirname, 'fixtures', 'master-book');
const ASSETS_DIR = join(__dirname, 'fixtures', 'assets');

// The `<html …>` opening tag of a page — the sole place the variant hook is stamped.
const htmlTag = (page) => page.match(/<html[^>]*>/)[0];

export function run() {
  // ── composeWebsiteShellPage: light/dark stamp the hook; everything else stamps nothing ──────
  {
    const compose = (themeVariant) =>
      htmlTag(composeWebsiteShellPage({ defaultCss: '/*c*/', title: 'T', topBar: '', content: '<p>x</p>', themeVariant }));
    assert.equal(compose('dark'), '<html lang="en" data-theme-variant="dark">', 'website: dark pins the hook');
    assert.equal(compose('light'), '<html lang="en" data-theme-variant="light">', 'website: light pins the hook');
    assert.equal(compose('auto'), '<html lang="en">', 'website: auto stamps nothing (follows the OS)');
    assert.equal(compose(undefined), '<html lang="en">', 'website: absent stamps nothing');
    assert.equal(compose('sepia'), '<html lang="en">', 'website: an invalid value stamps nothing (config-discovery already warned)');
    console.log('PASS: #431 — composeWebsiteShellPage stamps data-theme-variant for light/dark only');
  }

  // ── publishBookPages: the book master's <config theme-variant> pins EVERY chapter page ──────
  // Assembled from the real master-book fixture (5 pages: cover + 3 chapters + appendix) with the
  // variant injected into its existing <config>. A book has one config scope, so the pin is uniform.
  {
    const base = readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8');
    const buildPages = (masterSource) => {
      const proc = buildEnscribePipeline({ assetsDir: ASSETS_DIR });
      const file = new VFile({ path: 'master-book.emd' });
      const tree = assembleMasterDocument({
        source: masterSource,
        readFile: (p) => readFileSync(p, 'utf8'),
        resolve: (rel) => join(BOOK_DIR, rel),
        parse: (s) => proc.parse(s),
      });
      const numbered = proc.runSync(tree, file);
      return publishBookPages({ numbered, file, proc, defaultCss: '/*c*/' });
    };
    const inject = (variant) => base.replace('<config number-sections />', `<config number-sections theme-variant=${variant} />`);

    const dark = buildPages(inject('dark'));
    assert.ok(dark.size >= 2, `the book emits its chapter pages (got ${dark.size})`);
    for (const [name, html] of dark) {
      assert.equal(htmlTag(html), '<html lang="en" data-theme-variant="dark">', `book: ${name} is pinned dark`);
    }

    const light = buildPages(inject('light'));
    for (const [name, html] of light) {
      assert.equal(htmlTag(html), '<html lang="en" data-theme-variant="light">', `book: ${name} is pinned light`);
    }

    // Absent → no stamp on any page (the byte-parity companion: separate-pages-parity.test.js
    // proves the no-config book is byte-identical to its committed goldens; this asserts WHY —
    // an unpinned book stamps nothing, so those goldens are untouched by #431).
    const absent = buildPages(base);
    for (const [name, html] of absent) {
      assert.equal(htmlTag(html), '<html lang="en">', `book: ${name} carries no stamp when the master has no theme-variant`);
    }
    console.log(`PASS: #431 — publishBookPages pins every one of the book's ${dark.size} pages (dark/light); absent stamps nothing`);
  }
}
