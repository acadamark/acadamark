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

  // --- config node → known settings extracted ---
  // Uses kwargs that are actually consumed by downstream plugins
  // (citation-style, number-equations, ref-prefix-*) so the
  // AUD-13 validation pass (post-2026-05-25) accepts them.
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'acadamarkTag',
          tagname: 'config',
          kwargs: { 'citation-style': 'apa', 'ref-prefix-eqn': 'Eq.' },
          content: null,
        },
      ],
    };
    const file = { data: {} };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.get('citation-style'), 'apa');
    assert.equal(file.data.acadamarkConfig.get('ref-prefix-eqn'), 'Eq.');
    console.log('PASS: config-discovery extracts known kwargs from config node');
  }

  // --- later config overrides earlier ---
  {
    const tree = {
      type: 'root',
      children: [
        { type: 'acadamarkTag', tagname: 'config', kwargs: { 'citation-style': 'chicago' }, content: null },
        { type: 'acadamarkTag', tagname: 'config', kwargs: { 'citation-style': 'apa' }, content: null },
      ],
    };
    const file = { data: {} };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.get('citation-style'), 'apa', 'later config should win');
    console.log('PASS: config-discovery later declarations override earlier');
  }

  // --- unknown kwarg is dropped from the config map and a warning is emitted ---
  // (AUD-13 fix, 2026-05-25). Captures file.messages to assert the warning.
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'acadamarkTag',
          tagname: 'config',
          kwargs: { 'citation-style': 'apa', 'foo-bar': 'baz' },
          content: null,
        },
      ],
    };
    const messages = [];
    const file = { data: {}, message(msg) { messages.push(msg); } };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.get('citation-style'), 'apa', 'known kwarg accepted');
    assert.equal(file.data.acadamarkConfig.has('foo-bar'), false, 'unknown kwarg dropped from map');
    assert.equal(messages.length, 1, 'one warning emitted for unknown kwarg');
    assert.ok(/foo-bar/.test(String(messages[0])), 'warning mentions the offending kwarg name');
    console.log('PASS: config-discovery warns on unknown kwarg and drops it (AUD-13)');
  }

  // --- metadata-shaped kwarg gets the specific "did you mean <meta>?" hint ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'acadamarkTag',
          tagname: 'config',
          kwargs: { title: 'Wrong place' },
          content: null,
        },
      ],
    };
    const messages = [];
    const file = { data: {}, message(msg) { messages.push(msg); } };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.has('title'), false, 'metadata kwarg dropped');
    assert.equal(messages.length, 1);
    assert.ok(/<meta>/.test(String(messages[0])), 'warning suggests <meta>');
    console.log('PASS: config-discovery hints <meta> for metadata-shaped kwargs (AUD-13 + DD-3)');
  }

  // --- PG-9: deeply-nested <config> is now read by the recursive walk ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'acadamarkTag',
          tagname: 'section',
          content: [
            {
              type: 'acadamarkTag',
              tagname: 'config',
              kwargs: { 'ref-prefix-fig': 'Fig.' },
              content: null,
            },
          ],
        },
      ],
    };
    const file = { data: {} };
    acadamarkConfigDiscovery()(tree, file);
    assert.equal(file.data.acadamarkConfig.get('ref-prefix-fig'), 'Fig.',
      'nested <config> inside <section>.content is now discovered (PG-9 fix)');
    console.log('PASS: config-discovery recursively finds nested <config> blocks (PG-9)');
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
