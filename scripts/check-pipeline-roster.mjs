// The pipeline-roster guard (wave-1 walk merges) — the guard pipeline-contract.md
// proposed for itself ("a future guard could assert the roster against index.js's
// registration order") and the pass-map audit found was never built, which is exactly
// how the roster drifted three passes behind the code.
//
// Asserts that the contract's plugin-roster table and enscribeInterpreter's actual
// `this.use(...)` registration sequence are the SAME NAMES IN THE SAME ORDER. A new
// pass therefore fails CI until the spec names it — pairing with the engine-side
// walk-budget test (packages/enscribe/test/walk-budget.test.js, which counts
// shared-walker traversals), so adding a pipeline pass is always a deliberate act
// recorded in the contract, with its walk cost justified under the co-travel rule
// (pipeline-contract.md §"The walk budget").
//
// Lives at the REPO ROOT, not in packages/enscribe/test: the check reads both the
// engine source AND the notes/ prose surface, and the one-way language/engine boundary
// (check-boundary.mjs Rule 2b) forbids engine code from path-reading the prose surface.
// Root scripts/ is the established seam for cross-surface guards (docs:check,
// check:theme-tokens, examples:check).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(ROOT, 'packages', 'enscribe', 'src', 'interpreter', 'index.js');
const CONTRACT = join(ROOT, 'notes', 'specs', 'pipeline-contract.md');

/** The registration sequence: every `this.use(<name>)` / `this.use(function <name>()`
 *  in enscribeInterpreter, in source order. `this.use(` is unique to the interpreter's
 *  attacher (the lift path and inner processors chain bare `.use(`). */
function registeredNames(source) {
  const names = [];
  const re = /this\.use\(\s*(?:function\s+([A-Za-z0-9_]+)|([A-Za-z0-9_]+))/g;
  for (let m; (m = re.exec(source)); ) names.push(m[1] ?? m[2]);
  return names;
}

/** The contract roster: the plugin-name column of every table row in the
 *  "## Plugin roster" section whose Step cell is not '—' (the '—' rows describe the
 *  compiler, which is not a `.use()` registration). The name is the row's first
 *  identifier token, so annotations like "(anon fn wrapping …)" don't participate. */
function rosterNames(md) {
  const start = md.indexOf('## Plugin roster');
  const rest = md.slice(start + 1);
  const end = rest.indexOf('\n## ');
  const section = rest.slice(0, end === -1 ? undefined : end);
  const names = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*`?([A-Za-z0-9_]+)[^|]*\|/);
    if (!m) continue;
    const step = m[1];
    if (step === 'Step' || /^-+$/.test(step.replace(/\s/g, '')) || step === '—') continue;
    names.push(m[2]);
  }
  return names;
}

// Mirror gen-spec-data's boundary constraint (check-boundary.mjs RULE2B_ALLOW): this is a
// check-time-only prose read that SKIPS when the notes/ surface is absent (an engine
// consumed outside the monorepo has no contract to compare — and no roster drift to guard).
let contractMd;
try {
  contractMd = readFileSync(CONTRACT, 'utf8');
} catch {
  console.log('[pipeline-roster] SKIP — notes/specs/pipeline-contract.md not present (engine consumed standalone)');
  process.exit(0);
}

const actual = registeredNames(readFileSync(INDEX, 'utf8'));
const roster = rosterNames(contractMd);

const fail = (msg) => { console.error(`[pipeline-roster] ${msg}`); process.exit(1); };

if (actual.length === 0) fail('found no this.use(...) registrations — the extraction regex broke');
if (roster.length === 0) fail('found no roster rows in pipeline-contract.md — the table parse broke');

if (actual.length !== roster.length || actual.some((n, i) => n !== roster[i])) {
  fail(
    'enscribeInterpreter\'s registration order and pipeline-contract.md\'s plugin roster disagree.\n' +
    '  A new/removed/reordered pass must update the contract roster in the same commit (and justify\n' +
    '  its walk cost under the co-travel rule — pipeline-contract.md §"The walk budget").\n' +
    `  Code:   [${actual.join(', ')}]\n` +
    `  Roster: [${roster.join(', ')}]`,
  );
}

console.log(`[pipeline-roster] OK — ${actual.length} registrations match the contract roster, in order`);
