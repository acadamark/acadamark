// Per-chapter render entry (lazy live book rendering, L1 — #204).
//
// Renders a single <book-part> (chapter) to its HTML content fragment — byte-
// identical to that chapter's fragment within the full-book render. This is the
// engine half of lazy book rendering: the GLOBAL pass (proc.runSync) is cheap —
// it numbers every target and resolves every cross-reference WITHOUT rendering —
// and the expensive RENDER (mdast -> hast -> HTML; images, diagrams, tables, code)
// is bound here to one chapter, run only when that chapter is viewed (L2).
//
// WHY IT IS BYTE-IDENTICAL (the gate, confirmed): proc.runSync bakes every cross-
// chapter concern (ref text "figure 1.1", per-chapter numbering, per-chapter notes)
// into the tree. A <book-part> subtree taken from that tree is therefore self-
// contained; stringify-ing it is a pure projection of an already-resolved subtree.
// The only depth-sensitive detail is rehype-format's indentation, so the subtree is
// wrapped at its in-context nesting depth (book > book-body > book-part) before
// stringify — the book-part content is region-independent, so a fixed book-body
// wrapper reproduces the in-context indentation for any chapter.
//
// The `registry` (harvestCrossRefRegistry's output) is threaded for the L3 cross-
// chapter preview overlay: a cross-chapter <ref> whose rich target was never
// rendered falls back to the registry's number+title. The rendered fragment itself
// does NOT need it under L1 (the ref's number is already baked from the global pass)
// — it is plumbed here so L2/L3 have it at the per-chapter boundary.

import { makeTag } from '../core/tag.js';

/**
 * Extract the OUTERMOST `<book-part>…</book-part>` fragment from rendered HTML,
 * matching nested book-parts (a <part> containing <chapter>s) correctly.
 */
function extractBookPart(html) {
  // `<book-part>` / `<book-part …>` — the trailing [\s>] excludes `<book-part-title>`
  // and `<book-part-…>` children from counting as nested opens.
  const openRe = /<book-part[\s>]/g;
  const CLOSE = '</book-part>';
  const first = openRe.exec(html);
  if (!first) return '';
  const start = first.index;
  let i = start;
  let depth = 0;
  while (i < html.length) {
    openRe.lastIndex = i + 1;
    const nextOpenMatch = openRe.exec(html);
    const nextOpen = nextOpenMatch ? nextOpenMatch.index : -1;
    const nextClose = html.indexOf(CLOSE, i + 1);
    if (nextClose === -1) return '';
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen;
    } else if (depth === 0) {
      return html.slice(start, nextClose + CLOSE.length);
    } else {
      depth -= 1;
      i = nextClose;
    }
  }
  return '';
}

/**
 * Render one chapter (a <book-part> from the numbered runSync tree) to its HTML
 * content fragment, byte-identical to the in-context full-render fragment.
 *
 * @param {object} bookPartNode - a `<book-part>` node from the numbered tree
 * @param {Map} registry - the harvested cross-ref registry (L3 plumbing; not needed
 *   for ref text under L1, where refs are baked by the global pass)
 * @param {object} opts
 * @param {object} opts.proc - a configured pipeline (buildEnscribePipeline(options));
 *   its stringify MUST use the SAME options as the full render for byte-identity
 * @param {object} [opts.file] - the VFile threading compiler config (loadedSources,
 *   <config>, …); pass the same one used for the full render
 * @returns {string} the chapter's `<book-part>` HTML fragment
 */
export function renderChapter(bookPartNode, registry, opts = {}) {
  const { proc, file } = opts;
  if (!proc || typeof proc.stringify !== 'function') {
    throw new Error('renderChapter: opts.proc must be a configured pipeline (buildEnscribePipeline(options))');
  }
  // Wrap at the in-context nesting depth so rehype-format indents identically. The
  // book/book-body wrappers are stripped by extractBookPart; only the depth matters
  // (and the book-part content is region-independent — a fixed book-body suffices).
  const wrapped = { type: 'root', children: [makeTag('book', [makeTag('book-body', [bookPartNode])])] };
  const html = String(proc.stringify(wrapped, file));
  return extractBookPart(html);
}
