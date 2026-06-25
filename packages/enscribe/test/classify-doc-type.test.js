// The ONE document-class classifier (1-C from #316 / #322).
//
// classify-doc-type.js owns the rule — find the first `<meta>` node, read `type`, validate against
// the vocab-declared set, fall back to the default — that ~6 sites used to re-implement (only the
// plugin validated). This exercises the shared classifier directly (article / book / website /
// book-part / absent / explicit-unknown), and confirms the explicit-unknown WARNING still fires from
// the enscribeDocTypeResolve plugin path (the diagnostic stays in the plugin; the rule moved out).

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import {
  classifyDocType,
  classifyDocTypeFromSource,
  DOC_TYPES,
  DEFAULT_DOC_TYPE,
} from '../src/interpreter/lib/classify-doc-type.js';
import { ENSCRIBE_DOC_TYPE } from '../src/core/file-data-keys.js';

let pass = 0;
let fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`PASS: ${label}`); }
  else { fail++; console.log(`FAIL: ${label}`); }
}

const proc = buildEnscribePipeline({});
const classify = (src) => classifyDocTypeFromSource(src, proc);
// vfile splits the origin `doc-type-resolve:unknown-type` into source + ruleId on the first colon.
const isDocTypeWarn = (m) => m.source === 'doc-type-resolve' && m.ruleId === 'unknown-type';
const hasUnknownWarn = (file) => file.messages.some(isDocTypeWarn);

// ── 1. The declared set + default ARE the vocabulary's (single source), and DOC_TYPES is frozen ──
check('DOC_TYPES = the four vocab-declared classes',
  [...DOC_TYPES].join(',') === 'article,book,book-part,website');
check('DEFAULT_DOC_TYPE is article', DEFAULT_DOC_TYPE === 'article');
check('DOC_TYPES is frozen (no silent fork)', Object.isFrozen(DOC_TYPES));

// ── 2. Each declared class classifies to itself, known=true, raw preserved ──
for (const t of ['article', 'book', 'book-part', 'website']) {
  const body = t === 'book' || t === 'book-part' ? '\n\n<chapter | C>\nx' : '\n\nBody.';
  const r = classify(`<meta type=${t}>\n<title | X>\n</meta>${body}`);
  check(`classify type=${t} → ${t} (known, raw preserved)`, r.type === t && r.known === true && r.raw === t);
}

// ── 3. Absent type / no <meta> → the validated default (article), known=false, raw=null ──
const noType = classify('<meta>\n<title | X>\n</meta>\n\nBody.');
check('<meta> with no type → article, raw=null, not known', noType.type === 'article' && noType.raw === null && noType.known === false);
const noMeta = classify('Just prose, no meta at all.');
check('no <meta> at all → article, raw=null, not known', noMeta.type === 'article' && noMeta.raw === null && noMeta.known === false);

// ── 4. Explicit-unknown → the VALIDATED fallback (article), known=false, raw preserved for the warning ──
const unknown = classify('<meta type=slides>\n<title | X>\n</meta>\n\nBody.');
check('type=slides (unknown) → article fallback, raw="slides", not known',
  unknown.type === 'article' && unknown.raw === 'slides' && unknown.known === false);

// ── 5. The TREE rule skips a `<meta>` inside a code EXAMPLE (the static-website regex bug it fixes) ──
const metaInCode = classify('<meta type=article>\n<title | Real>\n</meta>\n\n```\n<meta type=book>\n```\nx');
check('a <meta type=book> inside a code fence is NOT the doc class (the real header wins)', metaInCode.type === 'article');

// classifyDocType direct over a pre-parsed tree returns the same as the source adapter (parity).
check('classifyDocType(tree) === classifyDocTypeFromSource(source) (adapter is just parse+classify)',
  classifyDocType(proc.parse('<meta type=book>\n</meta>\n\n<chapter|C>\nx')).type === 'book');

// ── 6. The PLUGIN path still fires the explicit-unknown WARNING and writes the resolved file.data ──
const unknownFile = proc.processSync('<meta type=slides>\n<title | X>\n</meta>\n\nBody.');
check('plugin: explicit-unknown emits doc-type-resolve:unknown-type', hasUnknownWarn(unknownFile));
check('plugin: explicit-unknown resolves file.data to the fallback (article)', unknownFile.data[ENSCRIBE_DOC_TYPE] === 'article');
check('plugin: the warning names the declared set + fallback',
  unknownFile.messages.some((m) => isDocTypeWarn(m)
    && /expected one of: article, book, book-part, website\. Rendering as article\./.test(m.reason)));

// ── 7. The plugin does NOT warn on a valid or absent type, and writes the right resolved class ──
const bookFile = proc.processSync('<meta type=book>\n<title | X>\n</meta>\n\n<chapter | C>\nx');
check('plugin: valid type=book → no doc-type warning', !hasUnknownWarn(bookFile));
check('plugin: valid type=book → file.data is book', bookFile.data[ENSCRIBE_DOC_TYPE] === 'book');
const absentFile = proc.processSync('<meta>\n<title | X>\n</meta>\n\nBody.');
check('plugin: absent type → no doc-type warning (the normal article case)', !hasUnknownWarn(absentFile));
check('plugin: absent type → file.data is article', absentFile.data[ENSCRIBE_DOC_TYPE] === 'article');

assert.equal(fail, 0, `${fail} classify-doc-type checks failed`);
console.log(`\n${pass}/${pass + fail} classify-doc-type (1-C / #316 / #322) tests passed`);
if (fail > 0) process.exit(1);
