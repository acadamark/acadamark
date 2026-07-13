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
export function findChromium() {
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

export async function detectDriver() {
  for (const name of ['playwright', 'puppeteer', 'playwright-core', 'puppeteer-core']) {
    try { const mod = await import(name); return { name, mod }; } catch { /* not installed */ }
  }
  return null;
}

// A tiny uniform page adapter over the two driver families, so the checks below are written once.
export async function openBrowser(driver, executablePath) {
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
          setViewport: ({ width, height }) => p.setViewportSize({ width, height }),
          waitFor: (sel, timeout) => p.waitForSelector(sel, { timeout }),
          eval: (fn, ...a) => p.evaluate(fn, ...a),
          click: (sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel),
          type: async (sel, text) => { await p.evaluate((s) => document.querySelector(s)?.focus(), sel); await p.keyboard.type(text); },
          focus: (sel) => p.evaluate((s) => document.querySelector(s)?.focus(), sel),
          press: (key) => p.keyboard.press(key),
          // #430: emulate the visitor's OS light/dark preference so the auto-variant path is testable
          // (prefers-color-scheme). Playwright: emulateMedia({colorScheme}).
          emulateColorScheme: (scheme) => p.emulateMedia({ colorScheme: scheme }),
          onConsole: (cb) => p.on('console', (msg) => cb(msg.type(), msg.text())), // #402: capture the recap
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
        setViewport: ({ width, height }) => p.setViewport({ width, height }),
        waitFor: (sel, timeout) => p.waitForSelector(sel, { timeout }),
        eval: (fn, ...a) => p.evaluate(fn, ...a),
        click: (sel) => p.evaluate((s) => document.querySelector(s)?.click(), sel),
        type: async (sel, text) => { await p.evaluate((s) => document.querySelector(s)?.focus(), sel); await p.keyboard.type(text); },
        focus: (sel) => p.evaluate((s) => document.querySelector(s)?.focus(), sel),
        press: (key) => p.keyboard.press(key),
        // #430: emulate the visitor's OS light/dark preference (prefers-color-scheme). Puppeteer:
        // emulateMediaFeatures. Makes the auto-variant acceptance path testable rather than a no-op.
        emulateColorScheme: (scheme) => p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]),
        onConsole: (cb) => p.on('console', (msg) => cb(msg.type(), msg.text())), // #402: capture the recap
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
      '  • the inlined single-file renders with the NETWORK BLOCKED: KaTeX math + the embedded data: figure;\n' +
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
      // Only assert what a BROWSER uniquely proves: the engine renders the embedded source offline —
      // KaTeX math and the embedded data: figure appear. The FONT guarantee (the bytes are embedded so it
      // renders offline) is a build fact, checked deterministically in Tier 1 (delivery-modes.test.js) —
      // NOT via `document.fonts.check(Inter)`, which is lazy-load- and system-font-sensitive (an unused
      // embedded font reads false; it was passing locally only because dev machines have Inter installed,
      // and failing in CI's clean headless Chromium — #381).
      const probe = await page.eval(() => ({
        katex: !!document.querySelector('.katex'),
        figure: !!document.querySelector('img[src^="data:"]'),
      }));
      const A = (c, m) => { if (!c) throw new Error(`Tier 2 offline render: ${m}`); };
      A(probe.katex, 'the inline math did not render via KaTeX (offline)');
      A(probe.figure, 'the embedded figure (img[src^="data:"]) is not present (offline)');
      console.log(`PASS: #369 Tier 2 — inlined single-file renders OFFLINE in ${driver.name} (KaTeX math + embedded figure — network blocked)`);
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

      // Tab INDENTS in the editor (regression for the "code-block doesn't work / indent in a list
      // breaks" report): without an indentWithTab keymap, Tab moves focus OUT of the editor and inserts
      // nothing, so an author cannot type the indentation a <code-block> or list needs. Assert Tab (a)
      // keeps focus in the editor and (b) inserts leading whitespace at the cursor.
      await page.focus('.cm-content');
      const focusBefore = await page.eval(() => !!document.activeElement?.closest('.cm-editor'));
      const docBefore = await page.eval(() => [...document.querySelectorAll('.cm-line')].map((l) => l.textContent).join('\n'));
      await page.press('Tab');
      const focusAfter = await page.eval(() => !!document.activeElement?.closest('.cm-editor'));
      const docAfter = await page.eval(() => [...document.querySelectorAll('.cm-line')].map((l) => l.textContent).join('\n'));
      if (!focusBefore) throw new Error('Tier 2 Tab-indent: precondition failed — the editor was not focused before Tab');
      if (!focusAfter) throw new Error('Tier 2 Tab-indent: Tab MOVED FOCUS OUT of the editor (no indentWithTab keymap) — an author cannot indent code-block / list content');
      if (docAfter.length <= docBefore.length) throw new Error('Tier 2 Tab-indent: Tab inserted no indentation into the document');
      console.log(`PASS: #369 Tier 2 — Tab INDENTS in the editor (keeps focus + inserts whitespace) OFFLINE in ${driver.name} (code-block / list authoring regression)`);
    }

    // (C) SELF-SAVE (#351) — edit an inlined single-file, SAVE via the download path, then re-open the
    //     saved artifact OFFLINE and assert it (a) carries the edited .emd and (b) still self-renders.
    //     The File System Access path (save back to the opened file) cannot be driven headlessly — it is
    //     named for a human below. Here we FORCE the download fallback (delete showSaveFilePicker) and
    //     capture the exact bytes the Save button writes (override URL.createObjectURL → read the Blob).
    {
      const { html } = buildSingleFile({ master: FIXTURE, delivery: 'inlined', edit: true, warn: () => {} });
      const file = join(dir, 'save-edit.html');
      writeFileSync(file, html, 'utf8');
      const page = await browser.page(/* offline */ true);
      await page.goto(pathToFileURL(file).href);
      await page.waitFor('.cm-editor', 8000);
      await page.click('[data-edit-tab="source"]');
      await page.waitFor('.cm-content', 3000);

      // Edit: type a unique marker into the editor (the onChange updates the current source + marks dirty).
      await page.type('.cm-content', 'SAVEMARK_351 ');
      const dirty = await page.eval(() => document.querySelector('[data-edit-status]')?.textContent ?? '');
      if (dirty !== 'unsaved') throw new Error(`Tier 2 save: status did not flip to "unsaved" after an edit (got "${dirty}")`);

      // Force the download fallback and capture the Blob the Save button produces (its exact bytes).
      // showSaveFilePicker lives on Window.prototype, so `delete` won't remove it — shadow it as undefined.
      await page.eval(() => {
        Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true, writable: true });
        window.__savedBlob = null;
        window.__saveErr = null;
        window.addEventListener('error', (e) => { window.__saveErr = String(e.message || e.error); });
        const orig = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (blob) => { window.__savedBlob = blob; return orig(blob); };
      });
      await page.click('[data-edit-save]');
      const savedHtml = await page.eval(async () => {
        for (let i = 0; i < 100 && !window.__savedBlob; i++) await new Promise((r) => setTimeout(r, 20));
        return window.__savedBlob ? await window.__savedBlob.text() : null;
      });
      if (!savedHtml) {
        const err = await page.eval(() => window.__saveErr);
        throw new Error(`Tier 2 save: the download path produced no file (no Blob captured)${err ? ` — page error: ${err}` : ''}`);
      }

      // (a) carries the edited .emd; (b) is a self-contained vessel; status flips back to "saved".
      if (!savedHtml.includes('SAVEMARK_351')) throw new Error('Tier 2 save: the saved file does not carry the edited source');
      if (!savedHtml.includes('<template id="enscribe-source">')) throw new Error('Tier 2 save: the saved file is not a single-file vessel');
      const clean = await page.eval(() => document.querySelector('[data-edit-status]')?.textContent ?? '');
      if (clean !== 'saved') throw new Error(`Tier 2 save: status did not flip to "saved" after saving (got "${clean}")`);

      // Re-open the SAVED artifact OFFLINE — it must still self-render (math + figure) AND show the edit.
      const savedFile = join(dir, 'save-reopened.html');
      writeFileSync(savedFile, savedHtml, 'utf8');
      const page2 = await browser.page(/* offline */ true);
      await page2.goto(pathToFileURL(savedFile).href);
      await page2.waitFor('.katex', 6000);
      const reopened = await page2.eval(() => ({
        katex: !!document.querySelector('.katex'),
        figure: !!document.querySelector('img[src^="data:"]'),
        hasMarker: document.body.textContent.includes('SAVEMARK_351'),
      }));
      const A = (c, m) => { if (!c) throw new Error(`Tier 2 self-save reopen: ${m}`); };
      A(reopened.katex, 'the reopened saved file did not render the inline math (offline)');
      A(reopened.figure, 'the reopened saved file did not render the embedded figure (offline)');
      A(reopened.hasMarker, 'the reopened saved file does not show the edited content (SAVEMARK_351)');
      console.log(`PASS: #351 Tier 2 — self-save (download path): edit → save → re-open renders the EDITED single-file OFFLINE in ${driver.name}`);
      console.log(
        'NOTE: #351 the File System Access path (save-in-place back to the opened file) is NOT automatable headlessly. ' +
        'Human check, in Chromium/Edge: open an editable single-file via ?edit, edit, click Save → a save picker appears; ' +
        'choose/overwrite the file; edit again + Save → it overwrites IN PLACE with no picker (the handle persisted).',
      );
    }

    return { ran: true, driver: driver.name };
  } finally {
    if (browser) await browser.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
