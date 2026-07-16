// Meta-check (audit blindness guard 6): every test file is wired into the runner.
//
// The enscribe suite runs test files two ways: `run()`-exporting modules imported
// into `test/run.js`, and self-executing files named directly in the package `test`
// script (`node test/foo.test.js && …`). A NEW test file is reachable by `npm test`
// only if it is added to one of those two places — nothing discovers `test/**/*.test.js`
// automatically. `line-start-flow-reject.test.js` and `multiline-text-position.test.js`
// were written and committed but wired into NEITHER, so `npm test` never ran them
// (#458). This guard makes that class un-recurrable: it enumerates every
// `test/**/*.test.js` and asserts each is reachable from the runner. A written-but-
// never-wired test now fails the suite instead of hiding.
//
// Self-executing (like the parser unit tests it sits beside), so it is itself wired
// into the `test` script and covered by its own check.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(join(TEST_DIR, '..', 'package.json'), 'utf8'));
const RUN_JS = readFileSync(join(TEST_DIR, 'run.js'), 'utf8');
const TEST_SCRIPT = PKG.scripts?.test ?? '';

// Every *.test.js under test/, excluding the fixture corpus (fixtures/ holds .emd inputs,
// not test modules) and node_modules. Paths are POSIX-relative to test/ so they match both
// the run.js import specifier (`./x`) and the package-script form (`test/x`).
function collectTestFiles(dir = TEST_DIR, rel = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'fixtures' || entry.name === 'node_modules') continue;
    const abs = join(dir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectTestFiles(abs, relPath));
    else if (entry.name.endsWith('.test.js')) out.push(relPath.split('\\').join('/'));
  }
  return out;
}

// Reachable ⇔ imported by run.js (`./relPath`) OR named directly in the `test` script
// (`node test/relPath`). The runner invokes run.js, so an import there is reachable; the
// script names the self-executing files directly.
function isReachable(relPath) {
  return RUN_JS.includes(`./${relPath}`) || TEST_SCRIPT.includes(`test/${relPath}`);
}

function run() {
  const files = collectTestFiles().sort();
  assert.ok(files.length > 50, `sanity: found ${files.length} test files (expected the full suite)`);

  const orphans = files.filter((f) => !isReachable(f));
  assert.deepEqual(
    orphans, [],
    `these test/**/*.test.js files are not wired into the runner (add them to test/run.js's ` +
      `imports or the package "test" script, else npm test never runs them):\n  ${orphans.join('\n  ')}`,
  );

  // This guard must itself be reachable — otherwise it could silently stop guarding.
  const self = relative(TEST_DIR, fileURLToPath(import.meta.url)).split('\\').join('/');
  assert.ok(isReachable(self), `the reachability guard (${self}) must itself be wired into the runner`);

  console.log(`PASS: runner-coverage — all ${files.length} test files are reachable from the runner (#458 guard)`);
}

run();
