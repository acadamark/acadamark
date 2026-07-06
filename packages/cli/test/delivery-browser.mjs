// Tier 2 of the delivery-modes tests (#369) — the in-browser OFFLINE render + editor mount.
//
// These are the load-bearing "inlined truly works offline" checks that a build-and-inspect test
// (Tier 1) cannot make: a single-file EMBEDS its source, so the math/figure/font only appear once the
// engine RENDERS it in a browser. We run them in a REAL headless browser when a driver is importable
// (playwright / puppeteer, incl. the `-core` variants driving a cached Chromium); otherwise we SKIP
// with a clear notice naming the checks a human must run, so nothing is silently green.
//
// Design choice: no browser driver is a committed dependency (the project standardises on jsdom, and a
// browser dep would weigh on every install/CI). The browser checks therefore run opportunistically —
// when a driver is present — and skip gracefully otherwise. To turn them always-on, add a driver.

import { writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Locate a Chromium binary the `-core` drivers can use (they do not download one). Checks the
// Playwright and Puppeteer caches. Returns a path or null.
function findChromium() {
  const roots = [join(homedir(), '.cache', 'ms-playwright'), join(homedir(), '.cache', 'puppeteer')];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      if (!/chromium|chrome/i.test(entry)) continue;
      for (const cand of [
        join(root, entry, 'chrome-linux64', 'chrome'),
        join(root, entry, 'chrome-linux', 'chrome'),
        join(root, entry, 'chrome-linux', 'headless_shell'),
        join(root, entry, 'chrome-linux64', 'headless_shell'),
      ]) {
        if (existsSync(cand)) return cand;
      }
    }
  }
  return null;
}

async function detectDriver() {
  for (const name of ['playwright', 'puppeteer', 'playwright-core', 'puppeteer-core']) {
    try { const mod = await import(name); return { name, mod }; } catch { /* not installed */ }
  }
  return null;
}

// A tiny uniform page adapter over the two driver families, so the checks below are written once.
async function openBrowser(driver, executablePath) {
  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'];
  if (/playwright/.test(driver.name)) {
    const chromium = driver.mod.chromium ?? driver.mod.default?.chromium;
    const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args });
    return {
      async page(offline) {
        const context = await browser.newContext();
        if (offline) await context.setOffline(true);
        const p = await context.newPage();
        return {
          goto: (url) => p.goto(url, { waitUntil: 'load' }),
          waitFor: (sel, timeout) => p.waitForSelector(sel, { timeout }),
          eval: (fn, ...a) => p.evaluate(fn, ...a),
          click: (sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel),
          type: async (sel, text) => { await p.evaluate((s) => document.querySelector(s)?.focus(), sel); await p.keyboard.type(text); },
        };
      },
      close: () => browser.close(),
    };
  }
  // puppeteer / puppeteer-core
  const launch = driver.mod.launch ?? driver.mod.default?.launch;
  const browser = await launch({ headless: 'new', ...(executablePath ? { executablePath } : {}), args });
  return {
    async page(offline) {
      const p = await browser.newPage();
      if (offline) await p.setOfflineMode(true);
      return {
        goto: (url) => p.goto(url, { waitUntil: 'load' }),
        waitFor: (sel, timeout) => p.waitForSelector(sel, { timeout }),
        eval: (fn, ...a) => p.evaluate(fn, ...a),
        click: (sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel),
        type: async (sel, text) => { await p.evaluate((s) => document.querySelector(s)?.focus(), sel); await p.keyboard.type(text); },
      };
    },
    close: () => browser.close(),
  };
}

export async function runBrowserTier({ FIXTURE, buildSingleFile }) {
  const driver = await detectDriver();
  if (!driver) {
    console.log(
      'SKIP: #369 Tier 2 (in-browser offline render + editor mount) — no headless-browser driver ' +
      '(playwright / puppeteer) is importable. A Chromium binary ' + (findChromium() ? 'IS cached but has no driver' : 'was not found') +
      '. These checks REQUIRE a real browser and are left for a human:\n' +
      '  • the inlined single-file renders with the NETWORK BLOCKED: KaTeX math, the embedded figure, a document font applied;\n' +
      '  • the editor MOUNTS (CodeMirror) and accepts typed input.\n' +
      '  To run them: `npm i -D puppeteer-core` (a Chromium is already cached) or `npm i -D playwright`, then re-run the cli suite.',
    );
    return { ran: false, reason: 'no-driver' };
  }

  const executablePath = /-core$/.test(driver.name) ? findChromium() : (findChromium() || undefined);
  if (/-core$/.test(driver.name) && !executablePath) {
    console.log(`SKIP: #369 Tier 2 — ${driver.name} is importable but no Chromium binary was found to drive; left for a human.`);
    return { ran: false, reason: 'no-chromium' };
  }

  const dir = mkdtempSync(join(tmpdir(), 'enscribe-deliv-browser-'));
  let browser;
  try {
    browser = await openBrowser(driver, executablePath);

    // (A) OFFLINE RENDER — the load-bearing guarantee. Build the inlined single-file, open it from
    //     file:// with the network BLOCKED, and assert the document actually renders from inline bytes.
    {
      const { html } = buildSingleFile({ master: FIXTURE, delivery: 'inlined', warn: () => {} });
      const file = join(dir, 'offline.html');
      writeFileSync(file, html, 'utf8');
      const page = await browser.page(/* offline */ true);
      await page.goto(pathToFileURL(file).href);
      await page.waitFor('.katex', 5000);            // KaTeX rendered the inline math (needs the inline KaTeX CSS)
      const probe = await page.eval(() => ({
        katex: !!document.querySelector('.katex'),
        figure: !!document.querySelector('img[src^="data:"]'),
        bodyFont: getComputedStyle(document.body).fontFamily,
        interLoaded: (document.fonts && document.fonts.check) ? document.fonts.check('16px Inter') : null,
      }));
      const A = (c, m) => { if (!c) throw new Error(`Tier 2 offline render: ${m}`); };
      A(probe.katex, 'the inline math did not render via KaTeX (offline)');
      A(probe.figure, 'the embedded figure (img[src^="data:"]) is not present (offline)');
      A(/Inter/i.test(probe.bodyFont) || probe.interLoaded, `the document font (Inter) is not applied/loaded (offline); body font-family = ${probe.bodyFont}, Inter loaded = ${probe.interLoaded}`);
      console.log(`PASS: #369 Tier 2 — inlined single-file renders OFFLINE in ${driver.name} (KaTeX math, figure, document font — network blocked)`);
    }

    // (B) EDITOR MOUNT — an inlined editable file must mount the (inlined) editor and accept input,
    //     with the network still blocked (the blob-imported CodeMirror is offline too).
    {
      const { html } = buildSingleFile({ master: FIXTURE, delivery: 'inlined', edit: true, warn: () => {} });
      const file = join(dir, 'edit.html');
      writeFileSync(file, html, 'utf8');
      const page = await browser.page(/* offline */ true);
      await page.goto(pathToFileURL(file).href);
      await page.waitFor('.cm-editor', 8000);        // CodeMirror mounted (from the inlined blob-imported editor)
      // The single-file edit view defaults to the Preview tab, so the Source (CodeMirror) pane is hidden;
      // activate the Source tab so the editor is visible + focusable before typing.
      await page.click('[data-edit-tab="source"]');
      await page.waitFor('.cm-content', 3000);
      const before = await page.eval(() => document.querySelector('.cm-content')?.textContent?.length ?? 0);
      await page.type('.cm-content', 'ZZZ');
      const after = await page.eval(() => document.querySelector('.cm-content')?.textContent ?? '');
      if (!(after.includes('ZZZ') && after.length > before)) {
        throw new Error(`Tier 2 editor: typing did not update the CodeMirror document (before ${before} chars, after "${after.slice(0, 40)}…")`);
      }
      console.log(`PASS: #369 Tier 2 — the inlined editor MOUNTS and accepts input OFFLINE in ${driver.name} (CodeMirror, blob-imported)`);
    }

    return { ran: true, driver: driver.name };
  } finally {
    if (browser) await browser.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
