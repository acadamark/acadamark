// Unit tests for the host accept-set lookup (interpreter/lib/host-accept-sets.js),
// issue #22 slice 2. The host/role axis: "is language L valid for host H?".
// Slice 2 wires `table` only; these tests pin that wiring and the unknown-host
// behavior, without turning the lookup on in production dispatch.

import assert from 'node:assert/strict';
import { hostAcceptsLanguage, HOST_ACCEPT_SETS } from '../../src/interpreter/lib/host-accept-sets.js';
import { TABLE_FORMATS } from '../../src/interpreter/handlers/table.js';

export function run() {
  // --- table host: accept-set is the table handler's format list ---
  {
    assert.deepEqual([...TABLE_FORMATS], ['csv', 'tsv', 'json', 'yaml', 'md'],
      'TABLE_FORMATS is the table host accept-set (source of truth: the handler)');
    for (const format of TABLE_FORMATS) {
      assert.equal(hostAcceptsLanguage('table', format), true,
        `table host must accept ${format}`);
    }
    console.log('PASS: table host accepts each of its declared formats');
  }

  // --- table host rejects non-formats ---
  {
    assert.equal(hostAcceptsLanguage('table', 'mermaid'), false,
      'table does not accept a diagram language');
    assert.equal(hostAcceptsLanguage('table', 'bogus'), false);
    assert.equal(hostAcceptsLanguage('table', ''), false);
    console.log('PASS: table host rejects languages outside its accept-set');
  }

  // --- unknown / not-yet-wired hosts admit nothing (slice 3 wires them) ---
  {
    assert.equal(hostAcceptsLanguage('diagram', 'mermaid'), false,
      'diagram host is not wired this slice → admits nothing yet');
    assert.equal(hostAcceptsLanguage('fig', 'svg'), false);
    assert.equal(hostAcceptsLanguage('nonexistent-host', 'csv'), false);
    console.log('PASS: unknown/not-yet-wired hosts admit nothing');
  }

  // --- the map wires exactly `table` this slice ---
  {
    assert.deepEqual([...HOST_ACCEPT_SETS.keys()], ['table'],
      'slice 2 wires only the table host');
    console.log('PASS: HOST_ACCEPT_SETS wires only `table` (slice 2 scope)');
  }
}
