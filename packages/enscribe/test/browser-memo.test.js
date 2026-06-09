// #48: browser render-path performance — pipeline memoization.
//
// The browser render() memoizes its built pipeline, keyed on the resolved
// options, and reuses it across calls (the source arrives per call via
// processSync, so it is not part of the key). This suite guards the two things
// that make that safe:
//
//   1. Output-equality (the hard invariant). A memoized render() is
//      byte-identical to building a fresh pipeline every call — across
//      interleaved sources and varied options — so a reused processor leaks no
//      per-render state and serves no stale output.
//   2. Correct memoization. The same options reuse one processor instance;
//      different options get a distinct one; an option change re-renders
//      correctly rather than returning a cached result for the wrong options.

import assert from 'node:assert';
import { render, getPipeline } from '../src/interpreter/browser.js';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

// Mirror the browser entry's defaults so the fresh-build baseline matches what
// render() resolves to. (Kept in sync with BROWSER_DEFAULTS in browser.js.)
const BROWSER_DEFAULTS = { embedResources: false, hoverPreviewMode: 'link', dslMode: 'live-link' };
const fresh = (src, opts = {}) =>
  String(buildEnscribePipeline({ ...BROWSER_DEFAULTS, ...opts }).processSync(src));

export async function run() {
  const MATH =
    '# M\n\nInline $x^2$ and a citation <cite a2023>.\n\n<data>\n<library>\n' +
    '@article{a2023, title={T}, author={A}, year={2023}, journal={J}}\n</library>\n</data>';
  const NOTES = '# N\n\nA note <note | see this> and a ref <ref #sec:t>.\n\n# T\n\nbody';
  const PLAIN = 'Just prose, no assets at all.';
  const LIST = '<list>\n<- one ->\n<- two ->\n</list>';
  const MULTI = '# A\n\nx\n\n# B\n\ny\n\n# C\n\nz\n\n# D\n\nw';

  // 1. Output-equality vs a fresh build, interleaving sources/options through
  //    the cache (a reused processor must not leak state between renders).
  const trials = [
    [MATH, {}], [NOTES, {}], [MATH, {}], [PLAIN, {}], [NOTES, {}],
    [MATH, { toc: true }], [MATH, {}], [MATH, { theme: 'modern' }],
    [LIST, {}], [NOTES, { embedResources: true }],
  ];
  for (const [src, opts] of trials) {
    assert.strictEqual(
      render(src, opts),
      fresh(src, opts),
      `memoized render() == fresh-built pipeline (opts=${JSON.stringify(opts)})`,
    );
  }
  console.log('PASS: memoized render() is byte-identical to a fresh-built pipeline');

  // 2a. No stale output across sources through one reused (cached) processor.
  const a1 = render(MATH);
  render(NOTES); // a different source through the same default-options pipeline
  const a2 = render(MATH);
  assert.strictEqual(a1, a2, 'reused pipeline does not leak state between sources');
  console.log('PASS: the reused pipeline is stateless across sources (no stale output)');

  // 2b. The memo engages: same options reuse one instance; different rebuild.
  assert.strictEqual(getPipeline(), getPipeline(), 'same (default) options reuse one pipeline instance');
  assert.strictEqual(
    getPipeline({ toc: true }),
    getPipeline({ toc: true }),
    'same non-default options reuse one instance',
  );
  assert.notStrictEqual(getPipeline(), getPipeline({ toc: true }), 'different options get distinct pipelines');
  assert.notStrictEqual(
    getPipeline({ theme: 'modern' }),
    getPipeline({ theme: 'compact' }),
    'a theme change keys a distinct pipeline',
  );
  console.log('PASS: the memo engages — same key reuses the instance, different key rebuilds');

  // 2c. An option change re-renders correctly (never served stale from the memo).
  const withToc = render(MULTI, { toc: true });
  const noToc = render(MULTI, { toc: false });
  assert.notStrictEqual(withToc, noToc, 'toc:true vs toc:false produce different output');
  assert.strictEqual(
    render(MULTI, { toc: true }),
    fresh(MULTI, { toc: true }),
    'toc:true output stays correct after interleaving',
  );
  console.log('PASS: option changes re-render correctly (no stale cache hits)');
}
