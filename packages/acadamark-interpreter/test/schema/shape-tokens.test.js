import assert from 'node:assert/strict';
import {
  INLINE_ELEMENTS, BLOCK_ELEMENTS, SECTION_ELEMENTS,
  expandTokens, classifyElement,
} from '../../src/schema/shape-tokens.js';

export function run() {
  // Membership sanity — anchor a few representatives per token.
  assert.ok(INLINE_ELEMENTS.has('em'));
  assert.ok(INLINE_ELEMENTS.has('strong'));
  assert.ok(INLINE_ELEMENTS.has('code'));
  assert.ok(INLINE_ELEMENTS.has('cite'));
  assert.ok(INLINE_ELEMENTS.has('ref'));
  assert.ok(INLINE_ELEMENTS.has('note'));
  console.log('PASS: inline membership anchors present');

  assert.ok(BLOCK_ELEMENTS.has('p'));
  assert.ok(BLOCK_ELEMENTS.has('figure'));
  assert.ok(BLOCK_ELEMENTS.has('aside'));
  assert.ok(BLOCK_ELEMENTS.has('hr'));
  assert.ok(BLOCK_ELEMENTS.has('ul'));
  console.log('PASS: block membership anchors present');

  assert.ok(SECTION_ELEMENTS.has('section'));
  assert.ok(SECTION_ELEMENTS.has('sub-section'));
  assert.ok(SECTION_ELEMENTS.has('sub-sub-section'));
  assert.ok(SECTION_ELEMENTS.has('book-part'));
  console.log('PASS: section membership anchors present');

  // No leakage across tokens — sections are not block, block are not inline.
  assert.ok(!BLOCK_ELEMENTS.has('section'));
  assert.ok(!INLINE_ELEMENTS.has('p'));
  assert.ok(!SECTION_ELEMENTS.has('p'));
  console.log('PASS: tokens are disjoint at the anchors');

  // expandTokens combines and dedupes.
  const ib = expandTokens(['inline', 'block']);
  assert.ok(ib.has('em'));
  assert.ok(ib.has('p'));
  assert.ok(!ib.has('section'));
  console.log('PASS: expandTokens combines inline + block');

  const all = expandTokens(['inline', 'block', 'section']);
  assert.ok(all.has('em'));
  assert.ok(all.has('p'));
  assert.ok(all.has('section'));
  console.log('PASS: expandTokens covers all three');

  // Unknown tokens are skipped, not thrown.
  const u = expandTokens(['inline', 'nonsense']);
  assert.ok(u.has('em'));
  assert.equal(u.has('nonsense'), false);
  console.log('PASS: unknown tokens skipped');

  // Empty / nullish input returns empty Set.
  assert.equal(expandTokens([]).size, 0);
  assert.equal(expandTokens(null).size, 0);
  assert.equal(expandTokens(undefined).size, 0);
  console.log('PASS: empty input returns empty Set');

  // classifyElement
  assert.equal(classifyElement('em'), 'inline');
  assert.equal(classifyElement('p'), 'block');
  assert.equal(classifyElement('section'), 'section');
  assert.equal(classifyElement('not-an-element'), null);
  console.log('PASS: classifyElement returns correct token or null');
}
