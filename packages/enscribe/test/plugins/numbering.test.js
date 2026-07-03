import assert from 'node:assert/strict';
import { enscribeNumbering, fillNumbering } from '../../src/interpreter/plugins/numbering.js';
import { enscribeRefResolution } from '../../src/interpreter/plugins/ref-resolution.js';
import { ensureRegistry } from '../../src/core/registry.js';
import { makeTag } from '../../src/core/tag.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDisplayMath(id = null, booleans = {}, kwargs = {}) {
  return {
    // Post-normalize-to-canonical gate: tagname is the canonical eHTML
    // vocabulary key ('display-math'), not the sigil token ('$$').
    type: 'enscribeTag',
    tagname: 'display-math',
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
    type: 'enscribeTag',
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
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

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
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

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
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

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
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

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
    const file = { data: { enscribeConfig: config } };
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

    assert.equal(eq1.computedNumber, null);
    assert.equal(eq2.computedNumber, null);
    console.log('PASS: numbering: config number-equations=false suppresses all');
  }

  // --- +numbered on an equation overrides config suppression ---
  {
    const eq1 = makeDisplayMath(null, { numbered: true });  // explicit +numbered
    const tree = makeArticleTree(eq1);
    const config = new Map([['number-equations', 'false']]);
    const file = { data: { enscribeConfig: config } };
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

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
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

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
    enscribeNumbering()(tree, file);
    const registry = file.data.enscribeRegistry;
    registry.numberRegistry();
    fillNumbering(file);

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
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

    assert.equal(eq.computedNumber, 1, 'equation inside section is numbered');
    console.log('PASS: numbering: equations inside sections are numbered');
  }

  // --- inline math ($) is not numbered ---
  {
    const inlineMath = {
      type: 'enscribeTag', tagname: 'inline-math',
      id: null, classes: [], kwargs: {}, booleans: {},
      content: ' x^2 ', contentHandler: 'math', isOpaqueContent: true,
      positional: [],
    };
    const tree = makeArticleTree(inlineMath);
    const file = { data: {} };
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

    assert.equal(inlineMath.computedNumber, undefined, 'inline math not touched');
    console.log('PASS: numbering: inline math is not numbered');
  }

  // ─── R2: section registration (AUD-09) ────────────────────────────────────

  // --- section with colon-id is registered in label index ---
  {
    const section = makeTag('section', [], { id: 'sec:intro' });
    const tree = makeArticleTree(section);
    const file = { data: {} };
    enscribeNumbering()(tree, file);
    const registry = ensureRegistry(file);
    registry.numberRegistry();

    const entry = registry.findByLabel('sec:intro');
    assert.ok(entry, 'sec:intro found in label index');
    assert.equal(entry.type, 'section');
    assert.equal(entry.numbered, false, 'section is not numbered');
    assert.equal(entry.number, null, 'number is null for unnumbered entries');
    console.log('PASS: numbering: section with colon-id registered in label index');
  }

  // --- section registration document order ---
  {
    // Outer section, sub-section nested inside, second outer section.
    const sub = makeTag('sub-section', [], { id: 'sec:methods-sub' });
    const sec1 = makeTag('section', [sub], { id: 'sec:methods' });
    const sec2 = makeTag('section', [], { id: 'sec:results' });
    const tree = makeArticleTree(sec1, sec2);
    const file = { data: {} };
    enscribeNumbering()(tree, file);
    const registry = ensureRegistry(file);
    registry.numberRegistry();

    // All three sections must be registered.
    assert.ok(registry.findByLabel('sec:methods'), 'sec:methods registered');
    assert.ok(registry.findByLabel('sec:methods-sub'), 'sec:methods-sub registered');
    assert.ok(registry.findByLabel('sec:results'), 'sec:results registered');

    // Insertion order (= document order): methods, methods-sub, results.
    const entries = registry.entries('section');
    assert.equal(entries[0].id, 'sec:methods');
    assert.equal(entries[1].id, 'sec:methods-sub');
    assert.equal(entries[2].id, 'sec:results');
    console.log('PASS: numbering: sections registered in document order');
  }

  // --- <ref @sec:intro> resolves after section registration (AUD-09 end-to-end) ---
  {
    const ref = {
      type: 'enscribeTag', tagname: 'ref',
      id: null, atRefs: ['sec:intro'], classes: [], kwargs: {}, booleans: {},
      content: null, contentHandler: 'default', isOpaqueContent: false,
      positional: [],
    };
    const section = makeTag('section', [], { id: 'sec:intro' });
    const body = makeTag('article-body', [section, { type: 'paragraph', children: [ref] }]);
    const front = makeTag('article-front', []);
    const article = makeTag('article', [front, body]);
    const tree = { type: 'root', children: [article] };
    const file = { data: {} };

    // Run numbering (registers section) + apply numbers + ref-resolution.
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    enscribeRefResolution()(tree, file);

    // The ref node must be replaced with __ref-marker, not __ref-error.
    const paraChildren = tree.children[0].content[1].content[1].children;
    const resolved = paraChildren[0];
    assert.equal(resolved.tagname, '__ref-marker',
      `expected __ref-marker, got ${resolved.tagname}`);
    assert.equal(resolved.kwargs.targetId, 'sec:intro');
    // Unnumbered section: display text is the label-tail ("intro").
    assert.equal(resolved.kwargs.text, 'intro',
      'unnumbered section ref uses label-tail as text');
    console.log('PASS: numbering/ref-resolution: <ref @sec:intro> resolves (AUD-09)');
  }

  // ─── R2: isOpaqueContent guard ────────────────────────────────────────────

  // --- numbered element inside opaque-content node is NOT registered ---
  {
    // Wrap a figure inside a node that has isOpaqueContent: true.
    // The shared discover() walk skips .content on opaque nodes, so the
    // figure must not appear in the registry.
    const innerFigure = makeFigure('fig:trapped');
    const opaqueWrapper = {
      type: 'enscribeTag', tagname: 'custom-opaque',
      id: null, classes: [], kwargs: {}, booleans: {},
      content: [innerFigure],
      contentHandler: 'custom',
      isOpaqueContent: true,
      positional: [],
    };
    const tree = makeArticleTree(opaqueWrapper);
    const file = { data: {} };
    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    fillNumbering(file);

    // The figure inside the opaque node must NOT be registered.
    const registry = ensureRegistry(file);
    assert.equal(registry.entries('figure').length, 0,
      'figure inside opaque content is not registered');
    assert.equal(innerFigure.computedNumber, undefined,
      'figure inside opaque content has no computedNumber');
    console.log('PASS: numbering: figure inside opaque content is not registered (isOpaqueContent guard)');
  }

  // ─── G4 PG-6: code-block sigil registration ───────────────────────────────

  // --- code sigil with colon-id is registered and findable by label ---
  {
    const codeNode = {
      type: 'enscribeTag',
      tagname: 'code-block',
      id: 'code:snippet',
      classes: [],
      kwargs: {},
      booleans: {},
      content: 'def hello(): pass',
      contentHandler: 'code-block',
      isOpaqueContent: true,
      positional: ['python'],
    };
    const tree = makeArticleTree(codeNode);
    const file = { data: {} };
    enscribeNumbering()(tree, file);
    const registry = ensureRegistry(file);
    registry.numberRegistry();

    const entry = registry.findByLabel('code:snippet');
    assert.ok(entry !== null, 'code:snippet found in label index');
    assert.equal(entry.type, 'code', 'entry type is "code"');
    assert.equal(entry.id, 'code:snippet');
    assert.equal(entry.number, null, 'code blocks are unnumbered (numbered: false)');
    assert.equal(entry.numbered, false);
    console.log('PASS: numbering: code-block sigil with colon-id registers and is label-indexed (PG-6)');
  }

  // --- code sigil with no id registers but is NOT label-indexed ---
  {
    const codeNode = {
      type: 'enscribeTag',
      tagname: 'code-block',
      id: null,
      classes: [],
      kwargs: {},
      booleans: {},
      content: 'x = 1',
      contentHandler: 'code-block',
      isOpaqueContent: true,
      positional: [],
    };
    const tree = makeArticleTree(codeNode);
    const file = { data: {} };
    enscribeNumbering()(tree, file);
    const registry = ensureRegistry(file);
    registry.numberRegistry();

    // Auto-id 'code-1' has no colon — not in label index.
    assert.equal(registry.findByLabel('code-1'), null, 'auto-id code-1 not label-indexed');
    // But the entry exists in the type entries.
    assert.equal(registry.entries('code').length, 1, 'one code entry registered');
    assert.equal(registry.entries('code')[0].id, 'code-1', 'auto-id is code-1');
    console.log('PASS: numbering: code-block sigil with no id registers but is not label-indexed (PG-6)');
  }

  // --- code sigil with non-colon id registers but is NOT label-indexed ---
  {
    const codeNode = {
      type: 'enscribeTag',
      tagname: 'code-block',
      id: 'mycode',
      classes: [],
      kwargs: {},
      booleans: {},
      content: 'y = 2',
      contentHandler: 'code-block',
      isOpaqueContent: true,
      positional: [],
    };
    const tree = makeArticleTree(codeNode);
    const file = { data: {} };
    enscribeNumbering()(tree, file);
    const registry = ensureRegistry(file);
    registry.numberRegistry();

    assert.equal(registry.findByLabel('mycode'), null, 'non-colon id not label-indexed');
    assert.equal(registry.entries('code')[0].id, 'mycode', 'non-colon id stored in type entries');
    console.log('PASS: numbering: code-block sigil with non-colon id not label-indexed (PG-6)');
  }

  // --- <ref @code:snippet> resolves after code-block registration (PG-6 end-to-end) ---
  {
    const ref = {
      type: 'enscribeTag', tagname: 'ref',
      id: null, atRefs: ['code:snippet'], classes: [], kwargs: {}, booleans: {},
      content: null, contentHandler: 'default', isOpaqueContent: false,
      positional: [],
    };
    const codeNode = {
      type: 'enscribeTag',
      tagname: 'code-block',
      id: 'code:snippet',
      classes: [],
      kwargs: {},
      booleans: {},
      content: 'def hello(): pass',
      contentHandler: 'code-block',
      isOpaqueContent: true,
      positional: ['python'],
    };
    const body = makeTag('article-body', [codeNode, { type: 'paragraph', children: [ref] }]);
    const front = makeTag('article-front', []);
    const article = makeTag('article', [front, body]);
    const tree = { type: 'root', children: [article] };
    const file = { data: {} };

    enscribeNumbering()(tree, file);
    ensureRegistry(file).numberRegistry();
    enscribeRefResolution()(tree, file);

    const paraChildren = tree.children[0].content[1].content[1].children;
    const resolved = paraChildren[0];
    assert.equal(resolved.tagname, '__ref-marker',
      `expected __ref-marker, got ${resolved.tagname}`);
    assert.equal(resolved.kwargs.targetId, 'code:snippet');
    // Code block is unnumbered: display text is the label-tail ("snippet").
    assert.equal(resolved.kwargs.text, 'snippet',
      'unnumbered code-block ref uses label-tail as text');
    console.log('PASS: numbering/ref-resolution: <ref @code:snippet> resolves (PG-6 end-to-end)');
  }
}
