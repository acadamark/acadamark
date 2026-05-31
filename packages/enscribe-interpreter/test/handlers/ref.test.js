import assert from 'node:assert/strict';
import { refMarkerHandler, refErrorHandler } from '../../src/handlers/ref.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRefMarker(targetId, text) {
  return {
    type: 'enscribeTag',
    tagname: '__ref-marker',
    id: null,
    classes: [],
    kwargs: { targetId, text },
    booleans: {},
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
  };
}

function makeRefError(targetId) {
  return {
    type: 'enscribeTag',
    tagname: '__ref-error',
    id: null,
    classes: [],
    kwargs: { targetId },
    booleans: {},
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- equation ref renders as "equation N" with href ---
  {
    const node = makeRefMarker('eqn:newton', 'equation 3');
    const el = refMarkerHandler(null, node);

    assert.equal(el.tagName, 'a');
    assert.equal(el.properties.href, '#eqn:newton');
    assert.ok(el.properties.className.includes('ref'), 'class is "ref"');
    assert.equal(el.children[0].value, 'equation 3', 'equation label is "equation N"');
    console.log('PASS: ref handler: equation ref renders "equation N" with href');
  }

  // --- figure ref renders as "figure N" ---
  {
    const node = makeRefMarker('fig:scatter', 'figure 1');
    const el = refMarkerHandler(null, node);

    assert.equal(el.tagName, 'a');
    assert.equal(el.children[0].value, 'figure 1', 'figure label is "figure N"');
    assert.equal(el.properties.href, '#fig:scatter');
    console.log('PASS: ref handler: figure ref renders "figure N"');
  }

  // --- note ref renders as "note N" ---
  {
    const node = makeRefMarker('note:galton', 'note 2');
    const el = refMarkerHandler(null, node);

    assert.equal(el.children[0].value, 'note 2', 'note label is "note N"');
    console.log('PASS: ref handler: note ref renders "note N"');
  }

  // --- config-overridden prefix: handler just uses the pre-computed text ---
  {
    // The text is pre-computed by ref-resolution with the config override applied.
    // The handler itself just renders whatever text it receives.
    const node = makeRefMarker('eqn:newton', 'Eq. 1');
    const el = refMarkerHandler(null, node);

    assert.equal(el.children[0].value, 'Eq. 1', 'config-overridden prefix rendered verbatim');
    console.log('PASS: ref handler: config-overridden prefix rendered verbatim');
  }

  // --- unnumbered labeled ref uses label-tail text ---
  {
    // entry.number was null — ref-resolution computed label-tail as text.
    const node = makeRefMarker('eqn:energy', 'energy');
    const el = refMarkerHandler(null, node);

    assert.equal(el.tagName, 'a');
    assert.equal(el.properties.href, '#eqn:energy');
    assert.equal(el.children[0].value, 'energy', 'unnumbered labeled ref uses label-tail');
    console.log('PASS: ref handler: unnumbered labeled ref renders label-tail');
  }

  // --- error ref renders as ??ref: id?? anchor ---
  {
    const node = makeRefError('eqn:missing');
    const el = refErrorHandler(null, node);

    assert.equal(el.tagName, 'a', 'error is an anchor element');
    assert.ok(el.properties.className.includes('ref-error'), 'class is "ref-error"');
    assert.equal(el.properties.href, '#eqn:missing');
    assert.equal(el.children[0].value, '??ref: eqn:missing??');
    console.log('PASS: ref handler: error ref renders "??ref: id??" anchor');
  }

  // --- error ref with no target id uses fallback ---
  {
    const node = makeRefError('(none)');
    const el = refErrorHandler(null, node);

    assert.equal(el.tagName, 'a');
    assert.equal(el.children[0].value, '??ref: (none)??');
    console.log('PASS: ref handler: no-target error renders with fallback id');
  }
}

