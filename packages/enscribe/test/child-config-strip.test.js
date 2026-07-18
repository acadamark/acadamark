// #472 — nested child <config> must be stripped recursively at assembly.
//
// Top-level CHILD_STRIP_APPARATUS only skipped root kids; config-discovery walks
// the whole tree (including content arrays — PG-9). A <config> nested inside a
// child's <section>.content would otherwise survive assembly and become document
// config. This pins the recursive strip on that nested-content shape.

import assert from 'node:assert';
import { assembleMasterDocument } from '../src/master-document/assemble.js';

function walkConfigs(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.type === 'enscribeTag' && node.tagname === 'config') out.push(node);
  if (Array.isArray(node.content)) for (const c of node.content) walkConfigs(c, out);
  if (Array.isArray(node.children)) for (const c of node.children) walkConfigs(c, out);
  return out;
}

export function run() {
  const masterTree = {
    type: 'root',
    children: [
      { type: 'enscribeTag', tagname: 'meta', kwargs: { type: 'book' }, content: null },
      { type: 'enscribeTag', tagname: 'config', kwargs: { 'number-sections': 'true' }, content: null },
      { type: 'enscribeTag', tagname: 'chapter', kwargs: { src: 'ch.emd' }, content: 'One' },
    ],
  };
  const childTree = {
    type: 'root',
    children: [
      { type: 'enscribeTag', tagname: 'meta', kwargs: { title: 'One' }, content: null },
      {
        type: 'enscribeTag',
        tagname: 'section',
        kwargs: {},
        content: [
          { type: 'paragraph', children: [{ type: 'text', value: 'before' }] },
          { type: 'enscribeTag', tagname: 'config', kwargs: { theme: 'tufte' }, content: null },
          { type: 'paragraph', children: [{ type: 'text', value: 'after' }] },
        ],
      },
    ],
  };

  let parseCalls = 0;
  const tree = assembleMasterDocument({
    source: 'master',
    readFile: () => 'child',
    resolve: (rel) => rel,
    parse: (s) => {
      parseCalls += 1;
      return s === 'master' ? structuredClone(masterTree) : structuredClone(childTree);
    },
  });

  assert.ok(parseCalls >= 2, 'master and child were both parsed');

  const nested = walkConfigs(tree).filter((n) => n.kwargs?.theme === 'tufte');
  assert.equal(nested.length, 0,
    '#472: nested <config theme=tufte> inside a child section.content must not survive assembly');

  const masterConfigs = walkConfigs(tree).filter((n) => n.kwargs && 'number-sections' in n.kwargs);
  assert.equal(masterConfigs.length, 1, 'master <config number-sections> still survives assembly');

  // Body around the stripped config is preserved.
  const section = tree.children.find((n) => n.type === 'enscribeTag' && n.tagname === 'section');
  assert.ok(section && Array.isArray(section.content), 'child section body is present');
  assert.equal(section.content.length, 2, 'only the nested config was removed from section.content');
  assert.ok(section.content.every((n) => n.type === 'paragraph'), 'remaining content is the surrounding paragraphs');

  console.log('PASS: #472 — nested child <config> is stripped recursively at assembly');
}
