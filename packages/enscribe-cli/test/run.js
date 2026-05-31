// Test runner for @enscribejs/cli.
import { run_tests } from './cli.test.js';

try {
  run_tests();
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err?.message ?? err);
  console.error(err?.stack ?? '');
  process.exit(1);
}
