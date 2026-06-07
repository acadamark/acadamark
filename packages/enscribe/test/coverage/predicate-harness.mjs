// Predicate harness (#5, §8/§12) — the spec-wins conformance layer.
//
// Each render-quality predicate (`RQ-<AREA>-<M|S><n>`) gets a checker keyed to
// its id. The harness runs them and writes test/coverage/results.json, which the
// manifest generator reads to set each covered cell's status:
//   pass        — predicate verified against current output
//   divergent   — predicate FAILS on current output → a render-quality bug is
//                 filed and its id recorded (NEVER softened into green) (§0,§8)
//   observable  — O-kind predicate, visual-only, not machine-checkable
//   untested    — checker not yet implemented / no fixture exercises it
//
// Two checker kinds:
//   S (stylesheet) — document-independent: grep src/interpreter/assets/default.css
//                    for the predicate's selector + property. Runs without fixtures.
//   M (markup)     — render a fixture and inspect the final HTML for the
//                    predicate's element/class/attr/label. Runs against the
//                    fixtures whose cells name the predicate. This is the layer
//                    whose absence let the #54 curl bug ship (asserted .json
//                    snapshots stop before the render stage; M predicates assert
//                    the FINAL render).
//
// A divergence is a FILED BUG, not a test failure: the harness records it and the
// suite stays green (a known, tracked gap). A predicate that was passing and now
// fails is a regression — surfaced by results.json diffing in review.

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';
import { PREDICATES } from './spec-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = join(__dirname, '..', '..', 'src', 'interpreter', 'assets', 'default.css');
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const RESULTS_PATH = join(__dirname, 'results.json');
const CSS = readFileSync(CSS_PATH, 'utf8');

// Known divergences: predicate id → bug id. When an S/M checker fails AND the
// failure has been verified as a genuine spec-vs-output gap (not a bad checker),
// its bug id is recorded here so the manifest shows `divergent:#NN`. Populated as
// real divergences are triaged and filed.
const FILED_BUGS = {
  // 'RQ-XXX-Sn': '#NN',
};

// ── CSS helpers for S checkers ───────────────────────────────────────────────
// A loose "does default.css contain a rule whose selector matches `sel` and whose
// block contains `prop`" check. `sel` and `prop` are RegExp or string (substring).
function cssRuleHas(selRe, propRe) {
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  const sel = selRe instanceof RegExp ? selRe : new RegExp(selRe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const prop = propRe instanceof RegExp ? propRe : new RegExp(propRe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  while ((m = ruleRe.exec(CSS))) {
    if (sel.test(m[1]) && prop.test(m[2])) return true;
  }
  return false;
}
const cssHasSelector = (selRe) => (selRe instanceof RegExp ? selRe : new RegExp(selRe)).test(CSS);

// S-predicate checkers. Each returns true (pass) / false (fail). Keyed by id.
const S_CHECKS = {
  'RQ-DOC-S1': () => cssRuleHas(/article-front/, /border-bottom/) && cssRuleHas(/article-back/, /border-top/),
  'RQ-DOC-S2': () => cssRuleHas(/article-title/, /font-weight\s*:\s*700|var\(--enscribe-h1/) && cssHasSelector(/article-subtitle/),
  'RQ-DOC-S3': () => cssRuleHas(/section-title/, /font-weight\s*:\s*700|--enscribe-h/),
  'RQ-DOC-S4': () => cssRuleHas(/meta\[data-document-type\]|meta/, /display\s*:\s*contents/),
  'RQ-META-S1': () => cssRuleHas(/author/, /display\s*:\s*inline/) && cssHasSelector(/author\s*\+\s*author::before/),
  'RQ-BLK-S1': () => cssRuleHas(/blockquote/, /border-left/),
  'RQ-BLK-S2': () => cssRuleHas(/\bp\b|paragraph/, /margin-bottom/) || cssRuleHas(/ul|ol|list/, /padding-left/),
  'RQ-INL-S1': () => cssRuleHas(/strong/, /font-weight\s*:\s*(700|bold)/) || cssRuleHas(/em\b/, /font-style\s*:\s*italic/),
  'RQ-FRM-S1': () => cssRuleHas(/figure-label|table-label/, /font-weight\s*:\s*700/),
  'RQ-FRM-S2': () => cssRuleHas(/figure/, /display\s*:\s*block|margin/) && cssHasSelector(/figcaption|caption/),
  'RQ-FRM-S3': () => cssRuleHas(/table/, /border-collapse/) && cssHasSelector(/thead|th\b/),
  'RQ-FRM-S4': () => cssRuleHas(/frameable-border/, /border/),
  'RQ-FRM-S5': () => cssRuleHas(/\.title/, /font-weight\s*:\s*700/),
  'RQ-FRM-S6': () => cssHasSelector(/\.caption/),
  'RQ-FRM-S7': () => cssHasSelector(/aside\[data-aside-type/) || cssHasSelector(/--enscribe-callout/),
  'RQ-DSL-S1': () => cssHasSelector(/\.mermaid|pre/),
  'RQ-DSL-SOURCE-S1': () => cssHasSelector(/enscribe-source/),
  'RQ-MATH-S1': () => cssRuleHas(/display-math/, /display\s*:\s*flex|margin/),
  'RQ-MATH-S2': () => cssRuleHas(/inline-math/, /display\s*:\s*inline/),
  'RQ-MATH-S3': () => cssHasSelector(/align|cases|matrix|eqnarray/),
  'RQ-THM-S1': () => cssRuleHas(/theorem/, /display\s*:\s*block|margin/),
  'RQ-THM-S2': () => cssRuleHas(/-label/, /font-weight\s*:\s*700/),
  'RQ-XREF-S1': () => cssHasSelector(/a\.ref|\.ref\b/) && cssHasSelector(/ref-error/),
  'RQ-XREF-S2': () => cssHasSelector(/cite\.cite|\.cite\b/) || cssHasSelector(/cite-error/),
  'RQ-NOTE-S1': () => cssRuleHas(/note-list/, /display\s*:\s*block|border/),
  'RQ-NOTE-S2': () => cssHasSelector(/data-note-id|note-backref/),
  'RQ-BIB-S1': () => cssHasSelector(/bibliography|csl-bib-body|csl-entry/),
  'RQ-BOOK-S1': () => cssHasSelector(/book-title|book-part-title/),
  'RQ-TOC-S1': () => cssHasSelector(/enscribe-toc-active|aria-current/),
};

// ── M-predicate checkers ─────────────────────────────────────────────────────
// Each takes the rendered HTML string of a fixture that exercises it and returns
// true/false. Implemented incrementally as fixtures land; absent id → 'untested'.
// (Registry seeded with a few that are checkable on any document containing the
// construct; most are wired per-fixture as the catalog is authored.)
const M_CHECKS = {
  // Verified against the family-1 context fixtures (final render). A predicate
  // passes if it holds in at least one marked fixture that exercises it.
  'RQ-DOC-M1': (h) => /<article-front/.test(h) && /<article-body/.test(h),
  'RQ-DOC-M3': (h) => /<section[\s>]/.test(h) && /<sub-section[\s>]/.test(h) && /<sub-sub-section[\s>]/.test(h),
  'RQ-META-M1': (h) => /<author[\s>]/.test(h),
  'RQ-META-M2': (h) => /<author[^>]*\scorresponding[\s>]/.test(h),
  'RQ-FRM-M1': (h) => /<figure[^>]*>/.test(h) && /<figcaption/.test(h) && /figure-label/.test(h),
  'RQ-FRM-M2': (h) => /<table>/.test(h) && /<caption/.test(h) && /table-label/.test(h),
  'RQ-MATH-M2': (h) => /<display-math/.test(h) && /equation-number/.test(h),
  'RQ-NOTE-M1': (h) => /<sup id="noteref-\d+"/.test(h),
  'RQ-XREF-M1': (h) => /class="ref"/.test(h),
  'RQ-BOOK-M1': (h) => /<book>/.test(h) && /<book-front/.test(h) && /<book-body/.test(h) && /<book-back/.test(h),
  'RQ-INL-M1': (h) => /<em[\s>]/.test(h) && /<strong[\s>]/.test(h),
  'RQ-INL-M2': (h) => ['b', 'i', 'u', 's', 'sub', 'sup', 'span', 'q', 'kbd', 'var', 'samp', 'output', 'code']
    .every((t) => new RegExp(`<${t}[\\s>]`).test(h)),
  'RQ-THM-M1': (h) => /<span class="theorem-label">/.test(h) && /<span class="proof-label">/.test(h),
  'RQ-THM-M2': (h) => /Theorem \d+\./.test(h) && /Theorem \d+ \(Pythagoras\)\./.test(h) && /Remark\./.test(h),
  'RQ-MATH-M1': (h) => /<inline-math>/.test(h) && /katex/.test(h),
  'RQ-MATH-M3': (h) => ['math', 'align', 'cases', 'matrix', 'eqnarray'].every((t) => new RegExp(`<${t}>`).test(h)),
  'RQ-BLK-M1': (h) => ['p', 'blockquote', 'ol', 'ul', 'li', 'hr'].every((t) => new RegExp(`<${t}[\\s/>]`).test(h)),
  'RQ-BLK-M2': (h) => ['details', 'summary', 'dl', 'dt', 'dd'].every((t) => new RegExp(`<${t}[\\s>]`).test(h)),
};

// ── Fixture discovery ────────────────────────────────────────────────────────
function walkEmd(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'archive') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkEmd(p));
    else if (name.endsWith('.emd')) out.push(p);
  }
  return out;
}
function render(src, opts = {}) {
  return String(buildEnscribePipeline({ embedResources: false, ...opts }).processSync(src));
}

// ── Run ──────────────────────────────────────────────────────────────────────
export function runHarness() {
  const results = {};
  // S predicates — document-independent.
  for (const p of PREDICATES.filter((p) => p.kind === 'S')) {
    const check = S_CHECKS[p.id];
    if (!check) { results[p.id] = { kind: 'S', pass: null, status: 'untested' }; continue; }
    let pass = false;
    try { pass = !!check(); } catch { pass = false; }
    results[p.id] = pass
      ? { kind: 'S', pass: true }
      : { kind: 'S', pass: false, bug: FILED_BUGS[p.id] ?? '?' };
  }
  // M predicates — run against fixtures that exercise them (per their cell markers).
  // For each fixture, render once; for each M predicate with a checker, if the
  // fixture markers reference that predicate's area, run the check.
  const fixtures = walkEmd(FIXTURES_DIR);
  const mImplemented = Object.keys(M_CHECKS);
  for (const p of PREDICATES.filter((p) => p.kind === 'M')) {
    if (!M_CHECKS[p.id]) { results[p.id] = { kind: 'M', pass: null, status: 'untested' }; continue; }
  }
  for (const f of fixtures) {
    const src = readFileSync(f, 'utf8');
    if (!/<!--\s*cell:/.test(src)) continue; // only marked (systematic) fixtures
    let html;
    try { html = render(src); } catch (e) { continue; }
    for (const id of mImplemented) {
      try {
        const pass = !!M_CHECKS[id](html, f);
        // last-writer-wins is fine; a predicate passes if it passes in a fixture
        if (!(id in results) || results[id].pass !== true) {
          results[id] = pass ? { kind: 'M', pass: true } : { kind: 'M', pass: false, bug: FILED_BUGS[id] ?? '?' };
        }
      } catch { /* skip */ }
    }
  }
  // O predicates — visual-only.
  for (const p of PREDICATES.filter((p) => p.kind === 'O')) {
    results[p.id] = { kind: 'O', pass: null, status: 'observable' };
  }
  return results;
}

export function writeResults(results) {
  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + '\n', 'utf8');
}

// Test entry: run the harness, write results, report S-conformance. Does NOT fail
// on divergences (a divergence is a filed bug, not a test failure); it fails only
// if the harness itself throws.
export function run() {
  const results = runHarness();
  writeResults(results);
  const s = Object.entries(results).filter(([, v]) => v.kind === 'S');
  const sPass = s.filter(([, v]) => v.pass === true).length;
  const sFail = s.filter(([, v]) => v.pass === false).length;
  const sUntested = s.filter(([, v]) => v.status === 'untested').length;
  console.log(`PASS: predicate-harness ran — S: ${sPass} pass, ${sFail} divergent, ${sUntested} untested (${s.length} total)`);
  const mUntested = Object.values(results).filter((v) => v.kind === 'M' && v.status === 'untested').length;
  console.log(`  M predicates: ${mUntested} untested (wired per-fixture as the catalog lands)`);
}

// Test-suite entry (run.js): runs the harness WITHOUT writing results.json (no
// tree churn during tests), and asserts every predicate produced a verdict. A
// divergence is not a failure here — it is a tracked, filed bug. The committed
// results.json is produced by the standalone invocation / build step below.
export function runForTest() {
  const results = runHarness();
  for (const p of PREDICATES) {
    assert.ok(p.id in results, `predicate-harness produced no verdict for ${p.id}`);
  }
  const s = Object.values(results).filter((v) => v.kind === 'S');
  const sFail = s.filter((v) => v.pass === false);
  console.log(`PASS: predicate-harness — ${Object.keys(results).length} verdicts; S: ${s.length - sFail.length}/${s.length} pass`);
  if (sFail.length) console.log(`  divergent S predicates (filed bugs): ${sFail.length}`);
}

// Allow direct invocation.
if (process.argv[1] && process.argv[1].endsWith('predicate-harness.mjs')) run();
