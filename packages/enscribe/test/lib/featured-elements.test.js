// Guard (#241): the curated FEATURED_SHORTHAND / FEATURED_LAYER1 lists stay in
// lockstep with the vocabulary. The docs site's Vocabulary intros render each featured
// tagname's example FROM the vocab source, so a list entry that names a removed,
// renamed, aliased, or example-less element would ship a broken/empty intro cell.
// This test fails — naming the offending tag — on any of those.

import assert from 'node:assert/strict';
import { VOCABULARY } from '@enscribejs/ehtml';
import { FEATURED_SHORTHAND, FEATURED_LAYER1 } from '../../src/interpreter/lib/featured-elements.js';

// A tag is CANONICAL when it is the stem of its own source .md file; a shorthand
// alias (e.g. `figure` → fig.md) shares the spec object but a different key.
const canonicalName = (spec) => String(spec?._sourceFile ?? '').split('/').pop().replace(/\.md$/, '');

function checkList(name, list, { requireLayer1Html }) {
  // No duplicates.
  assert.equal(new Set(list).size, list.length, `${name}: duplicate tagname in the featured list`);

  for (const tag of list) {
    const spec = VOCABULARY[tag];
    // (1) Resolves to a real vocab element.
    assert.ok(spec, `${name}: featured tag '${tag}' is not a vocabulary element — it would render as a broken intro cell.`);
    // (2) Canonical (not a shorthand alias), so the heading reads the Layer 1 element name.
    assert.equal(
      canonicalName(spec), tag,
      `${name}: featured tag '${tag}' is an alias of '${canonicalName(spec)}' — feature the canonical tagname.`,
    );
    // (3) Carries a usable shorthand example (the intro renders shorthand_examples[0].source).
    const ex = Array.isArray(spec.shorthand_examples) ? spec.shorthand_examples[0] : undefined;
    assert.ok(
      ex && typeof ex.source === 'string' && ex.source.trim(),
      `${name}: featured tag '${tag}' has no usable shorthand_examples[0].source — the intro cell would be empty.`,
    );
    // (4) Context-free — a requires-context element renders empty/misleading in isolation.
    assert.ok(
      !spec['requires-context'],
      `${name}: featured tag '${tag}' requires '${spec['requires-context']}' context — it renders empty on the intro; pick a context-free construct.`,
    );
    // (5) Layer 1 list only: the intro DISPLAYS the canonical ehtml expansion.
    if (requireLayer1Html) {
      assert.ok(
        typeof ex.ehtml === 'string' && ex.ehtml.trim(),
        `${name}: featured tag '${tag}' has no shorthand_examples[0].ehtml — the Layer 1 intro's expansion column would be empty.`,
      );
    }
  }
}

export function run() {
  checkList('FEATURED_SHORTHAND', FEATURED_SHORTHAND, { requireLayer1Html: false });
  checkList('FEATURED_LAYER1', FEATURED_LAYER1, { requireLayer1Html: true });
  console.log(
    `PASS: featured-elements — ${FEATURED_SHORTHAND.length} shorthand + ${FEATURED_LAYER1.length} Layer 1 featured tags resolve, canonical, with usable examples`,
  );
}
