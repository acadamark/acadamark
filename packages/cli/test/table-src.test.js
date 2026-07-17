// #413 L5 — the CLI `render` command fetching a URL `<table src>`. The exact analog of
// library-src.test.js: global.fetch is stubbed (no live network), proving the async dispatch
// end to end. Before L5 the CLI collected only `<library src>` URLs, so a URL `<table src>`
// never entered the preload — doRender returned synchronously and the table rendered EMPTY
// (its data never fetched). After L5, collectTableSources joins the URL preload (mirroring the
// browser's renderAsync), so a URL-sourced table fetches and renders like a URL library.

import assert from 'node:assert';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/cli.js';

function sink() {
  let text = '';
  return { write(s) { text += s; }, get text() { return text; } };
}

export async function run_tests() {
  const dir = mkdtempSync(join(tmpdir(), 'enscribe-tablesrc-'));
  const emd = join(dir, 'doc.emd');
  writeFileSync(
    emd,
    '<meta type=article>\n  <title | T>\n</meta>\n\n<table csv src="https://example.com/data.csv" caption="Data." />\n',
  );
  const CSV = 'sample,value\nAlpha,42\n';
  const origFetch = global.fetch;
  let fetched = null;
  global.fetch = async (url) => { fetched = url; return { ok: true, status: 200, statusText: 'OK', text: async () => CSV }; };
  try {
    const out = sink();
    const err = sink();
    const result = run(['render', emd], { stdout: out, stderr: err });
    // The heart of L5: a URL <table src> now triggers the async fetch dispatch (before, this was
    // a plain string — the table src was never collected, so no Promise and no fetch).
    assert.ok(result && typeof result.then === 'function', 'render with a URL <table src> returns a Promise');
    const code = await result;
    assert.equal(code, 0, 'CLI render exits 0');
    assert.equal(fetched, 'https://example.com/data.csv', 'the CLI fetched the URL table source');
    assert.ok(out.text.includes('<th>sample</th>') && out.text.includes('<td>Alpha</td>') && out.text.includes('<td>42</td>'),
      'the fetched CSV rendered as a table grid (headers + body cells)');
    assert.ok(!out.text.includes('??table-error'), 'no table load/parse error');
    console.log('PASS: #413 L5 — CLI `render` fetches a URL <table src> (mocked) and renders the grid');
  } finally {
    global.fetch = origFetch;
    rmSync(dir, { recursive: true, force: true });
  }
}
