// Tests for the embedded-asset half of <data> (#190 foundation slice): an
// asset declared inside <data> as <fig #id png>base64</fig> and pulled into the
// body by <fig src="@id" /> renders as a real numbered figure with a data: URI;
// an unresolved @id renders a visible __asset-error, never a broken @-src <img>.
// Scope: single-file, embedded png only (cross-file merge / external assets /
// other media types / JATS export are later slices).
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VFile } from 'vfile';
import { buildEnscribePipeline } from '@enscribejs/enscribe';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function run_tests() {
  const src = readFileSync(join(FIXTURES, 'embedded-asset.emd'), 'utf8');
  const file = new VFile({ value: src, path: 'embedded-asset.emd' });
  const html = String(buildEnscribePipeline({}).processSync(file));
  // Count rendered elements in the document's MARKUP only — the standalone
  // document embeds tooltip CSS/JS whose comments mention `<figure>`/`<img>`
  // literally, so strip <script>/<style> blocks before counting.
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const imgs = [...body.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((m) => m[1]);
  const figures = [...body.matchAll(/<figure\b[^>]*>/g)];
  const figureIds = [...body.matchAll(/<figure\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
  const labels = [...body.matchAll(/Figure\s+([0-9.]+)/g)].map((m) => m[1]);

  // 1. The body <fig src="@fig:scatter"> resolves to an embedded data: URI image.
  assert.equal(imgs.length, 1, 'exactly one <img> (the placed asset)');
  assert.ok(/^data:image\/png;base64,iVBORw0KGgo/.test(imgs[0]),
    `placed <img> src is a png data: URI, got: ${imgs[0].slice(0, 40)}`);

  // 2. The <data> declaration does NOT render as a stray figure, and its base64
  //    is not duplicated — it appears once (the placed image only).
  assert.equal(figures.length, 1, 'exactly one <figure> — the declaration did not render');
  assert.ok(!/<data\b/.test(html), '<data> block is not in the rendered output');
  assert.equal((html.match(/iVBORw0KGgo/g) || []).length, 1,
    'base64 payload appears exactly once (declaration stripped, not duplicated)');

  // 3. The placed figure adopts the asset id, is numbered, and the <ref> resolves
  //    to that number (the declaration did not consume the figure counter).
  assert.deepEqual(figureIds, ['fig:scatter'], 'placed figure adopts the asset id');
  assert.deepEqual(labels, ['1.'], 'one figure, numbered 1 (no number consumed by the declaration)');
  assert.ok(/<a [^>]*href="#fig:scatter"[^>]*>figure 1<\/a>/.test(html),
    'the <ref @fig:scatter> resolves to "figure 1" linking the placed figure');

  // 4. An unresolved @id renders a visible __asset-error, never a raw @-src <img>.
  assert.ok(/class="enscribe-asset-error"/.test(html), 'unresolved @id renders an __asset-error block');
  assert.ok(/@nonexistent/.test(html), 'the asset-error names the unresolved reference');
  assert.ok(!/<img\b[^>]*\bsrc="@/.test(html), 'no raw @-src <img> leaked into the output');

  // 5. The happy path emits no vfile warnings.
  const warnings = (file.messages || []).map((m) => String(m));
  assert.equal(warnings.length, 0, `no warnings expected, got: ${warnings.join('; ')}`);

  console.log('PASS: #190 — <data> embedded-png asset places a numbered figure via src="@id" (data: URI, cross-ref, always-renders error)');
}
