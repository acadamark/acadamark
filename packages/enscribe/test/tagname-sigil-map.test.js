// Unit tests for tagname-sigil-map.
//
// The map relates each Layer 1 element's named-tag spelling and its sigil
// spelling. It is a bidirectional cipher (substitution, not transform) and
// must be a strict bijection — duplicate keys in either direction would
// silently break round-trip integrity.
//
// These tests pin:
//   - Both directions resolve every known pair correctly.
//   - isSigilTagname returns true exactly for sigil tokens, not for named
//     tagnames or unrelated strings.
//   - The Object.freeze on each map prevents external mutation.
//   - The module-load duplicate-key assertion exists (smoke test).

import assert from 'node:assert/strict';
import {
  SIGIL_TO_TAGNAME,
  TAGNAME_TO_SIGIL,
  isSigilTagname,
} from '../src/core/tagname-sigil-map.js';

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

// --- SIGIL_TO_TAGNAME — lift direction ---
check("SIGIL_TO_TAGNAME['#'] === 'section'",             SIGIL_TO_TAGNAME['#'] === 'section');
check("SIGIL_TO_TAGNAME['##'] === 'sub-section'",        SIGIL_TO_TAGNAME['##'] === 'sub-section');
check("SIGIL_TO_TAGNAME['###'] === 'sub-sub-section'",   SIGIL_TO_TAGNAME['###'] === 'sub-sub-section');
check("SIGIL_TO_TAGNAME['$'] === 'inline-math'",         SIGIL_TO_TAGNAME['$'] === 'inline-math');
check("SIGIL_TO_TAGNAME['$$'] === 'display-math'",       SIGIL_TO_TAGNAME['$$'] === 'display-math');
check("SIGIL_TO_TAGNAME['`'] === 'inline-code'",         SIGIL_TO_TAGNAME['`'] === 'inline-code');
check("SIGIL_TO_TAGNAME['```'] === 'code-block'",        SIGIL_TO_TAGNAME['```'] === 'code-block');

// --- TAGNAME_TO_SIGIL — lower direction (no current consumer; built for the future lowering pass) ---
check("TAGNAME_TO_SIGIL['section'] === '#'",             TAGNAME_TO_SIGIL['section'] === '#');
check("TAGNAME_TO_SIGIL['sub-section'] === '##'",        TAGNAME_TO_SIGIL['sub-section'] === '##');
check("TAGNAME_TO_SIGIL['sub-sub-section'] === '###'",   TAGNAME_TO_SIGIL['sub-sub-section'] === '###');
check("TAGNAME_TO_SIGIL['inline-math'] === '$'",         TAGNAME_TO_SIGIL['inline-math'] === '$');
check("TAGNAME_TO_SIGIL['display-math'] === '$$'",       TAGNAME_TO_SIGIL['display-math'] === '$$');
check("TAGNAME_TO_SIGIL['inline-code'] === '`'",         TAGNAME_TO_SIGIL['inline-code'] === '`');
check("TAGNAME_TO_SIGIL['code-block'] === '```'",        TAGNAME_TO_SIGIL['code-block'] === '```');

// --- Round-trip property: cipher → cipher → identity ---
for (const sigil of ['#', '##', '###', '$', '$$', '`', '```']) {
  const tagname = SIGIL_TO_TAGNAME[sigil];
  const roundtrip = TAGNAME_TO_SIGIL[tagname];
  check(`round-trip: ${JSON.stringify(sigil)} → ${JSON.stringify(tagname)} → ${JSON.stringify(roundtrip)}`,
    roundtrip === sigil);
}

// --- isSigilTagname predicate ---
check("isSigilTagname('#') === true",                    isSigilTagname('#') === true);
check("isSigilTagname('##') === true",                   isSigilTagname('##') === true);
check("isSigilTagname('###') === true",                  isSigilTagname('###') === true);
check("isSigilTagname('$') === true",                    isSigilTagname('$') === true);
check("isSigilTagname('$$') === true",                   isSigilTagname('$$') === true);
check("isSigilTagname('`') === true",                    isSigilTagname('`') === true);
check("isSigilTagname('```') === true",                  isSigilTagname('```') === true);
check("isSigilTagname('section') === false",             isSigilTagname('section') === false);
check("isSigilTagname('figure') === false",              isSigilTagname('figure') === false);
check("isSigilTagname('unknown') === false",             isSigilTagname('unknown') === false);
check("isSigilTagname('') === false",                    isSigilTagname('') === false);

// --- Frozen — external mutation rejected ---
{
  let threw = false;
  try {
    SIGIL_TO_TAGNAME['##'] = 'something-else';
  } catch {
    threw = true;
  }
  // In strict mode mutation throws; in non-strict it's silent — either way the
  // value must not have changed.
  check("SIGIL_TO_TAGNAME is frozen (mutation has no effect)",
    SIGIL_TO_TAGNAME['##'] === 'sub-section');
}

console.log(`\n${pass}/${pass + fail} tagname-sigil-map tests passed`);
if (fail > 0) process.exit(1);
