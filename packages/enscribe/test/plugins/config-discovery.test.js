import assert from 'node:assert/strict';
import { CONFIG_KWARGS } from '../../src/interpreter/lib/apparatus-allowlists.js';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enscribeConfigDiscovery } from '../../src/interpreter/plugins/config-discovery.js';

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

  // ── #401: value validation — a recognized key with an unusable value is a WARNED default ──
  {
    const mk = (kwargs) => ({
      type: 'root',
      children: [{ type: 'enscribeTag', tagname: 'config', kwargs, content: null }],
    });
    const runOn = (kwargs) => {
      const messages = [];
      const file = { data: {}, message: (reason, _node, origin) => messages.push({ reason, origin }) };
      enscribeConfigDiscovery()(mk(kwargs), file);
      return { messages, config: file.data.enscribeConfig };
    };

    // The misty middle: before #401 these silently became defaults; now each warns
    // (key, offending value, accepted set) and the value still lands in the map (the
    // reader's default/coercion applies downstream, unchanged).
    const bad = runOn({ 'strict-mode': 'tue', 'toc-depth': 'three', 'number-sections': 'yes' });
    assert.equal(bad.messages.length, 3, 'one warning per bad value');
    assert.ok(bad.messages.every((m) => m.origin === 'config:invalid-value'), 'seam kind is config:invalid-value');
    const text = bad.messages.map((m) => m.reason).join('\n');
    assert.ok(text.includes('strict-mode="tue"') && text.includes('off, sigil, canonical'), 'names key, value, accepted enum');
    assert.ok(text.includes('toc-depth="three"') && text.includes('integer'), 'int spec named');
    assert.ok(text.includes('number-sections="yes"') && text.includes('true or false'), 'boolean spec named');
    assert.equal(bad.config.get('strict-mode'), 'tue', 'the raw value still lands in the map (warned-default, not rejected)');

    // Good values, free-valued keys, either-form specs, and wildcards warn nothing.
    const good = runOn({
      'strict-mode': 'sigil', 'toc-depth': '2', 'number-sections': 'true',
      'citation-style': 'apa', 'toc-title': 'Table of Contents',
      'toc-expand': 'all', 'note-position': 'margin', 'ref-prefix-eqn': 'Eq.',
    });
    assert.equal(good.messages.length, 0, 'acceptable values warn nothing');
    console.log('PASS: config-discovery (#401) — bad values warn with key/value/accepted; good values silent');
  }

  // ── #401 guard: the theme spec cannot drift from the shipped themes ──────────
  // (A test-level equality guard instead of an import — apparatus-allowlists must not
  // import interpreter/index.js, and index.js's KNOWN_THEMES derives from this same dir.)
  {
    const themesDir = join(dirname(fileURLToPath(import.meta.url)), '../../src/interpreter/assets/themes');
    const shipped = readdirSync(themesDir).filter((f) => f.endsWith('.css')).map((f) => f.replace(/\.css$/, '')).sort();
    const spec = [...(CONFIG_KWARGS.get('theme')?.accepts?.enum ?? [])].sort();
    assert.deepEqual(spec, shipped, 'the theme value spec equals the shipped themes/ directory');
    console.log('PASS: config-discovery (#401) — theme spec ⇄ shipped themes equality guard');
  }
}
