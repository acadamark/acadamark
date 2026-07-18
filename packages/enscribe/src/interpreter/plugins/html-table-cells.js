// #108: re-resolve Enscribe inline inside a no-format raw-HTML `<table>`.
//
// The JATS importer serializes a complex (HTML-layout) table to `.emd` as the
// no-format `<table>` escape hatch whose content is an HTML grid carrying
// Enscribe inline *source* in its cells (#106's `htmlGridToSource`, which
// HTML-escapes the source: `<cite @k>` → `&lt;cite @k&gt;`). On a fresh render of
// that `.emd`, the table node arrives with that content as an opaque string and
// NO `_htmlTable` stamp (the importer's in-memory stamp doesn't survive
// serialization), so the handler's raw branch emits `{type:'raw'}` and the cells
// never resolve — the `import-jats --emd` → `render` round-trip shows literal
// source.
//
// This plugin closes that round-trip. In the mdast phase (BEFORE the notes /
// numbering / ref / cite resolution passes, like #21's cell-parse), it parses the
// escape-hatch content as an HTML grid, recovers each cell's Enscribe inline
// source, parses it to canonical inline mdast (the same `parseInlineCellToMdast`
// as #21/#105), and stamps the SAME `node._htmlTable` shape #106 defined — so the
// shared walkers descend it, and the HTML handler and JATS emitter render it,
// with zero changes to any of them. It also makes a hand-authored raw-HTML
// `<table>` whose cells carry Enscribe inline first-class (`<td>see <cite @k></td>`
// resolves), not just importer output.
//
// Scope guard: only no-format `<table>` nodes whose content actually looks like a
// grid (`<tr>`); a no-format `<table>` of other raw HTML is left as raw
// passthrough, and a data-format table (`<table csv|…>`) is left to #21. A table
// already carrying `_htmlTable` / `_parsedCells` (importer direct path, or #21) is
// untouched. So documents without a raw-HTML grid table are byte-identical.

import { fromHtml } from 'hast-util-from-html';
import { discover } from '../../core/walkers/discover.js';
import { parseInlineCellToMdast } from '../lib/parse-inline.js';

/**
 * mdast-transform plugin. Stamps `node._htmlTable` on a no-format raw-HTML
 * `<table>` escape hatch whose content is an HTML grid, with each cell's inner
 * Enscribe inline source parsed to tree-resident mdast.
 *
 * NOT registered in the main pipeline since the wave-1 walk merge: the stamp
 * rides table-cell-parse's `table` walk as its second branch (one traversal,
 * two mutually-exclusive stamps — see table-cell-parse.js). This standalone
 * wrapper remains for direct use; `stampHtmlTable` is the exported visitor.
 *
 * @returns {(tree: object) => void}
 */
export function enscribeHtmlTableCells() {
  return function htmlTableCells(tree) {
    discover(tree, new Map([['table', stampHtmlTable]]));
  };
}

/** The #108 visitor: guards itself (no-format, unstamped, grid-shaped) and stamps. */
export function stampHtmlTable(node) {
  if (node.positional?.[0]) return;            // data-format table → #21's job
  if (node._htmlTable || node._parsedCells) return; // already structured
  const content = typeof node.content === 'string' ? node.content : '';
  if (!/<tr[\s/>]/i.test(content)) return;     // not a grid → raw passthrough, unchanged

  const grid = parseHtmlGrid(content);
  if (grid.rows.length) node._htmlTable = grid;
}

// ─── HTML grid → `_htmlTable` ────────────────────────────────────────────────

function parseHtmlGrid(content) {
  // Wrap in <table> so parse5 keeps thead/tbody/tr/td structure (a bare <thead>
  // fragment would be reparented). Offsets below index into this wrapped string.
  const W = `<table>${content}</table>`;
  const root = fromHtml(W, { fragment: true });
  const table = findFirst(root, 'table');
  const rows = [];
  if (table) {
    for (const child of table.children) {
      if (child.type !== 'element') continue;
      if (child.tagName === 'thead') addRows(child, 'head', W, rows);
      else if (child.tagName === 'tbody' || child.tagName === 'tfoot') addRows(child, 'body', W, rows);
      else if (child.tagName === 'tr') pushRow(child, 'body', W, rows);
    }
  }
  return { rows };
}

function addRows(section, kind, W, rows) {
  for (const tr of section.children) {
    if (tr.type === 'element' && tr.tagName === 'tr') pushRow(tr, kind, W, rows);
  }
}

function pushRow(tr, section, W, rows) {
  const cells = [];
  let allDivider = true;
  for (const el of tr.children) {
    if (el.type !== 'element' || (el.tagName !== 'td' && el.tagName !== 'th')) continue;
    const divider = isDividerCell(el);
    if (!divider) allDivider = false;
    const src = divider ? '' : decodeEntities(innerSource(el, W));
    const cell = { header: el.tagName === 'th', inline: parseInlineCellToMdast(src) };
    const cs = parseInt(el.properties?.colSpan ?? el.properties?.colspan, 10);
    const rs = parseInt(el.properties?.rowSpan ?? el.properties?.rowspan, 10);
    if (Number.isFinite(cs) && cs > 1) cell.colspan = cs;
    if (Number.isFinite(rs) && rs > 1) cell.rowspan = rs;
    const align = el.properties?.align;
    if (align) cell.align = String(align);
    cells.push(cell);
  }
  if (!cells.length) return;            // no cells
  if (allDivider) return;               // decorative <hr>-only row → drop (matches #106)
  rows.push({ section, cells });
}

/** Raw inner source of a cell, sliced from the wrapped string by child offsets. */
function innerSource(cell, W) {
  const kids = cell.children ?? [];
  if (!kids.length) return '';
  const s = kids[0].position?.start?.offset;
  const e = kids[kids.length - 1].position?.end?.offset;
  return (s == null || e == null) ? textOf(cell) : W.slice(s, e);
}

function isDividerCell(cell) {
  return hasTag(cell, 'hr') && textOf(cell).trim() === '';
}

/** Decode the XML/HTML entities that escaping (or hand-authoring) may introduce. */
function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&'); // last, so `&amp;lt;` → `&lt;` not `<`
}
function safeCodePoint(n) {
  try { return String.fromCodePoint(n); } catch { return ''; }
}

// ─── tiny hast helpers ───────────────────────────────────────────────────────

function findFirst(node, tagName) {
  if (node.tagName === tagName) return node;
  for (const c of node.children ?? []) {
    if (c.type === 'element' || c.type === 'root') {
      const found = findFirst(c, tagName);
      if (found) return found;
    }
  }
  return null;
}
function hasTag(node, tagName) {
  if (node.tagName === tagName) return true;
  return (node.children ?? []).some((c) => c.type === 'element' && hasTag(c, tagName));
}
function textOf(node) {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textOf).join('');
}
