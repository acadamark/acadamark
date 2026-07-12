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
// #427 — ANONYMOUS MESSAGES ARE CATEGORICAL, UN-ALLOWLISTABLE FAILURES. A diagnostic with no page
// attribution — bucketed under `(input)` by diagnostics.js (`f.path || f.history?.[0] || '(input)'`)
// — is ALWAYS a defect: either a producer bug (a message emitted with no vfile path) or a
// build-path bug (like #426, where the Design page re-rendered path-less through the assembly seam).
// It can never be a legitimate documented survivor: a deliberate demonstration lives ON a page and
// names that page. So the `(input)` bucket is checked BEFORE the allowlist and the allowlist can
// NEVER explain it away — no future `ALLOWLIST['(input)'] = …` can whitelist anonymity. Belt and
// suspenders: an allowlist that even NAMES the anonymous key is itself flagged (the guard refuses to
// let anyone try). This is what makes the hole #426 exposed impossible to paper over: pre-#426 this
// gate rejected the 19 `(input)` messages only INCIDENTALLY (`(input)` happened not to be a key);
// now it rejects them by category, with a message that says why.
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

// The marker diagnostics.js buckets a path-less vfile under
// (packages/cli/src/diagnostics.js: `f.path || f.history?.[0] || '(input)'`). An exact match here
// is the categorical anonymous-failure test (#427) — kept in sync with that emission point.
export const ANONYMOUS_PAGE = '(input)';

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

/**
 * The pure verdict function — a built summary + the allowlist → the list of violations.
 * Exported so the red→green proof (#427) can drive it with synthetic summaries: an `(input)`
 * bucket must produce a categorical violation the allowlist cannot suppress; a clean summary
 * (only the allowlisted survivor) must produce none.
 */
export function evaluateSummary(perPage, allowlist) {
  const violations = [];

  // 0) CATEGORICAL (#427): anonymous / path-less messages are ALWAYS a defect — checked before the
  //    allowlist, and un-suppressible by it. First, refuse an allowlist that even names the marker
  //    (someone trying to whitelist anonymity is itself the bug).
  if (allowlist[ANONYMOUS_PAGE]) {
    violations.push(
      `ILLEGAL ALLOWLIST: "${ANONYMOUS_PAGE}" can never be allowlisted — a path-less message has no ` +
      `page attribution and is categorically a defect (a producer bug, or a build-path bug like #426), ` +
      `never a documented survivor. Remove the entry and fix the message at its emission source.`,
    );
  }
  for (const [kind, count] of Object.entries(perPage[ANONYMOUS_PAGE] ?? {})) {
    violations.push(
      `ANONYMOUS (un-allowlistable): ${count} × ${kind} attributed to ${ANONYMOUS_PAGE} — a message with ` +
      `no page is ALWAYS a defect (a producer emitting without a vfile path, or a build-path bug like ` +
      `#426). It cannot be explained away in the allowlist; fix it at the source.`,
    );
  }

  // 1) Every emitted (page, kind, count) — EXCEPT the anonymous bucket handled above — must be
  //    allowlisted with the exact count.
  for (const [page, kinds] of Object.entries(perPage)) {
    if (page === ANONYMOUS_PAGE) continue;
    for (const [kind, count] of Object.entries(kinds)) {
      const entry = allowlist[page]?.[kind];
      if (!entry) {
        violations.push(`UNEXPLAINED: ${page} — ${count} × ${kind} (fix at the emission source, or justify it in scripts/check-docs-clean.mjs)`);
      } else if (entry.count !== count) {
        violations.push(`COUNT DRIFT: ${page} — ${kind}: allowlisted ${entry.count}, built ${count} (reconcile the fix or the allowlist)`);
      }
    }
  }
  // 2) Every allowlist entry must still be present at its exact count (a survivor that vanished is
  //    drift too). The anonymous key can't legitimately appear here (rule 0 rejects it).
  for (const [page, kinds] of Object.entries(allowlist)) {
    if (page === ANONYMOUS_PAGE) continue;
    for (const [kind, entry] of Object.entries(kinds)) {
      const built = perPage[page]?.[kind] ?? 0;
      if (built !== entry.count) {
        violations.push(`STALE ALLOWLIST: ${page} — ${kind}: allowlisted ${entry.count}, built ${built} (remove or update the entry)`);
      }
    }
  }
  return violations;
}

// ── Run ──────────────────────────────────────────────────────────────────────────────────────
// Build the docs site and evaluate its summary. Guarded to the main module so `evaluateSummary`
// (and ANONYMOUS_PAGE) can be imported for the red→green proof without triggering a build.
function runGuard() {
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

  const violations = evaluateSummary(parseSummary(stderr), ALLOWLIST);

  if (violations.length > 0) {
    console.error(`\n[docs-clean] ✗ the docs site does not build clean — ${violations.length} issue(s):\n`);
    for (const v of violations) console.error(`    ${v}`);
    console.error('\n  The flagship must build with zero unexplained warnings (every one is embedded into the');
    console.error('  deployed page as a console recap, #415). Fix the warning at its source, per class — not with');
    console.error('  `quiet`, which hides the terminal but keeps the embed. A genuinely deliberate survivor');
    console.error('  (a documented failure demonstration) gets an individually-justified allowlist entry.');
    console.error('  An ANONYMOUS (input) bucket is un-allowlistable — it is a producer or build-path defect, #427.\n');
    process.exit(1);
  }

  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) runGuard();
