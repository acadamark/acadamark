// Pandoc bridge for `enscribe import` (LaTeX / Quarto / DOCX / …).
//
// Enscribe shells out to pandoc to read the input into pandoc's JSON AST
// (`pandoc <in> -f <fmt> -t json`), then `convertPandoc` maps that AST to an
// Enscribe mdast tree — the same shape the `jats-import` module produces, ready
// for the interpreter pipeline (→ HTML) or the canonical serializer (→ .emd).
//
// The converter targets the pandoc-types schema of pandoc 2.10+ (the
// TableHead/TableBody table model; the `Figure` block of pandoc 3.0+ is also
// handled). It runs WITHOUT --citeproc so `Cite` nodes keep their keys, which we
// map to `<cite @key>` and back with the document's .bib file as `<library>`.
//
// Deliberately lossy where pandoc is: vanilla pandoc does not preserve LaTeX
// \label/\ref cross-references structurally, so those arrive as plain links or
// text (a documented limitation), not Enscribe `<ref>`s.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, extname, basename, resolve, isAbsolute } from 'node:path';
import { makeTag, makeOpaqueTag } from 'enscribe/core/tag';

// ─── pandoc invocation ──────────────────────────────────────────────────────

// Input extension → pandoc `--from` format. Override with the `from` option.
const EXT_TO_FORMAT = {
  '.tex': 'latex', '.latex': 'latex',
  '.qmd': 'markdown', '.md': 'markdown', '.markdown': 'markdown',
  '.docx': 'docx', '.odt': 'odt', '.epub': 'epub',
  '.rst': 'rst', '.adoc': 'asciidoc', '.asciidoc': 'asciidoc',
  '.org': 'org', '.textile': 'textile', '.html': 'html', '.htm': 'html',
  '.ipynb': 'ipynb', '.typ': 'typst', '.rtf': 'rtf',
};

/** True when pandoc is callable on PATH. */
export function hasPandoc() {
  try { execFileSync('pandoc', ['--version'], { stdio: 'ignore' }); return true; }
  catch { return false; }
}

export class PandocMissingError extends Error {
  constructor() {
    super(
      'pandoc is required for LaTeX / Quarto / DOCX import. ' +
        'Install it from https://pandoc.org/installing.html',
    );
    this.name = 'PandocMissingError';
    this.pandocMissing = true;
  }
}

/** Resolve the pandoc `--from` format for an input path (or honor an override). */
export function detectFormat(inputPath, override) {
  if (override) return override;
  const ext = extname(inputPath).toLowerCase();
  const fmt = EXT_TO_FORMAT[ext];
  if (!fmt) {
    throw new Error(
      `cannot detect the input format from extension '${ext || '(none)'}'. ` +
        'Pass --from <format> (e.g. latex, markdown, docx, rst).',
    );
  }
  return fmt;
}

/** Run pandoc and return the parsed JSON AST. Throws PandocMissingError if absent. */
export function runPandoc(inputPath, fromFormat) {
  if (!hasPandoc()) throw new PandocMissingError();
  const out = execFileSync('pandoc', [inputPath, '-f', fromFormat, '-t', 'json'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(out);
}

/**
 * Find the document's BibTeX file: the `bibliography` metadata field if present
 * (resolved against the input directory), else a single `.bib` beside the input.
 * Returns the raw .bib text, or null.
 */
export function findBibtex(inputPath, meta) {
  const dir = dirname(resolve(inputPath));
  const candidates = [];
  const metaBib = meta && meta.bibliography;
  if (metaBib) {
    for (const p of metaListPaths(metaBib)) candidates.push(isAbsolute(p) ? p : join(dir, p));
  }
  // basename.bib, then any single .bib in the directory.
  candidates.push(join(dir, basename(inputPath, extname(inputPath)) + '.bib'));
  for (const c of candidates) {
    if (existsSync(c)) { try { return readFileSync(c, 'utf8'); } catch { /* keep looking */ } }
  }
  try {
    const bibs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.bib'));
    if (bibs.length === 1) return readFileSync(join(dir, bibs[0]), 'utf8');
  } catch { /* dir unreadable */ }
  return null;
}

function metaListPaths(metaval) {
  if (!metaval) return [];
  if (metaval.t === 'MetaString') return [metaval.c];
  if (metaval.t === 'MetaInlines') return [inlineText(metaval.c)];
  if (metaval.t === 'MetaList') return metaval.c.flatMap(metaListPaths);
  return [];
}

// ─── AST → Enscribe mdast ───────────────────────────────────────────────────

// Track dropped (unmapped) pandoc node kinds; warn once per kind.
const _dropped = new Set();
function noteDropped(name) {
  if (_dropped.has(name)) return;
  _dropped.add(name);
  // eslint-disable-next-line no-console
  console.warn(`[pandoc-import] note: pandoc node '${name}' is not mapped (dropped)`);
}

const text = (value) => ({ type: 'text', value });

/** Plain text of a pandoc *block* list (for table cells / captions). */
function pandocText(blocks) {
  return (blocks ?? []).map((b) => {
    if (b.t === 'Para' || b.t === 'Plain') return inlineText(b.c);
    if (Array.isArray(b.c)) return pandocText(b.c.filter((x) => x && x.t));
    return '';
  }).join(' ').replace(/\s+/g, ' ').trim();
}

/** Plain text of an inline list (for metadata / titles flattened to strings). */
function inlineText(inlines) {
  return (inlines ?? []).map((n) => {
    if (n.t === 'Str') return n.c;
    if (n.t === 'Space' || n.t === 'SoftBreak' || n.t === 'LineBreak') return ' ';
    if (n.t === 'Code' || n.t === 'Math') return n.c[1];
    if (Array.isArray(n.c)) return inlineText(n.c.find(Array.isArray) || n.c);
    return '';
  }).join('').replace(/\s+/g, ' ').trim();
}

const INLINE_WRAP = { Emph: 'i', Strong: 'b', Strikeout: 's', Underline: 'u', Superscript: 'sup', Subscript: 'sub', SmallCaps: 'span' };

/** Convert a pandoc inline list to Enscribe inline mdast / enscribeTag nodes. */
function convertInline(inlines) {
  const out = [];
  for (const n of inlines ?? []) {
    switch (n.t) {
      case 'Str': out.push(text(n.c)); break;
      case 'Space': case 'SoftBreak': out.push(text(' ')); break;
      case 'LineBreak': out.push({ type: 'break' }); break;
      case 'Emph': case 'Strong': case 'Strikeout': case 'Underline':
      case 'Superscript': case 'Subscript': case 'SmallCaps':
        out.push(makeTag(INLINE_WRAP[n.t], convertInline(n.c))); break;
      case 'Code': out.push({ type: 'inlineCode', value: n.c[1] }); break;
      case 'Math': {
        const display = n.c[0] && n.c[0].t === 'DisplayMath';
        out.push(makeOpaqueTag(display ? 'display-math' : 'inline-math', n.c[1],
          { contentHandler: display ? 'math-display' : 'math' }));
        break;
      }
      case 'Quoted': out.push(makeTag('q', convertInline(n.c[1]))); break;
      case 'Link': {
        const url = n.c[2][0];
        out.push(makeTag('a', convertInline(n.c[1]), { kwargs: url ? { href: url } : {} }));
        break;
      }
      case 'Image': {
        // Inline image → a link to the image (a standalone-figure image is lifted
        // to <fig> at the block level; this is the in-prose fallback).
        const url = n.c[2][0];
        out.push(makeTag('a', convertInline(n.c[1]).length ? convertInline(n.c[1]) : [text(url)], { kwargs: { href: url } }));
        break;
      }
      case 'Cite': {
        const keys = (n.c[0] ?? []).map((cit) => cit.citationId).filter(Boolean);
        if (keys.length) out.push({ ...makeTag('cite'), atRefs: keys, content: null });
        else out.push(...convertInline(n.c[1]));
        break;
      }
      case 'Note': out.push(makeTag('note', convertBlocks(n.c))); break;
      case 'Span': out.push(...convertInline(n.c[1])); break;
      case 'RawInline': noteDropped('RawInline(' + n.c[0] + ')'); break;
      default: noteDropped(n.t); if (Array.isArray(n.c)) out.push(...convertInline(n.c.find(Array.isArray) || []));
    }
  }
  return out;
}

/** A single pandoc Image, possibly wrapped in spaces, from an inline list. */
function loneImage(inlines) {
  const sig = (inlines ?? []).filter((n) => n.t !== 'Space' && n.t !== 'SoftBreak');
  return sig.length === 1 && sig[0].t === 'Image' ? sig[0] : null;
}

/** `Image` → `<fig src=url | caption>`; id from the image attr when present. */
function imageFigure(img) {
  const [[id], alt, [url]] = img.c;
  return makeTag('fig', convertInline(alt), { id: id || null, kwargs: url ? { src: url } : {} });
}

/** Convert a pandoc block list to Enscribe block mdast nodes. */
function convertBlocks(blocks) {
  const out = [];
  for (const b of blocks ?? []) {
    const r = convertBlock(b);
    if (r) out.push(...(Array.isArray(r) ? r : [r]));
  }
  return out;
}

const SECTION_TAG = ['section', 'sub-section', 'sub-sub-section'];

function convertBlock(b) {
  switch (b.t) {
    case 'Para': case 'Plain': {
      const img = loneImage(b.c);
      if (img) return imageFigure(img);
      return { type: 'paragraph', children: convertInline(b.c) };
    }
    case 'Header': {
      const [level, [id], inlines] = b.c;
      const tag = SECTION_TAG[Math.min(level - 1, 2)];
      return makeTag(tag, [{ type: 'paragraph', children: convertInline(inlines) }], { id: id || null });
    }
    case 'BlockQuote': return { type: 'blockquote', children: convertBlocks(b.c) };
    case 'BulletList': return listNode(b.c, false);
    case 'OrderedList': return listNode(b.c[1], true, b.c[0][0]);
    case 'CodeBlock': {
      const lang = (b.c[0][1] || [])[0] || null;
      return { type: 'code', lang, value: b.c[1] };
    }
    case 'HorizontalRule': return { type: 'thematicBreak' };
    case 'DefinitionList': return convertDefList(b.c);
    case 'Table': return convertTable(b.c);
    case 'Figure': return convertFigureBlock(b.c);
    case 'Div': return convertBlocks(b.c[1]); // unwrap; class-specific mapping is future work
    case 'LineBlock': return { type: 'paragraph', children: b.c.flatMap((line, i) => (i ? [{ type: 'break' }] : []).concat(convertInline(line))) };
    case 'RawBlock': noteDropped('RawBlock(' + b.c[0] + ')'); return null;
    case 'Null': return null;
    default: noteDropped(b.t); return null;
  }
}

function listNode(items, ordered, start) {
  return {
    type: 'list', ordered, start: ordered ? (start ?? 1) : null, spread: false,
    children: (items ?? []).map((blocks) => ({ type: 'listItem', spread: false, children: convertBlocks(blocks) })),
  };
}

/** Pandoc `DefinitionList` → `<dl>` with `<dt>` / `<dd>`. */
function convertDefList(items) {
  const children = [];
  for (const [term, defs] of items ?? []) {
    children.push(makeTag('dt', convertInline(term)));
    for (const blocks of defs ?? []) children.push(makeTag('dd', convertBlocks(blocks)));
  }
  return makeTag('dl', children);
}

/** Depth-first search of a pandoc node (or list) for the first `Image`'s URL. */
function firstImageUrl(node) {
  if (Array.isArray(node)) {
    for (const n of node) { const u = firstImageUrl(n); if (u) return u; }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  if (node.t === 'Image') return node.c[2][0] || null;
  return Array.isArray(node.c) ? firstImageUrl(node.c) : null;
}

/** Pandoc 3.0 `Figure` block → `<fig>`: the graphic's src + the figure caption. */
function convertFigureBlock(c) {
  const [[id], caption, blocks] = c;
  const captionInline = convertBlocks(caption[1] ?? []).flatMap((p) => p.children ?? []);
  const src = firstImageUrl(blocks);
  if (!src) noteDropped('Figure(no image)');
  return makeTag('fig', captionInline, { id: id || null, kwargs: src ? { src } : {} });
}

// ─── tables ─────────────────────────────────────────────────────────────────

/** Pandoc Table → `<table csv>` (simple) or a no-format raw-HTML `<table>` (spans). */
function convertTable(c) {
  const [[id], caption, , thead, tbodies, tfoot] = c;
  const captionText = pandocText(caption[1] ?? []);
  const tabId = id || null;
  const headRows = thead[1] ?? [];
  const bodyRows = (tbodies ?? []).flatMap((tb) => (tb[2] ?? []).concat(tb[3] ?? []));
  const footRows = tfoot[1] ?? [];
  const allRows = headRows.concat(bodyRows, footRows);

  let complex = false;
  const grid = allRows.map((row) => (row[1] ?? []).map((cell) => {
    const [, , rowspan, colspan] = cell;
    if ((rowspan && rowspan > 1) || (colspan && colspan > 1)) complex = true;
    return pandocText(cell[4] ?? []);
  }));

  const kwargs = captionText ? { caption: captionText } : {};
  if (complex) {
    const rowsHtml = htmlRows(headRows, 'th') + htmlRows(bodyRows.concat(footRows), 'td');
    const cap = captionText ? '<caption>' + escapeHtml(captionText) + '</caption>' : '';
    return makeOpaqueTag('table', cap + rowsHtml, { contentHandler: 'table', id: tabId, kwargs });
  }
  const hasHeader = headRows.length > 0; // thead rows already lead `grid`
  const csv = grid.map((r) => r.map(csvCell).join(',')).join('\n');
  const booleans = hasHeader ? {} : { headers: false };
  return makeOpaqueTag('table', csv, { contentHandler: 'table', positional: ['csv'], id: tabId, kwargs, booleans });
}

function htmlRows(rows, cellTag) {
  return (rows ?? []).map((row) =>
    '<tr>' + (row[1] ?? []).map((cell) => {
      const [, , rowspan, colspan] = cell;
      const span = (rowspan > 1 ? ' rowspan="' + rowspan + '"' : '') + (colspan > 1 ? ' colspan="' + colspan + '"' : '');
      return '<' + cellTag + span + '>' + escapeHtml(pandocText(cell[4] ?? [])) + '</' + cellTag + '>';
    }).join('') + '</tr>',
  ).join('');
}

const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── metadata + assembly ────────────────────────────────────────────────────

function metaInline(metaval) {
  if (!metaval) return [];
  if (metaval.t === 'MetaInlines') return convertInline(metaval.c);
  if (metaval.t === 'MetaString') return [text(metaval.c)];
  if (metaval.t === 'MetaBlocks') return convertBlocks(metaval.c).flatMap((p) => p.children ?? []);
  return [];
}
function metaAuthors(metaval) {
  if (!metaval) return [];
  if (metaval.t === 'MetaList') return metaval.c.map(metaInline).filter((a) => a.length);
  const one = metaInline(metaval);
  return one.length ? [one] : [];
}

function buildMeta(meta) {
  if (!meta) return null;
  const children = [];
  if (meta.title) children.push(makeTag('title', metaInline(meta.title)));
  if (meta.subtitle) children.push(makeTag('subtitle', metaInline(meta.subtitle)));
  for (const a of metaAuthors(meta.author)) children.push(makeTag('author', a));
  if (meta.date) children.push(makeTag('date', metaInline(meta.date)));
  if (meta.abstract) {
    const blocks = meta.abstract.t === 'MetaBlocks' ? convertBlocks(meta.abstract.c) : [{ type: 'paragraph', children: metaInline(meta.abstract) }];
    children.push(makeTag('abstract', blocks));
  }
  if (!children.length) return null;
  return { ...makeTag('meta', children, { kwargs: { type: 'article' } }), form: 'long' };
}

/** Does the converted tree contain any `<cite>`? */
function hasCite(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'enscribeTag' && node.tagname === 'cite') return true;
  for (const k of ['children', 'content']) {
    if (Array.isArray(node[k]) && node[k].some(hasCite)) return true;
  }
  return false;
}

/**
 * Convert a pandoc JSON AST to an Enscribe mdast tree. When `bibtex` (raw .bib
 * text) is supplied and the document cites anything, a `<bibliography>` + a
 * `<library>` (inside `<data>`) are appended so citations resolve.
 *
 * @param {object} ast  parsed pandoc JSON AST
 * @param {{ bibtex?: string|null }} [opts]
 * @returns {import('mdast').Root}
 */
export function convertPandoc(ast, opts = {}) {
  _dropped.clear();
  const out = [];
  const meta = buildMeta(ast.meta);
  if (meta) out.push(meta);
  out.push(...convertBlocks(ast.blocks ?? []));

  if (opts.bibtex && out.some(hasCite)) {
    out.push({ ...makeTag('bibliography', []), form: 'long' });
    const library = makeOpaqueTag('library', '\n' + opts.bibtex.trim() + '\n', { contentHandler: 'library' });
    out.push({ ...makeTag('data', [library]), form: 'long' });
  }
  return { type: 'root', children: out };
}
