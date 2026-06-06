import { load } from 'cheerio';
import { render } from './grammar_core.mjs';

// --- parse + the prototype's two recognizers (copied from importer.mjs) ---
function parseTable(html) {
  const $ = load(html); const tbl = $('table').first();
  const occ = [], rows = []; const ensure = r => { while (occ.length <= r) occ.push([]); };
  tbl.find('tr').each((r, tr) => {
    ensure(r); const rc = []; let c = 0;
    $(tr).children('th,td').each((_, el) => {
      const $e = $(el); const cs = +($e.attr('colspan') || 1), rs = +($e.attr('rowspan') || 1);
      const isHr = $e.find('hr').length > 0 && $e.text().trim() === '';
      const text = $e.text().replace(/\s+/g, ' ').trim(); const tag = el.tagName.toLowerCase();
      while (occ[r][c]) c++; rc.push({ c, rs, cs, text, tag, isHr });
      for (let dr = 0; dr < rs; dr++) { ensure(r + dr); for (let dc = 0; dc < cs; dc++) occ[r + dr][c + dc] = true; } c += cs;
    });
    rows.push(rc);
  });
  return { rows, ncols: Math.max(...occ.map(r => r.length), 0) };
}
const isDivider = row => row.length > 0 && row.every(c => c.isHr);
function recoverRelational(grid) {
  const rows = grid.rows.filter(r => !isDivider(r));
  let h = 0; while (h < rows.length && rows[h].every(c => c.tag === 'th')) h++;
  if (h !== 1) return null;
  const header = rows[0].map(c => c.text); const body = rows.slice(1).filter(r => r.length === grid.ncols);
  if (body.length < 2 || grid.ncols < 2) return null;
  const key = header[0], ms = header.slice(1);
  return { kind: 'relational', description: {
    dimensions: { [key]: { label: key, members: body.map(r => r[0].text) } },
    measures: ms.map(l => ({ name: l, label: l })),
    facts: body.map(r => ({ coords: { [key]: r[0].text }, values: Object.fromEntries(ms.map((l, i) => [l, r[i + 1].text])) })),
    display: { rows: [key], cols: [], measureAxis: 'cols' } } };
}
function recoverCube(grid) {
  const rows = grid.rows.filter(r => !isDivider(r));
  let h = 0; while (h < rows.length && rows[h].length && rows[h].every(c => c.tag === 'th')) h++;
  if (h < 1) return null;
  const hasSubheadings = rows.slice(h).some(r => r.length === 1);
  if (!hasSubheadings) return null;            // cube recognizer REQUIRES lone-cell subheading rows
  return { kind: 'cube', description: null };  // (full build omitted here; we only care that it fires)
}

// --- draw-and-check under the proposed normalization ---
function expand(visual) {
  const at = {}, occ = {}; let maxC = 0;
  for (let r = 0; r < visual.length; r++) { let c = 0;
    for (const cell of visual[r]) { while (occ[`${r},${c}`]) c++;
      for (let dr = 0; dr < cell.rowspan; dr++) for (let dc = 0; dc < cell.colspan; dc++) {
        occ[`${r + dr},${c + dc}`] = true; at[`${r + dr},${c + dc}`] = (dr === 0 && dc === 0) ? cell.text : ''; }
      c += cell.colspan; maxC = Math.max(maxC, c); } }
  const m = []; for (let r = 0; r < visual.length; r++) { const row = []; for (let c = 0; c < maxC; c++) row.push(at[`${r},${c}`] ?? ''); m.push(row); }
  return m;
}
const srcMatrix = g => expand(g.rows.filter(r => !isDivider(r)).map(r => r.map(c => ({ text: c.text, rowspan: c.rs, colspan: c.cs }))));
const modMatrix = g => expand([...g.thead, ...g.body]);
const eqMatrix = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function importTable(name, html) {
  const grid = parseTable(html);
  const rec = recoverRelational(grid) || recoverCube(grid);
  let verdict;
  if (!rec) verdict = 'no recognizer fired  -> LITERAL FLOOR';
  else if (!rec.description) verdict = `${rec.kind} recognizer fired (build omitted)`;
  else {
    const reproduces = eqMatrix(srcMatrix(grid), modMatrix(render(rec.description)));
    verdict = reproduces ? `${rec.kind} recovery PASSES draw-and-check -> ACCEPT` : `${rec.kind} fired but FAILS draw-and-check -> LITERAL FLOOR`;
  }
  console.log(`• ${name}: ${verdict}`);
}

// ---- patterns deliberately UNLIKE the four tables ----
importTable('A. clean 2-level column spanner (Region × Year>Quarter)', `<table>
<tr><th rowspan="2">Region</th><th colspan="2">2023</th><th colspan="2">2024</th></tr>
<tr><th>Q1</th><th>Q2</th><th>Q1</th><th>Q2</th></tr>
<tr><td>North</td><td>10</td><td>12</td><td>11</td><td>13</td></tr>
<tr><td>South</td><td>8</td><td>9</td><td>7</td><td>8</td></tr></table>`);

importTable('B. relational with a trailing Total row', `<table>
<tr><th>Item</th><th>Count</th></tr>
<tr><td>Apples</td><td>10</td></tr>
<tr><td>Pears</td><td>5</td></tr>
<tr><td>Total</td><td>15</td></tr></table>`);

importTable('C. relational with a units header row', `<table>
<tr><th>Sample</th><th>Mass</th><th>Length</th></tr>
<tr><th></th><th>(kg)</th><th>(cm)</th></tr>
<tr><td>A</td><td>1.2</td><td>30</td></tr>
<tr><td>B</td><td>2.4</td><td>45</td></tr></table>`);
