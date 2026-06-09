// End-to-end tests for the parser/handler fixes:
//   • unrecognized (non-vocabulary) tags escape to literal text — no error
//     span, no HTML passthrough (the reader sees the angle brackets);
//   • author raw HTML for non-vocab tags is escaped; vocabulary tags render;
//   • HTML comments (<!-- ... -->) are stripped from the output entirely.
//
// Unknown tags echo the author's ORIGINAL syntax with the angle brackets
// escaped — the literal is reconstructed in the same authoring form the author
// used, not canonicalized to pipe form. So `<glurp>hi</glurp>` displays as
// `<glurp>hi</glurp>`, `<glurp | hi>` as `<glurp | hi>`, and `<glurp />` as
// `<glurp />`. The Issue-2 guarantee (reader sees the angle brackets, no HTML
// passthrough, no error span) holds. (Same-line long form — `<b>bold</b>` —
// is implemented; see same-line-long-form.test.js for the positive cases.)
import assert from 'node:assert';
import { buildEnscribePipeline } from '../src/interpreter/index.js';

const render = (src) =>
  String(buildEnscribePipeline({ embedResources: false, dslMode: 'skip' }).processSync(src));

// A literal `<` serializes as `&#x3C;`; a literal `>` is left bare (valid in text).
const LT = '&#x3C;';

export function run() {
  // ── Issue 2: unrecognized tags escape to literal text ──────────────────────
  {
    // Long form: echoes `<glurp>hello</glurp>` exactly (brackets escaped).
    const html = render('A <glurp>hello</glurp> B');
    assert.ok(
      html.includes(`${LT}glurp>hello${LT}/glurp>`),
      'unknown long-form tag echoes its original `<tag>content</tag>` syntax',
    );
    assert.ok(!html.includes('data-enscribe-unknown'), 'no data-enscribe-unknown span');
    console.log('PASS: unknown <glurp>hello</glurp> → literal <glurp>hello</glurp>');
  }
  {
    const html = render('A <glurp /> B');
    assert.ok(html.includes(`${LT}glurp />`), 'self-closing unknown tag echoes `<tag />`');
    console.log('PASS: unknown <glurp /> → literal <glurp />');
  }
  {
    // Pipe form echoes `<glurp | hello>` (not canonicalized away).
    const html = render('A <glurp | hello> B');
    assert.ok(
      html.includes(`${LT}glurp | hello>`),
      'unknown pipe-form tag echoes its original `<tag | content>` syntax',
    );
    console.log('PASS: unknown <glurp | hello> → literal <glurp | hello>');
  }
  {
    // Long form with an attribute echoes `<glurp class="x">hi</glurp>`.
    const html = render('A <glurp class="x">hi</glurp> B');
    assert.ok(
      html.includes(`${LT}glurp class="x">hi${LT}/glurp>`),
      'unknown long-form tag with attrs echoes its original syntax',
    );
    console.log('PASS: unknown <glurp class="x">hi</glurp> → literal long form');
  }
  {
    // Mixed nesting: a recognized tag inside an unknown one still renders. The
    // unknown opener/closer show literally; the inner `<b>` renders as real bold.
    const html = render('<glurp>see <b>bold</b> here</glurp>');
    assert.ok(
      html.includes(`${LT}glurp>see <b>bold</b> here${LT}/glurp>`),
      'unknown wrapper is literal but its recognized children still render',
    );
    console.log('PASS: recognized tag nested in unknown tag still renders');
  }

  // ── ul/ol/li authored as raw HTML are not vocabulary ──────────────────────
  // The canonical list is `<list>` (it lowers to a mdast list/listItem); `<ul>` /
  // `<ol>` are its render OUTPUT, not authoring vocabulary, so authored directly
  // they escape to literal text — they must NOT render as real list elements.
  // `<li>` IS the canonical item marker, but only as an open marker at flow
  // position inside a `<list>` (notes/specs/lists.md §"Recognition"); a pipe-form
  // `<li | …>` or an inline `<li>…</li>` is not a marker and likewise escapes.
  {
    const html = render('<ul>\n<li | First item>\n<li | Second item>\n</ul>');
    assert.ok(
      html.includes(`${LT}ul>${LT}li | First item>${LT}li | Second item>${LT}/ul>`),
      'authored <ul> with pipe-form <li> items echoes its source literally',
    );
    assert.ok(!html.includes('<ul>'), 'no real <ul> element rendered');
    assert.ok(!html.includes('<li>'), 'no real <li> element rendered');
    console.log('PASS: authored <ul>/<li> → literal escape (not a real list)');
  }
  {
    const html = render('<ol>\n<li | Step one>\n</ol>');
    assert.ok(
      html.includes(`${LT}ol>${LT}li | Step one>${LT}/ol>`),
      'authored <ol> echoes its source literally',
    );
    assert.ok(!html.includes('<ol>'), 'no real <ol> element rendered');
    console.log('PASS: authored <ol> → literal escape');
  }
  {
    // A bare <li> in both registers echoes its original syntax (pipe / long).
    const pipe = render('A <li | lone item> B');
    assert.ok(pipe.includes(`${LT}li | lone item>`), 'bare <li | …> echoes pipe form literally');
    const long = render('A <li>lone</li> B');
    assert.ok(long.includes(`${LT}li>lone${LT}/li>`), 'bare <li>…</li> echoes long form literally');
    console.log('PASS: bare <li> (pipe and long) → literal escape');
  }

  // ── Issue 2b: non-vocab raw HTML escaped; vocabulary tags still render ──────
  {
    // `<div>hi</div>` inline is a non-vocab tag: echoes its original long-form
    // syntax with the brackets escaped. No raw-HTML passthrough — the reader
    // sees the brackets (the Issue-2b guarantee).
    const html = render('A <div>hi</div> B');
    assert.ok(
      html.includes(`${LT}div>hi${LT}/div>`),
      'non-vocab <div> echoes `<div>hi</div>` literally (no HTML passthrough)',
    );
    console.log('PASS: non-vocab raw <div> → literal <div>hi</div>');
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
    // Shown literally (not stripped). It's ordinary prose text, so smart
    // typography (#54) applies like anywhere else — the `--` becomes an en dash.
    assert.ok(html.includes(`${LT}!– oops no close`), 'unclosed comment shown literally (typography applies to its prose)');
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
