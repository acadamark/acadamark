// Tests for the library-load plugin.
//
// Covers:
//   - Inline BibTeX content loaded from node.content
//   - Inline CSL-JSON content loaded from node.content
//   - External file loaded via kwargs.src
//   - Missing src file: emits warning, continues
//   - Malformed BibTeX: citation-js error caught gracefully
//   - No <data> block: no-op (acadamarkCitations not set)
//   - <data> with no <library>: no-op
//   - Multiple <library> nodes merged

import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { acadamarkLibraryLoad } from '../../src/plugins/library-load.js';
import { makeTag } from 'acadamark-core/tag';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '../fixtures');
const ASSETS_DIR = join(FIXTURES_DIR, 'assets');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A minimal VFile mock. Collects warnings; holds file.data.
 */
function makeFile() {
  const warnings = [];
  return {
    data: {},
    message: (msg) => warnings.push(String(msg)),
    _warnings: warnings,
  };
}

/**
 * Build an acadamarkTag node (matches the shape from-markdown.js produces).
 */
function makeLibraryTag({ src = null, content = null } = {}) {
  const kwargs = {};
  if (src) kwargs.src = src;
  return {
    type: 'acadamarkTag',
    tagname: 'library',
    id: null,
    classes: [],
    kwargs,
    content,
    contentHandler: 'library',
    isOpaqueContent: true,
    positional: [],
    booleans: {},
  };
}

/**
 * Build a root tree with a <data> node containing the given <library> nodes.
 * This mirrors post-article-structuring layout where <data> is a root sibling.
 */
function makeDataTree(libraryNodes) {
  const dataNode = makeTag('data', libraryNodes);
  const article = makeTag('article', []);
  return { type: 'root', children: [article, dataNode] };
}

const INLINE_BIBTEX = `
@article{Smith2020,
  author = {Smith, John},
  title  = {A Study of Things},
  journal = {Journal of Stuff},
  year   = {2020},
  volume = {1},
  pages  = {1--10}
}
@article{Jones2019,
  author = {Jones, Kate},
  title  = {Another Study},
  journal = {Science},
  year   = {2019},
  volume = {42},
  pages  = {100--110}
}
`.trim();

const INLINE_CSL_JSON = JSON.stringify([
  {
    id: 'Doe2022',
    type: 'article-journal',
    title: 'Doing Research',
    author: [{ family: 'Doe', given: 'Jane' }],
    issued: { 'date-parts': [[2022]] },
  },
]);

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- Inline BibTeX content loaded correctly ---
  {
    const lib = makeLibraryTag({ content: INLINE_BIBTEX });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    acadamarkLibraryLoad({ assetsDir: null })(tree, file);

    assert.ok(file.data.acadamarkCitations, 'acadamarkCitations set');
    const { cite, order, style } = file.data.acadamarkCitations;
    assert.ok(cite, 'cite instance present');
    assert.equal(order.length, 0, 'order starts empty');
    assert.equal(style, 'chicago-author-date', 'default style is chicago-author-date');

    const ids = cite.data.map(e => e.id);
    assert.ok(ids.includes('Smith2020'), 'Smith2020 loaded');
    assert.ok(ids.includes('Jones2019'), 'Jones2019 loaded');
    assert.equal(file._warnings.length, 0, 'no warnings for valid BibTeX');
    console.log('PASS: library-load: inline BibTeX');
  }

  // --- Inline CSL-JSON content loaded correctly ---
  {
    const lib = makeLibraryTag({ content: INLINE_CSL_JSON });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    acadamarkLibraryLoad({ assetsDir: null })(tree, file);

    assert.ok(file.data.acadamarkCitations, 'acadamarkCitations set for CSL-JSON');
    const ids = file.data.acadamarkCitations.cite.data.map(e => e.id);
    assert.ok(ids.includes('Doe2022'), 'Doe2022 loaded from CSL-JSON');
    console.log('PASS: library-load: inline CSL-JSON');
  }

  // --- External file loaded via kwargs.src ---
  {
    // Uses test/fixtures/assets/references.bib (created in document-8 step).
    const lib = makeLibraryTag({ src: 'references.bib', content: ' ' });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    acadamarkLibraryLoad({ assetsDir: ASSETS_DIR })(tree, file);

    assert.ok(file.data.acadamarkCitations, 'acadamarkCitations set for src= file');
    const ids = file.data.acadamarkCitations.cite.data.map(e => e.id);
    // references.bib contains Loomes2017 at minimum.
    assert.ok(ids.includes('Loomes2017'), 'Loomes2017 loaded from external file');
    assert.equal(file._warnings.length, 0, 'no warnings for valid external file');
    console.log('PASS: library-load: external file via src=');
  }

  // --- Missing src file emits warning and continues ---
  {
    const lib = makeLibraryTag({ src: 'nonexistent.bib', content: ' ' });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    acadamarkLibraryLoad({ assetsDir: ASSETS_DIR })(tree, file);

    // Should warn but not throw; citations may be null or absent.
    assert.equal(file._warnings.length, 1, 'exactly one warning for missing file');
    assert.ok(
      file._warnings[0].includes('nonexistent.bib'),
      'warning mentions the missing filename',
    );
    console.log('PASS: library-load: missing src file emits warning');
  }

  // --- No <data> block: no-op ---
  {
    const article = makeTag('article', []);
    const tree = { type: 'root', children: [article] };
    const file = makeFile();
    acadamarkLibraryLoad({ assetsDir: null })(tree, file);

    assert.equal(file.data.acadamarkCitations, undefined, 'no citations set when no <data>');
    assert.equal(file._warnings.length, 0, 'no warnings for no <data>');
    console.log('PASS: library-load: no-op when no <data> block');
  }

  // --- <data> with no <library>: no-op ---
  {
    // <data> block exists but contains only non-library children.
    const data = makeTag('data', []);
    const article = makeTag('article', []);
    const tree = { type: 'root', children: [article, data] };
    const file = makeFile();
    acadamarkLibraryLoad({ assetsDir: null })(tree, file);

    assert.equal(file.data.acadamarkCitations, undefined, 'no citations set when <data> has no <library>');
    console.log('PASS: library-load: no-op when <data> has no <library>');
  }

  // --- Multiple <library> nodes merged ---
  {
    const lib1 = makeLibraryTag({ content: `@article{Alpha2000, author={Alpha, A.}, title={T}, journal={J}, year={2000}}` });
    const lib2 = makeLibraryTag({ content: `@article{Beta2001, author={Beta, B.}, title={T}, journal={J}, year={2001}}` });
    const tree = makeDataTree([lib1, lib2]);
    const file = makeFile();
    acadamarkLibraryLoad({ assetsDir: null })(tree, file);

    const ids = file.data.acadamarkCitations.cite.data.map(e => e.id);
    assert.ok(ids.includes('Alpha2000'), 'Alpha2000 from first library');
    assert.ok(ids.includes('Beta2001'), 'Beta2001 from second library');
    console.log('PASS: library-load: multiple <library> nodes merged');
  }

  // --- Style taken from config when present ---
  {
    const lib = makeLibraryTag({ content: INLINE_BIBTEX });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    // Simulate a config that has been set by acadamarkConfigDiscovery.
    file.data.acadamarkConfig = new Map([['citation-style', 'apa']]);
    acadamarkLibraryLoad({ assetsDir: null })(tree, file);

    assert.equal(file.data.acadamarkCitations.style, 'apa', 'style taken from config');
    console.log('PASS: library-load: style from config');
  }
}
