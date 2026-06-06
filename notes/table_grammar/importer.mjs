// =============================================================================
// PROTOTYPE JATS table importer (backward: displayed table -> description)
// Parses the real tables from demo-paper.html, strips obvious cruft, recovers a
// candidate description, and round-trips it through the forward interpreter.
// Goal: "reasonably well" — nail the clean relational shape, and recover the
// messy cube at the DATA level (resolving subheading rows + forward-fill).
// =============================================================================
import { load } from 'cheerio';
import fs from 'fs';
import { render, toText } from './grammar_core.mjs';

const $ = load(fs.readFileSync('/mnt/user-data/uploads/demo-paper.html', 'utf8'));

// ---- parse a table into a grid: cells placed on an occupancy matrix ----
function parseGrid(id) {
  const tbl = $('table[id="' + id + '"]');
  const occ = [];
  const rows = [];                 // rows[r] = [ {c, rs, cs, text, tag, isHr} ]
  const ensure = r => { while (occ.length <= r) occ.push([]); };
  tbl.find('tr').each((r, tr) => {
    ensure(r);
    const rowCells = [];
    let c = 0;
    $(tr).children('th,td').each((_, el) => {
      const $el = $(el);
      const cs = +($el.attr('colspan') || 1);
      const rs = +($el.attr('rowspan') || 1);
      const hasHr = $el.find('hr').length > 0;
      const text = $el.text().replace(/\s+/g, ' ').trim();
      const isHr = hasHr && text === '';
      const tag = el.tagName.toLowerCase();
      while (occ[r][c]) c++;
      rowCells.push({ c, rs, cs, text, tag, isHr });
      for (let dr = 0; dr < rs; dr++) { ensure(r + dr); for (let dc = 0; dc < cs; dc++) occ[r + dr][c + dc] = true; }
      c += cs;
    });
    rows.push(rowCells);
  });
  const ncols = Math.max(...occ.map(r => r.length), 0);
  return { rows, ncols };
}

const isDivider = row => row.length > 0 && row.every(c => c.isHr);

// ---- recover a clean RELATIONAL table (key column + measure columns) ----
function recoverRelational(grid) {
  const rows = grid.rows.filter(r => !isDivider(r));
  // header = leading rows that are all <th>
  let h = 0;
  while (h < rows.length && rows[h].every(c => c.tag === 'th')) h++;
  if (h !== 1) return null;                       // relational = exactly one header row
  const header = rows[0].map(c => c.text);
  const body = rows.slice(1).filter(r => r.length === grid.ncols);
  if (body.length < 2 || grid.ncols < 2) return null;
  const keyLabel = header[0], measureLabels = header.slice(1);
  const dimensions = { [keyLabel]: { label: keyLabel, members: body.map(r => r[0].text) } };
  const measures = measureLabels.map(l => ({ name: l, label: l, type: 'inline' }));
  const facts = body.map(r => ({
    coords: { [keyLabel]: r[0].text },
    values: Object.fromEntries(measureLabels.map((l, i) => [l, r[i + 1].text])),
  }));
  const display = { rows: [keyLabel], cols: [], measureAxis: 'cols' };
  return { description: { dimensions, measures, facts, display }, triples: body.map(r => r.map(c => c.text)) };
}

// ---- recover the CUBE at the data level: subheading rows + forward-fill ----
function recoverCube(grid) {
  const rows = grid.rows.filter(r => !isDivider(r));
  // header rows = leading all-<th> rows; column labels come from the LAST header row
  let h = 0;
  while (h < rows.length && rows[h].some(c => c.tag === 'th') && rows[h].every(c => c.tag === 'th')) h++;
  if (h < 1) return null;
  const lastHeader = rows[h - 1];                 // e.g. [ "(to j)"@c1, W/W@c2, W/Δ32@c3, Δ32/Δ32@c4 ]
  // susceptible-genotype labels = header cells at columns >= 2
  const colLabelByC = {};
  lastHeader.forEach(c => { colLabelByC[c.c] = c.text; });
  const suscepts = Object.keys(colLabelByC).map(Number).filter(c => c >= 2).sort((a, b) => a - b).map(c => colLabelByC[c]);
  const dirLabel = colLabelByC[1] || 'direction';

  const stages = [], genos = [], dirs = [], facts = [];
  let stage = null, geno = null;
  for (const row of rows.slice(h)) {
    if (row.length === 1) {                        // lone-cell subheading row -> a stage member
      stage = row[0].text;
      if (!stages.includes(stage)) stages.push(stage);
      continue;
    }
    // data row: [ genotype-or-blank@c0, direction@c1, p@c2, p@c3, p@c4 ]
    const byC = {}; row.forEach(c => { byC[c.c] = c.text; });
    const g = byC[0];
    if (g && g.length) geno = g;                   // forward-fill: blank c0 inherits previous
    if (geno && !genos.includes(geno)) genos.push(geno);
    const dir = byC[1];
    if (dir && !dirs.includes(dir)) dirs.push(dir);
    suscepts.forEach((sg, i) => {
      const v = byC[2 + i];
      if (v !== undefined && v !== '') facts.push({ coords: { stage, infected: geno, dir, suscept: sg }, value: v });
    });
  }
  const dimensions = {
    stage:    { label: 'Disease stage',        members: stages },
    infected: { label: 'HIV-infected partner', members: genos },
    dir:      { label: dirLabel,               members: dirs },
    suscept:  { label: 'Susceptible partner',  members: suscepts },
  };
  const display = { rows: ['stage', 'infected', 'dir'], cols: ['suscept'], span: 'merge' };
  return { description: { dimensions, measures: [{ name: 'p', label: '' }], facts, display } };
}

// ---------------------------------------------------------------------------
console.log('############ T4 — relational (Parameter | Definition | Value) ############\n');
const g4 = parseGrid('tab:T4');
const r4 = recoverRelational(g4);
if (r4) {
  console.log('recovered: 1 key dimension (' + Object.keys(r4.description.dimensions)[0] +
    '), measures = [' + r4.description.measures.map(m => m.name).join(', ') + '], ' +
    r4.description.facts.length + ' rows\n');
  console.log('--- rendered forward from the recovered description (first rows): ---\n');
  const txt = toText(render(r4.description)).split('\n').slice(0, 8).join('\n');
  console.log(txt);
  // draw-and-check at the DATA level: source triples vs recovered triples
  const srcTriples = r4.triples.map(t => t.join(' | '));
  const recTriples = r4.description.facts.map(f =>
    [f.coords['Parameter'], f.values['Definition'], f.values['Value']].join(' | '));
  const same = JSON.stringify(srcTriples) === JSON.stringify(recTriples);
  console.log('\n[data check] recovered rows identical to source rows:', same);
}

console.log('\n\n############ T2 — the messy cube ############\n');
const g2 = parseGrid('tab:T2');
const r2 = recoverCube(g2);
if (r2) {
  const d = r2.description;
  console.log('recovered dimensions:');
  for (const [k, v] of Object.entries(d.dimensions))
    console.log('  ' + k + ' (' + v.label + '): [' + v.members.join(', ') + ']');
  console.log('  measures: [' + d.measures.map(m => m.name).join(', ') + '],  facts: ' + d.facts.length);
  console.log('\n--- rendered forward as a CLEAN cube (first rows): ---\n');
  console.log(toText(render(d)).split('\n').slice(0, 9).join('\n'));
  // data check: number of facts should equal stages*genos*dirs*suscepts
  const n = Object.values(d.dimensions).reduce((a, v) => a * v.members.length, 1);
  console.log('\n[data check] facts recovered = ' + d.facts.length + ' ; full grid would be ' + n);
}
