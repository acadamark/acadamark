// Load Layer 1 vocabulary entries from packages/layer1-vocabulary/elements/.
//
// Each entry is a markdown file with a YAML frontmatter block. The frontmatter
// contains the structured spec (semantic_role, html_output, acadamark_attributes,
// content, interpreter_strategy, handler_module, title_extraction, ...). The
// markdown body is documentation, not consumed at runtime.
//
// Returns a Map<semantic_role, spec>. Loading happens once per pipeline instance;
// callers should cache the result.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Resolve the vocabulary directory relative to this file. We walk up from
// packages/acadamark-interpreter/src/schema/ to packages/, then into
// layer1-vocabulary/elements/. Done lazily so callers can override the path
// (useful in tests).
function defaultVocabularyDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  // here = .../packages/acadamark-interpreter/src/schema
  return join(here, '..', '..', '..', 'layer1-vocabulary', 'elements');
}

export function parseFrontmatter(source) {
  const m = source.match(FRONTMATTER_RE);
  if (!m) return null;
  return yaml.load(m[1]);
}

export function loadVocabulary({ dir } = {}) {
  const vocabDir = dir ?? defaultVocabularyDir();
  const entries = readdirSync(vocabDir).filter(f => f.endsWith('.md'));
  const map = new Map();
  const errors = [];
  for (const file of entries) {
    const path = join(vocabDir, file);
    const src = readFileSync(path, 'utf8');
    let spec;
    try {
      spec = parseFrontmatter(src);
    } catch (err) {
      // Malformed YAML in a vocabulary entry — fail-soft per the "documents
      // always render to something" principle. Log and continue; surfaces the
      // problem without blocking the rest of the load.
      errors.push({ file, error: err });
      // eslint-disable-next-line no-console
      console.warn(`[acadamark-interpreter] YAML parse failed for ${file}: ${err.message?.split('\n')[0] ?? err}`);
      continue;
    }
    if (!spec) {
      // Entry without frontmatter — tolerated (lets us add README/SPEC files
      // to elements/ without breaking loading).
      continue;
    }
    // Key by html_output.element — this is what the parser carries as `tagname`
    // on acadamarkTag nodes (the literal characters the author typed between
    // `<` and the first space/`|`/attribute). For the slice-1 vocabulary,
    // every entry's semantic_role matches html_output.element except `p.md`
    // (semantic_role: paragraph, html_output.element: p). Keying by
    // html_output.element makes the dispatcher's lookup unambiguous; the
    // semantic_role divergence is recorded as a drift finding.
    const key = spec.html_output?.element;
    if (!key) continue;
    if (map.has(key)) {
      // eslint-disable-next-line no-console
      console.warn(`[acadamark-interpreter] duplicate vocabulary key "${key}" in ${file}`);
    }
    map.set(key, { ...spec, _sourceFile: file });
  }
  map._errors = errors;
  return map;
}
