// #133 — the CLI `render` command fetching a URL <library src>. Deterministic:
// global.fetch is stubbed (no live network). Proves the async dispatch end to end
// (doRender returns a Promise for a URL source; run() awaits it).

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
  const dir = mkdtempSync(join(tmpdir(), 'enscribe-libsrc-'));
  const emd = join(dir, 'doc.emd');
  writeFileSync(
    emd,
    '<meta type=article>\n  <title | T>\n</meta>\n\nBody.<cite @KeyA>\n\n<bibliography></bibliography>\n\n<data>\n<library src="https://example.com/refs.bib" />\n</data>\n',
  );
  const BIB = '@article{KeyA, title={Title A}, author={Ann Author}, year={2020}, journal={J}}';
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, statusText: 'OK', text: async () => BIB });
  try {
    const out = sink();
    const err = sink();
    const result = run(['render', emd], { stdout: out, stderr: err });
    assert.ok(result && typeof result.then === 'function', 'render with a URL <library src> returns a Promise');
    const code = await result;
    assert.equal(code, 0, 'CLI render exits 0');
    assert.ok(out.text.includes('Title A') && !out.text.includes('??cite'), 'CLI render fetched the URL source (mocked) and resolved the citation');
    assert.ok(!out.text.includes('enscribe-library-error'), 'no load error');
    console.log('PASS: #133 — CLI `render` fetches a URL <library src> (mocked) and resolves');
  } finally {
    global.fetch = origFetch;
    rmSync(dir, { recursive: true, force: true });
  }
}
