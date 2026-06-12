// Static separate-pages book build — parity + cross-page refs (publishing, P1 — #205).
//
// Chains off the L1 chapter-granularity proof (render-chapter-parity.test.js): each
// separate-pages page's CHAPTER CONTENT is L1's renderChapter, so the ONLY content
// difference from the single-page render is the in-page → cross-PAGE href rewrite.
// Asserted by reverting the rewrite and matching renderChapter exactly. Also pins:
// each page is a standalone HTML document with the chrome; a cross-chapter ref links
// to the owning chapter's PAGE + anchor; a same-page ref stays an in-page anchor.

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VFile } from 'vfile';
import {
  buildEnscribePipeline,
  assembleMasterDocument,
  harvestCrossRefRegistry,
  renderChapter,
  extractBookPart,
  publishBookPages,
} from '../src/interpreter/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const BOOK_DIR = join(FIXTURES_DIR, 'master-book');
// default.css inlined into each page shell — the SAME source render-fixtures.js uses
// to write the committed page goldens, so this suite can byte-compare against them.
const DEFAULT_CSS = readFileSync(join(__dirname, '..', 'src', 'interpreter', 'assets', 'default.css'), 'utf8');

// Revert a cross-page ref href (`owner-slug.html#anchor`) back to its in-page form
// (`#anchor`); the chapter content's only `.html#` hrefs are the cross-page rewrites,
// so this isolates renderChapter's pre-rewrite output.
const revertCrossPage = (s) => s.replace(/href="[a-z0-9-]+\.html#/g, 'href="#');

function collectBookParts(node, out = []) {
  if (node?.type === 'enscribeTag' && node.tagname === 'book-part') out.push(node);
  for (const c of node?.children ?? []) collectBookParts(c, out);
  for (const c of (Array.isArray(node?.content) ? node.content : [])) collectBookParts(c, out);
  return out;
}

export async function run() {
  // Same options render-fixtures.js generates the page goldens with, so the pages
  // built here are byte-identical to the committed goldens (guarded below).
  const proc = buildEnscribePipeline({ assetsDir: join(FIXTURES_DIR, 'assets') });
  const file = new VFile({ path: 'master-book.emd' });
  const tree = assembleMasterDocument({
    source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
  });
  const numbered = proc.runSync(tree, file);

  // The SUT — also mutates the mdast (book-part + sub-section ids), so renderChapter
  // below sees the same id-assigned tree the publisher rendered from.
  const pages = publishBookPages({ numbered, file, proc, defaultCss: DEFAULT_CSS });
  const registry = harvestCrossRefRegistry(numbered, file);
  const parts = collectBookParts(numbered);

  // ── the emitted pages are byte-identical to the committed goldens ────────────
  {
    for (const [name, html] of pages) {
      const golden = readFileSync(join(BOOK_DIR, 'pages', name), 'utf8');
      assert.strictEqual(html, golden, `${name} is byte-identical to its committed golden (master-book/pages/${name})`);
    }
    console.log(`PASS: P1 — all ${pages.size} emitted pages are byte-identical to the committed master-book/pages/ goldens`);
  }

  // ── one standalone page per chapter + an index ──────────────────────────────
  {
    const names = [...pages.keys()];
    assert.ok(pages.size === parts.length + 1, `one page per chapter (${parts.length}) plus index.html`);
    assert.ok(names.includes('index.html'), 'an index.html landing is emitted');
    assert.deepStrictEqual(
      names.filter((n) => n !== 'index.html').sort(),
      ['1-counting-elephants.html', '2-estimating-browse-pressure.html', 'a-field-data-sheets.html', 'about-this-book.html'],
      'deterministic per-chapter slugs (number/letter + title; front-matter unprefixed)',
    );
    for (const [name, html] of pages) {
      assert.ok(html.startsWith('<!DOCTYPE html>') && /<html[\s>]/.test(html) && html.includes('</html>') &&
        /<head>/.test(html) && /<body>/.test(html), `${name} is a standalone HTML document`);
      assert.ok(/<nav class="enscribe-toc enscribe-chapter-rail"/.test(html), `${name} carries the chapter-rail chrome`);
    }
    console.log(`PASS: P1 — ${parts.length} standalone chapter pages + index.html, deterministic slugs`);
  }

  // ── PARITY: page chapter content == L1 renderChapter (only diff is the href rewrite) ─
  {
    // The page body, past the inlined default.css (which itself mentions `<book-part>`
    // in a comment) — so extractBookPart matches the real chapter, not the stylesheet.
    const bodyOf = (html) => { const i = html.indexOf('</style>'); return i === -1 ? html : html.slice(i + '</style>'.length); };
    const slugFor = (part) => {
      for (const [name, html] of pages) {
        if (name !== 'index.html' && bodyOf(html).includes(`id="${part.id}"`)) return name;
      }
      return null;
    };
    for (const part of parts) {
      const slug = slugFor(part);
      assert.ok(slug, `found the page for book-part ${part.id}`);
      const pageContent = extractBookPart(bodyOf(pages.get(slug)));
      const rc = renderChapter(part, registry, { proc, file });
      assert.strictEqual(revertCrossPage(pageContent), rc,
        `${slug}: chapter content equals L1 renderChapter once the cross-page href rewrite is reverted`);
    }
    console.log('PASS: P1 — each page content is L1 renderChapter + the cross-page href rewrite (nothing else)');
  }

  // ── cross-page references ───────────────────────────────────────────────────
  {
    const ch1 = pages.get('1-counting-elephants.html');   // owns fig:transect
    const ch2 = pages.get('2-estimating-browse-pressure.html'); // references it (cross-chapter)
    assert.ok(ch1.includes('id="fig:transect"'), 'fig:transect lives on chapter 1\'s page');
    assert.ok(ch1.includes('<a href="#fig:transect" class="ref">'),
      'a same-page ref to fig:transect stays an in-page anchor on chapter 1\'s page');
    assert.ok(ch2.includes('<a href="1-counting-elephants.html#fig:transect" class="ref">figure 1.1</a>'),
      'a cross-chapter ref in chapter 2 links to chapter 1\'s PAGE + anchor, with the registry number');
    assert.ok(ch2.includes('<a href="#fig:browse" class="ref">'),
      'a same-page ref in chapter 2 (to its own fig:browse) stays an in-page anchor');
    console.log('PASS: P1 — cross-chapter refs link cross-page (owner-url#anchor); same-page refs stay #anchor');
  }

  // ── the VFile the CLI threads (for the registry harvest) is output-inert ─────
  // doBuild now runs the single-page path with a VFile (runSync(tree,file) +
  // stringify(numbered,file)); single-page output must be byte-identical to the old
  // no-VFile form. The VFile is a pure data carrier, not a render input.
  {
    const freshTree = () => assembleMasterDocument({
      source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
      readFile: (p) => readFileSync(p, 'utf8'),
      resolve: (rel) => join(BOOK_DIR, rel),
      parse: (s) => proc.parse(s),
    });
    const a = buildEnscribePipeline({ assetsDir: join(FIXTURES_DIR, 'assets') });
    const f = new VFile({ path: 'master-book.emd' });
    const withVFile = String(a.stringify(a.runSync(freshTree(), f), f));
    const b = buildEnscribePipeline({ assetsDir: join(FIXTURES_DIR, 'assets') });
    const noVFile = String(b.stringify(b.runSync(freshTree())));
    assert.strictEqual(withVFile, noVFile,
      'threading a VFile through runSync+stringify (the separate-pages path) leaves single-page output byte-identical');
    console.log('PASS: P1 — the VFile the CLI threads for the registry harvest is output-inert (single-page byte-stable)');
  }

  console.log('All static separate-pages (P1) checks passed.');
}
