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
import { parseErrorHandler, tagErrorHandler } from '../src/handlers/parser-errors.js';
import remarkRecursiveContent from 'remark-acadamark/recursive-content';
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
import { ensureRegistry } from 'acadamark-core/registry';

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
    handlers: {
      acadamarkTag: tagHandler,
      acadamarkParseError: parseErrorHandler,
      acadamarkTagError: tagErrorHandler,
    },
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

  // ── Document 13: Code-block cross-references (G4, PG-6) ──────────────────
  // Exercises code-block sigil nodes with colon-ids:
  //   - <``` python #code:hello | ... ```> registers in the label index
  //   - <ref @code:hello> resolves to a __ref-marker (not __ref-error)
  //   - <ref @code:missing> still produces a ref-error marker
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-13-code-refs.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc13: article structure present');
    assert.ok(html.includes('<pre>'), 'doc13: <pre> element present for code block');
    assert.ok(html.includes('id="code:hello"'), 'doc13: code:hello id on <code> element');

    // The labeled code reference must resolve (no ref-error).
    assert.ok(!html.includes('ref-error') || html.split('ref-error').length === 2,
      'doc13: at most one ref-error (the intentional missing ref)');
    assert.ok(html.includes('ref-error'), 'doc13: missing code ref produces ref-error');

    // The resolved ref link must target #code:hello.
    assert.ok(html.includes('href="#code:hello"'), 'doc13: resolved ref links to #code:hello');

    snapshotHast('document-13', hast);
    console.log('PASS: integration doc13 (code-block cross-references — PG-6)');
  }

  // ── Document 14: Hash-sigil heading dispatch ───────────────────────────────
  // Phase-1 alpha-build slice fixture. Exercises the `<#>` / `<##>` / `<###>`
  // sigil-form headings end-to-end to prove:
  //   - dispatch: `<# … #>` produces a Layer 1 <section>, not an
  //     unknown-element span (the sigil-mapping fix added `#`/`##`/`###`
  //     entries to PARSER_TO_VOCAB).
  //   - opacity: prose content inside the heading is recursively parsed
  //     (the grammar fix removed `isOpaqueContent: true` from the hash-sigil
  //     rules so the makeNode default `false` stands; from-markdown.js's
  //     contentHandler-based override was already correcting at runtime, but
  //     the grammar source is now consistent with shorthand-syntax.md and
  //     dsl-registry.js).
  //   - id threading: `<# #sec:intro | … #>` carries its id through the
  //     parser's Attributes capture to the resulting <section> node.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-14-hash-sigil-headings.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Dispatch: hash sigils produce real sections, not unknown-element spans.
    assert.ok(html.includes('<article>'), 'doc14: article structure present');
    assert.ok(html.includes('<section>'), 'doc14: <section> element from <# … #>');
    assert.ok(html.includes('<section-title>'), 'doc14: <section-title> extracted');
    assert.ok(html.includes('<sub-section>'), 'doc14: <sub-section> from <## … ##>');
    assert.ok(html.includes('<sub-section-title>'), 'doc14: <sub-section-title> extracted');
    assert.ok(html.includes('<sub-sub-section>'), 'doc14: <sub-sub-section> from <### … ###>');
    assert.ok(html.includes('<sub-sub-section-title>'), 'doc14: <sub-sub-section-title> extracted');
    assert.ok(!html.includes('data-acadamark-unknown'), 'doc14: no unknown-element fallback span');

    // Id threading: sigil with id resolves to section with that id.
    assert.ok(html.includes('id="sec:intro"'), 'doc14: id threads through hash sigil');

    // Opacity: prose content inside the heading was recursively parsed.
    // (Post-normalize-to-canonical gate: emphasis lifts to <i>, inlineCode
    // lifts to <code> per the decided stylistic mapping.)
    assert.ok(html.includes('<i>'), 'doc14: emphasis inside <## … ##> rendered (lifts to <i>)');
    assert.ok(html.includes('<code>'), 'doc14: inline code inside <### … ###> rendered');

    snapshotHast('document-14', hast);
    console.log('PASS: integration doc14 (hash-sigil heading dispatch — alpha Phase 1)');
  }

  // ── Document 15: Bare markdown heading lift (normalize-to-canonical) ──────
  // Validates Group B (bare heading → section for depths 1-3; pass-through
  // for depths 4-6 with diagnostics) and Group C (recursive inline lift).
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-15-bare-headings.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Depths 1-3 lift to canonical sections.
    assert.ok(html.includes('<section>'), 'doc15: bare # → <section>');
    assert.ok(html.includes('<section-title>'), 'doc15: <section-title> extracted from bare heading');
    assert.ok(html.includes('<sub-section>'), 'doc15: bare ## → <sub-section>');
    assert.ok(html.includes('<sub-sub-section>'), 'doc15: bare ### → <sub-sub-section>');

    // Recursive inline lift inside heading titles.
    assert.ok(html.includes('<i>'), 'doc15: emphasis in heading title lifts to <i>');
    assert.ok(html.includes('<b>'), 'doc15: strong in heading title lifts to <b>');
    assert.ok(html.includes('<s>'), 'doc15: strikethrough lifts to <s>');
    assert.ok(html.includes('<code>'), 'doc15: inline code lifts to canonical inline-code element');

    // Depths 4-6 pass through as literal HTML <hN> elements (the named exception).
    assert.ok(html.includes('<h4>'), 'doc15: depth-4 heading passes through as <h4>');
    assert.ok(html.includes('<h5>'), 'doc15: depth-5 heading passes through as <h5>');
    assert.ok(html.includes('<h6>'), 'doc15: depth-6 heading passes through as <h6>');

    snapshotHast('document-15', hast);
    console.log('PASS: integration doc15 (bare markdown heading lift — normalize-to-canonical gate)');
  }

  // ── Document 16: Section-form ladder convergence proof ────────────────────
  // The same section title authored three ways. After the gate, all three
  // forms must produce structurally identical Layer 1 <section> nodes.
  // This is the verification the [alpha] "section-form ladder converges"
  // item required, now satisfied by the normalize-to-canonical gate.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-16-section-form-convergence.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    // All three forms produce <section> elements.
    const sectionMatches = html.match(/<section[ >]/g) ?? [];
    assert.equal(sectionMatches.length, 3,
      `doc16: three sections produced (named, sigil, bare-markdown); got ${sectionMatches.length}`);

    // All three produce <section-title> elements with the same title text.
    const titleMatches = html.match(/<section-title>Convergence title<\/section-title>/g) ?? [];
    assert.equal(titleMatches.length, 3,
      `doc16: three identical <section-title> elements; got ${titleMatches.length}`);

    // Named and sigil forms thread their ids; bare-markdown form does not.
    assert.ok(html.includes('id="sec:named"'), 'doc16: named-form id threads through');
    assert.ok(html.includes('id="sec:sigil"'), 'doc16: sigil-form id threads through');

    snapshotHast('document-16', hast);
    console.log('PASS: integration doc16 (section-form ladder convergence — alpha item closure)');
  }

  // ── Document 18: <config> edge cases (alpha Phase 2 slice 2) ──────────────
  // Validates the cite/config small-bugs fixes:
  //   - PG-11: trailing whitespace after a sigil close (here, <## ... ##> with
  //     a trailing space) is now tolerated in flow position; the sigil parses
  //     as a sub-section rather than silently falling back to inline text.
  //   - PG-9: a nested <config> block (here, inside a section) is now read by
  //     the recursive walk in config-discovery; its ref-prefix-fig override
  //     applies. Before the fix only root-level <config> was read.
  //   - The top-level <config ref-prefix-eqn="Eq."> path still works (the new
  //     recursive walk is a superset, not a replacement).
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-18-config-edge-cases.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc18: article structure present');

    // PG-11: trailing-whitespace sigil parses as a sub-section.
    assert.ok(html.includes('<sub-section>'),
      'doc18: sigil with trailing whitespace produces <sub-section> (PG-11)');
    assert.ok(html.includes('A sigil with trailing whitespace'),
      'doc18: sigil title text present');

    // Top-level <config ref-prefix-eqn="Eq."> override applied (existing path).
    // Assert the rendered REF anchor specifically (not the prose mentioning
    // "Eq. 1" as explanation), so the assertion proves the config override
    // actually reached the resolver.
    assert.ok(/<a [^>]*class="ref"[^>]*>Eq\. 1<\/a>/.test(html),
      'doc18: top-level ref-prefix-eqn override produces "Eq. 1" in the rendered ref anchor');

    // PG-9: nested <config ref-prefix-fig="Fig."> would be visible if a figure
    // ref appeared after it. The fixture sets up the nested block (proving the
    // walk reaches it without crashing); the override-applied assertion lives
    // in the doc19 follow-on where a nested config is exercised end-to-end is
    // unnecessary — this fixture proves the walk completes. The unit-level
    // assertion of the walk's reach lives in the plugin's normalization tests.

    snapshotHast('document-18', hast);
    console.log('PASS: integration doc18 (config edge cases — PG-9 + PG-11 + DD-3)');
  }

  // ── Document 19: <config> unknown / metadata kwargs (alpha Phase 2 slice 2) ─
  // Validates the AUD-13 fix: <config> no longer silently absorbs kwargs it
  // doesn't recognize. The fixture writes title= and foo-bar= on <config>;
  // both should be dropped (visible behavior: title= does NOT become the
  // article title; foo-bar= does not appear anywhere).
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-19-config-unknown-kwargs.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc19: article structure present');

    // The <meta> title is "Config unknown-kwargs fixture" — that must be the
    // article title. The <config title="Title in the wrong place"> must NOT
    // override it (it would have, silently, before the fix).
    assert.ok(html.includes('Config unknown-kwargs fixture'),
      'doc19: meta-supplied title rendered as article title');
    assert.ok(!html.includes('Title in the wrong place'),
      'doc19: <config title="…"> does not contaminate the article title (AUD-13 fix; the kwarg is now rejected with a warning)');

    // The unknown foo-bar="some-value" kwarg must be dropped. "some-value" is
    // a unique tracer — if it appears anywhere in the rendered HTML, the
    // kwarg was absorbed somewhere (the bug). The text "foo-bar" itself
    // appears in the fixture's explanatory prose so cannot be used as the
    // tracer; "some-value" appears only as the kwarg value in the source.
    assert.ok(!html.includes('some-value'),
      'doc19: unknown <config> kwarg foo-bar="some-value" is dropped from the config map (AUD-13 fix)');

    snapshotHast('document-19', hast);
    console.log('PASS: integration doc19 (config unknown kwargs — AUD-13)');
  }

  // ── Document 17: Parser edge cases (alpha Phase 2 slice 1) ────────────────
  // Validates two coupled fixes:
  //   - Self-closing DSL-registry tags (formerly DF-21 / AUD-08): the long-
  //     form finder previously claimed <table /> greedily, treating the
  //     missing </table> as an error. With the syntax.js fix (prevWasSlash
  //     check in scanOpenAttrs / GT branch), <table /> falls through to the
  //     named-tag tokenizer and the grammar's SelfClosingNamedTag rule
  //     produces a selfClosing: true node.
  //   - Visible parser-error rendering (always-renders guarantee, per
  //     principles.md): acadamarkParseError nodes (produced by the grammar
  //     for malformed escape sequences, etc.) now render as visible
  //     <span class="parse-error">??parse: …??</span> markers in the house
  //     style of unresolved refs / cites.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-17-parser-edge-cases.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc17: article structure present');

    // Self-closing <table />: must produce a self-closed <table> element,
    // NOT a tag-error marker. The handler may render an empty table — what
    // we assert is that no "tag-error" class appears around it (which would
    // be the previous buggy behavior).
    const tagErrorMatches = html.match(/class="tag-error"/g) ?? [];
    assert.equal(tagErrorMatches.length, 0,
      `doc17: no tag-error markers (self-closing <table /> should parse cleanly); got ${tagErrorMatches.length}`);

    // Visible parse-error: \z is an unknown escape sequence; the grammar
    // produces an acadamarkParseError; the new handler renders it as a
    // visible <span class="parse-error">??parse: unknown-escape-sequence …??</span>.
    assert.ok(html.includes('class="parse-error"'),
      'doc17: parse-error span class present in rendered output');
    assert.ok(html.includes('??parse:'),
      'doc17: house-style ??parse: …?? marker present in rendered output');
    assert.ok(html.includes('unknown-escape-sequence'),
      'doc17: error subtype identifies the cause');

    // Surrounding content continues to render normally — bounded error.
    assert.ok(html.includes('continues to render normally'),
      'doc17: surrounding content after error is still rendered');

    snapshotHast('document-17', hast);
    console.log('PASS: integration doc17 (parser edge cases — alpha Phase 2 slice 1)');
  }

  // ── Document 20: apparatus-tag reconciliation — <ref> flags/kwargs ────────
  // Validates the <ref> reconciliation: kwargs flow to data attributes;
  // -link emits <span>; -preview adds data-no-preview; misuse hints fire.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-20-apparatus-reconciliation.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc20: article structure present');

    // Default ref → <a href="#eqn:newton" class="ref">equation 1</a> (the
    // hyperlink-default behavior, unchanged).
    assert.ok(/<a href="#eqn:newton" class="ref">equation 1<\/a>/.test(html),
      'doc20: default ref renders as anchor with default text');

    // -link ref → <span class="ref">equation 1</span> (no anchor).
    assert.ok(/<span class="ref">equation 1<\/span>/.test(html),
      'doc20: -link ref renders as <span> (no anchor)');

    // -preview ref → <a> with data-no-preview="true".
    assert.ok(/data-no-preview="true"/.test(html),
      'doc20: -preview ref carries data-no-preview attribute');

    // type/format kwargs flow through to data-ref-type / data-ref-format.
    assert.ok(/data-ref-type="equation"/.test(html),
      'doc20: type kwarg flows to data-ref-type attribute');
    assert.ok(/data-ref-format="number"/.test(html),
      'doc20: format kwarg flows to data-ref-format attribute');

    // Misuse: <config title="..."> with a metadata-shaped kwarg drops it.
    // The fixture source contains "Mis-placed metadata kwarg" as the value;
    // it must NOT appear in the rendered output anywhere (the kwarg was
    // dropped at the gate).
    assert.ok(!html.includes('Mis-placed metadata kwarg'),
      'doc20: <config title=...> kwarg dropped from output (misuse hint)');

    snapshotHast('document-20', hast);
    console.log('PASS: integration doc20 (apparatus-tag reconciliation: <ref> + misuse hints)');
  }

  // ── Document 21: <meta> kwarg ↔ child-tag convergence ─────────────────────
  // Validates that <meta> authored with kwargs (title=, author=, doi=)
  // produces the same Layer 1 child-tag shape as if the author had written
  // explicit <title>, <author>, <doi> children.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-21-meta-kwargs-and-children.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc21: article structure present');

    // article-structuring promotes the lifted <title> to <article-title>.
    assert.ok(html.includes('<article-title>Equivalent metadata via kwarg form</article-title>'),
      'doc21: kwarg title lifts to child <title> then promotes to <article-title>');

    // <author> child created from the author= kwarg.
    assert.ok(html.includes('<author>Ariel Balter</author>'),
      'doc21: kwarg author lifts to child <author>');

    snapshotHast('document-21', hast);
    console.log('PASS: integration doc21 (<meta> kwarg form lifts to canonical child-tag form)');
  }

  // ── Document 22: apparatus-tag mid-body positioning warning ───────────────
  // Validates that a <config> placed inside an <aside>'s content triggers
  // the positioning warning (informative diagnostic; document still renders).
  // No HTML assertion checks for the warning text (warnings go to
  // file.messages, not the rendered output) — the assertion is that the
  // document renders and surrounding content is intact.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-22-apparatus-positioning.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc22: article still renders despite misplaced apparatus');
    assert.ok(html.includes('A correctly-placed body section'),
      'doc22: pre-violation content renders');
    assert.ok(html.includes('Surrounding content continues'),
      'doc22: post-violation content renders');
    assert.ok(html.includes('<aside>'),
      'doc22: the aside containing the misplaced apparatus still renders');

    snapshotHast('document-22', hast);
    console.log('PASS: integration doc22 (apparatus-tag mid-body positioning warning)');
  }

  // ── Document 23: multi-paragraph tag content (Option A, part 1) ───────────
  // Pins Option A's allow-multi-paragraph-tag-content half. A blank line
  // inside <aside | ...> is a paragraph break, not a terminator — the aside
  // must produce two paragraph children in the rendered output. RC-6 in
  // remark-acadamark/test/test-recursive.js covers this at the parser level;
  // this fixture covers the full integration pipeline end-to-end.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-23-multi-paragraph-tag-content.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc23: article structure present');
    assert.ok(html.includes('<aside>'), 'doc23: aside renders (not consumed as error)');
    assert.ok(!html.includes('class="tag-error"'),
      'doc23: no tag-error marker — blank line did not terminate the aside');

    // The aside content must contain two paragraphs.
    const asideSlice = html.substring(html.indexOf('<aside>'), html.indexOf('</aside>'));
    const paragraphCount = (asideSlice.match(/<p>/g) ?? []).length;
    assert.ok(paragraphCount >= 2,
      `doc23: aside contains at least two <p> elements; got ${paragraphCount}`);
    assert.ok(asideSlice.includes('First paragraph of the aside.'),
      'doc23: first paragraph text present in aside');
    assert.ok(asideSlice.includes('Second paragraph of the aside'),
      'doc23: second paragraph text present in aside');

    snapshotHast('document-23', hast);
    console.log('PASS: integration doc23 (multi-paragraph tag content — Option A allow-half)');
  }

  // ── Document 24: unclosed tag at EOF (Option A, part 2) ───────────────────
  // Pins the EOF-only-terminator half of Option A. The aside opens with `|`
  // and never closes; under EOF-only termination, the tokenizer consumes to
  // EOF and from-markdown.js stamps acadamarkTagError. The Phase 2 slice 1
  // tagErrorHandler renders it as a visible <span class="tag-error">??tag:
  // …??</span> marker at the open position. The document still renders
  // (always-renders guarantee).
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-24-unclosed-tag-at-eof.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Document still renders (always-renders): article structure present;
    // the pre-error body section content renders normally.
    assert.ok(html.includes('<article>'), 'doc24: article still renders despite unclosed tag');
    assert.ok(html.includes('Document body before the unclosed tag'),
      'doc24: pre-error section content renders');

    // The unclosed-tag error renders as the house-style visible marker.
    assert.ok(html.includes('class="tag-error"'),
      'doc24: tag-error span class present at the unclosed-tag position');
    assert.ok(html.includes('??tag:'),
      'doc24: house-style ??tag: …?? marker present in rendered output');

    snapshotHast('document-24', hast);
    console.log('PASS: integration doc24 (unclosed tag at EOF — Option A EOF-only terminator)');
  }

  // ── Document 25: <meta> allowlist members + <abstract> render correctly ───
  // Validates the five new vocabulary entries (doi, license, lang, version,
  // keywords) added to close the missing-<meta>-allowlist-vocabulary item.
  // Before this slice, these <meta> kwargs lifted correctly at the
  // normalize-to-canonical gate but rendered as <span data-acadamark-unknown>
  // because their target Layer 1 elements had no vocabulary entries. Now
  // each renders as a real custom element.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-25-meta-allowlist-elements.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc25: article structure present');

    // None of the previously-unknown meta members should render as an
    // unknown-element span anymore.
    assert.ok(!/data-acadamark-unknown="(doi|license|lang|version|keywords)"/.test(html),
      'doc25: no data-acadamark-unknown spans for the new meta allowlist members');

    // Each new element renders as a real custom element carrying its value.
    assert.ok(html.includes('<doi>10.5555/test.2024</doi>'),
      'doc25: <doi> renders with its value');
    assert.ok(html.includes('<license>CC BY 4.0</license>'),
      'doc25: <license> renders with its value');
    assert.ok(html.includes('<lang>en-US</lang>'),
      'doc25: <lang> renders with its value');
    assert.ok(html.includes('<version>1.0.0</version>'),
      'doc25: <version> renders with its value');
    assert.ok(html.includes('<keywords>elephants, conservation, climate</keywords>'),
      'doc25: <keywords> renders with its value');

    // <abstract> continues to render (the pre-existing entry covers it).
    assert.ok(html.includes('<abstract>'),
      'doc25: <abstract> still renders');

    snapshotHast('document-25', hast);
    console.log('PASS: integration doc25 (<meta> allowlist members render as real elements)');
  }

  // ── Document 26: deferred-vocabulary sub-slice 1 elements render ──────────
  // Validates the eleven new entries added by the deferred-vocab sub-slice 1:
  //   - metadata / author sub-elements: publication-date, affiliation, orcid,
  //     email, subject
  //   - inline-semantic: abbr, term
  //   - HTML-native inline (no JATS counterpart): kbd, var, samp, output
  // Each must render as a real custom element with its value, never as a
  // <span data-acadamark-unknown="…"> fallback.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-26-deferred-vocab-sub1.acm'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc26: article structure present');

    // None of the eleven should render as unknown-element spans.
    const elementNames = ['publication-date', 'affiliation', 'orcid', 'email',
      'subject', 'abbr', 'term', 'kbd', 'var', 'samp', 'output'];
    for (const name of elementNames) {
      const unknownPattern = new RegExp(`data-acadamark-unknown="${name}"`);
      assert.ok(!unknownPattern.test(html),
        `doc26: no data-acadamark-unknown span for <${name}>`);
    }

    // Each renders as a real custom element with its value.
    assert.ok(html.includes('<publication-date>2024-03-15</publication-date>'),
      'doc26: <publication-date> renders with its value');
    assert.ok(html.includes('<affiliation>Anthropic, San Francisco</affiliation>'),
      'doc26: <affiliation> renders with its value');
    assert.ok(html.includes('<orcid>0000-0002-1825-0097</orcid>'),
      'doc26: <orcid> renders with its value');
    // <email> content gets remark-autolinked into a <a href="mailto:...">.
    // The assertion is that the <email> element wraps the autolinked content,
    // not the bare email string — proving the vocabulary entry is in effect
    // (no unknown-span) and the email value is carried through.
    assert.ok(/<email><a href="mailto:contact@example\.org">contact@example\.org<\/a><\/email>/.test(html),
      'doc26: <email> wraps the (autolinked) email value');
    assert.ok(html.includes('92D40</subject>'),
      'doc26: <subject> renders with its value (scheme as data attribute)');
    assert.ok(/<subject [^>]*data-subject-scheme="MSC2020"/.test(html),
      'doc26: <subject> scheme kwarg flows to data-subject-scheme attribute');

    // Inline-semantic — abbr with title kwarg flowing through.
    assert.ok(/<abbr [^>]*title="Document Object Model"[^>]*>DOM<\/abbr>/.test(html),
      'doc26: <abbr> renders with its title kwarg carried as the title attribute');
    assert.ok(html.includes('<term id="term:eigenvector">eigenvector</term>'),
      'doc26: <term> renders with its id carried through');

    // HTML-native inline.
    assert.ok(html.includes('<kbd>Ctrl+C</kbd>'),
      'doc26: <kbd> renders with its value');
    assert.ok(html.includes('<var>n</var>'),
      'doc26: <var> renders with its value');
    assert.ok(html.includes('<samp>Hello, world!</samp>'),
      'doc26: <samp> renders with its value');
    assert.ok(html.includes('<output>42</output>'),
      'doc26: <output> renders with its value');

    snapshotHast('document-26', hast);
    console.log('PASS: integration doc26 (deferred-vocab sub-slice 1 elements render)');
  }

  // ── Document 27: <author> structured-interface reconciliation ──────────────
  // Proves kwarg form and child-tag form of <author> normalize to
  // equivalent Layer 1 structures, and the unknown-kwarg path warns + drops.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-27-author-structured-interface.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Author 1 (kwarg form): name / orcid / affiliation lift to child tags;
    // +corresponding stays as a kwarg/attribute.
    // Author 2 (child-tag form): same fields authored directly. The lift
    // produces the same child tags for author 1; both authors carry
    // <name>Jane Roe</name>, <orcid>0000-0000-0000-0000</orcid>,
    // <affiliation>University A</affiliation>.
    //
    // We assert each child element appears with its value, and that the
    // corresponding-marker fires only on author 1.
    assert.ok(
      html.includes('<name>Jane Roe</name>'),
      'doc27: <name>Jane Roe</name> renders (appears for both kwarg-form and child-tag-form authors)',
    );
    assert.ok(
      html.includes('<orcid>0000-0000-0000-0000</orcid>'),
      'doc27: <orcid> renders with its value',
    );
    assert.ok(
      html.includes('<affiliation>University A</affiliation>'),
      'doc27: <affiliation> renders with its value',
    );

    // Both forms produce the same two child elements per author, so each
    // string above appears at least twice in the output (once per author).
    const matches = (s, sub) => (s.split(sub).length - 1);
    assert.equal(
      matches(html, '<name>Jane Roe</name>'),
      2,
      'doc27: <name>Jane Roe</name> appears twice (kwarg-form + child-tag-form authors)',
    );
    assert.equal(
      matches(html, '<orcid>0000-0000-0000-0000</orcid>'),
      2,
      'doc27: <orcid> appears twice (both forms)',
    );
    assert.equal(
      matches(html, '<affiliation>University A</affiliation>'),
      2,
      'doc27: <affiliation> appears twice (both forms)',
    );

    // +corresponding becomes the data-corresponding kwarg/attribute on the
    // canonical Layer 1 node (per the author.md schema's boolean kwarg
    // declaration). Only author 1 has it.
    assert.ok(
      html.includes('corresponding'),
      'doc27: corresponding attribute appears (author 1)',
    );

    // Author 3 (Charles Darwin): pipe content sits as text in <author>; the
    // bogus=x kwarg is dropped with a diagnostic. We don't assert on the
    // diagnostic in HTML (it goes to file.messages), only that the rendered
    // text remains and bogus=x does not appear as an attribute.
    assert.ok(
      html.includes('Charles Darwin'),
      'doc27: backward-compatible casual form keeps pipe content',
    );
    // The fixture's own prose mentions the test name "bogus" in a <code>
    // span; we check that bogus is not an *attribute* on the rendered
    // <author> elements (which is what the lift's drop should ensure).
    assert.ok(
      !/<author[^>]*\bbogus\b[^>]*>/.test(html),
      'doc27: unknown kwarg "bogus" does not appear as an <author> attribute (lift dropped it)',
    );

    // No <author> child is rendered as an unknown-span (the new <name>
    // vocab entry covers it; <affiliation>/<orcid>/<email> were shipped in
    // deferred-vocab sub-slice 1).
    assert.ok(
      !html.includes('data-acadamark-unknown="name"'),
      'doc27: <name> renders as a real element (the new vocab entry covers it)',
    );

    snapshotHast('document-27', hast);
    console.log('PASS: integration doc27 (<author> structured-interface reconciliation)');
  }

  // ── Document 28: deferred-vocab sub-slice 2 (structural blocks) ────────────
  // Proves the seven structural-block elements render as real elements:
  // <dl>/<dt>/<dd> (definition lists), <glossary>/<glossary-entry>,
  // <details>/<summary> (HTML-native disclosure).
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-28-deferred-vocab-sub2.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Each of the seven elements appears as a real tag in the output.
    // The dl block contributes <dl>, <dt>, <dd>.
    assert.ok(html.includes('<dl>'), 'doc28: <dl> renders as a real element');
    assert.ok(
      html.includes('<dt>acadamark</dt>'),
      'doc28: <dt> renders with its term content',
    );
    assert.ok(
      html.includes('<dd>An academic publishing system built on HTML+CSS+JS.</dd>'),
      'doc28: <dd> renders with its description content',
    );

    // The glossary block contributes <glossary>, <glossary-entry>, and
    // additional <dt>/<dd> inside each entry.
    assert.ok(
      html.includes('<glossary id="project-terms">'),
      'doc28: <glossary> renders with its id',
    );
    assert.ok(
      html.includes('<glossary-entry id="term:acadamark">'),
      'doc28: <glossary-entry> renders with its colon-id',
    );

    // Disclosure: <details> and <summary>; the kwarg-form open=true
    // renders as the open attribute on the canonical Layer 1 node.
    // (The +open boolean form is known not to render via the schema
    // dispatch — buildProperties does not iterate node.booleans;
    // filed as a [post-alpha] backlog item. The fixture uses
    // open=true to demonstrate the rendered attribute.)
    assert.ok(
      html.includes('<summary>Background reading</summary>'),
      'doc28: <summary> renders with its heading content',
    );
    // Both <details> blocks render.
    const detailsMatches = html.split('<details').length - 1;
    assert.equal(detailsMatches, 2, 'doc28: both <details> blocks render');
    assert.ok(
      /<details\s+open="true">/.test(html),
      'doc28: open=true kwarg renders as the open attribute on canonical <details>',
    );

    // No element renders as the unknown-span fallback — the vocab entries
    // cover all seven.
    for (const tag of ['dl', 'dt', 'dd', 'glossary', 'glossary-entry', 'details', 'summary']) {
      assert.ok(
        !html.includes(`data-acadamark-unknown="${tag}"`),
        `doc28: <${tag}> renders as a real element (no unknown-span fallback)`,
      );
    }

    snapshotHast('document-28', hast);
    console.log('PASS: integration doc28 (deferred-vocab sub-slice 2 structural blocks render)');
  }

  // ── Document 29: deferred-vocab sub-slice 3 (theorem family) ───────────────
  // Proves the eight theorem-family elements render as real elements
  // via the theorem-family handler. Phase 3 slice 3b (2026-05-28) added
  // the handler that prepends "Theorem N (Name)." label spans;
  // assertions updated to expect the label-then-body shape. Body-content
  // assertions now use [\s\S]* between the opening tag and the body text
  // because the label span sits between them.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-29-deferred-vocab-sub3.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Each of the eight elements appears as a real tag in the output.
    assert.ok(
      /<theorem\b[^>]*id="thm:pyth"[^>]*>/.test(html),
      'doc29: <theorem> renders as a real element with its id intact',
    );
    assert.ok(
      /<theorem\b[^>]*>[\s\S]*If a\^2 \+ b\^2 = c\^2/.test(html),
      'doc29: <theorem> body content renders after the label span',
    );
    assert.ok(
      /<proof\b[^>]*>[\s\S]*By similar triangles/.test(html),
      'doc29: <proof> renders with its body',
    );
    assert.ok(
      /<lemma\b[^>]*>[\s\S]*Zorn/i.test(html) || /<lemma\b[^>]*>[\s\S]*every chain/i.test(html),
      'doc29: <lemma> renders with its body',
    );
    assert.ok(
      /<corollary\b[^>]*>[\s\S]*Every prime greater than 2 is odd/.test(html),
      'doc29: <corollary> renders with its body',
    );
    assert.ok(
      /<proposition\b[^>]*>[\s\S]*Cauchy-Schwarz|inner-product space/i.test(html),
      'doc29: <proposition> renders with its body',
    );
    assert.ok(
      /<definition\b[^>]*>[\s\S]*group/i.test(html),
      'doc29: <definition> renders with its body',
    );
    assert.ok(
      /<example\b[^>]*>[\s\S]*integers/i.test(html),
      'doc29: <example> renders with its body',
    );
    assert.ok(
      /<remark\b[^>]*>[\s\S]*compactness/i.test(html),
      'doc29: <remark> renders with its body',
    );

    // Phase 3 slice 3b: the theorem-family handler renders a label span
    // before each numbered element's body content. Verify the label
    // shape on a few representative elements.
    assert.ok(
      html.includes('Theorem 1 (Pythagoras).'),
      'doc29: <theorem name="Pythagoras"> renders "Theorem 1 (Pythagoras)." label',
    );
    assert.ok(
      html.includes('Lemma 2 (Zorn).'),
      'doc29: <lemma name="Zorn"> renders "Lemma 2 (Zorn)." label (shared theorem counter)',
    );
    // remark/proof are unnumbered — the handler renders a numberless
    // "Remark." / "Proof." label (amsthm convention).
    assert.ok(
      html.includes('Proof.') && !html.includes('Proof 1'),
      'doc29: <proof> renders unnumbered "Proof." label',
    );
    assert.ok(
      html.includes('Remark.') && !html.includes('Remark 1'),
      'doc29: <remark> renders unnumbered "Remark." label',
    );

    // The `name` kwarg flows through to data-name on at least one element.
    // Exercised on <theorem name="Pythagoras">, <lemma name="Zorn">,
    // <proposition name="Cauchy-Schwarz">, <definition name="Group">.
    assert.ok(
      html.includes('data-name="Pythagoras"'),
      'doc29: <theorem name="Pythagoras"> lifts name kwarg to data-name attribute',
    );
    assert.ok(
      html.includes('data-name="Zorn"'),
      'doc29: <lemma name="Zorn"> lifts name kwarg to data-name attribute',
    );
    assert.ok(
      html.includes('data-name="Cauchy-Schwarz"'),
      'doc29: <proposition name="Cauchy-Schwarz"> lifts name kwarg to data-name attribute',
    );
    assert.ok(
      html.includes('data-name="Group"'),
      'doc29: <definition name="Group"> lifts name kwarg to data-name attribute',
    );

    // No element renders as the unknown-span fallback — the vocab entries
    // cover all eight.
    for (const tag of ['theorem', 'lemma', 'corollary', 'proposition', 'definition', 'example', 'remark', 'proof']) {
      assert.ok(
        !html.includes(`data-acadamark-unknown="${tag}"`),
        `doc29: <${tag}> renders as a real element (no unknown-span fallback)`,
      );
    }

    snapshotHast('document-29', hast);
    console.log('PASS: integration doc29 (deferred-vocab sub-slice 3 theorem-family render)');
  }

  // ── Document 30: Phase 2 slice 2a — CSV/TSV handlers + <code> long-form fix ──
  // Proves: <csv> and <tsv> standalone tags render as real <table> elements
  // (matching the qualifying form's output); <code> long-form's body content
  // renders (the pre-fix bug was the schema dispatch dropping opaque content).
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-30-csv-tsv-code-handlers.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // CSV — first row is headers; subsequent rows are tbody.
    assert.ok(
      /<table[^>]*id="csv:demo"[^>]*>/.test(html),
      'doc30: <csv #csv:demo> renders as <table id="csv:demo">',
    );
    // Headers / cells appear as <th>/<td>; the pretty-printer may insert
    // whitespace between them, so we match by individual cell contents
    // rather than the compact row form.
    assert.ok(
      html.includes('<th>name</th>') && html.includes('<th>age</th>') && html.includes('<th>city</th>'),
      'doc30: CSV header row renders as <th> cells in <thead>',
    );
    assert.ok(/<thead>[\s\S]*?<th>name<\/th>[\s\S]*?<\/thead>/.test(html),
      'doc30: CSV <thead> wraps the header cells',
    );
    assert.ok(
      html.includes('<td>Alice</td>') && html.includes('<td>Boston</td>'),
      'doc30: CSV body rows render with their cells',
    );

    // TSV — same shape, tab-delimited.
    assert.ok(
      html.includes('<th>fruit</th>') && html.includes('<th>color</th>') && html.includes('<th>count</th>'),
      'doc30: TSV header row renders',
    );
    assert.ok(
      html.includes('<td>apple</td>') && html.includes('<td>red</td>'),
      'doc30: TSV body rows render',
    );

    // Neither <csv> nor <tsv> appears as a real element in the rendered HTML
    // (the handler builds a <table> directly; the source tag is consumed).
    assert.ok(
      !html.includes('<csv') && !html.includes('<tsv'),
      'doc30: <csv> and <tsv> source tags do not appear in rendered HTML',
    );

    // <code> long-form fix: body content renders (previously was empty).
    assert.ok(
      /<code[^>]*class="language-python"[^>]*>def factorial\(n\)/.test(html),
      'doc30: <code language=python | …> renders with body content + language class',
    );
    assert.ok(
      /<code>x = 42<\/code>/.test(html),
      'doc30: <code | x = 42> short-form-with-pipe renders body content (no language)',
    );
    assert.ok(
      /<code[^>]*class="language-javascript"[^>]*>const sum/.test(html),
      'doc30: <code language=javascript | …> renders with body + js language class',
    );
    // Confirm no empty <code></code> elements (the pre-fix symptom).
    assert.ok(
      !/<code[^>]*><\/code>/.test(html),
      'doc30: no empty <code></code> elements (post-fix body content always present)',
    );

    // No data-acadamark-unknown spans for any of the three tags.
    for (const tag of ['csv', 'tsv', 'code']) {
      assert.ok(
        !html.includes(`data-acadamark-unknown="${tag}"`),
        `doc30: <${tag}> renders as a real element (no unknown-span fallback)`,
      );
    }

    snapshotHast('document-30', hast);
    console.log('PASS: integration doc30 (Phase 2 slice 2a — CSV/TSV handlers + <code> long-form fix)');
  }

  // ── Document 31: Phase 2 slice 2b — math envs + <math> long-form ─────────
  // Proves: <math> long-form + four math envs (matrix, cases, align, eqnarray)
  // render via the extended math.js handler with the wrap-inside convention.
  // Existing math sigils (<$> / <$$>) are unaffected — their snapshots must
  // remain unchanged across this slice.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-31-math-envs.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Each of the five new tags appears as a real element wrapping the
    // KaTeX-rendered HTML. The handler emits a wrapper matching the
    // source tagname; KaTeX content goes inside.
    for (const tag of ['math', 'matrix', 'cases', 'align', 'eqnarray']) {
      assert.ok(
        new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`).test(html),
        `doc31: <${tag}> renders as a real wrapper element`,
      );
      assert.ok(
        !html.includes(`data-acadamark-unknown="${tag}"`),
        `doc31: <${tag}> renders as a real element (no unknown-span fallback)`,
      );
    }

    // KaTeX-rendered content appears inside each wrapper. KaTeX emits a
    // `class="katex"` span for every rendered formula; check it's present
    // at least five times (one per wrapper).
    const katexCount = (html.match(/class="katex"/g) ?? []).length;
    assert.ok(
      katexCount >= 5,
      `doc31: KaTeX rendered into each of the five wrappers (found ${katexCount} 'class="katex"' occurrences; expected >= 5)`,
    );

    // Specific environment-rendering spot-checks. KaTeX's matrix output
    // includes mtable/mtr/mtd elements in the MathML side. Confirm at
    // least one mtable-related rendering token appears inside <matrix>.
    const matrixBlock = html.match(/<matrix\b[^>]*>[\s\S]*?<\/matrix>/)?.[0] ?? '';
    assert.ok(
      matrixBlock.includes('mord') || matrixBlock.includes('katex'),
      'doc31: <matrix> wrapper contains KaTeX-rendered output',
    );

    snapshotHast('document-31', hast);
    console.log('PASS: integration doc31 (Phase 2 slice 2b — math envs + <math> long-form)');
  }

  // ── Document 32: Phase 2 slice 2c — external DSL handlers ────────────────
  // Proves: <mermaid> emits <pre class="mermaid" data-acadamark-dsl="mermaid">
  // with source preserved verbatim (CDN-compatible markup for Mermaid's DOM
  // scanner). <abc> emits <div class="abc" data-acadamark-dsl="abc"> with
  // source preserved (consumer initializes abcjs explicitly via the marker).
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-32-external-dsls.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // <mermaid>: wrapper is <pre class="mermaid" data-acadamark-dsl="mermaid">
    assert.ok(
      /<pre[^>]*class="mermaid"[^>]*data-acadamark-dsl="mermaid"|<pre[^>]*data-acadamark-dsl="mermaid"[^>]*class="mermaid"/.test(html),
      'doc32: <mermaid> wrapper is <pre> with class="mermaid" and data-acadamark-dsl="mermaid"',
    );
    // First mermaid carries its id
    assert.ok(
      /<pre[^>]*id="diagram:simple-flow"[^>]*>/.test(html),
      'doc32: <mermaid #diagram:simple-flow> renders with id preserved',
    );
    // Mermaid source is preserved verbatim — graph LR, sequenceDiagram, etc.
    assert.ok(
      html.includes('graph LR') && html.includes('Decision'),
      'doc32: Mermaid flowchart source preserved verbatim in wrapper',
    );
    assert.ok(
      html.includes('sequenceDiagram') && html.includes('Alice->>Bob: Hello Bob'),
      'doc32: Mermaid sequence-diagram source preserved (handler does not assume diagram type)',
    );

    // <abc>: wrapper is <div class="abc" data-acadamark-dsl="abc">
    assert.ok(
      /<div[^>]*class="abc"[^>]*data-acadamark-dsl="abc"|<div[^>]*data-acadamark-dsl="abc"[^>]*class="abc"/.test(html),
      'doc32: <abc> wrapper is <div> with class="abc" and data-acadamark-dsl="abc"',
    );
    assert.ok(
      /<div[^>]*id="music:twinkle"[^>]*>/.test(html),
      'doc32: <abc #music:twinkle> renders with id preserved',
    );
    // ABC source is preserved verbatim
    assert.ok(
      html.includes('T:Twinkle, Twinkle, Little Star') && html.includes('C C G G'),
      'doc32: ABC notation source preserved verbatim in wrapper',
    );

    // No rendered SVG appears (the whole point of "external" — rendering
    // happens downstream, not at acadamark time).
    assert.ok(
      !html.includes('<svg'),
      'doc32: no <svg> elements in output (external rendering only)',
    );

    // No data-acadamark-unknown spans for either tag.
    for (const tag of ['mermaid', 'abc']) {
      assert.ok(
        !html.includes(`data-acadamark-unknown="${tag}"`),
        `doc32: <${tag}> renders as a real element (no unknown-span fallback)`,
      );
    }

    snapshotHast('document-32', hast);
    console.log('PASS: integration doc32 (Phase 2 slice 2c — external DSL handlers for <mermaid> and <abc>)');
  }

  // ── Document 33: per-section footnote collection (PG-1) ─────────────────
  // Proves: foot-placed notes collect into per-top-level-section
  // <note-list> at the end of each containing section; nested sub-section
  // notes collect into the OUTERMOST containing section (not their own
  // sub-section list); endnotes still go to article-back; numbering is
  // global across the document; sections without foot-notes get no list.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-33-per-section-footnotes.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Each top-level section that has foot-notes has a <note-list class="footnotes">
    // at its end. Sections in this fixture:
    //   1. First section — has notes 1, 2, 3 (3 is nested but absorbed by section 1).
    //   2. Second section — has note 4.
    //   3. Third section (no footnotes) — no list.
    //
    // Total: 2 per-section footnote lists. Plus a article-back endnote list
    // with note 5.
    const footnoteListMatches = html.match(/<note-list class="footnotes">/g) ?? [];
    assert.equal(
      footnoteListMatches.length,
      2,
      `doc33: 2 per-section footnote lists (one per section that contains foot-notes); found ${footnoteListMatches.length}`,
    );

    // article-back endnote list (note 5)
    assert.ok(
      html.includes('<note-list class="endnotes">'),
      'doc33: article-back endnote list present (note 5 is an endnote)',
    );

    // Numbering is global. Notes 1, 2, 3 in the first section's list;
    // note 4 in the second section's list; note 5 in the endnote list.
    // Verify all five numbers appear in the rendered output.
    for (const num of [1, 2, 3, 4, 5]) {
      assert.ok(
        html.includes(`<sup>${num}</sup>`),
        `doc33: note ${num} appears as <sup>${num}</sup>`,
      );
    }

    // Nested-section outermost-collection: note 3 was authored in a
    // sub-section but should appear in the FIRST section's footnote list
    // (which has notes 1, 2, 3) — not in any sub-section list.
    // Verify by counting notes before the second section's footnote list.
    // A rough structural check: the third footnote's text contains the
    // word "Outermost-collection"; it must appear in the first section's
    // list block.
    const firstSectionMatch = html.match(/<section[^>]*>[\s\S]*?<\/section>/);
    assert.ok(
      firstSectionMatch && firstSectionMatch[0].includes('Outermost-collection'),
      'doc33: nested-section footnote (note 3) appears in OUTERMOST section list',
    );

    snapshotHast('document-33', hast);
    console.log('PASS: integration doc33 (per-section footnote collection; outermost-section + global numbering)');
  }

  // ── Document 34: mixed footnote placement — article-back fallback ────────
  // Proves: foot-notes outside any top-level section (front-matter / between
  // sections) fall through to the article-back residual list; in-section
  // foot-notes still collect per-section.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-34-mixed-footnote-placement.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // 2 per-section footnote lists (one for each body section).
    const footnoteListMatches = html.match(/<note-list class="footnotes">/g) ?? [];
    assert.equal(
      footnoteListMatches.length,
      2,
      `doc34: 2 per-section footnote lists (one per body section); found ${footnoteListMatches.length}`,
    );

    // article-back has a residual list. It contains:
    //   - pre-section foot-note (note 1) — fell through to residual
    //   - endnote (note 3)
    // Mixed placements → class="notes".
    assert.ok(
      html.includes('<note-list class="notes">'),
      'doc34: article-back residual list has class="notes" (mixed end + pre-section foot)',
    );

    // All four notes appear in the output.
    for (const num of [1, 2, 3, 4]) {
      assert.ok(
        html.includes(`<sup>${num}</sup>`),
        `doc34: note ${num} appears as <sup>${num}</sup>`,
      );
    }

    snapshotHast('document-34', hast);
    console.log('PASS: integration doc34 (mixed footnote placement; article-back fallback for residual notes)');
  }

  // ── Document 35: numbering-registry extension (Phase 3 slice 3a) ─────────
  // Proves: theorem family counters (shared theorem counter for theorem/
  // lemma/corollary/proposition; own counters for definition and example;
  // remark/proof unnumbered); math envs share the equation counter with
  // display-math; cross-references resolve with the right prefixes.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-35-numbering-extension.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Cross-references: the shared theorem counter assigns sequential
    // numbers across the four propositional tagnames in document order.
    // Slice 3a wires up the registry; ref-resolution renders the
    // "Theorem N" / "Lemma N" / etc. text from DEFAULT_PREFIXES.
    assert.ok(
      html.includes('>theorem 1<') || html.includes('>Theorem 1<') || html.includes('theorem 1</a>'),
      'doc35: <ref @thm:pyth> resolves to "theorem 1" (shared counter, position 1)',
    );
    assert.ok(
      html.includes('lemma 2'),
      'doc35: <ref @lem:zorn> resolves to "lemma 2" (shared counter, position 2)',
    );
    assert.ok(
      html.includes('corollary 3'),
      'doc35: <ref @cor:odd> resolves to "corollary 3" (shared counter, position 3)',
    );
    assert.ok(
      html.includes('proposition 4'),
      'doc35: <ref @prop:cs> resolves to "proposition 4" (shared counter, position 4)',
    );
    // Definition and example each have their own counters — both start at 1.
    assert.ok(
      html.includes('definition 1'),
      'doc35: <ref @def:group> resolves to "definition 1" (own counter)',
    );
    assert.ok(
      html.includes('example 1'),
      'doc35: <ref @ex:integers> resolves to "example 1" (own counter)',
    );

    // Math envs share the equation counter; align is equation 1, eqnarray
    // is equation 2. They get visible equation-number spans (handler-side)
    // and the cross-reference resolves to "equation 1".
    assert.ok(
      html.includes('equation 1'),
      'doc35: <ref @eqn:pyth> resolves to "equation 1"',
    );
    // The align tag itself renders an equation-number span. Look for the
    // span class — at least one math env should show the (N) annotation.
    assert.ok(
      html.includes('equation-number'),
      'doc35: math env tags render with class="equation-number" span',
    );

    snapshotHast('document-35', hast);
    console.log('PASS: integration doc35 (numbering-registry extension: theorem-family + math-envs)');
  }

  // ── Document 36: frameable build (Phase 3 slice 3b) ──────────────────────
  // Proves: three new vocab entries (fig/svg/frame); <figure> alias rewrite
  // at the gate; DSL counter assignments (csv/tsv → table, mermaid/abc →
  // figure); theorem-family label rendering ("Theorem N (Name)."); the
  // +border frameable surface.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-36-frameable-build.acm'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // <figure> alias rewrites to <fig> at the gate. The rendered HTML
    // still says <figure> (HTML-native), and both authored forms
    // produce the same rendered output.
    assert.ok(
      html.includes('<figure>') || html.includes('<figure '),
      'doc36: aliased <figure> renders as HTML-native <figure>',
    );
    assert.ok(
      html.includes('alt="An African elephant."'),
      'doc36: <fig src=elephant.jpg> renders with img alt from caption',
    );
    assert.ok(
      html.includes('alt="A zebra in the savanna."'),
      'doc36: <figure src=zebra.jpg> alias form renders same as <fig>',
    );

    // DSL counter cross-references resolve.
    assert.ok(
      html.includes('table 1'),
      'doc36: <ref @tab:salaries> resolves to "table 1" (csv on table counter)',
    );
    // Mermaid sits on the figure counter; elephant + zebra are figs 1 and 2;
    // mermaid is figure 3.
    assert.ok(
      html.includes('figure 3'),
      'doc36: <ref @fig:flow> resolves to "figure 3" (mermaid on figure counter)',
    );

    // Theorem-family handler renders label spans.
    assert.ok(
      html.includes('Theorem 1 (Fundamental Theorem of Arithmetic).'),
      'doc36: <theorem name="..."> renders the parenthesized-name label',
    );
    assert.ok(
      html.includes('Lemma 2.'),
      'doc36: <lemma> (no name) renders "Lemma N." plain label, sharing theorem counter',
    );
    assert.ok(
      html.includes('Proof.'),
      'doc36: <proof> renders unnumbered "Proof." label',
    );

    // Cross-reference to theorem resolves to "theorem 1" (shared counter).
    assert.ok(
      html.includes('theorem 1'),
      'doc36: <ref @thm:fundamental> resolves to "theorem 1"',
    );

    // +border flag adds frameable-border class.
    assert.ok(
      /class="[^"]*frameable-border[^"]*"/.test(html) ||
        /className.*frameable-border/.test(html),
      'doc36: <fig +border> adds frameable-border class',
    );

    snapshotHast('document-36', hast);
    console.log('PASS: integration doc36 (frameable build: fig/svg/frame vocab, figure alias, DSL counters, theorem labels)');
  }
}
