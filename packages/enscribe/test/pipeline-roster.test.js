// The pipeline-roster guard (wave-1 walk merges) — the guard pipeline-contract.md
// proposed for itself ("a future guard could assert the roster against index.js's
// registration order") and the pass-map audit found was never built, which is exactly
// how the roster drifted three passes behind the code.
//
// Asserts that the contract's plugin-roster table and enscribeInterpreter's actual
// `this.use(...)` registration sequence are the SAME NAMES IN THE SAME ORDER. A new
// pass therefore fails CI until the spec names it — pairing with the walk-budget test
// (which counts shared-walker traversals), so adding a pipeline pass is always a
// deliberate act recorded in the contract, with its walk cost justified under the
// co-travel rule (pipeline-contract.md §Walk budget).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX = join(HERE, '..', 'src', 'interpreter', 'index.js');
const CONTRACT = join(HERE, '..', '..', '..', 'notes', 'specs', 'pipeline-contract.md');

/** The registration sequence: every `this.use(<name>)` / `this.use(function <name>()`
 *  in enscribeInterpreter, in source order. `this.use(` is unique to the interpreter's
 *  attacher (the lift path and inner processors chain bare `.use(`). */
function registeredNames(source) {
  const names = [];
  const re = /this\.use\(\s*(?:function\s+([A-Za-z0-9_]+)|([A-Za-z0-9_]+))/g;
  for (let m; (m = re.exec(source)); ) names.push(m[1] ?? m[2]);
  return names;
}

/** The contract roster: the plugin-name column of every table row whose Step cell is not
 *  '—' (the '—' rows describe the compiler, which is not a `.use()` registration).
 *  The name is the row's first identifier token, so annotations like
 *  "(anon fn wrapping …)" don't participate. */
function rosterNames(md) {
  // Scope to the "## Plugin roster" section only — the contract holds other tables
  // (the file.data namespace, the internal node types) that are not registrations.
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

export function run() {
  const actual = registeredNames(readFileSync(INDEX, 'utf8'));
  const roster = rosterNames(readFileSync(CONTRACT, 'utf8'));

  assert.ok(actual.length > 0, 'found no this.use(...) registrations — the extraction regex broke');
  assert.ok(roster.length > 0, 'found no roster rows in pipeline-contract.md — the table parse broke');

  assert.deepEqual(actual, roster,
    'enscribeInterpreter\'s registration order and pipeline-contract.md\'s plugin roster disagree. ' +
    'A new/removed/reordered pass must update the contract roster in the same commit (and justify ' +
    'its walk cost under the co-travel rule — see the walk-budget test). ' +
    `Code: [${actual.join(', ')}] — Roster: [${roster.join(', ')}]`);

  console.log(`PASS: pipeline-roster — ${actual.length} registrations match the contract roster, in order`);
}
