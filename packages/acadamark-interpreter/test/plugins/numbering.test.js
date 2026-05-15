import assert from 'node:assert/strict';
import { acadamarkNumbering } from '../../src/plugins/numbering.js';
import { makeTag } from '../../src/lib/ast-helpers.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDisplayMath(id = null, booleans = {}, kwargs = {}) {
  return {
    type: 'acadamarkTag',
    tagname: '$$',
    id,
    classes: [],
    kwargs,
    booleans,
    content: ' F = ma ',
    contentHandler: 'math-display',
    isOpaqueContent: true,
    positional: [],
  };
}

function makeFigure(id = null, booleans = {}, kwargs = {}) {
  return {
    type: 'acadamarkTag',
    tagname: 'figure',
    id,
    classes: [],
    kwargs,
    booleans,
    content: [{ type: 'paragraph', children: [{ type: 'text', value: 'Caption.' }] }],
    contentHandler: 'default',
    isOpaqueContent: false,
    positional: [],
  };
}

function makeArticleTree(...bodyChildren) {
  const body = makeTag('article-body', bodyChildren);
  const front = makeTag('article-front', []);
  const article = makeTag('article', [front, body]);
  return { type: 'root', children: [article] };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- numbered display-math gets computedNumber ---
  {
    const eq = makeDisplayMath('eqn:newton');
    const tree = makeArticleTree(eq);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    assert.equal(eq.computedNumber, 1, 'first equation is 1');
    assert.equal(eq.registryType, 'equation');
    console.log('PASS: numbering: display-math gets computedNumber=1');
  }

  // --- multiple equations number sequentially ---
  {
    const eq1 = makeDisplayMath('eqn:a');
    const eq2 = makeDisplayMath();
    const eq3 = makeDisplayMath('eqn:c');
    const tree = makeArticleTree(eq1, eq2, eq3);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    assert.equal(eq1.computedNumber, 1);
    assert.equal(eq2.computedNumber, 2);
    assert.equal(eq3.computedNumber, 3);
    console.log('PASS: numbering: multiple equations number sequentially');
  }

  // --- -numbered suppresses the number (booleans form) ---
  {
    const eq1 = makeDisplayMath('eqn:a');
    const eq2 = makeDisplayMath(null, { numbered: false });
    const eq3 = makeDisplayMath('eqn:c');
    const tree = makeArticleTree(eq1, eq2, eq3);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    assert.equal(eq1.computedNumber, 1);
    assert.equal(eq2.computedNumber, null, 'unnumbered eq has null computedNumber');
    assert.equal(eq3.computedNumber, 2, 'counter skips unnumbered eq');
    console.log('PASS: numbering: -numbered suppresses equation number');
  }

  // --- numbered=false (kwargs string form) also suppresses ---
  {
    const eq1 = makeDisplayMath('eqn:a');
    const eq2 = makeDisplayMath(null, {}, { numbered: 'false' });
    const tree = makeArticleTree(eq1, eq2);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    assert.equal(eq1.computedNumber, 1);
    assert.equal(eq2.computedNumber, null);
    console.log('PASS: numbering: numbered=false string form also suppresses');
  }

  // --- config number-equations=false suppresses all equations ---
  {
    const eq1 = makeDisplayMath('eqn:a');
    const eq2 = makeDisplayMath('eqn:b');
    const tree = makeArticleTree(eq1, eq2);
    const config = new Map([['number-equations', 'false']]);
    const file = { data: { acadamarkConfig: config } };
    acadamarkNumbering()(tree, file);

    assert.equal(eq1.computedNumber, null);
    assert.equal(eq2.computedNumber, null);
    console.log('PASS: numbering: config number-equations=false suppresses all');
  }

  // --- +numbered on an equation overrides config suppression ---
  {
    const eq1 = makeDisplayMath(null, { numbered: true });  // explicit +numbered
    const tree = makeArticleTree(eq1);
    const config = new Map([['number-equations', 'false']]);
    const file = { data: { acadamarkConfig: config } };
    acadamarkNumbering()(tree, file);

    assert.equal(eq1.computedNumber, 1, '+numbered overrides config=false');
    console.log('PASS: numbering: +numbered on tag overrides config suppression');
  }

  // --- figures are numbered independently from equations ---
  {
    const eq1 = makeDisplayMath('eqn:a');
    const fig1 = makeFigure('fig:scatter');
    const eq2 = makeDisplayMath('eqn:b');
    const fig2 = makeFigure('fig:bar');
    const tree = makeArticleTree(eq1, fig1, eq2, fig2);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    assert.equal(eq1.computedNumber, 1);
    assert.equal(eq2.computedNumber, 2);
    assert.equal(fig1.computedNumber, 1, 'figure counter is independent');
    assert.equal(fig2.computedNumber, 2);
    console.log('PASS: numbering: figures and equations have independent counters');
  }

  // --- colon-id equations are accessible via registry findByLabel ---
  {
    const eq = makeDisplayMath('eqn:newton');
    const tree = makeArticleTree(eq);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    const registry = file.data.acadamarkRegistry;
    assert.ok(registry, 'registry attached to file.data');
    const entry = registry.findByLabel('eqn:newton');
    assert.ok(entry, 'eqn:newton found in label index');
    assert.equal(entry.number, 1);
    assert.equal(entry.type, 'equation');
    console.log('PASS: numbering: colon-id registered in label index via file.data');
  }

  // --- equations inside sections are found and numbered ---
  {
    const eq = makeDisplayMath('eqn:inner');
    const section = makeTag('section', [eq]);
    const tree = makeArticleTree(section);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    assert.equal(eq.computedNumber, 1, 'equation inside section is numbered');
    console.log('PASS: numbering: equations inside sections are numbered');
  }

  // --- inline math ($) is not numbered ---
  {
    const inlineMath = {
      type: 'acadamarkTag', tagname: '$',
      id: null, classes: [], kwargs: {}, booleans: {},
      content: ' x^2 ', contentHandler: 'math', isOpaqueContent: true,
      positional: [],
    };
    const tree = makeArticleTree(inlineMath);
    const file = { data: {} };
    acadamarkNumbering()(tree, file);

    assert.equal(inlineMath.computedNumber, undefined, 'inline math not touched');
    console.log('PASS: numbering: inline math is not numbered');
  }
}
