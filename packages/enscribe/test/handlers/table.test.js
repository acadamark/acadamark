import assert from 'node:assert/strict';
import { tableHandler, parseCsv } from '../../src/interpreter/handlers/table.js';

// State mock is not used by tableHandler (it builds hast directly from data),
// but we pass a minimal object in case future code checks for properties.
const STATE = {};
const VOCAB = {};

function makeNode({
  id = null,
  classes = [],
  positional = [],
  kwargs = {},
  booleans = {},
  content = '',
  computedNumber = null,
} = {}) {
  return {
    type: 'enscribeTag',
    tagname: 'table',
    id,
    classes,
    positional,
    kwargs,
    booleans,
    content,
    computedNumber,
  };
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function run() {
  // CSV with headers (default)
  {
    const node = makeNode({
      positional: ['csv'],
      content: 'a,b,c\n1,2,3\n4,5,6',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.tagName, 'table');
    const [thead, tbody] = hast.children;
    assert.equal(thead.tagName, 'thead');
    assert.equal(thead.children[0].children.length, 3, 'three header cells');
    assert.equal(thead.children[0].children[0].children[0].value, 'a');
    assert.equal(thead.children[0].children[1].children[0].value, 'b');
    assert.equal(thead.children[0].children[2].children[0].value, 'c');
    assert.equal(tbody.tagName, 'tbody');
    assert.equal(tbody.children.length, 2, 'two data rows');
    assert.equal(tbody.children[0].children[0].children[0].value, '1');
    console.log('PASS: table handler: CSV with headers');
  }

  // CSV with -headers (no thead)
  {
    const node = makeNode({
      positional: ['csv'],
      booleans: { headers: false },
      content: 'x,y\n1,2',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.tagName, 'table');
    assert.equal(hast.children.length, 1, 'only tbody, no thead');
    assert.equal(hast.children[0].tagName, 'tbody');
    console.log('PASS: table handler: CSV with -headers produces tbody only');
  }

  // CSV with quoted cells containing comma
  {
    const node = makeNode({
      positional: ['csv'],
      content: '"last, first",age\n"Smith, John",42',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const headerCells = hast.children[0].children[0].children;
    assert.equal(headerCells[0].children[0].value, 'last, first');
    const bodyRow = hast.children[1].children[0].children;
    assert.equal(bodyRow[0].children[0].value, 'Smith, John');
    assert.equal(bodyRow[1].children[0].value, '42');
    console.log('PASS: table handler: CSV quoted cells with embedded commas');
  }

  // CSV with leading blank lines (common in pipe content)
  {
    const node = makeNode({
      positional: ['csv'],
      content: '\n\nkey,val\nfoo,1',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.children[0].tagName, 'thead', 'leading blanks skipped');
    assert.equal(hast.children[0].children[0].children[0].children[0].value, 'key');
    console.log('PASS: table handler: CSV with leading blank lines');
  }

  // ─── TSV ────────────────────────────────────────────────────────────────────

  {
    const node = makeNode({
      positional: ['tsv'],
      content: 'col1\tcol2\nA\tB\nC\tD',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.tagName, 'table');
    const [thead, tbody] = hast.children;
    assert.equal(thead.children[0].children[0].children[0].value, 'col1');
    assert.equal(tbody.children.length, 2);
    assert.equal(tbody.children[0].children[1].children[0].value, 'B');
    console.log('PASS: table handler: TSV with headers');
  }

  // #44: TSV honors RFC-4180 quoting (shares the CSV parser, delimiter = tab).
  // A quoted cell containing a tab stays one cell; doubled "" is an escaped quote.
  {
    const node = makeNode({
      positional: ['tsv'],
      content: 'a\tb\tc\n"x\ty"\t"she said ""hi"""\tz',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [thead, tbody] = hast.children;
    assert.equal(thead.children[0].children.length, 3, 'TSV header has 3 columns');
    assert.equal(tbody.children.length, 1, 'TSV: one data row (no phantom split)');
    const cells = tbody.children[0].children;
    assert.equal(cells.length, 3, 'TSV data row has 3 cells, not split on the embedded tab');
    assert.equal(cells[0].children[0].value, 'x\ty', 'quoted cell keeps its embedded tab');
    assert.equal(cells[1].children[0].value, 'she said "hi"', 'doubled quote unescapes');
    console.log('PASS: table handler: TSV honors RFC-4180 quoting (embedded tab + escaped quote)');
  }

  // ─── JSON ────────────────────────────────────────────────────────────────────

  // Array of objects
  {
    const node = makeNode({
      positional: ['json'],
      content: JSON.stringify([{ x: 1, y: 2 }, { x: 3, y: 4 }]),
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [thead, tbody] = hast.children;
    assert.equal(thead.children[0].children[0].children[0].value, 'x');
    assert.equal(thead.children[0].children[1].children[0].value, 'y');
    assert.equal(tbody.children[0].children[0].children[0].value, '1');
    console.log('PASS: table handler: JSON array-of-objects');
  }

  // Array of arrays
  {
    const node = makeNode({
      positional: ['json'],
      content: JSON.stringify([['h1', 'h2'], ['v1', 'v2']]),
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [thead, tbody] = hast.children;
    assert.equal(thead.children[0].children[0].children[0].value, 'h1');
    assert.equal(tbody.children[0].children[1].children[0].value, 'v2');
    console.log('PASS: table handler: JSON array-of-arrays');
  }

  // JSON array of objects with -headers
  {
    const node = makeNode({
      positional: ['json'],
      booleans: { headers: false },
      content: JSON.stringify([{ a: 1 }, { a: 2 }]),
    });
    const hast = tableHandler(STATE, node, VOCAB);
    // No thead when hasHeaders=false for array-of-objects: headers derived from
    // keys, but since hasHeaders=false we emit only tbody rows.
    assert.equal(hast.children.length, 1, 'only tbody');
    assert.equal(hast.children[0].tagName, 'tbody');
    console.log('PASS: table handler: JSON array-of-objects with -headers');
  }

  // JSON parse error
  {
    const node = makeNode({
      positional: ['json'],
      content: 'not valid json {{{',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.tagName, 'table');
    assert.equal(hast.properties.className[0], 'table-parse-error');
    console.log('PASS: table handler: JSON parse error → error table');
  }

  // ─── YAML ─────────────────────────────────────────────────────────────────

  // Sequence of mappings
  {
    const node = makeNode({
      positional: ['yaml'],
      content: '- key: a\n  val: 1\n- key: b\n  val: 2',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [thead, tbody] = hast.children;
    assert.equal(thead.children[0].children[0].children[0].value, 'key');
    assert.equal(tbody.children[0].children[1].children[0].value, '1');
    assert.equal(tbody.children[1].children[0].children[0].value, 'b');
    console.log('PASS: table handler: YAML sequence of mappings');
  }

  // Sequence of sequences
  {
    const node = makeNode({
      positional: ['yaml'],
      content: '- [H1, H2]\n- [v1, v2]',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [thead, tbody] = hast.children;
    assert.equal(thead.children[0].children[0].children[0].value, 'H1');
    assert.equal(tbody.children[0].children[0].children[0].value, 'v1');
    console.log('PASS: table handler: YAML sequence of sequences');
  }

  // ─── MD ──────────────────────────────────────────────────────────────────────

  {
    const node = makeNode({
      positional: ['md'],
      content: '| col1 | col2 |\n|------|------|\n| A    | B    |\n| C    | D    |',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [thead, tbody] = hast.children;
    assert.equal(thead.children[0].children[0].children[0].value, 'col1');
    assert.equal(thead.children[0].children[1].children[0].value, 'col2');
    assert.equal(tbody.children.length, 2);
    assert.equal(tbody.children[1].children[0].children[0].value, 'C');
    console.log('PASS: table handler: MD pipe table');
  }

  // MD with alignment separators (colons)
  {
    const node = makeNode({
      positional: ['md'],
      content: '| left | right |\n|:-----|------:|\n| x    | y     |',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.children[0].tagName, 'thead');
    assert.equal(hast.children[1].children[0].children[0].children[0].value, 'x');
    console.log('PASS: table handler: MD pipe table with colon alignment markers');
  }

  // ─── Raw HTML pass-through (no format) ───────────────────────────────────

  {
    const node = makeNode({
      // No positional — escape-hatch form
      content: '<tbody><tr><td>raw</td></tr></tbody>',
      id: 'raw-tbl',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.type, 'raw', 'raw pass-through node');
    assert.ok(hast.value.includes('<table'), 'contains opening table tag');
    assert.ok(hast.value.includes('id="raw-tbl"'), 'id attribute present');
    assert.ok(hast.value.includes('<tbody>'), 'raw content preserved');
    console.log('PASS: table handler: raw HTML pass-through (no format)');
  }

  // ─── Caption ─────────────────────────────────────────────────────────────

  // Caption without numbering
  {
    const node = makeNode({
      positional: ['csv'],
      kwargs: { caption: 'My caption' },
      content: 'h\n1',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [caption] = hast.children;
    assert.equal(caption.tagName, 'caption');
    // No <table-label> when not numbered
    assert.ok(!caption.children.some(c => c.tagName === 'table-label'), 'no label element');
    assert.equal(caption.children[0].value, 'My caption');
    console.log('PASS: table handler: caption without numbering');
  }

  // Caption with numbering
  {
    const node = makeNode({
      positional: ['csv'],
      kwargs: { caption: 'Numbered caption' },
      content: 'h\n1',
      computedNumber: 3,
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [caption] = hast.children;
    assert.equal(caption.tagName, 'caption');
    const labelSpan = caption.children.find(c => c.tagName === 'table-label');
    assert.ok(labelSpan, 'label element present when numbered');
    assert.equal(labelSpan.children[0].value, 'Table 3.');
    assert.ok(
      caption.children.some(c => c.value === 'Numbered caption'),
      'caption text present',
    );
    console.log('PASS: table handler: caption with Table N. label');
  }

  // computedNumber without caption text
  {
    const node = makeNode({
      positional: ['csv'],
      content: 'h\n1',
      computedNumber: 1,
    });
    const hast = tableHandler(STATE, node, VOCAB);
    const [caption] = hast.children;
    assert.equal(caption.tagName, 'caption');
    assert.equal(caption.children[0].children[0].value, 'Table 1.');
    console.log('PASS: table handler: numbered with no caption text');
  }

  // ─── id and classes ──────────────────────────────────────────────────────

  {
    const node = makeNode({
      positional: ['csv'],
      id: 'tbl-1',
      classes: ['wide'],
      content: 'a\n1',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.properties.id, 'tbl-1');
    assert.deepEqual(hast.properties.className, ['wide']);
    console.log('PASS: table handler: id and classes on table element');
  }

  // ─── Unknown format ───────────────────────────────────────────────────────

  {
    const node = makeNode({
      positional: ['xlsx'],
      content: '...',
    });
    const hast = tableHandler(STATE, node, VOCAB);
    assert.equal(hast.properties.className[0], 'table-parse-error');
    assert.ok(
      hast.children[0].children[0].children[0].children[0].value.includes('unknown format'),
      'error message mentions unknown format',
    );
    console.log('PASS: table handler: unknown format → error table');
  }

  // ─── src= with missing assetsDir ─────────────────────────────────────────

  {
    const node = makeNode({
      positional: ['csv'],
      kwargs: { src: 'data.csv' },
    });
    const hast = tableHandler(STATE, node, VOCAB, {}); // no assetsDir
    assert.equal(hast.properties.className[0], 'table-parse-error');
    assert.ok(
      hast.children[0].children[0].children[0].children[0].value.includes('assetsDir'),
    );
    console.log('PASS: table handler: src= without assetsDir → error table');
  }

  // ─── parseCsv: no phantom trailing cell after a quoted final field ───────────
  // A row ending in a quoted (e.g. comma-bearing) field must NOT gain a spurious
  // trailing empty cell. A genuine trailing delimiter still yields the empty.
  {
    const row = (text) => parseCsv(text, { hasHeaders: false }).rows[0];
    assert.deepEqual(row('a,"b,c"'), ['a', 'b,c'], 'quoted final field → no phantom');
    assert.deepEqual(row('a,b,'), ['a', 'b', ''], 'trailing delimiter → keeps the empty field');
    assert.deepEqual(row('a,b'), ['a', 'b'], 'plain row → exact cells');
    assert.deepEqual(row('"a,b",c'), ['a,b', 'c'], 'quoted non-final field unaffected');
    assert.deepEqual(row('"only"'), ['only'], 'single quoted field → no phantom');
    assert.deepEqual(row('a,"b""q"'), ['a', 'b"q'], 'escaped quote in final field → no phantom');
    console.log('PASS: table handler: parseCsv no phantom trailing cell (quoted final field)');
  }

  // ─── #271: a space after the comma must not defeat a quoted field ─────────────
  // `, "x, y"` is standard-CSV-tolerant and should parse the quote exactly as
  // `,"x, y"` does — the leading space is skipped before the quote test.
  {
    const row = (text) => parseCsv(text, { hasHeaders: false }).rows[0];
    assert.deepEqual(row('label, "x, y"'), ['label', 'x, y'], 'space-after-comma: quote honored, no inner split');
    assert.deepEqual(row('label,"x, y"'), ['label', 'x, y'], 'no-space form still parses identically');
    assert.deepEqual(row('a,  "b, c",  "d"'), ['a', 'b, c', 'd'], 'multiple spaces, multiple quoted fields');
    assert.deepEqual(row('a, plain, c'), ['a', 'plain', 'c'], 'unquoted fields after a space are unaffected (still trimmed)');
    console.log('PASS: table handler: #271 space-after-comma does not defeat a quoted CSV field');
  }

  // ─── render: a quoted comma-bearing last column → header width == body width ──
  {
    const node = makeNode({ positional: ['csv'], content: 'name,tags\nA,"x, y, z"\nB,"p, q"' });
    const hast = tableHandler(STATE, node, VOCAB);
    const [thead, tbody] = hast.children;
    const headerW = thead.children[0].children.length;
    assert.equal(headerW, 2, 'two header columns');
    for (const tr of tbody.children) {
      assert.equal(tr.children.length, headerW, 'body row width matches header (no phantom column)');
    }
    assert.equal(tbody.children[0].children[1].children[0].value, 'x, y, z', 'quoted comma value intact');
    console.log('PASS: table handler: quoted comma-bearing last column keeps header==body width');
  }
}
