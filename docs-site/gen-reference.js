// docs-site — Documentation catalog generator (#223 slice 1).
//
// Generates the two comprehensive **Documentation** catalogs — Layer 1 and Shorthand —
// from the vocab SOURCE (`packages/layer1-vocabulary/elements/*.md`: frontmatter spec +
// Markdown body prose), the way `gen-gallery.js` generates the gallery from `VOCABULARY`.
// Generated-from-source → the catalog can't drift from what it documents: this kills the
// staleness class the hand-written `layer1-reference.emd` belongs to, and delivers the
// comprehensive reference the (now-closed) #122 wanted. Additive — two net-new pages.
//
// Two builders, each mirroring gen-gallery's `{ body, headExtra }` shape so `build.js`
// wires them in exactly like the gallery (source: null, a `kind`):
//   • buildLayer1Catalog  — every CANONICAL Layer 1 element (the .md files; the two bare
//     aliases — figure→fig, quote→blockquote — have no file and belong to the shorthand
//     catalog). Per element: the structured spec (frontmatter), the prose (body), and the
//     examples rendered inline through the same pipeline the docs site uses.
//   • buildShorthandCatalog — the authoring shorthands: the sigil cipher + every element's
//     `shorthand_expansions`, each showing its Layer 1 expansion (mapping inherent) + examples.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { SIGIL_TO_TAGNAME } from '@enscribejs/enscribe/core/tagname-sigil-map';
import { escapeHtmlAttr as escapeHtml } from '@enscribejs/enscribe/core/escape-html'; // #263: 4-entity (& < > ") — the shared attr-grade escaper
// The <config> option doc source (#239) lives beside CONFIG_KWARGS in the enscribe package;
// imported via a relative path (as the vocab .md files are read by path) — it is pure data
// (no transitive imports), and a guard test keeps it in lockstep with CONFIG_KWARGS.
import {
  CONFIG_OPTIONS_DOC, CONFIG_WILDCARD_DOC, CONFIG_FAMILIES,
} from '../packages/enscribe/src/interpreter/lib/config-options-doc.js';

const ELEMENTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'layer1-vocabulary', 'elements',
);
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const tag = (n) => `<code>&lt;${escapeHtml(n)}&gt;</code>`;
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();

// ── source: read every element .md as { name, spec, body } ────────────────────
// `name` is the filename stem (the canonical vocab key); `spec` is the parsed
// frontmatter; `body` is the Markdown prose after it. Frontmatter-less files
// (README / SPEC.md) are skipped, exactly as the vocab build tolerates them.
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

// The pipeline prepends injected asset tags (CDN <link>s, DSL <script>s) to every
// fragment; peel the leading run so they dedupe once into the page <head> (copied
// from gen-gallery's splitAssets — a generator-local helper, kept identical).
function splitAssets(fragment) {
  const assets = [];
  let rest = fragment;
  const leading = /^\s*(<link\b[^>]*>|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>)/i;
  let m;
  while ((m = rest.match(leading))) { assets.push(m[1].trim()); rest = rest.slice(m[0].length); }
  return { assets, content: rest.trim() };
}

// One rendered example: escaped source + live output + note. Always-renders: a throw
// becomes an inline error marker (caught and reported by the build's coverage check).
function renderExample(src, notes, render, assetSet, errors, where) {
  let outputHtml;
  try {
    const { assets, content } = splitAssets(render(src));
    for (const a of assets) assetSet.add(a);
    outputHtml = content || '<span class="ref-empty">(no output)</span>';
  } catch (err) {
    errors.push(`${where}: render error — ${err.message}`);
    outputHtml = `<div class="ref-render-error">render error: ${escapeHtml(err.message)}</div>`;
  }
  const note = notes ? `\n        <p class="ref-note">${escapeHtml(oneLine(notes))}</p>` : '';
  return (
    '      <div class="ref-example">\n' +
    `        <pre class="ref-source"><code>${escapeHtml(src)}</code></pre>\n` +
    `        <div class="ref-render">${outputHtml}</div>${note}\n` +
    '      </div>'
  );
}

// ── Layer 1 catalog ───────────────────────────────────────────────────────────

// Category display order + labels — the same taxonomy gen-gallery groups by (the
// `category` field R5 made load-bearing). An unexpected category surfaces loudly.
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

// Rewrite a body's relative `(name.md)` cross-links to catalog anchors `(#l1-name)` so
// the prose's "See also" links resolve within the catalog instead of dangling at the
// vocab source. Strip the leading `# <tag>` H1 (we supply our own heading).
// Prepare an element's Markdown body for rendering through the enscribe pipeline. enscribe
// has NO markdown `[text](url)` link idiom (it renders such links as literal text), so the
// body's links are converted to the canonical `<a href | text>` form. A `name.md` link
// resolves via `linkTarget` to its catalog anchor (`#l1-canonical`, following aliases);
// an UNRESOLVABLE `.md` link (a removed/retired or non-element doc — see the report's
// finding) is stripped to its text rather than left dangling. External links pass through.
function prepareBody(body, linkTarget) {
  return body
    .replace(/^\s*#\s+.*(?:\r?\n)+/, '') // drop the leading H1 (we supply our own heading)
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
      const md = url.match(/^([A-Za-z0-9-]+)\.md(?:#[^)]*)?$/);
      if (md) {
        const anchor = linkTarget(md[1]);
        return anchor ? `<a href="${anchor}" | ${text}>` : text; // unresolvable → plain text
      }
      return `<a href="${url}" | ${text}>`; // external / in-page link
    });
}

// The structured spec block from the frontmatter: a header line + an attributes table.
function renderSpec(name, spec) {
  const l1 = spec.html_output?.element ?? name;
  const jats = spec.jats_counterpart?.element;
  const facts = [
    `category <code>${escapeHtml(spec.category ?? '—')}</code>`,
    `Layer 1 ${tag(l1)}`,
    jats ? `JATS <code>&lt;${escapeHtml(jats)}&gt;</code>` : null,
    spec.content?.type ? `content <code>${escapeHtml(spec.content.type)}</code>${spec.content.becomes ? ` → <code>&lt;${escapeHtml(spec.content.becomes)}&gt;</code>` : ''}` : null,
  ].filter(Boolean).join(' · ');

  const rows = [];
  const attrs = spec.enscribe_attributes ?? {};
  for (const [kw, def] of Object.entries(attrs.kwargs ?? {})) {
    const vals = Array.isArray(def?.values) ? def.values.map((v) => `<code>${escapeHtml(v)}</code>`).join(' ') : '';
    rows.push(`<tr><td><code>${escapeHtml(kw)}</code></td><td>kwarg</td><td>${vals}</td><td>${escapeHtml(oneLine(def?.notes ?? ''))}</td></tr>`);
  }
  for (const [b, def] of Object.entries(attrs.booleans ?? {})) {
    const dflt = def?.default !== undefined ? `default <code>${escapeHtml(String(def.default))}</code>` : '';
    rows.push(`<tr><td><code>+${escapeHtml(b)}</code></td><td>boolean</td><td>${dflt}</td><td>${escapeHtml(oneLine(def?.notes ?? ''))}</td></tr>`);
  }
  const attrTable = rows.length
    ? `      <table class="ref-attrs"><thead><tr><th>attribute</th><th>kind</th><th>values / default</th><th>notes</th></tr></thead><tbody>\n        ${rows.join('\n        ')}\n      </tbody></table>`
    : '      <p class="ref-attrs-none">No kwargs or boolean flags.</p>';

  return `      <p class="ref-facts">${facts}</p>\n${attrTable}`;
}

function renderL1Element({ name, spec, body }, render, assetSet, errors, linkTarget) {
  const examples = Array.isArray(spec.shorthand_examples) ? spec.shorthand_examples : [];
  const aliases = (Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : [])
    .map((e) => e.shorthand).filter(Boolean);

  const parts = [`    <section class="ref-element" id="l1-${escapeHtml(name)}">`];
  parts.push(`      <h3>${tag(name)}</h3>`);
  if (aliases.length) {
    parts.push(`      <p class="ref-aliases">Authoring shorthand: ${aliases.map(tag).join(', ')} — see the <a href="shorthand-catalog.html">Shorthand catalog</a>.</p>`);
  }
  parts.push(renderSpec(name, spec));

  // Full documentation: the .md body prose, rendered through the docs pipeline.
  const prose = body.trim()
    ? (() => {
        try {
          const { assets, content } = splitAssets(render(prepareBody(body, linkTarget)));
          for (const a of assets) assetSet.add(a);
          return `      <div class="ref-prose">${content}</div>`;
        } catch (err) {
          errors.push(`<${name}> body: render error — ${err.message}`);
          return `      <div class="ref-render-error">prose render error: ${escapeHtml(err.message)}</div>`;
        }
      })()
    : '';
  if (prose) parts.push(prose);

  if (examples.length) {
    parts.push('      <h4 class="ref-examples-h">Examples</h4>');
    for (const ex of examples) parts.push(renderExample(ex.source ?? '', ex.notes, render, assetSet, errors, `<${name}> example`));
  }
  parts.push('    </section>');
  return parts.join('\n');
}

/**
 * Build the Layer 1 catalog page. @param {{ render: (src: string) => string }} opts
 * @returns {{ body: string, headExtra: string, stats: object }}
 */
export function buildLayer1Catalog({ render }) {
  const elements = readElements();
  const assetSet = new Set();
  const errors = [];

  // Resolve a `name.md` prose link to its catalog anchor: a canonical element → its own
  // anchor; an alias (figure→fig, quote→blockquote) → the canonical's anchor; anything else
  // (a removed/retired or non-element doc) → null (the link is stripped to text in the prose).
  const elementNames = new Set(elements.map((e) => e.name));
  const aliasMap = {};
  for (const { spec } of elements) {
    for (const exp of (Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : [])) {
      if (exp.shorthand && exp.expands_to && !/[\s=]/.test(String(exp.expands_to))) {
        aliasMap[String(exp.shorthand).toLowerCase()] = String(exp.expands_to).toLowerCase();
      }
    }
  }
  const linkTarget = (name) => {
    const lower = String(name).toLowerCase();
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

  const toc = [];
  const sections = [];
  for (const [cat, label] of order) {
    const els = byCategory.get(cat);
    if (!els || !els.length) continue;
    els.sort((a, b) => a.name.localeCompare(b.name));
    toc.push(`<li><a href="#cat-${escapeHtml(cat)}">${escapeHtml(label)}</a></li>`);
    const blocks = els.map((el) => renderL1Element(el, render, assetSet, errors, linkTarget)).join('\n');
    sections.push(`  <section class="ref-category" id="cat-${escapeHtml(cat)}">\n    <h2>${escapeHtml(label)}</h2>\n${blocks}\n  </section>`);
  }

  const intro =
    '  <h1>Layer 1 catalog</h1>\n' +
    '  <p class="ref-intro">The comprehensive reference for every canonical Layer 1 element — its structured spec, ' +
    'full documentation, and live examples — generated from the ' +
    '<a href="https://github.com/enscribejs/enscribe/tree/main/packages/layer1-vocabulary/elements">vocabulary source</a> ' +
    'so it can never drift from what it documents. The authoring shorthands that compile to these elements live in the ' +
    '<a href="shorthand-catalog.html">Shorthand catalog</a>.</p>';

  const nav =
    '    <nav class="enscribe-toc" aria-label="Categories">\n' +
    '      <details class="enscribe-toc-details" open>\n' +
    '        <summary class="enscribe-toc-summary">Categories</summary>\n' +
    `        <ul>${toc.join('')}</ul>\n` +
    '      </details>\n    </nav>';

  const body = wrap(intro, nav, sections, 'gen-reference.js');
  return { body, headExtra: [...assetSet].join('\n    '), stats: { canonical: elements.length, errors } };
}

// ── Shorthand catalog ─────────────────────────────────────────────────────────

function renderShorthandEntry({ form, expandsTo, notes, exampleSrc, exampleNote, anchor }, render, assetSet, errors) {
  const parts = [`    <section class="ref-element" id="sh-${escapeHtml(anchor)}">`];
  parts.push(`      <h3>${tag(form)}</h3>`);
  parts.push(`      <p class="ref-facts">expands to ${expandsTo}</p>`);
  if (notes) parts.push(`      <p class="ref-note">${escapeHtml(oneLine(notes))}</p>`);
  if (exampleSrc) parts.push(renderExample(exampleSrc, exampleNote, render, assetSet, errors, `shorthand ${form}`));
  parts.push('    </section>');
  return parts.join('\n');
}

/**
 * Build the Shorthand catalog page. @param {{ render: (src: string) => string }} opts
 * @returns {{ body: string, headExtra: string, stats: object }}
 */
export function buildShorthandCatalog({ render }) {
  const elements = readElements();
  const assetSet = new Set();
  const errors = [];
  const sections = [];
  const toc = [];
  let count = 0;

  // 1) Sigil forms — the tagname↔sigil cipher (sections, math, code).
  const SIGIL_EXAMPLE = {
    section: '<# Methods #>', 'sub-section': '<## Materials ##>', 'sub-sub-section': '<### Reagents ###>',
    'inline-math': 'Euler: <$ e^{i\\pi} + 1 = 0 $>.', 'display-math': '<$$ \\int_0^1 x^2 \\, dx = \\tfrac{1}{3} $$>',
    'inline-code': 'Call <` build() `> to start.', 'code-block': '<``` js\nconst x = 1;\n```>',
  };
  const sigilBlocks = [];
  for (const [sigil, target] of Object.entries(SIGIL_TO_TAGNAME)) {
    count += 1;
    sigilBlocks.push(renderShorthandEntry({
      form: `${sigil} … ${sigil}`,
      expandsTo: `the Layer 1 ${tag(target)} (see the <a href="layer1-catalog.html#l1-${escapeHtml(target)}">Layer 1 catalog</a>)`,
      notes: `The sigil shorthand for ${tag(target)}.`,
      exampleSrc: SIGIL_EXAMPLE[target], exampleNote: null, anchor: `sigil-${target}`,
    }, render, assetSet, errors));
  }
  toc.push('<li><a href="#sh-sigils">Sigil forms</a></li>');
  sections.push(`  <section class="ref-category" id="sh-sigils">\n    <h2>Sigil forms</h2>\n    <p class="ref-cat-note">The tagname↔sigil cipher — the fewest-keystrokes form for sections, math, and code.</p>\n${sigilBlocks.join('\n')}\n  </section>`);

  // 2) Tag aliases + 3) expansion shorthands — every element's shorthand_expansions.
  // Bare-key expansions are tag aliases (figure→fig); valued expansions carry attributes
  // (chapter → book-part type="chapter"). Grouped by their target element.
  const aliasBlocks = [];
  const expansionBlocks = [];
  for (const { name, spec } of elements) {
    const exps = Array.isArray(spec.shorthand_expansions) ? spec.shorthand_expansions : [];
    const examplesByShorthand = new Map();
    for (const ex of (Array.isArray(spec.shorthand_examples) ? spec.shorthand_examples : [])) {
      const m = String(ex.source ?? '').match(/^<\s*([a-z0-9-]+)/i);
      if (m) examplesByShorthand.set(m[1], ex);
    }
    for (const exp of exps) {
      if (!exp.shorthand) continue;
      count += 1;
      const valued = String(exp.expands_to).includes(' ') || String(exp.expands_to).includes('=');
      const ex = examplesByShorthand.get(exp.shorthand);
      const entry = renderShorthandEntry({
        form: exp.shorthand,
        expandsTo: `<code>&lt;${escapeHtml(exp.expands_to)}&gt;</code> (the Layer 1 ${tag(name)}, see the <a href="layer1-catalog.html#l1-${escapeHtml(name)}">Layer 1 catalog</a>)`,
        notes: exp.notes,
        exampleSrc: ex?.source ?? null, exampleNote: ex?.notes ?? null,
        anchor: `exp-${exp.shorthand}`,
      }, render, assetSet, errors);
      (valued ? expansionBlocks : aliasBlocks).push(entry);
    }
  }
  if (aliasBlocks.length) {
    toc.push('<li><a href="#sh-aliases">Tag aliases</a></li>');
    sections.push(`  <section class="ref-category" id="sh-aliases">\n    <h2>Tag aliases</h2>\n    <p class="ref-cat-note">Alternate authoring names that normalize to a canonical element.</p>\n${aliasBlocks.join('\n')}\n  </section>`);
  }
  if (expansionBlocks.length) {
    toc.push('<li><a href="#sh-expansions">Expansion shorthands</a></li>');
    sections.push(`  <section class="ref-category" id="sh-expansions">\n    <h2>Expansion shorthands</h2>\n    <p class="ref-cat-note">Shorthand tags that expand to a Layer 1 element with attributes set (e.g. the book-part family). Examples render within a book.</p>\n${expansionBlocks.join('\n')}\n  </section>`);
  }

  const intro =
    '  <h1>Shorthand catalog</h1>\n' +
    '  <p class="ref-intro">Every authoring shorthand — the sigil cipher and each element’s alias / expansion forms — ' +
    'with what it compiles to in Layer 1, generated from the vocabulary source so the shorthand→Layer 1 mapping is ' +
    'inherent and can’t drift. The canonical elements these compile to are documented in the ' +
    '<a href="layer1-catalog.html">Layer 1 catalog</a>.</p>';
  const nav =
    '    <nav class="enscribe-toc" aria-label="Shorthand groups">\n' +
    '      <details class="enscribe-toc-details" open>\n' +
    '        <summary class="enscribe-toc-summary">Groups</summary>\n' +
    `        <ul>${toc.join('')}</ul>\n` +
    '      </details>\n    </nav>';

  const body = wrap(intro, nav, sections, 'gen-reference.js');
  return { body, headExtra: [...assetSet].join('\n    '), stats: { shorthands: count, errors } };
}

// Shared page wrapper — the same `.enscribe-layout--toc` chrome the gallery uses.
function wrap(intro, nav, sections, generator) {
  return (
    '<main class="article ref-catalog">\n' +
    '  <div class="enscribe-layout enscribe-layout--toc">\n' +
    `${nav}\n` +
    '    <div class="enscribe-body">\n' +
    `${intro}\n` +
    `${sections.join('\n')}\n` +
    '    </div>\n  </div>\n    </main>\n' +
    '    <footer class="site-footer">\n' +
    `      Generated from the <a href="https://github.com/enscribejs/enscribe/tree/main/packages/layer1-vocabulary/elements">Layer 1 vocabulary entries</a> by <code>docs-site/${generator}</code>.\n` +
    '    </footer>'
  );
}

// ── The <config> option grid (#223 slice 2) ───────────────────────────────────
// Generated from CONFIG_OPTIONS_DOC (the human doc layer, kept in lockstep with
// CONFIG_KWARGS by config-options-doc.test.js). One table per family, per-option `id`
// anchors (for the future #138 search). Returned as an HTML string the Rendering-guide
// page embeds at its marker (see build.js).
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
