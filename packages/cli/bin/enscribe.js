#!/usr/bin/env node
// Thin executable wrapper. All logic lives in src/cli.js (run()), which is
// stream-injectable so it can be unit-tested without spawning a process.
//
// Uses process.exitCode (not process.exit()) so Node flushes stdout/stderr
// before exiting — important when output is piped.
import { run } from '../src/cli.js';

// #133: run() returns a Promise only for `render` with URL <library src> sources
// (which need an async fetch); otherwise it is a synchronous exit code.
const result = run(process.argv.slice(2));
if (result && typeof result.then === 'function') {
  result
    .then((code) => { process.exitCode = code; })
    .catch((e) => { process.stderr.write(`enscribe: ${e?.message ?? e}\n`); process.exitCode = 1; });
} else {
  process.exitCode = result;
}
