// Master-document multi-file build (#190).
//
// Proves the end-to-end path: parse a master document, load + parse its `src`
// structure children, assemble them into ONE tree in document order, and render
// via the existing pipeline. The pipeline structures the assembled tree per the
// master's `<meta type>` — an `<article>` (the `<section src>` masters below) or a
// `<book>` with front/body/back regions (the `<chapter src>` / `<preface src>` /
// `<appendix src>` book master, Slice B). Cross-file numbering and cross-references
// resolve over the one assembled tree; per-chapter numbering falls out for books.
// Deferred: cross-file citation/bibliography registry merge, marker placement
// (toc/endnotes), the website type.
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildEnscribePipeline, assembleMasterDocument } from '@enscribejs/enscribe';

const __dirname = dirname(fileURLToPath(import.meta.url));
// The multi-file fixtures live in the canonical enscribe rendered-fixture home
// (packages/enscribe/test/fixtures), shared with render-fixtures.js and the
// browser master-document test; reach across the monorepo to them.
const ENSCRIBE_FIXTURES = join(__dirname, '..', '..', 'enscribe', 'test', 'fixtures');
const MASTER_DIR = join(ENSCRIBE_FIXTURES, 'master');
const XREF_DIR = join(ENSCRIBE_FIXTURES, 'master-xref');
const BOOK_DIR = join(ENSCRIBE_FIXTURES, 'master-book');

function renderMaster() {
  const proc = buildEnscribePipeline({});
  const tree = assembleMasterDocument({
    source: readFileSync(join(MASTER_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(MASTER_DIR, rel),
    parse: (s) => proc.parse(s),
  });
  return proc.stringify(proc.runSync(tree));
}

// Slice 2 (#190): the cross-file fixture — three `<section src>` children
// carrying figures, sections, and cross-references that point ACROSS file
// boundaries. Captures the assembler diagnostics so the test can assert the
// well-formed master assembles cleanly.
function renderXref() {
  const proc = buildEnscribePipeline({});
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(XREF_DIR, 'master-xref.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(XREF_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

// Slice B (#190): the multi-file BOOK master — a `<meta type=book>` master whose
// children are book-part `src` entries (`<preface src>`, two `<chapter src>`, an
// `<appendix src>`). The assembler resolves them exactly as it does `<section src>`;
// the pipeline then structures the assembled tree as a `<book>` with front/body/back.
// Proves: book detection survives assembly, parts route by type, and per-chapter
// numbering + cross-chapter refs resolve over the one assembled tree.
function renderBookMaster() {
  const proc = buildEnscribePipeline({});
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(BOOK_DIR, 'master-book.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

// Slice 3 (#190): the cross-file CITATION registry merge. assetsDir must be set so a
// `<library src>` resolves (the helpers above pass `{}` because their fixtures have no
// library src; a copy-paste that forgets assetsDir here silently yields cite-error).
const BIB_DIR = join(ENSCRIBE_FIXTURES, 'master-bib');
const BIB_CHILD_DIR = join(__dirname, 'fixtures', 'master-bib-child');

// (a) the EXISTING master-bib fixture — a child cites the MASTER's <library src>. Its
// golden showed resolved cross-file cites but no test asserted on it (a coverage gap).
// references.bib lives in fixtures/assets/, so assetsDir points there.
function renderBibMaster() {
  const proc = buildEnscribePipeline({ assetsDir: join(ENSCRIBE_FIXTURES, 'assets') });
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(BIB_DIR, 'master-bib.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BIB_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

// (b) the NEW behavior — a CHILD's OWN <library> merges project-wide: intro.emd has an
// inline library; sub/methods.emd has a `<library src>` in a SUBDIRECTORY. assetsDir is the
// master's own dir (the real CLI's contract, cli.js), so the child src — rewritten
// master-relative by the assembler — resolves from its subdir.
function renderBibChild() {
  const proc = buildEnscribePipeline({ assetsDir: BIB_CHILD_DIR });
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(BIB_CHILD_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BIB_CHILD_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

// Per-chapter split_bib (#190): a multi-file BOOK where each chapter ends with a
// <bibliography> (its own cited refs) and a book-level <bibliography> lists everything.
const BIB_BOOK_DIR = join(__dirname, 'fixtures', 'master-bib-book');
function renderBibBook() {
  const proc = buildEnscribePipeline({ assetsDir: BIB_BOOK_DIR });
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(BIB_BOOK_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(BIB_BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

// Cross-file embedded-asset merge (#190 slice 2): a BOOK where an embedded PNG asset is
// declared in chapter 1's <data> and referenced cross-chapter from chapter 2, plus a
// duplicate id declared in both chapters (last-wins + a visible collision flag).
const ASSET_BOOK_DIR = join(__dirname, 'fixtures', 'master-asset-book');
function renderAssetBook() {
  const proc = buildEnscribePipeline({ assetsDir: ASSET_BOOK_DIR });
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(ASSET_BOOK_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(ASSET_BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

// Cross-file EXTERNAL asset (#190 slice 3): a BOOK where an external <fig #id src=…> is declared
// in a subdirectory chapter (so its src is rebased master-relative on assembly) and referenced
// from another chapter — resolving to a plain <img src="<master-relative path>">.
const ASSET_EXT_DIR = join(__dirname, 'fixtures', 'master-asset-ext');
function renderAssetExtBook() {
  const proc = buildEnscribePipeline({ assetsDir: ASSET_EXT_DIR });
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(ASSET_EXT_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(ASSET_EXT_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

// The <endnotes> placement marker (#190): a multi-file BOOK where each chapter ends with an
// <endnotes /> marker placing that chapter's collected notes there.
const ENDNOTES_BOOK_DIR = join(__dirname, 'fixtures', 'master-endnotes-book');
function renderEndnotesBook() {
  const proc = buildEnscribePipeline({});
  const warnings = [];
  const tree = assembleMasterDocument({
    source: readFileSync(join(ENDNOTES_BOOK_DIR, 'master.emd'), 'utf8'),
    readFile: (p) => readFileSync(p, 'utf8'),
    resolve: (rel) => join(ENDNOTES_BOOK_DIR, rel),
    parse: (s) => proc.parse(s),
    warn: (m) => warnings.push(m),
  });
  return { html: proc.stringify(proc.runSync(tree)), warnings };
}

export function run_tests() {
  const html = renderMaster();

  // ── assembles into ONE article ──────────────────────────────────────────────
  {
    assert.equal((html.match(/<article>/g) || []).length, 1, 'master assembles into a single <article>');
    assert.match(html, /<article-title>\s*<h1>Multi-File Demo<\/h1>/, 'master <meta> title becomes the article title');
    console.log('PASS: #190 — master document assembles into one article');
  }

  // ── the three sections render in document order ─────────────────────────────
  {
    const intro = html.indexOf('>Introduction<');
    const methods = html.indexOf('>Methods Override<');
    const discussion = html.indexOf('>Discussion<');
    assert.ok(intro > 0 && methods > 0 && discussion > 0, 'all three section titles render');
    assert.ok(intro < methods && methods < discussion, 'sections render in master document order (intro -> methods -> discussion)');
    console.log('PASS: #190 — children assemble in document order');
  }

  // ── child files are loaded and their bodies inlined ─────────────────────────
  {
    assert.ok(html.includes('introduction body, authored in its own child file'), 'intro.emd body loaded');
    assert.ok(html.includes('methods here, in a second child file'), 'methods.emd body loaded');
    // a child's own internal structure (## heading) nests under its section
    assert.ok(/<sub-section>[\s\S]*Background[\s\S]*<\/sub-section>/.test(html), 'child internal heading nests as a sub-section');
    console.log('PASS: #190 — child file bodies are loaded and their structure nests');
  }

  // ── title precedence: pipe override > child title > "Title Missing" ──────────
  {
    // intro: no pipe override -> child <meta title> "Introduction"
    assert.ok(html.includes('>Introduction<'), 'src section with no override uses the child file title');
    // methods: pipe override wins over the child's own "Methods (original title)"
    assert.ok(html.includes('>Methods Override<'), 'pipe title overrides the child file title');
    assert.ok(!html.includes('Methods (original title)'), 'overridden child title does not leak through');
    console.log('PASS: #190 — section title precedence (override > child title)');
  }

  // ── an inline `<section | Title>` + its master-authored body assemble too ────
  {
    assert.ok(html.includes('inline section authored directly in the master document'), 'inline section body assembles in place');
    console.log('PASS: #190 — inline section assembles alongside src children');
  }

  // ── slice 2: cross-file numbering + cross-references (#190) ──────────────────
  // The existing tree-based numbering and ref-resolution plugins run over the
  // ONE assembled tree (the assembler stitches all children into it before the
  // pipeline runs), so numbers run continuously across files and refs resolve to
  // targets wherever they live. This fixture proves that across three children.
  {
    const { html: xref, warnings } = renderXref();

    // Continuous FIGURE numbering: the figure in the Nth child takes the Nth
    // document number — it does not restart per file. (alpha→1, beta→2, gamma→3.)
    // #326: <fig> is flow — the single-paragraph caption keeps its <p> (a block,
    // so the formatter may break the line between the label span and the caption).
    assert.ok(/<figure-label>Figure 1\.<\/figure-label>\s*<p>The alpha figure\.<\/p>/.test(xref),
      'cross-file: the first child file\'s figure is Figure 1');
    assert.ok(/<figure-label>Figure 2\.<\/figure-label>\s*<p>The beta figure\.<\/p>/.test(xref),
      'cross-file: the second child file\'s figure continues as Figure 2 (no per-file restart)');
    assert.ok(/<figure-label>Figure 3\.<\/figure-label>\s*<p>The gamma figure\.<\/p>/.test(xref),
      'cross-file: the third child file\'s figure continues as Figure 3');
    console.log('PASS: #190 slice 2 — figures number continuously across child files');

    // Continuous SECTION numbering (number-sections=true in the master <config>):
    // the section titles carry 1 / 2 / 3 in master document order, one per child.
    assert.match(xref, /<section-title>\s*<h2><section-number>1<\/section-number>Alpha<\/h2>/,
      'cross-file: first section numbered 1');
    assert.match(xref, /<section-title>\s*<h2><section-number>2<\/section-number>Beta<\/h2>/,
      'cross-file: second section numbered 2');
    assert.match(xref, /<section-title>\s*<h2><section-number>3<\/section-number>Gamma<\/h2>/,
      'cross-file: third section numbered 3');
    console.log('PASS: #190 slice 2 — sections number continuously across child files (master <config>)');

    // Cross-file cross-REFERENCES resolve to the target's number wherever the
    // target lives: backward, forward (target in a LATER file), and to a section.
    assert.ok(xref.includes('<a href="#fig:alpha" class="ref">figure 1</a>'),
      'cross-file: a <ref> in beta.emd resolves BACKWARD to the figure in alpha.emd');
    assert.ok(xref.includes('<a href="#fig:gamma" class="ref">figure 3</a>'),
      'cross-file: a <ref> in alpha.emd resolves FORWARD to the figure in gamma.emd');
    assert.ok(xref.includes('<a href="#fig:beta" class="ref">figure 2</a>'),
      'cross-file: a <ref> in gamma.emd resolves backward to the figure in beta.emd');
    assert.ok(xref.includes('<a href="#sec:alpha" class="ref">section 1</a>'),
      'cross-file: a <ref> resolves to a SECTION that lives in another file');
    console.log('PASS: #190 slice 2 — cross-references resolve across file boundaries (backward, forward, section)');

    // Unresolved cross-ref still renders (always-renders) as a visible marker.
    assert.ok(xref.includes('class="ref-error"') && xref.includes('??ref: fig:missing??'),
      'cross-file: an unresolved <ref> renders a visible error marker, not a crash');
    // The well-formed master assembles with no assembler diagnostics.
    assert.equal(warnings.length, 0,
      `cross-file: no assembler warnings for the well-formed master (got: ${warnings.join('; ')})`);
    console.log('PASS: #190 slice 2 — unresolved cross-ref renders visibly; clean assembly');
  }

  // ── Slice B: a multi-file BOOK master assembles into one <book> ─────────────
  // The assembled tree carries `<meta type=book>` into the pipeline, so the SAME
  // book-structuring that handles a single-file book takes over — no parallel
  // book-assembly path. (Phase-0 verified the assembled tree is byte-identical to
  // the single-file book's; these assertions pin the observable book behavior.)
  {
    const { html: book, warnings } = renderBookMaster();

    // ── one <book> with all three region wrappers ───────────────────────────
    assert.equal((book.match(/<book>/g) || []).length, 1, 'book master assembles into a single <book>');
    assert.ok(book.includes('<book-front>') && book.includes('<book-body>') && book.includes('<book-back>'),
      'book has front / body / back region wrappers');
    assert.match(book, /<book-title>\s*<h1>Field Methods in Savanna Ecology<\/h1>/,
      'master <meta> title becomes the <book-title>');
    console.log('PASS: Slice B — book master assembles into one <book> with front/body/back');

    // ── parts route to the right region by book-part-type ───────────────────
    const front = book.slice(book.indexOf('<book-front>'), book.indexOf('</book-front>'));
    const body  = book.slice(book.indexOf('<book-body>'),  book.indexOf('</book-body>'));
    const back  = book.slice(book.indexOf('<book-back>'),  book.indexOf('</book-back>'));
    assert.ok(front.includes('book-part-type="preface"') && front.includes('About this Book'),
      'the <preface src> child routes into book-front');
    assert.ok((body.match(/book-part-type="chapter"/g) || []).length === 2,
      'both <chapter src> children route into book-body');
    assert.ok(back.includes('book-part-type="appendix"') && back.includes('Field Data Sheets'),
      'the <appendix src> child routes into book-back');
    console.log('PASS: Slice B — preface→front, chapters→body, appendix→back');

    // ── child bodies loaded; the master's pipe title overrides the child's own ──
    assert.ok(book.includes('introduces the multi-file book'), 'preface child body loaded');
    assert.ok(book.includes('Aerial transects remain the standard method'), 'chapter-1 child body loaded');
    assert.ok(!book.includes('child fallback'),
      "the master's pipe title overrides each child file's own <meta title> (no fallback leak)");
    // A book-part's own loose <author> (chapter-2) survives assembly as per-chapter authorship.
    assert.ok(book.includes('Guest Contributor'), 'a chapter child\'s loose <author> assembles as per-chapter authorship');
    console.log('PASS: Slice B — child bodies load; pipe title overrides child title; per-chapter author');

    // ── per-chapter numbering + cross-chapter ref over the one assembled tree ──
    // Chapter 2's first figure is 2.1 (renumbered from one per chapter), NOT 2.
    assert.ok(/Figure 1\.1\./.test(book) && /Figure 2\.1\./.test(book),
      'figures number per-chapter: chapter 1 → 1.1, chapter 2 → 2.1');
    assert.ok(book.includes('<a href="#fig:browse" class="ref">figure 2.1</a>'),
      'a same-chapter <ref> in chapter 2 resolves to figure 2.1');
    assert.ok(book.includes('<a href="#fig:transect" class="ref">figure 1.1</a>'),
      'a cross-CHAPTER <ref> in chapter 2 resolves to chapter 1\'s figure 1.1');
    assert.equal(warnings.length, 0,
      `book master assembles with no assembler warnings (got: ${warnings.join('; ')})`);
    console.log('PASS: Slice B — per-chapter numbering + cross-chapter <ref> resolve; clean assembly');
  }

  // ── Slice 3 (#190): cross-file CITATION registry merge ──────────────────────
  // Every <library> across the master + every src child merges into ONE project-wide
  // citation registry (master-document.md §Citations), so a <cite @key> in any file
  // resolves against a reference declared anywhere in the project.
  //
  // (a) the MASTER-library case (already worked; the assertion was missing): a child
  //     file resolves a cite against the master's <library src>, and the master's own
  //     section cite resolves — proving the index spans the assembled tree.
  {
    const { html: bib } = renderBibMaster();
    assert.ok(bib.includes('<cite class="cite" data-keys="Pellicano2014">(Pellicano et al., 2014)</cite>'),
      'a CHILD-file cite resolves against the MASTER library (cross-file), styled author-year');
    assert.ok(bib.includes('<cite class="cite" data-keys="Loomes2017">(Loomes et al., 2017)</cite>'),
      "the master section's own cite resolves against the master library");
    assert.ok(!bib.includes('class="cite-error" data-keys="Pellicano2014"') && !bib.includes('??cite: Pellicano2014??'),
      'the cross-file child cite is NOT an unresolved-key diagnostic');
    console.log('PASS: #190 slice 3 — a child cite resolves against the master library (master-bib coverage)');
  }

  // (b) the CHILD-library case (the new behavior): a child's OWN <library> — inline AND
  //     a `<library src>` in a subdirectory — merges project-wide, so a sibling resolves
  //     against it; the subdir src is rewritten master-relative so it loads; a missing key
  //     still renders the diagnostic (always-renders).
  {
    const { html: bib, warnings } = renderBibChild();
    const child2021 = (bib.match(/<cite class="cite" data-keys="child2021">\(Childer, 2021\)<\/cite>/g) || []).length;
    assert.equal(child2021, 2,
      "a child's INLINE library resolves project-wide — cited in its own file AND the sibling (2 styled cites)");
    assert.ok(bib.includes('<cite class="cite" data-keys="methods2022">(Subby, 2022)</cite>'),
      "a child's <library src> in a SUBDIRECTORY loads (src rebased master-relative) and resolves");
    assert.ok(bib.includes('<cite class="cite-error" data-keys="absent">??cite: absent??</cite>'),
      'a genuinely-missing key still renders the unresolved diagnostic');
    assert.equal(warnings.length, 0,
      `the child-library master assembles with no warnings (got: ${warnings.join('; ')})`);
    console.log('PASS: #190 slice 3 — a child\'s own library (inline + subdir src) merges project-wide');
  }

  // ── #408: the universal child-relative src rebase (body-level assets) ────────
  // Every relative `src` kwarg authored in a child resolves against the CHILD's own
  // directory (master-document.md §Path resolution) — body-level and nested tags
  // included, not just the hoisted <data> block. Master-authored content between
  // entries stays master-relative (no boundary bleed).
  {
    const d = mkdtempSync(join(tmpdir(), 'enscribe-408-'));
    mkdirSync(join(d, 'chapters'));
    writeFileSync(join(d, 'master.emd'),
      '<meta type=book>\n  <title | B>\n</meta>\n\n<chapter src="chapters/one.emd" | One>\n\n<section | Master section>\n\n<figure #fig:root src=root.png | Master-level figure>\n');
    writeFileSync(join(d, 'chapters', 'one.emd'),
      'Body text.\n\n<figure #fig:one src=img.png | Top-level child figure>\n\n<section | S>\n\nNested <figure #fig:two src=deep.png | Nested child figure>.\n\n<table #tab:one csv src=data/rows.csv caption="T" | >\n');
    const proc2 = buildEnscribePipeline({ assetsDir: d });
    const tree = assembleMasterDocument({
      source: readFileSync(join(d, 'master.emd'), 'utf8'),
      readFile: (pth) => readFileSync(pth, 'utf8'),
      resolve: (rel) => join(d, rel),
      parse: (s) => proc2.parse(s),
      warn: () => {},
    });
    const html = proc2.stringify(proc2.runSync(tree));
    assert.ok(html.includes('src="chapters/img.png"'), 'a child TOP-LEVEL figure src rebases child-relative');
    assert.ok(html.includes('src="chapters/deep.png"'), 'a child NESTED (inside a section) figure src rebases too — no tag/topology alternation');
    assert.ok(/cannot read file .chapters\/data\/rows\.csv/.test(html),
      "a child table src rebases (the visible error names the CHILD-relative path — the file is deliberately absent)");
    assert.ok(html.includes('src="root.png"'), 'master-authored content stays master-relative (no boundary bleed)');
    console.log('PASS: #408 — universal child-relative src rebase (body-level, nested, master unaffected)');
  }

  // ── #190: per-chapter bibliography (split_bib) ──────────────────────────────
  // A <bibliography> at a chapter's end lists ONLY that chapter's cited references
  // (drawn from the one merged registry, so a reference cited in two chapters appears in
  // each); a book-level <bibliography> lists everything. Default + JATS stay document-wide
  // (asserted by the byte-identical existing goldens). master-document.md §Citations.
  {
    const { html: book, warnings } = renderBibBook();
    const bibs = [...book.matchAll(/<bibliography>[\s\S]*?<\/bibliography>/g)].map((m) => m[0]);
    const keysOf = (b) => [...b.matchAll(/id="ref-([A-Za-z0-9]+)"/g)].map((m) => m[1]);

    // TWO chapter bibs + ONE book-level bib. (Without split_bib these collapse into a
    // single document-wide bib — count === 1 — so 3 is the proof the slicing happened.)
    assert.equal(bibs.length, 3, 'two per-chapter bibs + one book-level bib');

    // Each chapter's bib lists its OWN cited refs only: chapter 1 has Loomes2017 but NOT
    // chapter 2's Mantzalas2022, and vice versa.
    const ch1 = bibs.filter((b) => /ref-Loomes2017/.test(b) && !/ref-Mantzalas2022/.test(b));
    const ch2 = bibs.filter((b) => /ref-Mantzalas2022/.test(b) && !/ref-Loomes2017/.test(b));
    assert.equal(ch1.length, 1, 'chapter 1 bib = its cited refs only (Loomes2017, not Mantzalas2022)');
    assert.equal(ch2.length, 1, 'chapter 2 bib = its cited refs only (Mantzalas2022, not Loomes2017)');

    // The SHARED reference appears in BOTH chapters' bibs (and the book-level one).
    assert.ok(keysOf(ch1[0]).includes('Pellicano2014') && keysOf(ch2[0]).includes('Pellicano2014'),
      'a reference cited in two chapters appears in BOTH chapters bibs');

    // The book-level bib lists everything (the one bib carrying both chapters distinct keys).
    assert.equal(bibs.filter((b) => /ref-Loomes2017/.test(b) && /ref-Mantzalas2022/.test(b)).length, 1,
      'the book-level bibliography lists everything');

    // Cross-file citation resolution (the prior slice) still holds — the cites render styled.
    assert.ok(book.includes('<cite class="cite" data-keys="Loomes2017">(Loomes et al., 2017)</cite>'),
      'cross-file citations still resolve to styled author-year');
    assert.equal(warnings.length, 0, `the split_bib book assembles with no warnings (got: ${warnings.join('; ')})`);
    console.log('PASS: #190 — per-chapter split_bib (chapter bibs = own refs; shared ref in both; book-level = all)');
  }

  // ── #190: the <endnotes> placement marker ───────────────────────────────────
  // A <endnotes> at a chapter's end renders THAT chapter's collected notes there (the
  // notes twin of split_bib). Numbering stays project-wide. Default (no marker) is
  // unchanged — pinned by the byte-identical existing note goldens. master-document.md §Notes.
  {
    const { html: book, warnings } = renderEndnotesBook();
    const lists = [...book.matchAll(/<note-list[^>]*>[\s\S]*?<\/note-list>/g)].map((m) => m[0]);

    // TWO per-chapter note-lists, placed at each chapter's <endnotes> marker — none routed
    // to back-matter. (The marker is consumed, never rendered raw.)
    assert.equal(lists.length, 2, 'one collected note-list per chapter, at its <endnotes> marker');
    assert.ok(!/<endnotes/.test(book), 'the <endnotes> marker is consumed, not rendered raw');
    assert.ok(!/<book-back>[\s\S]*<note-list/.test(book), 'no notes routed to back-matter (each placed in its chapter)');

    // Each chapter's notes appear ONLY in that chapter's block.
    const ch1 = lists.filter((l) => /First chapter, first note/.test(l));
    const ch2 = lists.filter((l) => /Second chapter, first note/.test(l));
    assert.equal(ch1.length, 1, "chapter 1's notes render in exactly one block (its own)");
    assert.equal(ch2.length, 1, "chapter 2's notes render in exactly one block (its own)");
    assert.ok(!/Second chapter/.test(ch1[0]), "chapter 1's block does not leak chapter 2's notes");
    assert.ok(!/First chapter/.test(ch2[0]), "chapter 2's block does not leak chapter 1's notes");

    // Numbering stays project-wide across chapters (1,2 in ch1; 3,4 in ch2).
    const nums = [...new Set([...book.matchAll(/noteref-(\d+)/g)].map((m) => m[1]))].sort();
    assert.deepEqual(nums, ['1', '2', '3', '4'], 'note numbering is continuous across chapters (project-wide)');

    assert.equal(warnings.length, 0, `the <endnotes> book assembles with no warnings (got: ${warnings.join('; ')})`);
    console.log('PASS: #190 — <endnotes> places each chapter\'s collected notes at the marker (project-wide numbering)');
  }

  // ── #190 slice 2: cross-file embedded-asset merge ───────────────────────────
  // An embedded PNG asset declared in chapter 1's <data> is referenced cross-chapter
  // from chapter 2 — the asset twin of the cross-file citation-registry merge, free via
  // the assembler hoisting child <data>. A duplicate id declared across two chapters is
  // last-wins with a visible always-renders collision flag. master-document.md §<data>.
  {
    const { html: raw, warnings } = renderAssetBook();
    // Count markup only — the standalone doc embeds tooltip JS mentioning <figure>/<img>.
    const book = raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const imgs = [...book.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((m) => m[1]);
    const figureIds = [...book.matchAll(/<figure\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);
    const labels = [...book.matchAll(/Figure\s+([0-9.]+)/g)].map((m) => m[1]);

    // Cross-chapter resolution: the asset declared in ch1 places a data: URI figure in ch2 and adopts
    // its id. The book is UNnumbered (no <config number-sections>), so floats number flat (#246/core) —
    // the two placed figures are "Figure 1" / "Figure 2", not chaptered "2.1 / 2.2". Cross-chapter
    // placement + id adoption are what this asserts; the figure number is incidental.
    assert.equal(imgs.length, 2, 'two placed images (both asset references resolved cross-file)');
    assert.ok(imgs.every((s) => /^data:image\/png;base64,/.test(s)), 'both placed images are png data: URIs');
    assert.deepEqual(figureIds, ['fig:scatter', 'fig:dup'], 'both placed figures adopt their asset ids');
    assert.deepEqual(labels, ['1.', '2.'], 'placed figures number flat (unnumbered book → "Figure 1", "Figure 2")');
    assert.ok(/<a [^>]*href="#fig:scatter"[^>]*>figure 1<\/a>/.test(book),
      'the cross-chapter <ref @fig:scatter> resolves to "figure 1"');

    // No stray figure from either <data> declaration (all stripped); <data> absent; no leak.
    assert.ok(!/<data\b/.test(book), '<data> blocks are not in the rendered output');
    assert.ok(!/<img\b[^>]*\bsrc="@/.test(book), 'no raw @-src <img> leaked');

    // Duplicate id across chapters: the LAST declaration (chapter 2) wins, with a visible flag.
    const dupFig = (book.match(/<figure\b[^>]*\bid="fig:dup"[\s\S]*?<\/figure>/) || [''])[0];
    assert.ok(/hKmMIQ/.test(dupFig) && !/WjR9aw/.test(dupFig),
      'the duplicated @fig:dup resolves to the chapter-2 payload (last declaration wins)');
    assert.ok(/class="enscribe-asset-error"/.test(book), 'the duplicate declaration renders a visible collision flag');
    assert.ok(/duplicate embedded-asset id .fig:dup. declared in more than one/.test(book),
      'the collision flag names the duplicated id and states last-wins');

    assert.equal(warnings.length, 0, `the asset book assembles with no warnings (got: ${warnings.join('; ')})`);
    console.log('PASS: #190 slice 2 — cross-file embedded asset resolves cross-chapter; duplicate id is last-wins with a visible flag');
  }

  // ── #190 slice 3: cross-file external asset (master-relative rebasing) ───────
  // An external <fig #id src=…> declared in a subdirectory chapter resolves at a
  // <fig src="@id" /> in another chapter to a plain <img src="<rebased path>">.
  {
    const { html: raw, warnings } = renderAssetExtBook();
    const book = raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const imgs = [...book.matchAll(/<img\b[^>]*\bsrc="([^"]*)"/g)].map((m) => m[1]);
    const figureIds = [...book.matchAll(/<figure\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]);

    // The external asset declared in parts/methods.emd (subdir) had src="diagram.svg";
    // assembly rebased it master-relative to "parts/diagram.svg", and it renders as a
    // plain <img src> (not a data: URI) at the placement in the results chapter.
    assert.deepEqual(imgs, ['parts/diagram.svg'],
      'cross-file external asset renders its master-relative (rebased) path as a plain <img src>');
    assert.deepEqual(figureIds, ['fig:diagram'], 'the placed external figure adopts the asset id');
    assert.ok(!/<data\b/.test(book) && !/<img\b[^>]*\bsrc="@/.test(book),
      'no <data> in output and no raw @-src <img> leaked');
    // The cross-chapter <ref @fig:diagram> resolves to the placed figure (unnumbered book → flat "figure 1").
    assert.ok(/<a [^>]*href="#fig:diagram"[^>]*>figure 1<\/a>/.test(book),
      'the cross-chapter <ref @fig:diagram> resolves to "figure 1"');
    assert.equal(warnings.length, 0, `the external-asset book assembles with no warnings (got: ${warnings.join('; ')})`);

    console.log('PASS: #190 slice 3 — cross-file external asset resolves to its rebased path; cross-chapter <ref> resolves');
  }
}
