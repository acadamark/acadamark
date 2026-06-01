// JATS XML → Enscribe import (Phase 13 Slices 1–2).
//
// The reverse of @enscribejs/jats-export. `importJats(xml)` parses a JATS
// article and produces an Enscribe mdast tree of `enscribeTag` + native mdast
// nodes — the same shape the parser produces post-normalize — ready for:
//   - buildEnscribePipeline().runSync(tree) + .stringify(tree) → HTML
//   - serializeCanonical(tree) (from @enscribejs/cli) → .emd source
//
// Deliberately lossy and incremental.
//   Slice 1 — structural skeleton (article / front / body / sec / p) and inline
//             formatting (bold, italic, monospace, underline, strike, sup, sub,
//             links).
//   Slice 2 — citations and bibliography: <xref ref-type="bibr"> → <cite @key>,
//             <back><ref-list><ref><element-citation> → BibTeX in a <library>
//             (inside <data>), and a <bibliography> placement.
// Math, figures, tables, non-bibliographic cross-references, the theorem family,
// DSL blocks, and the non-representable-element reduction policy land in later
// slices; elements this slice does not handle are dropped (with a one-line
// console warning naming each kind), never silently.

import { SaxesParser } from 'saxes';
import { makeTag, makeOpaqueTag } from '@enscribejs/core/tag';

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

/** All descendant elements named `name`, depth-first (handles nested wrappers). */
function collectEls(node, name, acc = []) {
  for (const c of node.children ?? []) {
    if (c.name === name) acc.push(c);
    if (isEl(c)) collectEls(c, name, acc);
  }
  return acc;
}

/** Trimmed, whitespace-collapsed text of the first child element `name` (or null). */
function textField(node, name) {
  const el = childEl(node, name);
  return el ? textOf(el).replace(/\s+/g, ' ').trim() : null;
}

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

  // <back>: bibliography (<ref-list>) becomes a <bibliography> placement plus a
  // <library> of BibTeX inside <data>. Footnotes / acknowledgements / appendices
  // are later slices.
  const back = childEl(article, 'back');
  if (back) out.push(...convertBack(back));
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

// ─── back matter: citations + bibliography ──────────────────────────────────────

/**
 * Convert `<back>` to Enscribe back matter. Each `<ref>` in any `<ref-list>`
 * becomes a BibTeX entry; the entries are gathered into one `<library>` (inside
 * `<data>`), and a `<bibliography>` placement is emitted so the rendered output
 * shows the reference list. Per convention the apparatus goes at the document's
 * end: `<bibliography>` first, then `<data>`.
 */
function convertBack(back) {
  const out = [];
  const refs = collectEls(back, 'ref');
  if (refs.length) {
    const entries = refs.map((ref, i) => convertRef(ref, i)).filter(Boolean);
    if (entries.length) {
      // Empty `<bibliography>` placement (the interpreter fills it from the cited
      // entries) followed by the `<library>` of BibTeX wrapped in `<data>`.
      out.push({ ...makeTag('bibliography', []), form: 'long' });
      const bibtex = '\n' + entries.join('\n\n') + '\n';
      const library = makeOpaqueTag('library', bibtex, { contentHandler: 'library' });
      out.push({ ...makeTag('data', [library]), form: 'long' });
    }
  }
  // Footnotes, acknowledgements, glossaries, appendices, author bios → later slices.
  for (const child of back.children) {
    if (isEl(child) && child.name !== 'ref-list') noteDropped(child.name);
  }
  return out;
}

// JATS <element-citation publication-type="…"> → BibTeX entry type. The inverse
// of the export's CSL→pub-type map; unknown / missing types fall back to @misc.
const JATS_PUB_TYPE_TO_BIBTEX = {
  journal:   'article',
  magazine:  'article',
  newspaper: 'article',
  book:      'book',
  confproc:  'inproceedings',
  thesis:    'phdthesis', // JATS pub-type can't distinguish phd vs masters; default phd
  report:    'techreport',
  webpage:   'misc',
  web:       'misc',
  preprint:  'misc',
  patent:    'misc',
  software:  'misc',
  data:      'misc',
};

// BibTeX field emission order (stable, human-readable output).
const BIBTEX_FIELD_ORDER = [
  'author', 'editor', 'title', 'journal', 'booktitle', 'publisher', 'address',
  'year', 'volume', 'number', 'pages', 'edition', 'doi', 'url', 'note',
];

/**
 * Convert one `<ref>` to a BibTeX entry string. The `<ref>` id is the citation
 * key, verbatim (no transformation) — it matches the `rid` the in-text
 * `<xref ref-type="bibr">` markers carry, so cites resolve. A `<ref>` with no id
 * gets a synthetic `ref{N}` key so the entry is not lost (it just can't be cited).
 */
function convertRef(ref, index) {
  const key = ref.attributes.id || `ref${index + 1}`;
  const citation =
    childEl(ref, 'element-citation') ||
    childEl(ref, 'mixed-citation') ||
    childEl(ref, 'nlm-citation') ||
    childEl(ref, 'citation');
  if (!citation) { noteDropped('ref(no-citation)'); return null; }

  const { bibType, fields } = extractCitationFields(citation);

  // mixed-citation with no structured fields → preserve the free text as a note.
  const hasStructure = fields.title || fields.author || fields.journal || fields.year;
  if (citation.name === 'mixed-citation' && !hasStructure) {
    const note = textOf(citation).replace(/\s+/g, ' ').trim();
    return formatBibtexEntry('misc', key, note ? { note } : {});
  }
  return formatBibtexEntry(bibType, key, fields);
}

/**
 * Extract BibTeX fields from an `<element-citation>` / `<mixed-citation>`.
 * Title handling mirrors the export: `<article-title>`/`<chapter-title>` is the
 * title and `<source>` is the container (journal / booktitle); a bare `<source>`
 * (book) is itself the title.
 */
function extractCitationFields(citation) {
  const pubType = citation.attributes['publication-type'] || citation.attributes['citation-type'] || '';
  const bibType = JATS_PUB_TYPE_TO_BIBTEX[pubType] || 'misc';
  const f = {};

  const author = extractPersonGroup(citation, 'author');
  if (author) f.author = author;
  const editor = extractPersonGroup(citation, 'editor');
  if (editor) f.editor = editor;

  const articleTitle = textField(citation, 'article-title') || textField(citation, 'chapter-title');
  const source = textField(citation, 'source');
  if (articleTitle) {
    f.title = articleTitle;
    if (source) {
      if (bibType === 'inproceedings' || bibType === 'incollection') f.booktitle = source;
      else f.journal = source;
    }
  } else if (source) {
    f.title = source; // book: the source IS the title
  }

  const year = textField(citation, 'year');
  if (year) f.year = year;
  const volume = textField(citation, 'volume');
  if (volume) f.volume = volume;
  const issue = textField(citation, 'issue');
  if (issue) f.number = issue;

  const fpage = textField(citation, 'fpage');
  const lpage = textField(citation, 'lpage');
  if (fpage && lpage) f.pages = `${fpage}--${lpage}`;
  else if (fpage) f.pages = fpage;

  const publisher = textField(citation, 'publisher-name');
  if (publisher) f.publisher = publisher;
  const loc = textField(citation, 'publisher-loc');
  if (loc) f.address = loc;
  const edition = textField(citation, 'edition');
  if (edition) f.edition = edition;

  const doi = pubIdOf(citation, 'doi');
  if (doi) f.doi = doi;
  const pmid = pubIdOf(citation, 'pmid');
  if (pmid) f.note = `PMID: ${pmid}`;

  const url = urlOf(citation);
  if (url) f.url = url;

  return { bibType, fields: f };
}

/**
 * Format a `<person-group person-group-type="…">` (or bare `<name>`/`<string-name>`
 * children) as a BibTeX author/editor value: `Surname, Given` per person, joined
 * with ` and `. `<string-name>` / `<collab>` are kept as free text.
 */
function extractPersonGroup(citation, type) {
  const groups = childrenEls(citation, 'person-group');
  let group = groups.find((g) => (g.attributes['person-group-type'] || 'author') === type);
  // A lone unlabelled person-group is taken as the authors.
  if (!group && type === 'author' && groups.length === 1 && !groups[0].attributes['person-group-type']) {
    group = groups[0];
  }
  const people = group
    ? group.children.filter((c) => c.name === 'name' || c.name === 'string-name' || c.name === 'collab')
    // Some JATS place names directly under the citation (no person-group wrapper).
    : (type === 'author'
        ? citation.children.filter((c) => c.name === 'name' || c.name === 'string-name')
        : []);

  const parts = [];
  for (const p of people) {
    if (p.name === 'name') {
      const surname = textField(p, 'surname');
      const given = textField(p, 'given-names');
      if (surname && given) parts.push(`${surname}, ${given}`);
      else if (surname) parts.push(surname);
      else if (given) parts.push(given);
    } else {
      const text = textOf(p).replace(/\s+/g, ' ').trim();
      if (text) parts.push(text);
    }
  }
  return parts.length ? parts.join(' and ') : null;
}

/** Text of the `<pub-id pub-id-type="…">` matching `type` (or null). */
function pubIdOf(citation, type) {
  const el = childrenEls(citation, 'pub-id').find((e) => e.attributes['pub-id-type'] === type);
  return el ? textOf(el).trim() : null;
}

/** A URL from `<ext-link>` / `<uri>` (or null). */
function urlOf(citation) {
  const ext = childEl(citation, 'ext-link');
  if (ext) return ext.attributes['xlink:href'] || ext.attributes.href || textOf(ext).trim() || null;
  const uri = childEl(citation, 'uri');
  if (uri) return textOf(uri).trim() || null;
  return null;
}

/** Build a `@type{key, field = {value}, …}` BibTeX entry from a field map. */
function formatBibtexEntry(bibType, key, fields) {
  const present = BIBTEX_FIELD_ORDER.filter((k) => fields[k] != null && fields[k] !== '');
  const lines = [`@${bibType}{${key},`];
  present.forEach((k, i) => {
    const comma = i < present.length - 1 ? ',' : '';
    lines.push(`  ${k} = {${bibtexEscapeValue(String(fields[k]))}}${comma}`);
  });
  lines.push('}');
  return lines.join('\n');
}

/**
 * Make a field value safe inside a brace-delimited BibTeX value. JATS text has
 * already been entity-decoded by the parser, so the only real hazard to the
 * downstream BibTeX parser is an unbalanced brace; balance-breaking braces are
 * dropped (rare in bibliographic text). Backslashes are left intact (TeX accents).
 */
function bibtexEscapeValue(value) {
  let depth = 0;
  let out = '';
  for (const ch of value) {
    if (ch === '{') { depth++; out += ch; continue; }
    if (ch === '}') {
      if (depth === 0) continue; // unmatched close brace would terminate the value
      depth--; out += ch; continue;
    }
    out += ch;
  }
  return depth > 0 ? out + '}'.repeat(depth) : out; // close any still-open braces
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
const DROP_INLINE = new Set(['inline-formula', 'disp-formula']); // math: later slices

/** A `<cite @key…>` node (shape per the parser: atRefs hold the keys, content null). */
function citeNode(keys) {
  return { ...makeTag('cite'), atRefs: [...keys], content: null };
}

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
    if (c.name === 'xref') {
      // Bibliographic cross-reference → <cite @key>. `rid` is an IDREFS list (one
      // or more bibliography ids), so a grouped xref becomes one multi-key cite.
      if ((c.attributes['ref-type'] || '') === 'bibr') {
        const keys = (c.attributes.rid || '').trim().split(/\s+/).filter(Boolean);
        if (keys.length) { out.push(citeNode(keys)); continue; }
      }
      // Non-bibliographic xrefs (fig / table / sec / fn) are cross-references —
      // a later slice. Keep the visible link text, drop the marker.
      noteDropped('xref');
      out.push(...convertInline(c.children));
      continue;
    }
    if (DROP_INLINE.has(c.name)) { noteDropped(c.name); continue; }
    // Unknown inline wrapper: keep its text content, drop the wrapper.
    noteDropped(c.name);
    out.push(...convertInline(c.children));
  }
  return out;
}
