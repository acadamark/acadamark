// The walk-budget guard (wave-1 walk merges) — the co-travel rule, enforced.
//
// The pass-map audit found the pipeline's traversal count grew by accretion: each new
// check tended to arrive as its OWN full walk instead of joining an existing one, and no
// check made that growth visible. This test makes it visible: the four shared tree
// walkers carry an inert `globalThis.__enscribeWalkTally?.(name)` hook at their
// once-per-walk entries, and this test pins the EXACT number of walker-entry walks a
// representative document costs, per walker, through one full processSync.
//
// If this test fails RED after your change:
//   - You added a walk (a count went UP). The co-travel rule (pipeline-contract.md
//     §Walk budget) asks first: can the check ride an existing walk — a visitor added to
//     a discover Map, a branch in an existing visitor, a hook in an existing pass?
//     That is how table-cell-parse hosts the #108 stamp, numbering hosts note
//     registration, and the gate's rule walk hosts bare-boolean promotion. If a new walk
//     is genuinely needed (a new phase boundary, incompatible descent semantics), update
//     the budget BELOW and the roster/spec IN THE SAME COMMIT, with the justification in
//     the commit message — the point is that a new traversal is a deliberate, reviewed
//     act, never a silent one.
//   - A count went DOWN: a merge landed — update the budget to the new number so the
//     next accretion is caught from the new floor.
//
// Honest limits, stated plainly: the budget sees only walks that enter the four shared
// walkers (discover / walkReplace / walkNormalize / walkWithScope). A hand-rolled
// recursion never trips it — those are covered by the roster guard (scripts/
// check-pipeline-roster.mjs at the repo root — cross-surface guards may not live in the
// engine per the check-boundary one-way rule; a new PLUGIN must be named in the contract
// roster) and by review under the co-travel rule. No shared hast
// walker exists yet, so compile-phase hast walks are likewise roster-and-review terrain.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

// A fixed, feature-bearing document — NOT a fixtures/ file, so the budget moves only
// when the PIPELINE moves, never because a shared fixture was edited. Features chosen to
// exercise each shared walker: sections (nesting/numbering), a list (the merged
// heading+list walk), a GFM table (the table-stamp walk), display math + a <ref>
// (walkReplace via ref-resolution), a <note> (registration + note-placement's
// walkReplace), a <cite>-free body (cite-resolution still walks — registered pass).
const DOC = [
  '<meta type=article>',
  '<title | Walk Budget Probe>',
  '</meta>',
  '',
  '<section | One>',
  '',
  'A note.<note | The note body.>',
  '',
  '<$$ #eq:probe | e = mc^2 $$>',
  '',
  'See <ref @eq:probe>.',
  '',
  '- alpha',
  '- beta',
  '',
  '| h1 | h2 |',   // one markup-bearing body cell below, so the gate's cell sub-walk is pinned too
  '| -- | -- |',
  '| *a* | b |',
].join('\n');

// The budget. Counts are walker-ENTRY counts (once per walk, not per visited node) for
// one processSync of DOC. Attribution, so a diff names its suspect:
//   discover (3):        the merged notes+numbering registration walk; the merged
//                        table-stamp walk (#21/#105 + #108); the gate's host-format
//                        validation walk.
//   walkNormalize (2):   the gate's merged promote+rule walk; ONE cell sub-walk — the
//                        GFM table lift re-normalizes its markup-bearing body cells.
//   walkReplace (3):     ref-resolution; cite-resolution (walks even with zero cites —
//                        a known candidate if it ever gains a gate); note-placement's
//                        marker splice.
//   walkWithScope (0):   scoped numbering — DOC is an unscoped article.
const BUDGET = { discover: 3, walkNormalize: 2, walkReplace: 3, walkWithScope: 0 };

export function run() {
  const tally = {};
  globalThis.__enscribeWalkTally = (name) => { tally[name] = (tally[name] ?? 0) + 1; };
  try {
    buildEnscribePipeline({ embedResources: false }).processSync(DOC);
  } finally {
    delete globalThis.__enscribeWalkTally;
  }
  for (const key of Object.keys(BUDGET)) tally[key] = tally[key] ?? 0;

  assert.deepEqual(tally, BUDGET,
    'shared-walker walk count changed — a traversal was added (join an existing walk, or update ' +
    'the budget + roster deliberately) or removed (a merge landed — lower the budget). ' +
    `Expected ${JSON.stringify(BUDGET)}, got ${JSON.stringify(tally)}. See the header of this file.`);

  console.log(`PASS: walk-budget — ${Object.entries(BUDGET).map(([k, v]) => `${k}:${v}`).join(' ')} walker entries for the probe document (the co-travel floor)`);
}
