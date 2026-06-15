// #176 — a single-file <meta type=book-part> can set book-part-type.
//
// Before #176 the type=book-part branch read a misspelled kwarg
// (`book-part-part-type`), and <meta>'s allowlist omitted `book-part-type`, so
// the value could never be set — a single-file book-part was always wrapped
// "chapter" (which is wrong: a single-file appendix needs
// book-part-type="appendix", #100). This suite covers the fixed path: the value
// flows, defaults to chapter when unset, and an unknown value warns but still
// renders (always-renders).

import assert from 'node:assert/strict';
import { buildEnscribePipeline } from '../src/interpreter/index.js';
import { VOCABULARY } from '@enscribejs/layer1-vocabulary';

const render = (src) => {
  const file = buildEnscribePipeline({}).processSync(src);
  return { html: String(file), messages: file.messages.map((m) => m.reason) };
};

const doc = (metaOpen) =>
  [metaOpen, '<title | T>', '</meta>', '', '# Section', '', 'Body.'].join('\n');

export async function run() {
  // ── the value flows: an author-set book-part-type reaches the wrapper ───────
  {
    const { html } = render(doc('<meta type=book-part book-part-type=appendix>'));
    assert.ok(html.includes('book-part-type="appendix"'),
      'author-set book-part-type="appendix" reaches the <book-part> wrapper');
    assert.ok(!html.includes('book-part-type="chapter"'),
      'the appendix is not silently downgraded to chapter');
    console.log('PASS: #176 — single-file book-part honors an author-set book-part-type');
  }

  // ── default: unset book-part-type defaults to chapter ───────────────────────
  {
    const { html } = render(doc('<meta type=book-part>'));
    assert.ok(html.includes('book-part-type="chapter"'),
      'unset book-part-type defaults to chapter');
    console.log('PASS: #176 — unset book-part-type defaults to chapter');
  }

  // ── unknown value: located non-fatal diagnostic, still renders ──────────────
  {
    const { html, messages } = render(doc('<meta type=book-part book-part-type=bogus>'));
    assert.ok(messages.some((m) => /unknown book-part-type "bogus"/.test(m)),
      'an unknown book-part-type emits a diagnostic');
    assert.ok(html.includes('book-part-type="bogus"'),
      'always-renders: the document still renders with the given value');
    console.log('PASS: #176 — unknown book-part-type warns but still renders');
  }

  // ── membership pin (#243): the validator's accepted set is DERIVED from the vocab
  //    `book-part` `type.values` (book-structuring.js, mirroring doc-type's META_TYPE).
  //    Pin the expected 12 so a future vocab `type.values` edit is a deliberate, caught
  //    change — not a silent validator drift — and confirm the derived validator accepts
  //    every one (no diagnostic). ──
  {
    const expected = [
      'afterword', 'appendix', 'chapter', 'colophon', 'conclusion', 'dedication',
      'foreword', 'glossary', 'introduction', 'other', 'part', 'preface',
    ];
    const actual = [...(VOCABULARY['book-part']?.enscribe_attributes?.kwargs?.type?.values ?? [])].sort();
    assert.deepEqual(actual, expected,
      `book-part type.values drifted from the pinned 12: {${actual.join(', ')}}`);
    for (const t of expected) {
      const { messages } = render(doc(`<meta type=book-part book-part-type=${t}>`));
      assert.ok(!messages.some((m) => /unknown book-part-type/.test(m)),
        `book-part-type "${t}" must be accepted by the derived validator (no diagnostic)`);
    }
    console.log('PASS: #243 — book-part-type validator accepts exactly the 12 vocab type.values');
  }
}
