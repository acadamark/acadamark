// Drift check for spec-data.generated.json (#5 transcription-seam fix).
//
// The committed spec-data.generated.json is a build artifact derived by parsing
// notes/specs/. This test re-runs the parse and fails if the committed copy is
// stale — so the coverage manifest can never report against spec facts that have
// silently diverged from the specs.
//
// notes/ independence: the check reads notes/ ONLY when present (dev/build). On a
// shipped checkout without notes/, it SKIPS — the test path never hard-depends on
// notes/ (it imports the committed JSON, not the specs live).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generate, specsAvailable } from './gen-spec-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMITTED = join(__dirname, 'spec-data.generated.json');

export function run() {
  if (!specsAvailable()) {
    console.log('SKIP: spec-data drift check — notes/specs/ not present (shipped checkout)');
    return;
  }
  const committed = JSON.parse(readFileSync(COMMITTED, 'utf8'));
  const fresh = generate();
  assert.deepEqual(
    committed,
    fresh,
    'spec-data.generated.json is STALE vs notes/specs/ — regenerate: node test/coverage/gen-spec-data.mjs',
  );
  console.log(`PASS: spec-data drift check — ${fresh.predicates.length} predicates, ${Object.keys(fresh.forms).length} forms, ${Object.keys(fresh.dispositions).length} dispositions match notes/specs`);
}
