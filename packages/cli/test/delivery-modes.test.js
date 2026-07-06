// Delivery-modes regression tests (#369) — the permanent record of the asset-delivery behaviour and
// the OFFLINE guarantee (delivery-modes.md §"Asset delivery"; built in #363–#366).
//
// This makes the one-off 5-variant delivery grep (run by hand during #363–#366) a committed test.
// It complements — does not duplicate — the assertions already in:
//   - cli.test.js  (#363: the `--assets` CLI surface + the three rejection cases)
//   - build-live.test.js (#363/#364/#365: the build-function delivery shape, editor inlining)
//   - emit-shell.test.js (#364/#365: the emitter inline path, at the emitter level)
// Here the focus is the END-TO-END OUTPUT PROFILE of a real document across all five variants, plus
// esm.sh = 0 across every output, and (Tier 2) the in-browser offline render + editor mount.
//
// Fixture: fixtures/delivery-doc.emd — prose + heading + inline math (KaTeX/fonts) + an embedded
// figure, self-contained (no `<… src>` children → single-file-editable). NO mermaid/abc diagram:
// a diagram still loads its lib from the CDN even when inlined (the documented exception, pinned by
// its own test below), so excluding it keeps the offline profile clean.

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildSingleFile, buildLiveFolder, SHELL_ASSET_SPECS } from '../src/build-live.js';
import { buildEnscribePipeline } from '@enscribejs/enscribe';
import { runBrowserTier } from './delivery-browser.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, 'fixtures', 'delivery-doc.emd');
const ENSCRIBE_PKG = resolve(__dirname, '../../enscribe');
const CHROME_ASSETS = Object.keys(SHELL_ASSET_SPECS);   // the four chrome filenames

// A shell OUTSIDE the inlined engine <script>: the minified engine bundle carries CDN URL LITERALS
// (KaTeX/fonts/DSL constants) and `<link…>`/`<script src…>` strings (it is the code that GENERATES
// them) — those are not resource references, so we strip the one inlined engine block before scanning.
const stripEngine = (h) => h.replace(/<script>[\s\S]*?<\/script>/, '<script>ENGINE</script>');
const netRefs = (h) => [...stripEngine(h).matchAll(/(?:href|src)="(https?:[^"]+)"|import\('(https?:[^']+)'/g)]
  .map((m) => m[1] || m[2]);
const countEsm = (h) => (h.match(/esm\.sh/g) || []).length;

export async function run_tests() {
  // The inlined/cdn deliveries read the engine + editor bundles from dist/; a fresh worktree has none.
  // Build once if absent (the same self-containment build-live.test.js / bundle-load.test.js use).
  let bundlePresent = false;
  try { bundlePresent = existsSync(require.resolve('@enscribejs/enscribe/browser-global')); } catch { bundlePresent = false; }
  if (!bundlePresent) execSync('npm run build:lib', { cwd: ENSCRIBE_PKG, stdio: 'pipe' });

  const esm = {};   // per-output esm.sh counts → asserted 0 across all five at the end

  // ── Tier 1: the five-variant delivery matrix (oracle = the delivery-modes report's table) ─────────

  // (1) --single-file --assets inlined → a fully offline file: ZERO external URLs, all bytes inline.
  {
    const { html, delivery, editable } = buildSingleFile({ master: FIXTURE, delivery: 'inlined', warn: () => {} });
    esm['sf-inlined'] = countEsm(html);
    assert.strictEqual(delivery, 'inlined', 'sf inlined: delivery recorded');
    assert.ok(editable, 'sf inlined: the fixture is self-contained → editable');
    assert.deepStrictEqual(netRefs(html), [], 'sf inlined: ZERO external URLs (no jsDelivr / Google Fonts / KaTeX CDN / esm.sh)');
    assert.ok(html.includes('@font-face') && html.includes('base64,'), 'sf inlined: document + KaTeX fonts inlined (@font-face base64)');
    assert.ok(html.includes('.katex'), 'sf inlined: KaTeX CSS inlined');
    assert.ok(!stripEngine(html).includes('<script src='), 'sf inlined: the engine is an inline <script>, not a src reference');
    assert.ok(html.length > 3_000_000, 'sf inlined: the ~3.4 MB engine bundle is embedded (large file)');
    assert.ok(html.includes('<template id="enscribe-editor-src">'), 'sf inlined: the bundled editor is inlined (template)');
    assert.ok(html.includes('<template id="enscribe-source">') && html.includes('fig:pixel') && html.includes('E = mc^2'),
      'sf inlined: the document source (figure + math) is embedded');
  }

  // (2) --single-file --assets cdn (the default) → small file, chrome + display from the web.
  {
    const { html, delivery } = buildSingleFile({ master: FIXTURE, delivery: 'cdn', warn: () => {} });
    esm['sf-cdn'] = countEsm(html);
    assert.strictEqual(delivery, 'cdn', 'sf cdn: delivery recorded');
    assert.ok(html.length < 200_000, 'sf cdn: small file (engine referenced, not inlined)');
    const refs = netRefs(html).join('\n');
    assert.ok(/cdn\.jsdelivr\.net\/npm\/@enscribejs\/enscribe@[^/]+\/dist\/enscribe\.browser\.global\.js/.test(refs), 'sf cdn: engine from pinned jsDelivr');
    assert.ok(/cdn\.jsdelivr\.net\/npm\/@enscribejs\/enscribe@[^/]+\/dist\/editor-codemirror\.js/.test(refs), 'sf cdn: bundled editor from jsDelivr dist (not esm.sh)');
    assert.ok(/fonts\.googleapis\.com/.test(refs), 'sf cdn: document fonts from Google Fonts');
    assert.ok(/cdn\.jsdelivr\.net\/npm\/katex@/.test(refs), 'sf cdn: KaTeX CSS from the pinned CDN');
    assert.ok(!html.includes('<template id="enscribe-editor-src">'), 'sf cdn: the editor is referenced, not inlined');
  }

  const liveDir = (tag) => mkdtempSync(join(tmpdir(), `enscribe-deliv-${tag}-`));

  // (3) --live --assets inlined → served folder with no chrome copied and no external URLs on the page.
  {
    const out = liveDir('live-inl');
    try {
      const res = buildLiveFolder({ master: FIXTURE, outDir: out, delivery: 'inlined' });
      assert.strictEqual(res.delivery, 'inlined', 'live inlined: delivery recorded');
      assert.deepStrictEqual(res.assets, [], 'live inlined: NO chrome files copied (all inlined)');
      for (const f of CHROME_ASSETS) assert.ok(!existsSync(join(out, f)), `live inlined: ${f} not copied`);
      assert.ok(existsSync(join(out, 'delivery-doc.emd')), 'live inlined: the document CONTENT is copied (fetched at runtime)');
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      esm['live-inlined'] = countEsm(html);
      assert.deepStrictEqual(netRefs(html), [], 'live inlined: the shell page has ZERO external URLs (offline)');
      assert.ok(html.includes('@font-face') && html.includes('<template id="enscribe-editor-src">'), 'live inlined: display + editor inlined in the shell');
    } finally { rmSync(out, { recursive: true, force: true }); }
  }

  // (4) --live --assets cdn → jsDelivr chrome, zero assets copied.
  {
    const out = liveDir('live-cdn');
    try {
      const res = buildLiveFolder({ master: FIXTURE, outDir: out, delivery: 'cdn' });
      assert.deepStrictEqual(res.assets, [], 'live cdn: NO chrome copied');
      for (const f of CHROME_ASSETS) assert.ok(!existsSync(join(out, f)), `live cdn: ${f} not copied`);
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      esm['live-cdn'] = countEsm(html);
      const refs = netRefs(html).join('\n');
      assert.ok(/cdn\.jsdelivr\.net\/npm\/@enscribejs\/enscribe@[^/]+\/dist\/enscribe\.browser\.global\.js/.test(refs), 'live cdn: engine from jsDelivr');
      assert.ok(/cdn\.jsdelivr\.net\/npm\/@enscribejs\/enscribe@[^/]+\/dist\/editor-codemirror\.js/.test(refs), 'live cdn: editor from jsDelivr dist');
    } finally { rmSync(out, { recursive: true, force: true }); }
  }

  // (5) --live --assets siblings (the deployed default) → 4 chrome files copied flat; display still CDN.
  {
    const out = liveDir('live-sib');
    try {
      const res = buildLiveFolder({ master: FIXTURE, outDir: out });   // delivery defaults to siblings
      assert.strictEqual(res.delivery, 'siblings', 'live siblings: the default delivery');
      assert.deepStrictEqual([...res.assets].sort(), [...CHROME_ASSETS].sort(), 'live siblings: all four chrome assets copied flat');
      for (const f of CHROME_ASSETS) assert.ok(existsSync(join(out, f)), `live siblings: ${f} present`);
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      esm['live-siblings'] = countEsm(html);
      // chrome is local (./…, not http); the only external URLs are the display assets (documented default).
      const refs = netRefs(html);
      assert.ok(refs.every((r) => /fonts\.googleapis\.com/.test(r) || /cdn\.jsdelivr\.net\/npm\/katex@/.test(r)),
        `live siblings: the only external URLs are the display assets (fonts + KaTeX); got ${JSON.stringify(refs)}`);
      assert.ok(refs.some((r) => /fonts\.googleapis\.com/.test(r)) && refs.some((r) => /katex@/.test(r)),
        'live siblings: display assets (fonts + KaTeX) are still CDN — the documented siblings default');
      assert.ok(html.includes('href="./default.css"') && html.includes('src="./enscribe.browser.global.js"'),
        'live siblings: chrome referenced by local ./ paths');
    } finally { rmSync(out, { recursive: true, force: true }); }
  }

  // (6) esm.sh = 0 across ALL five outputs — the durable-retirement guard (#362 bundling + #365 editor).
  assert.deepStrictEqual(esm, { 'sf-inlined': 0, 'sf-cdn': 0, 'live-inlined': 0, 'live-cdn': 0, 'live-siblings': 0 },
    `esm.sh must be 0 in every delivery output; got ${JSON.stringify(esm)}`);

  console.log('PASS: #369 Tier 1 — five-variant delivery matrix (inlined=offline, cdn=jsDelivr, siblings=flat+display-CDN); esm.sh=0 across all');

  // ── Optional: pin the DIAGRAM EXCEPTION — why the offline fixture omits diagrams ───────────────────
  // mermaid/abc are NOT bundled into the engine (a standing tsup decision — they are multi-MB), so a
  // diagram's library is pulled from the CDN at RENDER time regardless of the chrome asset delivery. A
  // `--single-file --assets inlined` build embeds the *source*; when the engine renders that source at
  // mount (dslMode 'live-link', the browser default) the mermaid CDN <script> is injected THEN — so the
  // offline guarantee covers text + math + fonts, NOT external-DSL diagrams. We pin the render-time fact
  // (rendering a diagram references the mermaid CDN) — this is exactly what the offline fixture avoids.
  {
    const src = '<meta type=article title="Diagram" />\n\n<section | S>\n\n<diagram mermaid | graph TD; A-->B>\n';
    const rendered = String(buildEnscribePipeline({ dslMode: 'live-link' }).processSync(src));
    assert.ok(/cdn\.jsdelivr\.net\/npm\/mermaid@[^/]+\/dist\/mermaid(\.min)?\.js/.test(rendered),
      'a rendered mermaid diagram references the mermaid CDN (live-link) — the diagram lib is not bundled, so inlined/offline does NOT cover diagrams (the documented exception the offline fixture omits)');
    console.log('PASS: #369 — the diagram exception is pinned (a rendered diagram still needs the mermaid CDN; not covered by --assets inlined)');
  }

  // ── Tier 2: in-browser offline render + editor mount (real browser if a driver is present) ─────────
  await runBrowserTier({ FIXTURE, buildSingleFile });

  console.log('All delivery-modes (#369) tests passed.');
}
