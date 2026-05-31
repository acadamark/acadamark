// Regression guard for the <svg> content fix (housekeeping slice, 2026-05-31).
//
// The bug: `svg` was missing from DSL_REGISTRY, so getContentHandler('svg')
// returned 'default' → isOpaqueContent: false → the recursive-content plugin
// re-parsed the SVG source into an mdast array. handlers/svg.js reads only
// string content (`typeof node.content === 'string' ? node.content : ''`), so
// it received the array, fell back to '', and emitted an empty <svg></svg> —
// the inner source was dropped.
//
// The fix: register ['svg','svg'] in DSL_REGISTRY (opaque, like table/library),
// so svg content stays a verbatim string and the handler emits it. This test
// exercises the whole chain end-to-end (registry → opaque content → handler).
import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/index.js';
import { getContentHandler } from '@enscribejs/core/dsl-registry';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

export function run() {
  // The registry entry that makes <svg> content opaque (the fix itself).
  assert.equal(
    getContentHandler('svg'),
    'svg',
    'svg is registered as an opaque content handler',
  );
  console.log('PASS: getContentHandler("svg") === "svg"');

  // Long-form <svg> preserves its inner source.
  {
    const html = render(
      '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="teal" /></svg>',
    );
    assert.ok(html.includes('<svg'), 'an <svg> element is emitted');
    assert.ok(html.includes('<circle'), 'the inner SVG source is preserved (not dropped)');
    assert.ok(
      html.includes('viewBox="0 0 100 100"'),
      'the viewBox passthrough attribute is present',
    );
    console.log('PASS: long-form <svg> preserves its inner source');
  }

  // Pipe-form <svg> preserves its inner source too.
  {
    const html = render('<svg viewBox="0 0 20 20" | <rect width="20" height="20" fill="red" />>');
    assert.ok(html.includes('<rect'), 'pipe-form <svg> preserves its inner source');
    console.log('PASS: pipe-form <svg> preserves its inner source');
  }

  console.log('All <svg> content tests passed.');
}
