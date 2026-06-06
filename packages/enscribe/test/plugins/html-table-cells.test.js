// #108 — re-resolve Enscribe inline inside a no-format raw-HTML <table>.
//
// The JATS importer serializes a complex (HTML-layout) table to the no-format
// <table> escape hatch whose cells carry Enscribe inline source; on a fresh
// render of that .emd the cells must re-resolve (cite / ref / note / math),
// rather than appear as literal source. This also makes a hand-authored raw-HTML
// table with Enscribe inline first-class.

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../../src/interpreter/index.js';

const processHtml = (source, options = {}) =>
  String(buildEnscribePipeline({ embedResources: false, ...options }).processSync(source));

const LIBRARY = [
  '',
  '<data>',
  '<library |',
  '@article{smith2020, author = {Smith, Ada}, title = {On Cells}, journal = {J}, year = {2020}}',
  '>',
  '</data>',
  '',
  '<bibliography>',
  '</bibliography>',
].join('\n');

export function run() {
  // --- a hand-authored raw-HTML table resolves inline cite / note / math ------
  {
    const src = [
      '<meta type=article title="raw table">',
      '</meta>',
      '',
      '<fig #fig:plot | A plot.>',
      '',
      '<table>',
      '<thead><tr><th>sample</th><th>notes</th></tr></thead>',
      '<tbody>',
      '<tr><td>A</td><td>see <cite @smith2020> and <ref @fig:plot>, a note<note | inline note> and math <$x^2$></td></tr>',
      '</tbody>',
      '</table>',
      LIBRARY,
    ].join('\n');
    const html = processHtml(src);
    const cell = (html.match(/<td>see[\s\S]*?<\/td>/) || [''])[0];

    assert.ok(/<cite class="cite"[^>]*>\(Smith, 2020\)<\/cite>/.test(cell), '#108: cell cite resolves');
    assert.ok(/href="#fig:plot"/.test(cell) && /class="ref"/.test(cell), '#108: cell cross-ref resolves');
    assert.ok(/<sup[^>]*data-note-id="note-1"[^>]*><a href="#note-1">/.test(cell), '#108: cell footnote hoists to a marker');
    assert.ok(cell.includes('class="katex"'), '#108: cell math renders (KaTeX)');
    assert.ok(!/&lt;cite|&lt;ref|&lt;\$|<cite @|<note \|/.test(cell), '#108: no literal Enscribe source leaks into the cell');
    // header + grid structure preserved
    assert.ok(/<thead>[\s\S]*<th>sample<\/th>[\s\S]*<th>notes<\/th>/.test(html), '#108: thead header preserved');
    console.log('PASS: #108 — hand-authored raw-HTML table resolves cell cite/ref/note/math');
  }

  // --- colspan / rowspan / multi-row header are preserved ---------------------
  {
    const src = [
      '<table>',
      '<thead>',
      '<tr><th rowspan="2">Sample</th><th colspan="2">Measurements</th></tr>',
      '<tr><th>energy</th><th>note</th></tr>',
      '</thead>',
      '<tbody><tr><td>A</td><td>1.0</td><td>see <cite @smith2020></td></tr></tbody>',
      '</table>',
      LIBRARY,
    ].join('\n');
    const html = processHtml(src);
    assert.ok(/<th[^>]*rowspan="2"/.test(html) && /<th[^>]*colspan="2"/.test(html), '#108: spans preserved in render');
    assert.ok(/<cite class="cite"/.test(html), '#108: cite in a spanned-table cell resolves');
    console.log('PASS: #108 — colspan/rowspan/multi-row header preserved with resolving cells');
  }

  // --- a no-format <table> of NON-grid raw HTML stays raw passthrough ---------
  {
    const src = ['<table>', '<p>just a paragraph, no rows</p>', '</table>'].join('\n');
    const html = processHtml(src);
    // No <tr> → plugin is a no-op; the raw escape hatch passes through unchanged.
    assert.ok(html.includes('<p>just a paragraph, no rows</p>'), '#108: non-grid raw <table> content passes through');
    assert.ok(!/<thead>|<tbody>/.test(html), '#108: non-grid raw <table> is not turned into a grid');
    console.log('PASS: #108 — non-grid raw <table> is left as raw passthrough (no-op)');
  }

  // --- a data-format <table csv> is untouched by this plugin ------------------
  {
    const src = ['<table csv>', 'a,b', '1,2', '</table>'].join('\n');
    const html = processHtml(src);
    assert.ok(/<td>1<\/td>\s*<td>2<\/td>/.test(html.replace(/\n/g, '')), '#108: csv table still renders its rows');
    console.log('PASS: #108 — data-format <table csv> untouched');
  }
}
