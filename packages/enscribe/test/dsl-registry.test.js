// Unit tests for the DSL registry — the language/type axis (core/dsl-registry.js).
//
// LANGUAGES is the flat identifier → content-handler map; getContentHandler()
// must resolve byte-identically to the pre-reshape map. These tests pin that
// output-neutrality (no render fixture can — it is a pure data model).
//
// Removed surfaces no longer tested here: the per-record `opaque` field, the
// derived `DSL_REGISTRY` export, and `isOpaqueLanguage` were removed in #175 as
// inert (opacity is derived by the parser as `contentHandler !== 'default'`,
// its only reader). The `(purpose, host)` bindings were removed earlier in #85.

import assert from 'node:assert/strict';
import { LANGUAGES, getContentHandler } from '../src/core/dsl-registry.js';

// The flat map, frozen here as the byte-identity oracle: identifier → handler,
// in insertion order. LANGUAGES and getContentHandler() must match. Entries are
// the pre-reshape (#175) map preserved entry-for-entry, plus deliberate additions
// (each a new opaque-content host) — including `['code-block','code-block']`,
// inserted next to its named-tag sibling `['code','code']` so the long-form
// `<code-block>` tag keeps its body opaque like the ``` sigil.
const EXPECTED = [
  ['$',        'math'],
  ['$$',       'math-display'],
  ['`',        'code'],
  ['```',      'code-block'],
  ['csv',      'csv'],
  ['tsv',      'tsv'],
  ['math',     'math'],
  ['code',     'code'],
  ['code-block', 'code-block'],
  ['mermaid',  'mermaid'],
  ['abc',      'abc'],
  ['diagram',  'diagram'],
  ['matrix',   'matrix'],
  ['cases',    'cases'],
  ['align',    'align'],
  ['eqnarray', 'eqnarray'],
  ['table',    'table'],
  ['library',  'library'],
  // #313 slice 1: the <dataset> storage host — an opaque payload (CSV/JSON/…) held
  // under an id for an @id consumer; a non-default handler so its bytes are never
  // markdown-parsed. The value is the opaque marker only (nothing dispatches off it).
  ['dataset',  'dataset'],
  ['svg',      'svg'],
  // #115: the minipage host — its sealed body is held opaque (raw source) at
  // parse time so the main pipeline never descends into it.
  ['minipage', 'minipage'],
];

export function run() {
  // --- Byte-identity: LANGUAGES equals the pre-reshape flat map, in order ---
  {
    assert.deepEqual([...LANGUAGES.entries()], EXPECTED,
      'LANGUAGES must equal the pre-reshape map, entry-for-entry and in order');
    console.log('PASS: LANGUAGES is byte-identical to the pre-reshape flat map');
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
}
