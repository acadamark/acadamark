import assert from 'node:assert/strict';
import { extractPlainText } from '../../src/interpreter/lib/ast-helpers.js';
import { makeTag, makeOpaqueTag, makeInternalMarker } from '../../src/core/tag.js';

// Tests for extractPlainText — the shared plain-text collector used for
// document/page titles, figure alt-text, cite text, and `<a {slug}>`
// auto-labels. #290: opaque-content nodes (code, math, …) store their text as
// a string in `.content`, not an array, so the original collector dropped it.
//
// The node shapes here mirror what the parser produces for these sources
// (verified against liftToCanonicalMdast): a paragraph's children are
// [text, opaqueTag, text], with the opaque tag's `.content` a verbatim string.

export function run() {
  // --- #290 repro: inline <code|foo> in a title is included, single-spaced ---
  {
    // Source `The <code|foo> title` parses to these three siblings.
    const nodes = [
      { type: 'text', value: 'The ' },
      makeOpaqueTag('code', 'foo', { contentHandler: 'code' }),
      { type: 'text', value: ' title' },
    ];
    assert.equal(
      extractPlainText(nodes),
      'The foo title',
      'opaque code text is included, single-spaced (pre-fix dropped it → "The  title")',
    );
    // Guard the exact pre-fix corruption never returns.
    assert.notEqual(extractPlainText(nodes), 'The  title');
    console.log('PASS: ast-helpers: #290 inline <code|foo> text included in title, single-spaced');
  }

  // --- #290: inline math span (`<$ x^2 $>`) is included, single-spaced ---
  {
    // The math sigil stores its content with the sigil-captured surrounding
    // spaces (" x^2 "); the collector trims that leaf so the separators that
    // the adjacent text nodes already provide are not doubled.
    const nodes = [
      { type: 'text', value: 'The ' },
      makeOpaqueTag('inline-math', ' x^2 ', { contentHandler: 'math' }),
      { type: 'text', value: ' title' },
    ];
    assert.equal(
      extractPlainText(nodes),
      'The x^2 title',
      'opaque math text is included, single-spaced (no doubled spaces around it)',
    );
    console.log('PASS: ast-helpers: #290 inline math span text included in title, single-spaced');
  }

  // --- a lone opaque node yields just its (trimmed) text ---
  {
    const nodes = [makeOpaqueTag('code', 'print("hi")', { contentHandler: 'code' })];
    assert.equal(extractPlainText(nodes), 'print("hi")');
    console.log('PASS: ast-helpers: lone opaque node yields its text');
  }

  // --- opaque node nested inside a wrapper tag's array `.content` ---
  {
    const title = makeTag('title', [
      { type: 'text', value: 'Using ' },
      makeOpaqueTag('code', 'grep', { contentHandler: 'code' }),
    ]);
    assert.equal(extractPlainText([title]), 'Using grep');
    console.log('PASS: ast-helpers: opaque node inside array content is reached recursively');
  }

  // --- trim:false preserves the opaque leaf's raw (untrimmed) string ---
  {
    const nodes = [
      { type: 'text', value: 'The ' },
      makeOpaqueTag('inline-math', ' x^2 ', { contentHandler: 'math' }),
      { type: 'text', value: ' title' },
    ];
    assert.equal(
      extractPlainText(nodes, { trim: false }),
      'The  x^2  title',
      'trim:false concatenates raw — opaque leaf keeps its surrounding spaces',
    );
    console.log('PASS: ast-helpers: trim:false preserves the opaque leaf raw');
  }

  // --- the gate is isOpaqueContent: a non-opaque string `.content` is NOT folded in ---
  {
    // An internal marker carries content as null (isOpaqueContent: false); even
    // a stray string content must be skipped — only genuine opaque text counts.
    const marker = makeInternalMarker('__note-marker');
    marker.content = 'SHOULD-NOT-APPEAR'; // non-opaque string field
    const nodes = [
      { type: 'text', value: 'before ' },
      marker,
      { type: 'text', value: 'after' },
    ];
    assert.equal(
      extractPlainText(nodes),
      'before after',
      'a string `.content` with isOpaqueContent:false is not included',
    );
    console.log('PASS: ast-helpers: non-opaque string content is not folded in (gate is isOpaqueContent)');
  }

  // --- regression: text-node and array recursion behavior is unchanged ---
  {
    assert.equal(extractPlainText([{ type: 'text', value: '  hi  ' }]), 'hi');
    assert.equal(extractPlainText([{ type: 'text', value: '  hi  ' }], { trim: false }), '  hi  ');
    assert.equal(extractPlainText(null), '');
    assert.equal(extractPlainText(undefined), '');
    const nested = { type: 'paragraph', children: [{ type: 'text', value: 'a' }, { type: 'text', value: 'b' }] };
    assert.equal(extractPlainText([nested]), 'ab');
    console.log('PASS: ast-helpers: text-node + array recursion unchanged');
  }
}
