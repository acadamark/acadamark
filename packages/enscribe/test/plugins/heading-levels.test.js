// #397 heading semantics — the structural level stamp (plugins/heading-levels.js)
// and the render-stage wrap it drives (interpret-plugin.js schemaDispatch).
// Spec: notes/specs/render-quality.md RQ-DOC-M4/S5; packages/ehtml/SPEC.md convention 10.

import assert from 'node:assert/strict';
import { enscribeHeadingLevels } from '../../src/interpreter/plugins/heading-levels.js';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';
import { makeTag } from '../../src/core/tag.js';
import { ENSCRIBE_CONFIG } from '../../src/core/file-data-keys.js';

const text = (value) => ({ type: 'text', value });
const fileWith = (configEntries) => ({ data: { [ENSCRIBE_CONFIG]: new Map(configEntries) } });

// A synthetic structured tree: book > part > chapter > section > sub > sub-sub,
// each with its title — six outline levels; deeper nesting is synthesized where
// the authoring layer cannot produce it, because the stamp rule is structural
// and must hold for any tree shape (e.g. multi-file assembly).
function deepBookTree() {
  const subsub = makeTag('sub-sub-section', [makeTag('sub-sub-section-title', [text('Six')])]);
  const sub = makeTag('sub-section', [makeTag('sub-section-title', [text('Five')]), subsub]);
  const section = makeTag('section', [makeTag('section-title', [text('Four')]), sub]);
  const chapter = makeTag('book-part', [
    makeTag('meta', [makeTag('book-part-title', [text('Three')]), makeTag('book-part-subtitle', [text('Sub three')])]),
    section,
  ]);
  const part = makeTag('book-part', [makeTag('meta', [makeTag('book-part-title', [text('Two')])]), chapter]);
  const front = makeTag('book-front', [makeTag('meta', [
    makeTag('book-title', [text('One')]),
    makeTag('book-subtitle', [text('Sub one')]),
  ])]);
  const book = makeTag('book', [front, makeTag('book-body', [part])]);
  return { type: 'root', children: [book] };
}

const findTag = (nodes, tagname, out = []) => {
  for (const n of nodes ?? []) {
    if (!n || typeof n !== 'object') continue;
    if (n.tagname === tagname) out.push(n);
    findTag(n.content, tagname, out);
    findTag(n.children, tagname, out);
  }
  return out;
};

export function run() {
  // --- levels are structural: 1 + enclosing outline containers ---
  {
    const tree = deepBookTree();
    enscribeHeadingLevels()(tree, fileWith([]));
    assert.equal(findTag(tree.children, 'book-title')[0].computedHeadingLevel, 1, 'book-title anchors at 1');
    const partTitles = findTag(tree.children, 'book-part-title');
    assert.equal(partTitles[0].computedHeadingLevel, 2, 'part title at 2');
    assert.equal(partTitles[1].computedHeadingLevel, 3, 'nested chapter title at 3');
    assert.equal(findTag(tree.children, 'section-title')[0].computedHeadingLevel, 4, 'section in nested chapter at 4');
    assert.equal(findTag(tree.children, 'sub-section-title')[0].computedHeadingLevel, 5, 'sub-section at 5');
    assert.equal(findTag(tree.children, 'sub-sub-section-title')[0].computedHeadingLevel, 6, 'sub-sub-section at 6');
    console.log('PASS: heading-levels: structural derivation across nested book-parts (1..6)');
  }

  // --- subtitles are never stamped (they ride with the title's heading group) ---
  {
    const tree = deepBookTree();
    enscribeHeadingLevels()(tree, fileWith([]));
    for (const tag of ['book-subtitle', 'book-part-subtitle']) {
      const found = findTag(tree.children, tag);
      assert.ok(found.length > 0, `${tag} present in tree`);
      assert.equal(found[0].computedHeadingLevel, undefined, `${tag} carries no level`);
    }
    console.log('PASS: heading-levels: subtitles carry no heading level');
  }

  // --- overflow: a 7th outline level stamps 7 (render emits h6 + aria-level) ---
  {
    const tree = deepBookTree();
    // Synthesize one more outline container around the deepest title's subtree:
    // the authoring registers cannot express this today, but assembly-produced
    // trees are not bounded by the authoring ladder — the rule must hold.
    const sub = findTag(tree.children, 'sub-section')[0];
    const subsub = findTag(tree.children, 'sub-sub-section')[0];
    sub.content = sub.content.filter((n) => n !== subsub);
    sub.content.push(makeTag('section', [makeTag('section-title', [text('Extra')]), subsub]));
    enscribeHeadingLevels()(tree, fileWith([]));
    assert.equal(findTag(tree.children, 'sub-sub-section-title')[0].computedHeadingLevel, 7, 'seventh level stamps 7');
    console.log('PASS: heading-levels: derived level past 6 stamps the true level');
  }

  // --- the config gate: heading-tags=false stamps nothing ---
  {
    const tree = deepBookTree();
    enscribeHeadingLevels()(tree, fileWith([['heading-tags', 'false']]));
    for (const tag of ['book-title', 'book-part-title', 'section-title']) {
      assert.equal(findTag(tree.children, tag)[0].computedHeadingLevel, undefined, `${tag} unstamped when off`);
    }
    console.log('PASS: heading-levels: heading-tags=false stamps nothing (byte-identical render by construction)');
  }

  // --- end to end: the wrap renders at the derived level; >6 emits h6 + aria-level ---
  {
    const proc = buildEnscribePipeline();
    const src = ['<meta type=article>', '  <title | E2E>', '</meta>', '', '# One', 'x.'].join('\n');
    const parsed = proc.parse(src);
    const file = { data: {}, messages: [] };
    const tree = proc.runSync(parsed, file);
    const sectionTitle = findTag(tree.children, 'section-title')[0];
    assert.equal(sectionTitle.computedHeadingLevel, 2, 'pipeline stamps section-title at 2');
    // Overflow through the REAL render stage: force a synthetic level and stringify.
    sectionTitle.computedHeadingLevel = 7;
    const html = proc.stringify(tree, file);
    assert.match(html, /<article-title>\s*<h1[\s>]/, 'article-title wraps h1');
    assert.match(html, /<section-title>\s*<h6 aria-level="7">/, 'level 7 renders h6 + aria-level');
    console.log('PASS: heading-levels: e2e wrap (h1 anchor; overflow h6 + aria-level="7")');
  }
}
