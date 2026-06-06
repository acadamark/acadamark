import { load } from 'cheerio';
import fs from 'fs';

function gridFromTable($, tblEl) {
  const occ = [], rows = []; const ensure = r => { while (occ.length <= r) occ.push([]); };
  $(tblEl).find('tr').each((r, tr) => {
    ensure(r); const rc = []; let c = 0;
    $(tr).children('th,td').each((_, el) => {
      const $e = $(el); const cs = +($e.attr('colspan') || 1), rs = +($e.attr('rowspan') || 1);
      const text = $e.text().replace(/\s+/g, ' ').trim();
      const isHr = $e.find('hr').length > 0 && text === '';
      const inThead = $e.closest('thead').length > 0;
      const tag = el.tagName.toLowerCase();
      while (occ[r][c]) c++; rc.push({ c, rs, cs, text, tag, isHr, inThead });
      for (let dr = 0; dr < rs; dr++) { ensure(r + dr); for (let dc = 0; dc < cs; dc++) occ[r + dr][c + dc] = true; } c += cs;
    });
    rows.push(rc);
  });
  return { rows, ncols: Math.max(...occ.map(r => r.length), 0) };
}
const isDivider = row => row.length > 0 && row.every(c => c.isHr);
// the prototype's two recognizers (key header detection on <th>)
function recoverRelational(grid) {
  const rows = grid.rows.filter(r => !isDivider(r));
  let h = 0; while (h < rows.length && rows[h].length && rows[h].every(c => c.inThead)) h++;
  if (h !== 1) return null;
  const body = rows.slice(1).filter(r => r.length === grid.ncols);
  if (body.length < 2 || grid.ncols < 2) return null;
  return { kind: 'relational' };
}
function recoverCube(grid) {
  const rows = grid.rows.filter(r => !isDivider(r));
  let h = 0; while (h < rows.length && rows[h].length && rows[h].every(c => c.inThead)) h++;
  if (h < 1) return null;
  if (!rows.slice(h).some(r => r.length === 1)) return null;
  return { kind: 'cube' };
}

function diagnose(grid) {
  const rows = grid.rows.filter(r => !isDivider(r));
  const theadRows = rows.filter(r => r.length && r.every(c => c.inThead)).length;
  const anyTh = rows.some(r => r.some(c => c.tag === 'th'));
  const maxCs = Math.max(1, ...rows.flatMap(r => r.map(c => c.cs)));
  const maxRs = Math.max(1, ...rows.flatMap(r => r.map(c => c.rs)));
  return { theadRows, anyTh, maxCs, maxRs };
}
function reason(grid) {
  const d = diagnose(grid);
  if (d.theadRows >= 2 || d.maxCs > 1) return `multi-level/spanning header (thead rows=${d.theadRows}, maxColspan=${d.maxCs}) — recognizers handle neither`;
  if (d.theadRows === 1 && !d.anyTh) return `header is in <thead> but cells are <td> — recognizer keys on <th>`;
  if (d.theadRows === 0) return `no <thead>; header signal unclear`;
  return `falls through recognizers`;
}

let totals = { recovered: 0, literal: 0, tables: 0 };
for (const file of process.argv.slice(2)) {
  const $ = load(fs.readFileSync(file, 'utf8'), { xmlMode: true });
  const tables = $('table-wrap table').toArray();
  console.log(`\n#### ${file.split('/').pop()} — ${tables.length} encoded tables ####`);
  tables.forEach((el, i) => {
    const grid = gridFromTable($, el);
    const rec = recoverRelational(grid) || recoverCube(grid);
    const d = diagnose(grid);
    totals.tables++;
    if (rec) { totals.recovered++; console.log(`  T${i + 1}: ${grid.ncols} cols, thead=${d.theadRows}, th=${d.anyTh}, span=${d.maxCs}/${d.maxRs}  ->  RECOVERED (${rec.kind})`); }
    else { totals.literal++; console.log(`  T${i + 1}: ${grid.ncols} cols, thead=${d.theadRows}, th=${d.anyTh}, span=${d.maxCs}/${d.maxRs}  ->  LITERAL — ${reason(grid)}`); }
  });
}
console.log(`\n==== ${totals.recovered}/${totals.tables} recovered by the prototype's recognizers; ${totals.literal}/${totals.tables} fell to literal ====`);
