// Build-time generator for the Layer 1 vocabulary data module.
//
// Walks `packages/layer1-vocabulary/elements/*.md`, parses the YAML
// frontmatter of each, and emits a frozen plain-object ES module at
// `packages/layer1-vocabulary/src/data.js` that downstream consumers
// (the enscribe interpreter today; the forthcoming JATS exporter
// tomorrow) import statically. The runtime module has NO dependencies
// on `fs`, `path`, or `js-yaml` — it ships as pure data.
//
// This logic is the former `enscribe-interpreter/src/schema/load-vocabulary.js`
// loader, moved here and adapted to write a module instead of returning a
// Map. The behavior — file discovery, frontmatter parsing, keying by
// `html_output.element`, duplicate-key warning, `_sourceFile` annotation,
// AUD-12 shorthand-alias machinery (bare-key `expands_to` entries become
// alias keys sharing the spec object) — is reproduced faithfully so that
// the generated module is content-identical to what the live loader
// produced. The equivalence-check test
// (`enscribe-interpreter/test/schema/vocab-equivalence.test.js`, added in
// Slice 4 Step 2 and deleted in Step 6) proves that equivalence before
// the consumer is switched.
//
// Build-time error behavior differs from the runtime loader's:
//   - Malformed YAML → the generator FAILS LOUDLY (non-zero exit, blocks
//     the build). The loader's fail-soft rationale was the "documents
//     always render to something" principle, appropriate at runtime; at
//     build time the developer can and should fix the source file.
//   - Duplicate key → warn, non-fatal, second-wins (matches loader).
//
// Run with: `npm run build` in the `layer1-vocabulary` package.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOCAB_DIR = join(__dirname, '..', 'elements');
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data.js');

function parseFrontmatter(source) {
  const m = source.match(FRONTMATTER_RE);
  if (!m) return null;
  return yaml.load(m[1]);
}

/**
 * Phase 5 slice 5a (2026-05-29): walk a vocab spec and normalize every
 * `maps_to: <string>` into `maps_to: { html: <string> }`. Per-target
 * forms (`maps_to: { html: ..., jats: ... }`) are preserved as-is. This
 * lets vocab YAML keep the natural `maps_to: id` shorthand for the
 * common case (HTML-only or HTML+JATS-same-name) while supporting the
 * explicit target-keyed form when names differ across output targets.
 *
 * Touches `spec.enscribe_attributes.id.maps_to`,
 * `.classes.maps_to`, and every entry of `.kwargs.*.maps_to`.
 */
function liftMapsToToTargetForm(spec) {
  const attrs = spec?.enscribe_attributes;
  if (!attrs) return;
  liftField(attrs.id);
  liftField(attrs.classes);
  if (attrs.kwargs && typeof attrs.kwargs === 'object') {
    for (const def of Object.values(attrs.kwargs)) {
      liftField(def);
    }
  }
  if (attrs.booleans && typeof attrs.booleans === 'object') {
    for (const def of Object.values(attrs.booleans)) {
      liftField(def);
    }
  }
}

function liftField(def) {
  if (!def || typeof def !== 'object') return;
  if (typeof def.maps_to === 'string') {
    def.maps_to = { html: def.maps_to };
  }
  // If maps_to is already an object, leave as-is (per-target explicit form).
}

// Mirror the loader's logic. Returns:
//   { entries: Map<key, spec>, aliases: Array<{shorthand, expands_to}>, errors: Array<{file, error}> }
// `entries` holds the primary entries (keyed by html_output.element);
// `aliases` is the list of bare-key shorthand aliases discovered in the
// post-loop; the caller emits aliases as shared-reference object keys.
// `errors` mirrors the loader's `map._errors` for build-time reporting.
function loadVocabularySource(vocabDir) {
  const fileList = readdirSync(vocabDir).filter(f => f.endsWith('.md'));
  const entries = new Map();
  const errors = [];

  for (const file of fileList) {
    const path = join(vocabDir, file);
    const src = readFileSync(path, 'utf8');
    let spec;
    try {
      spec = parseFrontmatter(src);
    } catch (err) {
      errors.push({ file, error: err });
      throw new Error(
        `[layer1-vocabulary] YAML parse failed in ${file}: ${err.message?.split('\n')[0] ?? err}\n` +
        `Build-time generator fails loudly on malformed YAML — fix the source file and re-run \`npm run build\`.`,
      );
    }
    if (!spec) continue; // tolerate frontmatter-less files (README/SPEC.md)
    // Phase 5 slice 5a (2026-05-29): lift maps_to from string to target-
    // keyed object form. Vocab YAMLs continue to author `maps_to: id`
    // (the simple HTML case reads naturally) and the generator normalizes
    // to `{ html: "id" }` at generation time. Vocab entries with a JATS
    // counterpart different from HTML write the object form explicitly:
    //   maps_to:
    //     html: data-figure-type
    //     jats: content-type
    // The generator preserves object forms as-is.
    liftMapsToToTargetForm(spec);
    const key = spec.html_output?.element;
    if (!key) continue;
    if (entries.has(key)) {
      // eslint-disable-next-line no-console
      console.warn(`[layer1-vocabulary] duplicate vocabulary key "${key}" in ${file}`);
    }
    entries.set(key, { ...spec, _sourceFile: file });
  }

  // AUD-12 shorthand-alias machinery — post-loop. For entries with
  // `shorthand_expansions` where `expands_to` is a bare vocabulary key
  // (no space — complex expansions like 'book-part book-part-type="chapter"'
  // are skipped, matching the loader), register the shorthand as a key
  // sharing the spec object reference of its target.
  const aliases = [];
  for (const [, spec] of entries) {
    if (!spec.shorthand_expansions) continue;
    for (const expansion of spec.shorthand_expansions) {
      const { shorthand, expands_to } = expansion;
      if (!shorthand || !expands_to) continue;
      if (expands_to.includes(' ')) continue;
      if (!entries.has(expands_to)) continue;
      if (entries.has(shorthand)) {
        // eslint-disable-next-line no-console
        console.warn(`[layer1-vocabulary] shorthand alias "${shorthand}" conflicts with existing key`);
        continue;
      }
      aliases.push({ shorthand, expands_to });
    }
  }

  return { entries, aliases, errors };
}

// Produce a JS-source representation of an arbitrary JSON-compatible value.
// Used for emitting the per-entry frozen specs. Strings → JSON-quoted; arrays
// → bracket literals; plain objects → brace literals with quoted keys; null/
// number/boolean → JSON; `undefined` → omitted at the object level (handled
// in the caller). Recursion-safe for the JSON-shaped structures YAML produces.
function emitJs(value, indent = '  ') {
  if (value === null) return 'null';
  if (typeof value === 'string')  return JSON.stringify(value);
  if (typeof value === 'number')  return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const inner = value.map(v => indent + '  ' + emitJs(v, indent + '  ')).join(',\n');
    return '[\n' + inner + ',\n' + indent + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter(k => value[k] !== undefined);
    if (keys.length === 0) return '{}';
    const inner = keys.map(k => {
      const keyJs = JSON.stringify(k);
      return indent + '  ' + keyJs + ': ' + emitJs(value[k], indent + '  ');
    }).join(',\n');
    return '{\n' + inner + ',\n' + indent + '}';
  }
  // Functions, undefined, etc. — not expected in YAML output.
  throw new Error(`emitJs: unsupported value type: ${typeof value}`);
}

// Produce a valid JS identifier from a vocabulary key (which may contain
// hyphens or be a sigil character). Used for the per-entry `const _name`
// bindings.
function bindingName(key) {
  // Replace any non-identifier char with underscore; prefix with underscore.
  return '_' + key.replace(/[^A-Za-z0-9_]/g, '_');
}

function generate() {
  const { entries, aliases, errors } = loadVocabularySource(VOCAB_DIR);

  const lines = [];
  lines.push('// GENERATED — do not edit.');
  lines.push('// Regenerated from `packages/layer1-vocabulary/elements/*.md` by');
  lines.push('// `packages/layer1-vocabulary/build/generate-data-module.js`.');
  lines.push(`// Source files: ${entries.size} vocabulary entries.`);
  lines.push('//');
  lines.push('// The generator is build-time-only (it uses `fs` / `js-yaml`); the');
  lines.push('// emitted module below is pure data — no `fs`, no dependencies,');
  lines.push('// browser-safe. Consumers import `VOCABULARY` (and');
  lines.push('// `VOCABULARY_ERRORS` for build-time-surfaced load issues).');
  lines.push('//');
  lines.push('// Shorthand aliases share the spec object reference of their target');
  lines.push('// (matching the previous loader\'s identity behavior).');
  lines.push('');

  // Emit one `const _name = Object.freeze({...})` per entry.
  const bindings = new Map(); // key → bindingName
  for (const [key, spec] of entries) {
    const name = bindingName(key);
    bindings.set(key, name);
    lines.push(`const ${name} = Object.freeze(${emitJs(spec)});`);
    lines.push('');
  }

  // Emit the VOCABULARY object: primary entries + alias entries (shared ref).
  lines.push('export const VOCABULARY = Object.freeze({');
  for (const [key] of entries) {
    lines.push(`  ${JSON.stringify(key)}: ${bindings.get(key)},`);
  }
  for (const { shorthand, expands_to } of aliases) {
    lines.push(`  ${JSON.stringify(shorthand)}: ${bindings.get(expands_to)},  // alias`);
  }
  lines.push('});');
  lines.push('');

  // VOCABULARY_ERRORS — empty in the normal state. Build-fail-on-YAML-error
  // means this is effectively always empty post-build, but the export is
  // present to preserve a parallel to the loader's _errors side-property.
  lines.push('export const VOCABULARY_ERRORS = Object.freeze([');
  for (const e of errors) {
    lines.push(`  { file: ${JSON.stringify(e.file)}, error: ${JSON.stringify(String(e.error))} },`);
  }
  lines.push(']);');
  lines.push('');

  const source = lines.join('\n');
  writeFileSync(OUTPUT_PATH, source, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[layer1-vocabulary] generated ${OUTPUT_PATH} (${entries.size} entries, ${aliases.length} aliases)`);
}

generate();
