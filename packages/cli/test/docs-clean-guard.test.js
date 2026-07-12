// #427 — the docs-clean guard rejects ANONYMOUS messages categorically (un-allowlistable).
//
// scripts/check-docs-clean.mjs builds the flagship and asserts its diagnostics summary is empty
// except for individually-justified allowlist survivors. #427 hardens it so a path-less `(input)`
// bucket is a distinct, un-suppressible failure class: no `ALLOWLIST['(input)']` can ever explain
// anonymity away, because a message with no page attribution is always a defect (a producer bug, or
// a build-path bug like #426). This exercises the pure verdict function `evaluateSummary` — the same
// one the live guard runs — so the categorical branch is locked even though the post-#426 flagship
// build no longer emits any anonymous message to trip it in CI.
//
// Red→green is the #426 story: pre-#426 the Design page leaked 19 `(input)` messages (the guard is
// RED); post-#426 there are none (GREEN). The synthetic summaries below are those two states.

import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluateSummary, ANONYMOUS_PAGE } from '../../../scripts/check-docs-clean.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
void __dirname; void join; // (kept for parity with sibling tests that read fixtures)

// The one legitimate survivor the real allowlist carries (the #395 bateson failure demo).
const ALLOWLIST = { 'authoring_guide/index.emd': { 'cite-resolution': { count: 1, why: 'bateson demo' } } };

export function run_tests() {
  // ── RED: the exact pre-#426 summary — 19 anonymous `(input)` messages + the 1 survivor ──
  {
    const pre426 = {
      '(input)': {
        'message': 5, 'cite-resolution': 8, 'raw-html-passthrough': 3, 'config:invalid-value': 1,
        'normalize-to-canonical:meta-kwarg-in-config': 1, 'normalize-to-canonical:config-kwarg-in-meta': 1,
      },
      'authoring_guide/index.emd': { 'cite-resolution': 1 },
    };
    const v = evaluateSummary(pre426, ALLOWLIST);
    const anon = v.filter((x) => /ANONYMOUS \(un-allowlistable\)/.test(x));
    assert.equal(anon.length, 6, 'every anonymous (input) kind is flagged categorically (6 kinds = the 19 messages)');
    assert.ok(v.length >= 6, 'the guard is RED on the pre-#426 summary');
    assert.equal(ANONYMOUS_PAGE, '(input)', 'the anonymous marker matches diagnostics.js');
    console.log('PASS: #427 — the docs-clean guard is RED on the pre-#426 anonymous (input) messages (categorical)');
  }

  // ── The allowlist CANNOT explain anonymity away — trying to whitelist `(input)` is itself flagged ──
  {
    const summary = { '(input)': { 'message': 5 } };
    const cheat = { ...ALLOWLIST, '(input)': { 'message': { count: 5, why: 'try to explain it away' } } };
    const v = evaluateSummary(summary, cheat);
    assert.ok(v.some((x) => /ILLEGAL ALLOWLIST/.test(x)), 'an ALLOWLIST["(input)"] entry is itself rejected');
    assert.ok(v.some((x) => /ANONYMOUS \(un-allowlistable\)/.test(x)), 'and the anonymous message still fails despite the allowlist entry');
    console.log('PASS: #427 — anonymity is un-allowlistable: ALLOWLIST["(input)"] is refused and does not suppress the failure');
  }

  // ── GREEN: the post-#426 clean tree — only the allowlisted survivor, zero anonymous ──
  {
    const post426 = { 'authoring_guide/index.emd': { 'cite-resolution': 1 } };
    const v = evaluateSummary(post426, ALLOWLIST);
    assert.equal(v.length, 0, 'the guard is GREEN after #426 (only the allowlisted bateson survivor remains)');
    console.log('PASS: #427 — the docs-clean guard is GREEN post-#426 (zero anonymous; one allowlisted survivor)');
  }

  // ── A named-page unexplained message still fails the ordinary way (the hardening did not weaken rule 1) ──
  {
    const v = evaluateSummary({ 'some_page/index.emd': { 'cite-resolution': 2 } }, ALLOWLIST);
    assert.ok(v.some((x) => /UNEXPLAINED: some_page/.test(x)), 'an unexplained NAMED-page message still fails (rule 1 intact)');
    console.log('PASS: #427 — a named-page unexplained message still fails ordinarily (rule 1 preserved)');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run_tests();
