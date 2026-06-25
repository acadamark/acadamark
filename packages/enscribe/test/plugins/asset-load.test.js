// Tests for the asset-load plugin (the embedded-asset twin of library-load) — the missing unit
// peer (#316/1-K), and the duplicate-asset-id last-wins proof (#316/1-I).
//
// Covers buildAssetIndex: harvesting embedded `<fig #id fmt>base64</fig>` and external
// `<fig #id src>` declarations from `<data>` into file.data.enscribeAssets (and stripping them);
// the no-#id warning; and the DUPLICATE-ID collision — last declaration wins + a visible
// `__asset-error` flag (matching the pinned-slug / duplicate-citation-key policy: keep one, warn,
// never a silent overwrite). Plus the makeAssetError / assetError node shapes.

import assert from 'node:assert/strict';
import { buildAssetIndex, makeAssetError, assetError } from '../../src/interpreter/plugins/asset-load.js';
import { ENSCRIBE_ASSETS } from '../../src/core/file-data-keys.js';
import { makeTag } from '../../src/core/tag.js';

/** A minimal VFile mock: collects warnings, holds file.data. (Same shape as library-load.test.js.) */
function makeFile() {
  const warnings = [];
  return { data: {}, message: (msg) => warnings.push(String(msg)), _warnings: warnings };
}

const embeddedFig = (id, fmt, base64) => makeTag('fig', [{ type: 'text', value: base64 }], { id, positional: [fmt] });
const externalFig = (id, src) => makeTag('fig', [], { id, kwargs: { src } });
const dataTree = (...figs) => ({ type: 'root', children: [makeTag('data', figs)] });

export function run() {
  // 1. embedded <fig #id fmt>base64</fig> → indexed (format + base64); the decl is stripped from <data>.
  {
    const tree = dataTree(embeddedFig('fig:x', 'png', 'PNGDATA'));
    const file = makeFile();
    buildAssetIndex(tree, file);
    const assets = file.data[ENSCRIBE_ASSETS];
    assert.ok(assets instanceof Map && assets.has('fig:x'), 'the embedded asset is indexed');
    assert.deepEqual(assets.get('fig:x'), { format: 'png', base64: 'PNGDATA' }, 'format + base64 captured');
    assert.equal(tree.children[0].content.length, 0, 'the harvested <fig> is stripped from its <data> block');
    console.log('PASS: asset-load — embedded <fig #id fmt>base64</fig> indexed (format+base64) and stripped');
  }

  // 2. external <fig #id src> → stored as { src } (the rebased path resolves at the use-site).
  {
    const tree = dataTree(externalFig('fig:ext', 'images/p.png'));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.deepEqual(file.data[ENSCRIBE_ASSETS].get('fig:ext'), { src: 'images/p.png' }, 'external src stored');
    console.log('PASS: asset-load — external <fig #id src> indexed as { src }');
  }

  // 3. a <fig> in <data> with no #id → warns and is LEFT in place (not registered as an asset).
  {
    const tree = dataTree(makeTag('fig', [{ type: 'text', value: 'X' }], { positional: ['png'] }));
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'no id → nothing registered');
    assert.ok(file._warnings.some((w) => /no #id/.test(w)), 'a no-#id warning is emitted');
    assert.equal(tree.children[0].content.length, 1, "the un-id'd <fig> is left in <data>");
    console.log('PASS: asset-load — a <fig> with no #id warns and is left in place');
  }

  // 4. DUPLICATE id across two <data> blocks → LAST declaration wins + a visible __asset-error (#316/1-I).
  {
    const tree = {
      type: 'root',
      children: [
        makeTag('data', [embeddedFig('fig:dup', 'png', 'FIRST')]),
        makeTag('data', [embeddedFig('fig:dup', 'png', 'SECOND')]),
      ],
    };
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS].get('fig:dup').base64, 'SECOND',
      'last-wins: the LAST declaration is the one kept in the index');
    const flags = tree.children.filter((n) => n?.tagname === '__asset-error');
    assert.equal(flags.length, 1, 'exactly one collision flag is injected (always-renders, never a silent overwrite)');
    assert.match(flags[0].kwargs.message, /duplicate embedded-asset id "fig:dup".*last declaration wins/,
      'the collision flag names the id and states last-wins');
    console.log('PASS: asset-load (#316/1-I) — duplicate embedded-asset id: last-wins + a visible collision flag');
  }

  // 5. no <data> → no-op (the index key is never set).
  {
    const tree = { type: 'root', children: [makeTag('article', [])] };
    const file = makeFile();
    buildAssetIndex(tree, file);
    assert.equal(file.data[ENSCRIBE_ASSETS], undefined, 'no <data> → enscribeAssets not set');
    console.log('PASS: asset-load — no <data> block is a no-op');
  }

  // 6. makeAssetError / assetError produce the __asset-error node shape.
  {
    assert.deepEqual(makeAssetError('@fig:x', 'boom'),
      { type: 'enscribeTag', tagname: '__asset-error', kwargs: { ref: '@fig:x', message: 'boom' }, content: null },
      'makeAssetError shape');
    const node = makeTag('fig', [], { id: 'fig:y', positional: ['png'] });
    assetError(node, '@fig:y', 'forbidden');
    assert.equal(node.tagname, '__asset-error', 'assetError mutates the node in place to __asset-error');
    assert.equal(node.id, null, 'assetError clears the id so it is not counted as a figure');
    console.log('PASS: asset-load — makeAssetError / assetError produce the __asset-error node shape');
  }
}
