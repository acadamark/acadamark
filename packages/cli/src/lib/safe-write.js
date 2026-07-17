// The ONE guarded filesystem-write module for the CLI (#413 no-stack sweep).
//
// Every CLI file write / copy routes through here so that an fs failure — a missing parent directory
// (ENOENT), a directory where a file was expected (EISDIR), a path segment that is not a directory
// (ENOTDIR), no permission (EACCES) — becomes a clean, named `CliError` (one line, no raw Node stack)
// instead of escaping to run()'s top-level catch, which for a non-CliError dumps the full stack. This
// generalizes emit()'s C1 write-guard (cli.js) to the sibling raw writes the audit found: the
// jats-package XML, the website pages + their asset copies, the separate-pages book pages, and the
// live-shell write. A greppable source guard (test/no-stack.test.js) forbids a bare writeFileSync /
// copyFileSync / cpSync from reappearing outside this module, keeping the "no CLI path leaks a stack"
// invariant honest as new write sites are added.

import { writeFileSync, copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { CliError } from './cli-error.js';

/** Map an fs error to a clean, remedy-bearing CliError. `verb` reads in the message ("write" / "copy to"). */
function fsCliError(verb, path, e) {
  if (e.code === 'ENOENT') return new CliError(`cannot ${verb} ${path}: no such directory (create the parent directory first)`);
  if (e.code === 'EISDIR') return new CliError(`cannot ${verb} ${path}: that path is a directory (give a file path)`);
  if (e.code === 'ENOTDIR') return new CliError(`cannot ${verb} ${path}: a path segment is not a directory`);
  if (e.code === 'EACCES') return new CliError(`cannot ${verb} ${path}: permission denied`);
  return new CliError(`could not ${verb} ${path}: ${e.message}`);
}

/** writeFileSync, but an fs failure becomes a clean CliError naming the path. */
export function writeFileGuarded(path, data, encoding = 'utf8') {
  try { writeFileSync(path, data, encoding); }
  catch (e) { throw fsCliError('write', path, e); }
}

/** copyFileSync, but an fs failure becomes a clean CliError naming the destination. */
export function copyFileGuarded(src, dest) {
  try { copyFileSync(src, dest); }
  catch (e) { throw fsCliError('copy to', dest, e); }
}

/** cpSync (recursive dir copy), but an fs failure becomes a clean CliError naming the destination. */
export function cpGuarded(src, dest, opts) {
  try { cpSync(src, dest, opts); }
  catch (e) { throw fsCliError('copy to', dest, e); }
}

/** mkdirSync (recursive), but an fs failure becomes a clean CliError naming the path — so a `-o` that
 *  points at an existing FILE (ENOTDIR / EEXIST) errors cleanly rather than leaking a stack. */
export function mkdirGuarded(path, opts = { recursive: true }) {
  try { mkdirSync(path, opts); }
  catch (e) { throw fsCliError('create directory', path, e); }
}
