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
}
