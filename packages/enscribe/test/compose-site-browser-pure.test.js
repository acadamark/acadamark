// BROWSER-PURITY GUARD for the website composition core (the live #300, step 1 — #324).
//
// The whole "reuse, not rewrite" verdict rests on compose-site.js being browser-pure: a later live
// caller mounts it in the browser, so it must import NO Node builtin — its one environment binding
// (book assemble+number, which reads child sources) is INJECTED. This guard locks that so a future edit
// can't silently re-Node-ify the core (e.g. an `import { readFileSync } from 'node:fs'`) and break the
// live path before it is even built.
//
// Checks: (1) compose-site.js itself imports no Node builtin (its one I/O step is injected);
// (2) in its whole NON-VENDORED (relative) import graph, the ONLY files that import a Node builtin are the
// engine's tsup-aliased lazy-asset modules under interpreter/assets/ (e.g. font-loader.js — its node:fs is
// dead code in the browser bundle, aliased to a throwing stub by tsup, reads deferred to lazy accessors;
// see that file's header + interpreter/tsup.config.js) — never a master-document/, core/, or
// interpreter/lib/ leaf; (3) the master-document/ home is Node-free as a directory invariant;
// (4) the module loads and exports the composer.
//
// Why allow interpreter/assets/ node: imports: compose-site.js pulls publish-pages.js (for prepareBook),
// which statically imports font-loader.js's HEAD_ASSET_LINKS — the SAME graph the live book render already
// ships in the browser bundle. The lazy-asset + tsup-alias pattern is the engine's established
// browser-safety mechanism for those modules; this slice does not change it. The guard locks the NEW
// browser-pure surface (the core + master-document/) against a DIRECT node: import.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../src');
const CORE = join(SRC, 'master-document/compose-site.js');
const MD_DIR = join(SRC, 'master-document');

let pass = 0;
let fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`PASS: ${label}`); }
  else { fail++; console.log(`FAIL: ${label}`); }
}

// A Node-builtin dependency: `import … from 'node:*' | 'fs' | 'path' | 'os' | 'child_process'`, or the
// `require('node:…'|'fs'|'path')` CJS form. Relative specifiers (`./x.js`) and vendored bare specifiers
// (`vfile`, `hast-util-to-html`) never match — only the Node builtins that would break a browser bundle.
const NODE_DEP =
  /(?:import|export)[^'"]*from\s*['"](?:node:[^'"]+|fs|fs\/promises|path|os|child_process)['"]|require\(\s*['"](?:node:[^'"]+|fs|path)['"]\s*\)/;
// A relative import/export specifier (the non-vendored graph edges to follow).
const REL = /(?:import|export)[^'"]*from\s*['"](\.\.?\/[^'"]+)['"]/g;

/** Walk the relative-import graph from `entry`; return the files that pull a Node builtin. */
function nodeDepsInGraph(entry) {
  const seen = new Set();
  const offenders = [];
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { return; }
    if (NODE_DEP.test(src)) offenders.push(file.replace(SRC, 'src'));
    for (const m of src.matchAll(REL)) {
      visit(resolve(dirname(file), m[1])); // repo imports carry the explicit .js extension
    }
  };
  visit(entry);
  return { offenders, visited: seen.size };
}

// ── 1. The core ITSELF imports no Node builtin (it injects its one I/O step) ────────────────────────
check('compose-site.js imports no Node builtin (its book assemble+number is injected)',
  !NODE_DEP.test(readFileSync(CORE, 'utf8')));

// ── 2. In the core's whole non-vendored graph, node: deps live ONLY in tsup-aliased interpreter/assets/ ──
const graph = nodeDepsInGraph(CORE);
const illegal = graph.offenders.filter((f) => !f.includes('/interpreter/assets/'));
check(`the core's ${graph.visited - 1} relative imports keep node: deps to tsup-aliased interpreter/assets/ only`,
  illegal.length === 0);
if (illegal.length) console.log('   illegal node: deps:', illegal.join(', '));

// ── 3. Directory invariant: no master-document/ sibling DIRECTLY imports a Node builtin (the home) ──
const mdOffenders = readdirSync(MD_DIR)
  .filter((f) => f.endsWith('.js'))
  .filter((f) => NODE_DEP.test(readFileSync(join(MD_DIR, f), 'utf8')));
check('no master-document/*.js imports a Node builtin (directory invariant)', mdOffenders.length === 0);
if (mdOffenders.length) console.log('   offenders:', mdOffenders.join(', '));

// ── 4. The module loads and exports the composer ──────────────────────────────────────────────────
const mod = await import('../src/master-document/compose-site.js');
check('compose-site.js loads and exports composeSiteRegistry()', typeof mod.composeSiteRegistry === 'function');

assert.equal(fail, 0, `${fail} browser-purity checks failed`);
console.log(`\n${pass}/${pass + fail} compose-site browser-purity (#324) checks passed`);
if (fail > 0) process.exit(1);
