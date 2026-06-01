import assert from 'node:assert/strict';
import { enscribeSectionNesting } from '../../src/interpreter/plugins/section-nesting.js';
import { makeTag } from '../../src/core/tag.js';

function para(value) {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

// Helper: make a section-family tag whose pipe content is a single paragraph.
// (This matches the state after remarkRecursiveContent processes the section.)
function sectionTag(name, titleText, ...extra) {
  return makeTag(name, [para(titleText), ...extra]);
}

function makeBody(...children) {
  return makeTag('article-body', children);
}

function makeArticleTree(...bodyChildren) {
  const body = makeBody(...bodyChildren);
  const front = makeTag('article-front', []);
  const back = makeTag('article-back', []);
  const article = makeTag('article', [front, body, back]);
  return { type: 'root', children: [article] };
}

function getBody(tree) {
  return tree.children[0].content[1]; // article > article-body
}

export function run() {
  // --- single section, one following paragraph ---
  {
    const p = para('Body of intro.');
    const tree = makeArticleTree(sectionTag('section', 'Intro'), p);
    enscribeSectionNesting()(tree);

    const body = getBody(tree);
    assert.equal(body.content.length, 1, 'one top-level section');
    const s = body.content[0];
    assert.equal(s.tagname, 'section');
    assert.equal(s.content[0].tagname, 'section-title', 'first child is section-title');
    assert.equal(s.content[1], p, 'paragraph nested under section');
    console.log('PASS: section-nesting: single section + paragraph');
  }

  // --- two sibling sections ---
  {
    const p1 = para('Para 1.');
    const p2 = para('Para 2.');
    const tree = makeArticleTree(
      sectionTag('section', 'S1'), p1,
      sectionTag('section', 'S2'), p2,
    );
    enscribeSectionNesting()(tree);

    const body = getBody(tree);
    assert.equal(body.content.length, 2, 'two top-level sections');
    const [s1, s2] = body.content;
    assert.equal(s1.content[1], p1);
    assert.equal(s2.content[1], p2);
    console.log('PASS: section-nesting: two sibling sections');
  }

  // --- sub-section nested inside section ---
  {
    const p1 = para('Outer body.');
    const p2 = para('Inner body.');
    const tree = makeArticleTree(
      sectionTag('section', 'Outer'),
      p1,
      sectionTag('sub-section', 'Inner'),
      p2,
    );
    enscribeSectionNesting()(tree);

    const body = getBody(tree);
    assert.equal(body.content.length, 1, 'one top-level section');
    const outer = body.content[0];
    assert.equal(outer.tagname, 'section');
    // outer.content = [section-title, p1, sub-section]
    assert.equal(outer.content[0].tagname, 'section-title');
    assert.equal(outer.content[1], p1);
    const inner = outer.content[2];
    assert.equal(inner.tagname, 'sub-section');
    assert.equal(inner.content[0].tagname, 'sub-section-title');
    assert.equal(inner.content[1], p2);
    console.log('PASS: section-nesting: sub-section nested inside section');
  }

  // --- three-level nesting ---
  {
    const pOuter = para('Outer.');
    const pMid = para('Middle.');
    const pInner = para('Inner.');
    const tree = makeArticleTree(
      sectionTag('section', 'Outer'),
      pOuter,
      sectionTag('sub-section', 'Mid'),
      pMid,
      sectionTag('sub-sub-section', 'Deep'),
      pInner,
    );
    enscribeSectionNesting()(tree);

    const body = getBody(tree);
    const outer = body.content[0];
    assert.equal(outer.tagname, 'section');
    const mid = outer.content[2]; // [section-title, pOuter, sub-section]
    assert.equal(mid.tagname, 'sub-section');
    const deep = mid.content[2]; // [sub-section-title, pMid, sub-sub-section]
    assert.equal(deep.tagname, 'sub-sub-section');
    assert.equal(deep.content[0].tagname, 'sub-sub-section-title');
    assert.equal(deep.content[1], pInner);
    console.log('PASS: section-nesting: three-level nesting');
  }

  // --- section-title text extracted from pipe content ---
  {
    const tree = makeArticleTree(sectionTag('section', 'My Title'));
    enscribeSectionNesting()(tree);

    const section = getBody(tree).content[0];
    const title = section.content[0];
    assert.equal(title.tagname, 'section-title');
    // title.content should be the inline nodes extracted from the paragraph
    assert.equal(title.content.length, 1);
    assert.equal(title.content[0].type, 'text');
    assert.equal(title.content[0].value, 'My Title');
    console.log('PASS: section-nesting: title text extracted as inline nodes');
  }

  // --- new section at peer depth closes previous ---
  {
    const p1 = para('Body of S1.');
    const sub = sectionTag('sub-section', 'Sub');
    const p2 = para('Body of S2.');
    // S1 opens, sub opens, S2 closes both sub and S1 and opens at depth 1
    const tree = makeArticleTree(
      sectionTag('section', 'S1'),
      p1,
      sub,
      sectionTag('section', 'S2'),
      p2,
    );
    enscribeSectionNesting()(tree);

    const body = getBody(tree);
    assert.equal(body.content.length, 2, 'two top-level sections after nesting');
    const s1 = body.content[0];
    const s2 = body.content[1];
    // sub should be inside s1
    assert.equal(s1.content[2], sub, 'sub-section inside S1');
    // p2 should be inside s2
    assert.equal(s2.content[1], p2, 'para inside S2');
    console.log('PASS: section-nesting: peer section closes previous');
  }

  // --- no sections → tree unchanged ---
  {
    const p = para('No sections.');
    const tree = makeArticleTree(p);
    enscribeSectionNesting()(tree);

    const body = getBody(tree);
    assert.equal(body.content[0], p);
    console.log('PASS: section-nesting: no sections → tree unchanged');
  }
}
