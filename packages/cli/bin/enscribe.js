#!/usr/bin/env node
// Thin executable wrapper. All logic lives in src/cli.js (run()), which is
// stream-injectable so it can be unit-tested without spawning a process.
//
// Uses process.exitCode (not process.exit()) so Node flushes stdout/stderr
// before exiting — important when output is piped.
import { run } from '../src/cli.js';

process.exitCode = run(process.argv.slice(2));
