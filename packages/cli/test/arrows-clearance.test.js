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
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildShellActions, SHELL_ACTIONS_CSS, WEBSITE_NAV_CSS, renderLiveArticleEditView } from '@enscribejs/enscribe';
import { findChromium, detectDriver, openBrowser } from './delivery-browser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const CLI = join(ROOT, 'packages/cli/bin/enscribe.js');
const FIX = join(__dirname, 'fixtures');
const PKG_ENSCRIBE = join(ROOT, 'packages/enscribe');

// #435: a self-contained harness for the edit-layout (split) geometry. jsdom has no layout engine, so the
// two-column layout + the responsive collapse + the (now four-affordance) corner clearance are measured in
// a REAL browser here. It mounts the ACTUAL edit-view markup (renderLiveArticleEditView) + the ACTUAL
// corner (buildShellActions) under the ACTUAL shipped CSS, with --split forced on, and sweeps widths. Two
// surfaces: the STANDALONE article body (reading-column-capped → widened by :has()) and the WEBSITE body
// (full-bleed `.enscribe-site` reset — which the standalone widen must NOT override, the review's catch).
function buildEditLayoutHarness(surface) {
  const defaultCss = readFileSync(join(PKG_ENSCRIBE, 'src/interpreter/assets/default.css'), 'utf8');
  const shellCss = readFileSync(join(PKG_ENSCRIBE, 'src/shell/enscribe-shell.css'), 'utf8');
  const website = surface === 'website';
  const corner = buildShellActions({
    edit: true, editOn: true, layout: true, repoUrl: 'https://github.com/enscribejs/enscribe',
    floating: !website, settings: true, document: true, themes: ['modern', 'compact', 'tufte'],
  });
  // The real article edit view, with --split forced (the toggle's effect) and the source pane given a
  // stand-in editor (real CodeMirror is absent in the harness) + the preview given tall content, so both
  // panes have real geometry to measure. The source pane ships `hidden` (preview is the default tab), so
  // this also exercises the split rule that REVEALS the hidden pane.
  const editView = renderLiveArticleEditView('<h1>Preview heading</h1>' + '<p>Body paragraph.</p>'.repeat(30))
    .replace('enscribe-edit-main enscribe-edit-main--splittable', 'enscribe-edit-main enscribe-edit-main--splittable enscribe-edit-main--split')
    .replace(/(data-edit-pane="source"[^>]*>)/, '$1<div class="cm-editor">editor stand-in</div>');
  // The website surface reproduces mountLiveWebsite's DOM: a `.enscribe-site` body wrapper (the full-bleed
  // `body:has(.enscribe-site)` reset lives in WEBSITE_NAV_CSS) with the corner in the sticky header and the
  // edit view in `.content`. The standalone surface is the floating corner + the edit view directly.
  const body = website
    ? `<div class="enscribe-site"><header class="enscribe-site-header">${corner}</header><div class="content">${editView}</div></div>`
    : `${corner}${editView}`;
  const css = website ? `${defaultCss}\n${shellCss}\n${WEBSITE_NAV_CSS}` : `${defaultCss}\n${shellCss}\n${SHELL_ACTIONS_CSS}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>${css}</style></head><body>${body}</body></html>`;
}

const WIDTHS = [984, 1000, 1040, 1100, 1160, 1200, 1240, 1288, 1300, 1360, 1440, 1560, 1700];
const NEIGHBORS = {
  column: '.enscribe-body',
  leftRail: '.enscribe-chapter-rail',
  rightRail: '.enscribe-onthispage',
  backToTop: '.enscribe-back-to-top',
  // #392/#430: the chrome corner (the shell-actions home — GitHub mark + the #430 settings gear).
  // On a website book page it sits in the sticky top bar's right edge; the chevrons are fixed at
  // 50vh — the sweep proves they never share a band at any width. The corner is now ALWAYS present (the
  // gear is unconditional), so this selector always matches; the OPEN-panel sweep below adds the gear's
  // expanded footprint.
  shellActions: '.enscribe-shell-actions',
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
      // #392 non-vacuity: the WEBSITE page must actually render the chrome corner (website-mini's
      // master carries `<config repo>`), else the shellActions clause below silently checks nothing.
      if (label.includes('website')) {
        const present = await page.eval(() => !!document.querySelector('.enscribe-shell-actions'));
        assert.ok(present, `${label}: the chrome corner (.enscribe-shell-actions) must render — the fixture carries <config repo>`);
      }
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

      // #430: the OPEN settings panel is a bigger footprint than the closed corner, so it introduces two
      // real geometry risks the sweep must guard: (1) OFF-SCREEN spill at a narrow viewport (the panel
      // drops from the top-right, right-aligned, and must stay within the viewport), and (2) reaching down
      // onto the mid-viewport (50vh) CHEVRON band at a short viewport (a panel covering a gutter nav arrow
      // you might click). Both are checked across 984–1700px × {900,600}h. NOT checked: overlap with the
      // on-this-page / chapter RAILS — the panel is a TRANSIENT, opaque, z-130 dropdown anchored to the
      // top-right gear, which sits directly above the on-this-page rail, so it intentionally opens OVER the
      // rail (standard dropdown behaviour — it is on top and dismisses on Escape/outside-click), unlike the
      // #420 PERMANENT chevron-on-rail layout bug this file was born to catch. Only surfaces that render the
      // gear are checked (the website page carries it in the top bar; the standalone separate-pages book is
      // static HTML with no live corner, so it has no panel).
      const hasGear = await page.eval(() => !!document.querySelector('details.enscribe-shell-settings'));
      if (hasGear) {
        const panelFailures = [];
        for (const w of WIDTHS) {
          for (const h of [900, 600]) {
            await page.setViewport({ width: w, height: h });
            const r = await page.eval((sels, vh) => {
              window.scrollTo(0, Math.max(0, document.body.scrollHeight / 2 - vh / 2));
              const d = document.querySelector('details.enscribe-shell-settings');
              if (d) d.open = true;                              // reveal the panel (native [open])
              const out = { innerWidth: window.innerWidth };
              for (const [k, sel] of Object.entries(sels)) {
                const el = document.querySelector(sel);
                out[k] = el ? (({ left, right, top, bottom }) => ({ left, right, top, bottom }))(el.getBoundingClientRect()) : null;
              }
              return out;
            }, { panel: '.enscribe-settings-panel', prev: CHEVRONS.prev, next: CHEVRONS.next }, h);
            const p = r.panel;
            if (!p) { panelFailures.push(`${w}x${h}: panel did not render when opened`); continue; }
            if (p.left < -0.5 || p.right > r.innerWidth + 0.5) panelFailures.push(`${w}x${h}: panel off-screen (l ${p.left.toFixed(0)} r ${p.right.toFixed(0)} vw ${r.innerWidth})`);
            const hit = (b) => b && p.left < b.right && p.right > b.left && p.top < b.bottom && p.bottom > b.top;
            for (const nk of ['prev', 'next']) if (hit(r[nk])) panelFailures.push(`${w}x${h}: panel ∩ ${nk} (gutter chevron)`);
          }
        }
        assert.equal(panelFailures.length, 0,
          `${label}: the OPEN settings panel must stay on-screen and clear the gutter chevrons (984–1700px × {900,600}h) — got: ${panelFailures.join('; ')}`);
        console.log(`PASS: #430 settings-panel clearance — ${label}: open panel stays on-screen + clears the gutter chevrons across 984–1700px × {900,600}h`);
      }
    }

    // ── #435: the edit-layout (split) geometry — the four-affordance corner + the OPEN side-by-side view ──
    // Across a width sweep straddling the 60rem (960px) split breakpoint, on the REAL edit-view + corner CSS:
    //   (1) NO horizontal overflow at any width — a split column blowout is exactly the "broken column
    //       layout" the slice must not ship;
    //   (2) split engages ONLY at >=960px (the edit-main is display:grid there, and NOT below — the
    //       responsive collapse back to the stacked tab view);
    //   (3) the layout toggle HIDES below the breakpoint (its target layout is inert there);
    //   (4) at >=960px the two panes are genuinely side by side (source entirely left of preview); and
    //   (5) the four-affordance corner (Edit, layout, GitHub, gear) stays fully on-screen at every width.
    // Straddle the 60rem (960px) split breakpoint: phone/tablet widths that must collapse to stacked, the
    // exact boundary, and desktop widths that must show the two-column split (incl. wider than the 84rem
    // standalone-widen so the website full-bleed regression is provable).
    const EDIT_WIDTHS = [420, 600, 768, 900, 959, 960, 1024, 1200, 1440, 1700];
    for (const surface of ['standalone', 'website']) {
      const harnessPath = join(dir, `edit-layout-${surface}.html`);
      writeFileSync(harnessPath, buildEditLayoutHarness(surface), 'utf8');
      const page2 = await browser.page(false);
      await page2.goto(pathToFileURL(harnessPath).href);
      const failures = [];
      for (const w of EDIT_WIDTHS) {
        await page2.setViewport({ width: w, height: 900 });
        const m = await page2.eval(() => {
          const rect = (sel) => { const el = document.querySelector(sel); return el ? (({ left, right, top, bottom }) => ({ left, right, top, bottom }))(el.getBoundingClientRect()) : null; };
          const disp = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).display : null; };
          return {
            iw: window.innerWidth,
            scrollW: document.documentElement.scrollWidth,
            mainDisplay: disp('.enscribe-edit-main--split'),
            layoutBtnDisplay: disp('.enscribe-shell-action--layout'),
            source: rect('.enscribe-edit-pane--source'),
            preview: rect('.enscribe-edit-pane--preview'),
            corner: rect('.enscribe-shell-actions'),
            layoutBtn: rect('.enscribe-shell-action--layout'),
            site: rect('.enscribe-site'),
          };
        });
        const wide = w >= 960;
        // (1) no horizontal overflow
        if (m.scrollW > m.iw + 1) failures.push(`${surface} ${w}px: horizontal overflow (scrollWidth ${m.scrollW} > innerWidth ${m.iw})`);
        // (2) split engages only >=960px
        if (wide && m.mainDisplay !== 'grid') failures.push(`${surface} ${w}px: split edit-main should be display:grid (got ${m.mainDisplay})`);
        if (!wide && m.mainDisplay === 'grid') failures.push(`${surface} ${w}px: split must collapse to stacked below 960px (edit-main is still grid)`);
        // (3) layout toggle hidden below the breakpoint, shown above
        if (wide && m.layoutBtnDisplay === 'none') failures.push(`${surface} ${w}px: the layout toggle must be visible at >=960px`);
        if (!wide && m.layoutBtnDisplay !== 'none') failures.push(`${surface} ${w}px: the layout toggle must hide below 960px (got display ${m.layoutBtnDisplay})`);
        // (4) genuine side-by-side above the breakpoint: source entirely left of preview
        if (wide && m.source && m.preview && m.source.right > m.preview.left + 0.5) {
          failures.push(`${surface} ${w}px: panes not side by side (source.right ${m.source.right.toFixed(0)} > preview.left ${m.preview.left.toFixed(0)})`);
        }
        // (5) the corner (and its layout button when shown) stays on-screen
        if (m.corner && (m.corner.left < -0.5 || m.corner.right > m.iw + 0.5)) failures.push(`${surface} ${w}px: shell corner off-screen (l ${m.corner.left.toFixed(0)} r ${m.corner.right.toFixed(0)} vw ${m.iw})`);
        if (wide && m.layoutBtn && (m.layoutBtn.left < -0.5 || m.layoutBtn.right > m.iw + 0.5)) failures.push(`${surface} ${w}px: layout button off-screen`);
        // (6) WEBSITE full-bleed: the standalone 84rem body-widen must NOT cap the site chrome (the review's
        //     major catch). In split at a viewport wider than 84rem (1344px), the `.enscribe-site` must still
        //     span ~the full viewport — a regression pins it to 84rem left-aligned.
        if (surface === 'website' && wide && w > 1344 && m.site && m.site.right < m.iw - 24) {
          failures.push(`${surface} ${w}px: site chrome capped (right ${m.site.right.toFixed(0)} << innerWidth ${m.iw}) — the standalone widen leaked onto the website body`);
        }
      }
      assert.equal(failures.length, 0,
        `#435 edit-layout geometry (${surface}) must hold across 420–1700px — got: ${failures.join('; ')}`);
      console.log(`PASS: #435 edit-layout (${surface}) — no overflow; split only >=960px (collapses below); toggle hides when narrow; panes side-by-side; corner on-screen${surface === 'website' ? '; site chrome stays full-bleed (no 84rem cap)' : ''} (Tier 2)`);
    }
  } finally {
    if (browser) await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run_tests();
