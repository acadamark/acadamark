// The cross-page LINK LAYER (cross-page-links.js): the ONE cross-page <ref> resolver (1-B) and the
// structural <a {slug}> page-link resolver (1-G / 2-C, degrade-not-throw).

import assert from 'node:assert';
import { toHtml } from 'hast-util-to-html';
import { rewriteCrossPageHrefs, resolvePageSlugLinksInTree } from '../src/master-document/cross-page-links.js';
// the package's own re-export — the single home, what every other module imports through.
import { rewriteCrossPageHrefs as exportedRewrite, resolvePageSlugLinksInTree as exportedResolve } from '../src/interpreter/index.js';

// Build hast by hand with the KEBAB `data-page-slug` key the <a> handler sets on the raw toHast node
// (parse5/fromHtml would camelCase it to `dataPageSlug`, which the render-time walker does NOT read — the
// whole point of resolving upstream of serialization is to never re-parse, so the test must not either).
const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const slugLink = (slug, children = []) => el('a', { 'data-page-slug': slug }, children);

export function run() {
  // ── 1-B: ONE rewriter, the predicate/owner/href injected — serves BOTH call sites ─────────────────
  // Single home: the package re-export is the SAME function the module defines (no forked copy).
  assert.strictEqual(exportedRewrite, rewriteCrossPageHrefs, 'rewriteCrossPageHrefs is re-exported as the one home (no fork)');
  assert.strictEqual(exportedResolve, resolvePageSlugLinksInTree, 'resolvePageSlugLinksInTree is re-exported as the one home (no fork)');

  // WEBSITE / live-SPA mode: every same-document href is a candidate; the owner comes from a slug map.
  {
    const html = '<a class="ref" href="#fig:x">Fig X</a> <a class="ref" href="#fig:self">self</a> <a href="#fn1">note</a>';
    const out = rewriteCrossPageHrefs(html, 'page-a', {
      ownerOf: (a) => ({ 'fig:x': 'page-b' })[a] ?? null,
      hrefFor: (owner, anchor) => `../${owner}/#${anchor}`,
    });
    assert.match(out, /<a class="ref" href="\.\.\/page-b\/#fig:x">Fig X<\/a>/, 'website: a cross-page ref → the depth-relative URL');
    assert.match(out, /<a class="ref" href="#fig:self">self<\/a>/, 'website: an OWN-page anchor (no owner) stays in-page');
    assert.match(out, /<a href="#fn1">note<\/a>/, 'website: a non-owned anchor stays in-page');
  }

  // BOOK separate-pages mode (refsOnly): ONLY a `class="ref"` anchor is a candidate (footnote/section
  // anchors stay in-page); the owner is the registry's chapter, mapped to its `.html`.
  {
    const html = '<a href="#fn1">note</a> <a href="#fig:2" class="ref">Fig 2</a> <a href="#fig:here" class="ref">here</a>';
    const registry = new Map([['fig:2', { chapter: 'ch2' }], ['fig:here', { chapter: 'ch1' }]]);
    const idToUrl = new Map([['ch2', 'ch2.html']]);
    const out = rewriteCrossPageHrefs(html, 'ch1', {
      refsOnly: true,
      ownerOf: (a) => registry.get(a)?.chapter ?? null,
      hrefFor: (owner, anchor) => { const u = idToUrl.get(owner); return u ? `${u}#${anchor}` : null; },
    });
    assert.match(out, /<a href="ch2.html#fig:2" class="ref">Fig 2<\/a>/, 'book: a cross-chapter ref → the chapter page');
    assert.match(out, /<a href="#fn1">note<\/a>/, 'book: refsOnly leaves a NON-ref anchor in-page (the precision difference 1-B removed)');
    assert.match(out, /<a href="#fig:here" class="ref">here<\/a>/, 'book: an IN-chapter ref (owner === current) stays in-page');
  }

  // ── 1-G / 2-C / #318: render-time <a {slug}> resolver — resolve, auto-label, degrade; IN-TREE, no re-parse ──
  const resolve = (slug, { empty }) => slug === 'gone'
    ? { broken: true, label: empty ? slug : undefined }
    : { href: `../${slug}/`, label: empty ? `Title of ${slug}` : undefined };

  // a plain link resolves; the marker is consumed; the surrounding tree is untouched.
  {
    const a = slugLink('design', [text('the design')]);
    const tree = el('p', {}, [text('before '), a, text(' after on.')]);
    resolvePageSlugLinksInTree(tree, resolve);
    assert.strictEqual(a.properties.href, '../design/', 'a resolvable link gets the real href');
    assert.strictEqual(a.properties['data-page-slug'], undefined, 'the build-time marker is consumed');
    assert.strictEqual(toHtml(tree), '<p>before <a href="../design/">the design</a> after on.</p>',
      'the resolved link serializes correctly and the surrounding nodes are untouched');
  }
  // an empty link auto-labels from the target title.
  {
    const a = slugLink('design', []);
    resolvePageSlugLinksInTree(a, resolve);
    assert.strictEqual(toHtml(a), '<a href="../design/">Title of design</a>', 'an empty link auto-fills the target title');
  }
  // a nested-anchor label resolves correctly — the case the old REGEX was fragile to (it stopped at the inner
  // `</a>`): here the OUTER slug link AND a nested INNER slug link both resolve, structurally, with no re-parse.
  {
    const inner = slugLink('atlas', [text('the atlas')]);
    const outer = slugLink('design', [text('see '), inner, text(' here')]);
    resolvePageSlugLinksInTree(outer, resolve);
    assert.strictEqual(toHtml(outer), '<a href="../design/">see <a href="../atlas/">the atlas</a> here</a>',
      'a nested-anchor label resolves both the outer and inner links (structural, no wrong-`</a>` truncation)');
  }
  // a non-slug element label (an <i>) is preserved verbatim.
  {
    const a = slugLink('design', [text('see '), el('i', {}, [text('this')]), text(' page')]);
    resolvePageSlugLinksInTree(a, resolve);
    assert.strictEqual(toHtml(a), '<a href="../design/">see <i>this</i> page</a>', 'a nested-element label is preserved');
  }
  // BROKEN slug → DEGRADE (always-renders): label kept, no href, ref-error marker, NO throw.
  {
    const a = slugLink('gone', [text('dead')]);
    resolvePageSlugLinksInTree(a, resolve);
    assert.strictEqual(toHtml(a), '<a class="ref-error">dead</a>', 'a broken slug degrades to an inert ref-error marker (label kept, no href)');
    assert.ok(a.properties['data-page-slug'] === undefined && a.properties.href === undefined, 'the degraded link has no marker and no live href');
  }
  // a tree with NO slug markers is left exactly as-is (an ordinary external anchor is untouched).
  {
    const tree = el('section', {}, [el('a', { href: 'https://x.example/' }, [text('out')])]);
    const before = toHtml(tree);
    resolvePageSlugLinksInTree(tree, resolve);
    assert.strictEqual(toHtml(tree), before, 'a tree with no page-slug markers is unchanged');
  }

  console.log('PASS: cross-page-links — ONE rewriteCrossPageHrefs serves website + book (1-B); render-time in-tree <a {slug}> resolve/auto-label/nested/degrade, no re-parse (1-G/2-C/#318)');
}
