// Test runner for @enscribejs/cli — the CLI, lift, pandoc-import, and
// JATS-import suites. The JATS-export suite is a self-contained monolith that
// runs as a separate process (test/jats-export.test.js), chained after this one
// in the package `test` script.
import { run_tests as runCliTests } from './cli.test.js';
import { run_tests as runLiftTests } from './lift.test.js';
import { run_tests as runPandocTests } from './pandoc-import.test.js';
import { run_tests as runJatsImportTests } from './import.test.js';
import { run_tests as runRoundtripComplexTests } from './roundtrip-complex.test.js';
import { run_tests as runLibrarySrcTests } from './library-src.test.js';
import { run_tests as runMasterDocumentTests } from './master-document.test.js';
import { run_tests as runBuildLiveTests } from './build-live.test.js';

try {
  runCliTests();
  runLiftTests();
  runPandocTests();
  runJatsImportTests();
  runRoundtripComplexTests();
  runMasterDocumentTests(); // #190: multi-file master-document walking skeleton
  runBuildLiveTests(); // #215: enscribe build --live (the live-folder build helper)
  await runLibrarySrcTests(); // #133: async (mocked URL fetch via the render command)
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err?.message ?? err);
  console.error(err?.stack ?? '');
  process.exit(1);
}
