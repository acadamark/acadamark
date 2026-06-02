// Test runner for the interpreter suites of the `enscribe` package. Each test
// module exports a `run()` function that throws on assertion failure. We call
// them in sequence and report a summary. (The core and parser suites are
// self-executing files invoked directly by the package `test` script.)

import { run as runConfigDiscovery } from './plugins/config-discovery.test.js';
import { run as runArticleStructuring } from './plugins/article-structuring.test.js';
import { run as runSectionNesting } from './plugins/section-nesting.test.js';
import { run as runNumbering } from './plugins/numbering.test.js';
import { run as runRefResolution } from './plugins/ref-resolution.test.js';
import { run as runFigureHandler } from './handlers/figure.test.js';
import { run as runMathHandler } from './handlers/math.test.js';
import { run as runRefHandler } from './handlers/ref.test.js';
import { run as runCodeBlockHandler } from './handlers/code-block.test.js';
import { run as runInlineCodeHandler } from './handlers/inline-code.test.js';
import { run as runTableHandler } from './handlers/table.test.js';
import { run as runKatexCss } from './katex-css.test.js';
import { run as runInterpretPlugin } from './interpret-plugin.test.js';
import { run as runRegistry } from './lib/registry.test.js';
import { run as runWalkNormalize } from './lib/walk-normalize.test.js';
import { run as runNotes } from './plugins/notes.test.js';
import { run as runNotePlacement } from './plugins/note-placement.test.js';
import { run as runLibraryLoad } from './plugins/library-load.test.js';
import { run as runCiteResolution } from './plugins/cite-resolution.test.js';
import { run as runBibliography } from './plugins/bibliography.test.js';
import { run as runCiteHandler } from './handlers/cite.test.js';
import { run as runNormalizeToCanonical } from './plugins/normalize-to-canonical.test.js';
import { run as runRegistryDsl } from './dsl/registry.test.js';
import { run as runCdnVersions } from './cdn-versions.test.js';
import { run as runBundleLoad } from './bundle-load.test.js';
import { run as runRawHtmlComments } from './raw-html-comments.test.js';
import { run as runSameLineLongForm } from './same-line-long-form.test.js';
import { run as runSvgContent } from './svg-content.test.js';
import { run as runLinksImages } from './links-images.test.js';
import { run as runIntegration } from './integration.test.js';
import { run as runToc } from './lib/toc.test.js';
import { run as runTheme } from './lib/theme.test.js';
import { run as runChapterNav } from './lib/chapter-nav.test.js';
import { run as runConfigOptions } from './config-options.test.js';
import { run as runMapAttributes } from './map-attributes.test.js';
import { run as runDslRegistry } from './dsl-registry.test.js';

const suites = [
  ['plugins/config-discovery',     runConfigDiscovery],
  ['plugins/article-structuring',  runArticleStructuring],
  ['plugins/section-nesting',      runSectionNesting],
  ['plugins/numbering',            runNumbering],
  ['plugins/ref-resolution',       runRefResolution],
  ['handlers/figure',              runFigureHandler],
  ['handlers/math',                runMathHandler],
  ['handlers/ref',                 runRefHandler],
  ['handlers/code-block',          runCodeBlockHandler],
  ['handlers/inline-code',         runInlineCodeHandler],
  ['handlers/table',               runTableHandler],
  ['katex-css',                    runKatexCss],
  ['interpret-plugin',             runInterpretPlugin],
  ['map-attributes',               runMapAttributes],
  ['dsl-registry',                 runDslRegistry],
  ['lib/registry',                 runRegistry],
  ['lib/walk-normalize',           runWalkNormalize],
  ['plugins/notes',                runNotes],
  ['plugins/note-placement',        runNotePlacement],
  ['plugins/library-load',         runLibraryLoad],
  ['plugins/cite-resolution',      runCiteResolution],
  ['plugins/bibliography',         runBibliography],
  ['handlers/cite',                runCiteHandler],
  ['plugins/normalize-to-canonical', runNormalizeToCanonical],
  ['dsl/registry',                 runRegistryDsl],
  ['cdn-versions',                 runCdnVersions],
  ['bundle-load',                  runBundleLoad],
  ['raw-html-comments',            runRawHtmlComments],
  ['same-line-long-form',          runSameLineLongForm],
  ['svg-content',                  runSvgContent],
  ['links-images',                 runLinksImages],
  ['integration',                  runIntegration],
  ['lib/toc',                      runToc],
  ['lib/theme',                    runTheme],
  ['lib/chapter-nav',              runChapterNav],
  ['config-options',               runConfigOptions],
];

let failed = 0;
for (const [name, fn] of suites) {
  console.log(`\n--- ${name} ---`);
  try {
    await fn();
  } catch (err) {
    failed++;
    console.error(`FAIL: ${name}`);
    console.error(err);
  }
}

console.log(`\n${failed === 0 ? 'OK' : 'FAILED'}: ${suites.length - failed}/${suites.length} suites passed`);
if (failed > 0) process.exit(1);

