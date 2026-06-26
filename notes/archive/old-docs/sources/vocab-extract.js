// docs/sources/vocab-extract.js — vocab extraction helpers for the generated vocabulary references.
//
// Copied (not reinvented) from docs-site/gen-reference.js's extraction so that docs/ is SELF-CONTAINED:
// gen-books.js depends only on this file + the enscribe engine + the vocab source under
// packages/layer1-vocabulary/, never on docs-site/ (which may be deleted). The logic is identical to
// gen-reference.js's `readElements` / `CATEGORY_ORDER` / `ROOT_ONLY` / `emdTag` / `cell` / `oneLine` /
// `specEmd`; only the ELEMENTS_DIR path is rebased for this file's location (docs/sources/).

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// The canonical vocabulary source — two levels up from docs/sources/, under the enscribe package.
const ELEMENTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'layer1-vocabulary', 'elements',
);
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();
// Inline tag display as code — the backtick form renders <code><tag></code> through the type.
export const emdTag = (n) => '`<' + n + '>`';
// A markdown pipe-table cell must not carry a raw `|` or newline.
export const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

// Document-root / region-only constructs that cannot render LIVE inside a page box (a whole `<book>`,
// a book region, a `<book-part>`). Their examples show source + a static note.
export const ROOT_ONLY = new Set([
  'book', 'article', 'book-part', 'book-body', 'book-front', 'book-back',
  'article-body', 'article-front', 'article-back',
]);

// The category ordering — the chapter axis. (navigation, present in the source but absent here, is
// appended by gen-books.js so the Layer-1 book still covers every category.)
export const CATEGORY_ORDER = [
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

// Read every element .md as { name, spec, body }.
export function readElements() {
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

// The facts line (frontmatter) + the attributes as a markdown pipe table.
export function specEmd(name, spec) {
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
