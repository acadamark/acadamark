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
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';

import { acadamarkInterpreter, acadamarkTagHandler } from '../src/index.js';
import remarkRecursiveContent from '../../remark-acadamark/src/recursive-content.js';
import { acadamarkConfigDiscovery } from '../src/plugins/config-discovery.js';
import { acadamarkArticleStructuring } from '../src/plugins/article-structuring.js';
import { acadamarkSectionNesting } from '../src/plugins/section-nesting.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');
const UPDATE = process.env.ACADAMARK_UPDATE_SNAPSHOTS === '1';

/**
 * Run the full pipeline on a source string and return the hast tree and HTML.
 */
function runPipeline(source) {
  const innerProcessor = unified().use(remarkParse).use(remarkAcadamark);

  const processor = unified()
    .use(remarkParse)
    .use(remarkAcadamark)
    .use(acadamarkInterpreter);

  const result = processor.processSync(source);
  const html = String(result);

  // Also capture the hast by running the structural transforms separately and
  // calling toHast directly (so we can store the tree for snapshot comparison).
  const innerProc2 = unified().use(remarkParse).use(remarkAcadamark);
  const mdast = unified().use(remarkParse).use(remarkAcadamark).parse(source);
  // Apply transforms manually for hast capture.
  remarkRecursiveContent({ processor: innerProc2 })(mdast);
  acadamarkConfigDiscovery()(mdast, { data: {} });
  acadamarkArticleStructuring()(mdast);
  acadamarkSectionNesting()(mdast);

  const hast = toHast(mdast, {
    handlers: { acadamarkTag: acadamarkTagHandler },
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
    assert.ok(html.includes('<article-back>'), 'doc1: has <article-back>');
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
    assert.ok(html.includes('elephants.jpg'), 'doc2: figure src');
    assert.ok(html.includes('<figcaption>'), 'doc2: figcaption present');
    assert.ok(html.includes('<aside>'), 'doc2: aside present');
    assert.ok(html.includes('<blockquote>'), 'doc2: blockquote present');

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

    snapshotHast('document-3', hast);
    console.log('PASS: integration doc3 (edge cases)');
  }
}
