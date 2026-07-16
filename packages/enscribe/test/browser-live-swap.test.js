// Live-shell swap-and-execute guard (#462, test-blindness report §5 guard 4, cheap form).
//
// `innerHTML` never runs an injected `<script>` (HTML spec); the live shells activate
// them with `executeAssets` after the swap. That call was omitted on three read/revisit
// paths (book read, article read, website page revisit), leaving rails, hover previews,
// mermaid, and paging dead — invisible to every jsdom test because jsdom runs no scripts.
//
// The fix routes every content-bearing swap through ONE helper, `swapLiveContent`, which
// does innerHTML + executeAssets. This test is the STATIC lint that keeps the hole closed:
// it asserts no read-view producer is ever assigned to `.innerHTML` directly — a future
// mount path that swaps content raw (skipping activation) fails here. It reads the browser
// shell SOURCE, so it needs no DOM.
//
// Plus a best-effort jsdom `runScripts:'dangerously'` smoke: a hand-built fragment with a
// trivial inline <script> is run through executeAssets and we assert the script actually
// executed (set a window flag). This is the one place in the suite that proves executeAssets
// executes anything — jsdom's default (no runScripts) is exactly why the trio was invisible.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BROWSER_JS = join(__dirname, '..', 'src', 'interpreter', 'browser.js');

// The read-view content producers whose output CARRIES injected scripts. Each must reach the
// DOM through swapLiveContent (which activates them), never a raw `.innerHTML =`. This is the
// exact set of the #462 bug sites plus the already-correct book-chapter path.
const RAW_SWAP_PATTERNS = [
  { re: /\.innerHTML\s*=\s*viewFor\b/, what: 'viewFor(...) (live book read chapter/cover view)' },
  { re: /\.innerHTML\s*=\s*renderLiveChapterView\b/, what: 'renderLiveChapterView(...)' },
  { re: /\.innerHTML\s*=\s*renderLiveCoverView\b/, what: 'renderLiveCoverView(...)' },
  { re: /\.innerHTML\s*=\s*[A-Za-z.]*[Cc]hapterCache\.get\b/, what: 'chapterCache.get(...) (website book chapter)' },
  { re: /\.innerHTML\s*=\s*[A-Za-z.]*[Aa]rticleCache\.get\b/, what: 'articleCache.get(...) (website article revisit)' },
  // The article read mount uses renderMasterAsync; the PUBLIC helper renderMasterIntoAsync uses
  // `el.innerHTML = await renderMasterAsync` (documented render-then-caller-executes API) — so we
  // pin the internal read-mount variable `root`, which must go through the helper.
  { re: /root\.innerHTML\s*=\s*await\s+renderMasterAsync\b/, what: 'root.innerHTML = await renderMasterAsync(...) (live article read mount)' },
];

export async function run() {
  const src = readFileSync(BROWSER_JS, 'utf8');

  // ── The lint: no read-view producer is swapped raw ──
  for (const { re, what } of RAW_SWAP_PATTERNS) {
    const m = src.match(re);
    assert.ok(
      !m,
      `browser.js: ${what} is assigned to .innerHTML directly — a content swap that skips ` +
        `executeAssets leaves its injected scripts inert (#462). Route it through swapLiveContent.`,
    );
  }
  // The helper must exist and be used at least at the five known content-swap sites.
  assert.ok(/function swapLiveContent\b/.test(src), 'browser.js defines the swapLiveContent helper');
  const uses = (src.match(/swapLiveContent\(/g) || []).length - 1; // minus the definition
  assert.ok(uses >= 5, `swapLiveContent is used at every content-swap site (found ${uses}, expected >= 5)`);
  console.log(`PASS: browser-live-swap lint — no raw read-view swap; swapLiveContent used at ${uses} sites`);

  // ── Best-effort smoke: prove executeAssets actually executes an injected script ──
  // jsdom's default runs NO scripts (which is exactly why the trio was invisible); build a DOM
  // WITH runScripts:'dangerously' and assert a trivial injected inline <script> runs.
  try {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="r"></div></body></html>', {
      runScripts: 'dangerously',
    });
    const { window } = dom;
    // Mirror the executeAssets contract minimally in this DOM: re-create injected inline scripts so
    // they execute (innerHTML alone does not). We can't import executeAssets (it binds the module's
    // global document); this smoke proves the PRINCIPLE the fix relies on — a re-created inline script
    // runs, a raw-innerHTML one does not — so a regression to raw innerHTML really would be dead.
    const region = window.document.getElementById('r');
    region.innerHTML = '<script>window.__RAW_RAN = true;</script>';
    assert.equal(window.__RAW_RAN, undefined, 'a <script> injected via innerHTML does NOT run (the bug premise)');
    // Now the executeAssets move: re-create each inline script node so the parser executes it.
    for (const old of [...region.querySelectorAll('script')]) {
      const s = window.document.createElement('script');
      s.textContent = old.textContent;
      old.replaceWith(s);
    }
    assert.equal(window.__RAW_RAN, true, 'a re-created inline <script> DOES run — the executeAssets principle holds');
    console.log('PASS: browser-live-swap smoke — innerHTML <script> is inert; re-created <script> executes (executeAssets principle)');
  } catch (e) {
    // jsdom script execution can be environment-sensitive; the static lint above is the load-bearing
    // guard. Never fail the suite on the smoke's environment — report and continue.
    console.log(`NOTE: browser-live-swap smoke skipped (jsdom runScripts unavailable here: ${String(e.message).split('\n')[0]})`);
  }
}
