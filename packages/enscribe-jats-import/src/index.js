// JATS XML → Enscribe import (Phase 13 Slice 1: core structural + inline).
//
// The reverse of @enscribejs/jats-export. `importJats(xml)` parses a JATS
// article and produces an Enscribe mdast tree of `enscribeTag` + native mdast
// nodes — the same shape the parser produces post-normalize — ready for:
//   - buildEnscribePipeline().runSync(tree) + .stringify(tree) → HTML
//   - serializeCanonical(tree) (from @enscribejs/cli) → .emd source
//
// Deliberately lossy and incremental. This slice maps the structural skeleton
// (article / front / body / sec / p) and inline formatting (bold, italic,
// monospace, underline, strike, sup, sub, links). Citations, math, figures,
// tables, cross-references, the theorem family, DSL blocks, and the
// non-representable-element reduction policy land in later slices; elements this
// slice does not handle are dropped (with a one-line console warning naming
// each kind), never silently.

import { SaxesParser } from 'saxes';
import { makeTag } from '@enscribejs/core/tag';

// ─── XML → a small DOM tree (saxes) ───────────────────────────────────────────

/**
 * Parse XML into a minimal element tree: each element is
 * `{ name, attributes, children }`; text is `{ name: '#text', value }`.
 * The `<?xml?>` declaration and `<!DOCTYPE>` preamble are ignored; CDATA is
 * folded into text (so `<tex-math><![CDATA[…]]>` reads as text in later slices).
 * Returns the document's root `<article>` / `<book>` element.
 */
function parseXml(xml) {
  const root = { name: '#root', attributes: {}, children: [] };
  const stack = [root];
  const parser = new SaxesParser({ xmlns: false });
  let firstError = null;

  parser.on('opentag', (tag) => {
    const node = { name: tag.name, attributes: tag.attributes, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  parser.on('closetag', () => { stack.pop(); });
  const pushText = (value) => stack[stack.length - 1].children.push({ name: '#text', value });
  parser.on('text', pushText);
  parser.on('cdata', pushText);
  parser.on('error', (e) => { if (!firstError) firstError = e; });

  parser.write(xml).close();
  if (firstError) throw new Error(`JATS parse error: ${firstError.message}`);

  return root.children.find((c) => c.name === 'article' || c.name === 'book') ?? null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const isEl = (n) => n && n.name !== '#text';
const isWsText = (n) => n.name === '#text' && !n.value.trim();
const childEl = (node, name) => node.children.find((c) => c.name === name);
const childrenEls = (node, name) => node.children.filter((c) => c.name === name);

/** Concatenated descendant text of a node. */
function textOf(node) {
  if (node.name === '#text') return node.value;
  return (node.children ?? []).map(textOf).join('');
}

// Track dropped (not-yet-supported) element kinds; warn once per kind.
const _dropped = new Set();
function noteDropped(name) {
  if (_dropped.has(name)) return;
  _dropped.add(name);
  // eslint-disable-next-line no-console
  console.warn(`[jats-import] note: <${name}> is not yet imported (dropped)`);
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Import a JATS XML article string to an Enscribe mdast tree.
 * @param {string} xml - JATS XML source.
 * @returns {import('mdast').Root}
 */
export function importJats(xml) {
  _dropped.clear();
  const doc = parseXml(xml);
  if (!doc) throw new Error('JATS import: no <article> or <book> root element found');
  if (doc.name === 'book') {
    // Book import is a later slice; for now, surface a clear error rather than a
    // mangled article.
    throw new Error('JATS import: <book> (BITS) import is not yet supported (article only)');
  }
  return { type: 'root', children: convertArticle(doc) };
}

// ─── article ──────────────────────────────────────────────────────────────────

function convertArticle(article) {
  const out = [];
  const front = childEl(article, 'front');
  const meta = front ? buildMeta(front) : null;
  if (meta) out.push(meta);

  const body = childEl(article, 'body');
  if (body) out.push(...convertBlocks(body.children, 0));
  // <back> (bibliography, footnotes) is handled in later slices.
  return out;
}

/** Build a `<meta type=article>` from `<front><article-meta>`. */
function buildMeta(front) {
  const am = childEl(front, 'article-meta') ?? front;
  const children = [];

  const titleGroup = childEl(am, 'title-group');
  if (titleGroup) {
    const t = childEl(titleGroup, 'article-title');
    if (t) children.push(makeTag('title', convertInline(t.children)));
    const sub = childEl(titleGroup, 'subtitle');
    if (sub) children.push(makeTag('subtitle', convertInline(sub.children)));
  }

  const contribGroup = childEl(am, 'contrib-group');
  if (contribGroup) {
    for (const contrib of childrenEls(contribGroup, 'contrib')) {
      const name = contribName(contrib);
      if (name) children.push(makeTag('author', [{ type: 'text', value: name }]));
    }
  }

  const date = childEl(am, 'pub-date') ?? childEl(am, 'date');
  const dateStr = date ? formatDate(date) : null;
  if (dateStr) children.push(makeTag('date', [{ type: 'text', value: dateStr }]));

  const abstract = childEl(am, 'abstract');
  if (abstract) children.push(makeTag('abstract', convertBlocks(abstract.children, 99)));

  // `<meta>` is a long-form apparatus container holding its child tags.
  return { ...makeTag('meta', children, { kwargs: { type: 'article' } }), form: 'long' };
}

/** A contributor's display name from `<string-name>` or `<name><surname>/<given-names>`. */
function contribName(contrib) {
  const stringName = childEl(contrib, 'string-name');
  if (stringName) return textOf(stringName).trim();
  const name = childEl(contrib, 'name');
  if (name) {
    const surname = childEl(name, 'surname');
    const given = childEl(name, 'given-names');
    return [given && textOf(given).trim(), surname && textOf(surname).trim()].filter(Boolean).join(' ');
  }
  return textOf(contrib).trim() || null;
}

/** YYYY[-MM[-DD]] from a `<pub-date>`/`<date>` with year/month/day children, or its text. */
function formatDate(date) {
  const y = childEl(date, 'year');
  if (!y) return textOf(date).trim() || null;
  const parts = [textOf(y).trim()];
  const m = childEl(date, 'month');
  if (m) parts.push(textOf(m).trim().padStart(2, '0'));
  const d = childEl(date, 'day');
  if (d) parts.push(textOf(d).trim().padStart(2, '0'));
  return parts.join('-');
}

// ─── body blocks ──────────────────────────────────────────────────────────────

/** Convert a sequence of block-level JATS children at the given section depth. */
function convertBlocks(children, depth) {
  const out = [];
  for (const child of children) {
    if (child.name === '#text') {
      if (!isWsText(child)) out.push({ type: 'paragraph', children: convertInline([child]) });
      continue;
    }
    if (child.name === 'sec') { out.push(...convertSec(child, depth)); continue; }
    const block = convertBlock(child, depth);
    if (block) out.push(...(Array.isArray(block) ? block : [block]));
  }
  return out;
}

/**
 * A `<sec>` flattens to a section/sub-section/sub-sub-section tag (the title in
 * its pipe content) followed by its body content as siblings — the shape the
 * section-nesting plugin re-nests. JATS recurses `<sec>` for all depths; Enscribe
 * caps at three named levels, so depth 3+ clamps to sub-sub-section.
 */
function convertSec(sec, depth) {
  const tag = ['section', 'sub-section', 'sub-sub-section'][Math.min(depth, 2)];
  const titleEl = childEl(sec, 'title');
  const titleInline = titleEl ? convertInline(titleEl.children) : [{ type: 'text', value: '' }];
  const id = sec.attributes.id || null;
  const sectionTag = makeTag(tag, [{ type: 'paragraph', children: titleInline }], { id });

  const bodyChildren = sec.children.filter((c) => c !== titleEl);
  return [sectionTag, ...convertBlocks(bodyChildren, depth + 1)];
}

function convertBlock(node, depth) {
  switch (node.name) {
    case 'p':         return { type: 'paragraph', children: convertInline(node.children) };
    case 'list':      return convertList(node, depth);
    case 'disp-quote':return { type: 'blockquote', children: convertBlocks(node.children, depth) };
    case 'title':     return null; // consumed by convertSec
    default:
      noteDropped(node.name); // figures, tables, math, statements, … (later slices)
      return null;
  }
}

function convertList(node, depth) {
  const ordered = node.attributes['list-type'] === 'order' || node.attributes['list-type'] === 'ordered';
  const items = childrenEls(node, 'list-item').map((li) => ({
    type: 'listItem',
    spread: false,
    children: convertBlocks(li.children, depth + 1),
  }));
  return { type: 'list', ordered, start: ordered ? 1 : null, spread: false, children: items };
}

// ─── inline ───────────────────────────────────────────────────────────────────

const INLINE_TAG_MAP = {
  bold: 'b', italic: 'i', underline: 'u', strike: 's', sup: 'sup', sub: 'sub',
};
const DROP_INLINE = new Set(['inline-formula', 'disp-formula', 'xref']); // later slices

/** Convert inline JATS children to inline mdast / enscribeTag nodes. */
function convertInline(children) {
  const out = [];
  for (const c of children ?? []) {
    if (c.name === '#text') { out.push({ type: 'text', value: c.value }); continue; }
    if (c.name === 'monospace') { out.push({ type: 'inlineCode', value: textOf(c) }); continue; }
    const mapped = INLINE_TAG_MAP[c.name];
    if (mapped) { out.push(makeTag(mapped, convertInline(c.children))); continue; }
    if (c.name === 'ext-link') {
      const href = c.attributes['xlink:href'] || c.attributes.href || '';
      out.push(makeTag('a', convertInline(c.children), { kwargs: href ? { href } : {} }));
      continue;
    }
    if (c.name === 'uri') {
      const u = textOf(c);
      out.push(makeTag('a', [{ type: 'text', value: u }], { kwargs: { href: u } }));
      continue;
    }
    if (c.name === 'email') {
      const e = textOf(c).trim();
      out.push(makeTag('a', [{ type: 'text', value: e }], { kwargs: { href: `mailto:${e}` } }));
      continue;
    }
    if (DROP_INLINE.has(c.name)) { noteDropped(c.name); continue; }
    // Unknown inline wrapper: keep its text content, drop the wrapper.
    noteDropped(c.name);
    out.push(...convertInline(c.children));
  }
  return out;
}
