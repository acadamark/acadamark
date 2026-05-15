import assert from 'node:assert/strict';
import { codeBlockHandler } from '../../src/handlers/code-block.js';

// The code block handler does not use the state object — content is opaque.
const stubState = {};

function makeNode(content, { id = null, classes = [], positional = [] } = {}) {
  return {
    type: 'acadamarkTag',
    tagname: '```',
    id,
    classes,
    positional,
    kwargs: {},
    content,
    isOpaqueContent: true,
    contentHandler: 'code-block',
  };
}

export function run() {
  // --- language + id ---
  {
    const node = makeNode('def mult(a, b): return a * b', {
      positional: ['python'],
      id: 'code:mult',
    });
    const hast = codeBlockHandler(stubState, node);

    assert.equal(hast.type, 'element');
    assert.equal(hast.tagName, 'pre');
    assert.equal(hast.children.length, 1);
    const code = hast.children[0];
    assert.equal(code.tagName, 'code');
    assert.deepEqual(code.properties.className, ['language-python']);
    assert.equal(code.properties.id, 'code:mult');
    assert.equal(code.children[0].value, 'def mult(a, b): return a * b');
    console.log('PASS: code-block handler: language + id → <pre><code class=language-python id=...>');
  }

  // --- language only ---
  {
    const node = makeNode('x = 1', { positional: ['python'] });
    const hast = codeBlockHandler(stubState, node);

    const code = hast.children[0];
    assert.deepEqual(code.properties.className, ['language-python']);
    assert.equal(code.properties.id, undefined);
    console.log('PASS: code-block handler: language only → class language-python, no id');
  }

  // --- id only (no language) ---
  {
    const node = makeNode('content here', { id: 'my-snippet' });
    const hast = codeBlockHandler(stubState, node);

    const code = hast.children[0];
    assert.equal(code.properties.className, undefined);
    assert.equal(code.properties.id, 'my-snippet');
    console.log('PASS: code-block handler: id only (no language) → id on <code>');
  }

  // --- language + classes combine on <code> ---
  {
    const node = makeNode('print("hi")', {
      positional: ['python'],
      classes: ['highlighted'],
    });
    const hast = codeBlockHandler(stubState, node);

    const code = hast.children[0];
    // language class comes first, then sigil classes
    assert.deepEqual(code.properties.className, ['language-python', 'highlighted']);
    console.log('PASS: code-block handler: language class prepended before sigil classes');
  }

  // --- no pipe (opaque body, no language, no id) ---
  {
    const node = makeNode(' this is all content ');
    const hast = codeBlockHandler(stubState, node);

    const code = hast.children[0];
    assert.equal(code.properties.className, undefined);
    assert.equal(code.properties.id, undefined);
    assert.equal(code.children[0].value, ' this is all content ');
    console.log('PASS: code-block handler: no-pipe form → plain <pre><code>');
  }

  // --- empty pipe (no language, no attributes) ---
  {
    const node = makeNode(' content ');
    const hast = codeBlockHandler(stubState, node);

    const code = hast.children[0];
    assert.equal(code.properties.className, undefined);
    assert.equal(code.children[0].value, ' content ');
    console.log('PASS: code-block handler: empty-pipe form → plain <pre><code>');
  }

  // --- pre element has no id or class (attributes go on code) ---
  {
    const node = makeNode('x = 1', { id: 'foo', positional: ['python'] });
    const hast = codeBlockHandler(stubState, node);

    assert.equal(hast.tagName, 'pre');
    assert.deepEqual(hast.properties, {}, 'pre has no properties');
    console.log('PASS: code-block handler: id goes on <code>, not <pre>');
  }

  // --- multiline content preserved ---
  {
    const content = 'def f():\n    return 1';
    const node = makeNode(content, { positional: ['python'] });
    const hast = codeBlockHandler(stubState, node);

    const code = hast.children[0];
    assert.equal(code.children[0].value, content, 'newlines preserved');
    console.log('PASS: code-block handler: multiline content preserved verbatim');
  }
}
