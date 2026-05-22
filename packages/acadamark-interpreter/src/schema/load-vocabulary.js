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
    // Key by html_output.element. For named tags this is the literal tag name
    // the author typed (e.g., "p", "section", "figure"). For sigil tags the
    // parser emits the sigil character ("$", "$$", "```", "`") as tagname,
    // but the vocabulary uses descriptive keys ("inline-math", "display-math",
    // "code-block", "inline-code"). The dispatcher uses resolveVocabKey() from
    // remark-acadamark/sigil-mapping to translate parser tagnames to vocabulary
    // keys before lookup.
    //
    // Note: for the initial vocabulary every entry's semantic_role matches
    // html_output.element except p.md (semantic_role: paragraph, element: p).
    // Keying by html_output.element makes the dispatcher's lookup unambiguous.
    const key = spec.html_output?.element;
    if (!key) continue;
    if (map.has(key)) {
      // eslint-disable-next-line no-console
      console.warn(`[acadamark-interpreter] duplicate vocabulary key "${key}" in ${file}`);
    }
    map.set(key, { ...spec, _sourceFile: file });
  }

  // Register simple-name shorthand aliases from shorthand_expansions.
  // For entries with shorthand_expansions where expands_to is a plain vocabulary
  // key (no additional attribute clauses), register the shorthand as a
  // transparent alias pointing at the same spec. This allows authors to write
  // <quote> and have it dispatch to the <blockquote> vocabulary entry.
  //
  // Complex expansions (expands_to contains a space, e.g. 'book-part book-part-
  // type="chapter"') are not handled here — they require attribute-injection at
  // dispatch time and are deferred to a later shorthand-resolution slice.
  for (const [, spec] of map) {
    if (!spec.shorthand_expansions) continue;
    for (const expansion of spec.shorthand_expansions) {
      const { shorthand, expands_to } = expansion;
      if (!shorthand || !expands_to) continue;
      // Skip complex expansions — expands_to must be a bare vocabulary key.
      if (expands_to.includes(' ')) continue;
      if (!map.has(expands_to)) continue;
      if (map.has(shorthand)) {
        // eslint-disable-next-line no-console
        console.warn(`[acadamark-interpreter] shorthand alias "${shorthand}" conflicts with existing key`);
        continue;
      }
      map.set(shorthand, map.get(expands_to));
    }
  }

  map._errors = errors;
  return map;
}
