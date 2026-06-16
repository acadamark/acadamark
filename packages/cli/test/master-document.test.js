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
import { readFileSync } from 'node:fs';
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

export function run_tests() {
  const html = renderMaster();

  // ── assembles into ONE article ──────────────────────────────────────────────
  {
    assert.equal((html.match(/<article>/g) || []).length, 1, 'master assembles into a single <article>');
    assert.ok(html.includes('<article-title>Multi-File Demo</article-title>'), 'master <meta> title becomes the article title');
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
    assert.ok(xref.includes('<figcaption><span class="figure-label">Figure 1.</span> The alpha figure.</figcaption>'),
      'cross-file: the first child file\'s figure is Figure 1');
    assert.ok(xref.includes('<figcaption><span class="figure-label">Figure 2.</span> The beta figure.</figcaption>'),
      'cross-file: the second child file\'s figure continues as Figure 2 (no per-file restart)');
    assert.ok(xref.includes('<figcaption><span class="figure-label">Figure 3.</span> The gamma figure.</figcaption>'),
      'cross-file: the third child file\'s figure continues as Figure 3');
    console.log('PASS: #190 slice 2 — figures number continuously across child files');

    // Continuous SECTION numbering (number-sections=true in the master <config>):
    // the section titles carry 1 / 2 / 3 in master document order, one per child.
    assert.ok(xref.includes('<section-title><span class="section-number">1</span>Alpha</section-title>'),
      'cross-file: first section numbered 1');
    assert.ok(xref.includes('<section-title><span class="section-number">2</span>Beta</section-title>'),
      'cross-file: second section numbered 2');
    assert.ok(xref.includes('<section-title><span class="section-number">3</span>Gamma</section-title>'),
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
    assert.ok(book.includes('<book-title>Field Methods in Savanna Ecology</book-title>'),
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
}
