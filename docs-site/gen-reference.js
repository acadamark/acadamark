// docs-site — Documentation catalog generator (#223 / #246).
//
// Generates the two comprehensive **Documentation** catalogs — Layer 1 and Shorthand — from the vocab
// SOURCE (`packages/layer1-vocabulary/elements/*.md`: frontmatter spec + Markdown body prose) as
// **enscribe `.emd`**, rendered through the website document type. Generated-from-source → the catalog
// can't drift from what it documents.
//
// Each catalog builder returns an `.emd` STRING (a full `<meta type=article>` page). Per element:
//   • a `<section #l1-NAME | `<tag>`>` heading (the tag shown as code, never parsed as a live tag);
//   • the structured spec (frontmatter) as a facts line + a markdown **pipe table** of attributes;
//   • the prose (the `.md` body) as enscribe (links rewritten to catalog anchors);
//   • each example as a `<code>` fence (verbatim source) + a `<frame>` (LIVE render — ids stripped so
//     repeated demos don't collide). Root-only constructs (`<book>`, regions, `<book-part>`) can't render
//     in a page box, so they show source + a static note (the ROOT_ONLY allowlist).
//
// build.js renders these `.emd` like any other page; the live website type renders them at mount — one
// source, both targets. `buildConfigGrid` (the #239 `<config>` grid) stays HTML: it is injected into the
// Rendering-guide page, not a catalog.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { SIGIL_TO_TAGNAME } from '@enscribejs/enscribe/core/tagname-sigil-map';
import { escapeHtmlAttr as escapeHtml } from '@enscribejs/enscribe/core/escape-html'; // #263: 4-entity (& < > ") — the shared attr-grade escaper
// The <config> option doc source (#239) lives beside CONFIG_KWARGS in the enscribe package; imported via
// a relative path (pure data, no transitive imports; a guard test keeps it in lockstep with CONFIG_KWARGS).
import {
  CONFIG_OPTIONS_DOC, CONFIG_WILDCARD_DOC, CONFIG_FAMILIES,
} from '../packages/enscribe/src/interpreter/lib/config-options-doc.js';
// #223 slice 3 / #241: the curated featured lists for the Vocabulary intros live beside the
// <config> doc source in the enscribe package (docs-site has no test runner, so the #241 guard
// runs in that package's suite). Same relative cross-package path the catalog data sources use.
import { FEATURED_SHORTHAND, FEATURED_LAYER1 } from '../packages/enscribe/src/interpreter/lib/featured-elements.js';

const ELEMENTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'layer1-vocabulary', 'elements',
);
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();
// Inline tag display as code — the backtick form renders <code><tag></code> through the type (the `<…>`
// is literal inside a code span, never parsed as a live tag).
const emdTag = (n) => '`<' + n + '>`';
// The FRAME (live) copy of an example strips ` #id` tokens so repeated demos across entries don't collide
// on duplicate DOM ids; the verbatim <code> copy keeps them (it shows the id syntax). A space-prefixed
// `#name` is the id; the sigil openers `<#` / `<##` have no preceding space, so they are untouched.
const stripIds = (src) => String(src).replace(/\s#[A-Za-z][\w:.-]*/g, '');
// A markdown pipe-table cell must not carry a raw `|` or newline.
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

// Document-root / region-only constructs that cannot render LIVE inside an ordinary page `<frame>`
// (a whole `<book>`, a book region, a `<book-part>`). Their examples show source + a static note.
const ROOT_ONLY = new Set([
  'book', 'article', 'book-part', 'book-body', 'book-front', 'book-back',
  'article-body', 'article-front', 'article-back',
]);

// A catalog demos element STRUCTURE, not a running document — so the many demo boxes (the `<frame>`
// wrapper itself, an inner `<fig>`/`<table>` example, an inline figure in the prose) must not accumulate a
// misleading "Figure 47" / "Table 9" label down the page. Suppressed at SOURCE with a `-numbered` boolean,
// which works in EVERY render path (a page-scoped `<config>` does NOT — the static article render ignores
// it for frames, and the live website applies only one page's config). Three places: the frame wrapper
// (emitted `<frame -numbered>`), float tags inside a frame copy, and float tags in the live prose (never
// inside a ``` / `code` span — that markup is literal documentation). A tag already carrying an explicit
// `+numbered` / `numbered=` (a demo OF numbering) is left as-authored.
const FRAME_FLOAT_TAGS = 'fig|figure|table|frame|svg|mermaid|abc|diagram|aside|theorem|lemma|corollary|proposition|definition|example|csv|tsv';
const suppressFloats = (src) => String(src).replace(
  new RegExp(`<(${FRAME_FLOAT_TAGS})\\b([^>|]*)`, 'gi'),
  (m, tag, rest) => (/[+-]numbered|numbered\s*=/.test(rest) ? m : `<${tag} -numbered${rest}`),
);
const suppressOutsideCode = (text) => String(text)
  .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
  .map((part, i) => (i % 2 === 1 ? part : suppressFloats(part)))
  .join('');

// ── source: read every element .md as { name, spec, body } ────────────────────
function readElements() {
  const out = [];
  for (const file of readdirSync(ELEMENTS_DIR).sort()) {
    if (!file.endsWith('.md')) continue;
    const src = readFileSync(join(ELEMENTS_DIR, file), 'utf8');
    const m = src.match(FRONTMATTER_RE);
    if (!m) continue;
    let spec;
    try { spec = yaml.load(m[1]); } catch { continue; }
    if (!spec || typeof spec !== 'object') continue;
    out.push({ name: file.replace(/\.md$/, ''), spec, body: src.slice(m[0].length) });
  }
  return out;
}

// ── one example: a <code> fence (verbatim) + a <frame> live render (ids stripped) ──
// Root-only elements (a whole document / region) can't render in a page box: source + a static note.
function exampleEmd(src, notes, { rootOnly = false } = {}) {
  const verbatim = String(src).replace(/\r\n/g, '\n').replace(/\n+$/, '');
  const lines = ['<code>', verbatim, '</code>', ''];
  if (rootOnly) {
    lines.push('*Renders as a whole document — shown as source; see the live examples and the demo book.*', '');
  } else {
    lines.push('<frame -numbered>', suppressFloats(stripIds(verbatim)), '</frame>', '');
  }
  if (notes) lines.push('*' + oneLine(notes).replace(/\*/g, '') + '*', '');
  return lines;
}

// ── Layer 1 catalog ───────────────────────────────────────────────────────────
const CATEGORY_ORDER = [
  ['document-containers', 'Document containers'],
  ['structural-regions', 'Structural regions'],
  ['sections', 'Sections'],
  ['block-prose', 'Block prose'],
  ['frameables', 'Frameables'],
  ['math', 'Math'],
  ['code', 'Code'],
  ['inline-formatting', 'Inline formatting'],
  ['citations-and-references', 'Citations & references'],
  ['structured-data-containers', 'Structured-data containers'],
  ['storage-hosts', 'Storage hosts'],
  ['configuration', 'Configuration'],
  ['metadata', 'Document metadata'],
  ['theorem-family', 'Theorem family'],
];

// Prepare an element's Markdown body for the catalog `.emd`. enscribe has NO markdown `[text](url)` link
// idiom (it renders such links as literal text), so links are converted to the canonical `<a href | text>`
// form. A `name.md` link resolves via `linkTarget` to its catalog anchor (`#l1-canonical`, following
// aliases); an unresolvable `.md` link is stripped to its text; external links pass through. The leading
// `# <tag>` H1 is dropped (we supply the `<section>` heading).
function prepareBody(body, linkTarget) {
  return body
    .replace(/^\s*#\s+.*(?:\r?\n)+/, '')
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
      const md = url.match(/^([A-Za-z0-9-]+)\.md(?:#[^)]*)?$/);
      if (md) {
        const anchor = linkTarget(md[1]);
        return anchor ? `<a href="${anchor}" | ${text}>` : text;
      }
      return `<a href="${url}" | ${text}>`;
    })
    .trim();
}

// The facts line (frontmatter) + the attributes as a markdown pipe table.
function specEmd(name, spec) {
  const l1 = spec.html_output?.element ?? name;
  const jats = spec.jats_counterpart?.element;
  const facts = [
    '`category` `' + (spec.category ?? '—') + '`',
    'Layer 1 ' + emdTag(l1),
    jats ? 'JATS ' + emdTag(jats) : null,
    spec.content?.type ? '`content` `' + spec.content.type + '`' + (spec.content.becomes ? ' → ' + emdTag(spec.content.becomes) : '') : null,
  ].filter(Boolean).join(' · ');

  const rows = [];
  const attrs = spec.enscribe_attributes ?? {};
  for (const [kw, def] of Object.entries(attrs.kwargs ?? {})) {
    const vals = Array.isArray(def?.values) ? def.values.map((v) => '`' + cell(v) + '`').join(' ') : '';
    rows.push(`| \`${cell(kw)}\` | kwarg | ${vals} | ${cell(def?.notes ?? '')} |`);
  }
  for (const [b, def] of Object.entries(attrs.booleans ?? {})) {
    const dflt = def?.default !== undefined ? 'default `' + cell(String(def.default)) + '`' : '';
    rows.push(`| \`+${cell(b)}\` | boolean | ${dflt} | ${cell(def?.notes ?? '')} |`);
  }
  const out = [facts, ''];
  if (rows.length) {
    out.push('| attribute | kind | values / default | notes |', '|---|---|---|---|', ...rows, '');
  } else {
    out.push('*No kwargs or boolean flags.*', '');
  }
  return out;
}

function l1ElementEmd({ name, spec, body }, linkTarget) {
  const rootOnly = ROOT_ONLY.has(name) || ROOT_ONLY.has(spec.html_output?.element ?? name);
  const examples = Array.isArray(spec.shorthand_examples) ? spec.shorthand_examples : [];
  const aliases = (Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : [])
    .map((e) => e.shorthand).filter(Boolean);

  const lines = [`<section #l1-${name} | ${emdTag(name)}>`, ''];
  if (aliases.length) {
    lines.push('Authoring shorthand: ' + aliases.map(emdTag).join(', ') +
      ' — see the <a href="?page=shorthand-catalog" | Shorthand catalog>.', '');
  }
  lines.push(...specEmd(name, spec));

  const prose = body.trim() ? suppressOutsideCode(prepareBody(body, linkTarget)) : '';
  if (prose) lines.push(prose, '');

  if (examples.length) {
    lines.push(`<sub-section #l1-${name}-examples | Examples>`, '');
    for (const ex of examples) lines.push(...exampleEmd(ex.source ?? '', ex.notes, { rootOnly }));
  }
  return lines;
}

/**
 * Build the Layer 1 catalog as an `.emd` page string (generated from the vocab source).
 * @returns {{ emd: string, stats: object }}
 */
export function buildLayer1Catalog() {
  const elements = readElements();

  const elementNames = new Set(elements.map((e) => e.name));
  const aliasMap = {};
  for (const { spec } of elements) {
    for (const exp of (Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : [])) {
      if (exp.shorthand && exp.expands_to && !/[\s=]/.test(String(exp.expands_to))) {
        aliasMap[String(exp.shorthand).toLowerCase()] = String(exp.expands_to).toLowerCase();
      }
    }
  }
  const linkTarget = (n) => {
    const lower = String(n).toLowerCase();
    if (elementNames.has(lower)) return `#l1-${lower}`;
    if (aliasMap[lower]) return `#l1-${aliasMap[lower]}`;
    return null;
  };

  const byCategory = new Map();
  for (const el of elements) {
    const cat = el.spec.category || '__uncat__';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(el);
  }
  const order = [...CATEGORY_ORDER];
  for (const cat of byCategory.keys()) {
    if (!order.some(([k]) => k === cat)) order.push([cat, `⚠ Uncategorized (${cat})`]);
  }

  const lines = [
    '<meta type=article>', '<title | Layer 1 catalog>', '</meta>', '',
    'The comprehensive reference for every canonical Layer 1 element — its structured spec, full ' +
    'documentation, and live examples — generated from the ' +
    '<a href="https://github.com/enscribejs/enscribe/tree/main/packages/layer1-vocabulary/elements" | vocabulary source> ' +
    'so it can never drift from what it documents. The authoring shorthands that compile to these elements ' +
    'live in the <a href="?page=shorthand-catalog" | Shorthand catalog>.', '',
  ];
  for (const [cat, label] of order) {
    const els = byCategory.get(cat);
    if (!els || !els.length) continue;
    els.sort((a, b) => a.name.localeCompare(b.name));
    lines.push(`<section #cat-${cat} | ${label}>`, '');
    for (const el of els) lines.push(...l1ElementEmd(el, linkTarget));
  }
  return { emd: lines.join('\n') + '\n', stats: { canonical: elements.length } };
}

// ── Shorthand catalog ─────────────────────────────────────────────────────────

function shorthandEntryEmd({ form, expandsTo, notes, exampleSrc, exampleNote, anchor, rootOnly }) {
  const lines = [`<section #sh-${anchor} | ${emdTag(form)}>`, ''];
  lines.push('Expands to ' + expandsTo + '.', '');
  if (notes) lines.push('*' + oneLine(notes).replace(/\*/g, '') + '*', '');
  if (exampleSrc) lines.push(...exampleEmd(exampleSrc, exampleNote, { rootOnly }));
  return lines;
}

/**
 * Build the Shorthand catalog as an `.emd` page string.
 * @returns {{ emd: string, stats: object }}
 */
export function buildShorthandCatalog() {
  const elements = readElements();
  let count = 0;

  const lines = [
    '<meta type=article>', '<title | Shorthand catalog>', '</meta>', '',
    'Every authoring shorthand — the sigil cipher and each element’s alias / expansion forms — with what ' +
    'it compiles to in Layer 1, generated from the vocabulary source so the shorthand→Layer 1 mapping is ' +
    'inherent and can’t drift. The canonical elements these compile to are documented in the ' +
    '<a href="?page=layer-1-catalog" | Layer 1 catalog>.', '',
  ];

  // 1) Sigil forms — the tagname↔sigil cipher (sections, math, code).
  const SIGIL_EXAMPLE = {
    section: '<# Methods #>', 'sub-section': '<## Materials ##>', 'sub-sub-section': '<### Reagents ###>',
    'inline-math': 'Euler: <$ e^{i\\pi} + 1 = 0 $>.', 'display-math': '<$$ \\int_0^1 x^2 \\, dx = \\tfrac{1}{3} $$>',
    'inline-code': 'Call <` build() `> to start.', 'code-block': '<``` js\nconst x = 1;\n```>',
  };
  lines.push('<section #sh-sigils | Sigil forms>', '',
    'The tagname↔sigil cipher — the fewest-keystrokes form for sections, math, and code.', '');
  for (const [sigil, target] of Object.entries(SIGIL_TO_TAGNAME)) {
    count += 1;
    lines.push(...shorthandEntryEmd({
      form: `${sigil} … ${sigil}`,
      expandsTo: 'the Layer 1 ' + emdTag(target) + ' (see the <a href="?page=layer-1-catalog#l1-' + target + '" | Layer 1 catalog>)',
      notes: `The sigil shorthand for <${target}>.`,
      exampleSrc: SIGIL_EXAMPLE[target], exampleNote: null, anchor: `sigil-${target}`,
      rootOnly: ROOT_ONLY.has(target),
    }));
  }

  // 2) Tag aliases + 3) expansion shorthands — every element's shorthand_expansions.
  const aliasEntries = [];
  const expansionEntries = [];
  for (const { name, spec } of elements) {
    const exps = Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : [];
    const examplesByShorthand = new Map();
    for (const ex of (Array.isArray(spec.shorthand_examples) ? spec.shorthand_examples : [])) {
      const mm = String(ex.source ?? '').match(/^<\s*([a-z0-9-]+)/i);
      if (mm) examplesByShorthand.set(mm[1], ex);
    }
    for (const exp of exps) {
      if (!exp.shorthand) continue;
      count += 1;
      const valued = String(exp.expands_to).includes(' ') || String(exp.expands_to).includes('=');
      const ex = examplesByShorthand.get(exp.shorthand);
      const entry = shorthandEntryEmd({
        form: exp.shorthand,
        expandsTo: emdTag(exp.expands_to) + ' (the Layer 1 ' + emdTag(name) + ', see the <a href="?page=layer-1-catalog#l1-' + name + '" | Layer 1 catalog>)',
        notes: exp.notes,
        exampleSrc: ex?.source ?? null, exampleNote: ex?.notes ?? null,
        anchor: `exp-${exp.shorthand}`,
        rootOnly: ROOT_ONLY.has(name) || ROOT_ONLY.has(String(exp.expands_to).split(/\s/)[0]),
      });
      (valued ? expansionEntries : aliasEntries).push(entry);
    }
  }
  if (aliasEntries.length) {
    lines.push('<section #sh-aliases | Tag aliases>', '',
      'Alternate authoring names that normalize to a canonical element.', '');
    for (const e of aliasEntries) lines.push(...e);
  }
  if (expansionEntries.length) {
    lines.push('<section #sh-expansions | Expansion shorthands>', '',
      'Shorthand tags that expand to a Layer 1 element with attributes set (e.g. the book-part family).', '');
    for (const e of expansionEntries) lines.push(...e);
  }
  return { emd: lines.join('\n') + '\n', stats: { shorthands: count } };
}

// ── Featured-examples for the Vocabulary intros (#223 slice 3 / #241) ─────────────────────────────────
// The two Vocabulary intros are LIGHT curated tastes: a few constructs, each pulled LIVE from the vocab
// source (the guarded FEATURED_* lists in the enscribe package), so the intro examples single-source with
// the catalogs and cannot drift. Emitted as `.emd` — the SAME <code>/<frame> shape the catalogs use (via
// exampleEmd) — and injected at the FEATUREDEXAMPLES marker by docs:gen, so BOTH the static build and the
// live website type render them (unlike the former build-time HTML injection, which the type render skipped
// — leaving the literal marker on the live dogfood).
//
//   • shorthand set → two-part: the authored shorthand <code> + its live <frame>.
//   • layer1 set    → three-part: shorthand <code> → its canonical layer1_html <code> (the "expands to
//                     Layer 1" form, elided for large subtrees) → the live <frame>. Off layer1_html.

// One three-part Layer 1 example: shorthand source, its canonical Layer 1 markup, then the live render.
function featuredLayer1Example(ex) {
  const shorthand = String(ex.source).replace(/\r\n/g, '\n').replace(/\n+$/, '');
  const layer1 = String(ex.layer1_html ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  return [
    '**Shorthand**', '', '<code>', shorthand, '</code>', '',
    '**Layer 1**', '', '<code>', layer1, '</code>', '',
    '**Rendered**', '', '<frame -numbered>', suppressFloats(stripIds(shorthand)), '</frame>', '',
  ];
}

/**
 * Build the featured-examples `.emd` block for a Vocabulary intro page (injected at the
 * FEATUREDEXAMPLES marker by docs:gen). Examples come LIVE from the vocab source via the guarded
 * FEATURED_* lists, so they single-source with the catalogs.
 * @param {'shorthand'|'layer1'} set
 * @returns {string} the `.emd` example blocks (no trailing newline)
 */
export function buildFeaturedIntro(set) {
  const list = set === 'layer1' ? FEATURED_LAYER1 : FEATURED_SHORTHAND;
  const byName = new Map(readElements().map((e) => [e.name, e]));
  const lines = [];
  for (const tag of list) {
    const ex = byName.get(tag)?.spec?.shorthand_examples?.[0];
    if (!ex || !ex.source) {
      // The #241 guard prevents this; a loud marker keeps a build from silently dropping a cell.
      lines.push(`<sub-section | ${emdTag(tag)}>`, '', `*⚠ no example for ${emdTag(tag)}*`, '');
      continue;
    }
    lines.push(`<sub-section #featured-${tag} | ${emdTag(tag)}>`, '');
    if (set === 'layer1') lines.push(...featuredLayer1Example(ex));
    else lines.push(...exampleEmd(ex.source, null)); // two-part: <code> + <frame -numbered>
  }
  return lines.join('\n');
}

// ── The <config> option grid (#239) — stays HTML (injected into the Rendering-guide page) ────────────
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function optionCells(opt) {
  const name = opt.key ?? opt.pattern;
  const reserved = opt.reserved
    ? ' <span class="cfg-reserved">reserved — no consumer yet</span>'
    : '';
  const typeValues = opt.type === 'boolean'
    ? 'boolean'
    : `valued${opt.values ? ` · ${escapeHtml(opt.values)}` : ''}`;
  const scope = opt.scope === 'book-only'
    ? '<span class="cfg-scope-book">book-only</span>'
    : 'all';
  return (
    `      <tr id="cfg-${escapeHtml(slug(name))}">\n` +
    `        <td><code>${escapeHtml(name)}</code>${reserved}</td>\n` +
    `        <td>${escapeHtml(opt.description ?? '')}</td>\n` +
    `        <td>${typeValues}</td>\n` +
    `        <td>${opt.default != null ? escapeHtml(opt.default) : '—'}</td>\n` +
    `        <td>${scope}</td>\n` +
    '      </tr>'
  );
}

/** Build the <config> option grid HTML (grouped by family). @returns {{ html: string, count: number }} */
export function buildConfigGrid() {
  const byFamily = new Map(CONFIG_FAMILIES.map((f) => [f, []]));
  for (const e of CONFIG_OPTIONS_DOC) byFamily.get(e.family)?.push(e);

  const sections = [];
  let count = 0;
  for (const family of CONFIG_FAMILIES) {
    const opts = byFamily.get(family) ?? [];
    const rows = opts.map(optionCells);
    count += opts.length;
    if (CONFIG_WILDCARD_DOC.family === family) { rows.push(optionCells(CONFIG_WILDCARD_DOC)); count += 1; }
    sections.push(
      `  <section class="cfg-family" id="cfg-fam-${slug(family)}">\n` +
      `    <h3>${escapeHtml(family)}</h3>\n` +
      '    <table class="cfg-grid">\n' +
      '      <thead><tr><th>option</th><th>what it does</th><th>type / values</th><th>default</th><th>scope</th></tr></thead>\n' +
      `      <tbody>\n${rows.join('\n')}\n      </tbody>\n` +
      '    </table>\n  </section>',
    );
  }
  return { html: `<div class="config-options-grid">\n${sections.join('\n')}\n</div>`, count };
}
