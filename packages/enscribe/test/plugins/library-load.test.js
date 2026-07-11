// Tests for the library-load plugin.
//
// Covers:
//   - Inline BibTeX content loaded from node.content
//   - Inline CSL-JSON content loaded from node.content
//   - External file loaded via kwargs.src
//   - Missing src file: visible __library-error (#133)
//   - Unparseable inline content: visible __library-error (#395)
//   - No <data> block: no-op (enscribeCitations not set)
//   - <data> with no <library>: no-op
//   - Multiple <library> nodes merged

import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enscribeLibraryLoad } from '../../src/interpreter/plugins/library-load.js';
import { makeTag } from '../../src/core/tag.js';

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
 * Build an enscribeTag node (matches the shape from-markdown.js produces).
 */
function makeLibraryTag({ src = null, content = null } = {}) {
  const kwargs = {};
  if (src) kwargs.src = src;
  return {
    type: 'enscribeTag',
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
    enscribeLibraryLoad({ assetsDir: null })(tree, file);

    assert.ok(file.data.enscribeCitations, 'enscribeCitations set');
    const { cite, order, style } = file.data.enscribeCitations;
    assert.ok(cite, 'cite instance present');
    assert.equal(order.length, 0, 'order starts empty');
    assert.equal(style, 'chicago-author-date', 'default style is chicago-author-date');

    const ids = cite.data.map(e => e.id);
    assert.ok(ids.includes('Smith2020'), 'Smith2020 loaded');
    assert.ok(ids.includes('Jones2019'), 'Jones2019 loaded');
    assert.equal(file._warnings.length, 0, 'no warnings for valid BibTeX');
    console.log('PASS: library-load: inline BibTeX');
  }

  // --- #22 slice 3: format-word positional <library bibtex> ≡ bare <library> ---
  {
    // Bare form (citation-js auto-detect).
    const bareFile = makeFile();
    enscribeLibraryLoad({ assetsDir: null })(makeDataTree([makeLibraryTag({ content: INLINE_BIBTEX })]), bareFile);
    const bareIds = bareFile.data.enscribeCitations.cite.data.map(e => e.id).sort();

    // Format-word form: positional[0] = 'bibtex' forces the BibTeX parser.
    const worded = makeLibraryTag({ content: INLINE_BIBTEX });
    worded.positional = ['bibtex'];
    const wordedFile = makeFile();
    enscribeLibraryLoad({ assetsDir: null })(makeDataTree([worded]), wordedFile);
    const wordedIds = wordedFile.data.enscribeCitations.cite.data.map(e => e.id).sort();

    assert.deepEqual(wordedIds, bareIds,
      '<library bibtex> resolves the same entries as bare <library> (forceType ≡ auto-detect for BibTeX)');
    assert.ok(wordedIds.includes('Smith2020') && wordedIds.includes('Jones2019'),
      'both entries present via the format word');
    assert.equal(wordedFile._warnings.length, 0, 'no warnings for <library bibtex>');
    console.log('PASS: library-load: <library bibtex> format word ≡ bare <library>');
  }

  // --- Inline CSL-JSON content loaded correctly ---
  {
    const lib = makeLibraryTag({ content: INLINE_CSL_JSON });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    enscribeLibraryLoad({ assetsDir: null })(tree, file);

    assert.ok(file.data.enscribeCitations, 'enscribeCitations set for CSL-JSON');
    const ids = file.data.enscribeCitations.cite.data.map(e => e.id);
    assert.ok(ids.includes('Doe2022'), 'Doe2022 loaded from CSL-JSON');
    console.log('PASS: library-load: inline CSL-JSON');
  }

  // --- External file loaded via kwargs.src ---
  {
    // Uses test/fixtures/assets/references.bib (created in document-8 step).
    const lib = makeLibraryTag({ src: 'references.bib', content: ' ' });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    enscribeLibraryLoad({ assetsDir: ASSETS_DIR })(tree, file);

    assert.ok(file.data.enscribeCitations, 'enscribeCitations set for src= file');
    const ids = file.data.enscribeCitations.cite.data.map(e => e.id);
    // references.bib contains Loomes2017 at minimum.
    assert.ok(ids.includes('Loomes2017'), 'Loomes2017 loaded from external file');
    assert.equal(file._warnings.length, 0, 'no warnings for valid external file');
    console.log('PASS: library-load: external file via src=');
  }

  // --- Missing src file → visible error, not a warning (#133 always-renders) ---
  {
    const lib = makeLibraryTag({ src: 'nonexistent.bib', content: ' ' });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    enscribeLibraryLoad({ assetsDir: ASSETS_DIR })(tree, file);

    // #133: a failed external load renders a visible __library-error node naming
    // the source (injected into the tree), never a silent skip + log message.
    const errs = [];
    (function walk(nodes) {
      for (const n of nodes ?? []) {
        if (n && n.tagname === '__library-error') errs.push(n);
        if (Array.isArray(n?.content)) walk(n.content);
        if (Array.isArray(n?.children)) walk(n.children);
      }
    })(tree.children);
    assert.equal(errs.length, 1, 'exactly one visible __library-error for the missing file');
    assert.ok(String(errs[0].kwargs?.src).includes('nonexistent.bib'), 'error names the missing source');
    assert.equal(file._warnings.length, 0, 'no warning — the failure renders visibly, not as a log message');
    console.log('PASS: library-load: missing src file → visible __library-error (#133)');
  }

  // --- Unparseable INLINE content → visible error too (#395 always-renders) ---
  // Previously warning-only; with unresolvable cites now rendering ??cite:…?? markers,
  // an invisible inline parse failure would read as "key missing" when the real failure
  // is "the library never parsed" — the visible error names the real cause.
  {
    const lib = makeLibraryTag({ content: '@@@ this is not any citation format @@@' });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    enscribeLibraryLoad({ assetsDir: ASSETS_DIR })(tree, file);

    const errs = [];
    (function walk(nodes) {
      for (const n of nodes ?? []) {
        if (n && n.tagname === '__library-error') errs.push(n);
        if (Array.isArray(n?.content)) walk(n.content);
        if (Array.isArray(n?.children)) walk(n.children);
      }
    })(tree.children);
    assert.equal(errs.length, 1, 'exactly one visible __library-error for the unparseable inline content');
    assert.match(String(errs[0].kwargs?.message), /parse failed/, 'error states the parse failure');
    console.log('PASS: library-load: unparseable inline content → visible __library-error (#395)');
  }

  // --- No <data> block: no-op ---
  {
    const article = makeTag('article', []);
    const tree = { type: 'root', children: [article] };
    const file = makeFile();
    enscribeLibraryLoad({ assetsDir: null })(tree, file);

    assert.equal(file.data.enscribeCitations, undefined, 'no citations set when no <data>');
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
    enscribeLibraryLoad({ assetsDir: null })(tree, file);

    assert.equal(file.data.enscribeCitations, undefined, 'no citations set when <data> has no <library>');
    console.log('PASS: library-load: no-op when <data> has no <library>');
  }

  // --- Multiple <library> nodes merged ---
  {
    const lib1 = makeLibraryTag({ content: `@article{Alpha2000, author={Alpha, A.}, title={T}, journal={J}, year={2000}}` });
    const lib2 = makeLibraryTag({ content: `@article{Beta2001, author={Beta, B.}, title={T}, journal={J}, year={2001}}` });
    const tree = makeDataTree([lib1, lib2]);
    const file = makeFile();
    enscribeLibraryLoad({ assetsDir: null })(tree, file);

    const ids = file.data.enscribeCitations.cite.data.map(e => e.id);
    assert.ok(ids.includes('Alpha2000'), 'Alpha2000 from first library');
    assert.ok(ids.includes('Beta2001'), 'Beta2001 from second library');
    console.log('PASS: library-load: multiple <library> nodes merged');
  }

  // --- Style taken from config when present ---
  {
    const lib = makeLibraryTag({ content: INLINE_BIBTEX });
    const tree = makeDataTree([lib]);
    const file = makeFile();
    // Simulate a config that has been set by enscribeConfigDiscovery.
    file.data.enscribeConfig = new Map([['citation-style', 'apa']]);
    enscribeLibraryLoad({ assetsDir: null })(tree, file);

    assert.equal(file.data.enscribeCitations.style, 'apa', 'style taken from config');
    console.log('PASS: library-load: style from config');
  }
}
