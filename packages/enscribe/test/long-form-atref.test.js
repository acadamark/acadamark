// #171 — a long-form tag opener carries its @ref attributes.
//
// exitEnscribeLongFormOpen previously copied every parsed field except
// parsed.atRefs, and enterEnscribeLongFormTag never initialized atRefs /
// selfClosing — so `<tag @id>…</tag>` silently dropped the reference, and every
// long-form node violated the canonical node shape (atRefs === undefined). This
// suite pins that the opener carries @ref and that the canonical fields exist.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '../src/parser/index.js';
import assert from 'node:assert/strict';

const parseLongForm = (src) => {
  const tree = unified().use(remarkParse).use(remarkEnscribe).parse(src);
  const node = tree.children.find(
    (n) => n.type === 'enscribeTag' || n.type === 'enscribeTagError',
  );
  if (!node) throw new Error(`no enscribeTag in: ${JSON.stringify(src)}`);
  return node;
};

export async function run() {
  // ── the opener carries @ref (the bug: it was dropped) ───────────────────────
  {
    const node = parseLongForm('<aside @fig:elephant>\nSee the figure.\n</aside>');
    assert.equal(node.form, 'long', 'parsed as a long-form tag');
    assert.equal(node.tagname, 'aside');
    assert.deepEqual(node.atRefs, ['fig:elephant'], 'long-form opener carries its @ref');
    console.log('PASS: #171 — long-form opener carries @ref (no longer dropped)');
  }

  // ── multiple @refs on a long-form opener ────────────────────────────────────
  {
    const node = parseLongForm('<aside @a @b:c>\nbody\n</aside>');
    assert.deepEqual(node.atRefs, ['a', 'b:c'], 'multiple long-form @refs carried in order');
    console.log('PASS: #171 — multiple long-form @refs carried');
  }

  // ── canonical shape: a no-@ref long-form node has atRefs [] and selfClosing false
  {
    const node = parseLongForm('<aside>\nbody\n</aside>');
    assert.deepEqual(node.atRefs, [], 'no-@ref long-form node has canonical atRefs []');
    assert.equal(node.selfClosing, false, 'long-form node has canonical selfClosing false');
    console.log('PASS: #171 — long-form nodes carry the canonical atRefs / selfClosing fields');
  }
}
