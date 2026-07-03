// Sidenote render mode (#33, part 1) — a display-only HTML projection that
// relocates each numbered note's CONTENT into a margin column beside its marker.
//
// Display-only by construction: this runs on the HAST, in the compiler, only
// when the document is in margin mode (note-position=margin). The mdast tree is never
// touched — the bottom <note-list> that note-placement builds stays in place —
// so the numbering and the JATS export are byte-identical, and the bottom list
// remains as the below-breakpoint (mobile) fallback. The pass:
//
//   1. reads each note's rendered content from the bottom
//      <note-list><ol><li id=ID>…</li></ol></note-list> (dropping the backref),
//   2. inserts a <span class="enscribe-sidenote"> carrying a copy of that content
//      right after the matching inline marker <sup data-note-id=ID>,
//   3. marks the layout wrapper `.enscribe-layout--margin` (reusing
//      enscribe's `.enscribe-layout--*` chrome; creating the wrapper if applyToc
//      did not already make one).
//
// default.css (consumer-supplied) floats the span into the margin near its marker
// on wide screens and hides the bottom list; below the breakpoint it hides the
// spans and shows the bottom list — the existing footnote rendering. The marker
// and number are left exactly as the default footnote rendering emits them.
//
// Off (default 'bottom') this is never called → byte-identical output.

const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });

/** Deep-clone a hast subtree. hast nodes are plain JSON (no functions). */
function clone(node) {
  return JSON.parse(JSON.stringify(node));
}

function hasClass(node, name) {
  const c = node?.properties?.className;
  return Array.isArray(c) && c.includes(name);
}

/**
 * Collect id → [content nodes] from the bottom <note-list>. Each note's content
 * is the <li>'s children minus the trailing back-reference link (which has no
 * place in the margin copy).
 */
function collectNotes(node, map, all) {
  if (node.type === 'element' && node.tagName === 'note-list') {
    for (const ol of node.children ?? []) {
      if (ol.type !== 'element' || ol.tagName !== 'ol') continue;
      for (const li of ol.children ?? []) {
        if (li.type !== 'element' || li.tagName !== 'li' || !li.properties?.id) continue;
        // Per-note margin (#333): when not projecting every note (doc default is
        // not note-position=margin), relocate only the margin notes — the ones
        // flagged sidenote-fallback (placement=margin). When `all`, the document
        // note-position=margin relocates every numbered note regardless.
        if (!all && !hasClass(li, 'sidenote-fallback')) continue;
        const content = (li.children ?? [])
          .filter((c) => !(c.type === 'element' && c.tagName === 'a' && hasClass(c, 'note-backref')))
          .map(clone);
        map.set(li.properties.id, content);
      }
    }
    return; // note-lists do not nest
  }
  for (const c of node.children ?? []) collectNotes(c, map, all);
}

/**
 * Insert a margin <span class="enscribe-sidenote"> right after each inline marker
 * <sup data-note-id=ID> whose id is in `map`.
 */
function injectSpans(node, map) {
  const kids = node.children;
  if (!Array.isArray(kids)) return;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    injectSpans(c, map);
    if (
      c.type === 'element' &&
      c.tagName === 'sup' &&
      c.properties?.dataNoteId != null &&
      map.has(c.properties.dataNoteId)
    ) {
      const span = el('span', { className: ['enscribe-sidenote'] }, map.get(c.properties.dataNoteId));
      kids.splice(i + 1, 0, span);
      i++; // step past the span just inserted
    }
  }
}

/**
 * Mark the document's layout wrapper as a margin layout
 * (`.enscribe-layout--margin`) — the shared column the margin notes float into
 * (#33). If applyToc already wrapped the document element, add the class to that
 * wrapper (so a ToC + margin content co-mark one wrapper); otherwise wrap the
 * document element (article/book) the same way applyToc does.
 *
 * Exported and factored out of relocation so the caller marks the layout once,
 * after applySidenotes reports that at least one note moved into the column.
 */
export function markMarginLayout(hast) {
  const kids = hast.children ?? [];
  const layout = kids.find((c) => c.type === 'element' && hasClass(c, 'enscribe-layout'));
  if (layout) {
    if (!hasClass(layout, 'enscribe-layout--margin')) {
      layout.properties.className = [...(layout.properties.className ?? []), 'enscribe-layout--margin'];
    }
    return;
  }
  const idx = kids.findIndex(
    (c) => c.type === 'element' && (c.tagName === 'article' || c.tagName === 'book'),
  );
  if (idx === -1) return;
  const docEl = kids[idx];
  kids[idx] = el('div', { className: ['enscribe-layout', 'enscribe-layout--margin'] }, [
    el('main', { className: ['enscribe-body'] }, [docEl]),
  ]);
}

/**
 * Relocate numbered-note content into the margin: inject a margin <span> beside
 * each marker. Returns true if any note was relocated.
 *
 * `all` selects the scope (#333): when true (document note-position=margin) every
 * numbered note is relocated; when false only the margin notes (placement=margin,
 * flagged sidenote-fallback) are — so a per-note `<note position=margin>` lands in
 * the margin even on a default (bottom) document.
 *
 * Does NOT mark the layout — the caller calls markMarginLayout when this returns
 * true, establishing the shared margin column (#33 part 2 factored the marking out
 * of relocation).
 *
 * @param {import('hast').Root} hast
 * @param {{ all?: boolean }} [opts]
 * @returns {boolean} true if any note was relocated (false → nothing to relocate)
 */
export function applySidenotes(hast, { all = false } = {}) {
  const notes = new Map();
  collectNotes(hast, notes, all);
  if (notes.size === 0) return false;
  injectSpans(hast, notes);
  return true;
}
