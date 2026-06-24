// The cross-page LINK LAYER (cross-page-links.js): the ONE cross-page <ref> resolver (1-B) and the
// structural <a {slug}> page-link resolver (1-G / 2-C, degrade-not-throw).

import assert from 'node:assert';
import { rewriteCrossPageHrefs, resolvePageSlugLinks } from '../src/master-document/cross-page-links.js';
// the package's own re-export — the single home, what every other module imports through.
import { rewriteCrossPageHrefs as exportedRewrite, resolvePageSlugLinks as exportedResolve } from '../src/interpreter/index.js';

export function run() {
  // ── 1-B: ONE rewriter, the predicate/owner/href injected — serves BOTH call sites ─────────────────
  // Single home: the package re-export is the SAME function the module defines (no forked copy).
  assert.strictEqual(exportedRewrite, rewriteCrossPageHrefs, 'rewriteCrossPageHrefs is re-exported as the one home (no fork)');
  assert.strictEqual(exportedResolve, resolvePageSlugLinks, 'resolvePageSlugLinks is re-exported as the one home (no fork)');

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

  // ── 1-G / 2-C: structural <a {slug}> resolver — resolve, auto-label, degrade; byte-safe splice ────
  const resolve = (slug, { empty }) => slug === 'gone'
    ? { broken: true, label: empty ? slug : undefined }
    : { href: `../${slug}/`, label: empty ? `Title of ${slug}` : undefined };

  // a plain link resolves, the surrounding bytes are untouched (the splice only re-serializes the <a>)
  {
    const html = '<p>before <a data-page-slug="design">the design</a> after &amp; on.</p>';
    const out = resolvePageSlugLinks(html, resolve);
    assert.strictEqual(out, '<p>before <a href="../design/">the design</a> after &amp; on.</p>',
      'a resolvable link is rewritten and every surrounding byte (incl. &amp;) is preserved');
  }
  // an empty link auto-labels from the target title
  assert.match(resolvePageSlugLinks('<a data-page-slug="design"></a>', resolve),
    /<a href="\.\.\/design\/">Title of design<\/a>/, 'an empty link auto-fills the target title');
  // a nested-element label is preserved (the case the old regex was fragile to)
  assert.match(resolvePageSlugLinks('<a data-page-slug="design">see <i>this</i> page</a>', resolve),
    /<a href="\.\.\/design\/">see <i>this<\/i> page<\/a>/, 'a nested-element label is preserved structurally');
  // BROKEN slug → DEGRADE (always-renders): label kept, no href, ref-error marker, NO throw
  {
    const out = resolvePageSlugLinks('<a data-page-slug="gone">dead</a>', resolve);
    assert.match(out, /<a class="ref-error">dead<\/a>/, 'a broken slug degrades to an inert ref-error marker (label kept, no href)');
    assert.ok(!out.includes('data-page-slug') && !out.includes('href='), 'the degraded link has no marker and no live href');
  }
  // a fragment with NO slug links is returned verbatim (no re-parse)
  {
    const plain = '<section>\n  <p>nothing to <i>resolve</i> here.</p>\n</section>';
    assert.strictEqual(resolvePageSlugLinks(plain, resolve), plain, 'a fragment with no page links is byte-identical (fast path)');
  }

  console.log('PASS: cross-page-links — ONE rewriteCrossPageHrefs serves website + book (1-B); structural <a {slug}> resolve/auto-label/degrade with byte-safe splice (1-G/2-C)');
}
