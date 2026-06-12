// Slice A — enscribeDocTypeResolve: resolve <meta type> once, validate, warn on
// an explicit unknown type (the audit gap: `<meta type=slides>` used to render as a
// silent article). Declared types pass through unchanged; absent type → silent article.

import assert from 'node:assert/strict';
import { enscribeDocTypeResolve } from '../../src/interpreter/index.js';
import { makeTag } from '../../src/core/tag.js';
import { ENSCRIBE_DOC_TYPE } from '../../src/core/file-data-keys.js';

const metaTag = (type) => makeTag('meta', [], { kwargs: type != null ? { type } : {} });

function resolve(metaType, { hasMeta = true } = {}) {
  const children = hasMeta ? [metaTag(metaType)] : [{ type: 'paragraph', children: [] }];
  const tree = { type: 'root', children };
  const messages = [];
  const file = {
    data: {},
    message: (reason, _place, ruleId) => {
      messages.push({ reason, ruleId });
      return { reason };
    },
  };
  enscribeDocTypeResolve()(tree, file);
  return { docType: file.data[ENSCRIBE_DOC_TYPE], messages };
}

export function run() {
  // Declared types pass through unchanged, no warning.
  for (const t of ['article', 'book', 'book-part']) {
    const { docType, messages } = resolve(t);
    assert.equal(docType, t, `<meta type=${t}> resolves to ${t}`);
    assert.equal(messages.length, 0, `<meta type=${t}> does not warn`);
  }
  console.log('PASS: doc-type — declared types (article/book/book-part) resolve unchanged, no warning');

  // Explicit unknown → warn + fall back to article (the audit gap).
  {
    const { docType, messages } = resolve('slides');
    assert.equal(docType, 'article', 'unknown explicit type falls back to article');
    assert.equal(messages.length, 1, 'unknown type emits exactly one diagnostic');
    assert.ok(/unknown document type/i.test(messages[0].reason), 'diagnostic names the problem');
    assert.equal(messages[0].ruleId, 'doc-type-resolve:unknown-type', 'diagnostic carries the rule id');
  }
  console.log('PASS: doc-type — explicit unknown type warns and falls back to article (the audit gap)');

  // Absent <meta type> (and no <meta> at all) → silent article, no warning.
  {
    const a = resolve(undefined); // <meta> with no type kwarg
    assert.equal(a.docType, 'article', 'absent type → article');
    assert.equal(a.messages.length, 0, 'absent type does not warn');
    const b = resolve(undefined, { hasMeta: false }); // no <meta> at all
    assert.equal(b.docType, 'article', 'no <meta> → article');
    assert.equal(b.messages.length, 0, 'no <meta> does not warn');
  }
  console.log('PASS: doc-type — absent type / no <meta> → silent article (no warning)');
}
