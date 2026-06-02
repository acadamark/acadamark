// Unit tests for mapAttributes (core/map-attributes.js), focused on the
// boolean-attribute branch added for issue #1 (schema-dispatched elements were
// silently dropping their +flag / -flag booleans because mapAttributes walked
// id / classes / kwargs but never node.booleans).
//
// No vocab element currently declares a schema-mapped boolean (every declared
// boolean is handled_by: 'handler'), so the bug is latent and cannot be shown
// with a real fixture. This exercises the mechanism with a synthetic vocab —
// the same shape a future schema-element boolean would use.

import assert from 'node:assert/strict';
import { mapAttributes } from '../src/core/map-attributes.js';
import { htmlEmit, aggregateHtmlProps } from '../src/interpreter/lib/html-emit.js';

const VOCAB = {
  enscribe_attributes: {
    kwargs: {
      width: { maps_to: { html: 'width' } },
    },
    booleans: {
      // A schema-mapped boolean (the future shape this fix targets).
      reversed: { maps_to: { html: 'reversed' } },
      // A handler-strategy flag — must be skipped here, never double-mapped.
      numbered: { handled_by: 'handler', maps_to: { html: 'data-numbered' } },
      // A boolean with no maps_to — must be skipped.
      plain: { default: true },
    },
  },
};

const props = (node) => aggregateHtmlProps(mapAttributes(node, VOCAB, 'html', htmlEmit));

export function run() {
  // true schema boolean → its attribute is present (the bug: it was absent).
  assert.equal(props({ booleans: { reversed: true } }).reversed, true,
    'true schema boolean maps to its attribute');

  // false schema boolean → omitted (HTML boolean-attribute semantics).
  assert.equal('reversed' in props({ booleans: { reversed: false } }), false,
    'false schema boolean is omitted');

  // handled_by: handler → skipped (must not be double-mapped against the handler).
  assert.equal('data-numbered' in props({ booleans: { numbered: true } }), false,
    'handler-strategy boolean is skipped by mapAttributes');

  // boolean without maps_to → skipped.
  assert.equal(Object.keys(props({ booleans: { plain: true } })).length, 0,
    'boolean without maps_to is skipped');

  // kwargs still map alongside the new boolean branch (regression guard).
  assert.equal(props({ kwargs: { width: '5' } }).width, '5',
    'kwargs still map after the boolean branch was added');

  console.log('PASS: map-attributes: boolean branch maps true, omits false, skips handler / no-maps_to');
}
