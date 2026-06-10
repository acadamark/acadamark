// Shared table-cell descent for the tree walkers (#170).
//
// A data-format table's content is an opaque string (the walkers skip opaque
// content), but two passes stamp per-cell inline node arrays onto the table
// node: `_parsedCells` (#21, table-cell-parse — `rows[][].inline`) and
// `_htmlTable` (#106, the JATS importer — `rows[].cells[].inline`). Both
// discover.js and walk-replace.js must descend those inline arrays so cell
// content (refs / cites / notes / math) is seen / rewritten like body content;
// walk-normalize.js deliberately does not. This is the one descent the two
// share, kept here so the two stamps live in a single place — a prior copy of
// this logic drifted (see walk-replace.js's header). No-op for any node without
// a stamp → byte-identical.

/**
 * Descend a (table) node's parsed / complex-HTML cell inline arrays.
 *
 * @param {object} node - checked for `_parsedCells` and `_htmlTable` stamps
 * @param {(inline: Array) => void} recurse - process a single cell's inline array
 */
export function descendCellArrays(node, recurse) {
  if (node._parsedCells && Array.isArray(node._parsedCells.rows)) {
    for (const row of node._parsedCells.rows) {
      for (const cell of row) {
        if (cell && Array.isArray(cell.inline)) recurse(cell.inline);
      }
    }
  }
  if (node._htmlTable && Array.isArray(node._htmlTable.rows)) {
    for (const row of node._htmlTable.rows) {
      for (const cell of row.cells ?? []) {
        if (cell && Array.isArray(cell.inline)) recurse(cell.inline);
      }
    }
  }
}
