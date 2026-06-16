// Tests for the single-file asset HTML projection of <data> (#190): an asset
// declared inside <data> and pulled into the body by <fig src="@id" /> renders as
// a real numbered figure; an unresolved @id renders a visible __asset-error,
// never a broken @-src <img>. Covers the embedded-png foundation (slice 1) and
// the rest of the HTML projection (slice 3): external assets (a plain
// <img src=path>), every embedded media type (png/jpg/svg/gif/webp), and
// duplicate placement (re-placing one asset is legitimate — two figures, one id).
// Only JATS <graphic> export remains (slice 4).
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

  // ── #190 slice 3: external assets · all media types · duplicate placement ────
  {
    const psrc = readFileSync(join(FIXTURES, 'asset-projection.emd'), 'utf8');
    const pfile = new VFile({ value: psrc, path: 'asset-projection.emd' });
    const pbody = String(buildEnscribePipeline({}).processSync(pfile))
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');
    // The <img> src of a placed figure, keyed by the figure id.
    const figImg = (id) => {
      const fig = pbody.match(new RegExp('<figure\\b[^>]*\\bid="' + id + '"[\\s\\S]*?</figure>'));
      const im = fig && fig[0].match(/<img\b[^>]*\bsrc="([^"]*)"/);
      return im ? im[1] : null;
    };

    // A. External asset → the declared path verbatim (a plain <img src=path>, not data:).
    assert.equal(figImg('fig:ext'), 'images/diagram.png', 'external asset renders its declared path');

    // B. Embedded media types → the right data:<mime>;base64 URI.
    assert.equal(figImg('fig:jpg'), 'data:image/jpeg;base64,JPGdata1', 'jpg → image/jpeg');
    assert.equal(figImg('fig:svg'), 'data:image/svg+xml;base64,SVGdata1', 'svg → image/svg+xml');
    assert.equal(figImg('fig:gif'), 'data:image/gif;base64,GIFdata1', 'gif → image/gif');
    assert.equal(figImg('fig:webp'), 'data:image/webp;base64,WEBPdata1', 'webp → image/webp');
    // An unsupported embedded format → a visible asset-error, no figure.
    assert.equal(figImg('fig:bad'), null, 'unsupported format renders no figure');
    assert.ok(/@fig:bad: unsupported embedded-asset format/.test(pbody),
      'unsupported format → an asset-error naming @fig:bad');

    // C. Duplicate placement: two placements of one asset → two figures, exactly one id.
    assert.equal((pbody.match(/\bid="fig:logo"/g) || []).length, 1,
      'exactly one id="fig:logo" despite two placements (only the first adopts the id)');
    assert.equal((pbody.match(/data:image\/png;base64,iVBORw0KGgo/g) || []).length, 2,
      'both logo placements render the image');
    assert.ok(/<a [^>]*href="#fig:logo"[^>]*>figure \d+<\/a>/.test(pbody),
      'the <ref @fig:logo> resolves to the first placement (the adopted anchor)');
    assert.ok(!/<img\b[^>]*\bsrc="@/.test(pbody), 'no raw @-src <img> leaked');

    const pwarn = (pfile.messages || []).map((m) => String(m));
    assert.equal(pwarn.length, 0, `no warnings expected, got: ${pwarn.join('; ')}`);

    console.log('PASS: #190 slice 3 — external assets, all media types, and duplicate placement project to HTML');
  }
}
