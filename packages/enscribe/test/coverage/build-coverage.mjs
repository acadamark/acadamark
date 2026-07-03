// Coverage-manifest generator (#5). Produces test/fixtures/coverage.json and the
// human-readable test/fixtures/COVERAGE.md — the single at-a-glance instrument
// that replaces opening dozens of fixture files to judge coverage.
//
// Rows are DERIVED, never hand-written (Rule 2: no hand-counted facts):
//   - element list, kwargs, content type, strategy ← live VOCABULARY data module
//   - sigil register expressibility               ← live core/tagname-sigil-map
//   - disposition, area, forms, predicates, idioms ← test/coverage/spec-data.mjs
//     (transcribed once from notes/specs; see that file's provenance note)
//   - which cells are covered                      ← scan fixtures for <!-- cell: KEY -->
//   - pass / divergent per covered cell            ← test/coverage/results.json (if present)
//
// Cell identity: `element/behavior-key`. behavior-key ∈ base | id | class |
// kwarg:NAME | form:NAME | register:NAME | blanket | no-output | deferred.
// A fixture marks the cells it exercises with an HTML comment
// `<!-- cell: element/behavior-key -->` (stripped by the pipeline).
//
// Usage:  node test/coverage/build-coverage.mjs   (writes coverage.json + COVERAGE.md)

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { VOCABULARY } from '../../../layer1-vocabulary/src/index.js';
import { TAGNAME_TO_SIGIL } from '../../src/core/tagname-sigil-map.js';
import {
  DISPOSITION, FORMS, FORM_NAMES, GENERATED, PREDICATES, AREAS,
  MARKDOWN_ELEMENTS, CANONICAL_ONLY_BY_DECISION,
} from './spec-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const RESULTS_PATH = join(__dirname, 'results.json'); // written by the predicate harness
// Output dir is overridable via env so the freshness guard (coverage-fresh.test.js)
// can regenerate to a temp dir and diff against the committed manifest without
// touching the working tree. Unset (the normal case) → writes in place, unchanged.
const OUT_DIR = process.env.ENSCRIBE_COVERAGE_OUTDIR || FIXTURES_DIR;
const OUT_JSON = join(OUT_DIR, 'coverage.json');
const OUT_MD = join(OUT_DIR, 'COVERAGE.md');

const vocabGet = (k) => (VOCABULARY instanceof Map ? VOCABULARY.get(k) : VOCABULARY[k]);
const vocabKeys = () => (VOCABULARY instanceof Map ? [...VOCABULARY.keys()] : Object.keys(VOCABULARY));

// Predicate ids grouped by area (for attaching to elements).
const predsByArea = {};
for (const p of PREDICATES) (predsByArea[p.area] ??= []).push(p.id);

// ── Build the cell list ──────────────────────────────────────────────────────
// An element is authorable iff it has a tag-forms row with at least one non-'—'.
function supportedForms(el) {
  const m = FORMS[el];
  if (!m) return [];
  return FORM_NAMES.filter((_, i) => m[i] === '✓' || m[i] === '·');
}
function supportedRegisters(el) {
  const regs = ['canonical'];
  if (TAGNAME_TO_SIGIL[el]) regs.push('sigil');
  if (MARKDOWN_ELEMENTS.includes(el)) regs.push('markdown');
  return regs;
}
function kwargNames(el) {
  const rec = vocabGet(el);
  const kw = rec?.enscribe_attributes?.kwargs;
  return kw ? Object.keys(kw) : [];
}

const cells = [];
const annex = []; // generated/non-authorable elements

const allElements = new Set([...Object.keys(DISPOSITION), ...vocabKeys()]);
for (const el of [...allElements].sort()) {
  const info = DISPOSITION[el];
  const forms = supportedForms(el);
  const isGenerated = GENERATED.includes(el) || (FORMS[el] && forms.length === 0);

  if (isGenerated) {
    annex.push({ element: el, area: info?.area ?? '?', parentFixture: null });
    continue;
  }
  if (!info) {
    // Live vocab element with no coverage-map disposition (e.g. alias). Record as
    // needs-review so it is visible, slot under its area if VOCABULARY hints one.
    cells.push({
      key: `${el}/base`, element: el, behavior: 'base', area: '?',
      disposition: 'needs-review', predicates: [], coveredBy: [], status: 'needs-review',
    });
    continue;
  }

  const area = info.area;
  const preds = predsByArea[area] ?? [];
  const push = (behavior, extra = {}) => cells.push({
    key: `${el}/${behavior}`, element: el, behavior, area,
    disposition: info.disposition, predicates: preds, coveredBy: [], status: null, ...extra,
  });

  if (info.disposition === 'generic-implicit') { push('blanket'); continue; }
  if (info.disposition === 'no-output') { push('no-output'); continue; }
  if (info.disposition === 'deferred-presentation') { push('deferred'); continue; }
  if (info.disposition === 'alias') { push('alias'); continue; }

  // specified → full behavior-variant expansion
  push('base'); push('id'); push('class');
  for (const k of kwargNames(el)) push(`kwarg:${k}`);
  for (const f of forms) push(`form:${f}`);
  for (const r of supportedRegisters(el)) if (r !== 'canonical') push(`register:${r}`);
}

// ── Scan fixtures for cell markers ───────────────────────────────────────────
function walkEmd(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'archive') continue; // archived fixtures don't count toward coverage
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkEmd(p));
    else if (name.endsWith('.emd')) out.push(p);
  }
  return out;
}
const markerRe = /<!--\s*cell:\s*([^\s][^>]*?)\s*-->/g;
const coverage = {}; // cellKey -> [ 'relpath#n' ]
for (const f of walkEmd(FIXTURES_DIR)) {
  const src = readFileSync(f, 'utf8');
  const rel = relative(FIXTURES_DIR, f).replace(/\\/g, '/');
  let m;
  while ((m = markerRe.exec(src))) {
    const key = m[1].trim();
    (coverage[key] ??= []).push(rel);
  }
}

// ── Predicate results (optional; produced by the harness) ────────────────────
// shape: { "RQ-AREA-M1": { pass: true } | { pass: false, bug: "#NN" }, ... }
const results = existsSync(RESULTS_PATH) ? JSON.parse(readFileSync(RESULTS_PATH, 'utf8')) : {};

// ── Compute status per cell ──────────────────────────────────────────────────
for (const c of cells) {
  c.coveredBy = coverage[c.key] ?? [];
  if (c.status === 'needs-review') continue;
  if (c.disposition === 'deferred-presentation') {
    c.status = c.coveredBy.length ? 'deferred' : 'deferred'; // marked boundary either way
    continue;
  }
  if (!c.coveredBy.length) { c.status = 'gap'; continue; }
  // covered: derive pass/divergent from the predicate results for the cell's preds
  const verdicts = c.predicates.map((id) => results[id]).filter(Boolean);
  const failed = verdicts.find((v) => v && v.pass === false);
  if (failed) c.status = `divergent:${failed.bug ?? '?'}`;
  else if (verdicts.length) c.status = 'pass';
  else c.status = 'covered'; // fixture exists, predicate not yet wired
}

// ── Summary ──────────────────────────────────────────────────────────────────
const byStatus = {};
for (const c of cells) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
const byDisp = {};
for (const c of cells) byDisp[c.disposition] = (byDisp[c.disposition] ?? 0) + 1;
const fixtureFiles = walkEmd(FIXTURES_DIR).map((f) => relative(FIXTURES_DIR, f).replace(/\\/g, '/'));

const manifest = {
  generatedFrom: 'test/coverage/build-coverage.mjs (live VOCABULARY + sigil map + spec-data.mjs)',
  totals: { cells: cells.length, fixtures: fixtureFiles.length, annexed: annex.length },
  byStatus, byDisposition: byDisp,
  cells, annex, fixtures: fixtureFiles,
};
writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// ── Render COVERAGE.md ───────────────────────────────────────────────────────
const pct = (n) => (cells.length ? Math.round((100 * n) / cells.length) : 0);
const covered = cells.filter((c) => c.status === 'pass' || c.status === 'covered').length;
let md = '';
md += '# Coverage manifest\n\n';
md += '> **Generated** by `test/coverage/build-coverage.mjs` — do not edit by hand.\n';
md += '> Regenerate: `node test/coverage/build-coverage.mjs`. Rows derive from the live\n';
md += '> `VOCABULARY` + sigil map + `test/coverage/spec-data.mjs`; status from fixture\n';
md += '> `<!-- cell: … -->` markers + `test/coverage/results.json`.\n\n';
md += '## Summary\n\n';
md += `- **Behavior cells:** ${cells.length}  ·  **fixtures:** ${fixtureFiles.length}  ·  **annexed (generated) elements:** ${annex.length}\n`;
md += `- **Covered:** ${covered} (${pct(covered)}%)\n`;
md += '- **By status:** ' + Object.entries(byStatus).sort().map(([k, v]) => `\`${k}\` ${v}`).join(' · ') + '\n';
md += '- **By disposition:** ' + Object.entries(byDisp).sort().map(([k, v]) => `\`${k}\` ${v}`).join(' · ') + '\n\n';
md += 'An empty **covered-by** / a `gap` status is a *visible hole*. A `divergent:#NN` cell links a filed render-quality bug. A `deferred` cell is a marked boundary, not a hole.\n\n';

const statusBadge = (s) => (s === 'gap' ? '🔴 gap' : s.startsWith('divergent') ? `🟠 ${s}` : s === 'deferred' ? '🟡 deferred' : s === 'needs-review' ? '🔵 needs-review' : s === 'pass' ? '🟢 pass' : `⚪ ${s}`);

for (const [area, label] of AREAS) {
  const areaCells = cells.filter((c) => c.area === area);
  if (!areaCells.length) continue;
  const preds = (predsByArea[area] ?? []);
  md += `## ${area} — ${label}\n\n`;
  if (preds.length) md += `**Predicates:** ${preds.map((p) => `\`${p}\``).join(', ')}\n\n`;
  // group by element
  const byEl = {};
  for (const c of areaCells) (byEl[c.element] ??= []).push(c);
  md += '| element | cell | disposition | covered-by | status |\n|---|---|---|---|---|\n';
  for (const el of Object.keys(byEl).sort()) {
    for (const c of byEl[el]) {
      const cov = c.coveredBy.length ? c.coveredBy.map((x) => `\`${x}\``).join(' ') : '—';
      md += `| \`${el}\` | ${c.behavior} | ${c.disposition} | ${cov} | ${statusBadge(c.status)} |\n`;
    }
  }
  md += '\n';
}

// needs-review cells outside the known areas
const nr = cells.filter((c) => c.area === '?');
if (nr.length) {
  md += '## ? — live-vocabulary elements with no coverage-map row (needs-review)\n\n';
  md += '| element | cell | status |\n|---|---|---|\n';
  for (const c of nr) md += `| \`${c.element}\` | ${c.behavior} | ${statusBadge(c.status)} |\n`;
  md += '\n';
}

md += '## Annex — generated / not-authored-directly elements\n\n';
md += 'These elements have an all-`—` tag-forms row: they cannot be authored standalone and get **no fixture**. They are exercised through the parent context fixture that produces them (§7.4). A blank parent is itself a visible gap until a context fixture instantiates it.\n\n';
md += '| element | area | exercised-by (parent fixture) |\n|---|---|---|\n';
for (const a of annex.sort((x, y) => x.element.localeCompare(y.element))) {
  md += `| \`${a.element}\` | ${a.area} | ${a.parentFixture ? `\`${a.parentFixture}\`` : '—'} |\n`;
}
md += '\n';

writeFileSync(OUT_MD, md, 'utf8');
console.log(`coverage: ${cells.length} cells, ${fixtureFiles.length} fixtures, ${annex.length} annexed`);
console.log(`status:`, byStatus);
