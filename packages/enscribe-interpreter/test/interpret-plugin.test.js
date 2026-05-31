import assert from 'node:assert/strict';
import { toHast } from 'mdast-util-to-hast';
import { enscribeTagHandler } from '../src/interpret-plugin.js';
import { makeTag } from '@enscribejs/core/tag';

function hast(node) {
  return toHast(
    { type: 'root', children: [node] },
    { handlers: { enscribeTag: enscribeTagHandler } },
  ).children[0];
}

function makeAcadaTag(tagname, content = [], kwargs = {}) {
  return makeTag(tagname, content, { kwargs });
}

// Helper: mdast paragraph node
function para(value) {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

export function run() {
  // --- schema dispatch: <p | text> ---
  {
    const node = makeAcadaTag('p', [para('Hello world.')]);
    const h = hast(node);
    assert.equal(h.tagName, 'p');
    // Paragraph should be unwrapped (prose type): children are inline nodes
    assert.equal(h.children[0].type, 'text');
    assert.equal(h.children[0].value, 'Hello world.');
    console.log('PASS: interpret-plugin: <p> → <p> with unwrapped text');
  }

  // --- schema dispatch: <em> ---
  {
    const node = makeAcadaTag('em', [para('emphasis')]);
    const h = hast(node);
    assert.equal(h.tagName, 'em');
    assert.equal(h.children[0].value, 'emphasis');
    console.log('PASS: interpret-plugin: <em> → <em>');
  }

  // --- schema dispatch: <strong> ---
  {
    const node = makeAcadaTag('strong', [para('bold')]);
    const h = hast(node);
    assert.equal(h.tagName, 'strong');
    console.log('PASS: interpret-plugin: <strong> → <strong>');
  }

  // --- schema dispatch: <section> ---
  {
    // After section-nesting, section has section-title + body content.
    // Simulate that state here.
    const titleNode = makeAcadaTag('section-title', [{ type: 'text', value: 'Intro' }]);
    const bodyPara = para('Body text.');
    const node = makeAcadaTag('section', [titleNode, bodyPara]);
    const h = hast(node);
    assert.equal(h.tagName, 'section');
    assert.equal(h.children[0].tagName, 'section-title');
    assert.equal(h.children[1].tagName, 'p');
    console.log('PASS: interpret-plugin: <section> → <section> with section-title + p');
  }

  // --- schema dispatch: <article> wrapping front/body/back ---
  {
    const front = makeAcadaTag('article-front', []);
    const body  = makeAcadaTag('article-body', [para('Paragraph.')]);
    const back  = makeAcadaTag('article-back', []);
    const node = makeAcadaTag('article', [front, body, back]);
    const h = hast(node);
    assert.equal(h.tagName, 'article');
    assert.equal(h.children[0].tagName, 'article-front');
    assert.equal(h.children[1].tagName, 'article-body');
    assert.equal(h.children[2].tagName, 'article-back');
    console.log('PASS: interpret-plugin: <article> with regions');
  }

  // --- attribute mapping: id, classes, kwarg ---
  {
    const node = {
      ...makeAcadaTag('section', []),
      id: 'methods',
      classes: ['numbered'],
      kwargs: { 'sec-type': 'methods' },
    };
    const h = hast(node);
    assert.equal(h.properties.id, 'methods');
    assert.deepEqual(h.properties.className, ['numbered']);
    assert.equal(h.properties['data-sec-type'], 'methods');
    console.log('PASS: interpret-plugin: id, class, kwarg attribute mapping');
  }

  // --- unknown tag → escaped literal text (no span, no HTML passthrough) ---
  {
    const node = makeAcadaTag('not-a-real-tag', [para('content')]);
    const h = hast(node);
    const arr = Array.isArray(h) ? h : [h];
    // Renders as literal text nodes (the serializer escapes `<`/`>`), opener
    // first, no data-enscribe-unknown span anywhere.
    assert.ok(
      arr.some(n => n.type === 'text' && n.value.startsWith('<not-a-real-tag')),
      'unknown tag renders its opener as literal text',
    );
    assert.ok(
      !arr.some(n => n.type === 'element' && n.properties?.['data-enscribe-unknown']),
      'unknown tag no longer produces a data-enscribe-unknown span',
    );
    console.log('PASS: interpret-plugin: unknown tag → escaped literal text');
  }

  // --- handler dispatch: <figure> with src ---
  {
    const node = makeAcadaTag(
      'figure',
      [para('An elephant.')],
      { src: 'elephant.jpg' },
    );
    const h = hast(node);
    assert.equal(h.tagName, 'figure');
    const img = h.children.find(c => c.tagName === 'img');
    assert.ok(img, 'figure with src should have img child');
    assert.equal(img.properties.src, 'elephant.jpg');
    console.log('PASS: interpret-plugin: <figure src=...> dispatches to figure handler');
  }

  // --- <hr> → void element ---
  {
    const node = makeAcadaTag('hr', null);
    const h = hast(node);
    assert.equal(h.tagName, 'hr');
    assert.equal(h.children.length, 0);
    console.log('PASS: interpret-plugin: <hr> → void element');
  }

  // --- <aside> with multi-paragraph content (no unwrap) ---
  {
    const node = makeAcadaTag('aside', [para('Para 1.'), para('Para 2.')]);
    const h = hast(node);
    assert.equal(h.tagName, 'aside');
    // Two children should be <p> elements (no unwrap; aside is prose but content.length > 1)
    assert.equal(h.children.length, 2);
    assert.equal(h.children[0].tagName, 'p');
    assert.equal(h.children[1].tagName, 'p');
    console.log('PASS: interpret-plugin: <aside> multi-paragraph not unwrapped');
  }

  // --- <meta> with type kwarg → data-document-type ---
  {
    const node = makeAcadaTag('meta', [], { type: 'article' });
    const h = hast(node);
    assert.equal(h.tagName, 'meta');
    assert.equal(h.properties['data-document-type'], 'article');
    console.log('PASS: interpret-plugin: <meta type=article> → data-document-type');
  }

  // --- <blockquote> (explicit Layer 1 name) ---
  // Single-paragraph content is prose-unwrapped to inline text (same as <p>, <em>).
  {
    const node = makeAcadaTag('blockquote', [para('A quotation.')]);
    const h = hast(node);
    assert.equal(h.tagName, 'blockquote');
    // Single paragraph is unwrapped (content.type: prose, content.length === 1).
    assert.equal(h.children[0].type, 'text');
    assert.equal(h.children[0].value, 'A quotation.');
    console.log('PASS: interpret-plugin: <blockquote> → <blockquote> (prose-unwrapped)');
  }

  // --- <quote> shorthand alias for <blockquote> (AUD-12) ---
  {
    const node = makeAcadaTag('quote', [para('A short quotation.')]);
    const h = hast(node);
    // <quote> expands to <blockquote> via shorthand alias in the generated VOCABULARY.
    assert.equal(h.tagName, 'blockquote');
    assert.equal(h.children[0].type, 'text');
    assert.equal(h.children[0].value, 'A short quotation.');
    console.log('PASS: interpret-plugin: <quote> shorthand → <blockquote> (AUD-12 alias)');
  }
}
