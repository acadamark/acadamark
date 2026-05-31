// End-to-end tests for the parser/handler fixes:
//   • unrecognized (non-vocabulary) tags escape to literal text — no error
//     span, no HTML passthrough (the reader sees the angle brackets);
//   • author raw HTML for non-vocab tags is escaped; vocabulary tags render;
//   • HTML comments (<!-- ... -->) are stripped from the output entirely.
//
// Issue 1 (same-line long-form `<b>bold</b>`) is now implemented (see
// same-line-long-form.test.js for the positive cases). One consequence shows
// up here: an unknown tag written same-line — `<glurp>hi</glurp>` — is now
// parsed as a long-form tag and escaped via the canonical serializer, so the
// literal the reader sees is the pipe form `<glurp | hi>`, identical to how a
// multi-line unknown long-form tag has always escaped. The Issue-2 guarantee
// (reader sees the angle brackets, no HTML passthrough, no error span) holds;
// only the serialized shape of the literal changed.
import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/index.js';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

// A literal `<` serializes as `&#x3C;`; a literal `>` is left bare (valid in text).
const LT = '&#x3C;';

export function run() {
  // ── Issue 2: unrecognized tags escape to literal text ──────────────────────
  {
    // Same-line `<glurp>hello</glurp>` now parses as a long-form tag; unknown,
    // so it escapes via the canonical serializer to the pipe form. The reader
    // still sees the angle brackets and the tag name (Issue-2 guarantee).
    const html = render('A <glurp>hello</glurp> B');
    assert.ok(
      html.includes(`${LT}glurp | hello>`),
      'unknown same-line long-form tag escapes to literal pipe form',
    );
    assert.ok(!html.includes('data-enscribe-unknown'), 'no data-enscribe-unknown span');
    console.log('PASS: unknown <glurp>hello</glurp> → literal text (pipe form)');
  }
  {
    const html = render('A <glurp /> B');
    assert.ok(html.includes(`${LT}glurp />`), 'self-closing unknown tag escapes literally');
    console.log('PASS: unknown <glurp /> → literal text');
  }
  {
    const html = render('A <glurp class="x">hi</glurp> B');
    assert.ok(
      html.includes(`${LT}glurp class="x" | hi>`),
      'unknown same-line long-form tag with attrs escapes to literal pipe form',
    );
    console.log('PASS: unknown <glurp class="x">hi</glurp> → literal text (pipe form)');
  }

  // ── Issue 2b: non-vocab raw HTML escaped; vocabulary tags still render ──────
  {
    // `<div>hi</div>` inline is a non-vocab tag: parsed as a long-form tag and
    // escaped to the pipe form. No raw-HTML passthrough — the reader sees the
    // brackets (the Issue-2b guarantee).
    const html = render('A <div>hi</div> B');
    assert.ok(
      html.includes(`${LT}div | hi>`),
      'non-vocab <div> escapes literally to pipe form (no HTML passthrough)',
    );
    console.log('PASS: non-vocab raw <div> → literal text (pipe form)');
  }
  {
    const html = render('A <em | emphasis> and <span | spanned> here');
    assert.ok(html.includes('<em>emphasis</em>'), 'vocabulary <em> still renders');
    assert.ok(html.includes('<span>spanned</span>'), 'vocabulary <span> still renders');
    console.log('PASS: vocabulary tags still render (no regression)');
  }

  // ── Issue 3: HTML comments stripped ────────────────────────────────────────
  {
    const html = render('text <!-- hidden --> more text');
    assert.ok(!html.includes('<!--'), 'no comment markers in output');
    assert.ok(!html.includes('hidden'), 'comment content removed');
    assert.ok(html.includes('text') && html.includes('more text'), 'surrounding text preserved');
    console.log('PASS: inline comment stripped, surrounding text preserved');
  }
  {
    const html = render('before\n\n<!--\n multi\n line\n-->\n\nafter');
    assert.ok(!html.includes('<!--') && !html.includes('multi'), 'multi-line comment stripped');
    assert.ok(html.includes('before') && html.includes('after'), 'surrounding paragraphs preserved');
    console.log('PASS: multi-line comment stripped');
  }
  {
    const html = render('text <!-- oops no close');
    assert.ok(html.includes(`${LT}!-- oops no close`), 'unclosed comment shown literally');
    console.log('PASS: unclosed comment → literal text');
  }

  // ── Pipe form still works alongside same-line long form (Issue 1) ──────────
  // Same-line long form (`<b>bold</b>`) is covered in same-line-long-form.test.js;
  // the pipe form remains a valid inline spelling and must not regress.
  {
    const html = render('A <b | bold> and <i | italic> text');
    assert.ok(html.includes('<b>bold</b>'), 'pipe-form <b | bold> renders bold');
    assert.ok(html.includes('<i>italic</i>'), 'pipe-form <i | italic> renders italic');
    console.log('PASS: pipe-form inline formatting renders (b, i)');
  }

  console.log('All raw-HTML/comment tests passed.');
}
