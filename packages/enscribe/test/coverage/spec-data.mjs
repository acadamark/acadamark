// Coverage spec-data — loads the GENERATED coverage facts and re-exports them in
// the shape build-coverage.mjs / predicate-harness.mjs consume.
//
// THE SOURCE OF TRUTH IS spec-data.generated.json, produced by gen-spec-data.mjs
// by PARSING notes/specs/{render-quality,tag-forms-reference,idioms}.md. This file
// used to be a hand-transcription that could silently drift from the specs (the
// exact failure #5 exists to prevent); it is now a thin loader. The generated JSON
// is kept honest by the drift check in spec-data.test.js (regenerate + diff). The
// test path imports the committed JSON, never notes/ live — so runtime stays
// independent of notes/ while the data is no longer a hand-copy that can rot.
//
// Provenance per field: dispositions + area ← render-quality.md §2 coverage map;
// predicates (id/area/kind/asserts) ← render-quality.md §§3–15.5 bullets; forms
// ← tag-forms-reference.md; idioms ← idioms.md normalization table. Element list,
// kwargs, content type, strategy are NOT here — read live from VOCABULARY; the
// sigil register is read live from core/tagname-sigil-map.js.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'spec-data.generated.json'), 'utf8'));

/** [ [RQ-code, human label], … ] in coverage-map order. */
export const AREAS = data.areas;

/** [ { id, area, kind: 'M'|'S'|'O', asserts }, … ] — the render-quality predicates. */
export const PREDICATES = data.predicates;

/** element → [pipe, slash, long] with markers ✓ · — (tag-forms-reference). */
export const FORMS = data.forms;
export const FORM_NAMES = data.formNames;

/** element → { area, disposition } (render-quality §2 coverage map). */
export const DISPOSITION = data.dispositions;

/** [ { bare, tagname }, … ] — the idioms.md normalization table. */
export const IDIOMS = data.idioms;

/** Generated / not-authored-directly: every element with an all-`—` tag-forms row. */
export const GENERATED = Object.entries(FORMS).filter(([, m]) => m.every((c) => c === '—')).map(([k]) => k);

/** Markdown-expressible lift targets (idiom tagnames + autolink → a). */
export const MARKDOWN_ELEMENTS = [...new Set(IDIOMS.map((i) => i.tagname)), 'a'];

/** Canonical-only by decision (a coverage FACT, not a gap): em/strong semantic; u has no idiom. */
export const CANONICAL_ONLY_BY_DECISION = ['em', 'strong', 'u'];
