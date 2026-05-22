// Tests for the cite-resolution plugin.
//
// Covers:
//   - Single-key cite (positional form)
//   - Multi-key comma-separated positionals
//   - Multi-key space-separated (same result)
//   - Pipe-form content (string in node.content)
//   - All keys missing → __cite-error only
//   - Partial missing → __cite-marker + __cite-error
//   - Citation order tracking (order array populated)
//   - Repeated citations (order not duplicated)
//   - No citations loaded: no-op (cite nodes unchanged)

import assert from 'node:assert/strict';
import Cite from 'citation-js';
import { acadamarkCiteResolution } from '../../src/plugins/cite-resolution.js';
import { makeTag, isAcadamarkTag } from '../../src/lib/ast-helpers.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(citeInstance = null, style = 'chicago-author-date') {
  const file = { data: {} };
  if (citeInstance) {
    file.data.acadamarkCitations = { cite: citeInstance, order: [], style };
  }
  file.message = (msg) => {}; // suppress warnings
  return file;
}

function makeCiteNode({ atRefs = [], positional = [], content = null } = {}) {
  return {
    type: 'acadamarkTag',
    tagname: 'cite',
    id: null,
    atRefs,
    classes: [],
    kwargs: {},
    content,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional,
    booleans: {},
  };
}

/**
 * Wrap cite nodes in a minimal article tree.
 * The cite-resolution plugin walks the full tree recursively.
 */
function makeArticleTree(inlineNodes) {
  const para = { type: 'paragraph', children: inlineNodes };
  const body = makeTag('article-body', [para]);
  const article = makeTag('article', [body]);
  return { type: 'root', children: [article] };
}

/** Get the paragraph.children from the article-body. */
function getParagraphChildren(tree) {
  const article = tree.children[0];
  const body = article.content.find(n => isAcadamarkTag(n, 'article-body'));
  return body.content[0].children;
}

// BibTeX with Smith2020 and Jones2019.
const TEST_BIBTEX = `
@article{Smith2020,
  author  = {Smith, John},
  title   = {A Study of Things},
  journal = {Journal of Stuff},
  year    = {2020}
}
@article{Jones2019,
  author  = {Jones, Kate},
  title   = {Another Study},
  journal = {Science},
  year    = {2019}
}
`.trim();

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- Single-key cite resolves to __cite-marker ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    const citeNode = makeCiteNode({ atRefs: ['Smith2020'] });
    const tree = makeArticleTree([citeNode]);
    acadamarkCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children.length, 1, 'one replacement node');
    assert.equal(children[0].tagname, '__cite-marker', 'replaced with __cite-marker');
    assert.equal(children[0].kwargs.keys, 'Smith2020', 'keys kwarg set');
    assert.ok(children[0].kwargs.html.includes('Smith'), 'formatted citation includes author name');
    assert.ok(children[0].kwargs.html.includes('2020'), 'formatted citation includes year');
    console.log('PASS: cite-resolution: single-key cite');
  }

  // --- Multi-key positionals (comma-separated in source → array) ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    // Parser produces atRefs: ['Jones2019', 'Smith2020'] from <cite @Jones2019, @Smith2020>.
    const citeNode = makeCiteNode({ atRefs: ['Jones2019', 'Smith2020'] });
    const tree = makeArticleTree([citeNode]);
    acadamarkCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children[0].tagname, '__cite-marker', 'multi-key → __cite-marker');
    // Keys joined with comma.
    assert.ok(children[0].kwargs.keys.includes('Jones2019'), 'keys include Jones2019');
    assert.ok(children[0].kwargs.keys.includes('Smith2020'), 'keys include Smith2020');
    // citation-js formats both (alphabetical with chicago-author-date).
    assert.ok(children[0].kwargs.html.includes('Jones'), 'Jones in formatted output');
    assert.ok(children[0].kwargs.html.includes('Smith'), 'Smith in formatted output');
    console.log('PASS: cite-resolution: multi-key atRefs');
  }

  // --- Pipe-form content: string in node.content ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    // <cite | Smith2020, Jones2019> — content is a string.
    const citeNode = makeCiteNode({ content: 'Smith2020, Jones2019' });
    const tree = makeArticleTree([citeNode]);
    acadamarkCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children[0].tagname, '__cite-marker', 'pipe-form content → __cite-marker');
    assert.ok(children[0].kwargs.keys.includes('Smith2020'), 'Smith2020 extracted from content');
    assert.ok(children[0].kwargs.keys.includes('Jones2019'), 'Jones2019 extracted from content');
    console.log('PASS: cite-resolution: pipe-form content string');
  }

  // --- All missing keys → __cite-error ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    const citeNode = makeCiteNode({ atRefs: ['MISSING1', 'MISSING2'] });
    const tree = makeArticleTree([citeNode]);
    acadamarkCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children.length, 1, 'one replacement for all-missing');
    assert.equal(children[0].tagname, '__cite-error', 'all-missing → __cite-error');
    assert.ok(children[0].kwargs.keys.includes('MISSING1'), 'MISSING1 in error keys');
    assert.ok(children[0].kwargs.keys.includes('MISSING2'), 'MISSING2 in error keys');
    console.log('PASS: cite-resolution: all-missing keys');
  }

  // --- Partial missing: __cite-marker + __cite-error ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    // Smith2020 is found; GHOST is not.
    const citeNode = makeCiteNode({ atRefs: ['Smith2020', 'GHOST'] });
    const tree = makeArticleTree([citeNode]);
    acadamarkCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children.length, 2, 'two nodes for partial missing');
    assert.equal(children[0].tagname, '__cite-marker', 'first node is __cite-marker (found keys)');
    assert.equal(children[1].tagname, '__cite-error', 'second node is __cite-error (missing keys)');
    assert.equal(children[0].kwargs.keys, 'Smith2020', 'found key in marker');
    assert.equal(children[1].kwargs.keys, 'GHOST', 'missing key in error');
    console.log('PASS: cite-resolution: partial missing (marker + error)');
  }

  // --- Citation order tracking: order array populated in first-cited order ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    const citeA = makeCiteNode({ atRefs: ['Jones2019'] });
    const citeB = makeCiteNode({ atRefs: ['Smith2020'] });
    const tree = makeArticleTree([citeA, citeB]);
    acadamarkCiteResolution()(tree, file);

    const order = file.data.acadamarkCitations.order;
    assert.equal(order[0], 'Jones2019', 'Jones2019 cited first');
    assert.equal(order[1], 'Smith2020', 'Smith2020 cited second');
    console.log('PASS: cite-resolution: citation order tracking');
  }

  // --- Repeated citations: order array not duplicated ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    const cite1 = makeCiteNode({ atRefs: ['Smith2020'] });
    const cite2 = makeCiteNode({ atRefs: ['Smith2020'] });
    const tree = makeArticleTree([cite1, cite2]);
    acadamarkCiteResolution()(tree, file);

    const order = file.data.acadamarkCitations.order;
    const smithCount = order.filter(k => k === 'Smith2020').length;
    assert.equal(smithCount, 1, 'Smith2020 appears only once in order (no duplicates)');
    console.log('PASS: cite-resolution: repeated citations not duplicated in order');
  }

  // --- No citations loaded: no-op ---
  {
    const file = makeFile(null); // no acadamarkCitations
    const citeNode = makeCiteNode({ atRefs: ['Smith2020'] });
    const tree = makeArticleTree([citeNode]);
    acadamarkCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    // Plugin is a no-op; original cite node is preserved.
    assert.equal(children[0].tagname, 'cite', 'original cite preserved when no citations loaded');
    console.log('PASS: cite-resolution: no-op when no citations loaded');
  }

  // --- Bracketed-list path: <cite [@smith2017, @jones2023]> ---
  // Proves latent bug B-1 is fixed: old code called .trim() on a nested array,
  // crashing. The F1 rewrite flattens and strips @ from each item.
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    // Grammar produces node.positional = [['@Smith2020', '@Jones2019']] for
    // <cite [@Smith2020, @Jones2019]>. Resolver must flatten and strip @.
    const citeNode = makeCiteNode({ positional: [['@Smith2020', '@Jones2019']] });
    const tree = makeArticleTree([citeNode]);
    acadamarkCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children.length, 1, 'bracketed-list: one replacement node');
    assert.equal(children[0].tagname, '__cite-marker', 'bracketed-list → __cite-marker');
    assert.ok(children[0].kwargs.keys.includes('Smith2020'), 'Smith2020 key extracted (@ stripped)');
    assert.ok(children[0].kwargs.keys.includes('Jones2019'), 'Jones2019 key extracted (@ stripped)');
    assert.ok(children[0].kwargs.html.includes('Smith'), 'bracketed-list: Smith in formatted output');
    assert.ok(children[0].kwargs.html.includes('Jones'), 'bracketed-list: Jones in formatted output');
    console.log('PASS: cite-resolution: bracketed-list [@key, @key] path (B-1 fix verified)');
  }
}
