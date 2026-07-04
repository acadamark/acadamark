// Config-driven table of contents (#218; notes/specs/toc-and-numbering.md).
//
// The contents LISTING is config-driven (`<config toc …>`), read in the SHARED compiler so
// the static build and the live render honor it identically — the property the docs site's
// live-ToC parity fix (#207) depends on. This gate covers: body placement + toc-depth,
// the right sticky sidebar + toc-expand, the +unlisted per-heading override, default-off
// additivity, and the load-bearing static≡live parity from the same `<config>`.
//
// The numbering half (number-sections / number-depth / +unnumbered) is the sibling slice.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { render } from '../src/interpreter/browser.js';

// Render on the browser entry's resolved defaults on BOTH sides, so static≡live is a
// matched-options check (mirrors render-parity.test.js's BROWSER_DEFAULTS).
const BROWSER_DEFAULTS = { embedResources: false, hoverPreviewMode: 'link', dslMode: 'live-link' };
const staticRender = (src) => String(buildEnscribePipeline(BROWSER_DEFAULTS).processSync(src));
const liveRender = (src) => render(src); // render() resolves over BROWSER_DEFAULTS internally

const META = '<meta type=article>\n<title | T>\n</meta>\n\n';
// Three levels + a normal sibling + an +unlisted section, exercising depth and unlisted.
const BODY = [
  '<section #sec:intro | Introduction>', '', 'x.', '',
  '<sub-section | Background>', '', 'y.', '',
  '<sub-sub-section | Deep>', '', 'z.', '',
  '<section | Methods>', '', 'm.', '',
  '<section +unlisted | Secret>', '', 's.',
].join('\n');

const bodyNav = (h) => (h.match(/<nav class="enscribe-contents"[\s\S]*?<\/nav>/) || [''])[0];
const sidebarNav = (h) => (h.match(/<nav class="enscribe-toc enscribe-toc--collapsible"[\s\S]*?<\/nav>/) || [''])[0];

export async function run() {
  // ── Gate 1: body placement + toc-depth ────────────────────────────────────────────────
  {
    const h = staticRender(META + '<config toc=true toc-depth=2 toc-location=body />\n\n' + BODY);
    const nav = bodyNav(h);
    assert.ok(nav, 'a body listing renders a <nav class="enscribe-contents">');
    assert.ok(/class="enscribe-contents-heading">Contents</.test(nav), 'the listing is titled "Contents" (default toc-title)');
    assert.ok(/<a href="#sec:intro">Introduction<\/a>/.test(nav) && /<a href="#sec:background">Background<\/a>/.test(nav),
      'entries (levels 1-2) link to their headings');
    assert.ok(!/Deep/.test(nav), 'toc-depth=2 excludes the level-3 heading from the listing');
    assert.ok(h.indexOf('enscribe-contents') < h.indexOf('id="sec:intro"'),
      'the body listing is placed at the top of the body, before the first section');
    console.log('PASS: #218 — body listing renders at the top, honors toc-depth, links to headings');
  }

  // ── Gate 2: right sticky sidebar + toc-expand controls initial expansion ───────────────
  {
    const h1 = staticRender(META + '<config toc=true toc-location=right toc-expand=1 toc-title="On this page" />\n\n' + BODY);
    assert.ok(/enscribe-layout--toc-right/.test(h1), 'toc-location=right → the right-sidebar layout');
    const nav1 = sidebarNav(h1);
    assert.ok(/class="enscribe-toc-summary">On this page</.test(nav1), 'toc-title is the sidebar heading');
    assert.ok(/<details class="enscribe-toc-sub">/.test(nav1) && !/<details class="enscribe-toc-sub" open>/.test(nav1),
      'toc-expand=1 → nested levels are collapsed initially');

    const hAll = staticRender(META + '<config toc=true toc-location=right toc-expand=all />\n\n' + BODY);
    assert.ok(/<details class="enscribe-toc-sub" open>/.test(sidebarNav(hAll)),
      'toc-expand=all → nested levels are expanded initially (toc-expand controls initial expansion)');
    console.log('PASS: #218 — right location is a sticky sidebar; toc-expand controls initial expansion');
  }

  // ── Gate 3: +unlisted is absent from the listing (but still renders) ──────────────────
  {
    const h = staticRender(META + '<config toc=true toc-location=body />\n\n' + BODY);
    const nav = bodyNav(h);
    assert.ok(/Methods/.test(nav), 'a normal section is listed');
    assert.ok(!/Secret/.test(nav), 'the +unlisted section is absent from the listing');
    assert.ok(h.replace(nav, '').includes('Secret'), 'the +unlisted section still renders in the document body');
    console.log('PASS: #218 — +unlisted keeps a heading out of the listing, regardless of depth');
  }

  // ── Gate 4: default OFF — additive, no listing without the config ──────────────────────
  {
    const noConfig = staticRender(META + BODY);
    assert.ok(!/enscribe-contents|enscribe-layout--toc/.test(noConfig), 'no <config toc> → no listing (default off)');
    const tocOff = staticRender(META + '<config toc=false />\n\n' + BODY);
    assert.ok(!/enscribe-contents|enscribe-layout--toc/.test(tocOff), 'toc=false → no listing');
    const otherConfig = staticRender(META + '<config citation-style=chicago />\n\n' + BODY);
    assert.ok(!/enscribe-contents|enscribe-layout--toc/.test(otherConfig), 'an unrelated <config> adds no listing');
    console.log('PASS: #218 — the listing is default-off and additive (no toc config → no listing)');
  }

  // ── Gate 5 (load-bearing): BOTH PATHS honor the same <config> — static ≡ live ─────────
  {
    for (const cfg of [
      '<config toc=true toc-depth=2 toc-location=body />',
      '<config toc=true toc-location=right toc-expand=1 />',
    ]) {
      const src = META + cfg + '\n\n' + BODY;
      const s = staticRender(src);
      const l = liveRender(src);
      const marker = cfg.includes('right') ? 'enscribe-toc--collapsible' : 'enscribe-contents';
      assert.ok(s.includes(marker) && l.includes(marker),
        `the listing appears under BOTH the static and the live render (${cfg})`);
      assert.strictEqual(s, l,
        `static ≡ live from the same ${cfg} — the listing travels with the document (shared compiler)`);
    }
    console.log('PASS: #218 — the same <config toc> produces the listing identically under static AND live render');
  }

  // ── Gate 6: BOOK — the listing reflects the whole-book structure; numbers render un-glued ──────
  {
    const BOOK = [
      '<meta type=book>', '<title | B>', '</meta>', '',
      '<config toc=true toc-location=body number-sections />', '',
      '<chapter | First Chapter>', '', 'x.', '',
      '<sub-section | A Part>', '', 's.', '',
      '<chapter | Second Chapter>', '', 'y.',
    ].join('\n');
    const h = staticRender(BOOK);
    const nav = bodyNav(h);
    assert.ok(nav, 'a book renders a config-driven contents listing');
    assert.ok(['First Chapter', 'A Part', 'Second Chapter'].every((t) => nav.includes(t)),
      'the listing reflects the whole-book structure (chapters + their sections)');
    // This book opts IN to numbering (<config number-sections>); default is now OFF (#246/core). The
    // numbered entry must be UN-GLUED (number + title in separate spans), not the run-together "1First Chapter".
    assert.ok(/<toc-num>1<\/toc-num>/.test(nav) && /<toc-title>First Chapter<\/toc-title>/.test(nav),
      'a numbered book chapter is listed un-glued (<toc-num> + <toc-title>), not "1First Chapter"');
    assert.ok(h.indexOf('enscribe-contents') < h.indexOf('book-part-type'),
      'the listing is inserted at the top of the book body, before the first chapter');
    console.log('PASS: #218 — a book lists its whole-book structure; numbered entries render un-glued');
  }

  console.log('All config-driven contents-listing (#218) checks passed.');
}
