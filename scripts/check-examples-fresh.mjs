// Freshness guard for the committed live-example pages (#390) — the examples/ analogue of
// docs-gen/check-docs-fresh.mjs (docs-source/) and packages/ehtml/build/check-data-fresh.js
// (src/data.js). Wired into the root `test` script and CI alongside those siblings.
//
// examples/{regression-live,savanna-live}/index.html are EMITTER-GENERATED and deliberately
// committed (each dir's .gitignore header is the source of record: committed = the .emd
// source(s) + the emitter-generated index.html + README; the four copied sibling assets are
// gitignored build droppings). Nothing regenerated them on a schedule, so they silently
// drifted from the live-shell emitter (#390: a pre-#365 editor-adapter script survived two
// emitter changes). This guard closes that hole with the same regenerate-and-compare pattern
// as its siblings — but into a TEMP dir (the CLI's -o flag), so the working tree is never
// touched and no restore step is needed.
//
// Determinism: the emitted index.html was verified byte-stable across runs (#390). If a
// future emitter change makes output nondeterministic (timestamps, hashes), this guard turns
// red on the first CI run — surfacing that as a decision rather than silent drift.
//
// Requires the built browser bundle (packages/enscribe/dist/, produced by the package's
// `prepare` during npm ci); without it the CLI build fails and this guard fails loud with
// that error — never skip-and-stay-green.

import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'packages/cli/bin/enscribe.js');

// The committed live examples: dir + its master document. Kept in sync with each dir's
// .gitignore header (the build-command source of record).
const EXAMPLES = [
  { dir: 'examples/regression-live', master: 'article.emd' },
  { dir: 'examples/savanna-live', master: 'book.emd' },
];

const stale = [];

for (const { dir, master } of EXAMPLES) {
  const committedPath = join(ROOT, dir, 'index.html');
  let committed;
  try {
    committed = readFileSync(committedPath, 'utf8');
  } catch {
    stale.push(`  missing committed page: ${dir}/index.html`);
    continue;
  }

  const out = mkdtempSync(join(tmpdir(), 'enscribe-example-fresh-'));
  try {
    const result = spawnSync(
      process.execPath,
      [CLI, 'build', join(ROOT, dir, master), '--live', '-o', out],
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' },
    );
    if (result.status !== 0) {
      console.error(`[examples] the live build failed for ${dir}/${master} during the freshness check:`);
      console.error(result.stderr || result.stdout);
      process.exit(1);
    }
    const regenerated = readFileSync(join(out, 'index.html'), 'utf8');
    if (regenerated !== committed) stale.push(`  drifted from emitter output: ${dir}/index.html`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

if (stale.length > 0) {
  console.error('');
  console.error('[examples] STALE: committed live-example pages do not match the live-shell emitter output.');
  console.error('  The committed index.html is generated; an emitter change landed without');
  console.error('  regenerating it (#390 is the drift this guard exists to prevent):');
  console.error('');
  for (const line of stale.sort()) console.error(line);
  console.error('');
  console.error('  To resolve: regenerate per the dir’s .gitignore header, e.g.');
  console.error('    node packages/cli/bin/enscribe.js build examples/regression-live/article.emd --live -o examples/regression-live');
  console.error('    node packages/cli/bin/enscribe.js build examples/savanna-live/book.emd --live -o examples/savanna-live');
  console.error('  and commit the updated index.html (NOT the copied sibling assets — those are');
  console.error('  gitignored build droppings; delete them after regenerating).');
  console.error('');
  process.exit(1);
}

// Quiet success — no output, exit 0 (mirrors check-data-fresh / check-docs-fresh).
