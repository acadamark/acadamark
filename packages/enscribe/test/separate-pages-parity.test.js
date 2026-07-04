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
  publishBookPageBodies,
} from '../src/interpreter/index.js';
import { HEAD_ASSET_LINKS, KATEX_CDN_URL, DOCUMENT_FONTS_CDN_URL } from '../src/interpreter/assets/font-loader.js';
import { escapeHtml } from '../src/core/escape-html.js';

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
      ['about-this-book.html', 'counting-elephants.html', 'estimating-browse-pressure.html', 'field-data-sheets.html'],
      'deterministic per-chapter slugs — title only, NUMBER-FREE (#246/core), so a chapter URL is stable whether or not numbering is on',
    );
    for (const [name, html] of pages) {
      assert.ok(html.startsWith('<!DOCTYPE html>') && /<html[\s>]/.test(html) && html.includes('</html>') &&
        /<head>/.test(html) && /<body>/.test(html), `${name} is a standalone HTML document`);
      assert.ok(/<nav class="enscribe-toc enscribe-chapter-rail"/.test(html), `${name} carries the chapter-rail chrome`);
    }
    console.log(`PASS: P1 — ${parts.length} standalone chapter pages + index.html, deterministic slugs`);
  }

  // ── #297: every separate-pages head LINKS the shared display assets (KaTeX + fonts) ─────────
  // The master-book fixture has math (KaTeX) and code blocks; before #297 the page shell linked
  // NEITHER, so book math rendered as bare KaTeX HTML and code lost its Source Code Pro font. The
  // page shell now links the SAME HEAD_ASSET_LINKS set as the website + single-article shells.
  {
    const head = (html) => html.slice(0, html.indexOf('</head>'));
    for (const [name, html] of pages) {
      const h = head(html);
      assert.ok(h.includes(`href="${KATEX_CDN_URL}"`), `${name} <head> links the KaTeX CSS (#297)`);
      // the fonts URL carries '&' → '&amp;' once escaped in the head; compare the escaped form.
      assert.ok(h.includes(`href="${escapeHtml(DOCUMENT_FONTS_CDN_URL)}"`),
        `${name} <head> links the document fonts — Inter body + Source Code Pro code, which styles code (#297)`);
      // the WHOLE shared set, verbatim and once — the page shell links exactly what the other shells do.
      assert.strictEqual(h.split(HEAD_ASSET_LINKS).length - 1, 1, `${name} carries HEAD_ASSET_LINKS verbatim, exactly once`);
    }
    console.log(`PASS: #297 — all ${pages.size} separate-pages heads link the shared KaTeX + fonts assets (HEAD_ASSET_LINKS)`);
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
    const ch1 = pages.get('counting-elephants.html');   // owns fig:transect
    const ch2 = pages.get('estimating-browse-pressure.html'); // references it (cross-chapter)
    assert.ok(ch1.includes('id="fig:transect"'), 'fig:transect lives on chapter 1\'s page');
    assert.ok(ch1.includes('<a href="#fig:transect" class="ref">'),
      'a same-page ref to fig:transect stays an in-page anchor on chapter 1\'s page');
    assert.ok(ch2.includes('<a href="counting-elephants.html#fig:transect" class="ref">figure 1.1</a>'),
      'a cross-chapter ref in chapter 2 links to chapter 1\'s PAGE + anchor, with the registry number');
    assert.ok(ch2.includes('<a href="#fig:browse" class="ref">'),
      'a same-page ref in chapter 2 (to its own fig:browse) stays an in-page anchor');
    console.log('PASS: P1 — cross-chapter refs link cross-page (owner-url#anchor); same-page refs stay #anchor');
  }

  // ── return-to-cover masthead (#206): every page round-trips to the cover ─────
  // The chrome carries a book-title masthead linking to index.html on every page, so
  // a reader can always get back to the cover. About this Book stays an ordinary
  // front-matter rail item — it is NOT the home — and the cover links into the book.
  {
    for (const [name, html] of pages) {
      assert.ok(html.includes('<a class="enscribe-book-home" href="index.html"'),
        `${name} carries the return-to-cover masthead linking to index.html`);
    }
    const index = pages.get('index.html');
    assert.ok(index.includes('<book-home-title>Field Methods in Savanna Ecology</book-home-title>'),
      'the masthead is the book title (the home affordance, not a bare "Home")');
    // the cover's masthead is a self-link → marked current; a chapter's is a plain link out
    assert.ok(index.includes('<a class="enscribe-book-home" href="index.html" aria-current="page">'),
      'on the cover the masthead self-link is aria-current="page" (you are here)');
    const ch1 = pages.get('counting-elephants.html');
    assert.ok(ch1.includes('<a class="enscribe-book-home" href="index.html">'),
      'on a chapter page the masthead is a plain link to the cover (no aria-current)');
    assert.ok(/<li class="enscribe-rail-item enscribe-rail-item--front"><a href="about-this-book\.html">/.test(ch1),
      'about-this-book.html stays a normal front-matter rail item — reachable via the sidebar, not masquerading as home');
    assert.ok(index.includes('<a href="counting-elephants.html"'),
      'the cover (index.html) links into the book — a genuine round-trip destination, not a dead-end entry point');
    console.log('PASS: P1/#206 — every page round-trips to the cover (masthead → index.html); About this Book stays a rail item');
  }

  // ── publishBookPageBodies (#295): the fragment-returning sibling ─────────────
  // The static-website shell (#295) hosts a book's BODY FRAGMENTS inside its own universal
  // shell rather than stapling chrome onto the finished standalone pages. publishBookPageBodies
  // returns those fragments. Proof it is the genuine body half: the full standalone page from
  // publishBookPages must CONTAIN each fragment verbatim (the full page IS pageShell(fragment, …)),
  // and the fragment is itself a fragment (no <!DOCTYPE>/<html> shell). Built from a FRESH tree
  // (assignIds mutates the mdast, and `numbered`/`pages` above already consumed the first) — the
  // pipeline is deterministic, so the fresh fragment's ids match the committed full pages'.
  {
    const file2 = new VFile({ path: 'master-book.emd' });
    const numbered2 = proc.runSync(assembleMasterDocument({
      source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
      readFile: (p) => readFileSync(p, 'utf8'),
      resolve: (rel) => join(BOOK_DIR, rel),
      parse: (s) => proc.parse(s),
    }), file2);
    const bodies = publishBookPageBodies({ numbered: numbered2, file: file2, proc });

    assert.deepStrictEqual([...bodies.keys()].sort(), [...pages.keys()].sort(),
      'publishBookPageBodies emits the same filenames as publishBookPages');
    for (const [name, entry] of bodies) {
      // a cover-ON book → every entry is a { body, title } fragment (never a { page } redirect)
      assert.ok(entry.body != null && entry.page == null,
        `${name}: a cover-on book yields a body fragment, not a full page`);
      assert.ok(typeof entry.title === 'string' && entry.title.length > 0, `${name}: the fragment carries a <title>`);
      assert.ok(!/<!DOCTYPE html>/i.test(entry.body) && !/<html[\s>]/.test(entry.body),
        `${name}: the body is a FRAGMENT (no <!DOCTYPE>/<html> shell)`);
      assert.ok(pages.get(name).includes(entry.body),
        `${name}: the standalone full page contains the body fragment verbatim (full page = pageShell(fragment))`);
    }
    console.log(`PASS: #295 — publishBookPageBodies returns the body half of each page (${bodies.size} fragments; same set; full page ⊇ fragment)`);
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
