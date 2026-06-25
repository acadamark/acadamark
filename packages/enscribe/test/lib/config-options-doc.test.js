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
