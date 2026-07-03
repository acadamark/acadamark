// Guard (#237): every intra-vocab cross-reference in an element `.md` BODY must resolve to a
// canonical element file or a known alias. Catches broken `[text](name.md)` links — the kind
// slice 1's catalog generator surfaced (retired tags `mermaid`/`abc`/`csv`/`tsv`, the section
// titles' aliases, HTML-native non-vocab elements `ul`/`ol`/`pre`/`del`/`ins`), which are broken
// even on the GitHub `.md` reading surface. This reads the BODIES (the data module carries only
// frontmatter), so it is the one test that owns the prose's link integrity; slice 1's generator
// strips unresolvable links defensively, but THIS is the actual guard against regrowth.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOCABULARY } from '../src/data.js';

const ELEMENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'elements');
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

const files = readdirSync(ELEMENTS_DIR).filter((f) => f.endsWith('.md'));
// Resolvable: every canonical element file stem PLUS every VOCABULARY key — the keys include
// the shorthand aliases (figure→fig, quote→blockquote) that resolve but have no file of their own.
const resolvable = new Set([
  ...files.map((f) => f.replace(/\.md$/, '')),
  ...Object.keys(VOCABULARY),
]);

const broken = [];
for (const file of files) {
  const body = readFileSync(join(ELEMENTS_DIR, file), 'utf8').replace(FRONTMATTER_RE, '');
  for (const m of body.matchAll(/\]\(([A-Za-z0-9-]+)\.md(?:#[^)]*)?\)/g)) {
    if (!resolvable.has(m[1])) broken.push(`${file} → ${m[1]}.md`);
  }
}

if (broken.length) {
  console.log(`FAIL: ${broken.length} broken intra-vocab cross-reference(s):`);
  for (const b of broken) console.log(`  - ${b}`);
  console.log('\nEvery [text](name.md) link in an element body must point to a canonical element file or an alias.');
  process.exit(1);
}
console.log(`PASS: cross-references — all intra-vocab .md links across ${files.length} element bodies resolve`);
