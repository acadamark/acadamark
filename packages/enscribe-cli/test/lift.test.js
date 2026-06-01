// Round-trip tests for `enscribe lift` (the canonical serializer).
//
// The strongest practical fidelity check is IDEMPOTENCE: if
//   canonical = serialize(lift(src))
// then lifting the canonical output again must produce the same string —
//   serialize(lift(canonical)) === canonical
// A fixed point proves the canonical source faithfully represents its own tree
// (escaping is correct, every node re-parses to itself). We also assert the
// lifted output re-parses with no error nodes.
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { liftToCanonicalMdast } from '@enscribejs/interpreter';
import { serializeCanonical } from '../src/serialize-canonical.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INTERP_FIXTURES = join(__dirname, '..', '..', 'enscribe-interpreter', 'test', 'fixtures');

const lift = (src) => serializeCanonical(liftToCanonicalMdast(src));

function countErrorNodes(tree) {
  let n = 0;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'enscribeParseError' || node.type === 'enscribeTagError') n++;
    if (node.type === 'enscribeTag' && (node.tagname === 'enscribeParseError' || node.tagname === 'enscribeTagError')) n++;
    for (const k of ['children', 'content']) if (Array.isArray(node[k])) node[k].forEach(walk);
  };
  walk(tree);
  return n;
}

/** Lift output is valid (no error nodes) and a fixed point (idempotent). */
function checkRoundTrip(label, src) {
  const once = lift(src);
  const reparsed = liftToCanonicalMdast(once);
  const errs = countErrorNodes(reparsed);
  assert.equal(errs, 0, `${label}: lifted output re-parses with no error nodes (found ${errs})`);
  const twice = serializeCanonical(reparsed);
  if (twice !== once) {
    // Show a small diff to make a failure debuggable.
    const a = once.split('\n'), b = twice.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error(`  ${label} diverges at line ${i + 1}:\n    once : ${JSON.stringify(a[i])}\n    twice: ${JSON.stringify(b[i])}`);
        break;
      }
    }
  }
  assert.equal(twice, once, `${label}: lift is idempotent (round-trip fixed point)`);
}

export function run_tests() {
  // ── synthetic mixed-form documents ──────────────────────────────────────────
  const synthetic = {
    'headings (markdown + sigil + canonical)':
      '# Intro\n\nBody.\n\n<# Sigil #>\n\nMore.\n\n<section | Canonical>\n\nEnd.',
    'inline formatting':
      'A paragraph with **bold**, *italic*, `code`, and a <b>canonical b</b>.',
    'inline + display math':
      'Inline $E = mc^2$ here.\n\n<$$ #eqn:g | \\int e^{-x^2} dx $$>',
    'lists and rules':
      '- one\n- two\n- three\n\n1. first\n2. second\n\n---\n\nAfter.',
    'blockquote':
      '> a quoted line\n\nAfter the quote.',
    'figure + table + theorem':
      '<fig #fig:x src=a.png | A caption.>\n\n<table csv #tab:y caption="Data" |\na,b\n1,2\n>\n\n<theorem #thm:z name="Pyth" | The statement.>',
    'citations + refs + notes':
      'See <ref @fig:x> and <cite @smith2020, @jones2019>.<note | A footnote.>',
    'special characters in prose':
      'Compare a < b and use a pipe and backslash carefully.',
    'data + library + bibliography':
      'Text <cite @a>.\n\n<data>\n<library |\n@misc{a, title={T}, year={2020}}\n>\n</data>\n\n<bibliography>\n</bibliography>',
  };
  for (const [label, src] of Object.entries(synthetic)) {
    checkRoundTrip(label, src);
    console.log(`PASS: round-trip — ${label}`);
  }

  // ── real fixtures ───────────────────────────────────────────────────────────
  const fixtures = [
    'document-9-demo.emd',
    'document-45-calibration.emd',
    'document-5-linear-regression.emd',
    'document-7-tables.emd',
  ];
  for (const f of fixtures) {
    const p = join(INTERP_FIXTURES, f);
    if (!existsSync(p)) { console.log(`SKIP: ${f} (not found)`); continue; }
    checkRoundTrip(f, readFileSync(p, 'utf8'));
    console.log(`PASS: round-trip — ${f}`);
  }

  console.log('All lift round-trip tests passed.');
}
