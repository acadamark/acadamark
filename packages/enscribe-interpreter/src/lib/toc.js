// Table-of-contents generation (Phase 8 Slice 1).
//
// Build-time ToC: walk the compiled hast for the document's section structure,
// assign stable ids to any anchorless section, and wrap the document element in
// an opt-in layout container holding a <nav> of section links beside the body.
//
// OUTPUT-NEUTRAL GUARANTEE: applyToc is a strict no-op unless the ToC is enabled
// AND (in 'auto') the section-count threshold is met. When it does nothing it
// mutates nothing — so a document rendered without a ToC is byte-identical to
// before. The layout/ToC CSS lives in default.css, scoped to
// `.enscribe-layout--toc`, so it cannot affect non-ToC documents either.

// Section-like elements that become ToC entries. `book-part` (a chapter/part) is
// a top-level entry whose nested `section`s become its children.
const NAV_SECTIONS = new Set(['section', 'sub-section', 'sub-sub-section', 'book-part']);

const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

/** Concatenated text of a hast node's descendants. */
function textContent(node) {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

/** The title text of a nav section. Articles keep `<section><section-title>` as
 *  a direct child; books wrap it: `<book-part><meta><book-part-title>`. So check
 *  direct `*-title` children, then one level deeper through a non-section wrapper
 *  (never descending into a nested section, whose title is its own). */
function titleOf(node) {
  const clean = (n) => textContent(n).replace(/\s+/g, ' ').trim();
  for (const c of node.children ?? []) {
    if (c.type === 'element' && /-title$/.test(c.tagName)) return clean(c);
  }
  for (const c of node.children ?? []) {
    if (c.type !== 'element' || NAV_SECTIONS.has(c.tagName)) continue;
    for (const g of c.children ?? []) {
      if (g.type === 'element' && /-title$/.test(g.tagName)) return clean(g);
    }
  }
  return '';
}

/**
 * Collect the ToC tree from a container, preserving nesting. Each entry is
 * `{ el, title, id, children }` where `el` is the hast section element and `id`
 * is its authored id or null (assigned later). Non-section elements are
 * descended into, so sections anywhere under the container are found.
 */
function collectEntries(container) {
  const out = [];
  for (const child of container.children ?? []) {
    if (child.type !== 'element') continue;
    if (NAV_SECTIONS.has(child.tagName)) {
      out.push({ el: child, title: titleOf(child), id: child.properties?.id ?? null, children: collectEntries(child) });
    } else {
      out.push(...collectEntries(child));
    }
  }
  return out;
}

/** Every existing `id` in the tree, so generated slugs never collide with one. */
function collectIds(node, set) {
  if (node.properties?.id) set.add(node.properties.id);
  for (const c of node.children ?? []) if (c && c.type === 'element') collectIds(c, set);
  return set;
}

/** Slugify a title to a `sec:`-prefixed id fragment (matching the cross-ref convention). */
function slugify(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
  return `sec:${base}`;
}

/** A slug not already in `used`, suffixed `-2`, `-3`, … on collision. */
function uniqueId(candidate, used) {
  let id = candidate;
  let n = 2;
  while (used.has(id)) id = `${candidate}-${n++}`;
  used.add(id);
  return id;
}

/** Assign a stable id to every anchorless entry (mutating its hast element). */
function assignIds(entries, used) {
  for (const e of entries) {
    if (!e.id) {
      e.id = uniqueId(slugify(e.title), used);
      e.el.properties = e.el.properties ?? {};
      e.el.properties.id = e.id;
    }
    assignIds(e.children, used);
  }
}

/** Build the nested `<ul>` of links from the entry tree. */
function buildList(entries) {
  return el('ul', {}, entries.map((e) => el('li', {}, [
    el('a', { href: `#${e.id}` }, [text(e.title)]),
    ...(e.children.length ? [buildList(e.children)] : []),
  ])));
}

/**
 * Build the ToC `<nav>`. The links work with no JavaScript; a `<details>`
 * (open by default) gives a native, JS-free collapse on narrow viewports, while
 * the desktop CSS hides the `<summary>` and shows it as an always-open sidebar.
 */
function buildNav(entries) {
  return el('nav', { className: ['enscribe-toc'], ariaLabel: 'Table of contents' }, [
    el('details', { className: ['enscribe-toc-details'], open: true }, [
      el('summary', { className: ['enscribe-toc-summary'] }, [text('Contents')]),
      buildList(entries),
    ]),
  ]);
}

/**
 * Apply the table-of-contents to a compiled hast tree, in place. No-op unless
 * `toc` is `true` or (`'auto'` with more than three top-level sections).
 *
 * @param {import('hast').Root} hast  the compiled document hast (children hold the
 *   `<article>` / `<book>` element; assets are injected by the caller afterwards).
 * @param {boolean|'auto'} toc
 */
export function applyToc(hast, toc) {
  if (toc !== true && toc !== 'auto') return;

  const docIdx = (hast.children ?? []).findIndex(
    (c) => c.type === 'element' && (c.tagName === 'article' || c.tagName === 'book'),
  );
  if (docIdx === -1) return;
  const docEl = hast.children[docIdx];

  const entries = collectEntries(docEl);
  if (entries.length === 0) return;
  // 'auto': only worth a sidebar past a few top-level sections.
  if (toc === 'auto' && entries.length <= 3) return;

  assignIds(entries, collectIds(docEl, new Set()));

  const nav = buildNav(entries);
  const main = el('main', { className: ['enscribe-body'] }, [docEl]);
  hast.children[docIdx] = el('div', { className: ['enscribe-layout', 'enscribe-layout--toc'] }, [nav, main]);
}
