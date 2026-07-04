// #100 — article appendices (the article projection of <appendix>).
//
// <appendix> is one authoring element with two projections by <meta type>:
//   - book    → <book-part book-part-type="appendix"> in <book-back> (unchanged)
//   - article → the same book-part surface, placed in <article-back>, lettered by
//               #57's scheme, and exported to JATS <app> (see the cli JATS suite).
// This suite covers the article HTML render + structure + numbering + xref. The
// authoring surface, render path, title/id, and numbering are reused from the
// book appendix — only the placement (article-back) and projection are new.

import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const html = (src) => String(buildEnscribePipeline({}).processSync(src));
const mdast = (src) => {
  const p = buildEnscribePipeline({});
  return p.runSync(p.parse(src));
};
const backOf = (h) => h.match(/<article-back>[\s\S]*?<\/article-back>/)?.[0] ?? '';

// Article with two appendices + a cross-reference; number-sections on so the
// appendices letter (coupled to #57's scheme, exactly as for books).
const ARTICLE = [
  '<meta type=article>', '<title | T>', '</meta>', '',
  '<config number-sections=true />', '',
  '# Intro', '', 'See <ref @app:a> and <ref @app:b>.', '',
  '<appendix #app:a | Notation>', '', 'Body of A.', '', '## Symbols', '', 'A.1 content.', '',
  '<appendix #app:b | Sources>', '', 'Body of B.',
].join('\n');

export async function run() {
  const h = html(ARTICLE);
  const back = backOf(h);

  // ── projection: appendices land in <article-back> as appendix book-parts ────
  assert.ok(back.includes('book-part-type="appendix"'), 'appendices placed in <article-back>');
  assert.ok(back.includes('id="app:a"') && back.includes('id="app:b"'), 'both appendix ids kept');
  // reused title surface: the book-part-title heading carries the authored title.
  assert.ok(back.includes('Notation') && back.includes('Sources'), 'appendix titles render as headings');
  console.log('PASS: #100 — article appendices render into <article-back> (reused book-part surface)');

  // ── numbering: #57 letter scheme — A, B, and A.1 for sub-sections ───────────
  assert.ok(/book-part-type="appendix"[\s\S]*?<section-number>A</.test(back), 'first appendix lettered A');
  assert.ok(/<section-number>B</.test(back), 'second appendix lettered B');
  assert.ok(/<section-number>A\.1</.test(back), 'appendix sub-section numbered A.1');
  console.log('PASS: #100 — appendices join #57 letter scheme (A, B, A.1)');

  // ── cross-reference: "appendix A" / "appendix B" resolve ────────────────────
  assert.ok(/<a href="#app:a" class="ref">appendix A<\/a>/.test(h), '<ref @app:a> → "appendix A"');
  assert.ok(/<a href="#app:b" class="ref">appendix B<\/a>/.test(h), '<ref @app:b> → "appendix B"');
  console.log('PASS: #100 — "appendix A/B" cross-references resolve');

  // ── display-only / additive: an article WITHOUT an appendix is unaffected ───
  const plain = '<meta type=article>\n<title | T>\n</meta>\n\n# Intro\n\nBody.';
  assert.ok(!html(plain).includes('book-part-type="appendix"'), 'no-appendix article has no appendix book-part');
  console.log('PASS: #100 — articles without an appendix are unaffected');

  // ── book path untouched: a book appendix still goes to <book-back> ──────────
  const book = '<meta type=book>\n<title | B>\n</meta>\n\n<chapter | One>\n\nBody.\n\n<appendix #app:n | Notation>\n\nApp.';
  const bookTree = mdast(book);
  const bookEl = (bookTree.children || []).find((c) => c.tagname === 'book');
  const bookBack = (bookEl?.content || []).find((c) => c.tagname === 'book-back');
  assert.ok(bookBack && (bookBack.content || []).some((c) => c.tagname === 'book-part'), 'book appendix stays in <book-back>');
  console.log('PASS: #100 — book appendices unchanged (still <book-back>)');
}
