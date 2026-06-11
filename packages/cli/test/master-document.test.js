// Master-document walking skeleton (#190 — multi-file build, first slice).
//
// Proves the thin end-to-end path: parse a master document, load + parse its
// `<section src>` children, assemble them into one article tree in document
// order, and render via the existing pipeline. Cross-file resolution
// (citations, numbering, marker placement, non-article types) is deferred.
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { buildEnscribePipeline } from '@enscribejs/enscribe';
import { assembleMasterDocument } from '../src/master-document/assemble.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_DIR = join(__dirname, 'fixtures', 'master');
const XREF_DIR = join(__dirname, 'fixtures', 'master-xref');

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
}
