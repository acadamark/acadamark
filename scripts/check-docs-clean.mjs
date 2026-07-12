// The docs-clean gate — the flagship builds with zero unexplained diagnostics.
//
// A POST-BUILD guard in the house pattern (the sibling of check-boundary /
// check-examples-fresh / check-routing-invariant / check-docs-fresh): it builds the docs
// website from the committed docs-source and asserts the diagnostics summary is EMPTY except
// for individually-justified allowlist entries, matched EXACTLY on (page, kind, count).
//
// WHY this exists: the #402/#415 diagnostics seam makes the docs' own build honest, and #415
// embeds the message stream into the deployed pages as a console recap — so any warning the
// flagship emits is a warning every visitor can see in devtools. The flagship must hold itself
// to the standard it preaches: zero warnings, or every survivor is a documented, deliberate
// choice. This guard makes "the docs build clean" a PERMANENT property — a future docs or
// generator change that introduces a warning must either fix it at the source or justify it in
// the allowlist below, in the same slice. Suppression (`quiet`) is not an option: quiet hides
// the terminal but keeps the embed, so it violates the ethos regardless — the fix is always at
// the emission source, per class.
//
// The allowlist is the boundary-checker pattern: each entry NAMES the page, the exact message
// kind and count, and WHY it is a legitimate survivor. Zero entries is the ideal; the one entry
// today is a deliberate documentation demonstration (a failure the docs SHOW, per
// documentation.md rule 7). A count that drifts — up OR down — is a failure: an unexplained new
// warning, or a justified survivor that silently changed, both demand a look.
//
// Fails LOUD if the build fails — never skip-and-stay-green.

import { rmSync, mkdtempSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'packages/cli/bin/enscribe.js');
const MASTER = join(ROOT, 'docs-source/index.emd');

// ── The allowlist — every deliberate survivor, individually justified ────────────────────────
// Keyed by the page path relative to docs-source/ (the summary reports the master vfile path).
// { page → { kind → { count, why } } }. Ideal: empty. Each present entry is a documented choice.
const ALLOWLIST = {
  'authoring_guide/index.emd': {
    'cite-resolution': {
      count: 1,
      why:
        'The #395 "When citation resolution fails" passage (quotation-and-sourcing chapter, ' +
        'documentation.md rule 7) DELIBERATELY cites an unknown key (bateson1904) to demonstrate ' +
        'the visible ??cite:…?? failure marker live on the page. The unresolved-key diagnostic is ' +
        'intrinsic to that demonstration — the docs teach the failure by showing it. This is the ' +
        'one class of deliberate survivor; it renders exactly one cite-resolution message.',
    },
  },
};

// Compute the docs-source-relative page key from the absolute path the summary prints.
const pageKey = (absPath) => {
  const marker = `${'docs-source'}/`;
  const i = absPath.indexOf(marker);
  return i >= 0 ? absPath.slice(i + marker.length) : absPath;
};

/**
 * Parse the CLI's "diagnostics summary" block from build stderr into { pageKey → { kind → count } }.
 * Summary shape (packages/cli/src/diagnostics.js summary()):
 *   enscribe: diagnostics summary — N messages in M files
 *     <abs-path>: <count>
 *       <n> × <kind>
 * A build with no messages prints no summary at all (the seam is silent when clean) → {}.
 */
function parseSummary(stderr) {
  const lines = String(stderr).split('\n');
  const start = lines.findIndex((l) => /^enscribe: diagnostics summary —/.test(l));
  if (start < 0) return {}; // no messages → clean
  const perPage = {};
  let cur = null;
  for (let i = start + 1; i < lines.length; i++) {
    const fileM = /^ {2}(\S.*): (\d+)$/.exec(lines[i]);           // "  <path>: <count>"
    if (fileM) { cur = pageKey(fileM[1]); perPage[cur] = {}; continue; }
    const kindM = /^ {4}(\d+) × (.+)$/.exec(lines[i]);            // "    <n> × <kind>"
    if (kindM && cur) { perPage[cur][kindM[2]] = Number(kindM[1]); continue; }
    if (lines[i] !== '' && !/^ /.test(lines[i])) break;          // summary block ended
  }
  return perPage;
}

// ── Run ──────────────────────────────────────────────────────────────────────────────────────
if (!existsSync(MASTER)) {
  console.error(`[docs-clean] MISSING docs master: ${MASTER}`);
  process.exit(1);
}

const out = mkdtempSync(join(tmpdir(), 'enscribe-docs-clean-'));
let stderr = '';
try {
  const r = spawnSync(process.execPath, [CLI, 'build', MASTER, '-o', out], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.error('[docs-clean] the docs site build FAILED:');
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  stderr = r.stderr || '';
} finally {
  rmSync(out, { recursive: true, force: true });
}

const perPage = parseSummary(stderr);
const violations = [];

// 1) Every emitted (page, kind, count) must be allowlisted with the exact count.
for (const [page, kinds] of Object.entries(perPage)) {
  for (const [kind, count] of Object.entries(kinds)) {
    const entry = ALLOWLIST[page]?.[kind];
    if (!entry) {
      violations.push(`UNEXPLAINED: ${page} — ${count} × ${kind} (fix at the emission source, or justify it in scripts/check-docs-clean.mjs)`);
    } else if (entry.count !== count) {
      violations.push(`COUNT DRIFT: ${page} — ${kind}: allowlisted ${entry.count}, built ${count} (reconcile the fix or the allowlist)`);
    }
  }
}
// 2) Every allowlist entry must still be present at its exact count (a survivor that vanished is drift too).
for (const [page, kinds] of Object.entries(ALLOWLIST)) {
  for (const [kind, entry] of Object.entries(kinds)) {
    const built = perPage[page]?.[kind] ?? 0;
    if (built !== entry.count) {
      violations.push(`STALE ALLOWLIST: ${page} — ${kind}: allowlisted ${entry.count}, built ${built} (remove or update the entry)`);
    }
  }
}

if (violations.length > 0) {
  console.error(`\n[docs-clean] ✗ the docs site does not build clean — ${violations.length} issue(s):\n`);
  for (const v of violations) console.error(`    ${v}`);
  console.error('\n  The flagship must build with zero unexplained warnings (every one is embedded into the');
  console.error('  deployed page as a console recap, #415). Fix the warning at its source, per class — not with');
  console.error('  `quiet`, which hides the terminal but keeps the embed. A genuinely deliberate survivor');
  console.error('  (a documented failure demonstration) gets an individually-justified allowlist entry.\n');
  process.exit(1);
}

process.exit(0);
