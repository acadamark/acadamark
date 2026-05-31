// DSL render registry + live-mode asset emission (DSL Slice 1).
//
// Two halves: (1) the registry module's pure surface — reads, pinned CDN URLs,
// and resolveDslMode precedence/validation; (2) the pipeline-level behavior the
// registry drives in compileToHtml — skip (default) emits only the contract,
// live-inline inlines the library, live-link points at the pinned CDN, presence
// gating, per-DSL overrides, and the fail-explicitly static guard.

import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '@enscribejs/remark';
import { enscribeInterpreter } from '../../src/index.js';
import {
  getRegisteredDsls,
  getDsl,
  resolveDslMode,
  VALID_DSL_MODES,
  MERMAID_CDN_URL,
  ABCJS_CDN_URL,
} from '../../src/dsl/registry.js';

function processHtml(source, options = {}) {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkEnscribe)
      .use(enscribeInterpreter, options)
      .processSync(source),
  );
}

const MERMAID_SRC = `<mermaid>
graph LR
  A[Start] --> B[End]
</mermaid>`;

const ABC_SRC = `<abc>
X:1
T:Test Tune
K:C
C D E F |
</abc>`;

// Raw abc notation — the inner content of ABC_SRC without the <abc> wrapper.
// This is what the static renderer (getDsl('abc').staticRenderer) consumes
// directly; ABC_SRC is the authoring form the pipeline parses.
const ABC_NOTATION = 'X:1\nT:Test Tune\nK:C\nC D E F |\n';

const NO_DSL_SRC = 'Just a paragraph, no DSL blocks at all.';

const MERMAID_INIT = 'mermaid.initialize({ startOnLoad: true })';
const ABC_INIT = 'ABCJS.renderAbc';

export function run() {
  // ── Registry reads ──────────────────────────────────────────────────────────
  {
    const dsls = getRegisteredDsls();
    assert.deepEqual(dsls.map((d) => d.name), ['mermaid', 'abc'], 'registry holds mermaid then abc');
    for (const d of dsls) {
      assert.equal(d.containerTag, 'pre', `${d.name} containerTag is 'pre'`);
      assert.equal(typeof d.liveAssets.bundleLoader, 'function', `${d.name} has a bundleLoader fn`);
    }
    // Static renderers diverge by DSL (Slice 2): mermaid is live-only — its
    // staticRenderer is null and permanently so; abc gained a build-time
    // renderer (function) plus the staticClass the emit path adds to the <svg>.
    assert.equal(getDsl('mermaid').staticRenderer, null, 'mermaid has no static renderer (live-only, permanent)');
    assert.equal(typeof getDsl('abc').staticRenderer, 'function', 'abc has a static renderer (Slice 2)');
    assert.equal(getDsl('abc').staticClass, 'enscribe-abc-rendered', 'abc carries its emit staticClass');
    assert.equal(getDsl('mermaid').contractClass, 'mermaid', 'mermaid contractClass');
    assert.equal(getDsl('abc').contractClass, 'abc', 'abc contractClass');
    assert.equal(getDsl('nope'), null, 'unregistered name → null');
    console.log('PASS: registry: getRegisteredDsls / getDsl reads (mermaid, abc; pre; mermaid static=null, abc static=fn)');
  }

  // ── Pinned CDN URLs ───────────────────────────────────────────────────────────
  {
    assert.match(MERMAID_CDN_URL, /mermaid@\d+\.\d+\.\d+\/dist\/mermaid\.min\.js$/, 'mermaid CDN pinned');
    assert.match(ABCJS_CDN_URL, /abcjs@\d+\.\d+\.\d+\/dist\/abcjs-basic-min\.js$/, 'abcjs CDN pinned');
    console.log(`PASS: registry: CDN URLs are version-pinned`);
  }

  // ── resolveDslMode: precedence + validation ──────────────────────────────────
  {
    assert.deepEqual(VALID_DSL_MODES, ['skip', 'live-inline', 'live-link', 'static'], 'valid mode set');
    assert.equal(resolveDslMode('mermaid', {}), 'skip', 'default is skip');
    assert.equal(resolveDslMode('mermaid', { dslMode: 'live-inline' }), 'live-inline', 'global dslMode applies');
    assert.equal(
      resolveDslMode('mermaid', { dslMode: 'live-inline', mermaidMode: 'live-link' }),
      'live-link',
      'per-DSL override beats global',
    );
    assert.equal(
      resolveDslMode('abc', { dslMode: 'live-inline', abcMode: 'skip' }),
      'skip',
      'abcMode override beats global',
    );
    assert.throws(
      () => resolveDslMode('mermaid', { dslMode: 'nope' }),
      /Invalid DSL mode 'nope'/,
      'unknown mode token throws',
    );
    console.log('PASS: registry: resolveDslMode precedence (‹dsl›Mode ?? dslMode ?? skip) + invalid throw');
  }

  // Baselines for the bundle-inlined size deltas below (font-CSS-agnostic).
  const mermaidSkip = processHtml(MERMAID_SRC);
  const abcSkip = processHtml(ABC_SRC);

  // ── skip (default): contract only, no library ────────────────────────────────
  {
    assert.ok(mermaidSkip.includes('data-enscribe-dsl="mermaid"'), 'skip: mermaid contract markup present');
    assert.ok(!mermaidSkip.includes(MERMAID_INIT), 'skip: no mermaid init');
    assert.ok(!mermaidSkip.includes(MERMAID_CDN_URL), 'skip: no mermaid CDN link');
    assert.ok(abcSkip.includes('data-enscribe-dsl="abc"'), 'skip: abc contract markup present');
    assert.ok(!abcSkip.includes(ABC_INIT), 'skip: no abc init');
    console.log('PASS: registry: skip mode (default) emits only the contract markup — no library, no init');
  }

  // ── live-inline mermaid: bundle inlined + init, contract preserved ────────────
  {
    const html = processHtml(MERMAID_SRC, { dslMode: 'live-inline' });
    assert.ok(html.includes(MERMAID_INIT), 'live-inline: mermaid init present');
    assert.ok(html.includes('data-enscribe-dsl="mermaid"'), 'live-inline: contract markup preserved');
    assert.ok(!html.includes(MERMAID_CDN_URL), 'live-inline: library is inlined, not CDN-linked');
    assert.ok(html.length > mermaidSkip.length + 1_000_000, 'live-inline: mermaid bundle (~3MB) is inlined');
    console.log('PASS: registry: live-inline mermaid → inlined bundle + init, contract preserved');
  }

  // ── live-link mermaid: CDN script + init, bundle not inlined ──────────────────
  {
    const html = processHtml(MERMAID_SRC, { dslMode: 'live-link' });
    assert.ok(html.includes(MERMAID_CDN_URL), 'live-link: mermaid CDN URL present');
    assert.ok(html.includes(`<script src="${MERMAID_CDN_URL}">`), 'live-link: CDN loaded via <script src>');
    assert.ok(html.includes(MERMAID_INIT), 'live-link: mermaid init present');
    assert.ok(html.length < mermaidSkip.length + 100_000, 'live-link: bundle is NOT inlined');
    console.log('PASS: registry: live-link mermaid → <script src> to pinned CDN + init, no inlined bundle');
  }

  // ── live-inline / live-link abc ───────────────────────────────────────────────
  {
    const inline = processHtml(ABC_SRC, { dslMode: 'live-inline' });
    assert.ok(inline.includes(ABC_INIT), 'live-inline: abc init (ABCJS.renderAbc) present');
    assert.ok(/<pre[^>]*data-enscribe-dsl="abc"/.test(inline), 'live-inline: abc <pre> contract preserved');
    assert.ok(inline.length > abcSkip.length + 400_000, 'live-inline: abc bundle (~492KB) is inlined');

    const link = processHtml(ABC_SRC, { dslMode: 'live-link' });
    assert.ok(link.includes(ABCJS_CDN_URL), 'live-link: abcjs CDN URL present');
    assert.ok(link.includes(ABC_INIT), 'live-link: abc init present');
    assert.ok(link.length < abcSkip.length + 100_000, 'live-link: abc bundle NOT inlined');
    console.log('PASS: registry: abc live-inline (inlined bundle) and live-link (pinned CDN) both render init');
  }

  // ── per-DSL override at the pipeline level ────────────────────────────────────
  {
    // Global live-link, but mermaid overridden to skip → no mermaid assets.
    const html = processHtml(MERMAID_SRC, { dslMode: 'live-link', mermaidMode: 'skip' });
    assert.ok(!html.includes(MERMAID_CDN_URL), 'override: mermaidMode skip suppresses CDN link');
    assert.ok(!html.includes(MERMAID_INIT), 'override: mermaidMode skip suppresses init');
    assert.ok(html.includes('data-enscribe-dsl="mermaid"'), 'override: contract markup still present');
    console.log('PASS: registry: per-DSL mermaidMode override beats global dslMode at compile time');
  }

  // ── only present DSLs get assets ──────────────────────────────────────────────
  {
    // A mermaid-only document in a live mode must not emit abc assets.
    const html = processHtml(MERMAID_SRC, { dslMode: 'live-inline' });
    assert.ok(html.includes(MERMAID_INIT), 'present: mermaid init emitted');
    assert.ok(!html.includes(ABC_INIT), 'absent: no abc init for a mermaid-only document');
    // A document with no DSL at all emits nothing even in a live mode.
    const none = processHtml(NO_DSL_SRC, { dslMode: 'live-inline' });
    assert.ok(!none.includes(MERMAID_INIT), 'no-DSL: no mermaid init');
    assert.ok(!none.includes(ABC_INIT), 'no-DSL: no abc init');
    console.log('PASS: registry: assets are gated on DSL presence (detector)');
  }

  // ── fail-explicitly on static for a DSL with NO static renderer (mermaid) ─────
  {
    assert.throws(
      () => processHtml(MERMAID_SRC, { dslMode: 'static' }),
      /not available for 'mermaid'/,
      'global static + mermaid present throws naming mermaid',
    );
    assert.throws(
      () => processHtml(MERMAID_SRC, { mermaidMode: 'static' }),
      /not available for 'mermaid'/,
      'mermaidMode static throws',
    );
    // The guard is gated on PRESENCE: a document with no such DSL is fine.
    assert.doesNotThrow(
      () => processHtml(NO_DSL_SRC, { dslMode: 'static' }),
      'global static on a DSL-free document does not throw',
    );
    console.log('PASS: registry: static without a static renderer (mermaid) fails explicitly, but only when present');
  }

  // ── abc static mode: succeeds at the pipeline level + renderer contract ───────
  {
    // Pipeline (Slice 2): abcMode 'static' on an abc document no longer throws —
    // the <pre> contract is REPLACED by an inline <svg> carrying the static
    // class, and no abcjs init script is emitted (the render happened at build).
    const html = processHtml(ABC_SRC, { abcMode: 'static' });
    assert.ok(html.includes('<svg class="enscribe-abc-rendered"'), 'abc static: contract replaced by classed <svg>');
    assert.ok(!/<pre[^>]*data-enscribe-dsl="abc"/.test(html), 'abc static: <pre> contract no longer present');
    assert.ok(!html.includes(ABC_INIT), 'abc static: no abcjs init script (build-time render needs none)');

    // Renderer contract (exercised directly via the registration). Determinism:
    // the same source renders byte-identically — abcjs's default SVG writer uses
    // no Math.random / Date / cross-render id counter — so static output is
    // reproducible and snapshot-safe.
    const render = getDsl('abc').staticRenderer;
    const svg1 = render(ABC_NOTATION);
    const svg2 = render(ABC_NOTATION);
    assert.ok(/<svg[\s>]/.test(svg1), 'abc static renderer produces an <svg>');
    assert.equal(svg1, svg2, 'abc static renderer is deterministic (byte-identical on repeat)');

    // Fails loudly, no silent fallback: a non-string source makes abcjs throw;
    // the renderer re-throws an error that names the offending source.
    assert.throws(
      () => render(null),
      /abc static render failed for source/,
      'abc static renderer rethrows on a non-string (null) source',
    );
    console.log('PASS: registry: abc static mode renders inline SVG (deterministic) and fails loudly on bad source');
  }
}
