// #413 (no-stack sweep) — the standing guard for "NO CLI PATH LEAKS A STACK".
//
// Two complementary nets:
//   (1) SOURCE-GREP (regression net): the swept CLI files never reintroduce a bare `throw new Error(`
//       (must be CliError → one clean line) or a bare writeFileSync/cpSync (must route through the
//       shared guarded writer in lib/safe-write.js). Cheap, and it fires the moment a new write site
//       is added ungarded.
//   (2) BEHAVIORAL: every command that writes with `-o` is driven at an UNWRITABLE destination and must
//       exit 1 with a clean, named message and NO raw Node stack (no ` at ` frame, no `node:fs`).

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { run } from '../src/cli.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');

function sink() { const c = []; return { write: (s) => c.push(s), get text() { return c.join(''); } }; }
function invoke(argv) {
  const out = sink(), err = sink();
  const code = run(argv, { stdout: out, stderr: err });
  return { code, out: out.text, err: err.text };
}
const noStack = (s) => !/ at |node:fs/.test(s);

export function run_tests() {
  // ── (1) SOURCE-GREP — the swept files carry no plain-Error throw and no un-routed write ──
  {
    const swept = ['cli.js', 'build-live.js', 'static-website.js'];
    for (const f of swept) {
      const src = readFileSync(join(SRC, f), 'utf8');
      assert.equal((src.match(/throw new Error\(/g) || []).length, 0,
        `${f}: no bare 'throw new Error(' — every CLI throw is a CliError (one clean line, no stack)`);
      assert.equal((src.match(/[^.]writeFileSync\(/g) || []).length, 0,
        `${f}: no bare writeFileSync( — writes route through lib/safe-write.js (writeFileGuarded)`);
      assert.equal((src.match(/[^.]cpSync\(/g) || []).length, 0,
        `${f}: no bare cpSync( — recursive copies route through lib/safe-write.js (cpGuarded)`);
    }
    // The only bare copyFileSync sites left are DELIBERATELY guarded degrade/remedy paths (each wrapped
    // in its own try/catch): cli.js's jats-package asset copy (try → console.warn, a degrade), and
    // build-live.js's copyShellAssets (try → CliError with the build:lib remedy, #413 C3). Assert they
    // stay bounded so a NEW un-routed copyFileSync is caught.
    const cliCopy = (readFileSync(join(SRC, 'cli.js'), 'utf8').match(/[^.]copyFileSync\(/g) || []).length;
    const liveCopy = (readFileSync(join(SRC, 'build-live.js'), 'utf8').match(/[^.]copyFileSync\(/g) || []).length;
    assert.ok(cliCopy <= 1, `cli.js: at most the one guarded degrade-copy (jats asset) remains bare (got ${cliCopy})`);
    assert.ok(liveCopy <= 1, `build-live.js: at most the one guarded copyShellAssets copy remains bare (got ${liveCopy})`);
    console.log('PASS: #413 no-stack (source-grep) — swept CLI files have no plain-Error throw and no un-routed write');
  }

  // ── (2) BEHAVIORAL — every -o write path fails cleanly (named message, no raw stack) ──
  {
    const dir = mkdtempSync(join(tmpdir(), 'enscribe-nostack-'));
    try {
      writeFileSync(join(dir, 'a.emd'), '<meta type=article>\n<title | A</title>\n</meta>\n\nBody.\n');
      writeFileSync(join(dir, 'book.emd'), '<meta type=book>\n<title | B</title>\n</meta>\n\n<chapter | One>\n\nBody.\n');
      writeFileSync(join(dir, 'blocker'), 'x');   // a FILE where a command will try to mkdir/write a dir
      const nested = join(dir, 'no-such-parent', 'out.html');   // a nonexistent parent → ENOENT on write
      const A = join(dir, 'a.emd'), B = join(dir, 'book.emd'), BLOCK = join(dir, 'blocker');

      const cases = [
        ['render → -o nonexistent parent', ['render', A, '-o', nested]],
        ['build --single-page → -o nonexistent parent', ['build', B, '--single-page', '-o', nested]],
        ['build --separate-pages → -o a file', ['build', B, '--separate-pages', '-o', BLOCK]],
        ['build --live → -o a file', ['build', B, '--live', '-o', BLOCK]],
        ['export-jats --package → -o a file', ['export-jats', A, '--package', '-o', BLOCK]],
      ];
      for (const [label, argv] of cases) {
        const r = invoke(argv);
        assert.equal(r.code, 1, `${label}: exits 1`);
        assert.ok(/cannot (write|create directory|copy)|could not/.test(r.err), `${label}: a clean, named write/dir error (got: ${r.err.trim().slice(0, 120)})`);
        assert.ok(noStack(r.err), `${label}: NO raw Node stack ( at / node:fs) leaks`);
      }
      console.log(`PASS: #413 no-stack (behavioral) — ${cases.length} -o write paths fail cleanly with no leaked stack`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run_tests();
