// Gutter-chevron clearance — the width-sweep-vs-ALL-neighbors geometry guard (#420 follow-up).
//
// #420 gave the chapter-arrow chevrons CSS on website-embedded book pages, but its verification only
// checked chevron-vs-reading-column at ONE width (1280px). It missed chevron-vs-RAILS, and it missed
// that the chevron's fixed-position calc omitted the grid's own horizontal padding — so the right
// chevron sat ON the on-this-page rail at every desktop width. This guard closes the gap for good:
// across a viewport sweep, BOTH chevrons must rect-intersect NONE of {reading column, left chapter
// rail, right on-this-page rail, back-to-top} — on a 3-col (both-rails) book page.
//
// Tier 2 (opportunistic, the delivery-browser.mjs pattern): a real headless browser measures
// getBoundingClientRect. SKIP (loud, with a human-check note) when no driver is importable.

import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { findChromium, detectDriver, openBrowser } from './delivery-browser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const CLI = join(ROOT, 'packages/cli/bin/enscribe.js');
const FIX = join(__dirname, 'fixtures');

const WIDTHS = [984, 1000, 1040, 1100, 1160, 1200, 1240, 1288, 1300, 1360, 1440, 1560, 1700];
const NEIGHBORS = {
  column: '.enscribe-body',
  leftRail: '.enscribe-chapter-rail',
  rightRail: '.enscribe-onthispage',
  backToTop: '.enscribe-back-to-top',
};
const CHEVRONS = { prev: '.enscribe-chapter-arrow--prev', next: '.enscribe-chapter-arrow--next' };

function build(master, out) {
  const r = spawnSync(process.execPath, [CLI, 'build', master, '-o', out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`build failed for ${master}: ${r.stderr || r.stdout}`);
}

export async function run_tests() {
  const driver = await detectDriver();
  const chromium = findChromium();
  if (!driver) {
    console.log('SKIP: chapter-arrow gutter clearance — no playwright/puppeteer driver importable.');
    console.log('      Human check: open a 3-col book page (the docs authoring guide) and resize 984→1700px;');
    console.log('      the ‹/› gutter chevrons must never touch the chapter rail or the on-this-page rail.');
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'enscribe-arrows-'));
  let browser = null;
  try {
    // The two rendered surfaces that carry CHAPTER_ARROWS_CSS on a 3-col (both-rails) book page:
    //  - a static WEBSITE book page (website-mini's `guide` book — the reported defect surface), and
    //  - a STANDALONE separate-pages book (master-book — the prompt's "confirm standalone unaffected").
    // The live-website SPA carries byte-identical CSS (the #420 co-travel guard) over the same grid, so
    // its chevron geometry equals the static page's; the live test harness is jsdom, which has no layout
    // engine to measure — so the static surfaces are the meaningful geometry coverage.
    build(join(FIX, 'website-mini/index.emd'), join(dir, 'web'));
    build(join(ROOT, 'packages/enscribe/test/fixtures/master-book/master-book.emd'), join(dir, 'book'));
    const PAGES = [
      ['static website book page', join(dir, 'web/guide/first-chapter.html')],
      ['standalone book page', join(dir, 'book/counting-elephants.html')],
    ];

    browser = await openBrowser(driver, /-core$/.test(driver.name) ? chromium : undefined);
    const page = await browser.page(false);
    for (const [label, htmlPath] of PAGES) {
      await page.goto(pathToFileURL(htmlPath).href);
      const failures = [];
      let minClearance = Infinity;
      for (const w of WIDTHS) {
        await page.setViewport({ width: w, height: 900 });
        const rects = await page.eval((sels) => {
          // Scroll to mid-document so the tall rails provably span the fixed chevron's vertical centre,
          // making the rect-intersect meaningful (not a false miss from the chevron being above/below).
          window.scrollTo(0, Math.max(0, document.body.scrollHeight / 2 - 450));
          const out = {};
          for (const [k, sel] of Object.entries(sels)) {
            const el = document.querySelector(sel);
            out[k] = el ? (({ left, right, top, bottom }) => ({ left, right, top, bottom }))(el.getBoundingClientRect()) : null;
          }
          return out;
        }, { ...CHEVRONS, ...NEIGHBORS });

        const intersect = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        for (const ck of Object.keys(CHEVRONS)) {
          for (const nk of Object.keys(NEIGHBORS)) {
            if (intersect(rects[ck], rects[nk])) failures.push(`${w}px: ${ck} ∩ ${nk}`);
          }
        }
        // Horizontal gutter clearance (the scroll-independent invariant): the chevron sits between the
        // content edge and the rail edge with room on each side.
        if (rects.next && rects.rightRail && rects.column) {
          minClearance = Math.min(minClearance, rects.rightRail.left - rects.next.right, rects.next.left - rects.column.right);
        }
        if (rects.prev && rects.leftRail && rects.column) {
          minClearance = Math.min(minClearance, rects.prev.left - rects.leftRail.right, rects.column.left - rects.prev.right);
        }
      }
      assert.equal(failures.length, 0,
        `${label}: gutter chevrons must not intersect any neighbor across 984–1700px — got: ${failures.join('; ')}`);
      assert.ok(minClearance >= 4,
        `${label}: chevrons must keep a comfortable gutter clearance (>=4px each side); worst was ${minClearance}px`);
      console.log(`PASS: chapter-arrow clearance — ${label}: zero intersections 984–1700px; min gutter clearance ${minClearance}px (Tier 2)`);
    }
  } finally {
    if (browser) await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run_tests();
