// Integration tests for the full acadamark pipeline.
//
// These tests run the complete parse → structural-transform → compile pipeline
// on each fixture document, capturing the hast tree (for snapshot comparison)
// and the HTML output (for structural inspection).
//
// Snapshot strategy: on first run, the expected JSON files are written to disk.
// Subsequent runs compare against them. If the files already exist, comparison
// is strict. Set ACADAMARK_UPDATE_SNAPSHOTS=1 to regenerate.
//
// Note: these are END-TO-END integration tests. They verify the full pipeline
// including fixture parsing, so failures here may trace to any layer.

import assert from 'node:assert/strict';
import process from 'node:process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkAcadamark from 'remark-acadamark';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

import { acadamarkInterpreter, acadamarkNormalizeMarkdown, acadamarkTagHandler, createAcadamarkTagHandler } from '../src/index.js';
import remarkRecursiveContent from '../../remark-acadamark/src/recursive-content.js';
import { acadamarkConfigDiscovery } from '../src/plugins/config-discovery.js';
import { acadamarkArticleStructuring } from '../src/plugins/article-structuring.js';
import { acadamarkSectionNesting } from '../src/plugins/section-nesting.js';
import { acadamarkNotes } from '../src/plugins/notes.js';
import { acadamarkNotePlacement } from '../src/plugins/note-placement.js';
import { buildCitationIndex } from '../src/plugins/library-load.js';
import { acadamarkNumbering, fillNumbering } from '../src/plugins/numbering.js';
import { acadamarkRefResolution } from '../src/plugins/ref-resolution.js';
import { acadamarkCiteResolution } from '../src/plugins/cite-resolution.js';
import { acadamarkBibliography } from '../src/plugins/bibliography.js';
import { ensureRegistry } from '../src/lib/registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const UPDATE = process.env.ACADAMARK_UPDATE_SNAPSHOTS === '1';

/**
 * Run the full pipeline on a source string and return the hast tree and HTML.
 */
function runPipeline(source, opts = {}) {
  // AUD-17: this mirror must match the pipeline registered in index.js.
  // G3: remarkMath added to both inner processors; normalization pass added.
  // NORM-tables: remarkGfm added to all inner processors.
  const innerProcessor = unified().use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm);

  const processor = unified()
    .use(remarkParse)
    .use(remarkAcadamark)
    .use(acadamarkInterpreter, opts);

  const result = processor.processSync(source);
  const html = String(result);

  // Also capture the hast by running the structural transforms separately and
  // calling toHast directly (so we can store the tree for snapshot comparison).
  const innerProc2 = unified().use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm);
  const mdast = unified().use(remarkParse).use(remarkAcadamark).use(remarkMath).use(remarkGfm).parse(source);
  const file = { data: {} };
  // Apply transforms manually for hast capture.
  remarkRecursiveContent({ processor: innerProc2 })(mdast);
  acadamarkNormalizeMarkdown()(mdast);
  acadamarkConfigDiscovery()(mdast, file);
  acadamarkArticleStructuring()(mdast);
  acadamarkSectionNesting()(mdast);
  buildCitationIndex(mdast, file, { assetsDir: opts.assetsDir ?? null });
  acadamarkNotes()(mdast, file);
  acadamarkNumbering()(mdast, file);
  // Apply numbers: mirror the acadamarkApplyNumbers stage from the full pipeline.
  const registry = ensureRegistry(file);
  registry.numberRegistry();
  fillNumbering(file);
  acadamarkRefResolution()(mdast, file);
  acadamarkCiteResolution()(mdast, file);
  acadamarkNotePlacement()(mdast, file);
  acadamarkBibliography()(mdast, file);

  const tagHandler = createAcadamarkTagHandler(opts);
  const hast = toHast(mdast, {
    handlers: { acadamarkTag: tagHandler },
    allowDangerousHtml: true,
  });

  return { html, hast };
}

/**
 * Snapshot helper. Writes JSON on first run (or when UPDATE=1), compares on
 * subsequent runs.
 */
function snapshotHast(name, hast) {
  const snapshotPath = join(FIXTURES_DIR, `${name}-expected.json`);
  const json = JSON.stringify(hast, null, 2);

  if (UPDATE || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, json + '\n', 'utf8');
    console.log(`  (wrote snapshot: ${name}-expected.json)`);
    return; // No comparison on write.
  }

  const stored = readFileSync(snapshotPath, 'utf8');
  assert.equal(json + '\n', stored, `Snapshot mismatch for ${name}`);
}

export function run() {
  // ── Document 1: Minimal article ────────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-1-minimal.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Structural assertions.
    assert.ok(html.includes('<article>'), 'doc1: has <article>');
    assert.ok(html.includes('<article-front>'), 'doc1: has <article-front>');
    assert.ok(html.includes('<article-body>'), 'doc1: has <article-body>');
    assert.ok(!html.includes('<article-back>'), 'doc1: no back-matter → article-back suppressed');
    assert.ok(html.includes('<article-title>'), 'doc1: title promoted');
    assert.ok(
      html.includes('The Effect of Elephants on Climate'),
      'doc1: title text present',
    );
    assert.ok(html.includes('<section>'), 'doc1: has sections');
    assert.ok(html.includes('<section-title>'), 'doc1: section titles extracted');
    assert.ok(html.includes('Introduction'), 'doc1: section title text');
    assert.ok(html.includes('<em>'), 'doc1: inline <em> present');
    assert.ok(html.includes('three years'), 'doc1: em content');
    // Document fonts always injected; no KaTeX CSS when there's no math.
    assert.ok(html.includes('@font-face'), 'doc1: document fonts CSS injected');
    assert.ok(!html.includes('.katex'), 'doc1: no KaTeX CSS injected (no math)');

    snapshotHast('document-1', hast);
    console.log('PASS: integration doc1 (minimal article)');
  }

  // ── Document 2: Realistic short paper ──────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-2-realistic.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc2: has <article>');
    assert.ok(html.includes('<article-title>'), 'doc2: title promoted');
    assert.ok(html.includes('The Effect of Elephants on Climate'), 'doc2: title');
    assert.ok(html.includes('<article-subtitle>'), 'doc2: subtitle promoted');
    assert.ok(html.includes('Evidence from Sub-Saharan Africa'), 'doc2: subtitle');
    assert.ok(html.includes('<sub-section>'), 'doc2: sub-sections present');
    assert.ok(html.includes('<sub-section-title>'), 'doc2: sub-section titles');
    assert.ok(html.includes('Data sources'), 'doc2: sub-section title text');
    assert.ok(html.includes('<figure>'), 'doc2: figure present');
    assert.ok(html.includes('<img'), 'doc2: figure img generated');
    assert.ok(html.includes('elephant.jpg'), 'doc2: figure src');
    assert.ok(html.includes('<figcaption>'), 'doc2: figcaption present');
    assert.ok(html.includes('<aside>'), 'doc2: aside present');
    assert.ok(html.includes('<blockquote>'), 'doc2: blockquote present');
    // Document fonts always injected; no KaTeX CSS when there's no math.
    assert.ok(html.includes('@font-face'), 'doc2: document fonts CSS injected');
    assert.ok(!html.includes('.katex'), 'doc2: no KaTeX CSS injected (no math)');

    snapshotHast('document-2', hast);
    console.log('PASS: integration doc2 (realistic short paper)');
  }

  // ── Document 3: Edge cases ─────────────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-3-edge-cases.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc3: has <article>');
    assert.ok(html.includes('<section>'), 'doc3: has sections');
    assert.ok(html.includes('<sub-section>'), 'doc3: has sub-sections');
    assert.ok(html.includes('<sub-sub-section>'), 'doc3: has sub-sub-sections');
    assert.ok(html.includes('<em>'), 'doc3: inline em in section title');
    assert.ok(html.includes('important'), 'doc3: em content in title');
    assert.ok(html.includes('<figure'), 'doc3: figure present');
    assert.ok(html.includes('<aside'), 'doc3: aside present');
    assert.ok(html.includes('<hr'), 'doc3: hr present');
    // Document fonts always injected; no KaTeX CSS when there's no math.
    assert.ok(html.includes('@font-face'), 'doc3: document fonts CSS injected');
    assert.ok(!html.includes('.katex'), 'doc3: no KaTeX CSS injected (no math)');

    snapshotHast('document-3', hast);
    console.log('PASS: integration doc3 (edge cases)');
  }

  // ── Document 4: Math minimal ────────────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-4-math-minimal.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc4: has <article>');
    // Inline math in the Pythagorean section.
    assert.ok(html.includes('<inline-math>'), 'doc4: <inline-math> elements present');
    // Display math (quadratic formula).
    assert.ok(html.includes('<display-math>'), 'doc4: <display-math> element present');
    // KaTeX wraps its output in <span class="katex">.
    assert.ok(html.includes('class="katex"'), 'doc4: KaTeX output present');
    // Error section: broken LaTeX produces a visible katex-error span.
    assert.ok(html.includes('katex-error'), 'doc4: error marker present for malformed LaTeX');
    // The document itself does not crash — all sections rendered.
    assert.ok(html.includes('Pythagorean theorem'), 'doc4: section 1 content');
    assert.ok(html.includes('quadratic formula'), 'doc4: section 2 content');
    assert.ok(html.includes('error marker'), 'doc4: section 3 content');
    // Math present → KaTeX CSS injected inline by default.
    assert.ok(html.includes('<style>'), 'doc4: KaTeX CSS injected (inline mode)');
    assert.ok(html.includes('katex'), 'doc4: CSS contains KaTeX class names');

    snapshotHast('document-4', hast);
    console.log('PASS: integration doc4 (math minimal)');
  }

  // ── Document 5: Linear regression ──────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-5-linear-regression.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc5: has <article>');

    // Five display math equations (one per section except introduction).
    const displayMathCount = (html.match(/<display-math/g) || []).length;
    assert.equal(displayMathCount, 5, 'doc5: five display math equations');

    // Multiple inline math expressions throughout.
    const inlineMathCount = (html.match(/<inline-math/g) || []).length;
    assert.ok(inlineMathCount >= 10, `doc5: at least 10 inline math (got ${inlineMathCount})`);

    // KaTeX rendered something for all equations.
    assert.ok(html.includes('class="katex"'), 'doc5: KaTeX output present');
    assert.ok(!html.includes('katex-error'), 'doc5: no errors (all LaTeX valid)');

    // Code blocks render as <pre><code>.
    const preCount = (html.match(/<pre>/g) || []).length;
    assert.equal(preCount, 4, 'doc5: four code blocks (3 markdown + 1 sigil)');
    assert.ok(html.includes('<code'), 'doc5: code element inside pre');
    assert.ok(html.includes('LinearRegression'), 'doc5: code block content');
    assert.ok(html.includes('r2_score'), 'doc5: last code block content');

    // Attributed elements: id on display-math and id on code block.
    assert.ok(html.includes('id="eqn:model"'), 'doc5: display-math #eqn:model has id attribute');
    assert.ok(html.includes('id="code:scikit"'), 'doc5: code block #code:scikit has id attribute');
    assert.ok(html.includes('language-python'), 'doc5: sigil code block has language class');

    // Structural elements.
    assert.ok(html.includes('<section>'), 'doc5: has sections');
    assert.ok(html.includes('Linear Regression'), 'doc5: title present');

    // Some representative LaTeX renders correctly — check for KaTeX-generated spans.
    // KaTeX produces mfrac for fractions.
    assert.ok(html.includes('mfrac'), 'doc5: fraction renders via KaTeX');
    // Math present → KaTeX CSS injected inline.
    assert.ok(html.includes('<style>'), 'doc5: KaTeX CSS injected (inline mode)');

    // Notes: doc5 has 3 notes (2 end/foot, 1 side).
    // Count actual note marker <sup> elements by their id (noteref-N).
    const markerCount = (html.match(/id="noteref-\d+"/g) || []).length;
    assert.equal(markerCount, 3, 'doc5: three note markers');

    // Note-list in article-back for collected notes (2 collected: 1 end, 1 foot).
    assert.ok(html.includes('<note-list'), 'doc5: note-list present in back-matter');
    assert.ok(html.includes('<li id="note-'), 'doc5: note list items present');

    // Sidenote collected to back with sidenote-fallback class on <li>.
    assert.ok(html.includes('sidenote-fallback'), 'doc5: sidenote-fallback class present');

    // Hover preview assets injected (notes exist, default mode = inline).
    assert.ok(html.includes('tippy'), 'doc5: Tippy.js hover preview injected');

    snapshotHast('document-5', hast);
    console.log('PASS: integration doc5 (linear regression)');
  }

  // ── Document 6: Cross-reference fixture ────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-6-cross-references.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc6: has <article>');

    // Config prefix override: eqn:newton → "Eq. 1"
    assert.ok(html.includes('>Eq. 1<'), 'doc6: config prefix override renders "Eq. 1"');

    // Unnumbered labeled: eqn:energy → "energy" (label-tail)
    assert.ok(html.includes('>energy<'), 'doc6: unnumbered labeled ref uses label-tail "energy"');

    // Unnumbered labeled: eqn:alt-form → "alt-form" (label-tail)
    assert.ok(html.includes('>alt-form<'), 'doc6: unnumbered labeled ref uses label-tail "alt-form"');

    // Numbered figure: fig:elephant → "figure 1"
    assert.ok(html.includes('>figure 1<'), 'doc6: figure ref renders "figure 1"');

    // Note ref: note:galton → "note 1"
    assert.ok(html.includes('>note 1<'), 'doc6: note ref renders "note 1"');

    // Unregistered prefix: custom:thing → just the number (no prefix word)
    // custom:thing is numbered; DEFAULT_PREFIXES has no 'custom' → text is "3"
    assert.ok(html.includes('href="#custom:thing"'), 'doc6: custom:thing ref has href');

    // Error refs
    assert.ok(html.includes('??ref: eqn:nonexistent??'), 'doc6: missing ref renders error text');
    assert.ok(html.includes('??ref: not-a-label??'), 'doc6: non-colon id ref renders error text');
    assert.ok(html.includes('class="ref-error"'), 'doc6: error refs have ref-error class');

    // Resolved refs have ref class
    assert.ok(html.includes('class="ref"'), 'doc6: resolved refs have ref class');

    // Equation numbers visible for numbered equations
    assert.ok(html.includes('class="equation-number"'), 'doc6: equation numbers rendered');

    // Figure labels visible
    assert.ok(html.includes('class="figure-label"'), 'doc6: figure labels rendered');

    snapshotHast('document-6', hast);
    console.log('PASS: integration doc6 (cross-reference fixture)');
  }

  // ── Document 7: Tables ──────────────────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-7-tables.acm'), 'utf8');
    const assetsDir = join(FIXTURES_DIR, 'assets');
    const { html, hast } = runPipeline(src, { assetsDir });

    assert.ok(html.includes('<article>'), 'doc7: has <article>');

    // CSV table with headers + caption + numbered label
    assert.ok(html.includes('<table'), 'doc7: table element present');
    assert.ok(html.includes('<thead'), 'doc7: thead from CSV headers');
    assert.ok(html.includes('<caption'), 'doc7: caption present');
    assert.ok(html.includes('Table 1.'), 'doc7: numbered Table 1 label in caption');
    assert.ok(html.includes('Greek letters'), 'doc7: CSV caption text');
    assert.ok(html.includes('<th'), 'doc7: th cells in thead');

    // TSV table without headers: no thead
    // Two tables in the section; the TSV one is -headers, so check the overall count
    const theadCount = (html.match(/<thead/g) || []).length;
    assert.ok(theadCount >= 4, `doc7: at least 4 thead elements (csv,json,yaml,md tables have headers; got ${theadCount})`);

    // JSON table
    assert.ok(html.includes('Coordinates'), 'doc7: JSON table caption text');
    assert.ok(html.includes('Table 2.'), 'doc7: JSON table is Table 2');

    // YAML table
    assert.ok(html.includes('YAML data'), 'doc7: YAML table caption text');
    assert.ok(html.includes('Alice'), 'doc7: YAML content cell');

    // MD pipe table
    assert.ok(html.includes('Pipe table'), 'doc7: MD pipe table caption text');
    assert.ok(html.includes('Acceleration'), 'doc7: MD pipe content');

    // File-sourced table (src=sample-data.csv)
    assert.ok(html.includes('From file'), 'doc7: src= table caption text');
    assert.ok(html.includes('alpha'), 'doc7: file-sourced content cell');

    // Unnumbered table: no Table N. label
    assert.ok(html.includes('Unnumbered'), 'doc7: unnumbered table caption text');
    // The unnumbered table should not have a Table N. label in its caption
    const tableLabels = html.match(/class="table-label"/g) || [];
    // Only numbered tables get the label span; TSV is numbered, CSV is 1, JSON 2, YAML 3, MD 4, src= 5
    // Unnumbered gets no span
    assert.ok(tableLabels.length >= 5, `doc7: at least 5 numbered table labels (got ${tableLabels.length})`);

    // Cross-references resolve to numbered tables
    assert.ok(html.includes('class="ref"'), 'doc7: resolved ref links present');
    assert.ok(html.includes('href="#tab:csv"'), 'doc7: ref link to CSV table');

    // No KaTeX (no math in doc7), but hover-preview CSS is injected because
    // doc7 has ref links (the guard was widened in the hover-preview fix).
    assert.ok(!html.includes('katex'), 'doc7: no KaTeX injected (no math)');
    // Hover-preview assets present (doc7 has ref links even though it has no notes)
    assert.ok(html.includes('tippy'), 'doc7: hover-preview injected (has ref links)');

    snapshotHast('document-7', hast);
    console.log('PASS: integration doc7 (tables)');
  }

  // ── Document 8: Citations ────────────────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-8-citations.acm'), 'utf8');
    const assetsDir = join(FIXTURES_DIR, 'assets');
    const { html, hast } = runPipeline(src, { assetsDir });

    assert.ok(html.includes('<article>'), 'doc8: has <article>');

    // Resolved citations render as <cite class="cite">.
    assert.ok(html.includes('class="cite"'), 'doc8: resolved cites have class="cite"');
    // The cite element has a data-keys attribute (becomes data-keys in HTML).
    assert.ok(html.includes('data-keys='), 'doc8: cite has data-keys attribute');

    // Missing-key citation renders as <cite class="cite-error">.
    assert.ok(html.includes('class="cite-error"'), 'doc8: missing cite has cite-error class');
    assert.ok(html.includes('??cite:'), 'doc8: missing cite shows error text');

    // Bibliography injected in article-back.
    assert.ok(html.includes('<bibliography>'), 'doc8: <bibliography> element present');
    assert.ok(html.includes('<h2>References</h2>'), 'doc8: bibliography heading');

    // Each entry has id="ref-KEY" (for hover-preview lookup).
    assert.ok(html.includes('id="ref-'), 'doc8: bibliography entries have id="ref-KEY"');

    // The known reference keys are present.
    assert.ok(html.includes('id="ref-Loomes2017"'), 'doc8: Loomes2017 entry present');
    assert.ok(html.includes('id="ref-Pellicano2014"'), 'doc8: Pellicano2014 entry present');

    // <data> and <library> render no visible output themselves.
    assert.ok(!html.includes('<data>'), 'doc8: <data> tag not in output');
    assert.ok(!html.includes('<library>'), 'doc8: <library> tag not in output');

    // Hover preview assets injected because cite markers are present.
    assert.ok(html.includes('tippy'), 'doc8: hover preview injected (cite markers present)');

    snapshotHast('document-8', hast);
    console.log('PASS: integration doc8 (citations)');
  }

  // ── Document 10: Inline TeX shortcuts fixture ────────────────────────────────
  // Exercises ^{...} → <sup> and _{...} → <sub> end-to-end in both top-level
  // prose (G1b tokenizer surface) and inside named-tag content (G1a grammar
  // surface). G1 is output-additive: the snapshot contains <sup> and <sub>
  // elements that did not exist before G1. The diff is the intended new output.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-10-shortcuts.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Both surfaces produce <sup> and <sub> elements.
    assert.ok(html.includes('<sup>'), 'doc10: <sup> element present');
    assert.ok(html.includes('<sub>'), 'doc10: <sub> element present');
    // Ordinals.
    assert.ok(html.includes('<sup>st</sup>'), 'doc10: 1^{st} → <sup>st</sup>');
    assert.ok(html.includes('<sup>nd</sup>'), 'doc10: 2^{nd} → <sup>nd</sup>');
    // Chemistry subscripts.
    assert.ok(html.includes('<sub>2</sub>'), 'doc10: H_{2}O → <sub>2</sub>');
    // Superscript in tag content (G1a surface).
    assert.ok(html.includes('<sup>56</sup>'), 'doc10: ^{56}Fe has <sup>56</sup>');
    // No unexpected changes to structure.
    assert.ok(html.includes('<article>'), 'doc10: article structure present');
    assert.ok(html.includes('<section>'), 'doc10: section structure present');

    snapshotHast('document-10', hast);
    console.log('PASS: integration doc10 (inline TeX shortcuts)');
  }

  // ── Document 11: Bare math normalization (G3) ─────────────────────────────
  // Exercises bare $...$ and $$...$$ in both surfaces:
  //   - top-level prose (outer processor + normalization pass)
  //   - named-tag content (inner processor + normalization pass) — two-surface check
  // The fixture also uses the authored sigil forms (<$ ... $>, <$$ ... $$>) so
  // we can assert the outputs are identical (normalization principle).
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-11-bare-math.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc11: article structure present');

    // Inline math renders to <inline-math> — both bare and authored sigil form.
    assert.ok(html.includes('<inline-math>'), 'doc11: <inline-math> elements present');

    // Display math renders to <display-math>.
    assert.ok(html.includes('<display-math>'), 'doc11: <display-math> elements present');

    // KaTeX wraps output in <span class="katex">.
    assert.ok(html.includes('class="katex"'), 'doc11: KaTeX output present');

    // hasMathElements fires → KaTeX CSS injected (bare math document).
    assert.ok(html.includes('<style>'), 'doc11: KaTeX CSS injected (inline mode, bare math triggers hasMathElements)');
    assert.ok(html.includes('katex'), 'doc11: CSS contains KaTeX class names');

    // The aside content contains inline math (two-surface normalization check).
    assert.ok(html.includes('<aside>'), 'doc11: <aside> rendered');

    // Inline-math count: top-level section has 2 (bare + authored same expression),
    // aside section has 2 (bare + authored). Total at least 4.
    const inlineMathCount = (html.match(/<inline-math>/g) || []).length;
    assert.ok(inlineMathCount >= 4, `doc11: at least 4 inline-math elements (got ${inlineMathCount})`);

    // Display math count: 2 (bare + authored same expression).
    const displayMathCount = (html.match(/<display-math>/g) || []).length;
    assert.ok(displayMathCount >= 2, `doc11: at least 2 display-math elements (got ${displayMathCount})`);

    snapshotHast('document-11', hast);
    console.log('PASS: integration doc11 (bare math normalization — both surfaces)');
  }

  // ── Document 12: Bare pipe table normalization (NORM-tables) ──────────────
  // Exercises bare GFM pipe tables in both surfaces:
  //   - top-level prose (outer processor + normalization pass)
  //   - named-tag content (inner processor + normalization pass) — two-surface
  // Aligned-column table exercises all four delimiter types.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-12-bare-table.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc12: article structure present');

    // Bare pipe tables are normalized to <table> acadamarkTag nodes and
    // rendered via the table handler. Expect HTML <table> elements in output.
    assert.ok(html.includes('<table'), 'doc12: <table> element present');

    // The top-level table has a row for "Force", "Mass", "Acceleration".
    assert.ok(html.includes('Force'), 'doc12: Force row present');
    assert.ok(html.includes('Mass'), 'doc12: Mass row present');

    // The aligned table has columns A, B, C, D.
    assert.ok(html.includes('>A<'), 'doc12: aligned table A cell present');

    snapshotHast('document-12', hast);
    console.log('PASS: integration doc12 (bare pipe table normalization — both surfaces)');
  }
}
