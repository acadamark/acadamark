import assert from 'node:assert/strict';
import { citeMarkerHandler, citeErrorHandler, bibliographyHandler } from '../../src/handlers/cite.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCiteMarkerNode(keys, html) {
  return {
    type: 'acadamarkTag',
    tagname: '__cite-marker',
    id: null,
    classes: [],
    kwargs: { keys, html },
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

function makeCiteErrorNode(keys) {
  return {
    type: 'acadamarkTag',
    tagname: '__cite-error',
    id: null,
    classes: [],
    kwargs: { keys },
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

function makeBibliographyNode(headingHtml, bibBodyHtml) {
  return {
    type: 'acadamarkTag',
    tagname: '__bibliography',
    id: null,
    classes: [],
    kwargs: { headingHtml, bibBodyHtml },
    content: null,
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
    booleans: {},
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- __cite-marker renders as <cite class="cite"> with data-keys ---
  {
    const node = makeCiteMarkerNode('Smith2020', '(Smith, 2020)');
    const el = citeMarkerHandler(null, node);

    assert.equal(el.tagName, 'cite', 'element is <cite>');
    assert.ok(el.properties.className.includes('cite'), 'class includes "cite"');
    assert.ok(!el.properties.className.includes('cite-error'), 'class does not include "cite-error"');
    assert.equal(el.properties.dataKeys, 'Smith2020', 'data-keys set correctly');
    assert.equal(el.children.length, 1, 'one child');
    assert.equal(el.children[0].type, 'raw', 'child is raw node (HTML passthrough)');
    assert.equal(el.children[0].value, '(Smith, 2020)', 'citation HTML preserved');
    console.log('PASS: cite handler: __cite-marker renders correctly');
  }

  // --- __cite-marker with multi-key ---
  {
    const node = makeCiteMarkerNode('Jones2019,Smith2020', '(Jones, 2019; Smith, 2020)');
    const el = citeMarkerHandler(null, node);

    assert.equal(el.properties.dataKeys, 'Jones2019,Smith2020', 'multi-key in data-keys');
    assert.equal(el.children[0].value, '(Jones, 2019; Smith, 2020)', 'multi-key citation');
    console.log('PASS: cite handler: __cite-marker multi-key');
  }

  // --- __cite-error renders as <cite class="cite-error"> ---
  {
    const node = makeCiteErrorNode('MISSING');
    const el = citeErrorHandler(null, node);

    assert.equal(el.tagName, 'cite', 'element is <cite>');
    assert.ok(el.properties.className.includes('cite-error'), 'class includes "cite-error"');
    assert.ok(!el.properties.className.includes('cite'), 'class does not include "cite"');
    assert.equal(el.properties.dataKeys, 'MISSING', 'missing key in data-keys');
    assert.equal(el.children.length, 1, 'one child');
    assert.equal(el.children[0].type, 'text', 'child is text node');
    assert.equal(el.children[0].value, '??cite: MISSING??', 'visible error marker text');
    console.log('PASS: cite handler: __cite-error renders correctly');
  }

  // --- __cite-error with multiple missing keys ---
  {
    const node = makeCiteErrorNode('KeyA,KeyB');
    const el = citeErrorHandler(null, node);

    assert.equal(el.properties.dataKeys, 'KeyA,KeyB', 'multiple missing keys in data-keys');
    assert.equal(el.children[0].value, '??cite: KeyA,KeyB??', 'both missing keys in error text');
    console.log('PASS: cite handler: __cite-error multiple missing keys');
  }

  // --- __bibliography renders as <bibliography> with heading + raw HTML ---
  {
    const bibBody = '<div class="csl-bib-body"><div id="ref-Smith2020" data-csl-entry-id="Smith2020" class="csl-entry">Smith (2020)</div></div>';
    const node = makeBibliographyNode('<h2>References</h2>', bibBody);
    const el = bibliographyHandler(null, node);

    assert.equal(el.tagName, 'bibliography', 'element is <bibliography>');
    assert.equal(el.children.length, 1, 'one child (raw)');
    assert.equal(el.children[0].type, 'raw', 'child is raw node');
    assert.ok(el.children[0].value.includes('<h2>References</h2>'), 'heading in output');
    assert.ok(el.children[0].value.includes('id="ref-Smith2020"'), 'id= attribute present');
    assert.ok(el.children[0].value.includes('Smith (2020)'), 'bibliography entry present');
    console.log('PASS: cite handler: __bibliography renders correctly');
  }
}
