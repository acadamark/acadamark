// Guard (#234): book-regions.js derives BOOK_PART_FRONT_TYPES / BOOK_PART_BACK_TYPES
// from the vocab `book-part` `type.regions` map. This pins the expected membership so a
// future vocab region edit is DELIBERATE (this test must be updated), not silent — the
// migration-parity proof that the derived sets equal the old hand-coded ones. The
// load-time subset guard in book-regions.js (region ⊆ type values) is exercised merely
// by importing the module here.

import assert from 'node:assert/strict';
import {
  BOOK_PART_FRONT_TYPES, BOOK_PART_BACK_TYPES, isBodyBookPart,
} from '../../src/interpreter/lib/book-regions.js';

const set = (arr) => [...arr].sort().join(', ');

export function run() {
  // The derived sets must EQUAL the pre-#234 hand-coded sets, exactly.
  assert.equal(
    set(BOOK_PART_FRONT_TYPES), set(['preface', 'foreword', 'dedication']),
    `BOOK_PART_FRONT_TYPES drifted: {${set(BOOK_PART_FRONT_TYPES)}}`,
  );
  assert.equal(
    set(BOOK_PART_BACK_TYPES), set(['appendix', 'glossary', 'colophon', 'afterword']),
    `BOOK_PART_BACK_TYPES drifted: {${set(BOOK_PART_BACK_TYPES)}}`,
  );

  // FRONT and BACK are disjoint.
  for (const t of BOOK_PART_FRONT_TYPES) {
    assert.ok(!BOOK_PART_BACK_TYPES.has(t), `'${t}' is in both FRONT and BACK`);
  }

  // isBodyBookPart is the complement: body types true, front/back types false.
  for (const t of ['chapter', 'part', 'introduction', 'conclusion', 'other']) {
    assert.ok(isBodyBookPart(t), `'${t}' should be a body book-part`);
  }
  for (const t of [...BOOK_PART_FRONT_TYPES, ...BOOK_PART_BACK_TYPES]) {
    assert.ok(!isBodyBookPart(t), `'${t}' is front/back, not body`);
  }

  console.log(
    `PASS: book-regions — FRONT {${set(BOOK_PART_FRONT_TYPES)}} · BACK {${set(BOOK_PART_BACK_TYPES)}} ` +
    'derived from the vocab, membership pinned',
  );
}
