// Guard (#239): CONFIG_OPTIONS_DOC (the human doc layer) stays in lockstep with CONFIG_KWARGS
// (the structured authority). The docs site's Rendering-guide grid generates from the doc layer,
// so a key added to the Map without a doc entry — or a doc entry that drifts in type / status —
// would ship a wrong or incomplete grid. This test fails on any of those.

import assert from 'node:assert/strict';
import { CONFIG_KWARGS } from '../../src/interpreter/lib/apparatus-allowlists.js';
import {
  CONFIG_OPTIONS_DOC, CONFIG_WILDCARD_DOC, CONFIG_FAMILIES,
} from '../../src/interpreter/lib/config-options-doc.js';

export function run() {
  const docByKey = new Map(CONFIG_OPTIONS_DOC.map((e) => [e.key, e]));

  // No duplicate doc keys.
  assert.equal(docByKey.size, CONFIG_OPTIONS_DOC.length, 'duplicate key in CONFIG_OPTIONS_DOC');

  // Every CONFIG_KWARGS key has a doc entry (no undocumented option).
  for (const key of CONFIG_KWARGS.keys()) {
    assert.ok(
      docByKey.has(key),
      `CONFIG_KWARGS key '${key}' has no CONFIG_OPTIONS_DOC entry — document it (it would be missing from the Rendering-guide grid).`,
    );
  }

  // Every doc entry maps to a real key (no orphan), with matching type and reserved/status.
  for (const e of CONFIG_OPTIONS_DOC) {
    const spec = CONFIG_KWARGS.get(e.key);
    assert.ok(spec, `CONFIG_OPTIONS_DOC entry '${e.key}' is not a CONFIG_KWARGS key (orphan doc entry).`);
    assert.equal(e.type, spec.type, `'${e.key}': doc type '${e.type}' != CONFIG_KWARGS type '${spec.type}'.`);
    assert.equal(
      Boolean(e.reserved), spec.status === 'reserved',
      `'${e.key}': doc reserved=${Boolean(e.reserved)} but CONFIG_KWARGS status='${spec.status}' — keep them in sync.`,
    );
    assert.ok(CONFIG_FAMILIES.includes(e.family), `'${e.key}': unknown family '${e.family}'.`);
  }

  // #445: the gear metadata's shape — the settings-gear document tier generates its controls from
  // `gear` fields, so a malformed entry would ship a broken control. Rules: a label always; options
  // only (and always) on valued keys; optionLabels only for offered options; never on a reserved key
  // (nothing reads it); and only on scope 'all' — the tier renders only where the edited buffer
  // carries the <config> it rewrites (an article surface), so a gear on a book-only/website-only key
  // would mint a control with no surface (the unseen-master exclusion, notes/specs/settings.md).
  // When a master-<config> affordance lands, THIS assertion is the deliberate gate to widen.
  let gearCount = 0;
  for (const e of CONFIG_OPTIONS_DOC) {
    if (!e.gear) continue;
    gearCount += 1;
    assert.ok(typeof e.gear.label === 'string' && e.gear.label.length > 0,
      `'${e.key}': a gear entry needs a non-empty label.`);
    assert.ok(!e.reserved, `'${e.key}': a reserved key (no consumer) must not carry a gear control.`);
    assert.equal(e.scope, 'all',
      `'${e.key}': gear controls are limited to scope 'all' — the tier renders only on article edit surfaces (unseen-master exclusion).`);
    if (e.type === 'boolean') {
      assert.ok(!e.gear.options, `'${e.key}': a boolean gear derives Default/On/Off — no options list.`);
    } else {
      assert.ok(Array.isArray(e.gear.options) && e.gear.options.length > 0 &&
        e.gear.options.every((v) => typeof v === 'string' && v.length > 0),
        `'${e.key}': a valued gear needs a non-empty string options list.`);
      for (const v of Object.keys(e.gear.optionLabels ?? {})) {
        assert.ok(e.gear.options.includes(v), `'${e.key}': optionLabels['${v}'] labels an option that is not offered.`);
      }
    }
  }
  assert.ok(gearCount > 0, 'at least one gear control exists (the #445 tier is not empty).');

  // The ref-prefix-* wildcard is documented once, as a pattern (it is not a fixed key).
  assert.ok(
    CONFIG_WILDCARD_DOC && /^ref-prefix-/.test(CONFIG_WILDCARD_DOC.pattern),
    'CONFIG_WILDCARD_DOC must document the ref-prefix-* wildcard pattern.',
  );
  assert.ok(
    !docByKey.has(CONFIG_WILDCARD_DOC.pattern),
    'the ref-prefix-* wildcard must be documented as a pattern, not a fixed CONFIG_OPTIONS_DOC key.',
  );
  // The wildcard's family must be a real family — buildConfigOptionsEmd only emits the wildcard row when
  // its family matches a CONFIG_FAMILIES entry, so an unknown family drops it silently from the grid.
  assert.ok(
    CONFIG_FAMILIES.includes(CONFIG_WILDCARD_DOC.family),
    `the ref-prefix-* wildcard has unknown family '${CONFIG_WILDCARD_DOC.family}' — it would be dropped from the grid.`,
  );

  console.log(`PASS: config-options-doc — ${CONFIG_OPTIONS_DOC.length} options in lockstep with CONFIG_KWARGS + the ref-prefix-* pattern`);
}
