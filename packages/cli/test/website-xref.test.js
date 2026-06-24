// #300 slice 2 — cross-page reference resolution in the COMPOSITION static website build.
//
// The static builder numbers each page in its OWN native scope, harvests every page's cross-ref
// registry, merges into one SITE registry, then renders each page natively and resolves cross-page
// <ref>s against the merge. This proves the regression is gone WITHOUT flattening:
//   (a) article→article — a ref across two article-pages shows the target's number and links to it;
//       proven BOTH WAYS (static vs the live website render): the display NUMBER is byte-identical,
//       and the href OWNER matches once the scheme is normalized (static emits a `.html` path, live
//       keeps `?page=owner#anchor` — different schemes by design; #300 slice 2 hrefFor hook).
//   (b) article→book — an article ref to a BOOK chapter's figure shows the figure's BOOK NATIVE number
//       (e.g. "2.1"), byte-identical to that figure's own label on its chapter-page, and links to the
//       chapter-PAGE. This is the proof flattening is gone: a page-scope (flattened) build would show
//       "1" here. It is asserted STATIC-only because the live SPA still flattens books (page scope) —
//       a separate, flagged-not-fixed surface — so live would show the page-scope number here.

import assert from 'node:assert';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { VFile } from 'vfile';
import { buildStaticWebsite } from '../src/static-website.js';
import {
  buildEnscribePipeline, flattenNavPages, buildWebsiteTree, buildLiveWebsite, renderLiveWebsitePage,
} from '@enscribejs/enscribe';
import { ENSCRIBE_NAV_MODEL } from '@enscribejs/enscribe/core/file-data-keys';

// The live website render, reduced to its pure core (mirrors browser.js mountLiveWebsite sans DOM):
// parse each external page → its children, assemble the synthetic <book>, ONE global pass, then render
// each page through renderLiveWebsitePage. Article-only here (the live path flattens books by design).
function liveRender(masterSource, masterDir) {
  const proc = buildEnscribePipeline({});
  const navFile = new VFile({ value: masterSource });
  proc.runSync(proc.parse(masterSource), navFile);
  const srcOf = (src) => { const flat = resolve(masterDir, `${src}.emd`); return existsSync(flat) ? flat : resolve(masterDir, src, 'index.emd'); };
  // Article-only: the live SPA flattens books (page scope) — out of scope here — and a book master's
  // `<chapter src>` children aren't sub-assembled in this minimal driver. Cross-page article refs suffice.
  const pages = flattenNavPages(navFile.data[ENSCRIBE_NAV_MODEL].entries)
    .filter((p) => p.src != null && !/type\s*=\s*book/.test(readFileSync(srcOf(p.src), 'utf8')));
  const contents = pages.map((p) => proc.parse(readFileSync(srcOf(p.src), 'utf8')).children ?? []);
  const file = new VFile({});
  const numbered = proc.runSync(buildWebsiteTree(pages, contents), file);
  const model = buildLiveWebsite({ numbered, file, pages });
  const ctx = { proc, file };
  return Object.fromEntries(pages.map((p) => [p.slug, renderLiveWebsitePage(model, p.slug, ctx)]));
}

// The rendered <ref> anchor for a target colon-id: { href, text }.
function refAnchor(html, targetId) {
  const re = new RegExp(`<a ([^>]*?)href="([^"]*?#${targetId.replace(/[:]/g, '\\:')})"([^>]*?)>([\\s\\S]*?)</a>`);
  const m = String(html).match(re);
  return m ? { href: m[2], text: m[4].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() } : null;
}

// Scheme-normalize a cross-page href → (owner, anchor). Static: `../page-b/#fig:b` → (page-b, fig:b),
// `../guide/second-chapter.html#fig:x` → (second-chapter, fig:x). Live: `?page=page-b#fig:b` → (page-b, fig:b).
function normHref(href) {
  const anchor = (href.match(/#(.+)$/) || [])[1] ?? '';
  const live = href.match(/[?&]page=([^#&]+)/);
  if (live) return { owner: live[1], anchor };
  const path = href.replace(/#.*$/, '').replace(/\/+$/, '');
  const seg = path.split('/').filter((s) => s && s !== '..').pop() || '';
  return { owner: seg.replace(/\.html$/, ''), anchor };
}

export function run_tests() {
  const dir = mkdtempSync(join(tmpdir(), 'enscribe-xref-'));
  const w = (rel, body) => { const p = join(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };

  w('index.emd', [
    '<meta type=website>', '<title | XSite>', '</meta>', '',
    '<nav>',
    '<item src="home" +homepage | Home>',
    '<item src="a" | Page A>',
    '<item src="b" | Page B>',
    '<item src="guide" | Guide>',
    '</nav>',
  ].join('\n'));
  w('home.emd', '<meta type=article>\n<title | Home>\n</meta>\n\nWelcome.');
  // Page A references a figure on page B (article→article) AND a figure in the guide book (article→book).
  w('a.emd', '<meta type=article>\n<title | Page A>\n</meta>\n\nSee <ref @fig:b> on B, and <ref @fig:eleph> in the guide.');
  w('b.emd', '<meta type=article>\n<title | Page B>\n</meta>\n\n<figure #fig:b src="x.svg" | A figure on page B>');
  // A two-chapter book WITH numbering on, so its figure gets a chapter-prefixed number ("2.1") — distinct
  // from the page-scope "1" a flattened build would assign.
  w('guide/index.emd', '<meta type=book>\n<title | Guide>\n</meta>\n\n<config number-sections />\n\n<chapter src="ch1.emd" | First Chapter>\n<chapter src="ch2.emd" | Second Chapter>');
  w('guide/ch1.emd', '<section | Intro>\n\nThe first chapter.');
  w('guide/ch2.emd', '<section | Field Data>\n\n<figure #fig:eleph src="e.svg" | An adult African elephant>');

  const { pages, warnings } = buildStaticWebsite({ masterSource: readFileSync(join(dir, 'index.emd'), 'utf8'), masterDir: dir, defaultCss: '' });
  const live = liveRender(readFileSync(join(dir, 'index.emd'), 'utf8'), dir);
  assert.ok(!warnings.some((m) => /not found|failed/i.test(m)), `no cross-page resolution failures (warnings: ${warnings.join(' | ')})`);

  // ── (a) article→article — both ways: number byte-identical, href owner scheme-normalized ──────────
  {
    const sRef = refAnchor(pages.get('page-a/index.html'), 'fig:b');
    const lRef = refAnchor(live['page-a'], 'fig:b');
    assert.ok(sRef, 'static: page A resolves its <ref @fig:b> (cross-page, not a dangling/error ref)');
    assert.ok(lRef, 'live: page A resolves its <ref @fig:b>');
    assert.equal(sRef.text, lRef.text, `display number byte-identical static≡live (static "${sRef.text}" / live "${lRef.text}")`);
    assert.deepEqual(normHref(sRef.href), normHref(lRef.href),
      `href owner matches once the scheme is normalized (static "${sRef.href}" / live "${lRef.href}")`);
    assert.equal(normHref(sRef.href).owner, 'page-b', 'the cross-page ref links to page B');
    console.log(`PASS: website-xref (a) article→article — both ways: number "${sRef.text}" byte-identical, owner page-b (scheme-normalized)`);
  }

  // ── (b) article→book — STATIC: the BOOK native number (proof flattening is gone) + chapter-page href ──
  {
    const sRef = refAnchor(pages.get('page-a/index.html'), 'fig:eleph');
    assert.ok(sRef, 'static: page A resolves its <ref @fig:eleph> into the book (cross-page)');
    // the figure's OWN native number on its chapter-page (book scope → "2.1"), the byte-identity target.
    const ch = pages.get('guide/second-chapter.html');
    const nativeLabel = (ch.match(/figure-label[^>]*>\s*Figure\s*([0-9]+(?:\.[0-9]+)*)/i) || [])[1];
    assert.equal(nativeLabel, '2.1', `the book figure's NATIVE label is chapter-scoped "2.1" (got "${nativeLabel}")`);
    assert.equal(sRef.text, `figure ${nativeLabel}`,
      `the article→book ref shows the figure's BOOK native number "${nativeLabel}" byte-identically (got "${sRef.text}") — a flattened page-scope build would show "figure 1"`);
    assert.equal(normHref(sRef.href).owner, 'second-chapter',
      `the article→book ref links to the book CHAPTER-PAGE (got "${sRef.href}")`);
    console.log(`PASS: website-xref (b) article→book — STATIC shows the book native "${sRef.text}" (not page-scope) + links to the chapter-page (flattening is gone)`);
  }
}
