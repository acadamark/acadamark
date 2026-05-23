import assert from 'node:assert/strict';
import { walkNormalize } from '../../src/lib/walk-normalize.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInlineMath(value) {
  return { type: 'inlineMath', value };
}

function makeParagraph(...children) {
  return { type: 'paragraph', children };
}

function makeText(value) {
  return { type: 'text', value };
}

function makeTag(tagname, content, isOpaqueContent = false) {
  return {
    type: 'acadamarkTag',
    tagname,
    content: isOpaqueContent ? content : (Array.isArray(content) ? content : null),
    isOpaqueContent,
  };
}

function makeTagWithChildren(tagname, children) {
  return {
    type: 'acadamarkTag',
    tagname,
    content: null,
    isOpaqueContent: false,
    children,
  };
}

function isPureMath(node) {
  return node.type === 'inlineMath';
}

function normalizeMath(node) {
  return { type: 'acadamarkTag', tagname: '$', content: node.value, isOpaqueContent: true };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function run() {

  // --- predicate matching: matching node is replaced ---
  {
    const math = makeInlineMath('x^2');
    const nodes = [math];
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].type, 'acadamarkTag');
    assert.equal(nodes[0].tagname, '$');
    assert.equal(nodes[0].content, 'x^2');
    console.log('PASS: walkNormalize: matching node is replaced');
  }

  // --- non-matching node is unchanged ---
  {
    const text = makeText('hello');
    const nodes = [text];
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].type, 'text');
    assert.equal(nodes[0].value, 'hello');
    console.log('PASS: walkNormalize: non-matching node is unchanged');
  }

  // --- in-place replacement (not a new array) ---
  {
    const math = makeInlineMath('a + b');
    const nodes = [math];
    const original = nodes;
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.strictEqual(nodes, original, 'same array object — in-place');
    assert.equal(nodes[0].tagname, '$');
    console.log('PASS: walkNormalize: replacement is in-place (same array)');
  }

  // --- mixed array: only matching nodes replaced ---
  {
    const nodes = [makeText('before'), makeInlineMath('y'), makeText('after')];
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0].type, 'text');
    assert.equal(nodes[1].type, 'acadamarkTag');
    assert.equal(nodes[2].type, 'text');
    console.log('PASS: walkNormalize: mixed array — only matching nodes replaced');
  }

  // --- descent into mdast .children ---
  {
    const math = makeInlineMath('z^2');
    const para = makeParagraph(makeText('foo'), math, makeText('bar'));
    const nodes = [para];
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.equal(para.children[0].type, 'text');
    assert.equal(para.children[1].type, 'acadamarkTag');
    assert.equal(para.children[1].content, 'z^2');
    assert.equal(para.children[2].type, 'text');
    console.log('PASS: walkNormalize: descends into mdast .children');
  }

  // --- descent into non-opaque acadamarkTag .content ---
  {
    const math = makeInlineMath('w');
    const aside = makeTag('aside', [makeText('text'), math], false);
    aside.content = [makeText('text'), math]; // non-opaque content array
    const nodes = [aside];
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.equal(aside.content[0].type, 'text');
    assert.equal(aside.content[1].type, 'acadamarkTag');
    assert.equal(aside.content[1].content, 'w');
    console.log('PASS: walkNormalize: descends into non-opaque acadamarkTag .content');
  }

  // --- does NOT descend into opaque acadamarkTag .content ---
  {
    // An opaque tag carries a string content (or would be a DSL payload).
    // We simulate it as an array to confirm walkNormalize does NOT touch it.
    const math = makeInlineMath('opaque');
    const opaqueTag = {
      type: 'acadamarkTag',
      tagname: '$',
      content: [math],    // array, but opaque — should NOT be descended into
      isOpaqueContent: true,
    };
    const nodes = [opaqueTag];
    walkNormalize(nodes, isPureMath, normalizeMath);
    // The math node inside opaque content must be untouched.
    assert.equal(opaqueTag.content[0].type, 'inlineMath', 'opaque content not descended');
    console.log('PASS: walkNormalize: does NOT descend into opaque acadamarkTag .content');
  }

  // --- multiple matches at same level all replaced ---
  {
    const nodes = [makeInlineMath('a'), makeInlineMath('b'), makeInlineMath('c')];
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0].content, 'a');
    assert.equal(nodes[1].content, 'b');
    assert.equal(nodes[2].content, 'c');
    console.log('PASS: walkNormalize: multiple matches at same level all replaced');
  }

  // --- deeply nested: paragraph inside non-opaque tag content ---
  {
    const math = makeInlineMath('deep');
    const para = makeParagraph(math);
    const aside = {
      type: 'acadamarkTag',
      tagname: 'aside',
      content: [para],
      isOpaqueContent: false,
    };
    const nodes = [aside];
    walkNormalize(nodes, isPureMath, normalizeMath);
    assert.equal(para.children[0].type, 'acadamarkTag');
    assert.equal(para.children[0].content, 'deep');
    console.log('PASS: walkNormalize: deeply nested: paragraph inside non-opaque tag content');
  }

  // --- replacement node is descended into (non-opaque replacement) ---
  {
    // A replacement with non-opaque children should itself be descended into.
    // Simulate: a wrapper node is normalized to a non-opaque tag whose content
    // contains another normalizable node.
    function isWrapper(node) { return node.type === 'wrapper'; }
    function normalizeWrapper(node) {
      // Returns a non-opaque acadamarkTag whose content is the wrapper's children.
      return {
        type: 'acadamarkTag',
        tagname: 'section',
        content: node.children ?? [],
        isOpaqueContent: false,
        children: undefined,
      };
    }
    const math = makeInlineMath('inner');
    const wrapper = { type: 'wrapper', children: [math] };
    const nodes = [wrapper];
    // Use isPureMath OR isWrapper as predicate.
    function combinedPred(node) { return node.type === 'wrapper' || node.type === 'inlineMath'; }
    function combinedNorm(node) {
      if (node.type === 'wrapper') return normalizeWrapper(node);
      return normalizeMath(node);
    }
    walkNormalize(nodes, combinedPred, combinedNorm);
    const section = nodes[0];
    assert.equal(section.type, 'acadamarkTag');
    assert.equal(section.tagname, 'section');
    // The inner inlineMath inside content should also have been normalized.
    assert.equal(section.content[0].type, 'acadamarkTag', 'inner math normalized after replacement descent');
    assert.equal(section.content[0].tagname, '$');
    console.log('PASS: walkNormalize: replacement node is descended into (non-opaque)');
  }

  // --- replacement node with opaque content: no further descent ---
  {
    // math replacement is opaque — after replacement, walkNormalize should not
    // attempt to descend into it (there is nothing to descend into anyway, but
    // the guard must not throw).
    const math = makeInlineMath('opaque-result');
    const nodes = [math];
    assert.doesNotThrow(() => walkNormalize(nodes, isPureMath, normalizeMath));
    assert.equal(nodes[0].type, 'acadamarkTag');
    assert.equal(nodes[0].isOpaqueContent, true);
    console.log('PASS: walkNormalize: opaque replacement — no further descent, no throw');
  }

  // --- empty array: no-op ---
  {
    const nodes = [];
    assert.doesNotThrow(() => walkNormalize(nodes, isPureMath, normalizeMath));
    assert.equal(nodes.length, 0);
    console.log('PASS: walkNormalize: empty array — no-op');
  }
}
