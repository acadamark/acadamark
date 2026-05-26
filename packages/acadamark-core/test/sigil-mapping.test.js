// Unit tests for sigil-mapping.
//
// PARSER_TO_VOCAB maps parser-emitted sigil tagnames to vocabulary keys.
// The hash-sigil entries (`#`/`##`/`###` → `section`/`sub-section`/
// `sub-sub-section`) were added in the alpha Phase 1 slice fixing the
// dispatch bug — before that, hash-sigil tags produced unknown-element
// fallback spans because resolveVocabKey returned the literal sigil
// (which has no vocabulary entry). These tests pin the mapping so a
// future change to PARSER_TO_VOCAB cannot silently re-break it.

import assert from 'node:assert/strict';
import { PARSER_TO_VOCAB, resolveVocabKey } from '../src/sigil-mapping.js';

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

// --- Hash-sigil entries (alpha Phase 1 fix) ---
check("PARSER_TO_VOCAB['#'] === 'section'",             PARSER_TO_VOCAB['#'] === 'section');
check("PARSER_TO_VOCAB['##'] === 'sub-section'",        PARSER_TO_VOCAB['##'] === 'sub-section');
check("PARSER_TO_VOCAB['###'] === 'sub-sub-section'",   PARSER_TO_VOCAB['###'] === 'sub-sub-section');
check("resolveVocabKey('#') === 'section'",             resolveVocabKey('#') === 'section');
check("resolveVocabKey('##') === 'sub-section'",        resolveVocabKey('##') === 'sub-section');
check("resolveVocabKey('###') === 'sub-sub-section'",   resolveVocabKey('###') === 'sub-sub-section');

// --- Pre-existing entries (regression guard) ---
check("resolveVocabKey('$') === 'inline-math'",         resolveVocabKey('$') === 'inline-math');
check("resolveVocabKey('$$') === 'display-math'",       resolveVocabKey('$$') === 'display-math');
check("resolveVocabKey('`') === 'inline-code'",         resolveVocabKey('`') === 'inline-code');
check("resolveVocabKey('```') === 'code-block'",        resolveVocabKey('```') === 'code-block');

// --- Pass-through for named tags (unmapped names return unchanged) ---
check("resolveVocabKey('section') === 'section'",       resolveVocabKey('section') === 'section');
check("resolveVocabKey('figure') === 'figure'",         resolveVocabKey('figure') === 'figure');
check("resolveVocabKey('unknown-tag') === 'unknown-tag'", resolveVocabKey('unknown-tag') === 'unknown-tag');

console.log(`\n${pass}/${pass + fail} sigil-mapping tests passed`);
if (fail > 0) process.exit(1);
