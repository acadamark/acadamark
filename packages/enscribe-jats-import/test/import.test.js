// Tests for @enscribejs/jats-import (core structural + inline).
import assert from 'node:assert';
import { importJats } from '../src/index.js';
import { buildEnscribePipeline } from '@enscribejs/interpreter';
import { enscribeToJats } from '@enscribejs/jats-export';

/** Collect every node (enscribeTag or mdast) matching `pred`, walking children+content. */
function findAll(node, pred, acc = []) {
  if (!node || typeof node !== 'object') return acc;
  if (pred(node)) acc.push(node);
  for (const k of ['children', 'content']) {
    if (Array.isArray(node[k])) node[k].forEach((c) => findAll(c, pred, acc));
  }
  return acc;
}
const tagged = (tree, name) => findAll(tree, (n) => n.type === 'enscribeTag' && n.tagname === name);
const errorNodes = (tree) =>
  findAll(tree, (n) => n.type === 'enscribeParseError' || n.type === 'enscribeTagError');

export function run_tests() {
  // ── structural skeleton + inline formatting ─────────────────────────────────
  {
    const xml = `<?xml version="1.0"?>
<!DOCTYPE article PUBLIC "-//NLM//DTD JATS" "JATS.dtd">
<article article-type="research-article" xml:lang="en">
  <front><article-meta>
    <title-group><article-title>An <italic>Import</italic> Test</article-title></title-group>
    <contrib-group><contrib contrib-type="author"><string-name>Ada Lovelace</string-name></contrib></contrib-group>
    <pub-date><year>2024</year><month>3</month><day>1</day></pub-date>
  </article-meta></front>
  <body>
    <sec id="sec:one"><title>First</title>
      <p>Has <bold>bold</bold>, <italic>i</italic>, <monospace>code</monospace>, <underline>u</underline>, <strike>s</strike>, x<sup>2</sup>, H<sub>2</sub>O.</p>
      <p>A <ext-link xlink:href="http://x.com">link</ext-link>, a <uri>http://y.com</uri>, an <email>a@b.com</email>.</p>
      <list list-type="bullet"><list-item><p>one</p></list-item><list-item><p>two</p></list-item></list>
      <sec><title>Nested</title><p>deep</p></sec>
    </sec>
  </body>
</article>`;
    const tree = importJats(xml);

    // front matter
    const meta = tagged(tree, 'meta')[0];
    assert.ok(meta && meta.kwargs.type === 'article', '<meta type=article>');
    assert.equal(tagged(tree, 'title').length, 1, 'one <title>');
    assert.equal(tagged(tree, 'author').length, 1, 'one <author>');
    assert.equal(tagged(tree, 'date').length, 1, 'one <date>');
    assert.deepEqual(tagged(tree, 'date')[0].content, [{ type: 'text', value: '2024-03-01' }], 'date YYYY-MM-DD');

    // sections (nested <sec> → sub-section; id preserved)
    assert.equal(tagged(tree, 'section').length, 1, 'one section');
    assert.equal(tagged(tree, 'sub-section').length, 1, 'nested sec → sub-section');
    assert.equal(tagged(tree, 'section')[0].id, 'sec:one', 'section id preserved');

    // inline mappings
    for (const [name, n] of [['b', 1], ['i', 2], ['u', 1], ['s', 1], ['sup', 1], ['sub', 1], ['a', 3]]) {
      assert.equal(tagged(tree, name).length, n, `<${name}> × ${n}`);
    }
    assert.equal(findAll(tree, (x) => x.type === 'inlineCode').length, 1, 'monospace → inlineCode');

    // link hrefs
    const hrefs = tagged(tree, 'a').map((a) => a.kwargs.href);
    assert.ok(hrefs.includes('http://x.com'), 'ext-link → href');
    assert.ok(hrefs.includes('http://y.com'), 'uri → href');
    assert.ok(hrefs.includes('mailto:a@b.com'), 'email → mailto href');

    // lists
    assert.equal(findAll(tree, (x) => x.type === 'list').length, 1, 'one list');
    assert.equal(findAll(tree, (x) => x.type === 'listItem').length, 2, 'two list items');
    console.log('PASS: import structure + inline formatting');
  }

  // ── imported tree renders to HTML and has no error nodes ────────────────────
  {
    const xml = `<article article-type="research-article">
  <front><article-meta><title-group><article-title>R</article-title></title-group></article-meta></front>
  <body><sec><title>S</title><p>A <bold>b</bold> and <italic>i</italic>.</p></sec></body>
</article>`;
    const tree = importJats(xml);
    assert.equal(errorNodes(tree).length, 0, 'imported tree has no error nodes');
    const proc = buildEnscribePipeline({ embedResources: false });
    const html = proc.stringify(proc.runSync(tree));
    assert.ok(html.includes('<section>') && html.includes('<section-title>S</section-title>'), 'renders a titled section');
    assert.ok(html.includes('<b>b</b>') && html.includes('<i>i</i>'), 'renders inline formatting');
    console.log('PASS: imported tree → HTML, no error nodes');
  }

  // ── round-trip: .emd → export → import → structural match ────────────────────
  {
    const emd = `<meta type=article>
  <title | Round Trip>
  <author | A. Author>
</meta>

<# Introduction #>

Text with **bold** and *italic* and \`code\`.

<## Methods ##>

More prose.`;
    const proc = buildEnscribePipeline({ embedResources: false });
    const jats = enscribeToJats(proc.runSync(proc.parse(emd)));
    const tree = importJats(jats);

    assert.equal(tagged(tree, 'section').length, 1, 'RT: one section');
    assert.equal(tagged(tree, 'sub-section').length, 1, 'RT: one sub-section');
    assert.equal(tagged(tree, 'b').length, 1, 'RT: bold survives');
    assert.equal(tagged(tree, 'i').length, 1, 'RT: italic survives');
    assert.equal(findAll(tree, (x) => x.type === 'inlineCode').length, 1, 'RT: monospace → inline code');
    assert.equal(tagged(tree, 'title')[0] && 1, 1, 'RT: title present');
    assert.equal(tagged(tree, 'author').length, 1, 'RT: author present');
    console.log('PASS: round-trip export → import structural match');
  }

  console.log('All JATS import tests passed.');
}
