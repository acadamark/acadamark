// Unit tests for the reshaped DSL registry — the language/type axis
// (core/dsl-registry.js), issue #22 slice 2.
//
// The reshape adds (purpose, host) bindings + an opacity field to each
// language record, behind a STABLE lookup: getContentHandler() must resolve
// byte-identically to the pre-reshape flat map, and the derived DSL_REGISTRY
// must equal the old map entry-for-entry, in order. These tests pin that
// output-neutrality (no render fixture can — the reshape is pure data model)
// and exercise the new accessors.

import assert from 'node:assert/strict';
import {
  LANGUAGES,
  DSL_REGISTRY,
  PURPOSE,
  getContentHandler,
  isOpaqueLanguage,
  getLanguageBindings,
} from '../src/core/dsl-registry.js';

// The pre-reshape flat map, frozen here as the byte-identity oracle: identifier
// → handler, in insertion order. getContentHandler() and DSL_REGISTRY must
// match this exactly.
const EXPECTED = [
  ['$',        'math'],
  ['$$',       'math-display'],
  ['`',        'code'],
  ['```',      'code-block'],
  ['csv',      'csv'],
  ['tsv',      'tsv'],
  ['math',     'math'],
  ['code',     'code'],
  ['mermaid',  'mermaid'],
  ['abc',      'abc'],
  ['diagram',  'diagram'],
  ['matrix',   'matrix'],
  ['cases',    'cases'],
  ['align',    'align'],
  ['eqnarray', 'eqnarray'],
  ['table',    'table'],
  ['library',  'library'],
  ['svg',      'svg'],
];

export function run() {
  // --- Byte-identity: derived DSL_REGISTRY equals the old map, in order ---
  {
    assert.deepEqual([...DSL_REGISTRY.entries()], EXPECTED,
      'derived DSL_REGISTRY must equal the pre-reshape map, entry-for-entry and in order');
    console.log('PASS: DSL_REGISTRY is byte-identical to the pre-reshape flat map');
  }

  // --- getContentHandler resolves identically for every language ---
  {
    for (const [id, handler] of EXPECTED) {
      assert.equal(getContentHandler(id), handler,
        `getContentHandler(${JSON.stringify(id)}) must be ${handler}`);
    }
    // Unregistered identifiers fall back to 'default'.
    assert.equal(getContentHandler('aside'), 'default');
    assert.equal(getContentHandler('data'), 'default');
    assert.equal(getContentHandler('totally-unknown'), 'default');
    console.log('PASS: getContentHandler resolves identically (registered + default fallback)');
  }

  // --- Opacity: every registered language is opaque; consistent with the
  //     parser's `contentHandler !== "default"` derivation ---
  {
    for (const [id] of EXPECTED) {
      assert.equal(isOpaqueLanguage(id), true, `${id} must be opaque`);
      assert.equal(isOpaqueLanguage(id), getContentHandler(id) !== 'default',
        `${id}: stored opacity must match the contentHandler-derived opacity`);
    }
    // Unregistered → not opaque (recursive parse).
    assert.equal(isOpaqueLanguage('aside'), false);
    assert.equal(isOpaqueLanguage('unknown'), false);
    assert.equal(isOpaqueLanguage('unknown'), getContentHandler('unknown') !== 'default');
    console.log('PASS: opacity is stored true for all languages and matches the parser derivation');
  }

  // --- (purpose, host) bindings: present, well-formed, valid purpose ---
  {
    const validPurposes = new Set(Object.values(PURPOSE));
    for (const [id] of EXPECTED) {
      const bindings = getLanguageBindings(id);
      assert.ok(Array.isArray(bindings) && bindings.length >= 1,
        `${id} must declare at least one (purpose, host) binding`);
      for (const b of bindings) {
        assert.ok(validPurposes.has(b.purpose), `${id}: purpose ${b.purpose} must be one of PURPOSE`);
        assert.ok(typeof b.host === 'string' && b.host.length > 0, `${id}: host must be a non-empty string`);
      }
    }
    // Spot-check the dispositions the spec names.
    assert.deepEqual(getLanguageBindings('library'), [{ purpose: 'storage', host: 'library' }],
      'library is a storage language hosted by library');
    assert.deepEqual(getLanguageBindings('mermaid'), [{ purpose: 'display', host: 'diagram' }],
      'mermaid is a display language whose host is diagram (the binding is declarative; ' +
      'the <mermaid> → <diagram mermaid> gate shorthand is registered explicitly)');
    assert.deepEqual(getLanguageBindings('csv'), [{ purpose: 'display', host: 'table' }],
      'csv is a display language hosted by table');
    assert.deepEqual(getLanguageBindings('svg'), [{ purpose: 'display', host: 'svg' }],
      'svg is a passthrough display language and its own host — a first-class ' +
      'frameable element, not a <fig svg> format word (the <fig svg> second ' +
      'path was retired, #81/#22; framed inline SVG is <svg>-as-frameable)');
    // Unregistered → no bindings.
    assert.deepEqual(getLanguageBindings('unknown'), []);
    console.log('PASS: every language declares well-formed (purpose, host) bindings');
  }

  // --- LANGUAGES and DSL_REGISTRY stay in sync (same keys, same order) ---
  {
    assert.deepEqual([...LANGUAGES.keys()], [...DSL_REGISTRY.keys()],
      'LANGUAGES and the derived DSL_REGISTRY must have identical keys in identical order');
    console.log('PASS: LANGUAGES is the single source of truth for DSL_REGISTRY');
  }
}
