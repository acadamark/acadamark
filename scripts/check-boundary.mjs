// Language/engine boundary check (repo-split Stage 0) — the one-way dependency firewall
// from notes/enscribe-split-migration-plan.md. Wired into the root `test` script and CI
// (`npm run check:boundary`); plain Node, no dependencies; failure ergonomics modeled on
// docs-gen/check-docs-fresh.mjs (clear message, actionable instruction, non-zero exit).
//
// THE FRAMING (why this boundary exists): the repo will split into a language repo and an
// engine repo. The LANGUAGE layer is the normative definition of Enscribe — eHTML (the
// vocabulary), the shorthand vernacular, the taxonomies, the language specifications, and
// the authoring documentation. eHTML and the shorthand are the two registers of one
// language. The standing invariant: the specs and documentation are maintained to a level
// that, were the engine to disappear, it could be regenerated from them — output-identical,
// not byte-identical. The ENGINE (interpreter/renderer/editor/CLI) is one implementation
// of that language. The dependency direction is therefore one-way: the engine consumes the
// language (by package name only); the language depends on nothing engine-side.
//
// The constants below ARE the future repo-split cut line. Stage 0 pre-carves it inside the
// monorepo: the boundary is named and enforced here, and nothing moves.

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── The cut line ─────────────────────────────────────────────────────────────

// LANGUAGE — code surface (Rule 1 scans these for imports). Today the only code-consumable
// language artifact is the ehtml package; `packages/language` is reserved so a future
// umbrella package (if the Stage 2 dependency map earns one) lands inside the firewall
// without editing this script.
const LANGUAGE_CODE_DIRS = ['packages/ehtml', 'packages/language'];

// LANGUAGE — prose surface (Rule 2b protects these from engine-side filesystem reads;
// never scanned for imports — prose is not code).
const LANGUAGE_PROSE = ['notes/', 'DESIGN.md'];

// Explicitly excluded from ALL code scanning: dead prototype/bundle artifacts under notes/
// (e.g. notes/archive/old-docs*/…/enscribe.browser.global.js) reference engine packages but
// are not part of the normative surface — they must not fire Rule 1. (The whole notes/ tree
// is prose surface and unscanned; these are named so nobody "helpfully" narrows the skip.)
const PROSE_SCAN_EXCLUSIONS = ['notes/archive/', 'notes/spikes/', 'notes/table_grammar/'];

// ENGINE layer. docs-gen/ and root scripts count as engine-side consumers for Rules 2/2b.
const ENGINE_PACKAGES = ['@enscribejs/enscribe', '@enscribejs/cli'];
const ENGINE_DIRS = ['packages/enscribe', 'packages/cli'];

// UNASSIGNED (not scanned as language; scanned as outside-the-language consumers):
// docs-gen/, docs-source/, examples/ — their repo-of-residence is decided by the Stage 2
// dependency map, not here. docs-source/'s generated surfaces are derived artifacts
// emitted by docs-gen (guarded by docs-gen/check-docs-fresh.mjs).

// ── Allowlist ────────────────────────────────────────────────────────────────
// The ONE permitted language→engine crossing: the engine-conformance test (it renders each
// vocabulary example through the real pipeline, #304). It relocates to the engine layer at
// the physical split (Stage 1/2). This list must be EMPTY before Stage 1 begins.
const RULE1_ALLOW = new Set(['packages/ehtml/test/example-render.test.js']);
// Its manifest counterpart: the devDependency backing that test. Same rationale, same
// shrink-to-zero condition. (Runtime `dependencies` get NO allowlist — always zero.)
const RULE1B_DEV_ALLOW = { 'packages/ehtml/package.json': ['@enscribejs/enscribe'] };
// The ONE permitted engine→prose read: the spec→artifact generator for the committed
// spec-data.generated.json (CLAUDE.md §"Generated artifacts and their sources"). It reads
// notes/specs/{render-quality,tag-forms-reference,idioms}.md at generation/drift-check time
// only — never on the shipped test path (it skips when notes/ is absent). This is the
// Stage-2 "specs as a published artifact" question in live form; the Stage 2 dependency
// map decides its home, and this entry must be resolved (relocated or re-routed through a
// published artifact) before the physical split.
const RULE2B_ALLOW = new Set(['packages/enscribe/test/coverage/gen-spec-data.mjs']);

// Never scanned: installed/derived/build trees, VCS internals, and this guard itself
// (its constants necessarily name both sides of the boundary).
const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist']);
const SKIP_ROOT_DIRS = new Set(['site']); // Pages build output (build:site)
const SELF = 'scripts/check-boundary.mjs';

// ── Scanning ─────────────────────────────────────────────────────────────────

const violations = []; // { file, line, rule, detail }

const isLanguageCode = (rel) => LANGUAGE_CODE_DIRS.some((d) => rel === d || rel.startsWith(d + '/'));
const isProse = (rel) => LANGUAGE_PROSE.some((p) => (p.endsWith('/') ? rel.startsWith(p) : rel === p));

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    const rel = relative(ROOT, abs).split(sep).join('/');
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      if (SKIP_ROOT_DIRS.has(rel)) continue;
      if (isProse(rel + '/')) continue; // prose surface (incl. PROSE_SCAN_EXCLUSIONS) — never code-scanned
      yield* walk(abs);
    } else if (entry.isFile()) {
      if (rel === SELF || isProse(rel)) continue;
      if (rel.endsWith('.js') || rel.endsWith('.mjs') || rel.endsWith('.cjs')) yield rel;
    }
  }
}

// Extract import/require SPECIFIERS (import syntax, not raw substrings — a bare substring
// match is a known false-positive trap: packages/ehtml/src/data.js carries an engine module
// path inside a prose string, which must NOT fire). Covers: static `import … from`,
// side-effect `import '…'`, `export … from '…'`, dynamic `import('…')`, `require('…')`.
// The clause charset between the keyword and `from` ([\w*\s{},$] — identifiers, braces,
// commas, `* as`) cannot cross quotes, parens, or punctuation, so prose containing the
// word "import" does not reach a later quoted string.
const SPECIFIER_PATTERNS = [
  /\b(?:import|export)\s+[\w*\s{},$]*?from\s*['"]([^'"\n]+)['"]/g,
  /\bimport\s*['"]([^'"\n]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /\brequire(?:\.resolve)?\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
];

function importSpecifiers(content) {
  const found = new Map(); // start index → specifier (dedupe overlapping pattern hits)
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    for (let m; (m = pattern.exec(content)); ) found.set(m.index, m[1]);
  }
  return [...found.entries()].map(([index, spec]) => ({ index, spec }));
}

const lineOf = (content, index) => content.slice(0, index).split('\n').length;

// Strip comments before scanning, preserving line numbers, so a comment citing a spec file
// as source-of-record (ubiquitous, fine, and expected — often markdown-backtick-quoted)
// never fires the literal scans. A small string-aware state machine, not a regex: a regex
// strip treats '/*' or '//' INSIDE a string literal as a comment opener and blanks real
// code after it — a silent green, the one failure direction this guard must not have.
// (Known residue: a regex literal containing '//' reads as a line comment and blanks the
// rest of its line — no such line exists in the scanned tree, and the miss is a rare
// manual-review gap, not a systematic one.)
function stripComments(src) {
  let out = '';
  let mode = 'code'; // code | line | block | squote | dquote | template
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; i++; continue; }
      if (c === '/' && n === '*') { mode = 'block'; i++; continue; }
      if (c === "'") mode = 'squote';
      else if (c === '"') mode = 'dquote';
      else if (c === '`') mode = 'template';
      out += c;
    } else if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += c; }
    } else if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; i++; }
      else if (c === '\n') out += c;
    } else { // inside a string: comments cannot start here; honor escapes
      if (c === '\\') { out += c + (n ?? ''); i++; continue; }
      if ((mode === 'squote' && (c === "'" || c === '\n')) ||
          (mode === 'dquote' && (c === '"' || c === '\n')) ||
          (mode === 'template' && c === '`')) mode = 'code';
      out += c;
    }
  }
  return out;
}

const resolvesInto = (fileRel, spec, dirs) => {
  if (!spec.startsWith('.')) return false;
  const target = relative(ROOT, resolve(ROOT, dirname(fileRel), spec)).split(sep).join('/');
  return dirs.some((d) => target === d || target.startsWith(d + '/'));
};
const namesPackage = (spec, pkgs) => pkgs.some((p) => spec === p || spec.startsWith(p + '/'));

// Quoted BARE-PATH literals (the filesystem-read pattern). Whitespace-free between the
// quotes: a path handed to fs is a bare path ('notes/specs/idioms.md'), while a diagnostic
// message that merely MENTIONS a spec path is a sentence — spaces exclude it. Runs on
// comment-stripped content.
function quotedLiterals(content, needle) {
  const quote = "['\"`]";
  const inside = "[^'\"`\\s]*";
  const re = new RegExp(quote + inside + needle + inside + quote, 'g');
  const hits = [];
  for (let m; (m = re.exec(content)); ) hits.push({ index: m.index, text: m[0] });
  return hits;
}

// A path assembled from join()/resolve() segments evades the bare-path scan — the real
// prose read (gen-spec-data.mjs) builds join(__dirname, …, 'notes', 'specs'). Catch the
// segment form. The gap is [^;]*? (lazy, statement-bounded): it must cross newlines and
// nested call parens — join(dirname(fileURLToPath(import.meta.url)), '..', 'notes', …) is
// this repo's dominant root-building idiom — so a paren-bounded gap would silently miss
// it. The looseness can over-fire (an array .join() plus an unrelated quoted segment in
// one statement): a rare manual-review failure, preferred over the silent skip.
function joinSegments(content, ...segments) {
  const seg = (s) => `['"]${s}['"]`;
  const re = new RegExp(`\\b(?:join|resolve)\\s*\\([^;]*?${segments.map(seg).join('\\s*,\\s*')}`, 'g');
  const hits = [];
  for (let m; (m = re.exec(content)); ) hits.push({ index: m.index, text: m[0].replace(/\s+/g, ' ') });
  return hits;
}

for (const rel of walk(ROOT)) {
  const content = stripComments(readFileSync(join(ROOT, rel), 'utf8'));

  if (isLanguageCode(rel)) {
    // Rule 1 — the firewall: language never imports engine.
    if (RULE1_ALLOW.has(rel)) continue; // engine-conformance test; must shrink to zero before Stage 1
    for (const { index, spec } of importSpecifiers(content)) {
      if (namesPackage(spec, ENGINE_PACKAGES) || resolvesInto(rel, spec, ENGINE_DIRS)) {
        violations.push({ file: rel, line: lineOf(content, index), rule: 'Rule 1 (language must not import engine)', detail: `'${spec}'` });
      }
    }
  } else {
    // Rule 2 — by-name routing: nothing outside the language layer reaches its internals
    // by path; cross-boundary consumption is via the @enscribejs/ehtml package name.
    for (const { index, spec } of importSpecifiers(content)) {
      if (resolvesInto(rel, spec, LANGUAGE_CODE_DIRS)) {
        violations.push({ file: rel, line: lineOf(content, index), rule: 'Rule 2 (import language by package name, not by path)', detail: `'${spec}'` });
      }
    }
    for (const dir of LANGUAGE_CODE_DIRS) {
      const hits = [
        ...quotedLiterals(content, dir),
        ...joinSegments(content, ...dir.split('/')),
      ];
      for (const { index, text } of hits) {
        violations.push({ file: rel, line: lineOf(content, index), rule: 'Rule 2 (no path literal into language internals)', detail: text });
      }
    }
    // Rule 2b — the prose surface: engine-side code never reads notes/ or DESIGN.md by
    // filesystem path. If code ever needs spec content programmatically, that is the
    // Stage-2 "specs as a published artifact" question — this fails loud so the need
    // surfaces as a decision, not a quiet path read.
    if (!RULE2B_ALLOW.has(rel)) {
      // (?<![\w-]) not \b: a hyphen is a word boundary, so \bnotes/ would false-fire on
      // hyphenated non-prose paths like 'release-notes/v1.md'.
      const hits = [
        ...quotedLiterals(content, '(?<![\\w-])notes/'),
        ...quotedLiterals(content, 'DESIGN\\.md'),
        ...joinSegments(content, 'notes'),
      ];
      for (const { index, text } of hits) {
        violations.push({ file: rel, line: lineOf(content, index), rule: 'Rule 2b (engine code must not read the prose surface by path)', detail: text });
      }
    }
  }
}

// Rule 1b — manifest direction: no LANGUAGE package.json names an ENGINE package in its
// runtime dependencies; devDependencies only via the allowlist above.
for (const dir of LANGUAGE_CODE_DIRS) {
  const manifestRel = dir + '/package.json';
  let raw;
  try { raw = readFileSync(join(ROOT, manifestRel), 'utf8'); } catch { continue; } // absent — packages/language is reserved, not yet real
  let manifest;
  try { manifest = JSON.parse(raw); } catch {
    // A manifest that exists but cannot be parsed vacates the direction check — fail
    // loud rather than skip-and-stay-green (the project's standing guard convention).
    violations.push({ file: manifestRel, line: 1, rule: 'Rule 1b (language manifest unparseable — direction check cannot run)', detail: 'invalid JSON' });
    continue;
  }
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const dep of Object.keys(manifest[field] ?? {})) {
      if (ENGINE_PACKAGES.includes(dep)) {
        violations.push({ file: manifestRel, line: 1, rule: `Rule 1b (language ${field} must not name an engine package)`, detail: dep });
      }
    }
  }
  const devAllow = RULE1B_DEV_ALLOW[manifestRel] ?? [];
  for (const dep of Object.keys(manifest.devDependencies ?? {})) {
    if (ENGINE_PACKAGES.includes(dep) && !devAllow.includes(dep)) {
      violations.push({ file: manifestRel, line: 1, rule: 'Rule 1b (unallowlisted engine devDependency in a language package)', detail: dep });
    }
  }
}

if (violations.length > 0) {
  console.error('');
  console.error('[boundary] the language/engine boundary is violated:');
  console.error('');
  for (const v of violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    console.error(`  ${v.file}:${v.line} — ${v.rule} — ${v.detail}`);
  }
  console.error('');
  console.error('  The boundary is one-way: the language layer (packages/ehtml + the specs/notes prose');
  console.error('  surface) is the normative definition; the engine (packages/enscribe, packages/cli)');
  console.error('  consumes it only via the @enscribejs/ehtml package name, and the language imports');
  console.error('  nothing engine-side. See notes/enscribe-split-migration-plan.md (Stage 0).');
  console.error('');
  process.exit(1);
}

// Quiet success — no output, exit 0 (mirrors check-data-fresh / check-docs-fresh).
