// End-to-end tests for the parser/handler fixes:
//   • unrecognized (non-vocabulary) tags escape to literal text — no error
//     span, no HTML passthrough (the reader sees the angle brackets);
//   • author raw HTML for non-vocab tags is escaped; vocabulary tags render;
//   • HTML comments (<!-- ... -->) are stripped from the output entirely.
//
// Issue 1 (same-line long-form `<b>bold</b>`) is deferred to a separate parser
// slice; the inline form is the pipe form `<b | bold>`, asserted here.
import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/index.js';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

// A literal `<` serializes as `&#x3C;`; a literal `>` is left bare (valid in text).
const LT = '&#x3C;';

export function run() {
  // ── Issue 2: unrecognized tags escape to literal text ──────────────────────
  {
    const html = render('A <glurp>hello</glurp> B');
    assert.ok(
      html.includes(`${LT}glurp>hello${LT}/glurp>`),
      'unknown long-form tag renders as escaped literal text',
    );
    assert.ok(!html.includes('data-enscribe-unknown'), 'no data-enscribe-unknown span');
    console.log('PASS: unknown <glurp>hello</glurp> → literal text');
  }
  {
    const html = render('A <glurp /> B');
    assert.ok(html.includes(`${LT}glurp />`), 'self-closing unknown tag escapes literally');
    console.log('PASS: unknown <glurp /> → literal text');
  }
  {
    const html = render('A <glurp class="x">hi</glurp> B');
    assert.ok(html.includes(`${LT}glurp class="x">`), 'unknown tag with attrs escapes literally');
    console.log('PASS: unknown <glurp class="x"> → literal text');
  }

  // ── Issue 2b: non-vocab raw HTML escaped; vocabulary tags still render ──────
  {
    const html = render('A <div>hi</div> B');
    assert.ok(
      html.includes(`${LT}div>hi${LT}/div>`),
      'non-vocab raw <div> escapes literally (no HTML passthrough)',
    );
    console.log('PASS: non-vocab raw <div> → literal text');
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

  // ── Issue 1 deferred: same-line long form not yet supported; pipe form works ─
  {
    const html = render('A <b | bold> and <i | italic> text');
    assert.ok(html.includes('<b>bold</b>'), 'pipe-form <b | bold> renders bold');
    assert.ok(html.includes('<i>italic</i>'), 'pipe-form <i | italic> renders italic');
    console.log('PASS: pipe-form inline formatting renders (b, i)');
  }

  console.log('All raw-HTML/comment tests passed.');
}
