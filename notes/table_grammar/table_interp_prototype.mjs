// =============================================================================
// table grammar — PROTOTYPE interpreter, forward direction (description -> grid)
// =============================================================================
// This is a prototype to nail the AST + forward semantics. It is NOT the
// production module: no syntax, no hast, no fixtures. Descriptions are
// hand-constructed JS objects. The renderer is deterministic: same description
// -> same grid, every time. That determinism is the whole point — it is what
// makes any future draw-and-check possible.
//
// AST (a "description"):
//   dimensions: { name: { label?, members } }
//       members: ['A','B']                 flat
//             or { Group: ['A','B'], ... }  an outline (one level of nesting; nestable)
//   measures:   [ { name, label?, type } ] (prototype uses one implicit measure)
//   facts:      [ { coords: {dim: member}, value } ]   one member per dimension
//   display:    { rows: [dimName...], cols: [dimName...], span: 'merge'|'repeat',
//                 absent: '—' }
// =============================================================================

// ---------- normalization ----------
function normMembers(m) {
  if (Array.isArray(m)) {
    return m.map(x =>
      typeof x === 'string'
        ? { id: x, label: x, children: [] }
        : { id: x.id ?? x.label, label: x.label, children: normMembers(x.children || []) });
  }
  // object => outline: each key is a parent over its listed children
  return Object.entries(m).map(([k, v]) => ({ id: k, label: k, children: normMembers(v) }));
}
function normDimensions(dims) {
  const out = {};
  for (const [name, d] of Object.entries(dims)) {
    out[name] = { name, label: d.label ?? name, tree: normMembers(d.members) };
  }
  return out;
}

// root-to-leaf paths within ONE dimension; each path carries its leaf member id
function dimPaths(dim) {
  const out = [];
  const walk = (node, prefix) => {
    const p = [...prefix, node];
    if (!node.children.length) out.push({ nodes: p, leaf: node.id });
    else node.children.forEach(c => walk(c, p));
  };
  dim.tree.forEach(n => walk(n, []));
  return out;
}

// positions along an axis = cartesian product of its dimensions (outer dim first),
// each position keeping the full node path (for spanning) and its coordinate
function axisPositions(dimList) {
  let acc = [{ nodes: [], coords: {} }];
  for (const dim of dimList) {
    const dp = dimPaths(dim);
    const next = [];
    for (const a of acc)
      for (const p of dp)
        next.push({ nodes: [...a.nodes, ...p.nodes], coords: { ...a.coords, [dim.name]: p.leaf } });
    acc = next;
  }
  return acc;
}

const keyTo = (nodes, k) => nodes.slice(0, k + 1).map(n => n.id).join('|');

// consecutive-run groups at each level (drives colspans / rowspans)
function levelGroups(positions, levels) {
  const groups = [];
  for (let k = 0; k < levels; k++) {
    const g = [];
    let i = 0;
    while (i < positions.length) {
      const key = keyTo(positions[i].nodes, k);
      let j = i;
      while (j < positions.length && keyTo(positions[j].nodes, k) === key) j++;
      g.push({ start: i, len: j - i, label: positions[i].nodes[k].label });
      i = j;
    }
    groups.push(g);
  }
  return groups;
}

// ---------- the interpreter ----------
function render(desc) {
  const dims = normDimensions(desc.dimensions);
  const span = desc.display.span ?? 'merge';
  const absent = desc.display.absent ?? '';
  const rowDims = (desc.display.rows ?? []).map(n => dims[n]);
  const colDims = (desc.display.cols ?? []).map(n => dims[n]);

  const rowPos = axisPositions(rowDims);
  const colPos = axisPositions(colDims);
  const Lr = rowPos[0].nodes.length;   // stub width
  const Lc = colPos[0].nodes.length;   // header height

  // fact lookup
  const fkey = c => Object.keys(c).sort().map(k => `${k}=${c[k]}`).join('&');
  const factMap = new Map(desc.facts.map(f => [fkey(f.coords), f.value]));
  const lookup = coord => factMap.get(fkey(coord));

  // ----- header (thead) -----
  const thead = [];
  if (Lc === 0) {
    const row = [];
    if (Lr > 0) row.push({ tag: 'th', text: '', colspan: Lr, rowspan: 1, corner: true });
    row.push({ tag: 'th', text: (desc.measures?.[0]?.label) ?? '', colspan: 1, rowspan: 1 });
    thead.push(row);
  } else {
    const cg = levelGroups(colPos, Lc);
    for (let k = 0; k < Lc; k++) {
      const row = cg[k].map(g => ({ tag: 'th', text: g.label, colspan: g.len, rowspan: 1 }));
      thead.push(row);
    }
    if (Lr > 0) thead[0].unshift({ tag: 'th', text: '', colspan: Lr, rowspan: Lc, corner: true });
  }

  // ----- body -----
  const rg = levelGroups(rowPos, Lr);
  const body = [];
  for (let r = 0; r < rowPos.length; r++) {
    const row = [];
    for (let k = 0; k < Lr; k++) {
      if (span === 'merge') {
        const g = rg[k].find(x => x.start === r);
        if (g) row.push({ tag: 'th', text: g.label, rowspan: g.len, colspan: 1 });
      } else {
        const g = rg[k].find(x => r >= x.start && r < x.start + x.len);
        row.push({ tag: 'th', text: g.label, rowspan: 1, colspan: 1 });
      }
    }
    for (const c of colPos) {
      const v = lookup({ ...rowPos[r].coords, ...c.coords });
      row.push({ tag: 'td', text: v === undefined ? absent : String(v), rowspan: 1, colspan: 1 });
    }
    body.push(row);
  }

  return { thead, body };
}

// ---------- rasterize spans into a character grid (for eyeballing) ----------
function toText(grid) {
  const visual = [...grid.thead, ...grid.body];
  const cellAt = {};
  const occ = {};
  let maxC = 0;
  for (let r = 0; r < visual.length; r++) {
    let c = 0;
    for (const cell of visual[r]) {
      while (occ[`${r},${c}`]) c++;
      for (let dr = 0; dr < cell.rowspan; dr++)
        for (let dc = 0; dc < cell.colspan; dc++) {
          occ[`${r + dr},${c + dc}`] = true;
          cellAt[`${r + dr},${c + dc}`] = (dr === 0 && dc === 0) ? cell.text : '';
        }
      c += cell.colspan;
      maxC = Math.max(maxC, c);
    }
  }
  const R = visual.length;
  const widths = Array(maxC).fill(0);
  for (let r = 0; r < R; r++)
    for (let c = 0; c < maxC; c++)
      widths[c] = Math.max(widths[c], (cellAt[`${r},${c}`] ?? '').length);
  const lines = [];
  const headerRows = grid.thead.length;
  for (let r = 0; r < R; r++) {
    const parts = [];
    for (let c = 0; c < maxC; c++) parts.push((cellAt[`${r},${c}`] ?? '').padStart(widths[c]));
    lines.push('  ' + parts.join('  '));
    if (r === headerRows - 1) lines.push('  ' + widths.map(w => '─'.repeat(w)).join('  '));
  }
  return lines.join('\n');
}

function toHTML(grid) {
  const rowHtml = (cells) =>
    '    <tr>' + cells.map(c => {
      const sp = (c.rowspan > 1 ? ` rowspan="${c.rowspan}"` : '') + (c.colspan > 1 ? ` colspan="${c.colspan}"` : '');
      return `<${c.tag}${sp}>${c.text}</${c.tag}>`;
    }).join('') + '</tr>';
  return '<table>\n  <thead>\n' + grid.thead.map(rowHtml).join('\n') +
    '\n  </thead>\n  <tbody>\n' + grid.body.map(rowHtml).join('\n') +
    '\n  </tbody>\n</table>';
}

// =============================================================================
// ACCEPTANCE TEST: the white paper's Widgets/regions example, three projections
// =============================================================================
const base = {
  dimensions: {
    product: { members: ['Widgets', 'Gadgets'] },
    region: { members: { Domestic: ['North', 'South'] } },
  },
  measures: [{ name: 'value', label: 'value', type: 'number' }],
  facts: [
    { coords: { product: 'Widgets', region: 'North' }, value: 10 },
    { coords: { product: 'Widgets', region: 'South' }, value: 20 },
    { coords: { product: 'Gadgets', region: 'North' }, value: 5 },
    { coords: { product: 'Gadgets', region: 'South' }, value: 8 },
  ],
};
const desc = (display) => ({ ...base, display });

const P1 = desc({ rows: ['product'], cols: ['region'], span: 'merge' });
const P2 = desc({ rows: ['region'], cols: ['product'], span: 'merge' });
const P3 = desc({ rows: ['product', 'region'], cols: [], span: 'merge' });

console.log('=== Projection 1 — rows:[product] cols:[region] ===\n');
console.log(toText(render(P1)));
console.log('\n=== Projection 2 — rows:[region] cols:[product] ===\n');
console.log(toText(render(P2)));
console.log('\n=== Projection 3 — rows:[product,region] cols:[] (tidy) ===\n');
console.log(toText(render(P3)));

// determinism check
const a = JSON.stringify(render(P1)), b = JSON.stringify(render(P1));
console.log('\n[determinism] same description -> same grid:', a === b);

console.log('\n=== Projection 1 as HTML ===\n');
console.log(toHTML(render(P1)));

// =============================================================================
// STRESS TEST: the T2 shape — 4 dimensions, 3 nested on rows + 1 on cols.
// Same engine, bigger description. Values are SCHEMATIC (structure is the test).
// =============================================================================
const T2dims = {
  stage:    { label: 'Disease stage',         members: ['Acute/primary', 'Asymptomatic'] },
  infected: { label: 'HIV-infected partner',  members: ['W/W or \u039432/\u039432', 'W/\u039432'] },
  dir:      { label: 'Direction',             members: ['M\u2192F', 'F\u2192M'] },
  suscept:  { label: 'Susceptible partner',   members: ['W/W', 'W/\u039432', '\u039432/\u039432'] },
};
const T2facts = [];
let n = 1;
for (const s of ['Acute/primary', 'Asymptomatic'])
  for (const ig of ['W/W or \u039432/\u039432', 'W/\u039432'])
    for (const d of ['M\u2192F', 'F\u2192M'])
      for (const sg of ['W/W', 'W/\u039432', '\u039432/\u039432'])
        T2facts.push({ coords: { stage: s, infected: ig, dir: d, suscept: sg }, value: (n++).toString().padStart(2, '0') });

const T2 = {
  dimensions: T2dims,
  measures: [{ name: 'p', label: 'p', type: 'number' }],
  facts: T2facts,
  display: { rows: ['stage', 'infected', 'dir'], cols: ['suscept'], span: 'merge' },
};
console.log('\n=== T2 shape — rows:[stage,infected,dir] cols:[suscept] (schematic values) ===\n');
console.log(toText(render(T2)));
