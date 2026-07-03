// JATS XML → Enscribe import (Phase 13 Slices 1–2).
//
// The reverse of the jats-export module (`@enscribejs/cli/jats-export`).
// `importJats(xml)` parses a JATS article and produces an Enscribe mdast tree of
// `enscribeTag` + native mdast nodes — the same shape the parser produces
// post-normalize — ready for:
//   - buildEnscribePipeline().runSync(tree) + .stringify(tree) → HTML
//   - serializeCanonical(tree) (from `../serialize-canonical.js`) → .emd source
//
// Deliberately lossy and incremental.
//   Slice 1 — structural skeleton (article / front / body / sec / p) and inline
//             formatting (bold, italic, monospace, underline, strike, sup, sub,
//             links).
//   Slice 2 — citations and bibliography: <xref ref-type="bibr"> → <cite @key>,
//             <back><ref-list><ref><element-citation> → BibTeX in a <library>
//             (inside <data>), and a <bibliography> placement.
//   Slice 3 — math: <inline-formula> → <inline-math>, <disp-formula> →
//             <display-math> (id preserved). The LaTeX comes from <tex-math>
//             (preferred, verbatim) or, failing that, from presentation MathML
//             converted via `mathml-to-latex`.
//   Slice 4 — figures (<fig> → <fig>), tables (<table-wrap> → <table>, CSV),
//             cross-references (<xref ref-type="fig|table|disp-formula|sec"> →
//             <ref @prefix:id>), and footnotes (<fn> inlined into <note> at its
//             <xref ref-type="fn"> marker). Referenceable ids gain the Enscribe
//             colon-prefix so they resolve and number.
//   Slice 5 — the theorem family (<statement content-type="X"> → <theorem> /
//             <lemma> / <definition> / <proof> / …, <xref ref-type="statement"> →
//             <ref>), DSL blocks (a DSL <fig> with a <preformat> source →
//             <mermaid> / <abc> with the source preserved opaquely), and bare
//             <preformat> → a code block.
//   Slice 6 — the reduction policy: every element is accounted for. Reader-facing
//             apparatus (keywords, acknowledgments, funding, author notes,
//             appendices, glossary, def-lists) is preserved as readable sections /
//             paragraphs; pure publishing metadata (journal-meta, article-ids,
//             permissions, page positioning, counts, …) is an expected, silent
//             drop; anything in neither set still warns once.
//   Slice 7 (#105) — special content INSIDE <table-wrap> cells. Slices 2-4 brought
//             formulas, footnotes, and citations through in body prose, but a cell
//             was flattened to plain text (CSV), dropping them. Now a cell with
//             non-text content is converted to Enscribe inline source via the same
//             convertInline the body uses (formula → $…$, <xref bibr> → <cite @k>,
//             <xref fn> → <note | …>, formatting), embedded in the opaque CSV with
//             the markup-bearing columns named in `parse-columns` — the #21
//             parsed-cell representation. So an imported table's cells carry
//             rendering, resolving math / cites / notes in HTML and JATS both,
//             and round-trip through canonical `.emd`.
//   Slice 8 (#106) — special content inside COMPLEX (colspan / rowspan / multi-row
//             header) tables. Such a table can't become a flat enscribe table, so
//             its grid LAYOUT is preserved as the no-format `<table>` escape hatch
//             — but its cells run through the SAME `convertInline` as Slice 7, and
//             the grid is stamped on `node._htmlTable` (rows → cells with converted
//             inline mdast). The shared walkers descend the stamp so cell refs /
//             cites / notes / math resolve; the HTML handler and JATS emitter
//             render / emit the grid (spans preserved). `<table-wrap-foot>` <fn>s
//             are collected so an in-cell `<xref ref-type="fn">` hoists. So a real
//             paper's formula-and-cross-reference-heavy complex tables import with
//             no raw verbatim JATS in any cell, in HTML and JATS both. (#108 closed
//             the round-trip: re-rendering the resulting `.emd` re-resolves those
//             cells via the enscribeHtmlTableCells pipeline plugin, which re-stamps
//             `_htmlTable` from the escape-hatch content.)

import { SaxesParser } from 'saxes';
import { MathMLToLaTeX } from 'mathml-to-latex';
import { makeTag, makeOpaqueTag } from '@enscribejs/enscribe/core/tag';
import { SECTION_TAGNAMES } from '@enscribejs/enscribe/interpreter/lib/section-kinds';
import { escapeXmlAttr, escapeXmlText } from '../lib/xml-escape.js';
// #105: serialize converted table-cell content (math / cite / note / formatting)
// to Enscribe inline source, which the cell goes on to carry so #21's cell-parse
// plugin re-parses it on render and round-trip.
import { inlineToCanonicalSource } from '../serialize-canonical.js';

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

  // #112: find the document root tolerantly — it may be the immediate root (a bare
  // `<article>`/`<book>`) or nested inside an envelope (PMC efetch wraps it as
  // `<pmc-articleset>…<article>…</article></pmc-articleset>`). Take the outermost
  // `<article>`/`<book>` at any depth. An article-set may legitimately hold more
  // than one article (multi-id efetch): import the first and warn, never hard-fail.
  const roots = findDocRoots(root);
  if (roots.length > 1) {
    // eslint-disable-next-line no-console
    console.warn(`[jats-import] note: source contains ${roots.length} <article>/<book> elements (article-set); importing the first`);
  }
  return roots[0] ?? null;
}

/**
 * Collect the OUTERMOST `<article>`/`<book>` elements (document roots) at any
 * depth, without descending into one once found (so a nested `<sub-article>` or a
 * second article-set member never shadows the top-level document). Depth-first, so
 * the first result is the first document in source order.
 */
function findDocRoots(node, acc = []) {
  for (const c of node.children ?? []) {
    if (c.name === 'article' || c.name === 'book') acc.push(c);
    else if (c.name !== '#text') findDocRoots(c, acc);
  }
  return acc;
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
  _footnotes.clear();
  _fnInProgress.clear();
  _statements.clear();
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
  const back = childEl(article, 'back');

  // Front matter → <meta> (title / author / date / abstract).
  const meta = front ? buildMeta(front) : null;
  if (meta) out.push(meta);

  // Index footnote bodies before the body is converted, so an inline
  // `<xref ref-type="fn">` can inline its `<fn>` content where it appears.
  if (back) collectFootnotes(back);

  // Keywords render as a paragraph right after the front matter.
  if (front) out.push(...frontKeywords(front));

  const body = childEl(article, 'body');
  // Pre-index statement ids so forward `<xref ref-type="statement">` resolve.
  if (body) collectStatements(body);
  if (body) out.push(...convertBlocks(body.children, 0));

  // #113: <floats-group> (a sibling of <body>) collects figures/tables that have
  // no in-body anchor (bioRxiv). Emit them in document order (after the body) so
  // their ids exist and cross-references resolve. Placement is document-order
  // only — not the floats' original page positions.
  const floatsGroup = childEl(article, 'floats-group');
  if (floatsGroup) out.push(...convertBlocks(floatsGroup.children, 0));

  // Reader-facing apparatus (acknowledgments, funding, author notes,
  // appendices, glossary) preserved as sections after the body, then the
  // bibliography. Pure publishing metadata is dropped (see DROPPED_METADATA).
  out.push(...readableSections(front, back));
  if (back) out.push(...bibliographyBlocks(back));

  // Exhaustive accounting: warn once for any element neither handled nor an
  // expected drop, so a real article's surprises surface instead of vanishing.
  if (front) warnUnhandledMeta(front);
  if (back) warnUnhandledBack(back);
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
    // #338: contrib-type distinguishes author from editor (and the editor's
    // editorial role). contrib-type="author" -> <author>; an editorial-role
    // value -> <editor role=...> (role omitted when it is the default
    // "editor"), so an exported editor round-trips back to <editor>.
    const EDITOR_ROLES = new Set(['editor', 'co-editor', 'series-editor', 'volume-editor', 'guest-editor', 'other']);
    for (const contrib of childrenEls(contribGroup, 'contrib')) {
      const content = contribContent(contrib);
      if (!content.length) continue;
      const ctype = contrib.attributes['contrib-type'] || 'author';
      if (EDITOR_ROLES.has(ctype)) {
        children.push(
          ctype === 'editor'
            ? makeTag('editor', content)
            : makeTag('editor', content, { kwargs: { role: ctype } }),
        );
      } else {
        children.push(makeTag('author', content));
      }
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

// #349: reconstruct an Enscribe contributor's content from a JATS <contrib> — the
// inverse of the export's emitContrib. A STRUCTURED contributor (any of <aff> /
// <contrib-id contrib-id-type="orcid"> / <email> present) round-trips to the child-tag
// form (<name>/<affiliation>/<orcid>/<email>, canonical order); a CASUAL one (name
// only) stays text content. Returns [] when there is no name.
function contribContent(contrib) {
  const name = contribName(contrib);
  const affEls = childrenEls(contrib, 'aff');
  const orcidEl = childrenEls(contrib, 'contrib-id').find(
    (c) => (c.attributes['contrib-id-type'] || '') === 'orcid',
  );
  const emailEls = childrenEls(contrib, 'email');
  if (!affEls.length && !orcidEl && !emailEls.length) {
    return name ? [{ type: 'text', value: name }] : [];
  }
  const kids = [];
  if (name) kids.push(makeTag('name', [{ type: 'text', value: name }]));
  for (const aff of affEls) kids.push(makeTag('affiliation', [{ type: 'text', value: textOf(aff).trim() }]));
  if (orcidEl) kids.push(makeTag('orcid', [{ type: 'text', value: textOf(orcidEl).trim() }]));
  for (const email of emailEls) kids.push(makeTag('email', [{ type: 'text', value: textOf(email).trim() }]));
  return kids;
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

// ─── reduction policy: preserve readers' content, drop publishing metadata ──────
//
// Every JATS element the importer meets is accounted for: mapped (Slices 1–5),
// preserved as readable content (Category B, below), or an expected drop of
// publishing metadata (Category C — silent, because warning about an ISSN or a
// page count the reader can do nothing about is just noise). Anything in neither
// set warns once, so a real article's surprises surface instead of vanishing.

// `<article-meta>` children the importer consumes (in <meta>, as keywords, or as
// a reader-facing section). Multiple pub-dates: the first is used, the rest skip.
const HANDLED_META = new Set([
  'title-group', 'contrib-group', 'pub-date', 'date', 'abstract',
  'kwd-group', 'funding-group', 'author-notes',
]);

// `<back>` children the importer consumes (bibliography, inlined notes, or a
// reader-facing section).
const HANDLED_BACK = new Set([
  'ref-list', 'fn-group', 'ack', 'app', 'app-group', 'funding-group',
  'glossary', 'notes', 'sec', 'title', 'label',
]);

// Category C — pure publishing / bibliographic / legal metadata. Dropped without
// a warning: it is not document content, and the standalone rendered document has
// no use for it. (The DOI in <article-id> is debatable; dropped here for now.)
const DROPPED_METADATA = new Set([
  'journal-meta', 'article-id', 'article-categories', 'article-version',
  'volume', 'volume-id', 'volume-series', 'issue', 'issue-id', 'issue-title',
  'issue-part', 'fpage', 'lpage', 'elocation-id', 'page-range', 'product',
  'supplementary-material', 'history', 'pub-history', 'permissions', 'license',
  'self-uri', 'related-article', 'related-object', 'counts', 'custom-meta-group',
  'aff', 'aff-alternatives', 'author-comment', 'isbn', 'conference', 'bio',
  'trans-abstract', 'trans-title-group', 'x',
]);

/**
 * `<ref-list>` → a `<bibliography>` placement plus a `<library>` of BibTeX inside
 * `<data>` (apparatus at the document's end, per convention). Returns the blocks.
 */
function bibliographyBlocks(back) {
  const refs = collectEls(back, 'ref');
  if (!refs.length) return [];
  const entries = refs.map((ref, i) => convertRef(ref, i)).filter(Boolean);
  if (!entries.length) return [];
  const library = makeOpaqueTag('library', '\n' + entries.join('\n\n') + '\n', { contentHandler: 'library' });
  return [
    { ...makeTag('bibliography', []), form: 'long' },
    { ...makeTag('data', [library]), form: 'long' },
  ];
}

/** `<kwd-group>` → a "Keywords: …" paragraph (or none). */
function frontKeywords(front) {
  const am = childEl(front, 'article-meta') ?? front;
  const kwds = [];
  for (const g of childrenEls(am, 'kwd-group')) {
    for (const k of childrenEls(g, 'kwd')) {
      const t = textOf(k).replace(/\s+/g, ' ').trim();
      if (t) kwds.push(t);
    }
  }
  if (!kwds.length) return [];
  return [{ type: 'paragraph', children: [
    makeTag('b', [{ type: 'text', value: 'Keywords: ' }]),
    { type: 'text', value: kwds.join(', ') },
  ] }];
}

/** A top-level section header (title in pipe content), the post-normalize shape. */
function sectionHead(titleNodes) {
  return makeTag('section', [{ type: 'paragraph', children: titleNodes }]);
}

/**
 * A JATS region (`<ack>`/`<app>`/`<notes>`/`<glossary>`) → an Enscribe section:
 * its `<title>` (or `defaultTitle`) as the heading, its body routed through the
 * normal block converter (so nested `<sec>`, `<p>`, `<def-list>`, etc. all work).
 */
function regionToSection(el, defaultTitle) {
  const titleEl = childEl(el, 'title');
  const titleNodes = titleEl && titleEl.children.length
    ? convertInline(titleEl.children)
    : [{ type: 'text', value: defaultTitle }];
  const body = el.children.filter((c) => c !== titleEl && c.name !== 'label');
  return [sectionHead(titleNodes), ...convertBlocks(body, 1)];
}

/** `<funding-group>` → a "Funding" section carrying the funding statement text. */
function fundingSection(fg) {
  const stmt = collectEls(fg, 'funding-statement')[0];
  const text = (stmt ? textOf(stmt) : textOf(fg)).replace(/\s+/g, ' ').trim();
  if (!text) return [];
  return [sectionHead([{ type: 'text', value: 'Funding' }]),
    { type: 'paragraph', children: [{ type: 'text', value: text }] }];
}

/**
 * Reader-facing apparatus from `<front>` and `<back>` → Enscribe sections, in a
 * natural reading order: acknowledgments, funding, author notes / conflicts,
 * appendices, glossary.
 */
function readableSections(front, back) {
  const out = [];
  const am = front ? (childEl(front, 'article-meta') ?? front) : null;

  if (back) for (const ack of childrenEls(back, 'ack')) out.push(...regionToSection(ack, 'Acknowledgments'));
  for (const src of [back, am]) {
    if (src) for (const fg of childrenEls(src, 'funding-group')) out.push(...fundingSection(fg));
  }
  if (am) for (const an of childrenEls(am, 'author-notes')) out.push(...regionToSection(an, 'Author Notes'));
  if (back) for (const nt of childrenEls(back, 'notes')) out.push(...regionToSection(nt, 'Notes'));
  if (back) {
    for (const app of childrenEls(back, 'app')) out.push(...regionToSection(app, 'Appendix'));
    for (const ag of childrenEls(back, 'app-group')) {
      for (const app of childrenEls(ag, 'app')) out.push(...regionToSection(app, 'Appendix'));
    }
    for (const gl of childrenEls(back, 'glossary')) out.push(...regionToSection(gl, 'Glossary'));
    for (const sec of childrenEls(back, 'sec')) out.push(...convertSec(sec, 0));
  }
  return out;
}

/** Warn once for each `<article-meta>` child that is neither handled nor expected-dropped. */
function warnUnhandledMeta(front) {
  const am = childEl(front, 'article-meta') ?? front;
  for (const child of am.children) {
    if (isEl(child) && !HANDLED_META.has(child.name) && !DROPPED_METADATA.has(child.name)) noteDropped(child.name);
  }
}

/** Warn once for each `<back>` child that is neither handled nor expected-dropped. */
function warnUnhandledBack(back) {
  for (const child of back.children) {
    if (isEl(child) && !HANDLED_BACK.has(child.name) && !DROPPED_METADATA.has(child.name)) noteDropped(child.name);
  }
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
  // #114: a <ref> may wrap its citation(s) in <citation-alternatives> — several
  // representations of the same reference, typically a structured
  // <element-citation> plus a loose <mixed-citation> (Nature Communications). The
  // citation is then a grandchild of <ref>, so descend into the wrapper and prefer
  // the structured form. (The element is <citation-alternatives>, not a bare NLM
  // 2.x <citation> as first surmised — that earlier diagnosis mis-matched the
  // `<citation` prefix; bare <citation>/<nlm-citation> are still handled below.)
  const host = childEl(ref, 'citation-alternatives') || ref;
  const citation =
    childEl(host, 'element-citation') ||
    childEl(host, 'mixed-citation') ||
    childEl(host, 'nlm-citation') ||
    childEl(host, 'citation');
  if (!citation) { noteDropped('ref(no-citation)'); return null; }

  const { bibType, fields } = extractCitationFields(citation);

  // A loosely-structured citation (mixed/nlm/bare) with no extractable fields →
  // preserve its free text as a note rather than emit an empty entry.
  const hasStructure = fields.title || fields.author || fields.journal || fields.year;
  const LOOSE = new Set(['mixed-citation', 'nlm-citation', 'citation']);
  if (LOOSE.has(citation.name) && !hasStructure) {
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

// ─── math ───────────────────────────────────────────────────────────────────────

/** All descendant elements whose *local* name (prefix stripped) is `local`. */
function collectByLocal(node, local, acc = []) {
  for (const c of node.children ?? []) {
    if (!isEl(c)) continue;
    if (c.name.replace(/^.*:/, '') === local) acc.push(c);
    collectByLocal(c, local, acc);
  }
  return acc;
}

/** Faithfully re-serialize a parsed element back to an XML string (for MathML). */
function serializeXml(node) {
  if (node.name === '#text') return escapeXmlText(node.value);
  const attrs = Object.entries(node.attributes ?? {})
    .map(([k, v]) => ` ${k}="${escapeXmlAttr(v)}"`)
    .join('');
  const inner = (node.children ?? []).map(serializeXml).join('');
  return `<${node.name}${attrs}>${inner}</${node.name}>`;
}

/**
 * Extract LaTeX from an `<inline-formula>` / `<disp-formula>` (or an
 * `<alternatives>` wrapper inside one). Prefers `<tex-math>` (verbatim LaTeX,
 * CDATA-folded by the parser); falls back to presentation MathML converted via
 * `mathml-to-latex`. Returns the LaTeX string, or null when neither is present
 * (or MathML conversion fails) so the caller can degrade gracefully.
 */
function extractMathLatex(formula) {
  const tex = collectEls(formula, 'tex-math')[0];
  if (tex) {
    const latex = cleanTexMath(textOf(tex));
    if (latex) return latex;
  }
  const math = collectByLocal(formula, 'math')[0];
  if (math) {
    try {
      const latex = MathMLToLaTeX.convert(serializeXml(math)).trim();
      if (latex) return latex;
    } catch {
      noteDropped('math(mathml-conversion-failed)');
    }
  }
  return null;
}

/**
 * Clean `<tex-math>` content down to KaTeX-renderable math. Some publishers wrap
 * the formula in a full LaTeX document (`\documentclass…\begin{document} $$ … $$
 * \end{document}`) rather than emitting bare math; extract the document body and
 * strip the surrounding math-mode delimiters. Bare LaTeX passes through unchanged.
 */
function cleanTexMath(raw) {
  let s = String(raw).trim();
  const doc = s.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (doc) s = doc[1].trim();
  // Strip one layer of surrounding math delimiters: $$…$$, \[…\], \(…\), $…$.
  s = s.replace(/^\$\$([\s\S]*?)\$\$$/, '$1').trim();
  s = s.replace(/^\\\[([\s\S]*?)\\\]$/, '$1').trim();
  s = s.replace(/^\\\(([\s\S]*?)\\\)$/, '$1').trim();
  s = s.replace(/^\$([\s\S]*?)\$$/, '$1').trim();
  return s;
}

/**
 * Convert a formula element to a math node: `<inline-math>` (opaque, `math`
 * handler) or `<display-math>` (opaque, `math-display` handler, id preserved).
 * When no LaTeX can be recovered, degrade to a `<code>` span holding the raw
 * text and warn — never an error node.
 */
function convertFormula(formula, display) {
  const latex = extractMathLatex(formula);
  if (latex != null) {
    if (display) {
      const node = makeOpaqueTag('display-math', latex, { contentHandler: 'math-display' });
      // Prefix the id (`eqn:`) so equation cross-references resolve and the
      // equation is numbered (only colon-ids are indexed).
      const id = prefixId(formula.attributes.id, 'eqn');
      return id ? { ...node, id } : node;
    }
    return makeOpaqueTag('inline-math', latex, { contentHandler: 'math' });
  }
  noteDropped(display ? 'disp-formula(no-tex-math/mathml)' : 'inline-formula(no-tex-math/mathml)');
  return { type: 'inlineCode', value: textOf(formula).replace(/\s+/g, ' ').trim() || '(math)' };
}

// ─── figures, tables, cross-references, footnotes ───────────────────────────────

// JATS uses bare element ids (`F1`); Enscribe's cross-reference system keys off a
// colon-prefix (`fig:F1`) — only colon-ids are indexed/numbered, and the prefix
// selects the rendered word ("figure" / "table" / "equation" / section). So every
// referenceable element id is normalized to its conventional prefix, and the same
// normalization is applied to the matching `<xref rid>` so the two agree. Already
// -prefixed ids (Enscribe's own exported JATS) pass through unchanged.
function prefixId(rawId, prefix) {
  if (!rawId) return null;
  return rawId.startsWith(`${prefix}:`) ? rawId : `${prefix}:${rawId}`;
}

// `<xref ref-type="…">` → the colon-prefix of its Enscribe target id. `bibr` and
// `fn` are handled separately (citation / inlined note); `statement` (theorem
// family) lands in Slice 5.
const XREF_TYPE_TO_PREFIX = {
  fig: 'fig',
  table: 'tab',
  'disp-formula': 'eqn',
  sec: 'sec',
};

/** A `<ref @target>` node (parser shape: atRefs holds the target, content null). */
function refNode(target) {
  return { ...makeTag('ref'), atRefs: [target], content: null };
}

/** Inline text of a frameable's `<caption>` (`<title>` + `<p>`), as a string. */
function captionText(el) {
  const cap = childEl(el, 'caption');
  if (!cap) return null;
  const txt = textOf(cap).replace(/\s+/g, ' ').trim();
  return txt || null;
}

/** Inline nodes of a frameable's `<caption>` (`<title>` then `<p>`), formatting kept. */
function captionInline(el) {
  const cap = childEl(el, 'caption');
  if (!cap) return [];
  const parts = [];
  for (const child of cap.children) {
    if (child.name === 'title' || child.name === 'p') {
      if (parts.length) parts.push({ type: 'text', value: ' ' });
      parts.push(...convertInline(child.children));
    }
  }
  return parts;
}

/**
 * `<fig>` → either a DSL frameable (`<mermaid>` / `<abc>` with the `<preformat>`
 * source preserved opaquely) when the figure carries Enscribe's DSL markers, or an
 * image figure `<fig #fig:id src=… | caption>` (`src` from the first
 * `<graphic xlink:href>`, descending into an `<alternatives>` wrapper). The
 * caption is preserved either way; `<label>` is dropped (Enscribe numbers itself).
 */
function convertFigure(fig) {
  const id = prefixId(fig.attributes.id, 'fig');

  const dsl = detectDsl(fig);
  if (dsl) {
    const caption = captionText(fig);
    return makeOpaqueTag(dsl.type, dsl.source, { contentHandler: dsl.type, id, kwargs: caption ? { caption } : {} });
  }

  const graphic = collectEls(fig, 'graphic')[0];
  const src = graphic ? (graphic.attributes['xlink:href'] || graphic.attributes.href || '') : '';
  // A figure with neither a <graphic> nor recognized DSL source imports as a
  // captioned figure, but any body content is dropped here — warn, never silent.
  if (!src) noteDropped('fig(no <graphic>/DSL — body content dropped)');
  const caption = captionInline(fig);
  return makeTag('fig', caption, { id, kwargs: src ? { src } : {} });
}

/**
 * `<table-wrap>` → `<table csv caption=… | …>`. The inner `<table>`'s rows become
 * CSV (header row first when a `<thead>` is present). Tables using colspan/rowspan
 * can't be flattened to CSV — those fall back to the raw inner-`<table>` HTML
 * (with a warning), preserving content at the cost of Enscribe styling.
 */
function convertTableWrap(tw) {
  const id = prefixId(tw.attributes.id, 'tab');
  const caption = captionText(tw);
  const innerTable = collectEls(tw, 'table')[0];
  if (!innerTable) { noteDropped('table-wrap(no <table>)'); return null; }

  const result = tableToCsv(innerTable);
  if (result.complex) {
    // Complex table (colspan / rowspan / multi-row header): it can't become a flat
    // CSV. #106: keep the grid LAYOUT but run every cell through the same inline
    // conversion as body content. The importer stamps `_htmlTable` (grid rows →
    // cells with converted, resolvable inline mdast) which the HTML handler and
    // JATS emitter render, and the shared walkers descend so cell refs / cites /
    // notes / math resolve like body content. `node.content` carries the same grid
    // as escape-hatch HTML with Enscribe inline *source* in cells (escaped), so the
    // `.emd` output has no raw JATS either, and (#108) re-rendering that `.emd`
    // re-resolves the cells via the enscribeHtmlTableCells pipeline plugin.)
    // No noteDropped here: the table is fully converted, not dropped.
    collectFootnotes(tw); // <table-wrap-foot> <fn>s, so in-cell <xref ref-type="fn"> inline
    const grid = buildHtmlGrid(innerTable);
    const node = makeOpaqueTag('table', htmlGridToSource(grid), {
      contentHandler: 'table', id, kwargs: caption ? { caption } : {},
    });
    node._htmlTable = grid;
    return node;
  }
  const kwargs = caption ? { caption } : {};
  // #105: opt the markup-bearing columns into Enscribe inline parsing (#21).
  if (result.parseColumns?.length) kwargs['parse-columns'] = result.parseColumns.join(', ');
  const booleans = {};
  if (!result.hasHeader) booleans.headers = false;
  if (result.parseAll) booleans['parse-text'] = true; // headerless-with-markup fallback
  return makeOpaqueTag('table', result.csv, { contentHandler: 'table', positional: ['csv'], id, kwargs, booleans });
}

// ─── #106: complex (HTML-layout) table grid ─────────────────────────────────
//
// A colspan/rowspan/multi-row-header table keeps its grid but its cells convert
// like body content. `buildHtmlGrid` walks the inner <table> into
// `{ rows: [{ section: 'head'|'body', cells: [{ header, colspan, rowspan, align,
// inline }] }] }`, each cell's `inline` produced by the SAME `convertInline` used
// in the body (formula → math, <xref> → ref/cite, <xref fn> → note, formatting).

/** Walk one `<tr>` into a grid row of converted cells. */
function buildGridRow(tr, section) {
  const cells = tr.children
    .filter((c) => c.name === 'th' || c.name === 'td')
    .map((cell) => {
      const out = { header: cell.name === 'th', inline: convertInline(cell.children) };
      const cs = parseInt(cell.attributes.colspan, 10);
      const rs = parseInt(cell.attributes.rowspan, 10);
      if (cs > 1) out.colspan = cs;
      if (rs > 1) out.rowspan = rs;
      if (cell.attributes.align) out.align = cell.attributes.align;
      return out;
    });
  return { section, cells };
}

/** Inner `<table>` → grid `{ rows }`, preserving thead/tbody sectioning. */
function buildHtmlGrid(table) {
  const rows = [];
  for (const child of table.children.filter(isEl)) {
    if (child.name === 'thead') {
      for (const tr of childrenEls(child, 'tr')) rows.push(buildGridRow(tr, 'head'));
    } else if (child.name === 'tbody' || child.name === 'tfoot') {
      for (const tr of childrenEls(child, 'tr')) rows.push(buildGridRow(tr, 'body'));
    } else if (child.name === 'tr') {
      rows.push(buildGridRow(child, 'body'));
    }
  }
  return { rows };
}

/**
 * Serialize a grid back to escape-hatch HTML for `node.content` (the `.emd`
 * payload): real `<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` layout tags with span /
 * align attributes, and each cell's converted inline as Enscribe *source*
 * (`<$…$>`, `<cite @k>`, `<ref @id>`, `<note | …>`) escaped as HTML text — so the
 * `.emd` carries the full table with no raw JATS. (#108: the enscribeHtmlTableCells
 * pipeline plugin re-parses exactly this content on render and re-resolves the
 * cells — the escaped inline source is entity-decoded and re-parsed to mdast.)
 */
function htmlGridToSource(grid) {
  let out = '';
  let section = null;
  let buf = '';
  const flush = () => {
    if (!buf) return;
    const el = section === 'head' ? 'thead' : 'tbody';
    out += `<${el}>${buf}</${el}>`;
    buf = '';
  };
  for (const row of grid.rows) {
    if (row.section !== section) { flush(); section = row.section; }
    let r = '<tr>';
    for (const cell of row.cells) {
      const tag = cell.header ? 'th' : 'td';
      let attrs = '';
      if (cell.colspan) attrs += ` colspan="${cell.colspan}"`;
      if (cell.rowspan) attrs += ` rowspan="${cell.rowspan}"`;
      if (cell.align) attrs += ` align="${escapeXmlAttr(cell.align)}"`;
      r += `<${tag}${attrs}>${escapeXmlText(inlineToCanonicalSource(cell.inline))}</${tag}>`;
    }
    r += '</tr>';
    buf += r;
  }
  flush();
  return out;
}

/**
 * Inner `<table>` → `{ csv, hasHeader, parseColumns, parseAll }`, or
 * `{ complex: true }` for colspan/rowspan.
 *
 * #105: a cell whose JATS content is more than plain text (a formula, a
 * `<xref bibr|fn>`, formatting) is converted to Enscribe **inline source**
 * (`$…$`, `<cite @k>`, `<note | …>`, `<i>…`) via the same `convertInline` the
 * body uses, then serialized; plain cells stay text (current behavior). The
 * columns that carry markup are named in `parse-columns` so #21's cell-parse
 * plugin parses exactly those — pure-data columns stay literal (and can't be
 * mis-parsed as markdown).
 */
/**
 * True only for a *real* span (parsed integer > 1). Missing, empty, `"1"`, and
 * non-numeric all coerce to "no span". Publishers routinely emit explicit
 * `colspan="1" rowspan="1"` on every cell; the presence of the attribute is NOT
 * a span, so the complexity gate must test the value, not the attribute.
 */
function isRealSpan(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 1;
}

function tableToCsv(table) {
  const theadEl = collectEls(table, 'thead')[0] ?? null;
  const hasHeader = theadEl != null;
  const trs = collectEls(table, 'tr');

  // Detect complexity BEFORE converting any cell. A flat CSV can't express a
  // real (>1) colspan/rowspan or a multi-row header, so such a table is handled
  // by the #106 grid path in convertTableWrap — converting its cells here would
  // be wasted work and would look up footnotes before the table's
  // <table-wrap-foot> is collected (a spurious "xref-fn unresolved" warning).
  const spanned = trs.some((tr) =>
    tr.children.some((c) => (c.name === 'th' || c.name === 'td')
      && (isRealSpan(c.attributes.colspan) || isRealSpan(c.attributes.rowspan))));
  const multiRowHeader = theadEl ? childrenEls(theadEl, 'tr').length > 1 : false;
  if (spanned || multiRowHeader) return { complex: true };

  const rows = trs.map((tr) => {
    const cells = tr.children.filter((c) => c.name === 'th' || c.name === 'td');
    return cells.map((cell) => {
      const markup = (cell.children ?? []).some((c) => c.name !== '#text');
      const src = markup
        ? inlineToCanonicalSource(convertInline(cell.children)).replace(/\s+/g, ' ').trim()
        : textOf(cell).replace(/\s+/g, ' ').trim();
      return { src, markup };
    });
  });

  // Which BODY columns carry markup? The header row holds the column names.
  const bodyRows = hasHeader ? rows.slice(1) : rows;
  const headerRow = hasHeader ? rows[0] : null;
  const ncols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const markupColIdx = [];
  for (let c = 0; c < ncols; c++) {
    if (bodyRows.some((r) => r[c]?.markup)) markupColIdx.push(c);
  }
  let parseColumns = null;
  let parseAll = false;
  if (markupColIdx.length) {
    if (headerRow) parseColumns = markupColIdx.map((c) => headerRow[c]?.src ?? '').filter(Boolean);
    else parseAll = true; // headerless table can't name columns → opt the whole table in
  }

  const csv = rows.map((r) => r.map((cell) => csvCell(cell.src)).join(',')).join('\n');
  return { csv, hasHeader, parseColumns, parseAll };
}

/** Quote a CSV cell when it contains a comma, quote, or newline (RFC-4180). */
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Footnotes: JATS keeps the marker (`<xref ref-type="fn">`) in the body and the
// content (`<fn>`) in `<back><fn-group>`; Enscribe's `<note>` is inline and holds
// its content at the point of reference. So the importer pre-collects the `<fn>`
// bodies, then inlines each into a `<note>` where its marker appears.
const _footnotes = new Map();   // fn id → <fn> element
const _fnInProgress = new Set(); // guards against a footnote citing itself / a cycle

/** Index every `<fn id>` under `<back>` so body markers can inline them. */
function collectFootnotes(back) {
  for (const fn of collectEls(back, 'fn')) {
    if (fn.attributes.id) _footnotes.set(fn.attributes.id, fn);
  }
}

/** `<xref ref-type="fn" rid="fnID">` → an inline `<note>` carrying the `<fn>` body. */
function inlineFootnote(xref) {
  const rid = xref.attributes.rid || '';
  const fn = _footnotes.get(rid);
  if (!fn) { noteDropped('xref-fn(unresolved)'); return convertInline(xref.children); }
  if (_fnInProgress.has(rid)) { noteDropped('xref-fn(nested/circular)'); return []; }
  _fnInProgress.add(rid);
  const body = convertBlocks(fn.children.filter((c) => c.name !== 'label'), 99);
  _fnInProgress.delete(rid);
  return [makeTag('note', body)];
}

// ─── theorem family + DSL blocks ────────────────────────────────────────────────

// JATS `<statement content-type="…">` → Enscribe theorem-family element + the
// colon-prefix its cross-references use. The six numbered kinds have prefixes in
// the resolver's DEFAULT_PREFIXES; remark is numbered too; proof is unnumbered
// (no cross-reference prefix → id, if any, kept verbatim).
const STATEMENT_TYPE = {
  theorem:     { tag: 'theorem',     prefix: 'thm' },
  lemma:       { tag: 'lemma',       prefix: 'lem' },
  corollary:   { tag: 'corollary',   prefix: 'cor' },
  proposition: { tag: 'proposition', prefix: 'prop' },
  definition:  { tag: 'definition',  prefix: 'def' },
  example:     { tag: 'example',     prefix: 'ex' },
  remark:      { tag: 'remark',      prefix: 'rem' },
  proof:       { tag: 'proof',       prefix: null },
};

// DSL frameables whose source Enscribe preserves verbatim (opaque content).
const KNOWN_DSLS = new Set(['mermaid', 'abc']);

// `<statement>` ids, pre-collected so a forward `<xref ref-type="statement">` can
// resolve to the Enscribe-prefixed id even when the JATS rid is bare.
const _statements = new Map(); // JATS id → Enscribe-prefixed id

/** Index every `<statement id>` under `el`, mapping its JATS id to the prefixed id. */
function collectStatements(el) {
  for (const st of collectEls(el, 'statement')) {
    const id = st.attributes.id;
    if (!id) continue;
    const info = STATEMENT_TYPE[st.attributes['content-type'] || ''] || STATEMENT_TYPE.theorem;
    _statements.set(id, info.prefix ? prefixId(id, info.prefix) : id);
  }
}

/** Resolve an `<xref ref-type="statement">` rid to its Enscribe-prefixed target. */
function resolveStatementTarget(rid) {
  if (!rid) return null;
  return _statements.get(rid) || (rid.includes(':') ? rid : prefixId(rid, 'thm'));
}

/**
 * `<statement content-type="X">` → the matching theorem-family element. `<label>`
 * is dropped (Enscribe re-numbers); `<title>` → the `name=` kwarg; the body `<p>`s
 * are the content; the id gains the type's colon-prefix so cross-references
 * resolve. An unknown content-type falls back to `<theorem>` with a warning.
 */
function convertStatement(st) {
  const ct = st.attributes['content-type'] || '';
  let info = STATEMENT_TYPE[ct];
  if (!info) { noteDropped(`statement(content-type=${ct || '?'} → theorem)`); info = STATEMENT_TYPE.theorem; }
  const id = info.prefix ? prefixId(st.attributes.id, info.prefix) : (st.attributes.id || null);
  const titleEl = childEl(st, 'title');
  const name = titleEl ? textOf(titleEl).replace(/\s+/g, ' ').trim() : null;
  const body = convertBlocks(st.children.filter((c) => c.name !== 'label' && c.name !== 'title'), 99);
  return makeTag(info.tag, body, { id, kwargs: name ? { name } : {} });
}

/**
 * Detect a DSL figure: a `<fig specific-use="enscribe-dsl-TYPE">` and/or a child
 * `<preformat content-type="TYPE-source">`. Returns `{ type, source }` for a known
 * DSL (mermaid / abc), or null. These markers are written by Enscribe's own JATS
 * export — arbitrary JATS figures won't carry them and fall through to the image
 * path.
 */
function detectDsl(fig) {
  let type = (fig.attributes['specific-use'] || '').match(/^enscribe-dsl-(.+)$/)?.[1] || null;
  const preformats = collectEls(fig, 'preformat');
  const sourcePre = preformats.find((p) => /-source$/.test(p.attributes['content-type'] || ''));
  if (!type && sourcePre) type = (sourcePre.attributes['content-type'] || '').replace(/-source$/, '');
  if (!type || !KNOWN_DSLS.has(type)) return null;
  const el = sourcePre || preformats[0];
  if (!el) return null;
  return { type, source: textOf(el).replace(/^\s*\n/, '').replace(/\s+$/, '') };
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
  // Derived from the interpreter's single source (#224); the Math.min CLAMP is
  // preserved (depth 3+ → sub-sub-section) — note this is NOT SECTION_DEPTH_MAP,
  // which MISSES on out-of-range rather than clamping.
  const tag = SECTION_TAGNAMES[Math.min(depth, SECTION_TAGNAMES.length - 1)];
  const titleEl = childEl(sec, 'title');
  const titleInline = titleEl ? convertInline(titleEl.children) : [{ type: 'text', value: '' }];
  // Prefix the id so section cross-references resolve and the section is indexed.
  const id = prefixId(sec.attributes.id, 'sec');
  const sectionTag = makeTag(tag, [{ type: 'paragraph', children: titleInline }], { id });

  const bodyChildren = sec.children.filter((c) => c !== titleEl);
  return [sectionTag, ...convertBlocks(bodyChildren, depth + 1)];
}

// #113: a JATS <p> may carry block floats (<fig>, <table-wrap>) mid-paragraph,
// which can't nest in an HTML <p>. Hoist each float to a block sibling at the
// point it appears; the surrounding inline content forms the paragraph(s), so the
// float's id exists and cross-references to it resolve. The no-float fast path
// returns the single paragraph unchanged (byte-identical for every other <p>).
const PARA_HOIST = new Set(['fig', 'table-wrap']);
function convertParagraph(node, depth) {
  if (!node.children.some((c) => PARA_HOIST.has(c.name))) {
    return { type: 'paragraph', children: convertInline(node.children) };
  }
  const out = [];
  let run = [];
  const flushRun = () => {
    if (run.some((c) => c.name !== '#text' || c.value.trim())) {
      out.push({ type: 'paragraph', children: convertInline(run) });
    }
    run = [];
  };
  for (const c of node.children) {
    if (PARA_HOIST.has(c.name)) {
      flushRun();
      const block = convertBlock(c, depth);
      if (block) out.push(...(Array.isArray(block) ? block : [block]));
    } else {
      run.push(c);
    }
  }
  flushRun();
  return out;
}

function convertBlock(node, depth) {
  switch (node.name) {
    case 'p':         return convertParagraph(node, depth);
    case 'list':      return convertList(node, depth);
    case 'disp-quote':return { type: 'blockquote', children: convertBlocks(node.children, depth) };
    case 'disp-formula': {
      const m = convertFormula(node, /* display */ true);
      // A LaTeX math node is a block-level sibling; a fallback code span is wrapped.
      return m.type === 'enscribeTag' ? m : { type: 'paragraph', children: [m] };
    }
    case 'fig':         return convertFigure(node);
    case 'table-wrap':  return convertTableWrap(node);
    // #113: a multi-panel figure group (eLife). Unwrap it so each contained
    // <fig>/<table-wrap> is emitted and its id exists (cross-refs resolve). A
    // group-level <caption> emits as a lead paragraph; the group <label> is
    // dropped (Enscribe numbers itself).
    case 'fig-group': {
      const out = [];
      const groupCap = captionInline(node);
      if (groupCap.length) out.push({ type: 'paragraph', children: groupCap });
      out.push(...convertBlocks(node.children.filter((c) => c.name !== 'caption' && c.name !== 'label'), depth));
      return out;
    }
    case 'statement':   return convertStatement(node);
    case 'def-list':    return convertDefList(node);
    // <boxed-text> (a sidebar / call-out box) → <aside> (the export's reverse),
    // preserving its content instead of dropping the box. The content-type
    // round-trips onto the `type` kwarg (#31), except the default "aside" which
    // re-imports as a bare <aside>. (Title/caption import is not yet round-tripped
    // — frameable.md scopes the import to content-type ↔ type.)
    case 'boxed-text': {
      const contentType = node.attributes['content-type'];
      // #333: a margin note round-trips to <note position=margin>. Element → position;
      // numbering is independent, so the <label> is dropped (enscribe recomputes the
      // number), NOT read as "unnumbered".
      if (contentType === 'marginnote') {
        const body = convertBlocks(node.children.filter((c) => c.name !== 'label' && c.name !== 'caption'), depth);
        return makeTag('note', body, { id: node.attributes.id || null, kwargs: { position: 'margin' } });
      }
      const kwargs = (contentType && contentType !== 'aside') ? { type: contentType } : {};
      return makeTag('aside', convertBlocks(node.children.filter((c) => c.name !== 'label' && c.name !== 'caption'), depth), { kwargs });
    }
    // A block-position <fn> / <corresp> (e.g. inside <author-notes>) — unwrap to
    // its content. (Body footnote markers are inlined via <xref ref-type="fn">.)
    case 'fn':          return convertBlocks(node.children.filter((c) => c.name !== 'label'), depth);
    case 'corresp':     return { type: 'paragraph', children: convertInline(node.children.filter((c) => c.name !== 'label')) };
    case 'preformat': {
      // A bare <preformat> (DSL <preformat>s are consumed inside convertFigure) →
      // a code block. Language from xml:lang when present.
      const lang = node.attributes['xml:lang'] || node.attributes.language || null;
      return { type: 'code', lang, value: textOf(node).replace(/^\s*\n/, '').replace(/\s+$/, '') };
    }
    case 'title':     return null; // consumed by convertSec / regionToSection
    case 'label':     return null; // consumed by the element that owns it
    default:
      // Expected publishing metadata drops silently; a genuinely unknown block
      // warns once so it is not lost without notice.
      if (!DROPPED_METADATA.has(node.name)) noteDropped(node.name);
      return null;
  }
}

/** `<def-list>` → `<dl>` with `<dt>` (term) / `<dd>` (definition) items. */
function convertDefList(dl) {
  const items = [];
  for (const di of childrenEls(dl, 'def-item')) {
    const term = childEl(di, 'term');
    const def = childEl(di, 'def');
    if (term) items.push(makeTag('dt', convertInline(term.children)));
    if (def) items.push(makeTag('dd', convertBlocks(def.children, 99)));
  }
  return makeTag('dl', items);
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
      const refType = c.attributes['ref-type'] || '';
      // Bibliographic cross-reference → <cite @key>. `rid` is an IDREFS list (one
      // or more bibliography ids), so a grouped xref becomes one multi-key cite.
      if (refType === 'bibr') {
        const keys = (c.attributes.rid || '').trim().split(/\s+/).filter(Boolean);
        if (keys.length) { out.push(citeNode(keys)); continue; }
      }
      // Footnote marker → an inline <note> carrying the <fn> body.
      if (refType === 'fn') { out.push(...inlineFootnote(c)); continue; }
      // Theorem-family cross-reference → <ref @prefix:id> (prefix recovered from
      // the pre-collected statement-id map, since ref-type="statement" is shared).
      if (refType === 'statement') {
        const target = resolveStatementTarget((c.attributes.rid || '').trim());
        if (target) { out.push(refNode(target)); continue; }
      }
      // Figure / table / equation / section cross-reference → <ref @prefix:id>.
      const prefix = XREF_TYPE_TO_PREFIX[refType];
      if (prefix) {
        const target = prefixId((c.attributes.rid || '').trim(), prefix);
        if (target) { out.push(refNode(target)); continue; }
      }
      // Unknown ref-type. Keep the visible link text, drop the marker.
      noteDropped(`xref(${refType || '?'})`);
      out.push(...convertInline(c.children));
      continue;
    }
    if (c.name === 'inline-formula') { out.push(convertFormula(c, /* display */ false)); continue; }
    // A <disp-formula> nested in inline content (uncommon) still becomes display-math.
    if (c.name === 'disp-formula') { out.push(convertFormula(c, /* display */ true)); continue; }
    // #333: an inline JATS margin note (<boxed-text content-type="marginnote"> at the
    // authored position, the shape enscribeToJats emits) → <note position=margin>.
    // Element → position; the <label> is dropped (numbering is independent — enscribe
    // recomputes it — so it is not read back as "unnumbered").
    if (c.name === 'boxed-text' && c.attributes['content-type'] === 'marginnote') {
      const body = convertBlocks(c.children.filter((ch) => ch.name !== 'label' && ch.name !== 'caption'), 99);
      out.push(makeTag('note', body, { id: c.attributes.id || null, kwargs: { position: 'margin' } }));
      continue;
    }
    // Unknown inline wrapper: keep its text content, drop the wrapper.
    noteDropped(c.name);
    out.push(...convertInline(c.children));
  }
  return out;
}
