// Unit tests for the shared shorthand-expansion registry
// (interpreter/lib/shorthand-expansions.js), issue #22 slice 2.
//
// The machinery is proven here synthetically (no DSL tag is wired through it
// this slice — that is slice 3): a synthetic expansion, the later-wins+warn
// clobber, and the reserved-name rejection (plus the conditional exemption that
// makes the book-part <glossary> case legal). The book-part lift's
// output-neutrality is proven separately by the byte-identical book fixtures.

import assert from 'node:assert/strict';
import { createShorthandRegistry } from '../../src/interpreter/lib/shorthand-expansions.js';

export function run() {
  // --- Synthetic expansion: tagname rewrite + positional prepend + kwarg merge ---
  {
    const reg = createShorthandRegistry({ warn: () => {} });
    assert.equal(reg.register('foo', { tagname: 'bar', positional: ['x'], kwargs: { k: 'v' } }), true);

    const node = { type: 'enscribeTag', tagname: 'foo', positional: ['keep'], kwargs: { existing: '1' } };
    assert.equal(reg.matches(node), true, 'unconditional shorthand matches');
    reg.expand(node);
    assert.equal(node.tagname, 'bar', 'tagname rewritten');
    assert.deepEqual(node.positional, ['x', 'keep'], 'injected positional is prepended');
    assert.deepEqual(node.kwargs, { existing: '1', k: 'v' }, 'kwargs merged, existing preserved');

    // An unregistered tagname does not match and expand is a no-op.
    const other = { type: 'enscribeTag', tagname: 'unregistered' };
    assert.equal(reg.matches(other), false);
    reg.expand(other);
    assert.equal(other.tagname, 'unregistered');
    console.log('PASS: synthetic expansion rewrites tagname, prepends positional, merges kwargs');
  }

  // --- Conditional expansion: matches only when the condition passes ---
  {
    const reg = createShorthandRegistry({ warn: () => {} });
    reg.register('cond', { tagname: 'host', kwargs: { t: 'cond' }, condition: (ctx) => ctx.on === true });

    assert.equal(reg.matches({ tagname: 'cond' }, { on: true }), true, 'matches when condition passes');
    assert.equal(reg.matches({ tagname: 'cond' }, { on: false }), false, 'no match when condition fails');
    assert.equal(reg.matches({ tagname: 'cond' }, {}), false, 'no match when condition absent from ctx');
    console.log('PASS: conditional expansion matches only when its condition passes');
  }

  // --- Clobber: duplicate shorthand → later-wins + warn ---
  {
    const warnings = [];
    const reg = createShorthandRegistry({ warn: (m) => warnings.push(m) });
    reg.register('dup', { tagname: 'first' });
    reg.register('dup', { tagname: 'second' });

    assert.equal(reg.map.get('dup').tagname, 'second', 'later definition wins');
    assert.equal(warnings.length, 1, 'exactly one warning for the duplicate');
    assert.match(warnings[0], /already registered.*later/i, 'warns later-wins on duplicate');
    console.log('PASS: duplicate shorthand → later-wins + warn');
  }

  // --- Reserved-name rejection: an UNCONDITIONAL shorthand cannot shadow a reserved name ---
  {
    const warnings = [];
    const reserved = new Set(['table', 'diagram', 'section']);
    const reg = createShorthandRegistry({ reservedNames: reserved, warn: (m) => warnings.push(m) });

    const ok = reg.register('table', { tagname: 'something' });
    assert.equal(ok, false, 'registration rejected');
    assert.equal(reg.map.has('table'), false, 'reserved shorthand not added to the map');
    assert.match(warnings[0], /reserved/i, 'warns that the name is reserved');

    // A non-reserved unconditional shorthand still registers fine.
    assert.equal(reg.register('safe', { tagname: 'whatever' }), true);
    console.log('PASS: unconditional shorthand shadowing a reserved name is rejected + warned');
  }

  // --- Conditional exemption: a CONDITIONAL shorthand may shadow a reserved name ---
  // (This is the <glossary> case: a book-part shorthand that shadows the
  //  standalone <glossary> vocab tag, allowed because the book-context
  //  condition disambiguates.)
  {
    const warnings = [];
    const reserved = new Set(['glossary']);
    const reg = createShorthandRegistry({ reservedNames: reserved, warn: (m) => warnings.push(m) });

    const ok = reg.register('glossary', {
      tagname: 'book-part',
      kwargs: { 'book-part-type': 'glossary' },
      condition: (ctx) => ctx.isBook === true,
    });
    assert.equal(ok, true, 'conditional shorthand shadowing a reserved name is allowed');
    assert.equal(reg.map.has('glossary'), true);
    assert.equal(warnings.length, 0, 'no reservation warning for a conditional shorthand');
    // It still respects its condition.
    assert.equal(reg.matches({ tagname: 'glossary' }, { isBook: true }), true);
    assert.equal(reg.matches({ tagname: 'glossary' }, { isBook: false }), false);
    console.log('PASS: conditional shorthand exempt from reserved-name rejection (the <glossary> case)');
  }
}
