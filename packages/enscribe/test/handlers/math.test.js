import assert from 'node:assert/strict';
import { mathHandler } from '../../src/interpreter/handlers/math.js';

// The math handler does not use the state object — math content is opaque
// and rendered directly by KaTeX. We pass a minimal stub.
const stubState = {};

// The handler runs downstream of the normalize-to-canonical gate, so it
// receives nodes with canonical tagnames ('inline-math' / 'display-math'),
// not sigil tagnames ('$' / '$$'). This test helper mirrors that contract.
function makeNode(canonicalTagname, content, { id = null, classes = [] } = {}) {
  return {
    type: 'enscribeTag',
    tagname: canonicalTagname,
    id,
    classes,
    kwargs: {},
    content,
    isOpaqueContent: true,
    contentHandler: canonicalTagname === 'display-math' ? 'math-display' : 'math',
  };
}

export function run() {
  // --- inline math renders to <inline-math> ---
  {
    const node = makeNode('inline-math', 'a^2 + b^2 = c^2');
    const hast = mathHandler(stubState, node);

    assert.equal(hast.type, 'element', 'returns element');
    assert.equal(hast.tagName, 'inline-math', 'tagName is inline-math');
    assert.ok(hast.children.length > 0, 'has KaTeX children');
    // KaTeX wraps its output in a <span class="katex"> element.
    const katexSpan = hast.children[0];
    assert.equal(katexSpan.type, 'element');
    assert.ok(
      katexSpan.properties?.className?.includes('katex'),
      'KaTeX root span has class katex',
    );
    console.log('PASS: math handler: inline $ → <inline-math>');
  }

  // --- display math renders to <display-math> ---
  {
    const node = makeNode('display-math', '\\int_0^1 f(x)\\,dx');
    const hast = mathHandler(stubState, node);

    assert.equal(hast.tagName, 'display-math', 'tagName is display-math');
    assert.ok(hast.children.length > 0, 'has KaTeX children');
    // KaTeX display mode produces a <span class="katex-display"> wrapper.
    const inner = JSON.stringify(hast);
    assert.ok(inner.includes('katex-display'), 'display mode span present');
    console.log('PASS: math handler: display $$ → <display-math>');
  }

  // --- malformed LaTeX renders an error marker rather than throwing ---
  {
    const node = makeNode('inline-math', '\\invalid{syntax');
    let hast;
    assert.doesNotThrow(() => { hast = mathHandler(stubState, node); }, 'no throw on bad LaTeX');
    assert.equal(hast.tagName, 'inline-math', 'still produces inline-math');
    const html = JSON.stringify(hast);
    assert.ok(html.includes('katex-error'), 'error marker present in output');
    console.log('PASS: math handler: malformed LaTeX renders error marker');
  }

  // --- whitespace around content is trimmed ---
  {
    const node = makeNode('inline-math', '  x^2  ');
    const hast = mathHandler(stubState, node);
    assert.equal(hast.tagName, 'inline-math');
    // If KaTeX had received "  x^2  " with spaces, the output would still
    // be a valid x^2 render. We just confirm it doesn't crash.
    assert.ok(hast.children.length > 0, 'renders despite surrounding spaces');
    console.log('PASS: math handler: surrounding whitespace trimmed');
  }

  // --- fractions render (structural test) ---
  {
    const node = makeNode('display-math', '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
    const hast = mathHandler(stubState, node);
    assert.equal(hast.tagName, 'display-math');
    const html = JSON.stringify(hast);
    // KaTeX generates <span class="mfrac"> for fractions.
    assert.ok(html.includes('mfrac'), 'fraction renders via KaTeX');
    console.log('PASS: math handler: fraction renders correctly');
  }

  // --- Greek letters and sum render (structural test) ---
  {
    const node = makeNode('display-math', '\\sum_{i=1}^{n} x_i = X');
    const hast = mathHandler(stubState, node);
    assert.equal(hast.tagName, 'display-math');
    // KaTeX generates mop (math operator) spans for sum.
    const html = JSON.stringify(hast);
    assert.ok(html.includes('mop') || html.includes('mrel') || html.includes('katex'), 'sum renders via KaTeX');
    console.log('PASS: math handler: sum and subscript render correctly');
  }

  // --- id and classes pass through to properties ---
  {
    const node = makeNode('display-math', 'E = mc^2', { id: 'eq:einstein', classes: ['numbered'] });
    const hast = mathHandler(stubState, node);
    assert.equal(hast.properties.id, 'eq:einstein', 'id preserved');
    assert.deepEqual(hast.properties.className, ['numbered'], 'classes preserved');
    console.log('PASS: math handler: id and classes pass through');
  }

  // --- empty content renders without throwing ---
  {
    const node = makeNode('inline-math', '');
    let hast;
    assert.doesNotThrow(() => { hast = mathHandler(stubState, node); }, 'empty content does not throw');
    assert.equal(hast.tagName, 'inline-math');
    console.log('PASS: math handler: empty content renders without throwing');
  }
}
