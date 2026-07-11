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
//   - No citations loaded → __cite-error with the authored keys (#395 always-renders)

import assert from 'node:assert/strict';
import Cite from 'citation-js';
import { enscribeCiteResolution } from '../../src/interpreter/plugins/cite-resolution.js';
import { makeTag } from '../../src/core/tag.js';
import { isEnscribeTag } from '../../src/interpreter/lib/ast-helpers.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(citeInstance = null, style = 'chicago-author-date') {
  const file = { data: {} };
  if (citeInstance) {
    file.data.enscribeCitations = { cite: citeInstance, order: [], style };
  }
  file.message = (msg) => {}; // suppress warnings
  return file;
}

function makeCiteNode({ atRefs = [], positional = [], content = null } = {}) {
  return {
    type: 'enscribeTag',
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
  const body = article.content.find(n => isEnscribeTag(n, 'article-body'));
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
    enscribeCiteResolution()(tree, file);

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
    enscribeCiteResolution()(tree, file);

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

  // --- Pipe/long-form content: RETIRED (#409) — flags visibly, never reads as keys ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    // <cite @Smith2020 | custom text> — the custom-text form has no citation meaning.
    const citeNode = makeCiteNode({ content: 'custom text' });
    const tree = makeArticleTree([citeNode]);
    enscribeCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children[0].tagname, '__cite-error', 'pipe-form content → visible marker (#409: retired)');
    assert.ok(children[0].kwargs.keys.includes('custom text') && children[0].kwargs.keys.includes('prefix/suffix'),
      'the marker names the unsupported form and points at prefix/suffix');
    console.log('PASS: cite-resolution: pipe/long custom text → visible unsupported-form marker (#409)');
  }

  // --- All missing keys → __cite-error ---
  {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    const citeNode = makeCiteNode({ atRefs: ['MISSING1', 'MISSING2'] });
    const tree = makeArticleTree([citeNode]);
    enscribeCiteResolution()(tree, file);

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
    enscribeCiteResolution()(tree, file);

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
    enscribeCiteResolution()(tree, file);

    const order = file.data.enscribeCitations.order;
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
    enscribeCiteResolution()(tree, file);

    const order = file.data.enscribeCitations.order;
    const smithCount = order.filter(k => k === 'Smith2020').length;
    assert.equal(smithCount, 1, 'Smith2020 appears only once in order (no duplicates)');
    console.log('PASS: cite-resolution: repeated citations not duplicated in order');
  }

  // --- No citations loaded → __cite-error with the authored keys (#395) ---
  // always-renders: with no <library> in scope the authored cite must not
  // silently render as an empty <cite></cite> — it gets the same visible
  // ??cite: …?? marker a missing key gets.
  {
    const file = makeFile(null); // no enscribeCitations
    const citeNode = makeCiteNode({ atRefs: ['Smith2020'] });
    const tree = makeArticleTree([citeNode]);
    enscribeCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children.length, 1, 'one replacement node');
    assert.equal(children[0].tagname, '__cite-error', 'no library → __cite-error');
    assert.equal(children[0].kwargs.keys, 'Smith2020', 'authored keys carried on the error node');
    console.log('PASS: cite-resolution: no library in scope → visible __cite-error');
  }

  // --- No citations loaded, multi-key: all authored keys on one error node ---
  {
    const file = makeFile(null);
    const citeNode = makeCiteNode({ atRefs: ['Smith2020', 'Jones2019'] });
    const tree = makeArticleTree([citeNode]);
    enscribeCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children.length, 1, 'one replacement node');
    assert.equal(children[0].tagname, '__cite-error', 'no library → __cite-error');
    assert.equal(children[0].kwargs.keys, 'Smith2020,Jones2019', 'all keys listed');
    console.log('PASS: cite-resolution: no library, multi-key → one __cite-error listing all keys');
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
    enscribeCiteResolution()(tree, file);

    const children = getParagraphChildren(tree);
    assert.equal(children.length, 1, 'bracketed-list: one replacement node');
    assert.equal(children[0].tagname, '__cite-marker', 'bracketed-list → __cite-marker');
    assert.ok(children[0].kwargs.keys.includes('Smith2020'), 'Smith2020 key extracted (@ stripped)');
    assert.ok(children[0].kwargs.keys.includes('Jones2019'), 'Jones2019 key extracted (@ stripped)');
    assert.ok(children[0].kwargs.html.includes('Smith'), 'bracketed-list: Smith in formatted output');
    assert.ok(children[0].kwargs.html.includes('Jones'), 'bracketed-list: Jones in formatted output');
    console.log('PASS: cite-resolution: bracketed-list [@key, @key] path (B-1 fix verified)');
  }

  // ═══ #409: the citation item grammar (Pandoc's) — every worked example + edges ═══
  // Nodes carry rawArgs (the parser's verbatim args capture); the resolver parses it
  // under cite.md's item grammar and flows items through citation-js as citeproc items.

  const html409 = (rawArgs, kwargs = {}) => {
    const cite = new Cite(TEST_BIBTEX);
    const file = makeFile(cite);
    const node = makeCiteNode({});
    node.rawArgs = rawArgs;
    node.kwargs = kwargs;
    const tree = makeArticleTree([node]);
    enscribeCiteResolution()(tree, file);
    return getParagraphChildren(tree).map((n) => ({ tag: n.tagname, kwargs: n.kwargs }));
  };

  // --- worked example: locator ---
  {
    const [marker] = html409(' @Smith2020, p. 42');
    assert.equal(marker.tag, '__cite-marker');
    assert.ok(marker.kwargs.html.includes('p. 42'), 'locator flows through the CSL render');
    console.log('PASS: #409 — <cite @key, p. 42> renders the page locator');
  }

  // --- worked example: two items with locators ---
  {
    const [marker] = html409(' @Smith2020, p. 42; @Jones2019, ch. 3');
    assert.ok(marker.kwargs.html.includes('p. 42') && /[Cc]hap/.test(marker.kwargs.html),
      'both items carry their locators (chapter label rendered by the style)');
    console.log('PASS: #409 — semicolon-separated items each keep their locator');
  }

  // --- worked examples: prefix, suffix, bare number ---
  {
    assert.ok(html409(' see @Smith2020, pp. 33-35')[0].kwargs.html.includes('see '), 'positional prefix');
    assert.ok(html409(' @Smith2020, p. 42 and passim')[0].kwargs.html.includes('and passim'), 'trailing suffix');
    assert.ok(html409(' @Smith2020, 42')[0].kwargs.html.includes('p. 42'), 'bare number ⇒ page (Pandoc rule)');
    console.log('PASS: #409 — prefix / suffix / bare-number-page forms');
  }

  // --- disambiguation: a locator never eats a key; a key never eats a locator ---
  {
    const [marker] = html409(' @Smith2020, @Jones2019');
    assert.equal(marker.tag, '__cite-marker');
    assert.ok(marker.kwargs.keys.includes('Smith2020') && marker.kwargs.keys.includes('Jones2019'),
      '<cite @a, @b> stays a two-key group (comma before @ starts a new item)');
    const both = html409(' @Smith2020, p. 5, @Jones2019');
    assert.ok(both[0].kwargs.keys.includes('Smith2020') && both[0].kwargs.keys.includes('Jones2019'),
      'a key after a locator still starts its own item');
    assert.ok(both[0].kwargs.html.includes('p. 5'), 'and the locator stays with its own item');
    console.log('PASS: #409 — disambiguation: keys and locators cannot eat each other');
  }

  // --- ambiguity flags visibly: two @keys in one item ---
  {
    const out = html409(' @Smith2020 @Jones2019, p. 5');
    assert.equal(out[0].tag, '__cite-error', 'an item with two @keys is malformed — flagged, never guessed');
    assert.ok(out[0].kwargs.keys.includes('@Smith2020 @Jones2019'), 'the marker carries the raw item text');
    console.log('PASS: #409 — multi-key item flags visibly (always-renders)');
  }

  // --- the kwarg long form works; conflicts flag beside the render ---
  {
    assert.ok(html409(' @Smith2020', { page: '42' })[0].kwargs.html.includes('p. 42'), 'page= kwarg wired');
    assert.ok(html409(' Smith2020', { page: 'iv, vi-xi' })[0].kwargs.html.includes('iv'), 'kwarg escape hatch (comma value)');
    const conflict = html409(' @Smith2020, p. 42', { page: '43' });
    assert.equal(conflict[0].tag, '__cite-marker');
    assert.ok(conflict[0].kwargs.html.includes('p. 42'), 'inline locator renders');
    assert.equal(conflict[1].tag, '__cite-error', 'the ignored kwarg conflict flags beside it');
    const multi = html409(' @Smith2020; @Jones2019', { page: '5' });
    assert.equal(multi[1].tag, '__cite-error', 'a locator kwarg on a multi-item cite flags (no owner guessed)');
    console.log('PASS: #409 — kwarg long form + conflict/ambiguity flags');
  }

  // --- legacy interiors unchanged: no @ anywhere = plain key list ---
  {
    const [marker] = html409(' Smith2020, Jones2019');
    assert.equal(marker.tag, '__cite-marker');
    assert.ok(marker.kwargs.keys.includes('Smith2020') && marker.kwargs.keys.includes('Jones2019'),
      'comma-separated bare keys stay a key list');
    console.log('PASS: #409 — no-@ interior is the unchanged legacy key list');
  }
}
