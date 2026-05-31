import assert from 'node:assert/strict';
import { figureHandler } from '../../src/handlers/figure.js';

// Minimal state mock: state.one converts mdast nodes to hast nodes.
function makeState() {
  return {
    one(node, _parent) {
      if (!node) return null;
      if (node.type === 'text') return { type: 'text', value: node.value };
      if (node.type === 'paragraph') {
        return {
          type: 'element', tagName: 'p', properties: {},
          children: (node.children ?? []).map(c => this.one(c, node)).filter(Boolean),
        };
      }
      return null;
    },
  };
}

// Minimal figure vocabulary entry. Phase 5 slice 5a (2026-05-29):
// maps_to migrated from string to target-keyed object form;
// `mapAttributes` reads `def.maps_to[target]` per the lift.
const figVocab = {
  html_output: { element: 'figure' },
  enscribe_attributes: {
    id: { maps_to: { html: 'id' } },
    classes: { maps_to: { html: 'class' } },
    kwargs: {
      src:   { handled_by: 'handler' },
      alt:   { handled_by: 'handler' },
      align: { maps_to: { html: 'data-align' } },
      width: { maps_to: { html: 'data-width' } },
      type:  { maps_to: { html: 'data-figure-type' } },
    },
  },
};

function makeNode(kwargs = {}, content = []) {
  return {
    type: 'enscribeTag',
    tagname: 'figure',
    id: null,
    classes: [],
    kwargs,
    content,
  };
}

export function run() {
  const state = makeState();

  // --- image figure: src kwarg generates <img> and <figcaption> ---
  {
    const node = makeNode(
      { src: 'elephant.jpg' },
      [{ type: 'paragraph', children: [{ type: 'text', value: 'An elephant.' }] }],
    );
    const hast = figureHandler(state, node, figVocab);

    assert.equal(hast.tagName, 'figure');
    assert.equal(hast.children.length, 2, 'img + figcaption');
    const [img, figcaption] = hast.children;
    assert.equal(img.tagName, 'img');
    assert.equal(img.properties.src, 'elephant.jpg');
    assert.equal(img.properties.alt, 'An elephant.');
    assert.equal(figcaption.tagName, 'figcaption');
    assert.equal(figcaption.children[0].value, 'An elephant.');
    console.log('PASS: figure handler: image figure with src → img + figcaption');
  }

  // --- explicit alt overrides caption text ---
  {
    const node = makeNode(
      { src: 'x.jpg', alt: 'Explicit alt.' },
      [{ type: 'paragraph', children: [{ type: 'text', value: 'Caption text.' }] }],
    );
    const hast = figureHandler(state, node, figVocab);
    const img = hast.children[0];
    assert.equal(img.properties.alt, 'Explicit alt.', 'explicit alt takes priority');
    console.log('PASS: figure handler: explicit alt overrides caption fallback');
  }

  // --- non-image figure: no src → only figcaption ---
  {
    const node = makeNode(
      { type: 'code' },
      [{ type: 'paragraph', children: [{ type: 'text', value: 'A code listing.' }] }],
    );
    const hast = figureHandler(state, node, figVocab);

    assert.equal(hast.tagName, 'figure');
    assert.equal(hast.properties['data-figure-type'], 'code');
    const nonImg = hast.children.find(c => c.tagName === 'img');
    assert.equal(nonImg, undefined, 'no img element');
    const figcaption = hast.children.find(c => c.tagName === 'figcaption');
    assert.ok(figcaption, 'figcaption present');
    assert.equal(figcaption.children[0].value, 'A code listing.');
    console.log('PASS: figure handler: non-image figure → figcaption only');
  }

  // --- id and classes mapped to properties ---
  {
    const node = {
      ...makeNode({ src: 'img.jpg' }, [{ type: 'paragraph', children: [{ type: 'text', value: 'Cap.' }] }]),
      id: 'fig1',
      classes: ['wide'],
    };
    const hast = figureHandler(state, node, figVocab);
    assert.equal(hast.properties.id, 'fig1');
    assert.deepEqual(hast.properties.className, ['wide']);
    console.log('PASS: figure handler: id and classes mapped to properties');
  }

  // --- align kwarg → data-align ---
  {
    const node = makeNode(
      { align: 'right', src: 'x.jpg' },
      [{ type: 'paragraph', children: [{ type: 'text', value: 'Right-aligned.' }] }],
    );
    const hast = figureHandler(state, node, figVocab);
    assert.equal(hast.properties['data-align'], 'right');
    console.log('PASS: figure handler: align kwarg mapped to data-align');
  }

  // --- no content → empty figcaption not added ---
  {
    const node = makeNode({ src: 'x.jpg' }, []);
    const hast = figureHandler(state, node, figVocab);
    const figcaption = hast.children.find(c => c.tagName === 'figcaption');
    assert.equal(figcaption, undefined, 'no figcaption if no caption content');
    console.log('PASS: figure handler: empty content → no figcaption');
  }
}
