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

  // ── citations + bibliography (Slice 2) ──────────────────────────────────────
  {
    const xml = `<article article-type="research-article">
  <front><article-meta><title-group><article-title>Citing</article-title></title-group></article-meta></front>
  <body><sec id="s"><title>Intro</title>
    <p>One <xref ref-type="bibr" rid="ref-Smith2020">1</xref>; a group
       <xref ref-type="bibr" rid="ref-Jones2018 ref-Brown2021">2,3</xref>.</p>
  </sec></body>
  <back><ref-list><title>References</title>
    <ref id="ref-Smith2020"><element-citation publication-type="journal">
      <person-group person-group-type="author">
        <name><surname>Smith</surname><given-names>Jane</given-names></name>
        <name><surname>Doe</surname><given-names>John</given-names></name>
      </person-group>
      <article-title>On Elephants</article-title><source>J. Pachyderm Studies</source>
      <year>2020</year><volume>12</volume><issue>3</issue>
      <fpage>45</fpage><lpage>67</lpage>
      <pub-id pub-id-type="doi">10.1234/jps.2020.45</pub-id>
    </element-citation></ref>
    <ref id="ref-Jones2018"><element-citation publication-type="book">
      <person-group person-group-type="author"><name><surname>Jones</surname><given-names>Alice</given-names></name></person-group>
      <source>Methods in Field Research</source>
      <publisher-name>Academic Press</publisher-name><publisher-loc>New York</publisher-loc><year>2018</year>
    </element-citation></ref>
    <ref id="ref-Brown2021"><mixed-citation publication-type="confproc">
      <person-group person-group-type="author"><name><surname>Brown</surname><given-names>Bob</given-names></name></person-group>
      <article-title>Diagram Layout</article-title><source>Proc. Symp. Layout</source><year>2021</year>
    </mixed-citation></ref>
    <ref id="ref-Free1999"><mixed-citation>Pure free text reference, Some Journal (1999).</mixed-citation></ref>
  </ref-list></back>
</article>`;
    const tree = importJats(xml);

    // in-text cites: a single and a grouped (space-separated rid → multi-key cite)
    const cites = tagged(tree, 'cite');
    assert.equal(cites.length, 2, 'two <cite> markers');
    assert.deepEqual(cites[0].atRefs, ['ref-Smith2020'], 'single cite key');
    assert.deepEqual(cites[1].atRefs, ['ref-Jones2018', 'ref-Brown2021'], 'grouped cite → two keys');
    assert.equal(cites[0].content, null, 'cite content is null (parser shape)');

    // library: one opaque <library> inside one <data>, with BibTeX entries
    const lib = tagged(tree, 'library');
    assert.equal(lib.length, 1, 'one <library>');
    assert.ok(lib[0].isOpaqueContent && lib[0].contentHandler === 'library', 'library is opaque/library-handler');
    const bib = lib[0].content;
    assert.ok(bib.includes('@article{ref-Smith2020,'), 'journal → @article keyed by ref id');
    assert.ok(bib.includes('author = {Smith, Jane and Doe, John}'), 'authors "Surname, Given" joined with " and "');
    assert.ok(bib.includes('journal = {J. Pachyderm Studies}'), 'source → journal for articles');
    assert.ok(bib.includes('pages = {45--67}'), 'fpage/lpage → pages');
    assert.ok(bib.includes('doi = {10.1234/jps.2020.45}'), 'pub-id doi → doi');
    assert.ok(bib.includes('@book{ref-Jones2018,'), 'book → @book');
    assert.ok(bib.includes('publisher = {Academic Press}') && bib.includes('address = {New York}'), 'book publisher/address');
    assert.ok(bib.includes('@inproceedings{ref-Brown2021,'), 'confproc → @inproceedings');
    assert.ok(bib.includes('booktitle = {Proc. Symp. Layout}'), 'inproceedings source → booktitle');
    assert.ok(/@misc\{ref-Free1999,\s*note = \{Pure free text/.test(bib), 'free-text mixed-citation → @misc note');

    assert.equal(tagged(tree, 'data').length, 1, 'one <data> wrapper');
    assert.equal(tagged(tree, 'bibliography').length, 1, 'one <bibliography> placement');

    // renders: cites resolve (no ??cite errors), bibliography shows an entry
    assert.equal(errorNodes(tree).length, 0, 'no error nodes');
    const proc = buildEnscribePipeline({ embedResources: false });
    const body = proc.stringify(proc.runSync(tree)).replace(/<style[\s\S]*?<\/style>/g, '');
    assert.ok(!/\?\?cite/.test(body), 'no unresolved-cite markers in rendered body');
    assert.ok(/data-keys="ref-Smith2020"/.test(body), 'Smith cite resolved');
    assert.ok(/data-keys="ref-Jones2018,ref-Brown2021"/.test(body), 'grouped cite resolved to both keys');
    assert.ok(/On Elephants/.test(body), 'bibliography lists the cited entry');
    console.log('PASS: citations + bibliography import');
  }

  // ── round-trip: .emd library + cites → export → import → cites resolve ───────
  {
    const emd = `<meta type=article>
  <title | RT Cites>
  <author | A. Author>
</meta>

<# Intro #>

First <cite @Smith2020>, then <cite @Jones2018>.

<data>
<library |
@article{Smith2020,
  author = {Smith, Jane and Doe, John},
  title  = {On the Behavior of Elephants},
  journal = {J. Pachyderm Studies},
  year   = 2020
}
@book{Jones2018,
  author = {Jones, Alice},
  title  = {Methods in Field Research},
  publisher = {Academic Press},
  year   = 2018
}
>
</data>

<bibliography>
</bibliography>`;
    const proc = buildEnscribePipeline({ embedResources: false });
    const jats = enscribeToJats(proc.runSync(proc.parse(emd)));
    assert.ok(/<xref ref-type="bibr" rid="ref-Smith2020">/.test(jats), 'RT: export emits bibr xref');
    assert.ok(/<ref id="ref-Smith2020">/.test(jats), 'RT: export emits matching <ref>');

    const tree = importJats(jats);
    assert.equal(tagged(tree, 'cite').length, 2, 'RT: two cites re-imported');
    assert.equal(tagged(tree, 'library').length, 1, 'RT: library re-imported');
    // cites resolve consistently (keys carry the export\'s ref- prefix on both sides)
    const body = proc.stringify(proc.runSync(tree)).replace(/<style[\s\S]*?<\/style>/g, '');
    assert.ok(!/\?\?cite/.test(body), 'RT: cites resolve (no error markers)');
    assert.ok(/Behavior of Elephants/.test(body), 'RT: bibliography survives');
    console.log('PASS: round-trip export → import citations resolve');
  }

  // ── math: tex-math + MathML (Slice 3) ───────────────────────────────────────
  {
    const xml = `<article>
  <front><article-meta><title-group><article-title>Math</article-title></title-group></article-meta></front>
  <body><sec><title>Eqs</title>
    <p>Inline <inline-formula><tex-math><![CDATA[E = mc^2]]></tex-math></inline-formula> here.</p>
    <disp-formula id="eqn:newton"><label>(1)</label><tex-math><![CDATA[F = ma]]></tex-math></disp-formula>
    <p>MathML <inline-formula><mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"><mml:mfrac><mml:mi>a</mml:mi><mml:mi>b</mml:mi></mml:mfrac></mml:math></inline-formula>.</p>
    <disp-formula id="eqn:mml"><mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"><mml:msqrt><mml:msup><mml:mi>x</mml:mi><mml:mn>2</mml:mn></mml:msup></mml:msqrt></mml:math></disp-formula>
    <p>Both <inline-formula><alternatives><tex-math><![CDATA[\\alpha]]></tex-math><mml:math xmlns:mml="http://www.w3.org/1998/Math/MathML"><mml:mi>WRONG</mml:mi></mml:math></alternatives></inline-formula>.</p>
    <p>Neither <inline-formula>just words</inline-formula>.</p>
  </sec></body>
</article>`;
    const tree = importJats(xml);

    const im = tagged(tree, 'inline-math');
    const dm = tagged(tree, 'display-math');
    // 3 inline-math: tex (E=mc^2), MathML (a/b), both-present (alpha). "Neither" → code span.
    assert.equal(im.length, 3, 'three inline-math');
    assert.equal(dm.length, 2, 'two display-math');

    // tex-math extracted verbatim; opaque with the math handler
    assert.equal(im[0].content, 'E = mc^2', 'inline tex-math verbatim');
    assert.ok(im[0].isOpaqueContent && im[0].contentHandler === 'math', 'inline-math opaque/math handler');
    // MathML → LaTeX
    assert.equal(im[1].content, '\\frac{a}{b}', 'inline MathML → \\frac{a}{b}');
    // both present → tex-math wins (NOT the MathML "WRONG")
    assert.equal(im[2].content, '\\alpha', 'tex-math preferred over MathML when both present');

    // display: id preserved, label dropped, math-display handler
    assert.equal(dm[0].content, 'F = ma', 'display tex-math verbatim (label dropped)');
    assert.equal(dm[0].id, 'eqn:newton', 'display-math id preserved');
    assert.ok(dm[0].contentHandler === 'math-display', 'display-math uses math-display handler');
    assert.equal(dm[1].content, '\\sqrt{x^{2}}', 'display MathML → \\sqrt{x^{2}}');
    assert.equal(dm[1].id, 'eqn:mml', 'display MathML id preserved');

    // graceful fallback: "neither" → a code span, NOT an error node
    assert.equal(errorNodes(tree).length, 0, 'no error nodes');
    assert.ok(findAll(tree, (n) => n.type === 'inlineCode' && n.value === 'just words').length === 1,
      'formula with no tex-math/MathML degrades to a code span');

    // renders as KaTeX
    const proc = buildEnscribePipeline({ embedResources: false });
    const html = proc.stringify(proc.runSync(tree));
    assert.ok(/class="katex/.test(html), 'math renders via KaTeX');
    console.log('PASS: math import (tex-math + MathML)');
  }

  // ── round-trip: .emd math → export → import → math survives + renders ────────
  {
    const emd = `<meta type=article>
  <title | Math RT>
</meta>

<# Eqs #>

Inline <$ E = mc^2 $> and a display:

<$$ #eqn:newton | F = ma $$>`;
    const proc = buildEnscribePipeline({ embedResources: false });
    const jats = enscribeToJats(proc.runSync(proc.parse(emd)));
    assert.ok(/<tex-math><!\[CDATA\[E = mc\^2\]\]><\/tex-math>/.test(jats), 'RT: export emits inline tex-math');
    assert.ok(/<disp-formula id="eqn:newton">/.test(jats), 'RT: export emits disp-formula with id');

    const tree = importJats(jats);
    assert.equal(tagged(tree, 'inline-math')[0].content, 'E = mc^2', 'RT: inline math survives');
    const dm = tagged(tree, 'display-math')[0];
    assert.equal(dm.content, 'F = ma', 'RT: display math survives');
    assert.equal(dm.id, 'eqn:newton', 'RT: display math id survives');
    assert.equal(errorNodes(tree).length, 0, 'RT: no error nodes');
    assert.ok(/class="katex/.test(proc.stringify(proc.runSync(tree))), 'RT: re-imported math renders');
    console.log('PASS: round-trip export → import math survives');
  }

  // ── figures, tables, cross-references, footnotes (Slice 4) ──────────────────
  {
    const xml = `<article>
  <front><article-meta><title-group><article-title>FTX</article-title></title-group></article-meta></front>
  <body>
    <sec id="s1"><title>Intro</title>
      <p>See <xref ref-type="fig" rid="F1">Figure 1</xref>, <xref ref-type="table" rid="T1">Table 1</xref>,
         <xref ref-type="disp-formula" rid="E1">Eq 1</xref>, <xref ref-type="sec" rid="s2">Section 2</xref>.</p>
      <p>A claim<xref ref-type="fn" id="r1" rid="fn1">1</xref>.</p>
      <fig id="F1"><label>Figure 1</label><caption><title>A descriptive caption</title></caption><graphic xlink:href="image.png"/></fig>
      <table-wrap id="T1"><label>Table 1</label><caption><p>Summary data</p></caption>
        <table><thead><tr><th>A</th><th>B, comma</th></tr></thead>
          <tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>
      </table-wrap>
      <disp-formula id="E1"><tex-math><![CDATA[F = ma]]></tex-math></disp-formula>
    </sec>
    <sec id="s2"><title>Results</title><p>Done.</p></sec>
  </body>
  <back><fn-group><fn id="fn1"><label>1</label><p>The footnote body.</p></fn></fn-group></back>
</article>`;
    const tree = importJats(xml);

    // figure: id prefixed, src from <graphic>, caption is the pipe content
    const fig = tagged(tree, 'fig')[0];
    assert.equal(fig.id, 'fig:F1', 'figure id prefixed fig:');
    assert.equal(fig.kwargs.src, 'image.png', 'figure src ← <graphic xlink:href>');
    assert.equal(fig.content.map((n) => n.value).join(''), 'A descriptive caption', 'figure caption');

    // table: id prefixed, CSV (header row first, comma cell quoted), caption kwarg
    const tab = tagged(tree, 'table')[0];
    assert.equal(tab.id, 'tab:T1', 'table id prefixed tab:');
    assert.deepEqual(tab.positional, ['csv'], 'table positional csv');
    assert.ok(tab.isOpaqueContent && tab.contentHandler === 'table', 'table is opaque/table-handler');
    assert.equal(tab.content, 'A,"B, comma"\n1,2\n3,4', 'CSV: header first, comma cell quoted');
    assert.equal(tab.kwargs.caption, 'Summary data', 'table caption kwarg');

    // cross-references: prefixed targets matching the element ids
    assert.deepEqual(tagged(tree, 'ref').map((r) => r.atRefs[0]),
      ['fig:F1', 'tab:T1', 'eqn:E1', 'sec:s2'], 'xref → <ref @prefix:id> for fig/table/eqn/sec');

    // ids on the targets are prefixed to match
    assert.equal(tagged(tree, 'section')[0].id, 'sec:s1', 'section id prefixed');
    assert.equal(tagged(tree, 'display-math')[0].id, 'eqn:E1', 'equation id prefixed');

    // footnote inlined into a <note> at the marker
    const note = tagged(tree, 'note');
    assert.equal(note.length, 1, 'one inlined note');
    assert.ok(findAll(note[0], (n) => n.type === 'text' && /footnote body/.test(n.value)).length === 1, 'note carries the <fn> body');

    // renders: cross-references resolve to words, figure/table render, no errors
    assert.equal(errorNodes(tree).length, 0, 'no error nodes');
    const proc = buildEnscribePipeline({ embedResources: false });
    const body = proc.stringify(proc.runSync(tree)).replace(/<style[\s\S]*?<\/style>/g, '');
    assert.ok(!/\?\?ref/.test(body), 'no unresolved cross-references');
    assert.ok(/figure[\s&]/i.test(body) && /table[\s&]/i.test(body) && /equation[\s&]/i.test(body), 'refs resolve to figure/table/equation');
    assert.ok(/src="image\.png"/.test(body), 'figure image rendered');
    assert.ok(/B, comma/.test(body), 'table comma-cell round-trips through CSV');
    console.log('PASS: figures, tables, cross-references, footnotes import');
  }

  // ── complex table (colspan) falls back to raw HTML, not CSV ──────────────────
  {
    const xml = `<article><front><article-meta><title-group><article-title>T</article-title></title-group></article-meta></front>
  <body><sec><title>S</title>
    <table-wrap id="T2"><table><tbody><tr><td colspan="2">spanning</td></tr><tr><td>1</td><td>2</td></tr></tbody></table></table-wrap>
  </sec></body></article>`;
    const tree = importJats(xml);
    assert.equal(tagged(tree, 'table').length, 0, 'complex table is NOT emitted as a <table> CSV');
    assert.equal(findAll(tree, (n) => n.type === 'html' && /<table/.test(n.value)).length, 1, 'complex table preserved as raw HTML');
    assert.equal(errorNodes(tree).length, 0, 'no error nodes');
    console.log('PASS: complex table → raw HTML fallback');
  }

  // ── round-trip: .emd figure + table + ref + note → export → import survive ───
  {
    const emd = `<meta type=article>
  <title | RT FTN>
</meta>

<# Intro #>

A reference to <ref @fig:demo> and <ref @tab:demo>, plus a footnote<note | inlined here>.

<fig #fig:demo src="pic.png" | The caption>

<table #tab:demo csv caption="Data" | x,y
1,2>
`;
    const proc = buildEnscribePipeline({ embedResources: false });
    const jats = enscribeToJats(proc.runSync(proc.parse(emd)));
    assert.ok(/<fig id="fig:demo">/.test(jats) && /<graphic xlink:href="pic.png"/.test(jats), 'RT: export emits fig + graphic');
    assert.ok(/<table-wrap id="tab:demo">/.test(jats), 'RT: export emits table-wrap');
    assert.ok(/<xref ref-type="fig" rid="fig:demo">/.test(jats), 'RT: export emits fig xref');

    const tree = importJats(jats);
    assert.equal(tagged(tree, 'fig')[0].kwargs.src, 'pic.png', 'RT: figure src survives');
    assert.equal(tagged(tree, 'table')[0].content, 'x,y\n1,2', 'RT: table CSV survives');
    assert.deepEqual(tagged(tree, 'ref').map((r) => r.atRefs[0]).sort(), ['fig:demo', 'tab:demo'], 'RT: cross-references survive (ids consistent)');
    assert.equal(tagged(tree, 'note').length, 1, 'RT: footnote survives as a note');
    const body = proc.stringify(proc.runSync(tree)).replace(/<style[\s\S]*?<\/style>/g, '');
    assert.ok(!/\?\?ref/.test(body), 'RT: cross-references resolve');
    console.log('PASS: round-trip export → import (figures, tables, refs, notes)');
  }

  console.log('All JATS import tests passed.');
}
