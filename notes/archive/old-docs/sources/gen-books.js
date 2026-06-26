// docs/sources/gen-books.js — generate the Enscribe & Layer-1 vocabulary references as chaptered BOOKS.
//
// A sibling of the hand-authored docs/authoring_guide book, but GENERATED from the vocab source
// (packages/layer1-vocabulary/elements/*.md, 108 elements). SELF-CONTAINED under docs/: it depends only on
// the local vocab-extract.js (the copied extraction — readElements / CATEGORY_ORDER / ROOT_ONLY / emdTag /
// cell / oneLine / specEmd) and the enscribe engine, never on docs-site/. Writes two books beside it:
//   docs/enscribe_vocabulary/  (the author-facing shorthand constructs)
//   docs/layer_1_vocabulary/   (every Layer 1 element)
// Each is a `<meta type=book>` `index.emd` master with one `<chapter src="<category>.emd" | Title>` per
// category, plus one chapter `.emd` per category — a sequence of `<section>` construct entries.
// Each construct mirrors the authoring-guide shape: General Usage (registers + examples) → Arguments → Notes,
// with the VERBATIM source in `<code>` and the LIVE render in a sealed `<minipage>` (ids stay private to the
// box — no stripping, and an intra-example `<ref>` resolves against the minipage's own registry).
//
// THE RENDER GATE (the point of the task): every example is rendered through the engine BEFORE embedding.
//   • clean        → `<code>` + live `<minipage>`.
//   • apparatus    → `<code>` + "renders no visible output" note (config/data/library/note-list/meta family).
//   • root-only    → `<code>` + "renders as a whole document" note (a whole <book>/region/<book-part>).
//   • error/empty  → `<code>` + a "render pending" note (NEVER a broken live box) + a quarantine-ledger row.
// "Broken" = the render contains `tag-error`, `ref-error`, or `??…??`; "empty" = a non-empty source whose
// render has no visible output (e.g. `<cite>` under processSync, #273). Quarantined cases map to an issue #.

import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEnscribePipeline } from '../../packages/enscribe/src/interpreter/index.js';
import { readElements, CATEGORY_ORDER, ROOT_ONLY, emdTag, cell, oneLine, specEmd } from './vocab-extract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Books are written beside docs/sources/, i.e. directly under docs/.
const OUTPUT_DIR = join(__dirname, '..');
const render = (s) => String(buildEnscribePipeline({}).processSync(s));

// ── category axis (chapter order + titles), from the single-source CATEGORY_ORDER ──────────────────────
const CAT_TITLE = new Map(CATEGORY_ORDER);
const SHORTHAND_CATEGORIES = ['sections', 'block-prose', 'inline-formatting', 'code', 'frameables', 'math',
  'theorem-family', 'citations-and-references', 'structured-data-containers', 'storage-hosts', 'configuration', 'navigation'];

// Render-nothing-by-design / structural constructs → shown as `<code>` + a note, NOT quarantined as a bug.
// By CATEGORY (covers all 28 metadata, the config + storage apparatus) plus a couple of by-name stragglers
// and the document/region ROOT_ONLY set — the cleanest split, and it avoids futile minipage-wrapping of a
// `<meta>` / `<author>` fragment (invalid inside a figure box) which would otherwise read as an error.
const APPARATUS_CATS = new Set(['metadata', 'configuration', 'storage-hosts']);
const ROOTLIKE_CATS = new Set(['document-containers', 'structural-regions']);
const APPARATUS_NAMES = new Set(['note-list']);

// Curated register cipher (sigil + markdown idioms) — accurate, stable, and the same forms the authoring
// guide documents. Only constructs that genuinely HAVE a sigil / markdown register appear.
const SIGIL = {
  section: '<# … #>', 'sub-section': '<## … ##>', 'sub-sub-section': '<### … ###>',
  'inline-math': '<$ … $>', 'display-math': '<$$ … $$>',
  'inline-code': '<` … `>', 'code-block': '<``` … ``` >', li: '<-> …  (or <*> …)',
};
const MARKDOWN = {
  section: '# …', 'sub-section': '## …', 'sub-sub-section': '### …',
  // Markdown emphasis maps to the VISUAL tags only — `*x*`/`_x_` → `<i>` and `**x**` → `<b>`, NOT the
  // semantic `<em>`/`<strong>` (notes/specs/idioms.md). So em/strong carry no markdown register.
  b: '**…**', i: '*…*  (or _…_)', s: '~~…~~',
  'inline-code': '`…`', 'code-block': '```…```', li: '- …  (or * …)', hr: '---',
  blockquote: '> …', // `<quote>` is a blockquote alias, reached via shorthand_expansions, not a name key.
};

// Tracking issues for the two NEW bugs this coverage surfaced (filed verify-first against current main):
//   #275 — bare `<hr>` / `<hr type=…>` parsed as a long-form opener (no self-close) → tag-error.
//   #276 — long-form closing tags with leading indentation not recognized → tag-error.
const ISSUE = { hr: 275, indentClose: 276, blockquote: 277 };

// ── the render gate ────────────────────────────────────────────────────────────────────────────────────
const ERR_RE = /tag-error|ref-error|\?\?/;
// Prefer the DESCRIPTIVE `??tag: … ??` / `??ref: … ??` marker (it carries the cause, e.g. "no closing
// tag", which classify() keys off) over the bare `…-error` CSS class, which can match first in the HTML.
const firstMarker = (h) => {
  const desc = h.match(/\?\?(?:tag|ref):[^?]*\?\?/);
  if (desc) return desc[0];
  const cls = h.match(/(?:tag|ref|cite)-error/);
  return cls ? cls[0] : 'render error';
};

function bodyOf(html) { const i = html.search(/<article|<book/); return i >= 0 ? html.slice(i) : html; }
function isVisiblyEmpty(html) {
  let b = bodyOf(html).replace(/<\/?(article|article-body|article-front|article-back|book|book-body)[^>]*>/g, '');
  if (/<(img|svg|hr|video|canvas|iframe|table|figure|math|pre|code)\b/i.test(b)) return false;
  const text = b.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, '').trim();
  return text.length === 0;
}

/** Classify one example source. status ∈ clean | apparatus | rootOnly | error | empty | none. */
function gate(name, cat, src) {
  const s = String(src).trim();
  if (!s) return { status: 'none' };
  if (ROOT_ONLY.has(name) || ROOTLIKE_CATS.has(cat)) return { status: 'rootOnly' };
  if (APPARATUS_CATS.has(cat) || APPARATUS_NAMES.has(name)) return { status: 'apparatus' };
  let standalone, wrapped;
  try {
    standalone = render(s);
    wrapped = render(`<minipage>\n${s}\n</minipage>`);
  } catch (e) {
    return { status: 'error', detail: 'exception: ' + oneLine(String(e.message)).slice(0, 140) };
  }
  if (ERR_RE.test(standalone) || ERR_RE.test(wrapped)) {
    return { status: 'error', detail: firstMarker(ERR_RE.test(standalone) ? standalone : wrapped) };
  }
  if (/<cite\b[^>]*>\s*<\/cite>/.test(standalone)) return { status: 'empty', detail: 'cite renders empty (#273)' };
  // A LOCALLY empty content element nested in otherwise-visible prose — the gap isVisiblyEmpty (whole-render
  // only) can't see, the same class the cite regex closes for `<cite>`. It means a literal `<tag>` MENTION in
  // the example's pipe content was parsed as a live nested tag and rendered empty (e.g. blockquote.md's
  // `<blockquote | … <quote> …>`). Don't ship a box with a stray empty element — quarantine it.
  if (/<(blockquote|p|b|i|em|strong|q|s|u|dd|dt|aside)>\s*<\/\1>/.test(standalone)) {
    return { status: 'empty', detail: 'a literal tag-mention in the source was consumed into an empty nested element' };
  }
  if (isVisiblyEmpty(standalone)) return { status: 'empty', detail: 'non-empty source renders no visible output' };
  return { status: 'clean' };
}

/** Map a quarantined example to its tracking issue + a human reason. */
function classify(name, src, g) {
  if (name === 'cite' || g.detail === 'cite renders empty (#273)') {
    return { issue: 273, reason: 'processSync does not resolve citations — `<cite>` renders empty' };
  }
  if (name === 'ref') return { issue: 268, reason: '`<ref #id>` self-declares instead of referencing' };
  if (name === 'hr') return { issue: ISSUE.hr, reason: 'bare `<hr>` / `<hr type=…>` parsed as a long-form opener (no self-close) → tag-error' };
  if (/no closing tag/.test(g.detail || '') && /^[ \t]+<\/?[A-Za-z]/m.test(src)) {
    return { issue: ISSUE.indentClose, reason: 'indented long-form closing tag not recognised → tag-error' };
  }
  if (/consumed into an empty/.test(g.detail || '')) {
    return { issue: ISSUE.blockquote, reason: 'the example source has an unescaped `<…>` tag-mention the parser consumes into an empty nested element' };
  }
  return { issue: null, reason: g.detail || 'render error' };
}

// ── small emit helpers ───────────────────────────────────────────────────────────────────────────────
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const titleCase = (s) => String(s).split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const safeNote = (s) => oneLine(s).replace(/\*/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trimSrc = (s) => String(s).replace(/\r\n/g, '\n').replace(/\n+$/, '');

function registersBlock(name, spec) {
  const out = ['Registers:', ''];
  out.push('- Canonical: ' + emdTag(name));
  if (SIGIL[name]) out.push('- Sigil: `' + SIGIL[name] + '`');
  if (MARKDOWN[name]) out.push('- Markdown: `' + MARKDOWN[name] + '`');
  for (const e of (Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : [])) {
    if (!e.shorthand) continue;
    out.push('- Alias: ' + emdTag(e.shorthand) + ' → ' + emdTag(String(e.expands_to).split(/\s+/)[0]));
  }
  out.push('');
  return out;
}

function attributesTable(spec) {
  const attrs = spec.enscribe_attributes ?? {};
  const rows = [];
  for (const [kw, def] of Object.entries(attrs.kwargs ?? {})) {
    const vals = Array.isArray(def?.values) ? def.values.map((v) => '`' + cell(v) + '`').join(' ') : '';
    rows.push(`| \`${cell(kw)}\` | kwarg | ${vals} | ${cell(def?.notes ?? '')} |`);
  }
  for (const [b, def] of Object.entries(attrs.booleans ?? {})) {
    const dflt = def?.default !== undefined ? 'default `' + cell(String(def.default)) + '`' : '';
    rows.push(`| \`+${cell(b)}\` | boolean | ${dflt} | ${cell(def?.notes ?? '')} |`);
  }
  if (!rows.length) return null;
  return ['| attribute | kind | values / default | notes |', '|---|---|---|---|', ...rows, ''];
}

/** One example: <code> verbatim + (gated) <minipage> live / a note. Pushes a quarantine row on error/empty. */
function exampleBlock(name, src, idBase, exNotes, ctx) {
  const id = `${idBase}`;
  const out = [`<code #code:${id}>`, src, '</code>', ''];
  const g = gate(name, ctx.category, src);
  if (g.status === 'clean') {
    out.push(`<minipage #mp:${id}>`, src, '</minipage>', '');
  } else if (g.status === 'apparatus') {
    out.push('*Structural / front-matter — shown as source. It carries metadata or apparatus (configuration, stored data, document front matter), not standalone body content, so there is no in-flow live box.*', '');
  } else if (g.status === 'rootOnly') {
    out.push('*Renders as a whole document — shown as source; see the Showcase chapter for a live multi-construct example.*', '');
  } else { // error | empty → quarantine, never a broken live box
    const c = classify(name, src, g);
    const ref = c.issue ? ` (issue #${c.issue})` : ' (unfiled — see the quarantine ledger)';
    out.push(`*Render pending — ${c.reason}${ref}.*`, '');
    ctx.quarantine.push({ book: ctx.book, category: ctx.category, construct: name, source: src, status: g.status, detail: g.detail || '', issue: c.issue, reason: c.reason });
  }
  if (exNotes) out.push('*' + safeNote(exNotes) + '*', '');
  return out;
}

// ── SHORTHAND book: one <section> per construct ────────────────────────────────────────────────────────
function shorthandConstruct(el, ctx) {
  const { name, spec } = el;
  const lines = [`<section #sh-${slug(name)} | ${emdTag(name)}>`, ''];
  lines.push('<sub-section | General Usage>', '');
  lines.push(`Semantic role: *${cell(spec.semantic_role ?? name)}*. Compiles to Layer 1 ${emdTag(spec.html_output?.element ?? name)}.`, '');
  lines.push(...registersBlock(name, spec));

  const exs = (Array.isArray(spec.shorthand_examples) ? spec.shorthand_examples : []).filter((e) => trimSrc(e.source ?? '').trim());
  let i = 0;
  for (const ex of exs) { i++; lines.push(...exampleBlock(name, trimSrc(ex.source), `sh-${slug(name)}-${i}`, ex.notes, ctx)); }
  if (!exs.length) lines.push('*No standalone example — see the registers above and the related constructs in this chapter.*', '');

  const at = attributesTable(spec);
  if (at) lines.push('<sub-section | Arguments>', '', ...at);
  lines.push('</section>', '');
  return lines;
}

// ── LAYER-1 book: one <section> per element (semantic role, HTML projection, attrs, JATS, shorthand) ────
function layer1Element(el, ctx) {
  const { name, spec } = el;
  const lines = [`<section #l1-${slug(name)} | ${emdTag(name)}>`, ''];
  lines.push('<sub-section | Specification>', '');
  lines.push(...specEmd(name, spec)); // facts line (category · Layer 1 · JATS · content) + attributes table
  // producing shorthand, if any
  const sig = SIGIL[name] ? '`' + SIGIL[name] + '`' : null;
  const md = MARKDOWN[name] ? '`' + MARKDOWN[name] + '`' : null;
  const aliases = (Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : []).map((e) => e.shorthand).filter(Boolean).map(emdTag);
  const producers = [name && (spec.authoring === 'generated' ? null : 'canonical ' + emdTag(name)), sig && 'sigil ' + sig, md && 'markdown ' + md, ...aliases.map((a) => 'alias ' + a)].filter(Boolean);
  lines.push('Produced by: ' + (producers.length ? producers.join(' · ') : (spec.authoring === 'generated' ? '*structural — emitted by the compiler, not authored directly*' : emdTag(name))) + '.', '');

  const exs = (Array.isArray(spec.shorthand_examples) ? spec.shorthand_examples : []).filter((e) => trimSrc(e.source ?? '').trim());
  if (exs.length) {
    lines.push('<sub-section | Examples>', '');
    let i = 0;
    for (const ex of exs) { i++; lines.push(...exampleBlock(name, trimSrc(ex.source), `l1-${slug(name)}-${i}`, ex.notes, ctx)); }
  }
  lines.push('</section>', '');
  return lines;
}

// ── Showcase chapter (shorthand only): curated, gate-clean multi-construct documents ───────────────────
const SHOWCASE_DOCS = [
  {
    title: 'A short paper',
    note: 'Meta, sections, inline + display math, a theorem, a numbered figure, and a cross-reference, in one document. (Citations are authored with `<cite>` + `<library>`; they resolve via the build / async render path, not shown live here — see issue #273.)',
    src: [
      '<meta type=article>',
      '<title | On the Convergence of Iterative Maps>',
      '<author | A. Researcher>',
      '</meta>',
      '',
      '<section #sec:intro | Introduction>',
      '',
      'We study the fixed point of an iterative map $x_{n+1} = f(x_n)$. The displayed relation',
      '',
      '<$$ #eqn:fix | x^\\* = f(x^\\*) $$>',
      '',
      'defines the fixed point referenced throughout.',
      '',
      '<section #sec:result | Result>',
      '',
      '<theorem #thm:main | A contraction on a complete space has a unique fixed point.>',
      '',
      'The schematic in <ref @fig:map> sketches the iteration, and equation <ref @eqn:fix> states the fixed-point condition.',
      '',
      '<fig #fig:map src=iteration.png | The iteration approaching its fixed point.>',
    ].join('\n'),
  },
  {
    title: 'A boxed worked example',
    note: 'A definition, a list, a table, and a callout — the everyday block constructs together.',
    src: [
      '<section #sec:method | Method>',
      '',
      '<definition #def:residual | The *residual* is the difference between observed and predicted values.>',
      '',
      'The procedure has three steps:',
      '',
      '<list ordered>',
      '<li> Fit the model.',
      '<li> Compute residuals.',
      '<li> Inspect their distribution.',
      '</list>',
      '',
      '<table csv caption="Residual summary." |',
      'stat,value',
      'mean,0.01',
      'sd,0.98>',
      '',
      '<aside type=tip | Standardize residuals before comparing across models.>',
    ].join('\n'),
  },
];

function showcaseChapter(ctx) {
  const lines = [];
  SHOWCASE_DOCS.forEach((doc, k) => {
    lines.push(`<section #sh-showcase-${k + 1} | ${doc.title}>`, '');
    if (doc.note) lines.push(doc.note, '');
    lines.push(...exampleBlock('__showcase__', doc.src, `sh-showcase-${k + 1}`, null, ctx));
    lines.push('</section>', '');
  });
  return lines;
}

// ── book assembly ──────────────────────────────────────────────────────────────────────────────────────
function chapterIntro(title, blurb) {
  return [`<section | ${title}>`, '', blurb, '', '</section>', ''];
}

function buildBook({ key, dirName, title, subtitle, categories, emitConstruct, includeShowcase }, elements, quarantine, stats) {
  const dir = join(OUTPUT_DIR, dirName);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const byCat = new Map();
  for (const el of elements) {
    const cat = el.spec.category || '__uncat__';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(el);
  }

  const masterChapters = [];
  let chapterN = 0, constructN = 0;
  for (const cat of categories) {
    const els = (byCat.get(cat) || []).slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!els.length) continue;
    chapterN++;
    const catTitle = CAT_TITLE.get(cat) || titleCase(cat);
    const ctx = { book: key, category: cat, quarantine };
    const chapterLines = [];
    for (const el of els) { chapterLines.push(...emitConstruct(el, ctx)); constructN++; }
    const file = `${cat}.emd`;
    writeFileSync(join(dir, file), chapterLines.join('\n') + '\n', 'utf8');
    masterChapters.push(`<chapter src="${file}" | ${catTitle}>`);
  }

  if (includeShowcase) {
    chapterN++;
    const ctx = { book: key, category: 'showcase', quarantine };
    writeFileSync(join(dir, 'showcase.emd'), showcaseChapter(ctx).join('\n') + '\n', 'utf8');
    masterChapters.push('<chapter src="showcase.emd" | Showcase>');
  }

  const master = [
    '<meta type=book>',
    `<title | ${title}>`,
    `<subtitle | ${subtitle}>`,
    '<author>',
    '<name | Generated from the Enscribe vocabulary source>',
    '</author>',
    '</meta>',
    '',
    // The per-construct Arguments tables are reference apparatus, not floats — suppress their "Table N."
    // labels book-wide (the authoring-guide model does the same with `-numbered`). The figure/table
    // EXAMPLES live inside sealed `<minipage>`s, so they keep their own private numbering regardless.
    '<config number-tables=false />',
    '',
    ...masterChapters,
    '',
  ].join('\n');
  writeFileSync(join(dir, 'index.emd'), master + '\n', 'utf8');

  stats[key] = { chapters: chapterN, constructs: constructN, dir };
  return { dir, chapters: chapterN, constructs: constructN };
}

// ── main ───────────────────────────────────────────────────────────────────────────────────────────────
export function generateBooks() {
  const all = readElements();
  const quarantine = [];
  const stats = {};

  // Shorthand book: the author-facing categories, minus authoring:generated.
  const shortEls = all.filter((e) => SHORTHAND_CATEGORIES.includes(e.spec.category) && e.spec.authoring !== 'generated');
  buildBook({
    key: 'shorthand',
    dirName: 'enscribe_vocabulary',
    title: 'The Enscribe Vocabulary',
    subtitle: 'Every author-facing construct — registers, arguments, and live examples',
    categories: SHORTHAND_CATEGORIES,
    emitConstruct: shorthandConstruct,
    includeShowcase: true,
  }, shortEls, quarantine, stats);

  // Layer-1 book: ALL elements (incl. generated/structural). CATEGORY_ORDER order, then any category
  // present in the source but absent from it (e.g. `navigation`) appended — so all 108 elements land.
  const ordered = CATEGORY_ORDER.map(([c]) => c);
  const present = [...new Set(all.map((e) => e.spec.category))];
  const l1Categories = [...ordered, ...present.filter((c) => !ordered.includes(c)).sort()];
  buildBook({
    key: 'layer1',
    dirName: 'layer_1_vocabulary',
    title: 'The Layer 1 Vocabulary',
    subtitle: 'Every Layer 1 element — semantic role, HTML projection, attributes, and JATS counterpart',
    categories: l1Categories,
    emitConstruct: layer1Element,
    includeShowcase: false,
  }, all, quarantine, stats);

  return { stats, quarantine, counts: { all: all.length, shorthand: shortEls.length } };
}

// Allow `node gen-books.js` to run it directly and print a summary.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { stats, quarantine, counts } = generateBooks();
  console.log('Generated books under', OUTPUT_DIR);
  for (const [k, s] of Object.entries(stats)) console.log(`  ${k}: ${s.chapters} chapters, ${s.constructs} constructs`);
  console.log(`elements: ${counts.all} total, ${counts.shorthand} in shorthand set`);
  console.log(`quarantined examples: ${quarantine.length}`);
  const byIssue = {};
  for (const q of quarantine) { const k = q.issue ?? 'UNFILED'; (byIssue[k] = byIssue[k] || []).push(`${q.construct}`); }
  for (const [iss, cs] of Object.entries(byIssue)) console.log(`  issue ${iss}: ${cs.join(', ')}`);
}
