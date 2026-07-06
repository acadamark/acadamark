// Documentation generator (#223) — realizes notes/specs/documentation.md.
//
// Reads the element specs (via the compiled registry `@enscribejs/ehtml` VOCABULARY,
// itself generated from packages/ehtml/elements/*.md) + the semantic taxonomy order,
// and EMITS the three generated doc surfaces into docs-source/:
//
//   docs-source/enscribe_vocabulary/  — Enscribe Shorthand Vocabulary (comprehensive)
//   docs-source/ehtml/                — eHTML Vocabulary (comprehensive)
//   docs-source/authoring_guide/      — Authoring Guide (lighter, common-path)
//
// Each surface is a <meta type=book> index + one chapter per taxonomy family.
// The hand-authored pages become generator output; `build:site` renders them.
//
// The six generation rules of documentation.md §"Generation rules" are enforced
// here so the whole drift class (collapsed code, headerless tables, stale content)
// cannot recur:
//   1. Organized by the semantic taxonomy (FAMILY_ORDER + each element's semantic_family).
//   2. Reference guides comprehensive: every element, every kwarg/flag/positional, every form.
//   3. Authoring guide lighter (one example per element, no argument tables).
//   4. Every table has a header row — mdTable() is the only table emitter; no -headers.
//   5. Multi-line examples use <code-block>; single-line may use inline <code> (exampleBlock()).
//   6. Examples show source AND rendered result (the <code>/<code-block> source + a <minipage>).
//
// Source of record for markdown idioms is notes/specs/idioms.md (NOT the element prose,
// which drifted — audit D1/D2): `**`→<b>, `*`/`_`→<i>, `~~`→<s>.

import { VOCABULARY } from '@enscribejs/ehtml';
import { readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ELEMENTS_DIR = join(ROOT, 'packages/ehtml/elements');
const DOCS = join(ROOT, 'docs-source');

// Taxonomy family order (notes/taxonomies/semantic-taxonomy.md, families 1–10) →
// [semantic_family key, display title, chapter-file slug].
const FAMILY_ORDER = [
  ['primary-prose',            'Primary prose',            'primary-prose'],
  ['emphasis-and-marking',     'Emphasis & marking',       'emphasis-and-marking'],
  ['aside',                    'Aside',                    'aside'],
  ['quotation-and-sourcing',   'Quotation & sourcing',     'quotation-and-sourcing'],
  ['exhibit',                  'Exhibit',                  'exhibit'],
  ['formal-statements',        'Formal statements',        'formal-statements'],
  ['notation',                 'Notation',                 'notation'],
  ['stores',                   'Stores',                   'stores'],
  ['declarations-and-metadata','Declarations & metadata',  'declarations-and-metadata'],
  ['structural-scaffolding',   'Structural scaffolding',   'structural-scaffolding'],
];

// Markdown idioms — source of record notes/specs/idioms.md §"the visual tags".
const MARKDOWN_IDIOMS = { b: '`**…**`', i: '`*…*` (or `_…_`)', s: '`~~…~~`' };

// A one-line family intro for each surface's chapter opener.
const FAMILY_INTRO = {
  'primary-prose':            'The running-text unit — the paragraph.',
  'emphasis-and-marking':     'Marks the author places on their own words — emphasis and the small typographic and semantic marks.',
  'aside':                    'The author steps aside in their own secondary voice — notes, boxed asides, and disclosure.',
  'quotation-and-sourcing':   'Others’ words, and pointers at sources — quotation, citation, cross-reference, and links.',
  'exhibit':                  'Supporting material showcased in isolation — figures, tables, diagrams, and framed boxes.',
  'formal-statements':        'Labeled formal units asserted in the argument — theorems, proofs, definitions, and the definitional structures.',
  'notation':                 'Foreign formal-language content a DSL owns — mathematics and code, embedded when small and exhibited when large.',
  'stores':                   'Opaque data held under an id for a consumer to interpret — the data container, bibliography sources, and datasets.',
  'declarations-and-metadata':'Statements about the work, not part of its discourse — titles, contributors, provenance, and configuration.',
  'structural-scaffolding':   'The document’s skeleton — containers, regions, sections, the website page-set, and the section break.',
};

// ── canonical elements + alias map ───────────────────────────────────────────
const canonicalNames = readdirSync(ELEMENTS_DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
const canonicalSet = new Set(canonicalNames);
const aliasesByCanonical = {};                 // canonical tag → [alias tag, …] (e.g. fig → [figure])
for (const key of Object.keys(VOCABULARY)) {
  if (canonicalSet.has(key)) continue;
  const canon = canonicalNames.find((n) => VOCABULARY[n] === VOCABULARY[key]);
  if (canon) (aliasesByCanonical[canon] ||= []).push(key);
}

// Group canonical elements by semantic_family; alphabetical within a family (a
// deterministic order derived from the source, not a hand-kept sequence — rule 1).
function familyMembers(fam) {
  return canonicalNames.filter((n) => VOCABULARY[n]?.semantic_family === fam).sort();
}

// ── helpers that enforce the generation rules ────────────────────────────────

// Rule 4: the ONLY table emitter — always a header row + separator, no special cases.
function mdTable(headers, rows) {
  const line = (cells) => '| ' + cells.map((c) => String(c ?? '').replace(/\n/g, ' ').trim()).join(' | ') + ' |';
  return [line(headers), '|' + headers.map(() => '---').join('|') + '|', ...rows.map(line)].join('\n') + '\n';
}

// Escape < > for INLINE PROSE (notes shown as literal text, e.g. &lt;em&gt;), matching the pages.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Backtick-inline code, escaping literal backticks is unnecessary for tag forms.
const code = (s) => '`' + s + '`';

const isMultiline = (src) => /\n/.test(src.replace(/\s+$/, ''));

// Rules 5 + 6: an example is its SOURCE (inline <code> for one line, <code-block> for
// many — never inline <code> multi-line) PLUS a <minipage> that re-renders the same
// source (the rendered companion). `note` renders as an italic caption (escaped).
function exampleBlock(id, source, note) {
  const src = source.replace(/\s+$/, '');
  const tag = isMultiline(src) ? 'code-block' : 'code';
  let out = `<${tag} #code:${id}>\n${src}\n</${tag}>\n\n`;
  // The <minipage> preview is a SEALED sub-document: it forbids <data> / @-src, which
  // resolve at DOCUMENT scope (a store + its consumer), not inside a preview sandbox
  // (the #115 no-external guard). For such examples show the source only — a live
  // preview is impossible by construction — with a one-line reason.
  if (/<data\b|src=["']?@/.test(src)) {
    out += `*(Rendered preview omitted — ${code('<data>')} / ${code('@')}-references resolve at document scope, not inside a sealed preview.)*\n`;
  } else {
    out += `<minipage #mp:${id}>\n${src}\n</minipage>\n`;
  }
  if (note) out += `\n*${esc(note.trim())}*\n`;
  return out + '\n';
}

// The Registers list: canonical tag, markdown idiom (source: idioms.md), aliases.
function registersLines(name) {
  const lines = ['- Canonical: ' + code('<' + name + '>')];
  if (MARKDOWN_IDIOMS[name]) lines.push('- Markdown: ' + MARKDOWN_IDIOMS[name]);
  for (const a of aliasesByCanonical[name] ?? []) lines.push('- Alias: ' + code('<' + a + '>'));
  return lines.join('\n');
}

// A short content-shape word for the Specification line ("prose" / "opaque" / "structured").
function contentWord(el) {
  const c = el.content?.shape?.contains ?? [];
  if (c.includes('inline') || c.includes('prose')) return 'prose';
  if (c.includes('opaque')) return 'opaque';
  if (c.length) return 'structured';
  return 'empty';
}

// Argument rows across every option surface: positional format words, kwargs, boolean flags.
function argumentRows(el) {
  const a = el.enscribe_attributes ?? {};
  const rows = [];
  for (const p of a.positional ?? []) {
    rows.push([code(p.name), 'format-word', (p.values ?? []).map(code).join(' '), firstSentence(p.notes)]);
  }
  for (const [k, v] of Object.entries(a.kwargs ?? {})) {
    const vals = (v.values ?? []).map(code).join(' ') + (v.default ? ` (default ${code(v.default)})` : '');
    rows.push([code(k), 'kwarg', vals.trim(), firstSentence(v.notes)]);
  }
  for (const [k, v] of Object.entries(a.booleans ?? {})) {
    const dflt = v.default === true ? 'default on' : v.default === false ? 'default off' : '';
    rows.push([code('+' + k) + ' / ' + code('-' + k), 'flag', dflt, firstSentence(v.notes)]);
  }
  return rows;
}

// Notes in frontmatter are multi-paragraph; the reference tables want one tight sentence.
function firstSentence(notes) {
  if (!notes) return '';
  const flat = String(notes).replace(/\s+/g, ' ').trim();
  const m = flat.match(/^(.*?[.:])(\s|$)/);
  return esc((m ? m[1] : flat).slice(0, 240));
}

// The examples for an element: spec shorthand_examples (rendered), or none.
function elementExamples(name, prefix) {
  const el = VOCABULARY[name];
  const exs = el.shorthand_examples ?? [];
  if (!exs.length) return '';
  return exs.map((ex, i) => exampleBlock(`${prefix}-${name}-${i + 1}`, ex.source, ex.notes)).join('');
}

// ── per-element section renderers (one per surface) ──────────────────────────

// SHORTHAND vocabulary section: General Usage (role, compiles-to, Registers) + Examples + Arguments.
function shorthandSection(name) {
  const el = VOCABULARY[name];
  let out = `<section #sh-${name} | ${code('<' + name + '>')}>\n\n`;
  out += `<sub-section | General Usage>\n\n`;
  out += `Semantic role: *${el.semantic_role ?? name}*. Compiles to eHTML ${code('<' + (el.html_output?.element ?? name) + '>')}.\n\n`;
  out += `Registers:\n\n${registersLines(name)}\n\n`;
  const ex = elementExamples(name, 'sh');
  if (ex) out += ex;
  const rows = argumentRows(el);
  if (rows.length) {
    out += `<sub-section | Arguments>\n\n`;
    out += mdTable(['attribute', 'kind', 'values / default', 'notes'], rows) + '\n';
  }
  return out + `</section>\n`;
}

// eHTML vocabulary section: one-line Specification + Examples.
function ehtmlSection(name) {
  const el = VOCABULARY[name];
  const jats = el.jats_counterpart?.element;
  const jatsStr = jats && jats !== 'no direct equivalent' ? code('<' + jats + '>') : '*(no direct JATS counterpart)*';
  let out = `<section #eh-${name} | ${code('<' + name + '>')}>\n\n`;
  out += `<sub-section | Specification>\n\n`;
  out += `${code('category')} ${code(el.category ?? '—')} · eHTML ${code('<' + (el.html_output?.element ?? name) + '>')} · JATS ${jatsStr} · ${code('content')} ${code(contentWord(el))} → ${code('<' + (el.content?.becomes ?? 'children') + '>')}\n\n`;
  const rows = argumentRows(el);
  if (rows.length) {
    out += mdTable(['attribute', 'kind', 'values / default', 'notes'], rows) + '\n';
  } else {
    out += `*No kwargs or boolean flags.*\n\n`;
  }
  const produced = ['canonical ' + code('<' + name + '>')];
  if (MARKDOWN_IDIOMS[name]) produced.push('markdown ' + MARKDOWN_IDIOMS[name]);
  out += `Produced by: ${produced.join(', ')}.\n\n`;
  const ex = elementExamples(name, 'eh');
  if (ex) out += `<sub-section | Examples>\n\n` + ex;
  return out + `</section>\n`;
}

// AUTHORING GUIDE section (lighter): role line + ONE example, no argument tables.
function guideSection(name) {
  const el = VOCABULARY[name];
  let out = `<section #ag-${name} | ${code('<' + name + '>')}>\n\n`;
  out += `Compiles to eHTML ${code('<' + (el.html_output?.element ?? name) + '>')}`;
  if (MARKDOWN_IDIOMS[name]) out += `; markdown ${MARKDOWN_IDIOMS[name]}`;
  out += `.\n\n`;
  const exs = el.shorthand_examples ?? [];
  if (exs.length) out += exampleBlock(`ag-${name}-1`, exs[0].source, exs[0].notes);
  return out + `</section>\n`;
}

// ── page + index emitters ────────────────────────────────────────────────────

function familyChapter(fam, title, sectionFn, includeArgs) {
  const members = familyMembers(fam);
  let out = `${FAMILY_INTRO[fam] ?? ''}\n\n`;
  out += members.map(sectionFn).join('\n');
  return out;
}

function bookIndex({ slug, title, subtitle, extraChapters = [] }) {
  let out = `<meta type=book slug=${slug}>\n<title | ${title}>\n<subtitle | ${subtitle}>\n<author>\n<name | Generated from the Enscribe vocabulary source (docs-gen/generate-docs.mjs)>\n</author>\n</meta>\n\n`;
  out += `<config number-tables=false />\n\n`;
  for (const [fam, ftitle, fslug] of FAMILY_ORDER) {
    out += `<chapter src="${fslug}.emd" | ${ftitle}>\n`;
  }
  for (const [src, ctitle] of extraChapters) out += `<chapter src="${src}" | ${ctitle}>\n`;
  return out;
}

function writeFile(dir, file, content) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file), content.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') + '\n', 'utf8');
}

// ── main ─────────────────────────────────────────────────────────────────────

const surfaces = [
  {
    dir: join(DOCS, 'enscribe_vocabulary'), slug: 'enscribe-vocabulary',
    title: 'The Enscribe Vocabulary',
    subtitle: 'Every author-facing construct — registers, arguments, and live examples',
    sectionFn: shorthandSection,
    // Preserve the curated Showcase page if it exists (not generated per-element).
    extra: existsSync(join(DOCS, 'enscribe_vocabulary', 'showcase.emd')) ? [['showcase.emd', 'Showcase']] : [],
  },
  {
    dir: join(DOCS, 'ehtml'), slug: 'ehtml',
    title: 'The eHTML Vocabulary',
    subtitle: 'Every eHTML element — semantic role, HTML projection, attributes, and JATS counterpart',
    sectionFn: ehtmlSection,
    extra: [],
  },
  {
    dir: join(DOCS, 'authoring_guide'), slug: 'authoring-guide',
    title: 'The Enscribe Authoring Guide',
    subtitle: 'The common path, family by family — lighter than the full reference',
    sectionFn: guideSection,
    extra: [],
  },
];

let pageCount = 0, elementCount = 0;
for (const s of surfaces) {
  // Remove stale generated family pages (keep index we rewrite + any preserved extras like showcase).
  for (const [, , fslug] of FAMILY_ORDER) {
    const p = join(s.dir, `${fslug}.emd`);
    if (existsSync(p)) rmSync(p);
  }
  writeFile(s.dir, 'index.emd', bookIndex({ slug: s.slug, title: s.title, subtitle: s.subtitle, extraChapters: s.extra }));
  for (const [fam, title, fslug] of FAMILY_ORDER) {
    const members = familyMembers(fam);
    elementCount += members.length;
    writeFile(s.dir, `${fslug}.emd`, familyChapter(fam, title, s.sectionFn));
    pageCount++;
  }
  pageCount++; // index
}

console.log(`[docs-gen] generated ${pageCount} pages across ${surfaces.length} surfaces; ${canonicalNames.length} canonical elements (${elementCount / surfaces.length} per surface), 2 aliases (quote→blockquote, figure→fig).`);
