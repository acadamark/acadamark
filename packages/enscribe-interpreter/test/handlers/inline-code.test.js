import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '@enscribejs/remark';
import { inlineCodeHandler } from '../../src/handlers/inline-code.js';

// The inline code handler does not use the state object — content is opaque.
const stubState = {};

function makeNode(content, { id = null, classes = [], positional = [] } = {}) {
  return {
    type: 'enscribeTag',
    tagname: '`',
    id,
    classes,
    positional,
    kwargs: {},
    content,
    isOpaqueContent: true,
    contentHandler: 'code',
  };
}

export function run() {
  // --- no attributes (no-pipe form) ---
  {
    const node = makeNode(' x = 1 ');
    const hast = inlineCodeHandler(stubState, node);

    assert.equal(hast.type, 'element');
    assert.equal(hast.tagName, 'code');
    assert.equal(hast.properties.className, undefined);
    assert.equal(hast.properties.id, undefined);
    assert.equal(hast.children[0].value, ' x = 1 ');
    console.log('PASS: inline-code handler: no-pipe form → plain <code>content</code>');
  }

  // --- id only ---
  {
    const node = makeNode(' x = 1 ', { id: 'my-snippet' });
    const hast = inlineCodeHandler(stubState, node);

    assert.equal(hast.tagName, 'code');
    assert.equal(hast.properties.id, 'my-snippet');
    assert.equal(hast.properties.className, undefined);
    assert.equal(hast.children[0].value, ' x = 1 ');
    console.log('PASS: inline-code handler: id only → <code id="my-snippet">');
  }

  // --- class only ---
  {
    const node = makeNode(' x = 1 ', { classes: ['highlighted'] });
    const hast = inlineCodeHandler(stubState, node);

    assert.deepEqual(hast.properties.className, ['highlighted']);
    assert.equal(hast.properties.id, undefined);
    console.log('PASS: inline-code handler: class only → <code class="highlighted">');
  }

  // --- id + class ---
  {
    const node = makeNode(' x = 1 ', { id: 'my-snippet', classes: ['highlighted'] });
    const hast = inlineCodeHandler(stubState, node);

    assert.equal(hast.properties.id, 'my-snippet');
    assert.deepEqual(hast.properties.className, ['highlighted']);
    console.log('PASS: inline-code handler: id + class → <code id="..." class="...">');
  }

  // --- language only ---
  {
    const node = makeNode(' factorial(n) ', { positional: ['python'] });
    const hast = inlineCodeHandler(stubState, node);

    assert.deepEqual(hast.properties.className, ['language-python']);
    assert.equal(hast.properties.id, undefined);
    console.log('PASS: inline-code handler: language → class language-python, no id');
  }

  // --- language + id ---
  {
    const node = makeNode(' factorial(n) ', {
      positional: ['python'],
      id: 'code:factorial',
    });
    const hast = inlineCodeHandler(stubState, node);

    assert.deepEqual(hast.properties.className, ['language-python']);
    assert.equal(hast.properties.id, 'code:factorial');
    console.log('PASS: inline-code handler: language + id → language class + id on <code>');
  }

  // --- language + classes combine ---
  {
    const node = makeNode(' factorial(n) ', {
      positional: ['python'],
      classes: ['highlighted'],
    });
    const hast = inlineCodeHandler(stubState, node);

    // language class comes first, then sigil classes
    assert.deepEqual(hast.properties.className, ['language-python', 'highlighted']);
    console.log('PASS: inline-code handler: language class prepended before sigil classes');
  }

  // --- empty pipe (no language, no attributes) ---
  {
    const node = makeNode('', { positional: [] });
    const hast = inlineCodeHandler(stubState, node);

    assert.equal(hast.tagName, 'code');
    assert.equal(hast.children[0].value, '');
    assert.equal(hast.properties.className, undefined);
    console.log('PASS: inline-code handler: empty-pipe form → <code></code>');
  }

  // --- output shape: single <code> element (not wrapped in <pre>) ---
  {
    const node = makeNode('some code', { positional: ['js'] });
    const hast = inlineCodeHandler(stubState, node);

    // Must be a bare <code>, not <pre><code>. One child element (text node).
    assert.equal(hast.tagName, 'code');
    assert.equal(hast.children.length, 1);
    assert.equal(hast.children[0].type, 'text');
    console.log('PASS: inline-code handler: output is bare <code>, not <pre><code>');
  }

  // --- regression: markdown plain backtick is unaffected ---
  // Verifies that the micromark extension does not intercept standard markdown
  // backtick spans. Plain `code` must still produce inlineCode mdast nodes via
  // remark's default handling.
  {
    const tree = unified()
      .use(remarkParse)
      .use(remarkEnscribe)
      .parse('Some `code` here.');

    const para = tree.children[0];
    assert.equal(para.type, 'paragraph');
    // paragraph should have text + inlineCode + text
    const inlineCode = para.children.find(c => c.type === 'inlineCode');
    assert.ok(inlineCode, 'expected inlineCode node from plain markdown backtick');
    assert.equal(inlineCode.value, 'code');
    console.log('PASS: inline-code handler: markdown plain backtick unaffected (stays inlineCode)');
  }
}
