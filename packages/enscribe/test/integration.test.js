// Integration tests for the full enscribe pipeline.
//
// These tests run the complete parse → structural-transform → compile pipeline
// on each fixture document, capturing the hast tree (for snapshot comparison)
// and the HTML output (for structural inspection).
//
// Snapshot strategy: on first run, the expected JSON files are written to disk.
// Subsequent runs compare against them. If the files already exist, comparison
// is strict. Set ENSCRIBE_UPDATE_SNAPSHOTS=1 to regenerate.
//
// Note: these are END-TO-END integration tests. They verify the full pipeline
// including fixture parsing, so failures here may trace to any layer.

import assert from 'node:assert/strict';
import process from 'node:process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toHast } from 'mdast-util-to-hast';

import { buildEnscribePipeline, createEnscribeTagHandler, KATEX_CDN_URL, DOCUMENT_FONTS_CDN_URL } from '../src/interpreter/index.js';
import { parseErrorHandler, tagErrorHandler } from '../src/interpreter/handlers/parser-errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const UPDATE = process.env.ENSCRIBE_UPDATE_SNAPSHOTS === '1';

// hast-util-to-html escapes the `&` family-separators in DOCUMENT_FONTS_CDN_URL
// to numeric entities (`&#x26;`), so the raw constant never substring-matches
// serialized HTML. Match the escape-free prefix up to the first `&` instead —
// still distinctive (the Google Fonts css2 Inter request) and robust to whether
// the serializer emits `&#x26;` or `&amp;`.
const FONTS_LINK_PREFIX = DOCUMENT_FONTS_CDN_URL.split('&')[0];

/**
 * Run the full pipeline on a source string and return the hast tree and HTML.
 */
function runPipeline(source, opts = {}) {
  // AUD-17: build the pipeline from the single shared assembly exported by
  // index.js rather than hand-mirroring it here. The former mirror omitted
  // enscribeBookStructuring (added to index.js in slice 4a), so book fixtures
  // captured a pre-book-structuring hast tree.
  const processor = buildEnscribePipeline(opts);

  // HTML from the real pipeline's compile step.
  const html = String(processor.processSync(source));

  // Intermediate hast for snapshot inspection: re-run parse + the structural
  // transforms (runSync stops before the compiler) to get the fully-transformed
  // mdast — the same tree the compiler's toHast consumes — then convert it with
  // the same handlers. This captures the pre-asset-injection hast (no font /
  // KaTeX / hover-preview nodes, no rehype-format), matching the prior snapshot.
  const transformed = processor.runSync(processor.parse(source));
  const hast = toHast(transformed, {
    handlers: {
      enscribeTag: createEnscribeTagHandler(opts),
      enscribeParseError: parseErrorHandler,
      enscribeTagError: tagErrorHandler,
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
  // ── Document 3: Edge cases ─────────────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-3-edge-cases.emd'), 'utf8');
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
    // Document fonts linked (external-by-default); no KaTeX CSS when there's no math.
    assert.ok(html.includes(FONTS_LINK_PREFIX), 'doc3: document fonts linked (external-by-default)');
    assert.ok(!html.includes('.katex'), 'doc3: no KaTeX CSS injected (no math)');

    snapshotHast('document-3', hast);
    console.log('PASS: integration doc3 (edge cases)');
  }

  // ── Document 4: Math minimal ────────────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-4-math-minimal.emd'), 'utf8');
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
    // Math present → KaTeX CSS linked (external-by-default).
    assert.ok(html.includes(KATEX_CDN_URL), 'doc4: KaTeX CSS linked (external-by-default)');

    snapshotHast('document-4', hast);
    console.log('PASS: integration doc4 (math minimal)');
  }

  // ── Document 5: Linear regression ──────────────────────────────────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-5-linear-regression.emd'), 'utf8');
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
    // Math present → KaTeX CSS linked (external-by-default).
    assert.ok(html.includes(KATEX_CDN_URL), 'doc5: KaTeX CSS linked (external-by-default)');

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
    const src = readFileSync(join(FIXTURES_DIR, 'document-6-cross-references.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-7-tables.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-8-citations.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-10-shortcuts.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-11-bare-math.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc11: article structure present');

    // Inline math renders to <inline-math> — both bare and authored sigil form.
    assert.ok(html.includes('<inline-math>'), 'doc11: <inline-math> elements present');

    // Display math renders to <display-math>.
    assert.ok(html.includes('<display-math>'), 'doc11: <display-math> elements present');

    // KaTeX wraps output in <span class="katex">.
    assert.ok(html.includes('class="katex"'), 'doc11: KaTeX output present');

    // hasMathElements fires → KaTeX CSS linked (external-by-default, bare math document).
    assert.ok(html.includes(KATEX_CDN_URL), 'doc11: KaTeX CSS linked (external-by-default, bare math triggers hasMathElements)');

    // The aside content contains inline math (two-surface normalization check).
    assert.ok(html.includes('<aside'), 'doc11: <aside> rendered');  // #31: aside now frameable (carries class)

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
    const src = readFileSync(join(FIXTURES_DIR, 'document-12-bare-table.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc12: article structure present');

    // Bare pipe tables are normalized to <table> enscribeTag nodes and
    // rendered via the table handler. Expect HTML <table> elements in output.
    assert.ok(html.includes('<table'), 'doc12: <table> element present');

    // The top-level table has a row for "Force", "Mass", "Acceleration".
    assert.ok(html.includes('Force'), 'doc12: Force row present');
    assert.ok(html.includes('Mass'), 'doc12: Mass row present');

    // The aligned table has columns A, B, C, D.
    assert.ok(html.includes('>A<'), 'doc12: aligned table A cell present');

    // #280: bare GFM body cells CARRY their parsed inline markup (no serialize → re-parse
    // round-trip that flattened it). Emphasis, strong, inline code, and inline math all survive.
    assert.ok(html.includes('<td><i>stressed</i> and <b>strong</b></td>'),
      'doc12: body-cell emphasis/strong preserved');
    assert.ok(html.includes('<td><code>f(x)</code></td>'), 'doc12: body-cell inline code preserved');
    assert.ok(/<td><inline-math>.*katex/.test(html), 'doc12: body-cell inline math rendered');
    // A cross-reference in a cell resolves (the carried cell mdast is reached by the ref pass).
    assert.ok(html.includes('<a href="#sec:markup-cells" class="ref">Inline markup in cells</a>'),
      'doc12: cross-reference inside a body cell resolves');
    // Header markup is the one residual flatten (the headers model is text-only): the
    // `*…*` emphasis renders as plain header text, not an <i>.
    assert.ok(html.includes('<th>Header markup is dropped</th>'), 'doc12: header markup flattened to text');
    assert.ok(!/<th><i>/.test(html), 'doc12: no markup element survives in a header cell');

    snapshotHast('document-12', hast);
    console.log('PASS: integration doc12 (bare pipe table normalization — both surfaces)');
  }

  // ── Document 13: Code-block cross-references (G4, PG-6) ──────────────────
  // Exercises code-block sigil nodes with colon-ids:
  //   - <``` python #code:hello | ... ```> registers in the label index
  //   - <ref @code:hello> resolves to a __ref-marker (not __ref-error)
  //   - <ref @code:missing> still produces a ref-error marker
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-13-code-refs.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-14-hash-sigil-headings.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Dispatch: hash sigils produce real sections, not unknown-element spans.
    assert.ok(html.includes('<article>'), 'doc14: article structure present');
    assert.ok(html.includes('<section>'), 'doc14: <section> element from <# … #>');
    assert.ok(html.includes('<section-title>'), 'doc14: <section-title> extracted');
    assert.ok(html.includes('<sub-section>'), 'doc14: <sub-section> from <## … ##>');
    assert.ok(html.includes('<sub-section-title>'), 'doc14: <sub-section-title> extracted');
    assert.ok(html.includes('<sub-sub-section>'), 'doc14: <sub-sub-section> from <### … ###>');
    assert.ok(html.includes('<sub-sub-section-title>'), 'doc14: <sub-sub-section-title> extracted');
    assert.ok(!html.includes('data-enscribe-unknown'), 'doc14: no unknown-element fallback span');

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
    const src = readFileSync(join(FIXTURES_DIR, 'document-15-bare-headings.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-16-section-form-convergence.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-18-config-edge-cases.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-19-config-unknown-kwargs.emd'), 'utf8');
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
  //     principles.md): enscribeParseError nodes (produced by the grammar
  //     for malformed escape sequences, etc.) now render as visible
  //     <span class="parse-error">??parse: …??</span> markers in the house
  //     style of unresolved refs / cites.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-17-parser-edge-cases.emd'), 'utf8');
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
    // produces an enscribeParseError; the new handler renders it as a
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-20-apparatus-reconciliation.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-21-meta-kwargs-and-children.emd'), 'utf8');
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
    const src = readFileSync(join(FIXTURES_DIR, 'document-22-apparatus-positioning.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc22: article still renders despite misplaced apparatus');
    assert.ok(html.includes('A correctly-placed body section'),
      'doc22: pre-violation content renders');
    assert.ok(html.includes('Surrounding content continues'),
      'doc22: post-violation content renders');
    assert.ok(html.includes('<aside'),
      'doc22: the aside containing the misplaced apparatus still renders');

    snapshotHast('document-22', hast);
    console.log('PASS: integration doc22 (apparatus-tag mid-body positioning warning)');
  }

  // ── Document 23: multi-paragraph tag content (Option A, part 1) ───────────
  // Pins Option A's allow-multi-paragraph-tag-content half. A blank line
  // inside <aside | ...> is a paragraph break, not a terminator — the aside
  // must produce two paragraph children in the rendered output. RC-6 in
  // packages/enscribe/test/test-recursive.js covers this at the parser level;
  // this fixture covers the full integration pipeline end-to-end.
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-23-multi-paragraph-tag-content.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc23: article structure present');
    assert.ok(html.includes('<aside'), 'doc23: aside renders (not consumed as error)');
    assert.ok(!html.includes('class="tag-error"'),
      'doc23: no tag-error marker — blank line did not terminate the aside');

    // The aside content must contain two paragraphs.
    const asideSlice = html.substring(html.indexOf('<aside'), html.indexOf('</aside>'));
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
  // EOF and from-markdown.js stamps enscribeTagError. The Phase 2 slice 1
  // tagErrorHandler renders it as a visible <span class="tag-error">??tag:
  // …??</span> marker at the open position. The document still renders
  // (always-renders guarantee).
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-24-unclosed-tag-at-eof.emd'), 'utf8');
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

  // ── Document 27: <author> structured-interface reconciliation ──────────────
  // Proves kwarg form and child-tag form of <author> normalize to
  // equivalent Layer 1 structures, and the unknown-kwarg path warns + drops.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-27-author-structured-interface.emd'),
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
      !html.includes('data-enscribe-unknown="name"'),
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
      join(FIXTURES_DIR, 'document-28-deferred-vocab-sub2.emd'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Each of the seven elements appears as a real tag in the output.
    // The dl block contributes <dl>, <dt>, <dd>.
    assert.ok(html.includes('<dl>'), 'doc28: <dl> renders as a real element');
    assert.ok(
      html.includes('<dt>enscribe</dt>'),
      'doc28: <dt> renders with its term content',
    );
    // #326: <dd> is flow — its single-paragraph description keeps its <p>
    // (a block, so the formatter breaks it across lines). <dt> stays phrasing.
    assert.ok(
      /<dd>\s*<p>An academic publishing system built on HTML\+CSS\+JS\.<\/p>\s*<\/dd>/.test(html),
      'doc28: <dd> renders with its description content',
    );

    // The glossary block contributes <glossary>, <glossary-entry>, and
    // additional <dt>/<dd> inside each entry.
    assert.ok(
      html.includes('<glossary id="project-terms">'),
      'doc28: <glossary> renders with its id',
    );
    assert.ok(
      html.includes('<glossary-entry id="term:enscribe">'),
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
        !html.includes(`data-enscribe-unknown="${tag}"`),
        `doc28: <${tag}> renders as a real element (no unknown-span fallback)`,
      );
    }

    snapshotHast('document-28', hast);
    console.log('PASS: integration doc28 (deferred-vocab sub-slice 2 structural blocks render)');
  }

  // ── Document 30: Phase 2 slice 2a — CSV/TSV handlers + <code> long-form fix ──
  // Proves: <csv> and <tsv> standalone tags render as real <table> elements
  // (matching the qualifying form's output); <code> long-form's body content
  // renders (the pre-fix bug was the schema dispatch dropping opaque content).
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-30-csv-tsv-code-handlers.emd'),
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

    // No data-enscribe-unknown spans for any of the three tags.
    for (const tag of ['csv', 'tsv', 'code']) {
      assert.ok(
        !html.includes(`data-enscribe-unknown="${tag}"`),
        `doc30: <${tag}> renders as a real element (no unknown-span fallback)`,
      );
    }

    snapshotHast('document-30', hast);
    console.log('PASS: integration doc30 (Phase 2 slice 2a — CSV/TSV handlers + <code> long-form fix)');
  }

  // ── Document 33: per-section footnote collection (PG-1) ─────────────────
  // Proves: foot-placed notes collect into per-top-level-section
  // <note-list> at the end of each containing section; nested sub-section
  // notes collect into the OUTERMOST containing section (not their own
  // sub-section list); endnotes still go to article-back; numbering is
  // global across the document; sections without foot-notes get no list.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-33-per-section-footnotes.emd'),
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
      join(FIXTURES_DIR, 'document-34-mixed-footnote-placement.emd'),
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
      join(FIXTURES_DIR, 'document-35-numbering-extension.emd'),
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
      join(FIXTURES_DIR, 'document-36-frameable-build.emd'),
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

  // ── Document 37: caption-as-content + unified helper (Phase 3 slice 3c) ───
  // Proves: <caption> as a child tag; caption= kwarg lifts to child-tag
  // at the gate; title= wiring; frame opt-in numbering via +numbered.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-37-caption-as-content.emd'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Formatted caption (emphasis) renders via child-tag form. The
    // single-paragraph unwrap should preserve the <em> element inside
    // the figcaption. Phase 3 slice 3c: bare-markdown `*em*` lifts to
    // `<i>` (not `<em>`) via the normalize-to-canonical gate's
    // stylistic-vs-semantic ruling — so the assertion looks for `<i>`.
    assert.ok(
      /<figcaption[^>]*>[\s\S]*<i>Serengeti National Park<\/i>[\s\S]*<\/figcaption>/.test(html) ||
        html.includes('Serengeti National Park'),
      'doc37: <fig><caption | text with *em*></caption></fig> renders formatted caption (em → i per the gate)',
    );

    // Kwarg form lifts and renders identically (plain-text).
    assert.ok(
      html.includes('A zebra in the savanna.'),
      'doc37: <fig caption="..."> lifts to child-tag and renders the caption text',
    );

    // Frame opt-in: +numbered frame gets a number; unnumbered frame
    // doesn't. doc37's setup: zebra is figure 1 (default-numbered),
    // method frame is figure 2 (+numbered opt-in), opt-in frame is
    // figure 3 (+numbered opt-in). Plain frame is unregistered.
    assert.ok(
      /Figure 2/.test(html),
      'doc37: <frame +numbered #fig:method> registers as figure 2',
    );
    assert.ok(
      html.includes('figure 2'),
      'doc37: <ref @fig:method> resolves to "figure 2"',
    );

    // Title wiring: <fig title="..."> renders the title above the
    // figure body. The unified helper places title at top via
    // <figcaption class="title">.
    assert.ok(
      /<figcaption[^>]*class="title"[^>]*>Figure title<\/figcaption>/.test(html) ||
        /"className":\s*\[\s*"title"\s*\][\s\S]*Figure title/.test(JSON.stringify(hast)),
      'doc37: <fig title="..."> renders a class="title" figcaption with the title text',
    );

    snapshotHast('document-37', hast);
    console.log('PASS: integration doc37 (caption-as-content + unified helper: child-tag captions, kwarg lift, title wiring, frame opt-in numbering)');
  }

  // ── Document 38: book structure (Phase 4 slice 4a) ───────────────────────
  // Proves: enscribeBookStructuring wraps the tree in <book>/book-front/
  // book-body/book-back; book-parts route by type (preface→front,
  // chapter→body, appendix→back); per-chapter counter resets with
  // chapter-prefix cross-references; per-chapter footnote collection;
  // per-book-part authorship for edited-volume case.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-38-book-structure.emd'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Book wrapper exists.
    assert.ok(
      html.includes('<book>') || /<book[ >]/.test(html),
      'doc38: <book> wrapper produced by enscribeBookStructuring',
    );

    // Book-body, book-front, book-back all present.
    assert.ok(html.includes('<book-front>'), 'doc38: <book-front> present (contains <meta> + preface)');
    assert.ok(html.includes('<book-body>'), 'doc38: <book-body> present (contains chapters)');
    assert.ok(html.includes('<book-back>'), 'doc38: <book-back> present (contains appendix)');

    // Book-parts present with correct types.
    assert.ok(
      /<book-part[^>]+book-part-type="chapter"/.test(html),
      'doc38: chapter book-parts have book-part-type="chapter"',
    );
    assert.ok(
      /<book-part[^>]+book-part-type="preface"/.test(html),
      'doc38: preface routed via book-part-type="preface"',
    );
    assert.ok(
      /<book-part[^>]+book-part-type="appendix"/.test(html),
      'doc38: appendix routed via book-part-type="appendix"',
    );

    // Per-chapter counter resets → chapter-prefix cross-references.
    // First chapter's figure is "figure 1.1"; second chapter's figure
    // is "figure 2.1" (chapter resets).
    assert.ok(
      html.includes('figure 1.1'),
      'doc38: <ref @fig:intro> resolves to "figure 1.1" (chapter 1, figure 1)',
    );
    assert.ok(
      html.includes('figure 2.1'),
      'doc38: <ref @fig:method> resolves to "figure 2.1" (chapter 2, figure 1)',
    );
    assert.ok(
      html.includes('equation 1.1'),
      'doc38: <ref @eqn:intro> resolves to "equation 1.1"',
    );

    // Per-chapter footnote collection: each chapter / book-part with
    // notes gets its own <note-list> at its end. With default note
    // placement (`end`), the chapter-scope rule collects them as
    // chapter-end notes — class derived from listClassFor (endnotes
    // for end-only buckets, footnotes for foot-only, notes for mixed).
    // The book has 5 default-placement notes spread across 4 book-parts.
    const perChapterListMatches = html.match(/<note-list class="(footnotes|endnotes|notes)">/g) ?? [];
    assert.ok(
      perChapterListMatches.length >= 3,
      `doc38: at least 3 per-book-part note lists; found ${perChapterListMatches.length}`,
    );

    // Per-book-part authorship: the methods chapter has a chapter-level
    // <author>. Verify it appears in the chapter's <meta>.
    assert.ok(
      html.includes('Guest Author'),
      'doc38: per-chapter <author> ("Guest Author") preserved in the methods chapter',
    );

    snapshotHast('document-38', hast);
    console.log('PASS: integration doc38 (book structuring: book/front/body/back wrapping, chapter/preface/appendix routing, per-chapter counter resets, chapter-prefix cross-refs, per-chapter footnotes, per-book-part authorship)');
  }

  // ── Document 44: alpha cross-feature stress monograph (Phase 6) ──────────
  // The alpha integration check's single cross-feature artifact. Combines, in
  // one short book, the surface no other fixture exercises together: book
  // structure (preface / chapters / appendix + edited-volume per-chapter
  // author), a <library> bibliography with <cite> cross-refs resolving INSIDE
  // a book (the Phase 6 book-bibliography fix — buildCitationIndex now finds
  // <data> nested in book-body, and bibliography.js places the reference list
  // into book-back), external DSLs (mermaid + abc), the theorem family
  // (theorem / proof / definition), math in all three forms (display sigil,
  // inline, align env), frameables (fig + CSV table), and per-chapter
  // footnotes honoring the book default note-scope=chapter.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-44-cross-feature-monograph.emd'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    // Book wrapping + region routing (same surface as doc-38).
    assert.ok(/<book[ >]/.test(html), 'doc44: <book> wrapper');
    assert.ok(html.includes('<book-front>'), 'doc44: <book-front> present');
    assert.ok(html.includes('<book-body>'), 'doc44: <book-body> present');
    assert.ok(html.includes('<book-back>'), 'doc44: <book-back> present');
    assert.ok(/book-part-type="preface"/.test(html), 'doc44: preface → book-front');
    assert.ok(/book-part-type="chapter"/.test(html), 'doc44: chapters → book-body');
    assert.ok(/book-part-type="appendix"/.test(html), 'doc44: appendix → book-back');

    // Edited-volume: chapter 2 carries its own <author>.
    assert.ok(html.includes('Guest Author'), 'doc44: per-chapter <author> (edited-volume)');

    // Bibliography INSIDE a book (Phase 6 fix). The <library> lives in <data>
    // nested in book-body; cites must resolve, and the reference list must
    // land in book-back. Before the fix the cite rendered as an empty
    // <cite></cite> and no <bibliography> was emitted.
    assert.ok(
      html.includes('<cite class="cite" data-keys="Benson2007">'),
      'doc44: <cite @Benson2007> resolves in a book (empty <cite></cite> before the fix)',
    );
    assert.ok(
      html.includes('data-keys="Sethares1993"'),
      'doc44: <cite @Sethares1993> resolves',
    );
    assert.ok(html.includes('<bibliography>'), 'doc44: <bibliography> rendered');
    assert.ok(html.includes('id="ref-Benson2007"'), 'doc44: bib entry id for Benson2007');
    assert.ok(html.includes('id="ref-Sethares1993"'), 'doc44: bib entry id for Sethares1993');
    // The reference list is placed in book-back, after the appendix book-part.
    const backIdx = html.indexOf('<book-back>');
    const appendixIdx = html.indexOf('Notation and Sources');
    const bibIdx = html.indexOf('<bibliography>');
    assert.ok(backIdx >= 0 && bibIdx > backIdx, 'doc44: <bibliography> sits inside book-back');
    assert.ok(appendixIdx >= 0 && bibIdx > appendixIdx, 'doc44: bibliography follows the appendix');

    // Theorem family.
    assert.ok(/<theorem[ >]/.test(html), 'doc44: <theorem> rendered');
    assert.ok(/<proof[ >]/.test(html), 'doc44: <proof> rendered');
    assert.ok(/<definition[ >]/.test(html), 'doc44: <definition> rendered');

    // Math: KaTeX for inline + display; equation numbering for the display
    // sigil and the align env.
    assert.ok(html.includes('katex'), 'doc44: KaTeX output present');
    assert.ok(html.includes('equation'), 'doc44: equation numbering present');

    // Frameables: a <fig> and a CSV table.
    assert.ok(html.includes('<figure'), 'doc44: <fig> renders as <figure>');
    assert.ok(/<table[ >]/.test(html), 'doc44: <csv> renders a <table>');

    // External DSLs.
    assert.ok(html.includes('mermaid'), 'doc44: <mermaid> DSL present');
    assert.ok(html.includes('abc'), 'doc44: <abc> DSL present');

    // Chapter-prefixed cross-references (per-chapter counter resets): the
    // figures in chapter 3 are "figure 3.N"; the CSV table in chapter 2 is
    // "table 2.N".
    assert.ok(/figure 3\.\d+/.test(html), 'doc44: chapter-prefixed figure cross-ref (figure 3.N)');
    assert.ok(/table 2\.\d+/.test(html), 'doc44: chapter-prefixed table cross-ref (table 2.N)');

    // Per-chapter footnotes (book default note-scope=chapter): one note-list
    // per book-part that has notes (preface + 3 chapters + appendix = 5).
    const noteListMatches = html.match(/<note-list class="(footnotes|endnotes|notes)">/g) ?? [];
    assert.ok(
      noteListMatches.length >= 5,
      `doc44: per-book-part note lists (expected >= 5, found ${noteListMatches.length})`,
    );

    // No parser / cite / tag errors leaked into the output.
    assert.ok(!html.includes('??parse'), 'doc44: no parse-error markers');
    assert.ok(!html.includes('??cite'), 'doc44: no unresolved-cite markers');
    assert.ok(!html.includes('??tag'), 'doc44: no tag-error markers');

    snapshotHast('document-44', hast);
    console.log('PASS: integration doc44 (alpha cross-feature stress: book + bibliography + DSLs + theorem family + math + frameables + per-chapter notes)');
  }

  // ── Document 47: abc static mode (DSL Slice 2) ─────────────────────────────
  // The one fixture compiled with abcMode:'static'. It proves the build-time
  // path end-to-end: each <abc> contract element is REPLACED (not wrapped) by
  // inline SVG rendered at compile time via abcjs + jsdom, with no client-side
  // abcjs dependency at view time. Predicates RQ-DSL-STATIC-M1/M2/O1 in
  // notes/specs/render-quality.md §9.
  //
  // The SNAPSHOT is pre-compile (it captures the <pre> contract, like every
  // other fixture) — the static replacement happens in the compiler and is
  // asserted on the compiled `html` below, not in the hast snapshot.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-47-abc-static.emd'),
      'utf8',
    );
    const { html, hast } = runPipeline(src, { abcMode: 'static' });

    // M1: the abc contract is GONE — no <pre class="abc"> wrapper and no
    // data-enscribe-dsl="abc" marker survive into the static output.
    assert.ok(
      !/<pre[^>]*class="abc"/.test(html),
      'doc47: no <pre class="abc"> contract remains (replaced by SVG)',
    );
    assert.ok(
      !html.includes('data-enscribe-dsl="abc"'),
      'doc47: no data-enscribe-dsl="abc" marker remains (contract fully replaced)',
    );

    // M1: each abc block is replaced by an inline <svg> carrying the static
    // class. The fixture has two abc blocks → exactly two such <svg> elements.
    const renderedSvgs = html.match(/<svg class="enscribe-abc-rendered"/g) ?? [];
    assert.equal(
      renderedSvgs.length,
      2,
      `doc47: two <svg class="enscribe-abc-rendered"> (one per abc block); got ${renderedSvgs.length}`,
    );

    // Rendering actually happened (not an empty placeholder): abcjs draws the
    // tune title (T: field) as <text> inside the SVG. "C Major Scale" can only
    // appear in the output if the contract source was rendered — the verbatim
    // source line "T:C Major Scale" is gone with the replaced contract.
    assert.ok(
      html.includes('C Major Scale'),
      'doc47: rendered SVG contains the tune title (abcjs drew the T: field)',
    );

    // M2: the id-bearing abc block (#music:c-scale) carries its id onto the
    // <svg>; the anonymous block does not. So exactly one rendered SVG has an id.
    assert.ok(
      /<svg class="enscribe-abc-rendered" id="music:c-scale"/.test(html),
      'doc47: id-bearing abc block preserves its id on the <svg> (cross-ref survives)',
    );
    const idBearingSvgs = html.match(/<svg class="enscribe-abc-rendered" id=/g) ?? [];
    assert.equal(
      idBearingSvgs.length,
      1,
      `doc47: only the id-bearing block carries an id on its <svg>; got ${idBearingSvgs.length}`,
    );

    // O1: static output is self-contained — no client-side JS. abc static mode
    // injects neither the abcjs bundle/CDN nor an init script, and this document
    // has no math / notes / refs / cites, so there is no <script> at all.
    assert.ok(
      !html.includes('ABCJS.renderAbc'),
      'doc47: no abcjs init script (static mode needs no view-time JS)',
    );
    assert.ok(
      !html.includes('<script'),
      'doc47: no <script> elements at all (static notation works offline)',
    );

    // Surrounding prose is untouched by the replacement pass.
    assert.ok(
      html.includes('Surrounding prose continues to render normally'),
      'doc47: prose around the abc blocks renders normally',
    );

    snapshotHast('document-47', hast);
    console.log('PASS: integration doc47 (abc static mode — build-time SVG, no view-time JS)');
  }

  // ── Document 48: Pipe-form inline/display math & code-span escapes ──────────
  // Regression fixture for the bug-fix arc (Slice C). LaTeX backslash commands
  // inside inline math, display math, and code spans must survive the inner
  // parser's escape processing when they appear in PIPE-FORM named-tag content
  // (<tag | …>). Before the OpaqueSpan grammar rule, \in / \mathbb / \sqrt / \pi
  // were read as escape sequences, emitting parse-error markers and swallowing
  // the surrounding prose into a broken math span. Block-form and sigil-form
  // already worked; pipe-form named-tag content was the remaining gap.
  {
    const src = readFileSync(
      join(FIXTURES_DIR, 'document-48-pipe-form-inline-math.emd'),
      'utf8',
    );
    const { html, hast } = runPipeline(src);

    assert.ok(html.includes('<article>'), 'doc48: article structure present');

    // No parse errors leaked. The bare substring "parse-error" DOES appear in
    // the output — in the fixture's own prose, which describes the pre-fix bug —
    // so the assertion targets the specific error markers, not the substring.
    assert.ok(
      !html.includes('class="parse-error"'),
      'doc48: no parse-error spans (backslash commands survived escape processing)',
    );
    assert.ok(
      !html.includes('??parse:'),
      'doc48: no ??parse: error markers in output',
    );

    // Inline math inside pipe-form statement bodies renders to <inline-math>,
    // and the LaTeX source is intact (KaTeX did not emit an error span).
    assert.ok(html.includes('<inline-math>'), 'doc48: inline math rendered in pipe-form content');
    assert.ok(html.includes('class="katex"'), 'doc48: KaTeX output present');
    assert.ok(
      !html.includes('katex-error'),
      'doc48: no KaTeX error (LaTeX commands \\in \\mathbb \\sqrt \\circ survived intact)',
    );

    // Display math authored as a multi-line fence inside a pipe-form aside
    // renders to <display-math> (the OpaqueSpan $$…$$ branch, backslashes intact).
    assert.ok(
      html.includes('<display-math>'),
      'doc48: display-math fence rendered in pipe-form aside (\\pi survived)',
    );

    // Code-span backslashes survive verbatim — single- and double-backtick forms.
    assert.ok(
      html.includes('C:\\Users\\me\\AppData\\Local'),
      'doc48: single-backtick code span preserves Windows-path backslashes',
    );
    assert.ok(
      html.includes('\\d+-\\d+'),
      'doc48: double-backtick code span preserves regex backslashes',
    );

    // Statement tags and asides rendered their (recursively-parsed) bodies.
    assert.ok(html.includes('<definition'), 'doc48: <definition> rendered');
    assert.ok(html.includes('<lemma'), 'doc48: <lemma> rendered');
    assert.ok(html.includes('<remark'), 'doc48: <remark> rendered');
    assert.ok(html.includes('<aside'), 'doc48: <aside> rendered');

    // The surrounding prose was NOT swallowed into a math span — fragments on
    // both sides of the math survive, the visible symptom the fix removes.
    assert.ok(
      html.includes('asymptotic upper bound'),
      'doc48: prose after inline math survives (not swallowed into a math span)',
    );
    assert.ok(
      html.includes('economy'),
      'doc48: prose after the display-math fence survives',
    );

    snapshotHast('document-48', hast);
    console.log('PASS: integration doc48 (pipe-form inline/display math + code-span escapes — bug-fix arc Slice C)');
  }

  // ── Document 49: Callout types (#31 — rendered regression guard) ────────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-49-callout-types.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Each admonition type renders a typed <aside> carrying its data-aside-type
    // (the per-type callout CSS in default.css keys off exactly this attribute)
    // and the frameable-border box class.
    for (const t of ['note', 'warning', 'tip', 'info', 'caution', 'sidebar']) {
      assert.ok(
        html.includes(`data-aside-type="${t}"`),
        `doc49: <aside type=${t}> carries data-aside-type="${t}"`,
      );
    }
    assert.ok(html.includes('<aside'), 'doc49: asides rendered');
    assert.ok(html.includes('class="frameable-border"'), 'doc49: asides carry the border box');

    // The boxed-prose title/caption hooks: a titled/captioned aside renders
    // <p class="title"> (top) and <p class="caption"> (bottom) — the shared
    // .title / .caption styling hooks (RQ-FRM-S5 / S6).
    assert.ok(html.includes('<p class="title">'), 'doc49: aside title is <p class="title">');
    assert.ok(html.includes('<p class="caption">'), 'doc49: aside caption is <p class="caption">');

    // The numbered aside joins the "Box" series.
    assert.ok(html.includes('Box 1'), 'doc49: numbered aside is "Box 1"');

    snapshotHast('document-49', hast);
    console.log('PASS: integration doc49 (callout types — typed asides + box counter)');
  }

  // ── Document 50: Frame border looks (#58 — border=<name> named looks) ───────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-50-border-looks.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // border=<name> adds a `frameable-border-<name>` modifier alongside the base
    // `frameable-border` class (the existing border mechanism, extended — not a
    // parallel path), and implies border-on.
    for (const look of ['accent', 'thick', 'dashed', 'subtle']) {
      assert.ok(
        html.includes(`class="frameable-border frameable-border-${look}"`),
        `doc50: <frame border=${look}> emits frameable-border + frameable-border-${look}`,
      );
    }
    // A named look works on the aside border surface too (not just <frame>).
    assert.ok(
      html.includes('<aside class="frameable-border frameable-border-accent">'),
      'doc50: <aside border=accent> gets the look on its frameable border surface',
    );
    // A plain frame keeps exactly the base class — no modifier (byte-identical
    // to pre-#58 output for frames without a named look).
    // #326: <frame> is flow — its single-paragraph body keeps its <p>.
    assert.ok(
      /<figure class="frameable-border">\s*<p>A plain frame/.test(html),
      'doc50: plain <frame> is unchanged (frameable-border only, no modifier)',
    );

    snapshotHast('document-50', hast);
    console.log('PASS: integration doc50 (frame border looks — border=<name>)');
  }

  // ── #186: border=false / border="false" turn the border OFF, like -border ───
  // Inline-rendered (no fixture / no snapshot) so this stays output-neutral on the
  // committed fixtures. The parser stores every key=value kwarg as a string, so the
  // bareword `border=false` and the quoted `border="false"` are indistinguishable
  // downstream — BOTH were ignored before #186 (only `-border` worked). All four
  // spellings must now agree: no frameable-border class.
  {
    const hasBorder = (src) => /frameable-border/.test(runPipeline(src).html);

    assert.ok(!hasBorder('<frame border="false" | x>'),
      'doc186: <frame border="false"> renders with no border (quoted string form)');
    assert.ok(!hasBorder('<frame border=false | x>'),
      'doc186: <frame border=false> renders with no border (bareword form, also fixed)');
    assert.ok(!hasBorder('<frame -border | x>'),
      'doc186: <frame -border> renders with no border (canonical boolean, unchanged)');
    assert.ok(!hasBorder('<aside border="false" | x>'),
      'doc186: <aside border="false"> renders with no border (aside surface too)');

    // Regression guards: the default is still ON, border="true" is still ON, and a
    // named look (border=accent) still renders (its value is neither true nor false).
    assert.ok(hasBorder('<frame | x>'),
      'doc186: <frame> default border stays ON');
    assert.ok(hasBorder('<frame border="true" | x>'),
      'doc186: <frame border="true"> stays ON');
    assert.ok(/frameable-border-accent/.test(runPipeline('<frame border=accent | x>').html),
      'doc186: <frame border=accent> still emits its named look (not read as a false toggle)');
    console.log('PASS: integration doc186 (border=false / "false" turn the border off, aligned with -border)');
  }

  // ── Document 51: article section numbering (#57; number-sections on) ────────
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-51-section-numbering.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Build-time hierarchical numbers, emitted as <span class="section-number">.
    assert.ok(html.includes('<section-title><span class="section-number">1</span>'),
      'doc51: first section numbered 1');
    assert.ok(html.includes('<sub-section-title><span class="section-number">1.1</span>'),
      'doc51: nested sub-section numbered 1.1');
    assert.ok(html.includes('<section-title><span class="section-number">2</span>'),
      'doc51: second section numbered 2');
    // Cross-ref to a numbered section renders the number (one registry).
    assert.ok(html.includes('class="ref">section 2</a>'),
      'doc51: <ref @sec:methods> renders "section 2"');

    snapshotHast('document-51', hast);
    console.log('PASS: integration doc51 (article section numbering)');
  }

  // ── Document 52: book numbering — chapter/appendix headings + sections (#57) ─
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-52-book-numbering.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Book defaults on: chapter heading arabic, appendix heading alphabetic;
    // sections chapter-/appendix-prefixed.
    assert.ok(html.includes('<book-part-title><span class="section-number">1</span>'),
      'doc52: chapter heading numbered 1');
    assert.ok(html.includes('<section-title><span class="section-number">1.1</span>'),
      'doc52: chapter section numbered 1.1');
    assert.ok(html.includes('<sub-section-title><span class="section-number">1.1.1</span>'),
      'doc52: nested sub-section numbered 1.1.1');
    assert.ok(html.includes('<book-part-title><span class="section-number">A</span>'),
      'doc52: appendix heading lettered A');
    assert.ok(html.includes('<section-title><span class="section-number">A.1</span>'),
      'doc52: appendix section numbered A.1');
    // Cross-refs to book-parts (registered) and a chapter-prefixed section.
    assert.ok(html.includes('class="ref">appendix A</a>'), 'doc52: ref → "appendix A"');
    assert.ok(html.includes('class="ref">chapter 1</a>'), 'doc52: ref → "chapter 1"');
    assert.ok(html.includes('class="ref">section 1.1.1</a>'), 'doc52: ref → "section 1.1.1"');

    snapshotHast('document-52', hast);
    console.log('PASS: integration doc52 (book numbering — chapters, appendix, sections)');
  }

  // --- doc53: show-source disclosure (#19) ---
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-53-show-source.emd'), 'utf8');

    // The `html` here goes through the real compiler, which reads `show-source`
    // from the document <config> (NOT from render opts) — so this `html` is
    // config-driven. The render option of the same name is passed only so the
    // harness's *separate* snapshot-hast toHast (which reads handler opts, not
    // the document config) reflects the same disclosure the compile emits.
    const { html, hast } = runPipeline(src, { showSource: true });

    // One native <details> "See source" disclosure per DSL block (mermaid + abc).
    assert.equal((html.match(/<details class="enscribe-source">/g) || []).length, 2,
      'doc53: one source disclosure per DSL block (mermaid + abc)');
    assert.ok(html.includes('<summary>See source</summary>'),
      'doc53: the disclosure control is a <summary>See source</summary>');
    // It holds the VERBATIM authored source in a PLAIN <pre> (no mermaid/abc
    // class, no data-enscribe-dsl) — so the live scanner / static renderer never
    // overwrite it.
    assert.ok(/<details class="enscribe-source">\s*<summary>See source<\/summary>\s*<pre>graph LR/.test(html),
      'doc53: the mermaid disclosure holds the verbatim source in a plain <pre>');
    // The rendered diagram blocks themselves are still emitted unchanged.
    assert.ok(html.includes('class="mermaid" data-enscribe-dsl="mermaid"'),
      'doc53: the rendered mermaid block is still emitted');
    assert.ok(html.includes('class="abc" data-enscribe-dsl="abc"'),
      'doc53: the rendered abc block is still emitted');

    // The documented surface is the <config> switch: config alone (no render
    // opt — compileToHtml never consults an opts.showSource) drives the disclosure.
    const { html: htmlConfigOnly } = runPipeline(src);
    assert.ok(htmlConfigOnly.includes('<details class="enscribe-source">'),
      'doc53: <config show-source=true> alone turns the disclosure on');

    snapshotHast('document-53', hast);
    console.log('PASS: integration doc53 (show-source disclosure — mermaid + abc)');
  }

  // --- doc54: ToC sidebar + scroll-spy (#20) ---
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-54-toc-scrollspy.emd'), 'utf8');
    // Rendered WITH the ToC sidebar on (the documented trigger for scroll-spy).
    const { html, hast } = runPipeline(src, { toc: true });

    // The ToC sidebar is emitted, with nested entries linking to section ids.
    assert.ok(html.includes('class="enscribe-toc"'), 'doc54: the ToC sidebar is rendered');
    assert.ok(html.includes('href="#sec:methods"') && html.includes('href="#sec:regression"'),
      'doc54: nested ToC entries link to the section ids (incl. the deepest level)');

    // No-JS baseline: the link targets already exist in the markup, so scroll-spy
    // is pure JS-over-existing-markup. The ToC navigates without any script.
    assert.ok(html.includes('id="sec:methods"') && html.includes('id="sec:regression"'),
      'doc54: section ids (the ToC link targets) are present in the markup');

    // Scroll-spy is injected as an inline <script> alongside the ToC, via the same
    // makeScriptElement path as chapter-nav. It is IntersectionObserver-based and
    // sets the active hook.
    assert.ok(html.includes('<script>'), 'doc54: an inline <script> is injected');
    assert.ok(html.includes('IntersectionObserver') && html.includes('enscribe-toc-active'),
      'doc54: the injected script is the IntersectionObserver-based scroll-spy that sets the active hook');

    // The active hook is RUNTIME only — no aria-current / active class enters the
    // static markup (scroll-spy adds no new content or meaning; it only sets the
    // hook at runtime). The script string mentions them, the rendered ToC must not.
    const tocFragment = html.slice(html.indexOf('class="enscribe-toc"'), html.indexOf('</nav>'));
    assert.ok(!/aria-current|enscribe-toc-active/.test(tocFragment),
      'doc54: no active hook in the static ToC markup — it is set at runtime');

    snapshotHast('document-54', hast);
    console.log('PASS: integration doc54 (ToC sidebar + scroll-spy injection)');
  }

  // --- doc55: data-table cell parsing (#21) ---
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-55-table-cell-parse.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // parse-columns: only the named (notes) column parses; data columns literal.
    assert.ok(html.includes('<td>see <i>the docs</i> at <a href="https://example.org">the site</a></td>'),
      'doc55: parse-columns parses the notes cell (emphasis + link)');
    assert.ok(html.includes('<a href="#fig:plot" class="ref">figure 1</a>'),
      'doc55: a cross-ref authored in a cell resolves to "figure 1"');
    assert.ok(/<cite class="cite"[^>]*>\(Smith, 2020\)<\/cite>/.test(html),
      'doc55: a cite authored in a cell resolves to a formatted citation');
    assert.ok(html.includes('<td>uses <code>inline code</code> and inline math'),
      'doc55: inline code + inline math parse in a cell');
    assert.ok(html.includes('<td>3.14</td>') && html.includes('<td>2.72</td>'),
      'doc55: the value column stays literal');
    // +parse-text: every cell parses.
    assert.ok(html.includes('<td><i>emphasised label</i></td>'),
      'doc55: +parse-text parses every cell');
    // -parse-text: literal — the <a> is escaped text, not a link.
    assert.ok(html.includes('&#x3C;a https://example.org | this> is not a link'),
      'doc55: -parse-text keeps cells literal');

    snapshotHast('document-55', hast);
    console.log('PASS: integration doc55 (data-table cell parsing — parse-columns / +parse-text / -parse-text)');
  }

  // --- doc69: minipage — the sealed frameable (#115) ---
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-69-minipage.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // The minipage renders as a bordered <figure> (border default true) with its
    // own "Minipage N." label in the figcaption.
    assert.ok(/<figure id="mp:numbering" class="frameable-border">/.test(html),
      'doc69: minipage renders as <figure class="frameable-border"> with its id');
    assert.ok(/<span class="minipage-label">Minipage 1\.<\/span> A sealed box with a private figure/.test(html),
      'doc69: numbered minipage gets its own "Minipage 1." caption label');

    // Private numbering: the document figure and the box-private figure are BOTH
    // "Figure 1" — the inner figure counts in the box registry and does NOT
    // advance the document figure counter.
    assert.ok(/<figure id="fig:doc">[\s\S]*?<span class="figure-label">Figure 1\.<\/span>\s*<p>A document figure\./.test(html),
      'doc69: the document figure is "Figure 1"');
    // #267: a minipage member's id is scope-qualified by the box slug (mp:numbering → mp-numbering)
    // so two boxes don't collide on id="fig:inner". The PRIVATE NUMBER is still "Figure 1".
    assert.ok(/<figure id="mp-numbering-fig:inner">[\s\S]*?<span class="figure-label">Figure 1\.<\/span>\s*<p>An inner figure/.test(html),
      'doc69: the box-private figure is ALSO "Figure 1" (private counter, document counter untouched)');
    assert.ok(html.includes('<a href="#fig:doc" class="ref">figure 1</a>'),
      'doc69: the document figure cross-ref is "figure 1" — not bumped to 2 by the box figure');

    // Internal ref resolves within the box (baked text); inbound ref is forbidden.
    // #267: the in-box ref href is rewritten in lockstep with the qualified id, so it still resolves.
    assert.ok(html.includes('<a href="#mp-numbering-fig:inner" class="ref">figure 1</a>'),
      'doc69: a body <ref @fig:inner> resolves WITHIN the box to "figure 1"');
    assert.ok(html.includes('<a href="#fig:inner" class="ref-error">??ref: fig:inner??</a>'),
      'doc69: an inbound document <ref @fig:inner> to a box label is a not-found ref-error');

    // Own label referenceable; minipage-A and minipage-B both resolve, distinct
    // numbers. The "Minipage N" counter is document-global, so A/B are 2/3 here
    // (mp:numbering above is Minipage 1) — a numbered minipage advances the shared
    // minipage series.
    assert.ok(html.includes('<a href="#mp:a" class="ref">minipage 2</a>'),
      'doc69: minipage A is referenceable in the "Minipage N" series (minipage 2)');
    assert.ok(html.includes('<a href="#mp:b" class="ref">minipage 3</a>'),
      'doc69: minipage B is referenceable and the series advances (minipage 3)');

    // Box-local footnote: the note collects into a <note-list> INSIDE the box
    // figure (its own bottom boundary), before the figcaption.
    assert.ok(/<figure id="mp:notes"[\s\S]*?<note-list[\s\S]*?The footnote is collected at the box bottom[\s\S]*?<\/note-list>[\s\S]*?<span class="minipage-label">Minipage \d+\.<\/span>[\s\S]*?<\/figure>/.test(html),
      'doc69: a footnote inside the box collects at the box boundary (note-list inside the figure)');

    // Nested minipage: each level numbers privately ("Minipage 1" inside, the
    // outer is the document-level minipage count).
    // #267: the nested box's own id (mp:inner) is qualified by its parent's slug (mp-outer-mp:inner),
    // so two parents could each hold a #mp:inner without colliding; the PRIVATE NUMBER is still "Minipage 1".
    assert.ok(/<figure id="mp:outer"[\s\S]*?<figure id="mp-outer-mp:inner"[\s\S]*?<span class="minipage-label">Minipage 1\.<\/span> Inner box[\s\S]*?<\/figure>[\s\S]*?<\/figure>/.test(html),
      'doc69: a nested minipage renders inside its parent, numbered privately ("Minipage 1")');

    // No external pulls: an @src inside a minipage is a visible error, not a resolved image.
    assert.ok(/<figure id="mp:guard"[\s\S]*?<div class="enscribe-asset-error" role="alert" data-ref="@logo">[\s\S]*?not allowed inside a minipage[\s\S]*?<\/div>/.test(html),
      'doc69: an @src pull inside a minipage is rejected with a visible asset-error');
    assert.ok(!/<img src="@logo"/.test(html) && !/<img src="logo/.test(html),
      'doc69: the forbidden @src is NOT resolved into a working <img>');

    snapshotHast('document-69', hast);
    console.log('PASS: integration doc69 (minipage — sealed frameable: private numbering, inbound ref-error, own-series refs, box-local notes, nesting, no-external guard)');
  }

  // --- doc70: minipage outbound references — the one-way read-through (#115) ---
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-70-minipage-outbound.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // Outbound: a body <ref> to a DOCUMENT figure / section resolves read-through
    // against the parent registry (which is complete before the sub-run).
    assert.ok(html.includes('<a href="#fig:doc" class="ref">figure 1</a>'),
      'doc70: a body <ref @fig:doc> resolves OUTBOUND to the document figure ("figure 1")');
    assert.ok(html.includes('<a href="#sec:intro" class="ref">Introduction</a>'),
      'doc70: a body <ref @sec:intro> resolves OUTBOUND to the document section (its title)');

    // Internal still resolves: the box's own figure, in its private registry.
    // #267: the in-box id and its in-box ref are qualified by the box slug (mp:out → mp-out) in lockstep.
    assert.ok(html.includes('<a href="#mp-out-fig:local" class="ref">figure 1</a>'),
      'doc70: a body <ref @fig:local> still resolves WITHIN the box ("figure 1", private)');

    // The box's own outward label is referenceable from the document.
    assert.ok(html.includes('<a href="#mp:out" class="ref">minipage 1</a>'),
      'doc70: the minipage is referenceable from the document ("minipage 1")');

    // The seal still holds: an inbound document <ref> to a box-private label is a
    // not-found ref-error — the read-through is one-way, child labels never leak up.
    assert.ok(html.includes('<a href="#fig:local" class="ref-error">??ref: fig:local??</a>'),
      'doc70: an inbound document <ref @fig:local> is still a ref-error (one-way seal holds)');

    snapshotHast('document-70', hast);
    console.log('PASS: integration doc70 (minipage outbound — one-way read-through: outbound resolves, inbound still forbidden)');
  }

  // --- doc71: ToC frame-skip — demo `<section>`s inside `<frame>`/`<aside>` boxes never
  // leak into the contents rail (#223/#246). The principled build-time counterpart of
  // 4ece570's client-side rail fix: collectEntries no longer descends into a `<frame>`
  // (compiled to `<figure class="frameable-border">`) or an `<aside>` demo box, so a
  // `<config toc>` rail lists only real page sections — not the box demos. ---
  {
    const src = readFileSync(join(FIXTURES_DIR, 'document-71-toc-frame-skip.emd'), 'utf8');
    const { html, hast } = runPipeline(src);

    // The contents rail region (the `<config toc toc-location=right>` sidebar).
    const navMatch = html.match(/<nav class="enscribe-toc[\s\S]*?<\/nav>/);
    assert.ok(navMatch, 'doc71: a config-toc contents rail is rendered');
    const nav = navMatch[0];

    // Real sections appear: both first-level sections and the genuine (out-of-box)
    // nested subsection.
    assert.ok(nav.includes('href="#sec:real-a"'),
      'doc71: the first real section is listed in the contents rail');
    assert.ok(nav.includes('href="#sec:real-b"'),
      'doc71: a real section sitting OUTSIDE any box still appears');
    assert.ok(nav.includes('href="#sub:real"'),
      'doc71: a genuine nested subsection (outside any box) still appears');

    // Demo sections inside the `<frame>` (→ <figure class="frameable-border">) and the
    // `<aside>` box are EXCLUDED — collectEntries does not descend into the boxes.
    assert.ok(!nav.includes('#sec:demo-frame'),
      'doc71: a `<section>` inside a `<frame>` demo box does NOT leak into the contents');
    assert.ok(!nav.includes('#sec:demo-aside'),
      'doc71: a `<section>` inside an `<aside>` demo box does NOT leak into the contents');

    // The intros symptom (spurious title-less rail entries) is gone: a leaked demo
    // section has no `*-title`, so it would render as "Untitled". This re-tests the exact
    // #223/#246 symptom, but the id-based negative asserts above are the PRIMARY leak
    // detectors (they'd catch a leak even if the demo section carried a title).
    assert.ok(!/Untitled/.test(nav),
      'doc71: no spurious "Untitled" entry — the demo-box leak is closed');

    // Ordinary nesting is preserved: the real subsection nests UNDER its parent section.
    // The trailing `#sec:real-b` pins the nested <ul> as CLOSING before the next top-level
    // entry, so this catches a flatten-to-sibling regression, not just textual ordering.
    assert.ok(/href="#sec:real-a"[\s\S]*?<ul>[\s\S]*?href="#sub:real"[\s\S]*?<\/ul>[\s\S]*?href="#sec:real-b"/.test(nav),
      'doc71: the real subsection nests under its parent section (nesting unchanged)');

    // The demo sections still RENDER in the body (they are real content, just not ToC
    // entries) — the skip is ToC-only, it does not drop the boxes' content.
    assert.ok(/<section id="sec:demo-frame"/.test(html) && /<section id="sec:demo-aside"/.test(html),
      'doc71: the demo sections still render in the body (the skip is ToC-only)');

    snapshotHast('document-71', hast);
    console.log('PASS: integration doc71 (ToC frame-skip — `<frame>`/`<aside>` demo sections excluded from the contents rail; real sections + nesting preserved)');
  }
}
