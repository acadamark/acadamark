// Freshness guard for the coverage manifest (coverage.json + COVERAGE.md).
//
// The manifest is a tracked build output derived by build-coverage.mjs from the live
// VOCABULARY + sigil map + spec-data.mjs + fixture `<!-- cell -->` markers + the
// committed results.json. Nothing previously failed when it went stale, so it drifted
// silently for hundreds of commits (last regenerated at v0.4.5). This check
// regenerates it and fails if the committed copy differs — mirroring the spec-data
// drift check (spec-data.test.js), so the manifest can never again rot unnoticed.
//
// Mechanism: build-coverage.mjs writes at module top level, so we regenerate it in a
// subprocess with ENSCRIBE_COVERAGE_OUTDIR pointed at a temp dir (the working tree is
// never touched) and diff the temp output against the committed files. Scope note: it
// reads the committed results.json as an input — results.json freshness is the
// predicate harness's concern (it is re-run every suite), not this guard's.

import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATOR = join(__dirname, 'build-coverage.mjs');
const COMMITTED_DIR = join(__dirname, '..', 'fixtures');

export function run() {
  const tmp = mkdtempSync(join(tmpdir(), 'enscribe-coverage-'));
  try {
    execFileSync(process.execPath, [GENERATOR], {
      env: { ...process.env, ENSCRIBE_COVERAGE_OUTDIR: tmp },
      stdio: 'pipe',
    });

    const freshJson = JSON.parse(readFileSync(join(tmp, 'coverage.json'), 'utf8'));
    const committedJson = JSON.parse(readFileSync(join(COMMITTED_DIR, 'coverage.json'), 'utf8'));
    assert.deepEqual(
      committedJson,
      freshJson,
      'coverage.json is STALE vs the live vocabulary / fixtures / spec-data — regenerate: node test/coverage/build-coverage.mjs',
    );

    const freshMd = readFileSync(join(tmp, 'COVERAGE.md'), 'utf8');
    const committedMd = readFileSync(join(COMMITTED_DIR, 'COVERAGE.md'), 'utf8');
    assert.equal(
      committedMd,
      freshMd,
      'COVERAGE.md is STALE — regenerate: node test/coverage/build-coverage.mjs',
    );

    console.log(
      `PASS: coverage manifest fresh — ${committedJson.totals.cells} cells, ${committedJson.totals.fixtures} fixtures, ${committedJson.totals.annexed} annexed`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && process.argv[1].endsWith('coverage-fresh.test.js')) run();
