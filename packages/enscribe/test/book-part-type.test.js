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
}
