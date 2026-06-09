// #6 regression guard — the canonical serializer round-trips complex content.
//
// #6 reported two serialize -> re-parse losses: merged-cell raw-HTML tables lost
// their ids, and dense LaTeX math broke the `<$$ … $$>` sigil. Both now survive
// (the raw-HTML-table round-trip landed with #106/#108; wrapSigil's
// markdown-delimiter / attrs-pipe fallbacks hold delimiter-colliding math). These
// tests lock that in across the entry points the issue named: `lift`
// (liftToCanonicalMdast -> serializeCanonical -> re-parse) and `import-jats`
// (importJats -> serializeCanonical -> re-parse).
//
// Scope: the two #6 failure modes only. (Two unrelated round-trip gaps found
// while verifying — a whole-PNAS re-parse slowdown and a raw-HTML-cell whitespace
// drift — are tracked as their own issues, not guarded here.)
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { liftToCanonicalMdast } from '@enscribejs/enscribe';
import { serializeCanonical } from '../src/serialize-canonical.js';
import { importJats } from '../src/jats-import/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const lift = (src) => serializeCanonical(liftToCanonicalMdast(src));

function findTag(node, tag, out = []) {
  if (node && node.type === 'enscribeTag' && node.tagname === tag) out.push(node);
  for (const k of node?.children ?? []) findTag(k, tag, out);
  if (Array.isArray(node?.content)) for (const k of node.content) findTag(k, tag, out);
  return out;
}
function mathContent(tree, tag) {
  const m = findTag(tree, tag);
  return m[0]?.content ?? null;
}

export function run_tests() {
  // ── Tables: merged cells (colspan/rowspan) + id survive (lift path) ──────────
  {
    const src = [
      '<table #tab:merged caption="Merged cells">',
      '<tbody>',
      '<tr><th colspan="2">Header span</th></tr>',
      '<tr><td>a</td><td rowspan="2">b</td></tr>',
      '<tr><td>c</td></tr>',
      '</tbody>',
      '</table>',
    ].join('\n');
    const emd = lift(src);
    const tree = liftToCanonicalMdast(emd);
    const tables = findTag(tree, 'table');
    assert.strictEqual(tables.length, 1, 'merged-cell table survives as one <table>');
    assert.strictEqual(tables[0].id, 'tab:merged', 'merged-cell table keeps its id on re-parse');
    assert.ok(/colspan="2"/.test(emd), 'colspan preserved in serialized .emd');
    assert.ok(/rowspan="2"/.test(emd), 'rowspan preserved in serialized .emd');
    // Idempotence: a second lift is a fixed point.
    assert.strictEqual(lift(emd), emd, 'merged-cell table round-trip is idempotent');
    console.log('PASS: #6 — merged-cell table (colspan/rowspan + id) survives lift round-trip');
  }

  // ── Tables: ids survive the import-jats entry point (the complex fixture) ─────
  {
    const xml = readFileSync(join(__dirname, 'fixtures', 'document-57-jats-complex-table.xml'), 'utf8');
    const emd = serializeCanonical(importJats(xml));
    const ids0 = findTag(importJats(xml), 'table').map((t) => t.id);
    const ids1 = findTag(liftToCanonicalMdast(emd), 'table').map((t) => t.id);
    assert.ok(ids0.length >= 1 && ids0.every(Boolean), 'imported complex tables have ids');
    assert.deepStrictEqual(ids1, ids0, 'import-jats --emd table ids survive re-parse');
    assert.ok(/colspan|rowspan/i.test(emd), 'import-jats --emd preserves merged-cell spans');
    console.log('PASS: #6 — import-jats --emd merged-cell table ids survive re-parse');
  }

  // ── Math: dense display math survives the sigil (lift path) ───────────────────
  {
    const samples = [
      ['lone >',     '\\sum_{i>0} a_i'],
      ['& and >',    '\\begin{cases} x & x > 0 \\\\ -x & x \\le 0 \\end{cases}'],
      ['mid bar',    'P(A \\mid B) = \\frac{P(A|B)}{1}'],
      ['frac > c',   '\\frac{a}{b} > c'],
      ['literal $$', 'a $$ b'],
    ];
    for (const [name, X] of samples) {
      const tree0 = liftToCanonicalMdast(`$$\n${X}\n$$`);
      const c0 = mathContent(tree0, 'display-math');
      assert.ok(c0 != null, `display math parses (${name})`);
      const emd = serializeCanonical(tree0);
      const c1 = mathContent(liftToCanonicalMdast(emd), 'display-math');
      assert.strictEqual((c1 ?? '').trim(), c0.trim(), `dense display math survives re-parse (${name})`);
      assert.strictEqual(lift(emd), emd, `dense display math round-trip is idempotent (${name})`);
    }
    console.log('PASS: #6 — dense display math survives the <$$ … $$> round-trip');
  }

  // ── Math: an id-bearing math node keeps its id + content through the sigil ────
  {
    const X = 'E > mc^2 \\mid \\alpha';
    const src = `<$$ #eqn:dense |${X}$$>`;
    const tree0 = liftToCanonicalMdast(src);
    const m0 = findTag(tree0, 'display-math')[0];
    assert.ok(m0 && m0.id === 'eqn:dense', 'id-bearing dense math parses with its id');
    const emd = serializeCanonical(tree0);
    const m1 = findTag(liftToCanonicalMdast(emd), 'display-math')[0];
    assert.ok(m1 && m1.id === 'eqn:dense', 'dense math keeps its id on re-parse');
    assert.strictEqual((m1.content ?? '').trim(), (m0.content ?? '').trim(), 'dense math keeps its content on re-parse');
    console.log('PASS: #6 — id-bearing dense math survives the <$$ … $$> round-trip');
  }
}
