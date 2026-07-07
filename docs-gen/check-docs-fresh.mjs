// Freshness guard for the generated docs-source/ pages (#373) — the repo-level analogue of
// packages/ehtml/build/check-data-fresh.js (which guards the committed src/data.js).
//
// docs-source/{enscribe_vocabulary,ehtml,authoring_guide}/ is EMITTED by docs-gen/generate-docs.mjs
// (realizing notes/specs/documentation.md). Those generated pages are committed, which risks the exact
// drift the generator exists to prevent: a hand-edit — or a spec change committed without regenerating —
// silently diverges the pages from generator output. This guard, wired into the test/CI sequence, catches
// it with the same pattern and failure ergonomics as check-data-fresh:
//
//   1. Snapshot the committed generated tree (bytes).
//   2. Regenerate in place (the generator writes the surface dirs + prunes stale family pages).
//   3. Compare. If ANY generated page differs / is added / is removed, the committed pages have drifted.
//   4. RESTORE the snapshot so the working tree is unchanged — this is a read-only verification.
//   5. Fail non-zero with a clear "run the docs generator" instruction on drift.
//
// The generator reads the committed @enscribejs/ehtml VOCABULARY (data.js), whose own freshness is
// guarded separately by check-data-fresh — so this guard runs the generator directly (no ehtml rebuild).
// Cost: one regenerate per invocation. Worth it for a guarantee the committed docs are in sync.

import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs-source');
const GENERATOR = join(ROOT, 'docs-gen', 'generate-docs.mjs');
// The surface dirs generate-docs.mjs emits (kept in sync with the generator's `surfaces`).
const GENERATED_SURFACES = ['enscribe_vocabulary', 'ehtml', 'authoring_guide'];

/** Recursively snapshot `{ docs-source-relative path: bytes }` for the generated surface dirs.
 *  ONLY `.emd` pages — the generator writes/prunes exactly those; image assets (.png/.jpg) in the
 *  surface dirs are hand-committed, not generated, so they are excluded (reading/rewriting binaries
 *  as text would corrupt them). */
function snapshot() {
  const map = new Map();
  for (const surface of GENERATED_SURFACES) walk(join(DOCS, surface), map);
  return map;
}
function walk(dir, map) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, map);
    else if (entry.isFile() && entry.name.endsWith('.emd')) map.set(relative(DOCS, p), readFileSync(p, 'utf8'));
  }
}

/** Revert the working tree to `before`: rewrite every snapshot file; delete any file the regeneration added. */
function restore(before, after) {
  if (after) {
    for (const rel of after.keys()) {
      if (!before.has(rel)) { try { rmSync(join(DOCS, rel)); } catch { /* best-effort */ } }
    }
  }
  for (const [rel, bytes] of before) writeFileSync(join(DOCS, rel), bytes, 'utf8');
}

const before = snapshot();

const result = spawnSync(process.execPath, [GENERATOR], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
if (result.status !== 0) {
  restore(before);
  console.error('[docs] the docs generator failed during the freshness check:');
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

const after = snapshot();

const drift = [];
for (const [rel, bytes] of before) {
  if (!after.has(rel)) drift.push(`  committed page the generator no longer emits (stale): ${rel}`);
  else if (after.get(rel) !== bytes) drift.push(`  drifted from generator output: ${rel}`);
}
for (const rel of after.keys()) {
  if (!before.has(rel)) drift.push(`  page the generator emits but is not committed: ${rel}`);
}

restore(before, after);

if (drift.length > 0) {
  console.error('');
  console.error('[docs] STALE: the committed docs-source/ pages do not match docs-gen/generate-docs.mjs output.');
  console.error('  The generated documentation has drifted from the generator (a hand-edit, or a spec');
  console.error('  change committed without regenerating):');
  console.error('');
  for (const line of drift.sort()) console.error(line);
  console.error('');
  console.error('  To resolve: run `npm run docs:gen` from the repo root and commit the updated');
  console.error('  docs-source/ pages alongside your changes. (docs-source pages are GENERATED —');
  console.error('  edit the generator or the element specs, not the pages.)');
  console.error('');
  process.exit(1);
}

// Quiet success — no output, exit 0 (mirrors check-data-fresh; keeps the CI/test log clean).
