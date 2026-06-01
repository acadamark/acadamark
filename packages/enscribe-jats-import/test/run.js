// Test runner for @enscribejs/jats-import.
import { run_tests } from './import.test.js';

try {
  run_tests();
  process.exit(0);
} catch (err) {
  console.error('FAIL:', err?.message ?? err);
  console.error(err?.stack ?? '');
  process.exit(1);
}
