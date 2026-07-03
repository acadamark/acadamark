// Staleness guard for the committed `src/data.js` generated module.
//
// The Slice 4 Phase 0 ruled on Option A (commit the generated file). The
// risk of that choice is staleness — a developer changes an `elements/*.md`
// source and forgets to re-run `npm run build`. This guard, wired in as
// `pretest`, catches that:
//
//   1. Regenerate the data module into a temporary path.
//   2. Read the committed `src/data.js`.
//   3. Compare. If they differ, exit non-zero with a clear instruction to
//      run `npm run build`.
//
// Cost: one extra read+generate per `npm test` invocation. Worth it for a
// guarantee that the committed data module is in sync with its sources.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const COMMITTED_PATH = join(PACKAGE_ROOT, 'src', 'data.js');
const GENERATOR_PATH = join(__dirname, 'generate-data-module.js');

// Generate into a temp dir, then compare. The generator writes to a fixed
// path relative to itself, so we copy the temp output afterward (or run the
// generator in a forked process with a temp OUTPUT_PATH overridden via env).
// Simpler: snapshot the committed file's bytes, regenerate (which overwrites
// the committed file in place), compare the two byte sequences, restore the
// committed file if it changed.
//
// This is a read-only verification — any in-place change is reverted before
// the script exits. The exit code communicates the result.

const committedBefore = readFileSync(COMMITTED_PATH, 'utf8');

const result = spawnSync(process.execPath, [GENERATOR_PATH], {
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf8',
});
if (result.status !== 0) {
  // Restore (defensively — the generator should not have written if it failed,
  // but be safe).
  writeFileSync(COMMITTED_PATH, committedBefore, 'utf8');
  console.error('[ehtml] generator failed during freshness check:');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

const committedAfter = readFileSync(COMMITTED_PATH, 'utf8');

if (committedAfter !== committedBefore) {
  // Restore the original committed bytes so the working tree is unchanged.
  writeFileSync(COMMITTED_PATH, committedBefore, 'utf8');
  console.error('');
  console.error('[ehtml] STALE: src/data.js does not match what');
  console.error('  the generator would produce from the current elements/*.md');
  console.error('  sources. The committed data module has drifted from its');
  console.error('  source files.');
  console.error('');
  console.error('  To resolve: run `npm run build` in packages/ehtml');
  console.error('  and commit the updated src/data.js alongside your changes.');
  console.error('');
  process.exit(1);
}

// Quiet success — no output, exit 0. Avoids cluttering pretest hooks.
