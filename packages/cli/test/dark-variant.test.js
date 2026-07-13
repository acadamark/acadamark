// #398 themes 2/3 — the derived dark variant, end to end.
//
// Tier 1 (always): the baked dark blocks ride the emitted page (default + per-theme);
// <config theme-variant=…> stamps the <html> hook (valid values), warns per #401 and
// stamps nothing (invalid values), stays absent for auto.
//
// Tier 2 (opportunistic, the delivery-browser pattern): a REAL headless browser loads
// the rendered sample under data-theme-variant="dark" for ALL FOUR themes and asserts
// the derivation actually applies via computed styles — dark page, light text, visible
// borders (the invisible-border classic, checked live) — and that stamping "light"
// under a dark OS preference forces light (the :not() escape). Skips with a notice
// when no driver is importable.

import assert from 'node:assert';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { run } from '../src/cli.js';
import { findChromium, detectDriver, openBrowser } from './delivery-browser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, 'fixtures', 'sample.emd');

function sink() {
  const chunks = [];
  return { write: (s) => chunks.push(s), get text() { return chunks.join(''); } };
}
function invoke(argv) {
  const out = sink(), err = sink();
  const code = run(argv, { stdout: out, stderr: err });
  return { code, out: out.text, err: err.text };
}

export async function run_tests() {
  // ── Tier 1: the baked blocks + the <html> hook ───────────────────────────────
  {
    const { code, out } = invoke(['render', FIXTURE]);
    assert.equal(code, 0);
    assert.ok(out.includes('@media (prefers-color-scheme: dark)'), 'the auto media block rides the page');
    assert.ok(out.includes(':root:not([data-theme-variant="light"])'), 'the auto block carries the light-pin escape');
    assert.ok(out.includes(':root[data-theme-variant="dark"]'), 'the explicit-dark block rides the page');
    assert.ok(out.includes('--enscribe-bg: #191919'), 'the derived dark page background is baked');
    assert.ok(!out.includes('<html lang="en" data-theme-variant='), 'no variant kwarg → no <html> stamp (auto)');
    console.log('PASS: dark-variant — baked blocks ride the rendered page; auto stamps nothing');
  }
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-dark-'));
    try {
      writeFileSync(join(dir, 'd.emd'), '<article>\n\n<config theme-variant=dark />\n\n# T\n\nBody.\n');
      writeFileSync(join(dir, 'l.emd'), '<article>\n\n<config theme-variant=light />\n\n# T\n\nBody.\n');
      writeFileSync(join(dir, 'bad.emd'), '<article>\n\n<config theme-variant=sepia />\n\n# T\n\nBody.\n');
      const dark = invoke(['render', join(dir, 'd.emd')]);
      assert.ok(dark.out.includes('<html lang="en" data-theme-variant="dark">'), 'theme-variant=dark stamps <html>');
      const light = invoke(['render', join(dir, 'l.emd')]);
      assert.ok(light.out.includes('<html lang="en" data-theme-variant="light">'), 'theme-variant=light stamps <html>');
      const bad = invoke(['render', join(dir, 'bad.emd')]);
      assert.ok(/theme-variant="sepia" is not a recognized value.*light, dark, auto/.test(bad.err),
        'an unknown variant is the #401 warned-default');
      assert.ok(!bad.out.includes('<html lang="en" data-theme-variant='), 'an unknown variant stamps nothing');
      console.log('PASS: dark-variant — <config theme-variant> stamps the hook; invalid warns + auto');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // ── Tier 2: computed styles under dark, all four themes, in a real browser ────
  {
    const driver = await detectDriver();
    const chromium = findChromium();
    if (!driver) {
      console.log('SKIP: dark-variant browser tier — no playwright/puppeteer driver importable.');
      console.log('      Human check: render sample.emd per theme, set data-theme-variant="dark" on <html>,');
      console.log('      confirm dark page / light text / visible borders / no light flash.');
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-dark-b-'));
    let browser = null;
    try {
      browser = await openBrowser(driver, /-core$/.test(driver.name) ? chromium : undefined);
      const themes = ['default', 'modern', 'compact', 'tufte'];
      for (const theme of themes) {
        const args = ['render', FIXTURE, ...(theme === 'default' ? [] : ['--theme', theme])];
        const { code, out } = invoke(args);
        assert.equal(code, 0, `${theme}: render exits 0`);
        const htmlPath = join(dir, `${theme}.html`);
        // Stamp dark explicitly — the reader-tier hook the slice-3 panel will drive.
        writeFileSync(htmlPath, out.replace('<html lang="en">', '<html lang="en" data-theme-variant="dark">'), 'utf8');
        const page = await browser.page(false);
        await page.goto(pathToFileURL(htmlPath).href);
        const styles = await page.eval(() => {
          const bodyCs = getComputedStyle(document.body);
          const root = getComputedStyle(document.documentElement);
          const lum = (rgbStr) => {
            const [r, g, b] = rgbStr.match(/\d+/g).map(Number).map((c) => c / 255)
              .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          return {
            bgLum: lum(root.getPropertyValue('--enscribe-bg').trim().startsWith('#')
              ? (() => { const el = document.createElement('div'); el.style.color = root.getPropertyValue('--enscribe-bg'); document.body.appendChild(el); const v = getComputedStyle(el).color; el.remove(); return v; })()
              : bodyCs.backgroundColor),
            textLum: lum(bodyCs.color),
            borderVar: root.getPropertyValue('--enscribe-border').trim(),
            bgVar: root.getPropertyValue('--enscribe-bg').trim(),
            colorScheme: root.colorScheme,
          };
        });
        assert.ok(styles.bgLum < 0.05, `${theme}: page is dark under the stamp (lum ${styles.bgLum.toFixed(3)})`);
        assert.ok(styles.textLum > 0.4, `${theme}: text is light under the stamp (lum ${styles.textLum.toFixed(3)})`);
        assert.notEqual(styles.borderVar, styles.bgVar, `${theme}: borders are not the page color (visible)`);
        assert.equal(styles.colorScheme, 'dark', `${theme}: color-scheme follows (native form controls/scrollbars)`);
      }
      // ── #430 acceptance triple — the auto default FOLLOWS the OS; an explicit pin WINS ───────────
      // The reported "site defaults to dark for everyone" did NOT reproduce: auto is correct. This pins
      // that behavior so a regression (absent-variant reading dark on a LIGHT OS) fails here. It uses the
      // now-real emulateColorScheme — the adapter method dark-variant's old `emulateMedia` guard silently
      // no-op'd, so the OS-emulation path was never actually exercised until now. Light bg ≈ rgb(255,…),
      // the derived dark page bg is #191919 ≈ rgb(25,…), so the red channel separates them cleanly.
      let probeN = 0;
      const bodyRed = async (html, colorScheme) => {
        const f = join(dir, `triple-${colorScheme}-${probeN++}.html`);
        writeFileSync(f, html, 'utf8');
        const pg = await browser.page(false);
        await pg.emulateColorScheme(colorScheme);
        await pg.goto(pathToFileURL(f).href);
        const bg = await pg.eval(() => getComputedStyle(document.body).backgroundColor);
        return bg.match(/\d+/g).map(Number)[0];
      };
      const plain = invoke(['render', FIXTURE]).out;                                        // no variant → auto
      const pinDark = plain.replace('<html lang="en">', '<html lang="en" data-theme-variant="dark">');
      const pinLight = plain.replace('<html lang="en">', '<html lang="en" data-theme-variant="light">');
      assert.ok(await bodyRed(plain, 'light') > 200, 'acceptance (a): no variant + light OS → LIGHT page');
      assert.ok(await bodyRed(plain, 'dark') < 60, 'acceptance (b): no variant + dark OS → DARK page (follows the OS)');
      assert.ok(await bodyRed(pinDark, 'light') < 60, 'acceptance (c): theme-variant=dark → DARK even under a light OS');
      assert.ok(await bodyRed(pinLight, 'dark') > 200, 'the light pin defeats a dark OS preference (:not() escape)');
      console.log('PASS: dark-variant browser tier — 4 themes derive correctly; #430 acceptance triple (auto→light on light OS, auto→dark on dark OS, pin dark→dark regardless) + light-pin escape');
    } finally {
      if (browser) await browser.close();
      rmSync(dir, { recursive: true, force: true });
    }
  }
}
