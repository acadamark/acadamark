// table grammar — interpreter core (forward: description -> grid model)
// upgraded: multiple measures (measure becomes a dimension on an axis) and
// stub-head (dimension display label) rendering.

function normMembers(m) {
  if (Array.isArray(m)) {
    return m.map(x =>
      typeof x === 'string'
        ? { id: x, label: x, children: [] }
        : { id: x.id ?? x.label, label: x.label, children: normMembers(x.children || []) });
  }
  return Object.entries(m).map(([k, v]) => ({ id: k, label: k, children: normMembers(v) }));
}
function normDimensions(dims) {
  const out = {};
  for (const [name, d] of Object.entries(dims)) {
    out[name] = { name, label: d.label ?? name, tree: normMembers(d.members) };
  }
  return out;
}
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

function render(desc) {
  const dims = normDimensions(desc.dimensions);
  const span = desc.display.span ?? 'merge';
  const absent = desc.display.absent ?? '';
  const measures = (desc.measures && desc.measures.length) ? desc.measures : [{ name: 'value', label: '' }];
  const multi = measures.length > 1;
  const m0 = measures[0].name;

  let rowNames = [...(desc.display.rows ?? [])];
  let colNames = [...(desc.display.cols ?? [])];
  let measureDim = null;
  if (multi) {
    measureDim = { name: '__measure__', label: '', tree: measures.map(mz => ({ id: mz.name, label: mz.label ?? mz.name, children: [] })) };
    if ((desc.display.measureAxis ?? 'cols') === 'rows') rowNames.push('__measure__');
    else colNames.push('__measure__');
  }
  const getDim = n => (n === '__measure__' ? measureDim : dims[n]);
  const rowDims = rowNames.map(getDim);
  const colDims = colNames.map(getDim);

  const rowPos = axisPositions(rowDims);
  const colPos = axisPositions(colDims);
  const Lr = rowPos[0].nodes.length;
  const Lc = colPos[0].nodes.length;

  const realDimNames = Object.keys(dims);
  const fkey = c => realDimNames.map(k => `${k}=${c[k]}`).join('&');
  const factMap = new Map();
  for (const f of desc.facts) {
    const vals = f.values ?? { [m0]: f.value };
    factMap.set(fkey(f.coords), vals);
  }
  const lookup = coord => {
    const measure = multi ? coord.__measure__ : m0;
    const vals = factMap.get(fkey(coord));
    return vals ? vals[measure] : undefined;
  };

  const stubHead = rowDims.filter(d => d && d.name !== '__measure__').map(d => d.label).join(' / ');

  const thead = [];
  if (Lc === 0) {
    const row = [];
    if (Lr > 0) row.push({ tag: 'th', text: stubHead, colspan: Lr, rowspan: 1, corner: true });
    row.push({ tag: 'th', text: measures[0].label ?? '', colspan: 1, rowspan: 1 });
    thead.push(row);
  } else {
    const cg = levelGroups(colPos, Lc);
    for (let k = 0; k < Lc; k++) thead.push(cg[k].map(g => ({ tag: 'th', text: g.label, colspan: g.len, rowspan: 1 })));
    if (Lr > 0) thead[0].unshift({ tag: 'th', text: stubHead, colspan: Lr, rowspan: Lc, corner: true });
  }

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

function toText(grid) {
  const visual = [...grid.thead, ...grid.body];
  const cellAt = {}, occ = {};
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
      c += cell.colspan; maxC = Math.max(maxC, c);
    }
  }
  const R = visual.length, widths = Array(maxC).fill(0);
  for (let r = 0; r < R; r++) for (let c = 0; c < maxC; c++)
    widths[c] = Math.max(widths[c], (cellAt[`${r},${c}`] ?? '').length);
  const lines = [], hdr = grid.thead.length;
  for (let r = 0; r < R; r++) {
    const parts = [];
    for (let c = 0; c < maxC; c++) parts.push((cellAt[`${r},${c}`] ?? '').padEnd(widths[c]));
    lines.push('  ' + parts.join('  ').replace(/\s+$/, ''));
    if (r === hdr - 1) lines.push('  ' + widths.map(w => '─'.repeat(w)).join('  '));
  }
  return lines.join('\n');
}

export { render, toText, normDimensions };
