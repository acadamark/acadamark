// Unit tests for the colon-id helper.
//
// Per DESIGN.md ("Cross-references resolve only to colon-ids") and
// `notes/specs/interpreter.md` §3.9, a colon-id is the `type:name` shape
// with non-empty type prefix.

import assert from 'node:assert/strict';
import { isColonId, parseColonId } from '../src/colon-id.js';

let pass = 0;
let fail = 0;
function check(label, cond) {
  if (cond) {
    pass++;
    console.log(`PASS: ${label}`);
  } else {
    fail++;
    console.log(`FAIL: ${label}`);
  }
}

// --- isColonId ---
check('isColonId("fig:scatter") === true',           isColonId('fig:scatter') === true);
check('isColonId("eqn:model") === true',             isColonId('eqn:model') === true);
check('isColonId("sec:methods") === true',           isColonId('sec:methods') === true);
check('isColonId("fig:body-cross-section") === true', isColonId('fig:body-cross-section') === true);
check('isColonId(":foo") === false (no type prefix)', isColonId(':foo') === false);
check('isColonId("foo") === false (no colon)',       isColonId('foo') === false);
check('isColonId("") === false',                     isColonId('') === false);
check('isColonId(null) === false',                   isColonId(null) === false);
check('isColonId(undefined) === false',              isColonId(undefined) === false);
check('isColonId(42) === false',                     isColonId(42) === false);

// --- parseColonId ---
const parsed = parseColonId('fig:scatter');
check('parseColonId("fig:scatter") returns object',  parsed !== null);
check('  prefix === "fig"',                          parsed?.prefix === 'fig');
check('  tail === "scatter"',                        parsed?.tail === 'scatter');

const multiColon = parseColonId('fig:body-cross-section');
check('parseColonId splits at first colon',          multiColon?.prefix === 'fig' && multiColon?.tail === 'body-cross-section');

check('parseColonId(":foo") returns null',           parseColonId(':foo') === null);
check('parseColonId("foo") returns null',            parseColonId('foo') === null);
check('parseColonId("") returns null',               parseColonId('') === null);

console.log(`\\n${pass}/${pass + fail} colon-id tests passed`);
if (fail > 0) process.exit(1);
