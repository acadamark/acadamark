// Tests for the diagnostics seam (#402 + #415) — the three channels.
//
//   1. terminal-as-they-occur (vfile-reporter per document, stderr)
//   2. end-of-run summary (grouped by file → kind, with counts; silent when clean)
//   3. the emitted recap script (<script data-enscribe-diagnostics>, provenance-carrying,
//      zero bytes when clean, absent from --fragment output)
//
// plus the quiet semantics: --quiet silences 1+2 only (the artifact keeps its record);
// <config quiet> clears the stream in-pipeline, so ALL channels are silent.
//
// Tier 2 (opportunistic, the delivery-browser.mjs pattern): a REAL headless browser opens
// the emitted page and the recap script's console.warn lines are captured via the driver's
// console hook. Skips with a notice when no driver is importable — never silently green.

import assert from 'node:assert';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdtempSync, rmSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { VFile } from 'vfile';
import { run } from '../src/cli.js';
import { createDiagnostics, diagnosticsScript, messageKind } from '../src/diagnostics.js';
import { findChromium, detectDriver, openBrowser } from './delivery-browser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');
const WARNS = join(FIXTURES, 'warns.emd');          // two no-library cites → two messages
const WARNS_QUIET = join(FIXTURES, 'warns-quiet.emd'); // same, with <config quiet />
const CLEAN = join(FIXTURES, 'sample.emd');

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
  // ── unit: messageKind ────────────────────────────────────────────────────────
  {
    assert.equal(messageKind({ source: 'doc-type-resolve', ruleId: 'unknown-type' }), 'doc-type-resolve:unknown-type');
    assert.equal(messageKind({ source: 'nav' }), 'nav');
    assert.equal(messageKind({ reason: 'cite-resolution: no <library> in scope' }), 'cite-resolution');
    assert.equal(messageKind({ reason: 'A bare sentence with no prefix' }), 'message');
    console.log('PASS: diagnostics — messageKind (source:ruleId / producer-prefix / fallback)');
  }

  // ── unit: createDiagnostics (channels 1+2, quiet, silence-when-clean) ───────
  {
    const err = sink();
    const diag = createDiagnostics({ err });
    const file = new VFile({ path: 'doc.emd' });
    file.message('cite-resolution: no <library> in scope for "x"');
    file.message('cite-resolution: no <library> in scope for "y"');
    diag.report(file);
    assert.ok(err.text.includes('doc.emd'), 'channel 1 names the file');
    assert.ok(err.text.includes('no <library> in scope'), 'channel 1 carries the message');
    diag.summary();
    assert.ok(err.text.includes('diagnostics summary — 2 messages in 1 file'), 'channel 2 totals');
    assert.ok(err.text.includes('2 × cite-resolution'), 'channel 2 groups by kind with counts');

    const quietErr = sink();
    const quietDiag = createDiagnostics({ quiet: true, err: quietErr });
    quietDiag.report(file);
    quietDiag.summary();
    assert.equal(quietErr.text, '', '--quiet silences channels 1+2');

    const cleanErr = sink();
    const cleanDiag = createDiagnostics({ err: cleanErr });
    cleanDiag.report(new VFile({ path: 'clean.emd' }));
    cleanDiag.summary();
    assert.equal(cleanErr.text, '', 'a clean run writes nothing (silent when nothing to say)');
    console.log('PASS: diagnostics — createDiagnostics channels 1+2, quiet, clean-run silence');
  }

  // ── unit: diagnosticsScript (channel 3) ──────────────────────────────────────
  {
    assert.equal(diagnosticsScript([]), '', 'zero messages ⇒ zero bytes');
    assert.equal(diagnosticsScript(undefined), '', 'no stream ⇒ zero bytes');

    const file = new VFile({ path: 'doc.emd' });
    const m = file.message('cite-resolution: key not found', { line: 5, column: 12 });
    m.source = 'cite-resolution'; m.ruleId = 'missing-key';
    const script = diagnosticsScript(file.messages);
    assert.ok(script.startsWith('<script data-enscribe-diagnostics>'), 'the recap block is marked');
    assert.ok(script.includes('"file":"doc.emd"') && script.includes('"line":5') && script.includes('"column":12'),
      'provenance fields carried (file, line, column)');
    assert.ok(script.includes('"kind":"cite-resolution:missing-key"'), 'kind carried (source:ruleId)');

    // escape safety: a hostile message cannot break out of the script block.
    const evil = diagnosticsScript([{ reason: 'bad </script><script>alert(1)</script> content' }]);
    const closeAt = evil.indexOf('</script>');
    assert.equal(closeAt, evil.trimEnd().length - '</script>'.length, 'the ONLY </script> is the block terminator');
    assert.ok(evil.includes('\\u003c/script'), 'every < in the payload is \\u003c-escaped');
    console.log('PASS: diagnostics — diagnosticsScript provenance, zero-bytes rule, escape safety');
  }

  // ── CLI: render — all three channels ─────────────────────────────────────────
  {
    const { code, out, err } = invoke(['render', WARNS]);
    assert.equal(code, 0, 'a warning-bearing render still exits 0 (always-renders)');
    assert.ok(err.includes('warning') && err.includes('no <library> in scope for "ghost2020"'),
      'channel 1: the reporter block reaches stderr');
    assert.ok(err.includes('diagnostics summary — 2 messages in 1 file') && err.includes('2 × cite-resolution'),
      'channel 2: the grouped summary reaches stderr');
    assert.ok(out.includes('<script data-enscribe-diagnostics>'), 'channel 3: the recap script rides the page');
    assert.ok(out.includes('"line":5') && out.includes('warns.emd'), 'channel 3 carries provenance');

    const frag = invoke(['render', WARNS, '--fragment']);
    assert.ok(!frag.out.includes('data-enscribe-diagnostics'), '--fragment carries no recap script');
    assert.ok(frag.err.includes('no <library> in scope'), '--fragment still reports to the terminal');

    const quiet = invoke(['render', WARNS, '--quiet']);
    assert.equal(quiet.err, '', '--quiet: channels 1+2 silent');
    assert.ok(quiet.out.includes('<script data-enscribe-diagnostics>'),
      '--quiet: channel 3 unaffected — the artifact keeps its record');

    const configQuiet = invoke(['render', WARNS_QUIET]);
    assert.equal(configQuiet.err, '', '<config quiet>: terminal silent (stream cleared in-pipeline)');
    assert.ok(!configQuiet.out.includes('data-enscribe-diagnostics'),
      '<config quiet>: no recap script either — the document opted out entirely');

    const clean = invoke(['render', CLEAN]);
    assert.equal(clean.err, '', 'a clean document: stderr empty');
    assert.ok(!clean.out.includes('data-enscribe-diagnostics'), 'a clean document: no script block');
    console.log('PASS: diagnostics — render: three channels; --fragment/--quiet/<config quiet>/clean matrix');
  }

  // ── CLI: build (separate-pages book) — assembler warn joins the stream; every page recaps ──
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-diag-'));
    try {
      writeFileSync(join(dir, 'book.emd'), '<meta type=book>\n<title | Diag Book</title>\n</meta>\n\n<chapter src="one.emd" | One>\n<chapter src="missing.emd" | Gone>\n');
      writeFileSync(join(dir, 'one.emd'), '# One\n\nSee <cite @ghost2020>.\n');
      const outDir = join(dir, 'out');
      const { code, err } = invoke(['build', join(dir, 'book.emd'), '-o', outDir]);
      assert.equal(code, 0, 'build exits 0 (always-renders)');
      assert.ok(err.includes('missing.emd'), 'channel 1: the assembler missing-child diagnostic reaches stderr (rerouted from console.warn)');
      assert.ok(err.includes('diagnostics summary'), 'channel 2: summary present');
      const pages = readdirSync(outDir).filter((f) => f.endsWith('.html'));
      assert.ok(pages.length >= 2, 'separate pages written');
      for (const p of pages) {
        assert.ok(readFileSync(join(outDir, p), 'utf8').includes('data-enscribe-diagnostics'),
          `every page carries the document stream (${p})`);
      }
      console.log('PASS: diagnostics — build separate-pages: assembler warn in-stream; recap on every page');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // ── Tier 2 (opportunistic): the recap script in a REAL browser console ───────
  {
    const driver = await detectDriver();
    const chromium = findChromium();
    if (!driver) {
      console.log('SKIP: diagnostics browser recap — no playwright/puppeteer driver importable.');
      console.log('      Human check: open a warns.emd render in a browser; the console must show');
      console.log('      "[enscribe] …warns.emd:5:12 — cite-resolution: no <library> in scope…".');
    } else {
      const dir = mkdtempSync(join(tmpdir(), 'enscribe-recap-'));
      let browser = null;
      try {
        const { out } = invoke(['render', WARNS]);
        const htmlPath = join(dir, 'warns.html');
        writeFileSync(htmlPath, out, 'utf8');
        browser = await openBrowser(driver, /-core$/.test(driver.name) ? chromium : undefined);
        const page = await browser.page(false);
        const seen = [];
        page.onConsole((type, text) => seen.push({ type, text }));
        await page.goto(pathToFileURL(htmlPath).href);
        const recaps = seen.filter((c) => c.text.startsWith('[enscribe]'));
        assert.equal(recaps.length, 2, 'both messages recap to the real browser console');
        assert.ok(recaps.every((c) => c.type === 'warning' || c.type === 'warn'), 'as console.warn');
        assert.ok(recaps[0].text.includes('warns.emd:5:12') && recaps[0].text.includes('no <library> in scope for "ghost2020"'),
          'the recap carries file:line:col provenance and the message');
        console.log('PASS: diagnostics — the emitted recap script prints to a REAL browser console (Tier 2)');
      } finally {
        if (browser) await browser.close();
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }
}
