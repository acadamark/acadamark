// Tests for the pandoc bridge (`enscribe import`).
//
// The converter (pandoc JSON AST → Enscribe mdast) is tested against
// hand-built ASTs, so it runs WITHOUT pandoc installed — the part that needs
// pandoc is only the invocation, exercised by a skippable integration check in
// cli.test.js. The synthetic ASTs follow the pandoc-types schema (pandoc 2.10+).
import assert from 'node:assert';
import { convertPandoc, detectFormat, findBibtex } from '../src/pandoc-import.js';
import { serializeCanonical } from '../src/serialize-canonical.js';
import { buildEnscribePipeline } from '@enscribejs/enscribe';

// pandoc AST builders
const A = (id = '') => [id, [], []];
const S = (s) => ({ t: 'Str', c: s });
const SP = { t: 'Space' };
const cell = (inlines) => [A(), { t: 'AlignDefault' }, 1, 1, [{ t: 'Plain', c: inlines }]];
const cellSpan = (inlines, colspan) => [A(), { t: 'AlignDefault' }, 1, colspan, [{ t: 'Plain', c: inlines }]];
const row = (cells) => [A(), cells];
const colspec = { t: 'AlignDefault' };

const tagged = (tree, name) => {
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'enscribeTag' && n.tagname === name) out.push(n);
    for (const k of ['children', 'content']) if (Array.isArray(n[k])) n[k].forEach(walk);
  })(tree);
  return out;
};
const errorNodes = (tree) => {
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'enscribeParseError' || n.type === 'enscribeTagError') out.push(n);
    for (const k of ['children', 'content']) if (Array.isArray(n[k])) n[k].forEach(walk);
  })(tree);
  return out;
};

export function run_tests() {
  // ── format detection ─────────────────────────────────────────────────────
  {
    assert.equal(detectFormat('paper.tex'), 'latex');
    assert.equal(detectFormat('slides.qmd'), 'markdown');
    assert.equal(detectFormat('report.docx'), 'docx');
    assert.equal(detectFormat('notes.rst'), 'rst');
    assert.equal(detectFormat('whatever.xyz', 'latex'), 'latex', '--from overrides extension');
    assert.throws(() => detectFormat('mystery.zzz'), /detect the input format/, 'unknown extension throws');
    console.log('PASS: pandoc format detection');
  }

  // ── structure + inline + metadata ────────────────────────────────────────
  {
    const ast = {
      meta: {
        title: { t: 'MetaInlines', c: [S('A'), SP, S('Paper')] },
        author: { t: 'MetaList', c: [{ t: 'MetaInlines', c: [S('Ada'), SP, S('Lovelace')] }] },
        date: { t: 'MetaString', c: '2024-03-01' },
      },
      blocks: [
        { t: 'Header', c: [1, A('intro'), [S('Introduction')]] },
        { t: 'Para', c: [S('Text'), SP, { t: 'Strong', c: [S('bold')] }, SP, { t: 'Emph', c: [S('italic')] }, SP,
          { t: 'Strikeout', c: [S('struck')] }, SP, { t: 'Superscript', c: [S('2')] }, SP,
          { t: 'Math', c: [{ t: 'InlineMath' }, 'x^2'] }, SP, { t: 'Code', c: [A(), 'f()'] }, SP,
          { t: 'Cite', c: [[{ citationId: 'smith2020', citationMode: { t: 'NormalCitation' } }], [S('[1]')]] },
          { t: 'Note', c: [{ t: 'Para', c: [S('A'), SP, S('footnote.')] }] }] },
        { t: 'Para', c: [{ t: 'Math', c: [{ t: 'DisplayMath' }, 'E = mc^2'] }] },
        { t: 'Header', c: [2, A('m'), [S('Methods')]] },
        { t: 'BulletList', c: [[{ t: 'Plain', c: [S('one')] }], [{ t: 'Plain', c: [S('two')] }]] },
        { t: 'Para', c: [{ t: 'Image', c: [A('fig1'), [S('A'), SP, S('caption')], ['img.png', '']] }] },
        { t: 'CodeBlock', c: [[A()[0], ['python'], []], 'print(1)'] },
        { t: 'Para', c: [{ t: 'Link', c: [A(), [S('link')], ['http://x.com', '']] }] },
        { t: 'BlockQuote', c: [{ t: 'Para', c: [S('quoted')] }] },
        { t: 'HorizontalRule' },
      ],
    };
    const tree = convertPandoc(ast, { bibtex: '@article{smith2020, title={On X}, year={2020}}' });

    assert.equal(tagged(tree, 'title')[0] && 1, 1, 'title from meta');
    assert.equal(tagged(tree, 'author').length, 1, 'author from meta');
    assert.equal(tagged(tree, 'date').length, 1, 'date from meta');
    assert.equal(tagged(tree, 'section').length, 1, 'Header level 1 → section');
    assert.equal(tagged(tree, 'sub-section').length, 1, 'Header level 2 → sub-section');
    assert.equal(tagged(tree, 'section')[0].id, 'intro', 'header id preserved');
    assert.equal(tagged(tree, 'b').length, 1, 'Strong → b');
    assert.equal(tagged(tree, 'i').length, 1, 'Emph → i');
    assert.equal(tagged(tree, 's').length, 1, 'Strikeout → s');
    assert.equal(tagged(tree, 'sup').length, 1, 'Superscript → sup');
    assert.equal(tagged(tree, 'inline-math').length, 1, 'InlineMath → inline-math');
    assert.equal(tagged(tree, 'display-math').length, 1, 'DisplayMath → display-math');
    assert.deepEqual(tagged(tree, 'cite')[0].atRefs, ['smith2020'], 'Cite → <cite @key>');
    assert.equal(tagged(tree, 'note').length, 1, 'Note → note');
    assert.equal(tagged(tree, 'a')[0].kwargs.href, 'http://x.com', 'Link → a href');
    assert.equal(tagged(tree, 'fig')[0].kwargs.src, 'img.png', 'standalone Image → fig src');
    assert.equal(tagged(tree, 'library').length, 1, '.bib → library');
    assert.equal(tagged(tree, 'bibliography').length, 1, 'bibliography placement');
    assert.ok(tree.children.some((n) => n.type === 'thematicBreak'), 'HorizontalRule → thematic break');
    assert.ok(tree.children.some((n) => n.type === 'list'), 'BulletList → list');
    assert.ok(tree.children.some((n) => n.type === 'code' && n.lang === 'python'), 'CodeBlock → code (lang)');
    console.log('PASS: pandoc structure + inline + metadata conversion');
  }

  // ── renders cleanly + serializes to .emd ─────────────────────────────────
  {
    const ast = { blocks: [
      { t: 'Header', c: [1, A('intro'), [S('Intro')]] },
      { t: 'Para', c: [{ t: 'Strong', c: [S('bold')] }, SP, { t: 'Math', c: [{ t: 'InlineMath' }, 'a^2'] }] },
    ] };
    assert.equal(errorNodes(convertPandoc(ast)).length, 0, 'no error nodes');
    // .emd from a fresh tree — runSync (below) mutates the tree in place.
    const emd = serializeCanonical(convertPandoc(ast));
    assert.ok(emd.includes('<section #intro | Intro>') && emd.includes('<$a^2$>'), '.emd is canonical');
    const proc = buildEnscribePipeline({ embedResources: false });
    const html = proc.stringify(proc.runSync(convertPandoc(ast)));
    assert.ok(html.includes('<b>bold</b>'), 'renders bold');
    assert.ok(html.includes('katex'), 'renders math via KaTeX');
    assert.match(html, /<section-title>\s*<h2>Intro<\/h2>/, 'renders the section');
    console.log('PASS: pandoc import renders + serializes');
  }

  // ── tables: simple → CSV, complex (colspan) → raw HTML ───────────────────
  {
    const simple = { t: 'Table', c: [A('t1'),
      [null, [{ t: 'Plain', c: [S('Cap')] }]],
      [[colspec, { t: 'ColWidthDefault' }], [colspec, { t: 'ColWidthDefault' }]],
      [A(), [row([cell([S('A')]), cell([S('B, x')])])]],
      [[A(), 0, [], [row([cell([S('1')]), cell([S('2')])])]]],
      [A(), []]] };
    const complex = { t: 'Table', c: [A('t2'), [null, []],
      [[colspec, { t: 'ColWidthDefault' }], [colspec, { t: 'ColWidthDefault' }]],
      [A(), [row([cellSpan([S('spanning')], 2)])]],
      [[A(), 0, [], [row([cell([S('1')]), cell([S('2')])])]]],
      [A(), []]] };
    const tree = convertPandoc({ blocks: [simple, complex] });
    const tbls = tagged(tree, 'table');
    assert.equal(tbls[0].content, 'A,"B, x"\n1,2', 'simple table → CSV (comma cell quoted)');
    assert.deepEqual(tbls[0].positional, ['csv'], 'simple table is csv format');
    assert.equal(tbls[0].kwargs.caption, 'Cap', 'table caption');
    assert.equal(tbls[1].positional.length, 0, 'complex table → no-format (raw HTML)');
    assert.ok(/colspan="2"/.test(tbls[1].content), 'complex table keeps colspan');
    assert.equal(errorNodes(tree).length, 0, 'no error nodes');
    console.log('PASS: pandoc table conversion (CSV / raw HTML)');
  }

  console.log('All pandoc-import tests passed.');

  // ── #412: unmapped pandoc nodes → sink + placeholder; explicit bibliography miss warns ──
  {
    const drops = [];
    const ast = { meta: {}, blocks: [
      { t: 'Para', c: [{ t: 'Str', c: 'ok' }] },
      { t: 'SomeExoticBlock', c: [] },
      { t: 'RawBlock', c: ['html', '<marquee>hi</marquee>'] },
    ] };
    const tree = convertPandoc(ast, { onDropped: (name) => drops.push(name) });
    assert.ok(drops.includes('SomeExoticBlock'), 'unmapped block kind reported');
    assert.ok(drops.some((n) => n.startsWith('RawBlock')), 'raw block reported');
    const markers = [];
    (function walk(ns) { for (const n of ns ?? []) {
      if (n?.type === 'enscribeTag' && n.tagname === '__import-error') markers.push(n);
      if (Array.isArray(n?.children)) walk(n.children);
      if (Array.isArray(n?.content)) walk(n.content);
    } })(tree.children ?? tree);
    assert.equal(markers.length, 2, 'placeholders for both lost blocks');
    assert.equal(markers[0].kwargs.what, 'SomeExoticBlock', 'placeholder names the node kind');

    // findBibtex: an EXPLICITLY named, unreadable bibliography is a warned miss.
    const misses = [];
    findBibtex('/nonexistent-dir/doc.md', { bibliography: { t: 'MetaString', c: 'gone.bib' } }, (m) => misses.push(m));
    assert.equal(misses.length, 1, 'one miss for the explicit bibliography');
    assert.ok(misses[0].includes('gone.bib') && misses[0].includes('not found'), 'names the file');
    console.log('PASS: pandoc-import (#412) — sink + placeholders + explicit-bibliography miss');
  }
}
