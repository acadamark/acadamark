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
import { ENSCRIBE_CONFIG } from '../core/file-data-keys.js';

// ── #467: margin-note projection on the per-chapter surfaces ──────────────────────────────
//
// A margin note's body reaches this chapter's fragment by ONE of two routes, both already
// present in the FULL render — renderChapter reproduces the same book-part fragment for each:
//
//   1. A chapter-scope end/foot note (incl. every note when the doc sets note-position=margin)
//      collects INTO its <book-part> at note-placement (per-unit). It is already in bookPartNode,
//      so applySidenotes (which runs inside proc.stringify) projects its <sidenote> beside the
//      marker with no help from us. This is the headline case — it already worked.
//   2. A per-note `<note position=margin>` (whose doc default is NOT margin) routes to the
//      document-level residual <note-list> in <book-back> (#333), OUTSIDE this book-part. The
//      full render's applySidenotes still projects it (it keys on the inline marker, which IS in
//      the part). renderChapter's subtree lacks that residual list, so WITHOUT help the sidenote
//      is missing. We reconstruct a per-chapter COPY of the residual list (Ariel's ruling:
//      display-only at the render boundary — the archival <book-back> list is untouched, so
//      eHTML/JATS are unchanged) and inject it as a book-part SIBLING; applySidenotes then
//      projects the <sidenote> INTO the book-part, and extractBookPart drops the sibling copy —
//      leaving a fragment byte-identical to the full render's (whose residual list is likewise
//      outside the part). NOTE: a residual-routed margin note has no in-page mobile fallback on a
//      per-chapter page (the fallback list is document-level); route 1 keeps its fallback. This
//      is the accepted (a) trade-off; note-scope=document margin is out of scope (a documented
//      limitation — the author's explicit one-document-list choice conflicts with per-page copies).
//
// The layout wrapper (Problem B): when ANY note projects, the full render wraps the whole <book>
// in <div class="enscribe-layout--margin"><main class="enscribe-body">, nesting EVERY book-part two
// levels deeper — a whole-document decision. renderChapter runs the compiler per chapter, so a
// NOTE-LESS chapter in a margin book would otherwise not wrap and its interior would indent two
// spaces short of the full render. So when the document is a margin book we reproduce that wrapper
// here, matching the in-context nesting depth for every chapter, note-bearing or not.

/** Collect the note ids (`__note-marker` kwargs.noteId) referenced anywhere in a subtree. */
function collectNoteIds(node, out = new Set()) {
  if (node?.type === 'enscribeTag' && node.tagname === '__note-marker' && node.kwargs?.noteId != null) {
    out.add(node.kwargs.noteId);
  }
  for (const c of node?.children ?? []) collectNoteIds(c, out);
  for (const c of (Array.isArray(node?.content) ? node.content : [])) collectNoteIds(c, out);
  return out;
}

/** The document-level residual `<note-list>` (a `__note-list` NOT inside any `<book-part>`), or null. */
function findResidualNoteList(numbered) {
  let found = null;
  (function search(node, insidePart) {
    if (found) return;
    if (node?.type === 'enscribeTag' && node.tagname === '__note-list' && !insidePart) { found = node; return; }
    const nowInside = insidePart || (node?.type === 'enscribeTag' && node.tagname === 'book-part');
    for (const c of node?.children ?? []) search(c, nowInside);
    for (const c of (Array.isArray(node?.content) ? node.content : [])) search(c, nowInside);
  })(numbered, false);
  return found;
}

/**
 * Does the FULL render wrap this document in `.enscribe-layout--margin`? True exactly when
 * applySidenotes would relocate ≥1 note — i.e. `note-position=margin` with any note (every note
 * projects), OR any per-note margin note (a `sidenote:true` list item) regardless of the default.
 */
export function isMarginBook(numbered, file) {
  const configMap = file?.data?.[ENSCRIBE_CONFIG];
  const notePosition = configMap?.get?.('note-position') ?? 'bottom';
  let anyItem = false;
  let anySidenote = false;
  (function walk(node) {
    if (node?.type === 'enscribeTag' && node.tagname === '__note-list-item') {
      anyItem = true;
      if (node.kwargs?.sidenote) anySidenote = true;
    }
    for (const c of node?.children ?? []) walk(c);
    for (const c of (Array.isArray(node?.content) ? node.content : [])) walk(c);
  })(numbered);
  return notePosition === 'margin' ? anyItem : anySidenote;
}

/**
 * Extract the OUTERMOST `<book-part>…</book-part>` fragment from rendered HTML,
 * matching nested book-parts (a <part> containing <chapter>s) correctly.
 */
export function extractBookPart(html) {
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
 * @param {object} [opts.numbered] - the full numbered tree (proc.runSync output). Needed only
 *   for #467 margin-note projection: it carries the document-level residual <note-list> and the
 *   note-position config. Omit it and margin books render without their residual sidenotes /
 *   wrapper (non-margin books are byte-identical either way).
 * @returns {string} the chapter's `<book-part>` HTML fragment
 */
export function renderChapter(bookPartNode, registry, opts = {}) {
  const { proc, file, numbered } = opts;
  if (!proc || typeof proc.stringify !== 'function') {
    throw new Error('renderChapter: opts.proc must be a configured pipeline (buildEnscribePipeline(options))');
  }

  // #467: a per-chapter COPY of the residual <note-list>, filtered to THIS chapter's markers, as a
  // book-part sibling — so applySidenotes projects the residual-routed margin notes' <sidenote> into
  // the part (see the header). Empty when the doc has no residual list or this chapter has none of it.
  const siblings = [bookPartNode];
  const residual = numbered ? findResidualNoteList(numbered) : null;
  if (residual) {
    const ids = collectNoteIds(bookPartNode);
    const items = (residual.content ?? []).filter((it) => ids.has(it.id));
    if (items.length > 0) siblings.push({ ...residual, content: items });
  }

  // Wrap at the in-context nesting depth so rehype-format indents identically. extractBookPart
  // strips the wrappers — only the depth matters. For a margin book (Problem B) the full render
  // wraps <book> in the .enscribe-layout--margin div>main, nesting book-parts two levels deeper;
  // reproduce that here so EVERY chapter (note-bearing or not) matches. markMarginLayout, running
  // in the compiler, then finds this .enscribe-layout wrapper and only re-stamps the class (no-op).
  const book = makeTag('book', [makeTag('book-body', siblings)]);
  const rootChildren = (numbered && isMarginBook(numbered, file))
    ? [{
        type: 'element', tagName: 'div', properties: { className: ['enscribe-layout', 'enscribe-layout--margin'] },
        children: [{ type: 'element', tagName: 'main', properties: { className: ['enscribe-body'] }, children: [book] }],
      }]
    : [book];
  const html = String(proc.stringify({ type: 'root', children: rootChildren }, file));
  return extractBookPart(html);
}
