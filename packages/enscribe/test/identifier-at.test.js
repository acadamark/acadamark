// #183 — `@` is the atref prefix, not an identifier-start character.
//
// The grammar's IdentifierStart previously did not exclude `@`, so `@` leaked
// into ids (`#@id` → id="@id") and kwarg values (`k=@b` → kwargs.k="@b"),
// diverging from the spec EBNF (which excludes it). IdentifierStart now excludes
// `@`; this suite pins that a bare `@key` stays an atref, that mid-identifier
// `@` (emails / URLs) is unaffected (IdentifierCont still allows `@`), and that
// `@` no longer begins an id or a kwarg value.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkEnscribe from '../src/parser/index.js';
import assert from 'node:assert/strict';

const node = (src) => {
  const tree = unified().use(remarkParse).use(remarkEnscribe).parse(src);
  const n = tree.children.find((x) => x.type === 'enscribeTag' || x.type === 'enscribeTagError');
  if (!n) throw new Error(`no enscribeTag in: ${JSON.stringify(src)}`);
  return n;
};

export async function run() {
  // ── bare @key is an atref (unchanged) ───────────────────────────────────────
  {
    const n = node('<cite @smith2020>');
    assert.deepEqual(n.atRefs, ['smith2020'], 'bare @key parses as an atref');
    assert.equal(n.id, null);
    console.log('PASS: #183 — @key parses as an atref, not an identifier');
  }

  // ── mid-identifier @ unaffected (IdentifierCont keeps @): emails / URLs ──────
  {
    const n = node('<x k=a@b.com>');
    assert.equal(n.kwargs.k, 'a@b.com', 'mid-identifier @ is still allowed (emails / URLs)');
    console.log('PASS: #183 — mid-identifier @ (emails / URLs) is unaffected');
  }

  // ── @ cannot START a kwarg value (was kwargs.k="@b") ────────────────────────
  {
    const n = node('<x k=@b>');
    assert.notEqual(n.kwargs?.k, '@b', '@ is not consumed into a kwarg value');
    console.log('PASS: #183 — @ does not leak into a kwarg value');
  }

  // ── @ cannot START an id: #@id is a visible error, never id="@id" ───────────
  {
    const n = node('<x #@id>');
    assert.notEqual(n.id, '@id', '@ is not consumed into an id');
    assert.equal(n.type, 'enscribeTagError', '#@id is rejected as a visible error (always-renders)');
    console.log('PASS: #183 — @ does not leak into an id');
  }
}
