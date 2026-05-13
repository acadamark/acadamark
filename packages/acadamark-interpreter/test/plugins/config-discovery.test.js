import assert from 'node:assert/strict';
import { acadamarkConfigDiscovery } from '../../src/plugins/config-discovery.js';

export function run() {
  // --- no config nodes → empty registry ---
  {
    const tree = { type: 'root', children: [] };
    const file = { data: {} };
    acadamarkConfigDiscovery()(tree, file);
    assert.ok(file.data.acadamarkConfig instanceof Map, 'registry should be a Map');
    assert.equal(file.data.acadamarkConfig.size, 0);
    console.log('PASS: config-discovery with no nodes → empty registry');
  }

  // --- config node → settings extracted ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'acadamarkTag',
          tagname: 'config',
          kwargs: { numbering: 'arabic', 'note-position': 'foot' },
          content: null,
        },
      ],
    };
    const file = { data: {} };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.get('numbering'), 'arabic');
    assert.equal(file.data.acadamarkConfig.get('note-position'), 'foot');
    console.log('PASS: config-discovery extracts kwargs from config node');
  }

  // --- later config overrides earlier ---
  {
    const tree = {
      type: 'root',
      children: [
        { type: 'acadamarkTag', tagname: 'config', kwargs: { numbering: 'roman' }, content: null },
        { type: 'acadamarkTag', tagname: 'config', kwargs: { numbering: 'arabic' }, content: null },
      ],
    };
    const file = { data: {} };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.get('numbering'), 'arabic', 'later config should win');
    console.log('PASS: config-discovery later declarations override earlier');
  }

  // --- tree is not mutated ---
  {
    const original = [{ type: 'paragraph', children: [] }];
    const tree = { type: 'root', children: original };
    acadamarkConfigDiscovery()(tree, { data: {} });
    assert.strictEqual(tree.children, original, 'tree.children reference unchanged');
    console.log('PASS: config-discovery does not mutate the tree');
  }

  // --- non-config tags are ignored ---
  {
    const tree = {
      type: 'root',
      children: [
        { type: 'acadamarkTag', tagname: 'meta', kwargs: { type: 'article' }, content: null },
        { type: 'acadamarkTag', tagname: 'section', kwargs: {}, content: null },
      ],
    };
    const file = { data: {} };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.size, 0);
    console.log('PASS: config-discovery ignores non-config tags');
  }
}
