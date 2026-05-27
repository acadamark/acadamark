// Tests for the generated `src/data.js` data module — the run-time
// vocabulary that ships from this package.
//
// Relocated from `acadamark-interpreter/test/schema/load-vocabulary.test.js`
// in Slice 4 of the acadamark-core extraction arc, where the runtime
// `loadVocabulary` loader was replaced by a build-time generator
// (`build/generate-data-module.js`) emitting this module. The structural
// invariants the old test checked are reframed against `VOCABULARY` and
// `VOCABULARY_ERRORS`; the loader-internal `parseFrontmatter` tests are
// dropped (parseFrontmatter is now a build-time-only helper).

import assert from 'node:assert/strict';
import { VOCABULARY, VOCABULARY_ERRORS } from '../src/data.js';

let pass = 0;
let fail = 0;
function check(label, cond) {
  if (cond) {
    pass++;
    console.log(`PASS: ${label}`);
  } else {
    fail++;
    console.log(`FAIL: ${label}`);
  }
}

// Entry count: 71 primary + 1 'quote' alias = 72.
// (Was 66 + 1 = 67 prior to 2026-Q2 — five new <meta> allowlist members
// added: doi, license, lang, version, keywords. The apparatus-tag
// reconciliation defined the <meta> allowlist; this slice closed the
// missing-vocabulary-entries gap.)
check(
  `VOCABULARY has 72 entries (71 primary + 'quote' alias)`,
  Object.keys(VOCABULARY).length === 72,
);

// Build-time loader has nothing to report in normal state.
check('VOCABULARY_ERRORS is empty', VOCABULARY_ERRORS.length === 0);

// In-scope structural elements (the old test's required set).
const required = [
  'article', 'section', 'sub-section', 'sub-sub-section',
  'p', 'aside', 'blockquote', 'hr', 'figure',
  'ul', 'ol', 'li',
  'em', 'strong', 'code',
  'meta',
  'inline-math', 'display-math',
  'code-block', 'inline-code',
  'quote',  // AUD-12 shorthand alias
];
for (const r of required) {
  check(`in-scope vocabulary entry present: ${r}`, VOCABULARY[r] !== undefined);
}

// AUD-12 alias identity: <quote> shares the spec object reference of <blockquote>.
check(
  'quote alias points at the same spec object as blockquote',
  VOCABULARY.quote === VOCABULARY.blockquote,
);

// Generated wrapper / title / subtitle entries.
const generated = [
  'article-front', 'article-body', 'article-back',
  'book-front', 'book-body', 'book-back',
  'article-title', 'article-subtitle',
  'book-title', 'book-subtitle',
  'book-part-title', 'book-part-subtitle',
  'section-title', 'section-subtitle',
  'sub-section-title', 'sub-section-subtitle',
  'sub-sub-section-title', 'sub-sub-section-subtitle',
];
for (const g of generated) {
  check(`auto-generated entry present: ${g}`, VOCABULARY[g] !== undefined);
}

// book-part-meta was removed (book-parts use <meta> directly).
check('book-part-meta absent', VOCABULARY['book-part-meta'] === undefined);

// Field shape spot-checks (the old test's targeted reads).
const p = VOCABULARY.p;
check('<p> html_output.element === "p"', p?.html_output?.element === 'p');
check('<p> interpreter_strategy === "schema"', p?.interpreter_strategy === 'schema');

const fig = VOCABULARY.figure;
check('<figure> interpreter_strategy === "handler"', fig?.interpreter_strategy === 'handler');
check('<figure> declares handler_module', Boolean(fig?.handler_module));

const meta = VOCABULARY.meta;
const typeValues = meta?.acadamark_attributes?.kwargs?.type?.values ?? [];
for (const t of ['article', 'book', 'book-part']) {
  check(`<meta> type kwarg includes "${t}"`, typeValues.includes(t));
}
check('<meta> type kwarg excludes "report" (deferred)', !typeValues.includes('report'));

const art = VOCABULARY.article;
check('<article> declares title_extraction: true', art?.title_extraction === true);

console.log(`\n${pass}/${pass + fail} data-module tests passed`);
if (fail > 0) process.exit(1);
