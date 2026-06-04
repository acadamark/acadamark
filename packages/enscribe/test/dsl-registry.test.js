// Unit tests for the reshaped DSL registry — the language/type axis
// (core/dsl-registry.js), issue #22 slice 2.
//
// The reshape added an opacity field to each language record behind a STABLE
// lookup: getContentHandler() must resolve byte-identically to the pre-reshape
// flat map, and the derived DSL_REGISTRY must equal the old map entry-for-entry,
// in order. These tests pin that output-neutrality (no render fixture can — the
// reshape is pure data model) and exercise the live accessors (getContentHandler,
// isOpaqueLanguage). The `(purpose, host)` bindings the reshape once carried were
// removed in #85 as confirmed-inert data (see the note in the bindings section).

import assert from 'node:assert/strict';
import {
  LANGUAGES,
  DSL_REGISTRY,
  getContentHandler,
  isOpaqueLanguage,
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

  // NOTE (#85): the per-language `(purpose, host)` bindings and the
  // `getLanguageBindings` accessor were removed as confirmed-inert data — no
  // dispatch consumer ever materialized (the planned slice-3 migration shipped
  // via explicit gate registrations instead). The host/language relationship
  // that DOES have a consumer (host → accepted format words, for validation)
  // lives in `host-accept-sets.js` and is covered by `lib/host-accept-sets.test.js`
  // plus the gate validation tests in `plugins/normalize-to-canonical.test.js`.

  // --- LANGUAGES and DSL_REGISTRY stay in sync (same keys, same order) ---
  {
    assert.deepEqual([...LANGUAGES.keys()], [...DSL_REGISTRY.keys()],
      'LANGUAGES and the derived DSL_REGISTRY must have identical keys in identical order');
    console.log('PASS: LANGUAGES is the single source of truth for DSL_REGISTRY');
  }
}
