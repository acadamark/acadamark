import assert from 'node:assert/strict';
import { enscribeConfigDiscovery } from '../../src/plugins/config-discovery.js';

export function run() {
  // --- no config nodes → empty registry ---
  {
    const tree = { type: 'root', children: [] };
    const file = { data: {} };
    enscribeConfigDiscovery()(tree, file);
    assert.ok(file.data.enscribeConfig instanceof Map, 'registry should be a Map');
    assert.equal(file.data.enscribeConfig.size, 0);
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
          type: 'enscribeTag',
          tagname: 'config',
          kwargs: { 'citation-style': 'apa', 'ref-prefix-eqn': 'Eq.' },
          content: null,
        },
      ],
    };
    const file = { data: {} };
    enscribeConfigDiscovery()(tree, file);
    assert.equal(file.data.enscribeConfig.get('citation-style'), 'apa');
    assert.equal(file.data.enscribeConfig.get('ref-prefix-eqn'), 'Eq.');
    console.log('PASS: config-discovery extracts known kwargs from config node');
  }

  // --- later config overrides earlier ---
  {
    const tree = {
      type: 'root',
      children: [
        { type: 'enscribeTag', tagname: 'config', kwargs: { 'citation-style': 'chicago' }, content: null },
        { type: 'enscribeTag', tagname: 'config', kwargs: { 'citation-style': 'apa' }, content: null },
      ],
    };
    const file = { data: {} };
    enscribeConfigDiscovery()(tree, file);
    assert.equal(file.data.enscribeConfig.get('citation-style'), 'apa', 'later config should win');
    console.log('PASS: config-discovery later declarations override earlier');
  }

  // Note (2026-05-25, apparatus-tag reconciliation): kwarg validation and
  // unknown-kwarg / misuse-feedback warnings have moved to the
  // normalize-to-canonical gate (plugins/normalize-to-canonical.js's
  // liftConfigKwargs). The gate runs before this plugin, so by the time
  // config-discovery sees a <config> node, its kwargs are already validated
  // and unknown kwargs are already dropped. The validation tests live with
  // the gate (plugins/normalize-to-canonical.test.js); this file no longer
  // duplicates them.

  // --- PG-9: deeply-nested <config> is read by the recursive walk ---
  {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'enscribeTag',
          tagname: 'section',
          content: [
            {
              type: 'enscribeTag',
              tagname: 'config',
              kwargs: { 'ref-prefix-fig': 'Fig.' },
              content: null,
            },
          ],
        },
      ],
    };
    const file = { data: {} };
    enscribeConfigDiscovery()(tree, file);
    assert.equal(file.data.enscribeConfig.get('ref-prefix-fig'), 'Fig.',
      'nested <config> inside <section>.content is now discovered (PG-9 fix)');
    console.log('PASS: config-discovery recursively finds nested <config> blocks (PG-9)');
  }

  // --- tree is not mutated ---
  {
    const original = [{ type: 'paragraph', children: [] }];
    const tree = { type: 'root', children: original };
    enscribeConfigDiscovery()(tree, { data: {} });
    assert.strictEqual(tree.children, original, 'tree.children reference unchanged');
    console.log('PASS: config-discovery does not mutate the tree');
  }

  // --- non-config tags are ignored ---
  {
    const tree = {
      type: 'root',
      children: [
        { type: 'enscribeTag', tagname: 'meta', kwargs: { type: 'article' }, content: null },
        { type: 'enscribeTag', tagname: 'section', kwargs: {}, content: null },
      ],
    };
    const file = { data: {} };
    enscribeConfigDiscovery()(tree, file);
    assert.equal(file.data.enscribeConfig.size, 0);
    console.log('PASS: config-discovery ignores non-config tags');
  }
}
