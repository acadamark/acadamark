// Test runner for acadamark-interpreter. Each test module exports a
// `run()` function that throws on assertion failure. We call them in sequence
// and report a summary.

import { run as runShapeTokens } from './schema/shape-tokens.test.js';
import { run as runLoadVocabulary } from './schema/load-vocabulary.test.js';
import { run as runConfigDiscovery } from './plugins/config-discovery.test.js';
import { run as runArticleStructuring } from './plugins/article-structuring.test.js';
import { run as runSectionNesting } from './plugins/section-nesting.test.js';
import { run as runFigureHandler } from './handlers/figure.test.js';
import { run as runInterpretPlugin } from './interpret-plugin.test.js';
import { run as runIntegration } from './integration.test.js';

const suites = [
  ['schema/shape-tokens',          runShapeTokens],
  ['schema/load-vocabulary',       runLoadVocabulary],
  ['plugins/config-discovery',     runConfigDiscovery],
  ['plugins/article-structuring',  runArticleStructuring],
  ['plugins/section-nesting',      runSectionNesting],
  ['handlers/figure',              runFigureHandler],
  ['interpret-plugin',             runInterpretPlugin],
  ['integration',                  runIntegration],
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

