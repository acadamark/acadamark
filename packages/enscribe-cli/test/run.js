// Test runner for @enscribejs/cli.
import { run_tests as runCliTests } from './cli.test.js';
import { run_tests as runLiftTests } from './lift.test.js';
import { run_tests as runPandocTests } from './pandoc-import.test.js';

try {
  runCliTests();
  runLiftTests();
  runPandocTests();
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err?.message ?? err);
  console.error(err?.stack ?? '');
  process.exit(1);
}
